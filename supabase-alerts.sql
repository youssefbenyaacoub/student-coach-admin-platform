-- ========================================
-- ALERT SYSTEM SCHEMA
-- ========================================

-- 1. Alert Rules
-- Configuration for when to trigger alerts for a specific coach
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('inactivity', 'no_submission', 'deadline_approaching')),
  threshold_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coach_id, type)
);

-- RLS
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can manage their own rules" ON alert_rules;
CREATE POLICY "Coaches can manage their own rules" ON alert_rules
  FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- 2. Student Activity Logs
-- Centralized log of student actions
CREATE TABLE IF NOT EXISTS student_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'login', 'submission', 'message', 'view_resource'
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE student_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view their own logs" ON student_activity_logs;
CREATE POLICY "Students can view their own logs" ON student_activity_logs
  FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Coaches can view logs of students in their programs" ON student_activity_logs;
CREATE POLICY "Coaches can view logs of students in their programs" ON student_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM program_participants pp
      JOIN program_coaches pc ON pp.program_id = pc.program_id
      WHERE pp.student_id = student_activity_logs.student_id
      AND pc.coach_id = auth.uid()
    )
  );

-- 3. Generated Alerts
-- The actual alerts to be displayed
CREATE TABLE IF NOT EXISTS generated_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Should be NOT NULL usually, but optional for system-wide alerts
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  message TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE generated_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can view alerts assigned to them" ON generated_alerts;
CREATE POLICY "Coaches can view alerts assigned to them" ON generated_alerts
  FOR SELECT USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Coaches can update alerts assigned to them" ON generated_alerts;
CREATE POLICY "Coaches can update alerts assigned to them" ON generated_alerts
  FOR UPDATE USING (auth.uid() = coach_id);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Helper to log activity
CREATE OR REPLACE FUNCTION public.log_student_activity(
  p_student_id UUID,
  p_activity_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.student_activity_logs (student_id, activity_type, description, metadata)
  VALUES (p_student_id, p_activity_type, p_description, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Trigger to log internal messages (Student -> Coach)
CREATE OR REPLACE FUNCTION public.log_message_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if sender is a student
  IF EXISTS (SELECT 1 FROM users WHERE id = NEW.sender_id AND role = 'student') THEN
    PERFORM public.log_student_activity(
      NEW.sender_id, 
      'message', 
      'Sent a message', 
      jsonb_build_object('recipient_id', NEW.recipient_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_message_activity ON messages;
CREATE TRIGGER trg_log_message_activity
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION public.log_message_activity();

-- Trigger to log submissions
CREATE OR REPLACE FUNCTION public.log_submission_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_student_activity(
    NEW.student_id, 
    'submission', 
    'Submitted a deliverable', 
    jsonb_build_object('deliverable_id', NEW.deliverable_id, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_submission_activity ON submissions;
CREATE TRIGGER trg_log_submission_activity
AFTER INSERT ON submissions
FOR EACH ROW
EXECUTE FUNCTION public.log_submission_activity();


-- MAIN ALERT GENERATION FUNCTION
-- This effectively replaces a complex cron query.
-- To be run periodically (propably via pg_cron or Edge Function).
CREATE OR REPLACE FUNCTION public.generate_daily_alerts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach RECORD;
  v_student RECORD;
  v_rule RECORD;
  v_last_active TIMESTAMPTZ;
  v_days_inactive INTEGER;
BEGIN
  -- Iterate through all coaches
  FOR v_coach IN SELECT id FROM users WHERE role = 'coach' LOOP
  
    -- Get coach rules
    FOR v_rule IN SELECT * FROM alert_rules WHERE coach_id = v_coach.id AND is_active = TRUE LOOP
      
      -- Rule: Inactivity
      IF v_rule.type = 'inactivity' THEN
        -- Find students for this coach who haven't been active
        -- (Logic: Check all students in programs where this coach is a coach)
        FOR v_student IN 
          SELECT DISTINCT s.id, s.name 
          FROM users s
          JOIN program_participants pp ON s.id = pp.student_id
          JOIN program_coaches pc ON pp.program_id = pc.program_id
          WHERE pc.coach_id = v_coach.id
        LOOP
          -- Get last activity
          SELECT created_at INTO v_last_active 
          FROM student_activity_logs 
          WHERE student_id = v_student.id 
          ORDER BY created_at DESC LIMIT 1;
          
          IF v_last_active IS NULL THEN
             v_last_active := (SELECT created_at FROM users WHERE id = v_student.id); -- Fallback to account creation
          END IF;
          
          IF v_last_active IS NOT NULL THEN
             v_days_inactive := EXTRACT(DAY FROM NOW() - v_last_active);
             
             IF v_days_inactive >= v_rule.threshold_days THEN
               -- Create Alert if not exists recently (e.g. within last 24h)
               IF NOT EXISTS (
                 SELECT 1 FROM generated_alerts 
                 WHERE student_id = v_student.id 
                 AND coach_id = v_coach.id
                 AND type = 'inactivity'
                 AND is_resolved = FALSE
               ) THEN
                 INSERT INTO generated_alerts (student_id, coach_id, type, severity, message)
                 VALUES (
                   v_student.id, 
                   v_coach.id, 
                   'inactivity', 
                   CASE WHEN v_days_inactive > v_rule.threshold_days + 3 THEN 'high' ELSE 'medium' END,
                   v_student.name || ' has been inactive for ' || v_days_inactive || ' days.'
                 );
               END IF;
             END IF;
          END IF;
        END LOOP;
      END IF;

      -- Rule: Deadline Approaching (Simplification for demo)
      -- This would query deliverables due soon
      
    END LOOP;
  END LOOP;
END;
$$;

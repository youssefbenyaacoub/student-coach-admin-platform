-- ========================================
-- BULK ASSIGNMENT SYSTEM
-- ========================================
-- This file contains the database schema for the intelligent bulk assignment system
-- that allows admins to match students with referents using compatibility scoring,
-- workload balancing, and drag-and-drop interface.

-- ========================================
-- TABLES
-- ========================================

-- Assignment History: Tracks all assignment changes for audit trail
CREATE TABLE IF NOT EXISTS public.assignment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referent Expertise: Stores referent skills, languages, and preferences
CREATE TABLE IF NOT EXISTS public.referent_expertise (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  domains TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  timezone TEXT,
  max_students INTEGER DEFAULT 10,
  preferences_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment Rules: System configuration for matching algorithm
CREATE TABLE IF NOT EXISTS public.assignment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  max_students_per_referent INTEGER DEFAULT 10,
  matching_weights_json JSONB DEFAULT '{
    "expertise": 0.40,
    "language": 0.25,
    "timezone": 0.15,
    "workload": 0.20
  }'::jsonb,
  auto_assign_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_program_rules UNIQUE (program_id)
);

-- Assignment Drafts: Save work in progress
CREATE TABLE IF NOT EXISTS public.assignment_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_name TEXT NOT NULL,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  assignments_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_assignment_history_student ON assignment_history(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_referent ON assignment_history(referent_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_program ON assignment_history(program_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_assigned_at ON assignment_history(assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_referent_expertise_referent ON referent_expertise(referent_id);
CREATE INDEX IF NOT EXISTS idx_referent_expertise_domains ON referent_expertise USING GIN(domains);

CREATE INDEX IF NOT EXISTS idx_assignment_rules_program ON assignment_rules(program_id);

CREATE INDEX IF NOT EXISTS idx_assignment_drafts_admin ON assignment_drafts(admin_id);
CREATE INDEX IF NOT EXISTS idx_assignment_drafts_program ON assignment_drafts(program_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE referent_expertise ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_drafts ENABLE ROW LEVEL SECURITY;

-- Assignment History Policies
DROP POLICY IF EXISTS "Admins can view all assignment history" ON assignment_history;
CREATE POLICY "Admins can view all assignment history"
  ON assignment_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert assignment history" ON assignment_history;
CREATE POLICY "Admins can insert assignment history"
  ON assignment_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Referent Expertise Policies
DROP POLICY IF EXISTS "Admins can view all referent expertise" ON referent_expertise;
CREATE POLICY "Admins can view all referent expertise"
  ON referent_expertise FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Referents can view own expertise" ON referent_expertise;
CREATE POLICY "Referents can view own expertise"
  ON referent_expertise FOR SELECT
  TO authenticated
  USING (referent_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage referent expertise" ON referent_expertise;
CREATE POLICY "Admins can manage referent expertise"
  ON referent_expertise FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Assignment Rules Policies
DROP POLICY IF EXISTS "Admins can view assignment rules" ON assignment_rules;
CREATE POLICY "Admins can view assignment rules"
  ON assignment_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage assignment rules" ON assignment_rules;
CREATE POLICY "Admins can manage assignment rules"
  ON assignment_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Assignment Drafts Policies
DROP POLICY IF EXISTS "Admins can view own drafts" ON assignment_drafts;
CREATE POLICY "Admins can view own drafts"
  ON assignment_drafts FOR SELECT
  TO authenticated
  USING (
    admin_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage own drafts" ON assignment_drafts;
CREATE POLICY "Admins can manage own drafts"
  ON assignment_drafts FOR ALL
  TO authenticated
  USING (admin_id = auth.uid());

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to get referent workload
CREATE OR REPLACE FUNCTION public.get_referent_workload(p_referent_id UUID, p_program_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_students INTEGER;
  v_max_students INTEGER;
  v_capacity_percentage NUMERIC;
BEGIN
  -- Get max students from referent_expertise
  SELECT COALESCE(max_students, 10) INTO v_max_students
  FROM referent_expertise
  WHERE referent_id = p_referent_id;
  
  -- If no expertise record, use default
  IF v_max_students IS NULL THEN
    v_max_students := 10;
  END IF;
  
  -- Count current students
  IF p_program_id IS NOT NULL THEN
    -- Count for specific program
    SELECT COUNT(*) INTO v_current_students
    FROM program_participants
    WHERE coach_id = p_referent_id
    AND program_id = p_program_id;
  ELSE
    -- Count across all programs
    SELECT COUNT(*) INTO v_current_students
    FROM program_participants
    WHERE coach_id = p_referent_id;
  END IF;
  
  -- Calculate capacity percentage
  v_capacity_percentage := (v_current_students::NUMERIC / v_max_students::NUMERIC) * 100;
  
  RETURN jsonb_build_object(
    'current_students', v_current_students,
    'max_students', v_max_students,
    'available_capacity', v_max_students - v_current_students,
    'capacity_percentage', ROUND(v_capacity_percentage, 2),
    'is_overloaded', v_current_students > v_max_students,
    'is_at_capacity', v_current_students >= v_max_students
  );
END;
$$;

-- Function to calculate compatibility score
CREATE OR REPLACE FUNCTION public.calculate_compatibility_score(
  p_student_id UUID,
  p_referent_id UUID,
  p_weights JSONB DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_referent RECORD;
  v_expertise RECORD;
  v_weights JSONB;
  v_score NUMERIC := 0;
  v_expertise_score NUMERIC := 0;
  v_language_score NUMERIC := 0;
  v_timezone_score NUMERIC := 0;
  v_workload_score NUMERIC := 0;
  v_workload JSONB;
BEGIN
  -- Default weights if not provided
  v_weights := COALESCE(p_weights, '{
    "expertise": 0.40,
    "language": 0.25,
    "timezone": 0.15,
    "workload": 0.20
  }'::jsonb);
  
  -- Get student info
  SELECT * INTO v_student FROM users WHERE id = p_student_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get referent info
  SELECT * INTO v_referent FROM users WHERE id = p_referent_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Get referent expertise
  SELECT * INTO v_expertise FROM referent_expertise WHERE referent_id = p_referent_id;
  
  -- Calculate expertise match (40% weight)
  -- This is a simplified version - in production, you'd match project domains
  -- For now, we'll give a base score
  v_expertise_score := 70; -- Base score
  
  -- If student has project info in metadata, try to match domains
  IF v_student.metadata ? 'project_domain' AND v_expertise.domains IS NOT NULL THEN
    IF v_student.metadata->>'project_domain' = ANY(v_expertise.domains) THEN
      v_expertise_score := 100;
    END IF;
  END IF;
  
  -- Calculate language match (25% weight)
  v_language_score := 70; -- Base score
  IF v_student.metadata ? 'language' AND v_expertise.languages IS NOT NULL THEN
    IF v_student.metadata->>'language' = ANY(v_expertise.languages) THEN
      v_language_score := 100;
    END IF;
  END IF;
  
  -- Calculate timezone alignment (15% weight)
  v_timezone_score := 80; -- Base score for now
  -- In production, calculate based on actual timezone difference
  
  -- Calculate workload balance (20% weight)
  v_workload := get_referent_workload(p_referent_id);
  v_workload_score := 100 - (v_workload->>'capacity_percentage')::NUMERIC;
  v_workload_score := GREATEST(v_workload_score, 0);
  
  -- Calculate weighted total
  v_score := (
    (v_expertise_score * (v_weights->>'expertise')::NUMERIC) +
    (v_language_score * (v_weights->>'language')::NUMERIC) +
    (v_timezone_score * (v_weights->>'timezone')::NUMERIC) +
    (v_workload_score * (v_weights->>'workload')::NUMERIC)
  );
  
  RETURN ROUND(v_score, 2);
END;
$$;

-- Function to validate assignment
CREATE OR REPLACE FUNCTION public.validate_assignment(
  p_student_id UUID,
  p_referent_id UUID,
  p_program_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workload JSONB;
  v_existing_assignment RECORD;
BEGIN
  -- Check if student exists and is a student
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_student_id AND role = 'student') THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Student not found or invalid role');
  END IF;
  
  -- Check if referent exists and is a coach
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_referent_id AND role = 'coach') THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Referent not found or invalid role');
  END IF;
  
  -- Check if program exists
  IF NOT EXISTS (SELECT 1 FROM programs WHERE id = p_program_id) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Program not found');
  END IF;
  
  -- Check if student is already assigned to this program
  SELECT * INTO v_existing_assignment
  FROM program_participants
  WHERE student_id = p_student_id
  AND program_id = p_program_id;
  
  IF FOUND AND v_existing_assignment.coach_id = p_referent_id THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Student already assigned to this referent');
  END IF;
  
  -- Check referent capacity
  v_workload := get_referent_workload(p_referent_id, p_program_id);
  IF (v_workload->>'is_at_capacity')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'error', 'Referent is at capacity',
      'warning', true,
      'workload', v_workload
    );
  END IF;
  
  RETURN jsonb_build_object('valid', true);
END;
$$;

-- Function to bulk assign students
CREATE OR REPLACE FUNCTION public.bulk_assign_students(
  p_assignments JSONB,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment JSONB;
  v_validation JSONB;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::jsonb;
  v_student_id UUID;
  v_referent_id UUID;
  v_program_id UUID;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;
  
  -- Process each assignment
  FOR v_assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    v_student_id := (v_assignment->>'student_id')::UUID;
    v_referent_id := (v_assignment->>'referent_id')::UUID;
    v_program_id := (v_assignment->>'program_id')::UUID;
    
    -- Validate assignment
    v_validation := validate_assignment(v_student_id, v_referent_id, v_program_id);
    
    IF (v_validation->>'valid')::BOOLEAN THEN
      -- Update or insert program_participants
      INSERT INTO program_participants (student_id, program_id, coach_id)
      VALUES (v_student_id, v_program_id, v_referent_id)
      ON CONFLICT (student_id, program_id)
      DO UPDATE SET coach_id = v_referent_id, updated_at = NOW();
      
      -- Log to assignment history
      INSERT INTO assignment_history (student_id, referent_id, program_id, assigned_by)
      VALUES (v_student_id, v_referent_id, v_program_id, p_admin_id);
      
      v_success_count := v_success_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'student_id', v_student_id,
        'referent_id', v_referent_id,
        'error', v_validation->>'error'
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'assigned_count', v_success_count,
    'error_count', v_error_count,
    'errors', v_errors
  );
END;
$$;

-- Function to auto-assign students based on compatibility
CREATE OR REPLACE FUNCTION public.auto_assign_students(
  p_program_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_referent RECORD;
  v_best_referent_id UUID;
  v_best_score NUMERIC := 0;
  v_current_score NUMERIC;
  v_assignments JSONB := '[]'::jsonb;
  v_rules RECORD;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;
  
  -- Get assignment rules for program
  SELECT * INTO v_rules FROM assignment_rules WHERE program_id = p_program_id;
  
  -- Get unassigned students in program
  FOR v_student IN 
    SELECT pp.student_id, u.*
    FROM program_participants pp
    JOIN users u ON pp.student_id = u.id
    WHERE pp.program_id = p_program_id
    AND pp.coach_id IS NULL
  LOOP
    v_best_referent_id := NULL;
    v_best_score := 0;
    
    -- Find best matching referent
    FOR v_referent IN
      SELECT DISTINCT pc.coach_id, u.*
      FROM program_coaches pc
      JOIN users u ON pc.coach_id = u.id
      WHERE pc.program_id = p_program_id
      AND u.role = 'coach'
    LOOP
      -- Calculate compatibility score
      v_current_score := calculate_compatibility_score(
        v_student.student_id,
        v_referent.coach_id,
        v_rules.matching_weights_json
      );
      
      -- Update best match
      IF v_current_score > v_best_score THEN
        v_best_score := v_current_score;
        v_best_referent_id := v_referent.coach_id;
      END IF;
    END LOOP;
    
    -- Add to assignments if match found
    IF v_best_referent_id IS NOT NULL THEN
      v_assignments := v_assignments || jsonb_build_object(
        'student_id', v_student.student_id,
        'referent_id', v_best_referent_id,
        'program_id', p_program_id,
        'compatibility_score', v_best_score
      );
    END IF;
  END LOOP;
  
  -- Execute bulk assignment
  RETURN bulk_assign_students(v_assignments, p_admin_id);
END;
$$;

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_referent_expertise_updated_at
  BEFORE UPDATE ON referent_expertise
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_rules_updated_at
  BEFORE UPDATE ON assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_drafts_updated_at
  BEFORE UPDATE ON assignment_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- REALTIME
-- ========================================

-- Enable realtime for assignment tables
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_history;
ALTER PUBLICATION supabase_realtime ADD TABLE assignment_drafts;

-- ========================================
-- SEED DATA
-- ========================================

-- Insert default assignment rules for existing programs
INSERT INTO assignment_rules (program_id, max_students_per_referent, auto_assign_enabled)
SELECT id, 10, true
FROM programs
WHERE NOT EXISTS (
  SELECT 1 FROM assignment_rules WHERE program_id = programs.id
);

-- Create default expertise records for existing coaches
INSERT INTO referent_expertise (referent_id, max_students)
SELECT id, 10
FROM users
WHERE role = 'coach'
AND NOT EXISTS (
  SELECT 1 FROM referent_expertise WHERE referent_id = users.id
);

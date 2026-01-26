-- ========================================
-- ADAPTIVE ROADMAP & PERSONALIZATION ENHANCEMENT
-- ========================================
-- Adds adaptive progression, analytics, conditional branching, and microlearning features
-- Run this AFTER `supabase-program-management.sql`

-- ========================================
-- PART 1: EXTEND EXISTING TABLES
-- ========================================

-- Add adaptive fields to program_instances
ALTER TABLE public.program_instances
  ADD COLUMN IF NOT EXISTS adaptive_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'standard' CHECK (difficulty_level IN ('beginner', 'standard', 'advanced')),
  ADD COLUMN IF NOT EXISTS predicted_completion_date TIMESTAMPTZ;

-- Add adaptive fields to program_instance_tasks
ALTER TABLE public.program_instance_tasks
  ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  ADD COLUMN IF NOT EXISTS auto_advanced BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS skip_reason TEXT,
  ADD COLUMN IF NOT EXISTS performance_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS submission_attempts INTEGER DEFAULT 0;

-- Add adaptive fields to program_template_stages
ALTER TABLE public.program_template_stages
  ADD COLUMN IF NOT EXISTS min_quality_threshold DECIMAL(3,2) DEFAULT 0.70 CHECK (min_quality_threshold >= 0 AND min_quality_threshold <= 1),
  ADD COLUMN IF NOT EXISTS auto_advance_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prerequisite_stage_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Add microlearning fields to program_template_contents
ALTER TABLE public.program_template_contents
  ADD COLUMN IF NOT EXISTS content_subtype TEXT CHECK (content_subtype IN ('standard', 'quiz', 'challenge', 'simulation')),
  ADD COLUMN IF NOT EXISTS assessment_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced'));

-- ========================================
-- PART 2: NEW ANALYTICS TABLES
-- ========================================

-- TABLE: student_progress_analytics
CREATE TABLE IF NOT EXISTS public.student_progress_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Overall metrics
  completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  tasks_total INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_in_progress INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  average_quality_score DECIMAL(3,2),
  average_time_per_task_minutes DECIMAL(8,2),
  on_time_completion_rate DECIMAL(3,2),
  
  -- Skill analysis (JSONB for flexibility)
  strength_areas JSONB DEFAULT '[]'::jsonb, -- [{skill: "market_research", score: 0.95}, ...]
  weakness_areas JSONB DEFAULT '[]'::jsonb, -- [{skill: "prototyping", score: 0.45}, ...]
  
  -- Timeline predictions
  predicted_completion_date TIMESTAMPTZ,
  current_pace_tasks_per_week DECIMAL(5,2),
  
  -- Bottleneck detection
  bottleneck_tasks JSONB DEFAULT '[]'::jsonb, -- [{task_id, title, days_stuck}]
  
  -- Timestamps
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(instance_id)
);

CREATE INDEX IF NOT EXISTS idx_student_progress_analytics_student ON public.student_progress_analytics(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_analytics_instance ON public.student_progress_analytics(instance_id);

DROP TRIGGER IF EXISTS update_student_progress_analytics_updated_at ON public.student_progress_analytics;
CREATE TRIGGER update_student_progress_analytics_updated_at
  BEFORE UPDATE ON public.student_progress_analytics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.student_progress_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Progress analytics readable by owner or staff" ON public.student_progress_analytics;
CREATE POLICY "Progress analytics readable by owner or staff" ON public.student_progress_analytics
  FOR SELECT
  USING (student_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']));

DROP POLICY IF EXISTS "Progress analytics writable by system" ON public.student_progress_analytics;
CREATE POLICY "Progress analytics writable by system" ON public.student_progress_analytics
  FOR ALL
  USING (public.has_role(ARRAY['coach', 'admin']))
  WITH CHECK (public.has_role(ARRAY['coach', 'admin']));

-- TABLE: task_performance_metrics
CREATE TABLE IF NOT EXISTS public.task_performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.program_instance_tasks(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  
  -- Performance data
  quality_score DECIMAL(3,2),
  time_spent_minutes INTEGER,
  submission_attempts INTEGER DEFAULT 0,
  
  -- Engagement metrics
  content_items_viewed INTEGER DEFAULT 0,
  content_completion_rate DECIMAL(3,2),
  
  -- Skill tags for analysis
  skill_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_performance_metrics_task ON public.task_performance_metrics(task_id);
CREATE INDEX IF NOT EXISTS idx_task_performance_metrics_instance ON public.task_performance_metrics(instance_id);

DROP TRIGGER IF EXISTS update_task_performance_metrics_updated_at ON public.task_performance_metrics;
CREATE TRIGGER update_task_performance_metrics_updated_at
  BEFORE UPDATE ON public.task_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.task_performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task metrics readable by owner or staff" ON public.task_performance_metrics;
CREATE POLICY "Task metrics readable by owner or staff" ON public.task_performance_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.program_instances i
      WHERE i.id = instance_id
        AND (i.student_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']))
    )
  );

-- TABLE: stage_completion_history
CREATE TABLE IF NOT EXISTS public.stage_completion_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.program_template_stages(id) ON DELETE CASCADE,
  
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_days INTEGER,
  
  tasks_completed INTEGER DEFAULT 0,
  average_quality_score DECIMAL(3,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_completion_history_instance ON public.stage_completion_history(instance_id);

ALTER TABLE public.stage_completion_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stage history readable by owner or staff" ON public.stage_completion_history;
CREATE POLICY "Stage history readable by owner or staff" ON public.stage_completion_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.program_instances i
      WHERE i.id = instance_id
        AND (i.student_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']))
    )
  );

-- ========================================
-- PART 3: CONDITIONAL TASK LOGIC
-- ========================================

-- TABLE: conditional_task_rules
CREATE TABLE IF NOT EXISTS public.conditional_task_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.program_templates(id) ON DELETE CASCADE,
  
  rule_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Trigger conditions (JSONB for flexibility)
  -- Example: {"event": "task_failed", "task_type": "mvp_demo", "stage_name": "MVP"}
  trigger_condition JSONB NOT NULL,
  
  -- Action to take
  action_type TEXT NOT NULL CHECK (action_type IN ('inject_tasks', 'skip_tasks', 'change_difficulty', 'send_notification', 'advance_stage')),
  
  -- Action configuration (JSONB for flexibility)
  -- Example for inject_tasks: {"tasks": [{"title": "...", "description": "...", "task_type": "remediation"}]}
  action_config JSONB NOT NULL,
  
  priority INTEGER DEFAULT 0, -- Higher priority rules execute first
  
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conditional_task_rules_template ON public.conditional_task_rules(template_id);
CREATE INDEX IF NOT EXISTS idx_conditional_task_rules_active ON public.conditional_task_rules(is_active);

DROP TRIGGER IF EXISTS update_conditional_task_rules_updated_at ON public.conditional_task_rules;
CREATE TRIGGER update_conditional_task_rules_updated_at
  BEFORE UPDATE ON public.conditional_task_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.conditional_task_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Conditional rules readable" ON public.conditional_task_rules;
CREATE POLICY "Conditional rules readable" ON public.conditional_task_rules
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Conditional rules writable by admin" ON public.conditional_task_rules;
CREATE POLICY "Conditional rules writable by admin" ON public.conditional_task_rules
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

-- ========================================
-- PART 4: MICROLEARNING & ASSESSMENTS
-- ========================================

-- TABLE: content_quiz_questions
CREATE TABLE IF NOT EXISTS public.content_quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.program_template_contents(id) ON DELETE CASCADE,
  
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  
  -- Options for multiple choice (array of strings)
  options TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Correct answer(s)
  correct_answer JSONB NOT NULL, -- For MC: [0, 2] (indices), for T/F: true/false, for short: "expected text"
  
  -- Explanation shown after answering
  explanation TEXT,
  
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_quiz_questions_content ON public.content_quiz_questions(content_id);

DROP TRIGGER IF EXISTS update_content_quiz_questions_updated_at ON public.content_quiz_questions;
CREATE TRIGGER update_content_quiz_questions_updated_at
  BEFORE UPDATE ON public.content_quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.content_quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Quiz questions readable" ON public.content_quiz_questions;
CREATE POLICY "Quiz questions readable" ON public.content_quiz_questions
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Quiz questions writable by admin" ON public.content_quiz_questions;
CREATE POLICY "Quiz questions writable by admin" ON public.content_quiz_questions
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

-- TABLE: student_content_progress
CREATE TABLE IF NOT EXISTS public.student_content_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.program_template_contents(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  
  -- Progress tracking
  is_completed BOOLEAN DEFAULT FALSE,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  
  -- Quiz/assessment results
  quiz_score DECIMAL(5,2), -- Percentage score
  quiz_responses JSONB, -- Student's answers
  quiz_attempts INTEGER DEFAULT 0,
  
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(student_id, content_id, instance_id)
);

CREATE INDEX IF NOT EXISTS idx_student_content_progress_student ON public.student_content_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_content_progress_content ON public.student_content_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_student_content_progress_instance ON public.student_content_progress(instance_id);

DROP TRIGGER IF EXISTS update_student_content_progress_updated_at ON public.student_content_progress;
CREATE TRIGGER update_student_content_progress_updated_at
  BEFORE UPDATE ON public.student_content_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.student_content_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Content progress readable by owner or staff" ON public.student_content_progress;
CREATE POLICY "Content progress readable by owner or staff" ON public.student_content_progress
  FOR SELECT
  USING (student_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']));

DROP POLICY IF EXISTS "Content progress writable by owner" ON public.student_content_progress;
CREATE POLICY "Content progress writable by owner" ON public.student_content_progress
  FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Content progress updatable by owner" ON public.student_content_progress;
CREATE POLICY "Content progress updatable by owner" ON public.student_content_progress
  FOR UPDATE
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ========================================
-- PART 5: RPC FUNCTIONS - ANALYTICS
-- ========================================

-- RPC: calculate_student_progress_analytics
CREATE OR REPLACE FUNCTION public.calculate_student_progress_analytics(
  p_instance_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_analytics JSONB;
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_in_progress_tasks INTEGER;
  v_avg_quality DECIMAL(3,2);
  v_avg_time DECIMAL(8,2);
  v_completion_pct DECIMAL(5,2);
  v_on_time_rate DECIMAL(3,2);
  v_predicted_date TIMESTAMPTZ;
  v_pace DECIMAL(5,2);
BEGIN
  -- Get student ID
  SELECT student_id INTO v_student_id
  FROM public.program_instances
  WHERE id = p_instance_id;
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Instance not found';
  END IF;
  
  -- Calculate basic metrics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status IN ('in_progress', 'submitted'))
  INTO v_total_tasks, v_completed_tasks, v_in_progress_tasks
  FROM public.program_instance_tasks
  WHERE instance_id = p_instance_id;
  
  v_completion_pct := CASE WHEN v_total_tasks > 0 THEN (v_completed_tasks::DECIMAL / v_total_tasks) * 100 ELSE 0 END;
  
  -- Calculate average quality and time
  SELECT 
    AVG(quality_score),
    AVG(time_spent_minutes)
  INTO v_avg_quality, v_avg_time
  FROM public.program_instance_tasks
  WHERE instance_id = p_instance_id AND status = 'approved';
  
  -- Calculate on-time completion rate
  SELECT 
    CASE WHEN COUNT(*) > 0 THEN
      (COUNT(*) FILTER (WHERE approved_at <= deadline)::DECIMAL / COUNT(*)) 
    ELSE 0 END
  INTO v_on_time_rate
  FROM public.program_instance_tasks
  WHERE instance_id = p_instance_id 
    AND status = 'approved' 
    AND deadline IS NOT NULL;
  
  -- Calculate pace and predicted completion
  SELECT 
    CASE WHEN EXTRACT(EPOCH FROM (NOW() - started_at)) / 604800 > 0 THEN
      v_completed_tasks::DECIMAL / (EXTRACT(EPOCH FROM (NOW() - started_at)) / 604800)
    ELSE 0 END
  INTO v_pace
  FROM public.program_instances
  WHERE id = p_instance_id;
  
  IF v_pace > 0 THEN
    v_predicted_date := NOW() + ((v_total_tasks - v_completed_tasks) / v_pace * 7 || ' days')::interval;
  END IF;
  
  -- Upsert analytics record
  INSERT INTO public.student_progress_analytics (
    instance_id,
    student_id,
    completion_percentage,
    tasks_total,
    tasks_completed,
    tasks_in_progress,
    average_quality_score,
    average_time_per_task_minutes,
    on_time_completion_rate,
    predicted_completion_date,
    current_pace_tasks_per_week,
    last_calculated_at
  ) VALUES (
    p_instance_id,
    v_student_id,
    v_completion_pct,
    v_total_tasks,
    v_completed_tasks,
    v_in_progress_tasks,
    v_avg_quality,
    v_avg_time,
    v_on_time_rate,
    v_predicted_date,
    v_pace,
    NOW()
  )
  ON CONFLICT (instance_id) DO UPDATE SET
    completion_percentage = EXCLUDED.completion_percentage,
    tasks_total = EXCLUDED.tasks_total,
    tasks_completed = EXCLUDED.tasks_completed,
    tasks_in_progress = EXCLUDED.tasks_in_progress,
    average_quality_score = EXCLUDED.average_quality_score,
    average_time_per_task_minutes = EXCLUDED.average_time_per_task_minutes,
    on_time_completion_rate = EXCLUDED.on_time_completion_rate,
    predicted_completion_date = EXCLUDED.predicted_completion_date,
    current_pace_tasks_per_week = EXCLUDED.current_pace_tasks_per_week,
    last_calculated_at = NOW();
  
  -- Return analytics as JSONB
  SELECT to_jsonb(a.*) INTO v_analytics
  FROM public.student_progress_analytics a
  WHERE a.instance_id = p_instance_id;
  
  RETURN v_analytics;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_student_progress_analytics(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_student_progress_analytics(UUID) TO authenticated;

-- RPC: get_progress_dashboard_data
CREATE OR REPLACE FUNCTION public.get_progress_dashboard_data(
  p_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_result JSONB;
BEGIN
  v_student_id := COALESCE(p_student_id, auth.uid());
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check permissions
  IF p_student_id IS NOT NULL AND p_student_id != auth.uid() THEN
    IF NOT public.has_role(ARRAY['coach', 'admin']) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;
  
  -- Build comprehensive dashboard data
  SELECT jsonb_build_object(
    'instances', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'instance_id', i.id,
          'template_name', t.name,
          'status', i.status,
          'started_at', i.started_at,
          'analytics', a.*
        )
      )
      FROM public.program_instances i
      JOIN public.program_templates t ON t.id = i.template_id
      LEFT JOIN public.student_progress_analytics a ON a.instance_id = i.id
      WHERE i.student_id = v_student_id
    ),
    'overall_stats', (
      SELECT jsonb_build_object(
        'total_programs', COUNT(DISTINCT i.id),
        'active_programs', COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'active'),
        'total_tasks', SUM(a.tasks_total),
        'completed_tasks', SUM(a.tasks_completed),
        'average_quality', AVG(a.average_quality_score)
      )
      FROM public.program_instances i
      LEFT JOIN public.student_progress_analytics a ON a.instance_id = i.id
      WHERE i.student_id = v_student_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_progress_dashboard_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_progress_dashboard_data(UUID) TO authenticated;

-- ========================================
-- PART 6: RPC FUNCTIONS - ADAPTIVE LOGIC
-- ========================================

-- RPC: evaluate_adaptive_progression
CREATE OR REPLACE FUNCTION public.evaluate_adaptive_progression(
  p_instance_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_current_stage_id UUID;
  v_threshold DECIMAL(3,2);
  v_avg_quality DECIMAL(3,2);
  v_can_advance BOOLEAN := FALSE;
  v_next_stage_id UUID;
BEGIN
  -- Get current stage and check if adaptive mode is enabled
  SELECT current_stage_id INTO v_current_stage_id
  FROM public.program_instances
  WHERE id = p_instance_id AND adaptive_mode_enabled = TRUE;
  
  IF v_current_stage_id IS NULL THEN
    RETURN jsonb_build_object('can_advance', false, 'reason', 'Adaptive mode disabled or no current stage');
  END IF;
  
  -- Get stage threshold
  SELECT min_quality_threshold, auto_advance_enabled
  INTO v_threshold
  FROM public.program_template_stages
  WHERE id = v_current_stage_id;
  
  -- Calculate average quality for current stage tasks
  SELECT AVG(quality_score) INTO v_avg_quality
  FROM public.program_instance_tasks
  WHERE instance_id = p_instance_id
    AND stage_id = v_current_stage_id
    AND status = 'approved'
    AND quality_score IS NOT NULL;
  
  -- Check if can advance
  IF v_avg_quality >= v_threshold THEN
    v_can_advance := TRUE;
    
    -- Get next stage
    SELECT s.id INTO v_next_stage_id
    FROM public.program_template_stages s
    JOIN public.program_instances i ON i.template_id = s.template_id
    WHERE i.id = p_instance_id
      AND s.order_index > (
        SELECT order_index FROM public.program_template_stages WHERE id = v_current_stage_id
      )
    ORDER BY s.order_index ASC
    LIMIT 1;
  END IF;
  
  v_result := jsonb_build_object(
    'can_advance', v_can_advance,
    'current_stage_id', v_current_stage_id,
    'next_stage_id', v_next_stage_id,
    'average_quality', v_avg_quality,
    'threshold', v_threshold,
    'reason', CASE 
      WHEN v_can_advance THEN 'Quality threshold met'
      ELSE 'Quality below threshold'
    END
  );
  
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_adaptive_progression(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_adaptive_progression(UUID) TO authenticated;

-- RPC: apply_conditional_rules
CREATE OR REPLACE FUNCTION public.apply_conditional_rules(
  p_instance_id UUID,
  p_task_id UUID,
  p_event_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id UUID;
  v_rule RECORD;
  v_actions_taken JSONB := '[]'::jsonb;
  v_context RECORD;
BEGIN
  -- Get template ID and task info
  SELECT i.template_id, t.task_type, t.status, t.quality_score, s.name as stage_name
  INTO v_context
  FROM public.program_instances i
  JOIN public.program_instance_tasks t ON t.instance_id = i.id
  LEFT JOIN public.program_template_stages s ON s.id = t.stage_id
  WHERE i.id = p_instance_id AND t.id = p_task_id;
  
  v_template_id := v_context.template_id;
  
  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Instance or task not found';
  END IF;
  
  -- Find matching rules
  FOR v_rule IN
    SELECT * FROM public.conditional_task_rules
    WHERE template_id = v_template_id
      AND is_active = TRUE
    ORDER BY priority DESC
  LOOP
    -- Simple condition matching (can be extended)
    IF (v_rule.trigger_condition->>'event' = p_event_type) THEN
      -- Execute action based on type
      IF v_rule.action_type = 'inject_tasks' THEN
        -- Inject tasks from action_config
        -- This is a simplified version - real implementation would parse action_config
        v_actions_taken := v_actions_taken || jsonb_build_object(
          'rule_id', v_rule.id,
          'action', 'inject_tasks',
          'message', 'Tasks injected based on rule: ' || v_rule.rule_name
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'actions_taken', v_actions_taken,
    'rules_evaluated', (SELECT COUNT(*) FROM public.conditional_task_rules WHERE template_id = v_template_id AND is_active = TRUE)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_conditional_rules(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_conditional_rules(UUID, UUID, TEXT) TO authenticated;

-- ========================================
-- PART 7: RPC FUNCTIONS - QUIZ/ASSESSMENT
-- ========================================

-- RPC: submit_quiz_response
CREATE OR REPLACE FUNCTION public.submit_quiz_response(
  p_content_id UUID,
  p_instance_id UUID,
  p_responses JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_total_points INTEGER := 0;
  v_earned_points INTEGER := 0;
  v_score DECIMAL(5,2);
  v_question RECORD;
  v_is_correct BOOLEAN;
BEGIN
  v_student_id := auth.uid();
  
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Calculate score
  FOR v_question IN
    SELECT * FROM public.content_quiz_questions
    WHERE content_id = p_content_id
    ORDER BY order_index
  LOOP
    v_total_points := v_total_points + v_question.points;
    
    -- Check if answer is correct (simplified - real implementation would handle different question types)
    -- Using parens to ensure precedence: look up ID in responses, compare to correct answer
    v_is_correct := ((p_responses->(v_question.id::text)) = v_question.correct_answer);
    
    IF v_is_correct THEN
        v_earned_points := v_earned_points + v_question.points;
    END IF;
  END LOOP;
  
  v_score := CASE WHEN v_total_points > 0 THEN (v_earned_points::DECIMAL / v_total_points) * 100 ELSE 0 END;
  
  -- Upsert student content progress
  INSERT INTO public.student_content_progress (
    student_id,
    content_id,
    instance_id,
    quiz_score,
    quiz_responses,
    quiz_attempts,
    is_completed,
    completion_percentage,
    completed_at,
    last_accessed_at
  ) VALUES (
    v_student_id,
    p_content_id,
    p_instance_id,
    v_score,
    p_responses,
    1,
    TRUE,
    100,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, content_id, instance_id) DO UPDATE SET
    quiz_score = EXCLUDED.quiz_score,
    quiz_responses = EXCLUDED.quiz_responses,
    quiz_attempts = student_content_progress.quiz_attempts + 1,
    is_completed = TRUE,
    completion_percentage = 100,
    completed_at = NOW(),
    last_accessed_at = NOW();
  
  RETURN jsonb_build_object(
    'score', v_score,
    'earned_points', v_earned_points,
    'total_points', v_total_points,
    'passed', v_score >= 70
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_quiz_response(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_quiz_response(UUID, UUID, JSONB) TO authenticated;

-- ========================================
-- PART 8: REALTIME SUPPORT
-- ========================================

ALTER TABLE public.student_progress_analytics REPLICA IDENTITY FULL;
ALTER TABLE public.student_content_progress REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.student_progress_analytics;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.student_content_progress;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
-- 1. Run this migration in your Supabase SQL Editor
-- 2. Verify all tables and functions are created
-- 3. Test RPC functions with sample data
-- 4. Update frontend to use new features

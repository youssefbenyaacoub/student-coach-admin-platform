-- ========================================
-- ADMIN & OPERATIONS ENHANCEMENT
-- ========================================
-- Adds cohort management, impact tracking, resource directory, and multi-program support
-- Run this AFTER `supabase-program-management.sql`

-- ========================================
-- PART 1: COHORT LIFECYCLE MANAGEMENT
-- ========================================

-- TABLE: cohorts
CREATE TABLE IF NOT EXISTS public.cohorts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.program_templates(id) ON DELETE RESTRICT,
  
  name TEXT NOT NULL,
  description TEXT,
  program_type TEXT, -- 'tech', 'social_impact', etc.
  
  start_date DATE NOT NULL,
  end_date DATE,
  capacity INTEGER,
  
  application_deadline DATE,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'accepting_applications', 'in_progress', 'completed', 'archived')),
  
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cohorts_template ON public.cohorts(template_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_status ON public.cohorts(status);

ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cohorts readable" ON public.cohorts;
CREATE POLICY "Cohorts readable" ON public.cohorts
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Cohorts writable by admin" ON public.cohorts;
CREATE POLICY "Cohorts writable by admin" ON public.cohorts
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));


-- TABLE: application_forms
CREATE TABLE IF NOT EXISTS public.application_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  
  -- JSON structure: [{question: "Why...", type: "text", required: true}, ...]
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_forms_cohort ON public.application_forms(cohort_id);

ALTER TABLE public.application_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Application forms readable" ON public.application_forms;
CREATE POLICY "Application forms readable" ON public.application_forms
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Application forms writable by admin" ON public.application_forms;
CREATE POLICY "Application forms writable by admin" ON public.application_forms
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));


-- TABLE: cohort_applications
CREATE TABLE IF NOT EXISTS public.cohort_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- JSON structure: {question_id: answer, ...}
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted')),
  
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(cohort_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_applications_cohort ON public.cohort_applications(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_applications_applicant ON public.cohort_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_cohort_applications_status ON public.cohort_applications(status);

ALTER TABLE public.cohort_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applications readable by owner or staff" ON public.cohort_applications;
CREATE POLICY "Applications readable by owner or staff" ON public.cohort_applications
  FOR SELECT
  USING (applicant_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']));

DROP POLICY IF EXISTS "Applications writable by owner" ON public.cohort_applications;
CREATE POLICY "Applications writable by owner" ON public.cohort_applications
  FOR INSERT
  WITH CHECK (applicant_id = auth.uid());

DROP POLICY IF EXISTS "Applications updatable by owner or staff" ON public.cohort_applications;
CREATE POLICY "Applications updatable by owner or staff" ON public.cohort_applications
  FOR UPDATE
  USING (applicant_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']))
  WITH CHECK (applicant_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']));


-- TABLE: application_evaluations
CREATE TABLE IF NOT EXISTS public.application_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.cohort_applications(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- JSON structure: {criterion: score, ...}
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_score DECIMAL(5,2),
  
  notes TEXT,
  recommendation TEXT CHECK (recommendation IN ('strong_accept', 'accept', 'maybe', 'reject')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_evaluations_application ON public.application_evaluations(application_id);

ALTER TABLE public.application_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Evaluations readable by staff" ON public.application_evaluations;
CREATE POLICY "Evaluations readable by staff" ON public.application_evaluations
  FOR SELECT
  USING (public.has_role(ARRAY['coach', 'admin']));

DROP POLICY IF EXISTS "Evaluations writable by staff" ON public.application_evaluations;
CREATE POLICY "Evaluations writable by staff" ON public.application_evaluations
  FOR ALL
  USING (public.has_role(ARRAY['coach', 'admin']))
  WITH CHECK (public.has_role(ARRAY['coach', 'admin']));


-- TABLE: waitlists
CREATE TABLE IF NOT EXISTS public.waitlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  priority INTEGER DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(cohort_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlists_cohort ON public.waitlists(cohort_id);

ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Waitlists readable" ON public.waitlists;
CREATE POLICY "Waitlists readable" ON public.waitlists
  FOR SELECT
  USING (applicant_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']));


-- TABLE: graduation_records
CREATE TABLE IF NOT EXISTS public.graduation_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  graduated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  certificate_url TEXT,
  
  achievements JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_graduation_records_cohort ON public.graduation_records(cohort_id);

ALTER TABLE public.graduation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Graduation records readable" ON public.graduation_records;
CREATE POLICY "Graduation records readable" ON public.graduation_records
  FOR SELECT
  USING (true);


-- ========================================
-- PART 2: IMPACT TRACKING & REPORTING
-- ========================================

-- TABLE: impact_metrics
CREATE TABLE IF NOT EXISTS public.impact_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  
  metric_type TEXT NOT NULL, -- 'completion_rate', 'avg_time_per_stage', 'quality_score', etc.
  metric_value DECIMAL(10,2) NOT NULL,
  
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_impact_metrics_cohort ON public.impact_metrics(cohort_id);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_type ON public.impact_metrics(metric_type);

ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Impact metrics readable by staff" ON public.impact_metrics;
CREATE POLICY "Impact metrics readable by staff" ON public.impact_metrics
  FOR SELECT
  USING (public.has_role(ARRAY['coach', 'admin']));


-- TABLE: post_program_surveys
CREATE TABLE IF NOT EXISTS public.post_program_surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  
  job_created BOOLEAN,
  funding_raised DECIMAL(12,2),
  company_launched BOOLEAN,
  
  responses JSONB DEFAULT '{}'::jsonb,
  
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_program_surveys_cohort ON public.post_program_surveys(cohort_id);

ALTER TABLE public.post_program_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Surveys readable by owner or staff" ON public.post_program_surveys;
CREATE POLICY "Surveys readable by owner or staff" ON public.post_program_surveys
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']));


-- TABLE: coach_workload
CREATE TABLE IF NOT EXISTS public.coach_workload (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  
  assigned_students INTEGER DEFAULT 0,
  active_tasks INTEGER DEFAULT 0,
  
  week_start DATE NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_workload_coach ON public.coach_workload(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_workload_cohort ON public.coach_workload(cohort_id);

ALTER TABLE public.coach_workload ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach workload readable by staff" ON public.coach_workload;
CREATE POLICY "Coach workload readable by staff" ON public.coach_workload
  FOR SELECT
  USING (public.has_role(ARRAY['coach', 'admin']));


-- ========================================
-- PART 3: RESOURCE MANAGEMENT
-- ========================================

-- TABLE: resource_directory
CREATE TABLE IF NOT EXISTS public.resource_directory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  resource_type TEXT NOT NULL CHECK (resource_type IN ('mentor', 'investor', 'expert', 'tool', 'partner')),
  name TEXT NOT NULL,
  description TEXT,
  
  contact_info JSONB DEFAULT '{}'::jsonb,
  expertise_areas TEXT[],
  availability TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resource_directory_type ON public.resource_directory(resource_type);

ALTER TABLE public.resource_directory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Resources readable" ON public.resource_directory;
CREATE POLICY "Resources readable" ON public.resource_directory
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Resources writable by admin" ON public.resource_directory;
CREATE POLICY "Resources writable by admin" ON public.resource_directory
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));


-- TABLE: resource_assignments
CREATE TABLE IF NOT EXISTS public.resource_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES public.resource_directory(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  
  assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_resource_assignments_resource ON public.resource_assignments(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_assignments_user ON public.resource_assignments(user_id);

ALTER TABLE public.resource_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Resource assignments readable" ON public.resource_assignments;
CREATE POLICY "Resource assignments readable" ON public.resource_assignments
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']));


-- ========================================
-- PART 4: RPC FUNCTIONS
-- ========================================

-- RPC: Calculate cohort metrics
CREATE OR REPLACE FUNCTION public.calculate_cohort_metrics(p_cohort_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_students INTEGER;
  v_completed INTEGER;
  v_avg_quality DECIMAL(5,2);
BEGIN
  -- Count total enrolled students (accepted applications)
  SELECT COUNT(*) INTO v_total_students
  FROM public.cohort_applications
  WHERE cohort_id = p_cohort_id AND status = 'accepted';
  
  -- Count graduated students
  SELECT COUNT(*) INTO v_completed
  FROM public.graduation_records
  WHERE cohort_id = p_cohort_id;
  
  -- Calculate average quality score (placeholder - would need actual task data)
  v_avg_quality := 0.0;
  
  v_result := jsonb_build_object(
    'total_students', v_total_students,
    'completed', v_completed,
    'completion_rate', CASE WHEN v_total_students > 0 THEN (v_completed::DECIMAL / v_total_students) * 100 ELSE 0 END,
    'avg_quality_score', v_avg_quality
  );
  
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_cohort_metrics(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_cohort_metrics(UUID) TO authenticated;


-- RPC: Evaluate application
CREATE OR REPLACE FUNCTION public.evaluate_application(
  p_application_id UUID,
  p_scores JSONB,
  p_recommendation TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evaluator_id UUID;
  v_eval_id UUID;
  v_total DECIMAL(5,2);
BEGIN
  v_evaluator_id := auth.uid();
  IF v_evaluator_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(ARRAY['coach', 'admin']) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  
  -- Calculate total score (simple average for now)
  SELECT AVG((value)::DECIMAL) INTO v_total
  FROM jsonb_each_text(p_scores);
  
  INSERT INTO public.application_evaluations (
    application_id,
    evaluator_id,
    scores,
    total_score,
    recommendation
  )
  VALUES (
    p_application_id,
    v_evaluator_id,
    p_scores,
    v_total,
    p_recommendation
  )
  RETURNING id INTO v_eval_id;
  
  RETURN v_eval_id;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_application(UUID, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_application(UUID, JSONB, TEXT) TO authenticated;


-- ========================================
-- PART 5: REALTIME
-- ========================================

ALTER TABLE public.cohort_applications REPLICA IDENTITY FULL;
ALTER TABLE public.impact_metrics REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.cohort_applications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.impact_metrics;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

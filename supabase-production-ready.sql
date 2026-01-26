-- ========================================
-- PRODUCTION READINESS: AUDIT LOGS & VERSIONING
-- ========================================
-- Adds comprehensive audit logging, version control, and accountability tracking

-- ========================================
-- PART 1: AUDIT LOGGING
-- ========================================

-- TABLE: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- What changed
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  
  -- Who changed it
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_email TEXT,
  
  -- When
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- What changed (before/after)
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Audit logs readable by admin" ON public.audit_logs;
CREATE POLICY "Audit logs readable by admin" ON public.audit_logs
  FOR SELECT
  USING (public.has_role(ARRAY['admin']));


-- TABLE: template_versions
CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.program_templates(id) ON DELETE CASCADE,
  
  version_number INTEGER NOT NULL,
  
  -- Snapshot of template at this version
  template_data JSONB NOT NULL,
  
  -- Metadata
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_notes TEXT,
  
  UNIQUE(template_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON public.template_versions(template_id);

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Template versions readable" ON public.template_versions;
CREATE POLICY "Template versions readable" ON public.template_versions
  FOR SELECT
  USING (public.has_role(ARRAY['admin', 'coach']));


-- TABLE: instance_snapshots
CREATE TABLE IF NOT EXISTS public.instance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  
  -- Snapshot data
  snapshot_data JSONB NOT NULL,
  
  snapshot_type TEXT CHECK (snapshot_type IN ('manual', 'auto', 'milestone')),
  
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_instance_snapshots_instance ON public.instance_snapshots(instance_id);

ALTER TABLE public.instance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instance snapshots readable" ON public.instance_snapshots;
CREATE POLICY "Instance snapshots readable" ON public.instance_snapshots
  FOR SELECT
  USING (public.has_role(ARRAY['admin', 'coach']));


-- ========================================
-- PART 2: ONBOARDING & USER FEEDBACK
-- ========================================

-- TABLE: onboarding_progress
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  
  completed_tours TEXT[] DEFAULT ARRAY[]::TEXT[],
  current_step JSONB DEFAULT '{}'::jsonb,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Onboarding progress readable by owner" ON public.onboarding_progress;
CREATE POLICY "Onboarding progress readable by owner" ON public.onboarding_progress
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Onboarding progress writable by owner" ON public.onboarding_progress;
CREATE POLICY "Onboarding progress writable by owner" ON public.onboarding_progress
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- TABLE: user_feedback
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'survey', 'nps', 'general')),
  
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 10),
  
  -- Context
  page_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'completed', 'dismissed')),
  admin_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON public.user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User feedback readable" ON public.user_feedback;
CREATE POLICY "User feedback readable" ON public.user_feedback
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(ARRAY['admin']));


-- TABLE: rate_limit_tracking
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user ON public.rate_limit_tracking(user_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_tracking(window_end);

ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rate limit admin only" ON public.rate_limit_tracking;
CREATE POLICY "Rate limit admin only" ON public.rate_limit_tracking
  FOR SELECT
  USING (public.has_role(ARRAY['admin']));


-- ========================================
-- PART 3: AUDIT TRIGGERS
-- ========================================

-- Generic audit logging function
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  
  SELECT email INTO v_user_email
  FROM public.users
  WHERE id = v_user_id;
  
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    user_email,
    old_values,
    new_values
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_user_id,
    v_user_email,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to critical tables
DROP TRIGGER IF EXISTS tr_audit_program_templates ON public.program_templates;
CREATE TRIGGER tr_audit_program_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.program_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes();

DROP TRIGGER IF EXISTS tr_audit_program_instances ON public.program_instances;
CREATE TRIGGER tr_audit_program_instances
  AFTER INSERT OR UPDATE OR DELETE ON public.program_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes();

DROP TRIGGER IF EXISTS tr_audit_cohorts ON public.cohorts;
CREATE TRIGGER tr_audit_cohorts
  AFTER INSERT OR UPDATE OR DELETE ON public.cohorts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes();


-- ========================================
-- PART 4: RPC FUNCTIONS
-- ========================================

-- RPC: Get audit trail for an entity
CREATE OR REPLACE FUNCTION public.get_audit_trail(
  p_table_name TEXT,
  p_record_id UUID
)
RETURNS TABLE (
  id UUID,
  action TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ,
  old_values JSONB,
  new_values JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['admin', 'coach']) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.user_email,
    al.created_at,
    al.old_values,
    al.new_values
  FROM public.audit_logs al
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_audit_trail(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_audit_trail(TEXT, UUID) TO authenticated;


-- RPC: Create template version
CREATE OR REPLACE FUNCTION public.create_template_version(
  p_template_id UUID,
  p_change_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_number INTEGER;
  v_template_data JSONB;
  v_version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
  FROM public.template_versions
  WHERE template_id = p_template_id;
  
  -- Get current template data
  SELECT row_to_json(pt.*) INTO v_template_data
  FROM public.program_templates pt
  WHERE pt.id = p_template_id;
  
  -- Create version
  INSERT INTO public.template_versions (
    template_id,
    version_number,
    template_data,
    change_notes
  )
  VALUES (
    p_template_id,
    v_version_number,
    v_template_data,
    p_change_notes
  )
  RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_template_version(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_template_version(UUID, TEXT) TO authenticated;


-- RPC: Submit user feedback
CREATE OR REPLACE FUNCTION public.submit_feedback(
  p_feedback_type TEXT,
  p_content TEXT,
  p_rating INTEGER DEFAULT NULL,
  p_page_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feedback_id UUID;
BEGIN
  INSERT INTO public.user_feedback (
    user_id,
    feedback_type,
    content,
    rating,
    page_url
  )
  VALUES (
    auth.uid(),
    p_feedback_type,
    p_content,
    p_rating,
    p_page_url
  )
  RETURNING id INTO v_feedback_id;
  
  RETURN v_feedback_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback(TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback(TEXT, TEXT, INTEGER, TEXT) TO authenticated;

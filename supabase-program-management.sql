-- ========================================
-- DYNAMIC PROGRAM MANAGEMENT (Templates -> Instances)
-- ========================================
-- Adds:
-- - Program templates (admin-managed)
-- - Template stages (IDEA/PROTOTYPE/MVP/...) with ordered content items (videos/courses)
-- - Task templates per stage
-- - Program instances per student+project (generated from template)
-- - Instance tasks that coaches can customize (add/remove/reorder) and approve
--
-- Run this AFTER `supabase-schema.sql` and `supabase-projects.sql`.

-- UUID support (already enabled in supabase-schema.sql, but safe)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper for updated_at triggers (defined in supabase-projects.sql; safe)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Role helpers (RLS-safe). Idempotent.
CREATE OR REPLACE FUNCTION public.has_role(role_names TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = ANY(role_names)
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT[]) TO authenticated;

-- ========================================
-- TABLE: program_templates
-- ========================================
CREATE TABLE IF NOT EXISTS public.program_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_templates_active ON public.program_templates(is_active);

DROP TRIGGER IF EXISTS update_program_templates_updated_at ON public.program_templates;
CREATE TRIGGER update_program_templates_updated_at
  BEFORE UPDATE ON public.program_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.program_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Program templates readable" ON public.program_templates;
CREATE POLICY "Program templates readable" ON public.program_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Program templates writable by admin" ON public.program_templates;
CREATE POLICY "Program templates writable by admin" ON public.program_templates
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

-- ========================================
-- TABLE: program_template_stages
-- ========================================
CREATE TABLE IF NOT EXISTS public.program_template_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.program_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_program_template_stages_template ON public.program_template_stages(template_id);

DROP TRIGGER IF EXISTS update_program_template_stages_updated_at ON public.program_template_stages;
CREATE TRIGGER update_program_template_stages_updated_at
  BEFORE UPDATE ON public.program_template_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.program_template_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Template stages readable" ON public.program_template_stages;
CREATE POLICY "Template stages readable" ON public.program_template_stages
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Template stages writable by admin" ON public.program_template_stages;
CREATE POLICY "Template stages writable by admin" ON public.program_template_stages
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

-- ========================================
-- TABLE: program_template_contents (videos/courses/resources)
-- ========================================
CREATE TABLE IF NOT EXISTS public.program_template_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID NOT NULL REFERENCES public.program_template_stages(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'course', 'article', 'link')),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  provider TEXT,
  duration_minutes INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_template_contents_stage ON public.program_template_contents(stage_id);

DROP TRIGGER IF EXISTS update_program_template_contents_updated_at ON public.program_template_contents;
CREATE TRIGGER update_program_template_contents_updated_at
  BEFORE UPDATE ON public.program_template_contents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.program_template_contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Template contents readable" ON public.program_template_contents;
CREATE POLICY "Template contents readable" ON public.program_template_contents
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Template contents writable by admin" ON public.program_template_contents;
CREATE POLICY "Template contents writable by admin" ON public.program_template_contents
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

-- ========================================
-- TABLE: program_task_templates
-- ========================================
CREATE TABLE IF NOT EXISTS public.program_task_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id UUID NOT NULL REFERENCES public.program_template_stages(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general',
  order_index INTEGER NOT NULL DEFAULT 0,
  due_offset_days INTEGER,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_task_templates_stage ON public.program_task_templates(stage_id);

DROP TRIGGER IF EXISTS update_program_task_templates_updated_at ON public.program_task_templates;
CREATE TRIGGER update_program_task_templates_updated_at
  BEFORE UPDATE ON public.program_task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.program_task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Task templates readable" ON public.program_task_templates;
CREATE POLICY "Task templates readable" ON public.program_task_templates
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Task templates writable by admin" ON public.program_task_templates;
CREATE POLICY "Task templates writable by admin" ON public.program_task_templates
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));

-- ========================================
-- TABLE: program_instances
-- ========================================
CREATE TABLE IF NOT EXISTS public.program_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.program_templates(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id TEXT NULL REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  current_stage_id UUID NULL REFERENCES public.program_template_stages(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_instances_student ON public.program_instances(student_id);
CREATE INDEX IF NOT EXISTS idx_program_instances_template ON public.program_instances(template_id);

DROP TRIGGER IF EXISTS update_program_instances_updated_at ON public.program_instances;
CREATE TRIGGER update_program_instances_updated_at
  BEFORE UPDATE ON public.program_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.program_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instances readable by owner or staff" ON public.program_instances;
CREATE POLICY "Instances readable by owner or staff" ON public.program_instances
  FOR SELECT
  USING (student_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']));

-- Block direct writes from clients; use RPCs.
DROP POLICY IF EXISTS "Instances writable by staff" ON public.program_instances;
CREATE POLICY "Instances writable by staff" ON public.program_instances
  FOR ALL
  USING (public.has_role(ARRAY['coach', 'admin']))
  WITH CHECK (public.has_role(ARRAY['coach', 'admin']));

-- ========================================
-- TABLE: program_instance_tasks
-- ========================================
CREATE TABLE IF NOT EXISTS public.program_instance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id UUID NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  stage_id UUID NULL REFERENCES public.program_template_stages(id) ON DELETE SET NULL,
  template_task_id UUID NULL REFERENCES public.program_task_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'submitted', 'approved', 'rejected')),
  order_index INTEGER NOT NULL DEFAULT 0,
  deadline TIMESTAMPTZ,
  requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  student_submission JSONB,
  submitted_at TIMESTAMPTZ,
  coach_feedback TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_program_instance_tasks_instance ON public.program_instance_tasks(instance_id);
CREATE INDEX IF NOT EXISTS idx_program_instance_tasks_stage ON public.program_instance_tasks(stage_id);

DROP TRIGGER IF EXISTS update_program_instance_tasks_updated_at ON public.program_instance_tasks;
CREATE TRIGGER update_program_instance_tasks_updated_at
  BEFORE UPDATE ON public.program_instance_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.program_instance_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instance tasks readable by owner or staff" ON public.program_instance_tasks;
CREATE POLICY "Instance tasks readable by owner or staff" ON public.program_instance_tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_instances i
      WHERE i.id = instance_id
        AND (i.student_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']))
    )
  );

DROP POLICY IF EXISTS "Instance tasks writable by staff" ON public.program_instance_tasks;
CREATE POLICY "Instance tasks writable by staff" ON public.program_instance_tasks
  FOR ALL
  USING (public.has_role(ARRAY['coach', 'admin']))
  WITH CHECK (public.has_role(ARRAY['coach', 'admin']));

-- ========================================
-- RPC: create_program_instance (student enroll)
-- ========================================
CREATE OR REPLACE FUNCTION public.create_program_instance(
  p_template_id UUID,
  p_project_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_instance_id UUID;
  v_first_stage_id UUID;
  v_base TIMESTAMPTZ;
  v_order INTEGER := 0;
  r RECORD;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- template must exist and be active
  IF NOT EXISTS (SELECT 1 FROM public.program_templates t WHERE t.id = p_template_id AND t.is_active = TRUE) THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  SELECT s.id INTO v_first_stage_id
  FROM public.program_template_stages s
  WHERE s.template_id = p_template_id
  ORDER BY s.order_index ASC
  LIMIT 1;

  v_base := NOW();

  INSERT INTO public.program_instances (template_id, student_id, project_id, status, current_stage_id, started_at, created_by)
  VALUES (p_template_id, v_student_id, p_project_id, 'active', v_first_stage_id, v_base, v_student_id)
  RETURNING id INTO v_instance_id;

  FOR r IN
    SELECT
      tt.id AS template_task_id,
      tt.title,
      tt.description,
      tt.task_type,
      tt.order_index,
      tt.due_offset_days,
      tt.requires_approval,
      st.id AS stage_id,
      st.order_index AS stage_order
    FROM public.program_template_stages st
    JOIN public.program_task_templates tt ON tt.stage_id = st.id
    WHERE st.template_id = p_template_id
    ORDER BY st.order_index ASC, tt.order_index ASC
  LOOP
    v_order := v_order + 1;
    INSERT INTO public.program_instance_tasks (
      instance_id,
      stage_id,
      template_task_id,
      title,
      description,
      task_type,
      status,
      order_index,
      deadline,
      requires_approval,
      created_by
    )
    VALUES (
      v_instance_id,
      r.stage_id,
      r.template_task_id,
      r.title,
      r.description,
      r.task_type,
      'todo',
      v_order,
      CASE WHEN r.due_offset_days IS NULL THEN NULL ELSE (v_base + (r.due_offset_days || ' days')::interval) END,
      COALESCE(r.requires_approval, TRUE),
      v_student_id
    );
  END LOOP;

  RETURN v_instance_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_program_instance(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_program_instance(UUID, TEXT) TO authenticated;

-- ========================================
-- RPC: submit_program_instance_task (student)
-- ========================================
CREATE OR REPLACE FUNCTION public.submit_program_instance_task(
  p_task_id UUID,
  p_submission JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure the task belongs to the student's instance
  IF NOT EXISTS (
    SELECT 1
    FROM public.program_instance_tasks it
    JOIN public.program_instances i ON i.id = it.instance_id
    WHERE it.id = p_task_id
      AND i.student_id = v_student_id
  ) THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  UPDATE public.program_instance_tasks
  SET student_submission = p_submission,
      submitted_at = NOW(),
      status = 'submitted'
  WHERE id = p_task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_program_instance_task(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_program_instance_task(UUID, JSONB) TO authenticated;

-- ========================================
-- RPC: approve_program_instance_task (coach/admin)
-- ========================================
CREATE OR REPLACE FUNCTION public.approve_program_instance_task(
  p_task_id UUID,
  p_feedback TEXT DEFAULT NULL,
  p_approved BOOLEAN DEFAULT TRUE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['coach', 'admin']) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.program_instance_tasks
  SET coach_feedback = p_feedback,
      approved_at = NOW(),
      approved_by = auth.uid(),
      status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END
  WHERE id = p_task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_program_instance_task(UUID, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_program_instance_task(UUID, TEXT, BOOLEAN) TO authenticated;

-- ========================================
-- RPC: reorder_program_instance_tasks (coach/admin)
-- ========================================
CREATE OR REPLACE FUNCTION public.reorder_program_instance_tasks(
  p_instance_id UUID,
  p_task_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['coach', 'admin']) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.program_instance_tasks t
  SET order_index = u.ord
  FROM (
    SELECT unnest(p_task_ids) AS id, generate_subscripts(p_task_ids, 1) AS ord
  ) u
  WHERE t.instance_id = p_instance_id
    AND t.id = u.id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_program_instance_tasks(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_program_instance_tasks(UUID, UUID[]) TO authenticated;

-- ========================================
-- RPC: advance_program_instance_stage (coach/admin)
-- ========================================
CREATE OR REPLACE FUNCTION public.advance_program_instance_stage(
  p_instance_id UUID,
  p_stage_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['coach', 'admin']) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.program_instances
  SET current_stage_id = p_stage_id
  WHERE id = p_instance_id;
END;
$$;

REVOKE ALL ON FUNCTION public.advance_program_instance_stage(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_program_instance_stage(UUID, UUID) TO authenticated;

-- ========================================
-- RPC: inject_program_instance_task (coach/admin)
-- ========================================
CREATE OR REPLACE FUNCTION public.inject_program_instance_task(
  p_instance_id UUID,
  p_stage_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_task_type TEXT DEFAULT 'general',
  p_deadline TIMESTAMPTZ DEFAULT NULL,
  p_requires_approval BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
  v_next_order INTEGER;
BEGIN
  IF NOT public.has_role(ARRAY['coach', 'admin']) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(MAX(order_index), 0) + 1 INTO v_next_order
  FROM public.program_instance_tasks
  WHERE instance_id = p_instance_id;

  INSERT INTO public.program_instance_tasks (
    instance_id,
    stage_id,
    template_task_id,
    title,
    description,
    task_type,
    status,
    order_index,
    deadline,
    requires_approval,
    created_by
  )
  VALUES (
    p_instance_id,
    p_stage_id,
    NULL,
    p_title,
    p_description,
    p_task_type,
    'todo',
    v_next_order,
    p_deadline,
    COALESCE(p_requires_approval, TRUE),
    auth.uid()
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.inject_program_instance_task(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.inject_program_instance_task(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) TO authenticated;

-- ========================================
-- RPC: extend_program_instance_task_deadline (coach/admin)
-- ========================================
CREATE OR REPLACE FUNCTION public.extend_program_instance_task_deadline(
  p_task_id UUID,
  p_deadline TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(ARRAY['coach', 'admin']) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.program_instance_tasks
  SET deadline = p_deadline
  WHERE id = p_task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.extend_program_instance_task_deadline(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.extend_program_instance_task_deadline(UUID, TIMESTAMPTZ) TO authenticated;

-- ========================================
-- Realtime publication (optional)
-- ========================================
ALTER TABLE public.program_instances REPLICA IDENTITY FULL;
ALTER TABLE public.program_instance_tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Publication may already exist; adding is idempotent in Supabase.
  ALTER PUBLICATION supabase_realtime ADD TABLE public.program_instances;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.program_instance_tasks;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
  WHEN undefined_object THEN
    -- supabase_realtime publication not present (rare)
    NULL;
END $$;

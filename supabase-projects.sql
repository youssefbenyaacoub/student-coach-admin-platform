-- ========================================
-- PROJECTS + PROJECT SUBMISSIONS (Supabase)
-- ========================================
-- Purpose:
-- - Persist student projects in Postgres (not browser localStorage)
-- - Allow admin/coach to review all projects
-- - Allow students to see their own projects
--
-- Run this AFTER `supabase-schema.sql` (recommended) so the users table
-- and the update_updated_at_column() function already exist.

-- Safety: create helper function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safety: helper for role checks (avoids RLS recursion on public.users)
-- NOTE: This assumes you keep user roles in public.users(role).
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

CREATE OR REPLACE FUNCTION public.user_has_role(target_user_id UUID, role_names TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = target_user_id
      AND u.role = ANY(role_names)
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, TEXT[]) TO authenticated;

-- =========================
-- TABLE: projects
-- =========================
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_student_id ON public.projects(student_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects readable by owner or role" ON public.projects;
CREATE POLICY "Projects readable by owner or role" ON public.projects
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.has_role(ARRAY['coach', 'admin'])
  );

DROP POLICY IF EXISTS "Projects insertable by owner or role" ON public.projects;
CREATE POLICY "Projects insertable by owner or role" ON public.projects
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    OR public.has_role(ARRAY['coach', 'admin'])
  );

DROP POLICY IF EXISTS "Projects updatable by owner or role" ON public.projects;
CREATE POLICY "Projects updatable by owner or role" ON public.projects
  FOR UPDATE
  USING (
    student_id = auth.uid()
    OR public.has_role(ARRAY['coach', 'admin'])
  )
  WITH CHECK (
    student_id = auth.uid()
    OR public.has_role(ARRAY['coach', 'admin'])
  );

DROP POLICY IF EXISTS "Projects deletable by admin" ON public.projects;
CREATE POLICY "Projects deletable by admin" ON public.projects
  FOR DELETE
  USING (
    public.has_role(ARRAY['admin'])
  );

-- =========================
-- TABLE: project_submissions
-- =========================
CREATE TABLE IF NOT EXISTS public.project_submissions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviewer_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_submissions_project_id ON public.project_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_created_at ON public.project_submissions(created_at);

DROP TRIGGER IF EXISTS update_project_submissions_updated_at ON public.project_submissions;
CREATE TRIGGER update_project_submissions_updated_at
  BEFORE UPDATE ON public.project_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Project submissions readable by owner or role" ON public.project_submissions;
CREATE POLICY "Project submissions readable by owner or role" ON public.project_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.student_id = auth.uid()
          OR public.has_role(ARRAY['coach', 'admin'])
        )
    )
  );

DROP POLICY IF EXISTS "Project submissions insertable by owner or role" ON public.project_submissions;
CREATE POLICY "Project submissions insertable by owner or role" ON public.project_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.student_id = auth.uid()
          OR public.has_role(ARRAY['coach', 'admin'])
        )
    )
  );

DROP POLICY IF EXISTS "Project submissions updatable by owner or role" ON public.project_submissions;
CREATE POLICY "Project submissions updatable by owner or role" ON public.project_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.student_id = auth.uid()
          OR public.has_role(ARRAY['coach', 'admin'])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND (
          p.student_id = auth.uid()
          OR public.has_role(ARRAY['coach', 'admin'])
        )
    )
  );

DROP POLICY IF EXISTS "Project submissions deletable by admin" ON public.project_submissions;
CREATE POLICY "Project submissions deletable by admin" ON public.project_submissions
  FOR DELETE
  USING (
    public.has_role(ARRAY['admin'])
  );

-- ========================================
-- NOTIFICATIONS (DB triggers)
-- ========================================
-- Ensures notifications are created even if client-side fan-out fails.

CREATE OR REPLACE FUNCTION public.notify_staff_on_project_submission_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prj RECORD;
  staff RECORD;
  msg TEXT;
BEGIN
  SELECT p.id, p.title, p.student_id, p.stage
    INTO prj
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF prj.id IS NULL THEN
    RETURN NEW;
  END IF;

  msg := COALESCE(prj.title, 'Project') || ': ' || upper(COALESCE(NEW.type, 'submission')) || ' submitted.';

  FOR staff IN
    SELECT u.id
    FROM public.users u
    WHERE u.role IN ('coach', 'admin')
      AND u.id <> prj.student_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link_url, meta)
    VALUES (
      staff.id,
      'info',
      'New project submission',
      msg,
      '/coach/projects',
      jsonb_build_object(
        'source', 'db',
        'projectId', prj.id,
        'submissionId', NEW.id,
        'studentId', prj.student_id,
        'submissionType', NEW.type,
        'status', NEW.status,
        'stage', prj.stage
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_project_submission_insert ON public.project_submissions;
CREATE TRIGGER trg_notify_staff_on_project_submission_insert
AFTER INSERT ON public.project_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_on_project_submission_insert();

CREATE OR REPLACE FUNCTION public.notify_student_on_project_submission_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prj RECORD;
  student_id UUID;
  label TEXT;
  ntf_type TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Don't notify for transitions back to pending.
  IF COALESCE(NEW.status, '') = 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT p.id, p.title, p.student_id
    INTO prj
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  student_id := prj.student_id;
  IF student_id IS NULL THEN
    RETURN NEW;
  END IF;

  label := lower(COALESCE(NEW.status, 'updated'));
  ntf_type := CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'info' END;

  INSERT INTO public.notifications (user_id, type, title, message, link_url, meta)
  VALUES (
    student_id,
    ntf_type,
    'Submission status updated',
    'Your ' || upper(COALESCE(NEW.type, 'submission')) || ' submission was ' || label || '.',
    '/student/projects',
    jsonb_build_object(
      'source', 'db',
      'projectId', prj.id,
      'submissionId', NEW.id,
      'status', NEW.status,
      'reviewerId', NEW.reviewer_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_student_on_project_submission_status_update ON public.project_submissions;
CREATE TRIGGER trg_notify_student_on_project_submission_status_update
AFTER UPDATE OF status ON public.project_submissions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_student_on_project_submission_status_update();

-- ========================================
-- REALTIME (optional but recommended)
-- ========================================
-- Enables postgres_changes subscriptions for projects/submissions.
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.project_submissions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'project_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_submissions;
  END IF;
END $$;

-- ========================================
-- GRANTS
-- ========================================
-- RLS still applies; this just allows the client role to attempt queries.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_submissions TO authenticated;

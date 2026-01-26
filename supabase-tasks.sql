-- ========================================
-- TASKS (Supabase)
-- ========================================
-- Purpose:
-- - Persist coach-created tasks in Postgres (no browser storage)
-- - Allow students to submit task deliverables
-- - Allow coaches/admins to review tasks
--
-- Run this AFTER `supabase-schema.sql` (recommended) so the users table
-- and update_updated_at_column() already exist.

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

REVOKE ALL ON FUNCTION public.has_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT[]) TO authenticated;

-- =========================
-- TABLE: tasks
-- =========================
-- NOTE: `id` is TEXT to match the app's existing ID style (e.g. "tsk_...").
-- `student_id` is denormalized for easier RLS checks and querying.
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submission_id TEXT NULL REFERENCES public.project_submissions(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT NULL,
  task_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'pending',
  deadline TIMESTAMPTZ NULL,

  checklist_items JSONB NULL,

  student_submission JSONB NULL,
  submitted_at TIMESTAMPTZ NULL,

  coach_feedback TEXT NULL,
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,

  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_student_id ON public.tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON public.tasks(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline);

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow students to see their tasks; allow staff to see everything.
DROP POLICY IF EXISTS "Tasks readable by owner or role" ON public.tasks;
CREATE POLICY "Tasks readable by owner or role" ON public.tasks
  FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.has_role(ARRAY['coach', 'admin'])
  );

-- Only staff can create tasks (created_by must be the current user).
DROP POLICY IF EXISTS "Tasks insertable by staff" ON public.tasks;
CREATE POLICY "Tasks insertable by staff" ON public.tasks
  FOR INSERT
  WITH CHECK (
    public.has_role(ARRAY['coach', 'admin'])
    AND created_by = auth.uid()
  );

-- Students can update their own tasks (for submission); staff can update any.
DROP POLICY IF EXISTS "Tasks updatable by owner or role" ON public.tasks;
CREATE POLICY "Tasks updatable by owner or role" ON public.tasks
  FOR UPDATE
  USING (
    student_id = auth.uid()
    OR public.has_role(ARRAY['coach', 'admin'])
  )
  WITH CHECK (
    student_id = auth.uid()
    OR public.has_role(ARRAY['coach', 'admin'])
  );

-- Only admin can delete tasks.
DROP POLICY IF EXISTS "Tasks deletable by admin" ON public.tasks;
CREATE POLICY "Tasks deletable by admin" ON public.tasks
  FOR DELETE
  USING (
    public.has_role(ARRAY['admin'])
  );

-- ========================================
-- REALTIME (optional but recommended)
-- ========================================
ALTER TABLE public.tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- ========================================
-- GRANTS
-- ========================================
-- RLS still applies; this just allows the client role to attempt queries.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tasks TO authenticated;

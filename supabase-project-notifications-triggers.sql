-- Project submission notifications (DB triggers)
--
-- Purpose:
-- - Ensure notifications are created reliably for:
--   1) Student submits a project submission -> notify all staff (coach/admin)
--   2) Staff approves/declines/reviews (status change) -> notify the student
--
-- Prerequisites:
-- - public.users exists with roles in ('student','coach','admin')
-- - public.notifications exists and is in supabase_realtime publication (optional but recommended)
-- - public.projects and public.project_submissions exist (see supabase-projects.sql)
--
-- Recommended run order in Supabase SQL Editor:
-- 1) supabase-schema.sql
-- 2) supabase-notifications-realtime.sql
-- 3) supabase-projects.sql
-- 4) this file

-- Enable UUID extension (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- ROLE HELPERS (RLS-safe)
-- ========================================
-- SECURITY DEFINER avoids RLS recursion when policies/functions need role checks.

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

-- ========================================
-- TRIGGER: notify staff on new submission
-- ========================================

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

-- ========================================
-- TRIGGER: notify student on status change
-- ========================================

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

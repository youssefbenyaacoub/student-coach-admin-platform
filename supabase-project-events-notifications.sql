-- Project notifications (DB triggers) - Extended
--
-- Covers:
-- - Project created -> notify staff (coach/admin)
-- - Project stage changed -> notify student (if staff changed) OR notify staff (if student changed)
-- - New submission -> notify staff
-- - Submission status changed -> notify student
-- - New comment added to a submission -> notify the other side
--
-- Run this in Supabase SQL Editor AFTER:
-- - supabase-schema.sql
-- - supabase-notifications-realtime.sql
-- - supabase-projects.sql
--
-- Safe to run multiple times (idempotent via CREATE OR REPLACE + DROP TRIGGER IF EXISTS)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- ROLE HELPERS (RLS-safe)
-- ========================================
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
-- PROJECT: notify staff on create
-- ========================================
CREATE OR REPLACE FUNCTION public.notify_staff_on_project_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff RECORD;
  msg TEXT;
BEGIN
  msg := COALESCE(NEW.title, 'Project') || ' (' || COALESCE(NEW.stage, '') || ') created by a student.';

  FOR staff IN
    SELECT u.id
    FROM public.users u
    WHERE u.role IN ('coach', 'admin')
      AND u.id <> NEW.student_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link_url, meta)
    VALUES (
      staff.id,
      'info',
      'New project created',
      msg,
      '/coach/projects',
      jsonb_build_object(
        'source', 'db',
        'projectId', NEW.id,
        'studentId', NEW.student_id,
        'stage', NEW.stage
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_staff_on_project_insert ON public.projects;
CREATE TRIGGER trg_notify_staff_on_project_insert
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_on_project_insert();

-- ========================================
-- PROJECT: notify on stage change
-- ========================================
CREATE OR REPLACE FUNCTION public.notify_on_project_stage_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff RECORD;
  msg TEXT;
BEGIN
  IF NEW.stage IS NOT DISTINCT FROM OLD.stage THEN
    RETURN NEW;
  END IF;

  msg := COALESCE(NEW.title, 'Project') || ' is now in stage: ' || COALESCE(NEW.stage, '') || '.';

  -- If staff changed it, notify student.
  IF public.has_role(ARRAY['coach', 'admin']) THEN
    INSERT INTO public.notifications (user_id, type, title, message, link_url, meta)
    VALUES (
      NEW.student_id,
      'info',
      'Project stage updated',
      msg,
      '/student/projects',
      jsonb_build_object('source','db','projectId',NEW.id,'stage',NEW.stage,'actorId',auth.uid())
    );
    RETURN NEW;
  END IF;

  -- If student changed it, notify staff.
  IF public.has_role(ARRAY['student']) THEN
    FOR staff IN
      SELECT u.id
      FROM public.users u
      WHERE u.role IN ('coach', 'admin')
        AND u.id <> NEW.student_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link_url, meta)
      VALUES (
        staff.id,
        'info',
        'Project stage updated',
        msg,
        '/coach/projects',
        jsonb_build_object('source','db','projectId',NEW.id,'stage',NEW.stage,'studentId',NEW.student_id,'actorId',auth.uid())
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_project_stage_update ON public.projects;
CREATE TRIGGER trg_notify_on_project_stage_update
AFTER UPDATE OF stage ON public.projects
FOR EACH ROW
WHEN (OLD.stage IS DISTINCT FROM NEW.stage)
EXECUTE FUNCTION public.notify_on_project_stage_update();

-- ========================================
-- SUBMISSION: notify staff on new submission
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
-- SUBMISSION: notify student on status change
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

-- ========================================
-- SUBMISSION: notify on new comment
-- ========================================
CREATE OR REPLACE FUNCTION public.notify_on_project_submission_comment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prj RECORD;
  old_len INT;
  new_len INT;
  last_author_id UUID;
  staff RECORD;
BEGIN
  old_len := COALESCE(jsonb_array_length(OLD.comments), 0);
  new_len := COALESCE(jsonb_array_length(NEW.comments), 0);

  -- Only fire when a new comment was appended.
  IF new_len <= old_len THEN
    RETURN NEW;
  END IF;

  SELECT p.id, p.title, p.student_id
    INTO prj
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF prj.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Try to read authorId from the last comment (your app stores {authorId, text, createdAt}).
  BEGIN
    last_author_id := NULLIF((NEW.comments -> (new_len - 1) ->> 'authorId')::uuid, NULL);
  EXCEPTION WHEN others THEN
    last_author_id := NULL;
  END;

  -- If staff authored, notify student.
  IF last_author_id IS NOT NULL AND public.user_has_role(last_author_id, ARRAY['coach','admin']) THEN
    INSERT INTO public.notifications (user_id, type, title, message, link_url, meta)
    VALUES (
      prj.student_id,
      'info',
      'New comment on your submission',
      'A coach/admin commented on ' || COALESCE(prj.title, 'your project') || '.',
      '/student/projects',
      jsonb_build_object('source','db','projectId',prj.id,'submissionId',NEW.id,'authorId',last_author_id)
    );
    RETURN NEW;
  END IF;

  -- If student authored (or unknown), notify staff.
  FOR staff IN
    SELECT u.id
    FROM public.users u
    WHERE u.role IN ('coach','admin')
      AND u.id <> prj.student_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link_url, meta)
    VALUES (
      staff.id,
      'info',
      'New student comment',
      'A student commented on ' || COALESCE(prj.title, 'a project') || '.',
      '/coach/projects',
      jsonb_build_object('source','db','projectId',prj.id,'submissionId',NEW.id,'authorId',last_author_id,'studentId',prj.student_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_project_submission_comment_update ON public.project_submissions;
CREATE TRIGGER trg_notify_on_project_submission_comment_update
AFTER UPDATE OF comments ON public.project_submissions
FOR EACH ROW
WHEN (OLD.comments IS DISTINCT FROM NEW.comments)
EXECUTE FUNCTION public.notify_on_project_submission_comment_update();

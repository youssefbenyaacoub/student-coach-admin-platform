-- Supabase Notifications + Realtime (idempotent)
-- Run this in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- 1) Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- 2) Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- 3) RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins/coaches can create notifications" ON public.notifications;
CREATE POLICY "Admins/coaches can create notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    public.has_role(ARRAY['coach', 'admin'])
  );

DROP POLICY IF EXISTS "Users can create self notifications" ON public.notifications;
CREATE POLICY "Users can create self notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow students to notify staff (coach/admin) when students take actions that require review.
-- Prevents student -> student spam.
DROP POLICY IF EXISTS "Students can notify staff" ON public.notifications;
CREATE POLICY "Students can notify staff" ON public.notifications
  FOR INSERT
  WITH CHECK (
    public.has_role(ARRAY['student'])
    AND public.user_has_role(user_id, ARRAY['coach', 'admin'])
  );

DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- 4) Realtime
-- Ensures UPDATE payload contains the full row.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 5) Session trigger: notify when student is added to a session
CREATE OR REPLACE FUNCTION public.notify_student_on_session_attendee_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sess RECORD;
  msg TEXT;
BEGIN
  SELECT id, title, starts_at, program_id
    INTO sess
  FROM public.coaching_sessions
  WHERE id = NEW.session_id;

  IF sess.id IS NULL THEN
    RETURN NEW;
  END IF;

  msg := COALESCE(sess.title, 'Session');
  IF sess.starts_at IS NOT NULL THEN
    msg := msg || ' on ' || to_char(sess.starts_at, 'YYYY-MM-DD HH24:MI');
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link_url, meta)
  VALUES (
    NEW.student_id,
    'session',
    'New coaching session scheduled',
    msg,
    '/student/sessions',
    jsonb_build_object('sessionId', NEW.session_id, 'programId', sess.program_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_student_on_session_attendee_insert ON public.session_attendees;
CREATE TRIGGER trg_notify_student_on_session_attendee_insert
AFTER INSERT ON public.session_attendees
FOR EACH ROW
EXECUTE FUNCTION public.notify_student_on_session_attendee_insert();

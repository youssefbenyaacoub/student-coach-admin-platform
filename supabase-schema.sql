-- SEA Platform Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS TABLE
-- ========================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('student', 'coach', 'admin')),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  
  -- Common fields
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Admin specific
  department TEXT,
  title TEXT,
  
  -- Coach specific
  expertise TEXT[],
  bio TEXT,
  
  -- Student specific
  university TEXT,
  major TEXT,
  year TEXT,
  interests TEXT[],
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  badges TEXT[]
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ========================================
-- PROGRAMS TABLE
-- ========================================
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  duration_weeks INTEGER NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- PROGRAM COACHES (Many-to-Many)
-- ========================================
CREATE TABLE program_coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, coach_id)
);

CREATE INDEX idx_program_coaches_program ON program_coaches(program_id);
CREATE INDEX idx_program_coaches_coach ON program_coaches(coach_id);

-- ========================================
-- PROGRAM PARTICIPANTS (Many-to-Many)
-- ========================================
CREATE TABLE program_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, student_id)
);

CREATE INDEX idx_program_participants_program ON program_participants(program_id);
CREATE INDEX idx_program_participants_student ON program_participants(student_id);

-- ========================================
-- APPLICATIONS TABLE
-- ========================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  motivation TEXT,
  decision_note TEXT,
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_applications_program ON applications(program_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ========================================
-- COACHING SESSIONS TABLE
-- ========================================
CREATE TABLE coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coaching_sessions_program ON coaching_sessions(program_id);
CREATE INDEX idx_coaching_sessions_coach ON coaching_sessions(coach_id);
CREATE INDEX idx_coaching_sessions_starts_at ON coaching_sessions(starts_at);

-- ========================================
-- SESSION ATTENDEES (Many-to-Many)
-- ========================================
CREATE TABLE session_attendees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES coaching_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attendance_status TEXT CHECK (attendance_status IN ('present', 'absent', 'late')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

CREATE INDEX idx_session_attendees_session ON session_attendees(session_id);
CREATE INDEX idx_session_attendees_student ON session_attendees(student_id);

-- ========================================
-- DELIVERABLES TABLE
-- ========================================
CREATE TABLE deliverables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  max_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliverables_program ON deliverables(program_id);
CREATE INDEX idx_deliverables_due_date ON deliverables(due_date);

-- ========================================
-- DELIVERABLE ASSIGNMENTS (Many-to-Many)
-- ========================================
CREATE TABLE deliverable_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deliverable_id, student_id)
);

CREATE INDEX idx_deliverable_assignments_deliverable ON deliverable_assignments(deliverable_id);
CREATE INDEX idx_deliverable_assignments_student ON deliverable_assignments(student_id);

-- ========================================
-- SUBMISSIONS TABLE
-- ========================================
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'graded')),
  submitted_at TIMESTAMPTZ,
  files JSONB DEFAULT '[]',
  grade INTEGER,
  feedback TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deliverable_id, student_id)
);

CREATE INDEX idx_submissions_deliverable ON submissions(deliverable_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- ========================================
-- MESSAGES TABLE
-- ========================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_read ON messages(read);

-- ========================================
-- NOTIFICATIONS TABLE
-- ========================================
-- Used for persistent cross-user notifications (bell UI)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users to read/write
-- You can customize these policies based on your security requirements

-- Users: Everyone can read, but only update their own profile
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Programs: Everyone can read
CREATE POLICY "Programs are viewable by everyone" ON programs FOR SELECT USING (true);
CREATE POLICY "Admins can manage programs" ON programs FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Applications: Students can create/view their own, coaches/admins can view all
CREATE POLICY "Students can view own applications" ON applications FOR SELECT USING (
  student_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
);

CREATE POLICY "Students can create applications" ON applications FOR INSERT WITH CHECK (
  student_id = auth.uid()
);

-- Messages: Users can view their own sent/received messages
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);

CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);

-- Allow recipients to mark their received messages as read
CREATE POLICY "Recipients can update received messages" ON messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Notifications: users can read and mark read their own notifications.
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "Admins/coaches can create notifications" ON notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('coach', 'admin'))
);

CREATE POLICY "Users can create self notifications" ON notifications FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- Allow students to notify staff (coach/admin) when students take actions that require review.
-- This enables student -> coach/admin realtime notifications while preventing student -> student spam.
DROP POLICY IF EXISTS "Students can notify staff" ON notifications;
CREATE POLICY "Students can notify staff" ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'student')
    AND EXISTS (SELECT 1 FROM public.users t WHERE t.id = user_id AND t.role IN ('coach', 'admin'))
  );

CREATE POLICY "Users can mark own notifications read" ON notifications FOR UPDATE USING (
  user_id = auth.uid()
);

-- Add similar policies for other tables as needed

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coaching_sessions_updated_at BEFORE UPDATE ON coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notifications table does not need updated_at; read_at is set explicitly.

-- ========================================
-- REALTIME (Supabase Realtime)
-- ========================================
-- Required so INSERT/UPDATE events are broadcast to clients.
-- If you prefer UI: Database -> Replication -> enable Realtime for notifications.

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

-- ========================================
-- NOTIFICATION TRIGGERS (Sessions)
-- ========================================
-- When a student is added to a coaching session, create a notification row.
-- This guarantees the student gets notified even if the session was created
-- outside the app (SQL Editor, admin tooling, etc.).

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

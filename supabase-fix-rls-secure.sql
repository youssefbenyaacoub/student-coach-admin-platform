-- Safer RLS Policies (No permissive write policies)
-- Run this in Supabase SQL Editor.
-- Purpose: Replace the development policies like USING(true)/WITH CHECK(true) for INSERT/UPDATE.

-- ========================================
-- 0) Helper checks (inline via EXISTS)
-- ========================================

-- ========================================
-- 1) USERS
-- ========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.users;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Public (or app-wide) read is OK
CREATE POLICY "Users are viewable by everyone" ON public.users
FOR SELECT
USING (true);

-- Allow creating the profile row that matches the auth user id
CREATE POLICY "Users can insert their own profile" ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to edit their own profile
CREATE POLICY "Users can update own profile" ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ========================================
-- 2) PROGRAMS
-- ========================================
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.programs;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.programs;
DROP POLICY IF EXISTS "Programs are viewable by everyone" ON public.programs;
DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
DROP POLICY IF EXISTS "Admins can insert programs" ON public.programs;
DROP POLICY IF EXISTS "Admins can update programs" ON public.programs;
DROP POLICY IF EXISTS "Admins can delete programs" ON public.programs;

CREATE POLICY "Programs are viewable by everyone" ON public.programs
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert programs" ON public.programs
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "Admins can update programs" ON public.programs
FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "Admins can delete programs" ON public.programs
FOR DELETE
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ========================================
-- 3) PROGRAM_COACHES
-- ========================================
ALTER TABLE public.program_coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON public.program_coaches;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.program_coaches;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.program_coaches;

CREATE POLICY "Program coaches readable by authenticated" ON public.program_coaches
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins manage program coaches" ON public.program_coaches
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ========================================
-- 4) PROGRAM_PARTICIPANTS
-- ========================================
ALTER TABLE public.program_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON public.program_participants;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.program_participants;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.program_participants;

-- Students can see their own enrollments; coaches can see enrollments for programs they coach; admins see all
CREATE POLICY "Participants readable by role" ON public.program_participants
FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.program_coaches pc
    WHERE pc.program_id = program_participants.program_id
      AND pc.coach_id = auth.uid()
  )
);

-- Students can enroll themselves; admins can enroll anyone
CREATE POLICY "Students enroll themselves" ON public.program_participants
FOR INSERT TO authenticated
WITH CHECK (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- Only admins can update/delete enrollments (keep it simple)
CREATE POLICY "Admins update enrollments" ON public.program_participants
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "Admins delete enrollments" ON public.program_participants
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ========================================
-- 5) COACHING_SESSIONS
-- ========================================
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.coaching_sessions;

-- Read: authenticated users can see sessions
CREATE POLICY "Sessions readable by authenticated" ON public.coaching_sessions
FOR SELECT TO authenticated
USING (true);

-- Write: coaches manage their own sessions; admins manage all
CREATE POLICY "Coaches insert own sessions" ON public.coaching_sessions
FOR INSERT TO authenticated
WITH CHECK (
  coach_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

CREATE POLICY "Coaches update own sessions" ON public.coaching_sessions
FOR UPDATE TO authenticated
USING (
  coach_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
)
WITH CHECK (
  coach_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

CREATE POLICY "Coaches delete own sessions" ON public.coaching_sessions
FOR DELETE TO authenticated
USING (
  coach_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- ========================================
-- 6) SESSION_ATTENDEES
-- ========================================
ALTER TABLE public.session_attendees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON public.session_attendees;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.session_attendees;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.session_attendees;

-- Read: students see their own attendance; session coach/admin can see attendees
CREATE POLICY "Attendees readable by role" ON public.session_attendees
FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.coaching_sessions cs
    WHERE cs.id = session_attendees.session_id
      AND cs.coach_id = auth.uid()
  )
);

-- Insert: students register themselves; session coach/admin can add attendees
CREATE POLICY "Attendees insert" ON public.session_attendees
FOR INSERT TO authenticated
WITH CHECK (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.coaching_sessions cs
    WHERE cs.id = session_attendees.session_id
      AND cs.coach_id = auth.uid()
  )
);

-- Update: only session coach/admin can update attendance status
CREATE POLICY "Attendees update by coach" ON public.session_attendees
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.coaching_sessions cs
    WHERE cs.id = session_attendees.session_id
      AND cs.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.coaching_sessions cs
    WHERE cs.id = session_attendees.session_id
      AND cs.coach_id = auth.uid()
  )
);

-- ========================================
-- 7) DELIVERABLES
-- ========================================
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON public.deliverables;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.deliverables;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.deliverables;

CREATE POLICY "Deliverables readable by authenticated" ON public.deliverables
FOR SELECT TO authenticated
USING (true);

-- Coaches of a program (or admins) manage deliverables for that program
CREATE POLICY "Coaches insert deliverables" ON public.deliverables
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.program_coaches pc
    WHERE pc.program_id = deliverables.program_id
      AND pc.coach_id = auth.uid()
  )
);

CREATE POLICY "Coaches update deliverables" ON public.deliverables
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.program_coaches pc
    WHERE pc.program_id = deliverables.program_id
      AND pc.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.program_coaches pc
    WHERE pc.program_id = deliverables.program_id
      AND pc.coach_id = auth.uid()
  )
);

-- ========================================
-- 8) DELIVERABLE_ASSIGNMENTS
-- ========================================
ALTER TABLE public.deliverable_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON public.deliverable_assignments;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.deliverable_assignments;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.deliverable_assignments;

-- Read: students see their own assignments; coaches/admin see assignments in their programs
CREATE POLICY "Assignments readable" ON public.deliverable_assignments
FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.deliverables d
    JOIN public.program_coaches pc ON pc.program_id = d.program_id
    WHERE d.id = deliverable_assignments.deliverable_id
      AND pc.coach_id = auth.uid()
  )
);

-- Insert/update: coaches/admin only
CREATE POLICY "Assignments insert by coach" ON public.deliverable_assignments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.deliverables d
    JOIN public.program_coaches pc ON pc.program_id = d.program_id
    WHERE d.id = deliverable_assignments.deliverable_id
      AND pc.coach_id = auth.uid()
  )
);

CREATE POLICY "Assignments update by coach" ON public.deliverable_assignments
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- ========================================
-- 9) SUBMISSIONS
-- ========================================
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON public.submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.submissions;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.submissions;

-- Read: student sees their own; coaches/admin see submissions for their programs
CREATE POLICY "Submissions readable" ON public.submissions
FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.deliverables d
    JOIN public.program_coaches pc ON pc.program_id = d.program_id
    WHERE d.id = submissions.deliverable_id
      AND pc.coach_id = auth.uid()
  )
);

-- Insert: student submits their own
CREATE POLICY "Students insert own submissions" ON public.submissions
FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

-- Update: student updates their own; coaches/admin can grade
CREATE POLICY "Students update own submissions" ON public.submissions
FOR UPDATE TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Coaches update submissions" ON public.submissions
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.deliverables d
    JOIN public.program_coaches pc ON pc.program_id = d.program_id
    WHERE d.id = submissions.deliverable_id
      AND pc.coach_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.deliverables d
    JOIN public.program_coaches pc ON pc.program_id = d.program_id
    WHERE d.id = submissions.deliverable_id
      AND pc.coach_id = auth.uid()
  )
);

-- ========================================
-- 10) Function hardening (linter warning)
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public, extensions;

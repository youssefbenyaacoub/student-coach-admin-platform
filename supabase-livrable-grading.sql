-- ========================================
-- LIVRABLE GRADING SYSTEM SCHEMA
-- ========================================
-- Comprehensive grading interface for referents to evaluate student livrables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. LIVRABLE TEMPLATES TABLE
-- ========================================
-- Defines deliverable types and phases
CREATE TABLE IF NOT EXISTS livrable_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phase INTEGER NOT NULL DEFAULT 1,
  phase_name TEXT, -- e.g., "Business Plan - Phase 1"
  rubric_id UUID, -- Will reference grading_rubrics after it's created
  max_file_size_mb INTEGER DEFAULT 50,
  allowed_file_types TEXT[] DEFAULT ARRAY['application/pdf'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_livrable_templates_program ON livrable_templates(program_id);
CREATE INDEX idx_livrable_templates_phase ON livrable_templates(phase);

-- ========================================
-- 2. GRADING RUBRICS TABLE
-- ========================================
-- Rubric definitions with criteria and weights
CREATE TABLE IF NOT EXISTS grading_rubrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  criteria_json JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"id": "clarity", "name": "Clarity", "description": "...", "weight": 0.3, "maxScore": 100}]
  weights_json JSONB NOT NULL DEFAULT '{}',
  -- Example: {"clarity": 0.3, "innovation": 0.4, "feasibility": 0.3}
  total_points INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to livrable_templates now that grading_rubrics exists
ALTER TABLE livrable_templates 
  ADD CONSTRAINT fk_livrable_templates_rubric 
  FOREIGN KEY (rubric_id) REFERENCES grading_rubrics(id) ON DELETE SET NULL;

-- ========================================
-- 3. LIVRABLE SUBMISSIONS TABLE
-- ========================================
-- Student submissions with version tracking and locking
CREATE TABLE IF NOT EXISTS livrable_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES livrable_templates(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  
  -- File storage
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  parent_submission_id UUID REFERENCES livrable_submissions(id) ON DELETE SET NULL,
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('new', 'in_review', 'graded', 'needs_revision', 'approved')) DEFAULT 'new',
  
  -- Locking mechanism for concurrent grading prevention
  locked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  
  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active submission per student per template
  UNIQUE(template_id, student_id, version)
);

CREATE INDEX idx_livrable_submissions_template ON livrable_submissions(template_id);
CREATE INDEX idx_livrable_submissions_student ON livrable_submissions(student_id);
CREATE INDEX idx_livrable_submissions_program ON livrable_submissions(program_id);
CREATE INDEX idx_livrable_submissions_status ON livrable_submissions(status);
CREATE INDEX idx_livrable_submissions_locked_by ON livrable_submissions(locked_by);

-- ========================================
-- 4. LIVRABLE GRADES TABLE
-- ========================================
-- Grading records with rubric scores
CREATE TABLE IF NOT EXISTS livrable_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES livrable_submissions(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rubric_id UUID REFERENCES grading_rubrics(id) ON DELETE SET NULL,
  
  -- Scores stored as JSON
  scores_json JSONB NOT NULL DEFAULT '{}',
  -- Example: {"clarity": 85, "innovation": 90, "feasibility": 75}
  
  -- Calculated scores
  total_score NUMERIC(5,2),
  weighted_score NUMERIC(5,2),
  
  -- Feedback
  overall_feedback TEXT,
  criterion_feedback_json JSONB DEFAULT '{}',
  -- Example: {"clarity": "Good structure but needs more detail", "innovation": "Excellent ideas"}
  
  -- Timestamps
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One grade per submission
  UNIQUE(submission_id)
);

CREATE INDEX idx_livrable_grades_submission ON livrable_grades(submission_id);
CREATE INDEX idx_livrable_grades_grader ON livrable_grades(grader_id);

-- ========================================
-- 5. SUBMISSION COMMENTS TABLE
-- ========================================
-- PDF annotations and comments with coordinates
CREATE TABLE IF NOT EXISTS submission_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES livrable_submissions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Comment content
  text TEXT NOT NULL,
  comment_type TEXT CHECK (comment_type IN ('annotation', 'general', 'revision')) DEFAULT 'annotation',
  
  -- PDF location (for annotations)
  page_number INTEGER,
  coordinates JSONB,
  -- Example: {"x": 150, "y": 200, "width": 100, "height": 20}
  
  -- Metadata
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submission_comments_submission ON submission_comments(submission_id);
CREATE INDEX idx_submission_comments_created_by ON submission_comments(created_by);
CREATE INDEX idx_submission_comments_page ON submission_comments(page_number);

-- ========================================
-- 6. REVISION REQUESTS TABLE
-- ========================================
-- Feedback templates and revision tracking
CREATE TABLE IF NOT EXISTS revision_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES livrable_submissions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Request details
  feedback TEXT NOT NULL,
  template_used TEXT, -- Name of template if used
  deadline TIMESTAMPTZ,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'resubmitted', 'cancelled')) DEFAULT 'pending',
  
  -- Response
  resubmission_id UUID REFERENCES livrable_submissions(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_revision_requests_submission ON revision_requests(submission_id);
CREATE INDEX idx_revision_requests_requested_by ON revision_requests(requested_by);
CREATE INDEX idx_revision_requests_status ON revision_requests(status);

-- ========================================
-- 7. REVISION REQUEST TEMPLATES TABLE
-- ========================================
-- Predefined templates for common revision scenarios
CREATE TABLE IF NOT EXISTS revision_request_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  template_text TEXT NOT NULL,
  -- Supports variables: {student_name}, {deliverable_name}, {custom_feedback}, {deadline}, {coach_name}
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE livrable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE livrable_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE livrable_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_request_templates ENABLE ROW LEVEL SECURITY;

-- Livrable Templates: Everyone can view, admins/coaches can manage
CREATE POLICY "Templates are viewable by everyone" ON livrable_templates
  FOR SELECT USING (true);

CREATE POLICY "Coaches and admins can manage templates" ON livrable_templates
  FOR ALL USING (public.has_role(ARRAY['coach', 'admin']));

-- Grading Rubrics: Everyone can view, admins/coaches can manage
CREATE POLICY "Rubrics are viewable by everyone" ON grading_rubrics
  FOR SELECT USING (true);

CREATE POLICY "Coaches and admins can manage rubrics" ON grading_rubrics
  FOR ALL USING (public.has_role(ARRAY['coach', 'admin']));

-- Livrable Submissions: Students can view their own, coaches can view in their programs
CREATE POLICY "Students can view own submissions" ON livrable_submissions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Coaches can view submissions in their programs" ON livrable_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM program_coaches pc
      WHERE pc.program_id = livrable_submissions.program_id
      AND pc.coach_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all submissions" ON livrable_submissions
  FOR SELECT USING (public.has_role(ARRAY['admin']));

CREATE POLICY "Students can create submissions" ON livrable_submissions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Coaches can update submissions they've locked" ON livrable_submissions
  FOR UPDATE USING (
    auth.uid() = locked_by OR
    EXISTS (
      SELECT 1 FROM program_coaches pc
      WHERE pc.program_id = livrable_submissions.program_id
      AND pc.coach_id = auth.uid()
    )
  );

-- Livrable Grades: Students can view their own, coaches can view/create in their programs
CREATE POLICY "Students can view own grades" ON livrable_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM livrable_submissions ls
      WHERE ls.id = livrable_grades.submission_id
      AND ls.student_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view grades in their programs" ON livrable_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM livrable_submissions ls
      JOIN program_coaches pc ON ls.program_id = pc.program_id
      WHERE ls.id = livrable_grades.submission_id
      AND pc.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can create grades" ON livrable_grades
  FOR INSERT WITH CHECK (
    auth.uid() = grader_id AND
    EXISTS (
      SELECT 1 FROM livrable_submissions ls
      JOIN program_coaches pc ON ls.program_id = pc.program_id
      WHERE ls.id = submission_id
      AND pc.coach_id = auth.uid()
    )
  );

CREATE POLICY "Graders can update their own grades" ON livrable_grades
  FOR UPDATE USING (auth.uid() = grader_id);

-- Submission Comments: Visible to student and coaches in program
CREATE POLICY "Students can view comments on their submissions" ON submission_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM livrable_submissions ls
      WHERE ls.id = submission_comments.submission_id
      AND ls.student_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view comments in their programs" ON submission_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM livrable_submissions ls
      JOIN program_coaches pc ON ls.program_id = pc.program_id
      WHERE ls.id = submission_comments.submission_id
      AND pc.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can create comments" ON submission_comments
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM livrable_submissions ls
      JOIN program_coaches pc ON ls.program_id = pc.program_id
      WHERE ls.id = submission_id
      AND pc.coach_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments" ON submission_comments
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own comments" ON submission_comments
  FOR DELETE USING (auth.uid() = created_by);

-- Revision Requests: Students can view their own, coaches can create/view
CREATE POLICY "Students can view revision requests for their submissions" ON revision_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM livrable_submissions ls
      WHERE ls.id = revision_requests.submission_id
      AND ls.student_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can view revision requests in their programs" ON revision_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM livrable_submissions ls
      JOIN program_coaches pc ON ls.program_id = pc.program_id
      WHERE ls.id = revision_requests.submission_id
      AND pc.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can create revision requests" ON revision_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requested_by AND
    EXISTS (
      SELECT 1 FROM livrable_submissions ls
      JOIN program_coaches pc ON ls.program_id = pc.program_id
      WHERE ls.id = submission_id
      AND pc.coach_id = auth.uid()
    )
  );

-- Revision Request Templates: Everyone can view, coaches/admins can manage
CREATE POLICY "Templates are viewable by coaches" ON revision_request_templates
  FOR SELECT USING (public.has_role(ARRAY['coach', 'admin']));

CREATE POLICY "Coaches can create templates" ON revision_request_templates
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    public.has_role(ARRAY['coach', 'admin'])
  );

CREATE POLICY "Creators can update their templates" ON revision_request_templates
  FOR UPDATE USING (auth.uid() = created_by);

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to lock submission for grading
CREATE OR REPLACE FUNCTION public.lock_submission_for_grading(
  p_submission_id UUID,
  p_grader_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_lock RECORD;
  v_lock_timeout INTERVAL := INTERVAL '30 minutes';
BEGIN
  -- Check if submission exists and get current lock
  SELECT locked_by, locked_at INTO v_current_lock
  FROM livrable_submissions
  WHERE id = p_submission_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;
  
  -- Check if already locked by someone else
  IF v_current_lock.locked_by IS NOT NULL 
     AND v_current_lock.locked_by != p_grader_id 
     AND (NOW() - v_current_lock.locked_at) < v_lock_timeout THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Submission is currently being graded by another user',
      'locked_by', v_current_lock.locked_by
    );
  END IF;
  
  -- Acquire lock
  UPDATE livrable_submissions
  SET locked_by = p_grader_id,
      locked_at = NOW(),
      status = 'in_review'
  WHERE id = p_submission_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to unlock submission
CREATE OR REPLACE FUNCTION public.unlock_submission(
  p_submission_id UUID,
  p_grader_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE livrable_submissions
  SET locked_by = NULL,
      locked_at = NULL
  WHERE id = p_submission_id
  AND locked_by = p_grader_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not locked by this user');
  END IF;
END;
$$;

-- Function to submit grade
CREATE OR REPLACE FUNCTION public.submit_grade(
  p_submission_id UUID,
  p_grader_id UUID,
  p_rubric_id UUID,
  p_scores_json JSONB,
  p_overall_feedback TEXT,
  p_criterion_feedback_json JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_weighted_score NUMERIC(5,2);
  v_total_score NUMERIC(5,2);
  v_student_id UUID;
  v_rubric RECORD;
  v_criterion JSONB;
  v_weight NUMERIC;
  v_score NUMERIC;
BEGIN
  -- Verify lock
  SELECT student_id INTO v_student_id
  FROM livrable_submissions
  WHERE id = p_submission_id
  AND locked_by = p_grader_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not locked by this user');
  END IF;
  
  -- Get rubric for weight calculation
  SELECT criteria_json INTO v_rubric
  FROM grading_rubrics
  WHERE id = p_rubric_id;
  
  -- Calculate weighted score
  v_weighted_score := 0;
  v_total_score := 0;
  
  FOR v_criterion IN SELECT * FROM jsonb_array_elements(v_rubric.criteria_json)
  LOOP
    v_weight := (v_criterion->>'weight')::NUMERIC;
    v_score := (p_scores_json->>v_criterion->>'id')::NUMERIC;
    v_weighted_score := v_weighted_score + (v_score * v_weight);
    v_total_score := v_total_score + v_score;
  END LOOP;
  
  -- Insert or update grade
  INSERT INTO livrable_grades (
    submission_id, grader_id, rubric_id, scores_json, 
    total_score, weighted_score, overall_feedback, criterion_feedback_json
  )
  VALUES (
    p_submission_id, p_grader_id, p_rubric_id, p_scores_json,
    v_total_score, v_weighted_score, p_overall_feedback, p_criterion_feedback_json
  )
  ON CONFLICT (submission_id) DO UPDATE
  SET scores_json = EXCLUDED.scores_json,
      total_score = EXCLUDED.total_score,
      weighted_score = EXCLUDED.weighted_score,
      overall_feedback = EXCLUDED.overall_feedback,
      criterion_feedback_json = EXCLUDED.criterion_feedback_json,
      graded_at = NOW();
  
  -- Update submission status and unlock
  UPDATE livrable_submissions
  SET status = 'graded',
      locked_by = NULL,
      locked_at = NULL
  WHERE id = p_submission_id;
  
  -- Create notification for student
  INSERT INTO notifications (user_id, type, title, message, link_url, meta)
  VALUES (
    v_student_id,
    'livrable_graded',
    'Your submission has been graded',
    'Your livrable has been reviewed and graded. Click to view feedback.',
    '/student/submissions/' || p_submission_id,
    jsonb_build_object('submission_id', p_submission_id, 'score', v_weighted_score)
  );
  
  RETURN jsonb_build_object('success', true, 'weighted_score', v_weighted_score);
END;
$$;

-- Function to request revision
CREATE OR REPLACE FUNCTION public.request_revision(
  p_submission_id UUID,
  p_requested_by UUID,
  p_feedback TEXT,
  p_template_used TEXT DEFAULT NULL,
  p_deadline TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Get student ID
  SELECT student_id INTO v_student_id
  FROM livrable_submissions
  WHERE id = p_submission_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;
  
  -- Create revision request
  INSERT INTO revision_requests (
    submission_id, requested_by, feedback, template_used, deadline
  )
  VALUES (
    p_submission_id, p_requested_by, p_feedback, p_template_used, p_deadline
  );
  
  -- Update submission status
  UPDATE livrable_submissions
  SET status = 'needs_revision',
      locked_by = NULL,
      locked_at = NULL
  WHERE id = p_submission_id;
  
  -- Create notification for student
  INSERT INTO notifications (user_id, type, title, message, link_url, meta)
  VALUES (
    v_student_id,
    'revision_requested',
    'Revision requested for your submission',
    'Your coach has requested revisions. Click to view feedback.',
    '/student/submissions/' || p_submission_id,
    jsonb_build_object('submission_id', p_submission_id, 'deadline', p_deadline)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to approve and advance to next phase
CREATE OR REPLACE FUNCTION public.approve_and_advance(
  p_submission_id UUID,
  p_grader_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
  v_template_id UUID;
  v_current_phase INTEGER;
  v_next_template_id UUID;
BEGIN
  -- Get submission details
  SELECT student_id, template_id INTO v_student_id, v_template_id
  FROM livrable_submissions
  WHERE id = p_submission_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;
  
  -- Update submission status
  UPDATE livrable_submissions
  SET status = 'approved',
      locked_by = NULL,
      locked_at = NULL
  WHERE id = p_submission_id;
  
  -- Get current phase
  SELECT phase INTO v_current_phase
  FROM livrable_templates
  WHERE id = v_template_id;
  
  -- Check if next phase exists
  SELECT id INTO v_next_template_id
  FROM livrable_templates
  WHERE program_id = (SELECT program_id FROM livrable_templates WHERE id = v_template_id)
  AND phase = v_current_phase + 1
  AND is_active = TRUE
  LIMIT 1;
  
  -- Create notification for approval
  INSERT INTO notifications (user_id, type, title, message, link_url, meta)
  VALUES (
    v_student_id,
    'submission_approved',
    'Submission approved!',
    'Congratulations! Your submission has been approved.',
    '/student/submissions/' || p_submission_id,
    jsonb_build_object('submission_id', p_submission_id)
  );
  
  -- If next phase exists, notify about it
  IF v_next_template_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link_url, meta)
    VALUES (
      v_student_id,
      'next_phase_unlocked',
      'Next phase unlocked!',
      'You can now proceed to the next phase of your project.',
      '/student/deliverables',
      jsonb_build_object('template_id', v_next_template_id, 'phase', v_current_phase + 1)
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'next_phase_available', v_next_template_id IS NOT NULL);
END;
$$;

-- ========================================
-- TRIGGERS
-- ========================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_livrable_templates_updated_at BEFORE UPDATE ON livrable_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grading_rubrics_updated_at BEFORE UPDATE ON grading_rubrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_livrable_submissions_updated_at BEFORE UPDATE ON livrable_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_livrable_grades_updated_at BEFORE UPDATE ON livrable_grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submission_comments_updated_at BEFORE UPDATE ON submission_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revision_requests_updated_at BEFORE UPDATE ON revision_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revision_request_templates_updated_at BEFORE UPDATE ON revision_request_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to log submission activity
CREATE OR REPLACE FUNCTION public.log_livrable_submission_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.log_student_activity(
    NEW.student_id, 
    'submission', 
    'Submitted livrable', 
    jsonb_build_object('submission_id', NEW.id, 'template_id', NEW.template_id, 'version', NEW.version)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_livrable_submission_activity ON livrable_submissions;
CREATE TRIGGER trg_log_livrable_submission_activity
AFTER INSERT ON livrable_submissions
FOR EACH ROW
EXECUTE FUNCTION public.log_livrable_submission_activity();

-- ========================================
-- REALTIME
-- ========================================
ALTER TABLE public.livrable_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.livrable_grades REPLICA IDENTITY FULL;
ALTER TABLE public.submission_comments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'livrable_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.livrable_submissions;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'livrable_grades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.livrable_grades;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'submission_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.submission_comments;
  END IF;
END $$;

-- ========================================
-- SEED DATA (Optional)
-- ========================================

-- Insert default revision request templates
INSERT INTO revision_request_templates (name, description, template_text, category) VALUES
('General Revision', 'General revision request', 
'Dear {student_name},

Thank you for submitting your {deliverable_name}. After review, I''d like to request the following revisions:

{custom_feedback}

Please resubmit by {deadline}.

Best regards,
{coach_name}', 'general'),

('Formatting Issues', 'Request for formatting corrections',
'Dear {student_name},

Your {deliverable_name} has good content, but needs formatting improvements:

{custom_feedback}

Please address these formatting issues and resubmit by {deadline}.

Best regards,
{coach_name}', 'formatting'),

('Content Expansion', 'Request for more detailed content',
'Dear {student_name},

Your {deliverable_name} is a good start, but needs more depth in the following areas:

{custom_feedback}

Please expand on these sections and resubmit by {deadline}.

Best regards,
{coach_name}', 'content');

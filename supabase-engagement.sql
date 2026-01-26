-- ========================================
-- ENGAGEMENT & GAMIFICATION ENHANCEMENT
-- ========================================
-- Adds advanced feedback, gamification logic, and coaching session management
-- This version does NOT depend on program_instances.student_id

-- ========================================
-- PART 1: ADVANCED FEEDBACK (RUBRICS & COMMENTS)
-- ========================================

-- TABLE: feedback_rubrics
CREATE TABLE IF NOT EXISTS public.feedback_rubrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.program_templates(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- JSON structure: [{criterion: "Innovation", weight: 0.4, scale: 10}, ...]
  criteria_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_rubrics_template ON public.feedback_rubrics(template_id);

ALTER TABLE public.feedback_rubrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rubrics readable" ON public.feedback_rubrics;
CREATE POLICY "Rubrics readable" ON public.feedback_rubrics
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Rubrics writable by admin" ON public.feedback_rubrics;
CREATE POLICY "Rubrics writable by admin" ON public.feedback_rubrics
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));


-- TABLE: task_rubric_scores
CREATE TABLE IF NOT EXISTS public.task_rubric_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.program_instance_tasks(id) ON DELETE CASCADE,
  rubric_id UUID NOT NULL REFERENCES public.feedback_rubrics(id) ON DELETE RESTRICT,
  
  -- JSON structure: { "Innovation": 8, "Execution": 9 }
  scores JSONB NOT NULL, 
  
  -- Weighted total score (0-100)
  total_score DECIMAL(5,2),
  
  coach_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(task_id, rubric_id)
);

CREATE INDEX IF NOT EXISTS idx_task_rubric_scores_task ON public.task_rubric_scores(task_id);

ALTER TABLE public.task_rubric_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scores readable by staff or task owner" ON public.task_rubric_scores;
CREATE POLICY "Scores readable by staff or task owner" ON public.task_rubric_scores
  FOR SELECT
  USING (public.has_role(ARRAY['coach', 'admin', 'student']));

DROP POLICY IF EXISTS "Scores writable by staff" ON public.task_rubric_scores;
CREATE POLICY "Scores writable by staff" ON public.task_rubric_scores
  FOR ALL
  USING (public.has_role(ARRAY['coach', 'admin']))
  WITH CHECK (public.has_role(ARRAY['coach', 'admin']));


-- TABLE: task_comments (Threaded Discussions)
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.program_instance_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE, -- For nested replies
  
  is_internal_note BOOLEAN DEFAULT FALSE, -- Only visible to coaches
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_parent ON public.task_comments(parent_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments readable" ON public.task_comments;
CREATE POLICY "Comments readable" ON public.task_comments
  FOR SELECT
  USING (
    (is_internal_note = FALSE) OR public.has_role(ARRAY['coach', 'admin'])
  );

DROP POLICY IF EXISTS "Comments writable" ON public.task_comments;
CREATE POLICY "Comments writable" ON public.task_comments
  FOR INSERT
  WITH CHECK (
    (is_internal_note = FALSE) OR public.has_role(ARRAY['coach', 'admin'])
  );

-- ========================================
-- PART 2: GAMIFICATION (BADGES & STREAKS)
-- ========================================

-- TABLE: gamification_badges
CREATE TABLE IF NOT EXISTS public.gamification_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_key TEXT NOT NULL, -- e.g., 'rocket', 'trophy', 'fire'
  
  category TEXT CHECK (category IN ('milestone', 'streak', 'skill', 'community')),
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  
  -- Automated awarding logic config
  criteria_type TEXT, -- e.g., 'tasks_completed', 'daily_streak'
  criteria_value INTEGER, -- e.g., 10 (tasks), 7 (days)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gamification_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Badges readable" ON public.gamification_badges;
CREATE POLICY "Badges readable" ON public.gamification_badges
  FOR SELECT
  USING (auth.role() = 'authenticated');


-- TABLE: user_badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.gamification_badges(id) ON DELETE CASCADE,
  
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User badges readable" ON public.user_badges;
CREATE POLICY "User badges readable" ON public.user_badges
  FOR SELECT
  USING (true); -- Public profiles might show badges, or restrict if needed


-- TABLE: user_streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Streaks readable" ON public.user_streaks;
CREATE POLICY "Streaks readable" ON public.user_streaks
  FOR SELECT
  USING (true);

-- ========================================
-- PART 3: COACHING SESSIONS
-- ========================================

-- TABLE: coaching_sessions
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Can be null if empty slot
  
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'completed', 'cancelled')),
  meeting_link TEXT,
  
  notes TEXT, -- Private coach notes
  student_feedback TEXT, -- Post-session feedback
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_coach ON public.coaching_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_student ON public.coaching_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_time ON public.coaching_sessions(start_time);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sessions readable" ON public.coaching_sessions;
CREATE POLICY "Sessions readable" ON public.coaching_sessions
  FOR SELECT
  USING (
    -- Coaches see their own
    (auth.uid() = coach_id) OR
    -- Students see available slots or their own booked ones
    (status = 'available' OR student_id = auth.uid()) OR
    -- Admins see all
    public.has_role(ARRAY['admin'])
  );

DROP POLICY IF EXISTS "Sessions writable by coach/admin" ON public.coaching_sessions;
CREATE POLICY "Sessions writable by coach/admin" ON public.coaching_sessions
  FOR ALL
  USING (public.has_role(ARRAY['coach', 'admin']))
  WITH CHECK (public.has_role(ARRAY['coach', 'admin']));

DROP POLICY IF EXISTS "Sessions bookable by student" ON public.coaching_sessions;
CREATE POLICY "Sessions bookable by student" ON public.coaching_sessions
  FOR UPDATE
  USING (status = 'available')
  WITH CHECK (student_id = auth.uid() AND status = 'booked');


-- ========================================
-- PART 4: RPC FUNCTIONS
-- ========================================

-- RPC: book_coaching_session
CREATE OR REPLACE FUNCTION public.book_coaching_session(
  p_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  UPDATE public.coaching_sessions
  SET student_id = v_student_id,
      status = 'booked',
      updated_at = NOW()
  WHERE id = p_session_id
    AND status = 'available';
    
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.book_coaching_session(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_coaching_session(UUID) TO authenticated;


-- ========================================
-- CLEANUP OLD FUNCTIONS (SAFEGUARD)
-- ========================================
DROP FUNCTION IF EXISTS public.update_user_streak() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_streak_on_instance() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_streak_on_task() CASCADE;
DROP FUNCTION IF EXISTS public.perform_streak_update(UUID) CASCADE;


-- ========================================
-- SIMPLIFIED STREAK TRACKING (Manual RPC)
-- ========================================
-- Note: Streak tracking is now manual via RPC calls rather than automatic triggers
-- This avoids schema dependency issues

CREATE OR REPLACE FUNCTION public.update_my_streak()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  SELECT last_activity_date INTO v_last_date
  FROM public.user_streaks
  WHERE user_id = v_user_id;

  IF v_last_date IS NULL THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (v_user_id, 1, 1, v_today);
    
  ELSIF v_last_date = v_today THEN
    NULL;
    
  ELSIF v_last_date = v_today - 1 THEN
    UPDATE public.user_streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_date = v_today,
        updated_at = NOW()
    WHERE user_id = v_user_id;
    
  ELSE
    UPDATE public.user_streaks
    SET current_streak = 1,
        last_activity_date = v_today,
        updated_at = NOW()
    WHERE user_id = v_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_streak() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_streak() TO authenticated;


-- ========================================
-- PART 5: REALTIME
-- ========================================

ALTER TABLE public.task_comments REPLICA IDENTITY FULL;
ALTER TABLE public.user_badges REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

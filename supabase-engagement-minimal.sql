-- ========================================
-- STANDALONE ENGAGEMENT FEATURES
-- ========================================
-- This version creates its own tables with NO dependencies on existing schema
-- Safe to run on any Supabase project

-- ========================================
-- GAMIFICATION TABLES
-- ========================================

-- TABLE: gamification_badges
CREATE TABLE IF NOT EXISTS public.gamification_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  category TEXT CHECK (category IN ('milestone', 'streak', 'skill', 'community')),
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  criteria_type TEXT,
  criteria_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gamification_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges readable" ON public.gamification_badges FOR SELECT USING (true);


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
CREATE POLICY "User badges readable" ON public.user_badges FOR SELECT USING (true);


-- TABLE: user_streaks
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Streaks readable" ON public.user_streaks FOR SELECT USING (true);


-- ========================================
-- COACHING SESSIONS
-- ========================================

CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'completed', 'cancelled')),
  meeting_link TEXT,
  notes TEXT,
  student_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_coach ON public.coaching_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_student ON public.coaching_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_time ON public.coaching_sessions(start_time);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sessions readable" ON public.coaching_sessions
  FOR SELECT USING (
    auth.uid() = coach_id OR 
    status = 'available' OR 
    student_id = auth.uid()
  );

CREATE POLICY "Sessions writable by coaches" ON public.coaching_sessions
  FOR ALL USING (auth.uid() = coach_id);


-- ========================================
-- RPC FUNCTIONS
-- ========================================

-- Clean up any old broken functions
DROP FUNCTION IF EXISTS public.update_user_streak() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_streak_on_instance() CASCADE;
DROP FUNCTION IF EXISTS public.update_user_streak_on_task() CASCADE;
DROP FUNCTION IF EXISTS public.perform_streak_update(UUID) CASCADE;


-- RPC: Manual streak update
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

GRANT EXECUTE ON FUNCTION public.update_my_streak() TO authenticated;


-- RPC: Book coaching session
CREATE OR REPLACE FUNCTION public.book_coaching_session(p_session_id UUID)
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
  WHERE id = p_session_id AND status = 'available';
    
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_coaching_session(UUID) TO authenticated;

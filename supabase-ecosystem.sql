-- ========================================
-- ECOSYSTEM & OUTCOME FEATURES
-- ========================================
-- Adds alumni network, pitch deck builder, demo days, investor matching, and integrations
-- Run this AFTER `supabase-admin-operations.sql`

-- ========================================
-- PART 1: ALUMNI NETWORK
-- ========================================

-- TABLE: alumni_profiles
CREATE TABLE IF NOT EXISTS public.alumni_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  
  graduation_cohort_id UUID REFERENCES public.cohorts(id) ON DELETE SET NULL,
  graduated_at TIMESTAMPTZ,
  
  -- Current status
  current_company TEXT,
  role_title TEXT,
  company_stage TEXT CHECK (company_stage IN ('idea', 'mvp', 'early_revenue', 'growth', 'exit')),
  
  -- Achievements
  funding_raised DECIMAL(12,2),
  jobs_created INTEGER DEFAULT 0,
  revenue_generated DECIMAL(12,2),
  
  -- Profile
  bio TEXT,
  linkedin_url TEXT,
  twitter_url TEXT,
  website_url TEXT,
  
  -- Availability
  available_for_mentoring BOOLEAN DEFAULT FALSE,
  available_for_speaking BOOLEAN DEFAULT FALSE,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.alumni_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alumni profiles readable" ON public.alumni_profiles;
CREATE POLICY "Alumni profiles readable" ON public.alumni_profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Alumni profiles writable by owner" ON public.alumni_profiles;
CREATE POLICY "Alumni profiles writable by owner" ON public.alumni_profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- TABLE: alumni_connections
CREATE TABLE IF NOT EXISTS public.alumni_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_alumni_connections_from ON public.alumni_connections(from_user_id);
CREATE INDEX IF NOT EXISTS idx_alumni_connections_to ON public.alumni_connections(to_user_id);

ALTER TABLE public.alumni_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Connections readable by participants" ON public.alumni_connections;
CREATE POLICY "Connections readable by participants" ON public.alumni_connections
  FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());


-- TABLE: job_board
CREATE TABLE IF NOT EXISTS public.job_board (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  posted_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_description TEXT NOT NULL,
  
  location TEXT,
  job_type TEXT CHECK (job_type IN ('full_time', 'part_time', 'contract', 'internship')),
  salary_range TEXT,
  
  application_url TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_board_active ON public.job_board(is_active, created_at DESC);

ALTER TABLE public.job_board ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Job board readable" ON public.job_board;
CREATE POLICY "Job board readable" ON public.job_board
  FOR SELECT
  USING (is_active = TRUE OR posted_by = auth.uid());


-- TABLE: success_stories
CREATE TABLE IF NOT EXISTS public.success_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  story TEXT NOT NULL,
  
  achievements JSONB DEFAULT '{}'::jsonb,
  media_urls TEXT[],
  
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_success_stories_featured ON public.success_stories(is_featured, created_at DESC);

ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Success stories readable" ON public.success_stories;
CREATE POLICY "Success stories readable" ON public.success_stories
  FOR SELECT
  USING (is_published = TRUE OR user_id = auth.uid());


-- ========================================
-- PART 2: PITCH DECK & INVESTOR PREP
-- ========================================

-- TABLE: pitch_decks
CREATE TABLE IF NOT EXISTS public.pitch_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  
  -- Metadata
  company_name TEXT,
  tagline TEXT,
  
  is_template BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitch_decks_user ON public.pitch_decks(user_id);

ALTER TABLE public.pitch_decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pitch decks readable by owner" ON public.pitch_decks;
CREATE POLICY "Pitch decks readable by owner" ON public.pitch_decks
  FOR SELECT
  USING (user_id = auth.uid() OR is_template = TRUE);


-- TABLE: pitch_deck_sections
CREATE TABLE IF NOT EXISTS public.pitch_deck_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id UUID NOT NULL REFERENCES public.pitch_decks(id) ON DELETE CASCADE,
  
  section_type TEXT NOT NULL CHECK (section_type IN (
    'cover', 'problem', 'solution', 'market', 'business_model', 
    'traction', 'team', 'financials', 'ask', 'custom'
  )),
  
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitch_deck_sections_deck ON public.pitch_deck_sections(deck_id);

ALTER TABLE public.pitch_deck_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pitch deck sections readable" ON public.pitch_deck_sections;
CREATE POLICY "Pitch deck sections readable" ON public.pitch_deck_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pitch_decks pd
      WHERE pd.id = deck_id AND (pd.user_id = auth.uid() OR pd.is_template = TRUE)
    )
  );


-- TABLE: demo_days
CREATE TABLE IF NOT EXISTS public.demo_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name TEXT NOT NULL,
  description TEXT,
  
  event_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 180,
  
  location TEXT,
  virtual_link TEXT,
  
  max_participants INTEGER,
  
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.demo_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo days readable" ON public.demo_days;
CREATE POLICY "Demo days readable" ON public.demo_days
  FOR SELECT
  USING (true);


-- TABLE: demo_day_participants
CREATE TABLE IF NOT EXISTS public.demo_day_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demo_day_id UUID NOT NULL REFERENCES public.demo_days(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  pitch_deck_id UUID REFERENCES public.pitch_decks(id) ON DELETE SET NULL,
  
  presentation_order INTEGER,
  pitch_duration_minutes INTEGER DEFAULT 5,
  
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'presented', 'cancelled')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(demo_day_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_demo_day_participants_demo ON public.demo_day_participants(demo_day_id);

ALTER TABLE public.demo_day_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo day participants readable" ON public.demo_day_participants;
CREATE POLICY "Demo day participants readable" ON public.demo_day_participants
  FOR SELECT
  USING (true);


-- TABLE: investor_profiles
CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name TEXT NOT NULL,
  firm_name TEXT,
  
  investment_focus TEXT[],
  stage_preference TEXT[],
  ticket_size_min DECIMAL(12,2),
  ticket_size_max DECIMAL(12,2),
  
  geography TEXT[],
  
  bio TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Investor profiles readable" ON public.investor_profiles;
CREATE POLICY "Investor profiles readable" ON public.investor_profiles
  FOR SELECT
  USING (is_active = TRUE);


-- TABLE: investor_matches
CREATE TABLE IF NOT EXISTS public.investor_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  investor_id UUID NOT NULL REFERENCES public.investor_profiles(id) ON DELETE CASCADE,
  
  match_score DECIMAL(3,2),
  match_reasons JSONB DEFAULT '[]'::jsonb,
  
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'interested', 'connected', 'passed')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, investor_id)
);

CREATE INDEX IF NOT EXISTS idx_investor_matches_user ON public.investor_matches(user_id);

ALTER TABLE public.investor_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Investor matches readable by owner" ON public.investor_matches;
CREATE POLICY "Investor matches readable by owner" ON public.investor_matches
  FOR SELECT
  USING (user_id = auth.uid());


-- ========================================
-- PART 3: INTEGRATIONS
-- ========================================

-- TABLE: integration_configs
CREATE TABLE IF NOT EXISTS public.integration_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  integration_type TEXT NOT NULL CHECK (integration_type IN ('google_calendar', 'slack', 'stripe', 'coursera')),
  
  -- Encrypted credentials (use Supabase Vault in production)
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  is_enabled BOOLEAN DEFAULT FALSE,
  
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(integration_type)
);

ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Integration configs admin only" ON public.integration_configs;
CREATE POLICY "Integration configs admin only" ON public.integration_configs
  FOR ALL
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));


-- TABLE: integration_logs
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  integration_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_logs_type ON public.integration_logs(integration_type, created_at DESC);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Integration logs admin only" ON public.integration_logs;
CREATE POLICY "Integration logs admin only" ON public.integration_logs
  FOR SELECT
  USING (public.has_role(ARRAY['admin']));


-- TABLE: external_events (for calendar sync)
CREATE TABLE IF NOT EXISTS public.external_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  external_id TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  location TEXT,
  attendees JSONB DEFAULT '[]'::jsonb,
  
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, external_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_external_events_user ON public.external_events(user_id);

ALTER TABLE public.external_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "External events readable by owner" ON public.external_events;
CREATE POLICY "External events readable by owner" ON public.external_events
  FOR SELECT
  USING (user_id = auth.uid());


-- TABLE: payment_records (for Stripe)
CREATE TABLE IF NOT EXISTS public.payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  stripe_payment_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  payment_type TEXT CHECK (payment_type IN ('program_fee', 'subscription', 'other')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_user ON public.payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_stripe ON public.payment_records(stripe_payment_id);

ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payment records readable by owner" ON public.payment_records;
CREATE POLICY "Payment records readable by owner" ON public.payment_records
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(ARRAY['admin']));


-- ========================================
-- PART 4: RPC FUNCTIONS
-- ========================================

-- RPC: Calculate investor match score
CREATE OR REPLACE FUNCTION public.calculate_investor_match(
  p_user_id UUID,
  p_investor_id UUID
)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score DECIMAL(3,2) := 0.0;
BEGIN
  -- Simple matching logic (can be enhanced with ML)
  -- This is a placeholder - implement actual matching algorithm
  v_score := 0.75;
  
  RETURN v_score;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_investor_match(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_investor_match(UUID, UUID) TO authenticated;


-- RPC: Export pitch deck to JSON
CREATE OR REPLACE FUNCTION public.export_pitch_deck(p_deck_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deck JSONB;
BEGIN
  SELECT jsonb_build_object(
    'deck', row_to_json(pd.*),
    'sections', (
      SELECT jsonb_agg(row_to_json(pds.*) ORDER BY pds.order_index)
      FROM public.pitch_deck_sections pds
      WHERE pds.deck_id = p_deck_id
    )
  ) INTO v_deck
  FROM public.pitch_decks pd
  WHERE pd.id = p_deck_id AND pd.user_id = auth.uid();
  
  RETURN v_deck;
END;
$$;

REVOKE ALL ON FUNCTION public.export_pitch_deck(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_pitch_deck(UUID) TO authenticated;


-- ========================================
-- PART 5: REALTIME
-- ========================================

ALTER TABLE public.demo_day_participants REPLICA IDENTITY FULL;
ALTER TABLE public.investor_matches REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.demo_day_participants;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.investor_matches;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

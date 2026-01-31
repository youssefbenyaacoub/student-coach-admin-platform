-- Supabase user presence (online/last seen) + Realtime (idempotent)
-- Run this in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  online BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update updated_at automatically
CREATE OR REPLACE FUNCTION public.touch_user_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_user_presence_updated_at ON public.user_presence;
CREATE TRIGGER trg_touch_user_presence_updated_at
BEFORE UPDATE ON public.user_presence
FOR EACH ROW
EXECUTE FUNCTION public.touch_user_presence_updated_at();

CREATE INDEX IF NOT EXISTS idx_user_presence_updated_at ON public.user_presence(updated_at);

-- RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Presence viewable by authenticated" ON public.user_presence;
CREATE POLICY "Presence viewable by authenticated" ON public.user_presence
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can upsert own presence" ON public.user_presence;
CREATE POLICY "Users can upsert own presence" ON public.user_presence
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own presence" ON public.user_presence;
CREATE POLICY "Users can update own presence" ON public.user_presence
  FOR UPDATE
  USING (user_id = auth.uid());

-- Realtime
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  END IF;
END $$;

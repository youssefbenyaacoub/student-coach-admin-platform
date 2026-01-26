-- ========================================
-- REALTIME COLLABORATION ENHANCEMENT
-- ========================================
-- Adds messaging, notifications, and activity feeds with Supabase realtime
-- Run this AFTER `supabase-admin-operations.sql`

-- ========================================
-- PART 1: MESSAGING SYSTEM
-- ========================================

-- TABLE: channels
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  channel_type TEXT NOT NULL CHECK (channel_type IN ('direct', 'cohort', 'student_coach', 'peer_group', 'announcement')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- For cohort/group channels
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  
  -- For direct messages (store both user IDs sorted)
  user_ids UUID[],
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_type ON public.channels(channel_type);
CREATE INDEX IF NOT EXISTS idx_channels_cohort ON public.channels(cohort_id);
CREATE INDEX IF NOT EXISTS idx_channels_user_ids ON public.channels USING GIN(user_ids);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;


-- TABLE: channel_members
CREATE TABLE IF NOT EXISTS public.channel_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON public.channel_members(user_id);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Channel members readable" ON public.channel_members;
CREATE POLICY "Channel members readable" ON public.channel_members
  FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(ARRAY['coach', 'admin']));


-- TABLE: messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  
  -- For file attachments
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- For threading
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON public.messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages readable by channel members" ON public.messages;
CREATE POLICY "Messages readable by channel members" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = messages.channel_id AND cm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Messages writable by channel members" ON public.messages;
CREATE POLICY "Messages writable by channel members" ON public.messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = messages.channel_id AND cm.user_id = auth.uid()
    )
  );


-- TABLE: message_reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  emoji TEXT NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reactions readable" ON public.message_reactions;
CREATE POLICY "Reactions readable" ON public.message_reactions
  FOR SELECT
  USING (true);


-- ========================================
-- PART 2: NOTIFICATION SYSTEM
-- ========================================

-- TABLE: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'deadline_approaching',
    'feedback_ready',
    'session_invite',
    'student_stalled',
    'stage_advanced',
    'message_received',
    'task_assigned',
    'application_status'
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Link to related entity
  entity_type TEXT,
  entity_id UUID,
  
  -- Metadata for rendering
  metadata JSONB DEFAULT '{}'::jsonb,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- For email/push
  sent_via_email BOOLEAN DEFAULT FALSE,
  sent_via_push BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications readable by owner" ON public.notifications;
CREATE POLICY "Notifications readable by owner" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Notifications updatable by owner" ON public.notifications;
CREATE POLICY "Notifications updatable by owner" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- TABLE: notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Email preferences
  email_deadline_approaching BOOLEAN DEFAULT TRUE,
  email_feedback_ready BOOLEAN DEFAULT TRUE,
  email_session_invite BOOLEAN DEFAULT TRUE,
  email_student_stalled BOOLEAN DEFAULT TRUE,
  
  -- Push preferences
  push_deadline_approaching BOOLEAN DEFAULT TRUE,
  push_feedback_ready BOOLEAN DEFAULT TRUE,
  push_message_received BOOLEAN DEFAULT TRUE,
  
  -- Digest settings
  daily_digest BOOLEAN DEFAULT FALSE,
  weekly_digest BOOLEAN DEFAULT TRUE,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notification prefs readable by owner" ON public.notification_preferences;
CREATE POLICY "Notification prefs readable by owner" ON public.notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Notification prefs writable by owner" ON public.notification_preferences;
CREATE POLICY "Notification prefs writable by owner" ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ========================================
-- PART 3: ACTIVITY FEED
-- ========================================

-- TABLE: activity_feed
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'task_submitted',
    'task_approved',
    'task_rejected',
    'feedback_posted',
    'stage_advanced',
    'instance_created',
    'instance_completed',
    'comment_added',
    'file_uploaded'
  )),
  
  -- Who did it
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- What instance/cohort
  instance_id UUID REFERENCES public.program_instances(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES public.cohorts(id) ON DELETE CASCADE,
  
  -- Related entities
  entity_type TEXT,
  entity_id UUID,
  
  -- Activity details
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_instance ON public.activity_feed(instance_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_cohort ON public.activity_feed(cohort_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_actor ON public.activity_feed(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON public.activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON public.activity_feed(created_at DESC);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Activity feed readable" ON public.activity_feed;
CREATE POLICY "Activity feed readable" ON public.activity_feed
  FOR SELECT
  USING (public.has_role(ARRAY['student', 'coach', 'admin']));


-- TABLE: user_presence
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Current activity
  current_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Presence readable" ON public.user_presence;
CREATE POLICY "Presence readable" ON public.user_presence
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Presence writable by owner" ON public.user_presence;
CREATE POLICY "Presence writable by owner" ON public.user_presence
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ========================================
-- RLS POLICIES (After all tables created)
-- ========================================

DROP POLICY IF EXISTS "Channels readable by members" ON public.channels;
CREATE POLICY "Channels readable by members" ON public.channels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channel_members cm
      WHERE cm.channel_id = channels.id AND cm.user_id = auth.uid()
    )
    OR channel_type = 'announcement'
  );


-- ========================================
-- PART 4: RPC FUNCTIONS
-- ========================================

-- RPC: Create or get direct message channel
CREATE OR REPLACE FUNCTION public.get_or_create_dm_channel(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_channel_id UUID;
  v_user_ids UUID[];
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  
  -- Sort user IDs for consistent lookup
  v_user_ids := ARRAY[LEAST(v_current_user_id, p_other_user_id), GREATEST(v_current_user_id, p_other_user_id)];
  
  -- Check if channel exists
  SELECT id INTO v_channel_id
  FROM public.channels
  WHERE channel_type = 'direct' AND user_ids = v_user_ids;
  
  IF v_channel_id IS NULL THEN
    -- Create new channel
    INSERT INTO public.channels (channel_type, name, user_ids, created_by)
    VALUES ('direct', 'Direct Message', v_user_ids, v_current_user_id)
    RETURNING id INTO v_channel_id;
    
    -- Add both users as members
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES 
      (v_channel_id, v_current_user_id, 'owner'),
      (v_channel_id, p_other_user_id, 'owner');
  END IF;
  
  RETURN v_channel_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_dm_channel(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_channel(UUID) TO authenticated;


-- RPC: Mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = ANY(p_notification_ids) AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notifications_read(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID[]) TO authenticated;


-- RPC: Update user presence
CREATE OR REPLACE FUNCTION public.update_presence(p_status TEXT, p_channel_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, status, current_channel_id, last_seen, updated_at)
  VALUES (auth.uid(), p_status, p_channel_id, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    current_channel_id = EXCLUDED.current_channel_id,
    last_seen = EXCLUDED.last_seen,
    updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.update_presence(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_presence(TEXT, UUID) TO authenticated;


-- ========================================
-- PART 5: TRIGGERS FOR NOTIFICATIONS
-- ========================================

-- Trigger: Notify on task deadline approaching
CREATE OR REPLACE FUNCTION public.notify_deadline_approaching()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get student from instance
  SELECT student_id INTO v_user_id
  FROM public.program_instances
  WHERE id = NEW.instance_id;
  
  -- Only notify if deadline is within 24 hours and task not completed
  IF NEW.deadline IS NOT NULL 
     AND NEW.deadline <= NOW() + INTERVAL '24 hours'
     AND NEW.status NOT IN ('approved', 'submitted')
  THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, entity_type, entity_id)
    VALUES (
      v_user_id,
      'deadline_approaching',
      'Task Deadline Approaching',
      'Task "' || NEW.title || '" is due soon',
      'task',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_deadline ON public.program_instance_tasks;
CREATE TRIGGER tr_notify_deadline
  AFTER INSERT OR UPDATE OF deadline ON public.program_instance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_deadline_approaching();


-- ========================================
-- PART 6: REALTIME PUBLICATIONS
-- ========================================

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.activity_feed REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Create enum for event types
CREATE TYPE event_type AS ENUM ('workshop', 'coaching', 'deadline');

-- Create calendar_events table
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    event_type event_type NOT NULL,
    capacity INTEGER, -- NULL means unlimited
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern JSONB, -- e.g., { "frequency": "weekly", "days": [1, 3] }
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_attendees table
CREATE TABLE event_attendees (
    event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

-- Create user_calendar_settings table
CREATE TABLE user_calendar_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    default_view TEXT DEFAULT 'month',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_calendar_settings ENABLE ROW LEVEL SECURITY;

-- Policies for calendar_events
-- Everyone can read events
CREATE POLICY "Public read access" ON calendar_events
    FOR SELECT USING (true);

-- Only admins and coaches (or creators) can insert/update/delete
-- Assuming a function or claim exists for checking roles, otherwise using basic authenticated check for now + created_by
CREATE POLICY "Creators can modify events" ON calendar_events
    FOR ALL USING (auth.uid() = created_by);

-- Policies for event_attendees
-- Users can see who is attending (or at least their own attendance) - let's allow public read for now to show capacity
CREATE POLICY "Public read attendees" ON event_attendees
    FOR SELECT USING (true);

-- Users can register themselves
CREATE POLICY "Users can register themselves" ON event_attendees
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can unregister themselves
CREATE POLICY "Users can unregister themselves" ON event_attendees
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for user_calendar_settings
CREATE POLICY "Users can manage their own settings" ON user_calendar_settings
    FOR ALL USING (auth.uid() = user_id);

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE event_attendees;

-- Indexes for performance
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);

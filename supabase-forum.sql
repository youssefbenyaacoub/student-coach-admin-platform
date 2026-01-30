-- Forum Database Schema for Student Coach Admin Platform

-- 1. Forum Categories
CREATE TABLE IF NOT EXISTS forum_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Lucide icon name
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Forum Topics
CREATE TABLE IF NOT EXISTS forum_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Forum Posts (Threaded replies)
CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    parent_post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE, -- For nesting
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Categories: Readable by all authenticated users, writable by Admin only
CREATE POLICY "Categories readable by all authenticated users" ON forum_categories
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Categories writable by Admin only" ON forum_categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Topics: Readable by all, writable by author or Admin
CREATE POLICY "Topics readable by all authenticated users" ON forum_topics
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Topics writable by author or Admin" ON forum_topics
    FOR ALL USING (
        author_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Posts: Readable by all, writable by author or Admin
CREATE POLICY "Posts readable by all authenticated users" ON forum_posts
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Posts writable by author or Admin" ON forum_posts
    FOR ALL USING (
        author_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- 6. Realtime Publication
-- Note: You may need to manually add these to your existing publication if it's not 'supabase_realtime'
-- ALTER PUBLICATION supabase_realtime ADD TABLE forum_categories, forum_topics, forum_posts;

-- 7. Seed Categories
INSERT INTO forum_categories (name, description, icon, order_index) VALUES
('General Discussion', 'Talk about anything related to entrepreneurship.', 'MessageCircle', 0),
('Project Showcase', 'Share your project progress and get feedback.', 'Rocket', 1),
('Technical Support', 'Help with platform features or technical hurdles.', 'LifeBuoy', 2),
('Announcements', 'Official news and updates from the platform.', 'Bell', 3);

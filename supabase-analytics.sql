-- ========================================
-- ANALYTICS DASHBOARD SYSTEM
-- ========================================
-- This file contains the database schema for the analytics dashboard
-- including materialized views, functions, and indexes for performance optimization.

-- ========================================
-- MATERIALIZED VIEWS
-- ========================================

-- Daily Activity Summary: Aggregates daily user activity by role
DO $$ 
BEGIN 
  DROP MATERIALIZED VIEW IF EXISTS public.daily_activity_summary CASCADE; 
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ 
BEGIN 
  DROP VIEW IF EXISTS public.daily_activity_summary CASCADE; 
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE MATERIALIZED VIEW public.daily_activity_summary AS
SELECT 
  DATE(u.created_at) as activity_date,
  u.role,
  COUNT(DISTINCT u.id) as active_users,
  COUNT(*) as total_sessions,
  AVG(EXTRACT(EPOCH FROM (u.updated_at - u.created_at))/60)::INTEGER as avg_session_duration_minutes
FROM users u
WHERE u.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(u.created_at), u.role
ORDER BY activity_date DESC, role;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_daily_activity_unique ON daily_activity_summary(activity_date, role);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity_summary(activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activity_role ON daily_activity_summary(role);

-- Project Progress Aggregated: Tracks project phase progress
DO $$ 
BEGIN 
  DROP MATERIALIZED VIEW IF EXISTS public.project_progress_aggregated CASCADE; 
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ 
BEGIN 
  DROP VIEW IF EXISTS public.project_progress_aggregated CASCADE; 
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE MATERIALIZED VIEW public.project_progress_aggregated AS
SELECT 
  p.id as program_id,
  p.name as program_name,
  d.title as phase,
  COUNT(DISTINCT s.student_id) as total_students,
  COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.student_id END) as completed_students,
  ROUND(
    COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.student_id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT s.student_id), 0) * 100, 
    2
  ) as completion_rate,
  AVG(
    CASE 
      WHEN s.submitted_at IS NOT NULL AND s.created_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (s.submitted_at - s.created_at))/86400 
    END
  )::INTEGER as avg_time_days,
  -- Bottleneck score: higher = more bottleneck (many pending, low completion)
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN s.status = 'pending' THEN s.student_id END) > 5 
      AND ROUND(COUNT(DISTINCT CASE WHEN s.status = 'graded' THEN s.student_id END)::NUMERIC / NULLIF(COUNT(DISTINCT s.student_id), 0) * 100, 2) < 50
    THEN 'high'
    WHEN COUNT(DISTINCT CASE WHEN s.status = 'pending' THEN s.student_id END) > 3
    THEN 'medium'
    ELSE 'low'
  END as bottleneck_severity
FROM programs p
LEFT JOIN deliverables d ON d.program_id = p.id
LEFT JOIN submissions s ON s.deliverable_id = d.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '180 days'
GROUP BY p.id, p.name, d.title
ORDER BY p.name, d.title;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_project_progress_unique ON project_progress_aggregated(program_id, phase);

CREATE INDEX IF NOT EXISTS idx_project_progress_program ON project_progress_aggregated(program_id);
CREATE INDEX IF NOT EXISTS idx_project_progress_bottleneck ON project_progress_aggregated(bottleneck_severity);

-- User Engagement Scores: Measures user engagement across platform
DO $$ 
BEGIN 
  DROP MATERIALIZED VIEW IF EXISTS public.user_engagement_scores CASCADE; 
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ 
BEGIN 
  DROP VIEW IF EXISTS public.user_engagement_scores CASCADE; 
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE MATERIALIZED VIEW public.user_engagement_scores AS
SELECT 
  u.id as user_id,
  u.name,
  u.role,
  COALESCE(forum_stats.post_count, 0) as forum_posts,
  COALESCE(forum_stats.reply_count, 0) as forum_replies,
  COALESCE(msg_stats.messages_sent, 0) as messages_sent,
  COALESCE(msg_stats.messages_received, 0) as messages_received,
  COALESCE(workshop_stats.workshops_attended, 0) as workshops_attended,
  -- Engagement score calculation (0-100)
  LEAST(100, 
    (COALESCE(forum_stats.post_count, 0) * 5) +
    (COALESCE(forum_stats.reply_count, 0) * 3) +
    (COALESCE(msg_stats.messages_sent, 0) * 2) +
    (COALESCE(workshop_stats.workshops_attended, 0) * 10)
  ) as engagement_score,
  u.updated_at as last_activity
FROM users u
LEFT JOIN (
  SELECT 
    author_id,
    SUM(is_topic) as post_count,
    SUM(is_reply) as reply_count
  FROM (
    SELECT author_id, 1 as is_topic, 0 as is_reply FROM forum_topics WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    UNION ALL
    SELECT author_id, 0 as is_topic, 1 as is_reply FROM forum_posts WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  ) raw_stats
  GROUP BY author_id
) forum_stats ON forum_stats.author_id = u.id
LEFT JOIN (
  SELECT 
    combined_id as sender_id,
    SUM(messages_sent) as messages_sent,
    SUM(messages_received) as messages_received
  FROM (
    SELECT 
      sender_id as combined_id,
      COUNT(*) as messages_sent,
      0 as messages_received
    FROM messages
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY sender_id
    UNION ALL
    SELECT 
      recipient_id as combined_id,
      0 as messages_sent,
      COUNT(*) as messages_received
    FROM messages m
    WHERE m.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY recipient_id
  ) raw_msgs
  GROUP BY combined_id
) msg_stats ON msg_stats.sender_id = u.id
LEFT JOIN (
  SELECT 
    student_id,
    COUNT(*) as workshops_attended
  FROM program_participants pp
  WHERE pp.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY student_id
) workshop_stats ON workshop_stats.student_id = u.id
WHERE u.created_at >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY engagement_score DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_user_engagement_unique ON user_engagement_scores(user_id);

CREATE INDEX IF NOT EXISTS idx_user_engagement_score ON user_engagement_scores(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_engagement_role ON user_engagement_scores(role);

-- Platform Health Metrics: System health indicators
DO $$ 
BEGIN 
  DROP MATERIALIZED VIEW IF EXISTS public.platform_health_metrics CASCADE; 
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ 
BEGIN 
  DROP VIEW IF EXISTS public.platform_health_metrics CASCADE; 
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE MATERIALIZED VIEW public.platform_health_metrics AS
SELECT 
  CURRENT_DATE as metric_date,
  -- Uptime calculation (simplified - in production use monitoring service)
  99.9 as uptime_percentage,
  -- Error count from logs (placeholder - integrate with actual error logging)
  0 as error_count,
  -- Storage usage (placeholder - integrate with actual storage monitoring)
  ROUND(
    (SELECT SUM(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(tablename)))::NUMERIC / (1024^3) 
     FROM pg_tables 
     WHERE schemaname = 'public')::NUMERIC, 
    2
  ) as storage_used_gb,
  -- Active connections
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
  -- Total users
  (SELECT COUNT(*) FROM users) as total_users,
  -- Total programs
  (SELECT COUNT(*) FROM programs) as total_programs,
  -- Total submissions
  (SELECT COUNT(*) FROM submissions) as total_submissions,
  NOW() as last_updated;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_platform_health_unique ON platform_health_metrics(metric_date);

CREATE INDEX IF NOT EXISTS idx_platform_health_date ON platform_health_metrics(metric_date DESC);

-- ========================================
-- SECURITY (Revoke direct access)
-- ========================================

-- Revoke direct access to materialized views from public/authenticated users
-- They should access data via the security definer functions instead
DO $$ 
BEGIN
  REVOKE SELECT ON daily_activity_summary FROM anon, authenticated;
  REVOKE SELECT ON project_progress_aggregated FROM anon, authenticated;
  REVOKE SELECT ON user_engagement_scores FROM anon, authenticated;
  REVOKE SELECT ON platform_health_metrics FROM anon, authenticated;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to refresh all analytics materialized views
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_activity_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_progress_aggregated;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_scores;
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_health_metrics;
END;
$$;

-- Function to get real-time active users count
CREATE OR REPLACE FUNCTION public.get_active_users_realtime()
RETURNS TABLE(
  role TEXT,
  active_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.role,
    COUNT(DISTINCT u.id) as active_count
  FROM users u
  WHERE u.updated_at >= NOW() - INTERVAL '15 minutes'
  GROUP BY u.role
  ORDER BY u.role;
END;
$$;

-- Function to calculate user engagement score
CREATE OR REPLACE FUNCTION public.calculate_engagement_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_forum_posts INTEGER;
  v_forum_replies INTEGER;
  v_messages INTEGER;
  v_workshops INTEGER;
BEGIN
  -- Count forum posts (topics created) (last 30 days)
  SELECT COUNT(*) INTO v_forum_posts
  FROM forum_topics
  WHERE author_id = p_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Count forum replies (posts created)
  SELECT COUNT(*) INTO v_forum_replies
  FROM forum_posts
  WHERE author_id = p_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Count messages sent
  SELECT COUNT(*) INTO v_messages
  FROM messages
  WHERE sender_id = p_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Count workshops attended (simplified)
  SELECT COUNT(*) INTO v_workshops
  FROM program_participants
  WHERE student_id = p_user_id
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  -- Calculate score
  v_score := LEAST(100,
    (COALESCE(v_forum_posts, 0) * 5) +
    (COALESCE(v_forum_replies, 0) * 3) +
    (COALESCE(v_messages, 0) * 2) +
    (COALESCE(v_workshops, 0) * 10)
  );
  
  RETURN v_score;
END;
$$;

-- Function to detect anomalies in metrics
CREATE OR REPLACE FUNCTION public.detect_anomalies(
  p_metric_name TEXT,
  p_current_value NUMERIC,
  p_days_lookback INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mean NUMERIC;
  v_stddev NUMERIC;
  v_threshold NUMERIC;
  v_is_anomaly BOOLEAN := false;
  v_severity TEXT := 'normal';
BEGIN
  -- This is a simplified version - in production, you'd query historical data
  -- For now, we'll use placeholder logic
  
  -- Calculate mean and standard deviation (placeholder)
  v_mean := p_current_value;
  v_stddev := p_current_value * 0.2; -- 20% variation
  v_threshold := v_mean + (2 * v_stddev);
  
  -- Check if current value is anomalous
  IF p_current_value > v_threshold THEN
    v_is_anomaly := true;
    IF p_current_value > (v_mean + (3 * v_stddev)) THEN
      v_severity := 'critical';
    ELSE
      v_severity := 'warning';
    END IF;
  ELSIF p_current_value < (v_mean - (2 * v_stddev)) THEN
    v_is_anomaly := true;
    v_severity := 'warning';
  END IF;
  
  RETURN jsonb_build_object(
    'metric_name', p_metric_name,
    'current_value', p_current_value,
    'mean', v_mean,
    'stddev', v_stddev,
    'is_anomaly', v_is_anomaly,
    'severity', v_severity,
    'threshold_upper', v_threshold,
    'threshold_lower', v_mean - (2 * v_stddev)
  );
END;
$$;

-- Function to get usage statistics for a date range
CREATE OR REPLACE FUNCTION public.get_usage_statistics(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  activity_date DATE,
  role TEXT,
  active_users BIGINT,
  total_sessions BIGINT,
  avg_session_duration INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    das.activity_date,
    das.role,
    das.active_users,
    das.total_sessions,
    das.avg_session_duration_minutes
  FROM daily_activity_summary das
  WHERE das.activity_date BETWEEN p_start_date AND p_end_date
  ORDER BY das.activity_date DESC, das.role;
END;
$$;

-- Function to get project progress metrics
CREATE OR REPLACE FUNCTION public.get_project_progress(p_program_id UUID DEFAULT NULL)
RETURNS TABLE(
  program_id UUID,
  program_name TEXT,
  PHASE TEXT,
  total_students BIGINT,
  completed_students BIGINT,
  completion_rate NUMERIC,
  avg_time_days INTEGER,
  bottleneck_severity TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_program_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      ppa.program_id,
      ppa.program_name,
      ppa.phase,
      ppa.total_students,
      ppa.completed_students,
      ppa.completion_rate,
      ppa.avg_time_days,
      ppa.bottleneck_severity
    FROM project_progress_aggregated ppa
    WHERE ppa.program_id = p_program_id
    ORDER BY ppa.phase;
  ELSE
    RETURN QUERY
    SELECT 
      ppa.program_id,
      ppa.program_name,
      ppa.phase,
      ppa.total_students,
      ppa.completed_students,
      ppa.completion_rate,
      ppa.avg_time_days,
      ppa.bottleneck_severity
    FROM project_progress_aggregated ppa
    ORDER BY ppa.program_name, ppa.phase;
  END IF;
END;
$$;

-- ========================================
-- INITIAL DATA POPULATION
-- ========================================

-- Refresh views on creation
SELECT refresh_analytics_views();

-- ========================================
-- HELPER VIEWS FOR COMMON QUERIES
-- ========================================

-- View for feature adoption rates
CREATE OR REPLACE VIEW public.feature_adoption_rates
WITH (security_invoker = true)
AS
SELECT 
  'Forum' as feature_name,
  COUNT(DISTINCT author_id) as unique_users,
  COUNT(*) as total_actions
FROM (
  SELECT author_id, created_at FROM forum_topics
  UNION ALL
  SELECT author_id, created_at FROM forum_posts
) f
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
  'Messaging' as feature_name,
  COUNT(DISTINCT sender_id) as unique_users,
  COUNT(*) as total_actions
FROM messages
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
  'Projects' as feature_name,
  COUNT(DISTINCT student_id) as unique_users,
  COUNT(*) as total_actions
FROM submissions
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
  'Calendar' as feature_name,
  COUNT(DISTINCT student_id) as unique_users,
  COUNT(*) as total_actions
FROM program_participants
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- View for message response times
CREATE OR REPLACE VIEW public.message_response_times
WITH (security_invoker = true)
AS
SELECT 
  DATE(m1.created_at) as message_date,
  AVG(EXTRACT(EPOCH FROM (m2.created_at - m1.created_at))/60)::INTEGER as avg_response_minutes
FROM messages m1
JOIN messages m2 ON 
  (m2.sender_id = m1.recipient_id AND m2.recipient_id = m1.sender_id)
  OR
  (m2.sender_id = m1.sender_id AND m2.recipient_id = m1.recipient_id)
WHERE 
  m2.created_at > m1.created_at
  AND m2.sender_id != m1.sender_id
  AND m1.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(m1.created_at)
ORDER BY message_date DESC;

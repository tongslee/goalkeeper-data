-- Goalkeeper Stats Database Schema
-- AWS EC2 (PostgreSQL)
-- Version: 1.0

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- ============================================
-- USER SUBSCRIPTIONS (for premium features)
-- ============================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_type VARCHAR(50) NOT NULL DEFAULT 'free',
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON user_subscriptions(status);

-- ============================================
-- PERMISSIONS (RBAC)
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    can_read BOOLEAN DEFAULT TRUE,
    can_write BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_permissions_user ON permissions(user_id, permission_name);

-- ============================================
-- SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- PLAYER STATS (the main goalkeeper data)
-- ============================================
CREATE TABLE IF NOT EXISTS player_stats (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_name VARCHAR(200) NOT NULL,
    team_name VARCHAR(200),
    competition VARCHAR(200),
    season VARCHAR(50),
    stats_json JSONB,
    
    -- Basic stats (mirrored for easy querying)
    matches_played INT DEFAULT 0,
    minutes_played INT DEFAULT 0,
    goals_conceded INT DEFAULT 0,
    saves INT DEFAULT 0,
    clean_sheets INT DEFAULT 0,
    penalties_saved INT DEFAULT 0,
    penalties_missed INT DEFAULT 0,
    goals_scored INT DEFAULT 0,
    assists INT DEFAULT 0,
    
    is_public BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    source_url VARCHAR(500),
    source_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Full-text search
    search_vector tsvector
);

CREATE INDEX idx_player_user ON player_stats(user_id);
CREATE INDEX idx_player_name ON player_stats(player_name);
CREATE INDEX idx_competition ON player_stats(competition);
CREATE INDEX idx_season ON player_stats(season);
CREATE INDEX idx_public ON player_stats(is_public);
CREATE INDEX idx_player_search ON player_stats USING GIN(search_vector);

-- Trigger to update search vector
CREATE OR REPLACE FUNCTION update_player_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        to_tsvector('english', COALESCE(NEW.player_name, '') || ' ' || 
        COALESCE(NEW.team_name, '') || ' ' || 
        COALESCE(NEW.competition, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER player_search_update
    BEFORE INSERT OR UPDATE ON player_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_player_search_vector();

-- ============================================
-- MATCH EVENTS (detailed match data)
-- ============================================
CREATE TABLE IF NOT EXISTS match_events (
    id SERIAL PRIMARY KEY,
    player_stat_id INT NOT NULL REFERENCES player_stats(id) ON DELETE CASCADE,
    match_date DATE NOT NULL,
    match_team VARCHAR(200),
    opponent_team VARCHAR(200),
    competition VARCHAR(200),
    season VARCHAR(50),
    minutes_played INT DEFAULT 0,
    goals_conceded INT DEFAULT 0,
    saves INT DEFAULT 0,
    clean_sheet BOOLEAN DEFAULT FALSE,
    penalty_save BOOLEAN DEFAULT FALSE,
    penalty_goal BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2),
    notes TEXT,
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_match_player ON match_events(player_stat_id);
CREATE INDEX idx_match_date ON match_events(match_date);

-- ============================================
-- USER PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    preferred_competitions TEXT[],  -- PostgreSQL array
    preferred_teams TEXT[],
    notification_settings JSONB,
    display_settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- API KEYS (for external integrations)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{"read": true, "write": false}',
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_key ON api_keys(api_key);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);
CREATE INDEX idx_activity_action ON activity_logs(action);

-- ============================================
-- ADVANCED: MATERIALIZED VIEWS (for reporting)
-- ============================================
-- Player leaderboard by competition/season
CREATE MATERIALIZED VIEW player_leaderboard AS
SELECT 
    player_name,
    team_name,
    competition,
    season,
    COUNT(*) as total_matches,
    SUM(clean_sheets) as total_clean_sheets,
    ROUND(SUM(clean_sheets)::numeric / COUNT(*)::numeric * 100, 1) as clean_sheet_pct,
    AVG(rating) as avg_rating
FROM match_events
JOIN player_stats ON match_events.player_stat_id = player_stats.id
WHERE match_events.rating IS NOT NULL
GROUP BY player_name, team_name, competition, season
ORDER BY avg_rating DESC;

CREATE UNIQUE INDEX idx_leaderboard ON player_leaderboard(player_name, team_name, competition, season);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY player_leaderboard;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AETHELGARD ONLINE / SOLO LEVELING: ARISE - SECURE ATTRIBUTE & AFFINITY SCHEMA
-- PostgreSQL / Relational Database Definition
-- ============================================================================

-- 1. Character Hunter Attributes Table (Server-Authoritative State)
CREATE TABLE IF NOT EXISTS character_stats (
    player_id VARCHAR(64) NOT NULL,
    character_id VARCHAR(64) NOT NULL DEFAULT 'elurien',
    strength INT NOT NULL DEFAULT 20 CHECK (strength >= 20 AND strength <= 200),
    agility INT NOT NULL DEFAULT 20 CHECK (agility >= 20 AND agility <= 200),
    vitality INT NOT NULL DEFAULT 20 CHECK (vitality >= 20 AND vitality <= 200),
    intelligence INT NOT NULL DEFAULT 10 CHECK (intelligence >= 10 AND intelligence <= 200),
    perception INT NOT NULL DEFAULT 10 CHECK (perception >= 10 AND perception <= 200),
    available_points INT NOT NULL DEFAULT 15 CHECK (available_points >= 0),
    total_earned_points INT NOT NULL DEFAULT 15,
    total_power INT NOT NULL DEFAULT 2350,
    session_token VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, character_id)
);

-- 2. Anti-Cheat Security & Stat Audit Log Table
CREATE TABLE IF NOT EXISTS stat_allocation_audit_log (
    audit_id SERIAL PRIMARY KEY,
    player_id VARCHAR(64) NOT NULL,
    character_id VARCHAR(64) NOT NULL,
    calculated_spent INT NOT NULL,
    submitted_pool INT NOT NULL,
    expected_earned INT NOT NULL,
    status VARCHAR(32) NOT NULL, -- 'VERIFIED_SUCCESS' | 'CHEATING_BLOCKED' | 'BOUNDS_ERROR'
    rejection_reason TEXT,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Dynamic NPC Affinity & Relationship Ledger
CREATE TABLE IF NOT EXISTS npc_affinity_ledger (
    player_id VARCHAR(64) NOT NULL,
    npc_id VARCHAR(64) NOT NULL,
    affinity_score INT NOT NULL DEFAULT 0 CHECK (affinity_score >= -100 AND affinity_score <= 100),
    trust_score INT NOT NULL DEFAULT 0 CHECK (trust_score >= -100 AND trust_score <= 100),
    composite_score INT NOT NULL DEFAULT 0 CHECK (composite_score >= -100 AND composite_score <= 100),
    status_tier VARCHAR(32) NOT NULL DEFAULT 'Neutral',
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, npc_id)
);

-- Indexes for lightning-fast queries during combat matchmaking & bazaar trading
CREATE INDEX IF NOT EXISTS idx_char_stats_player ON character_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_stat_audit_player ON stat_allocation_audit_log(player_id);
CREATE INDEX IF NOT EXISTS idx_npc_affinity_player ON npc_affinity_ledger(player_id);

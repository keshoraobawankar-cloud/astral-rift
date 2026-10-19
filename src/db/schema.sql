-- ============================================================================
-- AETHELGARD ONLINE - PRODUCTION RELATIONAL DATABASE SCHEMA DEFINITIONS
-- Compatible with Cloud SQL (PostgreSQL) and Supabase
-- Includes Optimistic Concurrency, Biome Partitioning & Transaction Auditing
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Core Players & Spatial State
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  gold BIGINT NOT NULL DEFAULT 50000 CHECK (gold >= 0),
  essence BIGINT NOT NULL DEFAULT 1500 CHECK (essence >= 0),
  current_zone TEXT NOT NULL DEFAULT 'citadel_plaza',
  pos_x REAL NOT NULL DEFAULT 0,
  pos_y REAL NOT NULL DEFAULT 0,
  pos_z REAL NOT NULL DEFAULT 0,
  well_rested_until TIMESTAMPTZ,
  sleeper_until TIMESTAMPTZ,
  artisan_rep JSONB NOT NULL DEFAULT '{"broman": 0, "lyra": 0, "grimm": 0}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 6-Player Strike Team Roster & Attribute Matrix
CREATE TABLE IF NOT EXISTS player_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  hero_key TEXT NOT NULL,
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 100),
  exp BIGINT NOT NULL DEFAULT 0 CHECK (exp >= 0),
  unspent_points INT NOT NULL DEFAULT 0 CHECK (unspent_points >= 0),
  str INT NOT NULL DEFAULT 10 CHECK (str >= 1),
  agi INT NOT NULL DEFAULT 10 CHECK (agi >= 1),
  int_stat INT NOT NULL DEFAULT 10 CHECK (int_stat >= 1),
  per INT NOT NULL DEFAULT 10 CHECK (per >= 1),
  equipped_weapon_id UUID,
  UNIQUE(player_id, hero_key)
);

-- 3. Authoritative Inventory, Relics & Boss Runes
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_template_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('WEAPON', 'ARMOR', 'MATERIAL', 'BOSS_RUNE', 'CONSUMABLE')),
  rarity TEXT NOT NULL CHECK (rarity IN ('R', 'SR', 'SSR', 'MYTHIC')),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  temper_level INT NOT NULL DEFAULT 0 CHECK (temper_level BETWEEN 0 AND 15),
  bonus_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_equipped BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inventory_player ON inventory_items(player_id, item_template_id);

-- 4. 30 Roaming World Bosses State
CREATE TABLE IF NOT EXISTS world_boss_states (
  boss_id TEXT PRIMARY KEY,
  biome_id TEXT NOT NULL,
  current_hp BIGINT NOT NULL CHECK (current_hp >= 0),
  max_hp BIGINT NOT NULL CHECK (max_hp > 0),
  status TEXT NOT NULL DEFAULT 'ALIVE' CHECK (status IN ('ALIVE', 'COMBAT', 'DEFEATED')),
  respawn_at TIMESTAMPTZ,
  threat_table JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_world_boss_biome ON world_boss_states(biome_id);

-- 5. Planar Teleportation Array (Tier 1 -> Tier 2 Unlock)
CREATE TABLE IF NOT EXISTS planar_array_progress (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  socketed_runes TEXT[] NOT NULL DEFAULT '{}',
  tier2_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ
);

-- 6. Immutable Economy & Anti-Cheat Audit Ledger
CREATE TABLE IF NOT EXISTS economy_ledger (
  tx_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  gold_delta BIGINT NOT NULL DEFAULT 0,
  essence_delta BIGINT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_player_time ON economy_ledger(player_id, created_at DESC);

-- 7. NPC Conversation Memory & Affinity Ledger
CREATE TABLE IF NOT EXISTS npc_affinity_ledger (
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  npc_id TEXT NOT NULL,
  affinity_score INT NOT NULL DEFAULT 0 CHECK (affinity_score >= -100 AND affinity_score <= 100),
  trust_score INT NOT NULL DEFAULT 0 CHECK (trust_score >= -100 AND trust_score <= 100),
  reputation_tier TEXT NOT NULL DEFAULT 'Neutral',
  recent_dialogue_turns JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_interaction TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, npc_id)
);
CREATE INDEX IF NOT EXISTS idx_npc_affinity_player ON npc_affinity_ledger(player_id);

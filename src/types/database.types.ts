export interface PlayerRecord {
  id: string;
  username: string;
  password_hash?: string;
  gold: number;
  essence: number;
  current_zone: string;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  well_rested_until: string | null;
  sleeper_until: string | null;
  artisan_rep: { broman: number; lyra: number; grimm: number };
  version: number;
  updated_at?: string;
  created_at?: string;
}

export interface PlayerRosterRecord {
  id: string;
  player_id: string;
  hero_key: string;
  level: number;
  exp: number;
  unspent_points: number;
  str: number;
  agi: number;
  int_stat: number;
  per: number;
  equipped_weapon_id?: string | null;
}

export interface InventoryItemRecord {
  id: string;
  player_id: string;
  item_template_id: string;
  category: 'WEAPON' | 'ARMOR' | 'MATERIAL' | 'BOSS_RUNE' | 'CONSUMABLE';
  rarity: 'R' | 'SR' | 'SSR' | 'MYTHIC';
  quantity: number;
  temper_level: number;
  bonus_stats: Record<string, number>;
  is_equipped: boolean;
  created_at?: string;
}

export interface WorldBossStateRecord {
  boss_id: string;
  biome_id: string;
  current_hp: number;
  max_hp: number;
  status: 'ALIVE' | 'COMBAT' | 'DEFEATED';
  respawn_at: string | null;
  threat_table: Record<string, number>;
  updated_at?: string;
}

export interface PlanarArrayProgressRecord {
  player_id: string;
  socketed_runes: string[];
  tier2_unlocked: boolean;
  unlocked_at: string | null;
}

export interface EconomyLedgerRecord {
  tx_id: string;
  player_id: string;
  action_type: string;
  gold_delta: number;
  essence_delta: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface NpcAffinityRecord {
  player_id: string;
  npc_id: string;
  affinity_score: number;
  trust_score: number;
  reputation_tier: string;
  recent_dialogue_turns: Array<{ userPrompt: string; npcResponse: string; timestamp: string }>;
  last_interaction: string;
}

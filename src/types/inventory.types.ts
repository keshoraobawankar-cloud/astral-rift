// ============================================================================
// GEAR STATS & WEAPON SLOT INVENTORY TYPES
// Action RPG Equipment Grids (Solo Leveling / Aethelgard Architecture)
// ============================================================================

export type EquipmentSlotType =
  | 'weapon'
  | 'helmet'
  | 'armor'
  | 'gloves'
  | 'boots'
  | 'accessory';

export type ItemRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface StatBonuses {
  strength?: number;
  agility?: number;
  vitality?: number;
  intelligence?: number;
  perception?: number;
  attackPower?: number;
  defense?: number;
  critRate?: number;
}

// Static template definition for an item in the game database
export interface ItemTemplate {
  id: string;
  name: string;
  rarity: ItemRarity;
  slot: EquipmentSlotType;
  stats: StatBonuses;
  iconUrl?: string;
  iconEmoji?: string;
  description?: string;
}

// An instance of an item owned by a player (can have unique upgrades/enhancements)
export interface PlayerItem {
  instanceId: string; // Unique GUID for this specific dropped item
  templateId: string;
  enhancementLevel: number; // e.g., +0 to +20
  equipped?: boolean;
}

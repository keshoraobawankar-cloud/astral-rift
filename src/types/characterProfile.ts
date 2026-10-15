export interface CharacterProfile {
  id: string;
  name: string;
  archetype: string;
  rarity: 'R' | 'SR' | 'SSR';
  element: 'Fire' | 'Water' | 'Wind' | 'Dark' | 'Light';
  level: number;
  totalPower: number;
  stats: {
    strength: number;
    agility: number;
    vitality: number;
    intelligence: number;
    perception: number;
  };
  equippedWeapon: {
    name: string;
    tier: string;
    attackBonus: number;
  };
  celShadedArt?: {
    shadowAuraColor: string;
    outlineColor: string;
    glowAccent: string;
    silhouetteStyle: string;
    monarchRune: string;
  };
}

export interface HunterDatabaseRecord {
  playerId: string;
  characterId: string;
  stats: {
    strength: number;
    agility: number;
    vitality: number;
    intelligence: number;
    perception: number;
  };
  availablePoints: number;
  totalPower: number;
  updatedAt: string;
}

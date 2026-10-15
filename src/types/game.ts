export type ElementType = 'solar' | 'void' | 'ether' | 'flame' | 'arcane' | 'earth' | 'wind' | 'Shadow' | string;
export type RaceType = 'elf' | 'dwarf' | 'human' | 'beastkin' | 'fairy' | 'Wood Elf' | 'Void-Touched Human' | 'Umbral Elf' | 'Dwarven Colossus' | 'Shadow Monarch' | string;

export interface AttributeMatrix {
  strength: number;
  agility: number;
  intelligence: number;
  endurance: number;
  vitality?: number;
  perception: number;
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  cooldown: number; // in seconds
  energyCost?: number;
  icon: string;
  type: 'attack' | 'skill' | 'burst' | 'passive';
  scalingPct: number;
  synergyElement?: 'wind' | 'hammer_impact' | 'mana_pulse' | 'fairy_mark' | 'earth_shatter' | string;
  appliesTag?: 'Status.Primed.Wind' | 'Status.Primed.Dust' | 'Status.Primed.FairyRing' | string;
}

export interface Character {
  id: string;
  name: string;
  title: string;
  race: RaceType;
  className?: string;
  element: ElementType;
  rarity: 4 | 5 | 'SSR' | 'SR' | number | string;
  totalPower?: number;
  level: number;
  exp: number;
  maxExp: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  attributes: AttributeMatrix;
  critRate: number;
  critDmg: number;
  energy: number;
  maxEnergy: number;
  speed: number;
  color: string;
  accentColor: string;
  avatarIcon: string;
  lore: string;
  weaponName: string;
  weaponType: 'Blade' | 'Scythe' | 'Bow' | 'Halberd' | 'Runic Hammer' | 'Arcane Staff' | 'Soul Scythe' | 'Greatsword' | 'Dagger' | string;
  equippedWeapon?: {
    name: string;
    rarity: string;
    attackBonus: number;
    effect: string;
  };
  skills: {
    normal: SkillInfo;
    active: SkillInfo;
    burst: SkillInfo;
    passive: SkillInfo;
  };
  racialTrait: {
    name: string;
    description: string;
    bonusStat: string;
  };
  modelPath?: string;
  celShadeColor?: number;
  skillsList?: string[];
}

export interface Enemy {
  id: string;
  name: string;
  title?: string;
  level: number;
  element: ElementType;
  maxHp: number;
  currentHp: number;
  maxShield: number;
  currentShield: number;
  armorPlates?: {
    maxArmor: number;
    currentArmor: number;
    isBroken: boolean;
  };
  hasManaDrain?: boolean;
  isMimic?: boolean;
  revealed?: boolean;
  primedWindTimer?: number;
  attack: number;
  defense: number;
  speed: number;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'goblin' | 'goblin_shaman' | 'golem' | 'undead' | 'mimic' | 'world_boss' | 'minion' | 'elite' | 'boss';
  attackCooldown: number;
  telegraphTimer: number;
  telegraphDuration: number;
  telegraphType?: 'circle' | 'cone' | 'line';
  color: string;
  aiState: 'idle' | 'chase' | 'telegraph' | 'attack' | 'stunned' | 'hit_and_run';
  stunTimer: number;
  bossPhase?: number;
  enrageTimer?: number;
  enraged?: boolean;
}

export interface LightAuraRing {
  id: string;
  x: number;
  y: number;
  radius: number;
  duration: number;
  color: string;
}

export interface DungeonTrap {
  id: string;
  x: number;
  y: number;
  radius: number;
  detected: boolean;
  triggered: boolean;
  type: 'tripwire' | 'mana_drain_rune' | 'spike';
}

export interface CombatParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  shape?: 'circle' | 'spark' | 'ring' | 'star';
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  element: ElementType;
  isCrit: boolean;
  isPlayer: boolean;
  piercing: boolean;
  life: number;
  maxLife: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  alpha: number;
  vy: number;
  isCrit: boolean;
  life: number;
}

export interface SlashEffect {
  x: number;
  y: number;
  angle: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  isSynergyTempest?: boolean;
}

export interface PotionState {
  currentToxicity: number;
  decayRate: number;
  isManaSick: boolean;
  manaSicknessTimer: number;
}

export type BiomeType =
  | 'emerald_forest'
  | 'ironpeak_caldera'
  | 'sylph_meadow'
  | 'shattered_badlands'
  | 'sunken_ruins'
  | 'citadel_plaza'
  | 'floating_expanse';

export interface WorldBossInfo {
  id: string;
  name: string;
  title: string;
  biome: BiomeType;
  level: number;
  element: ElementType;
  hp: number;
  runeDrop: string;
  enrageWeather: string;
  description: string;
  unlocked: boolean;
  defeated: boolean;
}

export interface TeleportationArray {
  isActivated: boolean;
  socketedRunes: string[];
  requiredRunes: string[];
  tier2Unlocked: boolean;
}

export interface SafeZoneState {
  bIsInSafeZone: boolean;
  locationName: string;
  infamyPoints: number;
  bountyTokenValue: number;
  isRestingInInn: boolean;
  wellRestedExpMultiplierActive: boolean;
  wellRestedTimerSeconds: number;
  exhaustedSleeperTimer: number;
  isSleepingInWilderness: boolean;
}

export interface DialogueOption {
  text: string;
  intent: 'bargain' | 'lore' | 'quest' | 'inn_rest' | 'runes';
  speechVoiceText?: string;
}

export interface NPCProfile {
  id: string;
  name: string;
  role: string;
  location: string;
  avatar: string;
  voicePitch: number;
  greeting: string;
  memory: {
    reputation: number;
    pastTransactions: number;
    unlockedHiddenQuests: string[];
  };
  dialogueTree: {
    [key: string]: {
      response: string;
      options: DialogueOption[];
      triggersHiddenQuest?: string;
    };
  };
}

export interface HiddenQuest {
  id: string;
  title: string;
  hint: string;
  unlocked: boolean;
  completed: boolean;
  rewardStardust: number;
  rewardRune?: string;
}

export interface GuildPerk {
  id: string;
  title: string;
  description: string;
  unlockedAtTier: number;
  active: boolean;
}

export interface GuildRoomUpgrade {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  benefit: string;
  cost: {
    stardust: number;
    golemAlloy: number;
    spiritWood: number;
    manaCrystals: number;
  };
}

export interface GuildEstate {
  name: string;
  cityLocation: string;
  charterTier: 1 | 2 | 3 | 4 | 5;
  tierName: string;
  treasury: {
    stardust: number;
    manaCrystals: number;
    golemAlloy: number;
    spiritWood: number;
    goblinLeather: number;
  };
  vaultItems: Array<{
    id: string;
    name: string;
    count: number;
    rarity: 1 | 2 | 3 | 4 | 5;
    icon: string;
    description: string;
  }>;
  perks: GuildPerk[];
  rooms: GuildRoomUpgrade[];
}

export interface WeaponTempering {
  id: string;
  name: string;
  description: string;
  statBonus: string;
  cost: {
    golemAlloy: number;
    manaCrystals: number;
    stardust: number;
  };
}

export interface ArcaneWeaveRecipe {
  id: string;
  name: string;
  type: 'Robe' | 'Staff' | 'Quiver' | 'Boots';
  description: string;
  intelligenceReq: number;
  cost: {
    goblinLeather: number;
    fairyDust: number;
    spiritWood: number;
    alchemicalHerbs: number;
  };
  stats: string;
}

export type LootMode = 'personal' | 'master_loot' | 'roll_need_greed';

export interface RealmNode {
  id: string;
  realmId: string;
  name: string;
  type: 'combat' | 'elite' | 'boss' | 'monolith' | 'merchant' | 'vault' | 'dungeon_level' | 'world_boss';
  floorMutator?: 'Mana Drought' | 'Overgrowth' | 'Arcane Surge' | 'None';
  description: string;
  recommendedPower: number;
  completed: boolean;
  unlocked: boolean;
  x: number;
  y: number;
  connectedTo: string[];
  rewards: {
    stardust: number;
    prisms: number;
    shards: number;
    relicDropRate: number;
    arrayRune?: string;
    craftingMaterials?: {
      goblinLeather?: number;
      golemAlloy?: number;
      manaCrystals?: number;
      alchemicalHerbs?: number;
      fairyDust?: number;
      spiritWood?: number;
    };
  };
  enemies?: Array<{
    name: string;
    level: number;
    type: 'goblin' | 'goblin_shaman' | 'golem' | 'undead' | 'mimic' | 'world_boss' | 'minion' | 'elite' | 'boss';
    element: ElementType;
  }>;
  bossDetails?: {
    name: string;
    title: string;
    description: string;
  };
}

export interface Realm {
  id: string;
  name: string;
  title: string;
  description: string;
  tier: 1 | 2;
  dominantElement: ElementType;
  bgGradient: string;
  accentColor: string;
  unlocked: boolean;
  nodes: RealmNode[];
}

export interface Relic {
  id: string;
  name: string;
  slot: 'Core' | 'Circlet' | 'Vessel' | 'Prism';
  setName: 'Solarian Radiance' | 'Abyssal Void' | 'Celestial Weaver' | 'Nova Fortress';
  rarity: 3 | 4 | 5;
  level: number;
  mainStat: {
    stat: 'ATK' | 'HP' | 'DEF' | 'CRIT_RATE' | 'CRIT_DMG' | 'ENERGY_REGEN';
    value: number;
  };
  subStats: Array<{
    stat: 'ATK' | 'HP' | 'DEF' | 'CRIT_RATE' | 'CRIT_DMG';
    value: number;
  }>;
  equippedTo?: string;
}

export interface Weapon {
  id: string;
  name: string;
  type: 'Blade' | 'Scythe' | 'Bow' | 'Halberd' | 'Runic Hammer' | 'Arcane Staff';
  rarity: 4 | 5;
  baseAtk: number;
  subStat: {
    stat: 'CRIT_RATE' | 'CRIT_DMG' | 'ATK_PERCENT' | 'ENERGY_REGEN';
    value: number;
  };
  temperingTrait?: string;
  level: number;
  rank: number;
  equippedTo?: string;
  description: string;
}

export interface PlayerInventory {
  stardust: number;
  astralPrisms: number;
  riftShards: number;
  manaPotions: number;
  goblinLeather: number;
  golemAlloy: number;
  manaCrystals: number;
  alchemicalHerbs: number;
  fairyDust: number;
  spiritWood: number;
  arrayRunes: string[];
  bountyTokens: number;
  weapons: Weapon[];
  relics: Relic[];
}

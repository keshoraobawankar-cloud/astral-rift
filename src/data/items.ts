import { Weapon, Relic } from '../types/game';

export const INITIAL_WEAPONS: Weapon[] = [
  {
    id: 'wpn_dwarf_hammer',
    name: 'Khaz-Modan Runebreaker',
    type: 'Runic Hammer',
    rarity: 5,
    baseAtk: 120,
    subStat: { stat: 'CRIT_DMG', value: 0.35 },
    level: 1,
    rank: 1,
    description: 'Forged in deep tectonic volcanic fissures. Its heavy runic face shatters golem armor plates with colossal impact.',
  },
  {
    id: 'wpn_elf_staff',
    name: 'Yggdrasil Gale Spire',
    type: 'Arcane Staff',
    rarity: 5,
    baseAtk: 110,
    subStat: { stat: 'ENERGY_REGEN', value: 0.25 },
    level: 1,
    rank: 1,
    description: 'Spun from living elderwood and silver fairy filaments. Amplifies howling winds and accelerates mana recovery.',
  },
  {
    id: 'wpn_fairy_wand',
    name: 'Sylph Whisper Dagger',
    type: 'Blade',
    rarity: 4,
    baseAtk: 88,
    subStat: { stat: 'CRIT_RATE', value: 0.15 },
    level: 1,
    rank: 1,
    description: 'Gleams with luminous fae residue that detects concealed tripwires, mimics, and rogue ambushes.',
  },
  {
    id: 'wpn_beast_claws',
    name: 'Rendclaw Twin Halberd',
    type: 'Halberd',
    rarity: 4,
    baseAtk: 92,
    subStat: { stat: 'ATK_PERCENT', value: 0.18 },
    level: 1,
    rank: 1,
    description: 'Hardened beastkin steel crafted to swiftly sever goblin tripwires and execute hit-and-run counterpunches.',
  },
  {
    id: 'wpn_sunblade',
    name: 'Solarian Sunblade',
    type: 'Blade',
    rarity: 5,
    baseAtk: 115,
    subStat: { stat: 'CRIT_RATE', value: 0.18 },
    level: 1,
    rank: 1,
    description: 'A radiant golden blade channeled from solar flares, searing undead monstrosities with cleansing heat.',
  },
  {
    id: 'kasakas_venom_fang',
    name: "Kasaka's Venom Fang",
    type: 'Blade',
    rarity: 4,
    baseAtk: 245,
    subStat: { stat: 'CRIT_RATE', value: 0.22 },
    level: 1,
    rank: 1,
    description: 'Carved from the Great Blue Swamp Snake. Inflicts [Bleed] and [Paralysis] on critical hits, dealing 15% damage over 5 seconds.',
  },
  {
    id: 'demonic_plum_flower_sword',
    name: 'Demonic Plum Flower Sword',
    type: 'Blade',
    rarity: 5,
    baseAtk: 480,
    subStat: { stat: 'CRIT_DMG', value: 0.32 },
    level: 1,
    rank: 1,
    description: 'Unleashes [Plum Blossom Domain], increasing Critical Strike Damage by 32% and attack speed by 20%.',
  },
  {
    id: 'shadow_scythe',
    name: 'Shadow Scythe',
    type: 'Scythe',
    rarity: 5,
    baseAtk: 450,
    subStat: { stat: 'ATK_PERCENT', value: 0.28 },
    level: 1,
    rank: 1,
    description: 'Harvests enemy souls to regenerate 12% max HP and unleashes Dark Decapitation waves.',
  },
];

export interface SoloWeaponItem {
  id: string;
  name: string;
  rarity: 'SR' | 'SSR';
  type: string;
  baseAttack: number;
  effect: string;
  icon: string;
}

export const weaponDatabase: Record<string, SoloWeaponItem> = {
  kasakas_venom_fang: {
    id: 'kasakas_venom_fang',
    name: "Kasaka's Venom Fang",
    rarity: 'SR',
    type: 'Dagger',
    baseAttack: 245,
    effect: 'Inflicts [Bleed] and [Paralysis] on critical hits, dealing 15% damage over 5 seconds.',
    icon: '🗡️',
  },
  demonic_plum_flower_sword: {
    id: 'demonic_plum_flower_sword',
    name: 'Demonic Plum Flower Sword',
    rarity: 'SSR',
    type: 'Katana',
    baseAttack: 480,
    effect: 'Unleashes [Plum Blossom Domain], increasing Critical Strike Damage by 32% and attack speed by 20%.',
    icon: '🌸',
  },
  shadow_scythe: {
    id: 'shadow_scythe',
    name: 'Shadow Scythe',
    rarity: 'SSR',
    type: 'Scythe',
    baseAttack: 450,
    effect: 'Harvests enemy souls to regenerate 12% max HP and unleashes Dark Decapitation waves.',
    icon: '⚡',
  },
  thetis_grimoire: {
    id: 'thetis_grimoire',
    name: "Thetis' Grimoire",
    rarity: 'SSR',
    type: 'Magic Tome',
    baseAttack: 460,
    effect: 'Freezes enemies solid in an icy domain for 3 seconds, amplifying all party elemental damage by 25%.',
    icon: '❄️',
  },
};

export const INITIAL_RELICS: Relic[] = [
  {
    id: 'relic_sol_1',
    name: 'Crest of the Dawn Vanguard',
    slot: 'Core',
    setName: 'Solarian Radiance',
    rarity: 5,
    level: 1,
    mainStat: { stat: 'ATK', value: 85 },
    subStats: [
      { stat: 'CRIT_RATE', value: 0.05 },
      { stat: 'CRIT_DMG', value: 0.12 },
    ],
  },
  {
    id: 'relic_void_1',
    name: 'Eye of the Black Star',
    slot: 'Circlet',
    setName: 'Abyssal Void',
    rarity: 4,
    level: 1,
    mainStat: { stat: 'ENERGY_REGEN', value: 0.15 },
    subStats: [
      { stat: 'ATK', value: 35 },
      { stat: 'HP', value: 240 },
    ],
  },
  {
    id: 'relic_earth_1',
    name: 'Golem Core Fragment',
    slot: 'Vessel',
    setName: 'Nova Fortress',
    rarity: 5,
    level: 1,
    mainStat: { stat: 'DEF', value: 110 },
    subStats: [
      { stat: 'HP', value: 450 },
      { stat: 'DEF', value: 40 },
    ],
  },
  {
    id: 'relic_weaver_1',
    name: 'Fairy Dust Crystal Lens',
    slot: 'Prism',
    setName: 'Celestial Weaver',
    rarity: 4,
    level: 1,
    mainStat: { stat: 'CRIT_DMG', value: 0.22 },
    subStats: [
      { stat: 'CRIT_RATE', value: 0.06 },
      { stat: 'ATK', value: 28 },
    ],
  },
];

export const RELIC_SET_DESCRIPTIONS: Record<string, { twoPiece: string; fourPiece: string }> = {
  'Solarian Radiance': {
    twoPiece: '+18% Attack Power across all party members',
    fourPiece: 'Attacking burning or stunned enemies deals +35% bonus holy/solar damage',
  },
  'Abyssal Void': {
    twoPiece: '+20% Mana and Energy Recharge Rate',
    fourPiece: 'Burst and ultimate abilities refund 25% energy on hit',
  },
  'Celestial Weaver': {
    twoPiece: '+15% Elemental & Arcane Damage',
    fourPiece: 'Elemental combos (like Wind + Hammer Tempest) create a 5-second shockwave vortex',
  },
  'Nova Fortress': {
    twoPiece: '+25% Defense and Stun Resistance',
    fourPiece: 'When breaking enemy golem armor, the whole party gains 300 HP barrier',
  },
};

import { ElementType } from '../types/game';

export interface MonsterLootDrop {
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  dropChance: number; // percentage, e.g. 85 = 85%
  description: string;
  icon?: string;
}

export interface MonsterWeakness {
  element: string;
  description: string;
  multiplier: string;
}

export interface BestiaryEntry {
  id: string;
  aliases: string[];
  name: string;
  title: string;
  category: 'goblinoid' | 'construct' | 'undead' | 'beast' | 'void' | 'abyss' | 'boss';
  zone: 'dungeon' | 'open_world' | 'cavern' | 'world_boss';
  element: ElementType | 'physical' | 'cold' | 'holy';
  level: number;
  habitat: string;
  description: string;
  tacticalTip: string;
  icon: string;
  color: string;
  baseHp: number;
  weaknesses: MonsterWeakness[];
  resistances: string[];
  lootTable: MonsterLootDrop[];
  encountered: boolean;
  killCount: number;
  firstDefeatedAt?: string;
  lastDefeatedAt?: string;
}

const INITIAL_BESTIARY_DATA: BestiaryEntry[] = [
  {
    id: 'gob_1',
    aliases: ['gob_1', 'goblin', 'goblin_marauder'],
    name: 'Goblin Marauder',
    title: 'Scavenger of the Warrens',
    category: 'goblinoid',
    zone: 'dungeon',
    element: 'earth',
    level: 4,
    habitat: 'Goblin Warrens (Level 1)',
    description:
      'Cunning scavengers armed with notched bone blades and tripwire snare triggers. They deploy hit-and-run guerilla tactics when wounded.',
    tacticalTip: 'Vulnerable to Wind vortex pulls and sweeping blade strikes. Disarm their tripwires before engaging.',
    icon: '👺',
    color: '#10b981',
    baseHp: 750,
    weaknesses: [
      { element: 'Wind', description: 'Wind skills lift and stagger light agile goblins', multiplier: '+150%' },
      { element: 'Slash', description: 'Unarmored torso vulnerable to blade combos', multiplier: '+125%' },
    ],
    resistances: ['Earth', 'Poison'],
    lootTable: [
      { name: 'Reinforced Goblin Leather', rarity: 'common', dropChance: 85, description: 'Cured hide suitable for light armor crafting.' },
      { name: 'Sharp Flint Spike', rarity: 'common', dropChance: 70, description: 'Harvested from trap triggers.' },
      { name: 'Crude Bone Dagger', rarity: 'uncommon', dropChance: 40, description: 'Notched rogue off-hand weapon.' },
      { name: 'Chipped Emerald Gem', rarity: 'rare', dropChance: 15, description: 'Small crystalline stone pried from warren walls.' },
    ],
    encountered: true,
    killCount: 2,
  },
  {
    id: 'gob_shaman',
    aliases: ['gob_shaman', 'goblin_shaman', 'shaman'],
    name: 'Goblin Shaman (Herbalist)',
    title: 'Mushroom Sage of the Warrens',
    category: 'goblinoid',
    zone: 'dungeon',
    element: 'arcane',
    level: 5,
    habitat: 'Goblin Warrens & Undergroves',
    description:
      'Chants fungal leylines to cast explosive arcane spore volleys and brew intoxicating haste potions for fellow warren marauders.',
    tacticalTip: 'Interrupt their casting telegraph with heavy stagger or silence before their spores detonate.',
    icon: '🧙‍♂️',
    color: '#a855f7',
    baseHp: 950,
    weaknesses: [
      { element: 'Physical Heavy', description: 'Interrupts fungal casting animations', multiplier: '+160%' },
      { element: 'Void', description: 'Void penetration corrupts channeled fungal leylines', multiplier: '+140%' },
    ],
    resistances: ['Arcane', 'Nature'],
    lootTable: [
      { name: 'Rare Shaman Alchemical Herbs', rarity: 'common', dropChance: 90, description: 'Vital for brewing Greater Mana Potions.' },
      { name: 'Glowing Arcane Spore', rarity: 'uncommon', dropChance: 60, description: 'Luminescent catalyst for enchanters.' },
      { name: 'Spore-Infused Oak Staff', rarity: 'rare', dropChance: 35, description: 'Channeled wand imbued with nature essence.' },
      { name: 'Shamanic Leyline Totem', rarity: 'epic', dropChance: 12, description: 'Rare artifact granting +15 Arcane Power.' },
    ],
    encountered: true,
    killCount: 1,
  },
  {
    id: 'mimic_1',
    aliases: ['mimic_1', 'mimic', 'gilded_mimic'],
    name: 'Gilded Chest Mimic',
    title: 'Deceptive Vault Devourer',
    category: 'void',
    zone: 'dungeon',
    element: 'void',
    level: 6,
    habitat: 'Sunken Vaults & Treasure Alcoves (Level 2)',
    description:
      'Disguises itself as an ornate gilded treasure chest, waiting for greedy vanguards. It lunges with razor serrated teeth when touched.',
    tacticalTip: 'Use a Fairy Scout dust flare to expose disguised mimics before opening chests, or strike from a safe distance.',
    icon: '📦',
    color: '#eab308',
    baseHp: 1400,
    weaknesses: [
      { element: 'Fairy Scout Dust', description: 'Completely blinds and exposes disguised ambush form', multiplier: '+200%' },
      { element: 'Solar / Fire', description: 'Burns fleshy interior tongue and gum tissues', multiplier: '+150%' },
    ],
    resistances: ['Void', 'Blunt (Hardened Shell)'],
    lootTable: [
      { name: 'Pristine Gold Doubloons x50', rarity: 'common', dropChance: 95, description: 'Hoarded treasury coins from prior adventurers.' },
      { name: 'Gilded Mimic Fang', rarity: 'uncommon', dropChance: 75, description: 'Serrated ivory fang with void trace.' },
      { name: 'Stolen Adventurer Satchel', rarity: 'rare', dropChance: 50, description: 'Contains assorted potions and crafting materials.' },
      { name: 'Cursed Greed Talisman', rarity: 'epic', dropChance: 18, description: 'Increases gold gains by +20% but increases damage taken by 5%.' },
    ],
    encountered: true,
    killCount: 1,
  },
  {
    id: 'undead_1',
    aliases: ['undead_1', 'undead', 'mana_drain_revenant', 'revenant'],
    name: 'Mana-Drain Revenant',
    title: 'Wraith of the Forsaken Crypts',
    category: 'undead',
    zone: 'dungeon',
    element: 'void',
    level: 8,
    habitat: 'Forsaken Crypts & Catacombs (Level 3)',
    description:
      'Phantasmal warrior wrapped in burial shroud that passively siphons hero energy within an aura radius, fueling its umbral claws.',
    tacticalTip: 'Maintain distance to prevent mana drainage aura. Radiance and Solar Phoenix bursts scorch its ghostly frame.',
    icon: '👻',
    color: '#6366f1',
    baseHp: 1850,
    weaknesses: [
      { element: 'Solar / Radiance', description: 'Purges unholy necrotic essence', multiplier: '+175%' },
      { element: 'Fire', description: 'Incinerates ancient burial linens', multiplier: '+140%' },
    ],
    resistances: ['Void', 'Cold', 'Physical Pierce'],
    lootTable: [
      { name: 'Ethereal Revenant Shard', rarity: 'common', dropChance: 70, description: 'Cold spectral residue used in gem sockets.' },
      { name: 'Spectral Linen Weave', rarity: 'uncommon', dropChance: 60, description: 'Ghostly cloth used for Elven robe tailoring.' },
      { name: 'Vampiric Mana Drain Crystal', rarity: 'rare', dropChance: 30, description: 'Allows weapon attacks to recover +3 Energy on hit.' },
      { name: 'Soulbound Necrotic Core', rarity: 'legendary', dropChance: 8, description: 'Ancient pulsating core from the Nether Realm.' },
    ],
    encountered: false,
    killCount: 0,
  },
  {
    id: 'abom_1',
    aliases: ['abom_1', 'abomination', 'crypt_abomination'],
    name: 'Crypt Abomination',
    title: 'Flesh-Grafted Horror',
    category: 'undead',
    zone: 'dungeon',
    element: 'arcane',
    level: 10,
    habitat: 'Subterranean Flesh Pits',
    description:
      'Colossal monstrosity sewn from fallen champions. Possesses devastating sweeping cleaves and spews caustic bile pools.',
    tacticalTip: 'Roll through its wide arc telegraphs. Attack its exposed runic spine during recovery recovery windows.',
    icon: '🧟',
    color: '#15803d',
    baseHp: 2400,
    weaknesses: [
      { element: 'Fire', description: 'Detonates caustic bile sacs for massive stagger', multiplier: '+160%' },
      { element: 'Arcane Sever', description: 'Cuts necrotic stitch seams binding its limbs', multiplier: '+135%' },
    ],
    resistances: ['Earth', 'Physical Slash'],
    lootTable: [
      { name: 'Corrupted Abomination Flesh', rarity: 'common', dropChance: 80, description: 'Dense leathery hide prized by dark armorsmiths.' },
      { name: 'Abyssal Bile Flask', rarity: 'uncommon', dropChance: 50, description: 'Potent caustic reagent for weapon coating.' },
      { name: 'Runed Spine Fragment', rarity: 'rare', dropChance: 45, description: 'Reinforced spinal segment for heavy shields.' },
      { name: 'Titan\'s Malice Shard', rarity: 'epic', dropChance: 14, description: 'Grants +25 Attack Power in exchange for 5% max HP.' },
    ],
    encountered: false,
    killCount: 0,
  },
  {
    id: 'golem_colossus',
    aliases: ['golem_colossus', 'golem', 'khaz_gorgon_colossus'],
    name: 'Khaz-Gorgon Runic Colossus',
    title: 'Ancient Dwarven Forge Warden',
    category: 'construct',
    zone: 'dungeon',
    element: 'earth',
    level: 12,
    habitat: 'Forge of Khaz-Gorgon (Boss Chamber)',
    description:
      'Towering stone automaton powered by magma leylines and armored with layered dwarven alloy plates. Impervious to light slashes.',
    tacticalTip:
      'Crucial: Use Elf Wind Vortex to prime with Wind, then strike with Dwarf Tectonic Slam to trigger "Shockwave Tempest" (+350% DMG) and shatter its armor plates!',
    icon: '🗿',
    color: '#b45309',
    baseHp: 3800,
    weaknesses: [
      { element: 'Wind + Hammer Synergy', description: 'Detonates Shockwave Tempest to shatter runic plates', multiplier: '+350%' },
      { element: 'Blunt Crushing', description: 'Cracks granite joints and molten gears', multiplier: '+150%' },
    ],
    resistances: ['Physical Slashing', 'Pierce', 'Earth', 'Poison'],
    lootTable: [
      { name: 'Tempered Golem Slag Alloy x15', rarity: 'common', dropChance: 90, description: 'Dense volcanic alloy for legendary blacksmithing.' },
      { name: 'Pristine Golem Core Fragment', rarity: 'rare', dropChance: 65, description: 'Core component for forging the Prism Blade.' },
      { name: 'Runic Bastion Plating', rarity: 'epic', dropChance: 40, description: 'Ancient shield face bearing Dwarven runes.' },
      { name: 'Titan Heart of Khaz-Gorgon', rarity: 'legendary', dropChance: 15, description: 'Permanent +100 Max HP relic when consumed.' },
    ],
    encountered: true,
    killCount: 0,
  },
  {
    id: 'shadow_stalker_1',
    aliases: ['shadow_stalker_1', 'void_shadow_stalker', 'stalker'],
    name: 'Void Shadow Stalker',
    title: 'Apex Predator of the Abyss Rift',
    category: 'void',
    zone: 'open_world',
    element: 'void',
    level: 28,
    habitat: 'Aethelgard Badlands & Rift Anomalies',
    description:
      'Predatory abyssal chimera capable of shifting into dimension shadows. Pounces upon isolated travelers with blinding swiftness.',
    tacticalTip: 'Watch for the purple shadow rift before it materializes. Light and Solar Phoenix flames strip its cloaking.',
    icon: '🐾',
    color: '#831843',
    baseHp: 2200,
    weaknesses: [
      { element: 'Solar / Radiance', description: 'Prevents dimension shadow shifting', multiplier: '+180%' },
      { element: 'Arcane', description: 'Disrupts void cloaking frequency', multiplier: '+130%' },
    ],
    resistances: ['Void', 'Dark', 'Stealth'],
    lootTable: [
      { name: 'Umbral Tendril Strand', rarity: 'common', dropChance: 75, description: 'Silken void fiber for weaving stealth cloaks.' },
      { name: 'Void Essence Flask', rarity: 'uncommon', dropChance: 55, description: 'Concentrated dark matter used in soul-binding.' },
      { name: 'Shadowstalker Eye', rarity: 'rare', dropChance: 30, description: 'Provides night vision and crit rate when crafted.' },
      { name: 'Claws of the Void Stalker', rarity: 'epic', dropChance: 16, description: 'Dual rogue daggers with +18% critical strike.' },
    ],
    encountered: true,
    killCount: 1,
  },
  {
    id: 'golem_scout_1',
    aliases: ['golem_scout_1', 'ironpeak_golem_scout'],
    name: 'Ironpeak Golem Scout',
    title: 'Caldera Automated Sentinel',
    category: 'construct',
    zone: 'open_world',
    element: 'earth',
    level: 32,
    habitat: 'Ironpeak Calderas & Volcanic Slopes',
    description:
      'Automated reconnaissance construct crafted by the First Dwarven Dynasty. Still diligently patrols volcanic ridges with a molten hammer.',
    tacticalTip: 'Heavy armor deflects standard arrows. Utilize Heavy Cleave or Runic Finisher to bypass hardness rating.',
    icon: '⚙️',
    color: '#78350f',
    baseHp: 3000,
    weaknesses: [
      { element: 'Heavy Cleave / Blunt', description: 'Shatters igneous outer mantle', multiplier: '+160%' },
      { element: 'Water / Cold', description: 'Thermal shock cracks molten core', multiplier: '+150%' },
    ],
    resistances: ['Fire', 'Earth', 'Pierce'],
    lootTable: [
      { name: 'Caldera Stone Plate', rarity: 'common', dropChance: 85, description: 'Heat-resistant stone tile.' },
      { name: 'Ironpeak Magma Core', rarity: 'uncommon', dropChance: 70, description: 'Pulsing thermodynamic power unit.' },
      { name: 'Molten Brass Ingot', rarity: 'rare', dropChance: 45, description: 'Pure metallurgical metal bar.' },
      { name: 'Ancient Dwarven Clockwork Cog', rarity: 'epic', dropChance: 22, description: 'Enables advanced guild automation.' },
    ],
    encountered: true,
    killCount: 1,
  },
  {
    id: 'bloodfang_beast_1',
    aliases: ['bloodfang_beast_1', 'bloodfang_abyss_beast'],
    name: 'Bloodfang Abyss Beast',
    title: 'Feral Carnivore of the Wastes',
    category: 'beast',
    zone: 'open_world',
    element: 'physical',
    level: 30,
    habitat: 'Arid Badlands & Bone Graveyards',
    description:
      'Ferocious quadruped with blood-red crystalline fangs. Gains +50% attack frenzy when targeting wounded adventurers.',
    tacticalTip: 'Execute a timed dodge roll when it rears back for its leap strike to trigger an i-frame parry window.',
    icon: '🐺',
    color: '#3f3f46',
    baseHp: 2600,
    weaknesses: [
      { element: 'Piercing Spear / Arrows', description: 'Penetrates tendon joints during leap', multiplier: '+150%' },
      { element: 'Wind', description: 'Blows aside blood scent tracking', multiplier: '+125%' },
    ],
    resistances: ['Bleed', 'Physical Blunt'],
    lootTable: [
      { name: 'Bloodfang Canine x2', rarity: 'common', dropChance: 80, description: 'Sharp red canine used in broadhead arrows.' },
      { name: 'Abyss Beast Hide', rarity: 'uncommon', dropChance: 75, description: 'Thick pelt resilient against harsh weather.' },
      { name: 'Savage Carnivore Claw', rarity: 'rare', dropChance: 50, description: 'Used to forge lacerating gauntlets.' },
      { name: 'Frenzied Heart of the Beast', rarity: 'epic', dropChance: 18, description: 'Consumable that grants 10s of Blood Frenzy.' },
    ],
    encountered: true,
    killCount: 0,
  },
  {
    id: 'cavern_lurker_1',
    aliases: ['cavern_lurker_1', 'cavern_lurker'],
    name: 'Cavern Lurker',
    title: 'Subterranean Bioluminescent Stalker',
    category: 'beast',
    zone: 'cavern',
    element: 'arcane',
    level: 15,
    habitat: 'Subterranean Crystal Cavern Dungeon (X: -85, Z: 85)',
    description:
      'Chitinous cave dweller that crawls along stalactite ceilings, dropping silently onto spelunkers in the azure crystal depths.',
    tacticalTip: 'Listen for chitin clicks. Illuminating the cavern with torches or fairy dust forces it down into melee range.',
    icon: '🦂',
    color: '#6366f1',
    baseHp: 1350,
    weaknesses: [
      { element: 'Fire', description: 'Thermal flame burns brittle chitin antennae', multiplier: '+170%' },
      { element: 'Solar Radiance', description: 'Blinds light-sensitive bioluminescent optics', multiplier: '+140%' },
    ],
    resistances: ['Cold', 'Arcane', 'Physical Pierce'],
    lootTable: [
      { name: 'Phosphorescent Biolum Gland', rarity: 'common', dropChance: 75, description: 'Provides steady ambient blue illumination.' },
      { name: 'Subterranean Chitin Plate', rarity: 'uncommon', dropChance: 65, description: 'Lightweight subterranean armor scale.' },
      { name: 'Cavern Lurker Mandible', rarity: 'rare', dropChance: 35, description: 'Harvested dagger blade with paralytic venom.' },
      { name: 'Glowing Azure Ley-Pearl', rarity: 'epic', dropChance: 15, description: 'Deep cave pearl resonating with leyline energy.' },
    ],
    encountered: true,
    killCount: 1,
  },
  {
    id: 'magma_slime_1',
    aliases: ['magma_slime_1', 'magma_slime'],
    name: 'Magma Slime',
    title: 'Caldera Core Amorphous Entity',
    category: 'beast',
    zone: 'cavern',
    element: 'fire',
    level: 18,
    habitat: 'Subterranean Cavern & Magma Fissures',
    description:
      'Bubbling sphere of superheated molten rock. Leaves scorching trails on the cave floor and splits into mini-globules upon death.',
    tacticalTip: 'Slashing attacks can cause it to split! Use Cold spells or heavy blunt ground slams to cool and solidify its core.',
    icon: '🔥',
    color: '#f97316',
    baseHp: 1550,
    weaknesses: [
      { element: 'Cold / Ice', description: 'Instantly hardens outer magma crust into brittle obsidian', multiplier: '+200%' },
      { element: 'Water', description: 'Generates steam explosion dealing self-damage', multiplier: '+160%' },
    ],
    resistances: ['Fire', 'Slashing', 'Poison'],
    lootTable: [
      { name: 'Sticky Brimstone Gel', rarity: 'common', dropChance: 85, description: 'Flammable crafting gel for torches and fire bombs.' },
      { name: 'Molten Magma Slime Core', rarity: 'uncommon', dropChance: 70, description: 'Pulsing fiery core that never cools down.' },
      { name: 'Caldera Cinder Nugget', rarity: 'rare', dropChance: 40, description: 'Used to forge fire-enchanted weaponry.' },
      { name: 'Primordial Ember Heart', rarity: 'epic', dropChance: 16, description: 'Permanent +10% Fire Damage when socketed.' },
    ],
    encountered: true,
    killCount: 1,
  },
  {
    id: 'cavern_golem_1',
    aliases: ['cavern_golem_1', 'corrupted_cavern_golem'],
    name: 'Corrupted Cavern Golem',
    title: 'Warden of the Sunken Leyline Arch',
    category: 'construct',
    zone: 'cavern',
    element: 'earth',
    level: 25,
    habitat: 'Subterranean Cavern Dungeon Center',
    description:
      'Monolithic granite warden corrupted by leaking void leylines. Swings colossal boulder fists that cause cavern cave-in shockwaves.',
    tacticalTip:
      'When it raises both fists, roll behind its back! Wind vortex pulls expose the void fissure in its granite spine.',
    icon: '🗿',
    color: '#d97706',
    baseHp: 2900,
    weaknesses: [
      { element: 'Wind + Hammer Synergy', description: 'Detonates Shockwave Tempest to crumble stone fists', multiplier: '+300%' },
      { element: 'Solar Radiance', description: 'Purifies the corrupting void core', multiplier: '+150%' },
    ],
    resistances: ['Earth', 'Physical Slash', 'Void'],
    lootTable: [
      { name: 'Stalactite Armor Fragment x4', rarity: 'common', dropChance: 85, description: 'Dense mineral plates from the deep cave.' },
      { name: 'Corrupted Leyline Crystal', rarity: 'uncommon', dropChance: 75, description: 'Resonates with dark subterranean power.' },
      { name: 'Cavern Core of Ruin', rarity: 'rare', dropChance: 40, description: 'Used in forging high-tier vanguard gear.' },
      { name: 'Subterranean Keystone', rarity: 'legendary', dropChance: 12, description: 'Unlocks deeper abyssal cavern gates.' },
    ],
    encountered: true,
    killCount: 1,
  },
  {
    id: 'abyss_titan',
    aliases: ['abyss_titan', 'titan', 'abyss_void_titan'],
    name: 'Abyss Void Titan',
    title: 'Continental Calamity • World Boss',
    category: 'boss',
    zone: 'world_boss',
    element: 'void',
    level: 60,
    habitat: 'Continental Center Rift (Aethelgard Badlands)',
    description:
      'A cataclysmic cosmic colossus awakened from the planet core. Commands abyssal storm surges and unleashes continental extinction beams.',
    tacticalTip:
      'Coordinate with fellow Hunters! Rotate synergy combos (Wind into Tectonic Slam), execute Runic Finishers, and dodge before its 15-minute enrage weather-shift triggers.',
    icon: '👑',
    color: '#701a75',
    baseHp: 125000,
    weaknesses: [
      { element: 'Runic Finisher', description: 'Deals massive apocalyptic true damage directly to core', multiplier: '+250%' },
      { element: 'Cross-Hero Synergy', description: 'Chaining 3+ distinct elements overloads titan barrier', multiplier: '+300%' },
      { element: 'Solar Radiance', description: 'Counters abyssal dark void shielding', multiplier: '+160%' },
    ],
    resistances: ['Void', 'All CC / Stuns', 'Earth', 'Cold'],
    lootTable: [
      { name: 'Calamity World Core', rarity: 'legendary', dropChance: 100, description: 'Heart of the fallen titan. The ultimate crafting relic.' },
      { name: 'Primordial Star Metal x5', rarity: 'epic', dropChance: 90, description: 'Extraterrestrial metal from the stellar rift.' },
      { name: 'Crown of the Void Sovereign', rarity: 'legendary', dropChance: 35, description: 'Bestows the "Shadow Monarch" passive title.' },
      { name: 'Astral Rift Key', rarity: 'legendary', dropChance: 100, description: 'Grants access to celestial raid dungeons.' },
    ],
    encountered: true,
    killCount: 0,
  },
];

const STORAGE_KEY = 'aethelgard_bestiary';

class BestiaryService {
  private entries: BestiaryEntry[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedMap: Record<string, Partial<BestiaryEntry>> = JSON.parse(saved);
        this.entries = INITIAL_BESTIARY_DATA.map((initial) => {
          const userState = parsedMap[initial.id];
          if (userState) {
            return {
              ...initial,
              encountered: userState.encountered ?? initial.encountered,
              killCount: userState.killCount ?? initial.killCount,
              firstDefeatedAt: userState.firstDefeatedAt ?? initial.firstDefeatedAt,
              lastDefeatedAt: userState.lastDefeatedAt ?? initial.lastDefeatedAt,
            };
          }
          return initial;
        });
        return;
      }
    } catch (e) {
      console.warn('Failed to load bestiary from storage, using initial data', e);
    }
    this.entries = [...INITIAL_BESTIARY_DATA];
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      const saveObject: Record<string, { encountered: boolean; killCount: number; firstDefeatedAt?: string; lastDefeatedAt?: string }> = {};
      this.entries.forEach((e) => {
        saveObject[e.id] = {
          encountered: e.encountered,
          killCount: e.killCount,
          firstDefeatedAt: e.firstDefeatedAt,
          lastDefeatedAt: e.lastDefeatedAt,
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveObject));
    } catch (e) {
      console.warn('Failed to save bestiary to storage', e);
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aethelgard:bestiary:updated'));
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public getAll(): BestiaryEntry[] {
    return [...this.entries];
  }

  public getByIdOrAlias(idOrAlias: string): BestiaryEntry | undefined {
    const clean = idOrAlias.toLowerCase().trim();
    return this.entries.find((e) => e.id.toLowerCase() === clean || e.aliases.some((a) => a.toLowerCase() === clean));
  }

  public recordEncounter(idOrAlias: string): BestiaryEntry | null {
    const entry = this.getByIdOrAlias(idOrAlias);
    if (!entry) return null;

    if (!entry.encountered) {
      entry.encountered = true;
      this.saveToStorage();
      this.notify();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('aethelgard:bestiary:new_encounter', {
            detail: { entry },
          })
        );
      }
    }
    return entry;
  }

  public recordDefeat(idOrAlias: string): BestiaryEntry | null {
    const entry = this.getByIdOrAlias(idOrAlias);
    if (!entry) return null;

    const now = new Date().toISOString();
    const isFirstKill = entry.killCount === 0;

    entry.encountered = true;
    entry.killCount += 1;
    if (isFirstKill) {
      entry.firstDefeatedAt = now;
    }
    entry.lastDefeatedAt = now;

    this.saveToStorage();
    this.notify();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('aethelgard:bestiary:defeated', {
          detail: { entry, isFirstKill },
        })
      );
    }

    return entry;
  }

  public getStats() {
    const totalMonsters = this.entries.length;
    const discoveredCount = this.entries.filter((e) => e.encountered).length;
    const defeatedCount = this.entries.filter((e) => e.killCount > 0).length;
    const totalKills = this.entries.reduce((acc, curr) => acc + curr.killCount, 0);

    return {
      totalMonsters,
      discoveredCount,
      defeatedCount,
      totalKills,
      completionRate: Math.round((discoveredCount / totalMonsters) * 100),
    };
  }

  public resetToDefault() {
    this.entries = [...INITIAL_BESTIARY_DATA];
    this.saveToStorage();
    this.notify();
  }
}

export const bestiaryService = new BestiaryService();

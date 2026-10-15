import { SafeZoneState, TeleportationArray, NPCProfile, HiddenQuest } from '../types/game';

export const INITIAL_SAFE_ZONE_STATE: SafeZoneState = {
  bIsInSafeZone: true,
  locationName: 'Citadel of Oakhaven (Safe-Zone)',
  infamyPoints: 0,
  bountyTokenValue: 120,
  isRestingInInn: false,
  wellRestedExpMultiplierActive: true,
  wellRestedTimerSeconds: 1800,
  exhaustedSleeperTimer: 0,
  isSleepingInWilderness: false,
};

export const INITIAL_TELEPORTATION_ARRAY: TeleportationArray = {
  isActivated: true,
  socketedRunes: ['Rune of Ironpeak Magma', 'Rune of Whispering Wood'],
  requiredRunes: ['Rune of Ironpeak Magma', 'Rune of Whispering Wood', 'Rune of the Golem Core', 'Rune of the Sunken Crypt'],
  tier2Unlocked: true,
};

export const OAKHAVEN_NPCS: NPCProfile[] = [
  {
    id: 'npc_broman',
    name: 'Broman Ironfist',
    role: 'Grand Dwarven Forge Master',
    location: 'Oakhaven Artisan Bazaar',
    avatar: '🔨',
    voicePitch: 0.8,
    greeting: 'Hah! Welcome to the Great Hearth, adventurer. Bring me golem alloy plates and mana crystals, and I will temper your steel with runes that can split a mountain!',
    memory: {
      reputation: 75,
      pastTransactions: 5,
      unlockedHiddenQuests: ['quest_golem_alloy'],
    },
    dialogueTree: {
      start: {
        response: 'What needs forging today? We have got the mobile furnace burning hot!',
        options: [
          { text: 'Tell me about Dwarven Forge Mastery.', intent: 'lore' },
          { text: 'I have got golem armor scrap for tempering.', intent: 'bargain' },
          { text: 'How do you crack a Stone Golem’s defenses?', intent: 'lore' },
        ],
      },
    },
  },
  {
    id: 'npc_lyra',
    name: 'Arch-Mage Lyra Windwhisper',
    role: 'High Elven Arcane Weaver',
    location: 'Silverleaf Pavilion',
    avatar: '🧝‍♀️',
    voicePitch: 1.2,
    greeting: 'May the starlight guide your path. The wild beasts and goblins leave behind potent conduits—fairy dust, spirit wood, and enchanted pelts. Together we can weave them into relics of tremendous power.',
    memory: {
      reputation: 80,
      pastTransactions: 4,
      unlockedHiddenQuests: ['quest_fairy_grove'],
    },
    dialogueTree: {
      start: {
        response: 'The leylines are singing. How may the Elven Weavers assist your party?',
        options: [
          { text: 'Show me the Arcane Weaving recipes.', intent: 'bargain' },
          { text: 'How does Wind Synergy amplify Dwarf ground slams?', intent: 'lore' },
        ],
      },
    },
  },
  {
    id: 'npc_grim',
    name: 'Grimm the Treasure Hound',
    role: 'Guild Quartermaster & Vault Keeper',
    location: 'Oakhaven Guild Estates',
    avatar: '🏰',
    voicePitch: 0.9,
    greeting: 'Welcome to your Guild Estate, Guildmaster. Our private hearth and shared vault stand ready. Pool your materials here to unlock Tier upgrades!',
    memory: {
      reputation: 90,
      pastTransactions: 12,
      unlockedHiddenQuests: [],
    },
    dialogueTree: {
      start: {
        response: 'Our treasury is stocked, and the hearth is warm. Would you like to check the vault or inspect the charter perks?',
        options: [
          { text: 'Open the Guild Vault & Shared Storage.', intent: 'bargain' },
          { text: 'Explain the Guild Ranking Tiers & Perks.', intent: 'lore' },
        ],
      },
    },
  },
];

export const HIDDEN_QUESTS: HiddenQuest[] = [
  {
    id: 'quest_golem_alloy',
    title: 'The Golem Vault Infiltration',
    hint: 'Shatter 3 Golem armor plates using Thorgar’s hammer in Dungeon Sub-Level 2.',
    unlocked: true,
    completed: false,
    rewardStardust: 2500,
    rewardRune: 'Rune of the Golem Core',
  },
  {
    id: 'quest_fairy_grove',
    title: 'Unmasking the Shaman Trap-Weavers',
    hint: 'Disarm 2 Goblin tripwires and detect a hidden Mimic chest using fairy perception.',
    unlocked: true,
    completed: false,
    rewardStardust: 3000,
  },
];

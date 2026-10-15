import { PlayerItem } from '../types/inventory.types';
import {
  EnhancementTierConfig,
  EnhancementResult,
} from '../types/enhancement.types';

// Generate balanced escalating configs from +0 to +20
export const DEFAULT_ENHANCEMENT_CONFIGS: EnhancementTierConfig[] = [
  {
    level: 0, // +0 -> +1
    successRate: 0.95,
    cost: { gold: 1000, materialId: 'manaCrystals', materialName: 'Mana Crystals', materialQuantity: 2 },
    statMultiplierBonus: 0.10,
    canDowngradeOnFail: false,
    canBreakOnFail: false,
  },
  {
    level: 1, // +1 -> +2
    successRate: 0.90,
    cost: { gold: 2000, materialId: 'manaCrystals', materialName: 'Mana Crystals', materialQuantity: 4 },
    statMultiplierBonus: 0.10,
    canDowngradeOnFail: false,
    canBreakOnFail: false,
  },
  {
    level: 2, // +2 -> +3
    successRate: 0.85,
    cost: { gold: 3500, materialId: 'golemAlloy', materialName: 'Golem Alloy', materialQuantity: 3 },
    statMultiplierBonus: 0.10,
    canDowngradeOnFail: false,
    canBreakOnFail: false,
  },
  {
    level: 3, // +3 -> +4
    successRate: 0.80,
    cost: { gold: 5000, materialId: 'golemAlloy', materialName: 'Golem Alloy', materialQuantity: 5 },
    statMultiplierBonus: 0.10,
    canDowngradeOnFail: false,
    canBreakOnFail: false,
  },
  {
    level: 4, // +4 -> +5
    successRate: 0.70,
    cost: { gold: 7500, materialId: 'riftShards', materialName: 'Rift Shards', materialQuantity: 4 },
    statMultiplierBonus: 0.12,
    canDowngradeOnFail: false,
    canBreakOnFail: false,
  },
  {
    level: 5, // +5 -> +6 (Riskier tier with downgrade on fail)
    successRate: 0.60,
    cost: { gold: 11000, materialId: 'riftShards', materialName: 'Rift Shards', materialQuantity: 6 },
    statMultiplierBonus: 0.12,
    canDowngradeOnFail: true,
    canBreakOnFail: false,
  },
  {
    level: 6, // +6 -> +7
    successRate: 0.50,
    cost: { gold: 15000, materialId: 'riftShards', materialName: 'Rift Shards', materialQuantity: 8 },
    statMultiplierBonus: 0.14,
    canDowngradeOnFail: true,
    canBreakOnFail: false,
  },
  {
    level: 7, // +7 -> +8
    successRate: 0.40,
    cost: { gold: 20000, materialId: 'astralPrisms', materialName: 'Astral Prisms', materialQuantity: 5 },
    statMultiplierBonus: 0.14,
    canDowngradeOnFail: true,
    canBreakOnFail: false,
  },
  {
    level: 8, // +8 -> +9
    successRate: 0.35,
    cost: { gold: 28000, materialId: 'astralPrisms', materialName: 'Astral Prisms', materialQuantity: 8 },
    statMultiplierBonus: 0.15,
    canDowngradeOnFail: true,
    canBreakOnFail: false,
  },
  {
    level: 9, // +9 -> +10 (Milestone tier)
    successRate: 0.25,
    cost: { gold: 40000, materialId: 'astralPrisms', materialName: 'Astral Prisms', materialQuantity: 12 },
    statMultiplierBonus: 0.20,
    canDowngradeOnFail: true,
    canBreakOnFail: false,
  },
  // +10 through +20 (Abyss-tier enhancements)
  ...Array.from({ length: 10 }, (_, i) => {
    const lvl = 10 + i;
    const rate = Math.max(0.08, Number((0.22 - i * 0.015).toFixed(2)));
    return {
      level: lvl,
      successRate: rate,
      cost: {
        gold: 50000 + i * 15000,
        materialId: 'astralPrisms',
        materialName: 'Astral Prisms',
        materialQuantity: 15 + i * 3,
      },
      statMultiplierBonus: 0.22,
      canDowngradeOnFail: true,
      canBreakOnFail: false,
    };
  }),
];

export class ItemEnhancementSystem {
  // Config table mapping enhancement level -> rules and costs
  private upgradeConfigs: Map<number, EnhancementTierConfig> = new Map();

  constructor(configs: EnhancementTierConfig[] = DEFAULT_ENHANCEMENT_CONFIGS) {
    configs.forEach((cfg) => this.upgradeConfigs.set(cfg.level, cfg));
  }

  // Get upgrade configuration for an item's current level
  public getConfig(currentLevel: number): EnhancementTierConfig | undefined {
    return this.upgradeConfigs.get(currentLevel);
  }

  // Check player's currency and inventory check
  public checkPlayerResources(
    playerGold: number,
    playerMaterials: Map<string, number> | Record<string, number>,
    cost: { gold: number; materialId: string; materialQuantity: number }
  ): boolean {
    const currentMats =
      playerMaterials instanceof Map
        ? playerMaterials.get(cost.materialId) || 0
        : (playerMaterials as Record<string, number>)[cost.materialId] || 0;

    return playerGold >= cost.gold && currentMats >= cost.materialQuantity;
  }

  public attemptUpgrade(
    playerItem: PlayerItem,
    playerGold: number,
    playerMaterials: Map<string, number> | Record<string, number>
  ): {
    result: EnhancementResult;
    updatedGold: number;
    updatedMaterials: Map<string, number>;
  } {
    const currentLevel = playerItem.enhancementLevel;
    const config = this.upgradeConfigs.get(currentLevel);

    // Convert playerMaterials to Map for uniform mutation
    const matsMap =
      playerMaterials instanceof Map
        ? new Map(playerMaterials)
        : new Map(Object.entries(playerMaterials));

    if (!config) {
      return {
        result: {
          success: false,
          newLevel: currentLevel,
          message: `Item has achieved maximum enhancement transcendence (+${currentLevel})!`,
          consumedGold: 0,
          consumedMaterials: { materialId: '', quantity: 0 },
        },
        updatedGold: playerGold,
        updatedMaterials: matsMap,
      };
    }

    // 1. Check if player has enough gold and materials
    const hasEnoughResources = this.checkPlayerResources(playerGold, matsMap, config.cost);
    if (!hasEnoughResources) {
      const matName = config.cost.materialName || config.cost.materialId;
      return {
        result: {
          success: false,
          newLevel: currentLevel,
          message: `Insufficient resources for enhancement! Requires ${config.cost.gold.toLocaleString()} Gold and ${config.cost.materialQuantity}x ${matName}.`,
          consumedGold: 0,
          consumedMaterials: { materialId: config.cost.materialId, quantity: 0 },
        },
        updatedGold: playerGold,
        updatedMaterials: matsMap,
      };
    }

    // 2. Deduct resources immediately (costs are consumed regardless of outcome)
    const newGold = playerGold - config.cost.gold;
    const currentMatCount = matsMap.get(config.cost.materialId) || 0;
    matsMap.set(config.cost.materialId, currentMatCount - config.cost.materialQuantity);

    // 3. Roll for success using random probability check (0.0 to 1.0)
    const roll = Math.random();
    const isSuccess = roll < config.successRate;

    if (isSuccess) {
      playerItem.enhancementLevel += 1;
      return {
        result: {
          success: true,
          newLevel: playerItem.enhancementLevel,
          message: `⚡ FORGE SUCCESS! Gear enhanced to +${playerItem.enhancementLevel}! (+${Math.round(config.statMultiplierBonus * 100)}% Stat Multiplier Boost)`,
          consumedGold: config.cost.gold,
          consumedMaterials: {
            materialId: config.cost.materialId,
            quantity: config.cost.materialQuantity,
          },
        },
        updatedGold: newGold,
        updatedMaterials: matsMap,
      };
    } else {
      // Failure branch
      let isCriticalFailure = false;
      let failureMessage = `⚠️ Enhancement failed! Item remains at +${currentLevel} (${Math.round(config.successRate * 100)}% success chance).`;

      if (config.canDowngradeOnFail && playerItem.enhancementLevel > 0) {
        playerItem.enhancementLevel -= 1;
        isCriticalFailure = true;
        failureMessage = `💥 CRITICAL SHOCKWAVE! Forge unstable: item downgraded to +${playerItem.enhancementLevel}.`;
      }

      return {
        result: {
          success: false,
          newLevel: playerItem.enhancementLevel,
          message: failureMessage,
          consumedGold: config.cost.gold,
          consumedMaterials: {
            materialId: config.cost.materialId,
            quantity: config.cost.materialQuantity,
          },
          isCriticalFailure,
        },
        updatedGold: newGold,
        updatedMaterials: matsMap,
      };
    }
  }
}

export const globalEnhancementSystem = new ItemEnhancementSystem();

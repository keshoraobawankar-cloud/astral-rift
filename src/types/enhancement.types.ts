// ============================================================================
// ITEM ENHANCEMENT TYPES & INTERFACES
// Escalating Material Costs, Diminishing Success Probabilities (+0 to +20)
// ============================================================================

export interface EnhancementCost {
  gold: number;
  materialId: string;
  materialName?: string;
  materialQuantity: number;
}

export interface EnhancementTierConfig {
  level: number; // upgrading FROM this level (0 means +0 to +1)
  successRate: number; // e.g., 0.95 for 95%, 0.15 for 15%
  cost: EnhancementCost;
  statMultiplierBonus: number; // Percentage increase added per level (e.g., 0.10 = +10%)
  canDowngradeOnFail: boolean; // Risk of losing a level on failure
  canBreakOnFail: boolean; // Optional hardcore breaking mechanic
}

export interface EnhancementResult {
  success: boolean;
  newLevel: number;
  message: string;
  consumedGold: number;
  consumedMaterials: { materialId: string; quantity: number };
  isCriticalFailure?: boolean;
}

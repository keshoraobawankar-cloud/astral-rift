// ============================================================================
// ASYMPTOTIC RPG DAMAGE ENGINE
// Base Output + Asymptotic Defense Mitigation + Multiplicative Scaling
// ============================================================================

import { ElementType, ComboEffect } from './elementalComboSystem';

export interface Attacker {
  strength: number;
  skillBaseDamage: number;
  critRate: number; // 0 to 1 (e.g. 0.25 for 25%)
  critMultiplier: number; // e.g. 1.5 or 2.0
  strengthScalingFactor?: number; // default: 1.5
  agilityBonus?: number;
  perceptionCritBonus?: number;
}

export interface Defender {
  defense: number;
  elementalResistances?: Map<string, number> | Record<string, number>;
  armorPlates?: {
    currentArmor: number;
    maxArmor: number;
    isBroken: boolean;
  };
}

export interface DamageCalculationResult {
  finalDamage: number;
  basePower: number;
  mitigationMultiplier: number;
  elementalMultiplier: number;
  isCrit: boolean;
  critMultiplier: number;
  isComboReaction: boolean;
  comboEffect?: ComboEffect;
  summary: string;
}

/**
 * Calculates balanced RPG damage using the asymptotic defense mitigation formula:
 * Final Damage = (Base Power * [Constant / (Constant + Defense)]) * Elemental Multiplier * Critical Multiplier
 */
export function calculateRPGDamage(
  attacker: Attacker,
  defender: Defender,
  attackElement: string = 'Neutral',
  isComboReaction: boolean = false,
  comboMultiplier: number = 2.0
): number {
  const result = calculateDetailedRPGDamage(
    attacker,
    defender,
    attackElement,
    isComboReaction,
    comboMultiplier
  );
  return result.finalDamage;
}

/**
 * Detailed breakdown of the damage calculation for combat combat logs and HUD floating text
 */
export function calculateDetailedRPGDamage(
  attacker: Attacker,
  defender: Defender,
  attackElement: string = 'Neutral',
  isComboReaction: boolean = false,
  comboMultiplier: number = 2.0,
  comboEffect?: ComboEffect
): DamageCalculationResult {
  // 1. Calculate Base Power from Strength & Perception scaling
  const scalingFactor = attacker.strengthScalingFactor ?? 1.5;
  const basePower = attacker.skillBaseDamage + attacker.strength * scalingFactor;

  // 2. Calculate Asymptotic Defense Mitigation (Constant = 100)
  // Armor plates reduce effective defense when broken
  const effectiveDefense =
    defender.armorPlates && defender.armorPlates.isBroken
      ? Math.max(0, defender.defense * 0.4)
      : defender.defense;

  const defenseConstant = 100;
  const defenseMitigation = defenseConstant / (defenseConstant + effectiveDefense);

  // 3. Determine Elemental Multiplier
  let elementalMultiplier = 1.0;
  if (isComboReaction) {
    elementalMultiplier = comboMultiplier || 2.0; // Multiplier for cross-character combo reaction
  } else if (defender.elementalResistances) {
    if (defender.elementalResistances instanceof Map) {
      if (defender.elementalResistances.has(attackElement)) {
        elementalMultiplier = defender.elementalResistances.get(attackElement)!;
      }
    } else if (typeof defender.elementalResistances === 'object') {
      const resist = (defender.elementalResistances as Record<string, number>)[attackElement];
      if (typeof resist === 'number') {
        elementalMultiplier = resist;
      }
    }
  }

  // 4. Calculate Critical Hit Roll
  const effectiveCritRate = Math.min(1.0, attacker.critRate + (attacker.perceptionCritBonus || 0));
  const isCrit = Math.random() < effectiveCritRate;
  const critMultiplier = isCrit ? attacker.critMultiplier : 1.0;

  // 5. Final Damage Calculation (Floored to whole numbers, guarantee minimum 1)
  const rawDamage = basePower * defenseMitigation * elementalMultiplier * critMultiplier;
  const bonusFlatDamage = isComboReaction && comboEffect ? comboEffect.bonusDamage : 0;
  const finalDamage = Math.max(1, Math.floor(rawDamage + bonusFlatDamage));

  const summary = `Base: ${Math.round(basePower)} | Mit: ${(defenseMitigation * 100).toFixed(0)}% | Elem: ${elementalMultiplier}x | Crit: ${isCrit ? `${critMultiplier}x` : 'No'} -> ${finalDamage} DMG`;

  return {
    finalDamage,
    basePower,
    mitigationMultiplier: defenseMitigation,
    elementalMultiplier,
    isCrit,
    critMultiplier,
    isComboReaction,
    comboEffect,
    summary,
  };
}

// ============================================================================
// CROSS-CHARACTER COMBO REACTION SYSTEM
// Element-Priming Mechanics (Genshin Impact / Aethelgard Online Architecture)
// ============================================================================

export type ElementType =
  | 'Wind'
  | 'Earth'
  | 'Fire'
  | 'Water'
  | 'Ice'
  | 'Lightning'
  | 'Dark'
  | 'Light';

export interface ActiveStatus {
  element: ElementType;
  appliedAt: number;
  expiresAt: number; // Timestamp in ms
  durationMs: number;
}

export interface ComboEffect {
  name: string;
  subTitle: string;
  multiplier: number;
  bonusDamage: number;
  stagger: boolean;
  armorBreak: boolean;
  freezeDurationMs?: number;
  color: string;
  reactionType: 'stagger_aoe' | 'melt' | 'superconduct' | 'vaporize' | 'freeze' | 'annihilation' | 'swirl';
}

export interface SkillExecutionResult {
  status: 'COMBO_TRIGGERED' | 'PRIMED' | 'REFRESHED';
  primedElement?: ElementType;
  attackingElement: ElementType;
  comboName?: string;
  effect?: ComboEffect;
  message: string;
  bonusDamageMultiplier: number;
  targetId: string;
}

/**
 * CombatTarget tracks active status tags with expiration timestamps.
 * Cleans up expired statuses before evaluation to avoid stale combo triggers.
 */
export class CombatTarget {
  id: string;
  statuses: Map<ElementType, ActiveStatus> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  // Apply an elemental status tag to the target (e.g., 'Wind')
  applyStatus(element: ElementType, durationMs: number = 3500): ActiveStatus {
    const now = Date.now();
    const expiresAt = now + durationMs;
    const status: ActiveStatus = {
      element,
      appliedAt: now,
      expiresAt,
      durationMs,
    };
    this.statuses.set(element, status);
    return status;
  }

  // Check if an element status is currently active and not expired
  hasStatus(element: ElementType): boolean {
    this.cleanExpiredStatuses();
    return this.statuses.has(element);
  }

  // Get remaining time in seconds for active status
  getRemainingSeconds(element: ElementType): number {
    const status = this.statuses.get(element);
    if (!status) return 0;
    const remaining = Math.max(0, status.expiresAt - Date.now());
    return Number((remaining / 1000).toFixed(1));
  }

  // List all current active statuses
  getActiveStatuses(): ActiveStatus[] {
    this.cleanExpiredStatuses();
    return Array.from(this.statuses.values());
  }

  // Clean up expired statuses gracefully to prevent stale state
  cleanExpiredStatuses(): ElementType[] {
    const now = Date.now();
    const expired: ElementType[] = [];
    for (const [element, status] of this.statuses.entries()) {
      if (status.expiresAt <= now) {
        this.statuses.delete(element);
        expired.push(element);
      }
    }
    return expired;
  }

  // Clear all status tags (e.g. on respawn or cleanse)
  clearAll() {
    this.statuses.clear();
  }
}

/**
 * ComboSystem registry matching prime element + trigger element to combo effects
 */
export class ComboSystem {
  // Registry: [PrimeElement, TriggerElement] -> ComboEffect details
  private comboRegistry: Map<string, ComboEffect> = new Map([
    [
      'Wind-Earth',
      {
        name: 'Dust Tempest',
        subTitle: 'Massive AoE Stagger & Kinetic Implosion',
        multiplier: 4.5,
        bonusDamage: 850,
        stagger: true,
        armorBreak: true,
        color: '#f59e0b',
        reactionType: 'stagger_aoe',
      },
    ],
    [
      'Earth-Wind',
      {
        name: 'Sandstorm Vortex',
        subTitle: 'Vortex Pull & Armor Fracture',
        multiplier: 3.8,
        bonusDamage: 720,
        stagger: true,
        armorBreak: true,
        color: '#eab308',
        reactionType: 'swirl',
      },
    ],
    [
      'Fire-Ice',
      {
        name: 'Thermal Shock',
        subTitle: 'Melt Burst / Complete Armor Break',
        multiplier: 3.5,
        bonusDamage: 900,
        stagger: true,
        armorBreak: true,
        color: '#ef4444',
        reactionType: 'melt',
      },
    ],
    [
      'Ice-Fire',
      {
        name: 'Pyretic Thaw',
        subTitle: 'Explosive Flash Vapor / Crit Surge',
        multiplier: 3.8,
        bonusDamage: 960,
        stagger: true,
        armorBreak: true,
        color: '#f97316',
        reactionType: 'melt',
      },
    ],
    [
      'Water-Lightning',
      {
        name: 'Superconduct',
        subTitle: 'Chain Electro Discharge & Defense Down -40%',
        multiplier: 3.2,
        bonusDamage: 650,
        stagger: true,
        armorBreak: true,
        color: '#8b5cf6',
        reactionType: 'superconduct',
      },
    ],
    [
      'Lightning-Water',
      {
        name: 'Electro-Charged Wave',
        subTitle: 'Continuous Paralyzing Shockwave',
        multiplier: 3.0,
        bonusDamage: 620,
        stagger: true,
        armorBreak: false,
        color: '#06b6d4',
        reactionType: 'superconduct',
      },
    ],
    [
      'Wind-Fire',
      {
        name: 'Inferno Firestorm',
        subTitle: 'Spreading Pyro Vortex Blast',
        multiplier: 3.6,
        bonusDamage: 800,
        stagger: false,
        armorBreak: false,
        color: '#ff4500',
        reactionType: 'swirl',
      },
    ],
    [
      'Water-Ice',
      {
        name: 'Absolute Zero',
        subTitle: 'Deep Freeze Lock & Shatter Vulnerability',
        multiplier: 2.8,
        bonusDamage: 550,
        stagger: true,
        armorBreak: false,
        freezeDurationMs: 2500,
        color: '#38bdf8',
        reactionType: 'freeze',
      },
    ],
    [
      'Fire-Water',
      {
        name: 'Vaporize Burst',
        subTitle: 'Superheated Steam Concussion',
        multiplier: 3.0,
        bonusDamage: 700,
        stagger: true,
        armorBreak: false,
        color: '#3b82f6',
        reactionType: 'vaporize',
      },
    ],
    [
      'Dark-Light',
      {
        name: 'Eclipse Annihilation',
        subTitle: 'S-Rank Singularity / True Critical Cataclysm',
        multiplier: 5.0,
        bonusDamage: 1400,
        stagger: true,
        armorBreak: true,
        color: '#a855f7',
        reactionType: 'annihilation',
      },
    ],
    [
      'Light-Dark',
      {
        name: 'Astral Twilight',
        subTitle: 'Cosmic Collapse & Essence Overload',
        multiplier: 4.8,
        bonusDamage: 1300,
        stagger: true,
        armorBreak: true,
        color: '#e0e7ff',
        reactionType: 'annihilation',
      },
    ],
  ]);

  /**
   * Executes a skill against a target with elemental priming logic
   */
  public executeSkill(
    target: CombatTarget,
    attackingElement: ElementType,
    primeDurationMs: number = 3500
  ): SkillExecutionResult {
    // 1. Clean up any expired statuses first
    target.cleanExpiredStatuses();

    // 2. Check if the target has an existing status that reacts with the incoming element
    for (const [primedElement] of target.statuses.entries()) {
      if (primedElement === attackingElement) {
        // Same element refreshes duration
        target.applyStatus(attackingElement, primeDurationMs);
        return {
          status: 'REFRESHED',
          primedElement: attackingElement,
          attackingElement,
          message: `${attackingElement} resonance refreshed on target.`,
          bonusDamageMultiplier: 1.1,
          targetId: target.id,
        };
      }

      const comboKey = `${primedElement}-${attackingElement}`;
      if (this.comboRegistry.has(comboKey)) {
        const comboEffect = this.comboRegistry.get(comboKey)!;

        // Consume the primed status tag so it cannot be spammed infinitely
        target.statuses.delete(primedElement);

        return {
          status: 'COMBO_TRIGGERED',
          primedElement,
          attackingElement,
          comboName: comboEffect.name,
          effect: comboEffect,
          message: `⚡ SUCCESS COMBO! [${primedElement} + ${attackingElement}] triggered -> ${comboEffect.name}! (${comboEffect.subTitle})`,
          bonusDamageMultiplier: comboEffect.multiplier,
          targetId: target.id,
        };
      }
    }

    // 3. No existing combo match; apply this element as the active primer status
    target.applyStatus(attackingElement, primeDurationMs);

    return {
      status: 'PRIMED',
      primedElement: attackingElement,
      attackingElement,
      message: `Hit registered with ${attackingElement}. Target primed for reaction!`,
      bonusDamageMultiplier: 1.0,
      targetId: target.id,
    };
  }

  /**
   * Look up potential combo trigger pairs for a given primed element
   */
  public getPotentialCombos(primedElement: ElementType): { triggerElement: ElementType; effect: ComboEffect }[] {
    const results: { triggerElement: ElementType; effect: ComboEffect }[] = [];
    for (const [key, effect] of this.comboRegistry.entries()) {
      const [prime, trigger] = key.split('-') as [ElementType, ElementType];
      if (prime === primedElement) {
        results.push({ triggerElement: trigger, effect });
      }
    }
    return results;
  }
}

// Global singleton instance for easy cross-component use
export const globalComboSystem = new ComboSystem();

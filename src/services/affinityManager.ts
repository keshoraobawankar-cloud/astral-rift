import {
  AffinityTier,
  RelationshipTierInfo,
  NPCRelationshipRecord,
  AffinityEventType,
  AffinityEventLog,
} from '../types/affinity';

/**
 * Mapping function that categorizes numerical affinity/relationship scores
 * into descriptive qualitative tiers to influence LLM prompts & NPC roleplay.
 */
export function getAffinityTier(score: number): RelationshipTierInfo {
  const clamped = Math.max(-100, Math.min(100, score));

  if (clamped >= 75) {
    return {
      tier: 'Devoted',
      label: 'Devoted / Loyal (Deep Bond)',
      description: 'Deep trust, heartfelt warmth, willing to sacrifice, grants rare trade discounts and secret lore.',
      minScore: 75,
      maxScore: 100,
      color: 'text-purple-400',
      bgColor: 'bg-purple-950/60',
      borderColor: 'border-purple-500/50',
      glowColor: 'shadow-purple-500/30',
      dialoguePrefix: '[Affectionate & Loyal]',
      tone: 'Deeply respectful, warm, collaborative, shares intimate secrets and sacred relics.',
      priceMultiplier: 0.8, // 20% discount
      tradePerk: '20% Stardust Discount & Masterwork Blueprint Access',
    };
  }

  if (clamped >= 25) {
    return {
      tier: 'Friendly',
      label: 'Friendly / Ally (Trusted Companion)',
      description: 'Helpful, conversational, cooperative, and eager to assist your expedition.',
      minScore: 25,
      maxScore: 74,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-950/60',
      borderColor: 'border-cyan-500/50',
      glowColor: 'shadow-cyan-500/30',
      dialoguePrefix: '[Warm & Cooperative]',
      tone: 'Conversational, welcoming, provides helpful tips and standard guild support.',
      priceMultiplier: 0.9, // 10% discount
      tradePerk: '10% Stardust Discount & Bonus Crafting Advice',
    };
  }

  if (clamped >= -24) {
    return {
      tier: 'Neutral',
      label: 'Neutral / Acquaintance (Fair Trader)',
      description: 'Transactional, guarded, polite, and strictly business-oriented.',
      minScore: -24,
      maxScore: 24,
      color: 'text-slate-300',
      bgColor: 'bg-slate-900/80',
      borderColor: 'border-slate-700',
      glowColor: 'shadow-slate-600/20',
      dialoguePrefix: '[Polite & Reserved]',
      tone: 'Professional, strictly transactional, does not share rumors or personal history.',
      priceMultiplier: 1.0, // Standard price
      tradePerk: 'Standard Bazaar Trading Rates',
    };
  }

  if (clamped >= -75) {
    return {
      tier: 'Suspicious',
      label: 'Suspicious / Rival (Guarded & Cynical)',
      description: 'Cold, cynical, unhelpful, skeptical of your motives, and imposes a merchant surcharge.',
      minScore: -75,
      maxScore: -25,
      color: 'text-amber-400',
      bgColor: 'bg-amber-950/60',
      borderColor: 'border-amber-500/50',
      glowColor: 'shadow-amber-500/30',
      dialoguePrefix: '[Guarded & Cynical]',
      tone: 'Terse, skeptical, questioning motives, reluctant to provide assistance.',
      priceMultiplier: 1.25, // 25% surcharge
      tradePerk: '+25% Risk Surcharge Imposed',
    };
  }

  return {
    tier: 'Hostile',
    label: 'Hostile / Enemy (Distrustful & Antagonistic)',
    description: 'Aggressive, openly contemptuous, refuses special requests, and demands steep tariffs.',
    minScore: -100,
    maxScore: -76,
    color: 'text-rose-400',
    bgColor: 'bg-rose-950/60',
    borderColor: 'border-rose-500/50',
    glowColor: 'shadow-rose-500/30',
    dialoguePrefix: '[Hostile & Contemptuous]',
    tone: 'Biting, cold, hostile, refuses guidance and demands extortionate trade rates.',
    priceMultiplier: 1.5, // 50% penalty
    tradePerk: '+50% Blacklist Penalty & Inquiries Denied',
  };
}

/**
 * Weighted Event Matrix for player choices and actions.
 */
export const EVENT_WEIGHT_MATRIX: Record<
  AffinityEventType,
  { deltaAffinity: number; deltaTrust: number; description: string }
> = {
  gift_offered: {
    deltaAffinity: 16,
    deltaTrust: 4,
    description: 'Offered a valuable gift or token of appreciation',
  },
  quest_completed: {
    deltaAffinity: 14,
    deltaTrust: 24,
    description: 'Fulfill an expedition pledge or solve a citadel crisis',
  },
  lore_discussed: {
    deltaAffinity: 8,
    deltaTrust: 6,
    description: 'Engage respectfully with their cultural history and expertise',
  },
  flattery_given: {
    deltaAffinity: 10,
    deltaTrust: -4,
    description: 'Superficial flattery (raises approval, slightly reduces respect)',
  },
  tactical_win: {
    deltaAffinity: 6,
    deltaTrust: 18,
    description: 'Demonstrated tactical mastery and defeated a dungeon boss',
  },
  promise_kept: {
    deltaAffinity: 10,
    deltaTrust: 30,
    description: 'Honored a promise made in earlier dialogue',
  },
  haggled_rudely: {
    deltaAffinity: -14,
    deltaTrust: -8,
    description: 'Low-balled their craft or disrespected artisan traditions',
  },
  failed_quest: {
    deltaAffinity: -8,
    deltaTrust: -22,
    description: 'Abandoned an objective or allowed party casualties',
  },
  insult_provocation: {
    deltaAffinity: -28,
    deltaTrust: -14,
    description: 'Insulted the NPC or challenged their authority',
  },
  betrayal: {
    deltaAffinity: -55,
    deltaTrust: -65,
    description: 'Sold contraband behind their back or broke an oath',
  },
};

/**
 * Initial baseline relationship records for Citadel NPCs.
 */
export const DEFAULT_INITIAL_RELATIONSHIPS: Record<string, NPCRelationshipRecord> = {
  npc_broman: {
    npcId: 'npc_broman',
    npcName: 'Broman Ironfist',
    affinity: 38,
    trust: 42,
    compositeScore: 40,
    lastInteraction: Date.now(),
    interactionCount: 5,
    notes: [
      'Appreciates players who temper weapons with genuine Golem Alloy scrap.',
      'Disdains fragile, unsharpened blades and disrespectful haggling.',
    ],
    historyLog: [
      {
        id: 'log_broman_init',
        timestamp: Date.now() - 3600000,
        action: 'Forging Collaboration',
        deltaAffinity: 10,
        deltaTrust: 15,
        reason: 'Tempered an alloy blade at the Great Hearth.',
      },
    ],
  },
  npc_lyra: {
    npcId: 'npc_lyra',
    npcName: 'Arch-Mage Lyra Windwhisper',
    affinity: 48,
    trust: 45,
    compositeScore: 46,
    lastInteraction: Date.now(),
    interactionCount: 4,
    notes: [
      'Intellectual expedition scholar studying Sunken Vault runes.',
      'Values collaborative elemental tactical synergies and caution over brute force.',
    ],
    historyLog: [
      {
        id: 'log_lyra_init',
        timestamp: Date.now() - 7200000,
        action: 'Leyline Alignment Inquiry',
        deltaAffinity: 12,
        deltaTrust: 10,
        reason: 'Discussed Wind and Earth dual-spell synergy.',
      },
    ],
  },
  npc_grim: {
    npcId: 'npc_grim',
    npcName: 'Grimm the Treasure Hound',
    affinity: 32,
    trust: 35,
    compositeScore: 34,
    lastInteraction: Date.now(),
    interactionCount: 12,
    notes: [
      'Keeps the shared guild vault secure; respects punctual rent and treasury deposits.',
      'Skeptical of lone wolves who hoard stardust without contributing.',
    ],
    historyLog: [
      {
        id: 'log_grim_init',
        timestamp: Date.now() - 10800000,
        action: 'Guild Vault Deposit',
        deltaAffinity: 8,
        deltaTrust: 12,
        reason: 'Deposited runic materials into the guild treasury.',
      },
    ],
  },
};

/**
 * AffinityManager class
 * Manages player-NPC relationships, tracks dynamic Affinity & Trust values,
 * calculates qualitative status tiers, and modifies dialogue tone and pricing.
 */
export class AffinityManager {
  private relationships: Map<string, NPCRelationshipRecord>;

  constructor(initialData?: Record<string, NPCRelationshipRecord> | string) {
    this.relationships = new Map();

    if (initialData) {
      this.importData(initialData);
    } else {
      Object.entries(DEFAULT_INITIAL_RELATIONSHIPS).forEach(([id, rec]) => {
        this.relationships.set(id, { ...rec });
      });
    }
  }

  /**
   * Helper to compute composite relationship score
   */
  private computeComposite(affinity: number, trust: number): number {
    // Weighted combination: 45% affinity, 55% trust
    const raw = affinity * 0.45 + trust * 0.55;
    return Math.max(-100, Math.min(100, Math.round(raw)));
  }

  /**
   * Ensure record exists for the given NPC
   */
  public getOrCreateRecord(npcId: string, defaultName: string = 'Citadel NPC'): NPCRelationshipRecord {
    let rec = this.relationships.get(npcId);
    if (!rec) {
      rec = {
        npcId,
        npcName: defaultName,
        affinity: 0,
        trust: 0,
        compositeScore: 0,
        lastInteraction: Date.now(),
        interactionCount: 0,
        notes: [],
        historyLog: [],
      };
      this.relationships.set(npcId, rec);
    }
    return { ...rec };
  }

  /**
   * Retrieve the current record for an NPC
   */
  public getRecord(npcId: string): NPCRelationshipRecord {
    return this.getOrCreateRecord(npcId);
  }

  /**
   * Retrieve all NPC relationship records as a key-value record
   */
  public getAllRecords(): Record<string, NPCRelationshipRecord> {
    const result: Record<string, NPCRelationshipRecord> = {};
    this.relationships.forEach((rec, key) => {
      result[key] = { ...rec };
    });
    return result;
  }

  /**
   * Get qualitative status tier for an NPC
   */
  public getTier(npcId: string): RelationshipTierInfo {
    const rec = this.getOrCreateRecord(npcId);
    return getAffinityTier(rec.compositeScore);
  }

  /**
   * Record a structured game event using the Weighted Event Matrix
   */
  public recordEvent(
    npcId: string,
    eventType: AffinityEventType,
    customReason?: string
  ): {
    record: NPCRelationshipRecord;
    tier: RelationshipTierInfo;
    deltaAffinity: number;
    deltaTrust: number;
  } {
    const weights = EVENT_WEIGHT_MATRIX[eventType] || {
      deltaAffinity: 5,
      deltaTrust: 5,
      description: 'General interaction',
    };

    return this.adjustScores(
      npcId,
      weights.deltaAffinity,
      weights.deltaTrust,
      customReason || weights.description,
      eventType
    );
  }

  /**
   * Directly adjust affinity & trust with clamping and history logging
   */
  public adjustScores(
    npcId: string,
    deltaAffinity: number,
    deltaTrust: number,
    reason: string,
    action: string = 'Manual Adjust'
  ): {
    record: NPCRelationshipRecord;
    tier: RelationshipTierInfo;
    deltaAffinity: number;
    deltaTrust: number;
  } {
    const existing = this.getOrCreateRecord(npcId);

    const newAffinity = Math.max(-100, Math.min(100, existing.affinity + deltaAffinity));
    const newTrust = Math.max(-100, Math.min(100, existing.trust + deltaTrust));
    const newComposite = this.computeComposite(newAffinity, newTrust);

    const logEntry: AffinityEventLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      action,
      deltaAffinity,
      deltaTrust,
      reason,
    };

    // Keep history sliding window at max 12 events to preserve storage
    const updatedHistory = [logEntry, ...existing.historyLog].slice(0, 12);

    const updated: NPCRelationshipRecord = {
      ...existing,
      affinity: newAffinity,
      trust: newTrust,
      compositeScore: newComposite,
      lastInteraction: Date.now(),
      interactionCount: existing.interactionCount + 1,
      historyLog: updatedHistory,
    };

    this.relationships.set(npcId, updated);
    const tier = getAffinityTier(newComposite);

    return {
      record: updated,
      tier,
      deltaAffinity,
      deltaTrust,
    };
  }

  /**
   * Reset relationship to baseline Neutral or starting values
   */
  public resetRelationship(npcId: string): void {
    if (DEFAULT_INITIAL_RELATIONSHIPS[npcId]) {
      this.relationships.set(npcId, { ...DEFAULT_INITIAL_RELATIONSHIPS[npcId] });
    } else {
      this.relationships.set(npcId, {
        npcId,
        npcName: 'Citadel NPC',
        affinity: 0,
        trust: 0,
        compositeScore: 0,
        lastInteraction: Date.now(),
        interactionCount: 0,
        notes: [],
        historyLog: [],
      });
    }
  }

  /**
   * Add a personal memory note for the NPC about the player
   */
  public addNote(npcId: string, note: string): void {
    const existing = this.getOrCreateRecord(npcId);
    if (!existing.notes.includes(note)) {
      this.relationships.set(npcId, {
        ...existing,
        notes: [...existing.notes, note],
      });
    }
  }

  /**
   * Dynamic Dialogue Influencing Function:
   * Rewrites/flavors NPC dialogue based on current Affinity Tier!
   */
  public influenceDialogue(
    npcId: string,
    baseDialogue: string,
    npcName: string = 'NPC',
    playerHeroName: string = 'Hero'
  ): {
    dialogue: string;
    tier: RelationshipTierInfo;
    priceMultiplier: number;
    greetingGreeting: string;
  } {
    const rec = this.getOrCreateRecord(npcId);
    const tier = getAffinityTier(rec.compositeScore);

    let prefix = '';
    let suffix = '';

    switch (tier.tier) {
      case 'Devoted':
        prefix = `[Devoted • Warm Smile] "${playerHeroName}, my dearest ally! It honors my hearth to see you safe. `;
        suffix = ` Whatever the guild needs, you have my absolute faith and full workshop backing."`;
        break;

      case 'Friendly':
        prefix = `[Friendly • Welcoming] "Hail, ${playerHeroName}! Good to have your blade by our side today. `;
        suffix = ` Let me know how our craft can aid your expedition."`;
        break;

      case 'Neutral':
        prefix = `[Neutral • Formal] "Greetings, traveler. `;
        suffix = ` State your business at the Citadel counter."`;
        break;

      case 'Suspicious':
        prefix = `[Suspicious • Narrowed Eyes] "You again? Keep your hands where I can see them, ${playerHeroName}. `;
        suffix = ` Don't cause trouble inside the Aegis Dome, or the Wardens will hear of it."`;
        break;

      case 'Hostile':
        prefix = `[Hostile • Cold Scowl] "Step back. I have neither patience nor charity for your kind. `;
        suffix = ` If you must trade, prepare to pay the penalty rates, then be gone."`;
        break;
    }

    // Adapt the core text to avoid double quotes if already present
    const cleanBase = baseDialogue.replace(/^["']|["']$/g, '');

    const styledDialogue = `${prefix}${cleanBase}${suffix}`;

    return {
      dialogue: styledDialogue,
      tier,
      priceMultiplier: tier.priceMultiplier,
      greetingGreeting: prefix,
    };
  }

  /**
   * Format structured prompt context for LLM injection
   */
  public buildPromptInjection(
    npcId: string,
    playerHeroName: string = 'Elurien'
  ): string {
    const rec = this.getOrCreateRecord(npcId);
    const tier = getAffinityTier(rec.compositeScore);

    return `[DYNAMIC CHARACTER AFFINITY CONTEXT]
- Target NPC: ${rec.npcName} (${rec.npcId})
- Interacting Hero: ${playerHeroName}
- Affinity Score: ${rec.affinity > 0 ? '+' : ''}${rec.affinity}/100 (Emotional Standing / Affection)
- Trust Score: ${rec.trust > 0 ? '+' : ''}${rec.trust}/100 (Reliability / Respect)
- Composite Score: ${rec.compositeScore > 0 ? '+' : ''}${rec.compositeScore}/100
- Active Relationship Tier: ${tier.label}
- Psychological Tone & Stance: ${tier.tone}
- Trade Price Multiplier: ${tier.priceMultiplier}x
- Active Relationship Notes:
${rec.notes.length > 0 ? rec.notes.map((n) => `  * ${n}`).join('\n') : '  * No prior grievance or pact.'}
- Recent Relationship Memory Log:
${
  rec.historyLog.length > 0
    ? rec.historyLog
        .slice(0, 3)
        .map(
          (h) =>
            `  * [${h.action}] Aff: ${h.deltaAffinity > 0 ? '+' : ''}${h.deltaAffinity}, Trust: ${
              h.deltaTrust > 0 ? '+' : ''
            }${h.deltaTrust} - Reason: ${h.reason}`
        )
        .join('\n')
    : '  * No logged interactions yet.'
}`;
  }

  /**
   * Serialize current state to JSON string
   */
  public serialize(): string {
    return JSON.stringify(this.getAllRecords());
  }

  /**
   * Import data from JSON object or string
   */
  public importData(data: Record<string, NPCRelationshipRecord> | string): void {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      this.relationships.clear();
      Object.entries(parsed).forEach(([id, rec]) => {
        const r = rec as NPCRelationshipRecord;
        this.relationships.set(id, {
          ...r,
          compositeScore: this.computeComposite(r.affinity, r.trust),
        });
      });
    } catch (err) {
      console.warn('Failed to import relationship data, initializing defaults', err);
      Object.entries(DEFAULT_INITIAL_RELATIONSHIPS).forEach(([id, rec]) => {
        this.relationships.set(id, { ...rec });
      });
    }
  }

  /**
   * Static factory method to recreate from JSON
   */
  public static fromJSON(jsonStr: string): AffinityManager {
    return new AffinityManager(jsonStr);
  }
}

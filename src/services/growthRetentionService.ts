import { RealmRiftEvent, PlayerRetentionState } from '../types/game';

const RETENTION_STORAGE_KEY = 'aethelgard_retention_state';

export const RETENTION_7_DAY_REWARDS = [
  { day: 1, label: 'Day 1: Vanguard Arrival', gold: 5000, essence: 150, items: '1x Health Potion Flask' },
  { day: 2, label: 'Day 2: Leyline Attunement', gold: 8000, essence: 250, items: '2x Elven Mana Flasks' },
  { day: 3, label: 'Day 3: Void Resonator', gold: 12000, essence: 350, items: '10x Void Shards + 25 Golem Alloy' },
  { day: 4, label: 'Day 4: Artisan Favor', gold: 16000, essence: 450, items: '30x Fairy Dust + 35 Spirit Wood' },
  { day: 5, label: 'Day 5: Abyss Challenger', gold: 22000, essence: 600, items: '1x Boss Rune of Ironpeak' },
  { day: 6, label: 'Day 6: Prism Blade Polish', gold: 30000, essence: 800, items: 'Aether-Forged Prism Catalyst' },
  { day: 7, label: 'Day 7: Celestial Ascension', gold: 50000, essence: 1500, items: 'Mythic Pet Companion Egg + Sovereign Crest' },
];

export const ROTATING_RIFTS: Omit<RealmRiftEvent, 'startsAt' | 'endsAt' | 'isActive'>[] = [
  {
    id: 'rift_ironpeak',
    biomeId: 'ironpeak_calderas',
    biomeName: 'Ironpeak Calderas',
    riftName: 'Magmatic Void Rift Eruption',
    element: 'void',
    description: 'Tectonic plates split open as void energy saturates the magma pits. Mobs yield 3x essence drops!',
    essenceMultiplier: 3.0,
    lootBonusPct: 45,
    riftBossName: 'Gorefang Obsidian Colossus',
  },
  {
    id: 'rift_sylph',
    biomeId: 'sylph_meadows',
    biomeName: 'Luminous Sylph Meadows',
    riftName: 'Solar Supernova Convergence',
    element: 'solar',
    description: 'Golden celestial rays penetrate the canopy, amplifying solar affinities and doubling gold discovery.',
    essenceMultiplier: 2.2,
    lootBonusPct: 35,
    riftBossName: 'Solar Winged Sovereign',
  },
  {
    id: 'rift_sunken',
    biomeId: 'sunken_ruins',
    biomeName: 'Sunken Ruins of Aethel',
    riftName: 'Astral Leyline Rupture',
    element: 'arcane',
    description: 'Ancient elven mana aqueducts overflow with pure starlight. Spell bursts recharge 50% faster.',
    essenceMultiplier: 2.5,
    lootBonusPct: 40,
    riftBossName: 'Mana-Drain Nether Leviathan',
  },
  {
    id: 'rift_badlands',
    biomeId: 'shattered_badlands',
    biomeName: 'Shattered Badlands',
    riftName: 'Abyssal Calamity Influx',
    element: 'void',
    description: 'The veil separating Aethelgard from the outer void thins. World Bosses drop guaranteed SSR Relics.',
    essenceMultiplier: 3.5,
    lootBonusPct: 60,
    riftBossName: 'Abyss Void Titan Apex',
  },
];

export class GrowthRetentionManager {
  private state: PlayerRetentionState;
  private currentRiftIndex: number = 0;
  private riftCycleStartTime: number = Date.now();
  private readonly RIFT_DURATION_MS = 90 * 1000; // 90 seconds active
  private readonly RIFT_INTERVAL_MS = 180 * 1000; // 180 seconds total cycle

  constructor() {
    this.state = this.loadState();
    this.refreshSessionMetrics();
  }

  private loadState(): PlayerRetentionState {
    try {
      const saved = localStorage.getItem(RETENTION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          sessionStartTime: Date.now(),
        };
      }
    } catch {
      // fallback
    }

    const todayStr = new Date().toISOString().split('T')[0];
    return {
      loginStreakDays: 1,
      lastClaimDate: '',
      sessionStartTime: Date.now(),
      sessionMinutes: 0,
      engagementTier: 'Novice Adventurer',
      focusSurgeMultiplier: 1.0,
      claimedDays: [],
      totalLogins: 1,
    };
  }

  public saveState() {
    try {
      localStorage.setItem(RETENTION_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
  }

  public getState(): PlayerRetentionState {
    this.refreshSessionMetrics();
    return { ...this.state };
  }

  public refreshSessionMetrics() {
    const elapsedMinutes = Math.floor((Date.now() - this.state.sessionStartTime) / 60000);
    this.state.sessionMinutes = elapsedMinutes;

    // Concurrency engagement multiplier ("Focus Surge")
    if (elapsedMinutes >= 30) {
      this.state.engagementTier = 'Grand Champion';
      this.state.focusSurgeMultiplier = 2.5;
    } else if (elapsedMinutes >= 15) {
      this.state.engagementTier = 'Abyss Sovereign';
      this.state.focusSurgeMultiplier = 2.0;
    } else if (elapsedMinutes >= 5) {
      this.state.engagementTier = 'Aethelgard Sentinel';
      this.state.focusSurgeMultiplier = 1.5;
    } else {
      this.state.engagementTier = 'Novice Adventurer';
      this.state.focusSurgeMultiplier = 1.0;
    }
  }

  // Claim Daily Login Reward
  public claimDailyReward(day: number): { success: boolean; reward?: typeof RETENTION_7_DAY_REWARDS[0]; message: string } {
    const todayStr = new Date().toISOString().split('T')[0];
    if (this.state.claimedDays.includes(day)) {
      return { success: false, message: `Reward for Day ${day} has already been claimed!` };
    }

    const reward = RETENTION_7_DAY_REWARDS.find((r) => r.day === day);
    if (!reward) {
      return { success: false, message: 'Invalid reward day.' };
    }

    this.state.claimedDays.push(day);
    this.state.lastClaimDate = todayStr;
    this.state.loginStreakDays = Math.min(7, this.state.claimedDays.length);
    this.saveState();

    return {
      success: true,
      reward,
      message: `🎉 Claimed ${reward.label}! Received +${reward.gold.toLocaleString()} Gold & +${reward.essence.toLocaleString()} Essence!`,
    };
  }

  // Live Realm Rift Engine
  public getCurrentRiftState(): {
    activeRift: RealmRiftEvent | null;
    nextRift: RealmRiftEvent;
    secondsRemaining: number;
    isActive: boolean;
  } {
    const now = Date.now();
    const cycleElapsed = (now - this.riftCycleStartTime) % this.RIFT_INTERVAL_MS;
    const currentRiftDef = ROTATING_RIFTS[this.currentRiftIndex % ROTATING_RIFTS.length];
    const nextRiftDef = ROTATING_RIFTS[(this.currentRiftIndex + 1) % ROTATING_RIFTS.length];

    const isActive = cycleElapsed < this.RIFT_DURATION_MS;
    const secondsRemaining = isActive
      ? Math.ceil((this.RIFT_DURATION_MS - cycleElapsed) / 1000)
      : Math.ceil((this.RIFT_INTERVAL_MS - cycleElapsed) / 1000);

    const activeRift: RealmRiftEvent = {
      ...currentRiftDef,
      startsAt: now - cycleElapsed,
      endsAt: now + (this.RIFT_DURATION_MS - cycleElapsed),
      isActive,
    };

    const nextRift: RealmRiftEvent = {
      ...nextRiftDef,
      startsAt: now + (this.RIFT_INTERVAL_MS - cycleElapsed),
      endsAt: now + (this.RIFT_INTERVAL_MS - cycleElapsed) + this.RIFT_DURATION_MS,
      isActive: false,
    };

    return {
      activeRift: isActive ? activeRift : null,
      nextRift,
      secondsRemaining,
      isActive,
    };
  }

  public advanceRiftManually() {
    this.currentRiftIndex = (this.currentRiftIndex + 1) % ROTATING_RIFTS.length;
    this.riftCycleStartTime = Date.now();
  }
}

export const growthRetention = new GrowthRetentionManager();

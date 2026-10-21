import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  Zap,
  Gift,
  Clock,
  Compass,
  CheckCircle2,
  Lock,
  ChevronRight,
  TrendingUp,
  Coins,
  Shield,
  Radio,
} from 'lucide-react';
import { growthRetention, RETENTION_7_DAY_REWARDS } from '../services/growthRetentionService';
import { RealmRiftEvent, PlayerRetentionState } from '../types/game';
import { sound } from '../services/soundService';

interface RetentionRiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimReward: (gold: number, essence: number, note: string) => void;
  onTeleportToRift?: (biomeId: string) => void;
  onInvestigateRift?: () => void;
}

export const RetentionRiftModal: React.FC<RetentionRiftModalProps> = ({
  isOpen,
  onClose,
  onClaimReward,
  onTeleportToRift,
  onInvestigateRift,
}) => {
  const [retentionState, setRetentionState] = useState<PlayerRetentionState>(() =>
    growthRetention.getState()
  );
  const [riftInfo, setRiftInfo] = useState(() => growthRetention.getCurrentRiftState());
  const [activeTab, setActiveTab] = useState<'rifts' | 'streak'>('rifts');
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  // Update timer every second
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setRiftInfo(growthRetention.getCurrentRiftState());
      setRetentionState(growthRetention.getState());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClaim = (day: number) => {
    sound.playVictory();
    const res = growthRetention.claimDailyReward(day);
    if (res.success && res.reward) {
      onClaimReward(res.reward.gold, res.reward.essence, res.reward.label);
      setRetentionState(growthRetention.getState());
      setClaimFeedback(res.message);
      setTimeout(() => setClaimFeedback(null), 4000);
    }
  };

  const handleInvestigateRift = () => {
    sound.playClick();
    if (riftInfo.activeRift && onTeleportToRift) {
      onTeleportToRift(riftInfo.activeRift.biomeId);
      onClose();
    } else if (onInvestigateRift) {
      onInvestigateRift();
      onClose();
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl shadow-md shadow-cyan-500/20">
              🌀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-tech text-cyan-400 font-bold uppercase tracking-wider">
                  Organic Retention Engine • Dynamic Live Events
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                  ACTIVE 20 HZ
                </span>
              </div>
              <h2 className="text-2xl font-rpg font-extrabold text-white">
                Realm Rifts & Player Growth Matrix
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-mono transition cursor-pointer"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('rifts');
            }}
            className={`pb-3 px-4 font-rpg font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'rifts'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>DYNAMIC REALM RIFTS ({riftInfo.isActive ? 'INCURSION LIVE!' : 'SCANNING'})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('streak');
            }}
            className={`pb-3 px-4 font-rpg font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'streak'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gift className="w-4 h-4 text-amber-400" />
            <span>7-DAY LOGIN STREAK ({retentionState.claimedDays.length}/7 CLAIMED)</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto space-y-6">
          {claimFeedback && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 text-cyan-200 text-xs font-rpg font-bold flex items-center gap-2 animate-fade-in shadow-lg shadow-cyan-500/20">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{claimFeedback}</span>
            </div>
          )}

          {activeTab === 'rifts' ? (
            <div className="space-y-6">
              {/* Active Rift Card */}
              {riftInfo.isActive && riftInfo.activeRift ? (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/60 via-slate-900 to-indigo-950/60 border-2 border-cyan-400/80 shadow-2xl shadow-cyan-500/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-rose-500 to-pink-500 text-white font-tech font-bold text-[10px] uppercase px-4 py-1 rounded-bl-2xl shadow-md">
                    DIMENSIONAL BREACH ACTIVE
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="text-xs font-tech font-bold text-cyan-300 uppercase flex items-center gap-2">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span>Continental Hotspot: {riftInfo.activeRift.biomeName}</span>
                      </div>
                      <h3 className="text-2xl font-rpg font-extrabold text-white mt-1">
                        {riftInfo.activeRift.riftName}
                      </h3>
                      <p className="text-xs text-slate-300 font-sans mt-1 max-w-xl">
                        {riftInfo.activeRift.description}
                      </p>
                    </div>

                    <div className="bg-slate-950/90 border border-cyan-500/40 p-4 rounded-2xl text-center min-w-[150px]">
                      <div className="text-[10px] font-tech text-cyan-300">CLOSES IN</div>
                      <div className="text-2xl font-rpg font-black text-rose-400 tracking-wider">
                        {formatTimer(riftInfo.secondsRemaining)}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                        {riftInfo.activeRift.essenceMultiplier}x Essence Loot Active
                      </div>
                    </div>
                  </div>

                  {/* Multipliers & Rewards */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                      <div className="text-[10px] font-tech text-slate-400">ESSENCE MULTIPLIER</div>
                      <div className="text-lg font-rpg font-black text-cyan-400">
                        {riftInfo.activeRift.essenceMultiplier}x
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                      <div className="text-[10px] font-tech text-slate-400">BONUS DROP RATE</div>
                      <div className="text-lg font-rpg font-black text-amber-400">
                        +{riftInfo.activeRift.lootBonusPct}%
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                      <div className="text-[10px] font-tech text-slate-400">RIFT BOSS</div>
                      <div className="text-xs font-rpg font-bold text-rose-300 truncate mt-1">
                        {riftInfo.activeRift.riftBossName}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleInvestigateRift}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:brightness-110 active:scale-[0.99] text-white font-rpg font-extrabold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Compass className="w-4 h-4" />
                    <span>INVESTIGATE RIFT INCURSION (TELEPORT)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-slate-950/60 border border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mx-auto text-cyan-400">
                    📡
                  </div>
                  <h3 className="text-lg font-rpg font-bold text-white">
                    Leylines Stable • Next Realm Rift Impending
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Atmospheric pressure is gathering. The planar radar detects a fracture forming in{' '}
                    <strong className="text-amber-300">{riftInfo.nextRift.biomeName}</strong>.
                  </p>
                  <div className="inline-block px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-300 font-rpg font-black text-xl">
                    ⏱️ Next Incursion in {formatTimer(riftInfo.secondsRemaining)}
                  </div>
                </div>
              )}

              {/* Engagement Multiplier Ribbon */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-lg">
                    ⚡
                  </div>
                  <div>
                    <div className="text-[10px] font-tech text-purple-400 uppercase font-bold">
                      Session Engagement Bonus ({retentionState.sessionMinutes} mins online)
                    </div>
                    <div className="text-sm font-rpg font-bold text-white">
                      Focus Surge Tier: <span className="text-cyan-300">{retentionState.engagementTier}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-tech text-slate-400">EXP & LOOT MULTIPLIER</div>
                  <div className="text-xl font-rpg font-black text-emerald-400">
                    {retentionState.focusSurgeMultiplier.toFixed(1)}x ACTIVE
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 7-Day Login Streak Grid */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-rpg font-bold text-white">Consecutive Adventurer Milestones</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Log in daily to claim escalating stockpiles of gold, astral prisms, and mythic pet rewards.
                  </p>
                </div>
                <div className="text-right bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] font-tech text-amber-400 block">CURRENT STREAK</span>
                  <span className="text-base font-rpg font-extrabold text-amber-300">
                    Day {retentionState.loginStreakDays} of 7
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {RETENTION_7_DAY_REWARDS.map((reward) => {
                  const isClaimed = retentionState.claimedDays.includes(reward.day);
                  const isReady = !isClaimed && reward.day <= retentionState.loginStreakDays;
                  const isLocked = !isClaimed && reward.day > retentionState.loginStreakDays;

                  return (
                    <div
                      key={reward.day}
                      className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                        isClaimed
                          ? 'bg-slate-950/60 border-slate-800 opacity-70'
                          : isReady
                          ? 'bg-slate-900 border-amber-400/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-rpg font-bold text-white">{reward.label}</span>
                          {isClaimed ? (
                            <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
                              CLAIMED ✓
                            </span>
                          ) : isReady ? (
                            <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                              READY!
                            </span>
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs font-tech mb-3">
                          <div className="flex items-center gap-1.5 text-amber-300">
                            <Coins className="w-3.5 h-3.5" />
                            <span>+{reward.gold.toLocaleString()} Gold</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-cyan-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>+{reward.essence.toLocaleString()} Essence</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans border-t border-slate-800 pt-1 mt-1 truncate">
                            🎁 {reward.items}
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={!isReady}
                        onClick={() => handleClaim(reward.day)}
                        className={`w-full py-2 rounded-xl text-xs font-rpg font-bold transition cursor-pointer ${
                          isClaimed
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : isReady
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 shadow-md shadow-amber-500/20 active:scale-95'
                            : 'bg-slate-800/60 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        {isClaimed ? 'CLAIMED' : isReady ? 'CLAIM REWARD' : `UNLOCK ON DAY ${reward.day}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

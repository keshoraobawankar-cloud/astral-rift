import React, { useState, useEffect } from 'react';
import './AttributeAllocator.css';
import {
  saveCharacterAttributes,
  triggerAntiCheatTest,
  getCurrentSessionInfo,
  loginPlayer,
  StatSaveResult,
} from '../services/characterApiService';

export interface AttributeStats {
  strength: number;
  agility: number;
  vitality: number;
  intelligence: number;
  perception: number;
}

const DEFAULT_INITIAL_STATS: AttributeStats = {
  strength: 20,
  agility: 20,
  vitality: 20,
  intelligence: 10,
  perception: 10,
};

export interface AttributeAllocatorProps {
  characterName?: string;
  initialStats?: Partial<AttributeStats>;
  initialPoints?: number;
  onConfirmBuild?: (allocatedStats: AttributeStats, totalPower: number) => void;
  onClose?: () => void;
  title?: string;
}

export default function AttributeAllocator({
  characterName,
  initialStats,
  initialPoints = 15,
  onConfirmBuild,
  onClose,
  title = 'HUNTER ATTRIBUTES',
}: AttributeAllocatorProps) {
  const baseStats: AttributeStats = {
    strength: initialStats?.strength ?? DEFAULT_INITIAL_STATS.strength,
    agility: initialStats?.agility ?? DEFAULT_INITIAL_STATS.agility,
    vitality: initialStats?.vitality ?? DEFAULT_INITIAL_STATS.vitality,
    intelligence: initialStats?.intelligence ?? DEFAULT_INITIAL_STATS.intelligence,
    perception: initialStats?.perception ?? DEFAULT_INITIAL_STATS.perception,
  };

  const [availablePoints, setAvailablePoints] = useState<number>(initialPoints);
  const [stats, setStats] = useState<AttributeStats>(baseStats);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<StatSaveResult | null>(null);
  const [showAntiCheatTest, setShowAntiCheatTest] = useState<boolean>(false);
  const [session, setSession] = useState(getCurrentSessionInfo());

  // Sync if character changes
  useEffect(() => {
    setStats({
      strength: initialStats?.strength ?? DEFAULT_INITIAL_STATS.strength,
      agility: initialStats?.agility ?? DEFAULT_INITIAL_STATS.agility,
      vitality: initialStats?.vitality ?? DEFAULT_INITIAL_STATS.vitality,
      intelligence: initialStats?.intelligence ?? DEFAULT_INITIAL_STATS.intelligence,
      perception: initialStats?.perception ?? DEFAULT_INITIAL_STATS.perception,
    });
    setAvailablePoints(initialPoints);
    setSaveStatus(null);
  }, [
    characterName,
    initialPoints,
    initialStats?.strength,
    initialStats?.agility,
    initialStats?.vitality,
    initialStats?.intelligence,
    initialStats?.perception,
  ]);

  // Calculate dynamic Total Power based on Solo Leveling attribute weights
  const totalPower = Math.floor(
    stats.strength * 35 +
    stats.agility * 30 +
    stats.vitality * 25 +
    stats.intelligence * 20 +
    stats.perception * 30
  );

  const handleIncrement = (statKey: keyof AttributeStats) => {
    if (availablePoints > 0) {
      setStats((prev) => ({ ...prev, [statKey]: prev[statKey] + 1 }));
      setAvailablePoints((prev) => prev - 1);
      setSaveStatus(null);
    }
  };

  const handleDecrement = (statKey: keyof AttributeStats) => {
    if (stats[statKey] > baseStats[statKey]) {
      setStats((prev) => ({ ...prev, [statKey]: prev[statKey] - 1 }));
      setAvailablePoints((prev) => prev + 1);
      setSaveStatus(null);
    }
  };

  const handleReset = () => {
    setStats(baseStats);
    setAvailablePoints(initialPoints);
    setSaveStatus(null);
  };

  // Full-Stack Asynchronous Save with JWT & Anti-Cheat Validation
  const handleConfirm = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    const result = await saveCharacterAttributes(
      session.playerId,
      stats,
      availablePoints,
      characterName?.toLowerCase().replace(/\s+/g, '_') || 'elurien'
    );

    setIsSaving(false);
    setSaveStatus(result);

    if (result.success && onConfirmBuild) {
      onConfirmBuild(stats, totalPower);
    }
  };

  // Anti-Cheat live verification test: attempt an illegal packet injection
  const handleTestCheat = async () => {
    setIsSaving(true);
    const result = await triggerAntiCheatTest(session.playerId, stats, availablePoints);
    setIsSaving(false);
    setSaveStatus(result);
  };

  return (
    <div className="allocator-container">
      {/* Hunter Session & JWT Status Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-[10px] font-tech text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-cyan-400 font-bold uppercase">JWT Session:</span>
          <span className="text-slate-200">{session.username}</span>
        </div>
        <span className="bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
          PID: {session.playerId}
        </span>
      </div>

      <div className="header-section">
        <div>
          <h2>{characterName ? `${characterName.toUpperCase()} • ${title}` : title}</h2>
          {characterName && (
            <span style={{ fontSize: '0.72rem', color: '#8f9bb3' }}>
              Hunter Attribute Growth & PBR Matrix
            </span>
          )}
        </div>
        <div className="power-badge">
          <span>Total Power</span>
          <strong>{totalPower.toLocaleString()}</strong>
        </div>
      </div>

      <div className="points-pool">
        <span>Available Points: </span>
        <strong className={availablePoints > 0 ? 'highlight' : ''}>{availablePoints}</strong>
      </div>

      <div className="stats-list">
        {(Object.keys(stats) as Array<keyof AttributeStats>).map((key) => {
          const value = stats[key];
          const canDecrement = value > baseStats[key];
          const canIncrement = availablePoints > 0;

          return (
            <div className="stat-row" key={key}>
              <div className="stat-label-wrap">
                <span className="stat-label">{key.toUpperCase()}</span>
              </div>
              <div className="stat-controls">
                <button
                  type="button"
                  onClick={() => handleDecrement(key)}
                  disabled={!canDecrement}
                  className="control-btn"
                  title={`Decrease ${key}`}
                >
                  -
                </button>
                <span className="stat-value">{value}</span>
                <button
                  type="button"
                  onClick={() => handleIncrement(key)}
                  disabled={!canIncrement}
                  className="control-btn"
                  title={`Increase ${key}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Server Validation & Anti-Cheat Feedback Banners */}
      {saveStatus && (
        <div
          className={`mt-4 p-3 rounded-xl border text-xs font-sans transition-all ${
            saveStatus.success
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between font-tech font-bold uppercase mb-1">
            <span>
              {saveStatus.success
                ? '🛡️ Server Anti-Cheat: Verified & Committed'
                : '⚠️ Anti-Cheat Security Alert'}
            </span>
            {saveStatus.jwtVerified && (
              <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-300">
                JWT Auth Valid
              </span>
            )}
          </div>
          <p className="text-[11px] leading-relaxed">
            {saveStatus.success ? saveStatus.message : saveStatus.error}
          </p>
          {saveStatus.verificationToken && (
            <div className="text-[10px] font-mono text-cyan-400 mt-1">
              Token: {saveStatus.verificationToken}
            </div>
          )}
        </div>
      )}

      <div className="footer-actions">
        <button type="button" className="reset-btn" onClick={handleReset} disabled={isSaving}>
          Reset
        </button>
        <button
          type="button"
          className="confirm-btn"
          disabled={availablePoints > 0 || isSaving}
          onClick={handleConfirm}
        >
          {isSaving ? 'Verifying with Server...' : saveStatus?.success ? 'Committed & Verified ✓' : 'Confirm Build (Cloud Save)'}
        </button>
      </div>

      {/* Live Anti-Cheat Validation Demo Toggle */}
      <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAntiCheatTest(!showAntiCheatTest)}
          className="text-[10px] font-tech text-slate-400 hover:text-cyan-400 transition"
        >
          {showAntiCheatTest ? 'Hide Anti-Cheat Security Inspector' : 'Inspect Server Anti-Cheat Tests'}
        </button>
      </div>

      {showAntiCheatTest && (
        <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-2">
          <div className="text-amber-400 font-tech font-bold text-xs uppercase">
            Anti-Cheat Verification Test Bed
          </div>
          <p className="text-slate-400 text-[10px] font-sans">
            Demonstrates server-side state accounting equation:
            <br />
            <code>Σ(Current - Base) + RemainingPool === TotalEarned</code>
          </p>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleTestCheat}
            className="w-full py-1.5 px-3 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-tech font-semibold transition"
          >
            Simulate Illegal +30 STR Memory Injection
          </button>
        </div>
      )}

      {onClose && (
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8f9bb3',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Close Allocator
          </button>
        </div>
      )}
    </div>
  );
}

export { AttributeAllocator };

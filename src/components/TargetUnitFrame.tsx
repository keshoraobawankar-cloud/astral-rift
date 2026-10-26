import React, { useState } from 'react';

interface TargetProps {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  isHostile?: boolean;
  roleOrGuild?: string;
  onClearTarget: () => void;
  defaultCollapsed?: boolean;
}

export const TargetUnitFrame: React.FC<TargetProps> = ({
  name,
  level,
  currentHp,
  maxHp,
  isHostile = false,
  roleOrGuild = 'Hunter Monarch',
  onClearTarget,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  // Determine health bar gradient
  const hpGradient =
    hpPercent < 25
      ? 'bg-gradient-to-r from-red-600 to-rose-500'
      : hpPercent < 50
      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
      : isHostile
      ? 'bg-gradient-to-r from-rose-500 to-red-400'
      : 'bg-gradient-to-r from-emerald-500 to-teal-400';

  const strokeColor =
    hpPercent < 25
      ? '#ef4444'
      : hpPercent < 50
      ? '#f59e0b'
      : isHostile
      ? '#f43f5e'
      : '#10b981';

  // Collapsed Mode: 50px icon state for target status bar
  if (isCollapsed) {
    const strokeDash = 132;
    const hpOffset = strokeDash - (hpPercent / 100) * strokeDash;

    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-40 select-none animate-fadeIn pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          title={`Target: ${name} (Lv.${level})\nHP: ${Math.round(currentHp)}/${maxHp} (${Math.round(hpPercent)}%)\n[Click to expand target frame]`}
          className="relative w-[50px] h-[50px] rounded-full bg-slate-950/95 border-2 border-slate-700 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center cursor-pointer group hover:border-cyan-400 hover:scale-105 active:scale-95 transition-all overflow-hidden focus:outline-none"
          aria-label="Expand Target Frame"
        >
          {/* Radial Circular Progress Meter */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 50 50">
            <circle
              cx="25"
              cy="25"
              r="21"
              stroke="#1e293b"
              strokeWidth="3.5"
              fill="transparent"
            />
            <circle
              cx="25"
              cy="25"
              r="21"
              stroke={strokeColor}
              strokeWidth="3.5"
              fill="transparent"
              strokeDasharray={strokeDash}
              strokeDashoffset={hpOffset}
              strokeLinecap="round"
              className="transition-all duration-200"
            />
          </svg>

          {/* Center Target Badge */}
          <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[7.5px] font-mono font-bold text-amber-300 leading-none">
              L.{level}
            </span>
            <span className="text-[10px] leading-tight mt-0.5">
              {isHostile ? '⚔️' : '🛡️'}
            </span>
          </div>

          {/* Threat Indicator Ping */}
          {isHostile && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
            </span>
          )}

          {/* Expand Badge on hover */}
          <div className="absolute inset-0 bg-cyan-500/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-cyan-300 drop-shadow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
        </button>

        {/* Clear Target Quick Button */}
        <button
          onClick={onClearTarget}
          className="w-5 h-5 rounded-full bg-slate-900/90 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-500 text-slate-400 hover:text-white flex items-center justify-center text-[10px] transition cursor-pointer"
          title="Clear Target [ESC]"
        >
          ✕
        </button>
      </div>
    );
  }

  // Expanded Mode: Full Target Status Bar
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/90 border border-slate-700/80 p-2.5 px-4 rounded-2xl shadow-2xl backdrop-blur-md z-40 select-none animate-fadeIn pointer-events-auto">
      <div
        className={`w-3.5 h-3.5 rounded-full shrink-0 ${
          isHostile ? 'bg-rose-500 animate-pulse ring-2 ring-rose-500/50' : 'bg-cyan-400 ring-2 ring-cyan-400/50'
        }`}
      />
      <div className="flex flex-col w-52">
        <div className="flex justify-between items-center text-xs font-rpg font-bold mb-1">
          <span className="text-amber-300 truncate max-w-[130px] flex items-center gap-1.5">
            <span>{name}</span>
            <span className="text-[10px] text-slate-400 font-mono">Lv.{level}</span>
          </span>
          <span className="text-slate-200 font-mono text-[11px]">
            {Math.round(currentHp)} / {maxHp}
          </span>
        </div>
        {/* Dynamic Health Bar */}
        <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-200 rounded-full ${hpGradient}`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[9px] text-slate-400 font-tech mt-0.5">
          <span className="truncate">{roleOrGuild}</span>
          <span className="font-mono text-cyan-300">{Math.round(hpPercent)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-slate-400 hover:text-amber-300 text-xs px-1.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer"
          title="Collapse target frame to 50px icon"
          aria-label="Collapse Target Frame"
        >
          −
        </button>

        {/* Clear Target Button */}
        <button
          onClick={onClearTarget}
          className="text-slate-400 hover:text-rose-400 text-xs px-1.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition cursor-pointer"
          title="Clear Target [ESC]"
          aria-label="Clear Target"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

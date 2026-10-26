import React, { useState, useEffect } from 'react';

export interface PlayerStatusBarProps {
  characterName: string;
  playerLevel: number;
  hp: number;
  maxHp?: number;
  stamina: number;
  maxStamina?: number;
  isExhausted?: boolean;
  playerExp: number;
  nextLevelExp: number;
  defaultCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export const PlayerStatusBar: React.FC<PlayerStatusBarProps> = ({
  characterName,
  playerLevel,
  hp,
  maxHp = 100,
  stamina,
  maxStamina = 100,
  isExhausted = false,
  playerExp,
  nextLevelExp,
  defaultCollapsed = false,
  onToggleCollapse,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapse = (nextState?: boolean) => {
    const val = typeof nextState === 'boolean' ? nextState : !isCollapsed;
    setIsCollapsed(val);
    if (onToggleCollapse) onToggleCollapse(val);
  };

  // Keyboard shortcut [U] to toggle status bar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'u' || e.key === 'U') {
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed]);

  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (stamina / maxStamina) * 100));
  const expPercent = Math.max(0, Math.min(100, (playerExp / nextLevelExp) * 100));

  // Determine health color gradient
  const hpStrokeColor =
    hpPercent < 25 ? '#f43f5e' : hpPercent < 50 ? '#f59e0b' : '#10b981';

  // Collapsed Mode: 50px icon state with circular status meters
  if (isCollapsed) {
    // Circle math for 50px frame (radius = 21, circumference = 2 * PI * 21 ≈ 131.95)
    const strokeDash = 132;
    const hpOffset = strokeDash - (hpPercent / 100) * strokeDash;
    const staminaOffset = strokeDash - (staminaPercent / 100) * strokeDash;

    return (
      <div className="relative pointer-events-auto select-none group">
        <button
          type="button"
          onClick={() => toggleCollapse(false)}
          title={`${characterName} (Lv.${playerLevel})\nHP: ${Math.round(hp)}/${maxHp} (${Math.round(hpPercent)}%)\nStamina: ${Math.round(stamina)}%\nEXP: ${Math.round(expPercent)}%\n[Click or press U to expand]`}
          className="relative w-[50px] h-[50px] rounded-2xl bg-slate-950/95 border-2 border-slate-700/80 shadow-2xl backdrop-blur-md flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 hover:scale-105 active:scale-95 transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          aria-label="Expand Player Status Bar"
        >
          {/* Radial Circular Progress Meters */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 50 50">
            {/* Background Track */}
            <circle
              cx="25"
              cy="25"
              r="21"
              stroke="#1e293b"
              strokeWidth="3.5"
              fill="transparent"
            />
            {/* HP Meter Ring */}
            <circle
              cx="25"
              cy="25"
              r="21"
              stroke={hpStrokeColor}
              strokeWidth="3.5"
              fill="transparent"
              strokeDasharray={strokeDash}
              strokeDashoffset={hpOffset}
              strokeLinecap="round"
              className="transition-all duration-200"
            />
            {/* Inner Stamina Meter Ring */}
            <circle
              cx="25"
              cy="25"
              r="17"
              stroke={isExhausted ? '#d97706' : '#eab308'}
              strokeWidth="2.5"
              fill="transparent"
              strokeDasharray="106.8"
              strokeDashoffset={106.8 - (staminaPercent / 100) * 106.8}
              strokeLinecap="round"
              strokeOpacity="0.85"
              className="transition-all duration-150"
            />
          </svg>

          {/* Center Info: Level & Heart Indicator */}
          <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[8px] font-mono font-bold text-amber-300 leading-none">
              L.{playerLevel}
            </span>
            <span className="text-[10px] leading-tight mt-0.5">
              {hpPercent < 25 ? '💔' : '❤️'}
            </span>
          </div>

          {/* Low HP Warning Beacon */}
          {hpPercent < 25 && (
            <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
            </span>
          )}

          {/* Expand Badge Overlay on Hover */}
          <div className="absolute inset-0 bg-cyan-500/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-cyan-300 drop-shadow absolute -top-0.5 -right-0.5 bg-slate-900/90 rounded-full p-0.5 border border-cyan-500/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
        </button>

        {/* 50px pill beneath collapsed icon */}
        <div className="mt-0.5 text-center font-mono text-[7.5px] text-slate-300 bg-slate-950/85 rounded px-1 py-0.2 border border-slate-800 max-w-[50px] truncate shadow">
          {Math.round(hpPercent)}%
        </div>
      </div>
    );
  }

  // Expanded Mode: Full Player Status Bars
  return (
    <div className="bg-slate-950/90 border border-slate-800/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-lg w-44 pointer-events-auto transition-all select-none">
      {/* Header: Level Badge, Character Name & Collapse Button */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="px-1 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono font-bold text-amber-300 shrink-0">
            LV.{playerLevel}
          </span>
          <span className="font-rpg font-bold text-[11px] text-white truncate max-w-[65px]" title={characterName}>
            {characterName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-mono font-bold text-rose-300">
            {Math.round(hp)}<span className="text-[8px] text-slate-500">/{maxHp}</span>
          </span>

          {/* Collapse Button */}
          <button
            type="button"
            onClick={() => toggleCollapse(true)}
            title="Collapse status bar to 50px icon [U]"
            className="w-4 h-4 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center text-[10px] leading-none transition-colors cursor-pointer group"
            aria-label="Collapse Status Bar"
          >
            <span className="transition-transform group-hover:scale-125">−</span>
          </button>
        </div>
      </div>

      {/* Slim Health Bar (6px) */}
      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-rose-950 mb-1" title={`Health: ${Math.round(hp)}/${maxHp} (${Math.round(hpPercent)}%)`}>
        <div
          className="h-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-400 transition-all duration-200"
          style={{ width: `${hpPercent}%` }}
        />
      </div>

      {/* Slim Stamina Bar (4px) */}
      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-amber-950 mb-1" title={`Stamina: ${Math.round(staminaPercent)}%`}>
        <div
          className={`h-full transition-all duration-150 ${
            isExhausted ? 'bg-amber-600 animate-pulse' : 'bg-gradient-to-r from-amber-500 to-yellow-300'
          }`}
          style={{ width: `${staminaPercent}%` }}
        />
      </div>

      {/* Micro EXP Progression Bar (2px) */}
      <div className="w-full h-0.5 bg-slate-900 rounded-full overflow-hidden" title={`EXP: ${playerExp}/${nextLevelExp} (${Math.round(expPercent)}%)`}>
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400 transition-all duration-300"
          style={{ width: `${expPercent}%` }}
        />
      </div>
    </div>
  );
};

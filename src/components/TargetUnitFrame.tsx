import React from 'react';

interface TargetProps {
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  isHostile?: boolean;
  roleOrGuild?: string;
  onClearTarget: () => void;
}

export const TargetUnitFrame: React.FC<TargetProps> = ({
  name,
  level,
  currentHp,
  maxHp,
  isHostile = false,
  roleOrGuild = 'Hunter Monarch',
  onClearTarget,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/90 border border-slate-700/80 p-2.5 px-4 rounded-2xl shadow-2xl backdrop-blur-md z-40 select-none animate-fadeIn">
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
            className={`h-full transition-all duration-200 rounded-full ${
              hpPercent < 25
                ? 'bg-gradient-to-r from-red-600 to-rose-500'
                : hpPercent < 50
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                : isHostile
                ? 'bg-gradient-to-r from-rose-500 to-red-400'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[9px] text-slate-400 font-tech mt-0.5">
          <span className="truncate">{roleOrGuild}</span>
          <span className="font-mono text-cyan-300">{Math.round(hpPercent)}%</span>
        </div>
      </div>
      <button
        onClick={onClearTarget}
        className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg border border-slate-800 hover:border-slate-600 hover:bg-slate-800 transition cursor-pointer"
        title="Clear Target [ESC]"
      >
        ✕
      </button>
    </div>
  );
};

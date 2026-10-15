import React, { useState, useEffect } from 'react';
import { CharacterRosterItem } from '../data/characters';

export interface ActionCombatHUDProps {
  activeHunter: CharacterRosterItem;
  cooldowns: { skill1: number; skill2: number; ultimate: number };
  comboStep: number;
  onCastSkill: (slot: 'skill1' | 'skill2' | 'ultimate') => void;
  onDodge?: () => void;
  onBlock?: () => void;
  isBlocking?: boolean;
}

export const ActionCombatHUD: React.FC<ActionCombatHUDProps> = ({
  activeHunter,
  cooldowns,
  comboStep,
  onCastSkill,
  onDodge,
  onBlock,
  isBlocking = false,
}) => {
  const skill1Name = activeHunter.skills[0] || 'Quick Strike';
  const skill2Name = activeHunter.skills[1] || 'Heavy Strike';
  const ultName = activeHunter.skills[2] || 'Runic Finisher';

  return (
    <div className="absolute bottom-6 right-6 flex items-end gap-3 pointer-events-auto z-20 select-none">
      {/* Combo Step Pip Indicator */}
      {comboStep > 0 && (
        <div className="flex flex-col items-center mr-1">
          <span className="text-[10px] font-tech text-amber-400 font-bold">CHAIN</span>
          <div className="flex gap-1 mt-0.5">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`w-2 h-2 rounded-full transition-all ${
                  step <= comboStep ? 'bg-amber-400 shadow-md shadow-amber-500/50 scale-110' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Parry / Guard Button */}
      {onBlock && (
        <div
          onClick={onBlock}
          className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-lg border-2 ${
            isBlocking
              ? 'bg-amber-950/90 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 scale-105'
              : 'bg-slate-900/90 border-slate-700/80 hover:border-cyan-400 text-slate-300'
          }`}
          title="Parry / Guard [B or Right-Click]"
        >
          <span className="text-xs font-black font-tech">B</span>
          <span className="text-[9px] font-sans text-slate-400">Guard</span>
        </div>
      )}

      {/* Dodge Roll Button */}
      {onDodge && (
        <div
          onClick={onDodge}
          className="relative w-14 h-14 rounded-2xl bg-slate-900/90 border-2 border-slate-700/80 hover:border-cyan-400 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all shadow-lg text-slate-300"
          title="Dodge Roll [C or Shift+Space]"
        >
          <span className="text-xs font-black text-cyan-300 font-tech">C</span>
          <span className="text-[9px] font-sans text-slate-400">Roll</span>
        </div>
      )}

      {/* Skill 1: Quick Strike / Volley (Q) */}
      <div
        onClick={() => cooldowns.skill1 <= 0 && onCastSkill('skill1')}
        className={`relative w-16 h-16 rounded-2xl bg-slate-900/90 border-2 flex flex-col items-center justify-center cursor-pointer transition-all shadow-lg overflow-hidden ${
          cooldowns.skill1 > 0
            ? 'border-slate-800 opacity-60 cursor-not-allowed'
            : 'border-cyan-500/60 hover:border-cyan-400 hover:scale-105 shadow-cyan-500/20'
        }`}
        title={`Cast ${skill1Name} [Q]` }
      >
        {cooldowns.skill1 > 0 && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-xs font-mono font-bold text-cyan-400">
            {cooldowns.skill1.toFixed(1)}s
          </div>
        )}
        <span className="text-xs font-black text-cyan-300 font-tech">Q</span>
        <span className="text-[9px] text-slate-400 font-sans truncate max-w-[54px] text-center px-0.5">
          {skill1Name}
        </span>
      </div>

      {/* Skill 2: Heavy Cleave / Special (E / Click) */}
      <div
        onClick={() => cooldowns.skill2 <= 0 && onCastSkill('skill2')}
        className={`relative w-16 h-16 rounded-2xl bg-slate-900/90 border-2 flex flex-col items-center justify-center cursor-pointer transition-all shadow-lg overflow-hidden ${
          cooldowns.skill2 > 0
            ? 'border-slate-800 opacity-60 cursor-not-allowed'
            : 'border-amber-500/60 hover:border-amber-400 hover:scale-105 shadow-amber-500/20'
        }`}
        title={`Cast ${skill2Name} [E or Left-Click]` }
      >
        {cooldowns.skill2 > 0 && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-xs font-mono font-bold text-amber-400">
            {cooldowns.skill2.toFixed(1)}s
          </div>
        )}
        <span className="text-xs font-black text-amber-300 font-tech">E</span>
        <span className="text-[9px] text-slate-400 font-sans truncate max-w-[54px] text-center px-0.5">
          {skill2Name}
        </span>
      </div>

      {/* Ultimate Finisher Slot (R) */}
      <div
        onClick={() => cooldowns.ultimate <= 0 && onCastSkill('ultimate')}
        className={`relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-xl overflow-hidden ${
          cooldowns.ultimate > 0
            ? 'bg-slate-900/90 border-2 border-slate-800 opacity-60 cursor-not-allowed'
            : 'bg-gradient-to-tr from-purple-950 via-indigo-900 to-purple-800 border-2 border-purple-400 hover:scale-105 shadow-purple-900/40 ring-2 ring-purple-400/40 animate-pulse'
        }`}
        title={`Cast ${ultName} [R]` }
      >
        {cooldowns.ultimate > 0 && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-xs font-mono font-bold text-purple-400">
            {cooldowns.ultimate.toFixed(1)}s
          </div>
        )}
        <span className="text-sm font-black text-purple-200 font-tech">R</span>
        <span className="text-[10px] text-purple-300 font-bold uppercase font-tech truncate max-w-[70px] text-center px-1">
          {ultName}
        </span>
      </div>
    </div>
  );
};

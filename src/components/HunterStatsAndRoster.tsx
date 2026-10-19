import React from 'react';
import { Character } from '../types/game';
import { weaponDatabase } from '../data/items';

export interface HunterStatAllocationProps {
  hunterName?: string;
  stats: {
    strength: number;
    agility: number;
    vitality: number;
    intelligence: number;
    perception: number;
  };
  availablePoints: number;
  onAllocate: (statKey: 'strength' | 'agility' | 'vitality' | 'intelligence' | 'perception') => void;
}

export function HunterStatsPanel({
  hunterName = 'Vaelen Thorne',
  stats,
  availablePoints,
  onAllocate,
}: HunterStatAllocationProps) {
  const totalPower = Math.floor(
    stats.strength * 35 +
    stats.agility * 30 +
    stats.vitality * 25 +
    stats.intelligence * 20 +
    stats.perception * 30
  );

  return (
    <div className="bg-slate-900/90 border border-cyan-500/40 p-6 rounded-2xl text-white backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-rpg font-bold text-cyan-400">{hunterName} • Status</h3>
          <p className="text-xs text-slate-400 font-mono">Umbral Sovereign System • Aethelgard Growth Matrix</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Combat Power</span>
          <span className="text-lg font-black text-amber-400 font-tech">{totalPower.toLocaleString()} CP</span>
        </div>
      </div>

      {/* Stat Distribution Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-slate-800/80 p-3 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400">Strength (Attack Power)</span>
            <p className="text-2xl font-black text-cyan-300 font-tech">{stats.strength}</p>
          </div>
          <button
            onClick={() => onAllocate('strength')}
            disabled={availablePoints <= 0}
            className="mt-2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            + Allocate
          </button>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400">Agility (Crit / Speed)</span>
            <p className="text-2xl font-black text-cyan-300 font-tech">{stats.agility}</p>
          </div>
          <button
            onClick={() => onAllocate('agility')}
            disabled={availablePoints <= 0}
            className="mt-2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            + Allocate
          </button>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400">Vitality (Max HP & Reg)</span>
            <p className="text-2xl font-black text-emerald-400 font-tech">{stats.vitality}</p>
          </div>
          <button
            onClick={() => onAllocate('vitality')}
            disabled={availablePoints <= 0}
            className="mt-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            + Allocate
          </button>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400">Intelligence (Mana & Spell)</span>
            <p className="text-2xl font-black text-purple-400 font-tech">{stats.intelligence}</p>
          </div>
          <button
            onClick={() => onAllocate('intelligence')}
            disabled={availablePoints <= 0}
            className="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            + Allocate
          </button>
        </div>

        <div className="bg-slate-800/80 p-3 rounded-xl border border-cyan-500/20 flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400">Perception (Precision / Sense)</span>
            <p className="text-2xl font-black text-amber-300 font-tech">{stats.perception}</p>
          </div>
          <button
            onClick={() => onAllocate('perception')}
            disabled={availablePoints <= 0}
            className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            + Allocate
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm bg-cyan-950/40 p-3 rounded-lg border border-cyan-500/30 text-cyan-200">
        <span>Available Stat Points:</span>
        <span className="font-bold text-yellow-400 text-base">{availablePoints}</span>
      </div>
    </div>
  );
}

export interface HunterPartyGridProps {
  roster: Character[];
  selectedHunterId?: string;
  onSelectHunter: (hunter: Character) => void;
}

export const HunterPartyGrid: React.FC<HunterPartyGridProps> = ({
  roster,
  selectedHunterId,
  onSelectHunter,
}) => {
  return (
    <div className="flex gap-4 overflow-x-auto p-4 bg-slate-950/80 rounded-2xl border border-slate-800 scrollbar-thin">
      {roster.map((hunter) => {
        const isSelected = selectedHunterId === hunter.id;
        const rarityBadge = hunter.rarity === 5 ? 'SSR' : 'SR';
        const totalPower = Math.floor(
          hunter.attributes.strength * 35 +
          hunter.attributes.agility * 30 +
          (hunter.attributes.vitality || 20) * 25 +
          hunter.attributes.intelligence * 20 +
          hunter.attributes.perception * 30
        );

        return (
          <div
            key={hunter.id}
            onClick={() => onSelectHunter(hunter)}
            className={`relative min-w-[200px] w-52 h-80 rounded-2xl p-4 cursor-pointer border-2 transition-all flex flex-col justify-between overflow-hidden bg-gradient-to-b from-slate-800 to-slate-950 group ${
              isSelected
                ? 'ring-2 ring-cyan-400 scale-102 border-cyan-400'
                : rarityBadge === 'SSR'
                ? 'border-amber-400 shadow-lg shadow-amber-500/20 hover:border-amber-300'
                : 'border-purple-500 shadow-md shadow-purple-500/20 hover:border-purple-400'
            }`}
          >
            {/* Rarity & Element Badge */}
            <div className="flex justify-between items-center z-10">
              <span
                className={`text-xs font-black px-2 py-0.5 rounded shadow ${
                  rarityBadge === 'SSR' ? 'bg-amber-500 text-black' : 'bg-purple-600 text-white'
                }`}
              >
                {rarityBadge}
              </span>
              <span className="text-xs text-cyan-300 font-bold uppercase font-tech">{hunter.element}</span>
            </div>

            {/* Hunter Portrait Art / Icon */}
            {hunter.portraitImage ? (
              <img
                src={hunter.portraitImage}
                alt={hunter.name}
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-top opacity-65 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-35 group-hover:opacity-50 transition">
                {hunter.avatarIcon}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

            {/* Details & Combat Power */}
            <div className="z-10 bg-slate-950/90 p-3 rounded-xl backdrop-blur-md border border-white/10">
              <h4 className="font-bold text-sm text-white font-rpg truncate">{hunter.name}</h4>
              <p className="text-[10px] text-slate-400 truncate">{hunter.className || hunter.title}</p>
              <div className="mt-2 text-xs font-semibold text-cyan-400 font-tech">
                Total Power: {totalPower.toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export function HunterWeaponsPanel() {
  return (
    <div className="bg-slate-900/90 border border-cyan-500/40 p-6 rounded-2xl text-white backdrop-blur-md shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-rpg font-bold text-cyan-400">Hunter Armory & Artifacts</h3>
          <p className="text-xs text-slate-400 font-mono">Runic Weapon Progression (SR / SSR Tiers)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.values(weaponDatabase).map((wpn) => (
          <div
            key={wpn.id}
            className={`p-4 rounded-xl border flex items-start gap-3.5 bg-slate-950/60 ${
              wpn.rarity === 'SSR'
                ? 'border-amber-400/50 shadow-md shadow-amber-500/10'
                : 'border-purple-500/50 shadow-md shadow-purple-500/10'
            }`}
          >
            <div className="text-3xl p-2 bg-slate-900 rounded-xl border border-slate-800">
              {wpn.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    wpn.rarity === 'SSR' ? 'bg-amber-500 text-black' : 'bg-purple-600 text-white'
                  }`}
                >
                  {wpn.rarity}
                </span>
                <h4 className="font-bold text-sm text-white font-rpg">{wpn.name}</h4>
              </div>
              <div className="text-xs text-amber-300 font-tech font-bold mt-1">
                Base Attack: +{wpn.baseAttack} • {wpn.type}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">
                {wpn.effect}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

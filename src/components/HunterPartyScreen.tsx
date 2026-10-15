import React, { useState } from 'react';
import { Character, PlayerInventory } from '../types/game';
import { sound } from '../services/soundService';
import {
  Swords,
  Shield,
  Sparkles,
  Search,
  Lock,
  ChevronRight,
  Flame,
  Droplet,
  Sun,
  Eye,
  Zap,
} from 'lucide-react';

interface HunterPartyScreenProps {
  party: Character[];
  inventory: PlayerInventory;
  onDeployParty: () => void;
  onInspectHunter: (charId: string) => void;
  onReturnToLobby: () => void;
}

export const HunterPartyScreen: React.FC<HunterPartyScreenProps> = ({
  party,
  inventory,
  onDeployParty,
  onInspectHunter,
  onReturnToLobby,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<number>(0);

  // Helper for element icon
  const getElementBadge = (element: string) => {
    switch (element) {
      case 'flame':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'void':
        return <Droplet className="w-3.5 h-3.5 text-blue-400" />;
      case 'arcane':
        return <Droplet className="w-3.5 h-3.5 text-cyan-400" />;
      case 'solar':
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const getRoleIcon = (race: string, weaponType: string) => {
    if (weaponType === 'Blade') return '🗡️';
    if (weaponType === 'Halberd' || race === 'beastkin') return '🦁';
    if (weaponType === 'Arcane Staff') return '🪄';
    return '⚔️';
  };

  // Calculate Party Total Power
  const partyTotalPower = party.reduce((sum, h) => sum + Math.round(h.attack * 2.5 + h.defense * 1.5 + h.hp * 0.4), 0);

  return (
    <div className="relative w-full max-w-6xl mx-auto rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl p-6 select-none flex flex-col justify-between min-h-[640px]">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onReturnToLobby}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition"
          >
            ←
          </button>
          <div>
            <h2 className="font-rpg font-extrabold text-xl text-white tracking-wide">
              HUNTER STRIKE TEAM DEPLOYMENT
            </h2>
            <p className="text-xs text-slate-400 font-tech">
              Team Combat Power: <span className="text-cyan-400 font-bold font-mono">⚔️ {partyTotalPower.toLocaleString()}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-tech">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-cyan-400 font-bold">✦</span>
            <span className="text-white font-mono">{inventory.astralPrisms}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-amber-400">🪙</span>
            <span className="text-amber-300 font-mono">{inventory.stardust.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main 4-Card Party Deployment Layout (Matching Screenshot 2) */}
      <div className="relative z-10 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        {party.slice(0, 4).map((hunter, idx) => {
          const powerScore = Math.round(hunter.attack * 2.5 + hunter.defense * 1.5 + hunter.hp * 0.4);
          const isSSR = hunter.rarity === 5;
          const isPlayer = hunter.id === 'jinwoo';

          return (
            <div
              key={hunter.id}
              onClick={() => onInspectHunter(hunter.id)}
              className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 flex flex-col justify-between p-4 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-black shadow-xl group hover:scale-[1.02] ${
                isSSR
                  ? 'border-rose-500/60 shadow-rose-500/10 hover:border-rose-400'
                  : 'border-purple-500/60 shadow-purple-500/10 hover:border-purple-400'
              }`}
            >
              {/* Top Card Badges */}
              <div className="flex items-center justify-between">
                {/* Element & Role Badges */}
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center">
                    {getElementBadge(hunter.element)}
                  </div>
                  <div className="w-6 h-6 rounded-md bg-slate-900 border border-slate-700 flex items-center justify-center text-xs">
                    {getRoleIcon(hunter.race, hunter.weaponType)}
                  </div>
                </div>

                {/* Rarity & Inspect */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-rpg font-extrabold text-xs px-2 py-0.5 rounded shadow ${
                      isSSR ? 'bg-rose-500 text-white' : 'bg-purple-600 text-white'
                    }`}
                  >
                    {isSSR ? 'SSR' : 'SR'}
                  </span>
                  <div className="w-6 h-6 rounded-md bg-slate-900/80 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-white transition">
                    <Search className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Hunter Standing Artwork / Icon Showcase */}
              <div className="flex flex-col items-center justify-center my-6">
                <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-5xl mb-2 group-hover:scale-110 transition duration-300">
                  {hunter.avatarIcon}
                </div>
                <h3 className="font-rpg font-bold text-base text-white text-center">
                  {hunter.name}
                </h3>
                <span className="text-[11px] text-slate-400 font-tech">
                  {hunter.title}
                </span>
              </div>

              {/* Card Footer: Level, Combat Power & Weapon Preview */}
              <div className="border-t border-slate-800/80 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-rpg font-bold text-xs text-white">
                    Level {hunter.level}
                  </span>
                  <span className="font-mono font-bold text-xs text-white flex items-center gap-1">
                    <span>⚔️</span>
                    <span>{powerScore.toLocaleString()}</span>
                  </span>
                </div>

                {/* Equipped Weapon Pill matching Screenshot 2 */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🗡️</span>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-rpg font-bold text-[11px] text-white truncate max-w-[120px]">
                        {hunter.weaponName}
                      </span>
                      <span className="text-[9px] text-cyan-400 font-tech">
                        Lv. {hunter.level * 3} • {isPlayer ? 'Player Weapon' : 'Hunter Exclusive'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-purple-400 font-bold font-tech">
                    SR
                  </span>
                </div>

                {/* Star Ascension Rating */}
                <div className="flex items-center justify-center gap-1 text-amber-400 text-xs mt-2">
                  {'★'.repeat(hunter.rarity)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Bar: Deploy Strike Force Button */}
      <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-4">
        <div className="flex items-center gap-4 text-xs font-tech text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            Extreme Evasion Active (Shadow Step)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            Cross-Race Synergies Ready
          </span>
        </div>

        <button
          onClick={onDeployParty}
          className="px-8 py-3 bg-gradient-to-r from-rose-600 via-amber-600 to-amber-500 hover:from-rose-500 text-white font-rpg font-extrabold text-sm rounded-xl shadow-xl shadow-rose-500/20 transition active:scale-95 flex items-center gap-2"
        >
          <span>DEPLOY HUNTER STRIKE FORCE</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { PlayerInventory, GuildEstate, SafeZoneState } from '../types/game';
import {
  Castle,
  Compass,
  Swords,
  Hammer,
  Users,
  BookOpen,
  Volume2,
  VolumeX,
  Coins,
  ShoppingBag,
  Sparkles,
  Zap,
} from 'lucide-react';

export type NavTab =
  | 'lobby'
  | 'guild'
  | 'party'
  | 'system'
  | 'bazaar'
  | 'dungeon'
  | 'combat'
  | 'workshops'
  | 'codex';

interface HeaderNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  inventory: PlayerInventory;
  guild: GuildEstate;
  safeZone: SafeZoneState;
  isCombatActive: boolean;
  isMuted: boolean;
  onToggleSound: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeTab,
  onSelectTab,
  inventory,
  guild,
  safeZone,
  isCombatActive,
  isMuted,
  onToggleSound,
}) => {
  return (
    <header className="w-full bg-slate-950/95 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Safe-Zone Indicator */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => onSelectTab('lobby')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition">
              🗡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-rpg font-extrabold text-sm tracking-wider text-white block leading-none">
                  ASTRAL RIFT
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 font-tech font-bold rounded">
                  HUNTER SYSTEM
                </span>
              </div>
              <span className="text-[10px] text-amber-400 font-tech font-semibold">
                {safeZone.locationName}
              </span>
            </div>
          </div>

          <button
            onClick={onToggleSound}
            className="md:hidden p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => onSelectTab('lobby')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'lobby'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Castle className="w-3.5 h-3.5" />
            <span>ASSOCIATION LOBBY</span>
          </button>

          <button
            onClick={() => onSelectTab('guild')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'guild'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Castle className="w-3.5 h-3.5 text-amber-400" />
            <span>GUILD ESTATE</span>
          </button>

          <button
            onClick={() => onSelectTab('system')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'system'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>PLAYER STATUS [JINWOO]</span>
          </button>

          <button
            onClick={() => onSelectTab('party')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'party'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>HUNTER STRIKE TEAM (4)</span>
          </button>

          <button
            onClick={() => onSelectTab('dungeon')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'dungeon'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>DUNGEON GATES</span>
          </button>

          {isCombatActive && (
            <button
              onClick={() => onSelectTab('combat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition animate-pulse ${
                activeTab === 'combat'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-rose-950/80 border border-rose-500/60 text-rose-300'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>DUNGEON RAID</span>
            </button>
          )}

          <button
            onClick={() => onSelectTab('bazaar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'bazaar'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>BAZAAR & NPCS</span>
          </button>

          <button
            onClick={() => onSelectTab('workshops')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'workshops'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>WEAPON FORGE</span>
          </button>

          <button
            onClick={() => onSelectTab('codex')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'codex'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>HUNTER ARCHIVES</span>
          </button>
        </nav>

        {/* Currency Display */}
        <div className="hidden xl:flex items-center gap-3 text-xs font-tech bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-xl">
          <div className="flex items-center gap-1 text-cyan-400 font-bold" title="Essence Stones">
            <span className="text-sm">✦</span>
            <span>{inventory.astralPrisms.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-1 text-amber-300 font-bold" title="Gold Coins">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{inventory.stardust.toLocaleString()}</span>
          </div>

          <button
            onClick={onToggleSound}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition ml-1"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};

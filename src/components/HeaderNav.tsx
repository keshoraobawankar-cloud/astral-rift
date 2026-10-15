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
  Shield,
  Layers,
  Lock,
  User,
  LogOut,
} from 'lucide-react';

export type NavTab =
  | 'lobby'
  | 'guild'
  | 'party'
  | 'array'
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
  hunterUsername?: string | null;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
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
  hunterUsername,
  onOpenLoginModal,
  onLogout,
}) => {
  return (
    <header className="w-full bg-slate-950/95 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Safe-Zone Indicator */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => onSelectTab('lobby')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-rpg font-extrabold text-sm tracking-wider text-white block leading-none">
                  AETHELGARD ONLINE
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 font-tech font-bold rounded">
                  v2.0 MASTER
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-amber-400 font-tech font-semibold">
                  {safeZone.locationName}
                </span>
              </div>
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
            <span>CITADEL PLAZA</span>
          </button>

          <button
            onClick={() => onSelectTab('party')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'party'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>6-PLAYER STRIKE TEAM</span>
          </button>

          <button
            onClick={() => onSelectTab('array')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'array'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>TELEPORT ARRAY (T1→T2)</span>
          </button>

          <button
            onClick={() => onSelectTab('dungeon')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'dungeon'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-rose-400" />
            <span>ABYSS & WORLD BOSSES</span>
          </button>

          {isCombatActive && (
            <button
              onClick={() => onSelectTab('combat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
                activeTab === 'combat'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md animate-pulse'
                  : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>ACTIVE COMBAT</span>
            </button>
          )}

          <button
            onClick={() => onSelectTab('bazaar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'bazaar'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span>ARTISAN BAZAAR (VOICE NPC)</span>
          </button>

          <button
            onClick={() => onSelectTab('workshops')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'workshops'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hammer className="w-3.5 h-3.5 text-purple-400" />
            <span>FORGE & LOOM</span>
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
            onClick={() => onSelectTab('codex')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition ${
              activeTab === 'codex'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>CODEX</span>
          </button>
        </nav>

        {/* Currency & Inventory Badges */}
        <div className="flex items-center gap-2 font-tech shrink-0">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-white">{inventory.stardust.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">Gold</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-cyan-300">{inventory.astralPrisms.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">Essence</span>
          </div>

          {/* Hunter Portal Auth Status */}
          {hunterUsername ? (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 rounded-xl text-xs font-mono transition group shadow-sm"
              title="Click to view Hunter Gate credentials or switch account"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold max-w-[100px] truncate">{hunterUsername}</span>
              <Lock className="w-3 h-3 text-emerald-400" title="JWT Session Verified" />
            </button>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-2.5 py-1 rounded-xl text-xs transition shadow-md shadow-cyan-500/20"
            >
              <User className="w-3.5 h-3.5" />
              <span>HUNTER LOGIN</span>
            </button>
          )}

          <button
            onClick={onToggleSound}
            className="hidden md:flex p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};

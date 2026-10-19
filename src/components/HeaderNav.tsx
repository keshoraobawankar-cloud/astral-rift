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
  Lock,
  User,
  Database,
  Gamepad2,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { DungeonSynthWidget } from './DungeonSynthWidget';
import { sound } from '../services/soundService';

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
  onOpenCloudVault?: () => void;
  isPlaying3D?: boolean;
  onToggle3DPlayable?: () => void;
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
  onOpenCloudVault,
  isPlaying3D,
  onToggle3DPlayable,
}) => {
  return (
    <header className="w-full bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 select-none shadow-xl">
      {/* Top Status & Currency Strip */}
      <div className="border-b border-slate-850 px-3 md:px-6 py-2 bg-slate-950/70">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Brand & Zone Location Indicator */}
          <div
            onClick={() => onSelectTab('lobby')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white text-base font-black shadow-md shadow-cyan-500/20 group-hover:scale-105 transition">
              ⚔️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-rpg font-extrabold text-xs md:text-sm tracking-wider text-white block leading-none">
                  AETHELGARD ONLINE
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {safeZone.bIsInSafeZone ? (
                  <Shield className="w-3 h-3 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-3 h-3 text-rose-400 animate-pulse" />
                )}
                <span className="text-[10px] text-amber-300 font-tech font-semibold truncate max-w-[170px] sm:max-w-none">
                  {safeZone.locationName}
                </span>
              </div>
            </div>
          </div>

          {/* Player Assets, Quick Status, Vault, Synth & Controls */}
          <div className="flex items-center flex-wrap gap-2 font-tech">
            {/* Gold */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-xs shadow-inner">
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold text-white">{inventory.stardust.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500">Gold</span>
            </div>

            {/* Essence */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl text-xs shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-bold text-cyan-300">{inventory.astralPrisms.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500">Essence</span>
            </div>

            {/* Aether Vault (Renamed from Supabase Vault) */}
            {onOpenCloudVault && (
              <button
                onClick={onOpenCloudVault}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-xl text-xs font-mono transition shadow-sm cursor-pointer"
                title="Open Aether Vault for Persistent Cloud Storage"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline font-bold">AETHER VAULT</span>
              </button>
            )}

            {/* 3D World Toggle Button */}
            {onToggle3DPlayable && (
              <button
                onClick={onToggle3DPlayable}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-rpg font-bold transition shadow-sm cursor-pointer ${
                  isPlaying3D
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white shadow-cyan-500/20'
                }`}
                title={isPlaying3D ? 'Currently in 3D Viewport. Click to return to HUD' : 'Enter 3D Open World Viewport'}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isPlaying3D ? '3D VIEWPORT ACTIVE' : 'ENTER 3D WORLD'}</span>
                <span className="sm:hidden font-mono">3D</span>
              </button>
            )}

            {/* Dungeon Synth Ambient Audio */}
            <DungeonSynthWidget compact={true} />

            {/* Hunter Auth Status */}
            {hunterUsername ? (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 border border-cyan-500/40 text-cyan-300 px-2.5 py-1 rounded-xl text-xs font-mono transition group shadow-sm"
                title="Hunter Gate Profile"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold max-w-[90px] truncate">{hunterUsername}</span>
                <Lock className="w-3 h-3 text-emerald-400" />
              </button>
            ) : (
              <button
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-2.5 py-1 rounded-xl text-xs transition shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
                <span>HUNTER LOGIN</span>
              </button>
            )}

            {/* Audio Mute/Unmute */}
            <button
              onClick={onToggleSound}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition cursor-pointer"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Ribbon - Cleanly Wrapped & Responsive */}
      <div className="px-3 md:px-6 py-2 bg-slate-950/90 border-t border-slate-900/60">
        <nav className="max-w-7xl mx-auto flex items-center justify-start sm:justify-center flex-wrap gap-1.5 overflow-x-auto py-0.5">
          <button
            onClick={() => {
              sound.playTabSwitch();
              onSelectTab('lobby');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'lobby'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Castle className="w-3.5 h-3.5 text-cyan-400" />
            <span>CITADEL PLAZA</span>
          </button>

          <button
            onClick={() => {
              sound.playTabSwitch();
              onSelectTab('party');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'party'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-black'
                : 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-950/80'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>STRIKE TEAM (6 HEROES)</span>
          </button>

          <button
            onClick={() => {
              sound.playTabSwitch();
              onSelectTab('array');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'array'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>TELEPORT ARRAY</span>
          </button>

          <button
            onClick={() => {
              sound.playTabSwitch();
              onSelectTab('dungeon');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'dungeon'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-rose-400" />
            <span>ABYSS & WORLD BOSSES</span>
          </button>

          {isCombatActive && (
            <button
              onClick={() => {
                sound.playTabSwitch();
                onSelectTab('combat');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                activeTab === 'combat'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md animate-pulse'
                  : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>ACTIVE COMBAT</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playTabSwitch();
              onSelectTab('bazaar');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'bazaar'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span>ARTISAN BAZAAR</span>
          </button>

          <button
            onClick={() => {
              sound.playTabSwitch();
              onSelectTab('workshops');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'workshops'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Hammer className="w-3.5 h-3.5 text-purple-400" />
            <span>FORGE & LOOM</span>
          </button>

          <button
            onClick={() => {
              sound.playTabSwitch();
              onSelectTab('guild');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'guild'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Castle className="w-3.5 h-3.5 text-amber-400" />
            <span>GUILD ESTATE</span>
          </button>

          <button
            onClick={() => {
              sound.playTabSwitch();
              onSelectTab('codex');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-rpg font-bold text-xs whitespace-nowrap transition cursor-pointer ${
              activeTab === 'codex'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>CODEX</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

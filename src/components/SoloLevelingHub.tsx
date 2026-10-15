import React, { useState } from 'react';
import { PlayerInventory, Character, SafeZoneState } from '../types/game';
import { sound } from '../services/soundService';
import {
  Shield,
  Coins,
  Sparkles,
  Compass,
  ArrowRight,
  Flame,
  Award,
  Bell,
  Mail,
  Grid,
  Maximize2,
  Clock,
  Zap,
  Swords,
  ChevronRight,
  User,
} from 'lucide-react';

interface SoloLevelingHubProps {
  inventory: PlayerInventory;
  party: Character[];
  safeZone: SafeZoneState;
  onOpenSystemWindow: () => void;
  onOpenPartyScreen: () => void;
  onOpenDungeonGate: () => void;
  onCollectActivityFunds: () => void;
}

export const SoloLevelingHub: React.FC<SoloLevelingHubProps> = ({
  inventory,
  party,
  safeZone,
  onOpenSystemWindow,
  onOpenPartyScreen,
  onOpenDungeonGate,
  onCollectActivityFunds,
}) => {
  const [activityFundsAccumulated, setActivityFundsAccumulated] = useState<number>(3850);
  const [fundsCollected, setFundsCollected] = useState<boolean>(false);
  const [infoDeskModal, setInfoDeskModal] = useState<boolean>(false);

  const jinwoo = party.find((c) => c.id === 'jinwoo') || party[0];

  const handleClaimFunds = () => {
    if (fundsCollected || activityFundsAccumulated <= 0) return;
    onCollectActivityFunds();
    setFundsCollected(true);
    sound.playVictory();
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl min-h-[640px] flex flex-col justify-between p-6 select-none font-sans">
      {/* Association Lobby Architecture Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950 pointer-events-none" />

      {/* Cyber/Anime Architectural Elements & Gold Pillars */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px] opacity-15 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-amber-500/20 via-cyan-500/10 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-amber-500/20 via-cyan-500/10 to-transparent pointer-events-none" />

      {/* Top Bar matching Solo Leveling: Arise Lobby Screenshot */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-3">
        {/* Left: Hunter ID & Rank */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold shadow-md shadow-cyan-500/20">
            🗡️
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-rpg font-bold text-white text-sm tracking-wider">
                Hunter-22639053
              </span>
              <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 font-tech font-bold text-[10px] rounded border border-cyan-500/40">
                Lv.{jinwoo.level}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-tech">
              <span>Reputation: Rank 1</span>
              <span>•</span>
              <span className="text-emerald-400">Safe-Zone Citadel Dome</span>
            </div>
          </div>
        </div>

        {/* Center: Activity Funds Tank Notification */}
        <button
          onClick={handleClaimFunds}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-tech transition ${
            !fundsCollected
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/20 animate-pulse'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Activity Funds: {!fundsCollected ? `+${activityFundsAccumulated.toLocaleString()} Gold` : 'Claimed'}
          </span>
        </button>

        {/* Right: Currencies & Notification Icons */}
        <div className="flex items-center gap-4 text-xs font-tech">
          {/* Essence Stones */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-cyan-400 font-bold text-sm">✦</span>
            <span className="font-bold text-white font-tech">{inventory.astralPrisms.toLocaleString()}</span>
          </div>

          {/* Gold Coins */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-amber-300 font-tech">{inventory.stardust.toLocaleString()}</span>
          </div>

          {/* Association Assistant Alert Badge */}
          <div className="relative cursor-pointer p-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700">
            <Mail className="w-4 h-4 text-slate-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
          </div>

          <div className="text-slate-400 font-mono text-[11px] hidden sm:block">
            PM 04:58
          </div>
        </div>
      </div>

      {/* Center 3D/Anime Character Hub View */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-6">
        {/* Hunter In-Lobby Stand Render */}
        <div className="relative flex flex-col items-center">
          {/* Floor Radial Shadow */}
          <div className="absolute -bottom-4 w-56 h-12 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-2 w-44 h-8 bg-black/60 rounded-full pointer-events-none" />

          {/* Character Avatar Showcase */}
          <div className="relative group cursor-pointer" onClick={onOpenSystemWindow}>
            <div className="w-36 h-48 md:w-44 md:h-60 rounded-2xl bg-gradient-to-b from-slate-800/80 via-slate-900/90 to-slate-950 border-2 border-cyan-500/50 flex flex-col items-center justify-center shadow-2xl shadow-cyan-500/20 group-hover:scale-105 transition duration-300 overflow-hidden">
              <span className="text-6xl md:text-7xl mb-2 drop-shadow-[0_0_20px_rgba(56,189,248,0.8)]">
                {jinwoo.avatarIcon}
              </span>
              <span className="font-rpg font-bold text-sm text-white">
                {jinwoo.name}
              </span>
              <span className="text-[11px] text-cyan-400 font-tech">
                [Player System Ready]
              </span>
            </div>

            {/* Floating System Window Prompt Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-cyan-500 text-slate-950 font-bold font-rpg text-[10px] rounded-full shadow-lg shadow-cyan-500/40 animate-bounce">
              OPEN SYSTEM WINDOW
            </div>
          </div>
        </div>

        {/* Association In-World Interactive Markers */}
        <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
          {/* 1. Information Desk */}
          <button
            onClick={() => setInfoDeskModal(true)}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 backdrop-blur-md flex items-center gap-3 transition text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
              ℹ️
            </div>
            <div>
              <span className="font-rpg font-bold text-xs text-white block">
                Information Desk
              </span>
              <span className="text-[10px] text-slate-400 font-tech">
                Chief Woo Jinchul
              </span>
            </div>
          </button>

          {/* 2. Dungeon Gates Portal */}
          <button
            onClick={onOpenDungeonGate}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-rose-500/40 hover:border-rose-500 backdrop-blur-md flex items-center gap-3 transition text-left group shadow-lg shadow-rose-500/10"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
              🚪
            </div>
            <div>
              <span className="font-rpg font-bold text-xs text-rose-300 block">
                Dungeon Gate Portal
              </span>
              <span className="text-[10px] text-slate-400 font-tech">
                Blue & Red Gates
              </span>
            </div>
          </button>

          {/* 3. Strike Team Party */}
          <button
            onClick={onOpenPartyScreen}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/40 hover:border-amber-500 backdrop-blur-md flex items-center gap-3 transition text-left group shadow-lg shadow-amber-500/10"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
              👥
            </div>
            <div>
              <span className="font-rpg font-bold text-xs text-amber-300 block">
                Hunter Strike Team
              </span>
              <span className="text-[10px] text-slate-400 font-tech">
                4-Member Deployment
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Bar: Radar/Compass HUD & Fast Sprint Button (Matching Screenshot 1) */}
      <div className="relative z-10 flex items-end justify-between border-t border-slate-800/80 pt-4">
        {/* Left: Quick Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSystemWindow}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold font-rpg text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition active:scale-95 flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>PLAYER STATUS [JINWOO]</span>
          </button>

          <button
            onClick={onOpenPartyScreen}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-rpg font-bold text-xs rounded-xl transition active:scale-95 flex items-center gap-2"
          >
            <Swords className="w-4 h-4 text-amber-400" />
            <span>HUNTER PARTY (4)</span>
          </button>
        </div>

        {/* Right: Circular Sci-Fi Compass Radar & Sprint Button */}
        <div className="flex items-center gap-4">
          {/* Sprint Action Button */}
          <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-cyan-400/80 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/30 cursor-pointer hover:scale-105 transition">
            🏃
          </div>

          {/* Sci-Fi Circular Radar HUD */}
          <div className="relative w-20 h-20 rounded-full border-2 border-cyan-400/70 bg-slate-900/90 flex items-center justify-center shadow-xl shadow-cyan-500/20 overflow-hidden">
            <div className="absolute inset-1 rounded-full border border-cyan-500/30" />
            <div className="absolute inset-3 rounded-full border border-dashed border-cyan-500/40 animate-spin [animation-duration:20s]" />
            <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-radar-sweep" />
            <Compass className="w-6 h-6 text-cyan-300 relative z-10" />
            <div className="absolute bottom-1 text-[8px] font-mono text-cyan-400 font-bold">
              RADAR
            </div>
          </div>
        </div>
      </div>

      {/* Information Desk Modal */}
      {infoDeskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[10px] text-cyan-400 font-tech uppercase tracking-wider block">
                  Korean Hunters Association
                </span>
                <h3 className="font-rpg font-bold text-lg text-white">
                  Chief Inspector Woo Jinchul
                </h3>
              </div>
              <button
                onClick={() => setInfoDeskModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 font-tech leading-relaxed mb-5">
              "Hunter Sung, your recent re-awakening readings are off the charts. We've detected high-rank Dungeon Gates opening in the subway tunnels and outer ruins. Ensure your 4-member strike team is equipped with Kasaka's venom fang before deploying."
            </p>

            <button
              onClick={() => {
                setInfoDeskModal(false);
                onOpenDungeonGate();
              }}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-rpg text-xs rounded-xl transition"
            >
              PROCEED TO DUNGEON GATES
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

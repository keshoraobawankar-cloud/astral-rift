import React, { useState } from 'react';
import { Character, PlayerInventory, AttributeMatrix } from '../types/game';
import { sound } from '../services/soundService';
import {
  ArrowLeft,
  Coins,
  Sparkles,
  Zap,
  Plus,
  Shield,
  Swords,
  Heart,
  Eye,
  Wind,
  Lock,
  ChevronUp,
} from 'lucide-react';

interface SungJinwooSystemStatusProps {
  hunter: Character;
  inventory: PlayerInventory;
  onAllocateAttribute: (charId: string, attr: keyof AttributeMatrix) => void;
  onEquipWeapon: (weaponId: string) => void;
  onClose: () => void;
}

export const SungJinwooSystemStatus: React.FC<SungJinwooSystemStatusProps> = ({
  hunter,
  inventory,
  onAllocateAttribute,
  onEquipWeapon,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'Basic' | 'Skills' | 'Artifacts'>('Basic');
  const [preset, setPreset] = useState<'01' | '02' | '03'>('01');
  const [availableStatPoints, setAvailableStatPoints] = useState<number>(3); // Unallocated stat points

  const attrs = hunter.attributes;
  const strength = attrs.strength || 34;
  const agility = attrs.agility || 20;
  const vitality = attrs.endurance || 20;
  const intelligence = attrs.intelligence || 10;
  const perception = attrs.perception || 10;

  // Total Combat Power dynamic formula matching Solo Leveling:
  const totalPower = Math.round(
    hunter.attack * 2.5 + hunter.defense * 1.5 + hunter.hp * 0.4 + (strength + agility + vitality + intelligence + perception) * 12
  );

  const handleAllocate = (attr: keyof AttributeMatrix) => {
    if (availableStatPoints <= 0) return;
    setAvailableStatPoints((prev) => prev - 1);
    onAllocateAttribute(hunter.id, attr);
    sound.playHit(true);
  };

  const handleGrantPoints = () => {
    setAvailableStatPoints((prev) => prev + 3);
    sound.playVictory();
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl p-6 select-none font-sans min-h-[660px] flex flex-col justify-between">
      {/* Background Gradient & Star Dust */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#070b14] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      {/* Top Bar matching Solo Leveling Screenshot 3 */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-rpg font-bold text-xs text-white">Sung Jinwoo</span>
          </button>
          <span className="text-slate-500 font-tech">?</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-tech">
          {/* Essence Stones */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span className="text-cyan-400 font-bold text-sm">✦</span>
            <span className="text-white font-mono font-bold">{inventory.astralPrisms.toLocaleString()}</span>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300 font-mono font-bold">{inventory.stardust.toLocaleString()}</span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 bg-slate-900 border border-slate-800 rounded-xl"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main 3-Column Layout Matching Screenshot 3 */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-center">
        {/* Left Column: Circular Attribute Radar & Skills (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-tech uppercase tracking-wider text-slate-400 font-bold">
                Stats Matrix
              </span>
              {availableStatPoints > 0 ? (
                <span className="text-[11px] font-tech text-cyan-400 font-bold bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/40 animate-pulse">
                  Points Available: {availableStatPoints}
                </span>
              ) : (
                <button
                  onClick={handleGrantPoints}
                  className="text-[10px] font-tech text-amber-400 hover:underline"
                >
                  +Level Up Stat Points
                </button>
              )}
            </div>

            {/* Circular Radar / Ring Stat Allocation matching Screenshot 3 */}
            <div className="relative w-56 h-56 mx-auto my-3 flex items-center justify-center">
              {/* Outer Ring */}
              <div className="absolute inset-0 rounded-full border border-cyan-500/30" />
              <div className="absolute inset-4 rounded-full border border-dashed border-cyan-500/40" />

              {/* Center Level Up Button */}
              <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-cyan-400 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/30 text-center">
                <ChevronUp className="w-5 h-5 text-cyan-400" />
                <span className="text-[10px] font-tech text-white font-bold leading-none">
                  {availableStatPoints}
                </span>
              </div>

              {/* 5 Circular Nodes */}
              {/* 1. Strength (Top) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="text-[10px] font-tech text-slate-300 font-semibold">Strength</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-cyan-500/50 px-2 py-0.5 rounded-full shadow-sm">
                  <span className="font-mono text-xs font-bold text-white">{strength}</span>
                  {availableStatPoints > 0 && (
                    <button onClick={() => handleAllocate('strength')} className="text-cyan-400 hover:text-white">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Vitality (Top-Left) */}
              <div className="absolute top-10 left-0 flex flex-col items-center">
                <span className="text-[10px] font-tech text-slate-300 font-semibold">Vitality</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-cyan-500/50 px-2 py-0.5 rounded-full shadow-sm">
                  <span className="font-mono text-xs font-bold text-white">{vitality}</span>
                  {availableStatPoints > 0 && (
                    <button onClick={() => handleAllocate('endurance')} className="text-cyan-400 hover:text-white">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Agility (Top-Right) */}
              <div className="absolute top-10 right-0 flex flex-col items-center">
                <span className="text-[10px] font-tech text-slate-300 font-semibold">Agility</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-cyan-500/50 px-2 py-0.5 rounded-full shadow-sm">
                  <span className="font-mono text-xs font-bold text-white">{agility}</span>
                  {availableStatPoints > 0 && (
                    <button onClick={() => handleAllocate('agility')} className="text-cyan-400 hover:text-white">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Intelligence (Bottom-Left) */}
              <div className="absolute bottom-2 left-4 flex flex-col items-center">
                <span className="text-[10px] font-tech text-slate-300 font-semibold">Intelligence</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-cyan-500/50 px-2 py-0.5 rounded-full shadow-sm">
                  <span className="font-mono text-xs font-bold text-white">{intelligence}</span>
                  {availableStatPoints > 0 && (
                    <button onClick={() => handleAllocate('intelligence')} className="text-cyan-400 hover:text-white">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* 5. Perception (Bottom-Right) */}
              <div className="absolute bottom-2 right-4 flex flex-col items-center">
                <span className="text-[10px] font-tech text-slate-300 font-semibold">Perception</span>
                <div className="flex items-center gap-1 bg-slate-900 border border-cyan-500/50 px-2 py-0.5 rounded-full shadow-sm">
                  <span className="font-mono text-xs font-bold text-white">{perception}</span>
                  {availableStatPoints > 0 && (
                    <button onClick={() => handleAllocate('perception')} className="text-cyan-400 hover:text-white">
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Skills Slots & Blessing Stones below radar */}
          <div className="space-y-3">
            <div>
              <span className="text-xs font-tech uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                Equipped Skills
              </span>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center text-lg shadow-sm">
                  ⚡
                </div>
                <div className="w-11 h-11 rounded-xl bg-slate-900 border border-cyan-500/40 flex items-center justify-center text-lg shadow-sm">
                  🗡️
                </div>
                <div className="w-11 h-11 rounded-xl bg-slate-900 border-2 border-purple-500/70 flex items-center justify-center text-lg shadow-md shadow-purple-500/30">
                  👑
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs font-tech uppercase tracking-wider text-slate-400 font-bold block mb-1.5">
                Blessing Stones
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <div
                    key={num}
                    className="w-8 h-8 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-600 text-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Full Body Sung Jinwoo Stance & Preset Buttons (4 cols) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center h-full">
          {/* Avatar / Shadow Monarch Silhouette */}
          <div className="relative flex flex-col items-center">
            {/* Ethereal Glow */}
            <div className="absolute w-44 h-44 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="w-44 h-64 rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-950 to-black border border-cyan-500/40 flex flex-col items-center justify-center shadow-2xl shadow-cyan-500/20 relative overflow-hidden">
              <span className="text-8xl drop-shadow-[0_0_25px_rgba(56,189,248,0.7)]">
                🗡️
              </span>
              <span className="font-rpg font-bold text-sm text-white mt-2">
                Sung Jinwoo
              </span>
              <span className="text-[10px] text-cyan-400 font-tech">
                Rank: S-Rank Potential
              </span>
            </div>

            {/* Presets 01, 02, 03 matching Screenshot 3 */}
            <div className="flex items-center gap-2 mt-4">
              {(['01', '02', '03'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`px-3 py-1 rounded-lg font-tech text-xs font-bold transition ${
                    preset === p
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Hunter Name, Total Power, Stats & Kasaka's Venom Fang (4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-rpg font-extrabold text-2xl text-white">
                  Sung Jinwoo
                </h3>
                <span className="text-xs text-slate-400 font-tech">
                  Lv. {hunter.level} / 75
                </span>
              </div>

              {/* Class Crest: Assassin */}
              <div className="flex flex-col items-end">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-cyan-500 flex items-center justify-center text-cyan-400 text-lg shadow-md shadow-cyan-500/20">
                  ⚔️
                </div>
                <span className="text-[10px] font-tech text-cyan-300 font-bold mt-1">
                  Assassin
                </span>
              </div>
            </div>

            {/* EXP Bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                style={{ width: `${(hunter.exp / hunter.maxExp) * 100}%` }}
              />
            </div>

            {/* Total Combat Power */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between mb-4">
              <span className="text-xs font-tech uppercase text-slate-400 font-bold">
                Total Power
              </span>
              <span className="font-rpg font-extrabold text-xl text-amber-300 font-mono tracking-wider">
                {totalPower.toLocaleString()}
              </span>
            </div>

            {/* Core Stats Overview */}
            <div className="space-y-1.5 text-xs font-tech bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-emerald-400" /> Stamina
                </span>
                <span className="font-mono font-bold text-white">{hunter.hp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-amber-400" /> Attack
                </span>
                <span className="font-mono font-bold text-white">{hunter.attack}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" /> Defense
                </span>
                <span className="font-mono font-bold text-white">{hunter.defense}</span>
              </div>
            </div>

            {/* Primary Weapon: Kasaka's Venom Fang matching Screenshot 3 */}
            <div>
              <span className="text-xs font-tech uppercase text-slate-400 font-bold block mb-1.5">
                Equipped Weapon
              </span>
              <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/60 rounded-xl p-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-900 border border-purple-500 flex items-center justify-center text-2xl">
                    🗡️
                  </div>
                  <div>
                    <span className="font-rpg font-bold text-xs text-white block">
                      Kasaka's Venom Fang
                    </span>
                    <span className="text-[10px] text-purple-400 font-tech">
                      SR • Water Dagger • Lv. 3
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-tech text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                  PLAYER
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Tabs matching Screenshot 3: Artifacts | Skills | Basic */}
          <div className="flex items-center gap-2 border-t border-slate-800/80 pt-3">
            {(['Artifacts', 'Skills', 'Basic'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 rounded-lg font-rpg font-bold text-xs transition ${
                  activeTab === tab
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Character, AttributeMatrix, PlayerInventory, LootMode } from '../types/game';
import { sound } from '../services/soundService';
import {
  Users,
  Shield,
  Zap,
  Sparkles,
  Eye,
  Wind,
  Hammer,
  Feather,
  Dice5,
  ChevronRight,
  Flame,
  Plus,
  Compass,
  CheckCircle2,
  Lock,
  Sliders,
} from 'lucide-react';
import AttributeAllocator, { AttributeStats } from './AttributeAllocator';

interface PartyRosterProps {
  party: Character[];
  inventory: PlayerInventory;
  onAllocateAttribute: (charId: string, attr: keyof AttributeMatrix) => void;
  onUpdateHeroAttributes?: (charId: string, stats: AttributeStats, totalPower: number) => void;
  onDeployParty: () => void;
  onInspectHero: (charId: string) => void;
  onReturnToPlaza: () => void;
}

export const PartyRoster: React.FC<PartyRosterProps> = ({
  party,
  inventory,
  onAllocateAttribute,
  onUpdateHeroAttributes,
  onDeployParty,
  onInspectHero,
  onReturnToPlaza,
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string>(party[0]?.id || 'elurien');
  const [lootMode, setLootMode] = useState<LootMode>('roll_need_greed');
  const [matrixView, setMatrixView] = useState<'matrix' | 'allocator'>('allocator');
  const [availableAttrPoints, setAvailableAttrPoints] = useState<{ [charId: string]: number }>({
    elurien: 4,
    thorgar: 5,
    faelin: 3,
    kaelen: 4,
    astraea: 4,
    valen: 4,
  });

  const activeChar = party.find((c) => c.id === selectedCharId) || party[0];

  // Agility scaling calculation based on Section 3 of GDD:
  // Dodge I-Frames (ms) = 200 + (Agility * 1.5)
  // Movement Speed = BaseSpeed * (1 + 0.002 * Agility)
  const dodgeIFrames = Math.round(200 + activeChar.attributes.agility * 1.5);
  const movementSpeedModifier = (1 + 0.002 * activeChar.attributes.agility).toFixed(3);
  const trapDetectionRangeMeters = (activeChar.attributes.perception * 0.75).toFixed(1);

  const handleAddPoint = (attr: keyof AttributeMatrix) => {
    const pts = availableAttrPoints[activeChar.id] || 0;
    if (pts <= 0) return;

    sound.playClick();
    onAllocateAttribute(activeChar.id, attr);
    setAvailableAttrPoints((prev) => ({
      ...prev,
      [activeChar.id]: Math.max(0, pts - 1),
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>DYNAMIC 6-PLAYER PARTY • NON-PROTAGONIST STRIKE TEAM</span>
          </div>
          <h1 className="text-3xl font-rpg font-extrabold text-white">
            Party Synergy & Attribute Matrix
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl font-sans">
            Aethelgard rejects rigid holy-trinity class locks in favor of roleless, flexible 6-player strike teams scaling around cross-racial combo links, open attribute matrixes, and shared personal roll distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Loot Mode Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-2xl">
            <Dice5 className="w-4 h-4 text-amber-400" />
            <select
              value={lootMode}
              onChange={(e) => {
                sound.playClick();
                setLootMode(e.target.value as LootMode);
              }}
              className="bg-transparent text-xs font-rpg text-slate-200 outline-none cursor-pointer"
            >
              <option value="roll_need_greed" className="bg-slate-900 text-white">
                Personal Roll (Need / Greed / Pass)
              </option>
              <option value="master_loot" className="bg-slate-900 text-white">
                Master Loot (Guildmaster Assigned)
              </option>
              <option value="free_for_all" className="bg-slate-900 text-white">
                Round-Robin Auto Split
              </option>
            </select>
          </div>

          <button
            onClick={onDeployParty}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-rpg font-extrabold text-sm shadow-xl shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition"
          >
            <span>DEPLOY TO DUNGEON</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6-Player Quick Selector Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {party.map((hero, index) => {
          const isSelected = hero.id === selectedCharId;
          const pts = availableAttrPoints[hero.id] || 0;

          return (
            <button
              key={hero.id}
              onClick={() => {
                sound.playClick();
                setSelectedCharId(hero.id);
              }}
              className={`p-3.5 rounded-3xl border text-left transition relative overflow-hidden group ${
                isSelected
                  ? 'bg-slate-800/90 border-cyan-400/80 shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                  {hero.avatarIcon}
                </span>
                <span
                  className="text-[10px] font-tech font-bold uppercase px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${hero.color}25`,
                    color: hero.accentColor,
                    border: `1px solid ${hero.color}40`,
                  }}
                >
                  {hero.race}
                </span>
              </div>

              <div className="font-rpg font-bold text-xs text-white truncate group-hover:text-cyan-300 transition">
                {hero.name}
              </div>
              <div className="text-[10px] text-slate-400 font-sans truncate">{hero.title}</div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-tech">
                <span className="text-slate-400">Lv.{hero.level}</span>
                {pts > 0 ? (
                  <span className="text-amber-400 font-bold animate-pulse">+{pts} PTS</span>
                ) : (
                  <span className="text-emerald-400">READY</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Hero Detailed Dossier & Attribute Scaling */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Dossier (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Hero Banner Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-inner"
                  style={{ backgroundColor: `${activeChar.color}20`, border: `1px solid ${activeChar.color}50` }}
                >
                  {activeChar.avatarIcon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-rpg font-extrabold text-white">{activeChar.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-tech uppercase font-bold">
                      {activeChar.race} • {activeChar.element}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs font-sans mt-0.5">{activeChar.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-950/70 border border-slate-800 px-4 py-2 rounded-2xl text-right">
                  <div className="text-[10px] font-tech text-slate-400">EQUIPPED WEAPON</div>
                  <div className="text-xs font-rpg font-bold text-amber-300 truncate max-w-[150px]">
                    {activeChar.weaponName}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed font-sans mb-6 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/80">
              {activeChar.lore}
            </p>

            {/* Innate Racial Trait (GDD Section 2) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="font-rpg font-bold text-xs text-white">
                    Innate Racial Advantage: {activeChar.racialTrait.name}
                  </span>
                </div>
                <span className="text-[10px] font-tech font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded">
                  {activeChar.racialTrait.bonusStat}
                </span>
              </div>
              <p className="text-slate-300 text-xs font-sans leading-relaxed">
                {activeChar.racialTrait.description}
              </p>
            </div>

            {/* Combat Agility Scaling Formulas (GDD Section 3) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-rpg font-bold text-slate-300 flex items-center gap-2">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Agility & Mobility Scaling Engine (Blueprint Formulas)</span>
                </span>
                <span className="text-[10px] font-tech text-slate-500">UE5 Movement Component Bound</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-[10px] font-tech text-slate-400">DODGE I-FRAMES</div>
                  <div className="text-lg font-rpg font-extrabold text-cyan-400 mt-0.5">
                    {dodgeIFrames} <span className="text-[10px] font-sans font-normal text-slate-400">ms</span>
                  </div>
                  <div className="text-[9px] font-tech text-slate-500 mt-1">
                    200 + ({activeChar.attributes.agility} × 1.5)
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-[10px] font-tech text-slate-400">SPRINT VELOCITY</div>
                  <div className="text-lg font-rpg font-extrabold text-emerald-400 mt-0.5">
                    ×{movementSpeedModifier}
                  </div>
                  <div className="text-[9px] font-tech text-slate-500 mt-1">
                    Base × (1 + 0.002 × Agi)
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-[10px] font-tech text-slate-400">TRAP / MIMIC SIGHT</div>
                  <div className="text-lg font-rpg font-extrabold text-purple-400 mt-0.5">
                    {trapDetectionRangeMeters} <span className="text-[10px] font-sans font-normal text-slate-400">m</span>
                  </div>
                  <div className="text-[9px] font-tech text-slate-500 mt-1">
                    {activeChar.attributes.perception} Perception
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Skills & Synergy Tags */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur space-y-4">
            <h3 className="font-rpg font-bold text-sm text-white flex items-center justify-between">
              <span>Racial Abilities & Cross-Race Synergy Hooks</span>
              <span className="text-xs font-tech text-cyan-400">GAS Gameplay Ability System</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(activeChar.skills).map(([key, skill]) => (
                <div
                  key={skill.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{skill.icon}</span>
                      <span className="font-rpg font-bold text-xs text-white">{skill.name}</span>
                    </div>
                    <span className="text-[9px] font-tech uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {key}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans line-clamp-2 mt-1">
                    {skill.description}
                  </p>
                  {skill.appliesTag && (
                    <div className="mt-2 inline-block text-[9px] font-tech text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      APPLIES: {skill.appliesTag}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Attribute Matrix & Point Allocator (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Allocator Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => {
                sound.playClick();
                setMatrixView('allocator');
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-rpg font-bold text-xs flex items-center justify-center gap-2 transition ${
                matrixView === 'allocator'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>HUNTER ATTRIBUTES (POWER)</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setMatrixView('matrix');
              }}
              className={`flex-1 py-2 px-3 rounded-xl font-rpg font-bold text-xs flex items-center justify-center gap-2 transition ${
                matrixView === 'matrix'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>QUICK MATRIX (+1)</span>
            </button>
          </div>

          {matrixView === 'allocator' ? (
            <div className="flex justify-center">
              <AttributeAllocator
                characterName={activeChar.name}
                initialStats={{
                  strength: activeChar.attributes.strength,
                  agility: activeChar.attributes.agility,
                  vitality: activeChar.attributes.vitality ?? activeChar.attributes.endurance,
                  intelligence: activeChar.attributes.intelligence,
                  perception: activeChar.attributes.perception,
                }}
                initialPoints={15}
                onConfirmBuild={(stats, power) => {
                  sound.playVictory();
                  if (onUpdateHeroAttributes) {
                    onUpdateHeroAttributes(activeChar.id, stats, power);
                  }
                }}
              />
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-rpg font-bold text-white">Open Attribute Matrix</h3>
                  <p className="text-xs text-slate-400 font-sans">No rigid class locks. Specialize freely.</p>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-right">
                  <div className="text-[9px] font-tech text-cyan-400">AVAILABLE POINTS</div>
                  <div className="text-base font-rpg font-extrabold text-cyan-300">
                    {availableAttrPoints[activeChar.id] || 0}
                  </div>
                </div>
              </div>

              {/* Matrix Attributes */}
              <div className="space-y-3">
                {[
                  {
                    id: 'strength' as const,
                    label: 'Strength',
                    val: activeChar.attributes.strength,
                    impact: '+Physical Atk, Hammer Crushing Power, Destructible Armor Shred',
                    icon: '💪',
                    color: 'text-amber-400',
                  },
                  {
                    id: 'agility' as const,
                    label: 'Agility',
                    val: activeChar.attributes.agility,
                    impact: '+Dodge I-Frames (ms), Sprint Velocity, Climbing Stamina',
                    icon: '⚡',
                    color: 'text-cyan-400',
                  },
                  {
                    id: 'intelligence' as const,
                    label: 'Intelligence',
                    val: activeChar.attributes.intelligence,
                    impact: '+Aether Mana Pool, Spell Precision, Arcane Weaving Quality',
                    icon: '🧠',
                    color: 'text-blue-400',
                  },
                  {
                    id: 'endurance' as const,
                    label: 'Endurance',
                    val: activeChar.attributes.endurance,
                    impact: '+Maximum HP, Base Physical Defense, Well-Rested Buff Scaling',
                    icon: '🛡️',
                    color: 'text-emerald-400',
                  },
                  {
                    id: 'perception' as const,
                    label: 'Perception',
                    val: activeChar.attributes.perception,
                    impact: '+Mimic & Trap Detection Radius, Critical Hit Precision, Rare Loot Rolls',
                    icon: '👁️',
                    color: 'text-purple-400',
                  },
                ].map((attr) => (
                  <div
                    key={attr.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{attr.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-rpg font-bold text-xs text-white">{attr.label}</span>
                          <span className={`font-rpg font-extrabold text-sm ${attr.color}`}>
                            {attr.val}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans line-clamp-1">{attr.impact}</div>
                      </div>
                    </div>

                    <button
                      disabled={(availableAttrPoints[activeChar.id] || 0) <= 0}
                      onClick={() => handleAddPoint(attr.id)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition ${
                        (availableAttrPoints[activeChar.id] || 0) > 0
                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-95 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Cross-Race Synergy Combo Blueprint (GDD Section 3) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-950 to-slate-900 border border-cyan-500/30">
                <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold text-xs uppercase mb-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>CROSS-RACE COMBO LINK BLUEPRINT</span>
                </div>
                <div className="text-xs font-rpg font-bold text-white mb-1">
                  🌪️ Elven Wind Gale + 🔨 Dwarven Earth Shatter
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                  When an Elf ranger or sorceress inflicts <code className="text-cyan-300">Status.Primed.Wind</code>, a heavy Dwarven hammer strike triggers <strong className="text-amber-400">Combo.DustTempest</strong> for 350% bonus AoE damage and stagger!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

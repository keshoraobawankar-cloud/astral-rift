import React, { useState, useEffect } from 'react';
import {
  Castle,
  Swords,
  Shield,
  Hammer,
  Sparkles,
  Skull,
  Eye,
  Dice5,
  Scroll,
  Zap,
  BookOpen,
  Search,
  Crosshair,
  Award,
  Filter,
  CheckCircle2,
  HelpCircle,
  Flame,
  Wind,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { sound } from '../services/soundService';
import { bestiaryService, BestiaryEntry, MonsterLootDrop } from '../services/bestiaryService';

export const CodexLore: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'bestiary' | 'synergy' | 'ecology' | 'crafting' | 'guild' | 'loot'>('bestiary');
  const [bestiaryEntries, setBestiaryEntries] = useState<BestiaryEntry[]>(() => bestiaryService.getAll());
  const [bestiaryStats, setBestiaryStats] = useState(() => bestiaryService.getStats());
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<'all' | 'dungeon' | 'open_world' | 'cavern' | 'world_boss'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'discovered' | 'slain' | 'undiscovered'>('all');
  const [selectedMonsterModal, setSelectedMonsterModal] = useState<BestiaryEntry | null>(null);

  useEffect(() => {
    const unsub = bestiaryService.subscribe(() => {
      setBestiaryEntries(bestiaryService.getAll());
      setBestiaryStats(bestiaryService.getStats());
    });
    return () => unsub();
  }, []);

  const filteredBestiary = bestiaryEntries.filter((m) => {
    // Zone filter
    if (zoneFilter !== 'all' && m.zone !== zoneFilter) return false;

    // Status filter
    if (statusFilter === 'discovered' && !m.encountered) return false;
    if (statusFilter === 'slain' && m.killCount <= 0) return false;
    if (statusFilter === 'undiscovered' && m.encountered) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchHabitat = m.habitat.toLowerCase().includes(q);
      const matchCategory = m.category.toLowerCase().includes(q);
      const matchWeakness = m.weaknesses.some((w) => w.element.toLowerCase().includes(q) || w.description.toLowerCase().includes(q));
      const matchLoot = m.lootTable.some((l) => l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
      return matchName || matchHabitat || matchCategory || matchWeakness || matchLoot;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold text-sm tracking-wider uppercase mb-1">
          <Scroll className="w-4 h-4" />
          <span>VANGUARD COMPENDIUM & FIELD ARCHIVES</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-rpg font-extrabold text-white tracking-wide">
          Non-Protagonist MMORPG Codex
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-2xl font-sans">
          Deep tactical archives documenting Hunter Bestiary entries, Guild Estates, dynamic party synergy combos, living dungeon ecology, and racial forge masteries.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-4">
        {[
          { id: 'bestiary', label: "Hunter's Bestiary & Loot", icon: Skull, highlight: true },
          { id: 'synergy', label: 'Dynamic Party Synergy', icon: Swords },
          { id: 'ecology', label: 'Dungeon Ecology & Monsters', icon: Layers },
          { id: 'crafting', label: 'Dwarven & Elven Crafting', icon: Hammer },
          { id: 'guild', label: 'Guild Halls & Charters', icon: Castle },
          { id: 'loot', label: 'Shared Loot & Rolling', icon: Dice5 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setActiveCategory(tab.id as typeof activeCategory);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-rpg font-bold text-sm transition relative ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.highlight && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500/30 text-amber-300 rounded font-tech font-bold border border-amber-500/40">
                  LIVE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Panels */}
      {activeCategory === 'bestiary' && (
        <div className="space-y-6">
          {/* Bestiary Overview & Stats Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <Skull className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-rpg font-bold text-white tracking-wide">Hunter's Tactical Bestiary</h2>
                  <p className="text-xs text-purple-400 font-tech">
                    ACTIVE ARCHIVE OF DISCOVERED SPECIES, ELEMENTAL WEAKNESSES, & LOOT DROP PROBABILITIES
                  </p>
                </div>
              </div>

              {/* Live Hunter Tracking Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 font-tech uppercase">Discovered</div>
                  <div className="text-lg font-rpg font-bold text-cyan-400">
                    {bestiaryStats.discoveredCount} / {bestiaryStats.totalMonsters}
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 font-tech uppercase">Species Slain</div>
                  <div className="text-lg font-rpg font-bold text-amber-400">
                    {bestiaryStats.defeatedCount} / {bestiaryStats.totalMonsters}
                  </div>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 font-tech uppercase">Total Kills</div>
                  <div className="text-lg font-rpg font-bold text-rose-400">
                    ⚔️ {bestiaryStats.totalKills}
                  </div>
                </div>
              </div>
            </div>

            {/* Bestiary Completion Progress Bar */}
            <div className="space-y-1.5 mb-6">
              <div className="flex justify-between text-xs font-tech">
                <span className="text-slate-400">Vanguard Bestiary Decryption Progress</span>
                <span className="text-cyan-400 font-bold">{bestiaryStats.completionRate}% COMPLETE</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-cyan-500 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${bestiaryStats.completionRate}%` }}
                />
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col lg:flex-row gap-3 pt-4 border-t border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by monster name, weakness, resistance, or loot..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              {/* Zone Filter */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'All Zones' },
                  { id: 'dungeon', label: 'Dungeons' },
                  { id: 'open_world', label: 'Open World' },
                  { id: 'cavern', label: 'Subterranean Cavern' },
                  { id: 'world_boss', label: 'World Bosses' },
                ].map((z) => (
                  <button
                    key={z.id}
                    onClick={() => setZoneFilter(z.id as typeof zoneFilter)}
                    className={`px-3 py-1.5 text-xs font-rpg font-semibold rounded-lg transition ${
                      zoneFilter === z.id
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex gap-1.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'discovered', label: 'Discovered' },
                  { id: 'slain', label: 'Slain' },
                  { id: 'undiscovered', label: 'Hidden' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id as typeof statusFilter)}
                    className={`px-2.5 py-1.5 text-xs font-tech font-bold rounded-lg transition ${
                      statusFilter === s.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Monster Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBestiary.map((monster) => {
              const isDiscovered = monster.encountered;
              const isSlain = monster.killCount > 0;

              if (!isDiscovered) {
                return (
                  <div
                    key={monster.id}
                    className="relative bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 overflow-hidden flex flex-col justify-between opacity-80 hover:opacity-100 transition group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/5 to-slate-950/90 pointer-events-none" />
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl text-slate-600 font-rpg">
                          ❓
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-tech font-bold bg-slate-900 text-slate-500 border border-slate-800">
                          ZONE: {monster.zone.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-lg font-rpg font-bold text-slate-400 mb-1">
                        Unknown Entity
                      </h3>
                      <p className="text-xs text-slate-500 font-tech uppercase mb-3">
                        CLASSIFICATION ENCRYPTED
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Encounter this monster in the wilderness, dungeon, or subterranean cavern to decipher its elemental weaknesses and unlock its complete loot table.
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 text-[11px] text-purple-400 font-tech flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Reported habitat: {monster.habitat}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={monster.id}
                  onClick={() => setSelectedMonsterModal(monster)}
                  className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-cyan-950/30 cursor-pointer group relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20"
                    style={{ backgroundColor: monster.color }}
                  />

                  <div>
                    {/* Top Header Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-13 h-13 rounded-2xl flex items-center justify-center text-3xl border shadow-lg"
                          style={{
                            backgroundColor: `${monster.color}25`,
                            borderColor: monster.color,
                          }}
                        >
                          {monster.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-tech font-bold text-cyan-400 uppercase">
                              LVL {monster.level}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-tech uppercase">
                              {monster.element}
                            </span>
                          </div>
                          <h3 className="text-lg font-rpg font-bold text-white group-hover:text-cyan-300 transition">
                            {monster.name}
                          </h3>
                        </div>
                      </div>

                      {/* Kill Status Badge */}
                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-tech font-bold border ${
                          isSlain
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                            : 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                        }`}
                      >
                        {isSlain ? `⚔️ ${monster.killCount} SLAIN` : '⚠️ DISCOVERED'}
                      </span>
                    </div>

                    <div className="text-xs text-purple-300 font-tech mb-2">
                      {monster.title} • {monster.habitat}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-2">
                      {monster.description}
                    </p>

                    {/* Elemental Weaknesses Section */}
                    <div className="mb-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <div className="text-[10px] font-tech font-bold text-rose-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-rose-400" />
                        <span>Elemental Weaknesses</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {monster.weaknesses.map((w, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/50 border border-rose-500/40 text-[11px] font-tech text-rose-200"
                          >
                            <span className="font-bold text-rose-300">{w.element}</span>
                            <span className="text-amber-400 font-bold">{w.multiplier}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Resistances Section */}
                    {monster.resistances.length > 0 && (
                      <div className="mb-4 flex items-center gap-1.5 text-[11px] font-tech text-slate-400">
                        <Shield className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500">Resistant to:</span>
                        <span className="text-slate-300">{monster.resistances.join(', ')}</span>
                      </div>
                    )}

                    {/* Loot Table Preview */}
                    <div className="border-t border-slate-800 pt-3">
                      <div className="flex items-center justify-between text-[11px] font-tech text-slate-400 mb-2">
                        <span className="text-amber-400 font-bold">LOOT TABLE & DROP RATES</span>
                        <span className="text-slate-500">{monster.lootTable.length} drops</span>
                      </div>
                      <div className="space-y-1.5">
                        {monster.lootTable.slice(0, 3).map((item, idx) => {
                          const rarityColors: Record<string, string> = {
                            common: 'text-slate-300 border-slate-700 bg-slate-900',
                            uncommon: 'text-emerald-400 border-emerald-800 bg-emerald-950/40',
                            rare: 'text-sky-400 border-sky-800 bg-sky-950/40',
                            epic: 'text-purple-400 border-purple-800 bg-purple-950/40',
                            legendary: 'text-amber-400 border-amber-800 bg-amber-950/40',
                          };
                          return (
                            <div key={idx} className="flex items-center justify-between text-xs font-sans">
                              <span className="text-slate-200 truncate pr-2 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  item.rarity === 'legendary' ? 'bg-amber-400' :
                                  item.rarity === 'epic' ? 'bg-purple-400' :
                                  item.rarity === 'rare' ? 'bg-sky-400' :
                                  item.rarity === 'uncommon' ? 'bg-emerald-400' : 'bg-slate-400'
                                }`} />
                                {item.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-400"
                                    style={{ width: `${item.dropChance}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] text-cyan-300 font-bold min-w-[28px] text-right">
                                  {item.dropChance}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-tech text-cyan-400 group-hover:text-cyan-300">
                    <span>Inspect Full Tactical Analysis</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inspect Monster Modal */}
          {selectedMonsterModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setSelectedMonsterModal(null)}
                  className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                >
                  ✕
                </button>

                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl border"
                    style={{
                      backgroundColor: `${selectedMonsterModal.color}30`,
                      borderColor: selectedMonsterModal.color,
                    }}
                  >
                    {selectedMonsterModal.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-tech font-bold text-cyan-400 uppercase">
                        LEVEL {selectedMonsterModal.level}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-tech uppercase">
                        {selectedMonsterModal.element}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-tech uppercase border border-purple-800">
                        {selectedMonsterModal.category}
                      </span>
                    </div>
                    <h2 className="text-2xl font-rpg font-bold text-white">{selectedMonsterModal.name}</h2>
                    <p className="text-xs text-slate-400 font-tech">{selectedMonsterModal.title}</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs font-tech text-cyan-400 uppercase font-bold mb-1">Ecology & Habitat</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{selectedMonsterModal.description}</p>
                    <div className="mt-2 text-[11px] text-slate-400 font-tech">
                      📍 Primary Location: <strong className="text-white">{selectedMonsterModal.habitat}</strong>
                    </div>
                  </div>

                  {/* Tactical Combat Advice */}
                  <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40">
                    <div className="text-xs font-rpg text-cyan-300 font-bold mb-1 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-cyan-400" />
                      <span>Hunter Tactical Advice</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{selectedMonsterModal.tacticalTip}</p>
                  </div>

                  {/* Weaknesses & Resistances */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="text-xs font-tech text-rose-400 uppercase font-bold mb-2 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Vulnerabilities</span>
                      </div>
                      <div className="space-y-2">
                        {selectedMonsterModal.weaknesses.map((w, i) => (
                          <div key={i} className="text-xs">
                            <div className="flex justify-between font-tech mb-0.5">
                              <span className="font-bold text-rose-300">{w.element}</span>
                              <span className="text-amber-400 font-bold">{w.multiplier} DMG</span>
                            </div>
                            <p className="text-[11px] text-slate-400">{w.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="text-xs font-tech text-slate-400 uppercase font-bold mb-2 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Resistances</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {selectedMonsterModal.resistances.map((r, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-tech text-slate-300"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-400 font-tech">
                        Total Hunter Kills: <strong className="text-emerald-400">{selectedMonsterModal.killCount}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Full Loot Table */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="text-xs font-tech text-amber-400 uppercase font-bold mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Full Loot Drop Rates & Reagents</span>
                    </div>
                    <div className="space-y-2.5">
                      {selectedMonsterModal.lootTable.map((item, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-rpg font-bold text-xs text-white flex items-center gap-2">
                              <span>{item.name}</span>
                              <span className={`text-[10px] uppercase font-tech px-1.5 py-0.2 rounded border ${
                                item.rarity === 'legendary' ? 'text-amber-400 border-amber-800 bg-amber-950' :
                                item.rarity === 'epic' ? 'text-purple-400 border-purple-800 bg-purple-950' :
                                item.rarity === 'rare' ? 'text-sky-400 border-sky-800 bg-sky-950' :
                                item.rarity === 'uncommon' ? 'text-emerald-400 border-emerald-800 bg-emerald-950' :
                                'text-slate-400 border-slate-800 bg-slate-950'
                              }`}>
                                {item.rarity}
                              </span>
                            </span>
                            <span className="text-xs font-mono font-bold text-cyan-400">{item.dropChance}% CHANCE</span>
                          </div>
                          <p className="text-[11px] text-slate-400">{item.description}</p>
                          <div className="w-full h-1 bg-slate-950 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-cyan-400" style={{ width: `${item.dropChance}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeCategory === 'synergy' && (
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-rpg font-bold text-white">Roleless Flexible Parties (Up to 6 Players)</h2>
                <p className="text-xs text-cyan-400 font-tech">DYNAMIC COMBO CHAINING WITHOUT RIGID CLASS LOCKS</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              In Aethelgard, party members are not locked into conventional rigid roles. Instead, abilities interact dynamically across races and elements. When heroes time their skills together, they create emergent battlefield anomalies.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40">
                <div className="flex items-center gap-2 text-cyan-300 font-rpg font-bold mb-2">
                  <span className="text-lg">🌪️ + 🔨</span>
                  <span>Signature Combo: "Shockwave Tempest"</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  An <strong className="text-cyan-300">Elf Sorceress</strong> casts a broad AoE wind spell (<em className="text-white">Zephyr Tempest Vortex</em>), gathering mobs and priming them with the <code className="text-cyan-400">Status.Primed.Wind</code> tag. A <strong className="text-amber-400">Dwarf Warrior</strong> then delivers a heavy runic hammer ground slam (<em className="text-white">Tectonic Ground Slam</em>). The impact absorbs the vortex, detonating an immense <strong>Shockwave Tempest</strong> dealing +350% bonus AoE damage and knocking all enemies flat!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40">
                <div className="flex items-center gap-2 text-purple-300 font-rpg font-bold mb-2">
                  <span className="text-lg">🧚‍♀️ + 🐺</span>
                  <span>Scouting Combo: "Stardust Ambush Flush"</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  A <strong className="text-purple-300">Fairy Scout</strong> emits luminous fae dust that exposes hidden mimics and illuminates disguised goblin tripwires. A <strong className="text-orange-400">Beastkin Rogue</strong> instantly dashes through the lines, neutralizing the traps and recovering any potions stolen during earlier encounters.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'ecology' && (
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                <Skull className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-rpg font-bold text-white">Living Dungeon Ecology & Monster Biomes</h2>
                <p className="text-xs text-rose-400 font-tech">DYNAMIC BEHAVIORS, HIT-AND-RUN TACTICS, & WEAKNESS HARVESTING</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-rpg font-bold text-emerald-400 flex items-center gap-2">
                    <span>👺 Goblins & Shamans</span>
                  </h3>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">Swarm Tacticians</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                  Goblins use narrow subterranean tunnels for hit-and-run tactics. They plant concealed tripwire traps that root players and attempt to snatch dropped potions. Goblin Shamans channel toxic hexes and drop <strong>Rare Alchemical Herbs</strong> when defeated.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-rpg font-bold text-amber-400 flex items-center gap-2">
                    <span>🗿 Stone Golems & Bosses</span>
                  </h3>
                  <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded">Destructible Armor</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                  Slow, heavily armored monoliths guarding deep dungeon vaults. Features destructible <strong>Armor Plates</strong> that mitigate standard strikes. Heavy Dwarven hammer attacks crack these plates, exposing the core and allowing smiths to harvest <strong>Golem Slag Alloy & Cores</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-rpg font-bold text-purple-400 flex items-center gap-2">
                    <span>💀 Undead & Abominations</span>
                  </h3>
                  <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-800 px-2 py-0.5 rounded">Mana Drain Debuff</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                  Inhabiting cursed lower catacombs, these horrors radiate a continuous <strong>Mana Drain</strong> aura, siphoning energy from spellcasters. Requires careful positioning from Elven sorcerers or protective wards from holy paladins.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-rpg font-bold text-cyan-400 flex items-center gap-2">
                    <span>📦 Trap-Weavers & Mimics</span>
                  </h3>
                  <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">Perception Check</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                  Cunning environmental predators disguised as decorative chests or architectural statues. Heroes with high <strong>Perception</strong> (like Fairy scouts) reveal their true form before players open them, preventing surprise fatal bites.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'crafting' && (
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Hammer className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-rpg font-bold text-white">Racial Specializations: Dwarven Forge & Elven Weaving</h2>
                <p className="text-xs text-amber-400 font-tech">ADVANCED METALLURGY & ARCANE LOOM FABRICATION</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                <h3 className="text-base font-rpg font-bold text-amber-300 flex items-center gap-2 mb-2">
                  <span>🔨 Dwarven Forge Mastery</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Dwarves can set up mobile field forges inside dungeon safe-rooms or manage permanent workshops in safe-zone cities. Using harvested golem ores and refined mana crystals, weapons can be tempered with custom elemental traits:
                </p>
                <ul className="text-xs space-y-2 text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span><strong>Glacial Frost-Burn:</strong> Slows enemy attack speed by 30% and deals frost ticks.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span><strong>Mana Siphon Edge:</strong> Siphons 8 energy per strike to fund party burst skills.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span><strong>Tectonic Core:</strong> +25% bonus shatter against Golem armor plates.</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
                <h3 className="text-base font-rpg font-bold text-cyan-300 flex items-center gap-2 mb-2">
                  <span>🧝‍♀️ Elven Arcane Weaving</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Elves specialize in weaving raw monster drops (fairy dust, spirit wood, beastkin hides) into high-tier staves, magical robes, and enchanted ammunition scaling with Intelligence and Agility:
                </p>
                <ul className="text-xs space-y-2 text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span><strong>Sylph Zephyr Robe:</strong> Amplifies Wind AoE radius and Intelligence scaling.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span><strong>Arch-Druid Gale Spire:</strong> Rapid spellcasting haste with chain gale pulses.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span><strong>Starlight Striders:</strong> Featherlight fae boots offering complete immunity to tripwires.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'guild' && (
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Castle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-rpg font-bold text-white">Guild Halls & Charter System</h2>
                <p className="text-xs text-indigo-400 font-tech">SAFE-ZONE ESTATES, VAULTS, & TIER-WIDE PASSIVE PERKS</p>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Players pool resources within safe-zone cities (like the Citadel of Oakhaven) to purchase and customize Guild Estates. These estates act as private spawn points, shared storage vaults, and dedicated crafting workshops.
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-amber-400 font-rpg font-bold text-sm mb-1">🏰 Private Spawn Point</div>
                <p className="text-xs text-slate-400">
                  Resurrect safely in your estate without penalty. Removes wilderness fatigue and grants a +15% Well-Rested EXP bonus.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-cyan-400 font-rpg font-bold text-sm mb-1">📦 Shared Storage Vault</div>
                <p className="text-xs text-slate-400">
                  Pool golem alloys, herbs, and goblin leather across guild members for coordinated charter upgrades.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-emerald-400 font-rpg font-bold text-sm mb-1">🌟 Tier Passive Perks</div>
                <p className="text-xs text-slate-400">
                  Progressing charter tiers unlocks perks like <strong>+5% Crafting Speed for Dwarves</strong> and <strong>+10% Mana Regen for Elves</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'loot' && (
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Dice5 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-rpg font-bold text-white">Shared Loot & Instance Distribution</h2>
                <p className="text-xs text-amber-400 font-tech">PERSONAL ROLLS, MASTER LOOT, & NEED/GREED D100 SYSTEM</p>
              </div>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              When adventuring in party dungeons, the party leader configures loot rules to ensure fair distribution of rare drops like Golem Core Fragments, pristine Goblin Leather, and ancient runes:
            </p>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="font-rpg font-bold text-sm text-cyan-300 mb-1">🎲 Personal Roll (Default)</div>
                <p className="text-xs text-slate-400">
                  Every player receives an individual loot drop rolled against their own drop rates, eliminating loot disputes.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="font-rpg font-bold text-sm text-amber-300 mb-1">👑 Master Loot</div>
                <p className="text-xs text-slate-400">
                  Party leader or Guildmaster directly designates high-tier boss spoils to the member who benefits most.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="font-rpg font-bold text-sm text-rose-300 mb-1">⚖️ Need vs. Greed (D100)</div>
                <p className="text-xs text-slate-400">
                  Class/racial match priorities roll 1-100. High-need items go to Elves (cloth/staves) or Dwarves (alloys/hammers) first.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

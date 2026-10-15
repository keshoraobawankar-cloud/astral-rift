import React, { useState } from 'react';
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
} from 'lucide-react';
import { sound } from '../services/soundService';

export const CodexLore: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<'guild' | 'synergy' | 'ecology' | 'crafting' | 'loot'>('synergy');

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
          Deep tactical archives documenting Guild Estates, dynamic party synergy combos, living dungeon ecology, and racial forge masteries.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-800 pb-4">
        {[
          { id: 'synergy', label: 'Dynamic Party Synergy', icon: Swords },
          { id: 'ecology', label: 'Dungeon Ecology & Monsters', icon: Skull },
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-rpg font-bold text-sm transition ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Panels */}
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

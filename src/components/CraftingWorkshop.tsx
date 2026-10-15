import React, { useState } from 'react';
import { PlayerInventory, Weapon, Character } from '../types/game';
import { DWARVEN_TEMPERING_RECIPES, ELVEN_WEAVING_RECIPES } from '../data/guildData';
import { sound } from '../services/soundService';
import {
  Hammer,
  Sparkles,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Lock,
  Layers,
  Wind,
  Feather,
} from 'lucide-react';

interface CraftingWorkshopProps {
  inventory: PlayerInventory;
  party: Character[];
  onTemperWeapon: (weaponId: string, traitName: string) => void;
  onCraftWeaveItem: () => void;
}

export const CraftingWorkshop: React.FC<CraftingWorkshopProps> = ({
  inventory,
  party,
  onTemperWeapon,
  onCraftWeaveItem,
}) => {
  const [activeTab, setActiveTab] = useState<'dwarf_forge' | 'elf_loom'>('dwarf_forge');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(inventory.weapons[0]?.id || '');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedWeapon = inventory.weapons.find((w) => w.id === selectedWeaponId);

  const handleTemper = (recipeId: string, traitName: string) => {
    const recipe = DWARVEN_TEMPERING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !selectedWeapon) return;

    if (
      inventory.golemAlloy < recipe.cost.golemAlloy ||
      inventory.manaCrystals < recipe.cost.manaCrystals ||
      inventory.stardust < recipe.cost.stardust
    ) {
      return;
    }

    sound.playCraftSuccess();
    onTemperWeapon(selectedWeapon.id, traitName);
    setSuccessToast(`⚒️ Successfully Tempered ${selectedWeapon.name} with ${traitName}!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleWeave = (recipeName: string) => {
    sound.playLootRoll();
    onCraftWeaveItem();
    setSuccessToast(`✨ Woven ${recipeName}! Added to party equipment cache.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-slate-950 px-5 py-3 rounded-2xl shadow-2xl font-rpg font-bold flex items-center gap-2 border border-amber-300 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-slate-950" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Workshop Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-tech font-bold text-xs uppercase tracking-wider mb-1">
            <Hammer className="w-4 h-4" />
            <span>RACIAL ARTISAN WORKSHOPS</span>
          </div>
          <h1 className="text-3xl font-rpg font-extrabold text-white">
            Dwarven Forge & Elven Arcane Loom
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl font-sans">
            Harness high-grade golem alloys, refined mana crystals, and beastkin monster drops to temper weapons and weave enchanted robes.
          </p>
        </div>

        {/* Material Pills */}
        <div className="flex flex-wrap gap-2 text-xs font-tech bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded-xl text-amber-300 border border-slate-800">
            <span>🧱 Golem Alloy:</span>
            <strong className="text-white">{inventory.golemAlloy}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded-xl text-cyan-300 border border-slate-800">
            <span>💎 Mana Crystals:</span>
            <strong className="text-white">{inventory.manaCrystals}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded-xl text-purple-300 border border-slate-800">
            <span>✨ Fairy Dust:</span>
            <strong className="text-white">{inventory.fairyDust}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded-xl text-emerald-300 border border-slate-800">
            <span>🛡️ Goblin Leather:</span>
            <strong className="text-white">{inventory.goblinLeather}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950 rounded-xl text-amber-400 border border-slate-800">
            <span>🌿 Spirit Wood:</span>
            <strong className="text-white">{inventory.spiritWood}</strong>
          </div>
        </div>
      </div>

      {/* Workshop Navigation Tabs */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('dwarf_forge');
          }}
          className={`flex-1 py-3 px-5 rounded-2xl font-rpg font-bold text-sm transition flex items-center justify-center gap-2 border ${
            activeTab === 'dwarf_forge'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-500/50 shadow-lg shadow-amber-600/30'
              : 'bg-slate-900/70 text-slate-400 hover:text-white border-slate-800'
          }`}
        >
          <Hammer className="w-4 h-4 text-amber-300" />
          <span>Dwarven Forge Mastery (Weapon Tempering)</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('elf_loom');
          }}
          className={`flex-1 py-3 px-5 rounded-2xl font-rpg font-bold text-sm transition flex items-center justify-center gap-2 border ${
            activeTab === 'elf_loom'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-500/50 shadow-lg shadow-cyan-600/30'
              : 'bg-slate-900/70 text-slate-400 hover:text-white border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>Elven Arcane Weaving (Monster Drop Loom)</span>
        </button>
      </div>

      {/* TAB 1: Dwarven Forge Mastery */}
      {activeTab === 'dwarf_forge' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Weapon Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
            <h2 className="text-sm font-rpg font-bold text-slate-300 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Select Weapon to Temper</span>
            </h2>

            <div className="space-y-3">
              {inventory.weapons.map((w) => {
                const isSelected = w.id === selectedWeaponId;
                return (
                  <div
                    key={w.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedWeaponId(w.id);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/60 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-rpg font-bold text-sm text-white">{w.name}</span>
                      <span className="text-[10px] bg-slate-900 text-amber-400 px-2 py-0.5 rounded font-tech">
                        {w.type}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center justify-between font-tech">
                      <span>ATK: {w.baseAtk}</span>
                      {w.temperingTrait ? (
                        <span className="text-amber-300 font-bold">✨ {w.temperingTrait}</span>
                      ) : (
                        <span className="text-slate-500">Untempered</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tempering Recipes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-rpg font-bold text-white flex items-center gap-2">
                    <span>Elemental Tempering Inscriptions</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    Infuse {selectedWeapon ? selectedWeapon.name : 'weapon'} with permanent runic traits harvested from golem cores.
                  </p>
                </div>
                <div className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-xl font-rpg">
                  Dwarven Craft Perk: +5% Speed
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {DWARVEN_TEMPERING_RECIPES.map((recipe) => {
                  const canAfford =
                    inventory.golemAlloy >= recipe.cost.golemAlloy &&
                    inventory.manaCrystals >= recipe.cost.manaCrystals &&
                    inventory.stardust >= recipe.cost.stardust;

                  const isApplied = selectedWeapon?.temperingTrait === recipe.name;

                  return (
                    <div
                      key={recipe.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between ${
                        isApplied
                          ? 'bg-amber-950/30 border-amber-400'
                          : 'bg-slate-950/80 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="font-rpg font-bold text-sm text-amber-300">
                            {recipe.name}
                          </h3>
                          {isApplied && (
                            <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                          {recipe.description}
                        </p>

                        <div className="text-xs text-cyan-300 font-tech font-bold mb-3 bg-cyan-950/30 border border-cyan-800/40 p-2 rounded-xl">
                          Bonus: {recipe.statBonus}
                        </div>
                      </div>

                      <div>
                        {/* Cost list */}
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-tech mb-3">
                          <span className={inventory.golemAlloy >= recipe.cost.golemAlloy ? 'text-amber-400' : 'text-rose-400'}>
                            Alloy: {recipe.cost.golemAlloy}
                          </span>
                          <span className={inventory.manaCrystals >= recipe.cost.manaCrystals ? 'text-cyan-400' : 'text-rose-400'}>
                            Crystals: {recipe.cost.manaCrystals}
                          </span>
                          <span className={inventory.stardust >= recipe.cost.stardust ? 'text-amber-300' : 'text-rose-400'}>
                            Gold: {recipe.cost.stardust}
                          </span>
                        </div>

                        <button
                          disabled={!canAfford || !selectedWeapon || isApplied}
                          onClick={() => handleTemper(recipe.id, recipe.name)}
                          className={`w-full py-2.5 rounded-xl font-rpg font-bold text-xs transition flex items-center justify-center gap-2 ${
                            isApplied
                              ? 'bg-slate-800 text-slate-500 cursor-default'
                              : canAfford
                              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:brightness-110 shadow-md'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Hammer className="w-3.5 h-3.5" />
                          <span>{isApplied ? 'Trait Equipped' : canAfford ? 'Temper Weapon' : 'Insufficient Materials'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Elven Arcane Weaving */}
      {activeTab === 'elf_loom' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-rpg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Elven Arcane Weaving Loom</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Weave raw drops from dungeon goblins, shamans, and forest beasts into enchanted robes, staves, and ammunition.
              </p>
            </div>
            <div className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-xl font-rpg">
              Elven Trait: INT & AGI Scaling
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ELVEN_WEAVING_RECIPES.map((recipe) => {
              const canAfford =
                inventory.goblinLeather >= recipe.cost.goblinLeather &&
                inventory.fairyDust >= recipe.cost.fairyDust &&
                inventory.spiritWood >= recipe.cost.spiritWood &&
                inventory.alchemicalHerbs >= recipe.cost.alchemicalHerbs;

              return (
                <div
                  key={recipe.id}
                  className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-rpg font-bold text-sm text-cyan-300">
                        {recipe.name}
                      </h3>
                      <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded font-tech">
                        {recipe.type}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                      {recipe.description}
                    </p>

                    <div className="text-xs text-amber-300 font-tech font-bold mb-4 bg-slate-900 p-2 rounded-xl border border-slate-800">
                      Stats: {recipe.stats}
                    </div>

                    <div className="text-xs text-slate-400 font-tech mb-4 space-y-1">
                      <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Required Drops:</div>
                      <div className="flex items-center justify-between">
                        <span>Goblin Leather:</span>
                        <span className={inventory.goblinLeather >= recipe.cost.goblinLeather ? 'text-emerald-400' : 'text-rose-400'}>
                          {recipe.cost.goblinLeather}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Fairy Dust:</span>
                        <span className={inventory.fairyDust >= recipe.cost.fairyDust ? 'text-purple-400' : 'text-rose-400'}>
                          {recipe.cost.fairyDust}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Spirit Wood:</span>
                        <span className={inventory.spiritWood >= recipe.cost.spiritWood ? 'text-amber-400' : 'text-rose-400'}>
                          {recipe.cost.spiritWood}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Alchemical Herbs:</span>
                        <span className={inventory.alchemicalHerbs >= recipe.cost.alchemicalHerbs ? 'text-emerald-300' : 'text-rose-400'}>
                          {recipe.cost.alchemicalHerbs}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!canAfford}
                    onClick={() => handleWeave(recipe.name)}
                    className={`w-full py-2.5 rounded-xl font-rpg font-bold text-xs transition flex items-center justify-center gap-2 ${
                      canAfford
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:brightness-110 shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{canAfford ? 'Weave Relic' : 'Need Drops'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

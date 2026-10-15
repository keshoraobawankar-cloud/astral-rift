import React, { useState } from 'react';
import { Realm, RealmNode } from '../types/game';
import { sound } from '../services/soundService';
import {
  Compass,
  Swords,
  ShieldAlert,
  Crown,
  Sparkles,
  ChevronRight,
  Lock,
  CheckCircle2,
  Zap,
  Skull,
  Coins,
} from 'lucide-react';

interface StellarMapProps {
  realms: Realm[];
  activeRealmId: string;
  onSelectRealm: (realmId: string) => void;
  onSelectNode: (node: RealmNode) => void;
}

export const StellarMap: React.FC<StellarMapProps> = ({
  realms,
  activeRealmId,
  onSelectRealm,
  onSelectNode,
}) => {
  const currentRealm = realms.find((r) => r.id === activeRealmId) || realms[0];
  const [selectedNode, setSelectedNode] = useState<RealmNode>(currentRealm.nodes[0] || null);

  const handleNodeClick = (node: RealmNode) => {
    sound.playClick();
    setSelectedNode(node);
  };

  const handleLaunchCombat = () => {
    if (!selectedNode) return;
    sound.playLootRoll();
    onSelectNode(selectedNode);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-tech font-bold text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>SUBTERRANEAN EXPEDITIONS & GATES</span>
          </div>
          <h1 className="text-3xl font-rpg font-extrabold text-white">
            {currentRealm.name}
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl font-sans">
            {currentRealm.description}
          </p>
        </div>

        {/* Realm Selector Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {realms.map((realm) => {
            const isSelected = realm.id === currentRealm.id;
            return (
              <button
                key={realm.id}
                onClick={() => {
                  sound.playClick();
                  onSelectRealm(realm.id);
                  if (realm.nodes.length > 0) setSelectedNode(realm.nodes[0]);
                }}
                className={`px-4 py-2.5 rounded-2xl font-rpg font-bold text-xs transition whitespace-nowrap border ${
                  isSelected
                    ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-lg shadow-rose-950/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {realm.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Node Grid Map */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-rpg font-bold text-slate-300 flex items-center gap-2">
              <Swords className="w-4 h-4 text-rose-400" />
              <span>Dungeon Sub-Levels & Chambers</span>
            </h2>
            <span className="text-xs text-slate-500 font-tech">Click a chamber to inspect details</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {currentRealm.nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-rose-950/50 via-slate-950 to-slate-900 border-rose-500 shadow-xl shadow-rose-500/20'
                      : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] bg-slate-900 text-rose-300 px-2.5 py-0.5 rounded-full border border-slate-800 font-tech font-bold uppercase">
                        {node.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-tech font-bold text-amber-400">
                        PWR: {node.recommendedPower}
                      </span>
                    </div>

                    <h3 className="font-rpg font-bold text-base text-white mb-2 leading-tight">
                      {node.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {node.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-tech text-slate-400">
                      <span>Monsters:</span>
                      <strong className="text-slate-200">{node.enemies?.length || 2}</strong>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-rose-400 font-rpg font-bold">
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Chamber Briefing & Launch Panel */}
        {selectedNode && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between backdrop-blur">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-xl font-rpg font-bold uppercase">
                  {selectedNode.type.replace('_', ' ')}
                </span>
                <span className="text-xs font-tech text-amber-400 font-bold">
                  Recommended Power: {selectedNode.recommendedPower}
                </span>
              </div>

              <h2 className="text-xl font-rpg font-extrabold text-white mb-2">
                {selectedNode.name}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6 font-sans">
                {selectedNode.description}
              </p>

              {/* Ecology & Enemy Roster Preview */}
              <div className="mb-6">
                <h3 className="text-xs font-rpg font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-rose-400" />
                  <span>Dungeon Inhabitants</span>
                </h3>

                <div className="space-y-2">
                  {selectedNode.enemies?.map((enemy, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span>
                          {enemy.type === 'goblin' || enemy.type === 'goblin_shaman'
                            ? '👺'
                            : enemy.type === 'golem'
                            ? '🗿'
                            : enemy.type === 'mimic'
                            ? '📦'
                            : '💀'}
                        </span>
                        <span className="font-rpg font-bold text-white">{enemy.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-amber-400 font-tech font-bold">Lv. {enemy.level}</span>
                        <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-cyan-400 uppercase font-tech">
                          {enemy.element}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected Drops */}
              <div className="mb-6">
                <h3 className="text-xs font-rpg font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Harvestable Crafting Drops</span>
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs font-tech">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-amber-300">Gold:</span>
                    <strong className="text-white">+{selectedNode.rewards.stardust}</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-cyan-400">Essence:</span>
                    <strong className="text-white">+{selectedNode.rewards.prisms}</strong>
                  </div>

                  {selectedNode.rewards.craftingMaterials && (
                    <>
                      {selectedNode.rewards.craftingMaterials.goblinLeather && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-emerald-400">Goblin Hide:</span>
                          <strong className="text-white">+{selectedNode.rewards.craftingMaterials.goblinLeather}</strong>
                        </div>
                      )}
                      {selectedNode.rewards.craftingMaterials.golemAlloy && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-amber-400">Golem Slag:</span>
                          <strong className="text-white">+{selectedNode.rewards.craftingMaterials.golemAlloy}</strong>
                        </div>
                      )}
                      {selectedNode.rewards.craftingMaterials.alchemicalHerbs && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-emerald-300">Shaman Herbs:</span>
                          <strong className="text-white">+{selectedNode.rewards.craftingMaterials.alchemicalHerbs}</strong>
                        </div>
                      )}
                      {selectedNode.rewards.craftingMaterials.fairyDust && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-purple-400">Fairy Dust:</span>
                          <strong className="text-white">+{selectedNode.rewards.craftingMaterials.fairyDust}</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <button
              onClick={handleLaunchCombat}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 hover:brightness-110 text-white font-rpg font-extrabold text-sm tracking-wide shadow-xl shadow-rose-600/30 transition flex items-center justify-center gap-2 group cursor-pointer"
            >
              <Swords className="w-5 h-5 group-hover:scale-110 transition" />
              <span>ENTER DUNGEON EXPEDITION</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

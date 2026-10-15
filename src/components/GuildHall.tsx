import React, { useState } from 'react';
import { GuildEstate, PlayerInventory, Character } from '../types/game';
import { sound } from '../services/soundService';
import {
  Castle,
  ShieldCheck,
  Hammer,
  Sparkles,
  Archive,
  Crown,
  ChevronRight,
  TrendingUp,
  Coins,
  CheckCircle2,
  Lock,
  Layers,
  Users,
} from 'lucide-react';

interface GuildHallProps {
  guild: GuildEstate;
  inventory: PlayerInventory;
  party: Character[];
  onUpgradeCharterTier: () => void;
  onUpgradeRoom: (roomId: string) => void;
  onDepositMaterial: (mat: keyof GuildEstate['treasury'], amount: number) => void;
}

export const GuildHall: React.FC<GuildHallProps> = ({
  guild,
  inventory,
  party,
  onUpgradeCharterTier,
  onUpgradeRoom,
  onDepositMaterial,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'perks' | 'rooms'>('overview');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleDeposit = (mat: keyof GuildEstate['treasury'], amount: number) => {
    sound.playLootRoll();
    onDepositMaterial(mat, amount);
    setSuccessToast(`Deposited ${amount} ${mat} into Guild Treasury!`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleRoomUpgrade = (roomId: string, roomName: string) => {
    sound.playCraftSuccess();
    onUpgradeRoom(roomId);
    setSuccessToast(`🏰 Upgraded ${roomName}! Estate benefits boosted.`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-slate-950 px-5 py-3 rounded-2xl shadow-2xl font-rpg font-bold flex items-center gap-2 border border-amber-300 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-slate-950" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Guild Estate Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-4xl shadow-lg">
              🏰
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-rpg font-extrabold text-white">
                  {guild.name}
                </h1>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-rpg font-bold">
                  Tier {guild.charterTier}: {guild.tierName}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-tech mt-1 flex items-center gap-2">
                <span>📍 Safe-Zone City:</span>
                <strong className="text-emerald-400">{guild.cityLocation}</strong>
                <span>•</span>
                <span>Private Spawn & Shared Storage Vault Active</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sound.playLevelUp();
                onUpgradeCharterTier();
                setSuccessToast('🌟 Guild Charter Tier Elevated! New perks unlocked.');
                setTimeout(() => setSuccessToast(null), 3500);
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-600 to-orange-600 hover:brightness-110 text-white font-rpg font-bold text-xs tracking-wide shadow-lg shadow-amber-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              <span>Elevate Charter Tier</span>
            </button>
          </div>
        </div>

        {/* Treasury Resource Counter Bar */}
        <div className="relative z-10 mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-tech">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-amber-400 block mb-1">🪙 Guild Gold:</span>
            <strong className="text-white text-base font-mono">{guild.treasury.stardust.toLocaleString()}</strong>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-cyan-400 block mb-1">💎 Mana Crystals:</span>
            <strong className="text-white text-base font-mono">{guild.treasury.manaCrystals}</strong>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-amber-300 block mb-1">🧱 Golem Alloy:</span>
            <strong className="text-white text-base font-mono">{guild.treasury.golemAlloy}</strong>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-emerald-400 block mb-1">🛡️ Goblin Leather:</span>
            <strong className="text-white text-base font-mono">{guild.treasury.goblinLeather}</strong>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-purple-400 block mb-1">🌿 Spirit Wood:</span>
            <strong className="text-white text-base font-mono">{guild.treasury.spiritWood}</strong>
          </div>
        </div>
      </div>

      {/* Estate Tabs */}
      <div className="flex gap-2 mb-8 border-b border-slate-800 pb-3">
        {[
          { id: 'overview', label: 'Estate Overview & Rooms', icon: Castle },
          { id: 'vault', label: 'Shared Storage Vault', icon: Archive },
          { id: 'perks', label: 'Charter Tier Perks', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setActiveTab(tab.id as typeof activeTab);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-rpg font-bold text-xs transition border ${
                isActive
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Estate Overview & Rooms */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {guild.rooms.map((room) => {
              const canAfford =
                guild.treasury.stardust >= room.cost.stardust &&
                guild.treasury.golemAlloy >= room.cost.golemAlloy &&
                guild.treasury.spiritWood >= room.cost.spiritWood &&
                guild.treasury.manaCrystals >= room.cost.manaCrystals;

              return (
                <div
                  key={room.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-rpg font-bold text-base text-white">{room.name}</h3>
                      <span className="text-xs bg-slate-950 text-amber-400 border border-slate-800 px-2.5 py-0.5 rounded-full font-tech font-bold">
                        Level {room.level} / {room.maxLevel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      {room.description}
                    </p>

                    <div className="text-xs text-cyan-300 font-tech font-bold bg-cyan-950/30 border border-cyan-800/40 p-2.5 rounded-xl mb-4">
                      ✨ Active Benefit: {room.benefit}
                    </div>

                    {/* Room Upgrade Cost */}
                    <div className="text-xs text-slate-400 font-tech mb-4 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Upgrade Materials Required:</div>
                      <div className="flex items-center gap-3">
                        <span className={guild.treasury.stardust >= room.cost.stardust ? 'text-amber-400' : 'text-rose-400'}>
                          Gold: {room.cost.stardust}
                        </span>
                        <span className={guild.treasury.golemAlloy >= room.cost.golemAlloy ? 'text-amber-300' : 'text-rose-400'}>
                          Alloy: {room.cost.golemAlloy}
                        </span>
                        <span className={guild.treasury.manaCrystals >= room.cost.manaCrystals ? 'text-cyan-400' : 'text-rose-400'}>
                          Crystals: {room.cost.manaCrystals}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!canAfford}
                    onClick={() => handleRoomUpgrade(room.id, room.name)}
                    className={`w-full py-2.5 rounded-xl font-rpg font-bold text-xs transition flex items-center justify-center gap-2 ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:brightness-110 shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>{canAfford ? 'Upgrade Room' : 'Pool Materials to Upgrade'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Shared Storage Vault */}
      {activeTab === 'vault' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-rpg font-bold text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-400" />
                <span>Guild Shared Vault Storage</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Pool rare boss alloys, pristine goblin leather, and alchemical herbs with fellow clan members.
              </p>
            </div>
            <span className="text-xs bg-slate-950 text-cyan-400 border border-slate-800 px-3 py-1 rounded-xl font-tech">
              Capacity: 28 / 50 Slots
            </span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guild.vaultItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3.5"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-rpg font-bold text-xs text-white">{item.name}</span>
                    <span className="text-xs font-mono font-bold text-amber-400">x{item.count}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Charter Tier Perks */}
      {activeTab === 'perks' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-rpg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Tier-Wide Passive Perks</span>
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Progressing guild ranking tiers grants passive buffs to Dwarven, Elven, and party members.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {guild.perks.map((perk) => (
              <div
                key={perk.id}
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  perk.active
                    ? 'bg-amber-950/20 border-amber-500/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${perk.active ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-600'}`}>
                    {perk.active ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-rpg font-bold text-sm ${perk.active ? 'text-white' : 'text-slate-400'}`}>
                        {perk.title}
                      </span>
                      <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded font-tech text-amber-400">
                        Tier {perk.unlockedAtTier}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 font-sans">{perk.description}</p>
                  </div>
                </div>

                <span className={`text-xs font-rpg font-bold px-3 py-1 rounded-xl ${perk.active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-slate-600'}`}>
                  {perk.active ? 'ACTIVE' : 'LOCKED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

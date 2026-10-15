import React, { useState } from 'react';
import { PlayerInventory, Character, SafeZoneState } from '../types/game';
import { OAKHAVEN_NPCS, HIDDEN_QUESTS } from '../data/aethelgardWorld';
import { sound } from '../services/soundService';
import {
  ShoppingBag,
  MessageSquare,
  Shield,
  Coins,
  Sparkles,
  CheckCircle2,
  Volume2,
} from 'lucide-react';

interface CitadelBazaarNPCProps {
  inventory: PlayerInventory;
  party: Character[];
  safeZone: SafeZoneState;
  onBuyManaPotion: (cost: number) => void;
  onUnlockHiddenQuest: () => void;
}

export const CitadelBazaarNPC: React.FC<CitadelBazaarNPCProps> = ({
  inventory,
  party,
  safeZone,
  onBuyManaPotion,
  onUnlockHiddenQuest,
}) => {
  const [selectedNpcId, setSelectedNpcId] = useState<string>(OAKHAVEN_NPCS[0].id);
  const [dialogueText, setDialogueText] = useState<string>(OAKHAVEN_NPCS[0].greeting);
  const [activeQuest, setActiveQuest] = useState(HIDDEN_QUESTS[0]);

  const activeNpc = OAKHAVEN_NPCS.find((npc) => npc.id === selectedNpcId) || OAKHAVEN_NPCS[0];

  const handleSelectNpc = (npcId: string) => {
    sound.playClick();
    setSelectedNpcId(npcId);
    const npc = OAKHAVEN_NPCS.find((n) => n.id === npcId);
    if (npc) {
      setDialogueText(npc.greeting);
      speakVoice(npc.greeting, npc.voicePitch);
    }
  };

  const speakVoice = (text: string, pitch: number) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = pitch;
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Voice synthesis handled safely
      }
    }
  };

  const handleOptionClick = (optionText: string, intent: string) => {
    sound.playClick();
    if (intent === 'bargain') {
      const response = `${activeNpc.name}: "Very well! You can purchase pure Mana Potions here for 150 Gold each to sustain Elven spells in deep crypts."`;
      setDialogueText(response);
      speakVoice(response, activeNpc.voicePitch);
    } else if (intent === 'lore') {
      const response = `${activeNpc.name}: "Remember, in the labyrinth, combine Elurien's wind vortex with Thorgar's runic hammer to trigger a Shockwave Tempest. It can shatter even the thickest golem armor!"`;
      setDialogueText(response);
      speakVoice(response, activeNpc.voicePitch);
    } else {
      setDialogueText(`${activeNpc.name}: "The Guild Vault in Oakhaven is the safest sanctuary on the continent. Rest well, hero."`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold text-xs uppercase tracking-wider mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>SAFE-ZONE CITY • CITADEL OF OAKHAVEN</span>
          </div>
          <h1 className="text-3xl font-rpg font-extrabold text-white">
            Grand Artisan Bazaar & Guild Outpost
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl font-sans">
            Consult Dwarven forge masters, Elven weavers, and quartermasters to trade materials, procure provisions, and accept expedition bounties.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-4 py-2 rounded-2xl text-emerald-300 font-rpg text-xs">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Safe-Zone Sanctuary: PVP & Ambush Prohibited</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* NPC Selector List */}
        <div className="space-y-4">
          <h2 className="text-sm font-rpg font-bold text-slate-300">City NPCs & Guild Masters</h2>
          <div className="space-y-3">
            {OAKHAVEN_NPCS.map((npc) => {
              const isSelected = npc.id === selectedNpcId;
              return (
                <div
                  key={npc.id}
                  onClick={() => handleSelectNpc(npc.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-center gap-3.5 ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner">
                    {npc.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-rpg font-bold text-sm text-white">{npc.name}</span>
                      <span className="text-[10px] bg-slate-950 text-cyan-400 px-2 py-0.5 rounded font-tech">
                        Rep: {npc.memory.reputation}
                      </span>
                    </div>
                    <p className="text-xs text-amber-400 font-tech font-semibold">{npc.role}</p>
                    <p className="text-[11px] text-slate-500 font-sans">{npc.location}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Merchant Provisions */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 mt-6">
            <h3 className="font-rpg font-bold text-sm text-white mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-cyan-400" />
              <span>Provisions & Supply Stall</span>
            </h3>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧪</span>
                <div>
                  <div className="text-xs font-rpg font-bold text-white">Refined Mana Elixir</div>
                  <div className="text-[10px] text-slate-400">Restores 100% Mana & Energy in dungeons</div>
                </div>
              </div>

              <button
                disabled={inventory.stardust < 150}
                onClick={() => onBuyManaPotion(150)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-tech font-bold text-xs flex items-center gap-1 shadow-md disabled:bg-slate-800 disabled:text-slate-600"
              >
                <Coins className="w-3 h-3 text-amber-300" />
                <span>150 Gold</span>
              </button>
            </div>
          </div>
        </div>

        {/* NPC Dialogue Box */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-3xl">
                {activeNpc.avatar}
              </div>
              <div>
                <h2 className="text-lg font-rpg font-bold text-white flex items-center gap-2">
                  <span>{activeNpc.name}</span>
                  <Volume2
                    onClick={() => speakVoice(dialogueText, activeNpc.voicePitch)}
                    className="w-4 h-4 text-cyan-400 cursor-pointer hover:scale-110 transition"
                  />
                </h2>
                <p className="text-xs text-amber-400 font-tech">{activeNpc.role} • {activeNpc.location}</p>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-2xl p-5 border border-slate-800/80 mb-6">
              <p className="text-sm text-slate-200 leading-relaxed font-sans italic">
                "{dialogueText}"
              </p>
            </div>

            {/* Interactive Options */}
            <div>
              <div className="text-xs font-rpg font-bold text-slate-400 mb-2 uppercase tracking-wider">
                Dialogue Inquiries:
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {activeNpc.dialogueTree.start.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionClick(opt.text, opt.intent)}
                    className="text-left px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 text-xs font-rpg font-medium text-slate-300 hover:text-white transition flex items-center justify-between"
                  >
                    <span>{opt.text}</span>
                    <span className="text-[10px] text-cyan-400 font-tech uppercase">{opt.intent}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Dungeon Bounties */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-rpg font-bold text-sm text-white flex items-center gap-2">
                <span>📜 Safe-Zone Guild Notice Board</span>
              </h3>
              <span className="text-xs text-amber-400 font-tech font-bold">+2,500 Gold Bounty</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-rpg font-bold text-xs text-amber-300">{activeQuest.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{activeQuest.hint}</p>
              </div>
              <button
                onClick={() => {
                  sound.playLootRoll();
                  onUnlockHiddenQuest();
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white rounded-xl text-xs font-rpg font-bold shadow-md"
              >
                Track Bounty
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

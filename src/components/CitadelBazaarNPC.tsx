import React, { useState, useEffect, useRef } from 'react';
import { PlayerInventory, Character, SafeZoneState } from '../types/game';
import { OAKHAVEN_NPCS, HIDDEN_QUESTS } from '../data/aethelgardWorld';
import { sound } from '../services/soundService';
import { AffinityManager } from '../services/affinityManager';
import { AffinityEventType, RelationshipTierInfo } from '../types/affinity';
import {
  ShoppingBag,
  MessageSquare,
  Shield,
  Coins,
  Sparkles,
  CheckCircle2,
  Volume2,
  Mic,
  MicOff,
  Radio,
  FileCode,
  Compass,
  AlertTriangle,
  Heart,
  Award,
  Zap,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Gift,
  BookOpen,
} from 'lucide-react';
import { BazaarChatAndLeaderboard } from './BazaarChatAndLeaderboard';

interface CitadelBazaarNPCProps {
  inventory: PlayerInventory;
  party: Character[];
  safeZone: SafeZoneState;
  affinityManager: AffinityManager;
  onRecordAffinityEvent: (npcId: string, eventType: AffinityEventType, reason?: string) => void;
  onResetAffinity: (npcId: string) => void;
  onBuyManaPotion: (cost: number) => void;
  onUnlockHiddenQuest: () => void;
}

export const CitadelBazaarNPC: React.FC<CitadelBazaarNPCProps> = ({
  inventory,
  party,
  safeZone,
  affinityManager,
  onRecordAffinityEvent,
  onResetAffinity,
  onBuyManaPotion,
  onUnlockHiddenQuest,
}) => {
  const [selectedNpcId, setSelectedNpcId] = useState<string>(OAKHAVEN_NPCS[0].id);
  const [activeQuest, setActiveQuest] = useState(HIDDEN_QUESTS[0]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [showMemoryJson, setShowMemoryJson] = useState<boolean>(false);
  const [lastEventToast, setLastEventToast] = useState<{ text: string; positive: boolean } | null>(null);

  const recognitionRef = useRef<any>(null);
  const activeNpc = OAKHAVEN_NPCS.find((npc) => npc.id === selectedNpcId) || OAKHAVEN_NPCS[0];
  const activeHero = party[0] || { name: 'Elurien', race: 'elf' };

  // Current relationship status from AffinityManager
  const relRecord = affinityManager.getRecord(selectedNpcId);
  const tierInfo: RelationshipTierInfo = affinityManager.getTier(selectedNpcId);

  // Initialize dialogue with tone & tier influence
  const [dialogueText, setDialogueText] = useState<string>(() => {
    const styled = affinityManager.influenceDialogue(
      selectedNpcId,
      activeNpc.greeting,
      activeNpc.name,
      activeHero.name
    );
    return styled.dialogue;
  });

  // Re-flavor dialogue whenever NPC or relationship tier changes
  useEffect(() => {
    const styled = affinityManager.influenceDialogue(
      selectedNpcId,
      activeNpc.greeting,
      activeNpc.name,
      activeHero.name
    );
    setDialogueText(styled.dialogue);
  }, [selectedNpcId, relRecord.compositeScore]);

  // Setup Web Speech API for Feature C: Speech-to-Text
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = false;
        recog.lang = 'en-US';

        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setVoiceTranscript(transcript);
          handleVoiceQuery(transcript);
          setIsListening(false);
        };

        recog.onerror = () => {
          setIsListening(false);
        };

        recog.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recog;
      }
    }
  }, [selectedNpcId]);

  const handleToggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      sound.playClick();
      setVoiceTranscript('Listening... Speak now');
      setIsListening(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // If mic permissions unavailable, simulate sample query
          setTimeout(() => {
            const sample = 'Tell me about the hidden golem vaults and Dwarven runes';
            setVoiceTranscript(sample);
            handleVoiceQuery(sample);
            setIsListening(false);
          }, 2000);
        }
      } else {
        setTimeout(() => {
          const sample = 'Where can I find rare golem alloys for weapon tempering?';
          setVoiceTranscript(sample);
          handleVoiceQuery(sample);
          setIsListening(false);
        }, 1500);
      }
    }
  };

  const speakVoice = (text: string, pitch: number) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = pitch;
        utterance.rate = 1.02;
        window.speechSynthesis.speak(utterance);
      } catch {
        // Voice synthesis handled safely
      }
    }
  };

  const handleSelectNpc = (npcId: string) => {
    sound.playClick();
    setSelectedNpcId(npcId);
    const npc = OAKHAVEN_NPCS.find((n) => n.id === npcId);
    if (npc) {
      const styled = affinityManager.influenceDialogue(
        npcId,
        npc.greeting,
        npc.name,
        activeHero.name
      );
      setDialogueText(styled.dialogue);
      speakVoice(styled.dialogue, npc.voicePitch);
    }
  };

  // Process query with Affinity Tier context
  const handleVoiceQuery = (query: string) => {
    sound.playLevelUp();
    const lower = query.toLowerCase();
    let baseReply = '';

    if (lower.includes('golem') || lower.includes('alloy') || lower.includes('armor')) {
      baseReply = 'The stone golems in the Foundry have interlocking runic armor plates. Shatter them with a Dwarven runic hammer to harvest rare Golem Alloy for weapon tempering!';
      onUnlockHiddenQuest();
      onRecordAffinityEvent(selectedNpcId, 'lore_discussed', 'Inquired deeply about Golem armor mechanics');
    } else if (lower.includes('synergy') || lower.includes('wind') || lower.includes('combo')) {
      baseReply = 'When an Elf inflicts Status.Primed.Wind, have your Dwarf strike within 3 seconds with Earth Shatter. The resulting Dust Tempest will stagger the entire chamber!';
      onRecordAffinityEvent(selectedNpcId, 'lore_discussed', 'Discussed elemental wind & earth combo mechanics');
    } else if (lower.includes('potion') || lower.includes('mana') || lower.includes('toxicity')) {
      baseReply = 'Caution with those mana potions! Each adds +35 Toxicity. Exceed 100 and Mana Sickness sets in, penalizing your agility and increasing spell mana costs for 20 seconds!';
    } else if (lower.includes('tier 2') || lower.includes('array') || lower.includes('teleport')) {
      baseReply = 'The Ancient Teleportation Array in the plaza requires 4 boss runes. Socket them to stream the sky-continents of The Floating Expanse!';
    } else {
      baseReply = `I hear you, ${activeHero.name}. The leylines outside the Aegis Dome are turbulent today. Step carefully beyond the city gates.`;
    }

    const styled = affinityManager.influenceDialogue(
      selectedNpcId,
      baseReply,
      activeNpc.name,
      activeHero.name
    );
    setDialogueText(styled.dialogue);
    speakVoice(styled.dialogue, activeNpc.voicePitch);
  };

  const handleOptionClick = (_optionText: string, intent: string) => {
    sound.playClick();
    let base = '';
    if (intent === 'bargain') {
      base = `You can purchase pure Mana Potions here. At your relationship tier (${tierInfo.label}), current rate is ${Math.round(150 * tierInfo.priceMultiplier)} Gold.`;
    } else if (intent === 'lore') {
      base = "In the labyrinth, combine Elurien's wind vortex with Thorgar's runic hammer to trigger a Shockwave Tempest. It can shatter even the thickest golem armor!";
      onRecordAffinityEvent(selectedNpcId, 'lore_discussed', 'Engaged with ancient battle tactics');
    } else {
      base = 'The Guild Vault in Oakhaven is the safest sanctuary on the continent. Rest well, hero.';
    }

    const styled = affinityManager.influenceDialogue(
      selectedNpcId,
      base,
      activeNpc.name,
      activeHero.name
    );
    setDialogueText(styled.dialogue);
    speakVoice(styled.dialogue, activeNpc.voicePitch);
  };

  // Trigger structured Affinity event actions
  const triggerEvent = (eventType: AffinityEventType, label: string) => {
    sound.playClick();
    onRecordAffinityEvent(selectedNpcId, eventType);

    const isPositive = !['haggled_rudely', 'insult_provocation', 'betrayal', 'failed_quest'].includes(eventType);
    setLastEventToast({
      text: `${label} applied to ${activeNpc.name}`,
      positive: isPositive,
    });
    setTimeout(() => setLastEventToast(null), 3000);
  };

  const basePotionCost = 150;
  const dynamicPotionCost = Math.max(50, Math.round(basePotionCost * tierInfo.priceMultiplier));

  const promptInjectionContext = affinityManager.buildPromptInjection(selectedNpcId, activeHero.name);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>CITADEL COMMERCE & GUILD ENVOYS</span>
          </div>
          <h1 className="text-3xl font-rpg font-extrabold text-white">
            Grand Artisan Bazaar & Merchant Envoys
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl font-sans">
            Engage with Citadel merchant guilds, discuss ancient lore, barter for rare provisions, and cultivate long-term merchant standing across biomes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMemoryJson(!showMemoryJson)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-tech text-cyan-400 hover:text-white"
          >
            <BookOpen className="w-4 h-4" />
            <span>{showMemoryJson ? 'Hide Merchant Ledger' : 'Merchant Standing & Diplomatic Ledger'}</span>
          </button>

          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-4 py-2 rounded-2xl text-emerald-300 font-rpg text-xs">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Sanctuary Aegis: Combat Prohibited</span>
          </div>
        </div>
      </div>

      {/* Diplomatic Standing & Merchant History Drawer */}
      {showMemoryJson && (
        <div className="mb-6 p-4 rounded-3xl bg-slate-950 border border-cyan-500/40 text-xs font-mono text-cyan-300">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="font-tech font-bold uppercase text-slate-300">
              Citadel Diplomatic Ledger • Active Standing & Tone
            </span>
            <span className="text-[10px] text-slate-500">Recorded commercial and dialogue standing</span>
          </div>
          <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            {promptInjectionContext}
          </pre>
        </div>
      )}

      {/* Toast Notification */}
      {lastEventToast && (
        <div
          className={`mb-4 p-3 rounded-2xl border text-xs font-tech font-bold flex items-center justify-between animate-fade-in ${
            lastEventToast.positive
              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
              : 'bg-rose-950/80 border-rose-500 text-rose-300'
          }`}
        >
          <span>{lastEventToast.positive ? '✦ ' : '⚠️ '} {lastEventToast.text}</span>
          <span>Tier: {tierInfo.tier}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: NPC Selector & Relationship Meters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <h2 className="text-sm font-rpg font-bold text-slate-300">Citadel NPCs & Relationship Standing</h2>

          <div className="space-y-3">
            {OAKHAVEN_NPCS.map((npc) => {
              const isSelected = npc.id === selectedNpcId;
              const npcRecord = affinityManager.getRecord(npc.id);
              const npcTier = affinityManager.getTier(npc.id);

              return (
                <div
                  key={npc.id}
                  onClick={() => handleSelectNpc(npc.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5 mb-2.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-inner shrink-0">
                      {npc.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-rpg font-bold text-sm text-white">{npc.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-tech font-bold ${npcTier.bgColor} ${npcTier.color} border ${npcTier.borderColor}`}>
                          {npcTier.tier}
                        </span>
                      </div>
                      <p className="text-xs text-amber-400 font-tech font-semibold">{npc.role}</p>
                    </div>
                  </div>

                  {/* Dual Meters: Affinity & Trust */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[10px] font-tech">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400" />
                        <span>Affinity (Bond):</span>
                      </span>
                      <span className="text-slate-200 font-bold">{npcRecord.affinity > 0 ? `+${npcRecord.affinity}` : npcRecord.affinity}</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (npcRecord.affinity + 100) / 2))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-cyan-400" />
                        <span>Trust (Respect):</span>
                      </span>
                      <span className="text-slate-200 font-bold">{npcRecord.trust > 0 ? `+${npcRecord.trust}` : npcRecord.trust}</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (npcRecord.trust + 100) / 2))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Merchant Provisions with Tier Pricing */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-rpg font-bold text-sm text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                <span>Citadel Provision Counter</span>
              </h3>
              <span className={`text-[10px] font-tech font-bold px-2 py-0.5 rounded ${tierInfo.bgColor} ${tierInfo.color}`}>
                {tierInfo.priceMultiplier}x Tariff
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧪</span>
                <div>
                  <div className="text-xs font-rpg font-bold text-white">Refined Mana Elixir</div>
                  <div className="text-[10px] text-slate-400">{tierInfo.tradePerk}</div>
                </div>
              </div>

              <button
                disabled={inventory.stardust < dynamicPotionCost}
                onClick={() => onBuyManaPotion(dynamicPotionCost)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-tech font-bold text-xs flex items-center gap-1 shadow-md disabled:bg-slate-800 disabled:text-slate-600 transition"
              >
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                <span>{dynamicPotionCost} Gold</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Active Dialogue & Voice Console (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden backdrop-blur space-y-6">
            {/* Header: Persona & Status Tier */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-3xl">
                  {activeNpc.avatar}
                </div>
                <div>
                  <h2 className="text-lg font-rpg font-bold text-white flex items-center gap-2">
                    <span>{activeNpc.name}</span>
                    <button
                      onClick={() => speakVoice(dialogueText, activeNpc.voicePitch)}
                      title="Replay Voice Synthesis (TTS)"
                      className="p-1 rounded-md text-cyan-400 hover:text-white hover:bg-slate-800 transition"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </h2>
                  <p className="text-xs text-amber-400 font-tech">{activeNpc.role} • {activeNpc.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {/* Active Tier Pill */}
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-tech font-bold ${tierInfo.bgColor} ${tierInfo.color} ${tierInfo.borderColor} flex items-center gap-1.5`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{tierInfo.label}</span>
                </div>

                {/* Push-to-Talk Microphone Button */}
                <button
                  onClick={handleToggleListening}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-rpg font-bold text-xs transition shadow-xl ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 active:scale-95'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Listening...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Voice STT</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Transcript Banner */}
            {voiceTranscript && (
              <div className="p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-tech text-cyan-300 flex items-center gap-2">
                <Radio className="w-4 h-4 animate-spin" />
                <span>Transcribed Voice Input: <strong>"{voiceTranscript}"</strong></span>
              </div>
            )}

            {/* Tone Directives Bar */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-sans flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="text-cyan-400 font-tech font-bold uppercase">Behavioral Directive:</span>
                <span className="italic">{tierInfo.tone}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Score: {relRecord.compositeScore}/100
              </span>
            </div>

            {/* NPC Spoken Dialogue Output */}
            <div className="bg-slate-950/90 rounded-2xl p-6 border border-slate-800/80 relative">
              <p className="text-sm md:text-base text-slate-200 leading-relaxed font-sans">
                {dialogueText}
              </p>
            </div>

            {/* Interactive Weighted Event Triggers */}
            <div className="space-y-2">
              <div className="text-xs font-rpg font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Intra-Party Relationship Actions (Weighted Matrix):</span>
                <button
                  onClick={() => onResetAffinity(selectedNpcId)}
                  className="text-[10px] font-tech text-slate-500 hover:text-cyan-400 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Standing</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => triggerEvent('gift_offered', 'Offered Masterwork Gift')}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 text-xs font-tech text-purple-300 flex items-center gap-1.5 transition"
                >
                  <Gift className="w-3.5 h-3.5 text-purple-400" />
                  <span>Offer Gift (+16 / +4)</span>
                </button>

                <button
                  onClick={() => triggerEvent('lore_discussed', 'Discussed Leyline Lore')}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 text-xs font-tech text-cyan-300 flex items-center gap-1.5 transition"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Discuss Lore (+8 / +6)</span>
                </button>

                <button
                  onClick={() => triggerEvent('quest_completed', 'Solved Crisis')}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 text-xs font-tech text-emerald-300 flex items-center gap-1.5 transition"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Guild Pact (+14 / +24)</span>
                </button>

                <button
                  onClick={() => triggerEvent('flattery_given', 'Offered Flattery')}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-pink-950/40 border border-slate-800 hover:border-pink-500/50 text-xs font-tech text-pink-300 flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>Flatter (+10 / -4)</span>
                </button>

                <button
                  onClick={() => triggerEvent('haggled_rudely', 'Haggled Rudely')}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 text-xs font-tech text-amber-300 flex items-center gap-1.5 transition"
                >
                  <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Haggle (-14 / -8)</span>
                </button>

                <button
                  onClick={() => triggerEvent('insult_provocation', 'Provoked NPC')}
                  className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/50 text-xs font-tech text-rose-300 flex items-center gap-1.5 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Provoke (-28 / -14)</span>
                </button>
              </div>
            </div>

            {/* Contextual Dialogue Buttons */}
            <div>
              <div className="text-xs font-rpg font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                <span>Inquiries & Direct Questions:</span>
                <span className="text-[10px] font-tech text-cyan-400">Triggers Dynamic Dialogue Changes</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {[
                  { text: 'How do you crack a Stone Golem’s armor plates?', intent: 'lore' },
                  { text: 'Explain the Potion Toxicity & Mana Sickness rules.', intent: 'toxicity' },
                  { text: 'How does Wind Gale link into Dwarven Earth Shatter?', intent: 'synergy' },
                  { text: 'Tell me how to activate the Ancient Teleportation Array.', intent: 'tier2' },
                ].map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleVoiceQuery(opt.text)}
                    className="text-left px-4 py-3 rounded-xl bg-slate-950 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/40 text-xs font-rpg font-medium text-slate-300 hover:text-white transition flex items-center justify-between"
                  >
                    <span>{opt.text}</span>
                    <span className="text-[10px] text-cyan-400 font-tech uppercase">{opt.intent}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Hidden Quest Tracker */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-rpg font-bold text-sm text-white flex items-center gap-2">
                <span>📜 Dynamic Hidden Quest (Zero Map Markers)</span>
              </h3>
              <span className="text-xs text-amber-400 font-tech font-bold">+2,500 Gold & Array Rune Bounty</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-rpg font-bold text-xs text-amber-300">{activeQuest.title}</h4>
                <p className="text-xs text-slate-400 mt-1 font-sans leading-relaxed">{activeQuest.hint}</p>
              </div>

              <button
                onClick={() => {
                  sound.playLootRoll();
                  onUnlockHiddenQuest();
                  onRecordAffinityEvent(selectedNpcId, 'quest_completed', 'Accepted and advanced Citadel Hidden Quest');
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white rounded-xl text-xs font-rpg font-bold shadow-md shrink-0 cursor-pointer"
              >
                Accept Quest
              </button>
            </div>
          </div>

          {/* Artisan Bazaar Realtime Chat & Global Leaderboard */}
          <div className="pt-2">
            <BazaarChatAndLeaderboard
              userId={localStorage.getItem('aethelgard_player_id') || 'player_123_abc'}
              username={localStorage.getItem('aethelgard_username') || activeHero.name}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

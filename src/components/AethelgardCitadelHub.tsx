import React, { useState, useEffect } from 'react';
import { PlayerInventory, Character, SafeZoneState } from '../types/game';
import { sound } from '../services/soundService';
import { innLogoutSafeZone, wildernessDisconnectSafeZone, syncPlayerState } from '../services/api';
import {
  Shield,
  ShieldAlert,
  Coins,
  Sparkles,
  Compass,
  ArrowRight,
  Flame,
  Award,
  Bell,
  Clock,
  Zap,
  Swords,
  ChevronRight,
  Users,
  Castle,
  Bed,
  AlertTriangle,
  Skull,
  Trees,
  Mountain,
  Sun,
  Eye,
  Gamepad2,
} from 'lucide-react';

interface AethelgardCitadelHubProps {
  inventory: PlayerInventory;
  party: Character[];
  safeZone: SafeZoneState;
  onUpdateSafeZone: (updater: (prev: SafeZoneState) => SafeZoneState) => void;
  onOpenPartyScreen: () => void;
  onOpenTeleportArray: () => void;
  onOpenDungeonGate: () => void;
  onOpenBazaar: () => void;
  onOpenWorkshops: () => void;
  onOpenGuildHall: () => void;
  onCollectActivityFunds: () => void;
  onEnter3DPlayableWorld?: () => void;
}

const TIER1_BIOMES = [
  {
    name: 'Central Citadel Plaza',
    type: 'Safe-Zone Sanctuary',
    desc: 'The grand white-stone and brass capital protected by the Arcane Aegis Dome. Zero incoming damage.',
    icon: '🏰',
    color: '#06b6d4',
  },
  {
    name: 'Whispering Emerald Forests',
    type: 'Elven Homelands',
    desc: 'Dense ancient woodlands where Elven aeromancers weave leyline currents through spirit wood.',
    icon: '🌲',
    color: '#10b981',
  },
  {
    name: 'Ironpeak Calderas',
    type: 'Dwarven Forge-Mountains',
    desc: 'Volcanic peaks housing subterranean magma forges and roaming stone golem world bosses.',
    icon: '🌋',
    color: '#f59e0b',
  },
  {
    name: 'Luminous Sylph Meadows',
    type: 'Fairy Glades',
    desc: 'Bioluminescent valleys where insectoid fairies dance along stardust leylines.',
    icon: '✨',
    color: '#a855f7',
  },
  {
    name: 'Shattered Badlands',
    type: 'Open Wilderness',
    desc: 'Arid canyon gorges crawling with goblin raiding swarms and lawless outlaw mercenaries.',
    icon: '🏜️',
    color: '#f97316',
  },
  {
    name: 'Sunken Ruins',
    type: 'Subterranean Abyss',
    desc: 'Flooded catacombs where ancient abominations and mana-drain revenants guard ancient runes.',
    icon: '🏛️',
    color: '#6366f1',
  },
];

export const AethelgardCitadelHub: React.FC<AethelgardCitadelHubProps> = ({
  inventory,
  party,
  safeZone,
  onUpdateSafeZone,
  onOpenPartyScreen,
  onOpenTeleportArray,
  onOpenDungeonGate,
  onOpenBazaar,
  onOpenWorkshops,
  onOpenGuildHall,
  onCollectActivityFunds,
  onEnter3DPlayableWorld,
}) => {
  const [fundsCollected, setFundsCollected] = useState<boolean>(false);
  const [exhaustedTimer, setExhaustedTimer] = useState<number>(safeZone.exhaustedSleeperTimer || 0);

  // Exhausted Sleeper Countdown simulation (Feature A)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (safeZone.isSleepingInWilderness && exhaustedTimer > 0) {
      interval = setInterval(() => {
        setExhaustedTimer((prev) => {
          if (prev <= 1) {
            onUpdateSafeZone((sz) => ({
              ...sz,
              isSleepingInWilderness: false,
              exhaustedSleeperTimer: 0,
            }));
            sound.playVictory();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [safeZone.isSleepingInWilderness, exhaustedTimer, onUpdateSafeZone]);

  const handleToggleBoundary = async () => {
    sound.playClick();
    const nextInSafeZone = !safeZone.bIsInSafeZone;
    const nextLocation = nextInSafeZone
      ? 'Citadel of Oakhaven (Safe-Zone)'
      : 'Shattered Badlands (Wilderness PvP Active)';

    onUpdateSafeZone((prev) => ({
      ...prev,
      bIsInSafeZone: nextInSafeZone,
      locationName: nextLocation,
      isSleepingInWilderness: false,
      exhaustedSleeperTimer: 0,
    }));

    await syncPlayerState({
      gold: inventory.stardust,
      essence: inventory.astralPrisms,
      safeZone: {
        bIsInSafeZone: nextInSafeZone,
        locationName: nextLocation,
        isSleepingInWilderness: false,
        exhaustedSleeperTimer: 0,
      },
    });
  };

  const handleInnLogout = async () => {
    sound.playVictory();
    onUpdateSafeZone((prev) => ({
      ...prev,
      isRestingInInn: true,
      wellRestedExpMultiplierActive: true,
      wellRestedTimerSeconds: 7200,
      isSleepingInWilderness: false,
      exhaustedSleeperTimer: 0,
    }));

    await innLogoutSafeZone(inventory.stardust, inventory.astralPrisms);
  };

  const handleWildernessDisconnect = async () => {
    sound.playTrapTrigger();
    setExhaustedTimer(300);
    onUpdateSafeZone((prev) => ({
      ...prev,
      isSleepingInWilderness: true,
      exhaustedSleeperTimer: 300,
      isRestingInInn: false,
      wellRestedExpMultiplierActive: false,
    }));

    await wildernessDisconnectSafeZone('Shattered Badlands (Wilderness PvP Active)');
  };

  const handleClaimFunds = () => {
    if (fundsCollected) return;
    onCollectActivityFunds();
    setFundsCollected(true);
    sound.playVictory();
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto space-y-8 select-none font-sans">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-tech font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                UNREAL ENGINE 5 CEL-SHADED PBR • NON-PROTAGONIST OPEN WORLD
              </span>
              <span className="text-[10px] font-tech text-amber-400 font-bold">
                EDITION v2.0 MASTER
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-rpg font-extrabold text-white tracking-wide leading-tight">
              Aethelgard Online
            </h1>
            <p className="text-slate-300 text-sm md:text-base font-sans leading-relaxed">
              Step into a seamless 120 km² continental open world. No chosen-one narrative—forge your destiny as an artisan, dungeon crawler, or guild strategist across Elven canopies, Dwarven calderas, and soaring sky-continents.
            </p>
          </div>

          {/* Safe-Zone State Badge & Action Toggle */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition ${
                safeZone.bIsInSafeZone
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-lg shadow-rose-950/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {safeZone.bIsInSafeZone ? (
                  <Shield className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 animate-pulse" />
                )}
                <div>
                  <div className="font-rpg font-bold text-xs uppercase tracking-wider">
                    {safeZone.bIsInSafeZone ? 'Arcane Aegis Dome (Active)' : 'Wilderness PvP Enabled'}
                  </div>
                  <div className="text-[10px] font-tech text-slate-300">
                    {safeZone.bIsInSafeZone
                      ? 'No-Combat Field: Incoming Dmg Multiplier = 0.0'
                      : 'Open PvP, Monster Aggro & Bounty Hunters Active'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleToggleBoundary}
                className="px-3 py-1.5 rounded-xl font-tech font-bold text-xs bg-slate-900 border border-slate-700 text-white hover:bg-slate-800 transition"
              >
                {safeZone.bIsInSafeZone ? 'Step Beyond City Gates' : 'Enter Safe-Zone Dome'}
              </button>
            </div>

            {/* Well-Rested EXP Multiplier Status */}
            {safeZone.wellRestedExpMultiplierActive && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-amber-300 text-xs font-tech">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Well-Rested Buff Active:</strong> +100% EXP Multiplier from Inn Save!
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* World Vista: Unreal Engine 5 Concept Art (The Cradle of Aether & Citadel of Oakhaven) */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl group">
        <div className="relative aspect-video sm:aspect-[21/9] w-full overflow-hidden">
          <img
            src="/src/assets/images/aethelgard_open_world_1792057283044.jpg"
            alt="Aethelgard Online - The Cradle of Aether, Citadel of Oakhaven Arcane Aegis Dome, Teleportation Array and Floating Continents"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-102 transition duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent pointer-events-none" />

          {/* Floating World Landmark Callouts */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur border border-cyan-500/40 text-[11px] font-tech font-bold text-cyan-300 flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>ARCANE AEGIS DOME • CITADEL OF OAKHAVEN</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur border border-indigo-500/40 text-[11px] font-tech font-bold text-indigo-300 flex items-center gap-1.5 shadow-lg">
              <span>⚡ PLANAR TELEPORTATION ARRAY ALTAR</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur border border-amber-500/40 text-[11px] font-tech font-bold text-amber-300 flex items-center gap-1.5 shadow-lg">
              <span>🗿 ROAMING TITAN WORLD BOSS</span>
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[10px] font-tech text-cyan-400 uppercase tracking-wider font-extrabold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>UNREAL ENGINE 5 CONCEPT ART • THE CRADLE OF AETHER</span>
              </div>
              <h3 className="text-xl md:text-2xl font-rpg font-extrabold text-white">
                Colossal Metropolis & Roaming World Boss
              </h3>
              <p className="text-xs text-slate-300 font-sans max-w-2xl line-clamp-2">
                An Elven ranger and Dwarven vanguard stand on the highland cliffs overlooking the walled Citadel of Oakhaven. Beyond the gates, an ancient Stone Titan roams lush valleys, while the floating continents of Tier 2 hover in the clouds.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {onEnter3DPlayableWorld && (
                <button
                  onClick={onEnter3DPlayableWorld}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-rpg font-extrabold text-xs shadow-lg shadow-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>PLAY IN 3D WORLD</span>
                </button>
              )}
              <button
                onClick={onOpenTeleportArray}
                className="px-4 py-2 rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 font-rpg font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Inspect Array Altar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hunter Monarch Character Spotlight (Solo Leveling: Arise Aesthetic) */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-cyan-500/50 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/90 p-6 md:p-8 shadow-2xl shadow-cyan-500/10">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Character Anime Portrait Card */}
          <div className="relative shrink-0 w-64 md:w-72 h-96 rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-2xl shadow-cyan-500/30 group">
            <img
              src="/src/assets/images/hunter_monarch_1792207007018.jpg"
              alt="Sung Jinwoo - The Shadow Monarch"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black text-[11px] font-black shadow">
                SSR
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-950/80 border border-cyan-400/50 text-cyan-300 text-[10px] font-tech font-bold uppercase">
                Shadow Element
              </span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 text-center bg-slate-950/90 p-2.5 rounded-xl border border-white/10 backdrop-blur">
              <div className="text-xs font-rpg font-bold text-white">Kasaka's Venom Fang</div>
              <div className="text-[10px] text-cyan-400 font-tech">Equipped Weapon • +Bleed & Paralysis</div>
            </div>
          </div>

          {/* Dossier & Actions */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-tech font-bold uppercase">
                SOLO LEVELING: ARISE AESTHETIC • SHADOW MONARCH SYSTEM
              </span>
              <span className="text-xs font-tech text-amber-400 font-bold">
                Combat Power: 4,516 CP
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-rpg font-extrabold text-white">
                Sung Jinwoo • The Shadow Monarch
              </h2>
              <p className="text-sm font-tech text-cyan-300 mt-0.5">
                Master Hunter Class: Assassin / Necromancer • Awakened Sovereign
              </p>
            </div>

            <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-sans bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              Awakened as the sole Hunter who grows beyond limits. Channels the sovereign authority of the Shadow Monarch to extract the shadows of defeated dungeon beasts, commanding an unstoppable army with Kasaka’s Venom Fang and Dominator’s Touch telekinesis.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-tech">STRENGTH</div>
                <div className="text-base font-bold text-cyan-300 font-tech">48</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-tech">AGILITY</div>
                <div className="text-base font-bold text-cyan-300 font-tech">52</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-tech">INTELLIGENCE</div>
                <div className="text-base font-bold text-purple-400 font-tech">36</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-tech">PERCEPTION</div>
                <div className="text-base font-bold text-amber-300 font-tech">44</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onOpenPartyScreen}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rpg font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Allocate Attributes & Inspect In Roster</span>
              </button>

              {onEnter3DPlayableWorld && (
                <button
                  onClick={onEnter3DPlayableWorld}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-rpg font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Deploy in 3D Playable Viewport</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature A Simulator: The Inn Logout Rule vs Wilderness Exhausted Sleeper */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>FEATURE A IMPLEMENTATION BLUEPRINT</span>
            </div>
            <h2 className="text-xl font-rpg font-bold text-white">
              Safe Zones & The "Inn Logout" Persistence System
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-tech text-slate-400">Current Zone:</span>
            <span className="text-xs font-rpg font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-xl border border-cyan-500/20">
              {safeZone.locationName}
            </span>
          </div>
        </div>

        {/* Exhausted Sleeper Alert (If in wilderness disconnect) */}
        {safeZone.isSleepingInWilderness && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500 text-white font-sans space-y-2 animate-pulse">
            <div className="flex items-center gap-2 font-rpg font-bold text-sm text-rose-300">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>VULNERABLE EXHAUSTED SLEEPER ACTIVE IN THE WILDERNESS!</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Disconnecting in the wilderness switches character controller to <code className="text-rose-300 font-tech">ExhaustedSleeper_AI</code> for 300 seconds (5 minutes) playing a grounded sleeping animation. If hunted down by monsters or outlaws during this countdown, items drop!
            </p>
            <div className="flex items-center gap-3 pt-1">
              <div className="text-2xl font-rpg font-black text-rose-400">
                {Math.floor(exhaustedTimer / 60)}:{(exhaustedTimer % 60).toString().padStart(2, '0')}
              </div>
              <span className="text-xs font-tech text-slate-400">Time remaining until despawn and database save</span>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 pt-2">
          {/* Inn Safe Logout Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-rpg font-bold text-sm text-emerald-400 mb-1">
                <Bed className="w-4 h-4" />
                <span>Rest & Save at Oakhaven Inn</span>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Immediately serialize character inventory, EXP, location, and world state. Grants a <strong>2-hour Well-Rested EXP Multiplier (+100% EXP)</strong> upon return.
              </p>
            </div>
            <button
              onClick={handleInnLogout}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-rpg font-bold text-xs transition"
            >
              Test Safe-Zone Inn Logout (+2h Well-Rested EXP)
            </button>
          </div>

          {/* Wilderness Disconnect Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-rpg font-bold text-sm text-rose-400 mb-1">
                <Skull className="w-4 h-4" />
                <span>Simulate Wilderness Disconnect</span>
              </div>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Leaving safe zones leaves the avatar as a vulnerable <code className="text-rose-300 font-tech">ExhaustedSleeper</code> in the open world for 300 seconds before saving.
              </p>
            </div>
            <button
              onClick={handleWildernessDisconnect}
              className="w-full py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-rpg font-bold text-xs transition"
            >
              Simulate Wilderness Disconnect (300s Vulnerability)
            </button>
          </div>
        </div>
      </div>

      {/* Six Continental Biomes of Tier 1 (Cradle of Aether) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>TIER 1 • THE CRADLE OF AETHER (120 KM² SEAMLESS MAP)</span>
            </div>
            <h2 className="text-2xl font-rpg font-extrabold text-white">
              Six Ecological Biomes & 30 World Bosses
            </h2>
          </div>

          <button
            onClick={onOpenDungeonGate}
            className="flex items-center gap-1.5 text-xs font-rpg font-bold text-cyan-400 hover:text-cyan-300"
          >
            <span>VIEW 30 WORLD BOSSES & EXPEDITION BOARD</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIER1_BIOMES.map((b) => (
            <div
              key={b.name}
              onClick={onOpenDungeonGate}
              className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl p-2 rounded-2xl bg-slate-950 border border-slate-800/80">
                  {b.icon}
                </span>
                <span
                  className="text-[10px] font-tech font-bold uppercase px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: `${b.color}20`, color: b.color }}
                >
                  {b.type}
                </span>
              </div>
              <h3 className="font-rpg font-bold text-sm text-white group-hover:text-cyan-400 transition">
                {b.name}
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-1 leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Fast Navigation Hub Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dynamic 6-Player Party */}
        <div
          onClick={onOpenPartyScreen}
          className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition cursor-pointer group space-y-3"
        >
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="font-rpg font-bold text-sm text-white group-hover:text-cyan-300 transition">
              6-Player Strike Team
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Attribute Matrix, Agility scaling formulas & cross-racial combo links.
            </p>
          </div>
          <div className="text-[11px] font-tech text-cyan-400 flex items-center gap-1">
            <span>INSPECT HEROES</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Ancient Teleportation Array */}
        <div
          onClick={onOpenTeleportArray}
          className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition cursor-pointer group space-y-3"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-rpg font-bold text-sm text-white group-hover:text-indigo-300 transition">
              Ancient Teleportation Array
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Socket 4 World Boss runes to stream Tier 2: The Floating Expanse.
            </p>
          </div>
          <div className="text-[11px] font-tech text-indigo-400 flex items-center gap-1">
            <span>SOCKET RUNES</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Grand Artisan Bazaar & Voice NPC */}
        <div
          onClick={onOpenBazaar}
          className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition cursor-pointer group space-y-3"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="font-rpg font-bold text-sm text-white group-hover:text-amber-300 transition">
              Artisan Bazaar & Voice NPC
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Microphone voice STT & TTS with Broman, Lyra, and Grimm.
            </p>
          </div>
          <div className="text-[11px] font-tech text-amber-400 flex items-center gap-1">
            <span>CONVERSE WITH NPCS</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Racial Crafting Workshop */}
        <div
          onClick={onOpenWorkshops}
          className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition cursor-pointer group space-y-3"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Castle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-rpg font-bold text-sm text-white group-hover:text-purple-300 transition">
              Dwarven & Elven Forges
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Temper weapons with golem alloys and weave staves with fairy dust.
            </p>
          </div>
          <div className="text-[11px] font-tech text-purple-400 flex items-center gap-1">
            <span>FORGE & WEAVE</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};

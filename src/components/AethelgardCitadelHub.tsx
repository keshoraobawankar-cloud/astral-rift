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
  ChevronRight,
  Users,
  Castle,
  Bed,
  AlertTriangle,
  Skull,
  Gamepad2,
  Clock,
  Gift,
  Flame,
  Box,
} from 'lucide-react';
import { growthRetention } from '../services/growthRetentionService';
import { INITIAL_PET_COMPANIONS } from '../data/petData';

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
  onOpenRetentionModal?: () => void;
  activePetId?: string;
  onSelectPet?: (petId: string) => void;
}

const TIER1_BIOMES = [
  {
    name: 'Central Citadel Plaza',
    type: 'Sanctuary Safe-Zone',
    desc: 'The grand white-stone capital protected by the Arcane Aegis Dome. Combat damage is completely neutralized.',
    icon: '🏰',
    color: '#06b6d4',
  },
  {
    name: 'Whispering Emerald Forests',
    type: 'Elven Homelands',
    desc: 'Dense ancient woodlands where Elven aeromancers weave leyline currents through living spirit wood.',
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
    desc: 'Bioluminescent valleys where insectoid fairies dance along shimmering stardust leylines.',
    icon: '✨',
    color: '#a855f7',
  },
  {
    name: 'Shattered Badlands',
    type: 'Open Wilderness',
    desc: 'Arid canyon gorges crawling with goblin raiding swarms and lawless rogue mercenaries.',
    icon: '🏜️',
    color: '#f97316',
  },
  {
    name: 'Sunken Ruins',
    type: 'Subterranean Abyss',
    desc: 'Flooded catacombs where ancient abominations and mana-drain revenants guard celestial runes.',
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
  onOpenRetentionModal,
  activePetId = 'void_hatchling',
  onSelectPet,
}) => {
  const [fundsCollected, setFundsCollected] = useState<boolean>(false);
  const [exhaustedTimer, setExhaustedTimer] = useState<number>(safeZone.exhaustedSleeperTimer || 0);
  const [riftInfo, setRiftInfo] = useState(() => growthRetention.getCurrentRiftState());
  const [retentionState, setRetentionState] = useState(() => growthRetention.getState());

  useEffect(() => {
    const interval = setInterval(() => {
      setRiftInfo(growthRetention.getCurrentRiftState());
      setRetentionState(growthRetention.getState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Exhausted Sleeper Countdown simulation
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
      : 'Shattered Badlands (Wilderness Active)';

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

    await wildernessDisconnectSafeZone('Shattered Badlands (Wilderness Active)');
  };

  const handleClaimFunds = () => {
    if (fundsCollected) return;
    onCollectActivityFunds();
    setFundsCollected(true);
    sound.playVictory();
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto space-y-6 select-none font-sans">
      {/* Sanctuary & Expedition Command Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-tech font-bold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                THE CONTINENTAL FRONTIER • CITADEL OF OAKHAVEN
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-rpg font-extrabold text-white tracking-wide leading-tight">
              Aethelgard Citadel Hub
            </h1>
            <p className="text-slate-300 text-xs md:text-sm font-sans leading-relaxed">
              Command your 6-hero strike team across Elven canopies, Dwarven magma calderas, and soaring sky-continents. Trade at the Artisan Bazaar, socket World Boss runes, or venture into the wild.
            </p>
          </div>

          {/* Sanctuary Shield Status & Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <div
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition ${
                safeZone.bIsInSafeZone
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-lg'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {safeZone.bIsInSafeZone ? (
                  <Shield className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                )}
                <div>
                  <div className="font-rpg font-bold text-xs uppercase tracking-wider">
                    {safeZone.bIsInSafeZone ? 'Arcane Aegis Dome (Active)' : 'Wilderness Zone Active'}
                  </div>
                  <div className="text-[10px] font-tech text-slate-300">
                    {safeZone.bIsInSafeZone
                      ? 'Sanctuary Aegis Active — Immune to Combat Damage'
                      : 'Open Wilderness: Monster Aggro & Outlaws Active'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleToggleBoundary}
                className="px-3 py-1.5 rounded-xl font-tech font-bold text-xs bg-slate-900 border border-slate-700 text-white hover:bg-slate-800 transition cursor-pointer"
              >
                {safeZone.bIsInSafeZone ? 'Leave Sanctuary Gates' : 'Return to Citadel'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInnLogout}
                className="flex-1 px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-rpg font-bold text-[11px] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Bed className="w-3.5 h-3.5" />
                <span>Rest at Oakhaven Inn (+100% Well-Rested EXP)</span>
              </button>

              <button
                onClick={handleClaimFunds}
                disabled={fundsCollected}
                className={`px-3 py-1.5 rounded-xl font-rpg font-bold text-[11px] transition flex items-center gap-1.5 cursor-pointer ${
                  fundsCollected
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{fundsCollected ? 'Stipend Claimed' : 'Claim Daily Stipend'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vulnerable Sleeper Alert (if active in wilderness) */}
      {safeZone.isSleepingInWilderness && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500 text-white font-sans space-y-2 animate-pulse">
          <div className="flex items-center gap-2 font-rpg font-bold text-sm text-rose-300">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>VULNERABLE CAMPER IN THE WILDERNESS</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Leaving the sanctuary leaves your campsite vulnerable in the open world for 300 seconds before safe camp is established. Return to the Aegis Dome or rest at an Inn to prevent ambushes!
          </p>
          <div className="flex items-center gap-3 pt-1">
            <div className="text-xl font-rpg font-black text-rose-400">
              {Math.floor(exhaustedTimer / 60)}:{(exhaustedTimer % 60).toString().padStart(2, '0')}
            </div>
            <span className="text-xs font-tech text-slate-400">Time remaining until secure rest</span>
          </div>
        </div>
      )}

      {/* DYNAMIC REALM RIFT (RETENTION LOOP) & PET COMPANION BANNER */}
      <div className="grid md:grid-cols-12 gap-4">
        {/* Realm Rift Live Surge Banner (8 cols) */}
        <div className="md:col-span-8 p-4 rounded-3xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/20 shrink-0 animate-pulse">
              🌀
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-tech font-bold uppercase px-2 py-0.5 rounded bg-purple-500/30 text-purple-300 border border-purple-400/50">
                  REALM RIFT ENGINE {riftInfo.isActive ? '• SURGE ACTIVE' : '• COUNTDOWN'}
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  ⏱️ {Math.floor(riftInfo.secondsRemaining / 60)}:{(riftInfo.secondsRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
              {(() => {
                const currentRift = riftInfo.activeRift || riftInfo.nextRift;
                return (
                  <>
                    <h3 className="text-sm md:text-base font-rpg font-extrabold text-white mt-0.5">
                      {currentRift.name}
                    </h3>
                    <p className="text-[11px] text-slate-300 font-sans line-clamp-1">
                      📍 {currentRift.biome} — <span className="text-amber-300 font-bold">{currentRift.bonus}</span>
                    </p>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenRetentionModal && (
              <button
                onClick={() => {
                  sound.playVictory();
                  onOpenRetentionModal();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-rpg font-bold text-xs shadow-lg shadow-purple-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-amber-300" />
                <span>INVESTIGATE RIFT ({retentionState.loginStreak}-DAY STREAK)</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Pet Companion Quick Widget (4 cols) */}
        <div className="md:col-span-4 p-4 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between gap-3">
          {(() => {
            const pet = INITIAL_PET_COMPANIONS.find((p) => p.id === activePetId) || INITIAL_PET_COMPANIONS[0];
            return (
              <>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0"
                    style={{ backgroundColor: `${pet.color}25`, border: `1px solid ${pet.color}50` }}
                  >
                    {pet.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-rpg font-bold text-xs text-white truncate max-w-[110px]">{pet.name}</span>
                      <span className="text-[9px] font-tech font-bold px-1.5 py-0.2 rounded" style={{ backgroundColor: `${pet.color}30`, color: pet.accentColor }}>
                        {pet.rarity}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans line-clamp-1">{pet.passiveBuff}</div>
                  </div>
                </div>

                {onSelectPet && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      const nextPet = activePetId === 'void_hatchling' ? 'solar_phoenix' : 'void_hatchling';
                      onSelectPet(nextPet);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-300 rounded-xl text-[10px] font-tech font-bold transition cursor-pointer shrink-0"
                    title="Switch active Pet Companion"
                  >
                    SWAP PET
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Main Citadel Split: Hero Spotlight & The Cradle of Aether Vista */}
      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Original Hero Spotlight (Vaelen Thorne • The Umbral Sovereign) - 5 Cols */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900/90 to-slate-950 border border-cyan-500/40 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0 w-28 h-36 rounded-2xl overflow-hidden border-2 border-cyan-400/80 shadow-lg shadow-cyan-500/20 group">
              <img
                src="/src/assets/images/hunter_monarch_1792207007018.jpg"
                alt="Vaelen Thorne - The Umbral Sovereign"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500"
              />
              <div className="absolute top-1.5 left-1.5 flex gap-1">
                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black text-[9px] font-black">SSR</span>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-tech text-amber-400 font-bold">
                Combat Power: 4,516 CP
              </span>
              <h2 className="text-lg md:text-xl font-rpg font-extrabold text-white leading-snug">
                Vaelen Thorne
              </h2>
              <p className="text-xs font-tech text-cyan-300">
                The Umbral Sovereign • Void-Touched Blade
              </p>
              <div className="pt-1 text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-3">
                Commands the sovereign authority of the umbral depths to extract the shades of defeated monsters. Armed with Nightshade Viper Fang and Abyssal Grasp.
              </div>
            </div>
          </div>

          {/* Quick Stat Matrix */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-tech">STR</div>
              <div className="font-bold text-cyan-300 font-tech">48</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-tech">AGI</div>
              <div className="font-bold text-cyan-300 font-tech">52</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-tech">INT</div>
              <div className="font-bold text-purple-400 font-tech">36</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-tech">PER</div>
              <div className="font-bold text-amber-300 font-tech">44</div>
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              onClick={onOpenPartyScreen}
              className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rpg font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Inspect Strike Team</span>
            </button>

            {onEnter3DPlayableWorld && (
              <button
                onClick={onEnter3DPlayableWorld}
                className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-rpg font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Play in 3D</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: World Vista Banner & Altar Portal - 7 Cols */}
        <div className="lg:col-span-7 relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl group flex flex-col justify-end min-h-[300px]">
          <img
            src="/src/assets/images/aethelgard_open_world_1792057283044.jpg"
            alt="The Cradle of Aether & Citadel of Oakhaven"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-102 transition duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

          {/* Floating World Landmark Callouts */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur border border-cyan-500/40 text-[10px] font-tech font-bold text-cyan-300 flex items-center gap-1 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>ARCANE AEGIS DOME • CITADEL OF OAKHAVEN</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur border border-amber-500/40 text-[10px] font-tech font-bold text-amber-300 flex items-center gap-1 shadow">
              <span>🗿 ROAMING TITAN WORLD BOSS</span>
            </span>
          </div>

          <div className="relative z-10 p-5 space-y-2">
            <h3 className="text-xl md:text-2xl font-rpg font-extrabold text-white">
              The Cradle of Aether & Roaming Titans
            </h3>
            <p className="text-xs text-slate-300 font-sans max-w-xl line-clamp-2">
              Overlook the fortified Citadel of Oakhaven. Beyond the gates, an ancient Stone Titan roams lush valleys, while the floating continents of Tier 2 hover in the clouds.
            </p>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={onOpenTeleportArray}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-rpg font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Ancient Teleport Array</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onOpenDungeonGate}
                className="px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-rpg font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Abyss Raids & Bosses</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fast Navigation Hub Grid (4 Interactive Stations) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 6-Player Party */}
        <div
          onClick={onOpenPartyScreen}
          className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition cursor-pointer group space-y-2"
        >
          <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="font-rpg font-bold text-xs text-white group-hover:text-cyan-300 transition">
              6-Player Strike Team
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-2">
              Attribute Matrix, Agility scaling, and cross-racial combo links.
            </p>
          </div>
          <div className="text-[10px] font-tech text-cyan-400 flex items-center gap-1">
            <span>INSPECT HEROES</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Ancient Teleportation Array */}
        <div
          onClick={onOpenTeleportArray}
          className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 transition cursor-pointer group space-y-2"
        >
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-rpg font-bold text-xs text-white group-hover:text-indigo-300 transition">
              Teleportation Array
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-2">
              Socket 4 World Boss runes to bridge Tier 2: The Floating Expanse.
            </p>
          </div>
          <div className="text-[10px] font-tech text-indigo-400 flex items-center gap-1">
            <span>SOCKET RUNES</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Artisan Bazaar & Voice NPC */}
        <div
          onClick={onOpenBazaar}
          className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition cursor-pointer group space-y-2"
        >
          <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <div className="font-rpg font-bold text-xs text-white group-hover:text-amber-300 transition">
              Artisan Bazaar & NPC
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-2">
              Voice dialogue & bargaining with Broman, Lyra, and Grimm.
            </p>
          </div>
          <div className="text-[10px] font-tech text-amber-400 flex items-center gap-1">
            <span>VISIT STALLS</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Forge & Loom */}
        <div
          onClick={onOpenWorkshops}
          className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition cursor-pointer group space-y-2"
        >
          <div className="w-9 h-9 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Castle className="w-4 h-4" />
          </div>
          <div>
            <div className="font-rpg font-bold text-xs text-white group-hover:text-purple-300 transition">
              Dwarven & Elven Forges
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-2">
              Temper weapons with golem alloy and weave robes with fairy dust.
            </p>
          </div>
          <div className="text-[10px] font-tech text-purple-400 flex items-center gap-1">
            <span>FORGE & WEAVE</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Six Continental Biomes of Tier 1 */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-cyan-400 font-tech font-bold text-[11px] uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              <span>THE CRADLE OF AETHER • CONTINENTAL BIOMES</span>
            </div>
            <h2 className="text-xl font-rpg font-extrabold text-white">
              Six Ecological Biomes & World Bosses
            </h2>
          </div>

          <button
            onClick={onOpenDungeonGate}
            className="flex items-center gap-1 text-xs font-rpg font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
          >
            <span>VIEW WORLD BOSSES</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIER1_BIOMES.map((b) => (
            <div
              key={b.name}
              onClick={onOpenDungeonGate}
              className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl p-1.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  {b.icon}
                </span>
                <span
                  className="text-[9px] font-tech font-bold uppercase px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: `${b.color}20`, color: b.color }}
                >
                  {b.type}
                </span>
              </div>
              <h3 className="font-rpg font-bold text-xs text-white group-hover:text-cyan-400 transition">
                {b.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-relaxed line-clamp-2">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

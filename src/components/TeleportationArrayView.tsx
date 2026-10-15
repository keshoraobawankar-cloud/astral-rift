import React, { useRef, useEffect, useState } from 'react';
import { TeleportationArray, PlayerInventory, Realm } from '../types/game';
import { sound } from '../services/soundService';
import {
  Sparkles,
  Zap,
  Lock,
  Unlock,
  CheckCircle2,
  Compass,
  ArrowRight,
  Shield,
  Layers,
  Wind,
  RotateCcw,
} from 'lucide-react';

interface TeleportationArrayViewProps {
  teleportArray: TeleportationArray;
  inventory: PlayerInventory;
  onSocketRune: (runeName: string) => void;
  onUnsocketRune: (runeName: string) => void;
  onUnlockTier2: () => void;
  onTravelToTier2: () => void;
}

const REQUIRED_RUNES_CONFIG = [
  {
    name: 'Rune of Ironpeak Magma',
    source: 'Tier 1 World Boss: Khaz-Gorgon Runic Colossus (Ironpeak Calderas)',
    element: 'earth',
    color: '#f59e0b',
    icon: '🌋',
    desc: 'Carved from primordial magma stone, anchoring tectonic equilibrium in the array.',
  },
  {
    name: 'Rune of Whispering Wood',
    source: 'Tier 1 World Boss: Aethel-Bark Dread-Treant (Whispering Emerald Forests)',
    element: 'wind',
    color: '#10b981',
    icon: '🍃',
    desc: 'Woven with high-elven aether currents, tuning the planar resonance to the clouds.',
  },
  {
    name: 'Rune of the Golem Core',
    source: 'Abyss Dungeon Sub-Level 4: Ancient Golem Foundry Guardian',
    element: 'earth',
    color: '#38bdf8',
    icon: '💎',
    desc: 'Infused with compressed runic mana, providing the massive energy required to bridge sky-continents.',
  },
  {
    name: 'Rune of the Sunken Crypt',
    source: 'Sunken Ruins Deep Crypt Abomination',
    element: 'arcane',
    color: '#a855f7',
    icon: '🔮',
    desc: 'Attuned to celestial gravity manipulation, neutralizing the roiling mana vortex below.',
  },
];

export const TeleportationArrayView: React.FC<TeleportationArrayViewProps> = ({
  teleportArray,
  inventory,
  onSocketRune,
  onUnsocketRune,
  onUnlockTier2,
  onTravelToTier2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'altar' | 'sky_continent'>('altar');
  const [activationEffect, setActivationEffect] = useState(false);

  const socketedCount = teleportArray.socketedRunes.length;
  const isFullySocketed = socketedCount >= REQUIRED_RUNES_CONFIG.length;

  // Niagara Particle Sequence Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle1 = 0;
    let angle2 = 0;
    let angle3 = 0;
    let pulse = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark background gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 260);
      bgGrad.addColorStop(0, isFullySocketed ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.4)');
      bgGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      pulse += 0.03;
      const pulseScale = Math.sin(pulse) * 0.05 + 1;

      // Ring 1: Outer Arcane Rune Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle1);
      ctx.strokeStyle = isFullySocketed ? '#38bdf8' : '#475569';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8, 4, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 190 * pulseScale, 0, Math.PI * 2);
      ctx.stroke();

      // Outer Rune nodes (8 directions)
      for (let i = 0; i < 8; i++) {
        const rad = (i * Math.PI) / 4;
        const rx = Math.cos(rad) * 190 * pulseScale;
        const ry = Math.sin(rad) * 190 * pulseScale;
        ctx.fillStyle = isFullySocketed ? '#67e8f9' : '#64748b';
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Ring 2: Interlocking Middle Celestial Ring (Reverse Rotation)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-angle2);
      ctx.strokeStyle = isFullySocketed ? '#a855f7' : '#334155';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([18, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, 135, 0, Math.PI * 2);
      ctx.stroke();

      // Runic triangles
      for (let i = 0; i < 3; i++) {
        const rad = (i * 2 * Math.PI) / 3;
        const x1 = Math.cos(rad) * 135;
        const y1 = Math.sin(rad) * 135;
        const radNext = ((i + 1) * 2 * Math.PI) / 3;
        const x2 = Math.cos(radNext) * 135;
        const y2 = Math.sin(radNext) * 135;
        ctx.strokeStyle = isFullySocketed ? 'rgba(168, 85, 247, 0.4)' : 'rgba(51, 65, 85, 0.3)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // Ring 3: Inner High-Frequency Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle3);
      ctx.strokeStyle = isFullySocketed ? '#eab308' : '#1e293b';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Central Mana Core Vortex
      ctx.save();
      ctx.translate(cx, cy);
      const coreGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 55);
      if (isFullySocketed) {
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#38bdf8');
        coreGrad.addColorStop(0.7, '#6366f1');
        coreGrad.addColorStop(1, 'transparent');
      } else {
        coreGrad.addColorStop(0, '#64748b');
        coreGrad.addColorStop(0.6, '#1e293b');
        coreGrad.addColorStop(1, 'transparent');
      }
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 55 * pulseScale, 0, Math.PI * 2);
      ctx.fill();

      // Floating mana glyph inside core
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(isFullySocketed ? '⚡' : '🔒', 0, 0);
      ctx.restore();

      // 4 Socket Pillars (at 0, 90, 180, 270 deg)
      REQUIRED_RUNES_CONFIG.forEach((rune, idx) => {
        const rad = (idx * Math.PI) / 2;
        const dist = 160;
        const px = cx + Math.cos(rad) * dist;
        const py = cy + Math.sin(rad) * dist;
        const isSocketed = teleportArray.socketedRunes.includes(rune.name);

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, 26, 0, Math.PI * 2);
        ctx.fillStyle = isSocketed ? '#0f172a' : '#090d16';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = isSocketed ? rune.color : '#334155';
        ctx.stroke();

        // Socketed glow
        if (isSocketed) {
          ctx.shadowColor = rune.color;
          ctx.shadowBlur = 15;
          ctx.font = '20px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(rune.icon, px, py);
        } else {
          ctx.fillStyle = '#475569';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EMPTY', px, py);
        }
        ctx.restore();
      });

      angle1 += isFullySocketed ? 0.015 : 0.004;
      angle2 += isFullySocketed ? 0.022 : 0.006;
      angle3 += isFullySocketed ? 0.035 : 0.01;

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [teleportArray.socketedRunes, isFullySocketed]);

  const handleToggleSocket = (runeName: string) => {
    if (teleportArray.socketedRunes.includes(runeName)) {
      sound.playClick();
      onUnsocketRune(runeName);
    } else {
      sound.playCraftSuccess();
      onSocketRune(runeName);
      if (teleportArray.socketedRunes.length + 1 >= REQUIRED_RUNES_CONFIG.length) {
        setActivationEffect(true);
        sound.playSynergyTempest();
        onUnlockTier2();
        setTimeout(() => setActivationEffect(false), 5000);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 select-none font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-tech font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>FEATURE B • ANCIENT TELEPORTATION ARRAYS (TIER 1 → TIER 2)</span>
          </div>
          <h1 className="text-3xl font-rpg font-extrabold text-white">
            Planar Teleportation Array Altar
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl font-sans">
            Colossal ancient stone circles bridging <strong>Tier 1: The Cradle of Aether</strong> to the sky-continents of <strong>Tier 2: The Floating Expanse</strong>. Socket all 4 boss activation runes to align the mana vortex.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-rpg text-slate-300">
              Runes Socketed: <strong className="text-cyan-400">{socketedCount} / 4</strong>
            </span>
          </div>

          {isFullySocketed && (
            <button
              onClick={onTravelToTier2}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white font-rpg font-extrabold text-sm shadow-xl shadow-cyan-500/25 hover:brightness-110 active:scale-95 transition animate-pulse"
            >
              <span>ASCEND TO THE FLOATING EXPANSE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Activation Flash Banner */}
      {activationEffect && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 text-white font-tech font-bold text-center tracking-wider text-sm shadow-2xl animate-bounce">
          ⚡ NIAGARA ARCANE RINGS INTERLOCKED! TIER 2 SKY-CONTINENT PARTITION STREAMING ACTIVE!
        </div>
      )}

      {/* Main Grid Display */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Niagara Particle Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden backdrop-blur flex flex-col items-center">
          <div className="absolute top-4 left-6 flex items-center gap-2 text-xs font-tech text-slate-400 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>UE5 Niagara Particle Sequence • Arcane Interlocking Rings</span>
          </div>

          <canvas
            ref={canvasRef}
            width={520}
            height={480}
            className="w-full max-w-[500px] aspect-square my-2"
          />

          <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-2 pt-4 border-t border-slate-800/80">
            {REQUIRED_RUNES_CONFIG.map((rune) => {
              const isSocketed = teleportArray.socketedRunes.includes(rune.name);
              return (
                <div
                  key={rune.name}
                  className={`p-3 rounded-2xl border text-center transition ${
                    isSocketed
                      ? 'bg-slate-800/80 border-cyan-500/60 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="text-xl mb-1">{rune.icon}</div>
                  <div className="text-[11px] font-rpg font-bold truncate">{rune.name.replace('Rune of ', '')}</div>
                  <div className="text-[9px] font-tech mt-0.5 text-cyan-400">
                    {isSocketed ? 'ACTIVE' : 'EMPTY'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Rune Sockets & Tier-2 Specs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Socketing Console */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-rpg font-bold text-white flex items-center gap-2">
                <span>Rune Altar Sockets</span>
                <span className="text-xs font-tech text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  Global World State
                </span>
              </h2>
              <span className="text-xs text-slate-400 font-tech">Click to Socket / Withdraw</span>
            </div>

            <div className="space-y-3">
              {REQUIRED_RUNES_CONFIG.map((rune) => {
                const isSocketed = teleportArray.socketedRunes.includes(rune.name);
                const hasInInventory = inventory.arrayRunes?.includes(rune.name);

                return (
                  <div
                    key={rune.name}
                    className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                      isSocketed
                        ? 'bg-slate-800/90 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                        style={{ backgroundColor: `${rune.color}20`, border: `1px solid ${rune.color}40` }}
                      >
                        {rune.icon}
                      </div>
                      <div>
                        <div className="font-rpg font-bold text-xs text-white flex items-center gap-1.5">
                          <span>{rune.name}</span>
                          {isSocketed && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans line-clamp-1">
                          {rune.source}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleSocket(rune.name)}
                      className={`px-3 py-1.5 rounded-xl font-rpg font-bold text-xs transition shrink-0 ${
                        isSocketed
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                      }`}
                    >
                      {isSocketed ? 'Withdraw' : 'Socket Rune'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tier 2: The Floating Expanse Intelligence */}
          <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-cyan-950/40 border border-indigo-500/30 rounded-3xl p-6 backdrop-blur space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-tech font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4" />
              <span>TIER 2 • THE FLOATING EXPANSE OVERVIEW</span>
            </div>

            <h3 className="text-lg font-rpg font-bold text-white">
              Colossal Sky-Continents & Mana Vortex
            </h3>

            <div className="relative rounded-2xl overflow-hidden border border-slate-800 my-2 aspect-[16/7]">
              <img
                src="/src/assets/images/aethelgard_open_world_1792057283044.jpg"
                alt="The Floating Expanse & Sky-Continents"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-2.5">
                <span className="text-[10px] font-tech text-cyan-300 font-bold">
                  PLANAR DESTINATION • SKY-CONTINENTS SUSPENDED ABOVE MANA VORTEX
                </span>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed font-sans">
              Suspended thousands of fathoms above the roiling mana vortex, Tier 2 is accessible exclusively via Ancient Teleportation Arrays. It introduces radical environmental rules:
            </p>

            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl text-center">
                <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="font-rpg font-bold text-[11px] text-white">Low Gravity</div>
                <div className="text-[9px] text-slate-400 font-tech mt-0.5">+50% Jump & Agility</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl text-center">
                <Zap className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="font-rpg font-bold text-[11px] text-white">Elemental Tempests</div>
                <div className="text-[9px] text-slate-400 font-tech mt-0.5">Dynamic Wind Fissures</div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl text-center">
                <Sparkles className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                <div className="font-rpg font-bold text-[11px] text-white">Pure Mana Veins</div>
                <div className="text-[9px] text-slate-400 font-tech mt-0.5">Grade-5 Crystals</div>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled={!isFullySocketed}
                onClick={onTravelToTier2}
                className={`w-full py-3 rounded-2xl font-rpg font-bold text-xs flex items-center justify-center gap-2 transition ${
                  isFullySocketed
                    ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/25'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                }`}
              >
                {isFullySocketed ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Teleport to Floating Expanse Sky-Gates</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Locked: Requires {4 - socketedCount} More Runes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

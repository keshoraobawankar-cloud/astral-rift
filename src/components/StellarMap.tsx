import React, { useState, useEffect, useRef } from 'react';
import { Realm, RealmNode, Character, RegionalWeather, RegionalWeatherType } from '../types/game';
import { sound } from '../services/soundService';
import { REGIONAL_WEATHERS, getRandomWeather, WEATHER_TYPES } from '../data/weatherData';
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
  RefreshCw,
  Flame,
  Shield,
  Heart,
  Activity,
  Info,
  CloudRain,
  Eye,
  Wind,
  Moon,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';

export interface StellarWeatherTheme {
  themeName: string;
  themeTitle: string;
  paletteDescription: string;
  // Root Container
  containerBgGradient: string;
  containerBorder: string;
  containerShadow: string;
  // Node Grid Panel
  gridBgGradient: string;
  gridBorder: string;
  gridShadow: string;
  // Chamber Cards
  selectedCardGradient: string;
  selectedCardBorder: string;
  selectedCardShadow: string;
  unselectedCardHoverBorder: string;
  cardPwrColor: string;
  cardInspectColor: string;
  cardTypeBadge: string;
  // Briefing Panel
  briefingBgGradient: string;
  briefingBorder: string;
  briefingShadow: string;
  briefingBadge: string;
  synergyBoxBg: string;
  synergyBoxBorder: string;
  // Launch Action Button
  launchButtonGradient: string;
  launchButtonShadow: string;
  launchButtonBorder: string;
  // Accents
  accentText: string;
  subHeaderAccent: string;
}

export const STELLAR_WEATHER_THEMES: Record<RegionalWeatherType, StellarWeatherTheme> = {
  'Void Eclipse': {
    themeName: 'Void Eclipse',
    themeTitle: 'Abyssal Umbra',
    paletteDescription: 'Deep Purples & Shadow Violet',
    containerBgGradient: 'bg-gradient-to-b from-purple-950/40 via-slate-950/90 to-fuchsia-950/30',
    containerBorder: 'border-purple-600/40',
    containerShadow: 'shadow-[0_0_60px_rgba(168,85,247,0.18)]',
    gridBgGradient: 'bg-gradient-to-b from-purple-950/30 via-slate-900/95 to-slate-950/95',
    gridBorder: 'border-purple-600/35',
    gridShadow: 'shadow-2xl shadow-purple-950/60',
    selectedCardGradient: 'bg-gradient-to-br from-purple-950/85 via-slate-950 to-fuchsia-950/50',
    selectedCardBorder: 'border-purple-400',
    selectedCardShadow: 'shadow-xl shadow-purple-500/30',
    unselectedCardHoverBorder: 'hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-950/40',
    cardPwrColor: 'text-purple-300',
    cardInspectColor: 'text-purple-400',
    cardTypeBadge: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
    briefingBgGradient: 'bg-gradient-to-b from-purple-950/40 via-slate-900/95 to-slate-950/95',
    briefingBorder: 'border-purple-500/40',
    briefingShadow: 'shadow-2xl shadow-purple-950/70',
    briefingBadge: 'bg-purple-950/90 text-purple-300 border-purple-500/50',
    synergyBoxBg: 'bg-purple-950/40',
    synergyBoxBorder: 'border-purple-500/60',
    launchButtonGradient: 'bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 hover:brightness-110',
    launchButtonShadow: 'shadow-xl shadow-purple-600/35 hover:shadow-purple-500/50',
    launchButtonBorder: 'border border-purple-400/40',
    accentText: 'text-purple-400',
    subHeaderAccent: 'text-purple-400',
  },
  'Crystal Mist': {
    themeName: 'Crystal Mist',
    themeTitle: 'Glacial Aurora',
    paletteDescription: 'Icy Blues & Prismatic Teal',
    containerBgGradient: 'bg-gradient-to-b from-cyan-950/40 via-slate-950/90 to-blue-950/30',
    containerBorder: 'border-cyan-500/40',
    containerShadow: 'shadow-[0_0_60px_rgba(6,182,212,0.18)]',
    gridBgGradient: 'bg-gradient-to-b from-cyan-950/30 via-slate-900/95 to-slate-950/95',
    gridBorder: 'border-cyan-500/35',
    gridShadow: 'shadow-2xl shadow-cyan-950/60',
    selectedCardGradient: 'bg-gradient-to-br from-cyan-950/85 via-slate-950 to-sky-950/50',
    selectedCardBorder: 'border-cyan-400',
    selectedCardShadow: 'shadow-xl shadow-cyan-500/30',
    unselectedCardHoverBorder: 'hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-950/40',
    cardPwrColor: 'text-cyan-300',
    cardInspectColor: 'text-cyan-400',
    cardTypeBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
    briefingBgGradient: 'bg-gradient-to-b from-cyan-950/40 via-slate-900/95 to-slate-950/95',
    briefingBorder: 'border-cyan-500/40',
    briefingShadow: 'shadow-2xl shadow-cyan-950/70',
    briefingBadge: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50',
    synergyBoxBg: 'bg-cyan-950/40',
    synergyBoxBorder: 'border-cyan-500/60',
    launchButtonGradient: 'bg-gradient-to-r from-cyan-600 via-sky-600 to-teal-600 hover:brightness-110',
    launchButtonShadow: 'shadow-xl shadow-cyan-600/35 hover:shadow-cyan-500/50',
    launchButtonBorder: 'border border-cyan-400/40',
    accentText: 'text-cyan-400',
    subHeaderAccent: 'text-cyan-400',
  },
  'Astral Storm': {
    themeName: 'Astral Storm',
    themeTitle: 'Aether Surge',
    paletteDescription: 'Electric Sky-Blues & Celestial Starlight',
    containerBgGradient: 'bg-gradient-to-b from-sky-950/40 via-slate-950/90 to-blue-950/30',
    containerBorder: 'border-sky-500/40',
    containerShadow: 'shadow-[0_0_60px_rgba(56,189,248,0.18)]',
    gridBgGradient: 'bg-gradient-to-b from-sky-950/30 via-slate-900/95 to-slate-950/95',
    gridBorder: 'border-sky-500/35',
    gridShadow: 'shadow-2xl shadow-sky-950/60',
    selectedCardGradient: 'bg-gradient-to-br from-sky-950/85 via-slate-950 to-blue-950/50',
    selectedCardBorder: 'border-sky-400',
    selectedCardShadow: 'shadow-xl shadow-sky-500/30',
    unselectedCardHoverBorder: 'hover:border-sky-500/60 hover:shadow-lg hover:shadow-sky-950/40',
    cardPwrColor: 'text-sky-300',
    cardInspectColor: 'text-sky-400',
    cardTypeBadge: 'bg-sky-950/80 text-sky-300 border-sky-700/60',
    briefingBgGradient: 'bg-gradient-to-b from-sky-950/40 via-slate-900/95 to-slate-950/95',
    briefingBorder: 'border-sky-500/40',
    briefingShadow: 'shadow-2xl shadow-sky-950/70',
    briefingBadge: 'bg-sky-950/90 text-sky-300 border-sky-500/50',
    synergyBoxBg: 'bg-sky-950/40',
    synergyBoxBorder: 'border-sky-500/60',
    launchButtonGradient: 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:brightness-110',
    launchButtonShadow: 'shadow-xl shadow-sky-600/35 hover:shadow-purple-500/50',
    launchButtonBorder: 'border border-sky-400/40',
    accentText: 'text-sky-400',
    subHeaderAccent: 'text-sky-400',
  },
};

interface StellarMapProps {
  realms: Realm[];
  activeRealmId: string;
  onSelectRealm: (realmId: string) => void;
  onSelectNode: (node: RealmNode) => void;
  currentWeather?: RegionalWeather;
  onWeatherChange?: (weather: RegionalWeather) => void;
  party?: Character[];
  heavyWeatherFxEnabled?: boolean;
  onToggleHeavyWeatherFx?: () => void;
}

export const StellarMap: React.FC<StellarMapProps> = ({
  realms,
  activeRealmId,
  onSelectRealm,
  onSelectNode,
  currentWeather: propWeather,
  onWeatherChange,
  party = [],
  heavyWeatherFxEnabled,
  onToggleHeavyWeatherFx,
}) => {
  const currentRealm = realms.find((r) => r.id === activeRealmId) || realms[0];
  const [selectedNode, setSelectedNode] = useState<RealmNode>(currentRealm.nodes[0] || null);

  // Regional Weather State (defaults to prop or Astral Storm)
  const [activeWeather, setActiveWeather] = useState<RegionalWeather>(
    () => propWeather || REGIONAL_WEATHERS['Astral Storm']
  );

  // Synchronize with external prop if provided
  useEffect(() => {
    if (propWeather && propWeather.type !== activeWeather.type) {
      setActiveWeather(propWeather);
    }
  }, [propWeather]);

  // Weather Countdown Timer (shifts randomly every 35 seconds)
  const [countdown, setCountdown] = useState<number>(35);
  const [isLeylineShifting, setIsLeylineShifting] = useState<boolean>(false);
  const [isPartyStatsOpen, setIsPartyStatsOpen] = useState<boolean>(false);
  const [weatherFxEnabled, setWeatherFxEnabled] = useState<boolean>(true);

  // Determine whether heavy effects are active based on user settings or internal fallback
  const isHeavyFxOn =
    heavyWeatherFxEnabled !== undefined ? heavyWeatherFxEnabled : weatherFxEnabled;

  // Active Dynamic CSS Theme Modifier based on Regional Weather
  const theme =
    STELLAR_WEATHER_THEMES[activeWeather.type] || STELLAR_WEATHER_THEMES['Astral Storm'];

  // Weather Ambient Canvas Refs
  const weatherBannerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullMapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-shift timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRandomWeatherShift();
          return 35;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeWeather]);

  // Handle random shift
  const handleRandomWeatherShift = () => {
    setIsLeylineShifting(true);
    sound.playLevelUp();
    const next = getRandomWeather(activeWeather.type);
    setActiveWeather(next);
    setCountdown(35);
    onWeatherChange?.(next);
    setTimeout(() => setIsLeylineShifting(false), 900);
  };

  // Handle direct weather pick
  const handleSelectWeather = (type: RegionalWeatherType) => {
    if (type === activeWeather.type) return;
    setIsLeylineShifting(true);
    sound.playClick();
    const next = REGIONAL_WEATHERS[type];
    setActiveWeather(next);
    setCountdown(35);
    onWeatherChange?.(next);
    setTimeout(() => setIsLeylineShifting(false), 700);
  };

  const handleNodeClick = (node: RealmNode) => {
    sound.playClick();
    setSelectedNode(node);
  };

  const handleLaunchCombat = () => {
    if (!selectedNode) return;
    sound.playLootRoll();
    onSelectNode(selectedNode);
  };

  // =========================================================================
  // 1. FULL-COMPONENT WEATHER CANVAS EFFECT (Falling Astral Particles, Crystals, Void Motes)
  // =========================================================================
  useEffect(() => {
    if (!isHeavyFxOn) return;
    const canvas = fullMapCanvasRef.current;
    const container = mapContainerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = container.offsetWidth || window.innerWidth);
    let height = (canvas.height = container.offsetHeight || 1000);

    const handleResize = () => {
      if (!canvas || !container) return;
      width = canvas.width = container.offsetWidth || window.innerWidth;
      height = canvas.height = container.offsetHeight || 1000;
    };
    window.addEventListener('resize', handleResize);

    // Particle system configuration for the full map view
    interface MapParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      length?: number;
      size: number;
      alpha: number;
      maxAlpha: number;
      rotation: number;
      spin: number;
      color: string;
      trailLength?: number;
    }

    const particles: MapParticle[] = [];
    const count =
      activeWeather.type === 'Astral Storm'
        ? 65
        : activeWeather.type === 'Crystal Mist'
        ? 45
        : 50;

    for (let i = 0; i < count; i++) {
      const isAstral = activeWeather.type === 'Astral Storm';
      const isMist = activeWeather.type === 'Crystal Mist';
      const isEclipse = activeWeather.type === 'Void Eclipse';

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: isAstral
          ? -1.2 + Math.random() * 0.8
          : isMist
          ? 0.3 + Math.random() * 0.6
          : (Math.random() - 0.5) * 0.7,
        vy: isAstral
          ? 3.5 + Math.random() * 4.5 // Falling celestial rainfall
          : isMist
          ? 0.2 + Math.random() * 0.5 // Gentle mist drift
          : -0.4 - Math.random() * 0.8, // Ascending void gravity motes
        size: isMist ? 3 + Math.random() * 5 : 1.5 + Math.random() * 2.8,
        length: isAstral ? 14 + Math.random() * 22 : undefined,
        alpha: Math.random() * 0.5,
        maxAlpha: isAstral ? 0.65 : isMist ? 0.45 : 0.55,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.03,
        color: isAstral
          ? Math.random() > 0.35
            ? '#38bdf8'
            : '#93c5fd'
          : isMist
          ? Math.random() > 0.4
            ? '#34d399'
            : '#2dd4bf'
          : Math.random() > 0.35
          ? '#c084fc'
          : '#e879f9',
      });
    }

    let frameCount = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      frameCount++;

      // Subtle ambient fog patches on Crystal Mist
      if (activeWeather.type === 'Crystal Mist' && frameCount % 2 === 0) {
        // Draw soft rolling mist nebulas
        const gradientFog = ctx.createRadialGradient(
          width * 0.35 + Math.sin(frameCount * 0.01) * 80,
          height * 0.45,
          100,
          width * 0.35,
          height * 0.45,
          width * 0.6
        );
        gradientFog.addColorStop(0, 'rgba(52, 211, 153, 0.035)');
        gradientFog.addColorStop(0.5, 'rgba(45, 212, 191, 0.02)');
        gradientFog.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradientFog;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw active particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;

        // Wrap around borders
        if (p.x < -40) p.x = width + 40;
        if (p.x > width + 40) p.x = -40;
        if (p.y < -40) p.y = height + 40;
        if (p.y > height + 40) p.y = -40;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        if (activeWeather.type === 'Astral Storm') {
          // Falling 'astral' particle streak with luminous head and tail
          const tailLen = p.length || 18;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * (tailLen / 4), p.y - p.vy * (tailLen / 4));
          ctx.stroke();

          // Bright star head
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (activeWeather.type === 'Crystal Mist') {
          // Floating translucent crystalline diamond
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.2);
          ctx.lineTo(p.size * 0.8, 0);
          ctx.lineTo(0, p.size * 1.2);
          ctx.lineTo(-p.size * 0.8, 0);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          // Ascending Void Eclipse Gravitational Mote
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          // Subtle corona halo
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeWeather.type, isHeavyFxOn]);

  // =========================================================================
  // 2. WEATHER BANNER CANVAS EFFECT (Header Card Focused Particles & Arcs)
  // =========================================================================
  useEffect(() => {
    const canvas = weatherBannerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.offsetWidth || 800);
    let height = (canvas.height = canvas.offsetHeight || 160);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || 800;
      height = canvas.height = canvas.offsetHeight || 160;
    };
    window.addEventListener('resize', handleResize);

    const bannerParticles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
    }> = [];

    for (let i = 0; i < 35; i++) {
      bannerParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: 1.5 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.6,
        color:
          activeWeather.type === 'Astral Storm'
            ? '#38bdf8'
            : activeWeather.type === 'Crystal Mist'
            ? '#34d399'
            : '#c084fc',
      });
    }

    let boltCooldown = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Astral Storm Lightning Arc
      if (activeWeather.type === 'Astral Storm') {
        boltCooldown++;
        if (boltCooldown > 65 && Math.random() < 0.12) {
          boltCooldown = 0;
          ctx.save();
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          let lx = Math.random() * width;
          let ly = 0;
          ctx.moveTo(lx, ly);
          while (ly < height) {
            lx += (Math.random() - 0.5) * 26;
            ly += 12 + Math.random() * 18;
            ctx.lineTo(lx, ly);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // Void Eclipse Gravitational Singularity Pulse
      if (activeWeather.type === 'Void Eclipse') {
        const cx = width * 0.88;
        const cy = height * 0.5;
        const pulse = 26 + Math.sin(Date.now() * 0.003) * 6;
        ctx.save();
        ctx.beginPath();
        const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, pulse * 2.2);
        grad.addColorStop(0, 'rgba(192, 132, 252, 0.45)');
        grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.15)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.arc(cx, cy, pulse * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(216, 180, 254, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      }

      // Draw Banner Particles
      bannerParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeWeather.type]);

  return (
    <div
      ref={mapContainerRef}
      className={`relative max-w-7xl mx-auto p-4 md:p-6 rounded-3xl border transition-all duration-700 ease-in-out select-none font-sans overflow-hidden ${theme.containerBorder} ${theme.containerBgGradient} ${theme.containerShadow}`}
    >
      {/* ==================================================================== */}
      {/* ATMOSPHERIC FULL-MAP OVERLAYS & AMBIENT EFFECTS */}
      {/* ==================================================================== */}
      {isHeavyFxOn ? (
        <>
          {/* Full-Map Particle Canvas (Falling Astral Storm rain, Crystal flakes, Void motes) */}
          <canvas
            ref={fullMapCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-70 transition-opacity duration-700"
          />

          {/* 1. Astral Storm: Subtle Ambient Celestial Lightning Flicker across the entire map */}
          {activeWeather.type === 'Astral Storm' && (
            <div className="absolute inset-0 pointer-events-none bg-sky-400/5 mix-blend-screen animate-astral-lightning z-10 transition-opacity duration-1000" />
          )}

          {/* 2. Crystal Mist: Low-Opacity Multi-Layer Rolling Fog Banks */}
          {activeWeather.type === 'Crystal Mist' && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
              {/* Fog Layer A (Drifting gently left-to-right) */}
              <div
                className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] animate-fog-slow opacity-25 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 30% 40%, rgba(52, 211, 153, 0.22) 0%, rgba(45, 212, 191, 0.12) 35%, transparent 70%)',
                  filter: 'blur(45px)',
                }}
              />
              {/* Fog Layer B (Counter-drifting iridescent mist) */}
              <div
                className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] animate-fog-reverse opacity-20 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at 75% 65%, rgba(6, 182, 212, 0.20) 0%, rgba(52, 211, 153, 0.08) 40%, transparent 68%)',
                  filter: 'blur(55px)',
                }}
              />
            </div>
          )}

          {/* 3. Void Eclipse: Periodic Screen Dimming / Breathing Abyssal Darkness */}
          {activeWeather.type === 'Void Eclipse' && (
            <div
              className="absolute inset-0 pointer-events-none animate-eclipse-dim z-10 transition-all duration-1000"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0) 30%, rgba(46, 16, 101, 0.35) 75%, rgba(2, 6, 23, 0.65) 100%)',
              }}
            />
          )}
        </>
      ) : (
        /* Lightweight static fallback for lower-end devices (no blur filters or animations) */
        <div
          className="absolute inset-0 pointer-events-none z-10 opacity-30 transition-opacity duration-500"
          style={{
            background:
              activeWeather.type === 'Astral Storm'
                ? 'radial-gradient(circle at 50% 15%, rgba(56, 189, 248, 0.1), transparent 70%)'
                : activeWeather.type === 'Crystal Mist'
                ? 'radial-gradient(circle at 50% 15%, rgba(52, 211, 153, 0.1), transparent 70%)'
                : 'radial-gradient(circle at 50% 15%, rgba(192, 132, 252, 0.1), transparent 70%)',
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* Upper Navigation & Realm Header */}
      {/* ==================================================================== */}
      <div className="relative z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className={`flex items-center gap-2 font-tech font-bold text-xs uppercase tracking-wider mb-1 transition-colors duration-500 ${theme.subHeaderAccent}`}>
            <Compass className="w-4 h-4" />
            <span>SUBTERRANEAN EXPEDITIONS & GATES</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-rpg font-extrabold text-white">
              {currentRealm.name}
            </h1>
            {/* Dynamic CSS Weather Theme Modifier Badge */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-tech font-bold tracking-wide backdrop-blur transition-all duration-700 shadow-md ${theme.briefingBadge}`}
            >
              <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: activeWeather.color }} />
              <span>THEME: {theme.paletteDescription.toUpperCase()}</span>
            </div>
          </div>
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
                className={`px-4 py-2.5 rounded-2xl font-rpg font-bold text-xs transition-all duration-500 whitespace-nowrap border cursor-pointer ${
                  isSelected
                    ? `${theme.synergyBoxBg} ${theme.selectedCardBorder} ${theme.accentText} ${theme.selectedCardShadow}`
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {realm.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* DYNAMIC REGIONAL WEATHER SYSTEM HUD CARD */}
      {/* ==================================================================== */}
      <div
        className={`relative z-20 mb-8 rounded-3xl border ${activeWeather.borderColor} bg-gradient-to-br ${activeWeather.bgGradient} overflow-hidden shadow-2xl transition-all duration-500 backdrop-blur ${
          isLeylineShifting ? 'ring-2 ring-white/50 scale-[1.005]' : ''
        }`}
      >
        {/* Ambient Canvas Background for Banner Particles */}
        <canvas
          ref={weatherBannerCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
        />

        {/* Inner Content */}
        <div className="relative z-10 p-5 md:p-6 flex flex-col gap-5">
          {/* Top Row: Weather Identification, Controls & Countdown */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3.5">
              <div
                className="w-13 h-13 md:w-15 md:h-15 rounded-2xl flex items-center justify-center text-3xl md:text-4xl shadow-xl border shrink-0 backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  borderColor: activeWeather.color,
                  boxShadow: `0 0 20px ${activeWeather.accentGlow}`,
                }}
              >
                <span className="animate-pulse">{activeWeather.icon}</span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-tech font-bold tracking-widest text-slate-300 bg-slate-950/70 border border-slate-700/60 px-2 py-0.5 rounded-md">
                    REGIONAL WEATHER PHENOMENON
                  </span>
                  <span
                    className="text-[10px] font-tech font-bold px-2 py-0.5 rounded-md uppercase"
                    style={{
                      color: activeWeather.color,
                      backgroundColor: 'rgba(0,0,0,0.4)',
                    }}
                  >
                    Active in {currentRealm.name}
                  </span>

                  {/* Active Visual FX Indicator */}
                  <span className="text-[10px] font-tech font-bold px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700/80 text-slate-300 flex items-center gap-1">
                    {isHeavyFxOn ? (
                      activeWeather.type === 'Astral Storm' ? (
                        <>🌌 Falling Astral Particles & Lightning Active</>
                      ) : activeWeather.type === 'Crystal Mist' ? (
                        <>🌫️ Iridescent Rolling Fog & Crystals Active</>
                      ) : (
                        <>🌑 Screen Dimming & Gravitational Motes Active</>
                      )
                    ) : (
                      <span className="text-amber-300 flex items-center gap-1 font-bold">
                        ⚡ Low-End Device Mode (Fog & Lightning Bypassed)
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-0.5">
                  <h2 className="text-2xl md:text-3xl font-rpg font-black text-white tracking-wide">
                    {activeWeather.name}
                  </h2>
                  <span className="text-xs font-tech text-slate-300 hidden md:inline">
                    — {activeWeather.tagline}
                  </span>
                </div>
                <p className="text-xs text-slate-300/90 max-w-2xl mt-1 leading-relaxed">
                  {activeWeather.description}
                </p>
              </div>
            </div>

            {/* Interactive Shift Controls, Countdown & FX Toggle */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Weather Visual FX Toggle */}
              <button
                onClick={() => {
                  sound.playClick();
                  if (onToggleHeavyWeatherFx) {
                    onToggleHeavyWeatherFx();
                  } else {
                    setWeatherFxEnabled(!weatherFxEnabled);
                  }
                }}
                className={`px-3 py-2 rounded-2xl border text-xs font-tech font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isHeavyFxOn
                    ? 'bg-slate-900/90 border-cyan-500/50 text-cyan-300 shadow-sm hover:border-cyan-400'
                    : 'bg-amber-950/70 border-amber-500/60 text-amber-300 hover:border-amber-400'
                }`}
                title={
                  isHeavyFxOn
                    ? 'Heavy visual effects enabled. Click to optimize performance for lower-end devices (disables fog blurs, screen dimming & lightning flickers).'
                    : 'Performance mode active (heavy visual effects bypassed). Click to enable high fidelity weather FX.'
                }
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Atmosphere FX: {isHeavyFxOn ? 'ON' : 'LOW-END (OFF)'}</span>
              </button>

              {/* Countdown Gauge */}
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-2xl shadow-inner">
                <RefreshCw
                  className={`w-4 h-4 text-slate-400 ${
                    countdown <= 5 ? 'animate-spin text-amber-400' : ''
                  }`}
                />
                <div className="flex flex-col">
                  <span className="text-[9px] font-tech uppercase text-slate-400 font-bold leading-none">
                    Leyline Cycle
                  </span>
                  <span className="text-xs font-tech font-extrabold text-white">
                    Shift in <strong className="text-cyan-400">{countdown}s</strong>
                  </span>
                </div>
                {/* Visual mini progress bar */}
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden ml-1">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-1000"
                    style={{ width: `${(countdown / 35) * 100}%` }}
                  />
                </div>
              </div>

              {/* Manual Resonance Attunement Button */}
              <button
                onClick={handleRandomWeatherShift}
                disabled={isLeylineShifting}
                className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-rpg font-bold text-xs tracking-wide shadow-lg shadow-cyan-900/40 border border-cyan-400/40 flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                title="Randomly attune subterranean leylines to invoke a new weather state"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>ATTUNE LEYLINE</span>
              </button>
            </div>
          </div>

          {/* Middle Row: Direct Weather Switchers */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 text-xs font-tech font-bold text-slate-400">
              <Wind className="w-3.5 h-3.5" />
              <span>Attune Region Weather:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {WEATHER_TYPES.map((type) => {
                const w = REGIONAL_WEATHERS[type];
                const isActive = w.type === activeWeather.type;
                return (
                  <button
                    key={type}
                    onClick={() => handleSelectWeather(type)}
                    className={`px-3 py-1.5 rounded-xl font-rpg font-bold text-xs transition border flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 border-white/60 text-white shadow-lg'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                    style={
                      isActive
                        ? {
                            borderColor: w.color,
                            boxShadow: `0 0 12px ${w.accentGlow}`,
                          }
                        : {}
                    }
                  >
                    <span>{w.icon}</span>
                    <span>{w.name}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Row: Active Combat Stat Modifiers Badges */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-rpg font-extrabold text-white tracking-wide uppercase">
                  Party Combat Stat Impact Matrix
                </h3>
                <span className="text-[10px] text-slate-400 font-tech">
                  (Applied automatically across all dungeon chambers & combat encounters)
                </span>
              </div>

              {/* Toggle Party Roster Calibration Inspection */}
              {party.length > 0 && (
                <button
                  onClick={() => setIsPartyStatsOpen(!isPartyStatsOpen)}
                  className="flex items-center gap-1 text-[11px] font-rpg font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                >
                  <span>
                    {isPartyStatsOpen ? 'Hide Hero Calibrations' : 'Inspect Party Stat Calibrations'}
                  </span>
                  {isPartyStatsOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Modifier Pill Tags */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {/* Attack */}
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-tech text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Swords className="w-3 h-3 text-red-400" /> Attack
                </span>
                <span
                  className={`text-sm font-tech font-extrabold mt-0.5 ${
                    activeWeather.modifiers.attackMultiplier >= 1.0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {activeWeather.modifiers.attackMultiplier >= 1.0 ? '+' : ''}
                  {Math.round((activeWeather.modifiers.attackMultiplier - 1.0) * 100)}%
                </span>
              </div>

              {/* Defense */}
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-tech text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-400" /> Defense
                </span>
                <span
                  className={`text-sm font-tech font-extrabold mt-0.5 ${
                    activeWeather.modifiers.defenseMultiplier >= 1.0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {activeWeather.modifiers.defenseMultiplier >= 1.0 ? '+' : ''}
                  {Math.round((activeWeather.modifiers.defenseMultiplier - 1.0) * 100)}%
                </span>
              </div>

              {/* Crit Rate */}
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-tech text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Crit Rate
                </span>
                <span className="text-sm font-tech font-extrabold text-amber-300 mt-0.5">
                  +{Math.round(activeWeather.modifiers.critRateBonus * 100)}%
                </span>
              </div>

              {/* Crit Damage */}
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-tech text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-purple-400" /> Crit DMG
                </span>
                <span className="text-sm font-tech font-extrabold text-purple-300 mt-0.5">
                  +{Math.round((activeWeather.modifiers.critDmgMultiplier - 1.0) * 100)}%
                </span>
              </div>

              {/* Movement Speed */}
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-tech text-slate-400 uppercase font-bold flex items-center gap-1">
                  <Wind className="w-3 h-3 text-teal-400" /> Move Speed
                </span>
                <span
                  className={`text-sm font-tech font-extrabold mt-0.5 ${
                    activeWeather.modifiers.speedMultiplier >= 1.0
                      ? 'text-teal-300'
                      : 'text-rose-400'
                  }`}
                >
                  {activeWeather.modifiers.speedMultiplier >= 1.0 ? '+' : ''}
                  {Math.round((activeWeather.modifiers.speedMultiplier - 1.0) * 100)}%
                </span>
              </div>

              {/* Special Weather Perk */}
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-tech text-slate-400 uppercase font-bold flex items-center gap-1">
                  {activeWeather.type === 'Void Eclipse' ? (
                    <>
                      <Moon className="w-3 h-3 text-purple-400" /> Life-Steal
                    </>
                  ) : activeWeather.type === 'Crystal Mist' ? (
                    <>
                      <Heart className="w-3 h-3 text-emerald-400" /> HP Shield
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-sky-400" /> Aether Surge
                    </>
                  )}
                </span>
                <span className="text-sm font-tech font-extrabold text-white mt-0.5">
                  {activeWeather.type === 'Void Eclipse'
                    ? '+25% Leech'
                    : activeWeather.type === 'Crystal Mist'
                    ? '+25% Max HP'
                    : '+50% Stagger'}
                </span>
              </div>
            </div>

            {/* Collapsible Party Stat Calibrations Preview */}
            {isPartyStatsOpen && party.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 animate-fadeIn">
                <div className="text-[11px] font-tech font-bold text-slate-400 mb-2">
                  Active 6-Hero Party Calibrated Stats under{' '}
                  <strong style={{ color: activeWeather.color }}>{activeWeather.name}</strong>:
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {party.map((hero) => {
                    const effectiveAtk = Math.round(
                      hero.attack * activeWeather.modifiers.attackMultiplier
                    );
                    const atkDiff = effectiveAtk - hero.attack;
                    const effectiveDef = Math.round(
                      hero.defense * activeWeather.modifiers.defenseMultiplier
                    );
                    const defDiff = effectiveDef - hero.defense;
                    const effectiveMaxHp = Math.round(
                      hero.maxHp * activeWeather.modifiers.maxHpMultiplier
                    );
                    const effectiveCrit = Math.min(
                      100,
                      Math.round(
                        ((hero.critRate || 0.25) + activeWeather.modifiers.critRateBonus) * 100
                      )
                    );

                    return (
                      <div
                        key={hero.id}
                        className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{hero.avatarIcon}</span>
                            <div>
                              <div className="font-rpg font-bold text-xs text-white leading-none">
                                {hero.name}
                              </div>
                              <div className="text-[9px] text-slate-400 font-tech">
                                {hero.className || hero.title}
                              </div>
                            </div>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-950 font-tech font-bold text-cyan-400 uppercase">
                            {hero.element}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1 text-[10px] font-tech">
                          <div className="flex justify-between bg-slate-950/80 px-1.5 py-0.5 rounded">
                            <span className="text-slate-400">ATK:</span>
                            <span className="text-white font-bold">
                              {effectiveAtk}{' '}
                              <strong
                                className={atkDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                              >
                                ({atkDiff >= 0 ? `+${atkDiff}` : atkDiff})
                              </strong>
                            </span>
                          </div>

                          <div className="flex justify-between bg-slate-950/80 px-1.5 py-0.5 rounded">
                            <span className="text-slate-400">DEF:</span>
                            <span className="text-white font-bold">
                              {effectiveDef}{' '}
                              <strong
                                className={defDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                              >
                                ({defDiff >= 0 ? `+${defDiff}` : defDiff})
                              </strong>
                            </span>
                          </div>

                          <div className="flex justify-between bg-slate-950/80 px-1.5 py-0.5 rounded">
                            <span className="text-slate-400">MAX HP:</span>
                            <span className="text-white font-bold">{effectiveMaxHp}</span>
                          </div>

                          <div className="flex justify-between bg-slate-950/80 px-1.5 py-0.5 rounded">
                            <span className="text-slate-400">CRIT:</span>
                            <span className="text-amber-300 font-bold">{effectiveCrit}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Grid Layout: Chamber Selection & Briefing */}
      {/* ==================================================================== */}
      <div className="relative z-20 grid lg:grid-cols-3 gap-8">
        {/* Node Grid Map with Dynamic Weather Theme Background Gradient & Border */}
        <div
          className={`lg:col-span-2 border rounded-3xl p-6 relative overflow-hidden backdrop-blur transition-all duration-700 ease-in-out ${theme.gridBorder} ${theme.gridBgGradient} ${theme.gridShadow}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-rpg font-bold text-slate-200 flex items-center gap-2">
              <Swords className={`w-4 h-4 transition-colors duration-500 ${theme.accentText}`} />
              <span>Dungeon Sub-Levels & Chambers</span>
            </h2>
            <span className="text-xs text-slate-400 font-tech">Click a chamber to inspect details</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {currentRealm.nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all duration-500 ease-in-out flex flex-col justify-between ${
                    isSelected
                      ? `${theme.selectedCardGradient} ${theme.selectedCardBorder} ${theme.selectedCardShadow}`
                      : `bg-slate-950/85 border-slate-800/80 ${theme.unselectedCardHoverBorder}`
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border font-tech font-bold uppercase transition-colors duration-500 ${
                          isSelected
                            ? theme.cardTypeBadge
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        {node.type.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-xs font-tech font-bold transition-colors duration-500 ${
                          isSelected ? theme.cardPwrColor : 'text-amber-400'
                        }`}
                      >
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

                  <div className="mt-4 pt-3 border-t border-slate-900/90 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-tech text-slate-400">
                      <span>Monsters:</span>
                      <strong className="text-slate-200">{node.enemies?.length || 2}</strong>
                    </div>

                    <div
                      className={`flex items-center gap-1 text-xs font-rpg font-bold transition-colors duration-500 ${theme.cardInspectColor}`}
                    >
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Chamber Briefing & Launch Panel with Dynamic Theme */}
        {selectedNode && (
          <div
            className={`border rounded-3xl p-6 flex flex-col justify-between backdrop-blur transition-all duration-700 ease-in-out ${theme.briefingBorder} ${theme.briefingBgGradient} ${theme.briefingShadow}`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs border px-3 py-1 rounded-xl font-rpg font-bold uppercase transition-all duration-500 ${theme.briefingBadge}`}
                >
                  {selectedNode.type.replace('_', ' ')}
                </span>
                <span className="text-xs font-tech text-amber-400 font-bold">
                  Recommended Power: {selectedNode.recommendedPower}
                </span>
              </div>

              <h2 className="text-xl font-rpg font-extrabold text-white mb-2">
                {selectedNode.name}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-4 font-sans">
                {selectedNode.description}
              </p>

              {/* Regional Weather Synergy Alert in this Chamber */}
              <div
                className="mb-5 p-3 rounded-2xl border bg-slate-950/90 flex flex-col gap-1"
                style={{ borderColor: activeWeather.color }}
              >
                <div className="flex items-center gap-1.5 text-xs font-rpg font-bold">
                  <span>{activeWeather.icon}</span>
                  <span style={{ color: activeWeather.color }}>
                    {activeWeather.name} Synergy Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal font-sans">
                  {activeWeather.type === 'Astral Storm'
                    ? '⚡ Overcharged Aether: All party crits deal massive bonus lightning damage (+35% Crit Rate). Exploit armor plates quickly!'
                    : activeWeather.type === 'Crystal Mist'
                    ? '💎 Protective Prismatic Vapor: Inbound enemy concussions reduced by 30% (+30% DEF). Party max health bolstered with vapor shielding!'
                    : '🌑 Void Gravity Warp: Critical strikes trigger +25% Life-Steal Leech. Be wary of reduced max HP and sluggish footwork!'}
                </p>
              </div>

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
                        <span className="text-[10px] text-amber-400 font-tech font-bold">
                          Lv. {enemy.level}
                        </span>
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
                          <strong className="text-white">
                            +{selectedNode.rewards.craftingMaterials.goblinLeather}
                          </strong>
                        </div>
                      )}
                      {selectedNode.rewards.craftingMaterials.golemAlloy && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-amber-400">Golem Slag:</span>
                          <strong className="text-white">
                            +{selectedNode.rewards.craftingMaterials.golemAlloy}
                          </strong>
                        </div>
                      )}
                      {selectedNode.rewards.craftingMaterials.alchemicalHerbs && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-emerald-300">Shaman Herbs:</span>
                          <strong className="text-white">
                            +{selectedNode.rewards.craftingMaterials.alchemicalHerbs}
                          </strong>
                        </div>
                      )}
                      {selectedNode.rewards.craftingMaterials.fairyDust && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                          <span className="text-purple-400">Fairy Dust:</span>
                          <strong className="text-white">
                            +{selectedNode.rewards.craftingMaterials.fairyDust}
                          </strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Launch Button with Dynamic Weather Theme Gradient & Border */}
            <button
              onClick={handleLaunchCombat}
              className={`w-full py-4 rounded-2xl ${theme.launchButtonGradient} ${theme.launchButtonBorder} ${theme.launchButtonShadow} text-white font-rpg font-extrabold text-sm tracking-wide transition-all duration-500 flex items-center justify-center gap-2 group cursor-pointer`}
            >
              <Swords className="w-5 h-5 group-hover:scale-110 transition" />
              <span>ENTER DUNGEON ({activeWeather.name.toUpperCase()})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

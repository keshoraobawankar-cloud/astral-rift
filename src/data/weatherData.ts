import { RegionalWeather, RegionalWeatherType } from '../types/game';

export const REGIONAL_WEATHERS: Record<RegionalWeatherType, RegionalWeather> = {
  'Astral Storm': {
    type: 'Astral Storm',
    name: 'Astral Storm',
    tagline: 'Supercharged Aether Leylines & Starlight Arc Lightning',
    description:
      'Violent celestial tempest surges through the subterranean rift. Aether lightning electrifies weapons for immense offensive burst at the cost of defensive stability.',
    icon: '⚡',
    color: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.45)',
    bgGradient: 'from-sky-950/70 via-slate-950/90 to-blue-950/70',
    borderColor: 'border-sky-500/60',
    statSummary: '+20% Attack, +35% Crit Rate, +20% Crit DMG, -15% Defense',
    modifiers: {
      attackMultiplier: 1.2,
      defenseMultiplier: 0.85,
      critRateBonus: 0.35,
      critDmgMultiplier: 1.2,
      speedMultiplier: 1.1,
      maxHpMultiplier: 1.0,
      lifeStealRate: 0,
    },
  },
  'Crystal Mist': {
    type: 'Crystal Mist',
    name: 'Crystal Mist',
    tagline: 'Prismatic Mana Condensation & Heavy Protective Vapor',
    description:
      'A dense, iridescent aerosol of crystallizing mana drifts from subterranean springs. Thick vapors cushion against concussive blows and shield party vitals.',
    icon: '💎',
    color: '#22d3ee',
    accentGlow: 'rgba(34, 211, 238, 0.45)',
    bgGradient: 'from-cyan-950/70 via-slate-950/90 to-blue-950/70',
    borderColor: 'border-cyan-500/60',
    statSummary: '+30% Defense, +25% Max HP Shield, +15% Speed, -10% Attack',
    modifiers: {
      attackMultiplier: 0.9,
      defenseMultiplier: 1.3,
      critRateBonus: 0.05,
      critDmgMultiplier: 1.0,
      speedMultiplier: 1.15,
      maxHpMultiplier: 1.25,
      lifeStealRate: 0,
    },
  },
  'Void Eclipse': {
    type: 'Void Eclipse',
    name: 'Void Eclipse',
    tagline: 'Twin Moon Umbral Alignment & Abyssal Leech Current',
    description:
      'The twin moons blot out stellar rays, plunging the rift into abyssal twilight. High lethality and soul-draining vampirism awaken, but life essence is steadily taxed.',
    icon: '🌑',
    color: '#c084fc',
    accentGlow: 'rgba(192, 132, 252, 0.45)',
    bgGradient: 'from-purple-950/70 via-slate-950/90 to-fuchsia-950/70',
    borderColor: 'border-purple-500/60',
    statSummary: '+45% Crit DMG, +25% Life-Steal Leech, -20% Max HP, -10% Speed',
    modifiers: {
      attackMultiplier: 1.1,
      defenseMultiplier: 1.0,
      critRateBonus: 0.15,
      critDmgMultiplier: 1.45,
      speedMultiplier: 0.9,
      maxHpMultiplier: 0.8,
      lifeStealRate: 0.25,
    },
  },
};

export const WEATHER_TYPES: RegionalWeatherType[] = [
  'Astral Storm',
  'Crystal Mist',
  'Void Eclipse',
];

export function getRandomWeather(excludeCurrent?: RegionalWeatherType): RegionalWeather {
  const choices = excludeCurrent
    ? WEATHER_TYPES.filter((w) => w !== excludeCurrent)
    : WEATHER_TYPES;
  const picked = choices[Math.floor(Math.random() * choices.length)];
  return REGIONAL_WEATHERS[picked];
}

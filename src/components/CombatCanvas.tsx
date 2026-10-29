import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Character,
  Enemy,
  DungeonTrap,
  CombatParticle,
  Projectile,
  FloatingText,
  SlashEffect,
  Shockwave,
  ElementType,
  RealmNode,
  LootMode,
  RegionalWeather,
} from '../types/game';
import { sound } from '../services/soundService';
import {
  Shield,
  Zap,
  Sparkles,
  Swords,
  RotateCcw,
  Volume2,
  VolumeX,
  Skull,
  Dice5,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wind,
  Hammer,
  ChevronRight,
  Crosshair,
} from 'lucide-react';
import { bestiaryService } from '../services/bestiaryService';
import { CombatLog, CombatLogEntry, CombatLogType } from './CombatLog';

interface CombatCanvasProps {
  party: Character[];
  activeCharIndex: number;
  onSelectCharacter: (idx: number) => void;
  node: RealmNode;
  manaPotions: number;
  onUseManaPotion: () => void;
  onVictory: (rewards: RealmNode['rewards']) => void;
  onDefeat: () => void;
  onExit: () => void;
  activePetId?: string;
  weather?: RegionalWeather;
}

interface LootRollResult {
  itemName: string;
  winner: string;
  roll: number;
  mode: string;
}

interface ShadowAfterimage {
  x: number;
  y: number;
  alpha: number;
  color: string;
  avatarIcon: string;
}

export const CombatCanvas: React.FC<CombatCanvasProps> = ({
  party,
  activeCharIndex,
  onSelectCharacter,
  node,
  manaPotions,
  onUseManaPotion,
  onVictory,
  onDefeat,
  onExit,
  activePetId = 'void_hatchling',
  weather,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Hero State
  const activeChar = party[activeCharIndex] || party[0];
  const effectiveMaxHp = Math.round(activeChar.maxHp * (weather?.modifiers.maxHpMultiplier ?? 1.0));
  const [playerHp, setPlayerHp] = useState(effectiveMaxHp);
  const [playerMaxHp, setPlayerMaxHp] = useState(effectiveMaxHp);
  const [playerEnergy, setPlayerEnergy] = useState(activeChar.energy);
  const [activeCooldowns, setActiveCooldowns] = useState<{ normal: number; active: number; burst: number; dodge: number }>({
    normal: 0,
    active: 0,
    burst: 0,
    dodge: 0,
  });

  // Combo Counter State (18 HITS, 58 HITS)
  const [comboHits, setComboHits] = useState<number>(0);
  const comboTimerRef = useRef<number>(0);

  // Feature D: Potion Toxicity Meter & Mana Sickness Debuff (GDD Section 3 & Feature D)
  const [currentToxicity, setCurrentToxicity] = useState<number>(0);
  const [manaSicknessTimer, setManaSicknessTimer] = useState<number>(0);

  // Feature E: 15-minute (900s) World Boss Enrage & WeatherShift (GDD Feature E)
  const [enrageTimer, setEnrageTimer] = useState<number>(900);
  const [enrageWeatherShift, setEnrageWeatherShift] = useState<boolean>(false);

  // Game Arena State
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [traps, setTraps] = useState<DungeonTrap[]>([]);
  const [combatOutcome, setCombatOutcome] = useState<'playing' | 'victory' | 'defeat'>('playing');
  const [synergyBanner, setSynergyBanner] = useState<string | null>(null);
  const [lootMode, setLootMode] = useState<LootMode>('roll_need_greed');
  const [lootRolls, setLootRolls] = useState<LootRollResult[]>([]);
  const [isLootModalOpen, setIsLootModalOpen] = useState(false);

  // Combat Log State & Enemy Attack Throttles
  const [combatLogs, setCombatLogs] = useState<CombatLogEntry[]>([]);
  const enemyAttackTimersRef = useRef<{ [enemyId: string]: number }>({});

  const addCombatLog = useCallback(
    (type: CombatLogType, message: string, detail?: string, isCrit?: boolean, value?: number) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now
        .getMinutes()
        .toString()
        .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      setCombatLogs((prev) => {
        const newEntry: CombatLogEntry = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: timeStr,
          type,
          message,
          detail,
          isCrit,
          value,
        };
        return [...prev.slice(-99), newEntry];
      });
    },
    []
  );

  // Entities & Animations
  const particlesRef = useRef<CombatParticle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const slashEffectsRef = useRef<SlashEffect[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const shadowClonesRef = useRef<ShadowAfterimage[]>([]);
  const screenShakeRef = useRef<number>(0);
  const slainEnemyIdsRef = useRef<Set<string>>(new Set());

  // Player Arena Position
  const playerPosRef = useRef<{ x: number; y: number; vx: number; vy: number; radius: number; facing: number }>({
    x: 400,
    y: 350,
    vx: 0,
    vy: 0,
    radius: 22,
    facing: 0,
  });

  // Keys Tracking
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Next Hunter for Support Quick-Swap (Matching Screenshot 2 right-side hunter support icon)
  const nextHunterIndex = (activeCharIndex + 1) % party.length;
  const supportHunter = party[nextHunterIndex];

  // Primary Boss Enemy (for top-center Boss HUD matching Screenshot 1 & 2)
  const bossEnemy = enemies.find((e) => e.type === 'golem' || e.type === 'goblin_shaman' || e.type === 'undead' || e.type === 'mimic') || enemies[0];

  // Initialize Dungeon Enemies based on Ecology
  useEffect(() => {
    const spawnedEnemies: Enemy[] = [];
    const spawnedTraps: DungeonTrap[] = [];

    if (node.id === 'node_d1') {
      // Level 1: Goblin Warrens
      spawnedEnemies.push({
        id: 'gob_1',
        name: 'Goblin Marauder',
        level: 4,
        element: 'earth',
        maxHp: 750,
        currentHp: 750,
        maxShield: 100,
        currentShield: 100,
        attack: 42,
        defense: 25,
        speed: 3.2,
        radius: 18,
        x: 250,
        y: 180,
        vx: 0,
        vy: 0,
        type: 'goblin',
        attackCooldown: 1.2,
        telegraphTimer: 0,
        telegraphDuration: 0.8,
        color: '#10b981',
        aiState: 'chase',
        stunTimer: 0,
      });

      spawnedEnemies.push({
        id: 'gob_shaman',
        name: 'Goblin Shaman (Herbalist)',
        level: 5,
        element: 'arcane',
        maxHp: 950,
        currentHp: 950,
        maxShield: 150,
        currentShield: 150,
        attack: 55,
        defense: 20,
        speed: 2.5,
        radius: 20,
        x: 550,
        y: 180,
        vx: 0,
        vy: 0,
        type: 'goblin_shaman',
        attackCooldown: 2.2,
        telegraphTimer: 0,
        telegraphDuration: 1.2,
        color: '#a855f7',
        aiState: 'chase',
        stunTimer: 0,
      });

      spawnedTraps.push(
        { id: 'trap_1', x: 350, y: 300, radius: 24, detected: false, triggered: false, type: 'tripwire' },
        { id: 'trap_2', x: 450, y: 240, radius: 24, detected: false, triggered: false, type: 'tripwire' }
      );
    } else if (node.id === 'node_d2') {
      // Level 2: Trap-Weavers & Mimics
      spawnedEnemies.push({
        id: 'mimic_1',
        name: 'Gilded Chest Mimic',
        level: 6,
        element: 'void',
        maxHp: 1400,
        currentHp: 1400,
        maxShield: 200,
        currentShield: 200,
        attack: 68,
        defense: 45,
        speed: 2.8,
        radius: 24,
        x: 400,
        y: 200,
        vx: 0,
        vy: 0,
        type: 'mimic',
        isMimic: true,
        revealed: activeChar.race === 'fairy',
        attackCooldown: 1.5,
        telegraphTimer: 0,
        telegraphDuration: 0.9,
        color: '#eab308',
        aiState: 'idle',
        stunTimer: 0,
      });
      spawnedTraps.push({ id: 'trap_mim', x: 400, y: 250, radius: 28, detected: false, triggered: false, type: 'tripwire' });
    } else if (node.id === 'node_d3') {
      // Level 3: Cursed Crypts Mana Drain
      spawnedEnemies.push({
        id: 'undead_1',
        name: 'Mana-Drain Revenant',
        level: 8,
        element: 'void',
        maxHp: 1500,
        currentHp: 1500,
        maxShield: 300,
        currentShield: 300,
        hasManaDrain: true,
        attack: 62,
        defense: 40,
        speed: 2.2,
        radius: 22,
        x: 300,
        y: 220,
        vx: 0,
        vy: 0,
        type: 'undead',
        attackCooldown: 2.0,
        telegraphTimer: 0,
        telegraphDuration: 1.0,
        color: '#9333ea',
        aiState: 'chase',
        stunTimer: 0,
      });

      spawnedEnemies.push({
        id: 'abom_1',
        name: 'Crypt Abomination',
        level: 8,
        element: 'arcane',
        maxHp: 1750,
        currentHp: 1750,
        maxShield: 250,
        currentShield: 250,
        hasManaDrain: true,
        attack: 74,
        defense: 50,
        speed: 2.0,
        radius: 26,
        x: 500,
        y: 200,
        vx: 0,
        vy: 0,
        type: 'undead',
        attackCooldown: 2.4,
        telegraphTimer: 0,
        telegraphDuration: 1.4,
        color: '#6366f1',
        aiState: 'chase',
        stunTimer: 0,
      });
    } else {
      // Colossus Vault Boss (Golem with Destructible Armor Plates)
      spawnedEnemies.push({
        id: 'golem_colossus',
        name: 'Khaz-Gorgon Runic Colossus',
        title: 'Ancient Vault Warden',
        level: 10,
        element: 'earth',
        maxHp: 4200,
        currentHp: 4200,
        maxShield: 600,
        currentShield: 600,
        armorPlates: {
          maxArmor: 500,
          currentArmor: 500,
          isBroken: false,
        },
        attack: 85,
        defense: 75,
        speed: 1.6,
        radius: 38,
        x: 400,
        y: 190,
        vx: 0,
        vy: 0,
        type: 'golem',
        attackCooldown: 3.0,
        telegraphTimer: 0,
        telegraphDuration: 1.8,
        color: '#b45309',
        aiState: 'chase',
        stunTimer: 0,
      });
    }

    slainEnemyIdsRef.current.clear();
    enemyAttackTimersRef.current = {};
    spawnedEnemies.forEach((e) => {
      bestiaryService.recordEncounter(e.type || e.id);
    });

    setEnemies(spawnedEnemies);
    setTraps(spawnedTraps);
    setPlayerHp(effectiveMaxHp);
    setPlayerMaxHp(effectiveMaxHp);
    setPlayerEnergy(activeChar.energy);
    setComboHits(0);
    setCombatOutcome('playing');

    addCombatLog(
      'system',
      `⚔️ Encounter Started: ${node.name} (${node.tier ?? node.type})`,
      `Party Leader: ${activeChar.name} (LV. ${activeChar.level} ${activeChar.classType || activeChar.className || activeChar.title}). Foes: ${spawnedEnemies.map((e) => e.name).join(', ')}.`
    );

    if (weather) {
      addCombatLog(
        'system',
        `⛈️ Regional Weather Active: ${weather.name} ${weather.icon}`,
        `${weather.tagline} — Modifiers: ${weather.statSummary}`
      );
    }
  }, [node, activeChar, addCombatLog, effectiveMaxHp, weather]);

  // Key Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
      if (e.key >= '1' && e.key <= '6') {
        const idx = parseInt(e.key) - 1;
        if (idx < party.length && idx !== activeCharIndex) {
          sound.playClick();
          onSelectCharacter(idx);
        }
      }
      if (e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'f') handleNormalAttack();
      if (e.key.toLowerCase() === 'q') handleSkillQ();
      if (e.key.toLowerCase() === 'e' || e.key.toLowerCase() === 'k') handleActiveSkill();
      if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'l') handleBurstSkill();
      if (e.key === ' ') handleDodge();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeCharIndex, party, onSelectCharacter]);

  // Register a hit to increment combo counter (Matching Solo Leveling "18 HITS", "58 HITS")
  const registerHit = (count = 1) => {
    setComboHits((prev) => prev + count);
    comboTimerRef.current = 2.8;
  };

  // Skill Q: Swift Dash Thrust / Kasaka Cross-Slash
  const handleSkillQ = () => {
    if (activeCooldowns.normal > 0 || combatOutcome !== 'playing') return;
    const player = playerPosRef.current;
    player.x += Math.cos(player.facing) * 50;
    player.y += Math.sin(player.facing) * 50;
    sound.playSlash();

    // Curved neon arc effect
    slashEffectsRef.current.push({
      x: player.x,
      y: player.y,
      angle: player.facing,
      radius: 45,
      color: '#38bdf8',
      alpha: 1,
      life: 0.2,
      maxLife: 0.2,
    });

    handleNormalAttack();
  };

  // Basic Attack
  const handleNormalAttack = () => {
    if (activeCooldowns.normal > 0 || combatOutcome !== 'playing') return;
    const player = playerPosRef.current;
    sound.playSlash();

    // Slash arc effect
    slashEffectsRef.current.push({
      x: player.x + Math.cos(player.facing) * 28,
      y: player.y + Math.sin(player.facing) * 28,
      angle: player.facing,
      radius: 40,
      color: activeChar.color,
      alpha: 1,
      life: 0.18,
      maxLife: 0.18,
    });

    setEnemies((prevEnemies) =>
      prevEnemies.map((enemy) => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.hypot(dx, dy);

        if (dist <= enemy.radius + 50) {
          registerHit(1);
          const weatherAtk = weather?.modifiers.attackMultiplier ?? 1.0;
          const weatherCritRate = (activeChar.critRate || 0.25) + (weather?.modifiers.critRateBonus ?? 0);
          const weatherCritDmg = (activeChar.critDmg || 1.5) * (weather?.modifiers.critDmgMultiplier ?? 1.0);
          const isCrit = Math.random() < Math.min(0.95, weatherCritRate);
          let damage = Math.floor(
            activeChar.attack * activeChar.skills.normal.scalingPct * (isCrit ? weatherCritDmg : 1) * weatherAtk
          );

          // Void Eclipse Life-Steal Leech
          if (isCrit && (weather?.modifiers.lifeStealRate || 0) > 0) {
            const leech = Math.max(1, Math.floor(damage * weather!.modifiers.lifeStealRate!));
            setPlayerHp((hp) => Math.min(effectiveMaxHp, hp + leech));
            floatingTextsRef.current.push({
              id: Math.random().toString(),
              text: `🩸 +${leech} VOID LEECH`,
              x: player.x,
              y: player.y - 45,
              color: '#c084fc',
              alpha: 1,
              vy: -1.2,
              isCrit: true,
              life: 1.2,
            });
          }

          // Golem Armor Plate logic
          let updatedArmor = enemy.armorPlates;
          if (enemy.armorPlates && !enemy.armorPlates.isBroken) {
            const shred = activeChar.race === 'dwarf' ? 80 : 30;
            const newArmor = Math.max(0, enemy.armorPlates.currentArmor - shred);
            const isBroken = newArmor <= 0;
            if (isBroken) {
              sound.playArmorBreak();
              floatingTextsRef.current.push({
                id: Math.random().toString(),
                text: '💥 ARMOR BROKEN! (Golem Slag Harvested)',
                x: enemy.x,
                y: enemy.y - 35,
                color: '#f59e0b',
                alpha: 1,
                vy: -1.2,
                isCrit: true,
                life: 1.5,
              });
            }
            updatedArmor = { ...enemy.armorPlates, currentArmor: newArmor, isBroken };
            damage = Math.floor(damage * 0.45);
          }

          // Synergy Combo Check: Dwarf Hammer striking enemy Primed with Wind!
          if (activeChar.race === 'dwarf' && enemy.primedWindTimer && enemy.primedWindTimer > 0) {
            damage = Math.floor(damage * 4.5);
            sound.playSynergyTempest();
            screenShakeRef.current = 14;

            shockwavesRef.current.push({
              x: enemy.x,
              y: enemy.y,
              radius: 10,
              maxRadius: 180,
              color: '#38bdf8',
              alpha: 1,
              isSynergyTempest: true,
            });

            setSynergyBanner('🌪️⚡ SYNERGY: SHOCKWAVE TEMPEST! (+350% AoE DAMAGE)');
            setTimeout(() => setSynergyBanner(null), 3000);

            floatingTextsRef.current.push({
              id: Math.random().toString(),
              text: '🌪️ SHOCKWAVE TEMPEST!',
              x: enemy.x,
              y: enemy.y - 50,
              color: '#38bdf8',
              alpha: 1,
              vy: -1.5,
              isCrit: true,
              life: 1.8,
            });
          }

          const newHp = Math.max(0, enemy.currentHp - damage);

          floatingTextsRef.current.push({
            id: Math.random().toString(),
            text: isCrit ? `CRIT ${damage}!` : `${damage}`,
            x: enemy.x + (Math.random() - 0.5) * 20,
            y: enemy.y - 15,
            color: isCrit ? '#f59e0b' : '#ffffff',
            alpha: 1,
            vy: -1.0,
            isCrit,
            life: 0.9,
          });

          setPlayerEnergy((prev) => Math.min(100, prev + 8));

          return {
            ...enemy,
            currentHp: newHp,
            armorPlates: updatedArmor,
            revealed: true,
            aiState: enemy.type === 'goblin' ? 'hit_and_run' : enemy.aiState,
          };
        }
        return enemy;
      })
    );

    setActiveCooldowns((prev) => ({ ...prev, normal: 0.22 }));
  };

  // Skill E / K: Synergy Skill
  const handleActiveSkill = () => {
    if (activeCooldowns.active > 0 || combatOutcome !== 'playing') return;
    const player = playerPosRef.current;

    if (activeChar.race === 'elf') {
      sound.playWindGust();
      shockwavesRef.current.push({
        x: player.x,
        y: player.y,
        radius: 10,
        maxRadius: 160,
        color: '#06b6d4',
        alpha: 0.9,
      });

      setEnemies((prev) =>
        prev.map((e) => {
          const dist = Math.hypot(e.x - player.x, e.y - player.y);
          if (dist < 180) {
            registerHit(3);
            floatingTextsRef.current.push({
              id: Math.random().toString(),
              text: '🌀 PRIMED FOR HAMMER SYNERGY',
              x: e.x,
              y: e.y - 25,
              color: '#06b6d4',
              alpha: 1,
              vy: -0.8,
              isCrit: false,
              life: 1.4,
            });
            return {
              ...e,
              currentHp: Math.max(0, e.currentHp - 220),
              primedWindTimer: 8.0,
              stunTimer: 1.5,
            };
          }
          return e;
        })
      );
    } else if (activeChar.race === 'dwarf') {
      sound.playHammerSmash();
      screenShakeRef.current = 10;
      shockwavesRef.current.push({
        x: player.x,
        y: player.y,
        radius: 10,
        maxRadius: 170,
        color: '#eab308',
        alpha: 1,
      });

      setEnemies((prev) =>
        prev.map((e) => {
          const dist = Math.hypot(e.x - player.x, e.y - player.y);
          if (dist < 170) {
            registerHit(2);
            let dmg = 450;
            if (e.primedWindTimer && e.primedWindTimer > 0) {
              dmg *= 4.5;
              sound.playSynergyTempest();
              setSynergyBanner('🌪️⚡ SYNERGY: SHOCKWAVE TEMPEST! (+350% DMG)');
              setTimeout(() => setSynergyBanner(null), 3000);
            }
            return {
              ...e,
              currentHp: Math.max(0, e.currentHp - dmg),
              stunTimer: 2.5,
            };
          }
          return e;
        })
      );
    } else if (activeChar.race === 'fairy') {
      sound.playLevelUp();
      setTraps((prev) => prev.map((t) => ({ ...t, detected: true, triggered: false })));
      setEnemies((prev) => prev.map((e) => ({ ...e, revealed: true })));
      floatingTextsRef.current.push({
        id: Math.random().toString(),
        text: '👁️ MIMICS EXPOSED & TRIPS NEUTRALIZED!',
        x: player.x,
        y: player.y - 30,
        color: '#a855f7',
        alpha: 1,
        vy: -1.0,
        isCrit: true,
        life: 1.5,
      });
    } else {
      sound.playSlash();
      projectilesRef.current.push({
        id: Math.random().toString(),
        x: player.x,
        y: player.y,
        vx: Math.cos(player.facing) * 8,
        vy: Math.sin(player.facing) * 8,
        radius: 8,
        color: activeChar.color,
        damage: 380,
        element: activeChar.element,
        isCrit: true,
        isPlayer: true,
        piercing: true,
        life: 1.0,
        maxLife: 1.0,
      });
    }

    setActiveCooldowns((prev) => ({ ...prev, active: activeChar.skills.active.cooldown }));
  };

  // Burst Skill
  const handleBurstSkill = () => {
    if (activeCooldowns.burst > 0 || playerEnergy < 60 || combatOutcome !== 'playing') return;
    setPlayerEnergy(0);
    sound.playSynergyTempest();
    screenShakeRef.current = 16;
    registerHit(5);

    const player = playerPosRef.current;
    const weatherAtk = weather?.modifiers.attackMultiplier ?? 1.0;
    const burstDmg = Math.floor(950 * weatherAtk);
    shockwavesRef.current.push({
      x: player.x,
      y: player.y,
      radius: 20,
      maxRadius: 280,
      color: activeChar.color,
      alpha: 1,
    });

    setEnemies((prev) =>
      prev.map((e) => ({
        ...e,
        currentHp: Math.max(0, e.currentHp - burstDmg),
        stunTimer: 3.0,
      }))
    );

    setActiveCooldowns((prev) => ({ ...prev, burst: activeChar.skills.burst.cooldown }));
  };

  // Dodge with Shadow Clone / Silhouette Effect (Matching Screenshot 7!)
  const handleDodge = () => {
    if (activeCooldowns.dodge > 0) return;
    const player = playerPosRef.current;

    // Spawn Shadow Clone at current position before dashing
    shadowClonesRef.current.push({
      x: player.x,
      y: player.y,
      alpha: 0.85,
      color: '#38bdf8',
      avatarIcon: activeChar.avatarIcon,
    });

    player.x += Math.cos(player.facing) * 70;
    player.y += Math.sin(player.facing) * 70;
    sound.playSlash();
    setActiveCooldowns((prev) => ({ ...prev, dodge: 1.2 }));
  };

  // Call Support Hunter Link Attack (Matching Screenshot 2)
  const handleSupportHunterCall = () => {
    sound.playLevelUp();
    onSelectCharacter(nextHunterIndex);
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      text: `⚡ HUNTER SWAP: ${supportHunter.name}!`,
      x: playerPosRef.current.x,
      y: playerPosRef.current.y - 35,
      color: '#f59e0b',
      alpha: 1,
      vy: -1.0,
      isCrit: true,
      life: 1.5,
    });
  };

  // Shared Loot Roll generation
  const handleOpenLootModal = () => {
    const rolls: LootRollResult[] = [
      { itemName: 'Pristine Golem Core Fragment', winner: 'Thorgar (Dwarf)', roll: 96, mode: 'Need (Dwarven Forge)' },
      { itemName: 'Reinforced Goblin Leather x12', winner: 'Elurien (Elf)', roll: 88, mode: 'Need (Arcane Weaving)' },
      { itemName: 'Rare Shaman Alchemical Herbs x8', winner: 'Faelin (Fairy)', roll: 91, mode: 'Need (Elixir Alchemy)' },
      { itemName: 'Tempered Golem Slag Alloy x15', winner: 'Astraea (Paladin)', roll: 75, mode: 'Greed' },
    ];
    setLootRolls(rolls);
    setIsLootModalOpen(true);
    sound.playLootRoll();
  };

  // 60 FPS Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Update Cooldowns
      setActiveCooldowns((prev) => ({
        normal: Math.max(0, prev.normal - dt),
        active: Math.max(0, prev.active - dt),
        burst: Math.max(0, prev.burst - dt),
        dodge: Math.max(0, prev.dodge - dt),
      }));

      // Combo Timer decay
      if (comboTimerRef.current > 0) {
        comboTimerRef.current -= dt;
        if (comboTimerRef.current <= 0) {
          setComboHits(0);
        }
      }

      // Toxicity Decay (2 points per second per GDD Feature D)
      setCurrentToxicity((prev) => Math.max(0, prev - 2 * dt));
      setManaSicknessTimer((prev) => Math.max(0, prev - dt));

      // 15-Minute World Boss Enrage Timer (900 seconds per GDD Feature E)
      setEnrageTimer((prev) => {
        const next = Math.max(0, prev - dt);
        if (next === 0 && !enrageWeatherShift) {
          setEnrageWeatherShift(true);
          sound.playSynergyTempest();
          screenShakeRef.current = 15;
        }
        return next;
      });

      // Player Movement with Agility Scaling & Mana Sickness debuff (-30% Agility) & Weather Speed
      const player = playerPosRef.current;
      const weatherSpeedMod = weather?.modifiers.speedMultiplier ?? 1.0;
      const effectiveSpeed = (manaSicknessTimer > 0 ? activeChar.speed * 0.7 : activeChar.speed) * weatherSpeedMod;
      let moveX = 0;
      let moveY = 0;
      if (keysRef.current['w'] || keysRef.current['arrowup']) moveY -= 1;
      if (keysRef.current['s'] || keysRef.current['arrowdown']) moveY += 1;
      if (keysRef.current['a'] || keysRef.current['arrowleft']) moveX -= 1;
      if (keysRef.current['d'] || keysRef.current['arrowright']) moveX += 1;

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        player.vx = (moveX / len) * effectiveSpeed;
        player.vy = (moveY / len) * effectiveSpeed;
        player.facing = Math.atan2(moveY, moveX);
      } else {
        player.vx *= 0.8;
        player.vy *= 0.8;
      }

      player.x = Math.max(player.radius + 20, Math.min(canvas.width - player.radius - 20, player.x + player.vx));
      player.y = Math.max(player.radius + 20, Math.min(canvas.height - player.radius - 20, player.y + player.vy));

      // Check Tripwire Traps
      traps.forEach((trap) => {
        if (!trap.triggered) {
          const dist = Math.hypot(player.x - trap.x, player.y - trap.y);
          if (dist < trap.radius) {
            trap.triggered = true;
            sound.playTrapTrigger();
            floatingTextsRef.current.push({
              id: Math.random().toString(),
              text: '⚠️ GOBLIN TRIPWIRE TRIGGERED! (Slowed)',
              x: player.x,
              y: player.y - 25,
              color: '#ef4444',
              alpha: 1,
              vy: -0.8,
              isCrit: false,
              life: 1.2,
            });
            player.vx *= 0.2;
            player.vy *= 0.2;
          }
        }
      });

      // Update Enemies AI
      setEnemies((prevEnemies) => {
        // Track Bestiary Defeat for enemies dropping to 0 HP
        prevEnemies.forEach((e) => {
          if (e.currentHp <= 0 && !slainEnemyIdsRef.current.has(e.id)) {
            slainEnemyIdsRef.current.add(e.id);
            const entry = bestiaryService.recordDefeat(e.type || e.id);
            floatingTextsRef.current.push({
              id: Math.random().toString(),
              text: `📖 BESTIARY: ${entry ? entry.name.toUpperCase() : e.name.toUpperCase()} SLAIN!`,
              x: e.x,
              y: e.y - 32,
              color: '#38bdf8',
              alpha: 1,
              vy: -1.2,
              isCrit: true,
              life: 2.0,
            });
          }
        });

        const aliveEnemies = prevEnemies.filter((e) => e.currentHp > 0);

        if (aliveEnemies.length === 0 && combatOutcome === 'playing') {
          setCombatOutcome('victory');
          handleOpenLootModal();
        }

        return aliveEnemies.map((enemy) => {
          let { x, y, vx, vy, primedWindTimer, stunTimer } = enemy;

          if (primedWindTimer && primedWindTimer > 0) {
            primedWindTimer = Math.max(0, primedWindTimer - dt);
          }

          if (stunTimer && stunTimer > 0) {
            return { ...enemy, stunTimer: Math.max(0, stunTimer - dt), primedWindTimer };
          }

          if (enemy.hasManaDrain) {
            const distToPlayer = Math.hypot(player.x - x, player.y - y);
            if (distToPlayer < 120) {
              setPlayerEnergy((pe) => Math.max(0, pe - 4 * dt));
            }
          }

          const dx = player.x - x;
          const dy = player.y - y;
          const dist = Math.hypot(dx, dy);

          if (dist > enemy.radius + player.radius) {
            vx = (dx / dist) * enemy.speed;
            vy = (dy / dist) * enemy.speed;
          } else {
            setPlayerHp((hp) => {
              const defMultiplier = weather?.modifiers.defenseMultiplier ?? 1.0;
              const incomingDmg = (enemy.attack * dt * 0.5) / defMultiplier;
              const next = Math.max(0, hp - incomingDmg);
              if (next <= 0 && combatOutcome === 'playing') {
                setCombatOutcome('defeat');
              }
              return next;
            });
          }

          return {
            ...enemy,
            x: x + vx,
            y: y + vy,
            vx,
            vy,
            primedWindTimer,
          };
        });
      });

      // Canvas Screen Shake
      ctx.save();
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current = Math.max(0, screenShakeRef.current - dt * 25);
      }

      // Background Rendering (Ruined Subway / Crystal Cavern from Screenshots 1 & 2)
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dungeon Tile Grid
      ctx.strokeStyle = '#1b2438';
      ctx.lineWidth = 1;
      const tileSize = 45;
      for (let tx = 0; tx < canvas.width; tx += tileSize) {
        ctx.beginPath();
        ctx.moveTo(tx, 0);
        ctx.lineTo(tx, canvas.height);
        ctx.stroke();
      }
      for (let ty = 0; ty < canvas.height; ty += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, ty);
        ctx.lineTo(canvas.width, ty);
        ctx.stroke();
      }

      // Draw Shadow Clones / Afterimages (Matching Screenshot 7)
      shadowClonesRef.current = shadowClonesRef.current.filter((clone) => {
        clone.alpha -= dt * 2.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(clone.x, clone.y, 22, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.fillStyle = `rgba(56, 189, 248, ${clone.alpha * 0.35})`;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return clone.alpha > 0;
      });

      // Render Traps
      traps.forEach((trap) => {
        ctx.beginPath();
        ctx.arc(trap.x, trap.y, trap.radius, 0, Math.PI * 2);
        if (trap.triggered) {
          ctx.strokeStyle = '#ef4444';
          ctx.setLineDash([4, 4]);
        } else if (trap.detected) {
          ctx.strokeStyle = '#a855f7';
          ctx.setLineDash([6, 3]);
        } else {
          ctx.strokeStyle = '#334155';
          ctx.setLineDash([2, 4]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Render Shockwaves
      shockwavesRef.current = shockwavesRef.current.filter((sw) => {
        sw.radius += dt * (sw.isSynergyTempest ? 450 : 300);
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.isSynergyTempest ? 6 : 3;
        ctx.globalAlpha = sw.alpha;
        ctx.stroke();
        ctx.globalAlpha = 1;
        return sw.radius < sw.maxRadius;
      });

      // Render Curved Blade Slashes (Matching Screenshot 1 & 2)
      slashEffectsRef.current = slashEffectsRef.current.filter((slash) => {
        slash.life -= dt;
        ctx.save();
        ctx.translate(slash.x, slash.y);
        ctx.rotate(slash.angle);
        ctx.beginPath();
        ctx.arc(0, 0, slash.radius, -Math.PI / 3, Math.PI / 3);
        ctx.strokeStyle = slash.color;
        ctx.lineWidth = 5;
        ctx.shadowColor = slash.color;
        ctx.shadowBlur = 8;
        ctx.globalAlpha = slash.life / slash.maxLife;
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
        return slash.life > 0;
      });

      // Render Enemies
      enemies.forEach((enemy) => {
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y + enemy.radius * 0.7, enemy.radius * 0.8, enemy.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = enemy.primedWindTimer && enemy.primedWindTimer > 0 ? '#06b6d4' : '#000000';
        ctx.stroke();

        // Primed Wind Aura Ring
        if (enemy.primedWindTimer && enemy.primedWindTimer > 0) {
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = '#06b6d4';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Destructible Golem Armor Plate Bar
        if (enemy.armorPlates) {
          const barW = 40;
          const barH = 5;
          const pct = enemy.armorPlates.currentArmor / enemy.armorPlates.maxArmor;
          ctx.fillStyle = '#334155';
          ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 14, barW, barH);
          ctx.fillStyle = enemy.armorPlates.isBroken ? '#64748b' : '#f59e0b';
          ctx.fillRect(enemy.x - barW / 2, enemy.y - enemy.radius - 14, barW * pct, barH);
        }

        // Enemy HP Bar
        const hpPct = enemy.currentHp / enemy.maxHp;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(enemy.x - 25, enemy.y - enemy.radius - 6, 50, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(enemy.x - 25, enemy.y - enemy.radius - 6, 50 * hpPct, 4);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(enemy.name, enemy.x, enemy.y - enemy.radius - 18);
      });

      // Check if Minecraft Voxel skin is active
      const isVoxelSkin =
        activeChar.skinStyle === 'minecraft_voxel' ||
        (() => {
          try {
            const saved = localStorage.getItem('aethelgard_voxel_skins');
            if (saved) {
              const parsed = JSON.parse(saved);
              return Boolean(parsed[activeChar.id] ?? true);
            }
            return true;
          } catch {
            return true;
          }
        })();

      // Render Player Hero (Standard Stylized Circle vs Minecraft Voxel Avatar)
      if (isVoxelSkin) {
        // Minecraft-Style Blocky Humanoid Voxel Rig in 2D
        const blockSize = player.radius * 1.8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(player.x - blockSize / 2 + 2, player.y + blockSize / 2 - 4, blockSize, 7);

        // Voxel Black Border
        ctx.fillStyle = '#020617';
        ctx.fillRect(player.x - blockSize / 2 - 2, player.y - blockSize / 2 - 2, blockSize + 4, blockSize + 4);

        // Voxel Base Armor (Steve/Alex Proportions)
        ctx.fillStyle = activeChar.color;
        ctx.fillRect(player.x - blockSize / 2, player.y - blockSize / 2, blockSize, blockSize);

        // Voxel Inner Face & Eyes
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(player.x - blockSize / 3, player.y - blockSize / 3, (blockSize * 2) / 3, (blockSize * 2) / 3);

        // Voxel Pixel Cyan Eyes
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(player.x - blockSize / 4, player.y - blockSize / 7, 4, 3);
        ctx.fillRect(player.x + blockSize / 9, player.y - blockSize / 7, 4, 3);

        // Voxel Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px Rajdhani, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('VOXEL', player.x, player.y + blockSize / 3 + 2);
      } else {
        // Standard Stylized Fantasy Circle Rig
        ctx.beginPath();
        ctx.ellipse(player.x, player.y + player.radius * 0.7, player.radius * 0.8, player.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = activeChar.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = activeChar.color;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeChar.avatarIcon, player.x, player.y);
      }

      // Glitch-Free Animated Aether-Forged Prism Blade & Weapon Direction
      const isPrismBlade = activeChar.weaponName?.includes('Prism') ?? true;
      const bladeLength = 36;
      const tipX = player.x + Math.cos(player.facing) * bladeLength;
      const tipY = player.y + Math.sin(player.facing) * bladeLength;

      if (isPrismBlade) {
        // Rainbow Chromatic Color-Cycling Weapon Trail
        const rainbowHue = ((Date.now() / 1000) * 140) % 360;
        ctx.save();
        ctx.strokeStyle = `hsl(${rainbowHue}, 95%, 65%)`;
        ctx.lineWidth = 4;
        ctx.shadowColor = `hsl(${rainbowHue}, 100%, 75%)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(player.x + Math.cos(player.facing) * 10, player.y + Math.sin(player.facing) * 10);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Faceted Prismatic Gem socket
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(player.x + Math.cos(player.facing) * 12, player.y + Math.sin(player.facing) * 12, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Standard Facing Direction Line
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Rare Pet Companion (Void Hatchling or Solar Phoenix)
      const curPetId = activePetId || 'void_hatchling';
      const petOrbitTime = Date.now() / 1000;
      const petDist = player.radius + 26;
      const petX = player.x + Math.cos(petOrbitTime * 2.2) * petDist;
      const petY = player.y + Math.sin(petOrbitTime * 2.2) * (petDist * 0.7);

      ctx.save();
      if (curPetId === 'void_hatchling') {
        // Void Hatchling: Dark violet aura, mini shadow motes, void pen buff
        ctx.beginPath();
        ctx.arc(petX, petY, 13, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(76, 29, 149, 0.45)';
        ctx.fill();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐉', petX, petY);

        ctx.font = 'bold 8px Rajdhani, monospace';
        ctx.fillStyle = '#c084fc';
        ctx.fillText('VOID +35%', petX, petY - 14);
      } else {
        // Solar Phoenix: Fiery amber aura, golden flame motes, regen leylines
        ctx.beginPath();
        ctx.arc(petX, petY, 13, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(217, 119, 6, 0.45)';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔥', petX, petY);

        ctx.font = 'bold 8px Rajdhani, monospace';
        ctx.fillStyle = '#fde047';
        ctx.fillText('SOLAR +60HP', petX, petY - 14);
      }
      ctx.restore();

      // Render Floating Numbers & Alerts
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
        ft.life -= dt;
        ft.y += ft.vy;
        ctx.fillStyle = ft.color;
        ctx.font = ft.isCrit ? 'bold 13px Cinzel, serif' : '11px Rajdhani, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
        return ft.life > 0;
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeChar, enemies, traps, combatOutcome]);

  const bossHpPct = bossEnemy ? (bossEnemy.currentHp / bossEnemy.maxHp) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-3 select-none font-sans">
      {/* Synergy Alert Banner */}
      {synergyBanner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-rpg font-extrabold px-6 py-2.5 rounded-2xl shadow-2xl border border-cyan-300 animate-bounce text-sm">
          {synergyBanner}
        </div>
      )}

      {/* Top Bar matching Solo Leveling Screenshot 1 & 2 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs font-tech text-slate-400">
        <div className="flex items-center gap-2">
          <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 font-bold">
            CAMERA: MANUAL [F1]
          </span>
          <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-amber-400 font-bold">
            ⚔️ AUTO TARGET [F2]
          </span>

          {weather && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border backdrop-blur text-xs font-rpg font-bold ${weather.borderColor} bg-slate-900/90 shadow-md`}
              title={`${weather.tagline} — ${weather.statSummary}`}
            >
              <span className="text-sm">{weather.icon}</span>
              <span style={{ color: weather.color }}>{weather.name}</span>
              <span className="text-[10px] text-slate-400 font-tech hidden sm:inline">
                ({weather.statSummary})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-tech">
            <span className="text-slate-400">BOSS ENRAGE:</span>
            <span className={`font-mono font-bold ${enrageTimer < 180 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
              ⏱️ {Math.floor(enrageTimer / 60)}:{(Math.floor(enrageTimer % 60)).toString().padStart(2, '0')}
            </span>
            {enrageWeatherShift && (
              <span className="text-[10px] text-rose-400 font-bold bg-rose-950 px-1.5 py-0.2 rounded border border-rose-500/50 animate-bounce">
                WEATHER-SHIFT ACTIVE!
              </span>
            )}
          </div>
          <button
            onClick={onExit}
            className="p-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 font-rpg"
          >
            ❚❚ Pause / Exit
          </button>
        </div>
      </div>

      {/* Main Game Screen with Authentic Solo Leveling HUD Overlay */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex justify-center">
        <canvas
          ref={canvasRef}
          width={840}
          height={520}
          className="w-full max-w-[840px] h-[520px] block"
        />

        {/* 1. TOP-CENTER BOSS HUD (Matching Screenshot 1 & 2: "LV. 2 Steel-fanged Lycan 0.00%" / "LV. 3 Ice Elf Guard Captain 60.79% x7") */}
        {bossEnemy && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-80 md:w-96 text-center pointer-events-none">
            <div className="flex items-center justify-between text-xs font-tech font-bold text-white mb-1 px-1">
              <span className="text-rose-400 uppercase tracking-wide">
                LV. {bossEnemy.level} {bossEnemy.name}
              </span>
              <span className="text-amber-400 font-mono">
                {bossHpPct.toFixed(2)}% <span className="text-slate-400 font-normal">x7</span>
              </span>
            </div>

            {/* Segmented Boss Bar */}
            <div className="w-full h-3 bg-slate-950/90 rounded-full overflow-hidden border border-slate-700/80 p-0.5 shadow-lg">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 rounded-full transition-all duration-150"
                style={{ width: `${bossHpPct}%` }}
              />
            </div>

            {/* Boss Elemental Affinity Icons */}
            <div className="flex items-center justify-center gap-2 mt-1.5 text-[10px] font-tech text-slate-400">
              <span className="px-1.5 py-0.2 bg-slate-900/80 rounded border border-slate-800 text-cyan-400">🛡️ Breakable Armor</span>
              <span className="px-1.5 py-0.2 bg-slate-900/80 rounded border border-slate-800 text-emerald-400">🌪️ Wind Weakness</span>
              <span className="px-1.5 py-0.2 bg-slate-900/80 rounded border border-slate-800 text-amber-400">💥 Stun Gauge</span>
            </div>
          </div>
        )}

        {/* 2. COMBO COUNTER ON LEFT (Matching Screenshot 1 & 2: "18 HITS" / "58 HITS") */}
        {comboHits > 0 && (
          <div className="absolute top-24 left-6 pointer-events-none flex flex-col items-start animate-pulse">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl md:text-4xl font-rpg font-black italic text-red-500 drop-shadow-[0_2px_10px_rgba(239,68,68,0.8)]">
                {comboHits}
              </span>
              <span className="text-sm md:text-base font-rpg font-extrabold text-white tracking-wider">
                HITS
              </span>
            </div>
            <div className="w-20 h-1 bg-gradient-to-r from-red-500 to-transparent rounded-full mt-0.5" />
          </div>
        )}

        {/* 3. BOTTOM-CENTER PLAYER HP / STAMINA BARS (Matching Screenshot 1 & 2: LV. 1, 1067/1067, 926/1024) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 md:w-80 pointer-events-none flex flex-col items-center">
          <div className="w-full flex items-center justify-between text-[11px] font-tech font-bold text-white mb-0.5 px-0.5">
            <span className="text-amber-400">LV. {activeChar.level}</span>
            <span className="font-mono">{Math.round(playerHp)} / {playerMaxHp}</span>
          </div>

          {/* Green Health Gauge */}
          <div className="w-full h-2.5 bg-slate-950/90 rounded-full overflow-hidden border border-slate-800 p-0.5 mb-1 shadow-md">
            <div
              className="h-full bg-gradient-to-r from-lime-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
            />
          </div>

          {/* Blue Mana/Stamina Gauge */}
          <div className="w-full h-2 bg-slate-950/90 rounded-full overflow-hidden border border-slate-800 p-0.5 shadow-md">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${playerEnergy}%` }}
            />
          </div>

          {/* Feature D: Potion Toxicity Gauge (0 to 100 decaying at 2/sec) */}
          <div className="w-full mt-1">
            <div className="flex items-center justify-between text-[9px] font-tech font-bold px-0.5">
              <span className={manaSicknessTimer > 0 ? 'text-lime-400 animate-pulse font-extrabold' : 'text-slate-400'}>
                {manaSicknessTimer > 0
                  ? `☣️ MANA SICKNESS (-30% AGILITY) ${Math.ceil(manaSicknessTimer)}s`
                  : 'POTION TOXICITY'}
              </span>
              <span className={currentToxicity >= 80 ? 'text-lime-400' : 'text-slate-500'}>
                {Math.round(currentToxicity)} / 100
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-950/90 rounded-full overflow-hidden border border-slate-800/80 p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all ${
                  currentToxicity >= 100
                    ? 'bg-lime-400 animate-pulse'
                    : currentToxicity >= 70
                    ? 'bg-amber-400'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, currentToxicity)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4. RIGHT SIDE: HUNTER SUPPORT QUICK-SWAP (Matching Screenshot 2: Orange Haired Hunter Support Card) */}
        <div className="absolute top-28 right-4 flex flex-col items-center gap-2">
          <button
            onClick={handleSupportHunterCall}
            className="group relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 border-2 border-amber-400/80 hover:border-amber-400 p-1 shadow-xl hover:scale-105 active:scale-95 transition flex flex-col items-center justify-center overflow-hidden"
            title={`Quick-Swap / Call Support: ${supportHunter.name}`}
          >
            <span className="text-2xl leading-none">{supportHunter.avatarIcon}</span>
            <span className="text-[9px] font-rpg font-bold text-amber-300 mt-0.5 leading-none">
              {supportHunter.name.split(' ')[0]}
            </span>
            <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </button>
          <span className="text-[9px] font-tech text-slate-400 uppercase font-bold tracking-tighter">
            LINK SKILL
          </span>
        </div>

        {/* 5. BOTTOM-RIGHT CONSOLE & MOBILE ACTION HUD (Matching Screenshot 1, 2, 7: Hexagonal skill buttons, Crossed Swords, Circular Dodge Sprint) */}
        <div className="absolute bottom-4 right-4 flex items-end gap-3 select-none">
          {/* Hexagonal Skills Row: Q (Dash), E (Synergy Whirlwind), F (Burst) */}
          <div className="flex items-center gap-2">
            {/* Skill Q: Dash Thrust */}
            <button
              onClick={handleSkillQ}
              className="w-11 h-11 rounded-2xl bg-slate-900/90 border border-slate-700 hover:border-cyan-400 active:scale-90 text-white font-rpg font-bold text-xs flex flex-col items-center justify-center shadow-lg transition"
            >
              <span className="text-base">⚡</span>
              <span className="text-[9px] text-cyan-300 font-tech">[Q]</span>
            </button>

            {/* Skill E / K: Synergy Vortex / Ground Slam */}
            <button
              onClick={handleActiveSkill}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 border border-cyan-400/80 active:scale-90 text-white font-rpg font-bold text-xs flex flex-col items-center justify-center shadow-lg shadow-cyan-600/30 transition"
            >
              <span className="text-lg">🌀</span>
              <span className="text-[9px] text-cyan-200 font-tech">[E]</span>
            </button>

            {/* Skill F / R: Ultimate Burst */}
            <button
              disabled={playerEnergy < 60}
              onClick={handleBurstSkill}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 border border-amber-300 active:scale-90 text-white font-rpg font-extrabold text-xs flex flex-col items-center justify-center shadow-lg shadow-rose-600/30 disabled:grayscale transition"
            >
              <span className="text-lg">🌋</span>
              <span className="text-[9px] text-amber-200 font-tech">[F]</span>
            </button>
          </div>

          {/* Basic Attack: Crossed Swords Button (Matching Screenshot 1 & 2) */}
          <button
            onClick={handleNormalAttack}
            className="w-13 h-13 rounded-full bg-slate-900/95 border-2 border-slate-600 hover:border-white active:scale-90 text-white font-rpg font-bold flex flex-col items-center justify-center shadow-2xl transition"
          >
            <Swords className="w-5 h-5 text-white" />
            <span className="text-[9px] text-slate-400 font-tech">[J]</span>
          </button>

          {/* Dodge Sprint Button with Circular Cooldown (Matching Screenshot 1, 2, 7) */}
          <button
            onClick={handleDodge}
            className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-900 via-slate-900 to-purple-950 border-2 border-purple-500/80 hover:border-purple-400 active:scale-90 text-white flex flex-col items-center justify-center shadow-xl shadow-purple-900/30 transition group"
          >
            <span className="text-lg">🏃</span>
            <span className="text-[9px] text-purple-300 font-tech font-bold">[SPACE]</span>
          </button>
        </div>
      </div>

      {/* 6. BOTTOM PARTY ROSTER SELECTOR */}
      <div className="mt-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-400 font-rpg font-bold mr-2 hidden sm:inline">Party Swap:</span>
          {party.map((char, idx) => {
            const isActive = idx === activeCharIndex;
            return (
              <button
                key={char.id}
                onClick={() => {
                  sound.playClick();
                  onSelectCharacter(idx);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-rpg font-bold transition ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-md'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <span>{char.avatarIcon}</span>
                <span className="hidden md:inline">{char.name}</span>
                <span className="text-[9px] bg-slate-900 px-1 rounded text-slate-500 font-tech">[{idx + 1}]</span>
              </button>
            );
          })}
        </div>

        <button
          disabled={manaPotions <= 0}
          onClick={() => {
            sound.playLevelUp();
            setPlayerEnergy(100);
            setPlayerHp(playerMaxHp);
            onUseManaPotion();
            setCurrentToxicity((prev) => {
              const next = prev + 35;
              if (next >= 100) {
                setManaSicknessTimer(20);
                sound.playArmorBreak();
                floatingTextsRef.current.push({
                  id: Math.random().toString(),
                  text: '☣️ MANA SICKNESS! (-30% Agility, +50% Mana Cost for 20s)',
                  x: playerPosRef.current.x,
                  y: playerPosRef.current.y - 35,
                  color: '#a3e635',
                  alpha: 1,
                  vy: -1.2,
                  isCrit: true,
                  life: 2.2,
                });
              }
              return Math.min(100, next);
            });
          }}
          className={`px-3 py-1.5 rounded-xl border text-xs transition flex items-center gap-1 font-tech font-bold disabled:text-slate-600 ${
            manaSicknessTimer > 0
              ? 'bg-lime-950/70 border-lime-500 text-lime-400 animate-pulse'
              : 'bg-slate-950 border-slate-800 text-cyan-400 hover:border-cyan-500'
          }`}
        >
          <span>🧪 Drink Mana Potion (+35 Tox) ({manaPotions})</span>
        </button>
      </div>

      {/* Shared Loot & Instance Distribution Modal (Matching D100 Roll System) */}
      {isLootModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Dice5 className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-rpg font-bold text-white">
                  Shared Loot & Instance Distribution
                </h2>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-xl font-tech font-bold">
                DUNGEON CLEARED
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed">
              Dungeon spoils rolled via <strong className="text-amber-400">Need vs Greed (D100)</strong> system. Crafting materials like rare goblin leather, golem core fragments, and alchemical herbs are distributed fairly:
            </p>

            <div className="space-y-2.5 mb-6">
              {lootRolls.map((roll, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-rpg font-bold text-white block">{roll.itemName}</span>
                    <span className="text-[10px] text-slate-500 font-tech">{roll.mode}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-tech font-bold text-cyan-400 block">{roll.winner}</span>
                    <span className="text-[10px] text-amber-400 font-bold">Rolled: {roll.roll}/100</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setIsLootModalOpen(false);
                onVictory(node.rewards);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:brightness-110 text-white font-rpg font-bold text-sm shadow-xl shadow-cyan-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>COLLECT REWARDS & RETURN TO BASE</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

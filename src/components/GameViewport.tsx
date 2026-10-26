import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Compass,
  Shield,
  Sparkles,
  Swords,
  ArrowLeft,
  Sun,
  Moon,
  Flame,
  Activity,
  Pickaxe,
  MessageSquare,
  CloudRain,
  Users,
  Target,
  Crosshair,
  UserCheck,
  ChevronDown,
  Skull,
  Zap,
  Box,
  Gift,
  Radio,
  BookOpen,
  Scroll,
  Trophy,
  Star,
} from 'lucide-react';
import { sound } from '../services/soundService';
import { syncPlayerState } from '../services/api';
import {
  multiplayerSocket,
  TransformData,
  AttackPayload,
  RemotePlayerData,
} from '../services/multiplayerSocket';
import { TargetUnitFrame } from './TargetUnitFrame';
import { Minimap, MinimapEntity } from './Minimap';
import { PlayerStatusBar } from './PlayerStatusBar';
import { extendedCharacterRoster, CharacterRosterItem, characterRoster } from '../data/characters';
import { DungeonSynthWidget } from './DungeonSynthWidget';
import { RetentionRiftModal } from './RetentionRiftModal';
import { growthRetention } from '../services/growthRetentionService';
import { INITIAL_PET_COMPANIONS } from '../data/petData';
import {
  createAmbientStardust,
  createLandscapeTerrainTexture,
  createVegetationClusters,
} from '../game/environment';
import { createEnterableCitadel, resolveCitadelWallCollision, CITADEL_BUILDING_CONFIGS } from '../game/enterableCitadel';
import { createSafeZoneNet } from '../game/safeZoneNet';
import {
  AnimalMonster,
  initializeAnimalMonsterPacks,
  updateAnimalMonsterPacks,
} from '../game/monsterPackSystem';
import { setupPostProcessing } from '../game/renderer';
import {
  CGAxisAssetBrowser,
  CGAxisAsset,
  PlacedSceneObject,
  CGAXIS_CATALOG,
} from './CGAxisAssetBrowser';
import proceduralMapData from '../data/proceduralTerrainMap.json';
import labyrinthData from '../data/demonKingLabyrinth.json';
import startingTownData from '../data/startingTownLayout.json';

export interface QuestObjective {
  id: string;
  text: string;
  done: boolean;
  progress?: number;
  target?: number;
}

export interface QuestData {
  title: string;
  objectives: QuestObjective[];
  completed: boolean;
}

interface GameViewportProps {
  onReturnToDashboard?: () => void;
  playerGold?: number;
  playerEssence?: number;
  characterName?: string;
  isSafeZone?: boolean;
  onLootGained?: (goldDelta: number, essenceDelta: number) => void;
  onZoneStateChange?: (inSafeZone: boolean, zoneName: string) => void;
}

type TimeOfDay = 'day' | 'twilight' | 'night';
type AuraColor = 'cyan' | 'gold' | 'violet' | 'crimson';

interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'crit' | 'parry' | 'heal' | 'loot';
  x: number;
  y: number;
}

interface ProjectedNameplate {
  id: string;
  name: string;
  level: number;
  currentHp: number;
  maxHp: number;
  isHostile: boolean;
  role: string;
  screenX: number;
  screenY: number;
  isBehindCamera: boolean;
}

interface RemotePlayerContainer {
  id: string;
  username: string;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  swordGroup: THREE.Group;
  targetPosition: THREE.Vector3;
  targetRotationY: number;
  currentHp: number;
  maxHp: number;
  animationState: string;
  isHostile: boolean;
  hitFlashTimer: number;
}

export interface MonsterEntity {
  id: string;
  name: string;
  level: number;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  homePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  state: 'patrol' | 'aggro' | 'attack' | 'stagger' | 'dead';
  currentHp: number;
  maxHp: number;
  patrolTimer: number;
  attackCooldown: number;
  staggerTimer: number;
  respawnTimer: number;
  aggroRange: number; // 15m detection range
  attackRange: number; // 2.5m melee range
  moveSpeed: number;
  role: string;
}

export interface ProjectileItem {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  distanceTraveled: number;
  maxDistance: number;
  isPiercing: boolean;
  hitEntities: Set<string>;
  projectileType: string;
}

// 1. Elven Arcane Ranger: Projectile Physics & Homing Starlight Volley System
export class ArcaneRangerSystem {
  scene: THREE.Scene;
  projectiles: ProjectileItem[];
  arrowGeometry: THREE.BufferGeometry;
  arrowMaterial: THREE.Material;

  constructor(scene: THREE.Scene, activeProjectiles: ProjectileItem[]) {
    this.scene = scene;
    this.projectiles = activeProjectiles;
    this.arrowGeometry = new THREE.ConeGeometry(0.18, 1.3, 8);
    this.arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x10b981 });
  }

  // Spawn Starlight Volley or Astral Snipe projectile
  fireProjectile(origin: THREE.Vector3, targetDirection: THREE.Vector3, speed = 48, isPiercing = false, projectileType = 'starlight_arrow') {
    const mat = isPiercing
      ? new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      : this.arrowMaterial;
    const arrowMesh = new THREE.Mesh(this.arrowGeometry, mat);
    arrowMesh.position.copy(origin);

    // Align arrow rotation with firing vector
    arrowMesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      targetDirection.clone().normalize()
    );

    this.scene.add(arrowMesh);

    this.projectiles.push({
      mesh: arrowMesh,
      velocity: targetDirection.clone().normalize().multiplyScalar(speed),
      distanceTraveled: 0,
      maxDistance: isPiercing ? 120 : 80,
      isPiercing: isPiercing,
      hitEntities: new Set(),
      projectileType,
    });
  }

  // Spawn Blazing Long-Range Fireball projectile (130m long-range attack)
  fireFireball(origin: THREE.Vector3, targetDirection: THREE.Vector3, speed = 52) {
    const fbGroup = new THREE.Group();
    fbGroup.name = 'fireball_projectile';

    // Blazing Core
    const coreGeo = new THREE.SphereGeometry(0.55, 14, 14);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff3b00 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    fbGroup.add(core);

    // Orbiting Plasma Corona
    const coronaGeo = new THREE.SphereGeometry(0.85, 10, 10);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
    });
    const corona = new THREE.Mesh(coronaGeo, coronaMat);
    fbGroup.add(corona);

    // Dynamic Fiery PointLight illuminating the world as it flies
    const fbLight = new THREE.PointLight(0xf97316, 3.2, 18);
    fbGroup.add(fbLight);

    fbGroup.position.copy(origin);
    this.scene.add(fbGroup);

    this.projectiles.push({
      mesh: fbGroup as any,
      velocity: targetDirection.clone().normalize().multiplyScalar(speed),
      distanceTraveled: 0,
      maxDistance: 130, // 130m long-range attack!
      isPiercing: false,
      hitEntities: new Set(),
      projectileType: 'fireball',
    });
  }

  // Update projectiles each frame (~60 FPS game loop)
  update(
    delta: number,
    monsterColliders: { id: string; name: string; position: THREE.Vector3; takeDamage: (amt: number) => void }[],
    onExplosion?: (pos: THREE.Vector3) => void
  ) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const step = proj.velocity.clone().multiplyScalar(delta);
      proj.mesh.position.add(step);
      proj.distanceTraveled += step.length();

      if (proj.projectileType === 'fireball') {
        proj.mesh.rotation.x += delta * 8;
        proj.mesh.rotation.y += delta * 12;
      }

      // Check collision against monsters in open world
      let hitOccurred = false;
      for (const monster of monsterColliders) {
        if (!proj.hitEntities.has(monster.id) && proj.mesh.position.distanceTo(monster.position) < 2.8) {
          hitOccurred = true;
          proj.hitEntities.add(monster.id);

          if (proj.projectileType === 'fireball') {
            // FIREBALL AOE IMPACT: Damage direct target and splash all nearby monsters within 7m!
            monster.takeDamage(280);
            for (const splashTarget of monsterColliders) {
              if (splashTarget.id !== monster.id && proj.mesh.position.distanceTo(splashTarget.position) < 7.0) {
                splashTarget.takeDamage(190);
              }
            }
            if (onExplosion) onExplosion(proj.mesh.position.clone());
          } else {
            monster.takeDamage(proj.isPiercing ? 360 : 160);
          }

          if (!proj.isPiercing) {
            this.scene.remove(proj.mesh);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }

      if (hitOccurred && !proj.isPiercing) continue;

      // Remove projectile if max range exceeded
      if (proj.distanceTraveled >= proj.maxDistance) {
        if (proj.projectileType === 'fireball' && onExplosion) {
          onExplosion(proj.mesh.position.clone());
        }
        this.scene.remove(proj.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }
}

// 2. Soul Weaver: Minion AI State Machine (Skeleton Vanguard)
export class SkeletonMinionAI {
  mesh: THREE.Group;
  summonerId: string;
  targetGroup: { id: string; name: string; position: THREE.Vector3; health: number; takeDamage: (amt: number) => void }[];
  state: 'FOLLOW' | 'AGGRO' | 'ATTACK';
  moveSpeed: number;
  aggroRange: number;
  attackRange: number;
  health: number;
  attackCooldown: number;

  constructor(
    minionMesh: THREE.Group,
    summonerId: string,
    targetGroup: { id: string; name: string; position: THREE.Vector3; health: number; takeDamage: (amt: number) => void }[]
  ) {
    this.mesh = minionMesh;
    this.summonerId = summonerId;
    this.targetGroup = targetGroup;
    this.state = 'FOLLOW';
    this.moveSpeed = 5.0;
    this.aggroRange = 14.0;
    this.attackRange = 2.4;
    this.health = 400;
    this.attackCooldown = 0;
  }

  update(delta: number, summonerPosition: THREE.Vector3) {
    if (this.health <= 0) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    const targetEntity = this.findNearestHostile();

    switch (this.state) {
      case 'FOLLOW': {
        if (targetEntity && this.mesh.position.distanceTo(targetEntity.position) <= this.aggroRange) {
          this.state = 'AGGRO';
          break;
        }
        const distToSummoner = this.mesh.position.distanceTo(summonerPosition);
        if (distToSummoner > 3.5) {
          this.moveTowards(summonerPosition, delta);
        }
        break;
      }

      case 'AGGRO': {
        if (!targetEntity || targetEntity.health <= 0) {
          this.state = 'FOLLOW';
          break;
        }
        const distToTarget = this.mesh.position.distanceTo(targetEntity.position);
        if (distToTarget <= this.attackRange) {
          this.state = 'ATTACK';
        } else {
          this.moveTowards(targetEntity.position, delta);
        }
        break;
      }

      case 'ATTACK': {
        if (!targetEntity || targetEntity.health <= 0 || this.mesh.position.distanceTo(targetEntity.position) > this.attackRange * 1.5) {
          this.state = 'AGGRO';
          break;
        }
        if (this.attackCooldown <= 0) {
          targetEntity.takeDamage(55);
          this.attackCooldown = 1.0;
        }
        break;
      }
    }
  }

  findNearestHostile() {
    let nearest: any = null;
    let minDist = Infinity;
    for (const enemy of this.targetGroup) {
      if (enemy.health > 0) {
        const d = this.mesh.position.distanceTo(enemy.position);
        if (d < minDist) {
          minDist = d;
          nearest = enemy;
        }
      }
    }
    return nearest;
  }

  moveTowards(dest: THREE.Vector3, delta: number) {
    const dir = dest.clone().sub(this.mesh.position);
    dir.y = 0;
    if (dir.lengthSq() > 0.01) {
      dir.normalize();
      this.mesh.position.add(dir.multiplyScalar(this.moveSpeed * delta));
      const targetAngle = Math.atan2(dir.x, dir.z);
      this.mesh.rotation.y = THREE.MathUtils.damp(this.mesh.rotation.y, targetAngle, 10, delta);
    }
  }
}

// 3. Umbral Sovereign System (Vaelen Thorne - Aethelgard Online)
export class UmbralSovereignSystem {
  player: { characterId: string; name: string };
  shadows: SkeletonMinionAI[];
  scene: THREE.Scene;
  rampTexture: THREE.Texture;

  constructor(
    playerActor: { characterId: string; name: string },
    activeShadowsArray: SkeletonMinionAI[],
    scene: THREE.Scene,
    rampTexture: THREE.Texture
  ) {
    this.player = playerActor;
    this.shadows = activeShadowsArray;
    this.scene = scene;
    this.rampTexture = rampTexture;
  }

  // Triggered when an enemy's health drops to 0 near Vaelen or when Vaelen unleashes "ARISE"
  extractShadow(
    defeatedMonster: { id: string; name: string; position: THREE.Vector3 },
    targetGroup: { id: string; name: string; position: THREE.Vector3; health: number; takeDamage: (amt: number) => void }[]
  ) {
    // Spawn loyal umbral soldier at enemy position:
    // Dark void/blue-slate armor + glowing electric cyan eyes + shadow blade
    const shadowGroup = new THREE.Group();
    shadowGroup.name = `shadow_${defeatedMonster.id}_${Date.now()}`;

    // Deep shadow obsidian body
    const shadowMat = new THREE.MeshToonMaterial({
      color: 0x0f172a,
      gradientMap: this.rampTexture,
    });
    const sBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.0, 6, 12), shadowMat);
    sBody.position.y = 1.1;
    sBody.castShadow = true;
    shadowGroup.add(sBody);

    // Glowing electric blue eyes (Umbral Sovereign signature)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
    eye1.position.set(-0.16, 1.55, 0.35);
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
    eye2.position.set(0.16, 1.55, 0.35);
    shadowGroup.add(eye1);
    shadowGroup.add(eye2);

    // Dual Nightshade Viper Daggers
    const dMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.9,
    });
    const dagger1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.04), dMat);
    dagger1.position.set(0.4, 0.9, 0.3);
    dagger1.rotation.x = Math.PI / 4;
    shadowGroup.add(dagger1);

    const dagger2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.04), dMat);
    dagger2.position.set(-0.4, 0.9, 0.3);
    dagger2.rotation.x = Math.PI / 4;
    shadowGroup.add(dagger2);

    // Shadow Aura Mist Ring
    const auraRing = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.2, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.05;
    shadowGroup.add(auraRing);

    shadowGroup.position.copy(defeatedMonster.position);
    this.scene.add(shadowGroup);

    const shadowAi = new SkeletonMinionAI(shadowGroup, 'sung_jinwoo', targetGroup);
    shadowAi.health = 650;
    shadowAi.moveSpeed = 6.2;
    this.shadows.push(shadowAi);

    // Broadcast spawn to multiplayer WebSocket server if active
    multiplayerSocket.sendTransform({
      position: { x: shadowGroup.position.x, y: shadowGroup.position.y, z: shadowGroup.position.z },
      rotation: { y: 0 },
      animationState: 'summon_shadow',
      username: `Shadow_${defeatedMonster.name}`,
    });

    return shadowAi;
  }
}

export const ShadowMonarchSystem = UmbralSovereignSystem;

// Interactive Hunter Selector Modal
export interface CharacterSelectorModalProps {
  roster: CharacterRosterItem[];
  selectedId: string;
  onSelect: (char: CharacterRosterItem) => void;
  onClose: () => void;
}

export const CharacterSelectorModal: React.FC<CharacterSelectorModalProps> = ({
  roster,
  selectedId,
  onSelect,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto">
      <div className="max-w-4xl w-full bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-tech text-cyan-400 font-bold uppercase tracking-wider">
              <span>Solo Leveling: Arise • Hunter Roster</span>
            </div>
            <h3 className="text-2xl font-rpg font-extrabold text-white">Select Active Hunter Archetype</h3>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-mono transition cursor-pointer"
          >
            ✕ CLOSE
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto pr-1">
          {roster.map((char) => {
            const isSovereign = char.id === 'vaelen_thorne' || char.id === 'sung_jinwoo';
            const isCurrent = char.id === selectedId;

            return (
              <div
                key={char.id}
                onClick={() => onSelect(char)}
                className={`cursor-pointer p-4 rounded-2xl border transition-all bg-slate-900/90 hover:bg-slate-850 hover:scale-[1.02] flex flex-col justify-between ${
                  isSovereign
                    ? 'border-amber-400 shadow-xl shadow-amber-500/20 ring-1 ring-amber-400/50'
                    : isCurrent
                    ? 'border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                    : 'border-slate-800 hover:border-cyan-500/50'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded ${
                        char.rarity === 'SSR'
                          ? 'bg-amber-500 text-black'
                          : 'bg-purple-600 text-white'
                      }`}
                    >
                      {char.rarity || 'SSR'}
                    </span>
                    <span className="text-xs text-cyan-300 font-bold uppercase">{char.element}</span>
                  </div>
                  <h4 className="text-white font-bold text-lg font-rpg">{char.name}</h4>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">{char.class}</p>

                  {char.equippedWeapon && (
                    <div className="mt-3 p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between text-amber-300 font-tech font-bold">
                        <span>⚔️ {char.equippedWeapon.name}</span>
                        <span className="text-[10px] bg-amber-950 text-amber-400 px-1 rounded">
                          {char.equippedWeapon.rarity}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{char.equippedWeapon.effect}</p>
                    </div>
                  )}

                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {char.skills?.slice(0, 3).map((sk, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-tech">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-cyan-400 font-semibold font-tech">
                    Power: {char.totalPower?.toLocaleString() || '4,200'}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      isCurrent
                        ? 'bg-emerald-600 text-white'
                        : isSovereign
                        ? 'bg-amber-500 text-black'
                        : 'bg-cyan-600 text-white'
                    }`}
                  >
                    {isCurrent ? 'ACTIVE ✓' : isSovereign ? 'DEPLOY SOVEREIGN' : 'DEPLOY'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const GameViewport: React.FC<GameViewportProps> = ({
  onReturnToDashboard,
  playerGold = 50830,
  playerEssence = 1960,
  characterName = 'Elurien',
  isSafeZone = true,
  onLootGained,
  onZoneStateChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Character & World UI State
  const [hp, setHp] = useState<number>(100);
  const [stamina, setStamina] = useState<number>(100);
  const [comboStep, setComboStep] = useState<number>(0);
  const [comboTimer, setComboTimer] = useState<number>(0);
  const [activeAura, setActiveAura] = useState<AuraColor>('cyan');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [weather, setWeather] = useState<'clear' | 'rain' | 'aurora'>('clear');
  const [characterThought, setCharacterThought] = useState<string>(
    'Citadel of Oakhaven lies secure within the Aegis Dome.'
  );
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [goldEarned, setGoldEarned] = useState<number>(0);
  const [oreHarvested, setOreHarvested] = useState<number>(0);
  const [isNearOre, setIsNearOre] = useState<boolean>(false);
  const [isNearLantern, setIsNearLantern] = useState<boolean>(false);
  const isNearOreRef = useRef<boolean>(false);
  const isNearLanternRef = useRef<boolean>(false);
  const [connectedCount, setConnectedCount] = useState<number>(1);

  // Target Unit Frame State
  const [selectedTarget, setSelectedTarget] = useState<{
    id: string;
    name: string;
    level: number;
    currentHp: number;
    maxHp: number;
    isHostile: boolean;
    roleOrGuild?: string;
  } | null>(null);

  // Screen Projected Nameplates
  const [nameplates, setNameplates] = useState<ProjectedNameplate[]>([]);

  // Minimap Radar State
  const [localMinimapState, setLocalMinimapState] = useState<MinimapEntity>({
    id: 'local_player',
    name: characterName,
    position: { x: 0, y: 0, z: 0 },
    rotationY: 0,
    hpPercent: 100,
    isLocalPlayer: true,
  });
  const [minimapEntities, setMinimapEntities] = useState<MinimapEntity[]>([]);

  const [stats, setStats] = useState({
    posX: 0,
    posZ: 0,
    speed: 0,
    isSprinting: false,
    isExhausted: false,
    isDodging: false,
    isBlocking: false,
    zoneName: 'Citadel of Oakhaven (Safe-Zone)',
    bossDistance: 45,
    bossStatus: 'Patrolling Badlands',
  });

  // Active Selected Character Archetype (Elven Arcane Ranger, Soul Weaver, etc.)
  const [selectedArchetype, setSelectedArchetype] = useState<CharacterRosterItem>(extendedCharacterRoster[0]);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false);
  const [minionCount, setMinionCount] = useState<number>(0);

  // Feature: Minecraft-Style Blocky Voxel Skin Toggle
  const [isMinecraftSkin, setIsMinecraftSkin] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('aethelgard_voxel_skins');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed[characterName.toLowerCase()] ?? true);
      }
      return true;
    } catch {
      return true;
    }
  });

  // Feature: Glitch-Free Animated Aether-Forged Prism Blade
  const [isPrismBladeEquipped, setIsPrismBladeEquipped] = useState<boolean>(true);

  // Feature: Rare Pet Companions (Void Hatchling & Solar Phoenix)
  const [activePet, setActivePet] = useState<'void_hatchling' | 'solar_phoenix' | 'none'>('void_hatchling');

  // Feature: Player Growth Retention & Realm Rift Engine
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState<boolean>(false);
  const [riftInfo, setRiftInfo] = useState(() => growthRetention.getCurrentRiftState());
  const [retentionState, setRetentionState] = useState(() => growthRetention.getState());

  useEffect(() => {
    const interval = setInterval(() => {
      setRiftInfo(growthRetention.getCurrentRiftState());
      setRetentionState(growthRetention.getState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Player EXP & Milestone Level Progression (Feature: Cave Crawl & Monster EXP Loop)
  const [playerLevel, setPlayerLevel] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('aethelgard_player_level') || '1', 10);
    } catch {
      return 1;
    }
  });
  const [playerExp, setPlayerExp] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('aethelgard_player_exp') || '0', 10);
    } catch {
      return 0;
    }
  });
  const playerLevelRef = useRef<number>(playerLevel);
  useEffect(() => {
    playerLevelRef.current = playerLevel;
  }, [playerLevel]);
  const nextLevelExp = playerLevel * 600;

  // Story & Dungeon Quest Tracker
  const [questState, setQuestState] = useState<QuestData>({
    title: 'Chapter I: The Sunken Rift Caverns',
    objectives: [
      { id: 'enter_cave', text: 'Infiltrate the Abyssal Cave Archway (South-West)', done: false, progress: 0, target: 1 },
      { id: 'defeat_cavern', text: 'Slay 3 Cavern Lurkers & Magma Slimes', progress: 0, target: 3, done: false },
      { id: 'decipher_stone', text: 'Decipher the Ancient Titan Lore Tablet', done: false, progress: 0, target: 1 },
    ],
    completed: false,
  });

  // Cave Lore Inspection Modal Dialog
  const [activeLoreDialog, setActiveLoreDialog] = useState<{
    title: string;
    chapter: string;
    lore: string;
    rewardEssence: number;
    stoneId: string;
  } | null>(null);

  const [isNearLoreStone, setIsNearLoreStone] = useState<boolean>(false);
  const [nearLoreStoneData, setNearLoreStoneData] = useState<{
    title: string;
    chapter: string;
    lore: string;
    rewardEssence: number;
    stoneId: string;
  } | null>(null);
  const isNearLoreStoneRef = useRef<boolean>(false);
  const nearLoreStoneDataRef = useRef<any>(null);

  const [isNearDestructible, setIsNearDestructible] = useState<boolean>(false);
  const isNearDestructibleRef = useRef<boolean>(false);

  // Free Fire Auto-Sprint Toggle State
  const [isFreeFireSprint, setIsFreeFireSprint] = useState<boolean>(false);
  const isFreeFireSprintRef = useRef<boolean>(false);
  useEffect(() => {
    isFreeFireSprintRef.current = isFreeFireSprint;
  }, [isFreeFireSprint]);

  // Long-Range Attack System (Fireball & Arcane Bow)
  const [rangedAttackType, setRangedAttackType] = useState<'fireball' | 'bow'>('fireball');
  const rangedAttackTypeRef = useRef<'fireball' | 'bow'>('fireball');
  useEffect(() => {
    rangedAttackTypeRef.current = rangedAttackType;
  }, [rangedAttackType]);

  const [rangedCooldown, setRangedCooldown] = useState<number>(0);
  const rangedCooldownRef = useRef<number>(0);

  // Compact Collapsible Quest Tracker
  const [isQuestExpanded, setIsQuestExpanded] = useState<boolean>(false);

  const [showFoliageModal, setShowFoliageModal] = useState<boolean>(false);
  const [showCGAxisBrowser, setShowCGAxisBrowser] = useState<boolean>(false);
  const [placedCGAxisObjects, setPlacedCGAxisObjects] = useState<PlacedSceneObject[]>([]);
  const placedCGAxisMeshesRef = useRef<Map<string, THREE.Object3D>>(new Map());

  const handleSpawnCGAxisAsset = (
    asset: CGAxisAsset,
    customProps?: {
      x: number;
      y: number;
      z: number;
      rotationY: number;
      scale: number;
      roughness: number;
      metalness: number;
      color: string;
      emissive: string;
      emissiveIntensity: number;
    }
  ) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const x = customProps?.x ?? stats.posX;
    const y = customProps?.y ?? 0;
    const z = customProps?.z ?? stats.posZ;
    const rotY = (customProps?.rotationY ?? 0) * (Math.PI / 180);
    const scale = customProps?.scale ?? 1.0;

    const objId = `cgaxis_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotY;
    group.scale.setScalar(scale);

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(customProps?.color ?? asset.color),
      roughness: customProps?.roughness ?? asset.defaultRoughness,
      metalness: customProps?.metalness ?? asset.defaultMetalness,
      emissive: new THREE.Color(customProps?.emissive ?? asset.defaultEmissive ?? '#000000'),
      emissiveIntensity: customProps?.emissiveIntensity ?? asset.defaultEmissiveIntensity ?? 0,
    });

    if (asset.id === 'cgaxis_citadel_tower') {
      // 1. Spire Citadel Fortress Tower
      const baseGeo = new THREE.CylinderGeometry(2.2, 2.6, 9.0, 10);
      const baseMesh = new THREE.Mesh(baseGeo, mat);
      baseMesh.position.y = 4.5;
      baseMesh.castShadow = true;
      group.add(baseMesh);

      const parapetGeo = new THREE.CylinderGeometry(2.7, 2.7, 1.4, 10);
      const parapetMesh = new THREE.Mesh(parapetGeo, mat);
      parapetMesh.position.y = 9.7;
      group.add(parapetMesh);

      // Crenelated merlons
      for (let i = 0; i < 6; i++) {
        const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.35), mat);
        const a = (i / 6) * Math.PI * 2;
        merlon.position.set(Math.cos(a) * 2.5, 10.7, Math.sin(a) * 2.5);
        merlon.rotation.y = -a;
        group.add(merlon);
      }

      // Conical slate roof
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.2, 10), roofMat);
      roof.position.y = 12.5;
      roof.castShadow = true;
      group.add(roof);

      // Arcane Spire Crystal
      const spireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), spireMat);
      spire.position.y = 15.0;
      group.add(spire);

      const spireLight = new THREE.PointLight(0x38bdf8, 2.0, 18);
      spireLight.position.y = 15.0;
      group.add(spireLight);
    } else if (asset.id === 'cgaxis_medieval_tavern') {
      // 2. Timber-Framed Medieval Tavern House
      const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.8, 4.6), mat);
      groundFloor.position.y = 1.4;
      groundFloor.castShadow = true;
      group.add(groundFloor);

      const timberFloor = new THREE.Mesh(
        new THREE.BoxGeometry(6.6, 2.5, 5.0),
        new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 })
      );
      timberFloor.position.y = 4.0;
      timberFloor.castShadow = true;
      group.add(timberFloor);

      // Peaked A-frame roof
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
      const roof1 = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.35, 3.2), roofMat);
      roof1.position.set(0, 6.2, 1.2);
      roof1.rotation.x = Math.PI / 4.5;
      roof1.castShadow = true;
      group.add(roof1);

      const roof2 = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.35, 3.2), roofMat);
      roof2.position.set(0, 6.2, -1.2);
      roof2.rotation.x = -Math.PI / 4.5;
      roof2.castShadow = true;
      group.add(roof2);

      // Stone chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.85, 6.8, 0.85), mat);
      chimney.position.set(2.6, 4.0, 1.5);
      chimney.castShadow = true;
      group.add(chimney);

      // Amber glowing windows
      const winMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const win1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), winMat);
      win1.position.set(-1.6, 3.8, 2.55);
      group.add(win1);
      const win2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), winMat);
      win2.position.set(1.6, 3.8, 2.55);
      group.add(win2);
    } else if (asset.id === 'cgaxis_blacksmith_forge') {
      // 3. Dwarven Caldera Forge Workshop
      const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.2, 4.5), mat);
      stoneBase.position.y = 0.6;
      group.add(stoneBase);

      // Hearth oven
      const ovenMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
      const oven = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 2.6, 8, 1, false, 0, Math.PI), ovenMat);
      oven.position.set(0, 2.5, -1.0);
      group.add(oven);

      // Blazing Magma Core in Hearth
      const lava = new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 12), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      lava.position.set(0, 1.8, -0.8);
      group.add(lava);

      const lavaLight = new THREE.PointLight(0xf97316, 2.5, 12);
      lavaLight.position.set(0, 2.0, -0.6);
      group.add(lavaLight);

      // Chimney stack
      const forgeChimney = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 4.2, 8), ovenMat);
      forgeChimney.position.set(0, 4.5, -1.0);
      group.add(forgeChimney);

      // Anvil pedestal & steel anvil
      const logPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
      logPedestal.position.set(0, 1.0, 1.0);
      group.add(logPedestal);

      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95 }));
      anvil.position.set(0, 1.55, 1.0);
      group.add(anvil);
    } else if (asset.id === 'cgaxis_guild_manor') {
      // 4. Grand Guild Estate Manor
      const mainBuilding = new THREE.Mesh(new THREE.BoxGeometry(8.5, 4.6, 6.0), mat);
      mainBuilding.position.y = 2.3;
      mainBuilding.castShadow = true;
      group.add(mainBuilding);

      // Portico columns
      const colMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
      for (let i = -2; i <= 2; i += 1.3) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 3.8, 8), colMat);
        col.position.set(i, 1.9, 3.4);
        group.add(col);
      }

      // Portico roof
      const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.4, 1.6), mat);
      porticoRoof.position.set(0, 3.9, 3.4);
      group.add(porticoRoof);

      // Main Manor Hipped Roof
      const manorRoof = new THREE.Mesh(
        new THREE.ConeGeometry(5.8, 3.0, 4),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
      );
      manorRoof.position.y = 6.0;
      manorRoof.rotation.y = Math.PI / 4;
      manorRoof.scale.set(1.4, 1.0, 1.0);
      manorRoof.castShadow = true;
      group.add(manorRoof);
    } else if (asset.id === 'cgaxis_stone_watchtower') {
      // 5. Fortified Rampart Watchtower
      const towerBase = new THREE.Mesh(new THREE.BoxGeometry(3.6, 8.5, 3.6), mat);
      towerBase.position.y = 4.25;
      towerBase.castShadow = true;
      group.add(towerBase);

      // Cantilevered wooden outlook deck
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.4, 4.6), deckMat);
      deck.position.y = 8.6;
      group.add(deck);

      // Guard parapet walls
      const parapet = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 4.6), deckMat);
      parapet.position.y = 9.3;
      group.add(parapet);

      // Lookout brazier
      const bLight = new THREE.PointLight(0xf59e0b, 1.8, 15);
      bLight.position.set(0, 10.5, 0);
      group.add(bLight);
    } else if (asset.id === 'cgaxis_city_wall_gate') {
      // 6. Bastion Gatehouse & Portcullis
      const leftBastion = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 7.5, 8), mat);
      leftBastion.position.set(-4.5, 3.75, 0);
      leftBastion.castShadow = true;
      group.add(leftBastion);

      const rightBastion = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 7.5, 8), mat);
      rightBastion.position.set(4.5, 3.75, 0);
      rightBastion.castShadow = true;
      group.add(rightBastion);

      // Center arched curtain wall
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(6.0, 5.5, 2.2), mat);
      wallMesh.position.set(0, 4.0, 0);
      wallMesh.castShadow = true;
      group.add(wallMesh);

      // Portcullis gate grating
      const gateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95, roughness: 0.3 });
      const portcullis = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.5, 0.2), gateMat);
      portcullis.position.set(0, 1.8, 0);
      group.add(portcullis);
    } else if (asset.id === 'cgaxis_crypt_entrance') {
      // 7. Abyssal Crypt Portal
      const cryptMound = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5, 1), mat);
      cryptMound.position.set(0, 1.8, -1.5);
      cryptMound.scale.set(1.4, 0.9, 1.2);
      group.add(cryptMound);

      const doorArch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.4, 8, 16, Math.PI), mat);
      doorArch.position.set(0, 1.8, 1.0);
      group.add(doorArch);

      const ironDoor = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 2.8, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85 })
      );
      ironDoor.position.set(0, 1.4, 0.9);
      group.add(ironDoor);

      const purpleRune = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 16), new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide }));
      purpleRune.rotation.x = -Math.PI / 2;
      purpleRune.position.set(0, 0.05, 2.2);
      group.add(purpleRune);

      const cryptLight = new THREE.PointLight(0xa855f7, 2.2, 12);
      cryptLight.position.set(0, 1.5, 2.0);
      group.add(cryptLight);
    } else if (asset.id.includes('tree') || asset.id.includes('sakura')) {
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.5, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.25;
      trunk.castShadow = true;
      group.add(trunk);

      const leafGeo = new THREE.ConeGeometry(1.8, 3.5, 8);
      const foliage = new THREE.Mesh(leafGeo, mat);
      foliage.position.y = 3.6;
      foliage.castShadow = true;
      group.add(foliage);
    } else if (asset.id.includes('boulder') || asset.id.includes('granite')) {
      const rockGeo = new THREE.DodecahedronGeometry(1.2, 1);
      const rock = new THREE.Mesh(rockGeo, mat);
      rock.position.y = 0.9;
      rock.castShadow = true;
      group.add(rock);
    } else if (asset.id.includes('crystal') || asset.id.includes('shrub')) {
      for (let i = 0; i < 4; i++) {
        const cGeo = new THREE.OctahedronGeometry(0.4 + i * 0.15, 0);
        const cMesh = new THREE.Mesh(cGeo, mat);
        cMesh.position.set(Math.sin(i * 1.5) * 0.5, 0.6 + i * 0.3, Math.cos(i * 1.5) * 0.5);
        cMesh.scale.set(0.6, 2.0, 0.6);
        group.add(cMesh);
      }
    } else if (asset.id.includes('arch') || asset.id.includes('shrine')) {
      const archGeo = new THREE.TorusGeometry(2.0, 0.4, 8, 16, Math.PI);
      const arch = new THREE.Mesh(archGeo, mat);
      arch.position.y = 2.0;
      arch.castShadow = true;
      group.add(arch);
    } else if (asset.id.includes('obelisk')) {
      const obGeo = new THREE.CylinderGeometry(0.2, 0.7, 5.0, 4);
      const ob = new THREE.Mesh(obGeo, mat);
      ob.position.y = 2.5;
      ob.castShadow = true;
      group.add(ob);
    } else if (asset.id.includes('chest') || asset.id.includes('station')) {
      const boxGeo = new THREE.BoxGeometry(1.4, 0.9, 1.0);
      const box = new THREE.Mesh(boxGeo, mat);
      box.position.y = 0.45;
      box.castShadow = true;
      group.add(box);
    } else if (asset.id.includes('brazier')) {
      const baseGeo = new THREE.CylinderGeometry(0.6, 0.3, 1.4, 8);
      const baseMesh = new THREE.Mesh(baseGeo, mat);
      baseMesh.position.y = 0.7;
      group.add(baseMesh);

      const flameGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 1.6;
      group.add(flame);
    } else {
      const dGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const dMesh = new THREE.Mesh(dGeo, mat);
      dMesh.position.y = 0.6;
      dMesh.castShadow = true;
      group.add(dMesh);
    }

    scene.add(group);
    placedCGAxisMeshesRef.current.set(objId, group);

    const newObj: PlacedSceneObject = {
      id: objId,
      assetId: asset.id,
      name: asset.name,
      category: asset.category,
      x,
      y,
      z,
      rotationY: customProps?.rotationY ?? 0,
      scale,
      meshRef: group,
      materialProps: {
        color: customProps?.color ?? asset.color,
        roughness: customProps?.roughness ?? asset.defaultRoughness,
        metalness: customProps?.metalness ?? asset.defaultMetalness,
        emissive: customProps?.emissive,
        emissiveIntensity: customProps?.emissiveIntensity,
      },
    };

    setPlacedCGAxisObjects((prev) => [...prev, newObj]);
    sound.playVictory();
    triggerFloatingText(`✦ SPAWNED: ${asset.name.toUpperCase()}`, 'loot');
    setCharacterThought(`CGAxis: Placed ${asset.name} at [${x}, ${z}]`);
  };

  const handleRemoveCGAxisObject = (id: string) => {
    const mesh = placedCGAxisMeshesRef.current.get(id);
    if (mesh && sceneRef.current) {
      sceneRef.current.remove(mesh);
      placedCGAxisMeshesRef.current.delete(id);
    }
    setPlacedCGAxisObjects((prev) => prev.filter((o) => o.id !== id));
    sound.playHit(false);
  };

  const handleClearAllCGAxisObjects = () => {
    if (sceneRef.current) {
      placedCGAxisMeshesRef.current.forEach((mesh) => {
        sceneRef.current?.remove(mesh);
      });
      placedCGAxisMeshesRef.current.clear();
    }
    setPlacedCGAxisObjects([]);
    sound.playVictory();
  };

  const handleLoadPresetMap = (presetKey: 'procedural' | 'labyrinth' | 'town') => {
    handleClearAllCGAxisObjects();
    if (presetKey === 'procedural') {
      const items = proceduralMapData.placed_objects || [];
      items.forEach((item) => {
        let assetKey = 'cgaxis_oak_tree';
        if (item.type === 'rock') assetKey = 'cgaxis_mossy_boulder';
        else if (item.type === 'enemy_goblin_scout') assetKey = 'cgaxis_goblin_scout';
        else if (item.type === 'slime_mutant') assetKey = 'cgaxis_slime_mutant';
        else if (item.type === 'orc_warrior') assetKey = 'cgaxis_orc_warrior';

        const asset = CGAXIS_CATALOG.find((a) => a.id === assetKey) || CGAXIS_CATALOG[0];
        handleSpawnCGAxisAsset(asset, {
          x: item.x - 50,
          y: 0,
          z: item.z - 50,
          rotationY: item.rotation_y,
          scale: item.scale,
          color: asset.color,
          roughness: asset.defaultRoughness,
          metalness: asset.defaultMetalness,
          emissive: asset.defaultEmissive || '#000000',
          emissiveIntensity: asset.defaultEmissiveIntensity || 0,
        });
      });
      triggerFloatingText('✦ LOADED 65 MAP OBJECTS (proceduralTerrainMap.json)', 'crit');
    } else if (presetKey === 'labyrinth') {
      const rooms = labyrinthData.rooms || [];
      rooms.forEach((room) => {
        const objs = room.placed_objects || [];
        objs.forEach((po: any) => {
          let assetKey = 'cgaxis_gothic_arch';
          if (po.object_type.includes('brazier')) assetKey = 'cgaxis_mana_brazier';
          else if (po.object_type.includes('pillar') || po.object_type.includes('circle')) assetKey = 'cgaxis_runic_obelisk';
          else if (po.object_type.includes('crystal')) assetKey = 'cgaxis_crystal_shrub';
          else if (po.object_type.includes('chest')) assetKey = 'cgaxis_treasure_chest';

          const asset = CGAXIS_CATALOG.find((a) => a.id === assetKey) || CGAXIS_CATALOG[5];
          const wx = room.world_coordinates.x + (po.local_coordinates?.x || 0);
          const wz = room.world_coordinates.z + (po.local_coordinates?.z || 0);

          handleSpawnCGAxisAsset(asset, {
            x: wx,
            y: 0,
            z: wz,
            rotationY: po.rotation_y || 0,
            scale: po.scale || 1.0,
            color: asset.color,
            roughness: asset.defaultRoughness,
            metalness: asset.defaultMetalness,
            emissive: asset.defaultEmissive || '#000000',
            emissiveIntensity: asset.defaultEmissiveIntensity || 0,
          });
        });
      });
      triggerFloatingText('✦ LOADED S-RANK LABYRINTH (demonKingLabyrinth.json)', 'crit');
    } else {
      const structures = (startingTownData as any).structures || [];
      structures.forEach((st: any) => {
        const asset = CGAXIS_CATALOG.find((a) => a.id === 'cgaxis_stone_shrine') || CGAXIS_CATALOG[8];
        handleSpawnCGAxisAsset(asset, {
          x: (st.coordinates?.x || 0) - 100,
          y: 0,
          z: (st.coordinates?.z || 0) - 100,
          rotationY: 0,
          scale: 1.4,
          color: asset.color,
          roughness: asset.defaultRoughness,
          metalness: asset.defaultMetalness,
          emissive: asset.defaultEmissive || '#000000',
          emissiveIntensity: asset.defaultEmissiveIntensity || 0,
        });
      });
      triggerFloatingText('✦ LOADED CITADEL TOWN SETTLEMENT (startingTownLayout.json)', 'crit');
    }
  };

  const handleBuildCompound = (type: 'medieval_town' | 'castle_fortress') => {
    handleClearAllCGAxisObjects();
    const cx = stats.posX;
    const cz = stats.posZ;

    if (type === 'castle_fortress') {
      const tower = CGAXIS_CATALOG.find((a) => a.id === 'cgaxis_citadel_tower') || CGAXIS_CATALOG[0];
      handleSpawnCGAxisAsset(tower, { x: cx, y: 0, z: cz - 12, rotationY: 0, scale: 1.2, color: '#64748b', roughness: 0.7, metalness: 0.1, emissive: '#38bdf8', emissiveIntensity: 1.5 });

      const gate = CGAXIS_CATALOG.find((a) => a.id === 'cgaxis_city_wall_gate') || CGAXIS_CATALOG[5];
      handleSpawnCGAxisAsset(gate, { x: cx, y: 0, z: cz + 10, rotationY: 0, scale: 1.1, color: '#475569', roughness: 0.75, metalness: 0.2, emissive: '#000000', emissiveIntensity: 0 });

      const watchtower = CGAXIS_CATALOG.find((a) => a.id === 'cgaxis_stone_watchtower') || CGAXIS_CATALOG[4];
      handleSpawnCGAxisAsset(watchtower, { x: cx - 18, y: 0, z: cz - 18, rotationY: 45, scale: 1.0, color: '#64748b', roughness: 0.8, metalness: 0.1, emissive: '#f59e0b', emissiveIntensity: 1.0 });
      handleSpawnCGAxisAsset(watchtower, { x: cx + 18, y: 0, z: cz - 18, rotationY: 315, scale: 1.0, color: '#64748b', roughness: 0.8, metalness: 0.1, emissive: '#f59e0b', emissiveIntensity: 1.0 });
      handleSpawnCGAxisAsset(watchtower, { x: cx - 18, y: 0, z: cz + 8, rotationY: 135, scale: 1.0, color: '#64748b', roughness: 0.8, metalness: 0.1, emissive: '#f59e0b', emissiveIntensity: 1.0 });
      handleSpawnCGAxisAsset(watchtower, { x: cx + 18, y: 0, z: cz + 8, rotationY: 225, scale: 1.0, color: '#64748b', roughness: 0.8, metalness: 0.1, emissive: '#f59e0b', emissiveIntensity: 1.0 });

      triggerFloatingText('🏰 BUILT CASTLE FORTRESS COMPOUND (5 Fortifications)', 'crit');
      setCharacterThought('CGAxis: Assembled Bastion Fortress & Watchtowers.');
    } else {
      const tavern = CGAXIS_CATALOG.find((a) => a.id === 'cgaxis_medieval_tavern') || CGAXIS_CATALOG[1];
      handleSpawnCGAxisAsset(tavern, { x: cx - 12, y: 0, z: cz - 6, rotationY: 15, scale: 1.1, color: '#78350f', roughness: 0.85, metalness: 0.05, emissive: '#f59e0b', emissiveIntensity: 1.2 });

      const forge = CGAXIS_CATALOG.find((a) => a.id === 'cgaxis_blacksmith_forge') || CGAXIS_CATALOG[2];
      handleSpawnCGAxisAsset(forge, { x: cx + 12, y: 0, z: cz - 6, rotationY: 345, scale: 1.1, color: '#334155', roughness: 0.65, metalness: 0.35, emissive: '#ea580c', emissiveIntensity: 1.8 });

      const manor = CGAXIS_CATALOG.find((a) => a.id === 'cgaxis_guild_manor') || CGAXIS_CATALOG[3];
      handleSpawnCGAxisAsset(manor, { x: cx, y: 0, z: cz - 22, rotationY: 0, scale: 1.15, color: '#475569', roughness: 0.68, metalness: 0.15, emissive: '#000000', emissiveIntensity: 0 });

      const shrine = CGAXIS_CATALOG.find((a) => a.id === 'cgaxis_stone_shrine') || CGAXIS_CATALOG[8];
      handleSpawnCGAxisAsset(shrine, { x: cx, y: 0, z: cz + 6, rotationY: 0, scale: 1.2, color: '#e2e8f0', roughness: 0.3, metalness: 0.2, emissive: '#38bdf8', emissiveIntensity: 0.8 });

      const oak = CGAXIS_CATALOG.find((a) => a.id === 'cgaxis_oak_tree') || CGAXIS_CATALOG[0];
      handleSpawnCGAxisAsset(oak, { x: cx - 18, y: 0, z: cz - 16, rotationY: 40, scale: 1.2, color: '#22c55e', roughness: 0.85, metalness: 0.05, emissive: '#000000', emissiveIntensity: 0 });
      handleSpawnCGAxisAsset(oak, { x: cx + 18, y: 0, z: cz - 16, rotationY: 220, scale: 1.2, color: '#22c55e', roughness: 0.85, metalness: 0.05, emissive: '#000000', emissiveIntensity: 0 });

      triggerFloatingText('🏡 BUILT COMPLETE MEDIEVAL TOWN SETTLEMENT', 'crit');
      setCharacterThought('CGAxis: Assembled Town Plaza with Tavern, Forge & Manor.');
    }
  };

  // Action Trigger References for Animation Loop
  const actionTriggerRef = useRef<{
    attackRequested: boolean;
    heavyAttackRequested: boolean;
    runicFinisherRequested: boolean;
    summonMinionRequested: boolean;
    rangerProjectileRequested: boolean;
    archetypeChangedRequested: CharacterRosterItem | null;
    dodgeRequested: boolean;
    blockRequested: boolean;
    emoteRequested: 'cheer' | 'guard' | 'rest' | 'shout' | null;
    gatherRequested: boolean;
    cycleTimeRequested: TimeOfDay | null;
    weatherRequested: 'clear' | 'rain' | 'aurora' | null;
    auraRequested: AuraColor | null;
    skinToggledRequested: boolean | null;
    prismBladeToggledRequested: boolean | null;
    petToggledRequested: 'void_hatchling' | 'solar_phoenix' | 'none' | null;
    inspectLoreRequested: boolean;
    strikeDestructibleRequested: boolean;
    fireballRequested: boolean;
    bowAttackRequested: boolean;
    toggleRangedRequested: boolean;
    toggleSprintRequested: boolean;
  }>({
    attackRequested: false,
    heavyAttackRequested: false,
    runicFinisherRequested: false,
    summonMinionRequested: false,
    rangerProjectileRequested: false,
    archetypeChangedRequested: null,
    dodgeRequested: false,
    blockRequested: false,
    emoteRequested: null,
    gatherRequested: false,
    cycleTimeRequested: null,
    weatherRequested: null,
    auraRequested: null,
    skinToggledRequested: null,
    prismBladeToggledRequested: null,
    petToggledRequested: null,
    inspectLoreRequested: false,
    strikeDestructibleRequested: false,
    fireballRequested: false,
    bowAttackRequested: false,
    toggleRangedRequested: false,
    toggleSprintRequested: false,
  });

  // Remote Players Registry
  const remotePlayersRef = useRef<Map<string, RemotePlayerContainer>>(new Map());
  const selectedTargetIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedTargetIdRef.current = selectedTarget?.id || null;
  }, [selectedTarget]);

  const triggerFloatingText = useCallback(
    (text: string, type: FloatingText['type'], screenX?: number, screenY?: number) => {
      const id = Date.now() + Math.random();
      const x = screenX ?? (window.innerWidth / 2 + (Math.random() * 80 - 40));
      const y = screenY ?? (window.innerHeight / 2 - 40 + (Math.random() * 40 - 20));
      setFloatingTexts((prev) => [...prev.slice(-8), { id, text, type, x, y }]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
      }, 1200);
    },
    []
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ============================================================================
    // 1. THREE.JS SCENE, CAMERA & RENDERER SETUP
    // ============================================================================
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 3-Tone Cel-Shading Ramp Texture (Shadow, Mid-tone, Highlight)
    function createThreeToneRamp() {
      const colors = new Uint8Array([60, 160, 255]);
      const texture = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      return texture;
    }
    const rampTexture = createThreeToneRamp();

    const skyColors = {
      day: 0x0f172a,
      twilight: 0x1e1b4b,
      night: 0x030712,
    };
    scene.background = new THREE.Color(skyColors.day);
    scene.fog = new THREE.FogExp2(skyColors.day, 0.003); // Expanded distance fade

    const camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    camera.position.set(0, 8.2, 11.5);
    camera.lookAt(0, 1.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // High-End Post-Processing Composer with Unreal Bloom (Magical Glows, Stardust, Reflections)
    const postProcessing = setupPostProcessing(
      renderer,
      scene,
      camera,
      container.clientWidth,
      container.clientHeight
    );

    // Dynamic Floating Leyline Stardust Particles across outdoor and cavern biomes
    const updateStardust = createAmbientStardust(scene, 1200);

    // ============================================================================
    // 2. DYNAMIC ATMOSPHERIC LIGHTING (Warm Golden Sun, Sky-Blue Ambient & Soft Fog)
    // ============================================================================
    // 1. Bright Sky-Blue Ambient Light (fills in dark shadow areas with color)
    const ambientLight = new THREE.HemisphereLight(0x38bdf8, 0x065f46, 0.85);
    scene.add(ambientLight);

    // 2. Warm Golden Sunlight casting shadows across the large 1000x1000 map
    const sunLight = new THREE.DirectionalLight(0xfef08a, 1.5);
    sunLight.position.set(100, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 800;
    const d = 140;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x065f46, 0.6);
    scene.add(hemiLight);

    // ============================================================================
    // 3. EXPANDED PROCEDURAL 2.2KM TERRAIN & ENLARGED BLACK CITADEL COURTYARD
    // ============================================================================
    // 1. Massive 2200x2200 terrain plane with painted landscape grass brush texture
    // Green area is massively expanded so it is not decreased when the black courtyard expands!
    const terrainSize = 2200;
    const landscapeTexture = createLandscapeTerrainTexture(terrainSize);

    const groundGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 64, 64);
    groundGeo.rotateX(-Math.PI / 2); // Make it horizontal

    const groundMat = new THREE.MeshToonMaterial({
      color: 0xffffff, // White tint lets the painted landscape brush texture shine with vibrant fantasy colors
      map: landscapeTexture,
      gradientMap: rampTexture,
      wireframe: false,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Enormous Sanctuary Dark Stone Courtyard (Radius 130m, accommodates 20+ enterable buildings)
    const courtyardRadius = 130;
    const courtyardGeo = new THREE.CylinderGeometry(courtyardRadius, courtyardRadius + 4, 0.4, 64);
    const courtyardMat = new THREE.MeshToonMaterial({
      color: 0x0f172a, // Deep slate-black stone courtyard
      gradientMap: rampTexture,
    });
    const courtyard = new THREE.Mesh(courtyardGeo, courtyardMat);
    courtyard.position.y = 0.2;
    courtyard.receiveShadow = true;
    scene.add(courtyard);

    // Outer decorative stone border ring
    const courtyardRimGeo = new THREE.TorusGeometry(courtyardRadius + 2, 0.8, 12, 64);
    const courtyardRimMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const courtyardRim = new THREE.Mesh(courtyardRimGeo, courtyardRimMat);
    courtyardRim.rotation.x = Math.PI / 2;
    courtyardRim.position.y = 0.4;
    scene.add(courtyardRim);

    // Arcane Aegis Dome (Expanded to radius 142m to protect the grand citadel)
    const domeGeo = new THREE.SphereGeometry(142, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.12,
      wireframe: true,
    });
    const aegisDome = new THREE.Mesh(domeGeo, domeMat);
    aegisDome.position.y = 0;
    scene.add(aegisDome);

    // Instantiate 24 Walk-in Enterable 3D Buildings & Grand Central Plaza inside the black courtyard!
    const enterableCitadelTown = createEnterableCitadel(scene, rampTexture);

    // Free Fire Style Battle Royale Cylindrical Electric Safe Zone Net Barrier (r = 130m, height = 28m)
    const safeZoneNet = createSafeZoneNet(scene, 130, 28);

    // Warm Sanctuary Hearth Lantern
    const lanternGroup = new THREE.Group();
    const lanternPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 2.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
    );
    lanternPillar.position.y = 1.4;
    lanternPillar.castShadow = true;
    lanternGroup.add(lanternPillar);

    const flameMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    flameMesh.position.y = 3.0;
    lanternGroup.add(flameMesh);

    const lanternLight = new THREE.PointLight(0xf59e0b, 2.5, 18);
    lanternLight.position.set(0, 3.2, 0);
    lanternGroup.add(lanternLight);
    lanternGroup.position.set(0, 0, -4);
    scene.add(lanternGroup);

    // Surrounding Ancient Monoliths / Runic Pillars around the 130m perimeter
    const pillarGeo = new THREE.CylinderGeometry(1.2, 1.8, 9, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.3,
    });
    const runeGlowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 133;
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;

      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 4.5, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);

      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), runeGlowMat);
      crystal.position.set(px, 10, pz);
      scene.add(crystal);
    }

    // Interactive Ore Vein Gathering Node
    const oreNode = new THREE.Group();
    const oreRock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.4),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
    );
    oreRock.castShadow = true;
    oreNode.add(oreRock);

    const oreCrystalMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      metalness: 0.9,
    });
    for (let i = 0; i < 4; i++) {
      const cluster = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 5), oreCrystalMat);
      cluster.position.set(Math.sin(i * 1.5) * 0.9, 0.8 + (i % 2) * 0.3, Math.cos(i * 1.5) * 0.9);
      cluster.rotation.z = 0.4 * (i % 2 === 0 ? 1 : -1);
      oreNode.add(cluster);
    }
    oreNode.position.set(14, 0.8, -10);
    scene.add(oreNode);

    // Floating Essence Shards
    const shardGroup = new THREE.Group();
    const shards: THREE.Mesh[] = [];
    const shardGeo = new THREE.ConeGeometry(0.4, 0.9, 5);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8,
    });

    const shardPositions = [
      [8, 1.2, 5],
      [-10, 1.2, 7],
      [-5, 1.2, -12],
      [12, 1.2, -8],
      [0, 1.2, 15],
      [-15, 1.2, -14],
      [18, 1.2, 12],
    ];

    shardPositions.forEach(([sx, sy, sz]) => {
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.set(sx, sy, sz);
      shard.castShadow = true;
      shards.push(shard);
      shardGroup.add(shard);
    });
    scene.add(shardGroup);

    // ============================================================================
    // 3.4 COLORED BIOME ELEMENTS (Emerald Trees, Rocks & Mana Crystals)
    // ============================================================================
    function generateEnvironmentBiomes(targetScene: THREE.Scene, count = 180): THREE.Vector3[] {
      const treeGeometry = new THREE.ConeGeometry(2.5, 7, 6);
      const treeMaterial = new THREE.MeshToonMaterial({ color: 0x10b981, gradientMap: rampTexture });
      const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 2.5, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2d1d, roughness: 0.9 });

      const rockGeo = new THREE.DodecahedronGeometry(2.2);
      const rockMat = new THREE.MeshToonMaterial({ color: 0x475569, gradientMap: rampTexture });

      const crystalGeo = new THREE.OctahedronGeometry(1.6);
      const crystalMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      const treePositions: THREE.Vector3[] = [];

      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 850;
        const z = (Math.random() - 0.5) * 850;
        // Keep central citadel courtyard clear (r > 36)
        if (Math.hypot(x, z) < 36) continue;

        const type = i % 4;
        if (type === 0 || type === 1) {
          // Vibrant Emerald Forest Pine
          const treeGroup = new THREE.Group();
          const foliage = new THREE.Mesh(treeGeometry, treeMaterial);
          foliage.position.y = 4.5;
          foliage.castShadow = true;
          const trunk = new THREE.Mesh(trunkGeo, trunkMat);
          trunk.position.y = 1.25;
          trunk.castShadow = true;
          treeGroup.add(trunk);
          treeGroup.add(foliage);
          treeGroup.position.set(x, 0, z);
          treePositions.push(new THREE.Vector3(x, 0, z));
          const s = 0.8 + Math.random() * 0.7;
          treeGroup.scale.setScalar(s);
          targetScene.add(treeGroup);
        } else if (type === 2) {
          // Badlands Crag / Rock
          const rock = new THREE.Mesh(rockGeo, rockMat);
          rock.position.set(x, 1.2, z);
          rock.scale.set(1 + Math.random() * 0.8, 1 + Math.random() * 1.5, 1 + Math.random() * 0.8);
          rock.castShadow = true;
          targetScene.add(rock);
        } else {
          // Mana Crystal Shrine
          const crystal = new THREE.Mesh(crystalGeo, crystalMat);
          crystal.position.set(x, 2.5, z);
          const cLight = new THREE.PointLight(0x38bdf8, 1.5, 15);
          cLight.position.set(x, 3.0, z);
          targetScene.add(crystal);
          targetScene.add(cLight);
        }
      }
      return treePositions;
    }

    const treePositions = generateEnvironmentBiomes(scene);

    // Roaming Abyss Void Titan (World Boss)
    const bossGroup = new THREE.Group();
    bossGroup.name = 'abyss_titan';
    const bossBody = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.8),
      new THREE.MeshStandardMaterial({ color: 0x4c0519, roughness: 0.35, metalness: 0.75 })
    );
    bossBody.castShadow = true;
    bossGroup.add(bossBody);

    const bossEyeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const bossEye = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), bossEyeMat);
    bossEye.position.set(0, 0, 2.2);
    bossGroup.add(bossEye);

    const hornMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85 });
    const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.5, 6), hornMat);
    leftHorn.position.set(-1.8, 2.2, 0.5);
    leftHorn.rotation.z = Math.PI / 4;
    bossGroup.add(leftHorn);

    const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.5, 6), hornMat);
    rightHorn.position.set(1.8, 2.2, 0.5);
    rightHorn.rotation.z = -Math.PI / 4;
    bossGroup.add(rightHorn);

    bossGroup.position.set(45, 3.5, -45);
    scene.add(bossGroup);

    let bossCurrentHp = 85000;
    const bossMaxHp = 100000;

    // ============================================================================
    // 3.5 PROCEDURAL SHATTERED FLOATING ISLANDS IN THE SKY
    // ============================================================================
    const floatingIslands: { group: THREE.Group; baseY: number; offset: number }[] = [];
    const islandGeo = new THREE.ConeGeometry(8, 7, 7);
    const islandMat = new THREE.MeshToonMaterial({
      color: 0x1e293b,
      gradientMap: rampTexture,
    });
    const islandGrassMat = new THREE.MeshToonMaterial({
      color: 0x065f46,
      gradientMap: rampTexture,
    });

    const islandPositions = [
      { x: -50, y: 35, z: -60, s: 1.8 },
      { x: 55, y: 40, z: -50, s: 2.2 },
      { x: -65, y: 28, z: 20, s: 1.4 },
      { x: 45, y: 32, z: 65, s: 1.6 },
    ];

    islandPositions.forEach((pos, idx) => {
      const islandGroup = new THREE.Group();
      const rock = new THREE.Mesh(islandGeo, islandMat);
      rock.rotation.x = Math.PI;
      islandGroup.add(rock);

      const top = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 8, 0.8, 7), islandGrassMat);
      top.position.y = 3.5;
      islandGroup.add(top);

      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.8),
        new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0x38bdf8 : 0xa855f7 })
      );
      crystal.position.y = 6.5;
      islandGroup.add(crystal);

      const cLight = new THREE.PointLight(idx % 2 === 0 ? 0x38bdf8 : 0xa855f7, 2, 25);
      cLight.position.y = 7;
      islandGroup.add(cLight);

      islandGroup.position.set(pos.x, pos.y, pos.z);
      islandGroup.scale.setScalar(pos.s);
      scene.add(islandGroup);

      floatingIslands.push({ group: islandGroup, baseY: pos.y, offset: idx * 1.5 });
    });

    // ============================================================================
    // 3.5B ANCIENT SUNKEN RIFT CAVERN & DUNGEON ENTRANCE (X: -85, Z: 85)
    // ============================================================================
    const caveCenter = new THREE.Vector3(-85, 0, 85);

    // 3D Instanced Foliage & Wild Vegetation Clusters (Cave Entrance, Trails, Tree Undergrowth & Open Plains)
    const vegetation = createVegetationClusters(scene, treePositions, caveCenter, 2800);

    // 1. Dark Subterranean Rock Bed
    const caveFloor = new THREE.Mesh(
      new THREE.CylinderGeometry(36, 40, 0.45, 32),
      new THREE.MeshToonMaterial({ color: 0x090d16, gradientMap: rampTexture })
    );
    caveFloor.position.set(caveCenter.x, 0.22, caveCenter.z);
    caveFloor.receiveShadow = true;
    scene.add(caveFloor);

    // 2. Grand Cavern Archway (Basalt Monoliths + Runic Lintel)
    const cavePillarMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85, metalness: 0.3 });
    const archPillar1 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 9, 8), cavePillarMat);
    archPillar1.position.set(caveCenter.x - 7.5, 4.5, caveCenter.z - 24);
    archPillar1.castShadow = true;
    scene.add(archPillar1);

    const archPillar2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 9, 8), cavePillarMat);
    archPillar2.position.set(caveCenter.x + 7.5, 4.5, caveCenter.z - 24);
    archPillar2.castShadow = true;
    scene.add(archPillar2);

    const archLintel = new THREE.Mesh(new THREE.BoxGeometry(17, 2.4, 3.2), cavePillarMat);
    archLintel.position.set(caveCenter.x, 9.5, caveCenter.z - 24);
    archLintel.castShadow = true;
    scene.add(archLintel);

    // Glowing Runic Glyphs on Archway
    const archRune = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.8, 8),
      new THREE.MeshBasicMaterial({ color: 0x8b5cf6, side: THREE.DoubleSide })
    );
    archRune.position.set(caveCenter.x, 9.5, caveCenter.z - 22.3);
    scene.add(archRune);

    // Glowing Void Portal Mist at Cavern Threshold
    const portalMist = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 6.8, 24),
      new THREE.MeshBasicMaterial({ color: 0x7c3aed, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
    );
    portalMist.position.set(caveCenter.x, 4.8, caveCenter.z - 23.5);
    scene.add(portalMist);

    // Cavern Point Lights (Magma Orange & Azure Leyline)
    const magmaCaveLight = new THREE.PointLight(0xf97316, 3.0, 36);
    magmaCaveLight.position.set(caveCenter.x - 14, 3.5, caveCenter.z + 8);
    scene.add(magmaCaveLight);

    const azureCaveLight = new THREE.PointLight(0x06b6d4, 3.0, 36);
    azureCaveLight.position.set(caveCenter.x + 14, 3.5, caveCenter.z + 8);
    scene.add(azureCaveLight);

    // Stalagmites & Rock Spires rising inside cave perimeter
    const stalagMat = new THREE.MeshToonMaterial({ color: 0x1e293b, gradientMap: rampTexture });
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const rad = 18 + (i % 3) * 6;
      const sx = caveCenter.x + Math.cos(angle) * rad;
      const sz = caveCenter.z + Math.sin(angle) * rad;
      const h = 3.5 + (i % 4) * 1.4;
      const stalag = new THREE.Mesh(new THREE.ConeGeometry(1.1, h, 6), stalagMat);
      stalag.position.set(sx, h / 2, sz);
      stalag.castShadow = true;
      scene.add(stalag);
    }

    // Interactive Destructibles inside Cave (Mana Crystal Cluster & Ancient Urn)
    interface DestructibleEntity {
      id: string;
      name: string;
      group: THREE.Group;
      position: THREE.Vector3;
      hp: number;
      destroyed: boolean;
      type: 'mana_crystal' | 'ancient_urn';
      rewardGold: number;
      rewardEssence: number;
    }
    const caveDestructibles: DestructibleEntity[] = [];

    // 1. Gleaming Leyline Crystal Cluster in Cave
    const crystalGroup = new THREE.Group();
    const cMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      metalness: 0.9,
    });
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 5), cMat);
      spike.position.set(Math.sin(i * 1.3) * 0.7, 0.7, Math.cos(i * 1.3) * 0.7);
      spike.rotation.z = (i % 2 === 0 ? 0.3 : -0.3);
      crystalGroup.add(spike);
    }
    crystalGroup.position.set(caveCenter.x - 8, 0, caveCenter.z + 6);
    scene.add(crystalGroup);
    caveDestructibles.push({
      id: 'destruct_crystal_1',
      name: 'Gleaming Leyline Crystal Cluster',
      group: crystalGroup,
      position: crystalGroup.position,
      hp: 50,
      destroyed: false,
      type: 'mana_crystal',
      rewardGold: 60,
      rewardEssence: 45,
    });

    // 2. Ancient Dwarven Relic Urn in Cave
    const urnGroup = new THREE.Group();
    const urnMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.6, roughness: 0.4 });
    const urnBody = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 1.3, 12), urnMat);
    urnBody.position.y = 0.65;
    urnGroup.add(urnBody);
    const urnLid = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), urnMat);
    urnLid.position.y = 1.4;
    urnGroup.add(urnLid);
    urnGroup.position.set(caveCenter.x + 8, 0, caveCenter.z + 6);
    scene.add(urnGroup);
    caveDestructibles.push({
      id: 'destruct_urn_1',
      name: 'Ancient Dwarven Relic Urn',
      group: urnGroup,
      position: urnGroup.position,
      hp: 40,
      destroyed: false,
      type: 'ancient_urn',
      rewardGold: 90,
      rewardEssence: 20,
    });

    // Interactive Ancient Lore Tablets inside the Cave
    interface CaveLoreEntity {
      id: string;
      title: string;
      chapter: string;
      lore: string;
      group: THREE.Group;
      position: THREE.Vector3;
      inspected: boolean;
      rewardEssence: number;
    }
    const caveLoreEntities: CaveLoreEntity[] = [];

    // Lore Stone 1: Tablet of the Sunken Epoch
    const loreStoneGroup1 = new THREE.Group();
    const tabletMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const tabletMesh1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.4), tabletMat);
    tabletMesh1.position.y = 1.3;
    tabletMesh1.castShadow = true;
    loreStoneGroup1.add(tabletMesh1);
    const runeGlyph1 = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.5, 6),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    runeGlyph1.position.set(0, 1.6, 0.22);
    loreStoneGroup1.add(runeGlyph1);
    loreStoneGroup1.position.set(caveCenter.x - 12, 0, caveCenter.z - 4);
    scene.add(loreStoneGroup1);

    caveLoreEntities.push({
      id: 'lore_tablet_epoch',
      title: 'Tablet of the Sunken Epoch',
      chapter: 'Aethelgard Annals • Chapter III: The Deep Bedrock',
      lore:
        'Before the Great Sundering, these crystalline caverns were the pulsing planetary heartbeat of Aethelgard. Ancient Dwarven Forge-Thanes and High Elven Weavers forged leylines directly through the bedrock to seal the Abyssal Titans deep within the planet core.',
      group: loreStoneGroup1,
      position: loreStoneGroup1.position,
      inspected: false,
      rewardEssence: 80,
    });

    // Lore Stone 2: Runestone of the Umbral Sovereign
    const loreStoneGroup2 = new THREE.Group();
    const tabletMesh2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.4), tabletMat);
    tabletMesh2.position.y = 1.3;
    tabletMesh2.castShadow = true;
    loreStoneGroup2.add(tabletMesh2);
    const runeGlyph2 = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.5, 6),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    runeGlyph2.position.set(0, 1.6, 0.22);
    loreStoneGroup2.add(runeGlyph2);
    loreStoneGroup2.position.set(caveCenter.x + 12, 0, caveCenter.z - 4);
    scene.add(loreStoneGroup2);

    caveLoreEntities.push({
      id: 'lore_tablet_sovereign',
      title: 'Runestone of the Umbral Sovereign',
      chapter: 'Shadow Monarch Chronicles • Inscription of the Void King',
      lore:
        'When darkness blankets the realm and abyssal gates tear the skies asunder, the Shadow Monarch ascends above death itself. "ARISE," commands the sovereign, turning fallen enemies into immortal umbral vanguards.',
      group: loreStoneGroup2,
      position: loreStoneGroup2.position,
      inspected: false,
      rewardEssence: 120,
    });

    // 3D VFX Particle Emitter Pooling (Zero Allocation during gameplay)
    const particlePoolCount = 45;
    const particlePoolGeo = new THREE.OctahedronGeometry(0.18);
    const particlePool: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];

    for (let i = 0; i < particlePoolCount; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0 });
      const pMesh = new THREE.Mesh(particlePoolGeo, pMat);
      pMesh.visible = false;
      scene.add(pMesh);
      particlePool.push({
        mesh: pMesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1.0,
      });
    }

    const spawn3DParticleBurst = (pos: THREE.Vector3, hexColor: number, count = 16, speedMult = 1.0) => {
      let spawned = 0;
      for (let i = 0; i < particlePool.length && spawned < count; i++) {
        const p = particlePool[i];
        if (p.life <= 0) {
          p.mesh.position.copy(pos);
          p.mesh.position.y += 0.5;
          (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(hexColor);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0;
          p.mesh.visible = true;

          const angle = Math.random() * Math.PI * 2;
          const pitch = (Math.random() - 0.2) * Math.PI;
          const speed = (Math.random() * 5 + 3) * speedMult;
          p.vel.set(
            Math.cos(angle) * Math.cos(pitch) * speed,
            Math.sin(pitch) * speed + 3,
            Math.sin(angle) * Math.cos(pitch) * speed
          );
          p.maxLife = 0.6 + Math.random() * 0.4;
          p.life = p.maxLife;
          spawned++;
        }
      }
    };

    // Camera Screen Shake Engine
    let cameraShakeTimer = 0;
    let cameraShakeIntensity = 0;
    const triggerCameraShake = (duration = 0.22, intensity = 0.45) => {
      cameraShakeTimer = duration;
      cameraShakeIntensity = intensity;
    };

    // ============================================================================
    // 3.6 ANIMAL SHAPED MONSTERS IN GROUP/PACKS (Pack AI, Gallop Animation, Paw Claw Attacks)
    // ============================================================================
    // Proper quadruped Dire Wolf & Shadow Beast animal models stationed in organized wilderness packs
    const monsters: AnimalMonster[] = initializeAnimalMonsterPacks(scene, rampTexture);

    // ============================================================================
    // 3.7 ARCANERANGER SYSTEM, SHADOW MONARCH SYSTEM & MINIONS REGISTRY
    // ============================================================================
    const activeProjectiles: ProjectileItem[] = [];
    const rangerSystem = new ArcaneRangerSystem(scene, activeProjectiles);
    const activeMinions: SkeletonMinionAI[] = [];

    const monsterColliders = monsters.map((m) => ({
      id: m.id,
      name: m.name,
      position: m.group.position,
      health: m.currentHp,
      takeDamage: (amt: number) => {
        m.currentHp -= amt;
        m.state = 'stagger';
        m.staggerTimer = 0.35;
        if (m.currentHp <= 0) {
          m.state = 'dead';
          m.group.visible = false;
          m.respawnTimer = 14;
          if (selectedArchetype.id === 'sung_jinwoo') {
            shadowMonarchSystem.extractShadow(
              { id: m.id, name: m.name, position: m.group.position.clone() },
              monsterColliders
            );
            triggerFloatingText('👑 "ARISE." - SHADOW SOLDIER EXTRACTED!', 'crit');
            setMinionCount(activeMinions.length);
          }
        }
      },
    }));

    const shadowMonarchSystem = new ShadowMonarchSystem(
      { characterId: selectedArchetype.id, name: selectedArchetype.name },
      activeMinions,
      scene,
      rampTexture
    );

    const applyDamageToMonsters = (dmg: number, radius: number) => {
      // 1. Check Destructibles inside Cave (Leyline Crystals & Ancient Urns)
      caveDestructibles.forEach((dest) => {
        if (!dest.destroyed) {
          const dist = playerGroup.position.distanceTo(dest.position);
          if (dist <= radius + 1.2) {
            dest.hp -= dmg;
            triggerCameraShake(0.18, 0.35);
            spawn3DParticleBurst(dest.position, dest.type === 'mana_crystal' ? 0x38bdf8 : 0xf59e0b, 15);
            if (dest.hp <= 0) {
              dest.destroyed = true;
              dest.group.visible = false;
              sound.playVictory();
              triggerCameraShake(0.28, 0.6);
              spawn3DParticleBurst(dest.position, 0xfacc15, 30, 1.4);
              triggerFloatingText(`SMASHED ${dest.name}! +${dest.rewardGold} GOLD`, 'loot');
              triggerFloatingText(`+${dest.rewardEssence} ESSENCE`, 'heal');
              setGoldEarned((g) => g + dest.rewardGold);
              if (onLootGained) onLootGained(dest.rewardGold, dest.rewardEssence);
            }
          }
        }
      });

      // 2. Check Living Monsters
      monsters.forEach((m) => {
        if (m.state !== 'dead') {
          const dist = playerGroup.position.distanceTo(m.group.position);
          if (dist <= radius) {
            m.currentHp -= dmg;
            m.state = 'stagger';
            m.staggerTimer = 0.35;
            (m.bodyMesh.material as THREE.MeshToonMaterial).color.setHex(0xf43f5e);

            triggerCameraShake(dmg > 400 ? 0.28 : 0.16, dmg > 400 ? 0.6 : 0.32);
            spawn3DParticleBurst(m.group.position, dmg > 400 ? 0xfacc15 : 0xef4444, dmg > 400 ? 18 : 10);
            triggerFloatingText(`${m.name.slice(0, 10)} -${dmg}`, dmg > 400 ? 'crit' : 'damage');

            if (m.currentHp <= 0) {
              m.state = 'dead';
              m.group.visible = false;
              m.respawnTimer = 14;
              sound.playVictory();
              triggerCameraShake(0.35, 0.75);
              spawn3DParticleBurst(m.group.position, 0xeab308, 30, 1.4);
              spawn3DParticleBurst(m.group.position, 0xa855f7, 22, 1.2);

              const expReward = m.level * 28 + 220;
              triggerFloatingText(`+${expReward} EXP`, 'loot');
              triggerFloatingText(`DEFEATED ${m.name}! +120 GOLD`, 'loot');
              setGoldEarned((g) => g + 120);
              if (onLootGained) onLootGained(120, 15);

              // EXP Progression & Milestone Level Up Check
              setPlayerExp((prevExp) => {
                const totalExp = prevExp + expReward;
                const currentThresh = playerLevelRef.current * 600;
                if (totalExp >= currentThresh) {
                  const nextLvl = playerLevelRef.current + 1;
                  playerLevelRef.current = nextLvl;
                  setPlayerLevel(nextLvl);
                  try {
                    localStorage.setItem('aethelgard_player_level', nextLvl.toString());
                  } catch {}
                  curHp = 100;
                  curStamina = 100;
                  sound.playLevelUp();
                  triggerFloatingText(`★ LEVEL UP! LVL ${nextLvl} ★`, 'crit');
                  triggerFloatingText(`HP RESTORED & +35 COMBAT POWER!`, 'heal');
                  spawn3DParticleBurst(playerGroup.position, 0x22c55e, 45, 2.0);
                  triggerCameraShake(0.45, 0.9);
                  return totalExp - currentThresh;
                }
                try {
                  localStorage.setItem('aethelgard_player_exp', totalExp.toString());
                } catch {}
                return totalExp;
              });

              // Story Quest Objective Progression
              setQuestState((q) => {
                const obj = q.objectives.find((o) => o.id === 'defeat_cavern');
                if (obj && !obj.done) {
                  const nextProg = Math.min(3, (obj.progress || 0) + 1);
                  const isDone = nextProg >= 3;
                  if (isDone) {
                    sound.playVictory();
                    triggerFloatingText('🏆 OBJECTIVE COMPLETE: CAVERN PURGED!', 'crit');
                  }
                  return {
                    ...q,
                    objectives: q.objectives.map((o) =>
                      o.id === 'defeat_cavern' ? { ...o, progress: nextProg, done: isDone } : o
                    ),
                  };
                }
                return q;
              });

              // Shadow Extraction Trigger
              if (selectedArchetype.id === 'sung_jinwoo') {
                shadowMonarchSystem.extractShadow(
                  { id: m.id, name: m.name, position: m.group.position.clone() },
                  monsterColliders
                );
                triggerFloatingText('👑 "ARISE." - SHADOW SOLDIER EXTRACTED!', 'crit');
                setMinionCount(activeMinions.length);
                setCharacterThought(`👑 "Arise, ${m.name}." Welcome to the Shadow Army.`);
              }
            }
          }
        }
      });
    };

    // Helper: Spawn Skeleton Vanguard minion
    const spawnSkeletonMinion = (targetGroup: { id: string; name: string; position: THREE.Vector3; health: number; takeDamage: (amt: number) => void }[]) => {
      const minionGroup = new THREE.Group();

      // Bone torso
      const boneMat = new THREE.MeshToonMaterial({ color: 0xe2e8f0, gradientMap: rampTexture });
      const boneTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.9, 8), boneMat);
      boneTorso.position.y = 0.9;
      minionGroup.add(boneTorso);

      // Skull
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), boneMat);
      skull.position.set(0, 1.5, 0);
      minionGroup.add(skull);

      // Glowing emerald eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
      eye1.position.set(-0.12, 1.55, 0.3);
      const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.08), eyeMat);
      eye2.position.set(0.12, 1.55, 0.3);
      minionGroup.add(eye1);
      minionGroup.add(eye2);

      // Bone sword
      const bSword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.04), boneMat);
      bSword.position.set(0.45, 0.9, 0.2);
      bSword.rotation.x = Math.PI / 6;
      minionGroup.add(bSword);

      const spawnX = playerGroup.position.x + (Math.random() - 0.5) * 3;
      const spawnZ = playerGroup.position.z + (Math.random() - 0.5) * 3;
      minionGroup.position.set(spawnX, 0, spawnZ);
      scene.add(minionGroup);

      const minionAi = new SkeletonMinionAI(minionGroup, 'local_player', targetGroup);
      activeMinions.push(minionAi);
      setMinionCount(activeMinions.length);
      return minionAi;
    };

    // ============================================================================
    // ============================================================================
    // 4. DUAL AVATAR ENGINE: STANDARD CEL-SHADED HERO & MINECRAFT-STYLE BLOCKY VOXEL RIG
    // ============================================================================
    const playerGroup = new THREE.Group();
    const isJinwooActive = selectedArchetype.id === 'sung_jinwoo';

    // 4A. STANDARD REALISTIC CEL-SHADED RIG
    const standardModelGroup = new THREE.Group();

    // Torso / Plate Armor (MeshToonMaterial with rampTexture)
    const bodyGeo = new THREE.CapsuleGeometry(0.65, 1.1, 8, 16);
    const armorMat = new THREE.MeshToonMaterial({
      color: selectedArchetype.celShadeColor || (isJinwooActive ? 0x1e293b : 0x10b981),
      gradientMap: rampTexture,
    });
    const playerBody = new THREE.Mesh(bodyGeo, armorMat);
    playerBody.position.y = 1.2;
    playerBody.castShadow = true;
    standardModelGroup.add(playerBody);

    // Helmet & Visor
    const helmGeo = new THREE.SphereGeometry(0.55, 12, 12);
    const helm = new THREE.Mesh(
      helmGeo,
      new THREE.MeshStandardMaterial({ color: isJinwooActive ? 0x0f172a : 0x0f172a, metalness: 0.9 })
    );
    helm.position.set(0, 1.85, 0);
    standardModelGroup.add(helm);

    const visorGeo = new THREE.BoxGeometry(0.58, 0.22, 0.4);
    const visorMat = new THREE.MeshBasicMaterial({ color: isJinwooActive ? 0x38bdf8 : 0x38bdf8 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.85, 0.35);
    standardModelGroup.add(visor);

    // Pauldrons (Shoulder Armor)
    const pauldronGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const pauldronMat = new THREE.MeshStandardMaterial({
      color: isJinwooActive ? 0x0f172a : 0x1e293b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const leftPauldron = new THREE.Mesh(pauldronGeo, pauldronMat);
    leftPauldron.position.set(-0.75, 1.6, 0);
    const rightPauldron = new THREE.Mesh(pauldronGeo, pauldronMat);
    rightPauldron.position.set(0.75, 1.6, 0);
    standardModelGroup.add(leftPauldron);
    standardModelGroup.add(rightPauldron);

    // Flowing Cape
    const capeGroup = new THREE.Group();
    const capeGeo = new THREE.PlaneGeometry(0.9, 1.6, 4, 6);
    const capeMat = new THREE.MeshStandardMaterial({
      color: isJinwooActive ? 0x0f172a : 0x1e1b4b,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, -0.7, -0.35);
    cape.castShadow = true;
    capeGroup.position.set(0, 1.6, 0);
    capeGroup.add(cape);
    standardModelGroup.add(capeGroup);

    playerGroup.add(standardModelGroup);

    // 4B. MINECRAFT-STYLE BLOCKY VOXEL RIG (Steve/Alex proportions, pixel-art styling, swinging block limbs)
    const voxelModelGroup = new THREE.Group();

    // Voxel Palette Materials
    const voxelSkinMat = new THREE.MeshToonMaterial({
      color: 0xfbcfe8, // Soft peach skin
      gradientMap: rampTexture,
    });
    const voxelArmorMat = new THREE.MeshToonMaterial({
      color: selectedArchetype.celShadeColor || (isJinwooActive ? 0x1e1b4b : 0x059669),
      gradientMap: rampTexture,
    });
    const voxelTrimMat = new THREE.MeshStandardMaterial({
      color: isJinwooActive ? 0x38bdf8 : 0xf59e0b,
      metalness: 0.8,
      roughness: 0.2,
    });
    const voxelDarkMat = new THREE.MeshToonMaterial({
      color: 0x0f172a,
      gradientMap: rampTexture,
    });

    // 1. Voxel Head (0.72 x 0.72 x 0.72 Cube)
    const voxelHeadGroup = new THREE.Group();
    voxelHeadGroup.position.set(0, 1.95, 0);

    const voxelHead = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.72), voxelArmorMat);
    voxelHead.castShadow = true;
    voxelHeadGroup.add(voxelHead);

    // Voxel Helmet Overlap (Outer 8x8 hat layer)
    const voxelHelmLayer = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.78, 0.78),
      new THREE.MeshStandardMaterial({
        color: isJinwooActive ? 0x0f172a : 0x10b981,
        transparent: true,
        opacity: 0.35,
        wireframe: true,
      })
    );
    voxelHeadGroup.add(voxelHelmLayer);

    // Voxel Eyes (Pixel cyan blocks)
    const eyeCubeMat = new THREE.MeshBasicMaterial({ color: isJinwooActive ? 0x38bdf8 : 0x67e8f9 });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), eyeCubeMat);
    eyeL.position.set(-0.16, 0.04, 0.37);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), eyeCubeMat);
    eyeR.position.set(0.16, 0.04, 0.37);
    voxelHeadGroup.add(eyeL);
    voxelHeadGroup.add(eyeR);

    // Voxel Visor Brow
    const browCube = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.06), voxelTrimMat);
    browCube.position.set(0, 0.16, 0.38);
    voxelHeadGroup.add(browCube);

    voxelModelGroup.add(voxelHeadGroup);

    // 2. Voxel Torso (0.72 x 1.05 x 0.38 Rectangular Prism)
    const voxelTorso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.05, 0.38), voxelArmorMat);
    voxelTorso.position.set(0, 1.2, 0);
    voxelTorso.castShadow = true;
    voxelModelGroup.add(voxelTorso);

    // Voxel Gold / Cyan Belt
    const voxelBelt = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.42), voxelTrimMat);
    voxelBelt.position.set(0, 0.74, 0);
    voxelModelGroup.add(voxelBelt);

    // 3. Voxel Limbs with Pivots at Shoulders & Hips for smooth swinging animations!
    // Left Arm (pivot at left shoulder)
    const voxelLeftArmGroup = new THREE.Group();
    voxelLeftArmGroup.position.set(-0.54, 1.55, 0);
    const voxelLeftArm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.05, 0.32), voxelArmorMat);
    voxelLeftArm.position.set(0, -0.52, 0);
    voxelLeftArm.castShadow = true;
    voxelLeftArmGroup.add(voxelLeftArm);
    voxelModelGroup.add(voxelLeftArmGroup);

    // Right Arm (pivot at right shoulder - weapon hand!)
    const voxelRightArmGroup = new THREE.Group();
    voxelRightArmGroup.position.set(0.54, 1.55, 0);
    const voxelRightArm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.05, 0.32), voxelArmorMat);
    voxelRightArm.position.set(0, -0.52, 0);
    voxelRightArm.castShadow = true;
    voxelRightArmGroup.add(voxelRightArm);
    voxelModelGroup.add(voxelRightArmGroup);

    // Left Leg (pivot at left hip)
    const voxelLeftLegGroup = new THREE.Group();
    voxelLeftLegGroup.position.set(-0.19, 0.68, 0);
    const voxelLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.05, 0.34), voxelDarkMat);
    voxelLeftLeg.position.set(0, -0.52, 0);
    voxelLeftLeg.castShadow = true;
    voxelLeftLegGroup.add(voxelLeftLeg);
    voxelModelGroup.add(voxelLeftLegGroup);

    // Right Leg (pivot at right hip)
    const voxelRightLegGroup = new THREE.Group();
    voxelRightLegGroup.position.set(0.19, 0.68, 0);
    const voxelRightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.05, 0.34), voxelDarkMat);
    voxelRightLeg.position.set(0, -0.52, 0);
    voxelRightLeg.castShadow = true;
    voxelRightLegGroup.add(voxelRightLeg);
    voxelModelGroup.add(voxelRightLegGroup);

    playerGroup.add(voxelModelGroup);

    // Initial Rig Visibility based on Minecraft skin state
    standardModelGroup.visible = !isMinecraftSkin;
    voxelModelGroup.visible = isMinecraftSkin;

    // ============================================================================
    // 4C. WEAPON RIGS: AETHER-FORGED PRISM BLADE (GLITCH-FREE ANIMATED) & DUAL DAGGERS
    // ============================================================================
    const swordGroup = new THREE.Group();

    // Glitch-Free Animated Aether-Forged Prism Blade
    const prismBladeGroup = new THREE.Group();
    prismBladeGroup.name = 'aether_prism_blade';

    // Prismatic Color-Cycling Material
    const prismBladeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.95,
      metalness: 0.95,
      roughness: 0.08,
    });

    // 1. Faceted Crystal Blade Core
    const prismBladeCore = new THREE.Mesh(new THREE.BoxGeometry(0.13, 2.1, 0.04), prismBladeMat);
    prismBladeCore.position.y = 1.05;
    prismBladeCore.castShadow = true;
    prismBladeGroup.add(prismBladeCore);

    // 2. Tapered Prismatic Diamond Tip
    const prismBladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 4), prismBladeMat);
    prismBladeTip.position.y = 2.3;
    prismBladeTip.rotation.y = Math.PI / 4;
    prismBladeTip.castShadow = true;
    prismBladeGroup.add(prismBladeTip);

    // 3. Ornate Golden Crossguard & Prismatic Gem Socket
    const goldGuardMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.15,
    });
    const prismGuard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.14), goldGuardMat);
    prismGuard.position.y = 0.05;
    prismBladeGroup.add(prismGuard);

    const prismCoreGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.14),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    prismCoreGem.position.set(0, 0.05, 0.08);
    prismBladeGroup.add(prismCoreGem);

    // 4. Grip & Pommel
    const prismHilt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.45, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.8 })
    );
    prismHilt.position.y = -0.22;
    prismBladeGroup.add(prismHilt);

    const prismPommel = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1), goldGuardMat);
    prismPommel.position.y = -0.48;
    prismBladeGroup.add(prismPommel);

    // Standard Weapon Mesh Group
    const standardSwordMesh = new THREE.Group();
    const bladeMat = new THREE.MeshStandardMaterial({
      color: isJinwooActive ? 0x0f172a : 0xe0f2fe,
      emissive: isJinwooActive ? 0x38bdf8 : 0x0284c7,
      emissiveIntensity: 0.7,
      metalness: 0.95,
      roughness: 0.1,
    });

    if (isJinwooActive) {
      const rDagger = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.03), bladeMat);
      rDagger.position.set(0.65, 0.9, 0.35);
      rDagger.rotation.x = Math.PI / 4;
      rDagger.rotation.z = -Math.PI / 8;
      rDagger.castShadow = true;
      standardSwordMesh.add(rDagger);
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.04), bladeMat);
      blade.position.y = 0.9;
      blade.castShadow = true;
      standardSwordMesh.add(blade);
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4), goldGuardMat);
      hilt.position.y = -0.15;
      standardSwordMesh.add(hilt);
      const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.1), goldGuardMat);
      crossguard.position.y = 0.05;
      standardSwordMesh.add(crossguard);
    }

    swordGroup.add(prismBladeGroup);
    swordGroup.add(standardSwordMesh);

    // Initial Weapon Visibility based on Prism Blade toggle
    prismBladeGroup.visible = isPrismBladeEquipped;
    standardSwordMesh.visible = !isPrismBladeEquipped;

    swordGroup.position.set(0.75, 1.1, 0.35);
    swordGroup.rotation.x = Math.PI / 6;
    swordGroup.rotation.z = -Math.PI / 12;
    playerGroup.add(swordGroup);

    // Dynamic Chromatic Spark Particle Trail Pool for Aether-Forged Prism Blade
    const prismTrailSparks: { mesh: THREE.Mesh; life: number; maxLife: number }[] = [];
    const sparkGeo = new THREE.OctahedronGeometry(0.09);
    for (let i = 0; i < 24; i++) {
      const sMesh = new THREE.Mesh(
        sparkGeo,
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 })
      );
      sMesh.visible = false;
      scene.add(sMesh);
      prismTrailSparks.push({ mesh: sMesh, life: 0, maxLife: 0.35 });
    }

    // ============================================================================
    // 4D. RARE PET COMPANION SYSTEM (3D VOID HATCHLING & SOLAR PHOENIX)
    // ============================================================================
    // 1. Void Hatchling (Scion of the Umbral Depths)
    const voidHatchlingGroup = new THREE.Group();
    voidHatchlingGroup.name = 'pet_void_hatchling';

    const voidPetMat = new THREE.MeshToonMaterial({
      color: 0x1e1b4b,
      gradientMap: rampTexture,
    });
    const voidHornMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const voidEyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Dragon Torso & Belly
    const voidTorso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38), voidPetMat);
    voidTorso.castShadow = true;
    voidHatchlingGroup.add(voidTorso);

    // Dragon Head & Horns
    const voidHead = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 5), voidPetMat);
    voidHead.position.set(0, 0.28, 0.25);
    voidHead.rotation.x = Math.PI / 3;
    voidHatchlingGroup.add(voidHead);

    const voidHornL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 4), voidHornMat);
    voidHornL.position.set(-0.14, 0.48, 0.1);
    voidHornL.rotation.z = Math.PI / 6;
    const voidHornR = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 4), voidHornMat);
    voidHornR.position.set(0.14, 0.48, 0.1);
    voidHornR.rotation.z = -Math.PI / 6;
    voidHatchlingGroup.add(voidHornL);
    voidHatchlingGroup.add(voidHornR);

    // Glowing Eyes
    const vEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05), voidEyeMat);
    vEyeL.position.set(-0.12, 0.34, 0.4);
    const vEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.05), voidEyeMat);
    vEyeR.position.set(0.12, 0.34, 0.4);
    voidHatchlingGroup.add(vEyeL);
    voidHatchlingGroup.add(vEyeR);

    // Flapping Void Wings
    const voidWingMat = new THREE.MeshStandardMaterial({
      color: 0x4c1d95,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    });
    const voidWingL = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.45), voidWingMat);
    voidWingL.position.set(-0.35, 0.15, 0);
    const voidWingR = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.45), voidWingMat);
    voidWingR.position.set(0.35, 0.15, 0);
    voidHatchlingGroup.add(voidWingL);
    voidHatchlingGroup.add(voidWingR);

    // Barbed Tail
    const voidTail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 4), voidPetMat);
    voidTail.position.set(0, -0.15, -0.4);
    voidTail.rotation.x = -Math.PI / 3;
    voidHatchlingGroup.add(voidTail);

    scene.add(voidHatchlingGroup);

    // 2. Solar Phoenix (Eternal Flame of Aethelgard)
    const solarPhoenixGroup = new THREE.Group();
    solarPhoenixGroup.name = 'pet_solar_phoenix';

    const solarFeatherMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      side: THREE.DoubleSide,
    });
    const solarCrestMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide });

    // Phoenix Body
    const solarBody = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.55, 6), solarFeatherMat);
    solarBody.rotation.x = Math.PI / 4;
    solarBody.castShadow = true;
    solarPhoenixGroup.add(solarBody);

    // Phoenix Head & Solar Crest
    const solarHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), solarFeatherMat);
    solarHead.position.set(0, 0.35, 0.25);
    solarPhoenixGroup.add(solarHead);

    const solarCrest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 4), solarCrestMat);
    solarCrest.position.set(0, 0.6, 0.2);
    solarCrest.rotation.x = -Math.PI / 6;
    solarPhoenixGroup.add(solarCrest);

    // Flapping Flame Wings
    const solarWingL = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55), solarFeatherMat);
    solarWingL.position.set(-0.4, 0.2, 0);
    const solarWingR = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55), solarFeatherMat);
    solarWingR.position.set(0.4, 0.2, 0);
    solarPhoenixGroup.add(solarWingL);
    solarPhoenixGroup.add(solarWingR);

    // Flowing Golden Tail Feathers
    const solarTail = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.8), solarCrestMat);
    solarTail.position.set(0, -0.4, -0.45);
    solarTail.rotation.x = -Math.PI / 4;
    solarPhoenixGroup.add(solarTail);

    scene.add(solarPhoenixGroup);

    // Set initial pet visibility
    voidHatchlingGroup.visible = activePet === 'void_hatchling';
    solarPhoenixGroup.visible = activePet === 'solar_phoenix';

    // Ground Contact Shadow
    const shadowGeo = new THREE.CircleGeometry(0.85, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
    });
    const playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
    playerShadow.rotation.x = -Math.PI / 2;
    playerShadow.position.y = 0.02;
    playerGroup.add(playerShadow);

    playerGroup.position.set(0, 0, 0);
    scene.add(playerGroup);

    // ============================================================================
    // 5. HELPER: SWORD SLASH FX IN 3D WORLD SPACE
    // ============================================================================
    const triggerSlashVisualEffect = (
      pos: { x: number; y: number; z: number },
      dir: { x: number; y: number; z: number },
      attackType: string = 'light_slash'
    ) => {
      const isHeavy = attackType === 'heavy_cleave' || attackType === 'whirlwind';
      const slashGeo = new THREE.RingGeometry(
        isHeavy ? 1.2 : 0.8,
        isHeavy ? 2.0 : 1.4,
        24,
        1,
        0,
        attackType === 'whirlwind' ? Math.PI * 1.9 : Math.PI * 0.85
      );
      const slashMat = new THREE.MeshBasicMaterial({
        color: isHeavy ? 0xf59e0b : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });

      const slashMesh = new THREE.Mesh(slashGeo, slashMat);
      slashMesh.position.set(pos.x, pos.y + 1.2, pos.z);

      // Rotate slash arc to face forward direction
      const angle = Math.atan2(dir.x, dir.z);
      slashMesh.rotation.x = Math.PI / 2;
      slashMesh.rotation.z = -angle;

      scene.add(slashMesh);

      let opacity = 0.95;
      const fadeInterval = setInterval(() => {
        opacity -= 0.12;
        slashMat.opacity = Math.max(0, opacity);
        slashMesh.scale.multiplyScalar(1.04);
        if (opacity <= 0) {
          clearInterval(fadeInterval);
          scene.remove(slashMesh);
          slashGeo.dispose();
          slashMat.dispose();
        }
      }, 25);
    };

    // ============================================================================
    // 6. HELPER: CREATE REMOTE PLAYER 3D AVATAR
    // ============================================================================
    const createRemotePlayerMesh = (
      id: string,
      pos: { x: number; y: number; z: number },
      username: string
    ): RemotePlayerContainer => {
      const group = new THREE.Group();
      group.name = `remote_${id}`;

      // Body (Emerald/Cyan armor distinction for other players)
      const rBodyGeo = new THREE.CapsuleGeometry(0.65, 1.1, 8, 16);
      const rArmorMat = new THREE.MeshToonMaterial({
        color: 0x059669, // Emerald Knight
        gradientMap: rampTexture,
      });
      const bodyMesh = new THREE.Mesh(rBodyGeo, rArmorMat);
      bodyMesh.position.y = 1.2;
      bodyMesh.castShadow = true;
      group.add(bodyMesh);

      // Helm & Visor
      const rHelm = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 })
      );
      rHelm.position.set(0, 1.85, 0);
      group.add(rHelm);

      const rVisor = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.22, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x34d399 })
      );
      rVisor.position.set(0, 1.85, 0.35);
      group.add(rVisor);

      // Pauldrons
      const rPauldronGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const rPauldronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 });
      const lp = new THREE.Mesh(rPauldronGeo, rPauldronMat);
      lp.position.set(-0.75, 1.6, 0);
      const rp = new THREE.Mesh(rPauldronGeo, rPauldronMat);
      rp.position.set(0.75, 1.6, 0);
      group.add(lp);
      group.add(rp);

      // Cape
      const rCape = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 1.6, 4, 6),
        new THREE.MeshStandardMaterial({ color: 0x064e3b, side: THREE.DoubleSide })
      );
      rCape.position.set(0, 0.9, -0.35);
      group.add(rCape);

      // Remote Greatsword
      const rSwordGroup = new THREE.Group();
      const rBlade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.8, 0.04),
        new THREE.MeshStandardMaterial({
          color: 0xd1fae5,
          emissive: 0x10b981,
          emissiveIntensity: 0.6,
          metalness: 0.9,
        })
      );
      rBlade.position.y = 0.9;
      rBlade.castShadow = true;
      rSwordGroup.add(rBlade);

      const rHilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 })
      );
      rHilt.position.y = -0.15;
      rSwordGroup.add(rHilt);

      rSwordGroup.position.set(0.75, 1.1, 0.35);
      rSwordGroup.rotation.x = Math.PI / 6;
      group.add(rSwordGroup);

      // Contact Shadow
      const rShadow = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 16),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 })
      );
      rShadow.rotation.x = -Math.PI / 2;
      rShadow.position.y = 0.02;
      group.add(rShadow);

      group.position.set(pos.x, pos.y, pos.z);
      scene.add(group);

      const initialPos = new THREE.Vector3(pos.x, pos.y, pos.z);
      const containerObj: RemotePlayerContainer = {
        id,
        username: username || `Hunter_${id.substring(7, 11)}`,
        group,
        bodyMesh,
        swordGroup: rSwordGroup,
        targetPosition: initialPos,
        targetRotationY: 0,
        currentHp: 100,
        maxHp: 100,
        animationState: 'idle',
        isHostile: false,
        hitFlashTimer: 0,
      };

      remotePlayersRef.current.set(id, containerObj);
      setConnectedCount(remotePlayersRef.current.size + 1);
      return containerObj;
    };

    const removeRemotePlayer = (id: string) => {
      const containerObj = remotePlayersRef.current.get(id);
      if (containerObj) {
        scene.remove(containerObj.group);
        remotePlayersRef.current.delete(id);
        setConnectedCount(remotePlayersRef.current.size + 1);
        if (selectedTargetIdRef.current === id) {
          setSelectedTarget(null);
        }
      }
    };

    // ============================================================================
    // 7. WEBSOCKET MULTIPLAYER SUBSCRIPTIONS
    // ============================================================================
    const handleMultiplayerEvent = (eventType: string, payload: any) => {
      switch (eventType) {
        case 'INIT_WORLD':
          console.log('[Multiplayer] Initialized world as', payload.playerId);
          if (Array.isArray(payload.existingPlayers)) {
            payload.existingPlayers.forEach((p: any) => {
              if (!remotePlayersRef.current.has(p.id)) {
                createRemotePlayerMesh(p.id, p.position, p.username);
              }
            });
          }
          break;

        case 'PLAYER_JOINED':
          if (payload.player && !remotePlayersRef.current.has(payload.player.id)) {
            createRemotePlayerMesh(
              payload.player.id,
              payload.player.position,
              payload.player.username
            );
            triggerFloatingText(`✦ ${payload.player.username || 'Hunter'} joined realm!`, 'loot');
            sound.playLootRoll();
          }
          break;

        case 'PLAYER_MOVED':
          {
            const remote = remotePlayersRef.current.get(payload.id);
            if (remote) {
              if (payload.position) {
                remote.targetPosition.set(payload.position.x, payload.position.y, payload.position.z);
              }
              if (typeof payload.rotation?.y === 'number') {
                remote.targetRotationY = payload.rotation.y;
              }
              if (payload.animationState) {
                remote.animationState = payload.animationState;
              }
              if (payload.username) {
                remote.username = payload.username;
              }
            }
          }
          break;

        case 'REMOTE_ATTACK':
          {
            const remote = remotePlayersRef.current.get(payload.attackerId);
            if (remote) {
              triggerSlashVisualEffect(payload.position, payload.direction, payload.attackType);
              sound.playHit(false);
              // Trigger swing animation on remote avatar sword
              remote.swordGroup.rotation.x = Math.PI / 1.5;
              setTimeout(() => {
                remote.swordGroup.rotation.x = Math.PI / 6;
              }, 250);
            }
          }
          break;

        case 'PLAYER_DAMAGED':
          {
            const { targetId, damageAmount, remainingHp } = payload;
            sound.playHit(true);

            // Did the local player take damage?
            const myId = multiplayerSocket.getMyPlayerId();
            if (targetId === myId) {
              setHp((prev) => Math.max(0, prev - damageAmount));
              triggerFloatingText(`-${damageAmount} DMG`, 'damage');
              setCharacterThought('Took a direct combat hit! Guard up.');
            } else {
              // Remote player or boss damaged
              const remote = remotePlayersRef.current.get(targetId);
              if (remote) {
                remote.currentHp = Math.max(0, remainingHp ?? remote.currentHp - damageAmount);
                remote.hitFlashTimer = 0.2;
                triggerFloatingText(`-${damageAmount}`, 'crit');
              }
            }

            // Update focused target frame if currently selected
            if (selectedTargetIdRef.current === targetId) {
              setSelectedTarget((prev) =>
                prev
                  ? {
                      ...prev,
                      currentHp: Math.max(0, remainingHp ?? prev.currentHp - damageAmount),
                    }
                  : null
              );
            }
          }
          break;

        case 'PLAYER_CHARACTER_CHANGED':
          {
            const remote = remotePlayersRef.current.get(payload.playerId);
            if (remote) {
              if (payload.celShadeColor) {
                (remote.bodyMesh.material as THREE.MeshToonMaterial).color.setHex(payload.celShadeColor);
              }
              triggerFloatingText(`✦ ${remote.username} switched character!`, 'loot');
              sound.playLootRoll();
            }
          }
          break;

        case 'REMOTE_PROJECTILE':
          {
            if (rangerSystem && payload.origin && payload.direction) {
              const orig = new THREE.Vector3(payload.origin.x, payload.origin.y, payload.origin.z);
              const dir = new THREE.Vector3(payload.direction.x, payload.direction.y, payload.direction.z);
              rangerSystem.fireProjectile(orig, dir, 45, payload.projectileType === 'astral_snipe');
            }
          }
          break;

        case 'REMOTE_SUMMON_MINION':
          {
            triggerFloatingText('✦ Remote player summoned Skeleton Vanguard!', 'loot');
            sound.playTrapTrigger();
          }
          break;

        case 'REMOTE_EMOTE':
          {
            const remote = remotePlayersRef.current.get(payload.playerId);
            if (remote) {
              triggerFloatingText(
                `${remote.username}: ${payload.emote.toUpperCase()}!`,
                payload.emote === 'rest' ? 'heal' : 'loot'
              );
            }
          }
          break;

        case 'PLAYER_LEFT':
          removeRemotePlayer(payload.id);
          triggerFloatingText('Player left the realm', 'parry');
          break;
      }
    };

    multiplayerSocket.connect(handleMultiplayerEvent);

    // ============================================================================
    // 8. KEYBOARD & INPUT ENGINE
    // ============================================================================
    const keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
      Shift: false,
      Space: false,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const k = e.key.toLowerCase();
      if (k === 'w' || code === 'KeyW' || e.key === 'ArrowUp') keys.w = true;
      if (k === 'a' || code === 'KeyA' || e.key === 'ArrowLeft') keys.a = true;
      if (k === 's' || code === 'KeyS' || e.key === 'ArrowDown') keys.s = true;
      if (k === 'd' || code === 'KeyD' || e.key === 'ArrowRight') keys.d = true;
      if (e.key === 'Shift') keys.Shift = true;
      if (e.key === ' ') keys.Space = true;

      if (k === 'e' || e.code === 'KeyE') {
        if (isNearLoreStoneRef.current) {
          actionTriggerRef.current.inspectLoreRequested = true;
        } else {
          actionTriggerRef.current.attackRequested = true;
        }
      } else if (k === 'q' || e.code === 'KeyQ') {
        actionTriggerRef.current.heavyAttackRequested = true;
      } else if (k === 'v' || e.code === 'KeyV') {
        if (rangedAttackTypeRef.current === 'fireball') {
          actionTriggerRef.current.fireballRequested = true;
        } else {
          actionTriggerRef.current.bowAttackRequested = true;
        }
      } else if (k === 'x' || e.code === 'KeyX') {
        actionTriggerRef.current.toggleRangedRequested = true;
      } else if (k === 'r' || e.code === 'KeyR') {
        actionTriggerRef.current.runicFinisherRequested = true;
      } else if (k === 'c' || (e.key === ' ' && keys.Shift)) {
        actionTriggerRef.current.dodgeRequested = true;
      } else if (k === 'b' || k === 'f' || e.code === 'KeyF') {
        if (isNearLoreStoneRef.current) {
          actionTriggerRef.current.inspectLoreRequested = true;
        } else if (isNearOreRef.current) {
          actionTriggerRef.current.gatherRequested = true;
        } else {
          actionTriggerRef.current.blockRequested = true;
        }
      } else if (k === '1') {
        actionTriggerRef.current.emoteRequested = 'cheer';
        multiplayerSocket.sendEmote('cheer');
      } else if (k === '2') {
        actionTriggerRef.current.emoteRequested = 'guard';
        multiplayerSocket.sendEmote('guard');
      } else if (k === '3') {
        actionTriggerRef.current.emoteRequested = 'rest';
        multiplayerSocket.sendEmote('rest');
      } else if (k === '4') {
        actionTriggerRef.current.emoteRequested = 'shout';
        multiplayerSocket.sendEmote('shout');
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Cycle target between Boss and Remote Players
        const availableTargets = [
          {
            id: 'abyss_titan',
            name: 'Abyss Void Titan',
            level: 60,
            currentHp: bossCurrentHp,
            maxHp: bossMaxHp,
            isHostile: true,
            roleOrGuild: 'World Boss • Continental Calamity',
          },
          ...Array.from(remotePlayersRef.current.values()).map((r) => ({
            id: r.id,
            name: r.username,
            level: 35,
            currentHp: r.currentHp,
            maxHp: r.maxHp,
            isHostile: false,
            roleOrGuild: 'Hunter Monarch • Guild Vanguard',
          })),
        ];

        if (availableTargets.length > 0) {
          const currentIndex = availableTargets.findIndex(
            (t) => t.id === selectedTargetIdRef.current
          );
          const nextIndex = (currentIndex + 1) % availableTargets.length;
          setSelectedTarget(availableTargets[nextIndex]);
          sound.playTrapTrigger();
        }
      } else if (e.key === 'Escape') {
        setSelectedTarget(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const k = e.key.toLowerCase();
      if (k === 'w' || code === 'KeyW' || e.key === 'ArrowUp') keys.w = false;
      if (k === 'a' || code === 'KeyA' || e.key === 'ArrowLeft') keys.a = false;
      if (k === 's' || code === 'KeyS' || e.key === 'ArrowDown') keys.s = false;
      if (k === 'd' || code === 'KeyD' || e.key === 'ArrowRight') keys.d = false;
      if (e.key === 'Shift') keys.Shift = false;
      if (e.key === ' ') keys.Space = false;
    };

    // 360-Degree Cursor Orbit Camera Controls (Drag / Move to change view, scroll to zoom)
    let cameraYaw = 0; // Horizontal orbit angle (radians, 0 to 2*PI)
    let cameraPitch = 0.32; // Vertical orbit angle (radians, clamped between -0.25 and 1.15)
    let cameraDistance = 11.0; // Distance behind player
    let isDraggingView = false;
    let prevCursorPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      // Cursor is used strictly to rotate / change the view (NOT attack)
      isDraggingView = true;
      prevCursorPos = { x: e.clientX, y: e.clientY };
      try {
        container.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingView && document.pointerLockElement !== container) return;

      const deltaX = document.pointerLockElement === container ? e.movementX : e.clientX - prevCursorPos.x;
      const deltaY = document.pointerLockElement === container ? e.movementY : e.clientY - prevCursorPos.y;

      prevCursorPos = { x: e.clientX, y: e.clientY };

      // Smooth horizontal & vertical sensitivity
      cameraYaw -= deltaX * 0.0055;
      cameraPitch += deltaY * 0.0045;

      // Vertical clamp: prevents camera from flipping upside down
      cameraPitch = Math.max(-0.25, Math.min(1.15, cameraPitch));
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDraggingView = false;
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance = Math.max(5.0, Math.min(22.0, cameraDistance + e.deltaY * 0.012));
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointercancel', handlePointerUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ============================================================================
    // 9. CONTINUOUS GAME, THREE.JS LERP & MULTIPLAYER PHYSICS LOOP
    // ============================================================================
    const _moveDir = new THREE.Vector3();
    const _camTarget = new THREE.Vector3();
    const clock = new THREE.Clock();

    let curStamina = 100;
    let curHp = 100;
    let localCombo = 0;
    let comboResetDeadline = 0;
    let isAttacking = false;
    let attackTimer = 0;
    let isDodging = false;
    let dodgeTimer = 0;
    let dodgeDirection = new THREE.Vector3();
    let isBlocking = false;

    let playerVelY = 0;
    let isJumping = false;
    let bossAngle = 0;
    let collectedCount = 0;
    let harvestedOres = 0;
    let footstepAccumulator = 0;
    let networkSyncThrottle = 0;
    let animationFrameId: number;

    const LERP_FACTOR = 0.15; // Smooth Linear Interpolation factor for remote players

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Check for aura change
      if (actionTriggerRef.current.auraRequested) {
        const a = actionTriggerRef.current.auraRequested;
        actionTriggerRef.current.auraRequested = null;
        if (a === 'gold') {
          bladeMat.color.setHex(0xfef08a);
          bladeMat.emissive.setHex(0xeab308);
          visorMat.color.setHex(0xfef08a);
        } else if (a === 'violet') {
          bladeMat.color.setHex(0xf3e8ff);
          bladeMat.emissive.setHex(0xa855f7);
          visorMat.color.setHex(0xc084fc);
        } else if (a === 'crimson') {
          bladeMat.color.setHex(0xffe4e6);
          bladeMat.emissive.setHex(0xf43f5e);
          visorMat.color.setHex(0xfb7185);
        } else {
          bladeMat.color.setHex(0xe0f2fe);
          bladeMat.emissive.setHex(0x0284c7);
          visorMat.color.setHex(0x38bdf8);
        }
      }

      // Check for Minecraft Voxel Skin toggle
      if (actionTriggerRef.current.skinToggledRequested !== null) {
        const isVoxel = actionTriggerRef.current.skinToggledRequested;
        actionTriggerRef.current.skinToggledRequested = null;
        standardModelGroup.visible = !isVoxel;
        voxelModelGroup.visible = isVoxel;
      }

      // Check for Prism Blade Weapon toggle
      if (actionTriggerRef.current.prismBladeToggledRequested !== null) {
        const isPrism = actionTriggerRef.current.prismBladeToggledRequested;
        actionTriggerRef.current.prismBladeToggledRequested = null;
        prismBladeGroup.visible = isPrism;
        standardSwordMesh.visible = !isPrism;
      }

      // Check for Pet Companion toggle
      if (actionTriggerRef.current.petToggledRequested !== null) {
        const p = actionTriggerRef.current.petToggledRequested;
        actionTriggerRef.current.petToggledRequested = null;
        voidHatchlingGroup.visible = p === 'void_hatchling';
        solarPhoenixGroup.visible = p === 'solar_phoenix';
      }

      // 1. Aether-Forged Prism Blade: Smooth Glitch-Free Chromatic Color-Cycling & Trails
      if (prismBladeGroup.visible) {
        const prismHue = (elapsed * 0.32) % 1.0;
        prismBladeMat.color.setHSL(prismHue, 0.95, 0.7);
        prismBladeMat.emissive.setHSL(prismHue, 0.95, 0.55);
        prismCoreGem.rotation.y = elapsed * 2.5;

        // Dynamic Chromatic Spark Particle Trail emitted from blade tip in 3D world space
        if (isAttacking || (keys.w || keys.s || keys.a || keys.d)) {
          const tipWorldPos = new THREE.Vector3();
          prismBladeTip.getWorldPosition(tipWorldPos);
          const availableSpark = prismTrailSparks.find((s) => s.life <= 0);
          if (availableSpark) {
            availableSpark.mesh.position.copy(tipWorldPos);
            (availableSpark.mesh.material as THREE.MeshBasicMaterial).color.setHSL(prismHue, 1.0, 0.6);
            (availableSpark.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
            availableSpark.mesh.visible = true;
            availableSpark.life = availableSpark.maxLife;
          }
        }
      }

      // Update active chromatic trail sparks
      prismTrailSparks.forEach((s) => {
        if (s.life > 0) {
          s.life -= delta;
          const pct = Math.max(0, s.life / s.maxLife);
          (s.mesh.material as THREE.MeshBasicMaterial).opacity = pct * 0.9;
          s.mesh.scale.setScalar(pct * 1.2);
          if (s.life <= 0) s.mesh.visible = false;
        }
      });

      // 2. Rare Pet Companions (Void Hatchling & Solar Phoenix) Kinematics & Flapping
      if (voidHatchlingGroup.visible) {
        const hoverY = 1.8 + Math.sin(elapsed * 3.0) * 0.15;
        const targetPetPos = playerGroup.position.clone().add(
          new THREE.Vector3(-1.4, hoverY, -0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y)
        );
        voidHatchlingGroup.position.lerp(targetPetPos, 0.1);
        voidHatchlingGroup.rotation.y = THREE.MathUtils.damp(voidHatchlingGroup.rotation.y, playerGroup.rotation.y, 8, delta);
        voidWingL.rotation.z = Math.PI / 6 + Math.sin(elapsed * 9.0) * 0.45;
        voidWingR.rotation.z = -Math.PI / 6 - Math.sin(elapsed * 9.0) * 0.45;
      }

      if (solarPhoenixGroup.visible) {
        const hoverY = 2.0 + Math.sin(elapsed * 3.4 + 1.2) * 0.18;
        const targetPetPos = playerGroup.position.clone().add(
          new THREE.Vector3(1.4, hoverY, -0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y)
        );
        solarPhoenixGroup.position.lerp(targetPetPos, 0.1);
        solarPhoenixGroup.rotation.y = THREE.MathUtils.damp(solarPhoenixGroup.rotation.y, playerGroup.rotation.y, 8, delta);
        solarWingL.rotation.z = Math.PI / 6 + Math.sin(elapsed * 10.0) * 0.5;
        solarWingR.rotation.z = -Math.PI / 6 - Math.sin(elapsed * 10.0) * 0.5;

        // Passive Health Regeneration from Solar Phoenix (+60 HP/s rate)
        if (curHp < 100) {
          curHp = Math.min(100, curHp + 2.5 * delta);
        }
      }

      // Check for time of day change
      if (actionTriggerRef.current.cycleTimeRequested) {
        const tod = actionTriggerRef.current.cycleTimeRequested;
        actionTriggerRef.current.cycleTimeRequested = null;
        if (tod === 'day') {
          scene.background = new THREE.Color(skyColors.day);
          if (scene.fog) scene.fog.color.setHex(skyColors.day);
          sunLight.intensity = 1.4;
          sunLight.color.setHex(0xfef08a);
          hemiLight.intensity = 0.65;
        } else if (tod === 'twilight') {
          scene.background = new THREE.Color(skyColors.twilight);
          if (scene.fog) scene.fog.color.setHex(skyColors.twilight);
          sunLight.intensity = 0.9;
          sunLight.color.setHex(0xf97316);
          hemiLight.intensity = 0.5;
        } else {
          scene.background = new THREE.Color(skyColors.night);
          if (scene.fog) scene.fog.color.setHex(skyColors.night);
          sunLight.intensity = 0.2;
          sunLight.color.setHex(0x38bdf8);
          hemiLight.intensity = 0.3;
        }
      }

      // Ground-plane Camera View Direction (vector from camera through player into the screen)
      const camForward = new THREE.Vector3();
      camForward.x = playerGroup.position.x - camera.position.x;
      camForward.z = playerGroup.position.z - camera.position.z;
      camForward.y = 0;
      if (camForward.lengthSq() > 0.0001) {
        camForward.normalize();
      } else {
        camForward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)).normalize();
      }

      // Ground-plane Camera Right vector (perpendicular to camForward)
      const camRight = new THREE.Vector3(-camForward.z, 0, camForward.x);

      // Forward direction for sword strikes
      const facingDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        playerGroup.rotation.y
      );

      // Process Combat Triggers & Multiplayer Broadcast
      if (actionTriggerRef.current.attackRequested && !isAttacking && !isDodging && curStamina >= 10) {
        actionTriggerRef.current.attackRequested = false;
        isAttacking = true;
        attackTimer = 0.32;
        curStamina = Math.max(0, curStamina - 15);
        localCombo = (localCombo % 3) + 1;
        comboResetDeadline = elapsed + 1.3;

        sound.playHit(localCombo === 3);

        const dmgVal = localCombo === 3 ? 680 : localCombo === 2 ? 320 : 140;
        const atkType = localCombo === 3 ? 'whirlwind' : localCombo === 2 ? 'heavy_cleave' : 'light_slash';

        // 1. Instant local visual effect
        triggerSlashVisualEffect(playerGroup.position, facingDir, atkType);

        // 2. Broadcast attack action over network to other players
        multiplayerSocket.sendAttack({
          attackType: atkType,
          position: { x: playerGroup.position.x, y: playerGroup.position.y, z: playerGroup.position.z },
          direction: { x: facingDir.x, y: facingDir.y, z: facingDir.z },
        });

        triggerFloatingText(
          localCombo === 3 ? `CRIT ${dmgVal}!` : `-${dmgVal}`,
          localCombo === 3 ? 'crit' : 'damage'
        );

        // 3. Melee hit detection against remote players, monsters and world boss
        const strikeRange = localCombo === 3 ? 5.0 : 3.5;
        remotePlayersRef.current.forEach((remote, id) => {
          const dist = playerGroup.position.distanceTo(remote.group.position);
          if (dist <= strikeRange) {
            multiplayerSocket.dealDamage(id, dmgVal);
          }
        });

        applyDamageToMonsters(dmgVal, strikeRange + 1.2);

        // Hit detection against Abyss Titan
        const distToBoss = playerGroup.position.distanceTo(bossGroup.position);
        if (distToBoss <= strikeRange + 2.5) {
          bossCurrentHp = Math.max(0, bossCurrentHp - dmgVal);
          triggerFloatingText(`TITAN -${dmgVal}`, 'crit');
          if (selectedTargetIdRef.current === 'abyss_titan') {
            setSelectedTarget((prev) => (prev ? { ...prev, currentHp: bossCurrentHp } : null));
          }
        }
      }

      if (actionTriggerRef.current.heavyAttackRequested && !isAttacking && !isDodging && curStamina >= 25) {
        actionTriggerRef.current.heavyAttackRequested = false;
        isAttacking = true;
        attackTimer = 0.45;
        curStamina = Math.max(0, curStamina - 25);
        sound.playHit(true);

        const dmgVal = 520;
        triggerSlashVisualEffect(playerGroup.position, facingDir, 'heavy_cleave');
        multiplayerSocket.sendAttack({
          attackType: 'heavy_cleave',
          position: { x: playerGroup.position.x, y: playerGroup.position.y, z: playerGroup.position.z },
          direction: { x: facingDir.x, y: facingDir.y, z: facingDir.z },
        });

        triggerFloatingText('CRIT 520!', 'crit');
        setCharacterThought('Heavy Cleave connected!');

        remotePlayersRef.current.forEach((remote, id) => {
          if (playerGroup.position.distanceTo(remote.group.position) <= 4.0) {
            multiplayerSocket.dealDamage(id, dmgVal);
          }
        });

        applyDamageToMonsters(dmgVal, 4.5);
      }

      if (actionTriggerRef.current.runicFinisherRequested && !isAttacking && !isDodging && curStamina >= 20) {
        actionTriggerRef.current.runicFinisherRequested = false;
        isAttacking = true;
        attackTimer = 0.52;
        curStamina = Math.max(0, curStamina - 20);
        sound.playVictory();

        const isJinwoo = selectedArchetype.id === 'sung_jinwoo';
        const dmgVal = isJinwoo ? 1200 : 850;

        triggerSlashVisualEffect(playerGroup.position, facingDir, 'whirlwind');
        multiplayerSocket.sendAttack({
          attackType: 'whirlwind',
          position: { x: playerGroup.position.x, y: playerGroup.position.y, z: playerGroup.position.z },
          direction: { x: facingDir.x, y: facingDir.y, z: facingDir.z },
        });

        triggerFloatingText(
          isJinwoo ? '👑 "ARISE." - 1200 RUNIC FINISHER!' : `RUNIC FINISHER -${dmgVal}!`,
          'crit'
        );
        setCharacterThought(
          isJinwoo
            ? '👑 "ARISE." The realm bends to the Shadow Monarch.'
            : '✦ Apocalyptic Runic Finisher unleashed!'
        );

        if (isJinwoo) {
          const spawnTarget = {
            id: `shadow_kill_${Date.now()}`,
            name: 'Elite Shadow Soldier',
            position: playerGroup.position.clone().add(facingDir.clone().multiplyScalar(3.5)),
          };
          shadowMonarchSystem.extractShadow(spawnTarget, monsterColliders);
          setMinionCount(activeMinions.length);
        }

        applyDamageToMonsters(dmgVal, 6.5);

        // Hit detection against Abyss Titan
        const distToBoss = playerGroup.position.distanceTo(bossGroup.position);
        if (distToBoss <= 8.0) {
          bossCurrentHp = Math.max(0, bossCurrentHp - dmgVal);
          triggerFloatingText(`TITAN -${dmgVal}`, 'crit');
          if (selectedTargetIdRef.current === 'abyss_titan') {
            setSelectedTarget((prev) => (prev ? { ...prev, currentHp: bossCurrentHp } : null));
          }
        }
      }

      // Long-Range Attack Casting (Fireball & Celestial Bow)
      if (actionTriggerRef.current.fireballRequested || actionTriggerRef.current.bowAttackRequested) {
        const isFireball = actionTriggerRef.current.fireballRequested;
        actionTriggerRef.current.fireballRequested = false;
        actionTriggerRef.current.bowAttackRequested = false;

        if (rangedCooldownRef.current <= 0) {
          rangedCooldownRef.current = isFireball ? 0.85 : 0.6;
          setRangedCooldown(rangedCooldownRef.current);

          const spawnOrigin = playerGroup.position.clone().add(new THREE.Vector3(0, 1.4, 0));
          const aimDirection = camForward.clone().normalize();
          aimDirection.y = -Math.sin(cameraPitch);
          aimDirection.normalize();

          if (isFireball) {
            rangerSystem.fireFireball(spawnOrigin, aimDirection, 52);
            sound.playVictory();
            triggerCameraShake(0.12, 0.25);
            triggerFloatingText('🔥 FIREBALL CAST! (130m RANGE)', 'loot');
            setCharacterThought('Cast blazing long-range Fireball!');
          } else {
            rangerSystem.fireProjectile(spawnOrigin, aimDirection, 58, true, 'celestial_arrow');
            sound.playTrapTrigger();
            triggerFloatingText('🏹 CELESTIAL ARROW!', 'parry');
            setCharacterThought('Loosed piercing long-range Celestial Arrow!');
          }

          // Arm attack thrust animation
          isAttacking = true;
          attackTimer = 0.24;
          swordGroup.rotation.x = Math.PI / 2;
          swordGroup.position.z = 1.0;
        }
      }

      if (actionTriggerRef.current.toggleRangedRequested) {
        actionTriggerRef.current.toggleRangedRequested = false;
        const nextType = rangedAttackTypeRef.current === 'fireball' ? 'bow' : 'fireball';
        setRangedAttackType(nextType);
        triggerFloatingText(
          nextType === 'fireball' ? 'EQUIPPED: 🔥 PYROCLASTIC FIREBALL' : 'EQUIPPED: 🏹 CELESTIAL BOW',
          'loot'
        );
      }

      if (actionTriggerRef.current.toggleSprintRequested) {
        actionTriggerRef.current.toggleSprintRequested = false;
        setIsFreeFireSprint((prev) => {
          const next = !prev;
          triggerFloatingText(next ? 'SPRINT: FREE FIRE AUTO-RUN ON' : 'SPRINT: AUTO-RUN OFF', 'parry');
          return next;
        });
      }

      // Tick Ranged Cooldown
      if (rangedCooldownRef.current > 0) {
        rangedCooldownRef.current = Math.max(0, rangedCooldownRef.current - delta);
        setRangedCooldown(Math.round(rangedCooldownRef.current * 10) / 10);
      }

      if (actionTriggerRef.current.dodgeRequested && !isDodging && curStamina >= 20) {
        actionTriggerRef.current.dodgeRequested = false;
        isDodging = true;
        dodgeTimer = 0.42;
        curStamina = Math.max(0, curStamina - 20);
        sound.playTrapTrigger();
        triggerFloatingText('DODGE i-FRAME', 'parry');
        setCharacterThought('Swift evasion roll!');

        dodgeDirection.copy(_moveDir).normalize();
        if (dodgeDirection.lengthSq() === 0) {
          dodgeDirection.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y);
        }
      }

      if (actionTriggerRef.current.blockRequested) {
        actionTriggerRef.current.blockRequested = false;
        isBlocking = !isBlocking;
        if (isBlocking) {
          sound.playLevelUp();
          triggerFloatingText('GUARD UP', 'parry');
          setCharacterThought('Defensive shield stance active.');
        } else {
          setCharacterThought('Lowered shield stance.');
        }
      }

      if (actionTriggerRef.current.gatherRequested) {
        actionTriggerRef.current.gatherRequested = false;
        sound.playVictory();
        harvestedOres++;
        setOreHarvested(harvestedOres);
        setGoldEarned((prev) => prev + 50);
        triggerFloatingText('+50 GOLD & IRONPEAK ORE', 'loot');
        setCharacterThought('✦ Mined rare Ironpeak Magma Ore!');
        if (onLootGained) onLootGained(50, 0);
        syncPlayerState({
          gold: playerGold + 50,
          essence: playerEssence,
          username: characterName,
        });
      }

      if (actionTriggerRef.current.inspectLoreRequested) {
        actionTriggerRef.current.inspectLoreRequested = false;
        if (nearLoreStoneDataRef.current) {
          const stone = nearLoreStoneDataRef.current;
          setActiveLoreDialog(stone);
          sound.playVictory();
          if (onLootGained) onLootGained(0, stone.rewardEssence);
          triggerFloatingText(`+${stone.rewardEssence} ESSENCE`, 'heal');
          triggerFloatingText('✦ LORE UNLOCKED', 'loot');
          setCharacterThought(`"Deciphered: ${stone.title}."`);

          // Complete Story Quest Objective
          setQuestState((q) => {
            const obj = q.objectives.find((o) => o.id === 'decipher_stone');
            if (obj && !obj.done) {
              sound.playLevelUp();
              triggerFloatingText('🏆 QUEST: TITAN TABLET DECIPHERED!', 'crit');
              return {
                ...q,
                objectives: q.objectives.map((o) => (o.id === 'decipher_stone' ? { ...o, done: true } : o)),
              };
            }
            return q;
          });
        }
      }

      // Emotes
      if (actionTriggerRef.current.emoteRequested) {
        const em = actionTriggerRef.current.emoteRequested;
        actionTriggerRef.current.emoteRequested = null;
        if (em === 'cheer') {
          sound.playVictory();
          setCharacterThought('For the glory of Aethelgard!');
          triggerFloatingText('VICTORY CHEER', 'loot');
        } else if (em === 'rest') {
          curHp = Math.min(100, curHp + 25);
          curStamina = Math.min(100, curStamina + 40);
          sound.playLevelUp();
          setCharacterThought('Resting leylines soothe wounds.');
          triggerFloatingText('+25 HP RESTORED', 'heal');
        } else if (em === 'guard') {
          triggerFloatingText('DEFENSIVE PARRIER', 'parry');
          setCharacterThought('Ready for any strike.');
        } else if (em === 'shout') {
          sound.playHit(true);
          triggerFloatingText('BATTLE ROAR', 'crit');
          setCharacterThought('Aethelgard will not fall!');
        }
      }

      // Attack Animation & Sword Rotation
      if (isAttacking) {
        attackTimer -= delta;
        if (attackTimer > 0) {
          swordGroup.rotation.x = Math.PI / 2 + Math.sin((0.32 - attackTimer) * 18) * 1.5;
          swordGroup.rotation.z = Math.sin((0.32 - attackTimer) * 20) * 1.8;
          if (voxelModelGroup.visible) {
            voxelRightArmGroup.rotation.x = -Math.PI / 2 + Math.sin((0.32 - attackTimer) * 18) * 1.5;
            voxelRightArmGroup.rotation.z = -Math.sin((0.32 - attackTimer) * 18) * 0.6;
          }
        } else {
          isAttacking = false;
          swordGroup.rotation.x = Math.PI / 6;
          swordGroup.rotation.z = -Math.PI / 12;
          if (voxelModelGroup.visible) {
            voxelRightArmGroup.rotation.x = 0;
            voxelRightArmGroup.rotation.z = 0;
          }
        }
      }

      // Blocking Stance
      if (isBlocking) {
        swordGroup.rotation.x = THREE.MathUtils.damp(swordGroup.rotation.x, Math.PI / 3, 10, delta);
        swordGroup.rotation.z = THREE.MathUtils.damp(swordGroup.rotation.z, -Math.PI / 3, 10, delta);
        swordGroup.position.set(0, 1.4, 0.4);
      } else if (!isAttacking) {
        swordGroup.position.set(0.75, 1.1, 0.35);
      }

      // Dodge Roll Animation
      if (isDodging) {
        dodgeTimer -= delta;
        if (dodgeTimer > 0) {
          playerGroup.position.x += dodgeDirection.x * 16 * delta;
          playerGroup.position.z += dodgeDirection.z * 16 * delta;
          playerBody.rotation.x += 16 * delta;
          playerBody.position.y = 0.8;
          voxelModelGroup.rotation.x += 16 * delta;
          voxelModelGroup.position.y = -0.4;
        } else {
          isDodging = false;
          playerBody.rotation.x = 0;
          playerBody.position.y = 1.2;
          voxelModelGroup.rotation.x = 0;
          voxelModelGroup.position.y = 0;
        }
      }

      // Combo expiration check
      if (localCombo > 0 && elapsed > comboResetDeadline) {
        localCombo = 0;
      }

      // Locomotion & Movement Calculation (Camera-Relative TPS Orbit Movement + Free Fire Auto-Sprint)
      _moveDir.set(0, 0, 0);
      const isFreeFireRunning = isFreeFireSprintRef.current;
      const forward = keys.w || isFreeFireRunning;
      const backward = keys.s;
      const left = keys.a;
      const right = keys.d;
      const wantsSprint = (keys.Shift || isFreeFireRunning) && curStamina > 5;

      if (forward) {
        _moveDir.add(camForward);
      }
      if (backward) {
        _moveDir.sub(camForward);
      }
      if (left) {
        _moveDir.sub(camRight);
      }
      if (right) {
        _moveDir.add(camRight);
      }

      const isMoving = _moveDir.lengthSq() > 0 && !isDodging;
      const isExhausted = curStamina <= 10;
      const baseSpeed = wantsSprint ? (isExhausted ? 8 : 16) : isExhausted ? 5 : 8.5;

      if (isMoving && wantsSprint && !isExhausted) {
        curStamina = Math.max(0, curStamina - 20 * delta);
      } else {
        curStamina = Math.min(100, curStamina + 18 * delta);
      }

      if (isMoving) {
        _moveDir.normalize();
        playerGroup.position.x += _moveDir.x * baseSpeed * delta;
        playerGroup.position.z += _moveDir.z * baseSpeed * delta;

        // 3D Citadel Building Wall Collision: player cannot walk through house walls, only through doors!
        resolveCitadelWallCollision(playerGroup.position, 0.45);

        // Dynamic banking & lean into turn (with forward lean in Free Fire sprint)
        const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
        playerGroup.rotation.y = THREE.MathUtils.damp(playerGroup.rotation.y, targetAngle, 14, delta);

        const turnDelta = playerGroup.rotation.y - targetAngle;
        playerBody.rotation.z = THREE.MathUtils.damp(playerBody.rotation.z, turnDelta * 0.4, 8, delta);
        playerBody.rotation.x = THREE.MathUtils.damp(playerBody.rotation.x, wantsSprint ? 0.22 : 0, 8, delta);
        voxelTorso.rotation.z = THREE.MathUtils.damp(voxelTorso.rotation.z, turnDelta * 0.3, 8, delta);

        const strideSpeed = wantsSprint ? 18 : 12;
        playerBody.position.y = 1.2 + Math.sin(elapsed * strideSpeed) * (wantsSprint ? 0.12 : 0.07);
        cape.rotation.x = THREE.MathUtils.damp(cape.rotation.x, Math.PI / 4 + Math.sin(elapsed * 16) * 0.15, 10, delta);

        // Minecraft Blocky Limbs Walking Cycle
        if (voxelModelGroup.visible) {
          const swingAngle = Math.sin(elapsed * strideSpeed) * 0.65;
          voxelLeftLegGroup.rotation.x = swingAngle;
          voxelRightLegGroup.rotation.x = -swingAngle;
          voxelLeftArmGroup.rotation.x = -swingAngle;
          if (!isAttacking) {
            voxelRightArmGroup.rotation.x = swingAngle;
            voxelRightArmGroup.rotation.z = 0;
          }
          voxelTorso.position.y = 1.2 + Math.sin(elapsed * strideSpeed) * (wantsSprint ? 0.08 : 0.04);
        }

        footstepAccumulator += delta * (wantsSprint ? 4 : 2.5);
        if (footstepAccumulator >= 1) {
          footstepAccumulator = 0;
          sound.playTrapTrigger();
        }
      } else {
        // Human-like Breathing & Fatigue heave
        const breatheSpeed = isExhausted ? 8 : 2.2;
        const breatheHeave = isExhausted ? 0.08 : 0.03;
        playerBody.position.y = THREE.MathUtils.damp(
          playerBody.position.y,
          1.2 + Math.sin(elapsed * breatheSpeed) * breatheHeave,
          6,
          delta
        );
        playerBody.rotation.z = THREE.MathUtils.damp(playerBody.rotation.z, 0, 8, delta);
        cape.rotation.x = THREE.MathUtils.damp(cape.rotation.x, Math.sin(elapsed * 2) * 0.05, 5, delta);

        // Minecraft Voxel Idle
        if (voxelModelGroup.visible) {
          voxelLeftLegGroup.rotation.x = THREE.MathUtils.damp(voxelLeftLegGroup.rotation.x, 0, 8, delta);
          voxelRightLegGroup.rotation.x = THREE.MathUtils.damp(voxelRightLegGroup.rotation.x, 0, 8, delta);
          voxelLeftArmGroup.rotation.x = THREE.MathUtils.damp(voxelLeftArmGroup.rotation.x, 0, 8, delta);
          if (!isAttacking) {
            voxelRightArmGroup.rotation.x = THREE.MathUtils.damp(voxelRightArmGroup.rotation.x, 0, 8, delta);
            voxelRightArmGroup.rotation.z = THREE.MathUtils.damp(voxelRightArmGroup.rotation.z, 0, 8, delta);
          }
          voxelTorso.position.y = 1.2;
        }
      }

      // Jump & Gravity physics
      if (keys.Space && !isJumping && !isDodging) {
        isJumping = true;
        playerVelY = 7.5;
        curStamina = Math.max(0, curStamina - 8);
      }

      if (isJumping) {
        playerGroup.position.y += playerVelY * delta;
        playerVelY -= 20 * delta;
        if (playerGroup.position.y <= 0) {
          playerGroup.position.y = 0;
          playerVelY = 0;
          isJumping = false;
        }
      }

      // ============================================================================
      // 10. MULTIPLAYER CLIENT BROADCAST (Position & Rotation sync)
      // ============================================================================
      networkSyncThrottle += delta;
      if (networkSyncThrottle >= 0.033) {
        // ~30 frames/sec sync rate
        networkSyncThrottle = 0;
        multiplayerSocket.sendTransform({
          position: {
            x: Number(playerGroup.position.x.toFixed(2)),
            y: Number(playerGroup.position.y.toFixed(2)),
            z: Number(playerGroup.position.z.toFixed(2)),
          },
          rotation: { y: Number(playerGroup.rotation.y.toFixed(2)) },
          animationState: isDodging ? 'dodge' : isMoving ? (wantsSprint ? 'sprint' : 'walk') : 'idle',
          username: characterName,
        });
      }

      // ============================================================================
      // 11. LINEAR INTERPOLATION (LERPING) FOR ALL REMOTE PLAYERS
      // ============================================================================
      remotePlayersRef.current.forEach((remote) => {
        // Position Lerp
        remote.group.position.lerp(remote.targetPosition, LERP_FACTOR);

        // Smooth shortest-path rotation blending
        let diff = remote.targetRotationY - remote.group.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        remote.group.rotation.y += diff * LERP_FACTOR;

        // Remote animation bobbing based on movement state
        if (remote.animationState === 'walk' || remote.animationState === 'sprint') {
          const speedFactor = remote.animationState === 'sprint' ? 16 : 10;
          remote.bodyMesh.position.y = 1.2 + Math.sin(elapsed * speedFactor) * 0.08;
        } else {
          remote.bodyMesh.position.y = 1.2 + Math.sin(elapsed * 2.5) * 0.03;
        }

        // Hit flash decay
        if (remote.hitFlashTimer > 0) {
          remote.hitFlashTimer -= delta;
          (remote.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0xf43f5e);
        } else {
          (remote.bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(0x059669);
        }
      });

      // 360-Degree Cursor Orbit Camera Follow (PUBG / Free Fire / BGMI TPS style)
      const horizDist = cameraDistance * Math.cos(cameraPitch);
      const targetCamX = playerGroup.position.x + horizDist * Math.sin(cameraYaw);
      const targetCamY = playerGroup.position.y + cameraDistance * Math.sin(cameraPitch) + 1.8;
      const targetCamZ = playerGroup.position.z + horizDist * Math.cos(cameraYaw);

      camera.position.set(targetCamX, targetCamY, targetCamZ);

      // Apply Camera Screen Shake VFX
      if (cameraShakeTimer > 0) {
        cameraShakeTimer -= delta;
        const shakePct = Math.max(0, cameraShakeTimer / 0.25);
        const curIntensity = cameraShakeIntensity * shakePct;
        camera.position.x += (Math.random() - 0.5) * curIntensity * 1.8;
        camera.position.y += (Math.random() - 0.5) * curIntensity * 1.8;
      }

      _camTarget.copy(playerGroup.position).add(new THREE.Vector3(0, 1.4, 0));
      camera.lookAt(_camTarget);

      // 3D VFX Particle Pool Simulation
      for (let i = 0; i < particlePool.length; i++) {
        const p = particlePool[i];
        if (p.life > 0) {
          p.life -= delta;
          p.mesh.position.addScaledVector(p.vel, delta);
          p.vel.y -= 12 * delta; // Gravity
          const pAlpha = Math.max(0, p.life / p.maxLife);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = pAlpha;
          p.mesh.scale.setScalar(pAlpha * 1.25);
          if (p.life <= 0) {
            p.mesh.visible = false;
          }
        }
      }

      // Shard pickup check
      shards.forEach((shard) => {
        shard.rotation.y += delta * 2;
        shard.position.y = 1.2 + Math.sin(elapsed * 3 + shard.position.x) * 0.2;

        const dist = playerGroup.position.distanceTo(shard.position);
        if (dist < 1.7 && shard.visible) {
          shard.visible = false;
          collectedCount++;
          sound.playLootRoll();
          triggerFloatingText('+1 ASTRAL SHARD', 'loot');
          setCharacterThought('✦ Acquired rare Astral Shard crystal!');
        }
      });

      // Interactive Ore Proximity check
      const distToOre = playerGroup.position.distanceTo(oreNode.position);
      const nearOre = distToOre < 3.2;
      if (nearOre !== isNearOreRef.current) {
        isNearOreRef.current = nearOre;
        setIsNearOre(nearOre);
      }

      // Hearth Lantern Proximity check
      const distToLantern = playerGroup.position.distanceTo(lanternGroup.position);
      const nearLantern = distToLantern < 4.5;
      if (nearLantern !== isNearLanternRef.current) {
        isNearLanternRef.current = nearLantern;
        setIsNearLantern(nearLantern);
      }

      // Lore Stone Proximity Check in Cave
      let foundLoreStone: any = null;
      for (const stone of caveLoreEntities) {
        const d = playerGroup.position.distanceTo(stone.position);
        if (d < 3.8) {
          foundLoreStone = stone;
          break;
        }
      }
      const isNearLore = Boolean(foundLoreStone);
      if (isNearLore !== isNearLoreStoneRef.current) {
        isNearLoreStoneRef.current = isNearLore;
        setIsNearLoreStone(isNearLore);
        nearLoreStoneDataRef.current = foundLoreStone;
        setNearLoreStoneData(foundLoreStone);
      }

      // Destructibles Proximity Check in Cave
      let foundDestruct = false;
      for (const dest of caveDestructibles) {
        if (!dest.destroyed && playerGroup.position.distanceTo(dest.position) < 3.5) {
          foundDestruct = true;
          break;
        }
      }
      if (foundDestruct !== isNearDestructibleRef.current) {
        isNearDestructibleRef.current = foundDestruct;
        setIsNearDestructible(foundDestruct);
      }

      // Safe-Zone & Cavern Zone Boundary Check
      const distCenter = Math.hypot(playerGroup.position.x, playerGroup.position.z);
      const distToCave = playerGroup.position.distanceTo(caveCenter);
      const inCave = distToCave <= 36;
      const inAegis = distCenter <= 30 && !inCave;

      // Quest Objective 1: Enter Cave Trigger
      if (inCave) {
        setQuestState((q) => {
          const obj = q.objectives.find((o) => o.id === 'enter_cave');
          if (obj && !obj.done) {
            sound.playLevelUp();
            triggerFloatingText('QUEST: INFILTRATED SUNKEN CAVERN!', 'crit');
            return {
              ...q,
              objectives: q.objectives.map((o) => (o.id === 'enter_cave' ? { ...o, done: true } : o)),
            };
          }
          return q;
        });
      }

      // Roaming Abyss Void Titan Patrol
      bossAngle += delta * 0.22;
      const bossRadius = 45;
      bossGroup.position.x = Math.cos(bossAngle) * bossRadius;
      bossGroup.position.z = Math.sin(bossAngle) * bossRadius;
      bossGroup.position.y = 3.5 + Math.sin(elapsed * 1.8) * 0.6;
      bossGroup.rotation.y = bossAngle + Math.PI / 2;

      const bossDist = Math.round(playerGroup.position.distanceTo(bossGroup.position));

      // Update Free Fire Safe Zone Barrier Net (r = 130m, height = 28m)
      safeZoneNet.updateNet(delta, elapsed);

      // Update active minions & Arcane Ranger projectiles (with fireball explosion callback)
      activeMinions.forEach((minion) => {
        minion.update(delta, playerGroup.position);
      });

      rangerSystem.update(delta, monsterColliders, (explosionPos) => {
        spawn3DParticleBurst(explosionPos, 0xf97316, 32, 1.6);
        spawn3DParticleBurst(explosionPos, 0xfacc15, 20, 1.2);
        sound.playHit(true);
        triggerCameraShake(0.24, 0.55);
        triggerFloatingText('💥 FIREBALL EXPLOSION!', 'crit');
      });

      // Update Animal Monster Wilderness Packs AI (Pack Tactics, 4-Leg Gallop, Paw Claw Attacks)
      updateAnimalMonsterPacks(
        monsters,
        delta,
        elapsed,
        playerGroup.position,
        isBlocking,
        isDodging,
        (damageAmount: number, monsterName: string) => {
          const distToCenter = Math.hypot(playerGroup.position.x, playerGroup.position.z);
          // Protection array: Monsters CANNOT harm player inside the net (radius < 130m)
          if (distToCenter >= 130) {
            if (!isBlocking && !isDodging) {
              curHp = Math.max(0, curHp - damageAmount);
              sound.playHit(false);
              triggerCameraShake(0.2, 0.45);
              triggerFloatingText(`-${damageAmount} CLAW SLASH`, 'damage');
              setCharacterThought(`Hit by ${monsterName}'s razor claw!`);
            } else if (isBlocking) {
              sound.playTrapTrigger();
              triggerFloatingText('PAW STRIKE DEFLECTED!', 'parry');
            }
          }
        }
      );

      // ============================================================================
      // 12. PROJECTED 3D FLOATING NAMEPLATES CALCULATION
      // ============================================================================
      if (renderer.domElement && Math.floor(elapsed * 20) % 2 === 0) {
        const clientW = renderer.domElement.clientWidth;
        const clientH = renderer.domElement.clientHeight;
        const projectedList: ProjectedNameplate[] = [];

        // Projected nameplate for remote players
        remotePlayersRef.current.forEach((remote) => {
          const headPos = remote.group.position.clone().add(new THREE.Vector3(0, 2.3, 0));
          headPos.project(camera);
          const isBehind = headPos.z > 1 || headPos.z < -1;
          const sx = (headPos.x * 0.5 + 0.5) * clientW;
          const sy = (-(headPos.y * 0.5) + 0.5) * clientH;

          projectedList.push({
            id: remote.id,
            name: remote.username,
            level: 35,
            currentHp: remote.currentHp,
            maxHp: remote.maxHp,
            isHostile: false,
            role: 'Guild Knight',
            screenX: Math.round(sx),
            screenY: Math.round(sy),
            isBehindCamera: isBehind,
          });
        });

        // Projected nameplate for living roaming monsters
        monsters.forEach((m) => {
          if (m.state !== 'dead') {
            const mHeadPos = m.group.position.clone().add(new THREE.Vector3(0, 2.4, 0));
            mHeadPos.project(camera);
            const isBehind = mHeadPos.z > 1 || mHeadPos.z < -1;
            const sx = (mHeadPos.x * 0.5 + 0.5) * clientW;
            const sy = (-(mHeadPos.y * 0.5) + 0.5) * clientH;

            projectedList.push({
              id: m.id,
              name: m.name,
              level: m.level,
              currentHp: m.currentHp,
              maxHp: m.maxHp,
              isHostile: true,
              role: m.role,
              screenX: Math.round(sx),
              screenY: Math.round(sy),
              isBehindCamera: isBehind,
            });
          }
        });

        // Projected nameplate for Abyss Void Titan Boss
        const bossHeadPos = bossGroup.position.clone().add(new THREE.Vector3(0, 4.2, 0));
        bossHeadPos.project(camera);
        const bossIsBehind = bossHeadPos.z > 1 || bossHeadPos.z < -1;
        const bsx = (bossHeadPos.x * 0.5 + 0.5) * clientW;
        const bsy = (-(bossHeadPos.y * 0.5) + 0.5) * clientH;

        projectedList.push({
          id: 'abyss_titan',
          name: 'Abyss Void Titan',
          level: 60,
          currentHp: bossCurrentHp,
          maxHp: bossMaxHp,
          isHostile: true,
          role: 'Continental Calamity',
          screenX: Math.round(bsx),
          screenY: Math.round(bsy),
          isBehindCamera: bossIsBehind,
        });

        setNameplates(projectedList);
      }

      // React UI state sync throttled
      if (Math.floor(elapsed * 10) % 2 === 0) {
        setHp(Math.round(curHp));
        setStamina(Math.round(curStamina));
        setComboStep(localCombo);
        setComboTimer(Math.max(0, Number((comboResetDeadline - elapsed).toFixed(1))));

        setStats({
          posX: Math.round(playerGroup.position.x),
          posZ: Math.round(playerGroup.position.z),
          speed: isMoving ? (wantsSprint ? 15 : 8.5) : 0,
          isSprinting: wantsSprint && isMoving,
          isExhausted,
          isDodging,
          isBlocking,
          zoneName: inCave
            ? 'Abyssal Sunken Cavern (Dungeon Floor 1)'
            : inAegis
            ? 'Citadel of Oakhaven (Safe-Zone)'
            : 'Shattered Badlands (Wilderness Active)',
          bossDistance: bossDist,
          bossStatus: bossDist < 26 ? 'Aggressive • Roaming Nearby' : 'Patrolling Outer Perimeter',
        });

        // Update Minimap Radar Coordinates & Entities
        setLocalMinimapState({
          id: 'local_player',
          name: characterName,
          position: {
            x: playerGroup.position.x,
            y: playerGroup.position.y,
            z: playerGroup.position.z,
          },
          rotationY: playerGroup.rotation.y,
          hpPercent: Math.round(curHp),
          isLocalPlayer: true,
        });

        const radarEntities: MinimapEntity[] = [];
        remotePlayersRef.current.forEach((r) => {
          radarEntities.push({
            id: r.id,
            name: r.username,
            position: {
              x: r.group.position.x,
              y: r.group.position.y,
              z: r.group.position.z,
            },
            rotationY: r.group.rotation.y,
            hpPercent: (r.currentHp / r.maxHp) * 100,
            isHostile: false,
          });
        });
        monsters.forEach((m) => {
          if (m.state !== 'dead') {
            radarEntities.push({
              id: m.id,
              name: m.name,
              position: {
                x: m.group.position.x,
                y: m.group.position.y,
                z: m.group.position.z,
              },
              rotationY: m.group.rotation.y,
              hpPercent: (m.currentHp / m.maxHp) * 100,
              isHostile: true,
            });
          }
        });
        radarEntities.push({
          id: 'abyss_titan',
          name: 'Abyss Titan',
          position: {
            x: bossGroup.position.x,
            y: bossGroup.position.y,
            z: bossGroup.position.z,
          },
          rotationY: bossGroup.rotation.y,
          hpPercent: (bossCurrentHp / bossMaxHp) * 100,
          isHostile: true,
        });
        setMinimapEntities(radarEntities);
      }

      // Update Floating Leyline Stardust Drift
      updateStardust(delta);

      // Animate 3D Wind Sway on Foliage & Grass Clusters
      vegetation.update(delta);

      // Render through Unreal Bloom Post-Processing Composer
      postProcessing.composer.render();
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      postProcessing.resize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerup', handlePointerUp);
      container.removeEventListener('pointercancel', handlePointerUp);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      multiplayerSocket.unsubscribe(handleMultiplayerEvent);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      landscapeTexture.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      domeGeo.dispose();
      domeMat.dispose();
      vegetation.mesh.geometry.dispose();
      if (Array.isArray(vegetation.mesh.material)) {
        vegetation.mesh.material.forEach((m) => m.dispose());
      } else {
        vegetation.mesh.material.dispose();
      }
    };
  }, [triggerFloatingText]);

  return (
    <div className="relative w-full h-[82vh] min-h-[580px] rounded-3xl overflow-hidden border border-cyan-500/40 bg-slate-950 shadow-2xl select-none font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="w-full h-full cursor-crosshair" />

      {/* Target Unit Frame (Focused Target Health Bar & Stats) */}
      {selectedTarget && (
        <TargetUnitFrame
          name={selectedTarget.name}
          level={selectedTarget.level}
          currentHp={selectedTarget.currentHp}
          maxHp={selectedTarget.maxHp}
          isHostile={selectedTarget.isHostile}
          roleOrGuild={selectedTarget.roleOrGuild}
          onClearTarget={() => setSelectedTarget(null)}
        />
      )}

      {/* Screen-Space Projected 3D Floating Nameplates */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {nameplates.map((np) => {
          if (np.isBehindCamera) return null;
          const isSelected = selectedTarget?.id === np.id;
          const hpPercent = Math.max(0, Math.min(100, (np.currentHp / np.maxHp) * 100));

          return (
            <div
              key={np.id}
              style={{
                left: `${np.screenX}px`,
                top: `${np.screenY}px`,
                transform: 'translate(-50%, -100%)',
              }}
              onClick={() => {
                setSelectedTarget({
                  id: np.id,
                  name: np.name,
                  level: np.level,
                  currentHp: np.currentHp,
                  maxHp: np.maxHp,
                  isHostile: np.isHostile,
                  roleOrGuild: np.role,
                });
                sound.playTrapTrigger();
              }}
              className={`absolute pointer-events-auto cursor-pointer transition-transform duration-75 flex flex-col items-center group ${
                isSelected ? 'scale-110' : 'hover:scale-105'
              }`}
            >
              {/* Hostile / Friendly Target Indicator Arrow */}
              {isSelected && (
                <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-amber-400 animate-bounce mb-0.5" />
              )}

              {/* Holographic Nameplate Badge */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full backdrop-blur-md border text-[10px] font-rpg font-bold shadow-lg ${
                  np.isHostile
                    ? 'bg-rose-950/85 border-rose-500/60 text-rose-200'
                    : isSelected
                    ? 'bg-cyan-950/90 border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                    : 'bg-slate-950/85 border-cyan-500/50 text-cyan-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    np.isHostile ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400'
                  }`}
                />
                <span>{np.name}</span>
                <span className="text-[9px] text-slate-400 font-mono">Lv.{np.level}</span>
              </div>

              {/* Overhead Mini Health Bar */}
              <div className="w-20 h-1.5 bg-slate-950/90 rounded-full overflow-hidden border border-slate-700/80 mt-1 shadow-md">
                <div
                  className={`h-full transition-all duration-200 ${
                    np.isHostile
                      ? 'bg-gradient-to-r from-red-600 to-rose-500'
                      : hpPercent < 40
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Damage & Action Text Overlays */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
        {floatingTexts.map((f) => (
          <div
            key={f.id}
            style={{ left: f.x, top: f.y }}
            className={`absolute font-rpg font-extrabold text-sm tracking-wide -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 transform -translate-y-8 opacity-90 drop-shadow-lg ${
              f.type === 'crit'
                ? 'text-amber-400 text-base scale-125'
                : f.type === 'parry'
                ? 'text-cyan-300'
                : f.type === 'heal'
                ? 'text-emerald-400'
                : f.type === 'loot'
                ? 'text-purple-300'
                : 'text-rose-400'
            }`}
          >
            {f.text}
          </div>
        ))}
      </div>

      {/* Low Health (< 25% HP) Red Vignette Edge Pulse */}
      {hp < 25 && (
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(239,68,68,0.7)] border-4 border-rose-500/40 animate-pulse z-20" />
      )}

      {/* Top Left: Ultra-Compact Modern Game HUD (Small, unobtrusive, <3% screen space) */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
        {/* Sleek Player Frame (176px width) */}
        <div className="bg-slate-950/90 border border-slate-800/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-lg w-44 pointer-events-auto">
          {/* Header: Level Badge & Character Name & HP text */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <span className="px-1 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono font-bold text-amber-300">
                LV.{playerLevel}
              </span>
              <span className="font-rpg font-bold text-[11px] text-white truncate max-w-[70px]">
                {characterName}
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-rose-300">
              {Math.round(hp)}<span className="text-[8px] text-slate-500">/100</span>
            </span>
          </div>

          {/* Slim Health Bar (6px) */}
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-rose-950 mb-1">
            <div
              className="h-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-400 transition-all duration-200"
              style={{ width: `${hp}%` }}
            />
          </div>

          {/* Slim Stamina Bar (4px) */}
          <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-amber-950 mb-1">
            <div
              className={`h-full transition-all duration-150 ${
                stats.isExhausted ? 'bg-amber-600 animate-pulse' : 'bg-gradient-to-r from-amber-500 to-yellow-300'
              }`}
              style={{ width: `${stamina}%` }}
            />
          </div>

          {/* Micro EXP Progression Bar (2px) */}
          <div className="w-full h-0.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (playerExp / nextLevelExp) * 100)}%` }}
            />
          </div>
        </div>

        {/* Collapsible Minimal Quest Tracker Pill */}
        <div className="bg-slate-950/85 border border-indigo-500/30 backdrop-blur-md rounded-xl shadow-md w-44 pointer-events-auto transition-all">
          <button
            onClick={() => setIsQuestExpanded((prev) => !prev)}
            className="w-full px-2.5 py-1 flex items-center justify-between text-left cursor-pointer hover:bg-slate-900/60 rounded-xl"
          >
            <div className="flex items-center gap-1 text-amber-400 font-rpg font-bold text-[10px] truncate">
              <Scroll className="w-3 h-3 shrink-0 text-amber-400" />
              <span className="truncate">Active Quest</span>
            </div>
            <span className="text-[8px] font-mono text-cyan-300 flex items-center gap-0.5">
              <span>{isQuestExpanded ? '▲' : '▼'}</span>
            </span>
          </button>

          {isQuestExpanded && (
            <div className="px-2.5 pb-2 pt-0.5 border-t border-slate-800/60 space-y-1 animate-in fade-in duration-150">
              <p className="text-[10px] font-rpg font-semibold text-slate-200 leading-tight">
                {questState.title}
              </p>
              {questState.objectives.map((obj) => (
                <div key={obj.id} className="flex items-start gap-1 text-[9px]">
                  <span className={`shrink-0 font-bold ${obj.done ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {obj.done ? '✓' : '•'}
                  </span>
                  <span className={obj.done ? 'line-through text-slate-500' : 'text-slate-300'}>
                    {obj.text} {obj.progress !== undefined && `(${obj.progress}/${obj.target})`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compact Thought Bubble */}
        <div className="bg-slate-950/80 border border-cyan-500/20 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-mono text-cyan-200/90 flex items-center gap-1.5 max-w-[176px] shadow-sm">
          <MessageSquare className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
          <span className="italic truncate">"{characterThought}"</span>
        </div>
      </div>

      {/* Top Right: Multiplayer Status, Time of Day, Aura Swatches & Return */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10 pointer-events-auto">
        {/* Real-time Online Counter */}
        <div className="bg-slate-950/85 border border-emerald-500/40 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-rpg font-bold text-emerald-300">
            {connectedCount} {connectedCount === 1 ? 'Hunter' : 'Hunters'} in World
          </span>
        </div>

        {/* Time of Day Cycle Button */}
        <div className="bg-slate-950/85 border border-slate-800 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 shadow-md">
          <button
            onClick={() => {
              setTimeOfDay('day');
              actionTriggerRef.current.cycleTimeRequested = 'day';
            }}
            className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer ${
              timeOfDay === 'day' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400'
            }`}
            title="Daylight"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setTimeOfDay('twilight');
              actionTriggerRef.current.cycleTimeRequested = 'twilight';
            }}
            className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer ${
              timeOfDay === 'twilight' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'text-slate-400'
            }`}
            title="Twilight"
          >
            <Flame className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setTimeOfDay('night');
              actionTriggerRef.current.cycleTimeRequested = 'night';
            }}
            className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer ${
              timeOfDay === 'night' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-400'
            }`}
            title="Stardust Night"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dynamic Weather Toggle */}
        <div className="bg-slate-950/85 border border-slate-800 backdrop-blur-md p-1 rounded-xl flex items-center gap-1 shadow-md">
          <button
            onClick={() => {
              const next = weather === 'clear' ? 'rain' : weather === 'rain' ? 'aurora' : 'clear';
              setWeather(next);
              actionTriggerRef.current.weatherRequested = next;
              triggerFloatingText(
                next === 'rain'
                  ? 'WEATHER: ARCANE RAIN (+25% LIGHTNING)'
                  : next === 'aurora'
                  ? 'WEATHER: STARDUST AURORA'
                  : 'WEATHER: CLEAR SKIES',
                'loot'
              );
            }}
            className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer ${
              weather === 'rain' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
            }`}
            title={`Weather: ${weather.toUpperCase()}`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase font-tech hidden sm:inline">{weather}</span>
          </button>
        </div>

        {/* Weapon Aura Swatches */}
        <div className="bg-slate-950/85 border border-slate-800 backdrop-blur-md px-2 py-1 rounded-xl flex items-center gap-1.5 shadow-md">
          <span className="text-[10px] text-slate-400 uppercase font-tech mr-1">Rune:</span>
          {(['cyan', 'gold', 'violet', 'crimson'] as AuraColor[]).map((col) => (
            <button
              key={col}
              onClick={() => {
                setActiveAura(col);
                actionTriggerRef.current.auraRequested = col;
              }}
              className={`w-4 h-4 rounded-full border transition cursor-pointer ${
                activeAura === col ? 'scale-125 border-white ring-2 ring-white/30' : 'border-transparent opacity-60'
              }`}
              style={{
                backgroundColor:
                  col === 'cyan' ? '#06b6d4' : col === 'gold' ? '#eab308' : col === 'violet' ? '#a855f7' : '#f43f5e',
              }}
            />
          ))}
        </div>

        {/* CGAxis 3D Asset Browser & World Spawner Button */}
        <button
          onClick={() => setShowCGAxisBrowser(true)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-amber-950/70 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-rpg font-bold text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
          title="Open CGAxis 3D Asset Browser & World Spawner (Blender Addon)"
        >
          <Box className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">CGAXIS 3D BUILDER</span>
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
            {placedCGAxisObjects.length}
          </span>
        </button>

        {/* Landscape & Grass Brushes Inspector Button */}
        <button
          onClick={() => setShowFoliageModal(true)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 hover:bg-emerald-950/70 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-rpg font-bold text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
          title="Inspect Landscape Brushes & Foliage Ground Cover"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">LANDSCAPE BRUSHES</span>
        </button>

        {/* Procedural Dungeon Synth Ambience */}
        <DungeonSynthWidget compact={true} />

        {/* Return Button */}
        {onReturnToDashboard && (
          <button
            onClick={onReturnToDashboard}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-white font-rpg font-bold text-xs transition flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>RETURN</span>
          </button>
        )}
      </div>

      {/* Center Interactive Harvest Prompt */}
      {isNearOre && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-16 pointer-events-auto bg-slate-950/90 border border-amber-500/60 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce z-30">
          <Pickaxe className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-xs font-rpg font-bold text-amber-200">Ironpeak Magma Ore Vein</p>
            <p className="text-[10px] text-slate-400">Press [F] to harvest runic ore & gold bounty</p>
          </div>
          <button
            onClick={() => {
              actionTriggerRef.current.gatherRequested = true;
            }}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs cursor-pointer"
          >
            MINE [F]
          </button>
        </div>
      )}

      {/* Center Interactive Lore Tablet Prompt */}
      {isNearLoreStone && nearLoreStoneData && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-24 pointer-events-auto bg-slate-950/95 border border-indigo-500/80 backdrop-blur-md px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce z-30 ring-1 ring-indigo-400/50">
          <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>
            <p className="text-xs font-rpg font-bold text-indigo-200">{nearLoreStoneData.title}</p>
            <p className="text-[10px] text-slate-400">Press [F] or [E] to decipher ancient chronicle</p>
          </div>
          <button
            onClick={() => {
              actionTriggerRef.current.inspectLoreRequested = true;
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-rpg font-bold rounded-xl text-xs cursor-pointer shadow-md"
          >
            DECIPHER [F]
          </button>
        </div>
      )}

      {/* Center Destructible Object Nearby Hint */}
      {isNearDestructible && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-32 pointer-events-none bg-slate-950/90 border border-cyan-500/50 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-xl flex items-center gap-2 z-30">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] font-rpg font-bold text-cyan-200">
            Destructible Cavern Relic Nearby — Strike to Smash!
          </span>
        </div>
      )}

      {/* Interactive Ancient Lore Chronicle Modal */}
      {activeLoreDialog && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="max-w-xl w-full bg-slate-950 border border-indigo-500/60 rounded-3xl p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-indigo-400/40">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-indigo-900/60">
              <div className="flex items-center gap-2 text-xs font-rpg font-bold text-amber-400 uppercase tracking-wider">
                <Scroll className="w-4 h-4 text-amber-400" />
                <span>{activeLoreDialog.chapter}</span>
              </div>
              <button
                onClick={() => setActiveLoreDialog(null)}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-mono transition cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="mb-4">
              <h3 className="text-xl font-rpg font-extrabold text-white mb-2 flex items-center gap-2">
                <span>📜 {activeLoreDialog.title}</span>
              </h3>
              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 text-slate-200 font-serif leading-relaxed text-sm italic">
                "{activeLoreDialog.lore}"
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs font-tech font-bold text-cyan-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Reward Granted: +{activeLoreDialog.rewardEssence} Astral Essence</span>
              </span>
              <button
                onClick={() => setActiveLoreDialog(null)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-rpg font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                RECORD IN CODEX ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CGAxis 3D Asset Browser & World Spawner Modal (Blender Add-on Native Integration) */}
      <CGAxisAssetBrowser
        isOpen={showCGAxisBrowser}
        onClose={() => setShowCGAxisBrowser(false)}
        playerPos={{ x: stats.posX, y: 0, z: stats.posZ }}
        playerYaw={0}
        onSpawnAsset={handleSpawnCGAxisAsset}
        placedObjects={placedCGAxisObjects}
        onRemoveObject={handleRemoveCGAxisObject}
        onClearAllObjects={handleClearAllCGAxisObjects}
        onLoadPresetMap={handleLoadPresetMap}
      />

      {/* Landscape Brushes & Foliage Detail Modal */}
      {showFoliageModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 pointer-events-auto">
          <div className="max-w-xl w-full bg-slate-950 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-emerald-400/30">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-900/60">
              <div className="flex items-center gap-2 text-xs font-rpg font-bold text-emerald-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Landscape Brushes & Foliage System</span>
              </div>
              <button
                onClick={() => setShowFoliageModal(false)}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-mono transition cursor-pointer"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-sans text-slate-300">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/40">
                <h4 className="font-rpg font-bold text-sm text-emerald-300 mb-1 flex items-center gap-1.5">
                  <span>🌿 1. Terrain Texturing & Ground Cover</span>
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Painted 2048x2048 high-resolution procedural landscape canvas with multi-tone emerald, clover, and golden-green grass blade strokes. Open meadows and forest plains are filled with natural ground cover and floral accents so the 1km terrain never appears barren.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h4 className="font-rpg font-bold text-sm text-amber-300 mb-1 flex items-center gap-1.5">
                  <span>⛰️ 2. Cave Entrances & Path Edges</span>
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Softened transitions around the South-West Sunken Rift Cavern (X: -85, Z: 85) archway and mountain foothills. Dirt walking trails leading from the Citadel to the dungeon threshold are bordered by feathered grass brush strokes that blend naturally into rock textures.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <h4 className="font-rpg font-bold text-sm text-cyan-300 mb-1 flex items-center gap-1.5">
                  <span>🌾 3. 3D Instanced Vegetation Clusters</span>
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  2,800 active 3D instanced grass tufts and wild undergrowth clusters sway organically with the wind around tree trunks, rock spires, monoliths, and along the cavern threshold.
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                <span>Asset Pack: Free_Basic_Landscape_Brushes_eee8800c.zip</span>
                <span className="text-emerald-400 font-bold">ACTIVE ✓</span>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-2 border-t border-slate-800">
              <button
                onClick={() => setShowFoliageModal(false)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-rpg font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                RESUME ADVENTURE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Top: 3-Stage Chained Combo Display */}
      {comboStep > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-950/80 border border-cyan-500/40 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg z-30">
          <Swords className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-rpg font-extrabold text-xs text-amber-300">
            COMBO CHAIN: HIT {comboStep} / 3
          </span>
          <span className="text-[10px] font-mono text-slate-400">({comboTimer}s)</span>
        </div>
      )}

      {/* Bottom Dock: Controls, Emotes & Combat Commands */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-col md:flex-row items-end md:items-center justify-between gap-3 pointer-events-none z-10">
        {/* Left: Roaming Titan Sensor & Zone Badge */}
        <div className="bg-slate-950/90 border border-slate-800 backdrop-blur-md px-4 py-2.5 rounded-2xl max-w-sm shadow-xl pointer-events-auto flex items-center gap-3">
          <Shield
            className={`w-5 h-5 ${
              stats.zoneName.includes('Safe-Zone') ? 'text-emerald-400' : 'text-rose-400'
            }`}
          />
          <div>
            <p className="text-xs font-rpg font-bold text-slate-200">{stats.zoneName}</p>
            <p className="text-[10px] font-mono text-amber-400">
              Titan: {stats.bossDistance}m • {stats.bossStatus}
            </p>
          </div>
        </div>

        {/* Center: Emote Wheel Shortcuts */}
        <div className="bg-slate-950/90 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-xl pointer-events-auto">
          <span className="text-[10px] font-tech text-slate-400 uppercase mr-1">Emotes:</span>
          <button
            onClick={() => {
              actionTriggerRef.current.emoteRequested = 'cheer';
              multiplayerSocket.sendEmote('cheer');
            }}
            className="px-2.5 py-1 bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-tech font-bold cursor-pointer"
            title="Cheer [1]"
          >
            [1] Cheer
          </button>
          <button
            onClick={() => {
              actionTriggerRef.current.emoteRequested = 'guard';
              multiplayerSocket.sendEmote('guard');
            }}
            className="px-2.5 py-1 bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-tech font-bold cursor-pointer"
            title="Guard [2]"
          >
            [2] Guard
          </button>
          <button
            onClick={() => {
              actionTriggerRef.current.emoteRequested = 'rest';
              multiplayerSocket.sendEmote('rest');
            }}
            className="px-2.5 py-1 bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/40 text-emerald-300 rounded-lg text-xs font-tech font-bold cursor-pointer"
            title="Rest [3]"
          >
            [3] Rest
          </button>
          <button
            onClick={() => {
              actionTriggerRef.current.emoteRequested = 'shout';
              multiplayerSocket.sendEmote('shout');
            }}
            className="px-2.5 py-1 bg-slate-900 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-500/40 text-amber-300 rounded-lg text-xs font-tech font-bold cursor-pointer"
            title="Battle Cry [4]"
          >
            [4] Shout
          </button>
        </div>

        {/* Free Fire Auto-Sprint Toggle Button */}
        <button
          onClick={() => {
            actionTriggerRef.current.toggleSprintRequested = true;
          }}
          className={`px-3 py-1.5 rounded-xl border backdrop-blur-md flex items-center gap-1.5 text-xs font-rpg font-bold shadow-lg transition cursor-pointer pointer-events-auto ${
            isFreeFireSprint
              ? 'bg-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 shadow-amber-500/30'
              : 'bg-slate-950/90 text-slate-300 border-slate-700 hover:border-amber-400/60'
          }`}
          title="Toggle Free Fire Auto-Sprint"
        >
          <Zap className={`w-3.5 h-3.5 ${isFreeFireSprint ? 'fill-slate-950 text-slate-950 animate-bounce' : 'text-amber-400'}`} />
          <span>{isFreeFireSprint ? 'SPRINT: ON' : 'SPRINT [AUTO]'}</span>
        </button>

        {/* Long-Range Fireball / Celestial Bow Action */}
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            onClick={() => {
              if (rangedAttackType === 'fireball') {
                actionTriggerRef.current.fireballRequested = true;
              } else {
                actionTriggerRef.current.bowAttackRequested = true;
              }
            }}
            disabled={rangedCooldown > 0}
            className={`px-3.5 py-1.5 rounded-xl border backdrop-blur-md flex items-center gap-2 text-xs font-rpg font-bold shadow-lg transition cursor-pointer ${
              rangedAttackType === 'fireball'
                ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white border-orange-400/80 shadow-orange-500/40 hover:scale-105 active:scale-95'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/80 shadow-cyan-500/40 hover:scale-105 active:scale-95'
            } ${rangedCooldown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Cast Long-Range Attack (130m Range) [Key: V]"
          >
            {rangedAttackType === 'fireball' ? (
              <Flame className="w-4 h-4 fill-amber-300 text-amber-200 animate-pulse" />
            ) : (
              <Crosshair className="w-4 h-4 text-cyan-200" />
            )}
            <span>
              {rangedAttackType === 'fireball' ? 'FIREBALL [V]' : 'BOW [V]'}
            </span>
            {rangedCooldown > 0 && (
              <span className="text-[10px] font-mono bg-black/40 px-1 py-0.2 rounded">
                {rangedCooldown.toFixed(1)}s
              </span>
            )}
          </button>

          <button
            onClick={() => {
              actionTriggerRef.current.toggleRangedRequested = true;
            }}
            className="px-2 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 hover:border-amber-400/60 text-slate-300 text-xs font-mono transition cursor-pointer"
            title="Switch Ranged Weapon [Key: X]"
          >
            [X] {rangedAttackType === 'fireball' ? '🏹' : '🔥'}
          </button>
        </div>

        {/* Right: Key Controls Dock */}
        <div className="bg-slate-950/90 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-2xl text-[10px] font-tech text-slate-300 flex items-center gap-2 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-1">
            <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-cyan-300 font-bold">Drag</span>
            <span>View</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-cyan-300 font-bold">WASD</span>
            <span>Move</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-cyan-300 font-bold">V</span>
            <span>Fireball</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-cyan-300 font-bold">E/Q</span>
            <span>Melee</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-cyan-300 font-bold">C</span>
            <span>Roll</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-cyan-300 font-bold">M</span>
            <span>Minimap</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 py-0.2 rounded bg-slate-800 font-mono text-cyan-300 font-bold">U</span>
            <span>Status</span>
          </div>
        </div>
      </div>

      {/* Circular Minimap Radar Overlay */}
      <Minimap
        localPlayer={localMinimapState}
        remoteEntities={minimapEntities}
        mapScale={45}
        minimapSize={140}
      />
    </div>
  );
};

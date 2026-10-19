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
import { extendedCharacterRoster, CharacterRosterItem, characterRoster } from '../data/characters';
import { DungeonSynthWidget } from './DungeonSynthWidget';

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
  fireProjectile(origin: THREE.Vector3, targetDirection: THREE.Vector3, speed = 45, isPiercing = false, projectileType = 'starlight_arrow') {
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
      maxDistance: isPiercing ? 55 : 40,
      isPiercing: isPiercing,
      hitEntities: new Set(),
      projectileType,
    });
  }

  // Update projectiles each frame (~60 FPS game loop)
  update(
    delta: number,
    monsterColliders: { id: string; name: string; position: THREE.Vector3; takeDamage: (amt: number) => void }[]
  ) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const step = proj.velocity.clone().multiplyScalar(delta);
      proj.mesh.position.add(step);
      proj.distanceTraveled += step.length();

      // Check collision against monsters in open world
      for (const monster of monsterColliders) {
        if (!proj.hitEntities.has(monster.id) && proj.mesh.position.distanceTo(monster.position) < 2.5) {
          monster.takeDamage(proj.isPiercing ? 360 : 135);
          proj.hitEntities.add(monster.id);

          if (!proj.isPiercing) {
            this.scene.remove(proj.mesh);
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }

      // Remove projectile if max range exceeded
      if (proj.distanceTraveled >= proj.maxDistance) {
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
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

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
    // 3. EXPANDED PROCEDURAL 1KM TERRAIN & SANCTUARY ENVIRONMENT
    // ============================================================================
    // 1. Massive 1000x1000 terrain plane with vibrant fantasy cel-shaded green
    const terrainSize = 1000;
    const groundGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 64, 64);
    groundGeo.rotateX(-Math.PI / 2); // Make it horizontal

    const groundMat = new THREE.MeshToonMaterial({
      color: 0x065f46, // Rich forest green
      gradientMap: rampTexture,
      wireframe: false,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Inner Sanctuary Stone Courtyard (Cel-Shaded Toon Ramp)
    const courtyardGeo = new THREE.CylinderGeometry(24, 26, 0.4, 32);
    const courtyardMat = new THREE.MeshToonMaterial({
      color: 0x334155,
      gradientMap: rampTexture,
    });
    const courtyard = new THREE.Mesh(courtyardGeo, courtyardMat);
    courtyard.position.y = 0.2;
    courtyard.receiveShadow = true;
    scene.add(courtyard);

    // Arcane Aegis Dome (Semi-transparent glowing hemisphere with wireframe)
    const domeGeo = new THREE.SphereGeometry(32, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      wireframe: true,
    });
    const aegisDome = new THREE.Mesh(domeGeo, domeMat);
    aegisDome.position.y = 0;
    scene.add(aegisDome);

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

    // Surrounding Ancient Monoliths / Runic Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.8, 1.2, 7, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.7,
      metalness: 0.3,
    });
    const runeGlowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const radius = 26;
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;

      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 3.5, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);

      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), runeGlowMat);
      crystal.position.set(px, 8, pz);
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
    function generateEnvironmentBiomes(targetScene: THREE.Scene, count = 180) {
      const treeGeometry = new THREE.ConeGeometry(2.5, 7, 6);
      const treeMaterial = new THREE.MeshToonMaterial({ color: 0x10b981, gradientMap: rampTexture });
      const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 2.5, 6);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2d1d, roughness: 0.9 });

      const rockGeo = new THREE.DodecahedronGeometry(2.2);
      const rockMat = new THREE.MeshToonMaterial({ color: 0x475569, gradientMap: rampTexture });

      const crystalGeo = new THREE.OctahedronGeometry(1.6);
      const crystalMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

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
    }

    generateEnvironmentBiomes(scene);

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
    // 3.6 ROAMING OPEN-WORLD MONSTERS (Patrol, Aggro, Attack, Stagger State Machine)
    // ============================================================================
    const monsters: MonsterEntity[] = [];

    const monsterConfigs = [
      { id: 'shadow_stalker_1', name: 'Void Shadow Stalker', level: 28, hp: 2200, color: 0x4c0519, x: 36, z: 18, role: 'Wild Predator • Abyss Swarm' },
      { id: 'golem_scout_1', name: 'Ironpeak Golem Scout', level: 32, hp: 3000, color: 0x78350f, x: -38, z: -25, role: 'Dwarven Caldera Construct' },
      { id: 'bloodfang_beast_1', name: 'Bloodfang Abyss Beast', level: 30, hp: 2600, color: 0x3f3f46, x: 22, z: -40, role: 'Badlands Carnivore' },
    ];

    monsterConfigs.forEach((cfg) => {
      const mGroup = new THREE.Group();
      mGroup.name = cfg.id;

      // Stylized Cel-shaded Monster Body
      const mBodyGeo = new THREE.DodecahedronGeometry(1.6);
      const mBodyMat = new THREE.MeshToonMaterial({
        color: cfg.color,
        gradientMap: rampTexture,
      });
      const mBody = new THREE.Mesh(mBodyGeo, mBodyMat);
      mBody.castShadow = true;
      mGroup.add(mBody);

      // Glowing Hostile Eyes
      const eyeGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.6, 0.4, 1.3);
      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.6, 0.4, 1.3);
      mGroup.add(leftEye);
      mGroup.add(rightEye);

      // Horns / Spikes
      const spikeGeo = new THREE.ConeGeometry(0.3, 1.2, 5);
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8 });
      const s1 = new THREE.Mesh(spikeGeo, spikeMat);
      s1.position.set(-1.0, 1.2, 0);
      s1.rotation.z = Math.PI / 4;
      const s2 = new THREE.Mesh(spikeGeo, spikeMat);
      s2.position.set(1.0, 1.2, 0);
      s2.rotation.z = -Math.PI / 4;
      mGroup.add(s1);
      mGroup.add(s2);

      // Contact shadow
      const mShadow = new THREE.Mesh(
        new THREE.CircleGeometry(1.2, 12),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
      );
      mShadow.rotation.x = -Math.PI / 2;
      mShadow.position.y = -1.2;
      mGroup.add(mShadow);

      mGroup.position.set(cfg.x, 1.4, cfg.z);
      scene.add(mGroup);

      monsters.push({
        id: cfg.id,
        name: cfg.name,
        level: cfg.level,
        group: mGroup,
        bodyMesh: mBody,
        homePos: new THREE.Vector3(cfg.x, 1.4, cfg.z),
        targetPos: new THREE.Vector3(cfg.x, 1.4, cfg.z),
        state: 'patrol',
        currentHp: cfg.hp,
        maxHp: cfg.hp,
        patrolTimer: 2 + Math.random() * 3,
        attackCooldown: 0,
        staggerTimer: 0,
        respawnTimer: 0,
        aggroRange: 15.0, // 15m detection range
        attackRange: 2.5, // 2.5m melee range
        moveSpeed: 4.8,
        role: cfg.role,
      });
    });

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
      monsters.forEach((m) => {
        if (m.state !== 'dead') {
          const dist = playerGroup.position.distanceTo(m.group.position);
          if (dist <= radius) {
            m.currentHp -= dmg;
            m.state = 'stagger';
            m.staggerTimer = 0.35;
            (m.bodyMesh.material as THREE.MeshToonMaterial).color.setHex(0xf43f5e);
            triggerFloatingText(`${m.name.slice(0, 10)} -${dmg}`, dmg > 400 ? 'crit' : 'damage');

            if (m.currentHp <= 0) {
              m.state = 'dead';
              m.group.visible = false;
              m.respawnTimer = 14;
              sound.playVictory();
              setGoldEarned((g) => g + 120);
              triggerFloatingText(`DEFEATED ${m.name}! +120 GOLD`, 'loot');

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
    // 4. HUMAN-LIKE PROCEDURAL LOCAL HERO CHARACTER (Cel-Shaded PBR)
    // ============================================================================
    const playerGroup = new THREE.Group();
    const isJinwooActive = selectedArchetype.id === 'sung_jinwoo';

    // Torso / Plate Armor (MeshToonMaterial with rampTexture)
    const bodyGeo = new THREE.CapsuleGeometry(0.65, 1.1, 8, 16);
    const armorMat = new THREE.MeshToonMaterial({
      color: selectedArchetype.celShadeColor || (isJinwooActive ? 0x1e293b : 0x10b981),
      gradientMap: rampTexture,
    });
    const playerBody = new THREE.Mesh(bodyGeo, armorMat);
    playerBody.position.y = 1.2;
    playerBody.castShadow = true;
    playerGroup.add(playerBody);

    // Helmet & Visor (Electric Blue for Jinwoo, Dark Obsidian)
    const helmGeo = new THREE.SphereGeometry(0.55, 12, 12);
    const helm = new THREE.Mesh(
      helmGeo,
      new THREE.MeshStandardMaterial({ color: isJinwooActive ? 0x0f172a : 0x0f172a, metalness: 0.9 })
    );
    helm.position.set(0, 1.85, 0);
    playerGroup.add(helm);

    const visorGeo = new THREE.BoxGeometry(0.58, 0.22, 0.4);
    const visorMat = new THREE.MeshBasicMaterial({ color: isJinwooActive ? 0x38bdf8 : 0x38bdf8 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.85, 0.35);
    playerGroup.add(visor);

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
    playerGroup.add(leftPauldron);
    playerGroup.add(rightPauldron);

    // Flowing Cape (Shadow Monarch Cloak for Jinwoo)
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
    playerGroup.add(capeGroup);

    // Weapon Rig: Dual Kasaka's Venom Fang Daggers for Sung Jinwoo, or Greatsword
    const swordGroup = new THREE.Group();

    const bladeMat = new THREE.MeshStandardMaterial(
      isJinwooActive
        ? {
            color: 0x0f172a,
            emissive: 0x38bdf8,
            emissiveIntensity: 0.9,
            metalness: 0.95,
            roughness: 0.1,
          }
        : {
            color: 0xe0f2fe,
            emissive: 0x0284c7,
            emissiveIntensity: 0.7,
            metalness: 0.95,
            roughness: 0.1,
          }
    );

    if (isJinwooActive) {
      // Kasaka's Venom Fang - Dual Daggers with toxic cyan & void purple glow
      // Right Hand Kasaka Dagger
      const rDagger = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.03), bladeMat);
      rDagger.position.set(0.65, 0.9, 0.35);
      rDagger.rotation.x = Math.PI / 4;
      rDagger.rotation.z = -Math.PI / 8;
      rDagger.castShadow = true;
      swordGroup.add(rDagger);

      // Left Hand Kasaka Dagger
      const lDagger = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.03), bladeMat);
      lDagger.position.set(-0.65, 0.9, 0.35);
      lDagger.rotation.x = Math.PI / 4;
      lDagger.rotation.z = Math.PI / 8;
      lDagger.castShadow = true;
      swordGroup.add(lDagger);
    } else {
      const bladeGeo = new THREE.BoxGeometry(0.12, 1.8, 0.04);
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.9;
      blade.castShadow = true;
      swordGroup.add(blade);

      const hilt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 })
      );
      hilt.position.y = -0.15;
      swordGroup.add(hilt);

      const crossguard = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.08, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85 })
      );
      crossguard.position.y = 0.05;
      swordGroup.add(crossguard);

      swordGroup.position.set(0.75, 1.1, 0.35);
      swordGroup.rotation.x = Math.PI / 6;
      swordGroup.rotation.z = -Math.PI / 12;
    }
    playerGroup.add(swordGroup);

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
      if (e.key in keys) {
        keys[e.key as keyof typeof keys] = true;
      }

      const k = e.key.toLowerCase();
      if (k === 'e' || e.code === 'KeyE') {
        actionTriggerRef.current.attackRequested = true;
      } else if (k === 'q' || e.code === 'KeyQ') {
        actionTriggerRef.current.heavyAttackRequested = true;
      } else if (k === 'r' || e.code === 'KeyR') {
        actionTriggerRef.current.runicFinisherRequested = true;
      } else if (k === 'c' || (e.key === ' ' && keys.Shift)) {
        actionTriggerRef.current.dodgeRequested = true;
      } else if (k === 'b' || (k === 'f' && isNearOre)) {
        if (isNearOre) actionTriggerRef.current.gatherRequested = true;
        else actionTriggerRef.current.blockRequested = true;
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
      if (e.key in keys) {
        keys[e.key as keyof typeof keys] = false;
      }
    };

    const handleCanvasMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        actionTriggerRef.current.attackRequested = true;
      } else if (e.button === 2) {
        e.preventDefault();
        actionTriggerRef.current.blockRequested = true;
      }
    };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    container.addEventListener('mousedown', handleCanvasMouseDown);
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
        } else {
          isAttacking = false;
          swordGroup.rotation.x = Math.PI / 6;
          swordGroup.rotation.z = -Math.PI / 12;
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
        } else {
          isDodging = false;
          playerBody.rotation.x = 0;
          playerBody.position.y = 1.2;
        }
      }

      // Combo expiration check
      if (localCombo > 0 && elapsed > comboResetDeadline) {
        localCombo = 0;
      }

      // Locomotion & Movement Calculation
      _moveDir.set(0, 0, 0);
      const forward = keys.w || keys.ArrowUp;
      const backward = keys.s || keys.ArrowDown;
      const left = keys.a || keys.ArrowLeft;
      const right = keys.d || keys.ArrowRight;
      const wantsSprint = keys.Shift && curStamina > 5;

      if (forward) _moveDir.z -= 1;
      if (backward) _moveDir.z += 1;
      if (left) _moveDir.x -= 1;
      if (right) _moveDir.x += 1;

      const isMoving = _moveDir.lengthSq() > 0 && !isDodging;
      const isExhausted = curStamina <= 10;
      const baseSpeed = wantsSprint ? (isExhausted ? 8 : 15) : isExhausted ? 5 : 8.5;

      if (isMoving && wantsSprint && !isExhausted) {
        curStamina = Math.max(0, curStamina - 22 * delta);
      } else {
        curStamina = Math.min(100, curStamina + 18 * delta);
      }

      if (isMoving) {
        _moveDir.normalize();
        playerGroup.position.x += _moveDir.x * baseSpeed * delta;
        playerGroup.position.z += _moveDir.z * baseSpeed * delta;

        // Dynamic banking & lean into turn
        const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
        playerGroup.rotation.y = THREE.MathUtils.damp(playerGroup.rotation.y, targetAngle, 14, delta);

        const turnDelta = playerGroup.rotation.y - targetAngle;
        playerBody.rotation.z = THREE.MathUtils.damp(playerBody.rotation.z, turnDelta * 0.4, 8, delta);

        const strideSpeed = wantsSprint ? 18 : 12;
        playerBody.position.y = 1.2 + Math.sin(elapsed * strideSpeed) * (wantsSprint ? 0.12 : 0.07);
        cape.rotation.x = THREE.MathUtils.damp(cape.rotation.x, Math.PI / 4 + Math.sin(elapsed * 16) * 0.15, 10, delta);

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

      // Camera Smooth Follow
      const camOffset = new THREE.Vector3(0, 8.2, 11.5);
      const targetCamPos = playerGroup.position.clone().add(camOffset);
      camera.position.lerp(targetCamPos, 0.14);
      _camTarget.copy(playerGroup.position).add(new THREE.Vector3(0, 1.4, 0));
      camera.lookAt(_camTarget);

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

      // Roaming Abyss Void Titan Patrol
      bossAngle += delta * 0.22;
      const bossRadius = 45;
      bossGroup.position.x = Math.cos(bossAngle) * bossRadius;
      bossGroup.position.z = Math.sin(bossAngle) * bossRadius;
      bossGroup.position.y = 3.5 + Math.sin(elapsed * 1.8) * 0.6;
      bossGroup.rotation.y = bossAngle + Math.PI / 2;

      const bossDist = Math.round(playerGroup.position.distanceTo(bossGroup.position));

      // Safe-Zone Boundary Check
      const distCenter = Math.hypot(playerGroup.position.x, playerGroup.position.z);
      const inAegis = distCenter <= 30;

      // Update active minions & Arcane Ranger projectiles
      activeMinions.forEach((minion) => {
        minion.update(delta, playerGroup.position);
      });
      rangerSystem.update(delta, monsterColliders);

      // Update Roaming Open-World Monsters State Machine
      monsters.forEach((m) => {
        if (m.state === 'dead') {
          m.respawnTimer -= delta;
          if (m.respawnTimer <= 0) {
            m.state = 'patrol';
            m.currentHp = m.maxHp;
            m.group.visible = true;
            m.group.position.copy(m.homePos);
          }
          return;
        }

        if (m.state === 'stagger') {
          m.staggerTimer -= delta;
          if (m.staggerTimer <= 0) {
            m.state = 'aggro';
            (m.bodyMesh.material as THREE.MeshToonMaterial).color.setHex(0x4c0519);
          }
          return;
        }

        const distToPlayer = playerGroup.position.distanceTo(m.group.position);
        if (distToPlayer <= m.aggroRange) {
          m.state = 'aggro';
          const dir = playerGroup.position.clone().sub(m.group.position);
          dir.y = 0;
          if (distToPlayer > m.attackRange) {
            dir.normalize();
            m.group.position.add(dir.multiplyScalar(m.moveSpeed * delta));
            m.group.rotation.y = Math.atan2(dir.x, dir.z);
          } else {
            // Melee attack against local player
            m.attackCooldown -= delta;
            if (m.attackCooldown <= 0) {
              m.attackCooldown = 1.6;
              if (!isBlocking && !isDodging) {
                curHp = Math.max(0, curHp - 12);
                sound.playHit(false);
                triggerFloatingText('-12 HIT', 'damage');
              } else if (isBlocking) {
                sound.playTrapTrigger();
                triggerFloatingText('PARRIED!', 'parry');
              }
            }
          }
        } else {
          // Patrol wander
          m.patrolTimer -= delta;
          if (m.patrolTimer <= 0) {
            m.patrolTimer = 3 + Math.random() * 4;
            m.targetPos.set(
              m.homePos.x + (Math.random() - 0.5) * 16,
              m.homePos.y,
              m.homePos.z + (Math.random() - 0.5) * 16
            );
          }
          const pDir = m.targetPos.clone().sub(m.group.position);
          pDir.y = 0;
          if (pDir.lengthSq() > 0.5) {
            pDir.normalize();
            m.group.position.add(pDir.multiplyScalar(m.moveSpeed * 0.5 * delta));
            m.group.rotation.y = Math.atan2(pDir.x, pDir.z);
          }
        }
      });

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
          zoneName: inAegis
            ? 'Citadel of Oakhaven (Safe-Zone)'
            : 'Shattered Badlands (Wilderness PvP Active)',
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

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('mousedown', handleCanvasMouseDown);
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
      groundGeo.dispose();
      groundMat.dispose();
      domeGeo.dispose();
      domeMat.dispose();
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

      {/* Top Left: Character Identity, HP & Human Fatigue/Stamina Bar */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
        <div className="bg-slate-950/90 border border-slate-800 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl w-64 pointer-events-auto">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="font-rpg font-bold text-xs text-white uppercase">{characterName}</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300">
              [X: {stats.posX}, Z: {stats.posZ}]
            </span>
          </div>

          {/* Health Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-[10px] font-tech text-rose-300 mb-0.5">
              <span>HP</span>
              <span>{hp} / 100</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-rose-950">
              <div
                className="h-full bg-gradient-to-r from-rose-600 to-red-500 transition-all duration-300"
                style={{ width: `${hp}%` }}
              />
            </div>
          </div>

          {/* Stamina & Breathing Fatigue Bar */}
          <div>
            <div className="flex justify-between text-[10px] font-tech text-amber-300 mb-0.5">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>STAMINA {stats.isExhausted && '(EXHAUSTED)'}</span>
              </span>
              <span>{stamina}%</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-amber-950">
              <div
                className={`h-full transition-all duration-200 ${
                  stats.isExhausted ? 'bg-amber-600' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                }`}
                style={{ width: `${stamina}%` }}
              />
            </div>
          </div>
        </div>

        {/* Human-Like Floating Thought Bubble */}
        <div className="bg-slate-950/85 border border-cyan-500/30 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-mono text-cyan-200 flex items-center gap-2 max-w-sm shadow-lg">
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="italic">"{characterThought}"</span>
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

        {/* Right: Key Controls Dock */}
        <div className="bg-slate-950/90 border border-slate-800 backdrop-blur-md px-4 py-2 rounded-2xl text-[11px] font-tech text-slate-300 flex items-center gap-2.5 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 font-bold">WASD</span>
            <span>Move</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 font-bold">TAB</span>
            <span>Target</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 font-bold">E / Q</span>
            <span>Slash</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 font-bold">C</span>
            <span>Roll</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300 font-bold">B</span>
            <span>Parry</span>
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

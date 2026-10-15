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

  // Action Trigger References for Animation Loop
  const actionTriggerRef = useRef<{
    attackRequested: boolean;
    heavyAttackRequested: boolean;
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

    const skyColors = {
      day: 0x090d16,
      twilight: 0x1c1017,
      night: 0x030712,
    };
    scene.background = new THREE.Color(skyColors.day);
    scene.fog = new THREE.FogExp2(skyColors.day, 0.016);

    const camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

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
    // 2. ENVIRONMENT LIGHTING RIG
    // ============================================================================
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.65);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfef08a, 1.4);
    sunLight.position.set(35, 60, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 180;
    const d = 50;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.45);
    scene.add(ambientLight);

    // ============================================================================
    // 3. PROCEDURAL TERRAIN & SANCTUARY ENVIRONMENT
    // ============================================================================
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 512, 512);

    // Arcane Leyline hex pattern
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 2;
    const hexSize = 64;
    for (let x = 0; x < 512 + hexSize; x += hexSize * 1.5) {
      for (let y = 0; y < 512 + hexSize; y += hexSize * Math.sqrt(3)) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const px = x + hexSize * 0.5 * Math.cos(angle);
          const py = y + hexSize * 0.5 * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    const groundTexture = new THREE.CanvasTexture(canvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(16, 16);
    groundTexture.colorSpace = THREE.SRGBColorSpace;

    const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.85,
      metalness: 0.15,
      color: 0x1e293b,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Inner Sanctuary Stone Courtyard
    const courtyardGeo = new THREE.CylinderGeometry(20, 22, 0.4, 32);
    const courtyardMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.25,
    });
    const courtyard = new THREE.Mesh(courtyardGeo, courtyardMat);
    courtyard.position.y = 0.2;
    courtyard.receiveShadow = true;
    scene.add(courtyard);

    // Arcane Aegis Dome (Translucent glowing shield dome)
    const domeGeo = new THREE.SphereGeometry(32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      roughness: 0.1,
      metalness: 0.9,
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
    // 4. HUMAN-LIKE PROCEDURAL LOCAL HERO CHARACTER
    // ============================================================================
    const playerGroup = new THREE.Group();

    // Torso / Plate Armor
    const bodyGeo = new THREE.CapsuleGeometry(0.65, 1.1, 8, 16);
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vanguard Cobalt
      roughness: 0.35,
      metalness: 0.85,
    });
    const playerBody = new THREE.Mesh(bodyGeo, armorMat);
    playerBody.position.y = 1.2;
    playerBody.castShadow = true;
    playerGroup.add(playerBody);

    // Helmet & Visor
    const helmGeo = new THREE.SphereGeometry(0.55, 12, 12);
    const helm = new THREE.Mesh(helmGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 }));
    helm.position.set(0, 1.85, 0);
    playerGroup.add(helm);

    const visorGeo = new THREE.BoxGeometry(0.58, 0.22, 0.4);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.85, 0.35);
    playerGroup.add(visor);

    // Pauldrons (Shoulder Armor)
    const pauldronGeo = new THREE.SphereGeometry(0.35, 8, 8);
    const pauldronMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    const leftPauldron = new THREE.Mesh(pauldronGeo, pauldronMat);
    leftPauldron.position.set(-0.75, 1.6, 0);
    const rightPauldron = new THREE.Mesh(pauldronGeo, pauldronMat);
    rightPauldron.position.set(0.75, 1.6, 0);
    playerGroup.add(leftPauldron);
    playerGroup.add(rightPauldron);

    // Flowing Cape
    const capeGroup = new THREE.Group();
    const capeGeo = new THREE.PlaneGeometry(0.9, 1.6, 4, 6);
    const capeMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(0, -0.7, -0.35);
    cape.castShadow = true;
    capeGroup.position.set(0, 1.6, 0);
    capeGroup.add(cape);
    playerGroup.add(capeGroup);

    // Greatsword Rig
    const swordGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(0.12, 1.8, 0.04);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      metalness: 0.95,
      roughness: 0.1,
    });
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
      const rArmorMat = new THREE.MeshStandardMaterial({
        color: 0x059669, // Emerald Knight
        roughness: 0.35,
        metalness: 0.8,
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

        // 3. Melee hit detection against remote players and world boss
        const strikeRange = localCombo === 3 ? 5.0 : 3.5;
        remotePlayersRef.current.forEach((remote, id) => {
          const dist = playerGroup.position.distanceTo(remote.group.position);
          if (dist <= strikeRange) {
            multiplayerSocket.dealDamage(id, dmgVal);
          }
        });

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
      setIsNearOre(distToOre < 3.2);

      // Hearth Lantern Proximity check
      const distToLantern = playerGroup.position.distanceTo(lanternGroup.position);
      setIsNearLantern(distToLantern < 4.5);

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
  }, [triggerFloatingText, isNearOre]);

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

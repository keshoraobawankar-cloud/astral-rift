import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  Layers,
  Box,
  TreePine,
  Building2,
  Package,
  Skull,
  Palette,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  Sparkles,
  Sliders,
  Eye,
  Check,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import proceduralMapData from '../data/proceduralTerrainMap.json';
import labyrinthData from '../data/demonKingLabyrinth.json';
import startingTownData from '../data/startingTownLayout.json';

export type CGAxisCategory = 'nature' | 'architecture' | 'props' | 'creatures' | 'pbr_materials';

export interface CGAxisAsset {
  id: string;
  name: string;
  category: CGAxisCategory;
  polyCount: number;
  dimensions: string;
  tags: string[];
  description: string;
  color: string;
  defaultRoughness: number;
  defaultMetalness: number;
  defaultEmissive?: string;
  defaultEmissiveIntensity?: number;
}

export interface PlacedSceneObject {
  id: string;
  assetId: string;
  name: string;
  category: CGAxisCategory;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  scale: number;
  meshRef?: THREE.Object3D;
  materialProps?: {
    color: string;
    roughness: number;
    metalness: number;
    emissive?: string;
    emissiveIntensity?: number;
  };
}

export const CGAXIS_CATALOG: CGAxisAsset[] = [
  // 1. Nature & Foliage
  {
    id: 'cgaxis_oak_tree',
    name: 'Ancient Elven Oak Tree',
    category: 'nature',
    polyCount: 1420,
    dimensions: '4.5m x 4.5m x 7.2m',
    tags: ['tree', 'wood', 'foliage', 'forest'],
    description: 'Ancient deciduous oak with dense stylized foliage canopy and detailed root flare.',
    color: '#22c55e',
    defaultRoughness: 0.85,
    defaultMetalness: 0.05,
  },
  {
    id: 'cgaxis_sakura_tree',
    name: 'Cherry Blossom Sakura',
    category: 'nature',
    polyCount: 1840,
    dimensions: '4.2m x 4.2m x 6.8m',
    tags: ['sakura', 'cherry', 'pink', 'tree', 'botanical'],
    description: 'Japanese-style blooming blossom tree with radiant pastel petals and dark wood trunk.',
    color: '#f472b6',
    defaultRoughness: 0.75,
    defaultMetalness: 0.0,
  },
  {
    id: 'cgaxis_crystal_shrub',
    name: 'Arcane Crystal Shrub',
    category: 'nature',
    polyCount: 880,
    dimensions: '1.8m x 1.8m x 2.1m',
    tags: ['crystal', 'mineral', 'arcane', 'glow'],
    description: 'Resonant quartz crystal spire formation emitting concentrated subterranean leyline mana.',
    color: '#38bdf8',
    defaultRoughness: 0.12,
    defaultMetalness: 0.65,
    defaultEmissive: '#0284c7',
    defaultEmissiveIntensity: 0.8,
  },
  {
    id: 'cgaxis_mossy_boulder',
    name: 'Weathered Moss Boulder',
    category: 'nature',
    polyCount: 620,
    dimensions: '2.4m x 2.0m x 1.6m',
    tags: ['rock', 'stone', 'boulder', 'terrain'],
    description: 'Heavy granite field stone coated in velvet forest moss and weathered micro-fractures.',
    color: '#64748b',
    defaultRoughness: 0.9,
    defaultMetalness: 0.02,
  },
  {
    id: 'cgaxis_runic_mushroom',
    name: 'Bioluminescent Spore Shroom',
    category: 'nature',
    polyCount: 540,
    dimensions: '1.2m x 1.2m x 1.8m',
    tags: ['mushroom', 'fungus', 'glow', 'cave'],
    description: 'Abyssal cave mushroom with glowing purple spore gills and iridescent membrane.',
    color: '#c084fc',
    defaultRoughness: 0.35,
    defaultMetalness: 0.1,
    defaultEmissive: '#9333ea',
    defaultEmissiveIntensity: 1.2,
  },

  // 2. Architecture & Ruins
  {
    id: 'cgaxis_citadel_tower',
    name: 'Citadel Spire Guard Tower',
    category: 'architecture',
    polyCount: 4800,
    dimensions: '6.0m x 6.0m x 16.5m',
    tags: ['building', 'tower', 'citadel', 'castle', 'spire'],
    description: 'Multi-level cylindrical stone fortress spire with crenelated battlements, conical slate roof, and glowing arcane apex crystal.',
    color: '#64748b',
    defaultRoughness: 0.72,
    defaultMetalness: 0.1,
    defaultEmissive: '#38bdf8',
    defaultEmissiveIntensity: 0.5,
  },
  {
    id: 'cgaxis_medieval_tavern',
    name: 'Timber Medieval Tavern House',
    category: 'architecture',
    polyCount: 5200,
    dimensions: '8.5m x 6.5m x 7.8m',
    tags: ['building', 'tavern', 'house', 'medieval', 'village'],
    description: 'Two-story timber-framed inn with stone foundation, steep A-frame slate roof, brick chimney, and amber-lit leaded windows.',
    color: '#78350f',
    defaultRoughness: 0.8,
    defaultMetalness: 0.05,
    defaultEmissive: '#f59e0b',
    defaultEmissiveIntensity: 0.4,
  },
  {
    id: 'cgaxis_blacksmith_forge',
    name: 'Dwarven Caldera Blacksmith Forge',
    category: 'architecture',
    polyCount: 4600,
    dimensions: '7.5m x 5.5m x 6.2m',
    tags: ['building', 'blacksmith', 'forge', 'dwarf', 'workshop'],
    description: 'Heavy stonework smithy with arched magma hearth, heavy industrial stone chimney, timber rafter shelter, and anvil block.',
    color: '#334155',
    defaultRoughness: 0.65,
    defaultMetalness: 0.35,
    defaultEmissive: '#ea580c',
    defaultEmissiveIntensity: 1.2,
  },
  {
    id: 'cgaxis_guild_manor',
    name: 'Grand Guild Estate Manor',
    category: 'architecture',
    polyCount: 6800,
    dimensions: '12.0m x 9.0m x 10.5m',
    tags: ['building', 'estate', 'manor', 'guild', 'castle'],
    description: 'Prestigious two-story guild residence featuring columned stone portico, dormered double-hip roof, and guild heraldry standards.',
    color: '#475569',
    defaultRoughness: 0.68,
    defaultMetalness: 0.15,
  },
  {
    id: 'cgaxis_stone_watchtower',
    name: 'Rampart Stone Watchtower',
    category: 'architecture',
    polyCount: 3800,
    dimensions: '4.8m x 4.8m x 14.0m',
    tags: ['building', 'watchtower', 'bastion', 'military', 'rampart'],
    description: 'Stepped square stone defense outpost with cantilevered timber observation deck, iron brazier, and fortified arrow loops.',
    color: '#64748b',
    defaultRoughness: 0.82,
    defaultMetalness: 0.08,
  },
  {
    id: 'cgaxis_city_wall_gate',
    name: 'Bastion Gatehouse & Portcullis',
    category: 'architecture',
    polyCount: 6100,
    dimensions: '14.0m x 4.0m x 9.5m',
    tags: ['building', 'gate', 'wall', 'portcullis', 'fortification'],
    description: 'Twin fortified stone bastions flanking a vaulted archway gate fitted with a heavy wrought iron portcullis grating.',
    color: '#475569',
    defaultRoughness: 0.75,
    defaultMetalness: 0.2,
  },
  {
    id: 'cgaxis_crypt_entrance',
    name: 'Abyssal Crypt Portal Portal',
    category: 'architecture',
    polyCount: 4100,
    dimensions: '5.5m x 4.5m x 5.0m',
    tags: ['building', 'dungeon', 'crypt', 'ruins', 'portal'],
    description: 'Subterranean hillside tomb threshold with carved demon spires, iron-banded double portal doors, and stepped rune plinth.',
    color: '#1e293b',
    defaultRoughness: 0.55,
    defaultMetalness: 0.45,
    defaultEmissive: '#7c3aed',
    defaultEmissiveIntensity: 0.9,
  },
  {
    id: 'cgaxis_gothic_arch',
    name: 'Sunken Citadel Gothic Arch',
    category: 'architecture',
    polyCount: 3200,
    dimensions: '5.0m x 2.0m x 7.5m',
    tags: ['arch', 'ruins', 'cathedral', 'stone'],
    description: 'High-pointed gothic archway adorned with eroded elven reliefs and carved keystone.',
    color: '#94a3b8',
    defaultRoughness: 0.78,
    defaultMetalness: 0.15,
  },
  {
    id: 'cgaxis_runic_obelisk',
    name: 'Abyss Leyline Monolith',
    category: 'architecture',
    polyCount: 1680,
    dimensions: '1.8m x 1.8m x 9.0m',
    tags: ['obelisk', 'monolith', 'pillar', 'rune'],
    description: 'Towering tetrahedral monolith inscribed with pulsing draconic power glyphs.',
    color: '#0f172a',
    defaultRoughness: 0.25,
    defaultMetalness: 0.8,
    defaultEmissive: '#06b6d4',
    defaultEmissiveIntensity: 1.5,
  },
  {
    id: 'cgaxis_mana_brazier',
    name: 'Glowing Mana Flame Brazier',
    category: 'architecture',
    polyCount: 940,
    dimensions: '1.4m x 1.4m x 2.2m',
    tags: ['brazier', 'fire', 'torch', 'light'],
    description: 'Forged iron ritual brazier holding perpetual blue aether fire above a tripod stand.',
    color: '#334155',
    defaultRoughness: 0.5,
    defaultMetalness: 0.75,
    defaultEmissive: '#38bdf8',
    defaultEmissiveIntensity: 2.0,
  },
  {
    id: 'cgaxis_stone_shrine',
    name: 'Wayfarer Celestial Shrine',
    category: 'architecture',
    polyCount: 2100,
    dimensions: '3.0m x 3.0m x 3.8m',
    tags: ['shrine', 'altar', 'temple', 'sanctuary'],
    description: 'Carved white marble sanctuary altar with stepped plinth and celestial emblem.',
    color: '#e2e8f0',
    defaultRoughness: 0.3,
    defaultMetalness: 0.2,
  },

  // 3. Props & Furniture
  {
    id: 'cgaxis_treasure_chest',
    name: 'Mythic Gilded Vault Chest',
    category: 'props',
    polyCount: 1540,
    dimensions: '1.4m x 0.9m x 1.1m',
    tags: ['chest', 'loot', 'gold', 'box'],
    description: 'Reinforced dark ironwood container secured with dwarven brass bands and dragon lock.',
    color: '#d97706',
    defaultRoughness: 0.28,
    defaultMetalness: 0.85,
    defaultEmissive: '#f59e0b',
    defaultEmissiveIntensity: 0.4,
  },
  {
    id: 'cgaxis_alchemical_station',
    name: 'Grand Artificer Alchemical Stand',
    category: 'props',
    polyCount: 2450,
    dimensions: '2.2m x 1.2m x 1.8m',
    tags: ['alchemy', 'workshop', 'potion', 'crafting'],
    description: 'Timber workbench equipped with boiling alembics, glass retorts, and reagent jars.',
    color: '#78350f',
    defaultRoughness: 0.65,
    defaultMetalness: 0.3,
  },
  {
    id: 'cgaxis_forging_anvil',
    name: 'Dwarven Volcanic Anvil',
    category: 'props',
    polyCount: 1100,
    dimensions: '1.2m x 0.7m x 1.0m',
    tags: ['anvil', 'forge', 'blacksmith', 'metal'],
    description: 'Massive single-piece cast steel anvil with runic horn and heavy oak log base.',
    color: '#1e293b',
    defaultRoughness: 0.35,
    defaultMetalness: 0.95,
  },
  {
    id: 'cgaxis_wooden_barrel',
    name: 'Aethelgard Oak Ale Barrel',
    category: 'props',
    polyCount: 420,
    dimensions: '0.9m x 0.9m x 1.2m',
    tags: ['barrel', 'storage', 'cask', 'wood'],
    description: 'Cured oak staves bounded with hand-forged black iron hoops and wax seal.',
    color: '#92400e',
    defaultRoughness: 0.7,
    defaultMetalness: 0.1,
  },

  // 4. Creatures & Entities
  {
    id: 'cgaxis_goblin_scout',
    name: 'F-Rank Goblin Raider',
    category: 'creatures',
    polyCount: 1650,
    dimensions: '0.8m x 0.6m x 1.2m',
    tags: ['goblin', 'monster', 'enemy', 'creature'],
    description: 'Agile wilderness scout brandishing notched bone daggers and hardened leather cuirass.',
    color: '#15803d',
    defaultRoughness: 0.6,
    defaultMetalness: 0.05,
  },
  {
    id: 'cgaxis_slime_mutant',
    name: 'D-Rank Cavern Acid Slime',
    category: 'creatures',
    polyCount: 890,
    dimensions: '1.4m x 1.4m x 1.1m',
    tags: ['slime', 'acid', 'ooze', 'monster'],
    description: 'Translucent caustic blob containing a glowing crystallized core that dissolves steel.',
    color: '#10b981',
    defaultRoughness: 0.05,
    defaultMetalness: 0.1,
    defaultEmissive: '#059669',
    defaultEmissiveIntensity: 0.9,
  },
  {
    id: 'cgaxis_orc_warrior',
    name: 'B-Rank Orc War Berserker',
    category: 'creatures',
    polyCount: 3100,
    dimensions: '1.8m x 1.2m x 2.4m',
    tags: ['orc', 'berserker', 'warrior', 'boss'],
    description: 'Massive chieftain clad in magma-forged plates wielding a heavy cleaving poleaxe.',
    color: '#b91c1c',
    defaultRoughness: 0.45,
    defaultMetalness: 0.4,
  },
  {
    id: 'cgaxis_shadow_soldier',
    name: 'Shadow Monarch Vanguard',
    category: 'creatures',
    polyCount: 2200,
    dimensions: '1.1m x 0.8m x 2.1m',
    tags: ['shadow', 'monarch', 'soldier', 'undead'],
    description: 'Spectral dark knight cloaked in violet smoke tendrils obeying the Sovereign.',
    color: '#1e1b4b',
    defaultRoughness: 0.2,
    defaultMetalness: 0.7,
    defaultEmissive: '#818cf8',
    defaultEmissiveIntensity: 1.8,
  },

  // 5. PBR Materials & Shaders
  {
    id: 'cgaxis_pbr_obsidian',
    name: 'PBR Polished Dark Obsidian',
    category: 'pbr_materials',
    polyCount: 256,
    dimensions: 'Procedural Texture 4K',
    tags: ['material', 'pbr', 'obsidian', 'glass', 'stone'],
    description: 'Deep black volcanic glass featuring micro-scratches and intense mirror-like specular reflections.',
    color: '#090d16',
    defaultRoughness: 0.06,
    defaultMetalness: 0.9,
  },
  {
    id: 'cgaxis_pbr_celestial_gold',
    name: 'PBR Sunforged Imperial Gold',
    category: 'pbr_materials',
    polyCount: 256,
    dimensions: 'Procedural Texture 4K',
    tags: ['material', 'pbr', 'gold', 'metallic', 'luxury'],
    description: 'Satin-finish ancient bullion gold with authentic metallic albedo and warm anisotropic sheen.',
    color: '#f59e0b',
    defaultRoughness: 0.16,
    defaultMetalness: 0.98,
  },
  {
    id: 'cgaxis_pbr_magma_emissive',
    name: 'PBR Volcanic Magma Leyline',
    category: 'pbr_materials',
    polyCount: 256,
    dimensions: 'Procedural Texture 4K',
    tags: ['material', 'pbr', 'magma', 'lava', 'emissive'],
    description: 'Crusty cooled basalt stone fracturing to reveal blazing orange-red magma conduits.',
    color: '#1c1917',
    defaultRoughness: 0.65,
    defaultMetalness: 0.1,
    defaultEmissive: '#ea580c',
    defaultEmissiveIntensity: 2.5,
  },
  {
    id: 'cgaxis_pbr_arcane_glass',
    name: 'PBR Arcane Prismatic Quartz',
    category: 'pbr_materials',
    polyCount: 256,
    dimensions: 'Procedural Texture 4K',
    tags: ['material', 'pbr', 'crystal', 'glass', 'prismatic'],
    description: 'Faceted gem crystal with rainbow refraction index and high transmission dispersion.',
    color: '#67e8f9',
    defaultRoughness: 0.08,
    defaultMetalness: 0.4,
    defaultEmissive: '#06b6d4',
    defaultEmissiveIntensity: 0.6,
  },
  {
    id: 'cgaxis_pbr_moss_granite',
    name: 'PBR Weathered Highland Granite',
    category: 'pbr_materials',
    polyCount: 256,
    dimensions: 'Procedural Texture 4K',
    tags: ['material', 'pbr', 'granite', 'stone', 'moss'],
    description: 'Macro-rough mountainous granite stone blended with organic moss spores.',
    color: '#475569',
    defaultRoughness: 0.88,
    defaultMetalness: 0.05,
  },
];

interface CGAxisAssetBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  onSpawnAsset: (
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
  ) => void;
  placedObjects: PlacedSceneObject[];
  onRemoveObject: (id: string) => void;
  onClearAllObjects: () => void;
  onLoadPresetMap: (presetKey: 'procedural' | 'labyrinth' | 'town') => void;
  onBuildPresetCompound?: (type: 'medieval_town' | 'castle_fortress') => void;
}

export const CGAxisAssetBrowser: React.FC<CGAxisAssetBrowserProps> = ({
  isOpen,
  onClose,
  playerPos,
  playerYaw,
  onSpawnAsset,
  placedObjects,
  onRemoveObject,
  onClearAllObjects,
  onLoadPresetMap,
  onBuildPresetCompound,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CGAxisCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<CGAxisAsset>(CGAXIS_CATALOG[0]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'building_maker' | 'pbr_builder' | 'outliner' | 'presets'>('catalog');

  // PBR Material Customization State
  const [pbrColor, setPbrColor] = useState<string>(selectedAsset.color);
  const [pbrRoughness, setPbrRoughness] = useState<number>(selectedAsset.defaultRoughness);
  const [pbrMetalness, setPbrMetalness] = useState<number>(selectedAsset.defaultMetalness);
  const [pbrEmissive, setPbrEmissive] = useState<string>(selectedAsset.defaultEmissive || '#000000');
  const [pbrEmissiveIntensity, setPbrEmissiveIntensity] = useState<number>(
    selectedAsset.defaultEmissiveIntensity || 0
  );
  const [pbrScale, setPbrScale] = useState<number>(1.0);
  const [spawnOffsetDistance, setSpawnOffsetDistance] = useState<number>(3.5);

  const previewMountRef = useRef<HTMLDivElement>(null);
  const previewRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const previewSceneRef = useRef<THREE.Scene | null>(null);
  const previewMeshRef = useRef<THREE.Mesh | null>(null);

  // Synchronize PBR state when changing asset
  useEffect(() => {
    setPbrColor(selectedAsset.color);
    setPbrRoughness(selectedAsset.defaultRoughness);
    setPbrMetalness(selectedAsset.defaultMetalness);
    setPbrEmissive(selectedAsset.defaultEmissive || '#000000');
    setPbrEmissiveIntensity(selectedAsset.defaultEmissiveIntensity || 0);
  }, [selectedAsset]);

  // Mini 3D Preview Canvas for selected CGAxis asset
  useEffect(() => {
    if (!isOpen || !previewMountRef.current) return;

    const width = previewMountRef.current.clientWidth || 240;
    const height = 180;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    previewSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.8, 2.2, 3.2);
    camera.lookAt(0, 0.4, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    previewMountRef.current.innerHTML = '';
    previewMountRef.current.appendChild(renderer.domElement);
    previewRendererRef.current = renderer;

    const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(5, 8, 4);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight2.position.set(-4, -2, -3);
    scene.add(dirLight2);

    // Grid Floor
    const grid = new THREE.GridHelper(6, 12, 0x38bdf8, 0x1e293b);
    grid.position.y = -0.01;
    scene.add(grid);

    // Create Representative Geometry based on Asset ID
    let geom: THREE.BufferGeometry;
    if (selectedAsset.id.includes('tower') || selectedAsset.id.includes('watchtower')) {
      geom = new THREE.CylinderGeometry(0.65, 0.8, 2.4, 8);
    } else if (selectedAsset.id.includes('tavern') || selectedAsset.id.includes('manor') || selectedAsset.id.includes('forge')) {
      geom = new THREE.BoxGeometry(1.8, 1.2, 1.4);
    } else if (selectedAsset.id.includes('gate') || selectedAsset.id.includes('crypt')) {
      geom = new THREE.BoxGeometry(2.0, 1.4, 0.8);
    } else if (selectedAsset.id.includes('tree') || selectedAsset.id.includes('sakura')) {
      geom = new THREE.ConeGeometry(0.85, 2.2, 8);
    } else if (selectedAsset.id.includes('crystal') || selectedAsset.id.includes('shrub')) {
      geom = new THREE.OctahedronGeometry(0.9, 1);
    } else if (selectedAsset.id.includes('boulder') || selectedAsset.id.includes('granite')) {
      geom = new THREE.DodecahedronGeometry(0.9, 1);
    } else if (selectedAsset.id.includes('arch') || selectedAsset.id.includes('shrine')) {
      geom = new THREE.TorusGeometry(0.9, 0.28, 12, 24, Math.PI);
    } else if (selectedAsset.id.includes('obelisk')) {
      geom = new THREE.CylinderGeometry(0.15, 0.5, 2.4, 4);
    } else if (selectedAsset.id.includes('chest') || selectedAsset.id.includes('station')) {
      geom = new THREE.BoxGeometry(1.4, 0.9, 1.0);
    } else if (selectedAsset.id.includes('barrel') || selectedAsset.id.includes('brazier')) {
      geom = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 16);
    } else if (selectedAsset.id.includes('slime')) {
      geom = new THREE.SphereGeometry(0.85, 24, 24);
    } else {
      // Default sphere / capsule
      geom = new THREE.CapsuleGeometry(0.5, 1.0, 6, 16);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(pbrColor),
      roughness: pbrRoughness,
      metalness: pbrMetalness,
      emissive: new THREE.Color(pbrEmissive),
      emissiveIntensity: pbrEmissiveIntensity,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.8;
    scene.add(mesh);
    previewMeshRef.current = mesh;

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (mesh) {
        mesh.rotation.y += 0.012;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      geom.dispose();
      mat.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [isOpen, selectedAsset, pbrColor, pbrRoughness, pbrMetalness, pbrEmissive, pbrEmissiveIntensity]);

  if (!isOpen) return null;

  const filteredAssets = CGAXIS_CATALOG.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSpawnCurrent = () => {
    // Calculate spawn position in front of character
    const rad = playerYaw;
    const forwardX = -Math.sin(rad) * spawnOffsetDistance;
    const forwardZ = -Math.cos(rad) * spawnOffsetDistance;

    const spawnX = Number((playerPos.x + forwardX).toFixed(2));
    const spawnZ = Number((playerPos.z + forwardZ).toFixed(2));
    const spawnY = Number(playerPos.y.toFixed(2));

    onSpawnAsset(selectedAsset, {
      x: spawnX,
      y: spawnY,
      z: spawnZ,
      rotationY: Number((playerYaw * (180 / Math.PI)).toFixed(1)),
      scale: pbrScale,
      color: pbrColor,
      roughness: pbrRoughness,
      metalness: pbrMetalness,
      emissive: pbrEmissive,
      emissiveIntensity: pbrEmissiveIntensity,
    });
  };

  const handleExportJSON = () => {
    const exportData = {
      cgaxis_export_version: '2.4.0',
      timestamp: new Date().toISOString(),
      world_reference: 'Aethelgard Continental Realm',
      total_spawned_objects: placedObjects.length,
      placed_objects: placedObjects.map((obj) => ({
        id: obj.id,
        asset_id: obj.assetId,
        name: obj.name,
        category: obj.category,
        transform: {
          x: obj.x,
          y: obj.y,
          z: obj.z,
          rotation_y: obj.rotationY,
          scale: obj.scale,
        },
        pbr_material: obj.materialProps,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cgaxis_level_layout_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 z-50 pointer-events-auto select-none font-sans">
      <div className="w-full max-w-5xl h-[88vh] max-h-[760px] bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-amber-400/20">
        {/* Top Header: Blender 4.x / CGAxis Studio Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/40">
              <Box className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wide text-white font-mono uppercase">
                  CGAxis 3D Asset Browser & Spawner
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  v2.4.0 PBR
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Blender Add-on Native Integration • Real-Time Procedural World Populator
              </p>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Asset Library</span>
            </button>
            <button
              onClick={() => setActiveTab('building_maker')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'building_maker'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>3D Building Maker</span>
            </button>
            <button
              onClick={() => setActiveTab('pbr_builder')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'pbr_builder'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>PBR Builder</span>
            </button>
            <button
              onClick={() => setActiveTab('outliner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'outliner'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Scene Outliner ({placedObjects.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Map Presets</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-mono transition cursor-pointer"
            title="Close CGAxis Window"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* TAB 1: Asset Catalog & Library */}
          {activeTab === 'catalog' && (
            <div className="flex-1 flex overflow-hidden">
              {/* Category Sidebar */}
              <div className="w-48 bg-slate-950/80 border-r border-slate-800 p-3 flex flex-col gap-1.5 shrink-0">
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 px-2 py-1">
                  Asset Collections
                </span>
                {[
                  { id: 'all', label: 'All Collections', icon: Layers, count: CGAXIS_CATALOG.length },
                  { id: 'nature', label: 'Nature & Trees', icon: TreePine, count: 5 },
                  { id: 'architecture', label: 'Architecture', icon: Building2, count: 4 },
                  { id: 'props', label: 'Props & Vaults', icon: Package, count: 4 },
                  { id: 'creatures', label: 'Monsters & Units', icon: Skull, count: 4 },
                  { id: 'pbr_materials', label: 'PBR Shaders', icon: Palette, count: 5 },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-mono transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </div>
                      <span className="text-[10px] opacity-60 ml-1">{cat.count}</span>
                    </button>
                  );
                })}

                <div className="mt-auto p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                  <p className="text-amber-400 font-bold">Player Position:</p>
                  <p>X: {playerPos.x.toFixed(1)}m</p>
                  <p>Y: {playerPos.y.toFixed(1)}m</p>
                  <p>Z: {playerPos.z.toFixed(1)}m</p>
                </div>
              </div>

              {/* Main Asset Grid */}
              <div className="flex-1 flex flex-col p-4 overflow-hidden bg-slate-900/60">
                {/* Search Bar */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search 3D assets, foliage, ruins, PBR shaders..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-400 shrink-0">
                    {filteredAssets.length} assets ready
                  </span>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedAsset.id === asset.id;
                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className={`group relative p-3 rounded-2xl border transition flex flex-col cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-400/30'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        {/* Thumbnail Icon & Preview Color */}
                        <div
                          className="w-full h-24 rounded-xl flex items-center justify-center mb-2 relative overflow-hidden"
                          style={{
                            background: `radial-gradient(circle, ${asset.color}33 0%, #020617 80%)`,
                          }}
                        >
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border transition group-hover:scale-110"
                            style={{
                              backgroundColor: asset.color,
                              borderColor: `${asset.color}88`,
                            }}
                          >
                            <Box className="w-6 h-6 text-black/80" />
                          </div>
                          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] bg-black/70 text-slate-300 font-mono">
                            {asset.polyCount} polys
                          </span>
                        </div>

                        {/* Title & Metadata */}
                        <h4 className="text-xs font-bold text-white truncate mb-0.5 group-hover:text-amber-300">
                          {asset.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mb-2 font-mono">
                          {asset.dimensions}
                        </p>

                        <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[9px] uppercase font-mono text-amber-400/90">
                            {asset.category}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-amber-500 text-black font-bold'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isSelected ? 'SELECTED' : 'SELECT'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Inspector & 1-Click Spawner */}
              <div className="w-72 bg-slate-950 border-l border-slate-800 p-4 flex flex-col shrink-0 overflow-y-auto">
                <span className="text-[10px] uppercase font-mono font-bold text-amber-400 mb-2">
                  Asset Details & 3D Preview
                </span>

                {/* 3D Preview Canvas */}
                <div
                  ref={previewMountRef}
                  className="w-full h-44 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden mb-3 relative flex items-center justify-center"
                />

                <h3 className="text-sm font-bold text-white mb-1">{selectedAsset.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {selectedAsset.description}
                </p>

                {/* Specs Box */}
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-1 mb-3 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Geometry:</span>
                    <span>{selectedAsset.polyCount.toLocaleString()} Triangles</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dimensions:</span>
                    <span>{selectedAsset.dimensions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Roughness:</span>
                    <span>{pbrRoughness.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Metalness:</span>
                    <span>{pbrMetalness.toFixed(2)}</span>
                  </div>
                </div>

                {/* Spawn Settings */}
                <div className="space-y-2 mb-4 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Scale Multiplier:</span>
                    <span className="text-amber-400 font-bold">{pbrScale.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="3.0"
                    step="0.1"
                    value={pbrScale}
                    onChange={(e) => setPbrScale(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Spawn Distance:</span>
                    <span className="text-amber-400 font-bold">{spawnOffsetDistance.toFixed(1)}m</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={spawnOffsetDistance}
                    onChange={(e) => setSpawnOffsetDistance(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* 1-Click Spawn Button */}
                <button
                  onClick={handleSpawnCurrent}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer mt-auto"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Spawn Into Scene</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: 3D Building Maker & Quad Architecture Studio */}
          {activeTab === 'building_maker' && (
            <div className="flex-1 flex overflow-hidden bg-slate-900/60">
              {/* Left Column: Building Selector & Batch Generators */}
              <div className="flex-1 flex flex-col p-5 overflow-y-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white font-mono uppercase">
                        3D Building & Fortress Studio
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                        Quadify Topology Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Construct castles, taverns, forges, crypts, and defensive bastions in real-time 3D WebGL
                    </p>
                  </div>

                  {/* 1-Click Compound Presets */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onBuildPresetCompound && onBuildPresetCompound('castle_fortress')}
                      className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 font-mono text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
                      title="Generate Citadel Spire, Gatehouse, and 4 Perimeter Watchtowers"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>+ Castle Ring (5)</span>
                    </button>
                    <button
                      onClick={() => onBuildPresetCompound && onBuildPresetCompound('medieval_town')}
                      className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/80 text-amber-300 font-mono text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
                      title="Generate Tavern, Blacksmith, Guild Manor, and Shrines"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Town Settlement (6)</span>
                    </button>
                  </div>
                </div>

                {/* Building Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CGAXIS_CATALOG.filter((a) => a.category === 'architecture').map((building) => {
                    const isSelected = selectedAsset.id === building.id;
                    return (
                      <div
                        key={building.id}
                        onClick={() => setSelectedAsset(building)}
                        className={`p-3.5 rounded-2xl border transition flex flex-col cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/50 border-amber-500 ring-2 ring-amber-400/40 shadow-xl'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                        }`}
                      >
                        <div
                          className="w-full h-28 rounded-xl flex items-center justify-center mb-2.5 relative overflow-hidden"
                          style={{
                            background: `radial-gradient(circle, ${building.color}33 0%, #020617 85%)`,
                          }}
                        >
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg border transition group-hover:scale-110"
                            style={{
                              backgroundColor: building.color,
                              borderColor: `${building.color}88`,
                            }}
                          >
                            <Building2 className="w-7 h-7 text-black/85" />
                          </div>
                          <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded text-[9px] bg-black/80 text-slate-300 font-mono">
                            {building.polyCount} quads
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-white mb-0.5">{building.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mb-2">{building.dimensions}</p>
                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed mb-3">
                          {building.description}
                        </p>

                        <div className="mt-auto pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[9px] uppercase font-mono text-emerald-400 font-bold">
                            Quad-Mesh Ready
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              isSelected
                                ? 'bg-amber-500 text-black'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {isSelected ? 'SELECTED ✓' : 'CHOOSE'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: 3D Construction Customizer & Spawner */}
              <div className="w-80 bg-slate-950 border-l border-slate-800 p-5 flex flex-col shrink-0 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-amber-400">
                    Architectural Inspector
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Manifold Topology
                  </span>
                </div>

                {/* 3D Preview */}
                <div
                  ref={previewMountRef}
                  className="w-full h-44 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden mb-3 relative flex items-center justify-center"
                />

                <h3 className="text-sm font-bold text-white mb-1">{selectedAsset.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {selectedAsset.description}
                </p>

                {/* Transform Sliders */}
                <div className="space-y-3 mb-4 text-xs font-mono">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Structure Scale:</span>
                      <span className="text-amber-400 font-bold">{pbrScale.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={pbrScale}
                      onChange={(e) => setPbrScale(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-400">Placement Distance:</span>
                      <span className="text-amber-400 font-bold">{spawnOffsetDistance.toFixed(1)}m</span>
                    </div>
                    <input
                      type="range"
                      min="2.0"
                      max="25.0"
                      step="1.0"
                      value={spawnOffsetDistance}
                      onChange={(e) => setSpawnOffsetDistance(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Wall Texture / Tint */}
                  <div>
                    <span className="text-slate-400 block mb-1.5">Building Wall Tone:</span>
                    <div className="flex gap-2">
                      {[
                        { label: 'Granite', hex: '#64748b' },
                        { label: 'Timber', hex: '#78350f' },
                        { label: 'Basalt', hex: '#1e293b' },
                        { label: 'Marble', hex: '#e2e8f0' },
                        { label: 'Gold', hex: '#f59e0b' },
                      ].map((t) => (
                        <button
                          key={t.hex}
                          onClick={() => setPbrColor(t.hex)}
                          className={`w-7 h-7 rounded-lg border transition hover:scale-110 cursor-pointer ${
                            pbrColor === t.hex ? 'ring-2 ring-amber-400 scale-105' : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: t.hex }}
                          title={t.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Window Glow Color */}
                  <div>
                    <span className="text-slate-400 block mb-1.5">Window / Arcane Spire Light:</span>
                    <div className="flex gap-2">
                      {[
                        { label: 'Amber Flame', hex: '#f59e0b' },
                        { label: 'Arcane Blue', hex: '#38bdf8' },
                        { label: 'Magma Orange', hex: '#ea580c' },
                        { label: 'Void Violet', hex: '#a855f7' },
                      ].map((t) => (
                        <button
                          key={t.hex}
                          onClick={() => {
                            setPbrEmissive(t.hex);
                            setPbrEmissiveIntensity(1.5);
                          }}
                          className={`w-7 h-7 rounded-lg border transition hover:scale-110 cursor-pointer ${
                            pbrEmissive === t.hex ? 'ring-2 ring-cyan-400 scale-105' : 'border-slate-700'
                          }`}
                          style={{ backgroundColor: t.hex }}
                          title={t.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Construct Button */}
                <button
                  onClick={handleSpawnCurrent}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer mt-auto"
                >
                  <Building2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Build & Spawn in World</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PBR Material Builder (matches pbr_builder.py & materials.py) */}
          {activeTab === 'pbr_builder' && (
            <div className="flex-1 flex p-6 gap-6 overflow-y-auto">
              {/* Left: Material Sliders */}
              <div className="flex-1 bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase">
                      CGAxis PBR Shader Generator
                    </h3>
                    <p className="text-xs text-slate-400">
                      Physically-Based Rendering channel configuration (Metallic-Roughness Workflow)
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-xs border border-amber-500/40">
                    Target: {selectedAsset.name}
                  </span>
                </div>

                {/* Base Albedo Tint */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-300">1. Albedo Base Color (Hex):</span>
                    <span className="text-amber-400 font-bold">{pbrColor}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={pbrColor}
                      onChange={(e) => setPbrColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <div className="flex gap-2">
                      {['#22c55e', '#38bdf8', '#f59e0b', '#ef4444', '#a855f7', '#64748b', '#0f172a'].map(
                        (hex) => (
                          <button
                            key={hex}
                            onClick={() => setPbrColor(hex)}
                            className="w-6 h-6 rounded-md border border-slate-700 transition hover:scale-110 cursor-pointer"
                            style={{ backgroundColor: hex }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Roughness Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-300">2. Surface Roughness (Micro-facet scattering):</span>
                    <span className="text-amber-400 font-bold">{pbrRoughness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={pbrRoughness}
                    onChange={(e) => setPbrRoughness(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Mirror Gloss (0.0)</span>
                    <span>Rough Clay / Rock (1.0)</span>
                  </div>
                </div>

                {/* Metalness Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-300">3. Metallic Reflectance:</span>
                    <span className="text-amber-400 font-bold">{pbrMetalness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={pbrMetalness}
                    onChange={(e) => setPbrMetalness(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Dielectric / Wood (0.0)</span>
                    <span>Pure Conductor Metal (1.0)</span>
                  </div>
                </div>

                {/* Emissive Channel */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-300">4. Emissive Leyline Channel:</span>
                    <span className="text-amber-400 font-bold">
                      Intensity {pbrEmissiveIntensity.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="color"
                      value={pbrEmissive}
                      onChange={(e) => setPbrEmissive(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="range"
                      min="0"
                      max="3.0"
                      step="0.1"
                      value={pbrEmissiveIntensity}
                      onChange={(e) => setPbrEmissiveIntensity(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => {
                      setPbrColor(selectedAsset.color);
                      setPbrRoughness(selectedAsset.defaultRoughness);
                      setPbrMetalness(selectedAsset.defaultMetalness);
                      setPbrEmissive(selectedAsset.defaultEmissive || '#000000');
                      setPbrEmissiveIntensity(selectedAsset.defaultEmissiveIntensity || 0);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-xl transition cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    onClick={handleSpawnCurrent}
                    className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs font-mono rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Spawn Mesh With This PBR Shader</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Scene Outliner (Placed Assets in World) */}
          {activeTab === 'outliner' && (
            <div className="flex-1 flex flex-col p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase">
                    Live Scene Outliner ({placedObjects.length} Entities Placed)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Hierarchy of all dynamically spawned 3D meshes and props in Aethelgard
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJSON}
                    disabled={placedObjects.length === 0}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-mono rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Scene JSON</span>
                  </button>
                  <button
                    onClick={onClearAllObjects}
                    disabled={placedObjects.length === 0}
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 disabled:opacity-50 text-rose-300 text-xs font-mono rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Spawned</span>
                  </button>
                </div>
              </div>

              {placedObjects.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl">
                  <Box className="w-10 h-10 text-slate-600 mb-3" />
                  <h4 className="text-sm font-bold text-slate-400 font-mono mb-1">
                    No Custom Meshes Spawned Yet
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm font-mono mb-4">
                    Open the Asset Library tab and click "Spawn Into Scene" or load one of the procedural presets below.
                  </p>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs font-mono rounded-xl transition cursor-pointer"
                  >
                    Browse CGAxis Library
                  </button>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {placedObjects.map((obj, idx) => (
                    <div
                      key={obj.id}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] text-amber-400 font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="font-bold text-white">{obj.name}</h5>
                          <p className="text-[10px] text-slate-500">
                            X: {obj.x}m • Y: {obj.y}m • Z: {obj.z}m • Scale: {obj.scale}x
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 uppercase">
                          {obj.category}
                        </span>
                        <button
                          onClick={() => onRemoveObject(obj.id)}
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-400 rounded-lg transition cursor-pointer"
                          title="Delete from Scene"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Map Presets Loader */}
          {activeTab === 'presets' && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase">
                  Procedural Map Data & Dungeon Layout Presets
                </h3>
                <p className="text-xs text-slate-400">
                  Instant batch loader for JSON-based procedural layouts into the live 3D Three.js world
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Preset 1: 65-Object Procedural Map */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs mb-1">
                      <TreePine className="w-4 h-4" />
                      <span>proceduralTerrainMap.json</span>
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1.5">
                      Open-World Wilderness Map
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      65 placed objects featuring ancient oaks, granite boulders, goblin raiders, slime mutants, and orc warriors across a 100x100 grid.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onLoadPresetMap('procedural');
                      setActiveTab('outliner');
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Load 65 Map Objects</span>
                  </button>
                </div>

                {/* Preset 2: S-Rank Demon King Labyrinth */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-xs mb-1">
                      <Skull className="w-4 h-4" />
                      <span>demonKingLabyrinth.json</span>
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1.5">
                      Abyss Labyrinth Floor 99
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      8 interconnected dungeon chambers with teleportation runes, ritual mana braziers, crystal spires, and boss throne architecture.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onLoadPresetMap('labyrinth');
                      setActiveTab('outliner');
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs font-mono rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Load Labyrinth Layout</span>
                  </button>
                </div>

                {/* Preset 3: Starting Town Layout */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-xs mb-1">
                      <Building2 className="w-4 h-4" />
                      <span>startingTownLayout.json</span>
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1.5">
                      Citadel Town Settlement
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      20 non-overlapping buildings across a 200x200 area, including Tavern, Guild Hall, Blacksmith, Town Square, and guard watchtowers.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onLoadPresetMap('town');
                      setActiveTab('outliner');
                    }}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Load Town Settlement</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

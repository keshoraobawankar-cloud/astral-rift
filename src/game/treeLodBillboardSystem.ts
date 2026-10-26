import * as THREE from 'three';

export interface LodTreeItem {
  id: number;
  position: THREE.Vector3;
  meshLod0: THREE.Mesh;       // Full 3D CapsuleGeometry LOD 0
  spriteBillboard: THREE.Sprite; // Lightweight 2D Camera-Facing Billboard
  currentLod: 0 | 1;
}

export interface TreeLodSystem {
  group: THREE.Group;
  trees: LodTreeItem[];
  update: (camera: THREE.Camera, delta: number) => void;
  dispose: () => void;
}

/**
 * Procedural 2D Billboard Canvas Texture generator:
 * Creates a circular foliage sprite with radial shading and soft edge transparency.
 */
function createBillboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 12, 64, 64, 58);
    gradient.addColorStop(0, '#4ade80');   // Vibrant foliage green core
    gradient.addColorStop(0.7, '#15803d'); // Deep shadow green rim
    gradient.addColorStop(1, 'rgba(21, 128, 61, 0)'); // Transparent alpha boundary

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    // Subtle trunk base accent
    ctx.fillStyle = '#78350f';
    ctx.fillRect(58, 100, 12, 26);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Initializes and manages 500 scattered tree instances with throttled distance-based LOD swapping:
 * - Distance <= 20 units: Renders 3D CapsuleGeometry (LOD 0)
 * - Distance > 20 units: Swaps to lightweight 2D Camera-Facing Sprite Billboard
 * - Throttled: Calculations run at a fixed interval (100ms / 10Hz) to conserve CPU cycles.
 */
export function createTreeLodSystem(
  scene: THREE.Scene,
  treeCount = 500,
  mapRadius = 120,
  lodDistance = 20.0,
  throttleInterval = 0.1 // Throttled update interval in seconds (10 FPS check rate)
): TreeLodSystem {
  const systemGroup = new THREE.Group();
  systemGroup.name = 'tree_lod_billboard_system';

  // Shared 3D Capsule geometry & toon material for LOD 0
  const capsuleGeo = new THREE.CapsuleGeometry(0.85, 2.8, 8, 16);
  const capsuleMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.65,
    metalness: 0.1,
  });

  // Shared Billboard Sprite Material with generated green texture
  const billboardTexture = createBillboardTexture();
  const spriteMat = new THREE.SpriteMaterial({
    map: billboardTexture,
    transparent: true,
    depthWrite: false, // Prevents billboard z-sorting artifacts
  });

  const trees: LodTreeItem[] = [];
  const lodDistanceSq = lodDistance * lodDistance; // Fast squared distance comparison

  for (let i = 0; i < treeCount; i++) {
    // Random polar distribution avoiding center sanctuary
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.sqrt(Math.random()) * (mapRadius - 18);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const position = new THREE.Vector3(x, 2.2, z);

    // 1. Full 3D Capsule Mesh (LOD 0)
    const meshLod0 = new THREE.Mesh(capsuleGeo, capsuleMat);
    meshLod0.position.copy(position);
    meshLod0.castShadow = true;
    meshLod0.receiveShadow = true;
    systemGroup.add(meshLod0);

    // 2. 2D Billboard Sprite (LOD 1)
    const spriteBillboard = new THREE.Sprite(spriteMat);
    spriteBillboard.position.copy(position);
    spriteBillboard.scale.set(4.0, 4.0, 1.0);
    spriteBillboard.visible = false; // Initially hidden until distance cull check
    systemGroup.add(spriteBillboard);

    trees.push({
      id: i,
      position,
      meshLod0,
      spriteBillboard,
      currentLod: 0,
    });
  }

  scene.add(systemGroup);

  // Throttling accumulator
  let timeSinceLastCheck = 0;

  /**
   * Throttled update function called inside the requestAnimationFrame render loop.
   * Uses Vector3 distance math with distanceToSquared to avoid expensive Math.sqrt.
   */
  const update = (camera: THREE.Camera, delta: number) => {
    timeSinceLastCheck += delta;

    // Throttle check execution to conserve CPU time
    if (timeSinceLastCheck < throttleInterval) {
      return;
    }
    timeSinceLastCheck = 0;

    const camPos = camera.position;

    for (let i = 0; i < trees.length; i++) {
      const tree = trees[i];

      // Clean linear algebra distance check using Vector3.distanceToSquared
      // (Euclidean norm without Math.sqrt overhead)
      const distSq = tree.position.distanceToSquared(camPos);

      if (distSq <= lodDistanceSq) {
        // CLOSE RANGE: Swap to full 3D Capsule Mesh (LOD 0)
        if (tree.currentLod !== 0) {
          tree.currentLod = 0;
          tree.meshLod0.visible = true;
          tree.spriteBillboard.visible = false;
        }
      } else {
        // FAR RANGE: Swap to flat 2D Sprite Billboard (LOD 1)
        if (tree.currentLod !== 1) {
          tree.currentLod = 1;
          tree.meshLod0.visible = false;
          tree.spriteBillboard.visible = true;
        }
      }
    }
  };

  const dispose = () => {
    scene.remove(systemGroup);
    capsuleGeo.dispose();
    capsuleMat.dispose();
    billboardTexture.dispose();
    spriteMat.dispose();
  };

  return {
    group: systemGroup,
    trees,
    update,
    dispose,
  };
}

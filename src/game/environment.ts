import * as THREE from 'three';

// Path to user-provided landscape brush pack asset in workspace
export const LANDSCAPE_BRUSH_ASSET_PATH = '/assets/aistudio/Free_Basic_Landscape_Brushes_eee8800c.zip';
export const EXTRACTED_ABR_BRUSH_PATH = '/assets/aistudio/free_basic_landscape_brushes/free_basic_landscape_brushes_by_kloir_dfau4xa.abr';

// ============================================================================
// 1. DYNAMIC AMBIENT LEYLINE STARDUST & SPORE PARTICLE SYSTEM
// ============================================================================
export function createAmbientStardust(scene: THREE.Scene, particleCount = 1200): (dt: number) => void {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const driftSpeeds = new Float32Array(particleCount);
  const swayPhases = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;
    positions[idx] = (Math.random() - 0.5) * 350;     // X width
    positions[idx + 1] = Math.random() * 45 + 0.5;   // Y height
    positions[idx + 2] = (Math.random() - 0.5) * 350; // Z depth

    driftSpeeds[i] = Math.random() * 1.5 + 0.8;
    swayPhases[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Glowing Stardust Canvas Texture for circular, soft-edge glowing motes
  function createStardustTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.3, 'rgba(192, 132, 252, 0.9)');
      gradient.addColorStop(0.7, 'rgba(56, 189, 248, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  const material = new THREE.PointsMaterial({
    color: 0xc084fc, // Magical purple/gold stardust hue
    size: 1.1,
    map: createStardustTexture(),
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);

  let timeAccumulator = 0;

  return function updateStardust(dt: number) {
    timeAccumulator += dt;
    const posArr = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      posArr[idx + 1] -= dt * driftSpeeds[i];
      posArr[idx] += Math.sin(timeAccumulator * 1.2 + swayPhases[i]) * 0.05;
      posArr[idx + 2] += Math.cos(timeAccumulator * 1.2 + swayPhases[i]) * 0.05;

      if (posArr[idx + 1] < 0.2) {
        posArr[idx + 1] = 45;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  };
}

// ============================================================================
// 2. CINEMATIC ATMOSPHERIC LIGHTING & SOFT SHADOWS
// ============================================================================
export function setupCinematicLighting(scene: THREE.Scene): {
  ambient: THREE.AmbientLight;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
} {
  const ambient = new THREE.AmbientLight(0x1e1b4b, 1.4);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfef08a, 2.0);
  sun.position.set(70, 140, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 600;
  const d = 130;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0001;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x38bdf8, 0x064e3b, 0.7);
  scene.add(hemi);

  return { ambient, sun, hemi };
}

// ============================================================================
// 3. PROCEDURAL LANDSCAPE GRASS BRUSH TEXTURE GENERATOR
// Paints lush meadows, softened cave transitions, walking trails, and soil blending
// ============================================================================
export function createLandscapeTerrainTexture(terrainSize = 1000): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Helper: map world coord (X, Z: -500 to +500) to Canvas (0 to 2048)
  const toCanvasX = (wx: number) => ((wx + terrainSize / 2) / terrainSize) * canvas.width;
  const toCanvasY = (wz: number) => ((wz + terrainSize / 2) / terrainSize) * canvas.height;

  // 1. Deep Rich Forest Loam & Meadow Under-base
  ctx.fillStyle = '#064e3b'; // Forest emerald base
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Multi-tone Meadow Grass Tufts (Grass Brush Simulation)
  const grassGreens = [
    '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#0f766e', '#15803d', '#16a34a', '#22c55e', '#4ade80'
  ];

  // Helper: Paint procedural grass blade clusters mimicking Photoshop/Krita landscape brush
  function paintGrassBrushCluster(
    cx: number,
    cy: number,
    radius: number,
    density: number,
    palette: string[],
    heightScale = 1.0
  ) {
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const bx = cx + Math.cos(angle) * dist;
      const by = cy + Math.sin(angle) * dist;

      const bladeColor = palette[Math.floor(Math.random() * palette.length)];
      ctx!.strokeStyle = bladeColor;
      ctx!.lineWidth = Math.random() * 2 + 1;
      ctx!.lineCap = 'round';

      // Fan-shaped grass blade strokes
      const bladeAngle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const bladeLen = (Math.random() * 8 + 6) * heightScale;

      ctx!.beginPath();
      ctx!.moveTo(bx, by);
      ctx!.quadraticCurveTo(
        bx + Math.cos(bladeAngle) * (bladeLen * 0.5) + (Math.random() - 0.5) * 4,
        by + Math.sin(bladeAngle) * (bladeLen * 0.5),
        bx + Math.cos(bladeAngle) * bladeLen,
        by + Math.sin(bladeAngle) * bladeLen
      );
      ctx!.stroke();
    }
  }

  // Scatter lush wild grass brush patches across open plains (5,000 clusters)
  for (let i = 0; i < 2800; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    paintGrassBrushCluster(rx, ry, Math.random() * 28 + 10, 8, grassGreens, Math.random() * 0.6 + 0.8);
  }

  // 3. Walking Trails / Path Network with Soft Grass-to-Dirt Feathered Edges
  // Trail 1: Citadel Courtyard (0, 0) -> Sunken Rift Cavern (-85, 85)
  // Trail 2: Citadel Courtyard (0, 0) -> Void Titan Badlands (45, -45)
  // Trail 3: Citadel Courtyard (0, 0) -> Ore Gathering Vein (14, -10)
  const paths = [
    { start: [0, 0], end: [-85, 85], width: 14, curve: [-30, 40] },
    { start: [0, 0], end: [45, -45], width: 16, curve: [25, -15] },
    { start: [0, 0], end: [14, -10], width: 10, curve: [8, -4] },
    { start: [-85, 85], end: [-50, 35], width: 9, curve: [-70, 60] },
  ];

  paths.forEach((p) => {
    const sx = toCanvasX(p.start[0]);
    const sy = toCanvasY(p.start[1]);
    const ex = toCanvasX(p.end[0]);
    const ey = toCanvasY(p.end[1]);
    const cx = toCanvasX(p.curve[0]);
    const cy = toCanvasY(p.curve[1]);

    // Outer Softened Path Blend (Feathered Dirt Loam)
    ctx.lineWidth = p.width * 2.8;
    ctx.strokeStyle = '#1e293b';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();

    // Secondary Sandy Gravel Bed
    ctx.lineWidth = p.width * 1.8;
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();

    // Central Trodden Earth Trail
    ctx.lineWidth = p.width * 0.9;
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();

    // Paint grass edge fringe strokes along the path to soften border transitions
    for (let step = 0; step <= 25; step++) {
      const t = step / 25;
      const px = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
      const py = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;

      // Left edge fringe
      paintGrassBrushCluster(px - p.width * 1.4, py - p.width * 1.4, p.width * 0.8, 6, [
        '#10b981', '#34d399', '#059669', '#15803d'
      ], 0.9);
      // Right edge fringe
      paintGrassBrushCluster(px + p.width * 1.4, py + p.width * 1.4, p.width * 0.8, 6, [
        '#10b981', '#34d399', '#059669', '#15803d'
      ], 0.9);
    }
  });

  // 4. Cave Mouth & Subterranean Rift Transition Area (X: -85, Z: 85)
  // Soften rock-to-grass gradient around the cavern entrance
  const caveCanvasX = toCanvasX(-85);
  const caveCanvasY = toCanvasY(85);
  const caveRadius = (45 / terrainSize) * canvas.width;

  // Dark Basalt Bedrock Radial Blend
  const caveGrad = ctx.createRadialGradient(caveCanvasX, caveCanvasY, 0, caveCanvasX, caveCanvasY, caveRadius * 1.3);
  caveGrad.addColorStop(0, '#090d16');
  caveGrad.addColorStop(0.55, '#18181b');
  caveGrad.addColorStop(0.8, '#1e293b');
  caveGrad.addColorStop(0.95, '#064e3b');
  caveGrad.addColorStop(1, 'rgba(6, 78, 59, 0)');

  ctx.fillStyle = caveGrad;
  ctx.beginPath();
  ctx.arc(caveCanvasX, caveCanvasY, caveRadius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Dense, creeping cave moss & bioluminescent fungal brush around the threshold
  const cavePalette = ['#4338ca', '#6366f1', '#065f46', '#047857', '#10b981', '#0284c7'];
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2;
    const dist = caveRadius * (0.8 + (Math.random() - 0.5) * 0.35);
    const px = caveCanvasX + Math.cos(angle) * dist;
    const py = caveCanvasY + Math.sin(angle) * dist;
    paintGrassBrushCluster(px, py, 18, 12, cavePalette, 1.1);
  }

  // 5. Central Citadel Courtyard Perimeter Softening (X: 0, Z: 0)
  const citadelX = toCanvasX(0);
  const citadelY = toCanvasY(0);
  const citadelR = (28 / terrainSize) * canvas.width;
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const dist = citadelR + Math.random() * 6;
    const px = citadelX + Math.cos(angle) * dist;
    const py = citadelY + Math.sin(angle) * dist;
    paintGrassBrushCluster(px, py, 14, 10, ['#34d399', '#10b981', '#22c55e', '#facc15'], 0.95);
  }

  // 6. Scattered Wild Meadow Floral Accents (Golden buttercups, starlight daisies & cyan clover)
  const flowerColors = ['#fde047', '#38bdf8', '#c084fc', '#f43f5e', '#ffffff'];
  for (let i = 0; i < 600; i++) {
    const fx = Math.random() * canvas.width;
    const fy = Math.random() * canvas.height;
    ctx.fillStyle = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    ctx.beginPath();
    ctx.arc(fx, fy, Math.random() * 2.2 + 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 16;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// ============================================================================
// 4. INSTANCED 3D VEGETATION & FOLIAGE CLUSTERS
// Generates realistic 3D wild grass tufts, weeds, and undergrowth around trees,
// rocks, walking trail edges, and the cavern entrance with wind sway animation.
// ============================================================================
export function createVegetationClusters(
  scene: THREE.Scene,
  treeLocations?: THREE.Vector3[],
  caveCenter = new THREE.Vector3(-85, 0, 85),
  totalInstances = 2600
): {
  mesh: THREE.InstancedMesh;
  update: (dt: number) => void;
} {
  // Generate multi-blade grass tuft canvas alpha texture
  function createGrassTuftAlphaTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);

      // Draw multiple natural grass blades tapering to points
      const blades = [
        { x: 30, h: 110, cpX: 18, w: 9, color: '#15803d', tipColor: '#4ade80' },
        { x: 50, h: 122, cpX: 42, w: 10, color: '#16a34a', tipColor: '#86efac' },
        { x: 64, h: 128, cpX: 64, w: 12, color: '#22c55e', tipColor: '#bbf7d0' },
        { x: 80, h: 120, cpX: 90, w: 10, color: '#16a34a', tipColor: '#86efac' },
        { x: 100, h: 108, cpX: 112, w: 9, color: '#15803d', tipColor: '#4ade80' },
      ];

      blades.forEach((b) => {
        const grad = ctx.createLinearGradient(b.x, 128, b.x, 128 - b.h);
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.3, b.color);
        grad.addColorStop(1, b.tipColor);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(b.x - b.w / 2, 128);
        ctx.quadraticCurveTo(b.cpX, 128 - b.h * 0.6, b.x + (b.cpX - b.x) * 0.4, 128 - b.h);
        ctx.quadraticCurveTo(b.cpX + b.w * 0.3, 128 - b.h * 0.6, b.x + b.w / 2, 128);
        ctx.closePath();
        ctx.fill();
      });
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }

  // Double cross-quad geometry for 3D fullness from all camera angles
  const quadWidth = 1.6;
  const quadHeight = 1.8;
  const plane1 = new THREE.PlaneGeometry(quadWidth, quadHeight);
  plane1.translate(0, quadHeight / 2, 0);

  const plane2 = new THREE.PlaneGeometry(quadWidth, quadHeight);
  plane2.translate(0, quadHeight / 2, 0);
  plane2.rotateY(Math.PI / 3);

  const plane3 = new THREE.PlaneGeometry(quadWidth, quadHeight);
  plane3.translate(0, quadHeight / 2, 0);
  plane3.rotateY((Math.PI * 2) / 3);

  // Combine geometries
  const tuftGeo = new THREE.BufferGeometry();
  const posArr = [
    ...plane1.attributes.position.array,
    ...plane2.attributes.position.array,
    ...plane3.attributes.position.array,
  ];
  const uvArr = [
    ...plane1.attributes.uv.array,
    ...plane2.attributes.uv.array,
    ...plane3.attributes.uv.array,
  ];
  tuftGeo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  tuftGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));

  // Merge indices
  const pIndex = plane1.index ? Array.from(plane1.index.array) : [];
  const pCount = plane1.attributes.position.count;
  const mergedIndex = [
    ...pIndex,
    ...pIndex.map((i) => i + pCount),
    ...pIndex.map((i) => i + pCount * 2),
  ];
  tuftGeo.setIndex(mergedIndex);

  const grassAlphaTexture = createGrassTuftAlphaTexture();
  const tuftMat = new THREE.MeshStandardMaterial({
    map: grassAlphaTexture,
    alphaTest: 0.35,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.75,
    metalness: 0.1,
  });

  const instancedMesh = new THREE.InstancedMesh(tuftGeo, tuftMat, totalInstances);
  instancedMesh.receiveShadow = true;
  instancedMesh.castShadow = true;

  const dummy = new THREE.Object3D();
  const baseRotations = new Float32Array(totalInstances);
  const basePositions = new Float32Array(totalInstances * 3);
  const swayFrequencies = new Float32Array(totalInstances);

  let placed = 0;

  // 1. Cluster around Cave Mouth Entrance (-85, 0, 85)
  const caveClusterCount = 500;
  for (let i = 0; i < caveClusterCount && placed < totalInstances; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 24;
    const x = caveCenter.x + Math.cos(angle) * dist;
    const z = caveCenter.z + Math.sin(angle) * dist;
    const scale = 0.8 + Math.random() * 0.65;
    const rot = Math.random() * Math.PI * 2;

    dummy.position.set(x, 0.1, z);
    dummy.rotation.set(0, rot, 0);
    dummy.scale.set(scale, scale * (0.9 + Math.random() * 0.4), scale);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(placed, dummy.matrix);

    baseRotations[placed] = rot;
    basePositions[placed * 3] = x;
    basePositions[placed * 3 + 1] = 0.1;
    basePositions[placed * 3 + 2] = z;
    swayFrequencies[placed] = Math.random() * 1.5 + 2.0;
    placed++;
  }

  // 2. Clusters around Trees & Monoliths
  const treeCount = treeLocations ? treeLocations.length : 60;
  const clustersPerTree = 10;
  for (let t = 0; t < treeCount; t++) {
    const treePos = treeLocations && treeLocations[t]
      ? treeLocations[t]
      : new THREE.Vector3((Math.random() - 0.5) * 600, 0, (Math.random() - 0.5) * 600);

    if (Math.hypot(treePos.x, treePos.z) < 32) continue; // Skip sanctuary interior

    for (let c = 0; c < clustersPerTree && placed < totalInstances; c++) {
      const angle = Math.random() * Math.PI * 2;
      const rad = 1.8 + Math.random() * 4.2;
      const x = treePos.x + Math.cos(angle) * rad;
      const z = treePos.z + Math.sin(angle) * rad;
      const scale = 0.75 + Math.random() * 0.6;
      const rot = Math.random() * Math.PI * 2;

      dummy.position.set(x, 0.1, z);
      dummy.rotation.set(0, rot, 0);
      dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(placed, dummy.matrix);

      baseRotations[placed] = rot;
      basePositions[placed * 3] = x;
      basePositions[placed * 3 + 1] = 0.1;
      basePositions[placed * 3 + 2] = z;
      swayFrequencies[placed] = Math.random() * 1.5 + 2.0;
      placed++;
    }
  }

  // 3. Trailside Foliage & Open Meadow Wild Grass Tufts
  while (placed < totalInstances) {
    const x = (Math.random() - 0.5) * 750;
    const z = (Math.random() - 0.5) * 750;
    if (Math.hypot(x, z) < 30) continue; // Keep inner courtyard clean

    const scale = 0.7 + Math.random() * 0.6;
    const rot = Math.random() * Math.PI * 2;

    dummy.position.set(x, 0.1, z);
    dummy.rotation.set(0, rot, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(placed, dummy.matrix);

    baseRotations[placed] = rot;
    basePositions[placed * 3] = x;
    basePositions[placed * 3 + 1] = 0.1;
    basePositions[placed * 3 + 2] = z;
    swayFrequencies[placed] = Math.random() * 1.5 + 2.0;
    placed++;
  }

  instancedMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedMesh);

  let windTime = 0;

  // Gentle wind sway animation for living vegetation
  function updateVegetation(dt: number) {
    windTime += dt;
    // Animate a subset per frame for ultra-fast 60+ FPS performance
    const step = 4;
    const offset = Math.floor(windTime * 60) % step;

    for (let i = offset; i < totalInstances; i += step) {
      const freq = swayFrequencies[i];
      const windSway = Math.sin(windTime * freq + i * 0.2) * 0.12;

      dummy.position.set(
        basePositions[i * 3],
        basePositions[i * 3 + 1],
        basePositions[i * 3 + 2]
      );
      dummy.rotation.set(windSway, baseRotations[i], windSway * 0.5);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
  }

  return { mesh: instancedMesh, update: updateVegetation };
}

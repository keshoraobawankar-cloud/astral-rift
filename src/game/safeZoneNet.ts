import * as THREE from 'three';

/**
 * Creates the Free Fire style Battle Royale Safe Zone Energy Net Barrier
 * surrounding the circular perimeter (radius 130m).
 * - Tall cylindrical translucent hexagonal electric forcefield net
 * - Top & bottom glowing neon laser perimeter rings
 * - 24 perimeter energy emitter pylons with glowing beacon nodes
 * - Electric pulse wave and scanline shader animation
 */
export function createSafeZoneNet(scene: THREE.Scene, radius = 130, height = 28): {
  netGroup: THREE.Group;
  updateNet: (delta: number, elapsed: number) => void;
} {
  const netGroup = new THREE.Group();
  netGroup.name = 'safe_zone_net_barrier';

  // 1. Procedural Hexagonal / Wireframe Energy Net Texture
  function createHexEnergyNetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark transparent background
      ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
      ctx.fillRect(0, 0, 512, 512);

      // Digital honeycomb / diamond net grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)'; // Radiant cyan
      ctx.lineWidth = 2.5;

      const gridSize = 32;
      for (let x = 0; x <= 512; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 16, 256);
        ctx.lineTo(x, 512);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 16, 0);
        ctx.lineTo(x, 256);
        ctx.lineTo(x + 16, 512);
        ctx.stroke();
      }

      // Horizontal laser scanline pulses
      for (let y = 0; y <= 512; y += 64) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.9)'; // Arcane violet laser band
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // Hexagonal accent nodes
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      for (let y = 0; y <= 512; y += 64) {
        for (let x = 0; x <= 512; x += 64) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(24, 4);
    return tex;
  }

  const netTexture = createHexEnergyNetTexture();

  // Vertical Cylindrical Safe Zone Net Wall
  const wallGeo = new THREE.CylinderGeometry(radius, radius, height, 64, 8, true);
  const wallMat = new THREE.MeshBasicMaterial({
    map: netTexture,
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const netWall = new THREE.Mesh(wallGeo, wallMat);
  netWall.position.y = height / 2;
  netGroup.add(netWall);

  // Secondary Internal Shimmering Pulse Layer
  const innerWallGeo = new THREE.CylinderGeometry(radius - 0.4, radius - 0.4, height, 48, 4, true);
  const innerWallMat = new THREE.MeshBasicMaterial({
    color: 0x818cf8, // Indigo electric glow
    transparent: true,
    opacity: 0.22,
    wireframe: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerNetWall = new THREE.Mesh(innerWallGeo, innerWallMat);
  innerNetWall.position.y = height / 2;
  netGroup.add(innerNetWall);

  // 2. GLOWING NEON LASER PERIMETER RINGS (Top & Bottom)
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff, // Laser cyan
  });
  const violetRingMat = new THREE.MeshBasicMaterial({
    color: 0xc084fc, // Neon violet
  });

  // Top Neon Ring
  const topRingGeo = new THREE.TorusGeometry(radius, 0.45, 12, 64);
  const topRing = new THREE.Mesh(topRingGeo, ringMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = height;
  netGroup.add(topRing);

  // Mid Neon Energy Band
  const midRingGeo = new THREE.TorusGeometry(radius, 0.35, 12, 64);
  const midRing = new THREE.Mesh(midRingGeo, violetRingMat);
  midRing.rotation.x = Math.PI / 2;
  midRing.position.y = height / 2;
  netGroup.add(midRing);

  // Bottom Ground Laser Ring
  const botRingGeo = new THREE.TorusGeometry(radius, 0.5, 12, 64);
  const botRing = new THREE.Mesh(botRingGeo, ringMat);
  botRing.rotation.x = Math.PI / 2;
  botRing.position.y = 0.4;
  netGroup.add(botRing);

  // 3. 24 PERIMETER ENERGY EMITTER PYLONS
  const pylonCount = 24;
  const pylonMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.2,
  });
  const beaconGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  for (let i = 0; i < pylonCount; i++) {
    const angle = (i / pylonCount) * Math.PI * 2;
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;

    const pylon = new THREE.Group();
    pylon.position.set(px, 0, pz);

    // Vertical Pylon Column
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, height + 1.5, 8), pylonMat);
    col.position.y = (height + 1.5) / 2;
    col.castShadow = true;
    pylon.add(col);

    // Glowing Laser Beacon Sphere at the pinnacle
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), beaconGlowMat);
    beacon.position.y = height + 1.5;
    pylon.add(beacon);

    // Vertical laser strip running up the pylon
    const laserStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, height, 0.12),
      beaconGlowMat
    );
    laserStrip.position.y = height / 2;
    pylon.add(laserStrip);

    netGroup.add(pylon);
  }

  scene.add(netGroup);

  return {
    netGroup,
    updateNet: (_delta: number, elapsed: number) => {
      // Scroll the hexagonal electric net texture vertically to simulate active scanning
      netTexture.offset.y = (elapsed * 0.12) % 1.0;
      netTexture.offset.x = (elapsed * 0.03) % 1.0;

      // Pulse opacity softly like a living forcefield
      wallMat.opacity = 0.38 + Math.sin(elapsed * 2.8) * 0.08;
      innerWallMat.opacity = 0.2 + Math.sin(elapsed * 3.4 + 1.0) * 0.06;

      // Color cycle shimmer between electric cyan and violet
      const hue = 0.54 + Math.sin(elapsed * 0.6) * 0.08;
      wallMat.color.setHSL(hue, 1.0, 0.6);
      ringMat.color.setHSL(hue, 1.0, 0.65);
    },
  };
}

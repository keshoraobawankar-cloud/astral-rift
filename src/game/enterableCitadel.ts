import * as THREE from 'three';

export interface EnterableBuildingConfig {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  roofHeight: number;
  rotationY: number;
  wallColor: number;
  roofColor: number;
  trimColor?: number;
  interiorLightColor?: number;
  buildingType:
    | 'tavern'
    | 'blacksmith'
    | 'alchemist'
    | 'guild_hall'
    | 'mage_spire'
    | 'armory'
    | 'shrine'
    | 'treasury'
    | 'bazaar_stall'
    | 'barracks'
    | 'cottage'
    | 'library'
    | 'healer'
    | 'bastion_keep'
    | 'artisan_workshop'
    | 'watchtower';
}

/**
 * Builds a walk-in enterable 3D building with hollow interior,
 * floor, three solid walls, front wall with open doorway arch,
 * roof, interior point lighting, and theme-specific interior furnishings.
 */
function createWalkInBuilding(
  config: EnterableBuildingConfig,
  materials: {
    stoneWall: THREE.Material;
    timberWall: THREE.Material;
    plasterWall: THREE.Material;
    woodFloor: THREE.Material;
    stoneFloor: THREE.Material;
    woodFurniture: THREE.Material;
    metal: THREE.Material;
    glowAmber: THREE.Material;
    glowCyan: THREE.Material;
    glowPurple: THREE.Material;
    glowGold: THREE.Material;
    clothRed: THREE.Material;
    clothBlue: THREE.Material;
  }
): THREE.Group {
  const buildingGroup = new THREE.Group();
  buildingGroup.name = `building_${config.id}`;
  buildingGroup.position.set(config.x, 0.2, config.z);
  buildingGroup.rotation.y = config.rotationY;

  const { width, depth, height, roofHeight } = config;
  const wallThick = 0.35;
  const doorWidth = Math.min(2.8, width * 0.4);
  const doorHeight = Math.min(3.4, height * 0.65);

  // Choose materials based on building type
  const isMasonry = ['shrine', 'mage_spire', 'bastion_keep', 'treasury', 'blacksmith'].includes(config.buildingType);
  const isPlaster = ['cottage', 'healer', 'library'].includes(config.buildingType);

  const wallMat = isMasonry
    ? materials.stoneWall
    : isPlaster
    ? materials.plasterWall
    : materials.timberWall;

  const floorMat = isMasonry ? materials.stoneFloor : materials.woodFloor;

  // Custom colored roof material
  const roofMat = new THREE.MeshStandardMaterial({
    color: config.roofColor,
    roughness: 0.65,
    metalness: 0.15,
  });

  // 1. FLOOR SLAB (Slightly raised inside)
  const floorGeo = new THREE.BoxGeometry(width, 0.2, depth);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = 0.1;
  floorMesh.receiveShadow = true;
  buildingGroup.add(floorMesh);

  // 2. BACK WALL (Solid)
  const backWallGeo = new THREE.BoxGeometry(width, height, wallThick);
  const backWall = new THREE.Mesh(backWallGeo, wallMat);
  backWall.position.set(0, height / 2, -depth / 2 + wallThick / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  buildingGroup.add(backWall);

  // 3. LEFT WALL (Solid)
  const leftWallGeo = new THREE.BoxGeometry(wallThick, height, depth);
  const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
  leftWall.position.set(-width / 2 + wallThick / 2, height / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  buildingGroup.add(leftWall);

  // 4. RIGHT WALL (Solid)
  const rightWallGeo = new THREE.BoxGeometry(wallThick, height, depth);
  const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
  rightWall.position.set(width / 2 - wallThick / 2, height / 2, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  buildingGroup.add(rightWall);

  // 5. FRONT WALL WITH OPEN DOORWAY ARCH
  const frontSegmentWidth = (width - doorWidth) / 2;

  // Front-Left Wall
  const frontLeftGeo = new THREE.BoxGeometry(frontSegmentWidth, height, wallThick);
  const frontLeft = new THREE.Mesh(frontLeftGeo, wallMat);
  frontLeft.position.set(-width / 2 + frontSegmentWidth / 2, height / 2, depth / 2 - wallThick / 2);
  frontLeft.castShadow = true;
  frontLeft.receiveShadow = true;
  buildingGroup.add(frontLeft);

  // Front-Right Wall
  const frontRightGeo = new THREE.BoxGeometry(frontSegmentWidth, height, wallThick);
  const frontRight = new THREE.Mesh(frontRightGeo, wallMat);
  frontRight.position.set(width / 2 - frontSegmentWidth / 2, height / 2, depth / 2 - wallThick / 2);
  frontRight.castShadow = true;
  frontRight.receiveShadow = true;
  buildingGroup.add(frontRight);

  // Door Lintel (Overhead bridge above doorway)
  const lintelHeight = height - doorHeight;
  if (lintelHeight > 0) {
    const lintelGeo = new THREE.BoxGeometry(doorWidth, lintelHeight, wallThick * 1.2);
    const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
    lintelMesh.position.set(0, doorHeight + lintelHeight / 2, depth / 2 - wallThick / 2);
    lintelMesh.castShadow = true;
    lintelMesh.receiveShadow = true;
    buildingGroup.add(lintelMesh);
  }

  // Wooden Doorframe Posts
  const postGeo = new THREE.BoxGeometry(0.28, doorHeight, 0.45);
  const postL = new THREE.Mesh(postGeo, materials.woodFurniture);
  postL.position.set(-doorWidth / 2 + 0.14, doorHeight / 2, depth / 2);
  postL.castShadow = true;
  buildingGroup.add(postL);

  const postR = new THREE.Mesh(postGeo, materials.woodFurniture);
  postR.position.set(doorWidth / 2 - 0.14, doorHeight / 2, depth / 2);
  postR.castShadow = true;
  buildingGroup.add(postR);

  // 6. GABLED ROOF / OVERHANG
  const roofGroup = new THREE.Group();
  roofGroup.position.set(0, height, 0);

  const roofOverhang = 0.6;
  const roofW = width / 2 + roofOverhang;
  const roofSlopeLen = Math.hypot(roofW, roofHeight);
  const roofAngle = Math.atan2(roofHeight, roofW);

  // Left roof pitch
  const roofLeftGeo = new THREE.BoxGeometry(roofSlopeLen, 0.22, depth + roofOverhang * 2);
  const roofLeft = new THREE.Mesh(roofLeftGeo, roofMat);
  roofLeft.position.set(-roofW / 2, roofHeight / 2, 0);
  roofLeft.rotation.z = roofAngle;
  roofLeft.castShadow = true;
  roofLeft.receiveShadow = true;
  roofGroup.add(roofLeft);

  // Right roof pitch
  const roofRightGeo = new THREE.BoxGeometry(roofSlopeLen, 0.22, depth + roofOverhang * 2);
  const roofRight = new THREE.Mesh(roofRightGeo, roofMat);
  roofRight.position.set(roofW / 2, roofHeight / 2, 0);
  roofRight.rotation.z = -roofAngle;
  roofRight.castShadow = true;
  roofRight.receiveShadow = true;
  roofGroup.add(roofRight);

  // Gable end triangles (Front & Back)
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-width / 2, 0);
  gableShape.lineTo(width / 2, 0);
  gableShape.lineTo(0, roofHeight);
  gableShape.closePath();
  const gableGeo = new THREE.ShapeGeometry(gableShape);

  const gableFront = new THREE.Mesh(gableGeo, wallMat);
  gableFront.position.set(0, 0, depth / 2 - wallThick / 2);
  roofGroup.add(gableFront);

  const gableBack = new THREE.Mesh(gableGeo, wallMat);
  gableBack.position.set(0, 0, -depth / 2 + wallThick / 2);
  gableBack.rotation.y = Math.PI;
  roofGroup.add(gableBack);

  // Roof ridge beam
  const ridgeGeo = new THREE.BoxGeometry(0.35, 0.35, depth + roofOverhang * 2.2);
  const ridge = new THREE.Mesh(ridgeGeo, materials.woodFurniture);
  ridge.position.set(0, roofHeight + 0.1, 0);
  ridge.castShadow = true;
  roofGroup.add(ridge);

  buildingGroup.add(roofGroup);

  // 7. ENTRANCE SHOP SIGN & OUTSIDE LANTERNS
  const signGeo = new THREE.BoxGeometry(doorWidth * 0.8, 0.55, 0.08);
  const signMesh = new THREE.Mesh(signGeo, materials.woodFurniture);
  signMesh.position.set(0, doorHeight + 0.45, depth / 2 + 0.15);
  buildingGroup.add(signMesh);

  // 7. ORNATE ENTRANCE STREET LIGHT LAMPS (Bright street lamp posts outside the house)
  const lampPostGeo = new THREE.CylinderGeometry(0.1, 0.15, 2.8, 8);
  const lampCapGeo = new THREE.ConeGeometry(0.32, 0.2, 6);
  const lampGlassGeo = new THREE.OctahedronGeometry(0.26);

  // Left Street Light Lamp Post outside door
  const lampPostL = new THREE.Mesh(lampPostGeo, materials.metal);
  lampPostL.position.set(-doorWidth / 2 - 0.8, 1.4, depth / 2 + 0.6);
  lampPostL.castShadow = true;
  const lampLanternL = new THREE.Mesh(lampGlassGeo, materials.glowGold);
  lampLanternL.position.set(-doorWidth / 2 - 0.8, 2.9, depth / 2 + 0.6);
  const lampCapL = new THREE.Mesh(lampCapGeo, materials.metal);
  lampCapL.position.set(-doorWidth / 2 - 0.8, 3.1, depth / 2 + 0.6);
  const streetLightL = new THREE.PointLight(0xfbbf24, 2.5, 16);
  streetLightL.position.set(-doorWidth / 2 - 0.8, 2.9, depth / 2 + 0.6);

  buildingGroup.add(lampPostL);
  buildingGroup.add(lampLanternL);
  buildingGroup.add(lampCapL);
  buildingGroup.add(streetLightL);

  // Right Street Light Lamp Post outside door
  const lampPostR = new THREE.Mesh(lampPostGeo, materials.metal);
  lampPostR.position.set(doorWidth / 2 + 0.8, 1.4, depth / 2 + 0.6);
  lampPostR.castShadow = true;
  const lampLanternR = new THREE.Mesh(lampGlassGeo, materials.glowGold);
  lampLanternR.position.set(doorWidth / 2 + 0.8, 2.9, depth / 2 + 0.6);
  const lampCapR = new THREE.Mesh(lampCapGeo, materials.metal);
  lampCapR.position.set(doorWidth / 2 + 0.8, 3.1, depth / 2 + 0.6);
  const streetLightR = new THREE.PointLight(0xfbbf24, 2.5, 16);
  streetLightR.position.set(doorWidth / 2 + 0.8, 2.9, depth / 2 + 0.6);

  buildingGroup.add(lampPostR);
  buildingGroup.add(lampLanternR);
  buildingGroup.add(lampCapR);
  buildingGroup.add(streetLightR);

  // 8. BRIGHT INTERIOR ILLUMINATION (Multiple Radiant PointLights inside each house)
  const lightColor = config.interiorLightColor || 0xfacc15;

  // Primary High-Intensity Chandelier Light
  const interiorLight = new THREE.PointLight(lightColor, 4.5, Math.max(width, depth) * 2.8);
  interiorLight.position.set(0, height * 0.75, 0);
  buildingGroup.add(interiorLight);

  // Secondary Warm Fill Ambient Light (ensures all corners and floors are brightly visible)
  const interiorFillLight = new THREE.PointLight(0xffedd5, 3.0, Math.max(width, depth) * 2.2);
  interiorFillLight.position.set(0, 1.8, -depth * 0.15);
  buildingGroup.add(interiorFillLight);

  // Hanging Grand Chandelier Lantern Fixture inside
  const chandelier = new THREE.Mesh(new THREE.DodecahedronGeometry(0.42), materials.glowGold);
  chandelier.position.set(0, height * 0.82, 0);
  buildingGroup.add(chandelier);

  // Interior Wall Sconces (Left and Right interior walls)
  const sconceL = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), materials.glowAmber);
  sconceL.position.set(-width / 2 + wallThick + 0.15, height * 0.6, 0);
  buildingGroup.add(sconceL);

  const sconceR = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), materials.glowAmber);
  sconceR.position.set(width / 2 - wallThick - 0.15, height * 0.6, 0);
  buildingGroup.add(sconceR);

  // 9. THEMED INTERIOR FURNISHINGS (Walk-in interactive details)
  const interior = new THREE.Group();

  switch (config.buildingType) {
    case 'tavern': {
      // Long Wooden Bar Counter
      const barCounter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 1.05, 0.85), materials.woodFurniture);
      barCounter.position.set(0, 0.55, -depth * 0.25);
      barCounter.castShadow = true;
      interior.add(barCounter);

      // Barstools
      for (let s = -2; s <= 2; s++) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.65, 8), materials.woodFurniture);
        stool.position.set(s * 1.1, 0.35, -depth * 0.25 + 0.85);
        interior.add(stool);
      }

      // Stone Fireplace & Chimney
      const hearth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 1.0), materials.stoneWall);
      hearth.position.set(-width * 0.35, 1.0, 0);
      const ember = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), materials.glowAmber);
      ember.position.set(-width * 0.35, 0.5, 0.2);
      interior.add(hearth);
      interior.add(ember);

      // Tavern Dining Tables
      const table1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.8, 12), materials.woodFurniture);
      table1.position.set(width * 0.25, 0.45, depth * 0.15);
      interior.add(table1);

      // Cask Barrels
      for (let b = 0; b < 3; b++) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.1, 10), materials.woodFurniture);
        barrel.position.set(width * 0.38, 0.55, -depth * 0.35 + b * 0.8);
        interior.add(barrel);
      }
      break;
    }

    case 'blacksmith': {
      // Blazing Forge Hearth
      const forgeHearth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 1.8), materials.stoneWall);
      forgeHearth.position.set(0, 0.8, -depth * 0.3);
      const forgeFlame = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6), materials.glowAmber);
      forgeFlame.position.set(0, 1.2, -depth * 0.3);
      interior.add(forgeHearth);
      interior.add(forgeFlame);

      // Heavy Iron Anvil
      const anvilBase = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.6, 8), materials.metal);
      anvilBase.position.set(0, 0.3, depth * 0.05);
      const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.5), materials.metal);
      anvilTop.position.set(0, 0.75, depth * 0.05);
      interior.add(anvilBase);
      interior.add(anvilTop);

      // Quenching Water Trough
      const trough = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.8), materials.stoneWall);
      trough.position.set(-width * 0.35, 0.35, 0);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.6), materials.glowCyan);
      water.rotation.x = -Math.PI / 2;
      water.position.set(-width * 0.35, 0.68, 0);
      interior.add(trough);
      interior.add(water);

      // Weapon Rack
      const weaponRack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 0.3), materials.woodFurniture);
      weaponRack.position.set(width * 0.35, 0.9, 0);
      interior.add(weaponRack);
      break;
    }

    case 'alchemist': {
      // Alchemical Cauldron on Pedestal
      const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), materials.metal);
      cauldron.position.set(0, 0.75, -depth * 0.15);
      const liquid = new THREE.Mesh(new THREE.CircleGeometry(0.65, 12), materials.glowPurple);
      liquid.rotation.x = -Math.PI / 2;
      liquid.position.set(0, 1.2, -depth * 0.15);
      interior.add(cauldron);
      interior.add(liquid);

      // Herb & Potion Shelves along side walls
      const shelfL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, depth * 0.6), materials.woodFurniture);
      shelfL.position.set(-width * 0.38, 1.25, 0);
      interior.add(shelfL);

      // Glowing Potion Bottles
      for (let p = 0; p < 4; p++) {
        const bottleMat = p % 2 === 0 ? materials.glowCyan : materials.glowPurple;
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.35, 6), bottleMat);
        bottle.position.set(-width * 0.35, 1.4 + (p % 2) * 0.7, -depth * 0.15 + p * 0.3);
        interior.add(bottle);
      }

      // Alchemist Lab Table
      const labTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.1), materials.woodFurniture);
      labTable.position.set(width * 0.25, 0.45, depth * 0.1);
      interior.add(labTable);
      break;
    }

    case 'guild_hall': {
      // Long Guildmaster Council Table
      const councilTable = new THREE.Mesh(new THREE.BoxGeometry(width * 0.65, 0.85, 1.8), materials.woodFurniture);
      councilTable.position.set(0, 0.45, 0);
      interior.add(councilTable);

      // High Council Chairs
      for (let c = -2; c <= 2; c++) {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), materials.woodFurniture);
        chair.position.set(c * 1.4, 0.6, -1.2);
        interior.add(chair);
      }

      // Guild Standard Banner on back wall
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.2), materials.clothRed);
      banner.position.set(0, height * 0.6, -depth / 2 + 0.38);
      interior.add(banner);

      // Quest Notice Board on left wall
      const questBoard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 2.4), materials.woodFurniture);
      questBoard.position.set(-width / 2 + 0.38, 1.8, 0);
      interior.add(questBoard);
      break;
    }

    case 'mage_spire': {
      // Central Floating Arcane Crystal
      const centralCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.75), materials.glowCyan);
      centralCrystal.position.set(0, 1.8, 0);
      interior.add(centralCrystal);

      // Leyline Floor Inlay Ring
      const leyRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.6, 24), materials.glowPurple);
      leyRing.rotation.x = -Math.PI / 2;
      leyRing.position.set(0, 0.21, 0);
      interior.add(leyRing);

      // Arcane Scholar Desk & Scroll
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 1.0), materials.woodFurniture);
      desk.position.set(width * 0.28, 0.45, -depth * 0.2);
      interior.add(desk);

      // Bookshelves
      const bookStack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.8, 2.4), materials.woodFurniture);
      bookStack.position.set(-width * 0.38, 1.4, 0);
      interior.add(bookStack);
      break;
    }

    case 'armory': {
      // 3 Stand-up Weapon Racks with Swords
      for (let r = 0; r < 3; r++) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 0.35), materials.woodFurniture);
        rack.position.set(-width * 0.3 + r * 1.6, 0.8, -depth * 0.3);
        interior.add(rack);
      }

      // Armor Display Stand
      const armorStand = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.6, 8), materials.metal);
      armorStand.position.set(-width * 0.35, 0.8, depth * 0.1);
      interior.add(armorStand);

      // Training Post
      const dummy = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.8, 8), materials.woodFurniture);
      dummy.position.set(width * 0.35, 0.9, depth * 0.1);
      interior.add(dummy);
      break;
    }

    case 'shrine': {
      // Sacred Sun Altar
      const altar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.2), materials.stoneWall);
      altar.position.set(0, 0.6, -depth * 0.3);
      const sunburst = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), materials.glowGold);
      sunburst.position.set(0, 1.8, -depth * 0.3);
      interior.add(altar);
      interior.add(sunburst);

      // 4 Prayer Benches / Pews
      for (let p = 0; p < 2; p++) {
        const benchL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.5), materials.woodFurniture);
        benchL.position.set(-1.4, 0.25, -depth * 0.05 + p * 1.5);
        const benchR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.5), materials.woodFurniture);
        benchR.position.set(1.4, 0.25, -depth * 0.05 + p * 1.5);
        interior.add(benchL);
        interior.add(benchR);
      }
      break;
    }

    case 'treasury': {
      // Iron-Banded Treasure Chests
      for (let c = 0; c < 3; c++) {
        const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.7), materials.metal);
        chest.position.set(-1.4 + c * 1.4, 0.4, -depth * 0.25);
        const goldPiles = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.5), materials.glowGold);
        goldPiles.position.set(-1.4 + c * 1.4, 0.85, -depth * 0.25);
        interior.add(chest);
        interior.add(goldPiles);
      }
      // Vault Pedestal
      const vaultPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.0, 8), materials.stoneWall);
      vaultPedestal.position.set(0, 0.5, depth * 0.1);
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), materials.glowCyan);
      gem.position.set(0, 1.2, depth * 0.1);
      interior.add(vaultPedestal);
      interior.add(gem);
      break;
    }

    case 'bazaar_stall': {
      // Merchant Market Stalls
      const stallCounter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.9, 1.0), materials.woodFurniture);
      stallCounter.position.set(0, 0.45, -depth * 0.15);
      interior.add(stallCounter);

      // Crates of Cargo & Goods
      for (let cr = 0; cr < 4; cr++) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), materials.woodFurniture);
        crate.position.set(-width * 0.35 + (cr % 2) * 0.8, 0.35, depth * 0.1 + Math.floor(cr / 2) * 0.8);
        interior.add(crate);
      }
      break;
    }

    case 'barracks': {
      // 3 Bunk Beds
      for (let b = 0; b < 3; b++) {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 2.2), materials.woodFurniture);
        bed.position.set(-width * 0.32 + b * 1.8, 0.3, -depth * 0.25);
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.6), materials.clothBlue);
        blanket.position.set(-width * 0.32 + b * 1.8, 0.65, -depth * 0.25);
        interior.add(bed);
        interior.add(blanket);
      }
      // Tactical Map Table
      const mapTable = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 1.2), materials.woodFurniture);
      mapTable.position.set(0, 0.45, depth * 0.15);
      interior.add(mapTable);
      break;
    }

    case 'library': {
      // Giant Bookcases
      const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.8, depth * 0.7), materials.woodFurniture);
      shelf1.position.set(-width * 0.38, 1.4, 0);
      const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.8, depth * 0.7), materials.woodFurniture);
      shelf2.position.set(width * 0.38, 1.4, 0);
      interior.add(shelf1);
      interior.add(shelf2);

      // Reading Lectern & Desk
      const lectern = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.2), materials.woodFurniture);
      lectern.position.set(0, 0.45, 0);
      const openScroll = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), materials.glowAmber);
      openScroll.rotation.x = -Math.PI / 2;
      openScroll.position.set(0, 0.92, 0);
      interior.add(lectern);
      interior.add(openScroll);
      break;
    }

    case 'healer': {
      // Medical Recovery Cots
      for (let c = 0; c < 2; c++) {
        const cot = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 2.2), materials.woodFurniture);
        cot.position.set(-width * 0.28 + c * 2.4, 0.25, -depth * 0.2);
        const whiteSheet = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.1, 1.8), materials.plasterWall);
        whiteSheet.position.set(-width * 0.28 + c * 2.4, 0.55, -depth * 0.2);
        interior.add(cot);
        interior.add(whiteSheet);
      }
      // Soothing Herb Basin
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.8, 12), materials.stoneWall);
      basin.position.set(0, 0.4, depth * 0.15);
      const basinWater = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), materials.glowCyan);
      basinWater.rotation.x = -Math.PI / 2;
      basinWater.position.set(0, 0.81, depth * 0.15);
      interior.add(basin);
      interior.add(basinWater);
      break;
    }

    case 'bastion_keep': {
      // Fortified Gatehouse Arch & Guard Posts
      const guardPostL = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 1.0), materials.stoneWall);
      guardPostL.position.set(-width * 0.32, 0.7, 0);
      const guardPostR = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 1.0), materials.stoneWall);
      guardPostR.position.set(width * 0.32, 0.7, 0);
      interior.add(guardPostL);
      interior.add(guardPostR);

      // Weapon Cache Chests
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 0.8), materials.metal);
      crate.position.set(0, 0.4, -depth * 0.3);
      interior.add(crate);
      break;
    }

    case 'artisan_workshop': {
      // Crafting Benches
      const bench = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, 0.9, 1.2), materials.woodFurniture);
      bench.position.set(0, 0.45, -depth * 0.2);
      interior.add(bench);
      // Tool chest
      const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.7), materials.woodFurniture);
      chest.position.set(width * 0.32, 0.35, depth * 0.1);
      interior.add(chest);
      break;
    }

    case 'cottage':
    default: {
      // Cozy Residential Sleeping Bed
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 2.2), materials.woodFurniture);
      bed.position.set(-width * 0.3, 0.25, -depth * 0.25);
      const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 1.6), materials.clothRed);
      blanket.position.set(-width * 0.3, 0.55, -depth * 0.25);
      interior.add(bed);
      interior.add(blanket);

      // Hearth Fireplace
      const fireplace = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 0.8), materials.stoneWall);
      fireplace.position.set(width * 0.3, 0.8, -depth * 0.3);
      const hearthFire = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), materials.glowAmber);
      hearthFire.position.set(width * 0.3, 0.4, -depth * 0.3 + 0.3);
      interior.add(fireplace);
      interior.add(hearthFire);

      // Small Dining Table & Stool
      const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 1.0), materials.woodFurniture);
      table.position.set(0, 0.38, depth * 0.15);
      const stool = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.45), materials.woodFurniture);
      stool.position.set(0, 0.2, depth * 0.15 + 0.85);
      interior.add(table);
      interior.add(stool);
      break;
    }
  }

  buildingGroup.add(interior);
  return buildingGroup;
}

/**
 * Creates the complete Imperial Citadel settlement inside the enlarged dark stone courtyard:
 * - 24 walk-in enterable 3D buildings (tavern, forge, alchemy, guild, spire, armory, shrine, treasury, bazaar, cottages)
 * - Grand central fountain plaza with leylines monument
 * - Cobblestone radial boulevards and avenue rings
 * - Warm street lanterns along all avenues
 */
export const CITADEL_BUILDING_CONFIGS: EnterableBuildingConfig[] = [
    // --- INNER RING (R ~ 48m - 56m) ---
    {
      id: 'tavern_inn',
      name: 'The Prancing Gryphon Tavern',
      x: Math.cos(-0.15 * Math.PI) * 50,
      z: Math.sin(-0.15 * Math.PI) * 50,
      width: 14,
      depth: 13,
      height: 6.5,
      roofHeight: 4.0,
      rotationY: Math.atan2(-Math.sin(-0.15 * Math.PI), -Math.cos(-0.15 * Math.PI)) + Math.PI,
      wallColor: 0x78350f,
      roofColor: 0x991b1b, // Rich crimson roof
      interiorLightColor: 0xf59e0b,
      buildingType: 'tavern',
    },
    {
      id: 'blacksmith_forge',
      name: 'Ironpeak Grand Forge',
      x: Math.cos(0.18 * Math.PI) * 52,
      z: Math.sin(0.18 * Math.PI) * 52,
      width: 13,
      depth: 12,
      height: 6.0,
      roofHeight: 3.5,
      rotationY: Math.atan2(-Math.sin(0.18 * Math.PI), -Math.cos(0.18 * Math.PI)) + Math.PI,
      wallColor: 0x334155,
      roofColor: 0x475569, // Dark slate roof
      interiorLightColor: 0xf97316,
      buildingType: 'blacksmith',
    },
    {
      id: 'guild_hall',
      name: 'Hunter Monarch Guildhall',
      x: Math.cos(0.48 * Math.PI) * 54,
      z: Math.sin(0.48 * Math.PI) * 54,
      width: 16,
      depth: 14,
      height: 7.2,
      roofHeight: 4.5,
      rotationY: Math.atan2(-Math.sin(0.48 * Math.PI), -Math.cos(0.48 * Math.PI)) + Math.PI,
      wallColor: 0x475569,
      roofColor: 0x1e3a8a, // Regal cobalt roof
      interiorLightColor: 0xfacc15,
      buildingType: 'guild_hall',
    },
    {
      id: 'alchemist_lab',
      name: 'Astral Leyline Apothecary',
      x: Math.cos(0.78 * Math.PI) * 50,
      z: Math.sin(0.78 * Math.PI) * 50,
      width: 12,
      depth: 12,
      height: 6.0,
      roofHeight: 3.8,
      rotationY: Math.atan2(-Math.sin(0.78 * Math.PI), -Math.cos(0.78 * Math.PI)) + Math.PI,
      wallColor: 0x64748b,
      roofColor: 0x6b21a8, // Mystical violet roof
      interiorLightColor: 0xa855f7,
      buildingType: 'alchemist',
    },
    {
      id: 'imperial_armory',
      name: 'Citadel Arsenal & Armory',
      x: Math.cos(1.08 * Math.PI) * 52,
      z: Math.sin(1.08 * Math.PI) * 52,
      width: 14,
      depth: 12,
      height: 6.2,
      roofHeight: 3.6,
      rotationY: Math.atan2(-Math.sin(1.08 * Math.PI), -Math.cos(1.08 * Math.PI)) + Math.PI,
      wallColor: 0x334155,
      roofColor: 0x1e293b,
      interiorLightColor: 0xf59e0b,
      buildingType: 'armory',
    },
    {
      id: 'shrine_light',
      name: 'Cathedral of the Sunken Sun',
      x: Math.cos(1.38 * Math.PI) * 55,
      z: Math.sin(1.38 * Math.PI) * 55,
      width: 16,
      depth: 15,
      height: 8.0,
      roofHeight: 5.0,
      rotationY: Math.atan2(-Math.sin(1.38 * Math.PI), -Math.cos(1.38 * Math.PI)) + Math.PI,
      wallColor: 0x475569,
      roofColor: 0xd97706, // Radiant amber roof
      interiorLightColor: 0xfacc15,
      buildingType: 'shrine',
    },
    {
      id: 'bazaar_emporium_1',
      name: 'Grand Silk & Spice Bazaar',
      x: Math.cos(1.68 * Math.PI) * 50,
      z: Math.sin(1.68 * Math.PI) * 50,
      width: 13,
      depth: 11,
      height: 5.5,
      roofHeight: 3.2,
      rotationY: Math.atan2(-Math.sin(1.68 * Math.PI), -Math.cos(1.68 * Math.PI)) + Math.PI,
      wallColor: 0x78350f,
      roofColor: 0x047857, // Emerald green canopy roof
      interiorLightColor: 0xf59e0b,
      buildingType: 'bazaar_stall',
    },
    {
      id: 'bazaar_emporium_2',
      name: 'Runesmith Goods Exchange',
      x: Math.cos(1.88 * Math.PI) * 50,
      z: Math.sin(1.88 * Math.PI) * 50,
      width: 12,
      depth: 11,
      height: 5.5,
      roofHeight: 3.2,
      rotationY: Math.atan2(-Math.sin(1.88 * Math.PI), -Math.cos(1.88 * Math.PI)) + Math.PI,
      wallColor: 0x78350f,
      roofColor: 0x0e7490, // Cyan canopy roof
      interiorLightColor: 0x38bdf8,
      buildingType: 'bazaar_stall',
    },

    // --- MIDDLE RING (R ~ 80m - 88m) ---
    {
      id: 'mage_spire',
      name: 'High Archmage Sanctuary',
      x: Math.cos(0.04 * Math.PI) * 82,
      z: Math.sin(0.04 * Math.PI) * 82,
      width: 13,
      depth: 13,
      height: 9.0,
      roofHeight: 5.5,
      rotationY: Math.atan2(-Math.sin(0.04 * Math.PI), -Math.cos(0.04 * Math.PI)) + Math.PI,
      wallColor: 0x1e1b4b,
      roofColor: 0x4c1d95, // Deep arcane purple
      interiorLightColor: 0x38bdf8,
      buildingType: 'mage_spire',
    },
    {
      id: 'library_archives',
      name: 'Library of the Elders',
      x: Math.cos(0.24 * Math.PI) * 82,
      z: Math.sin(0.24 * Math.PI) * 82,
      width: 15,
      depth: 13,
      height: 6.8,
      roofHeight: 4.2,
      rotationY: Math.atan2(-Math.sin(0.24 * Math.PI), -Math.cos(0.24 * Math.PI)) + Math.PI,
      wallColor: 0x475569,
      roofColor: 0x1e3a8a,
      interiorLightColor: 0xf59e0b,
      buildingType: 'library',
    },
    {
      id: 'royal_treasury',
      name: 'Imperial Vault & Treasury',
      x: Math.cos(0.42 * Math.PI) * 85,
      z: Math.sin(0.42 * Math.PI) * 85,
      width: 14,
      depth: 13,
      height: 6.5,
      roofHeight: 3.8,
      rotationY: Math.atan2(-Math.sin(0.42 * Math.PI), -Math.cos(0.42 * Math.PI)) + Math.PI,
      wallColor: 0x1e293b,
      roofColor: 0x854d0e, // Bronze roof
      interiorLightColor: 0xfacc15,
      buildingType: 'treasury',
    },
    {
      id: 'healer_sanctuary',
      name: 'Sanctuary of Life & Restoration',
      x: Math.cos(0.62 * Math.PI) * 82,
      z: Math.sin(0.62 * Math.PI) * 82,
      width: 13,
      depth: 12,
      height: 6.2,
      roofHeight: 3.6,
      rotationY: Math.atan2(-Math.sin(0.62 * Math.PI), -Math.cos(0.62 * Math.PI)) + Math.PI,
      wallColor: 0x94a3b8,
      roofColor: 0x059669, // Healing jade green
      interiorLightColor: 0x34d399,
      buildingType: 'healer',
    },
    {
      id: 'barracks_east',
      name: 'East Vanguard Barracks',
      x: Math.cos(0.82 * Math.PI) * 84,
      z: Math.sin(0.82 * Math.PI) * 84,
      width: 15,
      depth: 13,
      height: 6.2,
      roofHeight: 3.6,
      rotationY: Math.atan2(-Math.sin(0.82 * Math.PI), -Math.cos(0.82 * Math.PI)) + Math.PI,
      wallColor: 0x475569,
      roofColor: 0x334155,
      interiorLightColor: 0xf59e0b,
      buildingType: 'barracks',
    },
    {
      id: 'cottage_1',
      name: 'Woodcarver Cottage',
      x: Math.cos(0.98 * Math.PI) * 80,
      z: Math.sin(0.98 * Math.PI) * 80,
      width: 11,
      depth: 10,
      height: 5.2,
      roofHeight: 3.2,
      rotationY: Math.atan2(-Math.sin(0.98 * Math.PI), -Math.cos(0.98 * Math.PI)) + Math.PI,
      wallColor: 0x78350f,
      roofColor: 0xb45309, // Terracotta orange
      interiorLightColor: 0xf59e0b,
      buildingType: 'cottage',
    },
    {
      id: 'cottage_2',
      name: 'Herbalist Cottage',
      x: Math.cos(1.16 * Math.PI) * 82,
      z: Math.sin(1.16 * Math.PI) * 82,
      width: 11,
      depth: 11,
      height: 5.2,
      roofHeight: 3.2,
      rotationY: Math.atan2(-Math.sin(1.16 * Math.PI), -Math.cos(1.16 * Math.PI)) + Math.PI,
      wallColor: 0x78350f,
      roofColor: 0x065f46, // Forest green
      interiorLightColor: 0xf59e0b,
      buildingType: 'cottage',
    },
    {
      id: 'cottage_3',
      name: 'Weaver Cottage',
      x: Math.cos(1.34 * Math.PI) * 82,
      z: Math.sin(1.34 * Math.PI) * 82,
      width: 11,
      depth: 10,
      height: 5.2,
      roofHeight: 3.2,
      rotationY: Math.atan2(-Math.sin(1.34 * Math.PI), -Math.cos(1.34 * Math.PI)) + Math.PI,
      wallColor: 0x78350f,
      roofColor: 0x1e3a8a, // Navy roof
      interiorLightColor: 0xf59e0b,
      buildingType: 'cottage',
    },
    {
      id: 'cottage_4',
      name: 'Cartographer Cottage',
      x: Math.cos(1.52 * Math.PI) * 80,
      z: Math.sin(1.52 * Math.PI) * 80,
      width: 11,
      depth: 11,
      height: 5.2,
      roofHeight: 3.2,
      rotationY: Math.atan2(-Math.sin(1.52 * Math.PI), -Math.cos(1.52 * Math.PI)) + Math.PI,
      wallColor: 0x78350f,
      roofColor: 0x701a75, // Plum roof
      interiorLightColor: 0xf59e0b,
      buildingType: 'cottage',
    },
    {
      id: 'barracks_west',
      name: 'West Sentinel Barracks',
      x: Math.cos(1.72 * Math.PI) * 84,
      z: Math.sin(1.72 * Math.PI) * 84,
      width: 15,
      depth: 13,
      height: 6.2,
      roofHeight: 3.6,
      rotationY: Math.atan2(-Math.sin(1.72 * Math.PI), -Math.cos(1.72 * Math.PI)) + Math.PI,
      wallColor: 0x475569,
      roofColor: 0x334155,
      interiorLightColor: 0xf59e0b,
      buildingType: 'barracks',
    },

    // --- OUTER RING (R ~ 106m - 116m) ---
    {
      id: 'cottage_5',
      name: 'Ranger Lodge',
      x: Math.cos(0.08 * Math.PI) * 108,
      z: Math.sin(0.08 * Math.PI) * 108,
      width: 12,
      depth: 11,
      height: 5.4,
      roofHeight: 3.4,
      rotationY: Math.atan2(-Math.sin(0.08 * Math.PI), -Math.cos(0.08 * Math.PI)) + Math.PI,
      wallColor: 0x78350f,
      roofColor: 0x14532d,
      interiorLightColor: 0xf59e0b,
      buildingType: 'cottage',
    },
    {
      id: 'cottage_6',
      name: 'Stonemason Lodge',
      x: Math.cos(0.28 * Math.PI) * 110,
      z: Math.sin(0.28 * Math.PI) * 110,
      width: 12,
      depth: 11,
      height: 5.4,
      roofHeight: 3.4,
      rotationY: Math.atan2(-Math.sin(0.28 * Math.PI), -Math.cos(0.28 * Math.PI)) + Math.PI,
      wallColor: 0x475569,
      roofColor: 0x334155,
      interiorLightColor: 0xf59e0b,
      buildingType: 'cottage',
    },
    {
      id: 'bastion_north',
      name: 'North Aegis Gatehouse',
      x: Math.cos(0.5 * Math.PI) * 114,
      z: Math.sin(0.5 * Math.PI) * 114,
      width: 18,
      depth: 14,
      height: 8.5,
      roofHeight: 4.5,
      rotationY: Math.atan2(-Math.sin(0.5 * Math.PI), -Math.cos(0.5 * Math.PI)) + Math.PI,
      wallColor: 0x1e293b,
      roofColor: 0x0f172a,
      interiorLightColor: 0xf59e0b,
      buildingType: 'bastion_keep',
    },
    {
      id: 'artisan_workshop',
      name: 'Master Leatherworker Guild',
      x: Math.cos(0.72 * Math.PI) * 110,
      z: Math.sin(0.72 * Math.PI) * 110,
      width: 12,
      depth: 11,
      height: 5.5,
      roofHeight: 3.4,
      rotationY: Math.atan2(-Math.sin(0.72 * Math.PI), -Math.cos(0.72 * Math.PI)) + Math.PI,
      wallColor: 0x78350f,
      roofColor: 0x854d0e,
      interiorLightColor: 0xf59e0b,
      buildingType: 'artisan_workshop',
    },
    {
      id: 'bastion_south',
      name: 'South Bastion Gatehouse',
      x: Math.cos(1.5 * Math.PI) * 114,
      z: Math.sin(1.5 * Math.PI) * 114,
      width: 18,
      depth: 14,
      height: 8.5,
      roofHeight: 4.5,
      rotationY: Math.atan2(-Math.sin(1.5 * Math.PI), -Math.cos(1.5 * Math.PI)) + Math.PI,
      wallColor: 0x1e293b,
      roofColor: 0x0f172a,
      interiorLightColor: 0xf59e0b,
      buildingType: 'bastion_keep',
    },
    {
      id: 'high_council_manor',
      name: 'Aethelgard High Council Manor',
      x: Math.cos(1.85 * Math.PI) * 110,
      z: Math.sin(1.85 * Math.PI) * 110,
      width: 17,
      depth: 15,
      height: 8.0,
      roofHeight: 4.8,
      rotationY: Math.atan2(-Math.sin(1.85 * Math.PI), -Math.cos(1.85 * Math.PI)) + Math.PI,
      wallColor: 0x334155,
      roofColor: 0x1e3a8a,
      interiorLightColor: 0xfacc15,
      buildingType: 'guild_hall',
    },
  ];

export function createEnterableCitadel(scene: THREE.Scene, rampTexture?: THREE.Texture): THREE.Group {
  const citadelGroup = new THREE.Group();
  citadelGroup.name = 'citadel_enterable_town';

  // Shared reusable materials
  const stoneWall = new THREE.MeshToonMaterial({
    color: 0x475569,
    gradientMap: rampTexture,
  });
  const timberWall = new THREE.MeshToonMaterial({
    color: 0x78350f,
    gradientMap: rampTexture,
  });
  const plasterWall = new THREE.MeshToonMaterial({
    color: 0x94a3b8,
    gradientMap: rampTexture,
  });
  const woodFloor = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.8,
  });
  const stoneFloor = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
  });
  const woodFurniture = new THREE.MeshStandardMaterial({
    color: 0x5c2e0b,
    roughness: 0.7,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.3,
  });
  const glowAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const glowCyan = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const glowPurple = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
  const glowGold = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const clothRed = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 });
  const clothBlue = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });

  const materials = {
    stoneWall,
    timberWall,
    plasterWall,
    woodFloor,
    stoneFloor,
    woodFurniture,
    metal,
    glowAmber,
    glowCyan,
    glowPurple,
    glowGold,
    clothRed,
    clothBlue,
  };

  // 1. GRAND CENTRAL FOUNTAIN & LEYLINE PLAZA
  const plazaCenter = new THREE.Group();
  plazaCenter.position.set(0, 0.2, 0);

  // Multi-tier Fountain Basin
  const basinOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(9.0, 9.5, 0.9, 32),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
  );
  basinOuter.position.y = 0.45;
  basinOuter.receiveShadow = true;
  plazaCenter.add(basinOuter);

  const waterSurface = new THREE.Mesh(
    new THREE.CircleGeometry(8.5, 32),
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
    })
  );
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = 0.85;
  plazaCenter.add(waterSurface);

  // Central Marble Obelisk Pedestal
  const centerPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 2.2, 3.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
  );
  centerPedestal.position.y = 2.2;
  centerPedestal.castShadow = true;
  plazaCenter.add(centerPedestal);

  // Floating Astral Core Shard
  const astralShard = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), glowCyan);
  astralShard.position.y = 5.2;
  plazaCenter.add(astralShard);

  const fountainLight = new THREE.PointLight(0x38bdf8, 3.0, 30);
  fountainLight.position.set(0, 5.5, 0);
  plazaCenter.add(fountainLight);

  // 4 Cardinal Plaza Street Lamps
  for (let l = 0; l < 4; l++) {
    const angle = (l / 4) * Math.PI * 2;
    const lx = Math.cos(angle) * 16;
    const lz = Math.sin(angle) * 16;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 4.2, 8), metal);
    post.position.set(lx, 2.1, lz);
    post.castShadow = true;
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), glowAmber);
    lamp.position.set(lx, 4.4, lz);
    const pLight = new THREE.PointLight(0xf59e0b, 1.8, 16);
    pLight.position.set(lx, 4.4, lz);
    plazaCenter.add(post);
    plazaCenter.add(lamp);
    plazaCenter.add(pLight);
  }

  citadelGroup.add(plazaCenter);

  // 2. CONCENTRIC COBBLESTONE AVENUES & BOULEVARDS
  // Avenue Ring 1 (r = 30m to 38m)
  const ring1 = new THREE.Mesh(
    new THREE.RingGeometry(30, 36, 48),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
  );
  ring1.rotation.x = -Math.PI / 2;
  ring1.position.y = 0.22;
  ring1.receiveShadow = true;
  citadelGroup.add(ring1);

  // Avenue Ring 2 (r = 65m to 73m)
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(65, 73, 64),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
  );
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.22;
  ring2.receiveShadow = true;
  citadelGroup.add(ring2);

  // Avenue Ring 3 (r = 95m to 103m)
  const ring3 = new THREE.Mesh(
    new THREE.RingGeometry(95, 103, 64),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
  );
  ring3.rotation.x = -Math.PI / 2;
  ring3.position.y = 0.22;
  ring3.receiveShadow = true;
  citadelGroup.add(ring3);

  // 3. DEFINE ALL 24 3D WALK-IN ENTERABLE BUILDINGS
  // Each building is placed carefully inside the courtyard radius (130m)
  // with rotation facing toward streets and the central plaza!


  // 3.5 PERIMETER BLEND PROPS & CONNECTING STONE PATHWAYS
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const bushMat = new THREE.MeshToonMaterial({ color: 0x15803d, gradientMap: rampTexture });
  const flowerMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const firewoodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 });
  const pathwayMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });

  const fencePostGeo = new THREE.BoxGeometry(0.18, 1.1, 0.18);
  const fenceRailGeo = new THREE.BoxGeometry(2.4, 0.12, 0.08);
  const rockGeo = new THREE.DodecahedronGeometry(0.75, 1);
  const bushGeo = new THREE.SphereGeometry(0.65, 8, 8);
  const firewoodGeo = new THREE.BoxGeometry(0.9, 0.6, 0.5);

  CITADEL_BUILDING_CONFIGS.forEach((cfg) => {
    const buildingMesh = createWalkInBuilding(cfg, materials);
    citadelGroup.add(buildingMesh);

    // Front stone pathway leading from doorway to street
    const pathLen = 6.0;
    const pathMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, pathLen), pathwayMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(
      cfg.x + Math.sin(cfg.rotationY) * (cfg.depth / 2 + pathLen / 2),
      0.21,
      cfg.z + Math.cos(cfg.rotationY) * (cfg.depth / 2 + pathLen / 2)
    );
    pathMesh.rotation.z = -cfg.rotationY;
    citadelGroup.add(pathMesh);

    // Scatter 4 exterior perimeter blend props around each building's side & back
    const angles = [-Math.PI * 0.7, -Math.PI * 0.3, Math.PI * 0.3, Math.PI * 0.7];
    angles.forEach((ang, idx) => {
      const radius = Math.max(cfg.width, cfg.depth) * 0.62 + 0.6;
      const propAngle = cfg.rotationY + ang;
      const px = cfg.x + Math.sin(propAngle) * radius;
      const pz = cfg.z + Math.cos(propAngle) * radius;

      if (idx === 0) {
        // Wooden fence segment
        const fenceGroup = new THREE.Group();
        fenceGroup.position.set(px, 0.2, pz);
        fenceGroup.rotation.y = propAngle + Math.PI / 2;
        const post1 = new THREE.Mesh(fencePostGeo, fenceMat);
        post1.position.set(-1.1, 0.55, 0);
        const post2 = new THREE.Mesh(fencePostGeo, fenceMat);
        post2.position.set(1.1, 0.55, 0);
        const railTop = new THREE.Mesh(fenceRailGeo, fenceMat);
        railTop.position.set(0, 0.85, 0);
        const railBot = new THREE.Mesh(fenceRailGeo, fenceMat);
        railBot.position.set(0, 0.45, 0);
        fenceGroup.add(post1);
        fenceGroup.add(post2);
        fenceGroup.add(railTop);
        fenceGroup.add(railBot);
        citadelGroup.add(fenceGroup);
      } else if (idx === 1) {
        // Mossy stone boulder
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(px, 0.6, pz);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.scale.set(1.1, 0.8, 1.2);
        rock.castShadow = true;
        citadelGroup.add(rock);
      } else if (idx === 2) {
        // Wild berry foliage shrub
        const bush = new THREE.Mesh(bushGeo, bushMat);
        bush.position.set(px, 0.65, pz);
        bush.scale.set(1.1, 0.95, 1.1);
        bush.castShadow = true;
        citadelGroup.add(bush);

        const flower = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), flowerMat);
        flower.position.set(px, 1.2, pz);
        citadelGroup.add(flower);
      } else {
        // Stacked firewood pile
        const wood = new THREE.Mesh(firewoodGeo, firewoodMat);
        wood.position.set(px, 0.5, pz);
        wood.rotation.y = propAngle;
        wood.castShadow = true;
        citadelGroup.add(wood);
      }
    });
  });

  // 4. RADIANT VILLAGE AVENUE STREET LAMPS (Illuminate all street corners along rings 1, 2 & 3)
  const lampRings = [
    { radius: 33, count: 8 },
    { radius: 69, count: 12 },
    { radius: 99, count: 16 },
  ];

  lampRings.forEach((ring) => {
    for (let s = 0; s < ring.count; s++) {
      const angle = (s / ring.count) * Math.PI * 2;
      const sx = Math.cos(angle) * ring.radius;
      const sz = Math.sin(angle) * ring.radius;

      const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 4.2, 8), metal);
      lampPost.position.set(sx, 2.1, sz);
      lampPost.castShadow = true;

      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.12), metal);
      bracket.position.set(sx, 4.1, sz);

      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), glowGold);
      lantern.position.set(sx, 4.3, sz);

      const sLight = new THREE.PointLight(0xfbbf24, 3.2, 22);
      sLight.position.set(sx, 4.3, sz);

      citadelGroup.add(lampPost);
      citadelGroup.add(bracket);
      citadelGroup.add(lantern);
      citadelGroup.add(sLight);
    }
  });

  scene.add(citadelGroup);
  return citadelGroup;
}

/**
 * Enforces wall collision for all 24 enterable buildings:
 * - Players CANNOT walk through exterior walls (back, left, right, or solid front sides).
 * - Players CAN walk freely through the open 2.8m front doorway into the house.
 * - Inside the house, players are enclosed by the 4 walls and can view all 3D furniture.
 * - Players can exit back outside through the doorway.
 */
export function resolveCitadelWallCollision(pos: THREE.Vector3, radius = 0.45): boolean {
  let collided = false;
  const wallThick = 0.35;

  for (const b of CITADEL_BUILDING_CONFIGS) {
    const dx = pos.x - b.x;
    const dz = pos.z - b.z;
    const maxDimension = Math.max(b.width, b.depth) * 0.75;
    if (dx * dx + dz * dz > (maxDimension + radius + 1) * (maxDimension + radius + 1)) {
      continue;
    }

    // Inverse rotation to building local coordinate space:
    const cosR = Math.cos(b.rotationY);
    const sinR = Math.sin(b.rotationY);
    let lx = dx * cosR + dz * sinR;
    let lz = -dx * sinR + dz * cosR;

    const hw = b.width / 2;
    const hd = b.depth / 2;
    const doorW = Math.min(2.8, b.width * 0.4);
    const halfDoor = doorW / 2;

    // Check if within bounding box + radius
    if (Math.abs(lx) > hw + radius || Math.abs(lz) > hd + radius) {
      continue;
    }

    // Is player inside the interior room?
    const isInside =
      Math.abs(lx) < hw - wallThick * 0.7 &&
      lz > -hd + wallThick * 0.7 &&
      lz < hd - wallThick * 0.7;

    const inDoorCorridor = Math.abs(lx) < halfDoor - radius * 0.15;

    if (isInside) {
      // INSIDE HOUSE: Enforce 4 walls so player cannot leave except through the open door!
      const minZ = -hd + wallThick + radius;
      if (lz < minZ) {
        lz = minZ;
        collided = true;
      }
      const minX = -hw + wallThick + radius;
      if (lx < minX) {
        lx = minX;
        collided = true;
      }
      const maxX = hw - wallThick - radius;
      if (lx > maxX) {
        lx = maxX;
        collided = true;
      }
      const maxZ = hd - wallThick - radius;
      if (lz > maxZ) {
        if (!inDoorCorridor) {
          lz = maxZ;
          collided = true;
        }
        // If inDoorCorridor, allowed to walk out!
      }
    } else {
      // OUTSIDE HOUSE: Enforce exterior walls
      // Door is located at local Z = hd
      if (lz >= hd - wallThick && lz <= hd + radius && Math.abs(lx) <= hw + radius) {
        if (!inDoorCorridor) {
          lz = hd + radius;
          collided = true;
        }
        // If inDoorCorridor, allowed to walk into door!
      } else if (lz <= -hd + wallThick && lz >= -hd - radius && Math.abs(lx) <= hw + radius) {
        // Back wall
        lz = -hd - radius;
        collided = true;
      } else if (lx <= -hw + wallThick && lx >= -hw - radius && Math.abs(lz) <= hd + radius) {
        // Left wall
        lx = -hw - radius;
        collided = true;
      } else if (lx >= hw - wallThick && lx <= hw + radius && Math.abs(lz) <= hd + radius) {
        // Right wall
        lx = hw + radius;
        collided = true;
      }
    }

    if (collided) {
      // Transform local (lx, lz) back to world coordinates
      pos.x = b.x + lx * cosR - lz * sinR;
      pos.z = b.z + lx * sinR + lz * cosR;
    }
  }

  return collided;
}

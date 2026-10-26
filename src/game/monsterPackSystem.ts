import * as THREE from 'three';

export interface AnimalMonster {
  id: string;
  name: string;
  packId: string;
  level: number;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  frontLeftLeg: THREE.Group;
  frontRightLeg: THREE.Group;
  backLeftLeg: THREE.Group;
  backRightLeg: THREE.Group;
  frontLeftPaw: THREE.Mesh;
  frontRightPaw: THREE.Mesh;
  headGroup: THREE.Group;
  tailGroup: THREE.Group;
  homePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  currentHp: number;
  maxHp: number;
  state: 'idle' | 'patrol' | 'aggro' | 'attack' | 'stagger' | 'dead';
  attackCooldown: number;
  attackAnimTimer: number;
  staggerTimer: number;
  respawnTimer: number;
  patrolTimer: number;
  aggroRange: number;
  attackRange: number;
  moveSpeed: number;
  role: string;
  pawsAttacking: 'left' | 'right' | null;
}

/**
 * Creates a stylized quadruped predatory animal mesh (Dire Wolf / Shadow Beast):
 * - Elongated wolf torso & muscular ribcage
 * - 4 articulate legs with knee/elbow joints
 * - Distinct front paws with razor claws for slashing attacks
 * - Animal head with snout, open maw, fangs, pointed ears, and glowing predator eyes
 * - Flexible swishing tail
 */
export function createAnimalMonsterMesh(
  id: string,
  name: string,
  colorHex: number,
  rampTexture?: THREE.Texture
): {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  frontLeftLeg: THREE.Group;
  frontRightLeg: THREE.Group;
  backLeftLeg: THREE.Group;
  backRightLeg: THREE.Group;
  frontLeftPaw: THREE.Mesh;
  frontRightPaw: THREE.Mesh;
  headGroup: THREE.Group;
  tailGroup: THREE.Group;
} {
  const group = new THREE.Group();
  group.name = id;

  const peltMat = new THREE.MeshToonMaterial({
    color: colorHex,
    gradientMap: rampTexture,
  });

  const underbellyMat = new THREE.MeshToonMaterial({
    color: 0x27272a,
    gradientMap: rampTexture,
  });

  const clawMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    metalness: 0.8,
    roughness: 0.3,
  });

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const fangMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });

  // 1. ANIMAL TORSO (Elongated wolf/beast body)
  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 2.4), peltMat);
  bodyMesh.position.set(0, 1.25, 0);
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Muscular chest & shoulders
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.2, 1.2), peltMat);
  chest.position.set(0, 1.35, 0.6);
  chest.castShadow = true;
  group.add(chest);

  // Underbelly plate
  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.8), underbellyMat);
  belly.position.set(0, 0.75, 0);
  group.add(belly);

  // 2. ANIMAL HEAD & SNOUT
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.7, 1.3);

  // Skull
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.9), peltMat);
  skull.castShadow = true;
  headGroup.add(skull);

  // Wolf Snout / Muzzle
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.9), underbellyMat);
  snout.position.set(0, -0.15, 0.7);
  snout.castShadow = true;
  headGroup.add(snout);

  // Black nose tip
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.2), clawMat);
  nose.position.set(0, -0.05, 1.18);
  headGroup.add(nose);

  // Glowing Predator Eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
  eyeL.position.set(-0.35, 0.2, 0.45);
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), eyeMat);
  eyeR.position.set(0.35, 0.2, 0.45);
  headGroup.add(eyeL);
  headGroup.add(eyeR);

  // Pointed Wolf Ears
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 4), peltMat);
  earL.position.set(-0.35, 0.6, -0.1);
  earL.rotation.z = Math.PI / 10;
  earL.rotation.x = -Math.PI / 12;
  const earR = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 4), peltMat);
  earR.position.set(0.35, 0.6, -0.1);
  earR.rotation.z = -Math.PI / 10;
  earR.rotation.x = -Math.PI / 12;
  headGroup.add(earL);
  headGroup.add(earR);

  // Upper & Lower Fangs
  const fang1 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), fangMat);
  fang1.position.set(-0.2, -0.38, 0.85);
  fang1.rotation.x = Math.PI;
  const fang2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 4), fangMat);
  fang2.position.set(0.2, -0.38, 0.85);
  fang2.rotation.x = Math.PI;
  headGroup.add(fang1);
  headGroup.add(fang2);

  group.add(headGroup);

  // 3. FRONT LEGS WITH ARTICULATED CLAW PAWS (Used to attack!)
  function createFrontLeg(isLeft: boolean) {
    const legRoot = new THREE.Group();
    const xOff = isLeft ? -0.65 : 0.65;
    legRoot.position.set(xOff, 1.25, 0.85);

    // Upper shoulder/leg
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.4), peltMat);
    upper.position.y = -0.35;
    upper.castShadow = true;
    legRoot.add(upper);

    // Lower forearm
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.65, 0.35), underbellyMat);
    lower.position.set(0, -0.75, 0.05);
    lower.castShadow = true;
    legRoot.add(lower);

    // Wide Predatory Paw
    const paw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.5), clawMat);
    paw.position.set(0, -1.15, 0.15);
    paw.castShadow = true;
    legRoot.add(paw);

    // Razor Sharp Claws on Paw
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), fangMat);
      claw.position.set(c * 0.12, -1.15, 0.45);
      claw.rotation.x = Math.PI / 2;
      legRoot.add(claw);
    }

    return { legRoot, paw };
  }

  const { legRoot: frontLeftLeg, paw: frontLeftPaw } = createFrontLeg(true);
  const { legRoot: frontRightLeg, paw: frontRightPaw } = createFrontLeg(false);
  group.add(frontLeftLeg);
  group.add(frontRightLeg);

  // 4. BACK LEGS (Muscular haunches)
  function createBackLeg(isLeft: boolean) {
    const legRoot = new THREE.Group();
    const xOff = isLeft ? -0.65 : 0.65;
    legRoot.position.set(xOff, 1.15, -0.85);

    // Haunch
    const haunch = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.55), peltMat);
    haunch.position.y = -0.35;
    haunch.castShadow = true;
    legRoot.add(haunch);

    // Lower hock
    const hock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.65, 0.35), underbellyMat);
    hock.position.set(0, -0.75, -0.05);
    hock.castShadow = true;
    legRoot.add(hock);

    // Back Paw
    const paw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.45), clawMat);
    paw.position.set(0, -1.15, 0.05);
    paw.castShadow = true;
    legRoot.add(paw);

    return legRoot;
  }

  const backLeftLeg = createBackLeg(true);
  const backRightLeg = createBackLeg(false);
  group.add(backLeftLeg);
  group.add(backRightLeg);

  // 5. ANIMAL TAIL
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 1.35, -1.2);

  const tailUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.9, 6), peltMat);
  tailUpper.position.set(0, -0.35, -0.35);
  tailUpper.rotation.x = -Math.PI / 4;
  tailGroup.add(tailUpper);

  const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 6), underbellyMat);
  tailTip.position.set(0, -0.85, -0.75);
  tailTip.rotation.x = -Math.PI / 3;
  tailGroup.add(tailTip);

  group.add(tailGroup);

  // Contact Shadow Plane
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);

  return {
    group,
    bodyMesh,
    frontLeftLeg,
    frontRightLeg,
    backLeftLeg,
    backRightLeg,
    frontLeftPaw,
    frontRightPaw,
    headGroup,
    tailGroup,
  };
}

/**
 * Initializes distinct monster packs in the outer wilderness:
 * - Northern Frost Wolf Pack
 * - Western Shadow Stalker Pack
 * - Southern Bloodfang Hound Pack
 * - Eastern Highlands Razorclaw Pack
 * - Cavern Entrance Lurker Pack
 */
export function initializeAnimalMonsterPacks(
  scene: THREE.Scene,
  rampTexture?: THREE.Texture
): AnimalMonster[] {
  const packs: {
    packId: string;
    packName: string;
    basePos: THREE.Vector3;
    color: number;
    level: number;
    hp: number;
    role: string;
    count: number;
  }[] = [
    {
      packId: 'north_pack',
      packName: 'Northern Dire Frost-Wolf',
      basePos: new THREE.Vector3(0, 0, 195),
      color: 0x38bdf8, // Ice cyan/blue
      level: 32,
      hp: 2800,
      role: 'Alpha Pack Predator • Arctic Fen',
      count: 3,
    },
    {
      packId: 'west_pack',
      packName: 'Shadow Stalker Beast',
      basePos: new THREE.Vector3(-195, 0, 0),
      color: 0x4c0519, // Umbral crimson/void
      level: 35,
      hp: 3200,
      role: 'Umbral Beast • Shadowfang Pack',
      count: 3,
    },
    {
      packId: 'south_pack',
      packName: 'Bloodfang Badlands Beast',
      basePos: new THREE.Vector3(0, 0, -195),
      color: 0x78350f, // Savage red-brown
      level: 30,
      hp: 2600,
      role: 'Badlands Carnivore • Bloodfang Pack',
      count: 3,
    },
    {
      packId: 'east_pack',
      packName: 'Golden Caldera Hound',
      basePos: new THREE.Vector3(195, 0, 0),
      color: 0xd97706, // Amber magma
      level: 34,
      hp: 3100,
      role: 'Magma Caldera Hound Pack',
      count: 3,
    },
    {
      packId: 'cavern_pack',
      packName: 'Cavern Rift Lurker',
      basePos: new THREE.Vector3(-175, 0, 175),
      color: 0x6366f1, // Cavern violet
      level: 28,
      hp: 2400,
      role: 'Subterranean Cavern Pack',
      count: 3,
    },
  ];

  const monsters: AnimalMonster[] = [];

  packs.forEach((pack) => {
    for (let i = 0; i < pack.count; i++) {
      const id = `${pack.packId}_beast_${i + 1}`;
      const name = i === 0 ? `Alpha ${pack.packName}` : `${pack.packName} #${i + 1}`;
      const hp = i === 0 ? Math.floor(pack.hp * 1.35) : pack.hp;
      const level = i === 0 ? pack.level + 2 : pack.level;

      // Pack members stand together in a tight natural triangle/cluster (radius ~4m - 7m)
      const offsetAngle = (i / pack.count) * Math.PI * 2;
      const offsetDist = 4.0 + (i % 2) * 2.5;
      const px = pack.basePos.x + Math.cos(offsetAngle) * offsetDist;
      const pz = pack.basePos.z + Math.sin(offsetAngle) * offsetDist;

      const animalMesh = createAnimalMonsterMesh(id, name, pack.color, rampTexture);
      animalMesh.group.position.set(px, 0, pz);
      // Face towards pack center initially
      animalMesh.group.rotation.y = offsetAngle + Math.PI;

      // Alpha is 20% larger
      if (i === 0) {
        animalMesh.group.scale.setScalar(1.25);
      }

      scene.add(animalMesh.group);

      monsters.push({
        id,
        name,
        packId: pack.packId,
        level,
        group: animalMesh.group,
        bodyMesh: animalMesh.bodyMesh,
        frontLeftLeg: animalMesh.frontLeftLeg,
        frontRightLeg: animalMesh.frontRightLeg,
        backLeftLeg: animalMesh.backLeftLeg,
        backRightLeg: animalMesh.backRightLeg,
        frontLeftPaw: animalMesh.frontLeftPaw,
        frontRightPaw: animalMesh.frontRightPaw,
        headGroup: animalMesh.headGroup,
        tailGroup: animalMesh.tailGroup,
        homePos: new THREE.Vector3(px, 0, pz),
        targetPos: new THREE.Vector3(px, 0, pz),
        currentHp: hp,
        maxHp: hp,
        state: 'idle',
        attackCooldown: 1.0 + Math.random() * 0.5,
        attackAnimTimer: 0,
        staggerTimer: 0,
        respawnTimer: 0,
        patrolTimer: 3 + Math.random() * 3,
        aggroRange: 22.0, // Aggro range: 22m
        attackRange: 3.2, // Melee paw strike range: 3.2m
        moveSpeed: 6.2,   // Gallop speed
        role: i === 0 ? `★ Alpha Leader • ${pack.role}` : pack.role,
        pawsAttacking: null,
      });
    }
  });

  return monsters;
}

/**
 * Updates pack AI state machine, realistic 4-legged gallop locomotion,
 * pack aggro sharing, and ferociously animated front paw slash attacks!
 */
export function updateAnimalMonsterPacks(
  monsters: AnimalMonster[],
  delta: number,
  elapsed: number,
  playerPos: THREE.Vector3,
  isPlayerBlocking: boolean,
  isPlayerDodging: boolean,
  onPlayerAttacked: (damage: number, attackerName: string) => void
) {
  // 1. Pack Aggro Sharing Check:
  // If ANY monster in a pack enters aggro, the entire pack is alerted and charges together!
  const alertedPacks = new Set<string>();
  monsters.forEach((m) => {
    if (m.state !== 'dead') {
      const dist = playerPos.distanceTo(m.group.position);
      if (dist <= m.aggroRange) {
        alertedPacks.add(m.packId);
      }
    }
  });

  // 2. Individual Monster Update
  monsters.forEach((m) => {
    // Dead state & respawn
    if (m.state === 'dead') {
      m.respawnTimer -= delta;
      if (m.respawnTimer <= 0) {
        m.state = 'idle';
        m.currentHp = m.maxHp;
        m.group.visible = true;
        m.group.position.copy(m.homePos);
      }
      return;
    }

    // Stagger state when struck
    if (m.state === 'stagger') {
      m.staggerTimer -= delta;
      m.bodyMesh.rotation.z = Math.sin(elapsed * 25) * 0.15;
      if (m.staggerTimer <= 0) {
        m.state = 'aggro';
        m.bodyMesh.rotation.z = 0;
      }
      return;
    }

    const distToPlayer = playerPos.distanceTo(m.group.position);
    const isPackAlerted = alertedPacks.has(m.packId);

    // If player is in territory or packmate alerted:
    if (distToPlayer <= m.aggroRange || isPackAlerted) {
      m.state = 'aggro';
      const toPlayer = playerPos.clone().sub(m.group.position);
      toPlayer.y = 0;

      // Turn towards player smoothly
      if (toPlayer.lengthSq() > 0.1) {
        const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
        m.group.rotation.y = THREE.MathUtils.damp(m.group.rotation.y, targetYaw, 10, delta);
      }

      // If outside melee strike range: gallop forward together
      if (distToPlayer > m.attackRange) {
        toPlayer.normalize();
        m.group.position.addScaledVector(toPlayer, m.moveSpeed * delta);

        // ENFORCE PROTECTION ARRAY BARRIER: Monsters CANNOT enter safe zone (r = 131m)
        const safeZoneRadius = 131.0;
        const distFromCenter = Math.hypot(m.group.position.x, m.group.position.z);
        if (distFromCenter < safeZoneRadius) {
          const barrierAngle = Math.atan2(m.group.position.z, m.group.position.x);
          m.group.position.x = Math.cos(barrierAngle) * safeZoneRadius;
          m.group.position.z = Math.sin(barrierAngle) * safeZoneRadius;
        }

        // 4-legged animal gallop animation
        const runCycle = Math.sin(elapsed * 14 + m.homePos.x);
        m.frontLeftLeg.rotation.x = runCycle * 0.75;
        m.frontRightLeg.rotation.x = -runCycle * 0.75;
        m.backLeftLeg.rotation.x = -runCycle * 0.75;
        m.backRightLeg.rotation.x = runCycle * 0.75;

        // Spine bobbing & tail swish
        m.bodyMesh.position.y = 1.25 + Math.sin(elapsed * 14 * 2) * 0.12;
        m.tailGroup.rotation.y = Math.sin(elapsed * 8) * 0.45;
        m.tailGroup.rotation.x = -Math.sin(elapsed * 14) * 0.25;
        m.headGroup.rotation.x = Math.sin(elapsed * 14) * 0.12;
      } else {
        // IN MELEE RANGE: ATTACK WITH FRONT PAW SLASH!
        // Also ensure monster stays outside safe zone (r = 131m)
        const safeZoneRadius = 131.0;
        const distFromCenter = Math.hypot(m.group.position.x, m.group.position.z);
        if (distFromCenter < safeZoneRadius) {
          const barrierAngle = Math.atan2(m.group.position.z, m.group.position.x);
          m.group.position.x = Math.cos(barrierAngle) * safeZoneRadius;
          m.group.position.z = Math.sin(barrierAngle) * safeZoneRadius;
        }

        m.attackCooldown -= delta;

        if (m.attackAnimTimer > 0) {
          m.attackAnimTimer -= delta;
          const animProgress = 1.0 - m.attackAnimTimer / 0.45;

          // Rear up on hind legs & slash down with front paw
          m.bodyMesh.position.y = 1.6 + Math.sin(animProgress * Math.PI) * 0.45;
          m.bodyMesh.rotation.x = -Math.sin(animProgress * Math.PI) * 0.4;
          m.headGroup.rotation.x = -0.3 + Math.sin(animProgress * Math.PI) * 0.5;

          // Front paw claw slash swipe
          if (m.pawsAttacking === 'left') {
            m.frontLeftLeg.rotation.x = -Math.PI / 2 + Math.sin(animProgress * Math.PI) * 1.6;
            m.frontLeftLeg.rotation.z = Math.sin(animProgress * Math.PI) * 0.6;
          } else {
            m.frontRightLeg.rotation.x = -Math.PI / 2 + Math.sin(animProgress * Math.PI) * 1.6;
            m.frontRightLeg.rotation.z = -Math.sin(animProgress * Math.PI) * 0.6;
          }
        } else {
          // Reset neutral stance
          m.bodyMesh.position.y = 1.25;
          m.bodyMesh.rotation.x = 0;
          m.frontLeftLeg.rotation.set(0, 0, 0);
          m.frontRightLeg.rotation.set(0, 0, 0);
        }

        // Trigger claw strike only if player is outside the safe zone protection array
        const playerDistFromCenter = Math.hypot(playerPos.x, playerPos.z);
        const playerProtectedByArray = playerDistFromCenter < 130.0;

        if (m.attackCooldown <= 0 && !playerProtectedByArray) {
          m.attackCooldown = 1.5 + Math.random() * 0.4;
          m.attackAnimTimer = 0.45;
          m.pawsAttacking = Math.random() > 0.5 ? 'left' : 'right';

          // Deliver paw claw slash damage
          const baseDmg = m.level * 2 + 10;
          onPlayerAttacked(baseDmg, m.name);
        }
      }
    } else {
      // PACIFIED PACK: Guard and stay in group territory (no running in circles!)
      m.state = 'idle';
      m.patrolTimer -= delta;

      // Idle breathing and tail swishing
      m.bodyMesh.position.y = 1.25 + Math.sin(elapsed * 2.5 + m.homePos.x) * 0.04;
      m.tailGroup.rotation.y = Math.sin(elapsed * 3.5) * 0.35;
      m.headGroup.rotation.y = Math.sin(elapsed * 1.8 + m.homePos.z) * 0.2;
      m.frontLeftLeg.rotation.set(0, 0, 0);
      m.frontRightLeg.rotation.set(0, 0, 0);
      m.backLeftLeg.rotation.set(0, 0, 0);
      m.backRightLeg.rotation.set(0, 0, 0);

      // Gentle packmate shifting within 3m of home
      if (m.patrolTimer <= 0) {
        m.patrolTimer = 4 + Math.random() * 5;
        m.targetPos.set(
          m.homePos.x + (Math.random() - 0.5) * 4,
          0,
          m.homePos.z + (Math.random() - 0.5) * 4
        );
      }

      const wanderDir = m.targetPos.clone().sub(m.group.position);
      wanderDir.y = 0;
      if (wanderDir.lengthSq() > 0.3) {
        wanderDir.normalize();
        m.group.position.addScaledVector(wanderDir, m.moveSpeed * 0.25 * delta);

        // Enforce safe zone boundary
        const safeZoneRadius = 131.0;
        const distFromCenter = Math.hypot(m.group.position.x, m.group.position.z);
        if (distFromCenter < safeZoneRadius) {
          const barrierAngle = Math.atan2(m.group.position.z, m.group.position.x);
          m.group.position.x = Math.cos(barrierAngle) * safeZoneRadius;
          m.group.position.z = Math.sin(barrierAngle) * safeZoneRadius;
        }

        m.group.rotation.y = THREE.MathUtils.damp(
          m.group.rotation.y,
          Math.atan2(wanderDir.x, wanderDir.z),
          6,
          delta
        );
        const slowWalk = Math.sin(elapsed * 5);
        m.frontLeftLeg.rotation.x = slowWalk * 0.3;
        m.frontRightLeg.rotation.x = -slowWalk * 0.3;
        m.backLeftLeg.rotation.x = -slowWalk * 0.3;
        m.backRightLeg.rotation.x = slowWalk * 0.3;
      }
    }
  });
}

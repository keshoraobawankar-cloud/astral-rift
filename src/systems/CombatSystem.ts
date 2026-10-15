import * as THREE from 'three';

export interface CombatMonsterCollider {
  id: string;
  name: string;
  position: THREE.Vector3;
  health: number;
  takeDamage: (amt: number, isCrit?: boolean) => void;
}

export class PlayerCombatSystem {
  playerGroup: THREE.Group;
  currentComboStep: number;
  maxComboSteps: number;
  comboTimer: number;
  comboWindow: number; // Seconds allowed to press attack for next combo hit
  isAttacking: boolean;
  attackAnimTimer: number;
  isDashing: boolean;
  dashTimer: number;
  dashDuration: number; // 250ms I-frame duration
  dashVelocity: THREE.Vector3;
  onAttackTriggered?: (step: number, damage: number, attackType: string) => void;

  constructor(
    playerGroup: THREE.Group,
    onAttackTriggered?: (step: number, damage: number, attackType: string) => void
  ) {
    this.playerGroup = playerGroup;
    this.currentComboStep = 0;
    this.maxComboSteps = 3;
    this.comboTimer = 0;
    this.comboWindow = 0.8;
    this.isAttacking = false;
    this.attackAnimTimer = 0;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 0.25;
    this.dashVelocity = new THREE.Vector3();
    this.onAttackTriggered = onAttackTriggered;
  }

  // Triggered when player presses Attack (E / Left-Click)
  handleLightAttack(): { step: number; damage: number; attackType: string } | null {
    if (this.isDashing) return null;

    if (this.isAttacking && this.comboTimer < this.comboWindow) {
      if (this.currentComboStep < this.maxComboSteps) {
        this.currentComboStep++;
      } else {
        this.currentComboStep = 1;
      }
    } else {
      this.isAttacking = true;
      this.currentComboStep = 1;
    }

    this.comboTimer = 0;
    this.attackAnimTimer = 0.32;

    const baseDmg = 120;
    const damageMultiplier = 1.0 + (this.currentComboStep * 0.45);
    const damage = Math.round(baseDmg * damageMultiplier);
    const attackType =
      this.currentComboStep === 3
        ? 'whirlwind'
        : this.currentComboStep === 2
        ? 'heavy_cleave'
        : 'light_slash';

    if (this.onAttackTriggered) {
      this.onAttackTriggered(this.currentComboStep, damage, attackType);
    }

    return { step: this.currentComboStep, damage, attackType };
  }

  // Triggered when player presses Dodge Roll (C)
  handleDodgeRoll(directionVector: THREE.Vector3): boolean {
    if (this.isDashing) return false;

    this.isDashing = true;
    this.dashTimer = 0;
    this.isAttacking = false;
    this.currentComboStep = 0;

    // Apply high velocity boost during I-frame window
    const dir = directionVector.clone();
    if (dir.lengthSq() === 0) {
      dir.set(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerGroup.rotation.y);
    }
    this.dashVelocity = dir.normalize().multiplyScalar(18);
    return true;
  }

  update(delta: number, monsterColliders: CombatMonsterCollider[]) {
    // Handle Combo Window Decay
    if (this.isAttacking) {
      this.comboTimer += delta;
      this.attackAnimTimer = Math.max(0, this.attackAnimTimer - delta);

      if (this.comboTimer >= this.comboWindow) {
        this.isAttacking = false;
        this.currentComboStep = 0;
      }
    }

    // Handle Dash I-Frames & Movement
    if (this.isDashing) {
      this.dashTimer += delta;
      this.playerGroup.position.add(this.dashVelocity.clone().multiplyScalar(delta));

      if (this.dashTimer >= this.dashDuration) {
        this.isDashing = false;
      }
    }

    // Check Weapon Hitboxes against active monsters
    if (this.isAttacking && this.attackAnimTimer > 0.15) {
      this.checkMeleeCollision(monsterColliders);
    }
  }

  checkMeleeCollision(monsters: CombatMonsterCollider[]) {
    const playerPos = this.playerGroup.position;
    const range = this.currentComboStep === 3 ? 4.8 : 3.2;

    for (const monster of monsters) {
      if (monster.health > 0 && playerPos.distanceTo(monster.position) <= range) {
        const damageMultiplier = 1.0 + (this.currentComboStep * 0.45);
        const damage = Math.round(120 * damageMultiplier);
        monster.takeDamage(damage, this.currentComboStep === 3);
      }
    }
  }
}

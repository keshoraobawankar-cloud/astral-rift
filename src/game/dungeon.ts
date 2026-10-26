import { GameEngine } from './engine';

export interface DungeonPlayer {
  name: string;
  level: number;
  exp: number;
  nextLevelExp: number;
  hp: number;
  maxHp: number;
  attackPower: number;
  gold: number;
  essence: number;
}

export interface DungeonMonster {
  id: number | string;
  name: string;
  title?: string;
  level: number;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  radius: number;
  color: string;
  expReward: number;
  goldReward: number;
  attack: number;
  defense: number;
  isBoss?: boolean;
}

export interface CaveLoreStone {
  id: string;
  title: string;
  chapter: string;
  excerpt: string;
  x: number;
  y: number;
  inspected: boolean;
  rewardEssence: number;
}

export interface DestructibleObject {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  destroyed: boolean;
  type: 'mana_crystal' | 'ancient_urn';
  rewardGold: number;
  rewardEssence: number;
}

export class DungeonCrawler {
  player: DungeonPlayer;
  engine: GameEngine;
  currentFloor: number;
  monsters: DungeonMonster[];
  loreStones: CaveLoreStone[];
  destructibles: DestructibleObject[];
  isExploring: boolean;
  currentCaveName: string;
  storyDialogActive: CaveLoreStone | null;

  constructor(player: DungeonPlayer, engine: GameEngine) {
    this.player = player;
    this.engine = engine;
    this.currentFloor = 1;
    this.monsters = [];
    this.loreStones = [];
    this.destructibles = [];
    this.isExploring = false;
    this.currentCaveName = 'The Sunken Crystal Cavern';
    this.storyDialogActive = null;
  }

  enterDungeon(floor = 1) {
    this.currentFloor = floor;
    this.isExploring = true;
    this.currentCaveName =
      floor === 1
        ? 'Sunken Crystal Cavern (Floor 1)'
        : floor === 2
        ? 'Ironpeak Magma Caldera Caverns (Floor 2)'
        : 'Abyssal Void Nexus (Depths)';
    this.spawnMonsters();
    this.spawnLoreStones();
    this.spawnDestructibles();
  }

  spawnMonsters() {
    const scale = this.currentFloor;
    this.monsters = [
      {
        id: 1,
        name: 'Cavern Lurker',
        title: 'Subterranean Stalker',
        level: scale * 3,
        x: 240,
        y: 190,
        radius: 20,
        hp: 140 * scale,
        maxHp: 140 * scale,
        expReward: 350 * scale,
        goldReward: 80 * scale,
        attack: 24 * scale,
        defense: 12 * scale,
        color: '#6366f1',
      },
      {
        id: 2,
        name: 'Magma Slime',
        title: 'Caldera Pyre Core',
        level: scale * 3 + 1,
        x: 420,
        y: 280,
        radius: 22,
        hp: 180 * scale,
        maxHp: 180 * scale,
        expReward: 420 * scale,
        goldReward: 95 * scale,
        attack: 28 * scale,
        defense: 15 * scale,
        color: '#f97316',
      },
      {
        id: 3,
        name: 'Corrupted Cave Golem',
        title: 'Ancient Leyline Guardian',
        level: scale * 4,
        x: 580,
        y: 200,
        radius: 26,
        hp: 360 * scale,
        maxHp: 360 * scale,
        expReward: 650 * scale,
        goldReward: 160 * scale,
        attack: 38 * scale,
        defense: 25 * scale,
        color: '#eab308',
        isBoss: scale >= 2,
      },
    ];
  }

  spawnLoreStones() {
    this.loreStones = [
      {
        id: 'stone_1',
        title: 'Tablet of the Sunken Epoch',
        chapter: 'Aethelgard Annals • Chapter III',
        excerpt:
          'Before the Sundering, these caverns flowed with raw planetary starlight. Deep within the earth, the Dwarven forge-masters bound magma spirits to ironpeak walls, keeping the Void Horrors sealed beneath the crust.',
        x: 180,
        y: 340,
        inspected: false,
        rewardEssence: 75,
      },
      {
        id: 'stone_2',
        title: 'Runestone of the Umbral Sovereign',
        chapter: 'Void Calamity Inscription',
        excerpt:
          'When shadows eclipse the twin suns of Aethelgard, only one crowned in darkness may command the fallen. "Arise," whispers the cavern wind, calling forth the army that never rests.',
        x: 520,
        y: 360,
        inspected: false,
        rewardEssence: 120,
      },
    ];
  }

  spawnDestructibles() {
    this.destructibles = [
      {
        id: 'crys_1',
        name: 'Gleaming Leyline Crystal',
        x: 320,
        y: 140,
        hp: 40,
        destroyed: false,
        type: 'mana_crystal',
        rewardGold: 45,
        rewardEssence: 30,
      },
      {
        id: 'urn_1',
        name: 'Ancient Dwarven Relic Urn',
        x: 480,
        y: 130,
        hp: 30,
        destroyed: false,
        type: 'ancient_urn',
        rewardGold: 70,
        rewardEssence: 15,
      },
    ];
  }

  attackMonster(monsterIndex: number, damage: number, isCrit = false): { defeated: boolean; damageDealt: number } {
    const monster = this.monsters[monsterIndex];
    if (!monster) return { defeated: false, damageDealt: 0 };

    monster.hp = Math.max(0, monster.hp - damage);
    this.engine.triggerScreenShake(isCrit ? 220 : 140, isCrit ? 9 : 4);
    this.engine.spawnParticleBurst(
      monster.x,
      monster.y,
      isCrit ? '#ef4444' : monster.color || '#3b82f6',
      isCrit ? 24 : 12,
      isCrit ? 1.4 : 1.0
    );
    this.engine.addFloatingText(
      `-${damage}${isCrit ? ' CRIT!' : ''}`,
      monster.x,
      monster.y - 22,
      isCrit ? '#f87171' : '#ffffff',
      isCrit
    );

    if (monster.hp <= 0) {
      this.defeatMonster(monsterIndex);
      return { defeated: true, damageDealt: damage };
    }

    return { defeated: false, damageDealt: damage };
  }

  attackDestructible(index: number, damage: number): boolean {
    const obj = this.destructibles[index];
    if (!obj || obj.destroyed) return false;

    obj.hp -= damage;
    this.engine.triggerScreenShake(100, 3);
    this.engine.spawnParticleBurst(obj.x, obj.y, obj.type === 'mana_crystal' ? '#38bdf8' : '#f59e0b', 14);

    if (obj.hp <= 0) {
      obj.destroyed = true;
      this.player.gold += obj.rewardGold;
      this.player.essence += obj.rewardEssence;
      this.engine.spawnParticleBurst(obj.x, obj.y, '#eab308', 25, 1.3);
      this.engine.addFloatingText(`+${obj.rewardGold} GOLD`, obj.x - 20, obj.y - 30, '#facc15');
      this.engine.addFloatingText(`+${obj.rewardEssence} ESSENCE`, obj.x + 20, obj.y - 45, '#38bdf8');
      return true;
    }
    return false;
  }

  inspectLoreStone(id: string): CaveLoreStone | null {
    const stone = this.loreStones.find((s) => s.id === id);
    if (!stone) return null;

    if (!stone.inspected) {
      stone.inspected = true;
      this.player.essence += stone.rewardEssence;
      this.engine.spawnParticleBurst(stone.x, stone.y, '#c084fc', 30, 1.2);
      this.engine.addFloatingText(`+${stone.rewardEssence} ESSENCE`, stone.x, stone.y - 40, '#a855f7');
      this.engine.addFloatingText('✦ LORE UNLOCKED', stone.x, stone.y - 60, '#38bdf8');
    }

    this.storyDialogActive = stone;
    return stone;
  }

  defeatMonster(index: number) {
    const monster = this.monsters[index];
    if (!monster) return;

    this.player.exp += monster.expReward;
    this.player.gold += monster.goldReward;

    this.engine.addFloatingText(`+${monster.expReward} EXP`, monster.x, monster.y - 35, '#a855f7');
    this.engine.addFloatingText(`+${monster.goldReward} GOLD`, monster.x, monster.y - 55, '#facc15');
    this.engine.spawnParticleBurst(monster.x, monster.y, '#eab308', 32, 1.5);
    this.engine.spawnParticleBurst(monster.x, monster.y, '#a855f7', 20, 1.2);

    // Remove defeated monster
    this.monsters.splice(index, 1);

    // Check level-up progression milestone
    if (this.player.exp >= this.player.nextLevelExp) {
      this.player.level++;
      this.player.exp = this.player.exp - this.player.nextLevelExp;
      this.player.nextLevelExp = Math.floor(this.player.nextLevelExp * 1.5);
      this.player.maxHp += 50;
      this.player.hp = this.player.maxHp;
      this.player.attackPower += 25;

      this.engine.triggerScreenShake(300, 10);
      this.engine.addFloatingText(`★ LEVEL UP! LVL ${this.player.level} ★`, 380, 120, '#22c55e', true);
      this.engine.addFloatingText(`HP RESTORED & +25 ATK!`, 380, 150, '#38bdf8');
      this.engine.spawnParticleBurst(380, 140, '#22c55e', 45, 2.0);
    }

    // Auto-advance floor when all monsters defeated
    if (this.monsters.length === 0) {
      this.engine.addFloatingText(`🏆 CAVERN CLEARED!`, 380, 200, '#eab308', true);
    }
  }
}

import {
  PlayerItem,
  ItemTemplate,
  EquipmentSlotType,
  StatBonuses,
} from '../types/inventory.types';

export const SAMPLE_ITEM_TEMPLATES: ItemTemplate[] = [
  {
    id: 'weapon_kasaka_fang',
    name: "Kasaka's Venom Fang",
    rarity: 'Rare',
    slot: 'weapon',
    stats: { attackPower: 120, agility: 15, strength: 10 },
    iconEmoji: '🗡️',
    description: 'Carved from the venom sac of the Great Blue Swamp Serpent. Induces bleeding on contact.',
  },
  {
    id: 'weapon_baruka_dagger',
    name: "Baruka's Frost Dagger",
    rarity: 'Epic',
    slot: 'weapon',
    stats: { attackPower: 280, agility: 30, strength: 25 },
    iconEmoji: '❄️',
    description: 'Wielded by the Warlord of the White Phantoms. Emits sub-zero glacial frost.',
  },
  {
    id: 'weapon_shadow_scythe',
    name: "Demon King's Longsword",
    rarity: 'Legendary',
    slot: 'weapon',
    stats: { attackPower: 550, strength: 55, perception: 40 },
    iconEmoji: '⚔️',
    description: 'Forged from concentrated storm lightning and demon blood in the Abyss Citadel.',
  },
  {
    id: 'helmet_shadow_crown',
    name: 'Crown of the Monarch',
    rarity: 'Legendary',
    slot: 'helmet',
    stats: { defense: 140, intelligence: 50, perception: 35 },
    iconEmoji: '👑',
    description: 'A regal circlet humming with dormant monarch sovereign authority.',
  },
  {
    id: 'armor_leather_jacket',
    name: "Hunter's Stealth Jacket",
    rarity: 'Common',
    slot: 'armor',
    stats: { defense: 45, vitality: 10 },
    iconEmoji: '🥋',
    description: 'Standard-issue lightweight kevlar weave worn by raid vanguards.',
  },
  {
    id: 'armor_abyss_plate',
    name: "Knight Commander's Aegis Plate",
    rarity: 'Epic',
    slot: 'armor',
    stats: { defense: 220, vitality: 45, strength: 20 },
    iconEmoji: '🛡️',
    description: 'Reinforced with Golem Core slag. Absorbs concussive kinetic blasts.',
  },
  {
    id: 'gloves_kasaka_grips',
    name: 'Kasaka Scale Gauntlets',
    rarity: 'Rare',
    slot: 'gloves',
    stats: { attackPower: 45, strength: 18, agility: 12 },
    iconEmoji: '🧤',
    description: 'Infused with serpent scales for high-friction weapon mastery.',
  },
  {
    id: 'boots_windstrider',
    name: 'Phantom Shadow Boots',
    rarity: 'Epic',
    slot: 'boots',
    stats: { defense: 65, agility: 42 },
    iconEmoji: '👢',
    description: 'Enchanted with wind runes to reduce sprint stamina cost.',
  },
  {
    id: 'accessory_monarch_ring',
    name: 'Ring of the Shadow Sovereign',
    rarity: 'Legendary',
    slot: 'accessory',
    stats: { attackPower: 95, perception: 35, intelligence: 35 },
    iconEmoji: '💍',
    description: 'Radiates pitch-black astral essence that increases mana recovery by +25%.',
  },
];

export class PlayerInventorySystem {
  // Database map of all item templates in the game
  private itemTemplates: Map<string, ItemTemplate> = new Map();

  // Player's storage bag
  private inventory: PlayerItem[] = [];

  // Equipped gear mapped by slot type
  private equippedSlots: Map<EquipmentSlotType, PlayerItem | null> = new Map([
    ['weapon', null],
    ['helmet', null],
    ['armor', null],
    ['gloves', null],
    ['boots', null],
    ['accessory', null],
  ]);

  constructor(templates: ItemTemplate[] = SAMPLE_ITEM_TEMPLATES) {
    templates.forEach((t) => this.itemTemplates.set(t.id, t));
  }

  // Register additional custom item template
  public registerTemplate(template: ItemTemplate) {
    this.itemTemplates.set(template.id, template);
  }

  public getTemplate(templateId: string): ItemTemplate | undefined {
    return this.itemTemplates.get(templateId);
  }

  // Add an item drop into the player's inventory bag
  public addItemToBag(templateId: string, instanceId: string = `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`): boolean {
    if (!this.itemTemplates.has(templateId)) {
      console.error(`Item template ${templateId} does not exist.`);
      return false;
    }
    this.inventory.push({ instanceId, templateId, enhancementLevel: 0, equipped: false });
    return true;
  }

  // Equip an item from the bag into the correct slot
  public equipItem(instanceId: string): boolean {
    const itemIndex = this.inventory.findIndex((i) => i.instanceId === instanceId);
    if (itemIndex === -1) {
      console.error('Item not found in inventory bag.');
      return false;
    }

    const playerItem = this.inventory[itemIndex];
    const template = this.itemTemplates.get(playerItem.templateId);
    if (!template) return false;

    // Check if something is already equipped in that slot; if so, swap it back to inventory
    const currentlyEquipped = this.equippedSlots.get(template.slot);
    if (currentlyEquipped) {
      currentlyEquipped.equipped = false;
      this.inventory.push(currentlyEquipped);
    }

    // Equip the new item and remove it from the bag
    playerItem.equipped = true;
    this.equippedSlots.set(template.slot, playerItem);
    this.inventory.splice(itemIndex, 1);

    return true;
  }

  // Unequip an item from a slot back into inventory
  public unequipItem(slot: EquipmentSlotType): boolean {
    const currentlyEquipped = this.equippedSlots.get(slot);
    if (!currentlyEquipped) return false;

    currentlyEquipped.equipped = false;
    this.inventory.push(currentlyEquipped);
    this.equippedSlots.set(slot, null);
    return true;
  }

  // Enhance gear (+1, +2, etc. with +10% stat scaling per level)
  public enhanceItem(instanceId: string): { success: boolean; newLevel: number } {
    // Check equipped slots first
    for (const [slot, item] of this.equippedSlots.entries()) {
      if (item && item.instanceId === instanceId) {
        if (item.enhancementLevel >= 20) return { success: false, newLevel: item.enhancementLevel };
        item.enhancementLevel += 1;
        return { success: true, newLevel: item.enhancementLevel };
      }
    }

    // Check inventory bag
    const item = this.inventory.find((i) => i.instanceId === instanceId);
    if (item) {
      if (item.enhancementLevel >= 20) return { success: false, newLevel: item.enhancementLevel };
      item.enhancementLevel += 1;
      return { success: true, newLevel: item.enhancementLevel };
    }

    return { success: false, newLevel: 0 };
  }

  // Calculate total cumulative stat bonuses from all equipped gear and enhancements
  public calculateTotalGearStats(): StatBonuses {
    const totalStats: StatBonuses = {
      strength: 0,
      agility: 0,
      vitality: 0,
      intelligence: 0,
      perception: 0,
      attackPower: 0,
      defense: 0,
    };

    for (const [, playerItem] of this.equippedSlots.entries()) {
      if (!playerItem) continue;

      const template = this.itemTemplates.get(playerItem.templateId);
      if (!template) continue;

      // Enhancement scaling multiplier (e.g., +10% stat boost per enhancement level)
      const enhancementMultiplier = 1 + playerItem.enhancementLevel * 0.1;

      // Add scaled stats to totals
      for (const [statKey, value] of Object.entries(template.stats)) {
        const key = statKey as keyof StatBonuses;
        if (value !== undefined) {
          const scaledValue = Math.floor(value * enhancementMultiplier);
          totalStats[key] = (totalStats[key] || 0) + scaledValue;
        }
      }
    }

    return totalStats;
  }

  // Get full list of equipped gear with templates
  public getEquippedSlotsDetailed(): Record<EquipmentSlotType, { item: PlayerItem; template: ItemTemplate } | null> {
    const result: any = {};
    for (const [slot, item] of this.equippedSlots.entries()) {
      if (item) {
        const template = this.itemTemplates.get(item.templateId);
        result[slot] = template ? { item, template } : null;
      } else {
        result[slot] = null;
      }
    }
    return result;
  }

  // Get inventory items paired with their templates
  public getInventoryDetailed(): Array<{ item: PlayerItem; template: ItemTemplate }> {
    const results: Array<{ item: PlayerItem; template: ItemTemplate }> = [];
    for (const item of this.inventory) {
      const template = this.itemTemplates.get(item.templateId);
      if (template) {
        results.push({ item, template });
      }
    }
    return results;
  }

  public getInventoryBag(): PlayerItem[] {
    return [...this.inventory];
  }
}

// Global singleton instance pre-seeded with sample hunter gear
export const globalPlayerInventory = new PlayerInventorySystem();
globalPlayerInventory.addItemToBag('weapon_kasaka_fang', 'inst_kasaka_01');
globalPlayerInventory.addItemToBag('armor_leather_jacket', 'inst_jacket_01');
globalPlayerInventory.addItemToBag('gloves_kasaka_grips', 'inst_gloves_01');
globalPlayerInventory.addItemToBag('boots_windstrider', 'inst_boots_01');
globalPlayerInventory.equipItem('inst_kasaka_01');
globalPlayerInventory.equipItem('inst_jacket_01');

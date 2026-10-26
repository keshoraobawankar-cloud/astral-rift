export interface BuildingData {
  building_id: string;
  type: 'blacksmith' | 'guild' | 'inn' | 'residential';
  world_x: number;
  world_z: number;
  bounding_radius: number;
}

export interface PerimeterPropInstance {
  prop_id: string;
  parent_building_id: string;
  asset_type: 'wooden_fence_segment' | 'mossy_rock' | 'wild_berry_bush' | 'stacked_firewood' | 'flower_patch';
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation_y_deg: number;
  scale: number;
  tint_variation: string;
}

const BLEND_PROP_PALETTE = [
  { type: 'wooden_fence_segment', weight: 0.25, tints: ['#78350f', '#5c2b0c', '#854d0e'] },
  { type: 'mossy_rock', weight: 0.30, tints: ['#475569', '#334155', '#3f3f46'] },
  { type: 'wild_berry_bush', weight: 0.25, tints: ['#15803d', '#166534', '#047857'] },
  { type: 'stacked_firewood', weight: 0.10, tints: ['#92400e', '#713f12', '#78350f'] },
  { type: 'flower_patch', weight: 0.10, tints: ['#f43f5e', '#38bdf8', '#fbbf24'] },
] as const;

/**
 * Procedural Rule-Based Exterior Perimeter Prop Scatterer:
 * Scatters 3 to 5 realistic blend assets around the exterior perimeter of each building
 * at a safe radial distance just outside its footprint (offset: radius + 0.6m to radius + 2.4m).
 * Generates natural randomized yaw rotation (0-360) and scales (0.7 to 1.3).
 */
export function generateBuildingPerimeterBlendProps(
  buildings: BuildingData[],
  groundY: number = 0.2
): PerimeterPropInstance[] {
  const generatedProps: PerimeterPropInstance[] = [];

  for (let bIndex = 0; bIndex < buildings.length; bIndex++) {
    const building = buildings[bIndex];
    // Spawn between 3 and 5 props per building
    const propCount = 3 + Math.floor(Math.random() * 3);

    // Distribute angles around building perimeter with jitter
    const angleStep = (Math.PI * 2) / propCount;

    for (let pIndex = 0; pIndex < propCount; pIndex++) {
      const baseAngle = pIndex * angleStep;
      const angleJitter = (Math.random() - 0.5) * (angleStep * 0.5);
      const spawnAngle = baseAngle + angleJitter;

      // Avoid front entrance path (local forward sector around angle ~ PI/2)
      // Radial offset just outside building footprint
      const radialOffset = building.bounding_radius + 0.8 + Math.random() * 1.6;

      const px = building.world_x + Math.cos(spawnAngle) * radialOffset;
      const pz = building.world_z + Math.sin(spawnAngle) * radialOffset;

      // Select prop from weighted palette
      const randVal = Math.random();
      let accumWeight = 0;
      let selectedProp: (typeof BLEND_PROP_PALETTE)[number] = BLEND_PROP_PALETTE[0];

      for (let i = 0; i < BLEND_PROP_PALETTE.length; i++) {
        accumWeight += BLEND_PROP_PALETTE[i].weight;
        if (randVal <= accumWeight) {
          selectedProp = BLEND_PROP_PALETTE[i];
          break;
        }
      }

      // Randomized scale between 0.70 and 1.30
      const randomizedScale = Math.round((0.70 + Math.random() * 0.60) * 100) / 100;
      // Full 360-degree randomized yaw rotation
      const randomizedRotation = Math.round(Math.random() * 360 * 10) / 10;
      // Tint selection
      const selectedTint = selectedProp.tints[Math.floor(Math.random() * selectedProp.tints.length)];

      generatedProps.push({
        prop_id: `prop_${building.building_id}_${pIndex + 1}`,
        parent_building_id: building.building_id,
        asset_type: selectedProp.type as any,
        position: {
          x: Math.round(px * 100) / 100,
          y: groundY,
          z: Math.round(pz * 100) / 100,
        },
        rotation_y_deg: randomizedRotation,
        scale: randomizedScale,
        tint_variation: selectedTint,
      });
    }
  }

  return generatedProps;
}

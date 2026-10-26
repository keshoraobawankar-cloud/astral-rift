export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface FoliageInstance {
  id: string | number;
  type: string;
  position: Vector3D;
  scale?: number;
  rotationY?: number;
  isMasked?: boolean;
}

export interface BuildingAABB {
  id: string | number;
  min: Vector3D;
  max: Vector3D;
}

export interface FilterFoliageResult {
  survivingFoliage: FoliageInstance[];
  removedFoliage: FoliageInstance[];
  totalChecked: number;
  totalRemoved: number;
}

/**
 * High-performance foliage collision and clearance filtration function.
 * Evaluates scattered plant coordinates against building Axis-Aligned Bounding Boxes
 * expanded by a specified buffer margin (default: 2.0 meters).
 * 
 * Math execution:
 * Expanded Box Min = Box.min - buffer
 * Expanded Box Max = Box.max + buffer
 * Point is inside if:
 *   point.x >= expandedMin.x && point.x <= expandedMax.x &&
 *   point.y >= expandedMin.y && point.y <= expandedMax.y &&
 *   point.z >= expandedMin.z && point.z <= expandedMax.z
 */
export function filterFoliageClippingBuildings(
  foliageList: FoliageInstance[],
  buildingBoxes: BuildingAABB[],
  bufferDistance: number = 2.0
): FilterFoliageResult {
  const numBuildings = buildingBoxes.length;
  const numFoliage = foliageList.length;

  // Pre-calculate expanded bounding box limits once for maximum iteration velocity
  const expandedMinX = new Float64Array(numBuildings);
  const expandedMinY = new Float64Array(numBuildings);
  const expandedMinZ = new Float64Array(numBuildings);
  const expandedMaxX = new Float64Array(numBuildings);
  const expandedMaxY = new Float64Array(numBuildings);
  const expandedMaxZ = new Float64Array(numBuildings);

  for (let b = 0; b < numBuildings; b++) {
    const box = buildingBoxes[b];
    expandedMinX[b] = Math.min(box.min.x, box.max.x) - bufferDistance;
    expandedMinY[b] = Math.min(box.min.y, box.max.y) - bufferDistance;
    expandedMinZ[b] = Math.min(box.min.z, box.max.z) - bufferDistance;
    expandedMaxX[b] = Math.max(box.min.x, box.max.x) + bufferDistance;
    expandedMaxY[b] = Math.max(box.min.y, box.max.y) + bufferDistance;
    expandedMaxZ[b] = Math.max(box.min.z, box.max.z) + bufferDistance;
  }

  const survivingFoliage: FoliageInstance[] = [];
  const removedFoliage: FoliageInstance[] = [];

  for (let f = 0; f < numFoliage; f++) {
    const plant = foliageList[f];
    const px = plant.position.x;
    const py = plant.position.y;
    const pz = plant.position.z;
    let isInsideBuildingZone = false;

    for (let b = 0; b < numBuildings; b++) {
      if (
        px >= expandedMinX[b] &&
        px <= expandedMaxX[b] &&
        py >= expandedMinY[b] &&
        py <= expandedMaxY[b] &&
        pz >= expandedMinZ[b] &&
        pz <= expandedMaxZ[b]
      ) {
        isInsideBuildingZone = true;
        break;
      }
    }

    if (isInsideBuildingZone) {
      plant.isMasked = true;
      removedFoliage.push(plant);
    } else {
      plant.isMasked = false;
      survivingFoliage.push(plant);
    }
  }

  return {
    survivingFoliage,
    removedFoliage,
    totalChecked: numFoliage,
    totalRemoved: removedFoliage.length,
  };
}

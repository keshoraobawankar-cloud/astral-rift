import bpy
import bmesh
import math
from mathutils import Vector

def generate_gscatter_density_vertex_group(
    group_name="GScatter_Density",
    slope_angle_threshold_deg=38.0,
    slope_falloff_deg=10.0,
    min_height=-100.0,
    max_height=80.0,
    height_falloff=5.0
):
    """
    Creates or updates a vertex group named 'GScatter_Density' on the active terrain mesh.
    Procedurally computes weights based on vertex slope normal (masking steep cliffs)
    and optional altitude constraints for GScatter vegetation scattering.
    """
    obj = bpy.context.active_object

    if not obj or obj.type != 'MESH':
        print("[Error] Please select an active Terrain Mesh object.")
        return False

    mesh = obj.data
    world_matrix = obj.matrix_world
    normal_matrix = world_matrix.to_3x3().inverted().transposed()

    # Ensure or create vertex group
    vgroup = obj.vertex_groups.get(group_name)
    if not vgroup:
        vgroup = obj.vertex_groups.new(name=group_name)

    # Convert angle thresholds to cosines of angles for fast dot-product checking
    # Dot product of normal with Vector((0, 0, 1)) gives cos(slope_angle)
    # Flat ground has normal.z == 1.0 (0 deg), vertical cliff has normal.z == 0.0 (90 deg)
    max_slope_rad = math.radians(slope_angle_threshold_deg)
    falloff_rad = math.radians(slope_falloff_deg)
    
    min_cos = math.cos(max_slope_rad + falloff_rad)
    max_cos = math.cos(max_slope_rad)

    # Use BMesh to calculate vertex normals and world-space positions
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bm.normal_update()

    up_vector = Vector((0.0, 0.0, 1.0))

    # Weight assignment loop
    for v in bm.verts:
        # World space vertex position and normal
        world_pos = world_matrix @ v.co
        world_norm = (normal_matrix @ v.normal).normalized()

        # 1. Slope Weight Calculation (Flat ground = 1.0, Cliff = 0.0)
        slope_cos = world_norm.dot(up_vector)
        if slope_cos >= max_cos:
            slope_weight = 1.0
        elif slope_cos <= min_cos:
            slope_weight = 0.0
        else:
            # Smooth Hermite interpolation between min_cos and max_cos
            t = (slope_cos - min_cos) / (max_cos - min_cos)
            slope_weight = t * t * (3.0 - 2.0 * t)

        # 2. Altitude / Height Falloff (Optional bounds)
        height = world_pos.z
        if height < min_height or height > max_height:
            height_weight = 0.0
        else:
            height_weight = 1.0
            if height < min_height + height_falloff:
                height_weight = (height - min_height) / height_falloff
            elif height > max_height - height_falloff:
                height_weight = (max_height - height) / height_falloff

        # Final combined weight
        final_weight = max(0.0, min(1.0, slope_weight * height_weight))
        vgroup.add([v.index], final_weight, 'REPLACE')

    bm.free()
    mesh.update()
    print(f"[GScatter] Successfully generated vertex group '{group_name}' on '{obj.name}' with {len(mesh.vertices)} vertices.")
    return True

if __name__ == "__main__":
    generate_gscatter_density_vertex_group(
        group_name="GScatter_Density",
        slope_angle_threshold_deg=35.0,  # Any surface steeper than 35 deg starts fading
        slope_falloff_deg=8.0,           # Smooth falloff buffer
        min_height=-50.0,
        max_height=60.0
    )

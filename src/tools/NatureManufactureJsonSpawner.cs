#if UNITY_EDITOR
using System;
using System.IO;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;

namespace Aethelgard.Tools
{
    [Serializable]
    public class BiomeSpawnEntry
    {
        public string id;
        public string species;
        public Vector2XZ position;
        public int speedtree_seed;
        public float growth_age_factor;
        public string foliage_tint;
    }

    [Serializable]
    public class Vector2XZ
    {
        public float x;
        public float z;
    }

    [Serializable]
    public class BiomeSpawnManifest
    {
        public string biome_name;
        public List<BiomeSpawnEntry> instances;
    }

    /// <summary>
    /// Custom Unity Editor Window that imports JSON coordinate layouts
    /// and spawns NatureManufacture prefabs, automatically snapping their Y elevation
    /// to the underlying TerrainCollider with subtle natural rotation.
    /// </summary>
    public class NatureManufactureJsonSpawner : EditorWindow
    {
        [Header("JSON Configuration")]
        [SerializeField] private TextAsset jsonManifestAsset;

        [Header("Prefab Pool References")]
        [Tooltip("Assign your NatureManufacture_Meadow_Tree prefabs here")]
        [SerializeField] private GameObject[] meadowTreePrefabs;

        [Tooltip("Assign your NatureManufacture_Forest_Rock prefabs here")]
        [SerializeField] private GameObject[] forestRockPrefabs;

        [Header("Spawn Settings")]
        [SerializeField] private LayerMask terrainLayer = ~0;
        [SerializeField] private float raycastHeight = 500f;
        [SerializeField] private float minRandomScale = 0.85f;
        [SerializeField] private float maxRandomScale = 1.25f;
        [SerializeField] private float maxTiltAngleDeg = 4.0f; // Subtle organic terrain lean

        private Vector2 scrollPos;

        [MenuItem("Tools/Aethelgard/NatureManufacture JSON Spawner")]
        public static void OpenWindow()
        {
            GetWindow<NatureManufactureJsonSpawner>("Biome Spawner").Show();
        }

        private void OnGUI()
        {
            scrollPos = EditorGUILayout.BeginScrollView(scrollPos);
            EditorGUILayout.LabelField("NatureManufacture Biome JSON Spawner", EditorStyles.boldLabel);
            EditorGUILayout.HelpBox("Parses coordinate layouts and instances NatureManufacture prefabs aligned to terrain.", MessageType.Info);
            EditorGUILayout.Space(8);

            jsonManifestAsset = (TextAsset)EditorGUILayout.ObjectField("JSON Manifest", jsonManifestAsset, typeof(TextAsset), false);

            SerializedObject so = new SerializedObject(this);
            SerializedProperty treesProp = so.FindProperty("meadowTreePrefabs");
            SerializedProperty rocksProp = so.FindProperty("forestRockPrefabs");

            EditorGUILayout.PropertyField(treesProp, new GUIContent("Meadow Tree Prefabs"), true);
            EditorGUILayout.PropertyField(rocksProp, new GUIContent("Forest Rock Prefabs"), true);
            so.ApplyModifiedProperties();

            EditorGUILayout.Space(6);
            terrainLayer = EditorGUILayout.LayerField("Terrain LayerMask", terrainLayer);
            raycastHeight = EditorGUILayout.FloatField("Raycast Start Elevation", raycastHeight);
            minRandomScale = EditorGUILayout.Slider("Min Scale Multiplier", minRandomScale, 0.4f, 1.0f);
            maxRandomScale = EditorGUILayout.Slider("Max Scale Multiplier", maxRandomScale, 1.0f, 2.0f);
            maxTiltAngleDeg = EditorGUILayout.Slider("Max Organic Lean (deg)", maxTiltAngleDeg, 0f, 12f);

            EditorGUILayout.Space(12);
            GUI.backgroundColor = new Color(0.2f, 0.8f, 0.4f);
            if (GUILayout.Button("Instantiate Biome Prefabs", GUILayout.Height(36)))
            {
                ExecuteSpawn();
            }
            GUI.backgroundColor = Color.white;

            EditorGUILayout.EndScrollView();
        }

        private void ExecuteSpawn()
        {
            if (jsonManifestAsset == null)
            {
                EditorUtility.DisplayDialog("Error", "Please assign a valid JSON Manifest TextAsset.", "OK");
                return;
            }

            BiomeSpawnManifest manifest;
            try
            {
                manifest = JsonUtility.FromJson<BiomeSpawnManifest>(jsonManifestAsset.text);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[Spawner] Failed to parse JSON manifest: {ex.Message}");
                return;
            }

            if (manifest == null || manifest.instances == null || manifest.instances.Count == 0)
            {
                Debug.LogWarning("[Spawner] Manifest is empty or contains no instances.");
                return;
            }

            GameObject parentGroup = new GameObject($"[Biome]_{manifest.biome_name}_{DateTime.Now:HHmmss}");
            Undo.RegisterCreatedObjectUndo(parentGroup, "Spawn Biome Prefabs");

            int spawnedTrees = 0;
            int spawnedRocks = 0;

            for (int i = 0; i < manifest.instances.Count; i++)
            {
                var entry = manifest.instances[i];
                float x = entry.position.x;
                float z = entry.position.z;

                // Raycast downward to accurately find underlying terrain surface
                Vector3 rayOrigin = new Vector3(x, raycastHeight, z);
                if (Physics.Raycast(rayOrigin, Vector3.down, out RaycastHit hit, raycastHeight * 2f, terrainLayer))
                {
                    // Select prefab (alternate or use entry metadata)
                    bool isRock = entry.id.Contains("rock") || (i % 5 == 0 && forestRockPrefabs != null && forestRockPrefabs.Length > 0);
                    GameObject prefabToSpawn = null;

                    if (isRock && forestRockPrefabs != null && forestRockPrefabs.Length > 0)
                    {
                        prefabToSpawn = forestRockPrefabs[UnityEngine.Random.Range(0, forestRockPrefabs.Length)];
                    }
                    else if (meadowTreePrefabs != null && meadowTreePrefabs.Length > 0)
                    {
                        prefabToSpawn = meadowTreePrefabs[UnityEngine.Random.Range(0, meadowTreePrefabs.Length)];
                    }

                    if (prefabToSpawn == null) continue;

                    // Compute subtle random rotation (yaw 0-360, subtle tilt)
                    float yaw = UnityEngine.Random.Range(0f, 360f);
                    float tiltX = UnityEngine.Random.Range(-maxTiltAngleDeg, maxTiltAngleDeg);
                    float tiltZ = UnityEngine.Random.Range(-maxTiltAngleDeg, maxTiltAngleDeg);
                    Quaternion rotation = Quaternion.Euler(tiltX, yaw, tiltZ);

                    // Instantiate with Undo support
                    GameObject instance = (GameObject)PrefabUtility.InstantiatePrefab(prefabToSpawn, parentGroup.transform);
                    if (instance == null) instance = Instantiate(prefabToSpawn, parentGroup.transform);

                    instance.transform.position = hit.point;
                    instance.transform.rotation = rotation;

                    // Apply growth scale factor from manifest blended with random scale
                    float growthScale = entry.growth_age_factor > 0 ? entry.growth_age_factor : 1.0f;
                    float finalScale = UnityEngine.Random.Range(minRandomScale, maxRandomScale) * growthScale;
                    instance.transform.localScale = Vector3.one * finalScale;

                    instance.name = $"{entry.id}_{prefabToSpawn.name}";
                    Undo.RegisterCreatedObjectUndo(instance, "Spawn Biome Object");

                    if (isRock) spawnedRocks++;
                    else spawnedTrees++;
                }
                else
                {
                    Debug.LogWarning($"[Spawner] No terrain collider hit at coordinates ({x:F1}, {z:F1}). Skipping.");
                }
            }

            Debug.Log($"<color=green>[Biome Spawner]</color> Successfully spawned {spawnedTrees} trees and {spawnedRocks} rocks into '{parentGroup.name}'.");
        }
    }
}
#endif

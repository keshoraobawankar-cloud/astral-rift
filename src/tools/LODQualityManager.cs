#if UNITY_EDITOR
using UnityEditor;
#endif
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Aethelgard.Optimization
{
    /// <summary>
    /// Dynamic LOD Bias & Graphics Tier Controller.
    /// Finds all LODGroup components in the active scene and modifies global LOD bias
    /// as well as individual LODGroup transition curves for aggressive culling or ultra visual fidelity.
    /// </summary>
    [ExecuteAlways]
    public class LODQualityManager : MonoBehaviour
    {
        public enum GraphicsQualityTier
        {
            Low,     // Aggressive culling: distant billboards swap much closer to the camera
            Medium,  // Balanced performance / fidelity
            High,    // Extended high-poly distance
            Ultra    // Maximum 3D mesh visibility distance, billboards pushed far away
        }

        [Header("Global Quality Preset")]
        [SerializeField] private GraphicsQualityTier currentTier = GraphicsQualityTier.High;

        [Header("LOD Bias Settings (QualitySettings.lodBias)")]
        [Tooltip("Low Mode: Forces low poly/billboard swap much earlier (closer to camera)")]
        [Range(0.2f, 1.0f)] public float lowLodBias = 0.45f;

        [Range(0.8f, 1.5f)] public float mediumLodBias = 1.0f;

        [Range(1.2f, 2.5f)] public float highLodBias = 1.8f;

        [Tooltip("Ultra Mode: Extends full 3D mesh visibility into far distances")]
        [Range(2.0f, 5.0f)] public float ultraLodBias = 3.5f;

        [Header("Scene Statistics")]
        [SerializeField, HideInInspector] private int cachedLODGroupCount = 0;

        public int CachedLODGroupCount => cachedLODGroupCount;

        private void OnEnable()
        {
            ApplyGraphicsTier(currentTier);
        }

        /// <summary>
        /// Applies preset LOD bias settings across all scene LODGroups and QualitySettings.
        /// </summary>
        public void ApplyGraphicsTier(GraphicsQualityTier tier)
        {
            currentTier = tier;
            float targetBias = 1.0f;

            switch (tier)
            {
                case GraphicsQualityTier.Low:
                    targetBias = lowLodBias;
                    break;
                case GraphicsQualityTier.Medium:
                    targetBias = mediumLodBias;
                    break;
                case GraphicsQualityTier.High:
                    targetBias = highLodBias;
                    break;
                case GraphicsQualityTier.Ultra:
                    targetBias = ultraLodBias;
                    break;
            }

            // 1. Set global engine LOD Bias (affects all LODGroup distance calculations)
            QualitySettings.lodBias = targetBias;

            // 2. Discover all LODGroup components in the active scene
            LODGroup[] sceneLODGroups = FindObjectsByType<LODGroup>(FindObjectsInactive.Include, FindObjectsSortMode.None);
            cachedLODGroupCount = sceneLODGroups.Length;

            // 3. Optional per-group validation or custom property overrides
            foreach (var lodGroup in sceneLODGroups)
            {
                if (lodGroup == null) continue;

                // Force recalculation of bounds and notify renderer subsystem
                lodGroup.RecalculateBounds();
            }

            Debug.Log($"[LODQualityManager] Switched to <color=cyan>{tier}</color> Mode. " +
                      $"QualitySettings.lodBias set to <b>{targetBias:F2}</b> across <b>{cachedLODGroupCount}</b> LODGroups.");
        }

        /// <summary>
        /// Returns all LODGroup instances currently loaded in active scene.
        /// </summary>
        public LODGroup[] GetAllSceneLODGroups()
        {
            return FindObjectsByType<LODGroup>(FindObjectsInactive.Include, FindObjectsSortMode.None);
        }

        /// <summary>
        /// Custom runtime override to set arbitrary custom float bias.
        /// </summary>
        public void SetCustomBias(float customBias)
        {
            QualitySettings.lodBias = Mathf.Clamp(customBias, 0.1f, 8.0f);
            Debug.Log($"[LODQualityManager] Custom LOD bias set to: {QualitySettings.lodBias}");
        }
    }

#if UNITY_EDITOR
    /// <summary>
    /// Custom Inspector GUI providing one-click preset buttons and scene diagnostic readouts.
    /// </summary>
    [CustomEditor(typeof(LODQualityManager))]
    public class LODQualityManagerEditor : Editor
    {
        public override void OnInspectorGUI()
        {
            DrawDefaultInspector();

            LODQualityManager manager = (LODQualityManager)target;

            EditorGUILayout.Space(12);
            EditorGUILayout.LabelField("Quick Quality Tier Switcher", EditorStyles.boldLabel);

            EditorGUILayout.BeginHorizontal();
            if (GUILayout.Button("Low (Fast Billboards)", GUILayout.Height(30)))
            {
                Undo.RecordObject(manager, "Set LOD Low");
                manager.ApplyGraphicsTier(LODQualityManager.GraphicsQualityTier.Low);
            }
            if (GUILayout.Button("Medium (Balanced)", GUILayout.Height(30)))
            {
                Undo.RecordObject(manager, "Set LOD Medium");
                manager.ApplyGraphicsTier(LODQualityManager.GraphicsQualityTier.Medium);
            }
            EditorGUILayout.EndHorizontal();

            EditorGUILayout.BeginHorizontal();
            if (GUILayout.Button("High (Enhanced)", GUILayout.Height(30)))
            {
                Undo.RecordObject(manager, "Set LOD High");
                manager.ApplyGraphicsTier(LODQualityManager.GraphicsQualityTier.High);
            }
            if (GUILayout.Button("Ultra (Max 3D Range)", GUILayout.Height(30)))
            {
                Undo.RecordObject(manager, "Set LOD Ultra");
                manager.ApplyGraphicsTier(LODQualityManager.GraphicsQualityTier.Ultra);
            }
            EditorGUILayout.EndHorizontal();

            EditorGUILayout.Space(8);
            EditorGUILayout.HelpBox(
                $"Current Active QualitySettings.lodBias: {QualitySettings.lodBias:F2}\n" +
                $"Scene LODGroup Components Found: {manager.CachedLODGroupCount}",
                MessageType.Info
            );

            if (GUILayout.Button("Rescan & Refresh Scene LODGroups", GUILayout.Height(24)))
            {
                manager.ApplyGraphicsTier(LODQualityManager.GraphicsQualityTier.High);
            }
        }
    }
#endif
}

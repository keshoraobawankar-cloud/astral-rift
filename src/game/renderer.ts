import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// High-End Post-Processing & Unreal Bloom Setup
export function setupPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number
): {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  resize: (w: number, h: number) => void;
} {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Unreal Bloom Pass for magical glows, stardust, prism blade reflections & caldera pyres
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    1.15, // Bloom Strength
    0.45, // Radius
    0.82  // Threshold: only bright emissive crystals, eyes, lasers & magic glow
  );
  composer.addPass(bloomPass);

  const resize = (newWidth: number, newHeight: number) => {
    composer.setSize(newWidth, newHeight);
    bloomPass.resolution.set(newWidth, newHeight);
  };

  return { composer, bloomPass, resize };
}

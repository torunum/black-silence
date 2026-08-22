import type * as THREE from "three";

/**
 * The Three.js core objects. All eight are null until loadLevel() builds
 * them, except `camera` and `renderer`, which are constructed once at boot
 * and outlive every level — the reference builds them at module scope and
 * only ever rebuilds `scene`.
 *
 * `scene` is mirrored into src/render/SceneRef.ts by loadLevel because the
 * FX modules read it through that accessor. This module is the owner; the
 * mirror is a Plan 0C artifact and goes away in Plan 0E when the FX modules
 * take the scene as a parameter.
 */
export const renderState = {
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  renderer: null as THREE.WebGLRenderer | null,
  lamp: null as THREE.PointLight | null,
  lampCore: null as THREE.PointLight | null,
  muzzleLight: null as THREE.PointLight | null,
  boomLight: null as THREE.PointLight | null,
  ambLight: null as THREE.AmbientLight | null,
};

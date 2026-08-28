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
 *
 * TYPE HONESTY NOTE: every field below is declared with its non-null Three
 * type, never `| null`, even though all eight are genuinely null until boot
 * (`camera`/`renderer`, built by `src/render/RenderCore.ts`'s module body)
 * and the first `loadLevel` (the rest, built by `src/world/LevelLoader.ts`).
 * This is Plan 0F Task 10's `renderState` counterpart to Task 9's
 * `ctx()`/`masterBus()`/`echoBus()` in `src/audio/AudioEngine.ts`: the same
 * shape (state that does not exist until an init step runs, read by dozens
 * of call sites that only ever execute after that step has), the same
 * boundary fix, and the same honesty cost. Declaring the fields nullable
 * would force either 66 scattered local guards across a dozen files or one
 * non-null assertion per read; declaring them non-null here, once, is
 * honest about the *shape* of the contract (never read before init) while
 * admitting the type no longer proves it — a caller that reads
 * `renderState.scene` before the first `loadLevel` gets no compile error
 * and fails at runtime instead, exactly like an audio accessor called
 * before `audioInit()`. `src/core/Loop.ts`'s `if(renderState.scene){...}`
 * guard is the one place that already defends against this at runtime; it
 * stays even though this change makes the compiler consider it
 * unconditionally true.
 */
export const renderState = {
  scene: null as unknown as THREE.Scene,
  camera: null as unknown as THREE.PerspectiveCamera,
  renderer: null as unknown as THREE.WebGLRenderer,
  lamp: null as unknown as THREE.PointLight,
  lampCore: null as unknown as THREE.PointLight,
  muzzleLight: null as unknown as THREE.PointLight,
  boomLight: null as unknown as THREE.PointLight,
  ambLight: null as unknown as THREE.AmbientLight,
};

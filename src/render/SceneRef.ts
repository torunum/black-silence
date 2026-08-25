import * as THREE from "three";

/**
 * A thin bridge for `scene`, whose owner is now src/render/Renderer.ts's
 * `renderState.scene` (Plan 0D Task 7). This module is the mirror that the
 * FX modules extracted in Phase 0C Task 2 (src/fx/Particles.ts, Decals.ts,
 * Gibs.ts) read through. Plan 0E Task 5 deferred deleting it; Task 12
 * checked and found all five `getScene()` call sites (two in Decals.ts, two
 * in Gibs.ts, one in Particles.ts) still live, so it stays. Having those
 * three modules take the scene as a parameter instead remains a real
 * option for whichever later task next touches them.
 *
 * `scene` is rebuilt with `new THREE.Scene()` on every level load
 * (legacy.js's loadLevel()), so a `const scene = getScene()` hoisted to any
 * importing module's top level would capture whatever the reference held at
 * *import* time — module top level runs once, long before the first level
 * loads — and stay stale (or throw) forever after. Every caller must call
 * getScene() at its point of use, inside each function body, never cache the
 * result in a module-scoped const — the same rule that governs
 * src/audio/AudioEngine.ts's ctx()/masterBus()/echoBus() accessors.
 *
 * legacy.js calls setScene(renderState.scene) immediately after
 * `renderState.scene=new THREE.Scene()` in loadLevel(), before
 * buildParticles()/resetDecals()/resetGibs() run, so every FX module sees
 * the current level's scene by the time anything in this task's modules
 * touches it.
 *
 * A single shared accessor (rather than each of the three FX modules owning
 * its own private `let scene` + `setScene`) was the deliberate choice: one
 * call site in legacy.js to keep in sync per level load instead of three,
 * and one place to delete when Plan 0E has the FX modules take the scene as
 * a parameter instead of reading it through this accessor.
 */

let currentScene: THREE.Scene | null = null;

export function setScene(s: THREE.Scene): void {
  currentScene = s;
}

/**
 * Throws if called before the first setScene() — every real call site only
 * runs during gameplay, after loadLevel() has already run, so this matches
 * the reference's own failure mode (a ReferenceError reading the bare
 * `scene` global before it exists) rather than silently no-oping.
 */
export function getScene(): THREE.Scene {
  if (!currentScene) throw new Error("getScene(): scene not set — loadLevel() must call setScene() first");
  return currentScene;
}

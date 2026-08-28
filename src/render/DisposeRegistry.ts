/**
 * DISPOSE REGISTRY — the opt-in list of per-level GPU resources (geometries,
 * materials, textures, and anything else with a `.dispose()` method) that
 * `loadLevel` (`src/world/LevelLoader.ts`) frees before building the next
 * level. Plan 0F Task 7, spec step 12.
 *
 * Before this task there was not one `.dispose()` call anywhere in the
 * codebase: `loadLevel` simply replaced `renderState.scene` with a new
 * `THREE.Scene()`, orphaning every geometry/material/texture the previous
 * level's walls, floors, props, enemies and lights had created. Eight levels
 * in a session leaked eight levels of GPU memory.
 *
 * `track()` is opt-in by design and deliberately does **not** walk the scene
 * graph (`scene.traverse(...)`) to find things to dispose. A handful of
 * THREE resources are created once at module scope and reused by *every*
 * level — disposing one of those would break the next level's rendering, and
 * the failure would surface far from this file. Only call sites that
 * explicitly wrap their own `new THREE.*` (or `.clone()`) result in `track()`
 * are ever freed; nothing is swept up implicitly. See
 * `src/world/LevelLoader.ts`, `src/fx/Particles.ts`, `src/fx/Decals.ts`,
 * `src/world/Props.ts`, `src/enemies/Death.ts`, `src/enemies/ai/Attacks.ts`
 * and `src/weapons/WeaponState.ts` for the call sites, and this task's report
 * (`.superpowers/sdd/2026-08-25-phase0f-ui-loop-and-hardening/task-7-report.md`)
 * for the full do-not-track derivation.
 */

interface Disposable { dispose(): void; }

const tracked: Disposable[] = [];

/**
 * Register a per-level GPU resource so `disposeAll()` frees it on the next
 * level load. Returns the resource unchanged, so it can wrap a constructor
 * inline (`track(new THREE.BoxGeometry(...))`) without disturbing the call
 * site. Values without a `.dispose()` method (meshes, groups, lights that
 * never allocate a shadow map, `THREE.Scene`, `THREE.Color`, …) are silently
 * ignored — only real GPU resources ever enter the list.
 */
export function track<T>(resource: T): T {
  if (resource && typeof (resource as unknown as Disposable).dispose === "function") {
    tracked.push(resource as unknown as Disposable);
  }
  return resource;
}

/** Frees every tracked resource and empties the registry. Safe to call with nothing tracked. */
export function disposeAll(): void {
  for (const r of tracked) r.dispose();
  tracked.length = 0;
}

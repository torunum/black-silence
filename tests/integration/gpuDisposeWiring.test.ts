// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { gibGeo } from "../../src/fx/Gibs";
import { poolMat } from "../../src/fx/Decals";

/**
 * Plan 0F Task 7 — the integration property `tests/render/disposeRegistry.test.ts`
 * cannot see on its own: that the real `loadLevel` (`src/world/LevelLoader.ts`)
 * actually calls `DisposeRegistry.ts`'s `disposeAll()` on every level load,
 * freeing the *previous* level's own geometries/materials — and, the actual
 * danger this task exists to guard against, never frees a resource shared
 * across every level. Tasks 5 and 6 each shipped with their own integration
 * property unproven and needed a follow-up commit
 * (`schedulerWiring.test.ts`, `timerCancellationWiring.test.ts`) to close the
 * gap; this file is that test for Task 7, written before the gap opens.
 *
 * ## The technique
 *
 * Three.js's `BufferGeometry`/`Material` `.dispose()` (three@0.128.0, see
 * `node_modules/three/src/core/BufferGeometry.js` and
 * `.../materials/Material.js`) does nothing but
 * `this.dispatchEvent({type:"dispose"})` — there is no `.disposed` flag or
 * other internal marker to read back afterward. That dispatch is itself a
 * clean, synchronous observable: attaching a `"dispose"` listener before the
 * level load and checking whether it fired proves *exactly* the fact this
 * task cares about (was `.dispose()` invoked on this object?) without
 * reaching into `DisposeRegistry.ts`'s private `tracked` array, which is
 * deliberately not exported.
 *
 * ## Why a sibling file, not an extension of an existing one
 *
 * Same reasoning `schedulerWiring.test.ts`/`timerCancellationWiring.test.ts`
 * give: `src/main.ts` boots a level and registers listeners at import time,
 * so it can run once per test file. This file's own boot is real DOM (no
 * mocked `Input`/`Overlay2D`/`viewmodel/draw`, no `requestAnimationFrame`
 * queue to drive) — it never needs a frame, only direct `loadLevel(...)`
 * calls, same as `timerCancellationWiring.test.ts`.
 */

let loadLevel: (idx: number) => void;

/** Any Mesh with its own geometry, straight off the live scene graph — walls, floor, props all qualify. */
function firstMeshGeometry(): { addEventListener(type: "dispose", cb: () => void): void } {
  const scene = renderState.scene as unknown as { children: Array<Record<string, unknown>> };
  const mesh = scene.children.find((o) => o.isMesh && o.geometry);
  if (!mesh) throw new Error("no per-level Mesh with a geometry found in the booted scene — can't prove disposal without one");
  return mesh.geometry as { addEventListener(type: "dispose", cb: () => void): void };
}

// Listeners for the two shared-resource guard tests below are attached here,
// at module top level — *before* `beforeAll` makes the very first `loadLevel`
// call (`main.ts`'s own boot, via the NEW GAME click) — not inside an `it()`.
// `gibGeo`/`poolMat` are module-scope consts built once, the moment
// `src/fx/Gibs.ts`/`src/fx/Decals.ts` are first imported (by this file's own
// static imports above, which run before anything in this file's `beforeAll`
// or `it` blocks). If either were ever mistakenly wrapped in `track(...)`,
// the *first* `loadLevel` call of the whole test run — the one `beforeAll`
// makes, not either `it` below — would be the one to dispose it, and
// `disposeAll()` never revisits an object once it's been disposed and
// dropped from the registry. A listener attached only inside an `it()` would
// have missed that: it always runs after `beforeAll`, so the dispose event
// would already be long past by the time it started listening, and both
// guard tests below would report a false "never disposed" — this is a
// mutation this file's own report confirms it caught on a proof run, then
// fixed to attach here instead. See this task's report.
let gibGeoDisposed = false, poolMatDisposed = false;
gibGeo.addEventListener("dispose", () => { gibGeoDisposed = true; });
poolMat.addEventListener("dispose", () => { poolMatDisposed = true; });

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  // jsdom implements neither, and startGame calls the first on the canvas.
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};

  // Dynamic, not top-of-file: src/world/LevelLoader.ts transitively imports
  // src/render/RenderCore.ts, which captures the WebGL canvas at its own
  // module scope the moment it is first evaluated — the same ordering
  // constraint contextWiring.test.ts's/timerCancellationWiring.test.ts's
  // headers explain for Overlay2D.ts's fx2d context/the canvas.
  ({ loadLevel } = await import("../../src/world/LevelLoader"));

  await import("../../src/main");

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  // NEW GAME's loadLevel(0) call puts us mid-level (not merely booted)
  // before any of this file's own loadLevel(...) calls below.
});

describe("loadLevel frees the previous level's own GPU resources", () => {
  /**
   * Defeated only by `loadLevel` never calling the real, module-scope
   * `disposeAll()` (or calling something not wired to the same `tracked`
   * list `track()` pushes into) — nothing else in this file ever calls
   * `.dispose()` on a geometry, so the listener can only fire if the
   * geometry `track()`ed during the level being replaced is still in the
   * registry when `disposeAll()` runs at the top of the next `loadLevel`.
   * Proven real: deleting the `disposeAll();` call from `loadLevel`
   * (`src/world/LevelLoader.ts`) turns this red — see this task's report for
   * the confirmation run.
   */
  it("disposes a wall/floor/prop mesh's geometry from the level being replaced", () => {
    const geo = firstMeshGeometry();
    let disposed = false;
    geo.addEventListener("dispose", () => { disposed = true; });

    loadLevel(1); // the same call src/ui/LevelEnd.ts's endLevel makes to advance a level

    expect(disposed).toBe(true);
  });

  /**
   * The "did not grow without bound" half of the brief: not just that the
   * *first* transition frees its resources (which a one-shot dispose call
   * mis-wired to fire once could fake), but that every subsequent transition
   * does too — proof the tracked list is drained and refilled each time
   * rather than accumulating.
   */
  it("keeps disposing on every subsequent load, not just the first", () => {
    const geoFromLevel1 = firstMeshGeometry(); // set up by the previous test's loadLevel(1)
    let disposed1 = false;
    geoFromLevel1.addEventListener("dispose", () => { disposed1 = true; });

    loadLevel(2);
    expect(disposed1).toBe(true);

    const geoFromLevel2 = firstMeshGeometry();
    let disposed2 = false;
    geoFromLevel2.addEventListener("dispose", () => { disposed2 = true; });

    loadLevel(3);
    expect(disposed2).toBe(true);
  });
});

describe("loadLevel never disposes a resource shared across every level — this task's real danger", () => {
  /**
   * `gibGeo` (`src/fx/Gibs.ts`) is a module-scope const reused by every gib
   * spawned in every level. If it were ever wrapped in `track(...)`, the
   * *first* level load of the whole run — `beforeAll`'s own boot, not
   * either `loadLevel` call below — would dispose it, and every gib spawned
   * afterward, in every future level, would render with disposed
   * (undefined-behavior) geometry. `gibGeoDisposed` is wired up at module
   * top level, above, specifically so this test also catches that case, not
   * just a dispose triggered by the two `loadLevel` calls below.
   */
  it("leaves Gibs.ts's shared gibGeo undisposed across boot and further level loads", () => {
    loadLevel(4);
    loadLevel(5);
    expect(gibGeoDisposed).toBe(false);
  });

  /**
   * `poolMat` (`src/fx/Decals.ts`) is one of the four shared blood/scorch
   * materials every level's `addPool` reuses. Same failure mode, and same
   * "wired up before boot" reasoning, as `gibGeo` above.
   */
  it("leaves Decals.ts's shared poolMat undisposed across boot and further level loads", () => {
    loadLevel(6);
    expect(poolMatDisposed).toBe(false);
  });
});

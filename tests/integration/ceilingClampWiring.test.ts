// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { projectiles } from "../../src/fx/Projectiles";
import { renderState } from "../../src/render/Renderer";
import { player } from "../../src/player/PlayerState";
import { WALLH } from "../../src/world/Grid";
import { ceilHeightAt, solidAt } from "../../src/world/Collision";

/**
 * Phase 2 Part B Task 1 — **the wiring half**. `tests/world/ceiling.test.ts`
 * proves the geometry follows `world.ceilMap`; this file proves the thing
 * that flies does too, **at its call site**.
 *
 * That distinction is the whole reason this is a second file. Plan 0F's
 * lesson, recorded in `docs/STATUS.md`: four migrated `setTimeout` delays had
 * `core/time.test.ts` proving the mechanism and
 * `integration/schedulerWiring.test.ts` proving the loop drove it, and a
 * thousandfold ms-for-seconds error at the real call sites still passed 391
 * tests because no test reached those sites. `ceilHeightAt` returning 8.6 is
 * worth nothing if `src/fx/ProjectileTick.ts` never asks it — and the
 * failure mode there is specifically invisible: a cross that detonates at
 * 3.4 with five metres of open vault above it reads as a rendering glitch,
 * not a clamp, and no geometry assertion would ever notice.
 *
 * So both of `projTick`'s flight loops are driven here with a real level
 * loaded, once where the ceiling is raised and once where it is not.
 */

let loadLevel: (idx: number) => void;
let projTick: (dt: number) => void;

/** A crown cell of level 3's vault: grid (15,11), authored ceiling 8.6, floor 0. */
const VAULT_X = 31, VAULT_Z = 23;
/** Above WALLH, well below the vault — the exact band the old constant got wrong. */
const HIGH_Y = 6.0;

function pushNail(x: number, y: number, z: number, reap: boolean): Record<string, unknown> {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  renderState.scene.add(m);
  const n = { m, vx: 0, vy: 0, vz: 0, life: 99, reap, spin: 0 };
  projectiles.nails.push(n as unknown as Record<string, unknown>);
  return n as unknown as Record<string, unknown>;
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};

  // Dynamic for the same reason tests/world/geometry.test.ts is: these
  // modules transitively capture the WebGL canvas at module scope.
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ projTick } = await import("../../src/fx/ProjectileTick"));
  await import("../../src/main");

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
});

// KNOWN-19: every loadLevel call here runs on the real clock and arms
// loadLevel's own setTimeout timers (the longest, 1400ms) with nothing in
// this file to absorb them. Same fix as the seven files Phase 3 Part D
// corrected — see tests/integration/gpuDisposeWiring.test.ts's afterAll.
afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

describe("projTick clamps flight to the local ceiling, not to WALLH", () => {
  it("the premise holds: the chosen point is open floor under a ceiling well above WALLH", () => {
    loadLevel(3);
    expect(solidAt(VAULT_X, VAULT_Z)).toBe(false);
    expect(ceilHeightAt(VAULT_X, VAULT_Z)).toBeGreaterThan(HIGH_Y);
    expect(HIGH_Y).toBeGreaterThan(WALLH); // otherwise every case below is vacuous
  });

  it("a cross still flying at y=6 inside level 3's vault survives the frame", () => {
    loadLevel(3);
    projectiles.nails.length = 0;
    pushNail(VAULT_X, HIGH_Y, VAULT_Z, false);
    projTick(0.001);
    // Reverting the clamp to `my>WALLH` detonates it here — that is this
    // test's named mutation, and it reddens exactly this line.
    expect(projectiles.nails.length).toBe(1);
  });

  it("a reaper tracer at y=6 inside the same vault survives too — both loops are wired", () => {
    loadLevel(3);
    projectiles.nails.length = 0;
    pushNail(VAULT_X, HIGH_Y, VAULT_Z, true);
    projTick(0.001);
    expect(projectiles.nails.length).toBe(1);
  });

  it("but the same cross at the same height dies on a level with no ceiling map", () => {
    loadLevel(1);
    expect(ceilHeightAt(player.px, player.pz)).toBe(WALLH); // level 1 never opted in
    projectiles.nails.length = 0;
    pushNail(player.px, HIGH_Y, player.pz, false);
    projTick(0.001);
    // The control that makes the two cases above mean something: if the
    // clamp were simply removed rather than made local, they would pass and
    // this would not.
    expect(projectiles.nails.length).toBe(0);
  });

  it("and a reaper tracer at the same height dies there too", () => {
    loadLevel(1);
    projectiles.nails.length = 0;
    pushNail(player.px, HIGH_Y, player.pz, true);
    projTick(0.001);
    expect(projectiles.nails.length).toBe(0);
  });

  it("a cross above even the vault's crown still dies — the clamp follows the map, it is not switched off", () => {
    loadLevel(3);
    projectiles.nails.length = 0;
    pushNail(VAULT_X, ceilHeightAt(VAULT_X, VAULT_Z) + 0.5, VAULT_Z, false);
    projTick(0.001);
    expect(projectiles.nails.length).toBe(0);
  });
});

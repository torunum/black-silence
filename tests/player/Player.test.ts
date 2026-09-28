// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import type * as PlayerModule from "../../src/player/Player";
import { stride, STRIDE_Y } from "../../src/render/viewmodel/motion";

/**
 * Pins `player.bobT`'s per-frame rate constants (`WALK_BOB_RATE`,
 * `SPRINT_BOB_RATE` — see Player.ts's own doc comment on them), which drive
 * the footstep zero-crossing trigger, the camera's head bob and, via the
 * same shared `bobT`, the weapon viewmodel's stride
 * (`src/render/viewmodel/motion.ts`'s `stride`, whose own shape is pinned by
 * `tests/behavior/viewmodelMotion.test.ts`).
 *
 * ## History
 *
 * **Round 1 (2026-09-17)** changed sprint's rate from `1.9` to walk's `1.6`
 * after the owner heard running's footsteps as "far too much noise". Until
 * then no test in this repo named `bobT`'s rate at all — this file was added
 * so the next tuning pass had something to rewrite instead of grepping
 * Player.ts by hand.
 *
 * **Round 2 (2026-09-28)** is that next pass. The owner played again and
 * reported, in Turkish, that running's speed was wrong: the weapon seemed to
 * sway left and right very fast, and so did the footsteps. Measured, the
 * speed was fine and the *cadence* was not. A footstep fires once per 2π of
 * `bobT*4`, so steps per second = `spd·rate·4/2π`:
 *
 * |           | speed | at 1.6 (round 1)      | at 0.45 (now)          |
 * |-----------|-------|-----------------------|------------------------|
 * | walking   | 7     | 7·1.6·4/2π = **7.13** | 7·0.45·4/2π = **2.01** |
 * | sprinting | 10.5  | 10.5·1.6·4/2π = **10.70** | 10.5·0.45·4/2π = **3.01** |
 *
 * A human walks at about 2 steps a second and runs at about 3. The
 * viewmodel's figure-eight sways sideways once per *two* steps, so its
 * left-right swing went from 3.6/5.3 Hz to **1.0/1.5 Hz**. One rate still
 * serves both gaits: sprinting steps 1.5x as often as walking because it
 * moves 1.5x as fast, and for no other reason (round 1's rule, kept).
 * Movement speed and acceleration are untouched — the second block below
 * measures the cadence through the real `playerTick`, at the speeds the
 * real integrator reaches.
 *
 * `Player` is imported dynamically, after `installDomStubs()`/
 * `loadGameHtml()`: `Player.ts` transitively imports
 * `src/render/Overlay2D.ts` (captures the real `#fx2d` 2D context at module
 * top level) and `src/render/Renderer.ts` (builds the real
 * `THREE.WebGLRenderer`, which needs `installDomStubs()`'s `getContext`
 * stub). A static import throws before either element is ready.
 *
 * Footsteps are counted where the game plays them: `sounds/steps`'s
 * `footstep` is wrapped to record each call (and play nothing), and
 * `AudioEngine`'s `ctx()` answers truthy so `Player.ts`'s `if(!ctx())`
 * guard lets the call through, exactly as it does once a game has started.
 */
let Player: typeof PlayerModule;
let player: typeof import("../../src/player/PlayerState").player;
let keys: Record<string, boolean>;
let input: typeof import("../../src/player/Input").input;
let world: typeof import("../../src/world/WorldState").world;
let EYE: number;

const steps: Array<{ bobT: number; sprinting: boolean }> = [];
vi.mock("../../src/audio/AudioEngine", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ctx: () => ({}),
}));
vi.mock("../../src/audio/sounds/steps", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  footstep: (sprinting: boolean) => { steps.push({ bobT: player.bobT, sprinting }); },
  landing: () => {},
}));

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  Player = await import("../../src/player/Player");
  ({ player } = await import("../../src/player/PlayerState"));
  ({ keys, input } = await import("../../src/player/Input"));
  ({ world } = await import("../../src/world/WorldState"));
  ({ EYE } = await import("../../src/world/Grid"));
  const { S } = await import("../../src/core/State");
  const { game } = await import("../../src/core/Game");
  S.dead = false; S.won = false; game.inputLock = false;
  // playerTick carries the lantern with the player; startGame builds it, and this file never starts a game
  const { renderState } = await import("../../src/render/Renderer");
  const THREE = await import("three");
  renderState.lamp ??= new THREE.PointLight();
});

beforeEach(() => { steps.length = 0; });

/** steps/s the formula gives at `spd` m/s: one footstep per 2π of bobT*4. */
const cadence = (spd: number, rate: number) => spd * rate * 4 / (2 * Math.PI);

describe("player.bobT rate (footstep cadence, camera bob and the weapon's stride)", () => {
  it("pins WALK_BOB_RATE/SPRINT_BOB_RATE at their round-2 values (2026-09-28)", () => {
    expect(Player.WALK_BOB_RATE).toBe(0.45);
    expect(Player.SPRINT_BOB_RATE).toBe(0.45);
  });

  it("gives about two steps a second walking and three sprinting — and the old 1.6 gave seven and eleven", () => {
    expect(cadence(7, Player.WALK_BOB_RATE)).toBeCloseTo(2.005, 3);
    expect(cadence(10.5, Player.SPRINT_BOB_RATE)).toBeCloseTo(3.008, 3);
    // the numbers the owner played, for the record
    expect(cadence(7, 1.6)).toBeCloseTo(7.13, 2);
    expect(cadence(10.5, 1.6)).toBeCloseTo(10.70, 2);
    // the stride sways sideways once per two steps
    expect(cadence(7, Player.WALK_BOB_RATE) / 2).toBeCloseTo(1.0, 1);
    expect(cadence(10.5, Player.SPRINT_BOB_RATE) / 2).toBeCloseTo(1.5, 1);
  });

  it("gives sprint no cadence bump beyond its own speed increase — sprint and walk share one rate", () => {
    // Was 1.9 vs 1.6 before round 1: sprint's cadence was walk's speed ratio
    // (10.5/7 = 1.5x) TIMES an extra 1.1875x from the rate alone.
    expect(Player.SPRINT_BOB_RATE).toBe(Player.WALK_BOB_RATE);
  });
});

describe("the cadence through the real playerTick", () => {
  const DT = 1 / 60;
  /** An open field, 10 cells wide and 80 deep, nothing in it; the player at its far end facing down it (-z). */
  function field(): void {
    world.grid = Array.from({ length: 80 }, () => Array.from({ length: 10 }, () => "."));
    world.heightMap = null; world.wallSegs = []; world.props = []; world.doors = {};
    world.exitPos = null; world.challenge = null; world.enemies = [];
    Object.assign(player, { px: 10, pz: 156, vx: 0, vy: 0, vz: 0, pyy: EYE, grounded: true, bobT: 0, lastBobSin: 0, spawnGuard: 0 });
    input.yaw = 0;
  }
  /** Holds W (and Shift, sprinting) for a second to reach speed, then counts footsteps over `secs`. */
  function walk(sprint: boolean, secs: number): { perSec: number; speed: number; found: typeof steps } {
    field();
    keys.KeyW = true; keys.ShiftLeft = sprint;
    try {
      for (let i = 0; i < 60; i++) Player.playerTick(DT);
      steps.length = 0;
      for (let i = 0; i < secs * 60; i++) Player.playerTick(DT);
    } finally {
      keys.KeyW = false; keys.ShiftLeft = false;
    }
    return { perSec: steps.length / secs, speed: Math.hypot(player.vx, player.vz), found: [...steps] };
  }

  it("walks at 7 m/s and steps about twice a second", () => {
    const { perSec, speed } = walk(false, 6);
    expect(speed).toBeCloseTo(7, 6);                 // movement speed untouched
    expect(perSec).toBeGreaterThanOrEqual(1.8);
    expect(perSec).toBeLessThanOrEqual(2.2);
  });

  it("sprints at 10.5 m/s and steps about three times a second — half again as often as walking", () => {
    const run = walk(true, 6), stroll = walk(false, 6);
    expect(run.speed).toBeCloseTo(10.5, 6);
    expect(run.perSec).toBeGreaterThanOrEqual(2.7);
    expect(run.perSec).toBeLessThanOrEqual(3.3);
    expect(run.found.every((s) => s.sprinting)).toBe(true);
    expect(run.perSec / stroll.perSec).toBeGreaterThan(1.35);
    expect(run.perSec / stroll.perSec).toBeLessThan(1.65);
  });

  it("every real footstep lands at the bottom of the weapon's stride, alternately right and left", () => {
    for (const sprint of [false, true]) {
      const { found } = walk(sprint, 4);
      expect(found.length).toBeGreaterThanOrEqual(7);
      // bobT*4 moves spd*DT*rate*4 rad a frame, so the footstep frame is at most that past the bottom
      const slack = (1 - Math.cos((sprint ? 10.5 : 7) * DT * Player.WALK_BOB_RATE * 4)) / 2 * STRIDE_Y;
      for (const s of found) expect(stride(s.bobT, 1).y).toBeGreaterThanOrEqual(STRIDE_Y - slack - 1e-9);
      for (let i = 1; i < found.length; i++) expect(Math.sign(stride(found[i].bobT, 1).x)).toBe(-Math.sign(stride(found[i - 1].bobT, 1).x));
    }
  });
});

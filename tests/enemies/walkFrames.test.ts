// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import type { Enemy } from "../../src/enemies/Enemy";

/**
 * The walk-frame guard: `src/enemies/ai/Behaviors.ts`'s
 * `if(moving&&e.atkAnim!==undefined&&e.atkAnim<=0)`.
 *
 * **Why this file exists.** Phase 3 Part A Task 2 rewrote that line as
 * `if(moving&&(e.atkAnim??0)<=0)` while converting the file's local enemy
 * interface to a `Pick<Enemy,…>`. It looks like a null-safety tidy-up. It
 * inverts the condition. `atkAnim` is not written by `spawnEnemy` — it is
 * `undefined` until an enemy's first attack (see `src/enemies/Enemy.ts`
 * group 2) — and `undefined<=0` is **false** while `(undefined??0)<=0` is
 * **true**. So every enemy in the game started cycling its two walk frames
 * from the moment it spawned, where `reference/sonsurum.html:3406` cycles
 * none until the enemy has attacked at least once.
 *
 * **All 463 tests stayed green.** The reason is worth writing down, because
 * it is a coverage hole and not bad luck: `digestScene`
 * (`tests/integration/gameplayTrace.ts`) hashes each object's type, position
 * and `visible` — not `material.map`. Both trace fixtures are therefore
 * blind to *which texture* a sprite is showing, and no other test in the
 * suite looked at enemy sprite-frame selection at all. The bug was caught by
 * reading the diff, not by running anything.
 *
 * This file closes that hole for the one line that caused it. It drives the
 * real `enemyTick` twice over a real spawned enemy — once with `atkAnim`
 * left as `spawnEnemy` leaves it (absent), once with it set to `0` — and
 * asserts the two produce *different* `sp.material.map`. Those two inputs
 * are exactly the pair the `??` mutation collapses onto each other, so the
 * mutation cannot survive this file.
 *
 * The setup drives the AI down its quietest path on purpose: the player sits
 * 25 units away, so `seen` (`los(...)&&dist<22`) is false and none of the
 * attack, boss, screamer or ranged branches run, while `dist>30`'s early
 * `continue` is still not reached. `e.alertX/alertZ` are set by hand, which
 * puts the tick in its `else if(e.alertX>=0)` investigate branch — the one
 * place `moving` becomes true with no combat, no audio and no RNG draw. A
 * flat 20x20 open grid is the whole world.
 */

const DT = 0.3;   // > the .22 frame interval, so one tick both advances animT and swaps the map

let enemyTick: (dt: number) => boolean;
let spawnEnemy: (ch: string, wx: number, wz: number, summoned?: boolean) => Enemy;
let PX: Record<string, { a: unknown; b: unknown }>;
let world: {
  grid: string[][]; GW: number; GH: number; heightMap: number[][] | null;
  wallSegs: unknown[]; doors: Record<string, unknown>; props: unknown[];
  enemies: Enemy[]; cine: unknown;
};
let player: { px: number; pz: number; pyy: number };

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();

  // Dynamic, after the stubs: Behaviors -> ... -> RenderCore constructs a
  // real THREE.WebGLRenderer against #game at module scope. Same reason
  // `tests/enemies/enemyShape.test.ts` does this.
  const THREE = await import("three");
  const { buildSprites } = await import("../../src/enemies/SpriteBaker");
  const { renderState } = await import("../../src/render/Renderer");
  const { setScene } = await import("../../src/render/SceneRef");

  const scene = new THREE.Scene();
  buildSprites();
  renderState.scene = scene;
  setScene(scene);

  PX = (await import("../../src/enemies/SpriteBaker")).PX as unknown as typeof PX;
  world = (await import("../../src/world/WorldState")).world as unknown as typeof world;
  player = (await import("../../src/player/PlayerState")).player;
  spawnEnemy = (await import("../../src/world/LevelLoader")).spawnEnemy;
  enemyTick = (await import("../../src/enemies/ai/Behaviors")).enemyTick;
});

beforeEach(() => {
  // A flat, wholly open 20x20 grid (CELL=2, so 0..40 world units). `solidAt`
  // returns *true* for any cell outside `world.grid`, so without this every
  // moveEnemy call would be blocked and `moving` would never become true —
  // which would make every assertion below vacuously equal.
  world.grid = Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => "."));
  world.GW = 20; world.GH = 20;
  world.heightMap = null;   // floorHeightAt -> 0
  world.wallSegs = [];
  world.doors = {};
  world.props = [];
  world.cine = null;
  world.enemies = [];
  player.px = 5; player.pz = 5; player.pyy = 1;
});

/**
 * A ROTTING GHOUL 25 units from the player, already alerted to the player's
 * position. `summoned:true` forces `spawnEnemy`'s 11% elite roll to false so
 * nothing here can flake on a dice throw.
 */
function alertedGhoul(): Enemy {
  const e = spawnEnemy("z", 5, 30, true);
  e.alertX = player.px;
  e.alertZ = player.pz;
  return e;
}

describe("enemyTick's walk-frame guard treats an unattacked enemy differently from one whose attack has ended", () => {
  it("guard: the ghoul's two walk textures are distinct, and it really does move", () => {
    // Without this, "the map did not change" would be indistinguishable from
    // "a === b" and "moving was never true" — the two ways this file could
    // pass while covering nothing.
    expect(PX["z"].a).toBeTruthy();
    expect(PX["z"].b).toBeTruthy();
    expect(PX["z"].a).not.toBe(PX["z"].b);

    const e = alertedGhoul();
    const z0 = e.z;
    enemyTick(DT);
    expect(e.z, "moveEnemy never moved the ghoul — the walk-animation branch is unreachable in this setup").not.toBe(z0);
  });

  it("atkAnim undefined (never attacked) — no walk frame is cycled, exactly as the reference does not", () => {
    const e = alertedGhoul();
    expect(e.atkAnim, "spawnEnemy is not supposed to build atkAnim — see Enemy.ts group 2").toBeUndefined();

    // Asserted after *every* tick, not once at the end. The frame index is a
    // two-state toggle (`e.frame=1-e.frame`), so a cycling enemy is back on
    // frame 0 after any even number of swaps — an end-state-only check with
    // an even tick count would pass under the very mutation this file exists
    // to catch. (Found the hard way: the first draft of this test used ten
    // ticks and survived it.)
    for (let i = 1; i <= 7; i++) {
      enemyTick(DT);
      expect(e.animT, `animT advanced on tick ${i} — the walk clock is running for an enemy that has never attacked`).toBe(0);
      expect(e.frame, `frame changed on tick ${i}`).toBe(0);
      expect(e.sp.material.map, `sprite frame swapped on tick ${i}`).toBe(PX["z"].a);
    }
  });

  it("atkAnim === 0 (attack just ended) — the walk frames do cycle", () => {
    const e = alertedGhoul();
    e.atkAnim = 0;

    enemyTick(DT);

    expect(e.frame).toBe(1);
    expect(e.sp.material.map).toBe(PX["z"].b);
  });

  it("the two differ — this is the assertion `(e.atkAnim??0)<=0` cannot satisfy", () => {
    // The whole point, stated as one comparison. `??0` maps `undefined` onto
    // `0`, so under that mutation both arms of this test produce PX.z.b and
    // the equality below holds — which is what makes it red.
    const never = alertedGhoul();
    enemyTick(DT);
    const neverMap = never.sp.material.map;

    world.enemies = [];
    const attacked = alertedGhoul();
    attacked.atkAnim = 0;
    enemyTick(DT);
    const attackedMap = attacked.sp.material.map;

    expect(neverMap).not.toBe(attackedMap);
    expect(neverMap).toBe(PX["z"].a);
    expect(attackedMap).toBe(PX["z"].b);
  });
});

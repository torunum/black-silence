// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { world } from "../../src/world/WorldState";

/**
 * `src/enemies/Damage.ts:85`'s dismemberment threshold — Plan 0E Task 12
 * review finding I2.
 *
 * `damageEnemy`'s "still alive" dismemberment branch is gated by one
 * expression, `const big=dmg>=22;`, shared by both the arm-sever and
 * leg-sever conditions below it. Doubling it to `dmg>=44` left the full
 * 364-test suite green: the starting pistol's 34 dmg/body-hit is `>=22`
 * but `<44`, and the pistol is a "heavy" weapon in the same branch's
 * `heavy||Math.random()<.5` check, so nothing here ever draws from the
 * suite's seeded RNG stream either way — the only observable difference a
 * mutation of `22` makes is whether `severLimb()` runs at all (a sprite
 * swap plus new gib/blood/pool scene objects; hp, kills and death
 * resolution are unaffected either way).
 *
 * This calls the real, exported `damageEnemy` directly with a minimal
 * synthetic enemy — the same "few fields this code path actually reads"
 * technique `src/player/Player.ts`'s/`src/enemies/Death.ts`'s own local
 * cast interfaces use, and the same "call the real function with a
 * synthetic target rather than simulate combat to reach it" choice
 * `tests/integration/contextWiring.test.ts` makes for `bossDeath`. A real
 * fight was considered and rejected: nothing about hp, kills or death
 * distinguishes `>=22` from `>=44` (per the review, that's the whole
 * reason this was invisible to `combatTrace.test.ts`), so a scripted fight
 * would only be exercising the RNG-avoidance machinery this direct call
 * already sidesteps for free, for no extra proof.
 *
 * Only the boot needed for `damageEnemy`'s own dependencies runs here
 * (real `THREE.Scene` via `setScene`, `buildSprites()` for `PX["z"]`,
 * `buildParticles()`/`resetDecals()`/`resetGibs()` for the FX pools
 * `severLimb` writes into) — not the full `legacy.js` boot
 * `contextWiring.test.ts` needs for its DOM/HUD side effects. `bang`/
 * `pain`/`gurgle` (audio) all no-op gracefully without `audioInit()`
 * (`if(!ctx())return;`), so that step is skipped too.
 */

let damageEnemy: (e: unknown, dmg: number, info: unknown) => void;

/** The bare minimum damageEnemy's own body reads for a non-boss, unshielded, unplated, un-dead hit. */
function makeGhoul(): Record<string, unknown> {
  return {
    dead: false,
    plate: 0, // falsy AND `<=0`, so damageEnemy doesn't take the shield-plate branch instead
    hp: 100, // survives the hit, so killEnemy is never reached
    hurt: 0,
    pain: 50,
    kbRes: 0,
    stun: 0,
    boss: false,
    key: "z", // ROTTING GHOUL — a real, non-boss PXDEF key, so PX["z"].regions is truthy
    x: 5, z: 5, h: 1.8,
    sp: { material: { color: { setHex: () => {} }, map: null, needsUpdate: false } },
  };
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();

  // Dynamic imports, after the DOM stubs above are installed: Damage.ts
  // transitively imports src/enemies/Death.ts -> src/render/RenderCore.ts,
  // which constructs a real THREE.WebGLRenderer against document.getElementById
  // ("game") at its own module scope the moment it first evaluates — a
  // static top-of-file import would run that before installDomStubs()/
  // loadGameHtml() above, against a null canvas / no WebGL stub.
  const { buildSprites } = await import("../../src/enemies/SpriteBaker");
  const { buildParticles } = await import("../../src/fx/Particles");
  const { resetDecals } = await import("../../src/fx/Decals");
  const { resetGibs } = await import("../../src/fx/Gibs");
  const { setScene } = await import("../../src/render/SceneRef");
  // Not destructured directly: damageEnemy's real `info?: DamageInfo`
  // parameter is narrower than this file's deliberately loose `info: unknown`
  // declaration above, and strictFunctionTypes (Plan 0F Task 10) checks that
  // contravariantly. The cast is compile-time only — same function, same
  // call sites below.
  damageEnemy = (await import("../../src/enemies/Damage")).damageEnemy as unknown as (e: unknown, dmg: number, info: unknown) => void;

  buildSprites(); // populates PX[k].regions for every PXDEF key, including "z"
  const THREE = await import("three");
  setScene(new THREE.Scene()); // spawnGibs/blood/addPool all call getScene(), which throws if unset
  buildParticles(); // blood()/sparks() index into a pool this allocates
  resetDecals(); // addPool() indexes into a pool this allocates
  resetGibs(); // spawnGibs() indexes into a pool this allocates

  // Sanity precondition, not part of the finding: this file never spawns a
  // level, so world.enemies should stay whatever WorldState.ts defaults it
  // to — nothing here depends on it, this just documents that no level
  // load happened.
  expect(world.exitPos).toBeNull();
});

describe("damageEnemy's dismemberment threshold (dmg>=22)", () => {
  it("severs an arm on a heavy 34-damage hit — 22<=34<44, so a dmg>=44 mutation must not sever it", () => {
    const ghoul = makeGhoul();
    // wIdx:0 (pistol) is "heavy" in damageEnemy's own
    // `heavy=wIdx===1||wIdx===4||wIdx===0||explosive` check, so this branch
    // never touches Math.random() — the exact reason the review gives for
    // why this constant is otherwise invisible to a seeded-RNG trace.
    damageEnemy(ghoul, 34, { arm: true, armSide: "L", wIdx: 0 });

    expect((ghoul.sever as { lArm?: boolean } | undefined)?.lArm).toBe(true);
    // hp/kills are explicitly NOT part of this assertion — per the review,
    // they are identical whether or not the sever fires, which is why this
    // constant needs its own direct test at all.
    expect(ghoul.hp).toBe(66);
  });

  it("does not sever on a 21-damage hit — the threshold's own boundary, the other direction", () => {
    const ghoul = makeGhoul();
    damageEnemy(ghoul, 21, { arm: true, armSide: "L", wIdx: 0 });

    expect((ghoul.sever as { lArm?: boolean } | undefined)?.lArm).toBeUndefined();
  });
});

import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { FEEL } from "../../src/fx/HitFeel";
import { HURT_LEN, HURT_TINT, flashLevel, leanFor, startHitReact, tickHitReact, type Reactor } from "../../src/enemies/HitReact";

/**
 * A MONSTER HIT FLASHES WHITE (impact plan, Task 1): white for the weapon's
 * flash time, then the old red tint until `hurt` runs out, with a lean away
 * from the shot that settles. A killing blow gets the tint and no flash (the
 * corpse keeps it), and no lean.
 */

function foe(hp = 50): Reactor {
  return { hp, hurt: 0, flashT: 0, lean: 0, sp: new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff })) } as unknown as Reactor;
}
const white = (e: Reactor): boolean => e.sp.material.color.r > 1 && e.sp.material.color.g > 1 && e.sp.material.color.b > 1;
const tint = (e: Reactor): boolean => e.sp.material.color.getHex() === HURT_TINT;
/** The game ages `hurt` first and then the reaction, in enemyTick. */
function age(e: Reactor, dt: number): void { e.hurt -= dt; tickHitReact(e, dt); }

describe("the white flash", () => {
  it("a hit that does not kill turns the sprite white and starts the hurt timer", () => {
    const e = foe();
    startHitReact(e, 0, false, 0);
    expect(white(e)).toBe(true);
    expect(e.hurt).toBe(HURT_LEN);
    expect(e.flashT).toBe(FEEL[0].flash);
  });

  it("turns to the red tint when the flash is spent, and holds it until `hurt` ends", () => {
    const e = foe();
    startHitReact(e, 0, false, 0);
    age(e, FEEL[0].flash / 2);
    expect(white(e)).toBe(true);
    age(e, FEEL[0].flash);
    expect(white(e)).toBe(false);
    expect(tint(e)).toBe(true);
    age(e, 0.03);
    expect(tint(e)).toBe(true);
    expect(e.hurt).toBeGreaterThan(0);
  });

  it("holds through a hit-stop: the game's clock barely moves, so neither does the flash", () => {
    const e = foe();
    startHitReact(e, 1, false, 0);
    for (let i = 0; i < 12; i++) age(e, (1 / 60) * 0.08);   // twelve frozen frames
    expect(white(e)).toBe(true);
    expect(e.flashT).toBeGreaterThan(FEEL[1].flash * 0.79);
  });

  it("a heavier weapon flashes longer and brighter: the BMG and the shotgun over the pistol over the nail cannon", () => {
    const f = (w: number): number => { const e = foe(); startHitReact(e, w, false, 0); return e.flashT!; };
    expect(f(4)).toBeGreaterThan(f(1));
    expect(f(1)).toBeGreaterThan(f(0));
    expect(f(0)).toBeGreaterThan(f(6));
    expect(flashLevel(FEEL[4].flash)).toBeGreaterThan(flashLevel(FEEL[6].flash));
    expect(flashLevel(FEEL[6].flash)).toBeGreaterThan(1);   // even a stream's flash is a brightening
    // and a nail cannon's is a single frame at 60 fps
    expect(FEEL[6].flash).toBeLessThan(1 / 60 + 0.005);
  });

  it("a blast and a kick flash too", () => {
    const e = foe(); startHitReact(e, undefined, true, 0);
    expect(e.flashT).toBe(FEEL[8].flash);
    const k = foe(); startHitReact(k, -1, false, 0);
    expect(k.flashT).toBe(FEEL[-1].flash);
  });

  it("a killing blow gets the old tint and no flash, so the corpse is not left white", () => {
    const e = foe(-5);
    startHitReact(e, 1, false, 1);
    expect(white(e)).toBe(false);
    expect(tint(e)).toBe(true);
    expect(e.flashT).toBe(0);
    expect(e.lean).toBe(0);
  });
});

describe("the lean", () => {
  it("leans away from the shot and settles to upright as `hurt` runs out", () => {
    const e = foe();
    startHitReact(e, 1, false, 1);   // shot travelling to the right of the screen
    expect(e.lean!).toBeLessThan(0);
    expect(Math.abs(e.lean!)).toBeCloseTo(leanFor(FEEL[1].punch), 6);
    age(e, 0.001);
    const start = e.sp.material.rotation;
    expect(start).toBeLessThan(0);
    age(e, HURT_LEN / 2);
    expect(Math.abs(e.sp.material.rotation)).toBeLessThan(Math.abs(start));
    age(e, HURT_LEN);
    expect(e.sp.material.rotation).toBe(0);
  });

  it("leans the other way for a shot going left, and harder for a heavier weapon", () => {
    const r = foe(), l = foe();
    startHitReact(r, 0, false, 1); startHitReact(l, 0, false, -1);
    expect(Math.sign(r.lean!)).toBe(-Math.sign(l.lean!));
    const heavy = foe(); startHitReact(heavy, 4, false, 1);
    expect(Math.abs(heavy.lean!)).toBeGreaterThan(Math.abs(r.lean!));
  });
});

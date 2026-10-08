import { beforeEach, describe, expect, it } from "vitest";
import {
  FIRE_STRENGTH, FIRE_PUNCH, HIT_PUNCH, PUNCH_MAX, addFirePunch, addHitPunch, punch, punchTick, resetPunch, withViewPunch,
} from "../../src/fx/ViewPunch";

/**
 * THE VIEW PUNCH (impact plan, Task 1): the camera jolting toward what was
 * hit, or back from the gun, for the render only. The camera gameplay reads
 * (the hitscan's aim, the listener, the trace fixtures' camera) must never
 * see it: it is applied around the one render call and undone by assignment.
 */

interface Cam { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; updateMatrixWorld: (f?: boolean) => void; updates: number }
function camera(): Cam {
  const c: Cam = { position: { x: 3.123456789, y: 1.987654321, z: -7.5555555 }, rotation: { x: -0.1234567, y: 2.3456789, z: 0.0123456 }, updates: 0, updateMatrixWorld() { c.updates++; } };
  return c;
}

beforeEach(() => resetPunch());

describe("the punch is for the render only", () => {
  it("moves the camera inside the render and puts it back bit for bit", () => {
    addHitPunch(1, 0.5);
    const cam = camera();
    const before = JSON.stringify([cam.position, cam.rotation]);
    let inside = "";
    withViewPunch(cam, () => { inside = JSON.stringify([cam.position, cam.rotation]); });
    expect(inside).not.toBe(before);
    expect(JSON.stringify([cam.position, cam.rotation])).toBe(before);
    expect(cam.updates).toBeGreaterThan(0);   // the matrix is refreshed after the restore
  });

  it("restores the camera even if the render throws", () => {
    addHitPunch(1, -0.5);
    const cam = camera();
    const before = JSON.stringify([cam.position, cam.rotation]);
    expect(() => withViewPunch(cam, () => { throw new Error("gl lost"); })).toThrow("gl lost");
    expect(JSON.stringify([cam.position, cam.rotation])).toBe(before);
  });

  it("does nothing at all with no punch running", () => {
    const cam = camera();
    let calls = 0;
    withViewPunch(cam, () => { calls++; });
    expect(calls).toBe(1);
    expect(cam.updates).toBe(0);
  });
});

describe("a hit punches toward what was hit", () => {
  it("lunges forward along the facing, dips the view, and tilts toward the side the body is on", () => {
    const cam = camera(); cam.rotation.y = 0;   // facing -z
    addHitPunch(1, 1);
    let z = 0, pitch = 0, roll = 0;
    withViewPunch(cam, () => { z = cam.position.z; pitch = cam.rotation.x; roll = cam.rotation.z; });
    expect(z).toBeLessThan(-7.5555555);                    // forward is -z at yaw 0
    expect(pitch).toBeLessThan(-0.1234567);                // down
    expect(roll).not.toBeCloseTo(0.0123456, 4);
    // the other side tilts the other way
    resetPunch(); addHitPunch(1, -1);
    let roll2 = 0;
    withViewPunch(cam, () => { roll2 = cam.rotation.z; });
    expect(Math.sign(roll2 - 0.0123456)).toBe(-Math.sign(roll - 0.0123456));
  });

  it("scales with the strength and never passes the ceilings, however many hits pile up", () => {
    addHitPunch(0.3, 0);
    const small = punch.lunge;
    resetPunch(); addHitPunch(1, 0);
    expect(punch.lunge).toBeGreaterThan(small);
    expect(punch.lunge).toBeCloseTo(HIT_PUNCH.lunge, 6);
    for (let i = 0; i < 50; i++) addHitPunch(1, 1);
    expect(punch.lunge).toBeLessThanOrEqual(PUNCH_MAX.lunge);
    expect(Math.abs(punch.pitch)).toBeLessThanOrEqual(PUNCH_MAX.pitch);
    expect(Math.abs(punch.roll)).toBeLessThanOrEqual(PUNCH_MAX.roll);
  });

  it("decays to exactly nothing, and holds while the game's clock is frozen", () => {
    addHitPunch(1, 1);
    const held = { ...punch };
    punchTick(0);
    expect(punch).toEqual(held);
    for (let i = 0; i < 120; i++) punchTick(1 / 60);
    expect(punch).toEqual({ lunge: 0, pitch: 0, roll: 0 });
  });
});

describe("a heavy gun shoves the view back", () => {
  it("firing pulls the view back and up, the shotgun and the BMG hardest, the nail cannon hardly at all", () => {
    addFirePunch(FIRE_STRENGTH[1], 0);
    expect(punch.lunge).toBeLessThan(0);
    expect(punch.pitch).toBeGreaterThan(0);
    expect(punch.lunge).toBeCloseTo(FIRE_PUNCH.lunge, 6);
    expect(FIRE_STRENGTH[1]).toBe(1);
    expect(FIRE_STRENGTH[4]).toBe(1);
    expect(FIRE_STRENGTH[1]).toBeGreaterThan(FIRE_STRENGTH[0]);
    expect(FIRE_STRENGTH[0]).toBeGreaterThan(FIRE_STRENGTH[2]);
    expect(FIRE_STRENGTH[6]).toBeLessThan(0.1);
  });

  it("alternates the tilt shot to shot", () => {
    addFirePunch(1, 1); const a = punch.roll; resetPunch();
    addFirePunch(1, 2); const b = punch.roll;
    expect(Math.sign(a)).toBe(-Math.sign(b));
  });
});

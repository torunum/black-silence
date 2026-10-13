import { describe, expect, it } from "vitest";
import {
  KICK_CHAMBER, KICK_HOLD, LEAN, STRIKE_POWER, extension, legPose,
} from "../../src/render/viewmodel/kick";
import { KICK_HIT_T } from "../../src/weapons/WeaponRuntime";

/**
 * THE KICK'S SNAP (impact plan, Task 2): a sharper wind-up and a harder
 * strike, with the full extension still on the frame the game resolves the
 * hit. tests/behavior/viewmodelKick.test.ts holds the timing (extension is
 * exactly 1 from KICK_HIT_T to KICK_HOLD and below 1 before, strictly
 * rising); this holds what the plan changed: where the travel happens, the
 * coil before it, the rebound after it.
 */

describe("the strike is a snap", () => {
  it("half of the leg's travel is in the last third of the strike, and it is full extension on the hit", () => {
    const span = KICK_HIT_T - KICK_CHAMBER;
    // the last third of the strike (20 ms of 60) covers well over half the travel...
    expect(1 - extension(KICK_HIT_T - span / 3)).toBeGreaterThan(0.5);
    // ...and the first half of it a quarter
    expect(extension(KICK_CHAMBER + span / 2)).toBeLessThanOrEqual(0.26);
    expect(extension(KICK_HIT_T)).toBe(1);
    expect(STRIKE_POWER).toBeGreaterThanOrEqual(2);
  });

  it("the view leans into it harder than the round-2 kick did", () => {
    expect(LEAN.pitch).toBeLessThan(-0.05);
    expect(LEAN.drop).toBeGreaterThan(0.03);
    expect(LEAN.fwd).toBeGreaterThan(0.07);
  });
});

describe("the wind-up coils", () => {
  it("at the end of the wind-up the knee is higher and more folded than the chamber alone", () => {
    const at = legPose(KICK_CHAMBER)!;
    const early = legPose(KICK_CHAMBER * 0.5)!;
    expect(at.knee).toBeGreaterThan(early.knee);
    expect(at.thigh).toBeGreaterThan(early.thigh);
    // more folded and higher than the plain chamber pose (thigh .36, knee 1.95)
    expect(at.thigh).toBeGreaterThan(0.36 + 0.15);
    expect(at.knee).toBeGreaterThan(1.95 + 0.2);
  });

  it("the coil is let go as the strike runs: gone by the hit, so the strike lands in the same pose as before", () => {
    const hit = legPose(KICK_HIT_T)!;
    expect(hit.thigh).toBeCloseTo(0.36, 6);
    expect(hit.knee).toBeCloseTo(0.05, 6);
    expect(hit.ankle).toBeCloseTo(-0.5, 6);
    // and it unwinds monotonically on the way: the knee never bends more again before the hit
    let prev = Infinity;
    for (let t = KICK_CHAMBER; t <= KICK_HIT_T; t += 0.002) { const k = legPose(t)!.knee; expect(k).toBeLessThanOrEqual(prev + 1e-9); prev = k; }
  });
});

describe("the foot rebounds off what it hit", () => {
  it("pushed back while planted, never nearer than on the hit, and the same on the hit itself", () => {
    const hz0 = legPose(KICK_HIT_T)!.hz;
    let pushed = false;
    for (let t = KICK_HIT_T + 0.002; t <= KICK_HOLD; t += 0.002) {
      const hz = legPose(t)!.hz;
      expect(hz).toBeLessThanOrEqual(hz0 + 1e-12);
      if (hz < hz0 - 0.002) pushed = true;
    }
    expect(pushed).toBe(true);
    expect(hz0).toBeCloseTo(0.1, 9);
  });
});

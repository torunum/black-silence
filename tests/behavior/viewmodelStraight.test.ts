import { describe, expect, it } from "vitest";
import { WEAPON_ART } from "../../src/render/viewmodel/arts";
import { AIM_DX, AIM_DY, FOCAL, renderWeapon } from "../../src/render/viewmodel/rig";
import { Raster, RW } from "../../src/render/viewmodel/raster";
import type { Pose } from "../../src/render/viewmodel/pose";
import { MAT } from "../../src/render/viewmodel/palette";
import { Animator, type AnimInput } from "../../src/render/viewmodel/animate";
import { WEAPON_STATS } from "../../src/weapons/definitions";

/**
 * THE WEAPONS ARE HELD STRAIGHT (owner, 2026-10-17: "the weapons look
 * crooked / tilted"). Every weapon used to be aimed at a vanishing point
 * 14 px right of and 38 px below the crosshair, with a yaw of up to 0.55 rad
 * and a roll in its hold, so each barrel pointed off to one side. Now, at
 * rest:
 *
 * - the lens looks down the view axis: the vanishing point IS the crosshair;
 * - every barrel runs parallel to the view: the line through two points of
 *   its bore, drawn on the screen, passes through the crosshair (a line
 *   parallel to the view axis converges on the principal point, and any yaw
 *   or pitch moves where it converges: `d` px off the point is d/FOCAL rad);
 * - there is no roll: a point straight above the muzzle lies straight above
 *   it on the screen;
 * - the left hand of every two-handed weapon is on its fore-end.
 *
 * Measured on the raster's own anchors (rig.ts), at the exact pose the
 * Animator gives a player standing still, so a tilt added anywhere between
 * the hold and the pixels shows. The line-of-fire rule is in
 * viewmodel.test.ts and still holds: the weapon is held lower and smaller
 * instead of tilted.
 */

const CX = RW / 2, CY = 110;   // the crosshair, in raster pixels, as drawViewmodel places it on a 16:9 screen

function standing(slot: number): Pose {
  const w = WEAPON_STATS[slot];
  const input: AnimInput = {
    cur: slot, vx: 0, vz: 0, vy: 0, grounded: true, yaw: 0, sprintKey: false, bobT: 0, wstate: "idle", wtime: 0,
    equipT: 0.5, unequipT: 0.3, kickAmt: 0, kickRot: 0, kickAnim: 0,
    cueHurt: 0, cueHurtAmt: 0, cuePickup: 0, cueDryFire: 0, cueInput: 0, paused: false, swayX: 0, swayY: 0, muzzle: 0,
  };
  return new Animator().step(1 / 60, 0, input, w, WEAPON_ART[slot]);
}

function render(slot: number, pose: Pose): { r: Raster; a: Record<string, [number, number]> } {
  const r = new Raster();
  const a = renderWeapon(r, WEAPON_ART[slot], pose, CX, CY);
  return { r, a };
}

/** How far, in px, the crosshair is from the infinite line through two screen points. */
function offLine(p: [number, number], q: [number, number]): number {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  return Math.abs((CX - p[0]) * dy - (CY - p[1]) * dx) / Math.hypot(dx, dy);
}

describe("the lens looks straight down the view", () => {
  it("its vanishing point is the crosshair, with no shift", () => {
    expect(AIM_DX).toBe(0);
    expect(AIM_DY).toBe(0);
  });
});

describe.each(WEAPON_ART.map((a, i) => [i, a.name] as const))("weapon %i (%s) at rest", (slot) => {
  const art = WEAPON_ART[slot];
  const { r, a } = render(slot, standing(slot));

  it("is held with no yaw, pitch or roll, and the animator adds none at rest", () => {
    expect(art.hold.yaw).toBe(0);
    expect(art.hold.pitch).toBe(0);
    expect(art.hold.roll).toBe(0);
    const p = standing(slot);
    expect(p.yaw).toBe(0); expect(p.pitch).toBe(0); expect(p.roll).toBe(0);
  });

  it("points straight ahead: the projected bore line runs through the crosshair, up the screen toward it", () => {
    const { bore, muzzle } = a;
    expect(bore, "a bore anchor").toBeDefined();
    expect(Math.hypot(muzzle[0] - bore[0], muzzle[1] - bore[1]), "long enough to measure").toBeGreaterThan(8);
    const d = offLine(bore, muzzle);
    expect(d, `the crosshair is ${d.toFixed(2)} px (${(d / FOCAL).toFixed(4)} rad) off the barrel's line`).toBeLessThan(0.6);
    // it converges on the crosshair going forward: the muzzle is nearer it than the breech is
    expect(Math.hypot(muzzle[0] - CX, muzzle[1] - CY)).toBeLessThan(Math.hypot(bore[0] - CX, bore[1] - CY));
    // and the whole weapon is below it
    expect(muzzle[1]).toBeGreaterThan(CY);
  });

  it("is not rolled: a point straight above the muzzle is straight above it on the screen", () => {
    const { muzzle, crest } = a;
    expect(crest, "a crest anchor").toBeDefined();
    expect(muzzle[1] - crest[1], "above it").toBeGreaterThan(2);
    expect(Math.abs(crest[0] - muzzle[0]), "and not to either side").toBeLessThan(0.3);
  });

  it("holds the gun in at least one hand that is on the screen", () => {
    expect(a.rightHand, "a right hand").toBeDefined();
    expect(a.rightHand[1], "below the muzzle").toBeGreaterThan(a.muzzle[1]);
    expect(r.col.length).toBeGreaterThan(0);
  });
});

describe("the left hand is on the fore-end of every two-handed weapon", () => {
  const TWO_HANDED = [1, 2, 3, 4, 5, 6, 7];
  const isWeapon = (c: number): boolean => { const m = c >> 3; return m !== MAT.NONE && m !== MAT.OUT && m !== MAT.GLOVE && m !== MAT.COAT && m !== MAT.CUFF; };

  it("the flare pistol is a one-handed weapon: it draws no left hand", () => {
    expect(render(0, standing(0)).a.leftHand).toBeUndefined();
  });

  it.each(TWO_HANDED.map((s) => [s, WEAPON_ART[s].name] as const))("weapon %i (%s): its left hand sits on the fore-end, forward of the right hand", (slot) => {
    const { r, a } = render(slot, standing(slot));
    const { leftHand, rightHand, fore, muzzle } = a;
    expect(leftHand, "a left hand").toBeDefined();
    expect(fore, "a fore-end").toBeDefined();
    expect(Math.hypot(leftHand[0] - fore[0], leftHand[1] - fore[1]), "the hand is at the fore-end").toBeLessThan(12);
    // forward of the right hand, back from the muzzle
    expect(Math.hypot(leftHand[0] - muzzle[0], leftHand[1] - muzzle[1])).toBeLessThan(Math.hypot(rightHand[0] - muzzle[0], rightHand[1] - muzzle[1]));
    // a glove is drawn there, and gun beside it: the hand touches the weapon, it does not float in front of it
    let glove = 0, gun = 0;
    for (let y = Math.floor(leftHand[1]) - 7; y <= Math.floor(leftHand[1]) + 7; y++) {
      for (let x = Math.floor(leftHand[0]) - 7; x <= Math.floor(leftHand[0]) + 7; x++) {
        if (x < 0 || y < 0 || x >= r.w || y >= r.h) continue;
        const c = r.col[y * r.w + x];
        if (c >> 3 === MAT.GLOVE) glove++;
        else if (isWeapon(c)) gun++;
      }
    }
    expect(glove, "glove pixels at the hand").toBeGreaterThan(3);
    expect(gun, "weapon pixels at the hand").toBeGreaterThan(10);
  });
});

describe("the kick goes back and up along the straight axis", () => {
  it.each(WEAPON_ART.map((a, i) => [i, a.name] as const))("weapon %i (%s): a full kick moves the muzzle, and the barrel stays within its lift of the view", (slot) => {
    const art = WEAPON_ART[slot];
    const rest = render(slot, standing(slot)).a;
    const p = standing(slot); p.recoil = 1;
    const kicked = render(slot, p).a;
    expect(Math.hypot(kicked.muzzle[0] - rest.muzzle[0], kicked.muzzle[1] - rest.muzzle[1]), "it moves").toBeGreaterThan(0.5);
    // the only rotation is the lift, so the barrel is never more than that off the view axis (small-angle: d/FOCAL rad)
    expect(offLine(kicked.bore, kicked.muzzle) / FOCAL).toBeLessThan(art.kick.lift * 1.1 + 0.004);
    // and "back" is real: the gun comes toward the eye, so it is drawn larger (the bore and muzzle spread further apart)
    const span = (a: Record<string, [number, number]>): number => Math.hypot(a.muzzle[0] - a.bore[0], a.muzzle[1] - a.bore[1]);
    expect(span(kicked)).toBeGreaterThan(span(rest));
  });
});

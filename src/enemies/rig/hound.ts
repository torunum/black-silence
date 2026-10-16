import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { limb, meatTex } from "./shapes";
import type { Ctx, Joint, PartCap, PartGroup, PartSpec, Rig, RigPart, Stump } from "./kit";
import { armParts, legParts } from "./limbs";
import { HOUND_BODY, HOUND_JOINTS, HOUND_PART_POSES, HOUND_POSES } from "./houndPoses";

/**
 * THE HOUND (`g`): a flayed quadruped, spine ridge, unhinged jaw, drool.
 *
 * Legacy: a brown hide (`d`, `G`) stripped to raw red (`R`) in patches, bone-tan
 * ribs and spine spikes (`b`), a mouth that is bright red inside (`j`, `i`). The
 * rig keeps that: a hide of two browns, raw flanks, ribs standing out of the
 * barrel of its chest, a ridge of bone spikes from the nape to the rump, a
 * glowing red mouth on a jaw that hangs off its hinge, yellow-white teeth,
 * drool. It is seen across the sprite — the muzzle toward the player at the left
 * and the tail at the right — because a hound is a long low thing: 1.25 wide in
 * the world and .8 high.
 *
 * Groups, for the dismemberment the hit test makes of a sprite's regions
 * (`Hitscan`: the screen's left and right of the middle of its body are its
 * arms, the bottom quarter its legs; a head hit is never counted on it, its
 * legacy art has no head row): the **forelegs** are the monster's two arms
 * (`lArm`, `rArm`), the **hind legs** its `legs`, and with the hind legs gone it
 * hauls itself on the forelegs (the crawl; with a foreleg gone it drags on the
 * other, with both on its belly).
 */

const HIDE = FIRST_OWN, RAW = FIRST_OWN + 1, TAN = FIRST_OWN + 2, MOUTH = FIRST_OWN + 3, DARKHIDE = FIRST_OWN + 4;

export const HOUND_PALETTE = enemyPalette({
  // the legacy d: a brown hide
  [HIDE]:     { ramp: ["#150f09", "#261b11", "#3a2a1b", "#523b25", "#704f30", "#926a3e", "#b88a52"], amb: .38, spec: .1 },
  // the legacy G: the dark of it along the back
  [DARKHIDE]: { ramp: ["#0c0805", "#16100a", "#231911", "#33261a", "#47362a"], amb: .34 },
  // the legacy R / i: skinned places
  [RAW]:      { ramp: ["#260706", "#4a0d0a", "#781a10", "#a62818", "#cc3a24", "#ec5a38"], amb: .42, spec: .6, rim: true },
  // the legacy b: ribs and spikes
  [TAN]:      { ramp: ["#3a3022", "#6a5a42", "#9a8660", "#c8b488", "#e2d2a8", "#f6ebc6"], amb: .5, spec: .25, rim: true },
  // the legacy j: the inside of its mouth, red and wet and lit by nothing
  [MOUTH]:    { ramp: ["#7a140a", "#a01e10", "#bc2c18", "#d03c20", "#e04c28", "#ee5e34"], emissive: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const HALF_PI = Math.PI / 2;
const mange: TexFn = (x, y, z) => (Math.sin(x * 60 + y * 45 + z * 38) * Math.sin(y * 52 - z * 29) > 0.55 ? -1.2 : Math.sin(x * 90 + z * 70) > 0.93 ? 0.9 : 0);

/** A bone spike standing up out of the back. */
const spike = (b: Builder, x: number, y: number, z: number, h: number, r: number): void => limb(b, x, z, y, y + h, r, 0.003, TAN, 5);

/** A part drawn in a profile (forward distance, height) extruded sideways: the head and jaw are drawn this way (`yaw` turns the builder's x along the hound). */
function profile(b: Builder, pts: Array<[number, number]>, half: number, mat: number, o?: { r1?: number; tex?: TexFn }): void {
  b.push(); b.yaw(HALF_PI); b.prz(pts, -half, half, mat, o); b.pop();
}
/** A box placed by its forward distance `d0..d1`, height, and sideways `x0..x1` (what `box` would be before the head turns). */
function hbox(b: Builder, d0: number, y0: number, d1: number, y1: number, x0: number, x1: number, mat: number): void {
  b.box(x0, y0, -d1, x1, y1, -d0, mat);
}

const HEAD_PROFILE: Array<[number, number]> = [[-0.06, 0.04], [0.0, -0.02], [0.14, -0.03], [0.32, -0.025], [0.4, 0.0], [0.41, 0.05], [0.33, 0.085], [0.2, 0.1], [0.15, 0.17], [0.05, 0.19], [-0.04, 0.13]];
const JAW_PROFILE: Array<[number, number]> = [[0.0, -0.01], [0.05, -0.07], [0.2, -0.085], [0.37, -0.06], [0.39, -0.02], [0.3, 0.0], [0.1, 0.0]];

const joints: Joint[] = HOUND_JOINTS;

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    const b = c.b;
    b.cbox(-0.16, -0.2, -0.17, 0.16, 0.2, 0.2, 0.06, HIDE, { tex: mange });
    for (const s of [-1, 1]) { b.box(s * 0.158, -0.08, -0.06, s * 0.172, 0.14, 0.12, RAW, { tex: meatTex }); b.box(s * 0.172, -0.02, -0.0, s * 0.18, 0.1, 0.1, E.SINEW); }   // the rump, skinned
    for (let i = 0; i < 3; i++) spike(b, 0, 0.19, -0.1 + i * 0.1, 0.1 - i * 0.015, 0.02);
  }),
  part("spine", "body", (c) => {
    const b = c.b;
    b.cbox(-0.12, -0.18, 0.0, 0.12, 0.15, 0.34, 0.05, DARKHIDE, { tex: mange });                // the loin, tucked up
    for (const s of [-1, 1]) b.box(s * 0.118, -0.12, 0.04, s * 0.128, 0.1, 0.3, RAW, { tex: meatTex });
    for (let i = 0; i < 4; i++) spike(b, 0, 0.14, 0.04 + i * 0.08, 0.11, 0.022);
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.15, -0.26, -0.24, 0.15, 0.2, 0.24, 0.07, HIDE, { tex: mange });                   // the barrel
    for (const s of [-1, 1]) {
      b.box(s * 0.148, -0.2, -0.2, s * 0.158, 0.16, 0.2, RAW, { tex: meatTex });                  // skinned down the flank
      for (let k = 0; k < 6; k++) {                                                              // and the ribs standing out of it
        b.push(); b.translate(s * 0.162, 0.16, -0.17 + k * 0.07); b.roll(s * -0.2); limb(b, 0, 0, 0, -0.34, 0.017, 0.012, TAN, 5); b.pop();
      }
    }
    for (let i = 0; i < 5; i++) spike(b, 0, 0.19, -0.2 + i * 0.09, 0.14 - i * 0.012, 0.028);   // the ridge, tallest at the withers
  }),
  part("neck", "body", (c) => {
    limb(c.b, 0, 0, 0, 0.34, 0.12, 0.085, HIDE, 7, { tex: mange });
    c.b.box(-0.14, 0.04, -0.03, -0.1, 0.24, 0.07, RAW); c.b.box(0.1, 0.04, -0.03, 0.14, 0.24, 0.07, RAW);
    for (let i = 0; i < 3; i++) spike(c.b, 0, 0.06 + i * 0.1, 0.1, 0.1, 0.02);
  }),
  // ---- the head: a long skinned skull and a jaw that has come off its hinge ----
  part("head", "head", (c) => {
    const b = c.b;
    profile(b, HEAD_PROFILE, 0.075, HIDE, { r1: 0.8, tex: mange });
    profile(b, [[0.1, 0.095], [0.3, 0.09], [0.36, 0.07], [0.3, 0.1], [0.12, 0.12]], 0.05, RAW);   // skinned along the snout
    for (const s of [-1, 1]) {
      b.ball(s * 0.078, 0.11, -0.16, 0.03, MOUTH, 5);                                              // eyes that burn
      limb(b, s * 0.06, 0.02, 0.16, 0.3, 0.032, 0.004, DARKHIDE, 4);                              // torn ears
    }
    for (let i = 0; i < 8; i++) hbox(b, 0.12 + i * 0.033, -0.062, 0.14 + i * 0.033, -0.026, -0.055, -0.043, E.TOOTH);   // the upper fangs, both sides
    for (let i = 0; i < 8; i++) hbox(b, 0.12 + i * 0.033, -0.062, 0.14 + i * 0.033, -0.026, 0.043, 0.055, E.TOOTH);
    hbox(b, 0.3, -0.07, 0.34, -0.015, -0.01, 0.01, E.TOOTH);
    limb(b, 0.0, -0.3, 0.1, 0.0, 0.0, 0.0, TAN, 3);
  }),
  part("jaw", "head", (c) => {
    const b = c.b, dr = c.x("drool");
    profile(b, JAW_PROFILE, 0.055, HIDE, { r1: 0.85, tex: mange });
    profile(b, [[0.06, 0.0], [0.34, 0.0], [0.36, 0.01], [0.06, 0.012]], 0.045, MOUTH);                // the inside of the mouth
    for (let i = 0; i < 7; i++) { hbox(b, 0.1 + i * 0.035, 0.0, 0.122 + i * 0.035, 0.04, -0.05, -0.038, E.TOOTH); hbox(b, 0.1 + i * 0.035, 0.0, 0.122 + i * 0.035, 0.04, 0.038, 0.05, E.TOOTH); }
    hbox(b, 0.12, -0.03, 0.3, 0.0, -0.025, 0.025, MOUTH);                                              // a tongue
    limb(b, 0.0, -0.3, 0.0, -0.17 - dr * 0.04, 0.012, 0.004, MOUTH, 4);                                // drool, hung from the chin
    limb(b, 0.03, -0.2, -0.02, -0.12 + dr * 0.03, 0.01, 0.003, MOUTH, 4);
  }),
  part("tail1", "body", (c) => c.b.cyl(0, 0, 0, 0.22, 0.06, 0.04, 6, HIDE, { tex: mange })),
  part("tail2", "body", (c) => { c.b.cyl(0, 0, 0, 0.26, 0.04, 0.012, 5, TAN); c.b.cyl(0, 0.015, 0.0, 0.2, 0.03, 0.008, 4, RAW); }),
  ...armParts(HOUND_BODY, "lArm", { joint: 0.055, upper: { r0: 0.075, r1: 0.055, mat: HIDE, tex: mange, deco: (c, len) => c.b.box(0.045, -len * 0.7, -0.05, 0.062, -len * 0.1, 0.05, RAW) }, fore: { r0: 0.05, r1: 0.034, mat: HIDE, tex: mange, deco: (c, len) => limb(c.b, 0, -0.04, -len * 0.1, -len * 0.7, 0.012, 0.01, TAN, 4) }, hand: paw }),
  ...armParts(HOUND_BODY, "rArm", { joint: 0.055, upper: { r0: 0.075, r1: 0.055, mat: HIDE, tex: mange, deco: (c, len) => c.b.box(-0.062, -len * 0.7, -0.05, -0.045, -len * 0.1, 0.05, RAW) }, fore: { r0: 0.05, r1: 0.034, mat: HIDE, tex: mange, deco: (c, len) => limb(c.b, 0, -0.04, -len * 0.1, -len * 0.7, 0.012, 0.01, TAN, 4) }, hand: paw }),
  ...(["L", "R"] as const).flatMap((s) => legParts(HOUND_BODY, s, {
    joint: 0.065,
    upper: { r0: 0.11, r1: 0.07, mat: HIDE, tex: mange, deco: (c, len) => c.b.box(s === "L" ? -0.1 : 0.07, -len * 0.8, -0.07, s === "L" ? -0.07 : 0.1, -len * 0.1, 0.08, RAW, { tex: meatTex }) },
    lower: { r0: 0.06, r1: 0.036, mat: HIDE, tex: mange, deco: (c, len) => limb(c.b, 0, 0.04, -len * 0.1, -len * 0.7, 0.012, 0.01, TAN, 4) },
    foot: paw,
  })),
];

/** A paw: a pad and three claws that point at the player. */
function paw(c: Ctx): void {
  const b = c.b;
  b.cbox(-0.045, -0.06, -0.12, 0.045, 0.02, 0.05, 0.02, HIDE);
  for (let i = -1; i <= 1; i++) b.cyl(i * 0.028, -0.04, -0.17, -0.11, 0.011, 0.003, 4, TAN);
}

const stumps: Stump[] = [
  { joint: "neck", group: "head", draw: (c) => { limb(c.b, 0, 0, 0.14, 0.36, 0.1, 0.082, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.2, 0.42, 0.02, 0.014, E.BONE, 5); c.b.box(-0.05, 0.3, -0.04, -0.02, 0.38, -0.01, E.SINEW); c.b.box(0.02, 0.3, -0.03, 0.05, 0.37, 0.0, E.ORGAN); } },
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "shoulder" + s, group: s === "L" ? "lArm" : "rArm", draw: (c) => {
    limb(c.b, 0, 0, 0.01, -0.12, 0.075, 0.06, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0.005, 0, -0.02, -0.2, 0.018, 0.013, E.BONE, 5); c.b.box(-0.04, -0.15, -0.06, -0.012, -0.1, -0.03, E.SINEW);
  } })),
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "hip" + s, group: "legs", draw: (c) => {
    limb(c.b, 0, 0, 0, -0.14, 0.1, 0.075, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, -0.03, -0.22, 0.02, 0.015, E.BONE, 5); c.b.box(0.02, -0.16, -0.05, 0.05, -0.1, -0.02, E.SINEW);
  } })),
];

const cap = (joint: string, draw: (c: Ctx) => void): PartCap => ({ joint, draw });
const legCap = (j: string): PartCap => cap(j, (c) => { limb(c.b, 0, 0, -0.01, 0.04, 0.07, 0.062, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.0, 0.12, 0.016, 0.012, E.BONE, 5); });
const partSpecs: Record<"head" | "lArm" | "rArm" | "legs", PartSpec> = {
  head: { group: "head", pose: HOUND_PART_POSES.head, cap: cap("neck", (c) => { limb(c.b, 0, 0, -0.02, 0.06, 0.1, 0.085, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.0, 0.14, 0.02, 0.014, E.BONE, 5); }) },
  lArm: { group: "lArm", pose: HOUND_PART_POSES.leg, cap: legCap("shoulderL") },
  rArm: { group: "rArm", pose: HOUND_PART_POSES.leg, cap: legCap("shoulderR") },
  legs: { group: "legs", pose: HOUND_PART_POSES.legs, cap: cap("pelvis", (c) => { for (const x of [-0.12, 0.12]) { limb(c.b, x, 0, -0.05, 0.02, 0.1, 0.09, E.MEAT, 7, { tex: meatTex }); limb(c.b, x, 0, -0.04, 0.1, 0.018, 0.014, E.BONE, 5); } }) },
};

export const HOUND: Rig = {
  key: "g",
  palette: HOUND_PALETTE,
  frame: { w: 91, h: 58, worldH: 1.22, floor: 0.96, yaw: 0.95, pitch: 0.1, shift: 0.0 },
  crawlH: 5 / 7,
  joints, parts, stumps,
  poses: HOUND_POSES,
  walkStep: 0.1,
  // legacy grid 21 x 7; a hound has no head row (the legacy art has none: a head shot is not counted on it)
  regions: { W: 21, H: 7, head: 0, armTop: 0, armBot: 4, shoulder: 2 },
  partSpecs,
};

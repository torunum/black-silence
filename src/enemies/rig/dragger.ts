import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, crackTex, limb, meatTex, scaled } from "./shapes";
import type { Ctx, Joint, PartCap, PartGroup, PartSpec, Rig, RigPart, Stump } from "./kit";
import { armParts } from "./limbs";
import { DRAGGER_BODY, DRAGGER_JOINTS, DRAGGER_PART_POSES, DRAGGER_POSES } from "./draggerPoses";

/**
 * THE DRAGGER (`w`): torn in half at the waist, hauling its own guts.
 *
 * Legacy: a grey-green torso (`g`) with a sunken face and two red-lit eyes
 * (`j`), raw red wounds (`R`, `i`), bone-tan ribs (`b`), and a long trail of
 * dark red entrails behind it — the widest and lowest thing in the game, 1.15
 * wide and .65 high. The rig keeps that: half a body flat along the floor,
 * propped on two long arms that reach and pull, a head with eyes that glow
 * and a jaw hanging open, ribs bare along the back, and ropes of gut dragging
 * from the torn waist that slither as it hauls. Its attack is a lunge with one
 * hand out to grab.
 *
 * Groups: the **arms** are the two it hauls itself with (the screen's left and
 * right of its middle), the **guts** (the ropes, and the torn-off spine they
 * hang from) are its `legs` — it has none, and what trails behind is what a
 * shot at the bottom of the sprite takes. Without the guts it is a torso on two arms.
 * A head hit is not counted on it (its legacy art has no head row).
 */

const SKIN = FIRST_OWN, RAW = FIRST_OWN + 1, TAN = FIRST_OWN + 2, GLOW = FIRST_OWN + 3, GUT = FIRST_OWN + 4;

export const DRAGGER_PALETTE = enemyPalette({
  // the legacy g: grey-green skin with the brown of old blood in it
  [SKIN]: { ramp: ["#15130d", "#25221a", "#383428", "#4e4a38", "#68634a", "#857e5e", "#a8a07c"], amb: .4, spec: .1 },
  // the legacy R / i: raw and dark-red wounds
  [RAW]:  { ramp: ["#240606", "#470c09", "#741710", "#a02416", "#c83822", "#e85a38"], amb: .45, spec: .55, rim: true },
  // the legacy b: ribs
  [TAN]:  { ramp: ["#3a3022", "#6a5a42", "#9a8660", "#c8b488", "#e2d2a8", "#f6ebc6"], amb: .5, spec: .25, rim: true },
  // the legacy j: eyes that glow a red-orange of their own
  [GLOW]: { ramp: ["#8a1a0c", "#b02812", "#cc3a1c", "#e04c24", "#f2602e"], emissive: true },
  // the legacy i: wet entrails, a dark red going purple, bright where they bulge
  [GUT]:  { ramp: ["#2a0a10", "#4e1220", "#7a1c30", "#a82a44", "#cf4660", "#ee708a"], amb: .46, spec: .6, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const scab: TexFn = (x, y, z) => (Math.sin(x * 55 + y * 40 + z * 33) * Math.sin(y * 47 - z * 26) > 0.5 ? -1.2 : Math.sin(x * 80 + z * 60) > 0.94 ? 0.9 : 0);

/** A claw hand dragging along the floor: a palm and four hooked bone fingers. */
function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b, claw = c.x("claw");
  b.cbox(-0.055, -0.08, -0.04, 0.055, 0.005, 0.04, 0.012, SKIN);
  for (let i = -1.5; i <= 1.5; i++) {
    b.push(); b.translate(i * 0.024, -0.065, 0); b.pitch(-0.2 - claw * 0.5); b.roll(i * -0.1);
    limb(b, 0, 0, 0, -0.06, 0.011, 0.008, SKIN, 5); b.translate(0, -0.06, 0); b.pitch(-0.3 - claw * 0.8); limb(b, 0, 0, 0, -0.11, 0.009, 0.0015, TAN, 5);
    b.pop();
  }
  b.push(); b.translate(s * 0.045, -0.025, 0); b.roll(s * -0.9); limb(b, 0, 0, 0, -0.05, 0.01, 0.006, SKIN, 5); b.pop();
}

/** A length of gut, running along +z from its joint: lumpy, wet, with a bulge or two. */
function rope(c: Ctx, len: number, r0: number, r1: number, k: number): void {
  const b = c.b;
  b.cyl(0, 0, 0, len, r0, r1, 6, k % 2 ? GUT : RAW, { tex: meatTex });
  b.ball(0, 0, len * 0.35, r0 * 1.3, GUT, 6); b.ball(0.004, -0.004, len * 0.78, r1 * 1.4, k % 2 ? RAW : GUT, 6);
  b.cyl(r0 * 0.5, r0 * 0.5, len * 0.1, len * 0.9, r0 * 0.45, r1 * 0.4, 4, GUT);
}

const joints: Joint[] = DRAGGER_JOINTS;

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    const b = c.b;
    b.cbox(-0.15, -0.12, -0.12, 0.15, 0.12, 0.1, 0.05, SKIN, { tex: scab });
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; b.cyl(Math.cos(a) * 0.1, Math.sin(a) * 0.08, 0.08, 0.17 + 0.04 * (i % 3), 0.03, 0.006, 4, i % 2 ? RAW : GUT); }   // the torn edge
    b.prz([[-0.12, -0.08], [0.12, -0.09], [0.13, 0.08], [0.0, 0.12], [-0.13, 0.07]], 0.095, 0.13, RAW, { tex: meatTex });   // the raw end of it
  }),
  part("pelvis", "legs", (c) => {   // the lower spine that hangs from the waist and drags with the guts
    const b = c.b;
    limb(b, 0, 0, 0, 0, 0, 0, TAN, 3);
    for (let i = 0; i < 6; i++) b.ball(0.0, -0.02 - i * 0.004, 0.1 + i * 0.05, 0.026 - i * 0.002, TAN, 5);
    b.cyl(0, -0.02, 0.1, 0.42, 0.014, 0.01, 4, TAN);
    b.prz([[-0.05, -0.04], [0.05, -0.04], [0.06, -0.01], [-0.06, -0.01]], 0.2, 0.36, RAW);
  }),
  part("spine", "body", (c) => {
    const b = c.b;
    b.cbox(-0.22, -0.18, 0.0, 0.22, 0.17, 0.3, 0.06, SKIN, { tex: scab });
    b.box(0.22, -0.13, 0.04, 0.25, 0.13, 0.26, RAW, { tex: meatTex }); b.box(-0.25, -0.13, 0.04, -0.22, 0.13, 0.26, RAW, { tex: meatTex });
    for (let i = 0; i < 4; i++) b.ball(0, 0.17, 0.04 + i * 0.07, 0.03, TAN, 5);
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.27, -0.22, -0.26, 0.27, 0.22, 0.2, 0.07, SKIN, { tex: blotchTex(1) });
    b.prz([[-0.34, 0.18], [-0.15, 0.32], [0.15, 0.32], [0.34, 0.18], [0.26, 0.1], [-0.26, 0.1]], -0.14, 0.16, SKIN, { r1: 0.95 });   // hunched shoulders
    for (const s of [-1, 1]) {
      b.box(s * 0.27, -0.17, -0.22, s * 0.29, 0.17, 0.16, RAW, { tex: meatTex });
      for (let k = 0; k < 5; k++) { b.push(); b.translate(s * 0.295, 0.2, -0.2 + k * 0.08); b.roll(s * -0.2); limb(b, 0, 0, 0, -0.36, 0.022, 0.015, TAN, 5); b.pop(); }
    }
    for (let i = 0; i < 4; i++) b.ball(0, 0.18, -0.18 + i * 0.1, 0.028, TAN, 5);
    b.ball(0.0, -0.12, -0.27, 0.1, GUT, 6);                                                     // something hanging out of its belly
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, 0, 0.2, 0.095, 0.08, SKIN, 7, { tex: scab })),
  // ---- the head: sunken face, eyes that glow, a jaw hanging open ----
  part("head", "head", (c) => {
    const b = scaled(c.b, 1.3);
    b.prz([[-0.056, 0.0], [0.056, 0.0], [0.078, 0.05], [0.086, 0.12], [0.08, 0.2], [0.05, 0.26], [0.0, 0.29], [-0.05, 0.26], [-0.08, 0.2], [-0.086, 0.12], [-0.078, 0.05]], -0.095, 0.11, SKIN, { r1: 0.78, tex: scab });
    b.box(-0.09, 0.168, -0.104, 0.09, 0.182, -0.094, SKIN);
    b.prz([[-0.07, 0.115], [-0.045, 0.098], [-0.02, 0.112], [-0.018, 0.15], [-0.045, 0.165], [-0.072, 0.15]], -0.105, -0.092, E.CAVITY); b.prz([[0.07, 0.115], [0.045, 0.098], [0.02, 0.112], [0.018, 0.15], [0.045, 0.165], [0.072, 0.15]], -0.105, -0.092, E.CAVITY);
    b.box(-0.056, 0.124, -0.11, -0.03, 0.146, -0.104, GLOW); b.box(0.03, 0.124, -0.11, 0.056, 0.146, -0.104, GLOW);    // the red in its eyes
    b.box(-0.013, 0.058, -0.114, 0.013, 0.1, -0.098, E.CAVITY);
    b.box(-0.062, -0.09, -0.104, 0.062, 0.004, -0.02, E.CAVITY);
    for (let i = 0; i < 6; i++) b.box(-0.054 + i * 0.0185, i % 2 ? -0.004 : -0.012, -0.112, -0.0385 + i * 0.0185, 0.034, -0.1, E.TOOTH);
    b.box(0.02, 0.236, -0.06, 0.07, 0.262, 0.0, TAN, { tex: crackTex });
  }),
  part("jaw", "head", (c) => {
    const b = scaled(c.b, 1.3);
    b.cbox(-0.066, -0.075, -0.108, 0.066, -0.04, 0.0, 0.012, SKIN, { tex: scab });
    b.cbox(-0.058, -0.095, -0.115, 0.058, -0.06, -0.06, 0.012, SKIN);
    for (let i = 0; i < 5; i++) b.box(-0.05 + i * 0.0225, -0.04, -0.112, -0.032 + i * 0.0225, -0.012, -0.1, E.TOOTH);
    b.box(-0.04, -0.055, -0.1, 0.04, -0.04, -0.04, RAW);
  }),
  ...armParts(DRAGGER_BODY, "lArm", { joint: 0.07, upper: { r0: 0.085, r1: 0.062, mat: SKIN, tex: scab, deco: (c) => c.b.box(0.045, -0.18, -0.05, 0.07, -0.06, 0.05, RAW) }, fore: { r0: 0.062, r1: 0.044, mat: SKIN, tex: scab, deco: (c, len) => limb(c.b, 0, -0.03, -len * 0.1, -len * 0.7, 0.01, 0.008, TAN, 4) }, hand }),
  ...armParts(DRAGGER_BODY, "rArm", { joint: 0.07, upper: { r0: 0.085, r1: 0.062, mat: SKIN, tex: scab, deco: (c) => c.b.box(-0.07, -0.18, -0.05, -0.045, -0.06, 0.05, RAW) }, fore: { r0: 0.062, r1: 0.044, mat: SKIN, tex: scab, deco: (c, len) => limb(c.b, 0, -0.03, -len * 0.1, -len * 0.7, 0.01, 0.008, TAN, 4) }, hand }),
  ...(["L", "R"] as const).flatMap((s, k) => [
    part("hip" + s, "legs", (c) => rope(c, 0.26, 0.085, 0.075, k)),
    part("knee" + s, "legs", (c) => rope(c, 0.26, 0.075, 0.06, k + 1)),
    part("ankle" + s, "legs", (c) => rope(c, 0.22, 0.06, 0.03, k)),
  ]),
];

const stumps: Stump[] = [
  { joint: "neck", group: "head", draw: (c) => { limb(c.b, 0, 0, 0.05, 0.2, 0.1, 0.085, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.1, 0.28, 0.02, 0.014, E.BONE, 5); c.b.box(-0.05, 0.16, -0.04, -0.02, 0.24, -0.01, E.SINEW); c.b.box(0.02, 0.16, -0.03, 0.05, 0.22, 0.0, E.ORGAN); } },
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "shoulder" + s, group: s === "L" ? "lArm" : "rArm", draw: (c) => {
    limb(c.b, 0, 0, 0.01, -0.34, 0.09, 0.07, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0.005, 0, -0.02, -0.42, 0.018, 0.013, E.BONE, 5); c.b.box(-0.04, -0.3, -0.06, -0.012, -0.22, -0.03, E.SINEW); c.b.ball(s === "L" ? -0.07 : 0.07, -0.28, 0, 0.075, E.MEAT, 6);
  } })),
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "hip" + s, group: "legs", draw: (c) => {   // a torn end of gut, and what hung from it
    c.b.ball(0, 0, 0.14, 0.09, E.MEAT, 6); c.b.cyl(0, 0, 0.04, 0.34, 0.075, 0.05, 6, E.MEAT, { tex: meatTex }); c.b.cyl(0, 0.03, 0.3, 0.42, 0.03, 0.015, 4, E.ORGAN); c.b.box(-0.02, -0.02, 0.2, 0.02, 0.02, 0.36, E.SINEW);
  } })),
];

const cap = (joint: string, draw: (c: Ctx) => void): PartCap => ({ joint, draw });
const armCap = (j: string): PartCap => cap(j, (c) => { limb(c.b, 0, 0, -0.01, 0.04, 0.065, 0.058, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.0, 0.11, 0.014, 0.011, E.BONE, 5); });
const partSpecs: Record<"head" | "lArm" | "rArm" | "legs", PartSpec> = {
  head: { group: "head", pose: DRAGGER_PART_POSES.head, cap: cap("neck", (c) => { limb(c.b, 0, 0, -0.02, 0.06, 0.1, 0.085, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.0, 0.14, 0.02, 0.014, E.BONE, 5); }) },
  lArm: { group: "lArm", pose: DRAGGER_PART_POSES.arm, cap: armCap("shoulderL") },
  rArm: { group: "rArm", pose: DRAGGER_PART_POSES.arm, cap: armCap("shoulderR") },
  legs: { group: "legs", pose: DRAGGER_PART_POSES.legs, cap: cap("pelvis", (c) => { c.b.ball(0, 0, 0.02, 0.07, E.MEAT, 6); c.b.cyl(0, 0, -0.06, 0.04, 0.05, 0.04, 5, E.ORGAN); }) },
};

export const DRAGGER: Rig = {
  key: "w",
  palette: DRAGGER_PALETTE,
  frame: { w: 83, h: 47, worldH: 1.06, floor: 0.93, yaw: 0.9, pitch: 0.14, shift: 0.0 },
  crawlH: 5 / 7,
  joints, parts, stumps,
  poses: DRAGGER_POSES,
  walkStep: 0.13,
  regions: { W: 22, H: 7, head: 0, armTop: 0, armBot: 4, shoulder: 2 },
  partSpecs,
};

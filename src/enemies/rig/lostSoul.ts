import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { crackTex, ellipsoid, flame, limb } from "./shapes";
import type { Ctx, PartCap, PartGroup, PartSpec, Rig, RigPart, Stump } from "./kit";
import { LOST_JOINTS, LOST_PART_POSES, LOST_POSES } from "./lostSoulPoses";

/**
 * THE LOST SOUL (`L`): a burning skull, wreathed in fire, jaw agape.
 *
 * The legacy sprite is a pale skull (`R`, `b`: a warm white), two dark sockets
 * (`0`), a jaw of teeth, and fire (`o` orange, `y` yellow, `i` a dull red)
 * streaming from the temples and the top of the head. The rig keeps all of
 * it: a cranium that cracks along a line, sockets with an ember in each, a
 * row of teeth in the upper jaw and a lower jaw that hangs on its hinge, two
 * plumes of fire from the temples that beat like wings, a crown of flame and a
 * tail of it behind. A flame is three nested tongues, red, orange and yellow,
 * and every one of them is lit from within.
 *
 * Its three dismemberable zones are the plumes (arms) and the jaw (legs): a
 * flyer has no head to lose (`Hitscan` counts none: its art has no head row),
 * so a torn-off jaw leaves a skull with a splintered hinge, a plume that goes
 * is a streamer of fire flung away, and the crown of flame is a "head" group
 * that nothing in the game tears off.
 */

const SKULL = FIRST_OWN, FIRE_R = FIRST_OWN + 1, FIRE_O = FIRST_OWN + 2, FIRE_Y = FIRST_OWN + 3, CRACK = FIRST_OWN + 4;
const FIRE: readonly [number, number, number] = [FIRE_R, FIRE_O, FIRE_Y];

export const LOST_PALETTE = enemyPalette({
  // the legacy R / b: a warm bone white, shadowed brown in the hollows
  [SKULL]:  { ramp: ["#2a2018", "#4a3c30", "#76665a", "#a29278", "#cabc9e", "#e8e0d0", "#fffbee"], amb: .62, spec: .2, rim: true },
  // the legacy i: a dull red at the roots of the fire
  [FIRE_R]: { ramp: ["#7a2810", "#a8380e", "#d4500e", "#e66414"], emissive: true },
  // the legacy o: orange
  [FIRE_O]: { ramp: ["#c0480e", "#e8681a", "#ff8a28", "#ffa840"], emissive: true },
  // the legacy y: the yellow of the core
  [FIRE_Y]: { ramp: ["#e0a020", "#f6c038", "#ffd860", "#fff0a0"], emissive: true },
  // the black of a crack with fire behind it
  [CRACK]:  { ramp: ["#1a0804", "#2c1008", "#40180a"], amb: .8 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
/** A hairline of a crack down the bone. */
const cracked: TexFn = (x, y, z) => (Math.abs(Math.sin(x * 40 + Math.sin(y * 30) * 1.5 + z * 20)) < 0.05 ? -1.5 : crackTex(x, y, z));

/** The cranium, whole or in two halves that have come apart by `split`. */
function cranium(b: Builder, split: number): void {
  if (split < 0.05) { ellipsoid(b, 0, 0.04, 0, 0.19, 0.2, 0.18, SKULL, 9, { tex: cracked }); return; }
  for (const s of [-1, 1]) {
    b.push(); b.translate(s * split * 0.1, -split * 0.03, 0); b.roll(s * split * 0.12);
    ellipsoid(b, s * 0.085, 0.04, 0, 0.115, 0.2, 0.18, SKULL, 8, { tex: cracked });
    b.pop();
  }
  b.ball(0, 0.04, 0.02, 0.11, FIRE_O, 6);                                                    // the fire inside it, showing in the gap
}

/** A plume of fire from a temple: two tongues, the second flicking at its tip. */
function plume(c: Ctx): void {
  const k = c.x("fl"), b = c.b;
  flame(b, 0.4 * k, 0.12, FIRE, 6);
  for (const s of [-1, 1]) { b.push(); b.translate(s * 0.05, -0.02, 0.0); b.roll(s * 0.7); flame(b, 0.3 * k, 0.09, FIRE, 5); b.pop(); }   // and a tongue to either side of it, a plume of fire from the temple
}

const parts: RigPart[] = [
  part("core", "body", (c) => {
    const b = c.b, sp = c.x("split");
    cranium(b, sp);
    for (const s of [-1, 1]) {
      ellipsoid(b, s * 0.075, 0.03, -0.158 - sp * 0.01, 0.06, 0.065, 0.03, E.CAVITY, 7);        // the socket
      b.ball(s * 0.075, 0.025, -0.172 - sp * 0.01, 0.02, FIRE_Y, 4);                              // and an ember in it
    }
    b.box(-0.014, -0.045, -0.188, 0.014, -0.0, -0.17, E.CAVITY);                              // the nose
    b.cbox(-0.11, -0.13, -0.17, 0.11, -0.05, -0.04, 0.02, SKULL, { tex: cracked });          // the upper jaw
    for (let i = 0; i < 6; i++) b.box(-0.095 + i * 0.038, -0.165, -0.178, -0.065 + i * 0.038, -0.12, -0.155, E.TOOTH);   // its teeth
    b.box(-0.105, -0.12, -0.172, -0.08, -0.07, -0.15, SKULL); b.box(0.08, -0.12, -0.172, 0.105, -0.07, -0.15, SKULL);
    if (c.x("shard") > 0.05) for (let i = 0; i < 5; i++) {                                    // shards of bone on the floor under it
      const a = i * 2.4, r = 0.12 + 0.07 * c.x("shard") * ((i % 3) + 1) / 3;
      b.push(); b.translate(Math.cos(a) * r, -0.3 + 0.01 * i, Math.sin(a) * r * 0.5); b.roll(a); b.box(-0.03, -0.01, -0.02, 0.03, 0.02, 0.02, SKULL); b.pop();
    }
  }),
  // (the tongues at the sides are the plumes', and the jaw hangs clear below, so neither has fire behind it)
  part("trail", "body", (c) => {                                                              // the wreath: a ring of tongues round the skull, behind it, and a tail of fire streaming back
    const b = c.b, k = c.x("fl");
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.2; if (Math.abs(Math.cos(a)) > 0.55 || Math.sin(a) < -0.6) continue; b.push(); b.translate(Math.cos(a) * 0.17, 0.03 + Math.sin(a) * 0.17, 0.07); b.roll(Math.PI / 2 - a); flame(b, (0.17 + 0.07 * Math.abs(Math.sin(a * 2.5))) * k, 0.125, FIRE, 5); b.pop(); }
    b.push(); b.pitch(-1.1); flame(b, 0.46 * k, 0.12, FIRE, 6); b.pop();
  }),
  part("crown", "head", (c) => {
    const b = c.b, k = c.x("fl");
    for (let i = -2; i <= 2; i++) { b.push(); b.translate(i * 0.06, -0.03 - Math.abs(i) * 0.02, -0.04); b.roll(i * -0.3); flame(b, (0.3 - Math.abs(i) * 0.05) * k, 0.06, FIRE, 5); b.pop(); }
  }),
  part("jaw", "legs", (c) => {
    const b = c.b;
    b.cbox(-0.095, -0.07, -0.14, 0.095, -0.015, 0.03, 0.02, SKULL, { tex: cracked });
    for (let i = 0; i < 5; i++) b.box(-0.08 + i * 0.04, -0.015, -0.14, -0.054 + i * 0.04, 0.03, -0.12, E.TOOTH);
    b.box(-0.085, -0.015, -0.13, -0.065, 0.04, 0.0, SKULL); b.box(0.065, -0.015, -0.13, 0.085, 0.04, 0.0, SKULL);
    b.box(-0.06, -0.015, -0.1, 0.06, 0.0, -0.02, E.CAVITY);                                  // the dark of the mouth
  }),
  part("plumeL", "lArm", plume), part("plumeR", "rArm", plume),
  part("tipL", "lArm", (c) => flame(c.b, 0.3 * c.x("fl"), 0.09, FIRE, 5)), part("tipR", "rArm", (c) => flame(c.b, 0.3 * c.x("fl"), 0.09, FIRE, 5)),
];

/** What a torn-off plume leaves at the temple: a smoulder, a char. A torn-off jaw: the splintered ends of the hinge, with the dark of the mouth behind. */
const stumps: Stump[] = [
  { joint: "crown", group: "head", draw: (c) => { c.b.ball(0, 0.0, 0, 0.05, CRACK, 5); c.b.ball(0, 0.02, -0.01, 0.025, FIRE_O, 4); } },
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "plume" + s, group: s === "L" ? "lArm" : "rArm", draw: (c) => {
    c.b.ball(0, 0, -0.02, 0.085, CRACK, 6); c.b.ball(s === "L" ? -0.03 : 0.03, 0.0, -0.075, 0.05, FIRE_Y, 5); c.b.ball(0, 0.0, -0.06, 0.07, FIRE_R, 6);   // a charred scab with an ember in it, at the temple
  } })),
  { joint: "core", group: "legs", draw: (c) => {
    c.b.box(-0.05, -0.14, -0.17, 0.05, -0.11, -0.06, FIRE_R);                                // where the jaw was: the fire shows through the break
    c.b.box(-0.05, -0.145, -0.18, 0.05, -0.12, -0.16, FIRE_O); c.b.box(-0.03, -0.14, -0.19, 0.03, -0.125, -0.175, FIRE_Y);
    c.b.box(-0.1, -0.15, -0.2, -0.05, -0.1, -0.12, CRACK); c.b.box(0.05, -0.15, -0.2, 0.1, -0.1, -0.12, CRACK);
    for (let i = 0; i < 4; i++) limb(c.b, -0.08 + i * 0.053, -0.15, -0.12, -0.1 - (i % 2) * 0.03, 0.012, 0.003, E.BONE, 4);   // splinters of bone round it
  } },
];

const cap = (joint: string, draw: (c: Ctx) => void): PartCap => ({ joint, draw });
const partSpecs: Record<"head" | "lArm" | "rArm" | "legs", PartSpec> = {
  head: { group: "head", pose: LOST_PART_POSES.crown, cap: cap("crown", (c) => c.b.ball(0, -0.02, 0, 0.04, CRACK, 4)) },
  lArm: { group: "lArm", pose: LOST_PART_POSES.plume, cap: cap("plumeL", (c) => { c.b.ball(0, -0.01, 0, 0.045, CRACK, 5); c.b.ball(0, 0.0, -0.02, 0.025, FIRE_R, 4); }) },
  rArm: { group: "rArm", pose: LOST_PART_POSES.plume, cap: cap("plumeR", (c) => { c.b.ball(0, -0.01, 0, 0.045, CRACK, 5); c.b.ball(0, 0.0, -0.02, 0.025, FIRE_R, 4); }) },
  legs: { group: "legs", pose: LOST_PART_POSES.jaw, cap: cap("jaw", (c) => { c.b.box(-0.09, -0.03, -0.0, 0.09, 0.0, 0.05, CRACK); for (let i = 0; i < 3; i++) limb(c.b, -0.05 + i * 0.05, 0.02, 0.0, 0.07, 0.012, 0.003, E.BONE, 4); }) },
};

export const LOST_SOUL: Rig = {
  key: "L",
  palette: LOST_PALETTE,
  frame: { w: 50, h: 50, worldH: 0.66, floor: 0.975, yaw: 0.0, pitch: 0.1, shift: 0 },
  crawlH: 8 / 12,
  joints: LOST_JOINTS, parts, stumps,
  poses: LOST_POSES,
  walkStep: 0.09,
  // legacy grid 15 x 12; a flyer's rows have no head (head 0), its arms the rows between the top and 3 above the bottom
  regions: { W: 15, H: 12, head: 0, armTop: 0, armBot: 6, shoulder: 3 },
  partSpecs,
};

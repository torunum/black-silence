import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { crackTex, limb, scaled } from "./shapes";
import type { Ctx, PartCap, PartGroup, PartSpec, Rig, RigPart, Stump } from "./kit";
import { armParts, legParts } from "./limbs";
import { GARG_BODY, GARG_JOINTS, GARG_PART_POSES, GARG_POSES } from "./gargoylePoses";

/**
 * THE STONE GARGOYLE (`y`, Blood): winged stone, blue eyes.
 *
 * The legacy sprite is two tones of cool grey stone (`s`, `S`), two horns on top,
 * a face with two blue eyes (`0`), arms and wings out to either side of it and
 * short legs. The rig keeps the stone, the horns and the eyes, and makes the
 * wings what the sprite is: great bat wings of slabs and ribs, as wide as
 * the sprite, that beat. It has a heavy brow and a mouth of fangs, a barrel chest
 * ridged like a ribcage, clawed hands and feet and a tail with a spade. It is
 * stone, so what a blow tears off it is not meat: a torn-off limb leaves a
 * jagged pale break with the dark of its hollow in it, and the pieces it
 * dies in lie as rubble.
 */

const STONE = FIRST_OWN, DEEP = FIRST_OWN + 1, PALE = FIRST_OWN + 2, EYE = FIRST_OWN + 3;

export const GARG_PALETTE = enemyPalette({
  // the legacy S: the stone the light finds
  [STONE]: { ramp: ["#0e1014", "#1a1e24", "#2a3038", "#3c444e", "#505a66", "#68727e", "#8a96a2", "#b0bcc8"], amb: .52, spec: .25, rim: true },
  // the legacy s: the stone in shadow, in the folds
  [DEEP]:  { ramp: ["#080a0e", "#10141a", "#1a2028", "#262e38", "#343e4a"], amb: .34 },
  // the pale of fresh broken rock
  [PALE]:  { ramp: ["#2a2e34", "#4a5058", "#70787f", "#9aa2a8", "#c4cacc", "#e6eaea"], amb: .42, spec: .1, rim: true },
  // the legacy 0: eyes of blue light
  [EYE]:   { ramp: ["#1a4a78", "#2a78b0", "#4aa6dc", "#8accf2", "#d0eeff"], emissive: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
/** Chisel marks and hairline cracks, and more of them as `crack` rises. */
const chisel = (k: number): TexFn => (x, y, z) => (Math.sin(x * 55 + y * 40 + Math.sin(z * 30) * 2) > 0.94 - 0.05 * k ? -1.3 : crackTex(x, y, z) * (0.5 + k));
const TEX = chisel(0);

/** A claw: three hooks at the end of a stone hand or foot. */
function claws(b: Builder, y: number, z: number, spread: number): void {
  for (let i = -1; i <= 1; i++) { b.push(); b.translate(i * spread, y, z); b.pitch(0.5); limb(b, 0, 0, 0, -0.12, 0.022, 0.003, PALE, 4); b.pop(); }
}

/** One wing's slabs: `inner` from the shoulder to the wrist, `outer` from the wrist to the tip. `s` is -1 on the left. */
function wing(b: Builder, s: -1 | 1, inner: boolean): void {
  const K = 0.9, P = (pts: Array<[number, number]>): Array<[number, number]> => pts.map(([x, y]) => [s * x * K, y * K] as [number, number]);
  if (inner) {
    b.prz(P([[0, 0.1], [0.2, 0.24], [0.44, 0.3], [0.44, -0.04], [0.34, -0.22], [0.18, -0.3], [0, -0.28]]), -0.03, 0.03, STONE, { tex: TEX });
    b.prz(P([[0, 0.12], [0.2, 0.27], [0.44, 0.34], [0.44, 0.27], [0.2, 0.2], [0, 0.04]]), -0.045, 0.045, DEEP);            // the arm of the wing
    b.prz(P([[0.06, 0.0], [0.4, 0.1], [0.4, 0.06], [0.06, -0.04]]), -0.04, 0.04, DEEP);                                    // a rib
  } else {
    b.prz(P([[0, 0.04], [0.22, 0.14], [0.52, 0.12], [0.48, -0.04], [0.54, -0.2], [0.32, -0.14], [0.22, -0.34], [0.08, -0.2], [0, -0.1]]), -0.03, 0.03, STONE, { tex: TEX });
    b.prz(P([[0, 0.06], [0.22, 0.17], [0.54, 0.15], [0.54, 0.09], [0.22, 0.1], [0, 0.0]]), -0.045, 0.045, DEEP);
    b.prz(P([[0.02, -0.02], [0.46, -0.04], [0.48, -0.09], [0.02, -0.06]]), -0.04, 0.04, DEEP);
  }
}

const parts: RigPart[] = [
  part("pelvis", "body", (c) => { c.b.cbox(-0.18, -0.1, -0.1, 0.18, 0.08, 0.1, 0.03, STONE, { tex: TEX }); c.b.box(-0.05, -0.12, -0.12, 0.05, -0.02, -0.1, DEEP); }),
  part("tail", "body", (c) => { const b = c.b; limb(b, 0, 0.05, 0, -0.3, 0.06, 0.025, STONE, 6); b.prz([[0, -0.3], [0.07, -0.38], [0, -0.48], [-0.07, -0.38]], 0.02, 0.09, STONE); }),
  part("spine", "body", (c) => c.b.cbox(-0.17, 0, -0.08, 0.17, 0.26, 0.08, 0.03, STONE, { tex: TEX })),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.28, 0, -0.04, 0.28, 0.3, 0.11, 0.04, STONE, { tex: TEX });
    b.prz([[-0.36, 0.24], [-0.14, 0.34], [0.14, 0.34], [0.36, 0.24], [0.28, 0.18], [-0.28, 0.18]], -0.06, 0.1, STONE, { r1: 0.95, tex: TEX });
    for (let i = 0; i < 4; i++) { b.box(-0.22, 0.04 + i * 0.065, -0.085, -0.01, 0.052 + i * 0.065, -0.05, DEEP); b.box(0.01, 0.04 + i * 0.065, -0.085, 0.22, 0.052 + i * 0.065, -0.05, DEEP); }   // ribs cut in the stone
    b.box(-0.012, 0.03, -0.09, 0.012, 0.3, -0.05, DEEP);
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.03, 0.08, 0.09, 0.08, STONE, 6, { tex: TEX })),
  part("shoulderL", "body", (c) => { c.b.ball(0, 0, 0, 0.12, STONE, 6); limb(c.b, -0.06, 0, 0.06, 0.2, 0.03, 0.004, PALE, 4); }),
  part("shoulderR", "body", (c) => { c.b.ball(0, 0, 0, 0.12, STONE, 6); limb(c.b, 0.06, 0, 0.06, 0.2, 0.03, 0.004, PALE, 4); }),
  // ---- the head: a heavy brow, a mouth of fangs, two eyes of blue light, horns swept back ----
  part("head", "head", (c) => {
    const b = scaled(c.b, 1.2), g = c.x("glow"), ck = c.x("crack");
    b.cbox(-0.11, 0.0, -0.11, 0.11, 0.24, 0.11, 0.04, STONE, { tex: chisel(ck) });
    b.box(-0.115, 0.14, -0.13, 0.115, 0.19, -0.07, STONE);                                    // the brow
    b.box(-0.095, 0.1, -0.125, -0.02, 0.14, -0.1, E.CAVITY); b.box(0.02, 0.1, -0.125, 0.095, 0.14, -0.1, E.CAVITY);
    b.box(-0.075, 0.108, -0.132, -0.03, 0.13, -0.125, g > 0.4 ? EYE : DEEP); b.box(0.03, 0.108, -0.132, 0.075, 0.13, -0.125, g > 0.4 ? EYE : DEEP);   // eyes that light
    b.box(-0.03, 0.04, -0.125, 0.03, 0.1, -0.1, STONE);                                       // a snout
    for (const s of [-1, 1]) {
      b.push(); b.translate(s * 0.07, 0.22, 0.0); b.roll(s * -0.35); b.pitch(0.5); limb(b, 0, 0, 0, 0.26, 0.04, 0.006, DEEP, 5); b.pop();    // horns, swept back
      b.push(); b.translate(s * 0.11, 0.14, 0.02); b.roll(s * -1.2); limb(b, 0, 0, 0, 0.1, 0.035, 0.005, STONE, 4); b.pop();                  // pointed ears
    }
  }),
  part("jaw", "head", (c) => {
    const b = scaled(c.b, 1.2);
    b.cbox(-0.09, -0.07, -0.11, 0.09, -0.01, 0.06, 0.02, STONE, { tex: TEX });
    for (let i = -2; i <= 2; i++) b.box(i * 0.035 - 0.01, -0.012, -0.112, i * 0.035 + 0.01, 0.03, -0.1, PALE);
    b.box(-0.07, -0.01, -0.1, 0.07, 0.005, -0.04, E.CAVITY);
  }),
  ...armParts(GARG_BODY, "lArm", {
    joint: 0.06,
    upper: { r0: 0.075, r1: 0.06, mat: STONE, tex: TEX }, fore: { r0: 0.06, r1: 0.045, mat: STONE, tex: TEX },
    hand: (c) => { c.b.cbox(-0.05, -0.08, -0.045, 0.05, 0.0, 0.045, 0.012, STONE); claws(c.b, -0.07, -0.02, 0.03); },
  }),
  ...armParts(GARG_BODY, "rArm", {
    joint: 0.06,
    upper: { r0: 0.075, r1: 0.06, mat: STONE, tex: TEX }, fore: { r0: 0.06, r1: 0.045, mat: STONE, tex: TEX },
    hand: (c) => { c.b.cbox(-0.05, -0.08, -0.045, 0.05, 0.0, 0.045, 0.012, STONE); claws(c.b, -0.07, -0.02, 0.03); },
  }),
  part("wingL", "lArm", (c) => wing(c.b, -1, true)), part("wtipL", "lArm", (c) => wing(c.b, -1, false)),
  part("wingR", "rArm", (c) => wing(c.b, 1, true)), part("wtipR", "rArm", (c) => wing(c.b, 1, false)),
  ...(["L", "R"] as const).flatMap((s) => legParts(GARG_BODY, s, {
    joint: 0.065,
    upper: { r0: 0.095, r1: 0.07, mat: STONE, tex: TEX },
    lower: { r0: 0.07, r1: 0.05, mat: STONE, tex: TEX },
    foot: (c) => { c.b.cbox(-0.045, -0.04, -0.1, 0.045, 0.03, 0.03, 0.012, STONE); claws(c.b, -0.01, -0.1, 0.025); },
  })),
  part("pelvis", "body", (c) => { // rubble lying round it, once it has broken
    const k = c.x("rubble");
    if (k < 0.05) return;
    for (let i = 0; i < 6; i++) { const a = i * 1.9 + 0.3, r = 0.2 + 0.1 * (i % 3) * k; c.b.push(); c.b.translate(Math.cos(a) * r * 2.4, -0.1 + 0.12 * Math.sin(a * 2), Math.sin(a) * r * 0.8); c.b.roll(a); c.b.box(-0.05 - 0.02 * k, -0.02, -0.04, 0.05 + 0.02 * k, 0.04 + 0.03 * (i % 3), 0.04, i % 2 ? STONE : PALE); c.b.pop(); }
  }),
];

/** What a break leaves: jagged pale rock round a dark hollow, with chips of it. */
function brk(b: Builder, r: number, len: number): void {
  b.cbox(-r, -len, -r, r, 0.0, r, r * 0.3, PALE);
  b.box(-r * 0.5, -len - 0.02, -r * 0.6, r * 0.1, -len + 0.02, r * 0.4, E.CAVITY);
  limb(b, r * 0.5, 0, -len, -len - 0.06, r * 0.5, 0.01, PALE, 4); limb(b, -r * 0.6, r * 0.3, -len, -len - 0.05, r * 0.4, 0.01, PALE, 4);
}
const stumps: Stump[] = [
  { joint: "neck", group: "head", draw: (c) => { limb(c.b, 0, 0, 0.0, 0.13, 0.08, 0.07, PALE, 6); c.b.box(-0.04, 0.12, -0.04, 0.02, 0.15, 0.03, E.CAVITY); } },
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "shoulder" + s, group: s === "L" ? "lArm" : "rArm", draw: (c) => { c.b.push(); c.b.translate(s === "L" ? -0.03 : 0.03, 0.0, 0.0); brk(c.b, 0.09, 0.14); c.b.pop(); } })),
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "hip" + s, group: "legs", draw: (c) => brk(c.b, 0.09, 0.12) })),
];

const cap = (joint: string, draw: (c: Ctx) => void): PartCap => ({ joint, draw });
const partSpecs: Record<"head" | "lArm" | "rArm" | "legs", PartSpec> = {
  head: { group: "head", pose: GARG_PART_POSES.head, cap: cap("neck", (c) => { limb(c.b, 0, 0, -0.02, 0.05, 0.08, 0.07, PALE, 6); c.b.box(-0.04, 0.02, -0.04, 0.03, 0.06, 0.03, E.CAVITY); }) },
  lArm: { group: "lArm", pose: GARG_PART_POSES.arm, cap: cap("shoulderL", (c) => { c.b.push(); c.b.translate(0, 0.01, 0); c.b.pitch(Math.PI); brk(c.b, 0.08, 0.04); c.b.pop(); }) },
  rArm: { group: "rArm", pose: GARG_PART_POSES.arm, cap: cap("shoulderR", (c) => { c.b.push(); c.b.translate(0, 0.01, 0); c.b.pitch(Math.PI); brk(c.b, 0.08, 0.04); c.b.pop(); }) },
  legs: { group: "legs", pose: GARG_PART_POSES.legs, cap: cap("pelvis", (c) => { for (const x of [-0.12, 0.12]) { c.b.push(); c.b.translate(x, 0, 0); c.b.pitch(Math.PI); brk(c.b, 0.09, 0.03); c.b.pop(); } }) },
};

export const GARGOYLE: Rig = {
  key: "y",
  palette: GARG_PALETTE,
  frame: { w: 83, h: 96, worldH: 2.25, floor: 0.975, yaw: 0.3, pitch: 0.08, shift: 0 },
  crawlH: 7 / 11,
  joints: GARG_JOINTS, parts, stumps,
  poses: GARG_POSES,
  walkStep: 0.1,
  // legacy grid 10 x 11; a flyer's rows have no head (head 0)
  regions: { W: 10, H: 11, head: 0, armTop: 0, armBot: 5, shoulder: 3 },
  partSpecs,
};

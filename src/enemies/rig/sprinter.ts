import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { crackTex, limb, scaled } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { SPRINTER_BODY, SPRINTER_POSES } from "./sprinterPoses";

/**
 * THE FLAYED SPRINTER (`f`): skinless, crouched, jaw unhinged, claws out.
 *
 * The legacy sprite is the reddest thing in the game: raw muscle (`R`, `i`),
 * bone-tan ribs and hands (`b`), a jaw hanging open on a mouthful of yellow
 * (`j`), dark wraps at the wrists and ankles (`d`). The rig keeps that colour
 * and that wideness — long arms flung out to the sides, a wide-legged run —
 * and gives it a body: fibres on every limb, ribs standing out of a lean
 * chest, a head that is a skull in wet red with a jaw that drops to the chest.
 * It is the fastest thing on the floor (`sp` 5.2) and it dodges, so its
 * walk is a sprint and its attack a pounce.
 */

const MUSCLE = FIRST_OWN, TAN = FIRST_OWN + 1, YELLOW = FIRST_OWN + 2, WRAP = FIRST_OWN + 3, WET = FIRST_OWN + 4;

export const SPRINTER_PALETTE = enemyPalette({
  // the legacy R / i: raw muscle, bright where it is wet
  [MUSCLE]: { ramp: ["#2a0604", "#4e0a06", "#760e08", "#9e140a", "#c01c0e", "#da2c14", "#ee4620"], amb: .6, spec: .6, rim: true },
  // the legacy b: bone with the dried yellow of old tallow in it
  [TAN]:    { ramp: ["#3a3022", "#6e5d44", "#a08a64", "#c8b48a", "#e4d3a8", "#f6ebc6"], amb: .42, spec: .25, rim: true },
  // the legacy j: the yellow of its teeth and the inside of its jaw
  [YELLOW]: { ramp: ["#6e6a14", "#9c9620", "#c8c030", "#e2da44", "#f6f070", "#ffffb0"], amb: .55, spec: .3, rim: true },
  // the legacy d: dark wraps
  [WRAP]:   { ramp: ["#0c0a08", "#17130e", "#241e16", "#342b20", "#463a2b"], amb: .3 },
  // the legacy i: darker, wetter red in the hollows
  [WET]:    { ramp: ["#1a0403", "#310806", "#4c0e08", "#6a160d", "#8a2012"], amb: .4, spec: .5, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
/** Fibres running along a limb: thin dark lines parallel to it. */
const fibre: TexFn = (x, y, z) => (Math.sin(x * 120 + y * 85 + Math.sin(z * 22) * 1.4) > 0.72 ? -1.3 : Math.sin(x * 70 - y * 95) > 0.93 ? 0.9 : 0);
/** Striations across the torso. */
const bands: TexFn = (x, y, z) => (Math.sin(y * 140 + Math.sin(x * 45 + z * 20) * 1.2) > 0.78 ? -1.2 : 0);

/** A claw hand: a bone-tan palm and four long fingers whose spread is `claw`. */
function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b, claw = c.x("claw");
  b.cbox(-0.05, -0.07, -0.034, 0.05, 0.005, 0.034, 0.014, MUSCLE);
  for (let i = -1.5; i <= 1.5; i++) {
    b.push(); b.translate(i * 0.026, -0.065, -0.004 * Math.abs(i)); b.pitch(-0.2 - claw * 0.45); b.roll(i * -0.12 * (0.5 + claw));
    limb(b, 0, 0, 0, -0.07, 0.012, 0.009, TAN, 5);
    b.translate(0, -0.07, 0); b.pitch(-0.3 - claw * 0.8);
    limb(b, 0, 0, 0, -0.13, 0.01, 0.0015, TAN, 5);
    b.pop();
  }
  b.push(); b.translate(s * 0.05, -0.025, -0.01); b.roll(s * -0.9); b.pitch(-0.2);
  limb(b, 0, 0, 0, -0.05, 0.011, 0.008, TAN, 5); b.translate(0, -0.05, 0); b.pitch(-0.4); limb(b, 0, 0, 0, -0.08, 0.009, 0.0015, TAN, 5);
  b.pop();
}

/** A rib standing out of the chest, bone-tan over wet muscle. */
function rib(b: Builder, s: number, y: number): void {
  b.push(); b.translate(s * 0.014, y, -0.09); b.yaw(s * (Math.PI / 2 - 0.35)); b.pitch(-0.1);
  b.cyl(0, 0, 0, 0.2, 0.026, 0.022, 5, TAN);
  b.translate(0, 0, 0.2); b.yaw(s * -0.7); b.pitch(-0.25);
  b.cyl(0, 0, 0, 0.15, 0.022, 0.012, 5, TAN);
  b.pop();
}

const joints: Joint[] = humanJoints(SPRINTER_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    c.b.cbox(-0.2, -0.09, -0.1, 0.2, 0.07, 0.09, 0.03, MUSCLE, { tex: fibre });
    c.b.box(-0.21, -0.03, -0.125, 0.21, 0.04, -0.1, WRAP);                                    // a belt of rag
  }),
  part("spine", "body", (c) => {
    const b = c.b;
    b.cbox(-0.17, 0, -0.08, 0.17, 0.27, 0.08, 0.03, MUSCLE, { tex: bands });
    for (let i = 0; i < 3; i++) b.box(-0.15, 0.05 + i * 0.07, -0.088, 0.15, 0.062 + i * 0.07, -0.078, WET);   // the ridges of its belly
    limb(b, 0, -0.085, 0.02, 0.26, 0.012, 0.011, TAN, 5);                                      // the white line down the middle
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.31, 0, 0.0, 0.31, 0.33, 0.11, 0.04, MUSCLE, { tex: fibre });
    b.prz([[-0.39, 0.26], [-0.17, 0.4], [0.17, 0.4], [0.39, 0.26], [0.31, 0.2], [-0.31, 0.2]], -0.06, 0.1, MUSCLE, { r1: 0.97, tex: fibre });
    b.prz([[-0.22, 0.05], [0.22, 0.05], [0.26, 0.24], [0.0, 0.31], [-0.26, 0.24]], -0.085, -0.01, WET);   // the hollow the ribs close over
    limb(b, 0, -0.1, 0.04, 0.3, 0.03, 0.026, TAN, 5);
    for (let k = 0; k < 5; k++) { rib(b, -1, 0.07 + k * 0.05); rib(b, 1, 0.07 + k * 0.05); }
    for (let i = 0; i < 5; i++) b.ball(0, 0.04 + i * 0.065, 0.112, 0.022, TAN, 5);
  }),
  part("neck", "body", (c) => {
    limb(c.b, 0, -0.03, 0.0, 0.09, 0.07, 0.056, MUSCLE, 6, { tex: fibre });
    c.b.box(-0.025, 0.0, -0.065, -0.012, 0.07, -0.05, E.SINEW); c.b.box(0.012, 0.0, -0.065, 0.025, 0.07, -0.05, E.SINEW);
  }),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.11, MUSCLE, 7)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.11, MUSCLE, 7)),
  // ---- the head: a skull in wet red, and a jaw that drops to its chest ----
  part("head", "head", (c) => {
    const b = scaled(c.b, 1.3);
    b.prz([[-0.05, 0.0], [0.05, 0.0], [0.08, 0.06], [0.09, 0.14], [0.08, 0.22], [0.05, 0.28], [0.0, 0.3], [-0.05, 0.28], [-0.08, 0.22], [-0.09, 0.14], [-0.08, 0.06]], -0.1, 0.11, MUSCLE, { r1: 0.8, tex: fibre });
    b.box(-0.095, 0.17, -0.108, 0.095, 0.19, -0.098, TAN);                                    // brow bone
    b.prz([[-0.075, 0.115], [-0.05, 0.1], [-0.02, 0.115], [-0.02, 0.165], [-0.05, 0.175], [-0.075, 0.16]], -0.108, -0.094, E.CAVITY); b.prz([[0.075, 0.115], [0.05, 0.1], [0.02, 0.115], [0.02, 0.165], [0.05, 0.175], [0.075, 0.16]], -0.108, -0.094, E.CAVITY);
    b.ball(-0.05, 0.138, -0.1, 0.022, YELLOW, 5); b.ball(0.05, 0.138, -0.1, 0.022, YELLOW, 5);   // eyes in the dark
    b.box(-0.012, 0.06, -0.116, 0.012, 0.105, -0.1, E.CAVITY);                                // the nose is a slit
    b.box(-0.065, -0.07, -0.108, 0.065, 0.006, -0.02, E.CAVITY);                              // the dark of its mouth
    for (let i = 0; i < 7; i++) b.box(-0.058 + i * 0.0165, i % 2 ? -0.012 : -0.022, -0.116, -0.045 + i * 0.0165, 0.032, -0.104, YELLOW);   // a hedge of yellow teeth
    b.box(-0.1, 0.07, 0.0, -0.085, 0.12, 0.05, MUSCLE); b.box(0.085, 0.07, 0.0, 0.1, 0.12, 0.05, MUSCLE);
    b.box(0.0, 0.26, -0.05, 0.05, 0.285, 0.0, TAN, { tex: crackTex });                       // the skull, bare at the crown
  }),
  part("jaw", "head", (c) => {
    const b = scaled(c.b, 1.3);
    b.cbox(-0.07, -0.13, -0.11, 0.07, -0.04, 0.0, 0.014, MUSCLE, { tex: fibre });
    b.box(-0.07, -0.05, -0.108, -0.055, 0.0, 0.0, TAN); b.box(0.055, -0.05, -0.108, 0.07, 0.0, 0.0, TAN);
    for (let i = 0; i < 6; i++) b.box(-0.055 + i * 0.0215, -0.046, -0.114, -0.038 + i * 0.0215, -0.008, -0.102, YELLOW);
    b.box(-0.045, -0.085, -0.108, 0.045, -0.05, -0.04, WET);                                  // a long red tongue
    limb(b, -0.03, -0.1, -0.13, -0.3, 0.007, 0.003, E.SINEW, 4); limb(b, 0.035, -0.1, -0.13, -0.25, 0.007, 0.003, E.SINEW, 4);   // drool
  }),
  ...armParts(SPRINTER_BODY, "lArm", {
    joint: 0.06,
    upper: { r0: 0.08, r1: 0.06, mat: MUSCLE, tex: fibre, deco: (c) => limb(c.b, 0.02, -0.04, -0.05, -0.2, 0.011, 0.009, TAN, 5) },
    fore: { r0: 0.06, r1: 0.04, mat: MUSCLE, tex: fibre, deco: (c, len) => c.b.box(-0.04, -len * 0.82, -0.04, 0.04, -len * 0.7, 0.04, WRAP) },
    hand,
  }),
  ...armParts(SPRINTER_BODY, "rArm", {
    joint: 0.06,
    upper: { r0: 0.08, r1: 0.06, mat: MUSCLE, tex: fibre, deco: (c) => limb(c.b, -0.02, -0.04, -0.05, -0.2, 0.011, 0.009, TAN, 5) },
    fore: { r0: 0.06, r1: 0.04, mat: MUSCLE, tex: fibre, deco: (c, len) => c.b.box(-0.04, -len * 0.82, -0.04, 0.04, -len * 0.7, 0.04, WRAP) },
    hand,
  }),
  ...(["L", "R"] as const).flatMap((s) => legParts(SPRINTER_BODY, s, {
    joint: 0.075,
    upper: { r0: 0.115, r1: 0.08, mat: MUSCLE, tex: fibre },
    lower: { r0: 0.08, r1: 0.05, mat: MUSCLE, tex: fibre, deco: (c, len) => { c.b.box(-0.05, -len * 0.9, -0.05, 0.05, -len * 0.78, 0.05, WRAP); limb(c.b, 0, -0.04, -0.04, -len * 0.7, 0.012, 0.01, TAN, 5); } },
    foot: (c) => {
      const b = c.b;
      b.cbox(-0.04, -0.034, -0.16, 0.04, 0.03, 0.03, 0.012, MUSCLE);
      for (let i = -1; i <= 1; i++) { b.push(); b.translate(i * 0.026, -0.01, -0.16); b.pitch(0.1); limb(b, 0, 0, 0, -0.08, 0.009, 0.002, TAN, 4); b.pop(); b.cyl(i * 0.026, -0.012, -0.2, -0.15, 0.009, 0.003, 4, TAN); }
    },
  })),
];

const O = { neck: 0.065, arm: 0.08, leg: 0.11 };

export const SPRINTER: Rig = {
  key: "f",
  palette: SPRINTER_PALETTE,
  frame: { w: 65, h: 90, worldH: 1.85, floor: 0.975, yaw: 0.5, pitch: 0.05, shift: 0.08 },
  crawlH: 12 / 17,
  joints, parts, stumps: humanStumps(O),
  poses: SPRINTER_POSES,
  walkStep: 0.09,
  regions: { W: 20, H: 17, head: 4, armTop: 5, armBot: 11, shoulder: 5.5 },
  partSpecs: humanPartSpecs(SPRINTER_BODY, O),
};


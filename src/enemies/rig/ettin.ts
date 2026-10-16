import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, clothTex, limb, scaled } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { ETTIN_BODY, ETTIN_POSES } from "./ettinPoses";

/**
 * THE ETTIN (`n`): a Hexen brute with a two-handed maul and tusks.
 *
 * The legacy sprite is a hulking brown-skinned (`k`) figure in a dark grey hide
 * harness (`g`), shoulders as wide as the sprite, a small head with a red eye
 * (`R`) over two pale tusks (`t`), and a great steel hammer (`M`) at its right
 * side, up over its shoulder. The rig keeps that: a barrel chest and a belly,
 * arms thicker than its legs, hide straps with studs across the body, a
 * kilt of hide over short legs, a low-browed head with a jaw that juts and
 * tusks that stand up out of it, and a maul in the right hand with a steel head
 * the width of its own. Its attack is the slam (`slam`: it holds the frames
 * across the half second of its stun while the hammer comes down).
 */

const SKIN = FIRST_OWN, HIDE = FIRST_OWN + 1, STEEL = FIRST_OWN + 2, WOOD = FIRST_OWN + 3, EYE = FIRST_OWN + 4, STUD = FIRST_OWN + 5;

export const ETTIN_PALETTE = enemyPalette({
  // the legacy k: a brown skin with green in its shadows
  [SKIN]:  { ramp: ["#14120a", "#262014", "#3c3220", "#564530", "#745c3e", "#947852", "#b8966a"], amb: .55, spec: .1, rim: true },
  // the legacy g: the hide of the harness
  [HIDE]:  { ramp: ["#0c0c08", "#181812", "#26261c", "#383628", "#4c4a38", "#666248", "#807a5a"], amb: .38, rim: true },
  // the legacy M: steel, bluish and dull
  [STEEL]: { ramp: ["#14161a", "#22262c", "#363c44", "#4e565f", "#6a747e", "#8c98a2", "#b4c0c8"], amb: .26, spec: .55, rim: true },
  // the haft
  [WOOD]:  { ramp: ["#140c06", "#26180c", "#3c2814", "#563a1e", "#744e2a", "#946a3a"], amb: .3 },
  // the legacy R: a red eye
  [EYE]:   { ramp: ["#6a1408", "#9a2412", "#c83a22", "#f0583a", "#ff8a66"], emissive: true },
  // studs and rivets
  [STUD]:  { ramp: ["#2a2418", "#4a4030", "#74684c", "#a49a74", "#d0c69c"], amb: .3, spec: .6, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
/** Thick, scarred skin. */
const scar: TexFn = (x, y, z) => (Math.sin(x * 61 + y * 37 + Math.sin(z * 25) * 2) > 0.93 ? -1.2 : blotchTex(1.2, 1.2, -1.4)(x, y, z));
const stud = (b: Builder, x: number, y: number, z: number): void => b.ball(x, y, z, 0.022, STUD, 4);

/** A fist, thick as a head. */
function fist(c: Ctx): void {
  const b = c.b;
  b.cbox(-0.09, -0.16, -0.08, 0.09, 0.0, 0.08, 0.025, SKIN, { tex: scar });
  for (let i = -1; i <= 1; i++) b.cbox(i * 0.05 - 0.022, -0.2, -0.07, i * 0.05 + 0.022, -0.15, 0.07, 0.008, SKIN);
}

/** The maul in the right hand: the haft runs on through the fist along the forearm and ends in a block of steel with a spike on each face. */
function maul(c: Ctx): void {
  const b = c.b;
  limb(b, 0, 0, 0.22, -0.4, 0.04, 0.036, WOOD, 6);                                          // the haft
  for (let i = 0; i < 3; i++) b.box(-0.05, -0.12 - i * 0.07, -0.05, 0.05, -0.1 - i * 0.07, 0.05, HIDE);   // a grip of wraps
  b.cbox(-0.2, -0.66, -0.15, 0.2, -0.38, 0.15, 0.03, STEEL, { tex: scar });               // the head
  b.box(-0.22, -0.64, -0.17, 0.22, -0.6, 0.17, STUD); b.box(-0.22, -0.42, -0.17, 0.22, -0.38, 0.17, STUD);   // its bands
  limb(b, 0, 0.0, -0.66, -0.82, 0.05, 0.005, STEEL, 5);                                       // a spike on its end
}

const joints: Joint[] = humanJoints(ETTIN_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    c.b.cbox(-0.3, -0.12, -0.14, 0.3, 0.08, 0.13, 0.03, SKIN, { tex: scar });
    c.b.box(-0.32, -0.04, -0.16, 0.32, 0.04, -0.13, HIDE);                                  // a broad belt
    for (let i = -2; i <= 2; i++) stud(c.b, i * 0.12, 0.0, -0.17);
  }),
  part("pelvis", "legs", (c) => {                                                         // the kilt of hide goes with the legs it hangs over
    const b = c.b;
    b.prz([[-0.3, -0.06], [0.3, -0.06], [0.36, -0.46], [-0.36, -0.46]], -0.18, 0.15, HIDE, { r1: 0.96, tex: clothTex });
    for (let i = -2; i <= 2; i++) b.prz([[i * 0.12 - 0.04, -0.4], [i * 0.12 + 0.04, -0.4], [i * 0.12 + 0.02, -0.52], [i * 0.12 - 0.02, -0.5]], -0.19, -0.17, HIDE);
  }),
  part("spine", "body", (c) => {
    const b = c.b, h = c.x("heave");
    b.cbox(-0.3 - 0.01 * h, 0, -0.13, 0.3 + 0.01 * h, 0.3, 0.12, 0.05, SKIN, { tex: scar });
    b.ball(0, 0.1, -0.12, 0.22, SKIN, 8, { tex: scar });                                     // a belly
  }),
  part("chest", "body", (c) => {
    const b = c.b, h = c.x("heave") * 0.02;
    b.cbox(-0.42 - h, 0, -0.04, 0.42 + h, 0.4, 0.15, 0.06, SKIN, { tex: scar });
    b.prz([[-0.5, 0.32], [-0.2, 0.46], [0.2, 0.46], [0.5, 0.32], [0.4, 0.22], [-0.4, 0.22]], -0.12, 0.14, SKIN, { r1: 0.95, tex: scar });   // the slope of the shoulders
    for (const s of [-1, 1]) b.ball(s * 0.17, 0.2, -0.16, 0.15, SKIN, 7, { tex: scar });     // pectorals
    b.prz([[-0.42, 0.4], [-0.3, 0.42], [0.3, 0.0], [0.18, -0.02]], -0.19, -0.15, HIDE, { tex: clothTex });   // two straps across it, crossing
    b.prz([[0.42, 0.4], [0.3, 0.42], [-0.3, 0.0], [-0.18, -0.02]], -0.2, -0.16, HIDE, { tex: clothTex });
    stud(b, 0, 0.2, -0.205); stud(b, 0.14, 0.12, -0.205); stud(b, -0.14, 0.12, -0.205); stud(b, 0.25, 0.3, -0.2); stud(b, -0.25, 0.3, -0.2);
    b.box(-0.45, 0.0, 0.14, 0.45, 0.36, 0.17, HIDE);                                        // and a hide across the back
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.04, 0.12, 0.13, 0.12, SKIN, 7, { tex: scar })),
  part("shoulderL", "body", (c) => { c.b.ball(0, 0, 0, 0.19, SKIN, 7, { tex: scar }); c.b.cbox(-0.22, 0.04, -0.17, 0.2, 0.12, 0.17, 0.02, HIDE); stud(c.b, -0.08, 0.13, -0.1); stud(c.b, 0.08, 0.13, -0.1); }),
  part("shoulderR", "body", (c) => { c.b.ball(0, 0, 0, 0.19, SKIN, 7, { tex: scar }); c.b.cbox(-0.2, 0.04, -0.17, 0.22, 0.12, 0.17, 0.02, HIDE); stud(c.b, -0.08, 0.13, -0.1); stud(c.b, 0.08, 0.13, -0.1); }),
  // ---- the head: low-browed, a jaw that juts, tusks standing out of it ----
  part("head", "head", (c) => {
    const b = scaled(c.b, 1.25);
    b.cbox(-0.17, 0.0, -0.16, 0.17, 0.3, 0.16, 0.06, SKIN, { tex: scar });
    b.box(-0.18, 0.17, -0.18, 0.18, 0.23, -0.1, SKIN, { tex: scar });                       // a heavy brow
    b.box(-0.14, 0.14, -0.17, -0.04, 0.17, -0.12, E.CAVITY); b.box(0.04, 0.14, -0.17, 0.14, 0.17, -0.12, E.CAVITY);   // eyes sunk under it
    b.ball(-0.085, 0.14, -0.17, 0.02, EYE, 4); b.ball(0.085, 0.14, -0.17, 0.02, EYE, 4);
    b.box(-0.03, 0.06, -0.19, 0.03, 0.14, -0.15, SKIN);                                      // a flat nose
    for (const s of [-1, 1]) { b.box(s * 0.17, 0.12, -0.04, s * 0.2, 0.22, 0.04, SKIN); }   // ears
    b.prz([[-0.2, 0.28], [0, 0.34], [0.2, 0.28], [0.2, 0.2], [-0.2, 0.2]], -0.14, 0.15, HIDE, { tex: clothTex });   // a rag tied round the crown
  }),
  part("jaw", "head", (c) => {
    const b = scaled(c.b, 1.25);
    b.cbox(-0.16, -0.12, -0.2, 0.16, -0.02, 0.1, 0.03, SKIN, { tex: scar });
    for (const s of [-1, 1]) { b.cyl(s * 0.1, 0.0, -0.2, -0.18, 0.04, 0.03, 5, E.TOOTH); limb(b, s * 0.11, -0.19, -0.1, 0.12, 0.034, 0.006, E.TOOTH, 5); }   // two tusks up out of the jaw
    b.box(-0.12, -0.03, -0.21, 0.12, 0.0, -0.18, E.CAVITY);
  }),
  ...armParts(ETTIN_BODY, "lArm", {
    joint: 0.11,
    upper: { r0: 0.15, r1: 0.12, mat: SKIN, tex: scar },
    fore: { r0: 0.12, r1: 0.1, mat: SKIN, tex: scar, deco: (c, len) => { c.b.box(-0.115, -len * 0.4, -0.115, 0.115, -len * 0.2, 0.115, HIDE); } },
    hand: fist,
  }),
  ...armParts(ETTIN_BODY, "rArm", {
    joint: 0.11,
    upper: { r0: 0.15, r1: 0.12, mat: SKIN, tex: scar },
    fore: { r0: 0.12, r1: 0.1, mat: SKIN, tex: scar, deco: (c, len) => { c.b.box(-0.115, -len * 0.4, -0.115, 0.115, -len * 0.2, 0.115, HIDE); } },
    hand: (c) => { fist(c); maul(c); },
  }),
  ...(["L", "R"] as const).flatMap((s) => legParts(ETTIN_BODY, s, {
    joint: 0.12,
    upper: { r0: 0.17, r1: 0.13, mat: SKIN, tex: scar },
    lower: { r0: 0.13, r1: 0.1, mat: SKIN, tex: scar, deco: (c, len) => { c.b.box(-0.14, -len * 0.9, -0.14, 0.14, -len * 0.5, 0.14, HIDE); stud(c.b, 0, -len * 0.7, -0.145); } },
    foot: (c) => { c.b.cbox(-0.1, -0.06, -0.24, 0.1, 0.05, 0.08, 0.03, HIDE); for (let i = -1; i <= 1; i++) c.b.cyl(i * 0.05, -0.02, -0.28, -0.22, 0.02, 0.012, 4, E.TOOTH); },
  })),
];

const O = { neck: 0.12, arm: 0.12, leg: 0.14, neckTop: 0.2, armLen: 0.18 };

export const ETTIN: Rig = {
  key: "n",
  palette: ETTIN_PALETTE,
  frame: { w: 84, h: 110, worldH: 2.5, floor: 0.975, yaw: 0.3, pitch: 0.05, shift: 0.0 },
  crawlH: 8 / 12,
  joints, parts, stumps: humanStumps(O),
  poses: ETTIN_POSES,
  walkStep: 0.13,
  regions: { W: 12, H: 12, head: 4, armTop: 4, armBot: 8, shoulder: 4 },
  partSpecs: humanPartSpecs(ETTIN_BODY, O),
};

import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, limb, rodX, rodZ } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { ETTIN_BODY, ETTIN_POSES } from "./ettinPoses";

/**
 * THE ETTIN (`n`): Hexen's two-headed brute, a maul in its fist.
 *
 * The legacy sprite is a brown head (`k`) with red eyes (`R`) and pale tusks (`t`) on a dark olive body (`g`), and a grey maul
 * (`M`) over its shoulder. The rig gives it the second head the name means — a smaller, stupider one growing out of the
 * shoulder of the first, lolling — and a body to carry them: a hunched, thick-necked thing of olive hide, its arms longer than
 * its legs, a hide loincloth and a harness of straps, and the maul a spiked iron head on a short haft. It slams (`slam`): the
 * maul goes up and comes down in front of it; it tears off its own flesh and throws it (`fling`).
 */

const HIDE = FIRST_OWN, FACE = FIRST_OWN + 1, CLOTH = FIRST_OWN + 2, IRON = FIRST_OWN + 3, HAFT = FIRST_OWN + 4, GLARE = FIRST_OWN + 5, TUSK = FIRST_OWN + 6;

export const ETTIN_PALETTE = enemyPalette({
  // the legacy g: an olive hide, thick as boot leather
  [HIDE]:  { ramp: ["#121209", "#212114", "#33331f", "#47472d", "#5e5d3c", "#78764d", "#93915f"], amb: .44, spec: .16 },
  // the legacy k: its faces, browner
  [FACE]:  { ramp: ["#1c140c", "#302317", "#473523", "#5f4830", "#7a5d3e", "#957450"], amb: .46, spec: .2, rim: true },
  [CLOTH]: { ramp: ["#120c08", "#20160f", "#302218", "#423022", "#56402d"], amb: .4, spec: .15 },
  // the legacy M: the maul
  [IRON]:  { ramp: ["#141517", "#222428", "#33363b", "#484c52", "#62676e", "#80868e", "#a2a8ae"], amb: .44, spec: .55, rim: true },
  [HAFT]:  { ramp: ["#1a0e06", "#2c180b", "#432411", "#5a3218", "#714020"], amb: .36, spec: .2 },
  // the legacy R
  [GLARE]: { ramp: ["#6a0c04", "#a01808", "#d02a10", "#ff4a20", "#ff9a60"], emissive: true },
  // the legacy t: tusks
  [TUSK]:  { ramp: ["#4a4232", "#776c52", "#a59a78", "#cbc19c", "#ebe2c0", "#fff8de"], amb: .55, spec: .3, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const hide = blotchTex(0.5, 1.45, -1.55);
const hair: TexFn = (x, y, z) => (Math.sin(x * 120 + z * 40) > 0.6 ? -1 : 0);

/** One of its heads: a brow like a shelf, two red eyes under it, a jaw out-thrust and tusks up out of it. `k` sizes it. */
function head(b: Builder, k: number, jaw: number, eyes: boolean): void {
  b.push();
  const S = (v: number): number => v * k;
  b.cbox(S(-0.13), S(-0.02), S(-0.12), S(0.13), S(0.22), S(0.13), S(0.06), FACE, { tex: hide });
  b.cbox(S(-0.14), S(0.13), S(-0.145), S(0.14), S(0.19), S(-0.08), S(0.03), FACE);                       // the brow
  b.prz([[S(-0.1), S(0.2)], [S(0.1), S(0.2)], [S(0.06), S(0.27)], [S(-0.06), S(0.27)]], S(-0.06), S(0.12), CLOTH, { tex: hair });   // a crest of matted hair
  for (const x of [-0.06, 0.06]) {
    b.box(S(x - 0.035), S(0.09), S(-0.13), S(x + 0.035), S(0.13), S(-0.11), E.CAVITY);
    if (eyes) b.box(S(x - 0.022), S(0.098), S(-0.136), S(x + 0.022), S(0.122), S(-0.122), GLARE);
  }
  b.box(S(-0.02), S(0.04), S(-0.15), S(0.02), S(0.1), S(-0.12), FACE);                                     // a flat nose
  b.push(); b.translate(0, S(0.02), S(-0.02)); b.pitch(jaw * 0.6);
  b.cbox(S(-0.12), S(-0.1), S(-0.15), S(0.12), S(0.0), S(0.08), S(0.04), FACE, { tex: hide });              // the jaw, thrust out
  for (let i = 0; i < 5; i++) b.box(S(-0.08 + i * 0.04), S(-0.02), S(-0.158), S(-0.065 + i * 0.04), S(0.01), S(-0.145), TUSK);
  for (const s of [-1, 1]) b.prz([[S(s * 0.09 - 0.02), S(-0.03)], [S(s * 0.09 + 0.02), S(-0.03)], [S(s * 0.1), S(0.1)]], S(-0.17), S(-0.13), TUSK);   // tusks
  b.pop();
  b.pop();
}

/** The maul, in the right hand's frame: a short haft on down the arm's line, a block of iron at its end ringed with spikes. */
function maul(b: Builder): void {
  b.push(); b.translate(0, -0.06, 0);
  limb(b, 0, 0, 0.12, -0.7, 0.032, 0.03, HAFT, 6);
  for (const y of [0.06, -0.06]) limb(b, 0, 0, y, y - 0.04, 0.038, 0.038, CLOTH, 6);
  b.cbox(-0.12, -0.92, -0.12, 0.12, -0.66, 0.12, 0.03, IRON);
  b.cbox(-0.135, -0.75, -0.135, 0.135, -0.71, 0.135, 0.01, IRON);
  for (const y of [-0.73, -0.85]) { rodX(b, 0.12, 0.22, y, 0, 0.03, 0.004, IRON, 4); rodX(b, -0.12, -0.22, y, 0, 0.03, 0.004, IRON, 4); rodZ(b, 0, y, -0.12, -0.22, 0.03, 0.004, IRON, 4); }   // its spikes
  b.ball(0, -0.95, 0, 0.04, IRON, 4);
  b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.08, -0.13, -0.065, 0.08, 0.0, 0.065, 0.025, HIDE, { tex: hide });
  for (let i = -1; i <= 1; i++) { limb(b, i * 0.05, -0.04, -0.12, -0.2, 0.022, 0.018, HIDE, 5); limb(b, i * 0.05, -0.05, -0.2, -0.24, 0.012, 0.004, E.TOOTH, 4); }
  b.box(s * 0.08, -0.1, -0.05, s * 0.11, -0.02, 0.04, HIDE);
  if (s > 0) { b.push(); b.roll(c.x("tilt")); maul(b); b.pop(); }   // `tilt` turns the haft in the fist (the wind-up holds it across the body)
}

const joints: Joint[] = humanJoints(ETTIN_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    const b = c.b;
    b.cbox(-0.28, -0.12, -0.18, 0.28, 0.1, 0.16, 0.06, HIDE, { tex: hide });
    b.cbox(-0.3, -0.03, -0.2, 0.3, 0.05, 0.18, 0.02, CLOTH);                                     // a rope of hide for a belt
    b.ball(-0.18, -0.1, -0.19, 0.05, E.BONE, 5); b.ball(0.12, -0.12, -0.19, 0.045, E.BONE, 5);      // trophies on it: knuckles, a jaw
  }),
  part("pelvis", "legs", (c) => {   // the loincloth goes with the legs
    const b = c.b, sw = c.x("sway");
    for (const [x, z, p] of [[0, -0.2, -0.05], [0, 0.17, 0.1]] as const) {
      b.push(); b.translate(x, -0.03, z); b.pitch(p + sw * 0.08);
      b.prz([[-0.2, 0.02], [0.2, 0.02], [0.17, -0.38], [0.06, -0.46], [-0.08, -0.4], [-0.19, -0.44]], -0.02, 0.02, CLOTH, { tex: hair });
      b.pop();
    }
  }),
  part("spine", "body", (c) => {
    c.b.cbox(-0.31, -0.03, -0.26, 0.31, 0.32, 0.18, 0.14, HIDE, { tex: hide });
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.38, 0, -0.18, 0.38, 0.38, 0.22, 0.12, HIDE, { tex: hide });
    b.ball(-0.16, 0.22, -0.15, 0.14, HIDE, 7, { tex: hide }); b.ball(0.16, 0.22, -0.15, 0.14, HIDE, 7, { tex: hide });
    b.ball(0, 0.34, 0.12, 0.22, HIDE, 8, { tex: hide });                                       // the hump the heads grow out of
    // a strap across it, from the left shoulder to the right hip
    b.push(); b.translate(0, 0.2, -0.29); b.roll(-0.75); b.box(-0.04, -0.45, -0.01, 0.04, 0.45, 0.01, CLOTH); b.pop();
    for (const [x, y] of [[-0.15, 0.32], [0.05, 0.12], [0.2, -0.02]] as const) b.ball(x, y, -0.3, 0.02, IRON, 4);
  }),
  part("neck", "body", (c) => limb(c.b, 0, -0.03, -0.04, 0.1, 0.15, 0.13, HIDE, 7, { tex: hide })),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.15, HIDE, 7, { tex: hide })),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.15, HIDE, 7, { tex: hide })),
  // ---- the heads: the one that thinks, and the one beside it that does not ----
  part("head", "head", (c) => {
    const b = c.b, jaw = c.x("jaw");
    b.push(); b.translate(-0.09, 0, 0); b.roll(0.12); head(b, 1.15, jaw, true); b.pop();
    b.push(); b.translate(0.17, -0.05, 0.03); b.roll(-0.45); b.yaw(-0.2); head(b, 0.86, jaw * 0.5 + 0.3, true); b.pop();
  }),
  ...armParts(ETTIN_BODY, "lArm", armSpec()),
  ...armParts(ETTIN_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(ETTIN_BODY, s, {
    joint: 0.11,
    upper: { r0: 0.14, r1: 0.11, mat: HIDE, tex: hide },
    lower: { r0: 0.11, r1: 0.09, mat: HIDE, tex: hide, deco: (c, len) => { limb(c.b, 0, 0, -len * 0.7, -len * 0.9, 0.1, 0.1, CLOTH, 7); } },
    foot: (c) => { c.b.cbox(-0.09, -0.055, -0.21, 0.09, 0.05, 0.07, 0.03, HIDE, { tex: hide }); for (let i = -1; i <= 1; i++) c.b.cyl(i * 0.05, -0.03, -0.25, -0.2, 0.016, 0.005, 4, E.TOOTH); },
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.11,
    upper: { r0: 0.13, r1: 0.11, mat: HIDE, tex: hide },
    fore: { r0: 0.12, r1: 0.1, mat: HIDE, tex: hide, deco: (c, len) => limb(c.b, 0, 0, -len * 0.7, -len * 0.95, 0.105, 0.1, CLOTH, 7) },   // a wrap of hide round the wrist
    hand,
  };
}

const O = { neck: 0.12, arm: 0.12, leg: 0.13, neckTop: 0.16, armLen: 0.2, legLen: 0.2 };

export const ETTIN: Rig = {
  key: "n",
  palette: ETTIN_PALETTE,
  frame: { w: 76, h: 100, worldH: 2.3, floor: 0.975, yaw: 0.4, pitch: 0.05, shift: 0.02 },
  crawlH: 8 / 12,
  joints, parts, stumps: humanStumps(O),
  poses: ETTIN_POSES,
  walkStep: 0.14,
  regions: { W: 12, H: 12, head: 4, armTop: 4, armBot: 8, shoulder: 4.5 },
  partSpecs: humanPartSpecs(ETTIN_BODY, O),
};

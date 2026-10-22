import type { Builder } from "../../render/viewmodel/builder";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, crackTex, limb } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { damp, shovel } from "./gravedigger";
import { DIGGER2_BODY, DIGGER2_POSES } from "./gravedigger2Poses";

/**
 * THE GRAVEDIGGER UNEARTHED (`N2`): the wraith the grave gives back, in his last phase.
 *
 * The legacy sprite is a hood of bright green (`R`) round yellow-green eyes (`M`) over a body gone nearly black (`g`, `W`), the
 * shovel still in his hand (`S`, `s`). The rig: the hood fallen back off a skull with the green pouring out of its sockets and its
 * open jaw, the coat rotted to rags and ribbons, the chest broken open on a hollow full of the same light, roots and worms hanging
 * off him from the earth he came up through; the shovel, its blade alight. Taller than he was, and thinner.
 */

// the shovel is the gravedigger's own (`shovel`), so its materials keep his ids: DIRT, IRON, HAFT at 2, 3, 4
const COAT = FIRST_OWN, ROOT = FIRST_OWN + 1, DIRT = FIRST_OWN + 2, IRON = FIRST_OWN + 3, HAFT = FIRST_OWN + 4, GLOW = FIRST_OWN + 5, CORE = FIRST_OWN + 6, BONE2 = FIRST_OWN + 7;

export const DIGGER2_PALETTE = enemyPalette({
  // the legacy g / W: the coat, rotted nearly black
  [COAT]:  { ramp: ["#0c0e0a", "#161a12", "#22281b", "#2e3626", "#3c4632", "#4c5840"], amb: .46, spec: .08, rim: true },
  [ROOT]:  { ramp: ["#140e08", "#22180e", "#342414", "#46321c", "#5a4226"], amb: .42, spec: .1 },
  [BONE2]: { ramp: ["#34322a", "#55524a", "#787468", "#9c9688", "#bcb6a6", "#d8d2c2"], amb: .5, spec: .2, rim: true },
  // the legacy R / M: the green
  [GLOW]:  { ramp: ["#2a6a10", "#40961a", "#5ec026", "#7fd05a", "#b4ee60"], emissive: true },
  [CORE]:  { ramp: ["#8ad030", "#a8e03a", "#c4ee48", "#dcf860"], emissive: true },
  // the legacy S / s
  [IRON]:  { ramp: ["#161616", "#262624", "#393835", "#4e4c48", "#66635d", "#807c75"], amb: .44, spec: .5, rim: true },
  [HAFT]:  { ramp: ["#1a120a", "#2c1f12", "#40301c", "#544027", "#6a5233"], amb: .38, spec: .2 },
  [DIRT]:  { ramp: ["#120c08", "#20160e", "#302216", "#42301f", "#56402a"], amb: .42 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const rot = blotchTex(0.7, 1.2, -1.5);

/** Roots and worms hanging from (x, y, z), `n` of them, up to `len` long. */
function roots(b: Builder, x: number, y: number, z: number, n: number, len: number, sway: number): void {
  for (let i = 0; i < n; i++) {
    b.push(); b.translate(x + (i - (n - 1) / 2) * 0.05, y, z); b.roll(Math.sin(i * 2.3 + sway) * 0.3); b.pitch(Math.cos(i * 1.7) * 0.2);
    const l = len * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.9 + 0.3)));
    limb(b, 0, 0, 0, -l, 0.014, 0.004, i % 3 === 2 ? E.ORGAN : ROOT, 4);
    b.pop();
  }
}

function rag(b: Builder, x: number, y: number, z: number, w: number, len: number, sw: number): void {
  b.push(); b.translate(x, y, z); b.pitch(sw * 0.12); b.roll(-x * 0.5);
  b.prz([[-w, 0], [w, 0], [w * 0.9, -len * 0.7], [w * 0.2, -len], [-w * 0.5, -len * 0.75], [-w, -len * 0.4]], -0.018, 0.018, COAT, { tex: damp });
  b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.04, -0.08, -0.025, 0.04, 0.0, 0.025, 0.008, BONE2, { tex: crackTex });
  for (let i = -1; i <= 2; i++) { b.push(); b.translate(i * 0.02 - 0.01, -0.075, 0); b.pitch(-0.6); limb(b, 0, 0, 0, -0.1, 0.01, 0.006, BONE2, 4); b.pop(); }
  if (s > 0) shovel(b, 1, c.x("tilt"), GLOW);   // its blade alight, always now
}

const joints: Joint[] = humanJoints(DIGGER2_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => { c.b.cbox(-0.18, -0.08, -0.1, 0.18, 0.06, 0.1, 0.03, COAT, { tex: rot }); roots(c.b, 0, -0.06, -0.11, 5, 0.3, c.x("sway")); }),
  part("pelvis", "legs", (c) => { const sw = c.x("sway"); for (let i = 0; i < 7; i++) rag(c.b, -0.27 + i * 0.09, -0.02, -0.12 + (i % 2) * 0.02, 0.055, 0.55 + 0.25 * Math.abs(Math.sin(i * 2.1)), sw * (i % 2 ? 1 : -1)); }),
  part("spine", "body", (c) => {
    const b = c.b;
    b.cbox(-0.18, 0, -0.1, 0.18, 0.3, 0.1, 0.04, COAT, { tex: rot });
    for (let i = 0; i < 4; i++) b.box(-0.12, 0.04 + i * 0.065, -0.108, 0.12, 0.058 + i * 0.065, -0.098, BONE2);
  }),
  part("chest", "body", (c) => {
    const b = c.b, sw = c.x("sway");
    b.cbox(-0.25, 0, -0.1, 0.25, 0.34, 0.12, 0.05, COAT, { tex: rot });
    b.prz([[-0.12, 0.04], [0.12, 0.04], [0.16, 0.18], [0.1, 0.32], [-0.1, 0.32], [-0.16, 0.18]], -0.115, -0.08, E.CAVITY);   // the chest broken open
    b.ball(0, 0.17, -0.1, 0.1, GLOW, 7); b.ball(0, 0.17, -0.14, 0.03, CORE, 5);                                         // the light in it
    for (const [x, y, a] of [[-0.17, 0.26, 0.7], [0.18, 0.08, -0.6], [-0.15, 0.05, -0.4], [0.16, 0.28, 0.5]] as const) { b.push(); b.translate(x, y, -0.13); b.roll(a); b.box(-0.012, -0.06, -0.006, 0.012, 0.06, 0.006, GLOW); b.pop(); }   // and it shows through the rot
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { b.push(); b.translate(s * 0.15, 0.08 + k * 0.065, -0.12); b.roll(s * (0.3 + k * 0.05)); b.cbox(s > 0 ? -0.11 : 0, -0.012, -0.014, s > 0 ? 0 : 0.11, 0.012, 0.008, 0.005, BONE2); b.pop(); }
    for (let i = 0; i < 5; i++) rag(b, -0.3 + i * 0.15, 0.36, 0.13, 0.08, 0.5 + 0.15 * Math.sin(i * 1.7), sw);   // the coat, in ribbons off his back
    roots(b, -0.22, 0.02, -0.06, 3, 0.25, sw); roots(b, 0.24, 0.05, -0.04, 3, 0.2, sw + 1);
  }),
  part("neck", "body", (c) => { for (let i = 0; i < 3; i++) c.b.cbox(-0.03, i * 0.04, -0.03, 0.03, i * 0.04 + 0.025, 0.03, 0.008, BONE2); }),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.085, COAT, 6)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.085, COAT, 6)),
  part("head", "head", (c) => {
    const b = c.b;
    b.prz([[-0.17, -0.1], [0.17, -0.1], [0.19, 0.06], [0.14, 0.16], [-0.14, 0.16], [-0.19, 0.06]], 0.04, 0.2, COAT, { r1: 0.85, tex: damp });   // the hood, fallen back
    b.ball(0, 0.11, 0.0, 0.11, BONE2, 9, { tex: crackTex });
    b.cbox(-0.085, -0.02, -0.11, 0.085, 0.12, 0.04, 0.025, BONE2, { tex: crackTex });
    for (const x of [-0.042, 0.042]) { b.box(x - 0.034, 0.05, -0.12, x + 0.034, 0.1, -0.1, E.CAVITY); b.ball(x, 0.075, -0.125, 0.026, GLOW, 5); b.ball(x, 0.075, -0.135, 0.012, CORE, 4); }
    b.prz([[-0.012, 0.0], [0.012, 0.0], [0, 0.035]], -0.12, -0.1, E.CAVITY);
    roots(b, 0.0, 0.2, 0.02, 4, 0.15, 0);
  }),
  part("jaw", "head", (c) => {
    const b = c.b;
    b.cbox(-0.075, -0.07, -0.11, 0.075, -0.015, 0.03, 0.015, BONE2);
    b.prz([[-0.05, -0.02], [0.05, -0.02], [0.03, 0.04], [-0.03, 0.04]], -0.115, -0.1, GLOW);   // the light pouring out of its mouth
  }),
  ...armParts(DIGGER2_BODY, "lArm", armSpec()),
  ...armParts(DIGGER2_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(DIGGER2_BODY, s, {
    joint: 0.06,
    upper: { r0: 0.07, r1: 0.055, mat: COAT, tex: rot },
    lower: { r0: 0.04, r1: 0.035, mat: BONE2, tex: crackTex, deco: (c, len) => limb(c.b, 0, 0, -len * 0.1, -len * 0.5, 0.06, 0.055, DIRT, 6) },
    foot: (c) => { c.b.cbox(-0.05, -0.04, -0.15, 0.05, 0.03, 0.04, 0.012, BONE2); roots(c.b, 0, 0, 0, 2, 0.08, 0); },
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.05,
    upper: { r0: 0.065, r1: 0.05, mat: COAT, tex: rot, deco: (c, len) => rag(c.b, 0, -len * 0.1, 0.05, 0.07, len * 0.9, c.x("sway")) },
    fore: { r0: 0.035, r1: 0.03, mat: BONE2, tex: crackTex, deco: (c, len) => { limb(c.b, 0.025, 0, -len * 0.05, -len * 0.95, 0.018, 0.015, BONE2, 4); roots(c.b, 0, -len * 0.3, 0.03, 2, 0.18, 0.5); } },
    hand,
  };
}

const O = { neck: 0.05, arm: 0.06, leg: 0.07, neckTop: 0.12, armLen: 0.14, legLen: 0.16 };

export const GRAVEDIGGER2: Rig = {
  key: "N2",
  palette: DIGGER2_PALETTE,
  frame: { w: 82, h: 100, worldH: 2.22, floor: 0.975, yaw: 0.4, pitch: 0.05, shift: 0.0 },
  crawlH: 9 / 13,
  joints, parts, stumps: humanStumps(O),
  poses: DIGGER2_POSES,
  walkStep: 0.13,
  regions: { W: 17, H: 13, head: 3, armTop: 3, armBot: 8, shoulder: 3.5 },
  partSpecs: humanPartSpecs(DIGGER2_BODY, O),
};

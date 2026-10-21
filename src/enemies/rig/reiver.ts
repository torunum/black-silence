import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { clothTex, crackTex, limb, meatTex } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { REIVER_BODY, REIVER_POSES } from "./reiverPoses";

/**
 * THE REIVER (`R`, Hexen's): half a corpse, all of the hate. It flies (`fly`) and throws green bolts (`reiver`).
 *
 * The legacy sprite is a pale skull (`b`) in a dark hood (`G`, `E`) with yellow-green eyes (`0`), and brown rags (`R`) where its
 * body should go on. The rig is what is left of a man cut off at the waist and still flying: a skull in the hood of a shroud gone
 * to rags, the rags streaming (`trail`), the ribs bare through the rot, two long arms of bone and sinew ending in hooked claws,
 * and below the ribs nothing but the spine and what hangs from it. Its attack draws the arms back and flings them forward, the
 * light coming up in its hands (`cast`).
 */

const BONE2 = FIRST_OWN, SHROUD = FIRST_OWN + 1, RAG = FIRST_OWN + 2, GLOW = FIRST_OWN + 3, ROT = FIRST_OWN + 4;

export const REIVER_PALETTE = enemyPalette({
  // the legacy b: old bone, yellowed
  [BONE2]:  { ramp: ["#2a271f", "#4a4536", "#6e6750", "#938a6c", "#b5ac8a", "#d4cba8", "#ece4c4"], amb: .5, spec: .2, rim: true },
  // the legacy G / E: the hood and the shroud
  [SHROUD]: { ramp: ["#1a1a15", "#2b2b21", "#3e3e30", "#545442", "#6c6c55", "#86866c"], amb: .44, spec: .08, rim: true },
  // the legacy R: the rags of it, brown
  [RAG]:    { ramp: ["#140c08", "#24160e", "#372216", "#4c3020", "#62402b", "#7a5238"], amb: .42, spec: .06 },
  // the legacy 0
  [GLOW]:   { ramp: ["#3a4a04", "#6a8008", "#98b414", "#c0dc28", "#dcf040"], emissive: true },
  // what is left of the flesh on it
  [ROT]:    { ramp: ["#1c150e", "#2f2418", "#463624", "#5e4a32", "#7a6044"], amb: .4, spec: .15 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const tatter: TexFn = (x, y, z) => (Math.sin(x * 80 + y * 23) > 0.92 ? -1.3 : clothTex(x, y, z));

/** Rags hung from `y`, `n` of them across `w`, `len` long, streaming back as `trail` says. */
function rags(b: Builder, y: number, w: number, len: number, trail: number, n: number, mat: number, z = 0): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5, x = t * w, l = len * (0.65 + 0.35 * Math.abs(Math.sin(i * 2.7 + 0.4)));
    b.push(); b.translate(x, y, z + Math.abs(t) * 0.06); b.pitch(-0.3 - trail * 0.6 - Math.abs(t) * 0.2 + Math.sin(i * 1.9) * 0.15); b.roll(-t * (0.5 + trail * 0.4));
    b.prz([[-0.03, 0], [0.03, 0], [0.04, -l * 0.5], [0.012, -l], [-0.01, -l * 0.85], [-0.04, -l * 0.45]], -0.012, 0.012, mat, { tex: tatter });
    b.pop();
  }
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b, cast = c.x("cast");
  b.cbox(-0.035, -0.07, -0.02, 0.035, 0.0, 0.02, 0.008, BONE2);
  for (let i = -1; i <= 2; i++) {
    b.push(); b.translate(i * 0.018 - 0.009, -0.065, 0); b.pitch(-0.35 - cast * 0.3); b.roll(i * -0.12);
    limb(b, 0, 0, 0, -0.08, 0.009, 0.007, BONE2, 4); b.translate(0, -0.08, 0); b.pitch(-0.6); limb(b, 0, 0, 0, -0.07, 0.007, 0.001, SHROUD, 4);
    b.pop();
  }
  b.box(s * 0.035, -0.05, -0.015, s * 0.055, -0.01, 0.015, BONE2);
  if (cast > 0) b.ball(0, -0.12, -0.04, 0.03 + cast * 0.06, GLOW, 6);
}

const joints: Joint[] = humanJoints(REIVER_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {   // where it was cut: the last of the spine, and what hangs out
    const b = c.b;
    for (let i = 0; i < 3; i++) b.cbox(-0.035, -0.02 - i * 0.05, -0.0, 0.035, 0.015 - i * 0.05, 0.05, 0.008, BONE2);
    limb(b, 0.04, -0.03, 0.0, -0.18, 0.025, 0.012, E.ORGAN, 5, { tex: meatTex }); limb(b, -0.05, -0.04, 0.0, -0.13, 0.02, 0.01, E.MEAT, 5, { tex: meatTex });
  }),
  part("pelvis", "legs", (c) => { rags(c.b, 0.04, 0.4, 0.62, c.x("trail"), 6, SHROUD, -0.02); rags(c.b, 0.0, 0.3, 0.5, c.x("trail") * 0.8, 4, RAG, 0.05); }),   // the rags of the shroud where the legs were
  part("spine", "body", (c) => {
    const b = c.b;
    limb(b, 0, 0.03, 0, 0.3, 0.03, 0.03, BONE2, 5, { tex: crackTex });
    b.cbox(-0.15, 0.08, -0.06, 0.15, 0.3, 0.08, 0.05, ROT);                                       // the dried flesh over its back
    for (let i = 0; i < 3; i++) b.box(-0.12, 0.12 + i * 0.06, -0.068, 0.12, 0.135 + i * 0.06, -0.058, BONE2);
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.22, 0, -0.04, 0.22, 0.32, 0.1, 0.05, ROT);
    for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { b.push(); b.translate(s * 0.012, 0.06 + k * 0.05, -0.08); b.yaw(s * (Math.PI / 2 - 0.35)); b.cyl(0, 0, 0, 0.18, 0.015, 0.011, 5, BONE2); b.pop(); }   // the ribs, bare
    limb(b, 0, -0.085, 0.03, 0.31, 0.022, 0.02, BONE2, 5, { tex: crackTex });                    // the breastbone
    b.ball(0.02, 0.15, -0.03, 0.05, E.ORGAN, 5);                                                  // a black heart in them
    // the shroud: a cowl over the shoulders, rags off it
    b.prz([[-0.32, 0.24], [-0.24, 0.38], [0, 0.44], [0.24, 0.38], [0.32, 0.24], [0.2, 0.18], [-0.2, 0.18]], -0.1, 0.14, SHROUD, { r1: 0.9, tex: tatter });
    rags(b, 0.22, 0.6, 0.35, c.x("trail") * 0.6, 5, SHROUD, 0.12);
    // and behind it all the shroud it was buried in, spread like a cloak and torn to the hem
    const tr = c.x("trail");
    b.push(); b.translate(0, 0.36, 0.16); b.pitch(-0.12 - tr * 0.35);
    for (let i = -2; i <= 2; i++) {   // in panels, each torn to a point of its own (a prism is convex: one panel, one point)
      const x = i * 0.14, l = 0.8 + 0.18 * Math.sin(i * 2.1 + 0.5), w = 0.095 + Math.abs(i) * 0.01;
      b.push(); b.translate(x, 0, 0); b.roll(-i * 0.12);
      b.prz([[-w * 0.8, 0.04], [w * 0.8, 0.04], [w, -l * 0.7], [w * 0.3, -l], [-w * 0.5, -l * 0.86], [-w, -l * 0.65]], 0.0 + Math.abs(i) * 0.004, 0.03, SHROUD, { tex: tatter });
      b.pop();
    }
    b.pop();
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.02, 0.1, 0.03, 0.03, BONE2, 5)),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.06, BONE2, 6)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.06, BONE2, 6)),
  // ---- the head: a skull in the hood, the green in its sockets ----
  part("head", "head", (c) => {
    const b = c.b;
    b.prz([[-0.17, -0.06], [0.17, -0.06], [0.19, 0.12], [0.14, 0.27], [0.0, 0.35], [-0.14, 0.27], [-0.19, 0.12]], -0.1, 0.17, SHROUD, { r1: 0.85, tex: tatter });   // the hood
    b.ball(0, 0.1, -0.02, 0.12, BONE2, 8, { tex: crackTex });
    b.cbox(-0.1, -0.02, -0.14, 0.1, 0.14, 0.04, 0.03, BONE2, { tex: crackTex });
    for (const x of [-0.045, 0.045]) { b.box(x - 0.038, 0.055, -0.15, x + 0.038, 0.115, -0.12, E.CAVITY); b.box(x - 0.03, 0.064, -0.158, x + 0.03, 0.106, -0.14, GLOW); }
    b.prz([[-0.015, 0.02], [0.015, 0.02], [0, 0.05]], -0.15, -0.13, E.CAVITY);
    for (let i = 0; i < 5; i++) b.box(-0.05 + i * 0.022, -0.02, -0.148, -0.036 + i * 0.022, 0.01, -0.135, BONE2);
  }),
  part("jaw", "head", (c) => {
    const b = c.b;
    b.cbox(-0.075, -0.06, -0.13, 0.075, -0.01, 0.02, 0.015, BONE2);
    for (let i = 0; i < 5; i++) b.box(-0.05 + i * 0.022, -0.02, -0.14, -0.036 + i * 0.022, 0.005, -0.128, BONE2);
  }),
  ...armParts(REIVER_BODY, "lArm", armSpec()),
  ...armParts(REIVER_BODY, "rArm", armSpec()),
  // the legs are gone: "legs" is the spine trailing on down and the entrails with it
  ...(["L", "R"] as const).flatMap((s) => legParts(REIVER_BODY, s, {
    joint: 0.02,
    upper: { r0: 0.025, r1: 0.02, mat: s === "L" ? BONE2 : E.ORGAN, tex: s === "L" ? crackTex : meatTex },
    lower: { r0: 0.02, r1: 0.008, mat: s === "L" ? BONE2 : E.MEAT, tex: meatTex },
    foot: () => {},
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.03,
    upper: { r0: 0.035, r1: 0.025, mat: BONE2, tex: crackTex, deco: (c, len) => { limb(c.b, 0.015, -0.015, -len * 0.1, -len * 0.7, 0.03, 0.02, ROT, 5); rags(c.b, -len * 0.2, 0.1, 0.25, c.x("trail") * 0.4, 2, SHROUD, 0.03); } },
    fore: { r0: 0.025, r1: 0.02, mat: BONE2, tex: crackTex, deco: (c, len) => limb(c.b, -0.02, 0, -len * 0.05, -len * 0.95, 0.014, 0.012, BONE2, 4) },
    hand,
  };
}

const O = { neck: 0.04, arm: 0.04, leg: 0.04, neckTop: 0.08, armLen: 0.08, legLen: 0.08 };

export const REIVER: Rig = {
  key: "R",
  palette: REIVER_PALETTE,
  frame: { w: 90, h: 90, worldH: 1.72, floor: 0.975, yaw: 0.3, pitch: 0.06, shift: 0.0 },
  crawlH: 7 / 10,
  joints, parts, stumps: humanStumps(O),
  poses: REIVER_POSES,
  walkStep: 0.11,
  regions: { W: 10, H: 10, head: 0, armTop: 0, armBot: 5, shoulder: 3 },
  partSpecs: humanPartSpecs(REIVER_BODY, O),
};

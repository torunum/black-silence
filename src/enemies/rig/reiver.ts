import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { clothTex, crackTex, ellipsoid, limb, scaled } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { REIVER_BODY, REIVER_POSES } from "./reiverPoses";

/**
 * THE REIVER (`R`): a half-corpse, flying, undead, tattered.
 *
 * The legacy sprite is a skull the colour of old bone (`b`) with black sockets
 * (`E`) and two yellow-green points of light (`0`), dark rot (`G`) at its edges,
 * and under it rags (`R`, brown) that flare out into two long arms and trail away
 * into nothing. The rig keeps that and finishes the corpse: a skull with its jaw
 * hanging, a ribcage with the flesh gone from it and a spine that runs on down
 * into a pelvis with only rags and bone left under it, long bone arms in torn
 * sleeves that end in fingers too long, and a ball of green light between the
 * hands when it fires (`orb`: its bolt is green). It hangs leaning into the air,
 * the rags streaming (`rag`).
 */

const BONEW = FIRST_OWN, ROT = FIRST_OWN + 1, RAG = FIRST_OWN + 2, EYE = FIRST_OWN + 3, ORB = FIRST_OWN + 4;

export const REIVER_PALETTE = enemyPalette({
  // the legacy b: old bone, yellowed
  [BONEW]: { ramp: ["#1c1a14", "#38342a", "#5a5546", "#7e7866", "#9a9482", "#bdb69e", "#dcd6bc"], amb: .42, spec: .2, rim: true },
  // the legacy G: the black rot at its edges
  [ROT]:   { ramp: ["#0c0c08", "#181810", "#26261a", "#383626", "#4a4636", "#605a46"], amb: .36 },
  // the legacy R: brown rags
  [RAG]:   { ramp: ["#140c08", "#26180f", "#3c261a", "#5a3a2a", "#7a5238", "#9a6c4c", "#b88a62"], amb: .4, rim: true },
  // the legacy 0: the yellow-green light in its sockets
  [EYE]:   { ramp: ["#4a5a08", "#788e14", "#a8c424", "#d0e840", "#eeff80"], emissive: true },
  // the bolt it throws, green
  [ORB]:   { ramp: ["#3a6a14", "#5a9a22", "#86c838", "#b4ee60", "#e8ffb0"], emissive: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const old: TexFn = (x, y, z) => (Math.sin(x * 70 + y * 45 + Math.sin(z * 35) * 2) > 0.92 ? -1.2 : crackTex(x, y, z));

/** A strip of rag hung from `y`, `len` long, streaming back by `rag`. */
function strip(b: Builder, x: number, y: number, len: number, rag: number, z = 0): void {
  b.push(); b.translate(x, y, z); b.pitch(-rag * 0.5); b.roll(-x * 1.2);
  b.prz([[-0.045, 0], [0.045, 0], [0.06, -len * 0.6], [0.02, -len], [-0.03, -len * 0.8], [-0.06, -len * 0.5]], -0.02, 0.02, RAG, { tex: clothTex });
  b.pop();
}

/** A bony hand: a narrow palm and long fingers, hooked. */
function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.03, -0.06, -0.02, 0.03, 0.0, 0.02, 0.008, BONEW);
  for (let i = -2; i <= 2; i++) { b.push(); b.translate(i * 0.015, -0.055, 0); b.pitch(-0.2); b.roll(i * -0.12); limb(b, 0, 0, 0, -0.1, 0.009, 0.007, BONEW, 4); b.translate(0, -0.1, 0); b.pitch(-0.5); limb(b, 0, 0, 0, -0.1, 0.007, 0.002, BONEW, 4); b.pop(); }
  b.push(); b.translate(s * 0.03, -0.03, 0); b.roll(s * -0.9); limb(b, 0, 0, 0, -0.06, 0.008, 0.003, BONEW, 4); b.pop();
}

const joints: Joint[] = humanJoints(REIVER_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    const b = c.b;
    b.cbox(-0.14, -0.07, -0.07, 0.14, 0.05, 0.06, 0.02, BONEW, { tex: old });                // the pelvis, bare bone
    b.box(-0.05, -0.09, -0.08, 0.05, -0.02, -0.06, E.CAVITY);
    for (const s of [-1, 1]) strip(b, s * 0.1, -0.02, 0.2, c.x("rag"), -0.04);                // rags from the waist
  }),
  part("pelvis", "legs", (c) => { const r = c.x("rag"); for (let i = -2; i <= 2; i++) strip(c.b, i * 0.065, -0.04, 0.34 + 0.12 * Math.abs(Math.sin(i * 2.3)), r, 0.03 * i); }),   // the long rags hang from the hips, with the legs
  part("spine", "body", (c) => {
    const b = c.b;
    for (let i = 0; i < 5; i++) b.cbox(-0.035, 0.015 + i * 0.05, -0.03, 0.035, 0.05 + i * 0.05, 0.03, 0.01, BONEW);   // vertebrae, with gaps
    b.prz([[-0.09, 0.0], [0.09, 0.0], [0.08, 0.24], [-0.08, 0.24]], 0.0, 0.07, ROT, { tex: clothTex });   // what is left of the flesh across the back
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.19, 0.0, 0.02, 0.19, 0.3, 0.08, 0.03, ROT, { tex: clothTex });
    for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { b.push(); b.translate(s * 0.012, 0.04 + k * 0.05, 0.0); b.yaw(s * (Math.PI / 2 - 0.2)); b.cyl(0, 0, 0, 0.17, 0.014, 0.011, 5, BONEW); b.translate(0, 0, 0.17); b.yaw(s * -0.8); b.cyl(0, 0, 0, 0.13, 0.011, 0.007, 5, BONEW); b.pop(); }   // ribs, bare
    limb(b, 0, -0.04, 0.02, 0.3, 0.018, 0.016, BONEW, 5);                                      // the breastbone
    b.prz([[-0.12, 0.28], [0.12, 0.28], [0.1, 0.06], [-0.1, 0.06]], 0.0, 0.05, E.CAVITY);    // the dark between the ribs
    b.prz([[-0.2, 0.3], [0.2, 0.3], [0.26, 0.2], [0.24, 0.1], [0.12, 0.2], [-0.12, 0.2], [-0.24, 0.1], [-0.26, 0.2]], -0.06, 0.0, RAG, { tex: clothTex });   // a shawl of rag over the shoulders
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.02, 0.08, 0.04, 0.035, BONEW, 5)),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.06, BONEW, 5)), part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.06, BONEW, 5)),
  // ---- the head: a skull, the jaw hanging, two points of light in the sockets ----
  part("head", "head", (c) => {
    const b = scaled(c.b, 2.2);
    ellipsoid(b, 0, 0.12, 0, 0.075, 0.085, 0.085, BONEW, 8, { tex: old });                  // the cranium
    b.cbox(-0.055, 0.0, -0.085, 0.055, 0.08, 0.03, 0.015, BONEW, { tex: old });              // the face
    for (const s of [-1, 1]) { ellipsoid(b, s * 0.034, 0.1, -0.082, 0.026, 0.03, 0.02, E.CAVITY, 6); b.ball(s * 0.034, 0.1, -0.095, 0.011, EYE, 4); }
    b.box(-0.01, 0.055, -0.092, 0.01, 0.085, -0.08, E.CAVITY);
    for (let i = 0; i < 6; i++) b.box(-0.04 + i * 0.016, 0.0, -0.088, -0.03 + i * 0.016, 0.026, -0.078, E.TOOTH);
    b.box(0.035, 0.17, -0.02, 0.07, 0.19, 0.04, ROT);                                          // a rag of skin hanging off the brow
  }),
  part("jaw", "head", (c) => {
    const b = scaled(c.b, 2.2);
    b.cbox(-0.05, -0.07, -0.085, 0.05, -0.012, 0.0, 0.01, BONEW, { tex: old });
    for (let i = 0; i < 5; i++) b.box(-0.04 + i * 0.02, -0.014, -0.088, -0.03 + i * 0.02, 0.012, -0.078, E.TOOTH);
  }),
  ...armParts(REIVER_BODY, "lArm", {
    joint: 0.04,
    upper: { r0: 0.04, r1: 0.035, mat: BONEW, tex: old, deco: (c, len) => { c.b.prz([[-0.06, 0.0], [0.06, 0.0], [0.08, -len * 0.7], [0.0, -len * 0.95], [-0.07, -len * 0.6]], -0.05, 0.05, RAG, { tex: clothTex }); } },
    fore: { r0: 0.035, r1: 0.028, mat: BONEW, tex: old, deco: (c, len) => { c.b.prz([[-0.045, 0.0], [0.045, 0.0], [0.06, -len * 0.6], [0.0, -len * 0.85], [-0.05, -len * 0.5]], -0.04, 0.04, RAG, { tex: clothTex }); } },
    hand: (c) => hand(c, -1),
  }),
  ...armParts(REIVER_BODY, "rArm", {
    joint: 0.04,
    upper: { r0: 0.04, r1: 0.035, mat: BONEW, tex: old, deco: (c, len) => { c.b.prz([[-0.06, 0.0], [0.06, 0.0], [0.07, -len * 0.6], [0.0, -len * 0.95], [-0.08, -len * 0.7]], -0.05, 0.05, RAG, { tex: clothTex }); } },
    fore: { r0: 0.035, r1: 0.028, mat: BONEW, tex: old, deco: (c, len) => { c.b.prz([[-0.045, 0.0], [0.045, 0.0], [0.055, -len * 0.5], [0.0, -len * 0.85], [-0.06, -len * 0.6]], -0.04, 0.04, RAG, { tex: clothTex }); } },
    hand: (c) => hand(c, 1),
  }),
  ...(["L", "R"] as const).flatMap((s) => legParts(REIVER_BODY, s, {
    joint: 0.035,
    upper: { r0: 0.045, r1: 0.035, mat: BONEW, tex: old }, lower: { r0: 0.034, r1: 0.025, mat: BONEW, tex: old },
    foot: (c) => { c.b.cbox(-0.025, -0.02, -0.1, 0.025, 0.02, 0.02, 0.008, BONEW); for (let i = -1; i <= 1; i++) limb(c.b, i * 0.014, -0.005, -0.06, -0.12, 0.007, 0.002, BONEW, 4); },
  })),
  // the light between its hands when it fires: in the world, in front of the chest
  part("chest", "body", (c) => { const o = c.x("orb"); if (o > 0.05) { ellipsoid(c.b, 0, 0.36, -0.42, 0.06 + 0.14 * o, 0.06 + 0.14 * o, 0.1 * o + 0.03, ORB, 7); ellipsoid(c.b, 0, 0.36, -0.46, 0.03 + 0.06 * o, 0.03 + 0.06 * o, 0.04, E.EYE, 5); } }),
];

const O = { neck: 0.05, arm: 0.05, leg: 0.06, neckTop: 0.12 };

export const REIVER: Rig = {
  key: "R",
  palette: REIVER_PALETTE,
  frame: { w: 77, h: 77, worldH: 1.9, floor: 0.975, yaw: 0.0, pitch: 0.08, shift: 0.0 },
  crawlH: 7 / 10,
  joints, parts, stumps: humanStumps(O),
  poses: REIVER_POSES,
  walkStep: 0.1,
  // legacy grid 10 x 10; a flyer's rows have no head (head 0)
  regions: { W: 10, H: 10, head: 0, armTop: 0, armBot: 5, shoulder: 3 },
  partSpecs: humanPartSpecs(REIVER_BODY, O),
};

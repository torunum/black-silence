import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { clothTex, crackTex, limb, rodZ } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { PRIEST_BODY, PRIEST_POSES } from "./priestPoses";

/**
 * THE CORRUPTED PRIEST (`Q`, a boss): he still holds mass.
 *
 * The legacy sprite is a tall thing in a dark purple chasuble (`r`) under a gold mitre (`M`) with a red face (`R`) and a stole of
 * sick yellow-green (`B`). The rig keeps every colour and makes him a priest: very tall and very thin, a mitre a third again his
 * height with a red cross on it, a long grey face with the yellow-green burning in its sockets and a mouth stitched shut, the
 * chasuble to the floor with a gold orphrey down its front and a stole hanging from his neck, long arms in wide sleeves, and in
 * his right hand a crosier of gold, its crook holding the light he throws (`cast`); a censer swings from his left on its chain,
 * smoking. In his last phase he is something else (`./priest2.ts`).
 */

export const ROBE = FIRST_OWN, GOLD = FIRST_OWN + 1, FACE = FIRST_OWN + 2, BLOOD = FIRST_OWN + 3, GLOW = FIRST_OWN + 4, STOLE = FIRST_OWN + 5, MAGIC = FIRST_OWN + 6, DARK = FIRST_OWN + 7;

export const PRIEST_PALETTE = enemyPalette({
  // the legacy r: a chasuble of purple gone nearly black
  [ROBE]:  { ramp: ["#100710", "#1c0d1c", "#2c152a", "#3e203c", "#522c4f", "#683a64", "#80507c"], amb: .46, spec: .1 },
  // the legacy M: gold, the mitre and the crosier and the orphrey
  [GOLD]:  { ramp: ["#2a1e08", "#4a3610", "#6e5218", "#927024", "#b48e34", "#d4ae4c", "#f0d070"], amb: .46, spec: .6, rim: true },
  // a face the colour of tallow
  [FACE]:  { ramp: ["#1c1a18", "#33302c", "#4e4a43", "#6c675e", "#8a847a", "#a8a296", "#c6c0b2"], amb: .48, spec: .2 },
  // the legacy R: the red of the cross and of the stitching
  [BLOOD]: { ramp: ["#3a0806", "#5c0f0a", "#801a10", "#a32616", "#c83a20", "#e25a36"], amb: .44, spec: .3, rim: true },
  // the legacy B: what burns in his eyes
  [GLOW]:  { ramp: ["#4a5a04", "#7a900c", "#a8c41c", "#c8dc30", "#e0f048"], emissive: true },
  // the stole, the same sick green, in cloth
  [STOLE]: { ramp: ["#1e2408", "#34400e", "#4e5e16", "#6a7e20", "#88a02c", "#a8c03c"], amb: .46, spec: .15 },
  // the light he throws: the game's purple orb
  [MAGIC]: { ramp: ["#3a1060", "#5a1c90", "#7a2cc0", "#9a4ae0", "#c080ff"], emissive: true },
  [DARK]:  { ramp: ["#0a080a", "#141014", "#201a20", "#2c242c"], amb: .4, spec: .2 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
export const damask: TexFn = (x, y, z) => (Math.sin(x * 70) * Math.sin(y * 70 + z * 20) > 0.82 ? 0.9 : clothTex(x, y, z));

/** The crosier, in the right hand's frame: a gold staff on down the arm's line, and at its top the crook, holding the light. */
function crosier(b: Builder, cast: number, tilt: number): void {
  b.push(); b.translate(0, -0.06, 0); b.pitch(Math.PI / 2); b.roll(tilt);   // the staff runs up out of the fist, the crook over the hand (`tilt` stands it upright beside him)
  limb(b, 0, 0, -0.75, 0.75, 0.022, 0.022, GOLD, 6);
  for (const y of [-0.2, 0.3, 0.6]) limb(b, 0, 0, y, y + 0.04, 0.032, 0.032, GOLD, 6);   // its knops
  b.push(); b.translate(0, 0.75, 0);
  b.ball(0, 0, 0, 0.05, GOLD, 6);
  for (let i = 0; i < 7; i++) {   // the crook: a hook of gold bending over
    const a = (i / 6) * Math.PI * 1.15, r = 0.12;
    b.push(); b.translate(Math.sin(a) * r, 0.05 + (1 - Math.cos(a)) * r, 0); b.roll(-a); limb(b, 0, 0, 0, 0.06, 0.02, 0.02, GOLD, 5); b.pop();
  }
  b.ball(0.12, 0.17, 0, 0.04 + cast * 0.08, cast > 0 ? MAGIC : BLOOD, 6);   // what it holds: a red stone, the light when he casts
  b.pop();
  b.pop();
}

/** The censer on its chain, from the left hand: a pierced gold ball, the smoke off it. */
function censer(b: Builder, swing: number): void {
  b.push(); b.translate(0, -0.08, 0); b.roll(swing * 0.5);
  for (let i = 0; i < 6; i++) b.ball(0, -i * 0.04, 0, 0.008, GOLD, 4);
  b.translate(0, -0.28, 0);
  b.ball(0, 0, 0, 0.065, GOLD, 7); b.cbox(-0.05, 0.04, -0.05, 0.05, 0.07, 0.05, 0.01, GOLD);
  for (const [x, y] of [[-0.03, 0.01], [0.03, -0.01], [0, -0.035]] as const) b.ball(x, y, -0.062, 0.012, GLOW, 4);   // the coals through its holes
  for (let i = 0; i < 4; i++) b.ball(Math.sin(i * 1.7 + swing) * 0.04, 0.1 + i * 0.07, 0.02, 0.03 + i * 0.01, DARK, 5);   // smoke
  b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.04, -0.08, -0.025, 0.04, 0.0, 0.025, 0.01, FACE);
  for (let i = -1; i <= 2; i++) { b.push(); b.translate(i * 0.02 - 0.01, -0.075, 0); b.pitch(-0.5); limb(b, 0, 0, 0, -0.1, 0.009, 0.006, FACE, 4); b.pop(); }   // long fingers, curled round it
  if (s > 0) crosier(b, c.x("cast"), c.x("tilt")); else censer(b, c.x("swing"));
}

const joints: Joint[] = humanJoints(PRIEST_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => c.b.cbox(-0.2, -0.1, -0.12, 0.2, 0.08, 0.12, 0.04, ROBE, { tex: damask })),
  // the chasuble's skirt to the floor, the orphrey down it, the alb's hem under it: it goes with the legs
  part("pelvis", "legs", (c) => {
    const b = c.b, sw = c.x("swing");
    b.push(); b.pitch(sw * 0.04);
    b.prz([[-0.22, 0.02], [0.22, 0.02], [0.3, -0.5], [0.36, -0.88], [-0.36, -0.88], [-0.3, -0.5]], -0.14, 0.13, ROBE, { r1: 0.92, tex: damask });
    b.prz([[-0.06, 0.02], [0.06, 0.02], [0.07, -0.88], [-0.07, -0.88]], -0.152, -0.14, GOLD);
    b.box(-0.37, -0.88, -0.15, 0.37, -0.84, 0.14, GOLD);
    b.prz([[-0.3, -0.84], [0.3, -0.84], [0.32, -0.94], [-0.32, -0.94]], -0.12, 0.11, FACE);   // the alb, grey-white, at his feet
    b.pop();
  }),
  part("spine", "body", (c) => {
    c.b.cbox(-0.18, 0, -0.11, 0.18, 0.3, 0.1, 0.04, ROBE, { tex: damask });
    c.b.box(-0.06, 0.0, -0.118, 0.06, 0.3, -0.108, GOLD);
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.24, 0, -0.11, 0.24, 0.34, 0.11, 0.05, ROBE, { tex: damask });
    b.prz([[-0.06, 0.0], [0.06, 0.0], [0.06, 0.18], [0.22, 0.34], [0.14, 0.36], [0.0, 0.22], [-0.14, 0.36], [-0.22, 0.34], [-0.06, 0.18]], -0.122, -0.11, GOLD);   // the Y of the orphrey
    b.box(-0.025, 0.08, -0.128, 0.025, 0.2, -0.12, BLOOD); b.box(-0.06, 0.15, -0.128, 0.06, 0.175, -0.12, BLOOD);   // a cross on it, upside down
    // the stole, from the neck down either side
    for (const s of [-1, 1]) b.prz([[s * 0.1, 0.36], [s * 0.15, 0.36], [s * 0.17, -0.1], [s * 0.12, -0.1]], -0.135, -0.12, STOLE);
    b.cbox(-0.16, 0.32, -0.1, 0.16, 0.4, 0.1, 0.03, GOLD);                                         // the amice's collar
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.02, 0.12, 0.06, 0.055, FACE, 6)),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.09, ROBE, 7)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.09, ROBE, 7)),
  // ---- the head: a long grey face under a mitre a third again his height ----
  part("head", "head", (c) => {
    const b = c.b;
    b.cbox(-0.095, -0.06, -0.1, 0.095, 0.2, 0.1, 0.04, FACE, { tex: crackTex });
    b.cbox(-0.1, 0.1, -0.12, 0.1, 0.15, -0.06, 0.02, FACE);                                      // the brow
    for (const x of [-0.045, 0.045]) { b.box(x - 0.03, 0.05, -0.115, x + 0.03, 0.1, -0.095, E.CAVITY); b.box(x - 0.02, 0.06, -0.122, x + 0.02, 0.09, -0.11, GLOW); }
    b.box(-0.012, 0.0, -0.12, 0.012, 0.06, -0.1, FACE);                                          // a long nose
    b.box(-0.05, -0.035, -0.112, 0.05, -0.025, -0.1, E.CAVITY);                                  // the mouth
    for (let i = 0; i < 5; i++) b.box(-0.04 + i * 0.02 - 0.003, -0.05, -0.116, -0.04 + i * 0.02 + 0.003, -0.01, -0.106, BLOOD);   // stitched shut
    // the mitre: two tall gold leaves, a band, the red cross on its front, the lappets down his back
    b.prz([[-0.11, 0.16], [0.11, 0.16], [0.13, 0.4], [0.06, 0.58], [0.0, 0.64], [-0.06, 0.58], [-0.13, 0.4]], -0.1, 0.1, GOLD, { r1: 0.88 });
    b.cbox(-0.115, 0.15, -0.105, 0.115, 0.22, 0.105, 0.02, GOLD);
    b.box(-0.02, 0.26, -0.112, 0.02, 0.52, -0.1, BLOOD); b.box(-0.08, 0.38, -0.112, 0.08, 0.42, -0.1, BLOOD);
    for (const s of [-1, 1]) b.prz([[s * 0.04, 0.17], [s * 0.1, 0.17], [s * 0.1, -0.2], [s * 0.04, -0.22]], 0.09, 0.11, GOLD);
  }),
  ...armParts(PRIEST_BODY, "lArm", armSpec()),
  ...armParts(PRIEST_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(PRIEST_BODY, s, {
    joint: 0.07,
    upper: { r0: 0.08, r1: 0.07, mat: ROBE, tex: damask },
    lower: { r0: 0.07, r1: 0.06, mat: ROBE, tex: damask },
    foot: (c) => c.b.cbox(-0.05, -0.04, -0.15, 0.05, 0.04, 0.05, 0.015, DARK),
  })),
];

/** A wide sleeve, gold at the cuff. */
function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.075,
    upper: { r0: 0.08, r1: 0.08, mat: ROBE, tex: damask },
    fore: { r0: 0.08, r1: 0.12, mat: ROBE, tex: damask, deco: (c, len) => { limb(c.b, 0, 0, -len + 0.06, -len, 0.125, 0.125, GOLD, 8); rodZ(c.b, 0, -len * 0.5, 0.06, 0.14, 0.05, 0.02, ROBE, 5); } },
    hand,
  };
}

const O = { neck: 0.06, arm: 0.08, leg: 0.08, neckTop: 0.14, armLen: 0.16, legLen: 0.16 };

export const PRIEST: Rig = {
  key: "Q",
  palette: PRIEST_PALETTE,
  frame: { w: 65, h: 100, worldH: 2.75, floor: 0.975, yaw: 0.36, pitch: 0.05, shift: 0.0 },
  crawlH: 11 / 16,
  joints, parts, stumps: humanStumps(O),
  poses: PRIEST_POSES,
  walkStep: 0.15,
  regions: { W: 16, H: 16, head: 5, armTop: 5, armBot: 10, shoulder: 5.5 },
  partSpecs: humanPartSpecs(PRIEST_BODY, O),
};

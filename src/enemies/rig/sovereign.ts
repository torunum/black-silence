import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { clothTex, crackTex, limb } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { SOVEREIGN_BODY, SOVEREIGN_POSES } from "./sovereignPoses";

/**
 * THE BONE SOVEREIGN (`Z`, a boss): it wore every crown that rotted here.
 *
 * The legacy sprite is a skeleton (`b`) under a gold crown (`Y`, `M`), dark sockets (`E`), a red mantle at the shoulders (`R`)
 * and a dark robe (`c`). The rig is a dead king on his feet: the skull under a tall crown of gold points and red stones, the
 * mantle of red with its ermine collar spotted black, the ribs bare under it, a robe of mouldering black to the floor with a gold
 * hem, long arms of bone in rings, a sceptre in the right hand topped with a skull of gold that holds his light (`cast`) and in
 * the left the orb of his rule, cracked. The red is in his sockets. In his last phase he is the ossuary (`./sovereign2.ts`).
 */

export const BONE2 = FIRST_OWN, GOLD = FIRST_OWN + 1, MANTLE = FIRST_OWN + 2, ROBE = FIRST_OWN + 3, ERMINE = FIRST_OWN + 4, GEM = FIRST_OWN + 5, MAGIC = FIRST_OWN + 6, EYE2 = FIRST_OWN + 7;

export const SOVEREIGN_PALETTE = enemyPalette({
  // the legacy b: old bone, pale
  [BONE2]:  { ramp: ["#3a352a", "#5c5546", "#807866", "#a49c88", "#c4bca8", "#ddd6c4", "#f2ecdc"], amb: .5, spec: .25, rim: true },
  // the legacy Y / M: the crowns' gold
  [GOLD]:   { ramp: ["#3a2a08", "#5e4610", "#86661a", "#ac8a28", "#d0ac3c", "#ecca58", "#fce888"], amb: .5, spec: .65, rim: true },
  // the legacy R: the mantle
  [MANTLE]: { ramp: ["#320a0a", "#521010", "#741a16", "#96261e", "#b63428", "#d44a36"], amb: .46, spec: .2 },
  // the legacy c: the robe
  [ROBE]:   { ramp: ["#141410", "#22221a", "#323228", "#424236", "#545446", "#686858"], amb: .44, spec: .1 },
  [ERMINE]: { ramp: ["#5a5650", "#87827a", "#b0aba2", "#d4d0c6", "#efece4"], amb: .55, spec: .1 },
  [GEM]:    { ramp: ["#5a0610", "#900c1c", "#c8182c", "#f03040", "#ff7080"], emissive: true },
  [MAGIC]:  { ramp: ["#3a1060", "#5a1c90", "#7a2cc0", "#9a4ae0", "#c080ff"], emissive: true },
  // what is in his sockets
  [EYE2]:   { ramp: ["#6a0c04", "#a01808", "#d02a10", "#ff4a20", "#ff9a60"], emissive: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const mould: TexFn = (x, y, z) => (Math.sin(x * 60 + y * 30 + Math.sin(z * 40) * 2) > 0.9 ? -1.1 : clothTex(x, y, z));
const ermine: TexFn = (x, y, z) => (Math.sin(x * 140) * Math.sin(y * 140 + z * 60) > 0.9 ? -5 : 0);

/** A crown: a band of gold, `n` points up off it, red stones in the band. Centred at the origin, the band from y0, its radius r. */
export function crown(b: Builder, y0: number, r: number, h: number, n: number): void {
  b.cbox(-r, y0, -r, r, y0 + h * 0.3, r, 0.02, GOLD);
  for (let i = 0; i < n; i++) {
    const x = -r + (i + 0.5) * ((2 * r) / n), tall = h * (i % 2 ? 0.75 : 1);
    b.prz([[x - r / n * 0.8, y0 + h * 0.3], [x + r / n * 0.8, y0 + h * 0.3], [x, y0 + h * 0.3 + tall]], -r - 0.012, -r + 0.02, GOLD);
    b.ball(x, y0 + h * 0.3 + tall, -r, 0.016, GOLD, 4);
    if (i % 2 === 0) b.ball(x, y0 + h * 0.15, -r - 0.012, 0.022, GEM, 4);
  }
}

/** A skull: the cranium, the face, the sockets with the red in them, the nose, the upper teeth. At the head joint, `k` its size. */
export function skull(b: Builder, eye: number): void {
  b.ball(0, 0.12, 0.01, 0.12, BONE2, 9, { tex: crackTex });
  b.cbox(-0.095, -0.02, -0.12, 0.095, 0.13, 0.06, 0.03, BONE2, { tex: crackTex });
  b.cbox(-0.11, 0.04, -0.09, 0.11, 0.08, 0.02, 0.015, BONE2);
  for (const x of [-0.045, 0.045]) { b.prz([[x - 0.035, 0.05], [x + 0.035, 0.05], [x + 0.038, 0.1], [x - 0.038, 0.1]], -0.13, -0.1, E.CAVITY); b.ball(x, 0.075, -0.13, 0.014, eye, 4); }
  b.prz([[-0.015, 0.0], [0.015, 0.0], [0, 0.035]], -0.13, -0.11, E.CAVITY);
  for (let i = 0; i < 6; i++) b.box(-0.055 + i * 0.019, -0.03, -0.125, -0.043 + i * 0.019, 0.0, -0.112, BONE2);
}

/** The sceptre, in the right hand's frame, standing up out of the fist: a staff of gold and a gold skull atop it holding the light. */
function sceptre(b: Builder, cast: number, tilt: number): void {
  b.push(); b.translate(0, -0.06, 0); b.pitch(Math.PI / 2); b.roll(tilt);
  limb(b, 0, 0, -0.5, 0.7, 0.024, 0.02, GOLD, 6);
  for (const y of [-0.1, 0.35]) limb(b, 0, 0, y, y + 0.05, 0.035, 0.035, GOLD, 6);
  b.push(); b.translate(0, 0.72, 0);
  b.ball(0, 0.06, 0, 0.07, GOLD, 7);
  for (const x of [-0.025, 0.025]) b.ball(x, 0.07, -0.06, 0.016, cast > 0 ? MAGIC : GEM, 4);
  if (cast > 0) b.ball(0, 0.18, 0, 0.04 + cast * 0.09, MAGIC, 6);
  b.pop(); b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.035, -0.06, -0.02, 0.035, 0.0, 0.02, 0.008, BONE2);
  for (let i = -1; i <= 2; i++) { b.push(); b.translate(i * 0.018 - 0.009, -0.055, 0); b.pitch(-0.6); limb(b, 0, 0, 0, -0.09, 0.009, 0.006, BONE2, 4); b.pop(); }
  b.box(-0.04, -0.06, -0.025, -0.01, -0.045, 0.025, GOLD);   // a ring
  if (s > 0) sceptre(b, c.x("cast"), c.x("tilt"));
  else { b.ball(0, -0.13, -0.03, 0.07, GOLD, 8); b.box(-0.008, -0.07, -0.1, 0.008, -0.03, -0.09, GOLD); b.box(-0.06, -0.135, -0.1, 0.06, -0.125, -0.06, GEM); }   // the orb, a crack across it
}

const joints: Joint[] = humanJoints(SOVEREIGN_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => { c.b.cbox(-0.17, -0.08, -0.1, 0.17, 0.06, 0.1, 0.03, BONE2, { tex: crackTex }); c.b.cbox(-0.2, -0.03, -0.12, 0.2, 0.03, 0.12, 0.01, GOLD); }),   // the pelvis, a girdle of gold
  part("pelvis", "legs", (c) => {   // the robe to the floor
    const b = c.b, sw = c.x("sway");
    b.push(); b.pitch(sw * 0.04);
    b.prz([[-0.2, 0.0], [0.2, 0.0], [0.3, -0.5], [0.34, -0.86], [-0.34, -0.86], [-0.3, -0.5]], -0.2, 0.13, ROBE, { r1: 0.9, tex: mould });
    b.box(-0.35, -0.86, -0.21, 0.35, -0.82, 0.13, GOLD);
    for (let i = 0; i < 4; i++) b.box(-0.24 + i * 0.16 - 0.006, -0.8, -0.21, -0.24 + i * 0.16 + 0.006, -0.2, -0.2, GOLD);   // the gold-thread seams down it
    b.pop();
  }),
  part("spine", "body", (c) => {
    const b = c.b;
    limb(b, 0, 0.02, 0, 0.3, 0.03, 0.03, BONE2, 5, { tex: crackTex });
    for (let i = 0; i < 4; i++) b.cbox(-0.05, 0.03 + i * 0.07, -0.02, 0.05, 0.06 + i * 0.07, 0.06, 0.01, BONE2);
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { b.push(); b.translate(s * 0.012, 0.03 + k * 0.05, -0.07); b.yaw(s * (Math.PI / 2 - 0.35)); b.cyl(0, 0, 0, 0.2 - k * 0.006, 0.016, 0.012, 5, BONE2); b.pop(); }
    limb(b, 0, -0.08, 0.02, 0.32, 0.022, 0.02, BONE2, 5, { tex: crackTex });
    limb(b, 0, 0.03, 0, 0.32, 0.028, 0.028, BONE2, 5);
    // the mantle: over the shoulders and down the back, the ermine collar across the front
    b.prz([[-0.34, 0.34], [-0.22, 0.44], [0.22, 0.44], [0.34, 0.34], [0.44, -0.4], [0.3, -0.62], [-0.3, -0.62], [-0.44, -0.4]], 0.06, 0.15, MANTLE, { r1: 0.92, tex: mould });
    for (const s of [-1, 1]) b.prz([[s * 0.2, 0.4], [s * 0.34, 0.32], [s * 0.38, -0.2], [s * 0.28, -0.22]], -0.12, -0.04, MANTLE, { tex: mould });
    b.cbox(-0.3, 0.3, -0.14, 0.3, 0.42, 0.12, 0.05, ERMINE, { tex: ermine });
    b.ball(0, 0.32, -0.15, 0.03, GOLD, 5); b.ball(0, 0.32, -0.17, 0.016, GEM, 4);   // its clasp
  }),
  part("neck", "body", (c) => { for (let i = 0; i < 3; i++) c.b.cbox(-0.03, 0.0 + i * 0.04, -0.03, 0.03, 0.025 + i * 0.04, 0.03, 0.008, BONE2); }),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.07, BONE2, 6)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.07, BONE2, 6)),
  part("head", "head", (c) => { skull(c.b, EYE2); crown(c.b, 0.17, 0.125, 0.2, 7); }),
  part("jaw", "head", (c) => {
    c.b.cbox(-0.08, -0.06, -0.12, 0.08, -0.01, 0.03, 0.015, BONE2);
    for (let i = 0; i < 6; i++) c.b.box(-0.055 + i * 0.019, -0.02, -0.126, -0.043 + i * 0.019, 0.005, -0.114, BONE2);
  }),
  ...armParts(SOVEREIGN_BODY, "lArm", armSpec()),
  ...armParts(SOVEREIGN_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(SOVEREIGN_BODY, s, {
    joint: 0.04,
    upper: { r0: 0.04, r1: 0.032, mat: BONE2, tex: crackTex },
    lower: { r0: 0.032, r1: 0.026, mat: BONE2, tex: crackTex },
    foot: (c) => { c.b.cbox(-0.04, -0.03, -0.13, 0.04, 0.02, 0.03, 0.01, BONE2); },
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.035,
    upper: { r0: 0.035, r1: 0.03, mat: BONE2, tex: crackTex, deco: (c) => { const b = c.b; b.push(); b.translate(0, 0, 0.02); b.prz([[-0.1, 0.02], [0.1, 0.02], [0.13, -0.28], [-0.13, -0.28]], -0.01, 0.01, MANTLE, { tex: mould }); b.pop(); } },   // the mantle's sleeve
    fore: { r0: 0.03, r1: 0.026, mat: BONE2, tex: crackTex, deco: (c, len) => { limb(c.b, 0.025, 0, -len * 0.05, -len * 0.95, 0.018, 0.016, BONE2, 4); limb(c.b, 0, 0, -len * 0.82, -len * 0.92, 0.04, 0.04, GOLD, 6); } },
    hand,
  };
}

const O = { neck: 0.04, arm: 0.04, leg: 0.045, neckTop: 0.1, armLen: 0.1, legLen: 0.12 };

export const SOVEREIGN: Rig = {
  key: "Z",
  palette: SOVEREIGN_PALETTE,
  frame: { w: 65, h: 100, worldH: 2.6, floor: 0.975, yaw: 0.36, pitch: 0.05, shift: 0.0 },
  crawlH: 11 / 16,
  joints, parts, stumps: humanStumps(O),
  poses: SOVEREIGN_POSES,
  walkStep: 0.15,
  regions: { W: 17, H: 16, head: 5, armTop: 5, armBot: 10, shoulder: 5.5 },
  partSpecs: humanPartSpecs(SOVEREIGN_BODY, O),
};

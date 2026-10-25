import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, crackTex, limb } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { SLAUGHTAUR_BODY, SLAUGHTAUR_LEGS_POSE, SLAUGHTAUR_POSES } from "./slaughtaurPoses";

/**
 * THE SLAUGHTAUR (`k`, Hexen's): an armoured centaur. It spits fire from a screaming shield (`shield`, `centaur`).
 *
 * The legacy sprite is a brown horned helm (`h`) with red eyes (`R`) on a body of bronze (`g`) and dark (`k`), and a shield
 * (`S`) with a red and yellow face on it (`B`, `b`). The rig makes it a centaur: the man's torso in bronze plate rising out of a
 * horse's chest, the horse's barrel behind it in barding, four legs ending in hooves, a tail; a horned helm with the red behind
 * its slit; and on its left arm the shield, a skull of bone set in it with its jaw screaming open, and when it fires the blue
 * comes out of the skull's mouth (`fire`). The front legs are the rig's legs (they go when the legs go); the hind ones are drawn
 * with the barrel and stride with them (`stride`).
 */

const BRONZE = FIRST_OWN, HIDE = FIRST_OWN + 1, HELM = FIRST_OWN + 2, SHIELD = FIRST_OWN + 3, GLARE = FIRST_OWN + 4, FIRE = FIRST_OWN + 5, HORN = FIRST_OWN + 6, HOOF = FIRST_OWN + 7, CLOTH = FIRST_OWN + 8;

export const SLAUGHTAUR_PALETTE = enemyPalette({
  // the legacy g: bronze plate, dull, green where it has weathered
  [BRONZE]: { ramp: ["#22180a", "#3a2a10", "#5a4218", "#7c5c22", "#9e782e", "#c09840", "#e0bc62"], amb: .44, spec: .55, rim: true },
  // the legacy k: the horse's dark hide
  [HIDE]:   { ramp: ["#100b08", "#1c130e", "#2a1d15", "#3a281d", "#4c3426", "#604230"], amb: .42, spec: .25 },
  // a war-cloth of red over the barding and from its belt
  [CLOTH]:  { ramp: ["#3a0806", "#5c0f0a", "#801a10", "#a32616", "#c83a20", "#e25a36"], amb: .42, spec: .1 },
  // the legacy h: the helm
  [HELM]:   { ramp: ["#121314", "#1e2023", "#2d3034", "#3f4348", "#555a60", "#6e747b"], amb: .44, spec: .5, rim: true },
  // the legacy S: the shield's iron
  [SHIELD]: { ramp: ["#141312", "#22201e", "#33302d", "#46423e", "#5c5752", "#746e68"], amb: .44, spec: .45, rim: true },
  // the legacy R
  [GLARE]:  { ramp: ["#6a0c04", "#a01808", "#d02a10", "#ff4a20", "#ff9a60"], emissive: true },
  // the fire it spits: blue (the game's `centaur` bolt)
  [FIRE]:   { ramp: ["#0c2a7a", "#1a48b8", "#2a68e8", "#4a8aff", "#7aaaff"], emissive: true },
  // the legacy H / b: horn and bone, yellowed
  [HORN]:   { ramp: ["#3a3022", "#5e5038", "#877454", "#ae9a74", "#d2c098", "#ecdcb6"], amb: .5, spec: .3, rim: true },
  [HOOF]:   { ramp: ["#0c0a08", "#181410", "#26201a", "#352c24"], amb: .4, spec: .3 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const hide = blotchTex(0.4, 1.6, -1.6);
const plate: TexFn = (x, y, z) => (Math.sin(x * 83 + y * 41 + Math.sin(z * 27) * 1.6) > 0.985 ? -1.2 : 0);

/** A horse's leg at (x, z) under the barrel, swung by `a`: the forearm, the knee, the cannon, the fetlock, the hoof. */
function horseLeg(b: Builder, x: number, y: number, z: number, a: number, k: number): void {
  b.push(); b.translate(x, y, z); b.pitch(-a);
  limb(b, 0, 0, 0, -0.32, 0.075, 0.05, HIDE, 6, { tex: hide });
  b.translate(0, -0.32, 0); b.pitch(k); b.ball(0, 0, 0, 0.05, HIDE, 5);
  limb(b, 0, 0, 0, -0.3, 0.04, 0.035, HIDE, 6);
  b.translate(0, -0.3, 0); b.pitch(-k * 0.6);
  b.cbox(-0.05, -0.08, -0.06, 0.05, 0.0, 0.05, 0.015, HOOF);
  limb(b, 0, 0.0, -0.0, 0.06, 0.05, 0.045, HORN, 6);   // the feathering's band of bronze
  b.pop();
}

/** The shield on the left forearm, its face to the front: a round of iron, a rim, and in it a skull screaming, the fire in its mouth. */
function shield(b: Builder, fire: number): void {
  b.push(); b.translate(-0.08, -0.16, -0.05); b.pitch(Math.PI / 2);
  const n = 12, R = 0.3, ring = (r: number): Array<[number, number]> => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r * 1.1] as [number, number]);
  b.prz(ring(R), -0.05, 0.03, SHIELD, { r1: 0.92, tex: plate });
  b.prz(ring(R * 0.88), -0.06, -0.05, BRONZE, { tex: plate });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.ball(Math.cos(a) * R * 0.94, Math.sin(a) * R * 1.03, -0.06, 0.02, HORN, 4); }   // studs round it
  // the skull
  b.prz([[-0.13, 0.0], [-0.11, 0.12], [-0.05, 0.18], [0.05, 0.18], [0.11, 0.12], [0.13, 0.0], [0.08, -0.08], [-0.08, -0.08]], -0.1, -0.06, HORN, { tex: crackTex });
  for (const x of [-0.055, 0.055]) { b.box(x - 0.035, 0.03, -0.106, x + 0.035, 0.09, -0.098, E.CAVITY); b.box(x - 0.018, 0.045, -0.11, x + 0.018, 0.075, -0.104, GLARE); }
  const g = 0.06 + fire * 0.08;
  b.prz([[-0.07, -0.04], [0.07, -0.04], [0.06, -0.04 - g], [-0.06, -0.04 - g]], -0.106, -0.098, E.CAVITY);   // the mouth, screaming
  for (let i = 0; i < 5; i++) b.box(-0.06 + i * 0.027, -0.05, -0.11, -0.045 + i * 0.027, -0.03, -0.104, HORN);
  if (fire > 0) { b.prz([[-0.05, -0.05], [0.05, -0.05], [0.0, -0.05 - g * 0.9]], -0.115, -0.105, FIRE); b.ball(0, -0.06 - g * 0.4, -0.12, 0.03 + fire * 0.07, FIRE, 6); }
  b.prz([[-0.08, -0.08], [0.08, -0.08], [0.06, -0.04 - g - 0.04], [-0.06, -0.04 - g - 0.04]], -0.1, -0.07, HORN);   // its jaw, dropped
  for (const s of [-1, 1]) b.prz([[s * 0.11, 0.12], [s * 0.2, 0.26], [s * 0.15, 0.1]], -0.09, -0.06, HORN);   // its horns
  b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.065, -0.12, -0.055, 0.065, 0.0, 0.055, 0.02, BRONZE, { tex: plate });
  b.cbox(-0.06, -0.16, -0.05, 0.06, -0.1, 0.045, 0.015, HELM);
  if (s > 0) for (let i = -1; i <= 1; i++) limb(b, i * 0.04, -0.06, -0.08, -0.05, 0.015, 0.003, HORN, 4);   // spikes on the knuckles
}

const joints: Joint[] = humanJoints(SLAUGHTAUR_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => c.b.cbox(-0.22, -0.06, -0.14, 0.22, 0.08, 0.13, 0.03, BRONZE, { tex: plate })),   // the man's hips, where he grows out of it
  // the horse: its chest at the man's hips, its barrel back from there, the hind legs and the tail; it goes with the "legs"
  part("pelvis", "legs", (c) => {
    const b = c.b, st = c.x("stride");
    b.cbox(-0.24, -0.3, -0.18, 0.24, 0.08, 0.2, 0.1, HIDE, { tex: hide });                        // the horse's chest
    b.cbox(-0.25, -0.3, 0.1, 0.25, 0.05, 0.95, 0.12, HIDE, { tex: hide });                        // its barrel
    b.cbox(-0.27, -0.24, 0.1, 0.27, 0.06, 0.8, 0.05, BRONZE, { tex: plate });                     // barding over it
    for (let i = 0; i < 4; i++) b.box(-0.275, -0.25, 0.16 + i * 0.16, 0.275, -0.22, 0.2 + i * 0.16, HORN);
    for (const sx of [-1, 1]) {   // the war-cloth down its flanks
      b.push(); b.translate(sx * 0.285, 0, 0.2); b.yaw(-sx * Math.PI / 2);
      b.prz([[0.0, 0.07], [0.0, -0.36], [0.3, -0.42], [0.6, -0.3], [0.6, 0.07]], -0.01, 0.01, CLOTH);
      b.pop();
    }
    b.cbox(-0.25, -0.32, -0.2, 0.25, -0.05, -0.12, 0.04, BRONZE, { tex: plate });                 // the peytral over its chest
    for (const s of [-1, 1]) horseLeg(b, s * 0.16, -0.24, 0.85, -st * 0.4 * s, 0.2 + 0.3 * Math.max(0, st * s));
    b.push(); b.translate(0, -0.02, 0.95); b.pitch(-0.9 - 0.15 * st); limb(b, 0, 0, 0, -0.5, 0.06, 0.02, HOOF, 5); b.pop();   // the tail
  }),
  part("spine", "body", (c) => {
    c.b.cbox(-0.21, 0, -0.13, 0.21, 0.3, 0.12, 0.04, BRONZE, { tex: plate });
    for (let i = 0; i < 3; i++) c.b.cbox(-0.22, 0.02 + i * 0.09, -0.145, 0.22, 0.08 + i * 0.09, -0.12, 0.01, i % 2 ? HELM : BRONZE, { tex: plate });
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.3, 0, -0.15, 0.3, 0.36, 0.14, 0.06, BRONZE, { tex: plate });
    b.prz([[-0.26, 0.02], [0.26, 0.02], [0.29, 0.3], [0.0, 0.36], [-0.29, 0.3]], -0.17, -0.12, BRONZE, { r1: 0.94, tex: plate });
    b.box(-0.015, 0.04, -0.175, 0.015, 0.34, -0.165, HORN);                                       // the ridge down its breastplate
    b.cbox(-0.2, 0.33, -0.13, 0.2, 0.42, 0.12, 0.03, HELM);
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.02, 0.1, 0.09, 0.085, HELM, 7)),
  part("shoulderL", "body", (c) => pauldron(c.b, -1)),
  part("shoulderR", "body", (c) => pauldron(c.b, 1)),
  // ---- the head: a horned helm, the red in its slit ----
  part("head", "head", (c) => {
    const b = c.b;
    b.cbox(-0.14, -0.02, -0.14, 0.14, 0.28, 0.15, 0.06, HELM, { tex: plate });
    b.prz([[-0.15, 0.2], [0.15, 0.2], [0.12, 0.3], [0, 0.34], [-0.12, 0.3]], -0.155, 0.12, HELM, { tex: plate });
    b.box(-0.11, 0.13, -0.16, 0.11, 0.17, -0.135, E.CAVITY);
    b.box(-0.09, 0.14, -0.166, -0.03, 0.162, -0.15, GLARE); b.box(0.03, 0.14, -0.166, 0.09, 0.162, -0.15, GLARE);
    b.box(-0.02, -0.02, -0.165, 0.02, 0.13, -0.14, HELM);                                          // the nasal
    for (const s of [-1, 1]) {   // ram's horns off the helm
      b.push(); b.translate(s * 0.13, 0.22, 0.02); b.roll(s * 0.7);
      limb(b, 0, 0, 0, 0.16, 0.055, 0.045, HORN, 6); b.translate(0, 0.16, 0); b.roll(s * 1.0); b.pitch(0.3);
      limb(b, 0, 0, 0, 0.15, 0.045, 0.032, HORN, 6); b.translate(0, 0.15, 0); b.roll(s * 1.1);
      limb(b, 0, 0, 0, 0.12, 0.032, 0.016, HORN, 5); b.translate(0, 0.12, 0); b.roll(s * 0.9);
      limb(b, 0, 0, 0, 0.07, 0.016, 0.003, HORN, 4);
      b.pop();
    }
  }),
  part("elbowL", "lArm", (c) => shield(c.b, c.x("fire"))),
  ...armParts(SLAUGHTAUR_BODY, "lArm", armSpec()),
  ...armParts(SLAUGHTAUR_BODY, "rArm", armSpec()),
  // the horse's forelegs are the rig's legs
  ...(["L", "R"] as const).flatMap((s) => legParts(SLAUGHTAUR_BODY, s, {
    joint: 0.055,
    upper: { r0: 0.08, r1: 0.05, mat: HIDE, tex: hide, deco: (c, len) => c.b.cbox(-0.085, -len * 0.4, -0.1, 0.085, 0.02, 0.08, 0.02, BRONZE, { tex: plate }) },
    lower: { r0: 0.045, r1: 0.035, mat: HIDE, tex: hide, deco: (c, len) => limb(c.b, 0, 0, -len * 0.85, -len * 0.98, 0.05, 0.045, HORN, 6) },
    foot: (c) => c.b.cbox(-0.055, -0.07, -0.08, 0.055, 0.01, 0.05, 0.015, HOOF),
  })),
];

function pauldron(b: Builder, s: -1 | 1): void {
  b.ball(0, 0.02, 0, 0.14, BRONZE, 8, { tex: plate });
  b.cbox(-0.16, -0.04, -0.14, 0.16, 0.0, 0.13, 0.02, HORN);
  b.prz([[-0.03, 0.12], [0.03, 0.12], [s * 0.02, 0.24]], -0.03, 0.03, HORN);   // a spike off it
}

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.075,
    upper: { r0: 0.085, r1: 0.07, mat: HELM, tex: hide, deco: (c, len) => c.b.cbox(-0.09, -len * 0.85, -0.09, 0.09, -len * 0.2, 0.09, 0.02, BRONZE, { tex: plate }) },
    fore: { r0: 0.07, r1: 0.06, mat: HELM, deco: (c, len) => c.b.cbox(-0.08, -len * 0.95, -0.08, 0.08, -len * 0.3, 0.08, 0.02, BRONZE, { tex: plate }) },
    hand,
  };
}

const O = { neck: 0.09, arm: 0.09, leg: 0.08, neckTop: 0.16, armLen: 0.18, legLen: 0.16 };

export const SLAUGHTAUR: Rig = {
  key: "k",
  palette: SLAUGHTAUR_PALETTE,
  frame: { w: 77, h: 100, worldH: 2.35, floor: 0.975, yaw: 0.55, pitch: 0.05, shift: -0.12 },
  crawlH: 8 / 12,
  joints, parts, stumps: humanStumps(O),
  poses: SLAUGHTAUR_POSES,
  walkStep: 0.11,
  regions: { W: 12, H: 12, head: 5, armTop: 5, armBot: 9, shoulder: 5.5 },
  partSpecs: ((p) => ({ ...p, legs: { ...p.legs, pose: SLAUGHTAUR_LEGS_POSE } }))(humanPartSpecs(SLAUGHTAUR_BODY, O)),
};

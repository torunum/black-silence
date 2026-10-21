import type { Builder } from "../../render/viewmodel/builder";
import { E } from "./palette";
import { crackTex, limb, scaled } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { BONE2, GOLD, GEM, MAGIC, MANTLE, ROBE, EYE2, SOVEREIGN_PALETTE, crown, skull } from "./sovereign";
import { SOVEREIGN2_BODY, SOVEREIGN2_POSES } from "./sovereign2Poses";

/**
 * THE BONE SOVEREIGN RISEN (`Z2`): the ossuary giant, in his last phase.
 *
 * The legacy sprite is a mass of bone (`b`) twice the king's width under a bigger crown (`Y`, `M`), red eyes (`E`), the red of
 * the mantle (`R`) at its shoulders and a black hollow (`W`) in its chest. The rig is every dead king of the place come together in
 * one body: a ribcage like a cathedral's ribs with the dark inside it and skulls set in it, the skulls of the others heaped on its
 * shoulders with the red in their sockets too, arms that are bundles of long bones, the king's own skull on top grown huge, the
 * crown on it grown with it; the mantle hangs off it in rags.
 */

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });

/** A skull set into the mass at (x, y, z), `k` its size, looking out. */
function setSkull(b: Builder, x: number, y: number, z: number, k: number, roll = 0): void {
  b.push(); b.translate(x, y, z); b.roll(roll); skull(scaled(b, k), EYE2); b.pop();
}

/** A bundle of long bones along a limb, `len` long, from y=0 down. */
function bundle(b: Builder, len: number, r: number): void {
  for (const [x, z] of [[-r * 0.5, -r * 0.3], [r * 0.5, -r * 0.3], [0, r * 0.5]] as const) {
    limb(b, x, z, 0.02, -len - 0.02, r * 0.55, r * 0.5, BONE2, 5, { tex: crackTex });
    b.ball(x, -len * 0.02, z, r * 0.65, BONE2, 5); b.ball(x, -len, z, r * 0.6, BONE2, 5);   // the knuckles of the bones' ends
  }
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b, cast = c.x("cast");
  b.cbox(-0.07, -0.1, -0.04, 0.07, 0.0, 0.04, 0.015, BONE2, { tex: crackTex });
  for (let i = -1; i <= 2; i++) { b.push(); b.translate(i * 0.035 - 0.017, -0.095, 0); b.pitch(-0.5); limb(b, 0, 0, 0, -0.15, 0.016, 0.01, BONE2, 4); b.translate(0, -0.15, 0); b.pitch(-0.7); limb(b, 0, 0, 0, -0.08, 0.01, 0.002, BONE2, 4); b.pop(); }
  b.box(s * 0.07, -0.08, -0.03, s * 0.1, -0.02, 0.03, BONE2);
  if (cast > 0) b.ball(0, -0.24, -0.05, 0.05 + cast * 0.1, MAGIC, 6);
}

const joints: Joint[] = humanJoints(SOVEREIGN2_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => { c.b.cbox(-0.28, -0.1, -0.16, 0.28, 0.08, 0.16, 0.05, BONE2, { tex: crackTex }); c.b.cbox(-0.3, -0.04, -0.18, 0.3, 0.03, 0.18, 0.01, GOLD); }),
  part("pelvis", "legs", (c) => {   // the rags of the robe
    const b = c.b, sw = c.x("sway");
    for (let i = 0; i < 5; i++) { b.push(); b.translate(-0.24 + i * 0.12, -0.03, -0.18); b.pitch(sw * 0.1 * (i % 2 ? 1 : -1));
      b.prz([[-0.06, 0], [0.06, 0], [0.07, -0.4], [0.0, -0.56 - (i % 2) * 0.1], [-0.07, -0.42]], -0.02, 0.02, ROBE); b.pop(); }
  }),
  part("spine", "body", (c) => {
    const b = c.b;
    b.cbox(-0.3, 0, -0.1, 0.3, 0.32, 0.18, 0.06, BONE2, { tex: crackTex });                // the bone of it
    for (let i = 0; i < 4; i++) b.cbox(-0.06, 0.02 + i * 0.08, 0.12, 0.06, 0.06 + i * 0.08, 0.2, 0.015, BONE2);   // the spine, a column of them
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) { b.push(); b.translate(s * 0.02, 0.04 + k * 0.075, -0.12); b.yaw(s * (Math.PI / 2 - 0.25)); b.cyl(0, 0, 0, 0.3, 0.025, 0.02, 5, BONE2, { tex: crackTex }); b.pop(); }
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.4, 0, -0.08, 0.4, 0.42, 0.2, 0.08, BONE2, { tex: crackTex });                      // the mass of bone it is
    b.cbox(-0.26, 0.04, -0.12, 0.26, 0.38, 0.0, 0.05, E.CAVITY);                                 // and the hollow in it
    for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { b.push(); b.translate(s * 0.03, 0.03 + k * 0.065, -0.16); b.yaw(s * (Math.PI / 2 - 0.3)); b.cyl(0, 0, 0, 0.4 - k * 0.012, 0.036, 0.028, 5, BONE2, { tex: crackTex }); b.pop(); }   // ribs like a vault's
    limb(b, 0, -0.17, 0.02, 0.42, 0.035, 0.03, BONE2, 5, { tex: crackTex });
    setSkull(b, -0.15, 0.12, -0.16, 0.7, 0.2); setSkull(b, 0.17, 0.2, -0.15, 0.6, -0.15);   // the dead looking out of it
    // the skulls of the others heaped on its shoulders, and the mantle in rags off them
    for (const s of [-1, 1]) { setSkull(b, s * 0.36, 0.38, -0.04, 0.8, -s * 0.3); setSkull(b, s * 0.48, 0.32, 0.06, 0.65, -s * 0.6); }
    for (let i = 0; i < 6; i++) { b.push(); b.translate(-0.45 + i * 0.18, 0.44, 0.18); b.prz([[-0.1, 0], [0.1, 0], [0.12, -0.5], [0.0, -0.75 - (i % 3) * 0.1], [-0.12, -0.5]], -0.02, 0.02, MANTLE); b.pop(); }
  }),
  part("neck", "body", (c) => { for (let i = 0; i < 3; i++) c.b.cbox(-0.05, 0.0 + i * 0.05, -0.05, 0.05, 0.035 + i * 0.05, 0.05, 0.012, BONE2); }),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.14, BONE2, 7, { tex: crackTex })),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.14, BONE2, 7, { tex: crackTex })),
  part("head", "head", (c) => { const b = scaled(c.b, 1.55); skull(b, EYE2); crown(b, 0.17, 0.13, 0.18, 9); b.ball(0, 0.27, -0.135, 0.03, GEM, 5); }),
  part("jaw", "head", (c) => {
    const b = scaled(c.b, 1.55);
    b.cbox(-0.08, -0.07, -0.12, 0.08, -0.01, 0.03, 0.015, BONE2);
    for (let i = 0; i < 6; i++) b.box(-0.055 + i * 0.019, -0.02, -0.126, -0.043 + i * 0.019, 0.005, -0.114, BONE2);
  }),
  ...armParts(SOVEREIGN2_BODY, "lArm", armSpec()),
  ...armParts(SOVEREIGN2_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(SOVEREIGN2_BODY, s, {
    joint: 0.08,
    upper: { r0: 0.04, r1: 0.04, mat: BONE2, deco: (c, len) => bundle(c.b, len, 0.1) },
    lower: { r0: 0.04, r1: 0.04, mat: BONE2, deco: (c, len) => bundle(c.b, len, 0.085) },
    foot: (c) => { const b = c.b; b.cbox(-0.08, -0.05, -0.2, 0.08, 0.03, 0.05, 0.02, BONE2, { tex: crackTex }); for (let i = -1; i <= 1; i++) b.cyl(i * 0.05, -0.02, -0.26, -0.19, 0.018, 0.004, 4, BONE2); },
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.08,
    upper: { r0: 0.04, r1: 0.04, mat: BONE2, deco: (c, len) => bundle(c.b, len, 0.1) },
    fore: { r0: 0.04, r1: 0.04, mat: BONE2, deco: (c, len) => { bundle(c.b, len, 0.085); limb(c.b, 0, 0, -len * 0.82, -len * 0.92, 0.09, 0.09, GOLD, 7); } },
    hand,
  };
}

const O = { neck: 0.07, arm: 0.1, leg: 0.11, neckTop: 0.14, armLen: 0.2, legLen: 0.2 };

export const SOVEREIGN2: Rig = {
  key: "Z2",
  palette: SOVEREIGN_PALETTE,
  frame: { w: 77, h: 100, worldH: 2.5, floor: 0.975, yaw: 0.36, pitch: 0.05, shift: 0.0 },
  crawlH: 9 / 13,
  joints, parts, stumps: humanStumps(O),
  poses: SOVEREIGN2_POSES,
  walkStep: 0.15,
  regions: { W: 18, H: 13, head: 4, armTop: 4, armBot: 9, shoulder: 4.5 },
  partSpecs: humanPartSpecs(SOVEREIGN2_BODY, O),
};

import type { Builder } from "../../render/viewmodel/builder";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, crackTex, limb, meatTex, scaled } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { damask } from "./priest";
import { PRIEST2_BODY, PRIEST2_POSES } from "./priest2Poses";

/**
 * THE CORRUPTED PRIEST, UNMADE (`Q2`): what is under the vestments, in his last phase (`Boss.ts` sets `formKey`).
 *
 * The legacy sprite is a hunched red mass (`R`) crowned in red horns with yellow-green eyes (`M`) in it, a ribcage of grey bone
 * (`b`) open in a dark purple body (`r`). The rig keeps it: the chasuble burst at the seams and hanging off him in rags, the
 * chest opened like a door with the ribs standing out of it and the meat inside, the face flayed red and swollen with eyes —
 * five of them, the yellow-green burning in every one — the mitre split and hanging off a crown of horns, a jaw that has come
 * loose, long arms ending in hooks. He walks bent double; he casts with both arms thrown up (`cast`).
 */

const ROBE = FIRST_OWN, GOLD = FIRST_OWN + 1, FLESH = FIRST_OWN + 2, BONE2 = FIRST_OWN + 3, GLOW = FIRST_OWN + 4, MAGIC = FIRST_OWN + 5, HORN = FIRST_OWN + 6;

export const PRIEST2_PALETTE = enemyPalette({
  [ROBE]:  { ramp: ["#100710", "#1c0d1c", "#2c152a", "#3e203c", "#522c4f", "#683a64", "#80507c"], amb: .46, spec: .1 },
  [GOLD]:  { ramp: ["#2a1e08", "#4a3610", "#6e5218", "#927024", "#b48e34", "#d4ae4c", "#f0d070"], amb: .46, spec: .6, rim: true },
  // the legacy R: the flayed red of him
  [FLESH]: { ramp: ["#2a0606", "#480c0a", "#6c1410", "#901e14", "#b42c1c", "#d44428", "#ec6640"], amb: .46, spec: .45, rim: true },
  // the legacy b: the grey bone of his ribs
  [BONE2]: { ramp: ["#2a2824", "#46433c", "#646058", "#827d72", "#a09a8e", "#bfb9ac", "#ddd8cc"], amb: .5, spec: .25, rim: true },
  // the legacy M
  [GLOW]:  { ramp: ["#4a5a04", "#7a900c", "#a8c41c", "#c8dc30", "#e0f048"], emissive: true },
  [MAGIC]: { ramp: ["#3a1060", "#5a1c90", "#7a2cc0", "#9a4ae0", "#c080ff"], emissive: true },
  [HORN]:  { ramp: ["#0a0606", "#160c0a", "#241410", "#341e18", "#4a2a20", "#62382a"], amb: .44, spec: .45, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const raw = blotchTex(0.45, 1.5, -1.5);

/** A rag of the burst chasuble, hung from (x, y) at depth z, `len` long, swinging `sw`. */
function rag(b: Builder, x: number, y: number, z: number, w: number, len: number, sw: number): void {
  b.push(); b.translate(x, y, z); b.pitch(sw * 0.15); b.roll(-x * 0.6);
  b.prz([[-w, 0], [w, 0], [w * 1.1, -len * 0.6], [w * 0.2, -len], [-w * 0.4, -len * 0.8], [-w * 1.1, -len * 0.5]], -0.02, 0.02, ROBE, { tex: damask });
  b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b, cast = c.x("cast");
  b.cbox(-0.05, -0.09, -0.035, 0.05, 0.0, 0.035, 0.012, FLESH, { tex: raw });
  for (let i = -1; i <= 1; i++) {   // three fingers, each a hook
    b.push(); b.translate(i * 0.032, -0.085, 0); b.pitch(-0.4); b.roll(i * -0.2);
    limb(b, 0, 0, 0, -0.12, 0.016, 0.012, FLESH, 4); b.translate(0, -0.12, 0); b.pitch(-0.8); limb(b, 0, 0, 0, -0.1, 0.012, 0.002, BONE2, 4);
    b.pop();
  }
  b.box(s * 0.05, -0.07, -0.025, s * 0.075, -0.02, 0.02, FLESH);
  if (cast > 0) b.ball(0, -0.2, -0.05, 0.04 + cast * 0.08, MAGIC, 6);
}

const joints: Joint[] = humanJoints(PRIEST2_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => c.b.cbox(-0.24, -0.1, -0.14, 0.24, 0.08, 0.14, 0.05, FLESH, { tex: raw })),
  part("pelvis", "legs", (c) => {   // the skirt of the chasuble in rags over the legs
    const b = c.b, sw = c.x("swing");
    for (let i = 0; i < 6; i++) rag(b, -0.25 + i * 0.1, -0.02, -0.15 + (i % 2) * 0.02, 0.06, 0.5 + 0.2 * Math.abs(Math.sin(i * 2.1)), sw * (i % 2 ? 1 : -1));
    b.box(-0.3, -0.08, -0.17, 0.3, -0.03, 0.16, GOLD);   // what is left of its gold hem, round the waist
  }),
  part("spine", "body", (c) => {
    const b = c.b;
    b.cbox(-0.24, 0, -0.14, 0.24, 0.3, 0.14, 0.06, FLESH, { tex: raw });
    for (let i = 0; i < 4; i++) b.prz([[-0.03, 0.04 + i * 0.07], [0.03, 0.04 + i * 0.07], [0, 0.1 + i * 0.07]], 0.13, 0.2, BONE2);   // the spine through the back
  }),
  part("chest", "body", (c) => {
    const b = c.b, sw = c.x("swing");
    b.cbox(-0.34, 0, -0.12, 0.34, 0.38, 0.16, 0.08, FLESH, { tex: raw });
    b.prz([[-0.12, 0.02], [0.12, 0.02], [0.2, 0.14], [0.2, 0.3], [0.1, 0.36], [-0.1, 0.36], [-0.2, 0.3], [-0.2, 0.14]], -0.13, -0.08, E.CAVITY);   // the chest, opened
    b.ball(0, 0.17, -0.1, 0.1, E.MEAT, 7, { tex: meatTex }); b.ball(0.05, 0.24, -0.125, 0.055, E.ORGAN, 6);   // what beats in it
    for (let k = 0; k < 5; k++) for (const s of [-1, 1]) {   // the ribs across it, sprung open in the middle like the fingers of two hands
      const y = 0.07 + k * 0.062;
      b.push(); b.translate(s * 0.2, y, -0.135); b.roll(s * (0.25 + k * 0.04));
      b.cbox(s > 0 ? -0.15 : 0.0, -0.014, -0.016, s > 0 ? 0.0 : 0.15, 0.014, 0.01, 0.006, BONE2, { tex: crackTex });
      b.pop();
    }
    b.box(-0.02, 0.03, -0.14, 0.02, 0.34, -0.128, BONE2);   // the breastbone, split down it
    // the chasuble, burst, hanging off the shoulders in rags
    for (let i = 0; i < 5; i++) rag(b, -0.36 + i * 0.18, 0.36, 0.14, 0.09, 0.42 + 0.12 * Math.sin(i * 1.7), sw);
    for (const s of [-1, 1]) for (let j = 0; j < 2; j++) rag(b, s * (0.27 + j * 0.08), 0.36, -0.14, 0.05, 0.5 - j * 0.12, -sw);   // its front, hanging either side of the opened chest
    for (const s of [-1, 1]) b.prz([[s * 0.24, 0.38], [s * 0.3, 0.38], [s * 0.3, 0.1], [s * 0.26, 0.04]], -0.135, -0.12, GOLD);   // the orphrey, torn
  }),
  part("neck", "body", (c) => limb(c.b, 0, -0.02, -0.03, 0.12, 0.1, 0.09, FLESH, 7, { tex: raw })),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.13, FLESH, 7, { tex: raw })),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.13, FLESH, 7, { tex: raw })),
  // ---- the head: flayed, swollen with eyes, a crown of horns and the mitre split on it ----
  part("head", "head", (c) => {
    const b = scaled(c.b, 1.25);
    b.cbox(-0.15, -0.04, -0.14, 0.15, 0.24, 0.14, 0.07, FLESH, { tex: raw });
    b.ball(-0.08, 0.2, -0.06, 0.09, FLESH, 6, { tex: raw }); b.ball(0.1, 0.18, -0.04, 0.08, FLESH, 6, { tex: raw });   // swellings
    for (const [x, y, r] of [[-0.06, 0.1, 0.034], [0.06, 0.1, 0.034], [0.0, 0.17, 0.028], [-0.11, 0.17, 0.022], [0.12, 0.05, 0.022]] as const) {
      b.ball(x, y, -0.135, r + 0.012, E.CAVITY, 5); b.ball(x, y, -0.16, r * 0.75, GLOW, 5);
    }
    for (let i = 0; i < 7; i++) {   // the crown of horns
      const a = -1.1 + (i / 6) * 2.2;
      b.push(); b.translate(Math.sin(a) * 0.13, 0.2, 0.02); b.roll(a * 0.7); b.pitch(-0.25);
      const l = 0.2 + (i % 2) * 0.1;
      limb(b, 0, 0, 0, l * 0.7, 0.035, 0.02, HORN, 5); limb(b, 0, 0, l * 0.7, l, 0.02, 0.003, BONE2, 4);
      b.pop();
    }
    b.push(); b.translate(0.08, 0.24, 0.02); b.roll(-0.7);   // half the mitre, split, hanging off it
    b.prz([[-0.08, 0.0], [0.06, 0.0], [0.05, 0.22], [0.0, 0.3], [-0.06, 0.2]], -0.05, 0.05, GOLD);
    b.pop();
  }),
  part("jaw", "head", (c) => {   // a jaw that has come loose, long, its teeth fangs
    const b = scaled(c.b, 1.25);
    b.cbox(-0.12, -0.16, -0.15, 0.12, -0.04, 0.06, 0.03, FLESH, { tex: raw });
    for (let i = 0; i < 6; i++) b.prz([[-0.09 + i * 0.036 - 0.012, -0.05], [-0.09 + i * 0.036 + 0.012, -0.05], [-0.09 + i * 0.036, 0.01]], -0.16, -0.14, E.TOOTH);
    b.box(-0.07, -0.15, -0.155, 0.07, -0.08, -0.12, E.CAVITY);
  }),
  ...armParts(PRIEST2_BODY, "lArm", armSpec()),
  ...armParts(PRIEST2_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(PRIEST2_BODY, s, {
    joint: 0.09,
    upper: { r0: 0.11, r1: 0.085, mat: FLESH, tex: raw },
    lower: { r0: 0.085, r1: 0.06, mat: FLESH, tex: raw },
    foot: (c) => { c.b.cbox(-0.07, -0.045, -0.16, 0.07, 0.04, 0.05, 0.02, FLESH); for (let i = -1; i <= 1; i++) c.b.cyl(i * 0.04, -0.025, -0.21, -0.15, 0.016, 0.004, 4, BONE2); },
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.08,
    upper: { r0: 0.1, r1: 0.08, mat: FLESH, tex: raw, deco: (c, len) => { const b = c.b; b.push(); b.translate(0, -len * 0.1, 0.06); b.prz([[-0.08, 0], [0.08, 0], [0.1, -len * 0.7], [0.0, -len * 0.9], [-0.1, -len * 0.6]], -0.015, 0.015, ROBE, { tex: damask }); b.pop(); } },   // a sleeve's rag
    fore: { r0: 0.08, r1: 0.065, mat: FLESH, tex: raw, deco: (c, len) => limb(c.b, 0, -0.06, -len * 0.1, -len * 0.9, 0.014, 0.01, BONE2, 4) },
    hand,
  };
}

const O = { neck: 0.1, arm: 0.1, leg: 0.11, neckTop: 0.16, armLen: 0.2, legLen: 0.2 };

export const PRIEST2: Rig = {
  key: "Q2",
  palette: PRIEST2_PALETTE,
  frame: { w: 77, h: 100, worldH: 2.32, floor: 0.975, yaw: 0.36, pitch: 0.05, shift: 0.0 },
  crawlH: 9 / 13,
  joints, parts, stumps: humanStumps(O),
  poses: PRIEST2_POSES,
  walkStep: 0.13,
  regions: { W: 18, H: 13, head: 4, armTop: 4, armBot: 9, shoulder: 4.5 },
  partSpecs: humanPartSpecs(PRIEST2_BODY, O),
};

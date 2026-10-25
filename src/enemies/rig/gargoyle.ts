import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { crackTex, limb } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { GARGOYLE_BODY, GARGOYLE_POSES } from "./gargoylePoses";

/**
 * THE STONE GARGOYLE (`y`, Blood's): it served Cheogh, and Cheogh is dead. It flies (`fly`).
 *
 * The legacy sprite is a squat block of blue-grey stone (`s`, `S`) with two blue eyes (`0`) and wings cut in its silhouette.
 * The rig is the thing off a cathedral gutter: a crouched, hunched demon of grey stone, horns swept back, a muzzle of fangs and
 * the blue looking out of it, cracks across its chest with the same blue in them, a pair of great bat wings off its back that
 * beat as it flies (`flap`), clawed hands, its legs drawn up under it and a tail hanging. It spits Cheogh's blue fire (`garg`):
 * the attack throws its arms wide, wings spread, jaws open, and the light comes up in its mouth (`glow`).
 */

const STONE = FIRST_OWN, DARK = FIRST_OWN + 1, WING = FIRST_OWN + 2, GLOW = FIRST_OWN + 3, LICHEN = FIRST_OWN + 4;

export const GARGOYLE_PALETTE = enemyPalette({
  // the legacy s / S: a blue-grey slate
  [STONE]:  { ramp: ["#1a1e23", "#2a3138", "#3c454e", "#515b65", "#67727d", "#7f8a95", "#9ba6b0"], amb: .46, spec: .16, rim: true },
  [DARK]:   { ramp: ["#0b0d10", "#15181c", "#20252a", "#2c3238", "#3a4148"], amb: .42, spec: .12 },
  // the membranes of the wings, thinner, darker
  [WING]:   { ramp: ["#171b20", "#252b32", "#353d46", "#47515b", "#5a6571", "#6f7b88"], amb: .44, spec: .1, rim: true },
  // the legacy 0
  [GLOW]:   { ramp: ["#0a2a50", "#1050a0", "#1a74d0", "#2a96f0", "#4ab4ff", "#7ac8ff"], emissive: true },
  [LICHEN]: { ramp: ["#1c2010", "#2c3318", "#3e4822", "#525e2e"], amb: .4 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const weather: TexFn = (x, y, z) => { const c = crackTex(x * 0.8, y * 0.8, z * 0.8); if (c) return c; const v = Math.sin(x * 97 + y * 61) * Math.sin(z * 83 + y * 37); return v > 0.9 ? -0.8 : 0; };

/** A bat's wing off the back at side `s`, spread as `spread` (0 folded .. 1 wide) and raised by `lift`: four long finger bones, the membrane between. */
function wing(b: Builder, s: -1 | 1, spread: number, lift: number): void {
  b.push(); b.translate(s * 0.14, 0.26, 0.12); b.yaw(s * (0.35 - spread * 0.25)); b.roll(s * (-0.45 - lift * 0.9 + spread * 0.2));
  const L = 0.42 + spread * 0.32;
  const tip = (a: number, len: number): [number, number] => [s * Math.cos(a) * len, Math.sin(a) * len];
  const P0: [number, number] = [0, 0], A = tip(0.95, L), B = tip(0.35, L * 1.25), C = tip(-0.25, L * 1.05), D = tip(-0.75, L * 0.7);
  b.prz([P0, A, [A[0] * 0.75 + B[0] * 0.25, (A[1] + B[1]) / 2 - 0.08], B], -0.012, 0.012, WING, { tex: weather });
  b.prz([P0, B, [B[0] * 0.6 + C[0] * 0.4, (B[1] + C[1]) / 2 - 0.08], C], -0.012, 0.012, WING, { tex: weather });
  b.prz([P0, C, [C[0] * 0.6 + D[0] * 0.4, (C[1] + D[1]) / 2 - 0.06], D, [s * 0.04, -0.2]], -0.012, 0.012, WING);
  for (const T of [A, B, C, D]) {   // the finger bones over the membrane
    b.push(); b.roll(Math.atan2(T[0], T[1])); limb(b, 0, -0.02, 0, Math.hypot(T[0], T[1]), 0.03, 0.012, STONE, 5, { tex: weather }); b.pop();
  }
  b.ball(A[0], A[1], -0.02, 0.03, DARK, 4);   // the thumb claw at the top of it
  b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b, claw = c.x("claw");
  b.cbox(-0.05, -0.08, -0.04, 0.05, 0.0, 0.04, 0.015, STONE, { tex: weather });
  for (let i = -1; i <= 1; i++) {
    b.push(); b.translate(i * 0.032, -0.075, 0); b.pitch(-0.3 - claw * 0.6); b.roll(i * -0.15);
    limb(b, 0, 0, 0, -0.09, 0.016, 0.012, STONE, 4); b.translate(0, -0.09, 0); b.pitch(-0.5 - claw * 0.4); limb(b, 0, 0, 0, -0.08, 0.012, 0.002, DARK, 4);
    b.pop();
  }
  b.box(s * 0.05, -0.06, -0.03, s * 0.075, -0.0, 0.02, STONE);
}

const joints: Joint[] = humanJoints(GARGOYLE_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    const b = c.b;
    b.cbox(-0.17, -0.09, -0.11, 0.17, 0.08, 0.12, 0.04, STONE, { tex: weather });
    // the tail, down and curling forward
    b.push(); b.translate(0, -0.04, 0.12); b.pitch(-0.4 - c.x("flap") * 0.15);
    limb(b, 0, 0, 0, -0.3, 0.05, 0.035, STONE, 5, { tex: weather }); b.translate(0, -0.3, 0); b.pitch(-0.8);
    limb(b, 0, 0, 0, -0.25, 0.035, 0.018, STONE, 5); b.translate(0, -0.25, 0);
    b.prz([[-0.06, 0], [0.06, 0], [0, -0.12]], -0.012, 0.012, DARK);   // its barb
    b.pop();
  }),
  part("pelvis", "legs", (c) => c.b.cbox(-0.15, -0.12, -0.1, 0.15, -0.02, 0.1, 0.03, DARK)),
  part("spine", "body", (c) => {
    c.b.cbox(-0.19, 0, -0.12, 0.19, 0.28, 0.13, 0.05, STONE, { tex: weather });
    for (let i = 0; i < 3; i++) c.b.box(-0.13, 0.04 + i * 0.075, -0.126, 0.13, 0.065 + i * 0.075, -0.118, DARK);   // the belly's plates
    for (let i = 0; i < 4; i++) c.b.prz([[-0.03, 0.02 + i * 0.07], [0.03, 0.02 + i * 0.07], [0, 0.08 + i * 0.07]], 0.12, 0.17, STONE);   // ridges down its back
  }),
  part("chest", "body", (c) => {
    const b = c.b, sp = c.x("spread"), lf = c.x("flap");
    wing(b, -1, sp, lf); wing(b, 1, sp, lf);
    b.cbox(-0.27, 0, -0.14, 0.27, 0.32, 0.15, 0.07, STONE, { tex: weather });
    b.ball(-0.13, 0.2, -0.12, 0.11, STONE, 6, { tex: weather }); b.ball(0.13, 0.2, -0.12, 0.11, STONE, 6, { tex: weather });
    b.ball(-0.2, 0.28, -0.05, 0.03, LICHEN, 4); b.ball(0.18, 0.06, -0.13, 0.025, LICHEN, 4);
    // the stone is cracked across the chest, and what is in it shows: Cheogh's blue
    for (const [x, y, a, l] of [[-0.06, 0.16, 0.5, 0.2], [0.08, 0.12, -0.7, 0.18], [0.0, 0.05, 0.1, 0.12], [-0.14, 0.08, 1.1, 0.1]] as const) {
      b.push(); b.translate(x, y, -0.215); b.roll(a); b.box(-0.012, -l / 2, -0.006, 0.012, l / 2, 0.006, GLOW); b.pop();
    }
  }),
  part("neck", "body", (c) => limb(c.b, 0, -0.02, -0.03, 0.08, 0.09, 0.08, STONE, 6, { tex: weather })),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.1, STONE, 6, { tex: weather })),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.1, STONE, 6, { tex: weather })),
  // ---- the head: a demon's off a gutter, horns swept back, a muzzle, the blue in its eyes ----
  part("head", "head", (c) => {
    const b = c.b, g = c.x("glow");
    b.cbox(-0.12, -0.02, -0.11, 0.12, 0.2, 0.12, 0.05, STONE, { tex: weather });
    b.cbox(-0.13, 0.12, -0.14, 0.13, 0.18, -0.07, 0.025, DARK);                               // the brow
    for (const x of [-0.055, 0.055]) { b.box(x - 0.04, 0.08, -0.14, x + 0.04, 0.13, -0.11, E.CAVITY); b.box(x - 0.034, 0.086, -0.148, x + 0.034, 0.124, -0.13, GLOW); }
    for (const s of [-1, 1]) {   // horns, swept back and up
      b.push(); b.translate(s * 0.09, 0.18, 0.0); b.roll(-s * 0.5); b.pitch(-0.9);
      limb(b, 0, 0, 0, 0.16, 0.035, 0.022, DARK, 5); b.translate(0, 0.16, 0); b.pitch(-0.6); limb(b, 0, 0, 0, 0.12, 0.022, 0.003, DARK, 5);
      b.pop();
      b.prz([[s * 0.12, 0.16], [s * 0.2, 0.22], [s * 0.13, 0.08]], -0.02, 0.04, STONE);      // pointed ears
    }
    b.cbox(-0.08, 0.0, -0.2, 0.08, 0.09, -0.08, 0.025, STONE, { tex: weather });               // the muzzle
    b.box(-0.03, 0.06, -0.205, 0.03, 0.09, -0.19, DARK);                                       // the nostrils
    if (g > 0) b.ball(0, 0.0, -0.2, 0.03 + g * 0.05, GLOW, 5);                                // Cheogh's fire, in its mouth
  }),
  part("jaw", "head", (c) => {
    const b = c.b;
    b.cbox(-0.075, -0.06, -0.19, 0.075, 0.0, -0.06, 0.02, STONE, { tex: weather });
    for (const s of [-1, 1]) b.prz([[s * 0.05 - 0.012, 0.0], [s * 0.05 + 0.012, 0.0], [s * 0.05, 0.05]], -0.2, -0.18, E.TOOTH);   // fangs up out of it
    for (let i = 0; i < 4; i++) b.box(-0.045 + i * 0.025, -0.01, -0.196, -0.035 + i * 0.025, 0.015, -0.184, E.TOOTH);
  }),
  ...armParts(GARGOYLE_BODY, "lArm", armSpec()),
  ...armParts(GARGOYLE_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(GARGOYLE_BODY, s, {
    joint: 0.08,
    upper: { r0: 0.1, r1: 0.075, mat: STONE, tex: weather },
    lower: { r0: 0.07, r1: 0.05, mat: STONE, tex: weather },
    foot: (c) => { const b = c.b; b.cbox(-0.05, -0.04, -0.12, 0.05, 0.03, 0.03, 0.015, STONE); for (let i = -1; i <= 1; i++) { b.push(); b.translate(i * 0.03, -0.02, -0.12); b.pitch(0.6); limb(b, 0, 0, 0, -0.08, 0.014, 0.002, DARK, 4); b.pop(); } },
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.065,
    upper: { r0: 0.08, r1: 0.065, mat: STONE, tex: weather },
    fore: { r0: 0.065, r1: 0.05, mat: STONE, tex: weather },
    hand,
  };
}

const O = { neck: 0.08, arm: 0.08, leg: 0.09, neckTop: 0.14, armLen: 0.16, legLen: 0.16 };

export const GARGOYLE: Rig = {
  key: "y",
  palette: GARGOYLE_PALETTE,
  frame: { w: 87, h: 100, worldH: 1.9, floor: 0.975, yaw: 0.35, pitch: 0.08, shift: 0.0 },
  crawlH: 7 / 11,
  joints, parts, stumps: humanStumps(O),
  poses: GARGOYLE_POSES,
  walkStep: 0.1,
  regions: { W: 10, H: 11, head: 0, armTop: 0, armBot: 5, shoulder: 3 },
  partSpecs: humanPartSpecs(GARGOYLE_BODY, O),
};

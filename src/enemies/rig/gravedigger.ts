import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, crackTex, limb, rodX } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { DIGGER_BODY, DIGGER_POSES } from "./gravediggerPoses";

/**
 * THE GRAVEDIGGER (`N`, a boss): he buries everyone eventually.
 *
 * The legacy sprite is a dark hood (`h`) with green eyes (`R`) over a long shroud-grey coat (`g`), and a shovel (`S`, `s`) the
 * height of him. The rig is the sexton of the place: tall, stooped, in a long greatcoat caked to the knees with grave-dirt, a hood
 * pulled over a face you see nothing of but the green, a lantern at his belt with the same green in it, a rope round his waist,
 * boots heavy with clay; the shovel over his shoulder as he walks and swung down two-handed in the attack, the green on its blade
 * when he casts (`cast`). In his last phase the grave gives him back as something else (`./gravedigger2.ts`).
 */

export const COAT = FIRST_OWN, HOOD = FIRST_OWN + 1, DIRT = FIRST_OWN + 2, IRON = FIRST_OWN + 3, HAFT = FIRST_OWN + 4, GLOW = FIRST_OWN + 5, ROPE = FIRST_OWN + 6, SKIN = FIRST_OWN + 7;

export const DIGGER_PALETTE = enemyPalette({
  // the legacy g: a greatcoat gone grey-green with damp
  [COAT]: { ramp: ["#10120d", "#1c1f16", "#2a2e21", "#3a3f2e", "#4c523c", "#60684c", "#78805e"], amb: .46, spec: .08 },
  // the legacy h
  [HOOD]: { ramp: ["#0a0b08", "#14160f", "#1e2117", "#2a2e20", "#383d2b"], amb: .42, spec: .06, rim: true },
  // grave-dirt, caked on
  [DIRT]: { ramp: ["#120c08", "#20160e", "#302216", "#42301f", "#56402a"], amb: .42, spec: .05 },
  // the legacy S: the shovel's blade
  [IRON]: { ramp: ["#161616", "#262624", "#393835", "#4e4c48", "#66635d", "#807c75"], amb: .44, spec: .5, rim: true },
  // the legacy s: its haft
  [HAFT]: { ramp: ["#1a120a", "#2c1f12", "#40301c", "#544027", "#6a5233"], amb: .38, spec: .2 },
  // the legacy R: the green
  [GLOW]: { ramp: ["#2a5a10", "#40841a", "#5eac26", "#84d03a", "#b4ee60"], emissive: true },
  [ROPE]: { ramp: ["#2a2214", "#42361f", "#5e4e2e", "#7a663e"], amb: .4 },
  // the grey of a hand
  [SKIN]: { ramp: ["#1c1c18", "#32322b", "#4c4b42", "#68665b", "#848174"], amb: .44, spec: .15 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
export const damp: TexFn = (x, y, z) => (Math.sin(x * 50 + Math.sin(y * 11 + z * 7) * 2.5) > 0.93 ? -1.1 : 0);
const clay = blotchTex(0.9, 1.0, -1.3);

/** The shovel, in the right hand's frame: the haft on down the arm's line, a D-grip at the fist, the blade at the far end. */
export function shovel(b: Builder, cast: number, tilt: number, glow: number): void {
  b.push(); b.translate(0, -0.06, 0); b.roll(tilt);
  limb(b, 0, 0, 0.16, -1.05, 0.026, 0.024, HAFT, 6);
  b.push(); b.translate(0, 0.2, 0); rodX(b, -0.06, 0.06, 0, 0, 0.016, 0.016, HAFT, 5); for (const x of [-0.06, 0.06]) limb(b, x, 0, -0.05, 0.0, 0.014, 0.014, HAFT, 4); b.pop();   // the D of its grip
  b.push(); b.translate(0, -1.05, 0); b.yaw(0.9);   // the blade turned on the haft so it shows its face, not its edge
  b.cbox(-0.04, -0.1, -0.03, 0.04, 0.02, 0.03, 0.01, IRON);                                                  // the socket
  b.prz([[-0.17, -0.08], [0.17, -0.08], [0.18, -0.36], [0.1, -0.48], [0.0, -0.52], [-0.1, -0.48], [-0.18, -0.36]], -0.015, 0.015, IRON, { r1: 0.92 });
  b.prz([[-0.15, -0.36], [0.15, -0.36], [0.08, -0.46], [-0.08, -0.46]], -0.019, 0.019, DIRT);                 // the clay on its edge
  if (cast > 0) b.prz([[-0.13, -0.12], [0.13, -0.12], [0.13, -0.34], [-0.13, -0.34]], -0.022, 0.022, glow);       // the green on the blade
  b.pop(); b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.05, -0.1, -0.035, 0.05, 0.0, 0.035, 0.012, SKIN, { tex: crackTex });
  b.cbox(-0.045, -0.13, -0.04, 0.045, -0.08, 0.03, 0.012, SKIN);
  b.box(s * 0.05, -0.08, -0.03, s * 0.07, -0.02, 0.02, SKIN);
  if (s > 0) shovel(b, c.x("cast"), c.x("tilt"), GLOW);
}

/** A tail of the greatcoat, hung from the waist, to the shins: caked with dirt below the knee. */
function tail(b: Builder, x: number, z: number, w: number, len: number, sw: number, flare: number): void {
  b.push(); b.translate(x, -0.04, z); b.pitch(sw); b.roll(flare);
  b.prz([[-w * 0.5, 0], [w * 0.5, 0], [w * 0.65, -len], [-w * 0.65, -len]], -0.022, 0.022, COAT, { tex: damp });
  b.prz([[-w * 0.6, -len * 0.55], [w * 0.6, -len * 0.55], [w * 0.65, -len], [-w * 0.65, -len]], -0.026, 0.026, DIRT, { tex: clay });
  b.pop();
}

const joints: Joint[] = humanJoints(DIGGER_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    const b = c.b;
    b.cbox(-0.21, -0.1, -0.13, 0.21, 0.08, 0.12, 0.04, COAT, { tex: damp });
    b.cbox(-0.225, -0.04, -0.145, 0.225, 0.02, 0.135, 0.012, ROPE);                              // the rope he is belted with
    // the lantern at his hip, the green in it
    b.push(); b.translate(-0.2, -0.08, -0.12); b.roll(0.1 * c.x("sway"));
    limb(b, 0, 0, 0, -0.06, 0.006, 0.006, ROPE, 4); b.cbox(-0.045, -0.2, -0.045, 0.045, -0.06, 0.045, 0.01, IRON);
    b.cbox(-0.035, -0.18, -0.05, 0.035, -0.08, 0.05, 0.008, GLOW);
    b.pop();
  }),
  part("pelvis", "legs", (c) => {
    const b = c.b, sw = c.x("sway");
    tail(b, -0.12, -0.13, 0.2, 0.62, -0.05 + sw * 0.15, 0.06); tail(b, 0.12, -0.13, 0.2, 0.62, -0.05 - sw * 0.15, -0.06);
    tail(b, 0, 0.12, 0.42, 0.66, 0.1, 0); tail(b, -0.22, 0, 0.16, 0.6, 0, 0.14); tail(b, 0.22, 0, 0.16, 0.6, 0, -0.14);
  }),
  part("spine", "body", (c) => {
    c.b.cbox(-0.2, 0, -0.12, 0.2, 0.3, 0.11, 0.04, COAT, { tex: damp });
    for (let i = 0; i < 4; i++) c.b.ball(0.0, 0.04 + i * 0.075, -0.125, 0.014, IRON, 4);   // its buttons
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.27, 0, -0.12, 0.27, 0.34, 0.12, 0.05, COAT, { tex: damp });
    for (const s of [-1, 1]) b.prz([[s * 0.02, 0.32], [s * 0.16, 0.34], [s * 0.12, 0.12], [s * 0.04, 0.08]], -0.135, -0.12, HOOD);   // the lapels
    b.prz([[-0.36, 0.22], [-0.28, 0.36], [-0.1, 0.42], [0.1, 0.42], [0.28, 0.36], [0.36, 0.22], [0.3, 0.1], [-0.3, 0.1]], -0.14, 0.14, COAT, { r1: 0.95, tex: damp });   // the cape of the coat over the shoulders
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.02, 0.1, 0.08, 0.075, HOOD, 7)),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.1, COAT, 7)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.1, COAT, 7)),
  part("head", "head", (c) => {
    const b = c.b;
    b.prz([[-0.15, -0.04], [0.15, -0.04], [0.17, 0.1], [0.15, 0.24], [0.08, 0.32], [0.0, 0.36], [-0.08, 0.32], [-0.15, 0.24], [-0.17, 0.1]], -0.13, 0.16, HOOD, { r1: 0.84, tex: damp });
    b.prz([[-0.1, -0.02], [0.1, -0.02], [0.115, 0.1], [0.09, 0.2], [0.0, 0.24], [-0.09, 0.2], [-0.115, 0.1]], -0.146, -0.11, E.CAVITY);
    b.box(-0.075, 0.1, -0.155, -0.025, 0.13, -0.14, GLOW); b.box(0.025, 0.1, -0.155, 0.075, 0.13, -0.14, GLOW);
  }),
  ...armParts(DIGGER_BODY, "lArm", armSpec()),
  ...armParts(DIGGER_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(DIGGER_BODY, s, {
    joint: 0.09,
    upper: { r0: 0.11, r1: 0.09, mat: COAT, tex: damp },
    lower: { r0: 0.085, r1: 0.075, mat: DIRT, tex: clay },
    foot: (c) => { c.b.cbox(-0.07, -0.05, -0.19, 0.07, 0.05, 0.06, 0.025, DIRT, { tex: clay }); },
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.085,
    upper: { r0: 0.09, r1: 0.085, mat: COAT, tex: damp },
    fore: { r0: 0.085, r1: 0.095, mat: COAT, tex: damp, deco: (c, len) => c.b.cbox(-0.1, -len - 0.01, -0.1, 0.1, -len + 0.05, 0.1, 0.02, HOOD) },
    hand,
  };
}

const O = { neck: 0.08, arm: 0.085, leg: 0.1, neckTop: 0.14, armLen: 0.16, legLen: 0.18 };

export const GRAVEDIGGER: Rig = {
  key: "N",
  palette: DIGGER_PALETTE,
  frame: { w: 70, h: 100, worldH: 2.35, floor: 0.975, yaw: 0.4, pitch: 0.05, shift: 0.0 },
  crawlH: 9 / 13,
  joints, parts, stumps: humanStumps(O),
  poses: DIGGER_POSES,
  walkStep: 0.14,
  regions: { W: 17, H: 13, head: 4, armTop: 4, armBot: 9, shoulder: 4.5 },
  partSpecs: humanPartSpecs(DIGGER_BODY, O),
};

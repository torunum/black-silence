import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, limb, meatTex, rodX } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { EXECUTIONER_BODY, EXECUTIONER_POSES } from "./executionerPoses";

/**
 * THE MUTANT EXECUTIONER (`E`, a boss): the dungeon's warden, a hooded headsman grown to twice a man.
 *
 * The legacy sprite is a brown hood (`h`) with a red slit of eyes (`R`) over a body of dull flesh (`d`) and a grey axe (`A`)
 * the height of it. The rig makes the flesh a body — a mountain of bare, stitched, grey-brown hide over a gut, arms like a
 * man's thighs, one shoulder grown a hump of tumour — and keeps the hood: a headsman's sack of leather with two holes and the
 * red behind them. A leather apron, black with what it has done, a belt of hooks and chain, and the axe: a great bearded
 * blade on a haft as long as a man, dragged at rest and brought over and down in the attack (`atk`); it charges (`charge`)
 * with it held low.
 */

const HIDE = FIRST_OWN, HOOD = FIRST_OWN + 1, APRON = FIRST_OWN + 2, IRON = FIRST_OWN + 3, HAFT = FIRST_OWN + 4, GLARE = FIRST_OWN + 5, STITCH = FIRST_OWN + 6, EDGE = FIRST_OWN + 7;

export const EXECUTIONER_PALETTE = enemyPalette({
  // the legacy d: a grey-brown hide, a corpse's that was fed
  [HIDE]:   { ramp: ["#1a1212", "#2e2120", "#463230", "#5f4642", "#7b5d57", "#98786f", "#b69589"], amb: .44, spec: .22 },
  // the legacy h: the hood, a leather sack
  [HOOD]:   { ramp: ["#100c09", "#1d1611", "#2c221a", "#3c2f24", "#4e3e30", "#63503e"], amb: .42, spec: .3, rim: true },
  [APRON]:  { ramp: ["#0c0908", "#171210", "#241b17", "#33261f", "#44332a"], amb: .38, spec: .35 },
  // the legacy A: the axe's iron, and its edge
  [IRON]:   { ramp: ["#131416", "#202226", "#30333a", "#444850", "#5c6169", "#787e86"], amb: .4, spec: .5, rim: true },
  [HAFT]:   { ramp: ["#1a0e06", "#2c180b", "#432411", "#5a3218", "#714020"], amb: .36, spec: .2 },
  // the legacy R
  [GLARE]:  { ramp: ["#6a0c04", "#a01808", "#d02a10", "#ff4a20", "#ff9a60"], emissive: true },
  [STITCH]: { ramp: ["#0a0606", "#160c0b", "#241412", "#331c18"], amb: .5 },
  [EDGE]:   { ramp: ["#5a5e64", "#80858c", "#a8adb2", "#cfd2d4", "#eef0f0"], amb: .6, spec: .6, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const hide = blotchTex(0.45, 1.45, -1.55);
const leather: TexFn = (x, y, z) => (Math.sin(x * 60 + y * 40 + Math.sin(z * 30) * 2) > 0.92 ? -1 : Math.sin(y * 90 + x * 15) > 0.95 ? 0.7 : 0);

/** A line of stitches across a scar, from (x0,y0) to (x1,y1) on the face at depth z. */
function stitches(b: Builder, x0: number, y0: number, x1: number, y1: number, z: number, n: number): void {
  b.push(); b.translate((x0 + x1) / 2, (y0 + y1) / 2, z); b.roll(Math.atan2(x1 - x0, y1 - y0));
  const len = Math.hypot(x1 - x0, y1 - y0);
  b.box(-0.008, -len / 2, -0.006, 0.008, len / 2, 0.004, STITCH);
  for (let i = 0; i <= n; i++) b.box(-0.03, -len / 2 + (i * len) / n - 0.005, -0.008, 0.03, -len / 2 + (i * len) / n + 0.005, 0.004, STITCH);
  b.pop();
}

/** The axe, in the right hand's frame: the haft on down the arm's line, the bearded head at its end, a spike behind it. */
function axe(b: Builder): void {
  b.push(); b.translate(0, -0.06, 0);
  limb(b, 0, 0, 0.18, -1.15, 0.03, 0.028, HAFT, 6);                  // the haft
  for (const y of [0.1, -0.05]) limb(b, 0, 0, y, y - 0.05, 0.035, 0.035, APRON, 6);   // the grip's bindings
  b.ball(0, 0.2, 0, 0.04, IRON, 5);
  b.push(); b.translate(0, -1.0, 0);
  const H: Array<[number, number]> = [[0.02, 0.12], [0.2, 0.2], [0.42, 0.26], [0.46, 0.0], [0.4, -0.24], [0.2, -0.16], [0.02, -0.08]];
  b.push(); b.yaw(Math.PI / 2); b.prz(H, -0.018, 0.018, IRON, { r1: 0.9 }); b.prz([[0.4, 0.27], [0.47, 0.27], [0.51, 0.0], [0.45, -0.26], [0.39, -0.25], [0.44, 0.0]], -0.012, 0.012, EDGE); b.pop();
  b.push(); b.yaw(-Math.PI / 2); b.prz([[0.02, 0.05], [0.16, 0.02], [0.02, -0.04]], -0.02, 0.02, IRON); b.pop();   // the spike behind
  b.cbox(-0.05, -0.12, -0.05, 0.05, 0.14, 0.05, 0.01, IRON);           // the socket
  limb(b, 0, 0, 0.14, 0.26, 0.012, 0.004, IRON, 4);                    // the top spike
  b.pop(); b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.08, -0.13, -0.065, 0.08, 0.0, 0.065, 0.025, HIDE, { tex: hide });
  for (let i = -1; i <= 1; i++) { limb(b, i * 0.05, -0.04, -0.12, -0.2, 0.022, 0.018, HIDE, 5); limb(b, i * 0.05, -0.05, -0.2, -0.24, 0.012, 0.004, E.TOOTH, 4); }   // thick fingers, black nails
  b.box(s * 0.08, -0.1, -0.05, s * 0.11, -0.02, 0.04, HIDE);
  if (s > 0) { b.push(); b.roll(c.x("tilt")); axe(b); b.pop(); }   // `tilt` turns the haft in the fist (the wind-up holds it up over the shoulder)
}

const joints: Joint[] = humanJoints(EXECUTIONER_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    const b = c.b;
    b.cbox(-0.33, -0.12, -0.2, 0.33, 0.1, 0.17, 0.06, HIDE, { tex: hide });
    b.cbox(-0.35, -0.03, -0.22, 0.35, 0.05, 0.19, 0.02, APRON, { tex: leather });          // the belt
    for (const x of [-0.24, -0.08, 0.2]) { b.box(x - 0.012, -0.2, -0.24, x + 0.012, -0.02, -0.22, IRON); b.box(x - 0.012, -0.22, -0.27, x + 0.012, -0.19, -0.22, IRON); }   // its hooks
    for (let i = 0; i < 5; i++) b.ball(0.3 - i * 0.03, -0.05 - i * 0.04, -0.2, 0.017, IRON, 4);   // a hanging chain
  }),
  part("pelvis", "legs", (c) => {   // the apron, to the shins: it goes with the legs
    const b = c.b, sw = c.x("sway");
    b.push(); b.translate(0, -0.02, -0.22); b.pitch(-0.06 + sw * 0.06);
    b.prz([[-0.27, 0.04], [0.27, 0.04], [0.3, -0.7], [0.18, -0.76], [-0.05, -0.72], [-0.3, -0.75]], -0.02, 0.02, APRON, { tex: leather });
    for (const [x, y, l] of [[-0.16, -0.08, 0.36], [-0.05, -0.12, 0.5], [0.1, -0.05, 0.28], [0.2, -0.2, 0.4]] as const) b.prz([[x - 0.025, y], [x + 0.025, y], [x + 0.012, y - l], [x, y - l - 0.03], [x - 0.012, y - l]], -0.026, -0.02, E.MEAT, { tex: meatTex });   // what it is black with, still running
    b.pop();
  }),
  part("spine", "body", (c) => {
    const b = c.b;
    b.cbox(-0.38, -0.05, -0.34, 0.38, 0.34, 0.18, 0.18, HIDE, { tex: hide });              // the gut
    stitches(b, -0.2, 0.25, 0.15, -0.0, -0.335, 7);
    b.ball(0.0, 0.08, -0.34, 0.025, STITCH, 4);                                             // a navel like a socket
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.42, 0, -0.2, 0.42, 0.4, 0.2, 0.12, HIDE, { tex: hide });
    b.ball(-0.18, 0.22, -0.17, 0.15, HIDE, 7, { tex: hide }); b.ball(0.18, 0.22, -0.17, 0.15, HIDE, 7, { tex: hide });   // the slabs of the chest
    stitches(b, -0.3, 0.32, -0.05, 0.08, -0.31, 5); stitches(b, 0.08, 0.36, 0.3, 0.12, -0.31, 5);
    b.ball(0.32, 0.4, 0.02, 0.21, HIDE, 8, { tex: blotchTex(1.6) });                        // the hump on its shoulder
    b.ball(0.38, 0.47, -0.08, 0.08, E.ORGAN, 6);                                            // and the raw of it
    // the harness of the apron: straps over the shoulders
    for (const x of [-0.2, 0.2]) b.box(x - 0.04, -0.02, -0.33, x + 0.04, 0.4, -0.31, APRON);
  }),
  part("neck", "body", (c) => limb(c.b, 0, -0.02, -0.03, 0.1, 0.13, 0.12, HIDE, 7, { tex: hide })),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.16, HIDE, 7, { tex: hide })),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.16, HIDE, 7, { tex: hide })),
  // ---- the head: a headsman's hood, two holes in it, red behind them ----
  part("head", "head", (c) => {
    const b = c.b;
    b.cbox(-0.15, -0.04, -0.15, 0.15, 0.3, 0.15, 0.08, HOOD, { tex: leather });
    b.prz([[-0.15, 0.26], [0.15, 0.26], [0.08, 0.4], [0.0, 0.42], [-0.08, 0.4]], -0.12, 0.13, HOOD, { tex: leather });   // the sack's point
    b.prz([[-0.2, -0.02], [0.2, -0.02], [0.26, -0.16], [-0.26, -0.16]], -0.17, 0.17, HOOD, { tex: leather });            // its skirt over the shoulders
    for (const x of [-0.065, 0.065]) {
      b.prz([[x - 0.045, 0.14], [x + 0.045, 0.14], [x + 0.035, 0.19], [x - 0.035, 0.19]], -0.16, -0.13, E.CAVITY);
      b.box(x - 0.03, 0.155, -0.165, x + 0.03, 0.18, -0.15, GLARE);
    }
    stitches(b, 0, 0.3, 0, 0.0, -0.152, 6);                                                 // the seam down its face
  }),
  part("jaw", "head", (c) => {   // what of a mouth shows below the hood: a jaw too wide, the teeth set in it
    const b = c.b;
    b.cbox(-0.12, -0.08, -0.14, 0.12, -0.01, 0.06, 0.03, HIDE, { tex: hide });
    for (let i = 0; i < 6; i++) b.box(-0.09 + i * 0.033, -0.035, -0.148, -0.072 + i * 0.033, 0.0, -0.13, E.TOOTH);
  }),
  ...armParts(EXECUTIONER_BODY, "lArm", armSpec(-1)),
  ...armParts(EXECUTIONER_BODY, "rArm", armSpec(1)),
  ...(["L", "R"] as const).flatMap((s) => legParts(EXECUTIONER_BODY, s, {
    joint: 0.12,
    upper: { r0: 0.15, r1: 0.12, mat: HIDE, tex: hide },
    lower: { r0: 0.12, r1: 0.1, mat: HIDE, tex: hide, deco: (c, len) => { for (let i = 0; i < 3; i++) limb(c.b, 0, 0, -len * (0.55 + i * 0.12), -len * (0.6 + i * 0.12), 0.115, 0.11, APRON, 7); } },   // leather bindings round the shins
    foot: (c) => { c.b.cbox(-0.09, -0.055, -0.22, 0.09, 0.05, 0.07, 0.03, HIDE, { tex: hide }); for (let i = -1; i <= 1; i++) c.b.cyl(i * 0.05, -0.03, -0.26, -0.21, 0.016, 0.005, 4, E.TOOTH); },
  })),
];

function armSpec(s: -1 | 1): Parameters<typeof armParts>[2] {
  return {
    joint: 0.12,
    upper: { r0: 0.14, r1: 0.12, mat: HIDE, tex: hide, deco: (c, len) => { if (s > 0) stitches(c.b, -0.0, -len * 0.2, 0.0, -len * 0.8, -0.135, 4); } },
    fore: { r0: 0.12, r1: 0.1, mat: HIDE, tex: hide, deco: (c, len) => { rodX(c.b, -0.13, 0.13, -len * 0.8, 0, 0.03, 0.03, IRON, 5); limb(c.b, 0, 0, -len * 0.72, -len * 0.92, 0.112, 0.105, IRON, 8); } },   // an iron manacle, its chain cut
    hand,
  };
}

const O = { neck: 0.12, arm: 0.13, leg: 0.14, neckTop: 0.16, armLen: 0.22, legLen: 0.22 };

export const EXECUTIONER: Rig = {
  key: "E",
  palette: EXECUTIONER_PALETTE,
  frame: { w: 84, h: 100, worldH: 2.5, floor: 0.975, yaw: 0.4, pitch: 0.05, shift: 0.0 },
  crawlH: 9 / 13,
  joints, parts, stumps: humanStumps(O),
  poses: EXECUTIONER_POSES,
  walkStep: 0.15,
  regions: { W: 16, H: 13, head: 4, armTop: 4, armBot: 9, shoulder: 4.5 },
  partSpecs: humanPartSpecs(EXECUTIONER_BODY, O),
};

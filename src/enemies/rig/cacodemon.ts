import type { Builder } from "../../render/viewmodel/builder";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, limb, meatTex, scaled } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { CACO_BODY, CACO_POSES } from "./cacodemonPoses";

/**
 * THE CACODEMON (`C`): a floating orb of meat, one huge eye, a ring of fangs. It flies (`fly`) and spits green plasma (`caco`).
 *
 * The legacy sprite is a red disc (`R`, `r`) with two dark horns (`h`), an eye of green (`G`) round a dark ring (`e`), white
 * (`0`) and a red pupil (`W`), and a mouth of red gum (`W`) and pale teeth (`t`) across its lower half. The rig keeps all of it
 * on a ball of hide: the hide wrinkled and scarred, horns curling up off its crown, the eye wet and rolling (`look`), the mouth
 * a split across it that opens (`gape`) on a green light when it spits (`spit`). Under it hang what it has instead of a body —
 * two withered clawed arms and a knot of tentacles — so that what is torn off it is torn off something.
 */

const HIDE = FIRST_OWN, HORN = FIRST_OWN + 1, IRIS = FIRST_OWN + 2, WHITE = FIRST_OWN + 3, GUM = FIRST_OWN + 4, PLASMA = FIRST_OWN + 5, PUPIL = FIRST_OWN + 6;

export const CACO_PALETTE = enemyPalette({
  // the legacy R / r: a red hide, darker in its folds
  [HIDE]:   { ramp: ["#2a0806", "#46100b", "#661a11", "#872618", "#a8341f", "#c6482a", "#e0663e"], amb: .46, spec: .3, rim: true },
  // the legacy h
  [HORN]:   { ramp: ["#1a0807", "#2c0f0c", "#431812", "#5c2219", "#782f22"], amb: .44, spec: .3, rim: true },
  // the legacy G: the eye's green
  [IRIS]:   { ramp: ["#122a0c", "#204616", "#2f6420", "#40842c", "#56a63a", "#74c64e"], amb: .55, spec: .5 },
  // the legacy 0
  [WHITE]:  { ramp: ["#6a6a60", "#9a9a90", "#c4c4b8", "#e0e0d8", "#f6f6ee"], amb: .6, spec: .6, rim: true },
  // the legacy W: its gums
  [GUM]:    { ramp: ["#4a0c08", "#741610", "#9c2418", "#c8382a", "#e45a44"], amb: .5, spec: .5 },
  [PLASMA]: { ramp: ["#1a5a10", "#2c8a1a", "#48b82a", "#78e04a", "#b8ff8a"], emissive: true },
  // and the red of its pupil
  [PUPIL]:  { ramp: ["#5a0a06", "#8a140c", "#b81e12", "#e0301e"], emissive: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const hide = blotchTex(0.6, 1.3, -1.45);
const R = 0.5;
/** The ball is drawn this much larger than its unit sketch: the legacy disc filled its whole frame. */
const K = 1.24;

/** A disc facing the viewer at (x, y), radius r, from depth z0 to z1. */
function disc(b: Builder, x: number, y: number, r: number, z0: number, z1: number, mat: number, n = 12): void {
  b.prz(Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, y + Math.sin((i / n) * Math.PI * 2) * r] as [number, number]), z0, z1, mat);
}

/** The ball, its eye and its mouth: centred over the chest joint. */
function orb(c: Ctx): void {
  const b = scaled(c.b, K), gape = c.x("gape"), look = c.x("look"), squint = c.x("squint"), spit = c.x("spit");
  b.push(); b.translate(0, 0.08, 0);
  b.ball(0, 0, 0, R, HIDE, 12, { tex: hide });
  b.ball(-0.18, 0.28, -0.22, 0.17, HIDE, 7, { tex: hide }); b.ball(0.2, 0.3, -0.2, 0.15, HIDE, 7, { tex: hide });   // the brow's swellings over the eye
  b.ball(-0.36, -0.12, -0.2, 0.14, HIDE, 6, { tex: hide }); b.ball(0.37, -0.1, -0.2, 0.14, HIDE, 6, { tex: hide });  // the cheeks the mouth splits
  // the eye: green round dark round white round the red
  const ex = 0.02 + look * 0.04, ey = 0.12, er = 0.2 * (1 - squint * 0.45);
  disc(b, 0.02, ey, 0.23, -0.5, -0.4, HIDE);
  b.prz(Array.from({ length: 14 }, (_, i) => [0.02 + Math.cos((i / 14) * Math.PI * 2) * 0.21, ey + Math.sin((i / 14) * Math.PI * 2) * er] as [number, number]), -0.512, -0.45, IRIS);
  disc(b, ex, ey, er * 0.6, -0.518, -0.5, E.CAVITY, 10);
  disc(b, ex, ey, er * 0.45, -0.524, -0.51, WHITE, 10);
  disc(b, ex, ey, er * 0.2, -0.53, -0.52, PUPIL, 8);
  b.ball(ex - er * 0.25, ey + er * 0.3, -0.53, 0.02, WHITE, 4);                              // the wet on it
  b.prz([[-0.24, ey + 0.2], [0.26, ey + 0.21], [0.27, ey + 0.2 - squint * 0.12], [-0.25, ey + 0.19 - squint * 0.12]], -0.52, -0.42, HIDE);   // the lid
  // the mouth: a split across the lower half, gums, two rows of fangs, the green in it when it spits
  const top = -0.14, h = 0.06 + gape * 0.18, mw = 0.36;
  const M: Array<[number, number]> = [[-mw, top], [-mw * 0.7, top - h * 0.6], [0, top - h], [mw * 0.7, top - h * 0.6], [mw, top], [mw * 0.7, top + 0.03], [0, top + 0.04], [-mw * 0.7, top + 0.03]];
  b.prz(M.map(([x, y]) => [x * 1.08, y + (y < top ? -0.02 : 0.02)] as [number, number]), -0.47, -0.4, GUM);
  b.prz(M, -0.48, -0.38, E.CAVITY);
  if (spit > 0) disc(b, 0, top - h * 0.45, 0.05 + spit * 0.1, -0.49, -0.46, PLASMA, 10);
  for (let i = 0; i < 9; i++) {
    const x = -mw * 0.85 + (i * mw * 1.7) / 8, edge = top + 0.03, len = 0.05 + (i % 2) * 0.025;
    b.prz([[x - 0.022, edge], [x + 0.022, edge], [x, edge - len]], -0.495, -0.47, E.TOOTH);                 // the upper fangs
    const low = top - h * (1 - Math.abs(x / mw) * 0.4) - 0.01;
    b.prz([[x - 0.02, low], [x + 0.02, low], [x, low + len * 0.8]], -0.495, -0.47, E.TOOTH);              // and the lower
  }
  // scars across the hide
  for (const [x, y, a] of [[-0.3, 0.3, 0.6], [0.32, -0.3, -0.4], [-0.1, -0.38, 0.2]] as const) { b.push(); b.translate(x, y, -Math.sqrt(Math.max(0, R * R - x * x - y * y)) - 0.005); b.roll(a); b.box(-0.008, -0.07, -0.006, 0.008, 0.07, 0.004, E.SINEW); b.pop(); }
  b.pop();
}

/** A horn, off the crown at side `s`, curling up and out, ringed. */
function horn(b: Builder, s: -1 | 1): void {
  b.push(); b.translate(s * 0.3, 0.0, -0.02); b.roll(-s * 0.55);
  limb(b, 0, 0, 0, 0.14, 0.07, 0.05, HORN, 6);
  for (let i = 0; i < 2; i++) limb(b, 0, 0, 0.03 + i * 0.05, 0.05 + i * 0.05, 0.075 - i * 0.008, 0.075 - i * 0.008, E.SINEW, 6);
  b.translate(0, 0.14, 0); b.roll(s * 0.5);
  limb(b, 0, 0, 0, 0.12, 0.05, 0.03, HORN, 6); b.translate(0, 0.12, 0); b.roll(s * 0.55);
  limb(b, 0, 0, 0, 0.1, 0.03, 0.004, HORN, 5);
  b.pop();
}

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.035, -0.06, -0.03, 0.035, 0.0, 0.03, 0.01, HIDE);
  for (let i = -1; i <= 1; i++) { b.push(); b.translate(i * 0.022, -0.055, 0); b.pitch(-0.5); b.roll(i * -0.25); limb(b, 0, 0, 0, -0.08, 0.012, 0.002, E.TOOTH, 4); b.pop(); }
  b.box(s * 0.035, -0.05, -0.02, s * 0.055, -0.01, 0.02, HIDE);
}

const joints: Joint[] = humanJoints(CACO_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => c.b.ball(0, 0.02, 0, 0.16, HIDE, 7, { tex: hide })),
  part("chest", "body", orb),
  part("head", "head", (c) => { horn(c.b, -1); horn(c.b, 1); }),
  ...armParts(CACO_BODY, "lArm", armSpec()),
  ...armParts(CACO_BODY, "rArm", armSpec()),
  // the tentacles under it, where a body would hang: they go with the "legs"
  ...(["L", "R"] as const).flatMap((s) => legParts(CACO_BODY, s, {
    joint: 0.05,
    upper: { r0: 0.075, r1: 0.055, mat: HIDE, tex: hide, deco: (c, len) => { for (let i = 1; i < 4; i++) limb(c.b, 0, 0, -len * i * 0.25, -len * i * 0.25 - 0.02, 0.07 - i * 0.005, 0.07 - i * 0.005, E.SINEW, 6); } },
    lower: { r0: 0.055, r1: 0.025, mat: HIDE, tex: hide },
    foot: (c, side) => { const b = c.b; b.push(); b.roll(side * 0.6); limb(b, 0, 0, 0, -0.1, 0.025, 0.006, E.MEAT, 5, { tex: meatTex }); b.pop(); },
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.045,
    upper: { r0: 0.06, r1: 0.045, mat: HIDE, tex: hide },
    fore: { r0: 0.045, r1: 0.035, mat: HIDE, tex: hide },
    hand,
  };
}

const O = { neck: 0.06, arm: 0.07, leg: 0.09, neckTop: 0.08, armLen: 0.12, legLen: 0.14 };

export const CACODEMON: Rig = {
  key: "C",
  palette: CACO_PALETTE,
  frame: { w: 100, h: 100, worldH: 1.9, floor: 0.975, yaw: 0.3, pitch: 0.06, shift: 0.0 },
  crawlH: 12 / 18,
  joints, parts, stumps: humanStumps(O),
  poses: CACO_POSES,
  walkStep: 0.12,
  regions: { W: 19, H: 18, head: 0, armTop: 0, armBot: 9, shoulder: 5 },
  partSpecs: humanPartSpecs(CACO_BODY, O),
};

import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { clothTex, limb, rodX } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { CULTIST_BODY, CULTIST_POSES } from "./cultistPoses";

/**
 * THE CULTIST (`j`): a fanatic in a hooded robe with a drum-fed gun, Blood's own.
 *
 * The legacy sprite is a hood of near-black purple (`h`) with two red points
 * in it (`0`), a robe a shade lighter (`r`) and a grey gun (`S`) held out to
 * one side. The rig keeps the colours and the read — the peaked hood with
 * nothing in it but the eyes, the robe to the ankles — and makes the gun a
 * gun: a drum-fed chopper with a wooden stock, carried across the body as it
 * walks and brought up to fire (its attack is `fireOrb`'s red bolt: `atk`
 * raises it, the strike is the muzzle flash, `flash`). A red cord belts the
 * robe; a bone cross, upside down, hangs on its chest.
 */

const ROBE = FIRST_OWN, HOOD = FIRST_OWN + 1, STEEL = FIRST_OWN + 2, WOOD = FIRST_OWN + 3, LEATHER = FIRST_OWN + 4,
  CORD = FIRST_OWN + 5, GLARE = FIRST_OWN + 6, FLASH = FIRST_OWN + 7, CHIN = FIRST_OWN + 8;

export const CULTIST_PALETTE = enemyPalette({
  // the legacy r: a robe of dyed wool gone the colour of a bruise
  [ROBE]:    { ramp: ["#100a12", "#1c121f", "#2b1d2f", "#3c2a40", "#4f3953", "#654a69", "#7e6082"], amb: .44, spec: .08 },
  // the legacy h: the hood, darker, and the dark inside it
  [HOOD]:    { ramp: ["#0b070c", "#160f18", "#221725", "#302134", "#402d45", "#533b59"], amb: .42, spec: .08, rim: true },
  // the legacy S: the gun's steel
  [STEEL]:   { ramp: ["#121314", "#1f2124", "#2e3135", "#41454a", "#585d63", "#737980", "#9aa1a8"], amb: .4, spec: .55, rim: true },
  [WOOD]:    { ramp: ["#1c0f07", "#2e190c", "#452713", "#5e361b", "#784626", "#935a33"], amb: .36, spec: .25 },
  [LEATHER]: { ramp: ["#0d0a08", "#19130f", "#271e17", "#372a20", "#4a392c"], amb: .36, spec: .3 },
  // a red cord at the waist, and the trim of the hood: what the eye finds on it after the eyes
  [CORD]:    { ramp: ["#3a0806", "#5c0f0a", "#801a10", "#a32616", "#c83a20", "#e25a36"], amb: .4, spec: .2, rim: true },
  // the legacy 0: the two points in the hood
  [GLARE]:   { ramp: ["#6a0c04", "#a01808", "#d02a10", "#ff4a20", "#ff9a60"], emissive: true },
  [FLASH]:   { ramp: ["#a04a10", "#e08a20", "#ffc040", "#ffe890", "#fffbe0"], emissive: true },
  // what shows of a face: a chin, grey, in the hood's shadow
  [CHIN]:    { ramp: ["#140f0f", "#251c1b", "#3a2d2a", "#52403b", "#6c5650"], amb: .3 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
/** Wool: the weave, and folds that run down it. */
const wool: TexFn = (x, y, z) => (Math.sin(x * 46 + Math.sin(y * 9 + z * 7) * 2.2) > 0.82 ? -1.1 : clothTex(x, y, z));
const grain: TexFn = (x, y, z) => (Math.sin(y * 160 + Math.sin(x * 30 + z * 40) * 1.5) > 0.7 ? -0.8 : 0);

/**
 * The gun, in the right hand's frame (the hand runs down -y, the barrel goes on along it, its top is -z): a grip in the fist, the
 * receiver over the hand, a finned barrel, the drum under it, the stock back along the forearm; `flash` is the muzzle's fire.
 */
function gun(b: Builder, flash: number): void {
  b.push(); b.translate(0, -0.05, -0.02);
  b.cbox(-0.022, -0.02, -0.02, 0.022, 0.05, 0.03, 0.006, WOOD, { tex: grain });                 // the grip in the fist
  b.cbox(-0.028, -0.26, -0.085, 0.028, 0.1, -0.025, 0.008, STEEL);                             // the receiver
  b.box(-0.008, -0.2, -0.1, 0.008, -0.05, -0.085, STEEL);                                       // the sight rail
  limb(b, 0, -0.06, -0.26, -0.5, 0.032, 0.03, STEEL, 7);                                        // the barrel's cooling jacket
  for (let i = 0; i < 5; i++) b.box(-0.036, -0.29 - i * 0.04, -0.096, 0.036, -0.28 - i * 0.04, -0.024, STEEL);   // its fins
  limb(b, 0, -0.06, -0.5, -0.56, 0.016, 0.016, STEEL, 6);                                       // the muzzle
  b.cbox(-0.024, -0.2, -0.025, 0.024, -0.14, 0.06, 0.006, WOOD, { tex: grain });                // the fore grip
  b.push(); b.translate(0, -0.06, 0.04); rodX(b, -0.03, 0.03, 0, 0, 0.075, 0.075, STEEL, 9); b.pop();   // the drum
  b.ball(0, -0.06, 0.04, 0.02, LEATHER, 4);
  b.cbox(-0.025, 0.08, -0.075, 0.025, 0.32, -0.02, 0.008, WOOD, { tex: grain });               // the stock, back along the forearm
  b.cbox(-0.028, 0.3, -0.095, 0.028, 0.36, 0.0, 0.006, WOOD);                                   // its butt
  if (flash > 0) {
    b.push(); b.translate(0, -0.6, -0.06);
    const r = 0.04 + flash * 0.05;
    b.prz([[0, -r * 1.6], [r * 0.35, -r * 0.4], [r, -r * 0.2], [r * 0.4, 0.05], [0, r * 0.5], [-r * 0.4, 0.05], [-r, -r * 0.2], [-r * 0.35, -r * 0.4]], -r * 0.4, r * 0.4, FLASH);
    b.ball(0, -r * 0.2, 0, r * 0.5, FLASH, 5);
    b.pop();
  }
  b.pop();
}

/** A gloved hand; the right one holds the gun. */
function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.045, -0.09, -0.035, 0.045, 0.0, 0.035, 0.014, LEATHER);
  b.cbox(-0.04, -0.12, -0.04, 0.04, -0.07, 0.03, 0.012, LEATHER);   // the fingers, closed
  b.box(s * 0.04, -0.07, -0.03, s * 0.06, -0.02, 0.02, LEATHER);    // the thumb
  if (s > 0) gun(b, c.x("flash"));
}

/** A panel of the robe's skirt hung from the belt: a long trapezoid of wool that swings out as `sway` says. */
function panel(b: Builder, x: number, z: number, w: number, len: number, swing: number, flare: number): void {
  b.push(); b.translate(x, -0.06, z); b.pitch(swing); b.roll(flare);
  b.prz([[-w * 0.5, 0], [w * 0.5, 0], [w * 0.62, -len * 0.55], [w * 0.7, -len], [-w * 0.7, -len], [-w * 0.62, -len * 0.55]], -0.025, 0.025, ROBE, { tex: wool });
  b.box(-w * 0.7, -len, -0.03, w * 0.7, -len + 0.04, 0.03, HOOD);   // the hem, darker with the dirt
  b.pop();
}

const joints: Joint[] = humanJoints(CULTIST_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    const b = c.b;
    b.cbox(-0.22, -0.1, -0.13, 0.22, 0.08, 0.12, 0.04, ROBE, { tex: wool });
    b.cbox(-0.235, -0.04, -0.145, 0.235, 0.025, 0.135, 0.015, CORD);                             // the red cord belt
    limb(b, 0.08, -0.15, -0.02, -0.3, 0.014, 0.012, CORD, 5); b.ball(0.08, -0.3, -0.15, 0.024, CORD, 5);   // its knotted end
    b.cbox(-0.16, -0.08, -0.16, -0.06, 0.02, -0.12, 0.01, LEATHER);                              // a pouch of shells
  }),
  // the skirt goes with the legs it hangs over: front panels split for the stride, a back one, the sides
  part("pelvis", "legs", (c) => {
    const b = c.b, sw = c.x("sway");
    panel(b, -0.11, -0.13, 0.2, 0.62, -0.06 + sw * 0.18, 0.06);
    panel(b, 0.11, -0.13, 0.2, 0.62, -0.06 - sw * 0.18, -0.06);
    panel(b, 0, 0.12, 0.42, 0.66, 0.1, 0);
    panel(b, -0.22, 0, 0.16, 0.6, 0, 0.16); panel(b, 0.22, 0, 0.16, 0.6, 0, -0.16);
  }),
  part("spine", "body", (c) => {
    c.b.cbox(-0.21, 0, -0.12, 0.21, 0.3, 0.11, 0.04, ROBE, { tex: wool });
    c.b.box(-0.015, 0.02, -0.126, 0.015, 0.3, -0.118, HOOD);   // the robe's seam
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.27, 0, -0.12, 0.27, 0.34, 0.12, 0.05, ROBE, { tex: wool });
    // the mantle the hood is cut from, over the shoulders
    b.prz([[-0.36, 0.22], [-0.3, 0.34], [-0.12, 0.42], [0.12, 0.42], [0.3, 0.34], [0.36, 0.22], [0.24, 0.12], [0, 0.06], [-0.24, 0.12]], -0.15, 0.14, HOOD, { r1: 0.95, tex: wool });
    b.prz([[-0.24, 0.12], [0, 0.06], [0.24, 0.12], [0.24, 0.14], [0, 0.085], [-0.24, 0.14]], -0.158, -0.148, CORD);   // its red trim
    // a cross of bone on a cord, upside down
    limb(b, -0.04, -0.15, 0.3, 0.12, 0.006, 0.006, LEATHER, 4); limb(b, 0.04, -0.15, 0.3, 0.12, 0.006, 0.006, LEATHER, 4);
    b.box(-0.012, -0.04, -0.17, 0.012, 0.13, -0.155, E.BONE); b.box(-0.045, -0.005, -0.17, 0.045, 0.018, -0.155, E.BONE);
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.02, 0.1, 0.08, 0.075, HOOD, 7)),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.1, ROBE, 7)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.1, ROBE, 7)),
  // ---- the head: a peaked hood with nothing in it but the eyes and a chin ----
  part("head", "head", (c) => {
    const b = c.b;
    b.prz([[-0.14, -0.04], [0.14, -0.04], [0.16, 0.1], [0.14, 0.24], [0.08, 0.33], [0.0, 0.4], [-0.08, 0.33], [-0.14, 0.24], [-0.16, 0.1]], -0.13, 0.16, HOOD, { r1: 0.82, tex: wool });
    b.prz([[0.0, 0.33], [0.05, 0.36], [0.02, 0.44], [-0.04, 0.47], [-0.03, 0.4]], 0.0, 0.14, HOOD);   // the peak, drooping back
    b.prz([[-0.12, -0.04], [0.12, -0.04], [0.135, 0.1], [0.11, 0.22], [0.0, 0.29], [-0.11, 0.22], [-0.135, 0.1]], -0.141, -0.125, CORD);   // the rim of the opening
    b.prz([[-0.095, -0.02], [0.095, -0.02], [0.11, 0.1], [0.085, 0.2], [0.0, 0.25], [-0.085, 0.2], [-0.11, 0.1]], -0.148, -0.11, E.CAVITY);   // the opening: dark
    b.box(-0.07, 0.115, -0.156, -0.03, 0.14, -0.14, GLARE); b.box(0.03, 0.115, -0.156, 0.07, 0.14, -0.14, GLARE);   // the eyes
    b.prz([[-0.05, -0.02], [0.05, -0.02], [0.04, 0.04], [-0.04, 0.04]], -0.152, -0.1, CHIN);           // a chin in the shadow
  }),
  ...armParts(CULTIST_BODY, "lArm", armSpec()),
  ...armParts(CULTIST_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(CULTIST_BODY, s, {
    joint: 0.1,
    upper: { r0: 0.13, r1: 0.11, mat: ROBE, tex: wool },
    lower: { r0: 0.1, r1: 0.12, mat: ROBE, tex: wool, deco: (c, len) => { c.b.cbox(-0.125, -len * 0.82, -0.125, 0.125, -len * 0.74, 0.125, 0.02, HOOD); limb(c.b, 0, 0, -len * 0.82, -len, 0.05, 0.05, LEATHER, 6); } },
    foot: (c) => { c.b.cbox(-0.06, -0.045, -0.17, 0.06, 0.05, 0.06, 0.02, LEATHER); },
  })),
];

/** A sleeve, wide at the cuff, and the gloved hand out of it. */
function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.085,
    upper: { r0: 0.09, r1: 0.085, mat: ROBE, tex: wool },
    fore: { r0: 0.085, r1: 0.11, mat: ROBE, tex: wool, deco: (c, len) => c.b.cbox(-0.115, -len - 0.01, -0.115, 0.115, -len + 0.05, 0.115, 0.02, HOOD) },
    hand,
  };
}

const O = { neck: 0.08, arm: 0.085, leg: 0.11, neckTop: 0.14, armLen: 0.14, legLen: 0.18 };

export const CULTIST: Rig = {
  key: "j",
  palette: CULTIST_PALETTE,
  frame: { w: 64, h: 100, worldH: 2.02, floor: 0.975, yaw: 0.42, pitch: 0.05, shift: 0.1 },
  crawlH: 8 / 12,
  joints, parts, stumps: humanStumps(O),
  poses: CULTIST_POSES,
  walkStep: 0.13,
  regions: { W: 12, H: 12, head: 4, armTop: 4, armBot: 8, shoulder: 4.5 },
  partSpecs: humanPartSpecs(CULTIST_BODY, O),
};

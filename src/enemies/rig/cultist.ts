import type { Builder } from "../../render/viewmodel/builder";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { clothTex, limb, scaled } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { CULTIST_BODY, CULTIST_POSES } from "./cultistPoses";

/**
 * THE CULTIST (`j`): hooded robe, gun, Blood-style.
 *
 * The legacy sprite is a hood (`h`, a purple so dark it is nearly black) with
 * two red points in it (`0`), a plum robe (`r`) that ends above the knees, and
 * a grey gun (`S`) held out at its right side. The rig keeps all of that and
 * adds what a body is: a robe with a hem and a cord at the waist, sleeves that
 * hang from the elbow, a tall cowl with the dark of a face deep inside it, a
 * sigil on the chest, boots, and a pistol with a muzzle that lights when it
 * fires (`flash`). It is the first thing in the game that shoots the player
 * (`range` 14), so its attack is the shot.
 */

const HOOD = FIRST_OWN, ROBE = FIRST_OWN + 1, TRIM = FIRST_OWN + 2, STEEL = FIRST_OWN + 3, EMBER = FIRST_OWN + 4, LEATHER = FIRST_OWN + 5, FIRE = FIRST_OWN + 6;

export const CULTIST_PALETTE = enemyPalette({
  // the legacy h: the hood, a violet that is almost black
  [HOOD]:    { ramp: ["#0a060e", "#150d1c", "#241830", "#372648", "#4c3560", "#634a7c", "#7e6498"], amb: .4 },
  // the legacy r: a plum robe
  [ROBE]:    { ramp: ["#10080f", "#21111f", "#361b32", "#4e2a48", "#68405c", "#845a76", "#a07890"], amb: .38, rim: true },
  // the cord, the hem, the cuffs: dried-blood red
  [TRIM]:    { ramp: ["#1e0605", "#3a0c0a", "#5c1410", "#82201a", "#a8322a", "#c8483c"], amb: .4, spec: .15 },
  // the legacy S: the gun
  [STEEL]:   { ramp: ["#17140f", "#2a251d", "#413b30", "#5a5246", "#78705f", "#9c927c", "#c4baa0"], amb: .26, spec: .6, rim: true },
  // the legacy 0: two red points in the dark of the hood
  [EMBER]:   { ramp: ["#7a1608", "#b2280e", "#d83a18", "#f2501f", "#ff7a3c"], emissive: true },
  // gloves and boots
  [LEATHER]: { ramp: ["#0c0806", "#1a120c", "#2a1d13", "#3c2b1c", "#523c28"], amb: .3, spec: .3 },
  // the muzzle flash
  [FIRE]:    { ramp: ["#c24a10", "#f08020", "#ffb040", "#ffe088", "#fffbe0"], emissive: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });

/** A pistol in the hand, pointing along the forearm: a slide, a barrel, a grip that hangs when the arm is raised, and a flame when it fires. */
function pistol(c: Ctx): void {
  const b = scaled(c.b, 1.4), fl = c.x("flash");
  b.cbox(-0.03, -0.3, -0.032, 0.03, -0.04, 0.03, 0.008, STEEL);                          // the slide
  limb(b, 0, 0, -0.42, -0.3, 0.016, 0.014, STEEL, 5);                                      // the barrel
  b.box(-0.022, -0.1, 0.02, 0.022, -0.02, 0.1, LEATHER);                                  // the grip
  b.box(-0.01, -0.12, -0.02, 0.01, -0.07, 0.03, STEEL);                                   // the guard
  b.box(-0.008, -0.31, -0.04, 0.008, -0.29, -0.034, E.TOOTH);                              // a bead of a sight
  if (fl > 0.05) {
    b.ball(0, -0.45 - fl * 0.04, 0, 0.035 + fl * 0.05, FIRE, 6);
    limb(b, 0, 0, -0.43, -0.43 - fl * 0.3, 0.05 * fl + 0.01, 0.002, FIRE, 5);
    for (const s of [-1, 1]) limb(b, s * 0.03, 0, -0.43, -0.43 - fl * 0.14, 0.012 * fl + 0.003, 0.001, FIRE, 4);
  }
}

/** A glove: a fist (or open, as the pose has it). */
function glove(c: Ctx): void {
  const b = c.b;
  b.cbox(-0.05, -0.1, -0.045, 0.05, 0.0, 0.045, 0.014, LEATHER);
  b.box(-0.045, -0.04, -0.05, 0.045, -0.01, -0.04, TRIM);                                  // a cord about the wrist
}

/** The hem of a robe: a band of trim at the bottom edge. */
function hem(b: Builder, y: number, w: number, z0: number, z1: number): void {
  b.prz([[-w, y], [w, y], [w + 0.01, y - 0.05], [-w - 0.01, y - 0.05]], z0, z1, TRIM, { tex: clothTex });
}

const joints: Joint[] = humanJoints(CULTIST_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    c.b.cbox(-0.25, -0.1, -0.13, 0.25, 0.07, 0.12, 0.03, ROBE, { tex: clothTex });
    c.b.box(-0.21, -0.02, -0.135, 0.21, 0.035, -0.115, TRIM);                              // the cord
    c.b.box(0.02, -0.12, -0.15, 0.06, 0.02, -0.12, TRIM);                                  // and its tail
  }),
  part("pelvis", "legs", (c) => {                                                         // the skirt of the robe hangs from the hips; it goes with the legs
    const b = c.b;
    b.prz([[-0.27, -0.05], [0.27, -0.05], [0.43, -0.52], [-0.43, -0.52]], -0.18, 0.16, ROBE, { r1: 0.96, tex: clothTex });
    b.prz([[-0.06, -0.05], [0.06, -0.05], [0.09, -0.5], [-0.09, -0.5]], -0.192, -0.178, HOOD);   // a pleat down the front, darker
    hem(b, -0.5, 0.42, -0.19, 0.17);
  }),
  part("spine", "body", (c) => c.b.cbox(-0.24, 0, -0.11, 0.24, 0.28, 0.11, 0.03, ROBE, { tex: clothTex })),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.33, 0, -0.05, 0.33, 0.32, 0.13, 0.04, ROBE, { tex: clothTex });
    b.prz([[-0.4, 0.3], [-0.14, 0.4], [0.14, 0.4], [0.4, 0.3], [0.34, 0.2], [-0.34, 0.2]], -0.11, 0.11, HOOD, { r1: 0.95, tex: clothTex });   // the mantle over the shoulders
    b.prz([[0, 0.28], [0.06, 0.2], [0, 0.1], [-0.06, 0.2]], -0.128, -0.1, EMBER);          // a sigil sewn on the chest, red and bright
    b.prz([[0, 0.25], [0.025, 0.2], [0, 0.14], [-0.025, 0.2]], -0.132, -0.128, E.CAVITY);
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.03, 0.08, 0.08, 0.075, HOOD, 6)),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.1, HOOD, 6)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.1, HOOD, 6)),
  // ---- the head: a tall cowl with the dark of a face in it and two red points ----
  part("head", "head", (c) => {
    const b = c.b, op = c.x("hood");
    b.prz([[-0.11, 0.0], [0.11, 0.0], [0.15, 0.1], [0.13, 0.24], [0.07, 0.36], [0.0, 0.43], [-0.07, 0.36], [-0.13, 0.24], [-0.15, 0.1]], -0.14, 0.15, HOOD, { r1: 0.8, tex: clothTex });
    b.prz([[0.0, 0.46], [0.06, 0.38], [0.02, 0.3], [-0.04, 0.4]], 0.02, 0.2, HOOD);        // the point of the cowl, folded over at the back
    b.prz([[-0.085 - op * 0.02, 0.08], [0.085 + op * 0.02, 0.08], [0.1 + op * 0.02, 0.24], [0.0, 0.31], [-0.1 - op * 0.02, 0.24]], -0.152, -0.13, E.CAVITY);   // the opening
    b.prz([[-0.15, 0.1], [-0.13, 0.24], [-0.1, 0.24], [-0.1, 0.1]], -0.158, -0.14, ROBE);   // the lips of the cowl, lighter
    b.prz([[0.15, 0.1], [0.13, 0.24], [0.1, 0.24], [0.1, 0.1]], -0.158, -0.14, ROBE);
    b.ball(-0.045, 0.19, -0.14, 0.022, EMBER, 5); b.ball(0.045, 0.19, -0.14, 0.022, EMBER, 5);   // two red points
    b.box(-0.04, 0.04, -0.15, 0.04, 0.075, -0.13, E.BONE);                                   // a pale chin under it
  }),
  ...armParts(CULTIST_BODY, "lArm", {
    joint: 0.075,
    upper: { r0: 0.1, r1: 0.09, mat: ROBE, tex: clothTex },
    fore: { r0: 0.09, r1: 0.13, mat: ROBE, tex: clothTex, deco: (c, len) => limb(c.b, 0, 0, -len * 0.98, -len * 0.9, 0.135, 0.135, TRIM, 7) },   // a wide sleeve, a trim at its mouth
    hand: glove,
  }),
  ...armParts(CULTIST_BODY, "rArm", {
    joint: 0.075,
    upper: { r0: 0.1, r1: 0.09, mat: ROBE, tex: clothTex },
    fore: { r0: 0.09, r1: 0.13, mat: ROBE, tex: clothTex, deco: (c, len) => limb(c.b, 0, 0, -len * 0.98, -len * 0.9, 0.135, 0.135, TRIM, 7) },
    hand: (c) => { glove(c); pistol(c); },
  }),
  ...(["L", "R"] as const).flatMap((s) => legParts(CULTIST_BODY, s, {
    joint: 0.075,
    upper: { r0: 0.1, r1: 0.075, mat: HOOD, tex: clothTex },
    lower: { r0: 0.075, r1: 0.06, mat: LEATHER, deco: (c, len) => { c.b.box(-0.085, -len * 0.55, -0.085, 0.085, -len * 0.5, 0.085, TRIM); } },
    foot: (c) => { c.b.cbox(-0.06, -0.05, -0.19, 0.06, 0.05, 0.06, 0.02, LEATHER); },
  })),
];

const O = { neck: 0.08, arm: 0.075, leg: 0.1, neckTop: 0.14 };

export const CULTIST: Rig = {
  key: "j",
  palette: CULTIST_PALETTE,
  frame: { w: 65, h: 101, worldH: 2.1, floor: 0.975, yaw: 0.3, pitch: 0.05, shift: -0.1 },
  crawlH: 8 / 12,
  joints, parts, stumps: humanStumps(O),
  poses: CULTIST_POSES,
  walkStep: 0.1,
  regions: { W: 12, H: 12, head: 4, armTop: 4, armBot: 8, shoulder: 4 },
  partSpecs: humanPartSpecs(CULTIST_BODY, O),
};

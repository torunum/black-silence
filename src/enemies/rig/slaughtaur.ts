import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, clothTex, ellipsoid, limb, meatTex } from "./shapes";
import type { Ctx, PartGroup, Rig, RigPart, Stump } from "./kit";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { CENT_BODY, CENT_JOINTS, CENT_POSES } from "./slaughtaurPoses";

/**
 * THE SLAUGHTAUR (`k`): an armoured centaur with a screaming-skull shield.
 *
 * The legacy sprite is a hooded head with red eyes (`h`, `R`), a tan plate
 * cuirass and a dark horse's body (`g`, `k`), a round shield on its left with a
 * skull on it (`S` iron, `b` bone, `B` red) and a pale weapon on its right (`H`).
 * The rig keeps that and grows it: a horse barrel in dark brown with plate over
 * its flanks and chest, four legs ending in hooves, a tail; out of its chest a man's torso in a cuirass
 * with pauldrons, a hooded helm with a crest and two red eyes in it, a mace in the right hand; and in the
 * left the shield, an iron disc with a skull on it whose jaw opens when it screams (`scream`) and blue fire
 * pours out. The shield is held facing the player whatever the arm does (`sh` undoes the
 * arm's own turn).
 */

const HORSE = FIRST_OWN, ARMOR = FIRST_OWN + 1, HOOD = FIRST_OWN + 2, IRON = FIRST_OWN + 3, SKULLB = FIRST_OWN + 4, FIRE = FIRST_OWN + 5, EYE = FIRST_OWN + 6, HOOF = FIRST_OWN + 7;

export const CENT_PALETTE = enemyPalette({
  // the legacy k: a dark brown hide
  [HORSE]: { ramp: ["#070605", "#100d09", "#1b1610", "#2a2218", "#3c3122", "#52432e", "#6c5a40"], amb: .36, spec: .2, rim: true },
  // the legacy g: tan plate, scuffed bright where it is worn
  [ARMOR]: { ramp: ["#1a140a", "#322818", "#584830", "#80684a", "#a88c62", "#ccb07c", "#eed39c"], amb: .4, spec: .6, rim: true },
  // the legacy h: the hood and the leather
  [HOOD]:  { ramp: ["#120d09", "#241a12", "#3a2b1e", "#554130", "#725a44", "#90745a"], amb: .36 },
  // the legacy S: the shield's iron
  [IRON]:  { ramp: ["#0c0c0c", "#1b1a19", "#2c2a28", "#403d39", "#58534c", "#756f64", "#9a9484"], amb: .3, spec: .5, rim: true },
  // the legacy b: the bone of the skull
  [SKULLB]:{ ramp: ["#2a2410", "#54491e", "#88783a", "#b8a45c", "#e8d088", "#fff0b0"], amb: .42, spec: .2, rim: true },
  // the shield's scream: blue fire, from the orb "centaur" it fires
  [FIRE]:  { ramp: ["#1a3a9a", "#2a5ae0", "#4a7aff", "#8ab0ff", "#d0e4ff"], emissive: true },
  // the legacy R / B: two red points in the hood, red in the skull's eyes
  [EYE]:   { ramp: ["#6a1a0e", "#9c2f1e", "#c84a2c", "#f0683e", "#ff9068"], emissive: true },
  // hooves
  [HOOF]:  { ramp: ["#08070a", "#131116", "#201d22", "#322e34", "#48434a"], amb: .3, spec: .3 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const hide: TexFn = (x, y, z) => blotchTex(1.5, 1.3, -1.5)(x, y, z);
const stud = (b: Builder, x: number, y: number, z: number, r = 0.02): void => b.ball(x, y, z, r, ARMOR, 4);

/** A leg of the horse: a thigh that tapers to a hock, a cannon and a hoof; the fore pair are the same under their own joint names. */
const legSpec = (): Parameters<typeof legParts>[2] => ({
  joint: 0.075,
  upper: { r0: 0.15, r1: 0.09, mat: HORSE, tex: hide },
  lower: { r0: 0.075, r1: 0.06, mat: HORSE, tex: hide, deco: (c, len) => { c.b.cbox(-0.065, -len * 0.7, -0.065, 0.065, -len * 0.25, 0.065, 0.015, ARMOR); stud(c.b, 0, -len * 0.5, -0.07, 0.014); } },
  foot: (c) => { c.b.cbox(-0.055, -0.07, -0.08, 0.055, 0.03, 0.06, 0.02, HOOF); },
});
/** The fore pair: legParts' parts, moved to the `f` joints. */
const foreLegs = (): RigPart[] => (["L", "R"] as const).flatMap((s) => legParts(CENT_BODY, s, legSpec()).map((p) => ({ ...p, joint: "f" + p.joint })));

/** The shield: an iron disc with a rim, a skull on its face, and the skull's jaw: shut at rest, open and breathing blue fire when it screams. */
function shield(c: Ctx): void {
  const b = c.b, sc = c.x("scream");
  b.pitch(c.x("sh"));                                                                    // held square to the player, whatever the arm does
  b.translate(-0.07, -0.08, -0.17);
  b.cyl(0, 0, -0.03, 0.03, 0.4, 0.4, 12, IRON, { tex: hide });                          // the disc
  b.cyl(0, 0, -0.045, -0.025, 0.42, 0.42, 12, ARMOR);                                       // its rim
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; stud(b, Math.cos(a) * 0.35, Math.sin(a) * 0.35, -0.05, 0.024); }
  ellipsoid(b, 0, 0.03, -0.06, 0.2, 0.22, 0.07, SKULLB, 9);                                // the skull
  for (const s of [-1, 1]) { ellipsoid(b, s * 0.08, 0.06, -0.12, 0.05, 0.06, 0.03, E.CAVITY, 6); b.ball(s * 0.08, 0.06, -0.14, 0.022, EYE, 4); }
  b.box(-0.015, -0.02, -0.14, 0.015, 0.03, -0.12, E.CAVITY);                                // nose
  const open = 0.04 + 0.12 * sc;
  ellipsoid(b, 0, -0.13 - open * 0.5, -0.12, 0.11, 0.03 + open, 0.04, E.CAVITY, 7);        // its jaw, the mouth open as it screams
  for (let i = -2; i <= 2; i++) b.box(i * 0.04 - 0.012, -0.1, -0.135, i * 0.04 + 0.012, -0.07, -0.12, SKULLB);
  if (sc > 0.1) { ellipsoid(b, 0, -0.14 - open * 0.4, -0.17, 0.08 + 0.12 * sc, 0.06 + 0.14 * sc, 0.06, FIRE, 7); ellipsoid(b, 0, -0.14 - open * 0.4, -0.22, 0.04 + 0.07 * sc, 0.04 + 0.08 * sc, 0.05, E.TOOTH, 6); }
}

/** The mace: a haft along the forearm, a flanged head. */
function mace(c: Ctx): void {
  const b = c.b;
  b.cbox(-0.06, -0.12, -0.055, 0.06, 0.0, 0.055, 0.02, HOOD);                                // the fist
  limb(b, 0, 0, 0.2, -0.5, 0.032, 0.03, HOOD, 6);
  b.ball(0, -0.58, 0, 0.1, E.BONE, 7, { tex: hide });
  for (let i = 0; i < 4; i++) { b.push(); b.translate(0, -0.58, 0); b.yaw((i * Math.PI) / 2); b.cyl(0, 0, 0.06, 0.2, 0.04, 0.008, 4, E.BONE); b.pop(); }
  limb(b, 0, 0, -0.66, -0.8, 0.04, 0.006, E.BONE, 5);
}

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    const b = c.b;
    ellipsoid(b, 0, 0, 0, 0.32, 0.32, 0.32, HORSE, 9, { tex: hide });                          // the rump
    ellipsoid(b, 0, -0.04, -0.3, 0.31, 0.33, 0.52, HORSE, 10, { tex: hide });                  // the barrel
    for (const s of [-1, 1]) { b.prz([[s * 0.27, 0.12], [s * 0.3, -0.12], [s * 0.26, -0.2], [s * 0.2, 0.1]], -0.62, 0.12, ARMOR, { r1: 0.98 }); stud(b, s * 0.29, -0.02, -0.3); stud(b, s * 0.29, -0.02, -0.1); stud(b, s * 0.28, -0.02, 0.05); }   // plate along the flanks
    b.prz([[-0.22, 0.26], [0.22, 0.26], [0.26, 0.16], [-0.26, 0.16]], -0.55, 0.16, HOOD, { tex: clothTex });     // a saddle cloth over the barrel
  }),
  part("tail1", "body", (c) => limb(c.b, 0, 0, 0, 0.26, 0.07, 0.05, HORSE, 6)),
  part("tail2", "body", (c) => { limb(c.b, 0, 0, 0, 0.3, 0.05, 0.015, HORSE, 5); limb(c.b, 0.02, 0.0, 0.02, 0.2, 0.03, 0.008, HOOD, 4); }),
  part("spine", "body", (c) => {
    const b = c.b;
    ellipsoid(b, 0, -0.18, 0.04, 0.34, 0.34, 0.32, HORSE, 9, { tex: hide });                    // the horse's chest, where the man grows out of it
    b.prz([[-0.06, 0.12], [0.06, 0.12], [0.08, -0.34], [-0.08, -0.34]], -0.37, -0.31, ARMOR, { r1: 0.97 });   // a strap of plate down the horse's chest
    stud(b, 0, 0.0, -0.375); stud(b, 0, -0.14, -0.375); stud(b, 0, -0.28, -0.375);
    b.cbox(-0.2, 0.0, -0.2, 0.2, 0.2, 0.14, 0.04, HORSE);                                      // the withers
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.34, 0.0, -0.12, 0.34, 0.46, 0.13, 0.05, ARMOR);                                   // the man's cuirass
    b.prz([[-0.05, 0.02], [0.05, 0.02], [0.06, 0.4], [0.0, 0.44], [-0.06, 0.4]], -0.16, -0.12, E.CAVITY);   // a seam down it
    b.prz([[-0.44, 0.4], [-0.16, 0.52], [0.16, 0.52], [0.44, 0.4], [0.38, 0.26], [-0.38, 0.26]], -0.1, 0.12, ARMOR, { r1: 0.94 });
    for (const s of [-1, 1]) { stud(b, s * 0.2, 0.3, -0.135); stud(b, s * 0.2, 0.12, -0.135); }
    b.box(-0.3, 0.0, -0.14, 0.3, 0.05, 0.14, HOOD);                                            // his belt
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.03, 0.08, 0.08, 0.07, HOOD, 6)),
  part("shoulderL", "body", (c) => { c.b.ball(0, 0.02, 0, 0.17, ARMOR, 7); limb(c.b, -0.04, 0, 0.08, 0.26, 0.03, 0.004, ARMOR, 4); }),
  part("shoulderR", "body", (c) => { c.b.ball(0, 0.02, 0, 0.17, ARMOR, 7); limb(c.b, 0.04, 0, 0.08, 0.26, 0.03, 0.004, ARMOR, 4); }),
  // ---- the head: a hood under a helm with a crest, two red points in the dark ----
  part("head", "head", (c) => {
    const b = c.b;
    b.prz([[-0.11, 0.0], [0.11, 0.0], [0.14, 0.12], [0.11, 0.26], [0.0, 0.32], [-0.11, 0.26], [-0.14, 0.12]], -0.13, 0.13, HOOD, { r1: 0.85, tex: clothTex });
    b.prz([[-0.07, 0.07], [0.07, 0.07], [0.09, 0.22], [0.0, 0.27], [-0.09, 0.22]], -0.145, -0.12, E.CAVITY);   // the dark under it
    b.ball(-0.04, 0.17, -0.14, 0.02, EYE, 4); b.ball(0.04, 0.17, -0.14, 0.02, EYE, 4);
    b.cbox(-0.13, 0.24, -0.14, 0.13, 0.3, 0.13, 0.03, ARMOR);                                  // the helm's brow band
    b.prz([[-0.02, 0.3], [0.02, 0.3], [0.04, 0.42], [0.0, 0.46], [-0.04, 0.42]], -0.13, 0.12, ARMOR, { r1: 0.8 });   // a crest
    for (const s of [-1, 1]) { b.push(); b.translate(s * 0.12, 0.28, 0); b.roll(s * -0.6); limb(b, 0, 0, 0, 0.2, 0.035, 0.005, ARMOR, 5); b.pop(); }   // horns
  }),
  ...armParts(CENT_BODY, "lArm", {
    joint: 0.065,
    upper: { r0: 0.075, r1: 0.06, mat: HOOD, tex: clothTex, deco: (c, len) => c.b.cbox(-0.08, -len * 0.9, -0.08, 0.08, -len * 0.1, 0.08, 0.02, ARMOR) },
    fore: { r0: 0.06, r1: 0.05, mat: HOOD, deco: (c, len) => c.b.cbox(-0.07, -len * 0.95, -0.07, 0.07, -len * 0.3, 0.07, 0.015, ARMOR) },
    hand: (c) => { c.b.cbox(-0.055, -0.1, -0.05, 0.055, 0.0, 0.05, 0.015, HOOD); shield(c); },
  }),
  ...armParts(CENT_BODY, "rArm", {
    joint: 0.065,
    upper: { r0: 0.075, r1: 0.06, mat: HOOD, tex: clothTex, deco: (c, len) => c.b.cbox(-0.08, -len * 0.9, -0.08, 0.08, -len * 0.1, 0.08, 0.02, ARMOR) },
    fore: { r0: 0.06, r1: 0.05, mat: HOOD, deco: (c, len) => c.b.cbox(-0.07, -len * 0.95, -0.07, 0.07, -len * 0.3, 0.07, 0.015, ARMOR) },
    hand: mace,
  }),
  ...(["L", "R"] as const).flatMap((s) => legParts(CENT_BODY, s, legSpec())),
  ...foreLegs(),
];

const O = { neck: 0.08, arm: 0.075, leg: 0.11, neckTop: 0.14, armLen: 0.16 };
const base = humanStumps(O);
const stumps: Stump[] = [
  ...base,
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "fhip" + s, group: "legs", draw: (c) => {
    limb(c.b, 0, 0, 0, -0.14, 0.11, 0.09, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, -0.03, -0.24, 0.02, 0.015, E.BONE, 5); c.b.box(0.02, -0.16, -0.05, 0.05, -0.1, -0.02, E.SINEW);
  } })),
];

export const SLAUGHTAUR: Rig = {
  key: "k",
  palette: CENT_PALETTE,
  frame: { w: 84, h: 110, worldH: 2.6, floor: 0.975, yaw: 0.45, pitch: 0.06, shift: 0.17 },
  crawlH: 8 / 12,
  joints: CENT_JOINTS, parts, stumps,
  poses: CENT_POSES,
  walkStep: 0.1,
  regions: { W: 12, H: 12, head: 5, armTop: 5, armBot: 9, shoulder: 4.5 },
  partSpecs: humanPartSpecs(CENT_BODY, O),
};

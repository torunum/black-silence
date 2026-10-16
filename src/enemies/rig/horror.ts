import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { limb, meatTex } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { HORROR_BODY, HORROR_POSES } from "./horrorPoses";

/**
 * THE PLATED HORROR (`m`): riveted rust armour bolted over rotting flesh.
 *
 * The legacy sprite is a steel grey block (`A`, `r` rust, `d` shadow) with
 * the raw red of the thing inside showing through the middle of its
 * breastplate (`R`, `H`) and a bucket of a helmet with a slit of dark for
 * eyes. The rig keeps all of that: pauldrons the width of the sprite, a
 * cuirass in two halves with a gap down the middle, and in the gap ribs and
 * wet meat and a heart; plates rivetted over limbs of grey-green rot; a
 * helmet with an ember in its slit. Armour is what it is: it takes the first
 * 45 damage of every hit (`plate`), so the rig is mostly plate. Its attack is
 * the slam (`atk`: both arms up, then down), its plates open as it dies
 * (`open`) and fall off the body that is left.
 */

const STEEL = FIRST_OWN, RUST = FIRST_OWN + 1, ROT = FIRST_OWN + 2, EMBER = FIRST_OWN + 3, DARK = FIRST_OWN + 4;

export const HORROR_PALETTE = enemyPalette({
  // the legacy A: bolted-on armour plate, brighter on its edges
  [STEEL]: { ramp: ["#0f1114", "#1b1e23", "#2a2e34", "#3a4046", "#4e555d", "#636b74", "#7e8791"], amb: .44, spec: .45, rim: true },
  // the legacy r: rust, on the rims and where the rivets weep
  [RUST]:  { ramp: ["#1a0b05", "#331609", "#522410", "#74351a", "#96482a", "#b9603a"], amb: .34, spec: .2, rim: true },
  // the legacy g: the grey-green flesh under it
  [ROT]:   { ramp: ["#0f130c", "#1b2114", "#2a331d", "#3d4830", "#556245", "#6f7e5a"], amb: .36, spec: .1 },
  // an ember in the helmet's slit (the legacy had only the dark)
  [EMBER]: { ramp: ["#7a2008", "#b8340e", "#e0521a", "#ff7a2a", "#ffa850"], emissive: true },
  // the legacy d
  [DARK]:  { ramp: ["#08090b", "#101215", "#191c20", "#24282d", "#30353b"], amb: .3, spec: .3 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
/** Scratched, dented steel: dark scores, the odd pale scuff. */
const scratch: TexFn = (x, y, z) => (Math.sin(x * 83 + y * 41 + Math.sin(z * 27) * 1.6) > 0.975 ? -1.2 : Math.sin(x * 29 - y * 67 + z * 19) > 0.985 ? 1.0 : 0);
/** Rust blooms. */
const bloom: TexFn = (x, y, z) => (Math.sin(x * 37 + z * 23) * Math.sin(y * 41 + x * 11) > 0.55 ? -1.1 : 0);

const rivet = (b: Builder, x: number, y: number, z: number, r = 0.014): void => b.ball(x, y, z, r, RUST, 4);

/** A cuirass half: a plate, a rust rim down its inner edge, rivets. `s` -1 is the left (screen). */
function cuirass(b: Builder, s: -1 | 1, open: number): void {
  b.push(); b.translate(s * 0.115, 0, -0.01); b.yaw(s * open * 0.5); b.roll(s * -open * 0.3);
  const X = (v: number): number => s * v;
  b.prz([[X(0.0), 0.04], [X(0.33), 0.04], [X(0.36), 0.2], [X(0.3), 0.36], [X(0.1), 0.37], [X(0.0), 0.3]], -0.12, -0.04, STEEL, { r1: 0.94, tex: scratch });
  b.prz([[X(0.0), 0.04], [X(0.04), 0.04], [X(0.04), 0.3], [X(0.0), 0.3]], -0.132, -0.12, RUST);                      // the rim along the gap
  b.prz([[X(0.0), 0.04], [X(0.33), 0.04], [X(0.34), 0.08], [X(0.0), 0.08]], -0.128, -0.12, RUST, { tex: bloom });    // and along its foot
  for (const [x, y] of [[0.1, 0.1], [0.26, 0.12], [0.3, 0.26], [0.14, 0.32], [0.05, 0.2]] as const) rivet(b, X(x), y, -0.126);
  b.pop();
}

const joints: Joint[] = humanJoints(HORROR_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    c.b.cbox(-0.24, -0.08, -0.1, 0.24, 0.07, 0.09, 0.02, ROT, { tex: bloom });
    c.b.box(-0.26, -0.1, -0.13, 0.26, 0.04, -0.1, DARK);                                       // a belt of chain and leather
    for (let i = 0; i < 5; i++) c.b.box(-0.22 + i * 0.09, -0.1, -0.14, -0.15 + i * 0.09, 0.0, -0.13, STEEL);
  }),
  part("pelvis", "legs", (c) => {   // the tassets that hang over the thighs go with the legs
    for (const s of [-1, 1]) c.b.prz([[s * 0.04, -0.1], [s * 0.26, -0.1], [s * 0.28, -0.34], [s * 0.16, -0.4], [s * 0.05, -0.34]], -0.14, -0.1, STEEL, { tex: scratch });
  }),
  part("spine", "body", (c) => {
    const b = c.b;
    b.cbox(-0.2, 0, -0.07, 0.2, 0.28, 0.08, 0.025, ROT, { tex: bloom });
    for (let i = 0; i < 3; i++) {   // plates over the belly, each one lapping the next, a gap down the middle
      for (const s of [-1, 1]) b.cbox(s * 0.085 - (s > 0 ? 0 : 0.14), 0.015 + i * 0.085, -0.115, s * 0.085 + (s > 0 ? 0.14 : 0), 0.085 + i * 0.085, -0.075, 0.01, i % 2 ? RUST : STEEL, { tex: scratch });
    }
    b.prz([[-0.08, 0.02], [0.08, 0.02], [0.09, 0.27], [-0.09, 0.27]], -0.11, -0.07, E.MEAT, { tex: meatTex });   // the raw of it, in the gap
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.29, 0, 0.0, 0.29, 0.34, 0.11, 0.035, ROT, { tex: bloom });
    b.prz([[-0.12, 0.04], [0.12, 0.04], [0.13, 0.3], [0.0, 0.34], [-0.13, 0.3]], -0.13, -0.05, E.MEAT, { tex: meatTex });   // the gap between the halves: raw meat
    for (let k = 0; k < 4; k++) { b.cbox(-0.115, 0.07 + k * 0.065, -0.14, 0.115, 0.09 + k * 0.065, -0.1, 0.004, E.BONE); }   // ribs across it
    b.ball(0.03, 0.2, -0.125, 0.06, E.ORGAN, 6); b.ball(-0.06, 0.1, -0.12, 0.04, E.MEAT, 5);
    cuirass(b, -1, c.x("open")); cuirass(b, 1, c.x("open"));
    b.cbox(-0.22, 0.34, -0.1, 0.22, 0.4, 0.1, 0.02, STEEL, { tex: scratch });                    // the gorget
    b.box(-0.31, 0.0, 0.1, 0.31, 0.33, 0.13, STEEL, { tex: scratch });                           // and a backplate
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.03, 0.08, 0.075, 0.065, ROT, 7, { tex: bloom })),
  part("shoulderL", "body", (c) => pauldron(c.b, -1, c.x("open"))),
  part("shoulderR", "body", (c) => pauldron(c.b, 1, c.x("open"))),
  // ---- the head: a bucket of a helmet with a slit in it ----
  part("head", "head", (c) => {
    const b = c.b;
    b.cbox(-0.115, 0.0, -0.11, 0.115, 0.27, 0.12, 0.045, STEEL, { tex: scratch });
    b.cbox(-0.12, 0.2, -0.12, 0.12, 0.27, 0.13, 0.03, RUST, { tex: bloom });                   // the rim of it, rusted
    b.box(-0.095, 0.1, -0.122, 0.095, 0.135, -0.108, E.CAVITY);                                // the slit
    b.box(-0.07, 0.108, -0.126, -0.025, 0.127, -0.118, EMBER); b.box(0.025, 0.108, -0.126, 0.07, 0.127, -0.118, EMBER);    // something in it
    b.box(-0.01, 0.0, -0.118, 0.01, 0.27, -0.108, STEEL);                                      // the ridge down it
    for (const x of [-0.09, 0.09]) for (const y of [0.05, 0.22]) rivet(b, x, y, -0.118, 0.012);
    b.prz([[-0.1, 0.0], [-0.04, -0.03], [0.04, -0.03], [0.1, 0.0]], -0.1, 0.05, ROT);          // the jaw hangs below the rim
  }),
  part("jaw", "head", (c) => {
    c.b.cbox(-0.085, -0.075, -0.1, 0.085, -0.02, 0.0, 0.01, ROT);
    for (let i = 0; i < 5; i++) c.b.box(-0.06 + i * 0.03, -0.03, -0.104, -0.045 + i * 0.03, 0.0, -0.095, E.TOOTH);
  }),
  ...armParts(HORROR_BODY, "lArm", armSpec(-1)),
  ...armParts(HORROR_BODY, "rArm", armSpec(1)),
  ...(["L", "R"] as const).flatMap((s) => legParts(HORROR_BODY, s, {
    joint: 0.07,
    upper: { r0: 0.09, r1: 0.07, mat: ROT, tex: bloom, deco: (c, len) => { c.b.cbox(-0.095, -len * 0.55, -0.1, 0.095, -len * 0.05, 0.1, 0.02, STEEL, { tex: scratch }); rivet(c.b, 0, -len * 0.12, -0.105); rivet(c.b, 0, -len * 0.45, -0.105); } },
    lower: { r0: 0.07, r1: 0.05, mat: ROT, deco: (c, len) => { c.b.cbox(-0.08, -len * 0.92, -0.085, 0.08, -len * 0.08, 0.085, 0.02, STEEL, { tex: scratch }); c.b.box(-0.085, -len * 0.5, -0.09, 0.085, -len * 0.42, 0.09, RUST); } },
    foot: (c) => { c.b.cbox(-0.065, -0.045, -0.19, 0.065, 0.04, 0.05, 0.02, STEEL, { tex: scratch }); c.b.box(-0.06, -0.045, -0.19, 0.06, -0.02, -0.17, RUST); },
  })),
];

/** A pauldron: a dome of plate with a lip, two lames below it, and a rivet at the top. */
function pauldron(b: Builder, s: -1 | 1, open: number): void {
  b.push(); b.roll(s * open * 0.5);
  b.ball(0, 0.02, 0, 0.145, STEEL, 8);
  b.cbox(s * -0.0 - 0.17, -0.04, -0.15, 0.17, 0.0, 0.14, 0.015, RUST, { tex: bloom });
  b.cbox(-0.15, -0.1, -0.13, 0.15, -0.045, 0.12, 0.015, STEEL, { tex: scratch });
  b.ball(0, 0.14, -0.02, 0.022, RUST, 5);
  b.pop();
}

function armSpec(s: -1 | 1): Parameters<typeof armParts>[2] {
  return {
    joint: 0.07,
    upper: { r0: 0.075, r1: 0.06, mat: ROT, tex: bloom, deco: (c, len) => { c.b.cbox(-0.085, -len * 0.9, -0.09, 0.085, -len * 0.1, 0.09, 0.02, STEEL, { tex: scratch }); rivet(c.b, 0, -len * 0.3, -0.094); } },
    fore: { r0: 0.06, r1: 0.05, mat: ROT, deco: (c, len) => { c.b.cbox(-0.07, -len * 0.95, -0.075, 0.07, -len * 0.3, 0.075, 0.015, STEEL, { tex: scratch }); c.b.box(-0.075, -len * 0.36, -0.08, 0.075, -len * 0.3, 0.08, RUST); } },
    hand: (c) => { c.b.cbox(-0.07, -0.12, -0.06, 0.07, 0.0, 0.06, 0.02, STEEL, { tex: scratch }); for (let i = -1; i <= 1; i++) c.b.cbox(i * 0.04 - 0.017, -0.16, -0.045, i * 0.04 + 0.017, -0.12, 0.045, 0.006, DARK); c.b.box(s * 0.07, -0.08, -0.04, s * 0.095, -0.02, 0.04, STEEL); },
  };
}

const O = { neck: 0.07, arm: 0.09, leg: 0.1, armLen: 0.4 };

export const HORROR: Rig = {
  key: "m",
  palette: HORROR_PALETTE,
  frame: { w: 72, h: 100, worldH: 2.14, floor: 0.975, yaw: 0.45, pitch: 0.05, shift: 0.08 },
  crawlH: 17 / 24,
  joints, parts, stumps: humanStumps(O),
  poses: HORROR_POSES,
  walkStep: 0.14,
  regions: { W: 20, H: 24, head: 7, armTop: 8, armBot: 16, shoulder: 6.5 },
  partSpecs: humanPartSpecs(HORROR_BODY, O),
};

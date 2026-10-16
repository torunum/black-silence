import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { crackTex, limb, scaled } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { WAILER_BODY, WAILER_POSES } from "./wailerPoses";

/**
 * THE WAILER (`s`): gaunt, cheeks torn open, throat split in a permanent scream.
 *
 * The legacy sprite is a lavender-grey (`p`, `P`) figure with a face that is
 * all mouth: an orange-red throat (`B`) lit like a furnace, white teeth (`H`),
 * arms thrown wide, a torn shroud (`d`). The rig keeps the colour and the
 * scream — a throat that glows on its own, the jaw hanging off its hinge — and
 * gives it a long, starved body in a flaring shroud: long arms with longer
 * fingers, ribs under the skin, a neck split down the front. It is the one
 * that calls the others (`scream`): its attack is the shriek, head thrown back,
 * arms flung wide, the shroud flaring (`rag`), and the game holds that pose
 * for the second it stands screaming (`RigAnim.rigLive`).
 */

const SKIN = FIRST_OWN, SHROUD = FIRST_OWN + 1, THROAT = FIRST_OWN + 2, BONE2 = FIRST_OWN + 3, TEETH = FIRST_OWN + 4;

export const WAILER_PALETTE = enemyPalette({
  // the legacy p / P: skin the colour of a bruise that has gone grey
  [SKIN]:   { ramp: ["#20142a", "#3a2448", "#58386e", "#7a50a0", "#9a64c4", "#b884e0", "#d6b0f2"], amb: .46, spec: .12 },
  // the legacy d: the shroud it was buried in
  [SHROUD]: { ramp: ["#1a0f20", "#2c1a36", "#43284f", "#5c3a6c", "#784f8a", "#9468a6"], amb: .42 },
  // the legacy B: the inside of its throat, lit from within
  [THROAT]: { ramp: ["#7a1608", "#a22410", "#c43418", "#d8431e", "#e65024", "#f2602c"], emissive: true },
  // the legacy b: bone, a lavender white
  [BONE2]:  { ramp: ["#2a2430", "#4e4458", "#7a6e88", "#a498b2", "#cabfd6", "#e8e0f0"], amb: .42, spec: .2, rim: true },
  // the legacy H: its teeth, a clean white in a dirty mouth
  [TEETH]:  { ramp: ["#4a4452", "#7e7788", "#b4aebf", "#dcd6e6", "#f2eef8", "#ffffff"], amb: .55, spec: .3, rim: true },
});

/** Its head is nearly twice a head: the sprite is a face and a scream. */
const HK = 2.3;
/** The gape: an oval from the upper teeth to the lower jaw. */
const MOUTH: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [Math.cos((i / 12) * Math.PI * 2) * 0.115, -0.03 + Math.sin((i / 12) * Math.PI * 2) * 0.1]);
const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const veins: TexFn = (x, y, z) => (Math.sin(x * 70 + y * 55 + Math.sin(z * 30) * 2) > 0.9 ? -1.2 : Math.sin(x * 40 - z * 60) > 0.96 ? 0.8 : 0);

/** A long hand: a narrow palm and five fingers that are too long, curled as `claw` says. */
function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b, claw = c.x("claw");
  b.cbox(-0.034, -0.08, -0.022, 0.034, 0.005, 0.022, 0.01, SKIN);
  for (let i = -2; i <= 2; i++) {
    b.push(); b.translate(i * 0.017, -0.075, 0); b.pitch(-0.1 - claw * 0.5); b.roll(i * -0.1 * (0.4 + claw));
    limb(b, 0, 0, 0, -0.11, 0.009, 0.007, SKIN, 4);
    b.translate(0, -0.11, 0); b.pitch(-0.2 - claw * 0.7);
    limb(b, 0, 0, 0, -0.12, 0.007, 0.002, BONE2, 4);
    b.pop();
  }
  b.push(); b.translate(s * 0.04, -0.03, 0); b.roll(s * -0.8); limb(b, 0, 0, 0, -0.07, 0.009, 0.004, SKIN, 4); b.pop();
}

/** The shroud: rags hung from `y` that flare out as `rag` swings them. */
function rags(b: Builder, y: number, w: number, len: number, flare: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5, x = t * w, l = len * (0.7 + 0.3 * Math.abs(Math.sin(i * 2.3)));
    b.push(); b.translate(x, y, -0.12 + Math.abs(t) * 0.1); b.roll(-t * flare * 1.4);
    b.prz([[-0.05, 0], [0.05, 0], [0.065, -l * 0.6], [0.02, -l], [-0.03, -l * 0.8], [-0.07, -l * 0.5]], -0.03, 0.02, SHROUD);
    b.pop();
  }
}

const joints: Joint[] = humanJoints(WAILER_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    c.b.cbox(-0.16, -0.09, -0.09, 0.16, 0.07, 0.08, 0.02, SKIN);
    c.b.cbox(-0.19, -0.05, -0.12, 0.19, 0.05, 0.1, 0.02, SHROUD);                              // the sash it was tied with
  }),
  part("pelvis", "legs", (c) => { rags(c.b, -0.05, 0.38, 0.5, c.x("rag"), 5); rags(c.b, -0.07, 0.34, 0.8, c.x("rag") * 0.6 + 0.1, 4); }),   // the skirt of the shroud goes with the legs it hangs over
  part("spine", "body", (c) => {
    c.b.cbox(-0.15, 0, -0.07, 0.15, 0.3, 0.07, 0.025, SKIN, { tex: veins });
    for (let i = 0; i < 4; i++) c.b.box(-0.12, 0.06 + i * 0.06, -0.076, 0.12, 0.07 + i * 0.06, -0.068, BONE2);   // ribs under the skin
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.27, 0, 0.0, 0.27, 0.34, 0.1, 0.03, SKIN, { tex: veins });
    b.prz([[-0.34, 0.27], [-0.14, 0.38], [0.14, 0.38], [0.34, 0.27], [0.27, 0.21], [-0.27, 0.21]], -0.05, 0.09, SKIN, { r1: 0.97 });   // raised shoulders
    for (let k = 0; k < 5; k++) for (const s of [-1, 1]) {
      b.push(); b.translate(s * 0.01, 0.07 + k * 0.055, -0.095); b.yaw(s * (Math.PI / 2 - 0.3)); b.cyl(0, 0, 0, 0.19, 0.016, 0.012, 5, BONE2); b.pop();
    }
    limb(b, 0, -0.1, 0.04, 0.31, 0.026, 0.022, BONE2, 5, { tex: crackTex });
    b.prz([[-0.27, 0.34], [-0.1, 0.4], [0.1, 0.4], [0.27, 0.34], [0.24, 0.22], [-0.24, 0.22]], -0.09, -0.07, SHROUD);   // the shroud's collar
    b.prz([[-0.02, 0.36], [0.03, 0.36], [0.045, 0.2], [0.02, 0.06], [-0.02, 0.2]], -0.104, -0.09, THROAT);   // and the split runs down into its chest
  }),
  part("neck", "body", (c) => {
    limb(c.b, 0, 0, -0.03, 0.1, 0.07, 0.06, SKIN, 6, { tex: veins });
    c.b.prz([[-0.03, -0.02], [0.034, -0.02], [0.05, 0.07], [0.018, 0.16], [-0.04, 0.07]], -0.092, -0.06, THROAT);   // the split down the front of it, glowing
  }),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.085, SKIN, 7)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.085, SKIN, 7)),
  // ---- the head: a skull with the face torn off its hinges ----
  part("head", "head", (c) => {
    const b = scaled(c.b, HK);
    b.prz([[-0.05, 0.0], [0.05, 0.0], [0.07, 0.06], [0.08, 0.15], [0.07, 0.24], [0.04, 0.3], [0.0, 0.32], [-0.04, 0.3], [-0.07, 0.24], [-0.08, 0.15], [-0.07, 0.06]], -0.09, 0.1, SKIN, { r1: 0.78, tex: veins });
    b.prz([[-0.075, 0.12], [-0.045, 0.1], [-0.015, 0.115], [-0.02, 0.165], [-0.045, 0.18], [-0.075, 0.16]], -0.1, -0.084, E.CAVITY); b.prz([[0.075, 0.12], [0.045, 0.1], [0.015, 0.115], [0.02, 0.165], [0.045, 0.18], [0.075, 0.16]], -0.1, -0.084, E.CAVITY);
    b.ball(-0.045, 0.14, -0.092, 0.01, TEETH, 4); b.ball(0.045, 0.14, -0.092, 0.01, TEETH, 4);   // eyes: two white points in the dark
    b.box(-0.012, 0.075, -0.1, 0.012, 0.115, -0.088, E.CAVITY);                                  // nose
    b.prz([[-0.07, 0.07], [-0.1, 0.03], [-0.095, -0.02], [-0.06, 0.0], [-0.055, 0.04]], -0.098, -0.086, E.MEAT);   // the cheeks, torn open to the ear
    b.prz([[0.07, 0.07], [0.1, 0.03], [0.095, -0.02], [0.06, 0.0], [0.055, 0.04]], -0.098, -0.086, E.MEAT);
    b.prz(MOUTH, -0.098, -0.02, THROAT);                                                         // the throat, lit
    b.prz(MOUTH.map(([x, y]) => [x * 0.55, y * 0.55 - 0.012] as [number, number]), -0.102, -0.098, E.CAVITY);   // and its dark
    for (let i = 0; i < 7; i++) b.box(-0.06 + i * 0.02, i % 2 ? 0.0 : -0.01, -0.104, -0.044 + i * 0.02, 0.04, -0.092, TEETH);   // upper teeth, a fence of them
  }),
  part("jaw", "head", (c) => {
    const b = scaled(c.b, HK);
    b.cbox(-0.065, -0.2, -0.1, 0.065, -0.07, 0.0, 0.015, SKIN, { tex: veins });                  // a long, loose jaw
    for (let i = 0; i < 6; i++) b.box(-0.052 + i * 0.0205, -0.082, -0.108, -0.034 + i * 0.0205, -0.03, -0.094, TEETH);
    b.box(-0.04, -0.12, -0.098, 0.04, -0.082, -0.04, E.MEAT);                                    // a tongue
    b.box(-0.07, -0.06, -0.09, -0.052, 0.0, 0.0, SKIN); b.box(0.052, -0.06, -0.09, 0.07, 0.0, 0.0, SKIN);
  }),
  ...armParts(WAILER_BODY, "lArm", {
    joint: 0.052,
    upper: { r0: 0.058, r1: 0.045, mat: SKIN, tex: veins, deco: (c, len) => limb(c.b, 0.015, -0.03, -len * 0.1, -len * 0.8, 0.008, 0.007, BONE2, 4) },
    fore: { r0: 0.044, r1: 0.034, mat: SKIN, tex: veins },
    hand,
  }),
  ...armParts(WAILER_BODY, "rArm", {
    joint: 0.052,
    upper: { r0: 0.058, r1: 0.045, mat: SKIN, tex: veins, deco: (c, len) => limb(c.b, -0.015, -0.03, -len * 0.1, -len * 0.8, 0.008, 0.007, BONE2, 4) },
    fore: { r0: 0.044, r1: 0.034, mat: SKIN, tex: veins },
    hand,
  }),
  ...(["L", "R"] as const).flatMap((s) => legParts(WAILER_BODY, s, {
    joint: 0.06,
    upper: { r0: 0.085, r1: 0.06, mat: SKIN, tex: veins },
    lower: { r0: 0.06, r1: 0.04, mat: SKIN, tex: veins, deco: (c, len) => limb(c.b, 0, -0.03, -len * 0.1, -len * 0.8, 0.009, 0.007, BONE2, 4) },
    foot: (c) => { c.b.cbox(-0.035, -0.032, -0.15, 0.035, 0.03, 0.03, 0.01, SKIN); for (let i = -1; i <= 1; i++) c.b.cyl(i * 0.02, -0.014, -0.19, -0.14, 0.008, 0.002, 4, BONE2); },
  })),
];

const O = { neck: 0.09, arm: 0.07, leg: 0.1, neckTop: 0.3, legLen: 0.3, armLen: 0.2 };

export const WAILER: Rig = {
  key: "s",
  palette: WAILER_PALETTE,
  frame: { w: 68, h: 97, worldH: 2.45, floor: 0.975, yaw: 0.35, pitch: 0.05, shift: 0.05 },
  crawlH: 12 / 17,
  joints, parts, stumps: humanStumps(O),
  poses: WAILER_POSES,
  walkStep: 0.13,
  regions: { W: 20, H: 17, head: 5, armTop: 6, armBot: 11, shoulder: 5.5 },
  partSpecs: humanPartSpecs(WAILER_BODY, O),
};

import type { Builder } from "../../render/viewmodel/builder";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, clothTex, crackTex, limb, meatTex, rodX, rodZ, scaled } from "./shapes";
import type { Ctx, Joint, PartCap, PartGroup, Rig, RigPart, Stump } from "./kit";
import { GHOUL_BODY, GHOUL_POSES, GHOUL_PART_POSES } from "./ghoulPoses";
import { humanJoints } from "./humanoid";

/**
 * THE ROTTING GHOUL (`z`), as a rig: the legacy sprite's identity —
 * sunken corpse face, cracked ribcage, entrails spilling — as a body.
 *
 * It keeps the legacy sprite's palette (`src/enemies/pixels/grunts.ts`: the
 * grey-green skin `g`/`G`/`a`, the bone `b`, the raw red `R`/`H`/`i`, the
 * dark rags `d`) and its proportions: tall, stooped, long arms ending in
 * claws, the head hung forward and low. Its head is the top of the frame
 * (the head `Hitscan` counts is the top 26% of the sprite), its arms hang
 * from the shoulders at about two thirds up, its legs are the bottom 28%.
 *
 * Units are rig metres, x right (screen), y up, z away from the viewer; the
 * ghoul faces -z. `L`/`R` are the screen's sides.
 */

const FLESH = FIRST_OWN, CLOTH = FIRST_OWN + 1, WOUND = FIRST_OWN + 2, RIB = FIRST_OWN + 3, GUT = FIRST_OWN + 4;
/** Its head is a third larger than a man's on that body: the sunken face is what the sprite is. */
const HEAD_K = 1.26;
const PI = Math.PI;

export const GHOUL_PALETTE = enemyPalette({
  // the legacy g / G / a: a grey-green corpse skin that goes black in the creases
  [FLESH]: { ramp: ["#121a0c", "#212c16", "#33412a", "#4a5a36", "#647b47", "#82a05c", "#a6c47c"], amb: .32, spec: .1 },
  // the legacy d: the rags it still wears
  [CLOTH]: { ramp: ["#0b0c08", "#151710", "#202418", "#2d3322", "#3d452e", "#515c3b"], amb: .3 },
  // the legacy R: the raw red the chest is, not a hole in it
  [WOUND]: { ramp: ["#2a0707", "#470d0a", "#6a150e", "#8f2012", "#b83219", "#dd4a28"], amb: .6, spec: .3, rim: true },
  // the legacy b, in the light: ribs and breastbone the eye finds at nine metres
  [RIB]:   { ramp: ["#4a4636", "#7a7458", "#aaa282", "#cfc7a2", "#ece5c2", "#fff9de"], amb: .5, spec: .3, rim: true },
  // viscera that shine: wet pink-red, bright where the light finds it
  [GUT]:   { ramp: ["#4a1224", "#7c1c38", "#b02c50", "#dd4a6c", "#f6789a", "#ffb4c8"], amb: .45, spec: .6, rim: true },
});

const joints: Joint[] = humanJoints(GHOUL_BODY);

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });

/** A rib: two bone segments curving out and back from the sternum, drooping; `broken` leaves the outer one snapped off. */
function rib(b: Builder, s: number, y: number, broken: boolean): void {
  b.push();
  b.translate(s * 0.014, y, -0.1);
  b.yaw(s * (PI / 2 - 0.3)); b.pitch(-0.12);
  b.cyl(0, 0, 0, 0.16, 0.018, 0.015, 5, RIB);
  if (!broken) {
    b.translate(0, 0, 0.16);
    b.yaw(s * -0.75); b.pitch(-0.28);
    b.cyl(0, 0, 0, 0.14, 0.015, 0.01, 5, RIB);
  } else {
    b.translate(0, 0, 0.16); b.yaw(s * -0.3); b.pitch(-0.5);
    b.cyl(0, 0, 0, 0.04, 0.015, 0.007, 4, RIB);   // a snapped end
  }
  b.pop();
}

/** One of the ghoul's arms at its shoulder: the upper arm, and below it the elbow, forearm and hand (their joints carry them). */
function upperArm(group: "lArm" | "rArm"): RigPart[] {
  const s = group === "lArm" ? -1 : 1, sh = group === "lArm" ? "shoulderL" : "shoulderR", el = group === "lArm" ? "elbowL" : "elbowR", wr = group === "lArm" ? "wristL" : "wristR";
  return [
    part(sh, group, (c) => {
      limb(c.b, 0, 0, 0, -0.3, 0.066, 0.047, FLESH, 7, { tex: blotchTex(1.1) });
      limb(c.b, s * 0.02, -0.036, -0.06, -0.2, 0.012, 0.01, E.BONE, 5);          // the bone showing through a tear
      c.b.box(s * 0.02 - 0.01, -0.15, -0.046, s * 0.02 + 0.01, -0.115, -0.034, E.MEAT);
    }),
    part(el, group, (c) => {
      c.b.ball(0, 0, 0, 0.052, FLESH, 6);
      rodZ(c.b, 0, 0, 0.02, 0.1, 0.014, 0.003, E.BONE, 4);                       // the point of the elbow, bare
      limb(c.b, 0, 0, 0, -0.27, 0.046, 0.034, FLESH, 7, { tex: blotchTex(1.4) });
      limb(c.b, 0, -0.03, -0.05, -0.25, 0.011, 0.009, E.BONE, 5, { tex: crackTex });  // the radius, laid bare
      c.b.box(-0.012, -0.16, -0.044, 0.012, -0.12, -0.03, E.MEAT, { tex: meatTex });
    }),
    part(wr, group, (c) => {
      const b = c.b, claw = c.x("claw");
      b.cbox(-0.046, -0.07, -0.032, 0.046, 0.005, 0.032, 0.012, FLESH);
      for (let i = -1; i <= 1; i++) {
        b.push(); b.translate(i * 0.027, -0.065, -0.005 * i * i);
        b.pitch(-0.25 - claw * 0.5); b.roll(i * -0.1);
        limb(b, 0, 0, 0, -0.055, 0.012, 0.009, FLESH, 5);
        b.translate(0, -0.055, 0); b.pitch(-0.3 - claw * 0.9);
        limb(b, 0, 0, 0, -0.1, 0.01, 0.0015, E.TOOTH, 5);                        // a long yellow claw
        b.pop();
      }
      b.push(); b.translate(s * 0.045, -0.025, -0.01); b.roll(s * -0.9); b.pitch(-0.2 - claw * 0.3);
      limb(b, 0, 0, 0, -0.045, 0.011, 0.008, FLESH, 5);
      b.translate(0, -0.045, 0); b.pitch(-0.4);
      limb(b, 0, 0, 0, -0.07, 0.009, 0.0015, E.TOOTH, 5);
      b.pop();
    }),
  ];
}

function leg(side: "L" | "R"): RigPart[] {
  const hip = "hip" + side, knee = "knee" + side, ankle = "ankle" + side, s = side === "L" ? -1 : 1;
  return [
    part(hip, "legs", (c) => {
      limb(c.b, 0, 0, 0, -0.41, 0.082, 0.058, FLESH, 7, { tex: blotchTex(0.9) });
      limb(c.b, 0, 0, 0, -0.27, 0.094, 0.088, CLOTH, 8, { tex: clothTex });          // what is left of the trouser
      c.b.box(s * 0.01 - 0.02, -0.29, -0.07, s * 0.01 + 0.02, -0.255, -0.03, CLOTH);  // its ragged hem
      c.b.box(s * -0.02 - 0.02, -0.3, 0.03, s * -0.02 + 0.02, -0.25, 0.07, CLOTH);
    }),
    part(knee, "legs", (c) => {
      c.b.ball(0, 0, 0, 0.064, FLESH, 6);
      limb(c.b, 0, 0, 0, -0.39, 0.055, 0.036, FLESH, 7, { tex: blotchTex(1.3) });
      limb(c.b, 0, -0.03, -0.07, -0.3, 0.013, 0.011, E.BONE, 5, { tex: crackTex });  // the shin, bare to the bone
      c.b.box(-0.014, -0.19, -0.045, 0.014, -0.14, -0.025, E.MEAT, { tex: meatTex });
    }),
    part(ankle, "legs", (c) => {
      const b = c.b;
      b.cbox(-0.046, -0.032, -0.14, 0.046, 0.034, 0.03, 0.012, FLESH, { tex: blotchTex(1.5) });
      for (let i = -1; i <= 1; i++) b.cyl(i * 0.022, -0.014, -0.18, -0.13, 0.009, 0.003, 4, E.TOOTH);   // toes with claws
    }),
  ];
}

const parts: RigPart[] = [
  // ---- the body ----
  part("pelvis", "body", (c) => {
    const b = c.b;
    b.cbox(-0.215, -0.08, -0.09, 0.215, 0.07, 0.085, 0.02, FLESH, { tex: blotchTex(1) });
    b.box(-0.235, -0.15, -0.12, 0.235, 0.0, -0.09, CLOTH, { tex: clothTex });              // the rag round its hips
  }),
  part("pelvis", "legs", (c) => {   // and the strips of it that hang down the legs: they go with them
    const b = c.b;
    b.prz([[-0.195, -0.15], [-0.104, -0.15], [-0.143, -0.36], [-0.182, -0.3]], -0.118, -0.09, CLOTH, { tex: clothTex });
    b.prz([[-0.065, -0.15], [0.039, -0.15], [0.0, -0.27], [-0.052, -0.23]], -0.118, -0.09, CLOTH, { tex: clothTex });
    b.prz([[0.078, -0.15], [0.195, -0.15], [0.208, -0.33], [0.13, -0.25]], -0.118, -0.09, CLOTH, { tex: clothTex });
  }),
  part("spine", "body", (c) => {
    const b = c.b, g = c.x("gut");
    b.cbox(-0.2, 0, -0.07, 0.2, 0.28, 0.08, 0.025, FLESH, { tex: blotchTex(1.1) });
    b.prz([[-0.104, 0.04], [0.078, 0.03], [0.13, 0.12], [0.117, 0.22], [0.0, 0.245], [-0.117, 0.22], [-0.13, 0.12]], -0.079, -0.066, WOUND);   // the wound in its belly, ragged
    b.prz([[-0.13, 0.22], [-0.026, 0.25], [0.065, 0.24], [0.052, 0.265], [-0.104, 0.275]], -0.085, -0.066, E.MEAT, { tex: meatTex });
    b.prz([[-0.13, 0.03], [0.13, 0.015], [0.156, 0.05], [-0.117, 0.07]], -0.085, -0.066, E.MEAT, { tex: meatTex });
    b.prz([[0.117, 0.1], [0.169, 0.12], [0.156, 0.22], [0.124, 0.2]], -0.085, -0.066, E.MEAT);
    // entrails spill out of it and hang, swinging with `gut`
    for (const [x0, n, r, mat] of [[0.0, 6, 0.052, GUT], [0.075, 4, 0.04, E.MEAT], [-0.075, 5, 0.038, GUT]] as const) {
      b.push(); b.translate(x0, 0.1, -0.085);
      for (let k = 0; k < n; k++) {
        b.roll(g * 0.3 * (k + 1) * (x0 < 0 ? -1 : 1) * 0.5 + (x0 === 0 ? (k % 2 ? 0.2 : -0.2) : 0.1));
        b.pitch(g * 0.06 * k);
        b.ball(0, -0.025, 0, r * (1 - k * 0.08), mat, 6);
        limb(b, 0, 0, -0.02, -0.075, r * 0.62, r * 0.55, mat, 6, { tex: meatTex });
        b.translate(0, -0.07, 0);
      }
      b.pop();
    }
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.305, 0, 0.0, 0.305, 0.33, 0.105, 0.035, FLESH, { tex: blotchTex(1) });             // the back and the sides
    b.prz([[-0.358, 0.26], [-0.169, 0.385], [0.169, 0.385], [0.358, 0.26], [0.305, 0.2], [-0.305, 0.2]], -0.06, 0.09, FLESH, { r1: 0.97, tex: blotchTex(1.2) });    // the hunched shoulders, raised round its neck
    b.prz([[-0.15, 0.04], [0.13, 0.035], [0.215, 0.12], [0.195, 0.27], [0.052, 0.3], [-0.13, 0.295], [-0.215, 0.2]], -0.083, -0.01, WOUND);   // the cavity the ribs close over: torn, not a window
    b.prz([[-0.156, 0.3], [-0.052, 0.31], [-0.104, 0.35], [-0.195, 0.33]], -0.092, -0.07, FLESH);          // flaps of skin left hanging off its edge
    b.prz([[0.13, 0.035], [0.221, 0.12], [0.26, 0.06], [0.182, 0.0]], -0.092, -0.07, E.MEAT);
    b.prz([[-0.215, 0.2], [-0.26, 0.12], [-0.221, 0.06], [-0.156, 0.1]], -0.092, -0.07, E.MEAT);
    limb(b, 0, -0.1, 0.04, 0.29, 0.024, 0.02, RIB, 5);                // the breastbone
    for (let k = 0; k < 5; k++) { const y = 0.065 + k * 0.052; rib(b, -1, y, (k + 3) % 5 === 1); rib(b, 1, y, k === 1); }
    b.ball(0.07, 0.17, -0.05, 0.06, GUT, 7);                                             // a heart, in plain view
    b.ball(0.095, 0.2, -0.062, 0.032, E.MEAT, 5);
    b.ball(-0.08, 0.1, -0.045, 0.046, E.MEAT, 6);
    for (let i = 0; i < 5; i++) b.ball(0, 0.04 + i * 0.065, 0.108, 0.025, E.BONE, 5);          // the spine's knuckles down its back
  }),
  part("neck", "body", (c) => { limb(c.b, 0, 0, -0.03, 0.08, 0.055, 0.045, FLESH, 7, { tex: blotchTex(1.4) }); c.b.box(-0.02, -0.01, -0.06, 0.02, 0.06, -0.045, E.SINEW); }),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.1, FLESH, 7)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.1, FLESH, 7)),
  // ---- the head ----
  part("head", "head", (c) => {
    const b = scaled(c.b, HEAD_K);
    b.prz([[-0.056, 0.0], [0.056, 0.0], [0.078, 0.05], [0.086, 0.12], [0.08, 0.2], [0.05, 0.26], [0.0, 0.29], [-0.05, 0.26], [-0.08, 0.2], [-0.086, 0.12], [-0.078, 0.05]], -0.095, 0.11, FLESH, { r1: 0.78, tex: blotchTex(1.6, 1, -1.2) });
    b.box(-0.09, 0.168, -0.104, 0.09, 0.182, -0.094, FLESH);                                   // the brow, a ridge
    b.box(-0.092, 0.07, -0.112, -0.058, 0.098, -0.098, FLESH); b.box(0.058, 0.07, -0.112, 0.092, 0.098, -0.098, FLESH);   // cheekbones
    b.prz([[-0.07, 0.115], [-0.045, 0.098], [-0.02, 0.112], [-0.018, 0.15], [-0.045, 0.165], [-0.072, 0.15]], -0.105, -0.092, E.CAVITY); b.prz([[0.07, 0.115], [0.045, 0.098], [0.02, 0.112], [0.018, 0.15], [0.045, 0.165], [0.072, 0.15]], -0.105, -0.092, E.CAVITY);   // sunken eyes
    b.box(-0.056, 0.122, -0.108, -0.034, 0.142, -0.104, E.EYE); b.box(0.034, 0.122, -0.108, 0.056, 0.142, -0.104, E.EYE);
    b.box(-0.013, 0.058, -0.114, 0.013, 0.1, -0.098, E.CAVITY);                                // no nose, a hole
    b.box(-0.06, 0.02, -0.108, -0.042, 0.062, -0.098, E.CAVITY); b.box(0.042, 0.02, -0.108, 0.06, 0.062, -0.098, E.CAVITY);   // hollow cheeks
    b.box(-0.062, -0.09, -0.104, 0.062, 0.004, -0.02, E.CAVITY);                               // the dark of its mouth, behind the teeth
    for (let i = 0; i < 6; i++) b.box(-0.054 + i * 0.0185, i % 2 ? -0.004 : -0.012, -0.112, -0.0385 + i * 0.0185, 0.034, -0.1, E.TOOTH);    // upper teeth, ragged
    b.box(0.02, 0.236, -0.06, 0.07, 0.262, 0.0, E.BONE, { tex: crackTex });                    // the skull showing through the scalp
    b.box(-0.115, 0.07, 0.0, -0.098, 0.12, 0.05, FLESH); b.box(0.098, 0.07, 0.0, 0.115, 0.12, 0.05, FLESH);        // ears
    for (const x of [-0.07, -0.02, 0.05]) limb(b, x, 0.09, 0.2, 0.0, 0.007, 0.002, E.SINEW, 4);   // a few strings of hair
  }),
  part("jaw", "head", (c) => {
    const b = scaled(c.b, HEAD_K);
    b.cbox(-0.066, -0.075, -0.108, 0.066, -0.04, 0.0, 0.012, FLESH, { tex: blotchTex(1.5) });   // the jawbone's underside
    b.cbox(-0.058, -0.095, -0.115, 0.058, -0.06, -0.06, 0.012, FLESH);                           // the chin
    b.box(-0.066, -0.045, -0.108, -0.05, 0.0, -0.0, FLESH); b.box(0.05, -0.045, -0.108, 0.066, 0.0, 0.0, FLESH);
    for (let i = 0; i < 5; i++) b.box(-0.05 + i * 0.0225, -0.04, -0.112, -0.032 + i * 0.0225, -0.012, -0.1, E.TOOTH);   // lower teeth
    b.box(-0.04, -0.055, -0.1, 0.04, -0.04, -0.04, E.MEAT);                                    // a tongue's worth of meat
  }),
  ...upperArm("lArm"), ...upperArm("rArm"),
  ...leg("L"), ...leg("R"),
];

const stumps: Stump[] = [
  { joint: "neck", group: "head", draw: (c) => {
    limb(c.b, 0, 0, 0.05, 0.12, 0.07, 0.058, E.MEAT, 7, { tex: meatTex });
    limb(c.b, 0, 0.0, 0.07, 0.19, 0.017, 0.013, E.BONE, 5);                                  // the spine's end, standing out of it
    c.b.box(-0.045, 0.1, -0.06, -0.015, 0.15, -0.03, E.SINEW); c.b.box(0.015, 0.1, 0.02, 0.045, 0.14, 0.05, E.ORGAN); c.b.box(0.02, 0.1, -0.06, 0.05, 0.13, -0.035, E.MEAT);
  } },
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "shoulder" + s, group: s === "L" ? "lArm" : "rArm", draw: (c) => {
    limb(c.b, 0, 0, 0.01, -0.11, 0.085, 0.07, E.MEAT, 7, { tex: meatTex });
    limb(c.b, 0.005, 0, -0.02, -0.19, 0.017, 0.013, E.BONE, 5);
    c.b.box(-0.04, -0.15, -0.06, -0.012, -0.1, -0.03, E.SINEW); c.b.box(0.02, -0.14, -0.05, 0.05, -0.1, -0.02, E.MEAT);
  } })),
  ...(["L", "R"] as const).map((s): Stump => ({ joint: "hip" + s, group: "legs", draw: (c) => {
    limb(c.b, 0, 0, 0, -0.12, 0.09, 0.075, E.MEAT, 7, { tex: meatTex });
    limb(c.b, 0, 0, -0.03, -0.2, 0.02, 0.015, E.BONE, 5);
    c.b.box(0.02, -0.16, -0.05, 0.05, -0.1, -0.02, E.SINEW); c.b.box(-0.05, -0.15, -0.05, -0.02, -0.1, -0.02, E.MEAT);
  } })),
];

const cap = (joint: string, draw: (c: Ctx) => void): PartCap => ({ joint, draw });

export const GHOUL: Rig = {
  key: "z",
  palette: GHOUL_PALETTE,
  frame: { w: 72, h: 100, worldH: 2.14, floor: 0.975, yaw: 0.5, pitch: 0.05, shift: 0.1 },
  crawlH: 17 / 24,
  joints, parts, stumps,
  poses: GHOUL_POSES,
  walkStep: 0.125,
  // the legacy 19 x 24 grid the gore code measures rows in: the head is the top quarter, the arms start at the shoulders
  regions: { W: 19, H: 24, head: 6, armTop: 8, armBot: 16, shoulder: 6.5 },
  partSpecs: {
    head: { group: "head", pose: GHOUL_PART_POSES.head, cap: cap("neck", (c) => {
      limb(c.b, 0, 0, -0.01, 0.06, 0.05, 0.044, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.0, -0.06, 0.014, 0.011, E.BONE, 5);
      limb(c.b, 0.03, 0.01, 0.03, -0.06, 0.008, 0.004, E.SINEW, 4); limb(c.b, -0.025, -0.01, 0.03, -0.05, 0.009, 0.004, E.ORGAN, 4);
    }) },
    lArm: { group: "lArm", pose: GHOUL_PART_POSES.arm, cap: cap("shoulderL", (c) => { limb(c.b, 0, 0, -0.01, 0.04, 0.05, 0.044, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.0, 0.11, 0.014, 0.011, E.BONE, 5); }) },
    rArm: { group: "rArm", pose: GHOUL_PART_POSES.arm, cap: cap("shoulderR", (c) => { limb(c.b, 0, 0, -0.01, 0.04, 0.05, 0.044, E.MEAT, 7, { tex: meatTex }); limb(c.b, 0, 0, 0.0, 0.11, 0.014, 0.011, E.BONE, 5); }) },
    legs: { group: "legs", pose: GHOUL_PART_POSES.legs, cap: cap("pelvis", (c) => {
      for (const x of [-0.115, 0.115]) { limb(c.b, x, 0, -0.04, 0.02, 0.066, 0.06, E.MEAT, 7, { tex: meatTex }); limb(c.b, x, 0, -0.03, 0.09, 0.016, 0.012, E.BONE, 5); }
      rodX(c.b, -0.115, 0.115, -0.03, 0.0, 0.03, 0.03, E.MEAT, 6);
    }) },
  },
};

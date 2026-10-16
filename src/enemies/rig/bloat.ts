import type { Builder } from "../../render/viewmodel/builder";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, limb } from "./shapes";
import type { Ctx, Joint, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { BLOAT_BODY, BLOAT_POSES } from "./bloatPoses";

/**
 * THE PLAGUE BLOAT (`t`): grotesquely swollen, split rind, weeping bile.
 *
 * Its legacy sprite (`src/enemies/pixels/grunts.ts`) is the widest of the horde
 * — a barrel of sick green with a yellow-green gash down it, a tiny head sunk
 * between the shoulders, and bile everywhere. The rig keeps that: a belly the
 * width of the sprite, the rind (`t`, `I`), the bright bile (`Y`, `H`: here
 * emissive, so it glows in the dark the way nothing else on the floor does),
 * stub legs, short fat arms ending in clubs, and a head that is mostly mouth.
 * It spits (`range`, `toxic`): the wind-up swells the belly and throws the head
 * back, the strike thrusts it forward with a stream of bile, and when it dies
 * the belly bursts (`burst`) and the rest is a puddle.
 *
 * Its head is the top of the frame (`Hitscan`'s top 26%): about .76 of the way up.
 */

const RIND = FIRST_OWN, CRUST = FIRST_OWN + 1, BILE = FIRST_OWN + 2;

export const BLOAT_PALETTE = enemyPalette({
  // the legacy t / I: rind that goes black in the splits
  [RIND]:  { ramp: ["#0f1a09", "#1c2d10", "#2c4619", "#42632a", "#5b8238", "#79a64c", "#9ccb6a"], amb: .34, spec: .08 },
  [CRUST]: { ramp: ["#070d05", "#0e1a09", "#16290e", "#213c15", "#2f5220", "#436b2c"], amb: .3 },
  // the legacy Y / H: bile that shines on its own
  [BILE]:  { ramp: ["#587c10", "#74a018", "#8cc01e", "#a4d826", "#b8e82e", "#c6f23a"], emissive: true },
});

const part = (joint: string, group: RigPart["group"], draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });

/** A boil: a dark ring of rind with a bright head of bile in it. */
function boil(b: Builder, x: number, y: number, z: number, r: number): void {
  b.ball(x, y, z, r * 1.25, CRUST, 6);
  b.ball(x, y, z - r * 0.5, r * 0.8, BILE, 5);
}

/** The gash down the belly, and the bile that weeps from it. `burst` (0..1) tears it open; `bile` swings the drips. */
function gash(b: Builder, burst: number, bile: number): void {
  const k = 1.7 + burst * 3.2, z0 = -0.466, z1 = -0.43;
  const poly = (s: number): Array<[number, number]> => [[-0.02 * s, 0.52], [0.06 * s, 0.43], [0.085 * s, 0.31], [0.065 * s, 0.15], [0.09 * s, 0.0], [0.0, -0.13], [-0.085 * s, -0.01], [-0.065 * s, 0.16], [-0.09 * s, 0.32], [-0.055 * s, 0.44]];
  b.prz(poly(k * 1.5), z0 + 0.012, z1, CRUST);                                                // the rind's lips
  b.prz(poly(k), z0, z1, BILE);                                                               // the bile in it
  b.prz([[-0.01, 0.46], [0.03, 0.38], [0.02, 0.22], [-0.03, 0.3]], z0 - 0.012, z0, E.SINEW);       // a strand across it
  for (const [x, y, r] of [[-0.27, 0.4, 0.07], [0.29, 0.5, 0.055], [-0.4, 0.14, 0.085], [0.38, 0.06, 0.075], [0.18, 0.3, 0.05], [-0.2, -0.08, 0.06], [0.38, 0.4, 0.05], [-0.34, 0.45, 0.04], [0.22, -0.14, 0.05], [-0.44, -0.1, 0.05]] as const) boil(b, x, y, -0.42, r);
  for (const [x, len, r] of [[-0.03, 0.34, 0.034], [0.06, 0.24, 0.028], [-0.1, 0.17, 0.024]] as const) {   // bile weeps from it and hangs
    b.push(); b.translate(x * k, -0.1, -0.44); b.roll(bile * 0.25 * (x < 0 ? -1 : 1)); b.pitch(-bile * 0.12);
    limb(b, 0, 0, 0, -len, r, r * 0.6, BILE, 5); b.ball(0, -len, 0, r * 1.5, BILE, 5);
    b.pop();
  }
  if (burst > 0.05) for (const s of [-1, 1]) {                                                 // the rind peeled back off it
    b.push(); b.translate(s * 0.1 * k, 0.32, -0.4); b.roll(s * burst * 1.0);
    b.box(s * 0.02, -0.26, -0.06, s * 0.2, 0.26, 0.0, CRUST, { tex: blotchTex(1.4) });
    b.pop();
  }
}

const joints: Joint[] = humanJoints(BLOAT_BODY);

const parts: RigPart[] = [
  part("pelvis", "body", (c) => {
    c.b.cbox(-0.3, -0.14, -0.2, 0.3, 0.1, 0.24, 0.07, RIND, { tex: blotchTex(1) });
  }),
  part("spine", "body", (c) => {
    const b = c.b, bile = c.x("bile");
    b.cbox(-0.52, -0.3, -0.44, 0.52, 0.36, 0.4, 0.26, RIND, { tex: blotchTex(1.2) });            // the belly, hanging over its hips
    b.cbox(-0.42, 0.2, -0.44, 0.42, 0.66, 0.3, 0.18, RIND, { tex: blotchTex(1.7, 1, -1) });     // and the swell over it
    gash(b, c.x("burst"), bile);
    b.prz([[-0.5, 0.2], [-0.35, 0.17], [-0.15, 0.2], [0.0, 0.17], [0.2, 0.19], [0.5, 0.17], [0.5, 0.13], [-0.5, 0.13]], -0.455, -0.43, CRUST);   // the fold across the belly
  }),
  part("chest", "body", (c) => {
    c.b.cbox(-0.3, 0.02, -0.14, 0.3, 0.3, 0.2, 0.08, RIND, { tex: blotchTex(1.4) });
    c.b.ball(-0.28, 0.2, -0.04, 0.17, RIND, 7); c.b.ball(0.28, 0.2, -0.04, 0.17, RIND, 7);       // sloping shoulders
    boil(c.b, -0.3, 0.26, -0.16, 0.05); boil(c.b, 0.16, 0.14, -0.15, 0.04);
  }),
  part("neck", "body", (c) => limb(c.b, 0, -0.02, -0.04, 0.11, 0.14, 0.11, RIND, 7, { tex: blotchTex(1.4) })),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.13, RIND, 7)),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.13, RIND, 7)),
  // ---- the head: small, set low, mostly mouth ----
  part("head", "head", (c) => {
    const b = c.b, sp = c.x("spew");
    b.cbox(-0.15, 0.0, -0.12, 0.15, 0.24, 0.14, 0.06, RIND, { tex: blotchTex(1.6) });
    b.box(-0.16, 0.15, -0.135, 0.16, 0.18, -0.115, CRUST);                                      // the brow
    b.box(-0.12, 0.1, -0.135, -0.04, 0.15, -0.115, CRUST); b.box(0.04, 0.1, -0.135, 0.12, 0.15, -0.115, CRUST);   // sockets
    b.box(-0.095, 0.108, -0.142, -0.05, 0.138, -0.13, BILE); b.box(0.05, 0.108, -0.142, 0.095, 0.138, -0.13, BILE);    // eyes that shine
    b.box(-0.1, 0.0, -0.13, 0.1, 0.075, -0.1, E.CAVITY);                                        // the mouth
    for (let i = 0; i < 5; i++) b.box(-0.085 + i * 0.037, 0.05, -0.138, -0.062 + i * 0.037, 0.082, -0.12, E.TOOTH);
    b.prz([[-0.15, 0.2], [-0.07, 0.26], [0.08, 0.27], [0.15, 0.2]], 0.02, 0.1, CRUST);          // a scab of scalp
    if (sp > 0.02) for (let k = 0; k < 6; k++) b.ball(0.01 * k, 0.02 - k * 0.012, -0.15 - k * 0.1 * sp, 0.03 + k * 0.009 * sp, BILE, 5);   // bile out of it
  }),
  part("jaw", "head", (c) => {
    const b = c.b, sp = c.x("spew");
    b.cbox(-0.13, -0.09, -0.12, 0.13, 0.0, 0.1, 0.04, RIND, { tex: blotchTex(1.3) });
    for (let i = 0; i < 4; i++) b.box(-0.07 + i * 0.045, -0.012, -0.132, -0.05 + i * 0.045, 0.02, -0.115, E.TOOTH);
    b.box(-0.07, -0.05, -0.12, 0.07, -0.02, -0.06, BILE);                                      // a tongue of it
    if (sp > 0.02) b.box(-0.03, -0.1 - 0.1 * sp, -0.12, 0.03, -0.06, -0.1, BILE);
  }),
  ...armParts(BLOAT_BODY, "lArm", {
    joint: 0.1,
    upper: { r0: 0.13, r1: 0.1, mat: RIND, tex: blotchTex(1.1), deco: (c) => boil(c.b, 0.0, -0.12, -0.1, 0.04) },
    fore: { r0: 0.1, r1: 0.085, mat: RIND, tex: blotchTex(1.4) },
    hand: (c) => { c.b.ball(0, -0.07, 0, 0.115, RIND, 7); c.b.ball(0.0, -0.1, -0.09, 0.05, CRUST, 5); boil(c.b, 0.06, -0.06, -0.1, 0.03); },
  }),
  ...armParts(BLOAT_BODY, "rArm", {
    joint: 0.1,
    upper: { r0: 0.13, r1: 0.1, mat: RIND, tex: blotchTex(1.1), deco: (c) => boil(c.b, 0.0, -0.14, -0.1, 0.045) },
    fore: { r0: 0.1, r1: 0.085, mat: RIND, tex: blotchTex(1.4) },
    hand: (c) => { c.b.ball(0, -0.07, 0, 0.115, RIND, 7); c.b.ball(0.0, -0.1, -0.09, 0.05, CRUST, 5); boil(c.b, -0.06, -0.06, -0.1, 0.03); },
  }),
  ...(["L", "R"] as const).flatMap((s) => legParts(BLOAT_BODY, s, {
    joint: 0.12,
    upper: { r0: 0.15, r1: 0.1, mat: RIND, tex: blotchTex(1) },
    lower: { r0: 0.1, r1: 0.075, mat: RIND, tex: blotchTex(1.3), deco: (c) => { c.b.box(-0.09, -0.2, -0.1, 0.09, -0.15, 0.1, CRUST); } },
    foot: (c) => { c.b.cbox(-0.085, -0.045, -0.2, 0.085, 0.035, 0.05, 0.03, RIND); },
  })),
];

const O = { neck: 0.1, arm: 0.1, leg: 0.11 };

export const BLOAT: Rig = {
  key: "t",
  palette: BLOAT_PALETTE,
  frame: { w: 79, h: 104, worldH: 1.95, floor: 0.975, yaw: 0.3, pitch: 0.05, shift: 0.02 },
  crawlH: 12 / 17,
  joints, parts, stumps: humanStumps(O),
  poses: BLOAT_POSES,
  walkStep: 0.14,
  // the legacy 20 x 17 grid the gore code measures rows in
  regions: { W: 20, H: 17, head: 6, armTop: 7, armBot: 12, shoulder: 6.5 },
  partSpecs: humanPartSpecs(BLOAT_BODY, O),
};


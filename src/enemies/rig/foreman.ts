import type { Builder } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";
import { FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, limb, rodZ } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { FOREMAN_BODY, FOREMAN_POSES } from "./foremanPoses";

/**
 * THE FACTORY FOREMAN (`V`, a boss): it never clocked out.
 *
 * The legacy sprite is a steel helmet (`M`) with two orange lights in it (`0`), a body of drab hide (`g`) with a dark red band
 * (`R`) and two cannon arms of gunmetal (`T`) with the orange at their muzzles. The rig is a man the factory finished: a welded
 * helmet with a slit of furnace-light, his chest opened and a firebox set in it behind a grille (`heat`), plates of iron bolted
 * over the hide, pipes running from the firebox to his back where two stacks smoke, and his forearms gone into the barrels of two
 * cannons, the orange in their muzzles when he fires. In his last phase the firebox bursts (`./foreman2.ts`).
 */

export const HIDE = FIRST_OWN, STEEL = FIRST_OWN + 1, GUNMETAL = FIRST_OWN + 2, FIRE = FIRST_OWN + 3, RUST = FIRST_OWN + 4, SOOT = FIRST_OWN + 5, BRASS = FIRST_OWN + 6;

export const FOREMAN_PALETTE = enemyPalette({
  // the legacy g: hide the colour of old canvas, grey-brown
  [HIDE]:     { ramp: ["#1a160e", "#2e2618", "#463a24", "#5e4f32", "#7a6a4a", "#968660", "#b2a278"], amb: .44, spec: .2 },
  // the legacy M: the helmet's and the plates' steel
  [STEEL]:    { ramp: ["#1a191c", "#2a292e", "#3c3b42", "#504f58", "#66626e", "#807c88", "#9c98a4"], amb: .46, spec: .55, rim: true },
  // the legacy T: the cannons
  [GUNMETAL]: { ramp: ["#121214", "#1e1e22", "#2c2c32", "#3c3c44", "#4a4a52", "#5e5e68", "#76767e"], amb: .44, spec: .6, rim: true },
  // the legacy 0: the furnace's light
  [FIRE]:     { ramp: ["#7a2008", "#b8400e", "#e0601a", "#ff8020", "#ffb050"], emissive: true },
  // the legacy R
  [RUST]:     { ramp: ["#1e0a06", "#3a1810", "#5a2616", "#7a361e", "#9a4828"], amb: .42, spec: .25 },
  [SOOT]:     { ramp: ["#0c0b0a", "#161412", "#201e1b", "#2c2925"], amb: .5 },
  [BRASS]:    { ramp: ["#2a1e08", "#4a3610", "#6e5218", "#927024", "#b48e34"], amb: .44, spec: .6, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
export const grime = blotchTex(0.6, 1.3, -1.5);
export const scratch: TexFn = (x, y, z) => (Math.sin(x * 83 + y * 41 + Math.sin(z * 27) * 1.6) > 0.98 ? -1.2 : 0);

export const bolt = (b: Builder, x: number, y: number, z: number): void => b.ball(x, y, z, 0.016, BRASS, 4);

/** The firebox in the chest behind its grille: `heat` 0..1 how bright, `open` blows the grille off it. */
export function firebox(b: Builder, heat: number, open: number): void {
  b.cbox(-0.17, 0.05, -0.2, 0.17, 0.3, -0.12, 0.02, SOOT);
  b.cbox(-0.14, 0.08, -0.215, 0.14, 0.27, -0.19, 0.01, FIRE);
  if (heat > 0.5) b.ball(0, 0.17, -0.22, 0.06 + heat * 0.04, FIRE, 6);
  if (open < 0.5) for (let i = 0; i < 6; i++) b.box(-0.15 + i * 0.058, 0.06, -0.23, -0.135 + i * 0.058, 0.29, -0.215, STEEL);   // the grille
  b.cbox(-0.19, 0.03, -0.24, 0.19, 0.06, -0.12, 0.01, STEEL); b.cbox(-0.19, 0.28, -0.24, 0.19, 0.31, -0.12, 0.01, STEEL);
}

/** A cannon, in the forearm's frame from the elbow down: a barrel where the hand was, its breech, the light in its muzzle (`fire`). */
export function cannon(b: Builder, len: number, fire: number): void {
  b.cbox(-0.1, -len * 0.5, -0.1, 0.1, 0.02, 0.1, 0.03, GUNMETAL, { tex: scratch });                    // the breech, bolted on the arm
  for (const y of [-0.05, -len * 0.4]) for (const s of [-1, 1]) bolt(b, s * 0.07, y, -0.105);
  limb(b, 0, 0, -len * 0.5, -len - 0.22, 0.075, 0.065, GUNMETAL, 8, { tex: scratch });                  // the barrel
  for (const y of [-len * 0.7, -len - 0.05]) limb(b, 0, 0, y, y - 0.04, 0.085, 0.085, STEEL, 8);         // its bands
  limb(b, 0, 0, -len - 0.22, -len - 0.24, 0.085, 0.085, STEEL, 8);
  b.push(); b.translate(0, -len - 0.24, 0); b.pitch(Math.PI / 2); b.cyl(0, 0, -0.005, 0.0, 0.05, 0.05, 8, fire > 0.1 ? FIRE : SOOT); b.pop();   // the muzzle's mouth
  if (fire > 0) b.ball(0, -len - 0.3, 0, 0.05 + fire * 0.08, FIRE, 6);
}

const joints: Joint[] = humanJoints(FOREMAN_BODY);

export const FOREMAN_PARTS: RigPart[] = [
  part("pelvis", "body", (c) => {
    c.b.cbox(-0.3, -0.12, -0.18, 0.3, 0.1, 0.17, 0.05, HIDE, { tex: grime });
    c.b.cbox(-0.32, -0.04, -0.2, 0.32, 0.04, 0.19, 0.015, RUST);                                   // the legacy R: a belt of it
    for (const x of [-0.22, 0, 0.22]) bolt(c.b, x, 0.0, -0.205);
  }),
  part("pelvis", "legs", (c) => { for (const s of [-1, 1]) c.b.prz([[s * 0.06, -0.05], [s * 0.3, -0.05], [s * 0.3, -0.3], [s * 0.08, -0.34]], -0.2, -0.16, STEEL, { tex: scratch }); }),   // the tassets
  part("spine", "body", (c) => {
    c.b.cbox(-0.28, 0, -0.17, 0.28, 0.3, 0.16, 0.06, HIDE, { tex: grime });
    for (let i = 0; i < 3; i++) c.b.cbox(-0.27, 0.02 + i * 0.09, -0.185, 0.27, 0.08 + i * 0.09, -0.16, 0.01, i % 2 ? RUST : STEEL, { tex: scratch });
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.cbox(-0.38, 0, -0.17, 0.38, 0.4, 0.18, 0.08, HIDE, { tex: grime });
    for (const s of [-1, 1]) { b.cbox(s * 0.2 - 0.12, 0.02, -0.2, s * 0.2 + 0.12, 0.38, -0.15, 0.03, STEEL, { tex: scratch }); for (const y of [0.06, 0.34]) bolt(b, s * 0.28, y, -0.205); }
    firebox(b, c.x("heat"), c.x("open"));
    // pipes from the firebox over the shoulders to the stacks on its back, and the stacks smoking
    for (const s of [-1, 1]) {
      b.push(); b.translate(s * 0.15, 0.32, -0.15); rodZ(b, 0, 0, 0, 0.3, 0.03, 0.03, BRASS, 6); b.pop();
      b.push(); b.translate(s * 0.18, 0.3, 0.2); limb(b, 0, 0, 0, 0.42, 0.06, 0.055, SOOT, 7); limb(b, 0, 0, 0.42, 0.46, 0.07, 0.07, STEEL, 7);
      for (let i = 0; i < 3; i++) b.ball(s * 0.02 + Math.sin(i * 2 + s) * 0.03, 0.56 + i * 0.1, 0.0, 0.05 + i * 0.02, SOOT, 5);
      b.pop();
    }
  }),
  part("neck", "body", (c) => limb(c.b, 0, 0, -0.02, 0.1, 0.12, 0.11, STEEL, 7)),
  part("shoulderL", "body", (c) => pauldron(c.b)),
  part("shoulderR", "body", (c) => pauldron(c.b)),
  // ---- the head: a welded helmet, the furnace-light in its slit ----
  part("head", "head", (c) => {
    const b = c.b;
    b.cbox(-0.15, -0.03, -0.15, 0.15, 0.27, 0.15, 0.05, STEEL, { tex: scratch });
    b.cbox(-0.155, 0.12, -0.16, 0.155, 0.135, 0.155, 0.005, SOOT);                                   // its weld seam
    b.box(-0.12, 0.15, -0.165, 0.12, 0.2, -0.14, SOOT);
    b.box(-0.1, 0.16, -0.17, -0.03, 0.19, -0.155, FIRE); b.box(0.03, 0.16, -0.17, 0.1, 0.19, -0.155, FIRE);   // the legacy 0
    for (let i = 0; i < 5; i++) b.box(-0.08 + i * 0.04 - 0.01, 0.0, -0.165, -0.08 + i * 0.04 + 0.01, 0.1, -0.15, SOOT);   // its breather's slots
    for (const x of [-0.12, 0.12]) for (const y of [0.03, 0.24]) bolt(b, x, y, -0.155);
    b.push(); b.translate(0, 0.28, 0); limb(b, 0, 0, 0, 0.06, 0.05, 0.05, BRASS, 6); b.ball(0, 0.08, 0, 0.03, FIRE, 4); b.pop();   // a lamp on its crown
  }),
  ...armParts(FOREMAN_BODY, "lArm", armSpec()),
  ...armParts(FOREMAN_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(FOREMAN_BODY, s, {
    joint: 0.12,
    upper: { r0: 0.14, r1: 0.12, mat: HIDE, tex: grime, deco: (c, len) => c.b.cbox(-0.14, -len * 0.8, -0.15, 0.14, -len * 0.25, 0.13, 0.03, STEEL, { tex: scratch }) },
    lower: { r0: 0.12, r1: 0.1, mat: HIDE, tex: grime, deco: (c, len) => c.b.cbox(-0.12, -len * 0.95, -0.14, 0.12, -len * 0.15, 0.12, 0.03, GUNMETAL, { tex: scratch }) },
    foot: (c) => { c.b.cbox(-0.1, -0.06, -0.24, 0.1, 0.06, 0.08, 0.03, GUNMETAL, { tex: scratch }); c.b.box(-0.1, -0.06, -0.25, 0.1, -0.03, -0.22, STEEL); },
  })),
];

function pauldron(b: Builder): void {
  b.ball(0, 0.02, 0, 0.17, STEEL, 8, { tex: scratch });
  b.cbox(-0.19, -0.04, -0.17, 0.19, 0.0, 0.16, 0.02, RUST);
  bolt(b, 0, 0.16, -0.06);
}

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.12,
    upper: { r0: 0.13, r1: 0.12, mat: HIDE, tex: grime, deco: (c, len) => c.b.cbox(-0.14, -len * 0.85, -0.14, 0.14, -len * 0.3, 0.14, 0.03, STEEL, { tex: scratch }) },
    fore: { r0: 0.12, r1: 0.1, mat: HIDE, tex: grime, deco: (c, len) => cannon(c.b, len, c.x("fire")) },
    hand: () => {},
  };
}

export const O = { neck: 0.12, arm: 0.13, leg: 0.14, neckTop: 0.16, armLen: 0.22, legLen: 0.22 };

export const FOREMAN: Rig = {
  key: "V",
  palette: FOREMAN_PALETTE,
  frame: { w: 81, h: 100, worldH: 2.5, floor: 0.975, yaw: 0.38, pitch: 0.05, shift: 0.0 },
  crawlH: 8 / 12,
  joints, parts: FOREMAN_PARTS, stumps: humanStumps(O),
  poses: FOREMAN_POSES,
  walkStep: 0.15,
  regions: { W: 15, H: 12, head: 4, armTop: 4, armBot: 8, shoulder: 4.5 },
  partSpecs: humanPartSpecs(FOREMAN_BODY, O),
};

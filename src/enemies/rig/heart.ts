import type { Builder } from "../../render/viewmodel/builder";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, limb, meatTex, scaled } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { HEART_BODY, HEART_POSES } from "./heartPoses";

/**
 * THE LIVING HEART (`G`, the last boss): the whole place was one body, and this was its heart.
 *
 * The legacy sprite is a heart of muscle red (`R`, `S`, `W`), veins of a darker red (`v`) and an open ventricle (`i`, `I`) in its
 * middle. The rig is a heart the size of a house's door, beating (`beat`): the two great lobes and the apex, the coronary vessels
 * over it, fat in its grooves, the aorta and the great veins arching off its top and torn open there; the ventricle in its face
 * opened into a mouth, a ring of teeth in it (`gape`); two arteries off its sides that lash like arms and end in torn mouths that
 * spit; veins down from its base into the floor like roots, which are what it stands on. When it ruptures it is `./heart2.ts`.
 */

export const MUSCLE = FIRST_OWN, VEIN = FIRST_OWN + 1, BRIGHT = FIRST_OWN + 2, FAT = FIRST_OWN + 3, HOLLOW = FIRST_OWN + 4, VESSEL = FIRST_OWN + 5, PULSE = FIRST_OWN + 6;

export const HEART_PALETTE = enemyPalette({
  // the legacy R / S: heart muscle
  [MUSCLE]: { ramp: ["#2a0606", "#480c0a", "#6a140e", "#8c1e14", "#ac2c1e", "#c8402c", "#e05a40"], amb: .48, spec: .55, rim: true },
  // the legacy v: the veins over it
  [VEIN]:   { ramp: ["#1a0608", "#300a10", "#4a1018", "#5a1410", "#782030"], amb: .46, spec: .5 },
  // the legacy W: where the light is wet on it
  [BRIGHT]: { ramp: ["#7a2418", "#a83a28", "#cc4c38", "#e06050", "#f08070"], amb: .55, spec: .7, rim: true },
  // the fat in its grooves
  [FAT]:    { ramp: ["#5a4a20", "#86702e", "#b09640", "#d2b85a", "#ecd47a"], amb: .5, spec: .4 },
  // the legacy i / I: the ventricle, opened
  [HOLLOW]: { ramp: ["#140202", "#2a0606", "#3a0a0a", "#4e0e0e"], amb: .6 },
  // the great vessels: paler, ribbed
  [VESSEL]: { ramp: ["#3a1018", "#5a1a24", "#7c2a34", "#9e3c44", "#c05458", "#d87070"], amb: .48, spec: .45, rim: true },
  // the beat: a red light inside it
  [PULSE]:  { ramp: ["#7a0808", "#b01010", "#e02018", "#ff4030", "#ff8060"], emissive: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
export const wet = blotchTex(0.5, 1.3, -1.2);

/** The heart itself, centred on the chest joint, swelling with `beat`; its ventricle opened `gape`. */
export function heartBody(c: Ctx): void {
  const beat = c.x("beat"), gape = c.x("gape"), b = scaled(c.b, 1 + beat * 0.06);
  b.ball(-0.17, 0.14, 0.0, 0.4, MUSCLE, 11, { tex: wet });                 // the left lobe
  b.ball(0.2, 0.2, 0.04, 0.34, MUSCLE, 10, { tex: wet });                  // the right
  for (let i = 0; i < 5; i++) b.ball(-0.03 + i * 0.01, -0.14 - i * 0.11, -0.04 + i * 0.02, 0.36 - i * 0.065, MUSCLE, 9, { tex: wet });   // down to the apex
  // the groove between the ventricles, the fat in it, the coronary vessels over it
  b.push(); b.translate(0.04, 0.0, -0.36); b.roll(-0.25);
  b.cbox(-0.03, -0.4, -0.02, 0.03, 0.35, 0.03, 0.02, VEIN); for (let i = 0; i < 5; i++) b.ball(0.0, -0.32 + i * 0.15, -0.02, 0.035, FAT, 4);   // the groove, fat beaded along it
  b.pop();
  for (const [x, y, a, l] of [[-0.3, 0.2, 1.1, 0.3], [-0.24, -0.05, 1.4, 0.25], [0.28, 0.25, -1.2, 0.25], [0.22, 0.0, -1.5, 0.22], [-0.1, -0.35, 0.6, 0.2]] as const) {
    b.push(); b.translate(x, y, -0.34 + Math.abs(x) * 0.25); b.roll(a); limb(b, 0, 0, 0, l, 0.022, 0.012, VEIN, 4); b.pop();
  }
  b.ball(-0.24, 0.32, -0.26, 0.06, BRIGHT, 5); b.ball(0.26, 0.36, -0.2, 0.05, BRIGHT, 5);   // the wet light on it
  // the ventricle in its face, opened into a mouth with a ring of teeth
  const r = 0.09 + gape * 0.08, n = 12;
  const ring = (k: number): Array<[number, number]> => Array.from({ length: n }, (_, i) => [-0.06 + Math.cos((i / n) * Math.PI * 2) * r * k, 0.02 + Math.sin((i / n) * Math.PI * 2) * r * 1.3 * k] as [number, number]);
  b.prz(ring(1.35), -0.43, -0.36, BRIGHT);
  b.prz(ring(1), -0.44, -0.34, HOLLOW);
  if (beat > 0.3 || gape > 0.5) b.prz(ring(0.4), -0.445, -0.43, PULSE);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = -0.06 + Math.cos(a) * r * 1.05, y = 0.02 + Math.sin(a) * r * 1.35; b.push(); b.translate(x, y, -0.445); b.roll(a + Math.PI / 2); b.prz([[-0.015, 0], [0.015, 0], [0, -0.05]], -0.005, 0.005, E.TOOTH); b.pop(); }
}

/** One of the great vessels off its top: a ribbed tube arching up and over, torn open at its end. */
export function vessel(b: Builder, x: number, z: number, lean: number, len: number, r: number): void {
  b.push(); b.translate(x, 0, z); b.roll(lean);
  limb(b, 0, 0, 0, len * 0.6, r, r * 0.9, VESSEL, 8, { tex: wet });
  for (let i = 1; i < 4; i++) limb(b, 0, 0, len * 0.15 * i, len * 0.15 * i + 0.02, r * 1.08, r * 1.08, VEIN, 8);
  b.translate(0, len * 0.6, 0); b.roll(lean * 0.8);
  limb(b, 0, 0, 0, len * 0.4, r * 0.9, r * 0.85, VESSEL, 8, { tex: wet });
  b.translate(0, len * 0.4, 0);
  limb(b, 0, 0, 0, 0.02, r * 0.95, r * 0.95, E.MEAT, 8); b.ball(0, 0.01, 0, r * 0.6, HOLLOW, 6);   // torn open, the dark in it
  b.pop();
}

const joints: Joint[] = humanJoints(HEART_BODY);

export const HEART_PARTS: RigPart[] = [
  part("pelvis", "body", (c) => c.b.ball(0, 0.05, 0, 0.2, MUSCLE, 7, { tex: wet })),
  part("pelvis", "legs", (c) => {   // a mass of veins out of its base, down into the floor: what it stands on with its two great ones
    const b = c.b;
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + (i / 6) * 2.4, l = 0.55 + 0.15 * Math.abs(Math.sin(i * 1.9));
      b.push(); b.translate(Math.sin(a) * 0.12, 0.0, Math.cos(a * 2) * 0.05); b.roll(a * 0.55); b.pitch(Math.sin(i * 2.3) * 0.3);
      limb(b, 0, 0, 0, -l * 0.6, 0.06, 0.04, VEIN, 5, { tex: wet }); b.translate(0, -l * 0.6, 0); b.roll(a * 0.4); limb(b, 0, 0, 0, -l * 0.45, 0.04, 0.012, VEIN, 5);
      b.pop();
    }
  }),
  part("chest", "body", heartBody),
  part("head", "head", (c) => {   // the aorta and the great veins off its top
    const b = c.b, beat = 1 + c.x("beat") * 0.08;
    vessel(b, -0.12, 0.05, -0.35, 0.4 * beat, 0.11); vessel(b, 0.12, -0.02, 0.45, 0.32 * beat, 0.09); vessel(b, 0.0, 0.12, 0.05, 0.42 * beat, 0.08);
  }),
  ...armParts(HEART_BODY, "lArm", armSpec()),
  ...armParts(HEART_BODY, "rArm", armSpec()),
  // the veins from its base into the floor, the roots it stands on: they go with the "legs"
  ...(["L", "R"] as const).flatMap((s) => legParts(HEART_BODY, s, {
    joint: 0.08,
    upper: { r0: 0.08, r1: 0.06, mat: VEIN, tex: wet },
    lower: { r0: 0.06, r1: 0.05, mat: VEIN, tex: wet },
    foot: (c) => { const b = c.b; for (let i = -2; i <= 2; i++) { b.push(); b.roll(i * 0.45); b.pitch(0.3); limb(b, 0, 0, 0, -0.18, 0.04, 0.012, VEIN, 5); b.pop(); } },   // rooting into the floor
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.08,
    upper: { r0: 0.1, r1: 0.085, mat: VESSEL, tex: wet, deco: (c, len) => { for (let i = 1; i < 4; i++) limb(c.b, 0, 0, -len * i * 0.25, -len * i * 0.25 - 0.02, 0.105, 0.105, VEIN, 7); } },
    fore: { r0: 0.085, r1: 0.075, mat: VESSEL, tex: wet },
    hand: (c) => {   // the artery's torn end, a mouth that spits
      const b = c.b, g = c.x("gape");
      limb(b, 0, 0, 0, -0.06, 0.08, 0.1, VESSEL, 8); limb(b, 0, 0, -0.06, -0.08, 0.105, 0.105, E.MEAT, 8, { tex: meatTex });
      b.ball(0, -0.07, 0, 0.065, HOLLOW, 6);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.push(); b.translate(Math.cos(a) * 0.08, -0.08, Math.sin(a) * 0.08); b.pitch(Math.sin(a) * 0.6); b.roll(-Math.cos(a) * 0.6); limb(b, 0, 0, 0, -0.06, 0.012, 0.002, E.TOOTH, 4); b.pop(); }
      if (g > 0.5) b.ball(0, -0.14, 0, 0.04 + g * 0.05, PULSE, 5);
    },
  };
}

export const O = { neck: 0.1, arm: 0.09, leg: 0.1, neckTop: 0.12, armLen: 0.16, legLen: 0.18 };

export const HEART: Rig = {
  key: "G",
  palette: HEART_PALETTE,
  frame: { w: 93, h: 100, worldH: 2.22, floor: 0.975, yaw: 0.3, pitch: 0.05, shift: 0.0 },
  crawlH: 10 / 15,
  joints, parts: HEART_PARTS, stumps: humanStumps(O),
  poses: HEART_POSES,
  walkStep: 0.12,
  regions: { W: 14, H: 15, head: 0, armTop: 0, armBot: 7, shoulder: 3 },
  partSpecs: humanPartSpecs(HEART_BODY, O),
};

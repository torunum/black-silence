import type { Builder } from "../../render/viewmodel/builder";
import { E, FIRST_OWN, enemyPalette } from "./palette";
import { blotchTex, limb, rodX } from "./shapes";
import type { Ctx, Joint, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { armParts, humanPartSpecs, humanStumps, legParts } from "./limbs";
import { LEVIATHAN_BODY, LEVIATHAN_POSES } from "./leviathanPoses";

/**
 * THE HOLLOW LEVIATHAN (`H`, a boss): it learned to breathe the filth.
 *
 * The legacy sprite is a mound of swamp green (`G`, `g`) with a red mouth (`R`) in its belly and yellow-green eyes (`0`) in it.
 * The rig is the thing that grew in the sewers: a body bloated past a man's twice over, slick with the filth it lives in, a head
 * sunk into its shoulders that is nothing but gills and eyes, and the mouth — the real one — down the front of its belly, a split
 * from chest to groin with the teeth on its lips, opening (`maw`) on the green it breathes. Its arms are long and thick and drag;
 * rusted chain and a drain grate are grown into its hide. When it splits in its last phase it is `./leviathan2.ts`.
 */

export const SKIN = FIRST_OWN, SLIME = FIRST_OWN + 1, GUM = FIRST_OWN + 2, GLOW = FIRST_OWN + 3, RUST = FIRST_OWN + 4, TOXIC = FIRST_OWN + 5, DARK = FIRST_OWN + 6;

export const LEVIATHAN_PALETTE = enemyPalette({
  // the legacy G / g: a swamp-green hide, darker in its folds
  [SKIN]:  { ramp: ["#0e140a", "#1a2412", "#2a381c", "#3c4e28", "#526636", "#6c8248", "#8aa05e"], amb: .46, spec: .45, rim: true },
  // the wet on it
  [SLIME]: { ramp: ["#283a10", "#3e5a18", "#5a7e22", "#7aa030", "#a0c444"], amb: .5, spec: .8, rim: true },
  // the legacy R: the inside of its mouth
  [GUM]:   { ramp: ["#2a0a08", "#46120c", "#661c12", "#86281a", "#a83824"], amb: .48, spec: .5 },
  // the legacy 0
  [GLOW]:  { ramp: ["#4a5a04", "#7a900c", "#a8c41c", "#c8dc30", "#e0f048"], emissive: true },
  [RUST]:  { ramp: ["#1a0c06", "#33180c", "#522612", "#74361a", "#964824"], amb: .42, spec: .25 },
  // what it breathes
  [TOXIC]: { ramp: ["#1a4a10", "#2a7018", "#44a024", "#6ad03a", "#a0f060"], emissive: true },
  [DARK]:  { ramp: ["#080a06", "#10140c", "#181e12", "#222a18"], amb: .5 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
export const slick = blotchTex(0.5, 1.3, -1.25);

/** The mouth down the belly: the lips, two rows of teeth, the gullet, the green in it. `maw` 0 shut .. 1 wide, `k` its size. */
export function bellyMaw(b: Builder, maw: number, k: number, z: number): void {
  const w = (0.05 + maw * 0.15) * k, h = 0.42 * k;
  const M: Array<[number, number]> = [[0, h * 0.5], [w * 0.7, h * 0.35], [w, 0], [w * 0.7, -h * 0.35], [0, -h * 0.5], [-w * 0.7, -h * 0.35], [-w, 0], [-w * 0.7, h * 0.35]];
  b.prz(M.map(([x, y]) => [x + Math.sign(x) * 0.035 * k, y * 1.08] as [number, number]), z - 0.01, z + 0.04, GUM);
  b.prz(M, z - 0.02, z + 0.06, E.CAVITY);
  if (maw > 0.2) b.prz(M.map(([x, y]) => [x * 0.45, y * 0.6] as [number, number]), z - 0.025, z, TOXIC);
  for (let i = 0; i < 7; i++) {   // the teeth along both lips
    const y = -h * 0.42 + (i * h * 0.84) / 6, x = w * Math.sqrt(Math.max(0, 1 - (2 * y / h) ** 2)) + 0.012 * k;
    for (const s of [-1, 1]) b.prz([[s * x, y - 0.026 * k], [s * x, y + 0.026 * k], [s * (x - 0.075 * k), y]], z - 0.035, z - 0.01, E.TOOTH);
  }
}

/** An eye on the face, `r` across, its glow. */
function eye(b: Builder, x: number, y: number, z: number, r: number): void { b.ball(x, y, z, r * 1.3, DARK, 5); b.ball(x, y, z - r * 0.4, r, GLOW, 5); }

function hand(c: Ctx, s: -1 | 1): void {
  const b = c.b;
  b.cbox(-0.08, -0.13, -0.065, 0.08, 0.0, 0.065, 0.03, SKIN, { tex: slick });
  for (let i = -1; i <= 1; i++) { b.push(); b.translate(i * 0.05, -0.12, 0); b.pitch(-0.3); limb(b, 0, 0, 0, -0.14, 0.03, 0.02, SKIN, 5); b.translate(0, -0.14, 0); limb(b, 0, 0, 0, -0.06, 0.018, 0.004, E.TOOTH, 4); b.pop(); }
  for (let i = 0; i < 3; i++) limb(b, s * 0.03 + i * 0.02 - 0.02, -0.06, -0.1, -0.2 - i * 0.05, 0.012, 0.004, SLIME, 4);   // the filth dripping off it
}

const joints: Joint[] = humanJoints(LEVIATHAN_BODY);

export const LEVIATHAN_PARTS: RigPart[] = [
  part("pelvis", "body", (c) => c.b.cbox(-0.36, -0.14, -0.24, 0.36, 0.1, 0.22, 0.09, SKIN, { tex: slick })),
  part("pelvis", "legs", (c) => {   // what hangs of its gut over its hips goes with the legs, and the filth running off it
    const b = c.b;
    b.cbox(-0.38, -0.3, -0.3, 0.38, -0.05, 0.2, 0.12, SKIN, { tex: slick });
    for (let i = 0; i < 6; i++) limb(b, -0.3 + i * 0.12, -0.3 + (i % 2) * 0.03, -0.28, -0.42 - (i % 3) * 0.08, 0.025, 0.008, SLIME, 4);
  }),
  part("spine", "body", (c) => {
    const b = c.b;
    b.ball(0, 0.1, -0.02, 0.5, SKIN, 12, { tex: slick });                                      // the belly
    b.ball(-0.2, -0.12, -0.18, 0.3, SKIN, 8, { tex: slick }); b.ball(0.22, -0.1, -0.16, 0.3, SKIN, 8, { tex: slick });   // hanging in folds
    bellyMaw(b, c.x("maw"), 1, -0.5);
    // rusted chain grown into it, a drain grate in its side
    for (let i = 0; i < 7; i++) b.ball(-0.42 + i * 0.05, 0.3 - i * 0.07, -0.36 + Math.abs(i - 3) * 0.02, 0.024, RUST, 4);
    b.push(); b.translate(0.4, 0.05, -0.32); b.yaw(-0.6);
    b.cbox(-0.1, -0.1, -0.02, 0.1, 0.1, 0.02, 0.01, RUST); for (let i = 0; i < 4; i++) b.box(-0.08 + i * 0.05, -0.09, -0.03, -0.065 + i * 0.05, 0.09, -0.02, DARK);
    b.pop();
  }),
  part("chest", "body", (c) => {
    const b = c.b;
    b.ball(0, 0.18, 0.0, 0.42, SKIN, 10, { tex: slick });
    b.ball(-0.32, 0.3, -0.1, 0.2, SKIN, 7, { tex: slick }); b.ball(0.32, 0.3, -0.1, 0.2, SKIN, 7, { tex: slick });   // its shoulders, mounds of it
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { b.push(); b.translate(s * 0.2, 0.3 - i * 0.05, -0.34); b.yaw(s * 0.5); b.box(-0.07, 0, -0.01, 0.07, 0.015, 0.01, DARK); b.pop(); }   // gill slits
  }),
  part("neck", "body", (c) => limb(c.b, 0, -0.04, -0.06, 0.08, 0.18, 0.16, SKIN, 7, { tex: slick })),
  part("shoulderL", "body", (c) => c.b.ball(0, 0, 0, 0.16, SKIN, 7, { tex: slick })),
  part("shoulderR", "body", (c) => c.b.ball(0, 0, 0, 0.16, SKIN, 7, { tex: slick })),
  // ---- the head: low between its shoulders, gills and eyes, a lipless mouth ----
  part("head", "head", (c) => {
    const b = c.b;
    b.cbox(-0.2, -0.05, -0.18, 0.2, 0.2, 0.16, 0.09, SKIN, { tex: slick });
    eye(b, -0.09, 0.1, -0.18, 0.035); eye(b, 0.09, 0.1, -0.18, 0.035); eye(b, 0.0, 0.16, -0.17, 0.025); eye(b, -0.15, 0.04, -0.15, 0.02); eye(b, 0.15, 0.04, -0.15, 0.02);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.prz([[s * 0.2, 0.12 - i * 0.05], [s * 0.3, 0.16 - i * 0.06], [s * 0.21, 0.08 - i * 0.05]], -0.05, 0.05, SLIME);   // gill frills
  }),
  part("jaw", "head", (c) => {
    const b = c.b;
    b.cbox(-0.15, -0.08, -0.17, 0.15, 0.0, 0.08, 0.04, SKIN, { tex: slick });
    b.box(-0.11, -0.03, -0.175, 0.11, 0.0, -0.16, E.CAVITY);
    for (let i = 0; i < 4; i++) limb(b, -0.09 + i * 0.06, -0.17, -0.06, -0.16, 0.012, 0.004, SLIME, 4);
  }),
  ...armParts(LEVIATHAN_BODY, "lArm", armSpec()),
  ...armParts(LEVIATHAN_BODY, "rArm", armSpec()),
  ...(["L", "R"] as const).flatMap((s) => legParts(LEVIATHAN_BODY, s, {
    joint: 0.14,
    upper: { r0: 0.18, r1: 0.15, mat: SKIN, tex: slick },
    lower: { r0: 0.15, r1: 0.13, mat: SKIN, tex: slick },
    foot: (c) => { c.b.cbox(-0.12, -0.06, -0.24, 0.12, 0.06, 0.08, 0.04, SKIN, { tex: slick }); for (let i = -1; i <= 1; i++) c.b.cyl(i * 0.07, -0.03, -0.3, -0.23, 0.02, 0.005, 4, E.TOOTH); },
  })),
];

function armSpec(): Parameters<typeof armParts>[2] {
  return {
    joint: 0.14,
    upper: { r0: 0.16, r1: 0.14, mat: SKIN, tex: slick, deco: (c, len) => rodX(c.b, -0.16, 0.16, -len * 0.5, 0, 0.02, 0.02, RUST, 4) },
    fore: { r0: 0.14, r1: 0.12, mat: SKIN, tex: slick, deco: (c, len) => { for (let i = 0; i < 3; i++) c.b.ball(0.08, -len * (0.3 + i * 0.2), -0.1, 0.035, SLIME, 4); } },
    hand,
  };
}

export const O = { neck: 0.16, arm: 0.15, leg: 0.17, neckTop: 0.18, armLen: 0.24, legLen: 0.3 };

export const LEVIATHAN: Rig = {
  key: "H",
  palette: LEVIATHAN_PALETTE,
  frame: { w: 92, h: 100, worldH: 2.28, floor: 0.975, yaw: 0.32, pitch: 0.05, shift: 0.0 },
  crawlH: 9 / 13,
  joints, parts: LEVIATHAN_PARTS, stumps: humanStumps(O),
  poses: LEVIATHAN_POSES,
  walkStep: 0.16,
  regions: { W: 16, H: 13, head: 4, armTop: 4, armBot: 9, shoulder: 4.5 },
  partSpecs: humanPartSpecs(LEVIATHAN_BODY, O),
};

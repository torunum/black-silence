import type { Builder } from "../../render/viewmodel/builder";
import { enemyPalette } from "./palette";
import { limb } from "./shapes";
import type { Ctx, PartGroup, Rig, RigPart } from "./kit";
import { humanJoints } from "./humanoid";
import { humanPartSpecs, humanStumps } from "./limbs";
import { DARK, GLOW, LEVIATHAN_PALETTE, LEVIATHAN_PARTS, O, SKIN, TOXIC, slick } from "./leviathan";
import { LEVIATHAN2_POSES } from "./leviathan2Poses";
import { LEVIATHAN_BODY } from "./leviathanPoses";

/**
 * THE HOLLOW LEVIATHAN, SPLIT (`H2`): its last phase. The legacy sprite is the same mound brighter and sicker (`G`, `g`) with the
 * mouth torn wider (`R`) and more eyes (`0`) opened all over it. The rig is the leviathan's own body (`./leviathan.ts`) with what
 * the split does to it: the belly's mouth wide and never closing, the head split down the middle on a seam of the green, eyes
 * opened in its shoulders and its gut, boils of the green bursting through the hide. Its palette is the same hide, sicker.
 */

export const LEVIATHAN2_PALETTE = enemyPalette({
  ...LEVIATHAN_PALETTE.materials,
  // the legacy G / g of the split form: a brighter, sicker green
  [SKIN]: { ramp: ["#121a0c", "#202e14", "#30441e", "#445e2a", "#5a7a38", "#74964a", "#92b45e"], amb: .48, spec: .5, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const eye = (b: Builder, x: number, y: number, z: number, r: number): void => { b.ball(x, y, z, r * 1.3, DARK, 5); b.ball(x, y, z - r * 0.4, r, GLOW, 5); };
const boil = (b: Builder, x: number, y: number, z: number, r: number): void => { b.ball(x, y, z, r, SKIN, 6, { tex: slick }); b.ball(x, y, z - r * 0.7, r * 0.55, TOXIC, 5); };

const SPLIT: RigPart[] = [
  part("spine", "body", (c) => {
    const b = c.b;
    for (const [x, y, r] of [[-0.34, 0.3, 0.045], [0.36, 0.22, 0.05], [-0.38, -0.05, 0.04], [0.3, -0.12, 0.045], [0.0, 0.42, 0.035]] as const) eye(b, x, y, -0.36 - Math.abs(x) * 0.1, r);
    for (const [x, y, r] of [[-0.24, 0.42, 0.06], [0.42, 0.42, 0.05], [-0.44, 0.15, 0.05], [0.24, -0.25, 0.06]] as const) boil(b, x, y, -0.38, r);
  }),
  part("chest", "body", (c) => { for (const s of [-1, 1]) { eye(c.b, s * 0.32, 0.36, -0.3, 0.05); boil(c.b, s * 0.18, 0.46, -0.28, 0.05); } }),
  part("head", "head", (c) => {   // the head split down the middle on a seam of the green
    const b = c.b;
    b.prz([[-0.03, -0.05], [0.03, -0.05], [0.05, 0.22], [-0.05, 0.22]], -0.2, -0.17, TOXIC);
    for (const s of [-1, 1]) { b.push(); b.translate(s * 0.05, 0.2, -0.05); b.roll(-s * 0.5); limb(b, 0, 0, 0, 0.14, 0.04, 0.01, SKIN, 5); b.pop(); }   // its halves peeling apart
    eye(b, -0.15, 0.17, -0.15, 0.03); eye(b, 0.15, 0.17, -0.15, 0.03);
  }),
  part("pelvis", "legs", (c) => { for (let i = 0; i < 4; i++) limb(c.b, -0.22 + i * 0.15, -0.28, -0.3, -0.5, 0.03, 0.012, TOXIC, 4); }),   // the green running out of it
];

const parts: RigPart[] = [...LEVIATHAN_PARTS, ...SPLIT];

export const LEVIATHAN2: Rig = {
  key: "H2",
  palette: LEVIATHAN2_PALETTE,
  frame: { w: 108, h: 100, worldH: 2.12, floor: 0.975, yaw: 0.32, pitch: 0.05, shift: 0.0 },
  crawlH: 9 / 13,
  joints: humanJoints(LEVIATHAN_BODY), parts, stumps: humanStumps(O),
  poses: LEVIATHAN2_POSES,
  walkStep: 0.15,
  regions: { W: 16, H: 13, head: 4, armTop: 4, armBot: 9, shoulder: 4.5 },
  partSpecs: humanPartSpecs(LEVIATHAN_BODY, O),
};

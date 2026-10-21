import type { Builder } from "../../render/viewmodel/builder";
import { enemyPalette } from "./palette";
import { limb } from "./shapes";
import type { Ctx, PartGroup, Rig, RigPart, RigPose, RigPoses } from "./kit";
import { humanJoints } from "./humanoid";
import { humanPartSpecs, humanStumps } from "./limbs";
import { FIRE, FOREMAN_PALETTE, FOREMAN_PARTS, HIDE, O, SOOT } from "./foreman";
import { FOREMAN_BODY, FOREMAN_POSES } from "./foremanPoses";

/**
 * THE FOREMAN OVERHEATED (`V2`): its last phase. The legacy sprite is the same hulk scorched (`g` gone a burnt red), its core
 * open and orange everywhere (`0`). The rig is the foreman's own body (`./foreman.ts`) with its firebox burst — the grille blown
 * off it, the fire standing out of it (`open`, `heat` at full) — the hide scorched, cracks of the same orange running through it
 * and the plates, and flame instead of smoke out of its stacks.
 */

export const FOREMAN2_PALETTE = enemyPalette({
  ...FOREMAN_PALETTE.materials,
  // the legacy g of the last form: hide scorched a burnt red
  [HIDE]: { ramp: ["#2a0e08", "#4a1a0e", "#6a2814", "#8a3a1e", "#a84e2a", "#c4663a", "#de8450"], amb: .5, spec: .3 },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const crack = (b: Builder, x: number, y: number, z: number, a: number, l: number): void => { b.push(); b.translate(x, y, z); b.roll(a); b.box(-0.012, -l / 2, -0.006, 0.012, l / 2, 0.006, FIRE); b.pop(); };

const BURST: RigPart[] = [
  part("chest", "body", (c) => {
    const b = c.b;
    b.ball(0, 0.18, -0.24, 0.1 + 0.03 * c.x("heat"), FIRE, 7);   // the fire standing out of it
    for (const [x, y, a, l] of [[-0.3, 0.1, 0.6, 0.16], [0.3, 0.28, -0.5, 0.14], [-0.25, 0.32, -0.3, 0.1], [0.28, 0.06, 0.4, 0.12], [-0.12, 0.36, 1.2, 0.12], [0.12, 0.02, -1.1, 0.12]] as const) crack(b, x, y, -0.21, a, l);
    for (const s of [-1, 1]) for (const [y, a] of [[0.2, 0.5], [0.05, -0.6]] as const) crack(b, s * 0.45, y, -0.14, a * s, 0.12);   // through its shoulders
    for (const s of [-1, 1]) { b.push(); b.translate(s * 0.18, 0.78, 0.2); for (let i = 0; i < 3; i++) b.ball(Math.sin(i * 2 + s) * 0.03, i * 0.08, 0, 0.06 - i * 0.012, i ? FIRE : SOOT, 5); b.pop(); }   // flame out of its stacks
  }),
  part("spine", "body", (c) => { for (const [x, y, a, l] of [[-0.2, 0.12, 0.8, 0.14], [0.18, 0.2, -0.7, 0.12]] as const) crack(c.b, x, y, -0.19, a, l); }),
  part("head", "head", (c) => { const b = c.b; b.box(-0.12, 0.15, -0.17, 0.12, 0.2, -0.155, FIRE); limb(b, 0.0, -0.16, 0.0, 0.12, 0.012, 0.012, FIRE, 4); }),   // its whole slit alight, and a crack down its helm
];

const hot = (p: RigPose): RigPose => ({ ...p, x: { ...p.x, heat: 1, open: 1 } });
const all = (v: RigPose | RigPose[]): RigPose | RigPose[] => (Array.isArray(v) ? v.map(hot) : hot(v));
const POSES = Object.fromEntries(Object.entries(FOREMAN_POSES).map(([k, v]) => [k, all(v as RigPose | RigPose[])])) as unknown as RigPoses;

export const FOREMAN2: Rig = {
  key: "V2",
  palette: FOREMAN2_PALETTE,
  frame: { w: 96, h: 100, worldH: 2.32, floor: 0.975, yaw: 0.38, pitch: 0.05, shift: 0.0 },
  crawlH: 8 / 12,
  joints: humanJoints(FOREMAN_BODY), parts: [...FOREMAN_PARTS, ...BURST], stumps: humanStumps(O),
  poses: POSES,
  walkStep: 0.13,
  regions: { W: 15, H: 12, head: 3, armTop: 3, armBot: 8, shoulder: 3.5 },
  partSpecs: humanPartSpecs(FOREMAN_BODY, O),
};

import type { Builder } from "../../render/viewmodel/builder";
import { E, enemyPalette } from "./palette";
import { limb, meatTex } from "./shapes";
import type { Ctx, PartGroup, Rig, RigPart, RigPose, RigPoses } from "./kit";
import { humanJoints } from "./humanoid";
import { humanPartSpecs, humanStumps } from "./limbs";
import { BRIGHT, HEART_PALETTE, HEART_PARTS, HOLLOW, MUSCLE, O, PULSE } from "./heart";
import { HEART_BODY, HEART_POSES } from "./heartPoses";

/**
 * THE LIVING HEART RUPTURED (`G2`): its last phase. The legacy sprite is the same heart brighter (`R`, `S`, `W`) with three
 * ventricles split open (`i`, `I`) across it and spilling. The rig is the heart's own body (`./heart.ts`) torn: a rupture down its
 * face with the red light of the beat in it, a second ventricle split open beside the first, blood running from both down to its
 * roots, the muscle brighter and wetter. Its mouth no longer closes.
 */

export const HEART2_PALETTE = enemyPalette({
  ...HEART_PALETTE.materials,
  [MUSCLE]: { ramp: ["#320806", "#560e0a", "#7a1810", "#a02218", "#c03424", "#d84a34", "#ee6a4e"], amb: .5, spec: .6, rim: true },
});

const part = (joint: string, group: PartGroup, draw: (c: Ctx) => void): RigPart => ({ joint, group, draw });
const run = (b: Builder, x: number, y: number, z: number, l: number): void => { limb(b, x, z, y, y - l, 0.025, 0.012, E.MEAT, 4, { tex: meatTex }); b.ball(x, y - l, z, 0.03, E.MEAT, 4); };

const RUPTURE: RigPart[] = [
  part("chest", "body", (c) => {
    const b = c.b, beat = c.x("beat");
    b.push(); b.translate(0.12, 0.1, -0.4); b.roll(-0.3);   // the rupture down its face, the beat's light in it
    b.prz([[-0.03, 0.3], [0.03, 0.3], [0.05, 0.0], [0.02, -0.4], [-0.03, -0.4], [-0.05, 0.0]], -0.02, 0.02, HOLLOW);
    b.prz([[-0.015, 0.25], [0.015, 0.25], [0.025, 0.0], [0.0, -0.32], [-0.025, 0.0]], -0.03, -0.02, PULSE);
    b.pop();
    b.prz([[0.22, 0.28], [0.32, 0.26], [0.34, 0.16], [0.26, 0.12], [0.2, 0.18]], -0.36, -0.3, HOLLOW);   // a second ventricle, split open
    b.prz([[0.25, 0.24], [0.3, 0.23], [0.3, 0.17], [0.25, 0.17]], -0.37, -0.36, PULSE);
    for (const [x, y, z, l] of [[-0.08, -0.08, -0.4, 0.45], [0.0, -0.1, -0.4, 0.6], [0.14, -0.3, -0.36, 0.4], [0.28, 0.12, -0.3, 0.5], [-0.24, 0.0, -0.34, 0.35]] as const) run(b, x, y, z, l * (0.8 + beat * 0.3));   // what spills out
    b.ball(-0.1, 0.4, -0.25, 0.06, BRIGHT, 5);
  }),
];

const open = (p: RigPose): RigPose => ({ ...p, x: { ...p.x, gape: Math.max(0.6, p.x?.gape ?? 0), beat: Math.max(0.4, p.x?.beat ?? 0) } });
const all = (v: RigPose | RigPose[]): RigPose | RigPose[] => (Array.isArray(v) ? v.map(open) : open(v));
const POSES = Object.fromEntries(Object.entries(HEART_POSES).map(([k, v]) => [k, all(v as RigPose | RigPose[])])) as unknown as RigPoses;

export const HEART2: Rig = {
  key: "G2",
  palette: HEART2_PALETTE,
  frame: { w: 109, h: 100, worldH: 2.08, floor: 0.975, yaw: 0.3, pitch: 0.05, shift: 0.0 },
  crawlH: 10 / 15,
  joints: humanJoints(HEART_BODY), parts: [...HEART_PARTS, ...RUPTURE], stumps: humanStumps(O),
  poses: POSES,
  walkStep: 0.1,
  regions: { W: 14, H: 15, head: 0, armTop: 0, armBot: 7, shoulder: 3 },
  partSpecs: humanPartSpecs(HEART_BODY, O),
};

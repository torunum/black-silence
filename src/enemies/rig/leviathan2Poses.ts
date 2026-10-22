import type { RigPose, RigPoses } from "./kit";
import { LEVIATHAN_POSES } from "./leviathanPoses";

/** THE SPLIT LEVIATHAN'S POSES: the leviathan's, with the belly's mouth torn wide and never shutting (`maw` at least .7). */
const wide = (p: RigPose): RigPose => ({ ...p, x: { ...p.x, maw: Math.max(0.7, p.x?.maw ?? 0) } });
const all = (v: RigPose | RigPose[]): RigPose | RigPose[] => (Array.isArray(v) ? v.map(wide) : wide(v));

export const LEVIATHAN2_POSES = Object.fromEntries(Object.entries(LEVIATHAN_POSES).map(([k, v]) => [k, all(v as RigPose | RigPose[])])) as unknown as RigPoses;

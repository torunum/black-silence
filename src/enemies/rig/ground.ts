import { Builder } from "../../render/viewmodel/builder";
import type { Raster } from "../../render/viewmodel/raster";
import type { Joint, RigPose, Rot } from "./kit";
import type { V3 } from "../../render/viewmodel/builder";

/**
 * WHERE A JOINT IS in a pose: the skeleton walked the way `drawFigure` walks it
 * (translate to the joint, then yaw, pitch, roll), through a `Builder` that
 * draws nothing, and the joint's height read off. A four-legged monster, or one
 * propped on its arms, has no formula for where its feet are the way a biped's
 * legs do (`humanoid.ts` `makeStd`): the poses are written with their
 * `root` at 0 and `grounded` lowers it until the lowest named joint (a paw,
 * a hand) is `clear` metres above the floor.
 */

const flat = { w: 1, h: 1, col: new Uint8Array(1) } as unknown as Raster;

/** The height of each of `names` (metres over the floor the pose's `root` stands on) in `pose`. */
export function jointHeights(joints: readonly Joint[], pose: RigPose, names: readonly string[]): number[] {
  const kids = new Map<string, Joint[]>();
  for (const j of joints) kids.set(j.name, []);
  for (const j of joints) if (j.parent) kids.get(j.parent)!.push(j);
  const want = new Set(names), out = new Map<string, number>(), zero: Rot = [0, 0, 0];
  const b = new Builder(flat, 1, 0, 0);
  const visit = (j: Joint, root: boolean): void => {
    b.push();
    if (root) b.translate(j.at[0] + pose.root[0], j.at[1] + pose.root[1], j.at[2] + pose.root[2]); else b.translate(j.at[0], j.at[1], j.at[2]);
    const r = pose.rot[j.name] ?? zero;
    if (r[1]) b.yaw(r[1]);
    if (r[0]) b.pitch(r[0]);
    if (r[2]) b.roll(r[2]);
    if (want.has(j.name)) out.set(j.name, b.toCam(0, 0, 0)[1]);
    for (const k of kids.get(j.name)!) visit(k, false);
    b.pop();
  };
  visit(joints[0], true);
  return names.map((n) => out.get(n) ?? 0);
}

/** `pose` with its root lowered (or raised) so that the lowest of `feet` is `clear` above the floor. */
export function grounded(joints: readonly Joint[], pose: RigPose, feet: readonly string[], clear: number): RigPose {
  const low = Math.min(...jointHeights(joints, pose, feet));
  const root: V3 = [pose.root[0], pose.root[1] + clear - low, pose.root[2]];
  return { ...pose, root };
}

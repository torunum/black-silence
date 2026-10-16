import type { V3 } from "../../render/viewmodel/builder";
import { pose, type Joint, type Rot, type RigPose } from "./kit";

/**
 * THE TWO-LEGGED SKELETON the humanoid monsters share (the ghoul, the plague
 * bloat, the flayed sprinter, the plated horror, the wailer) and the way their
 * poses are written.
 *
 * A pose is a handful of numbers (`Std`): the spine's lean, the head's hang,
 * each arm's swing and bend, each leg's swing and knee. `makeStd(dims)` turns
 * them into joint rotations and, for a standing pose, lowers the pelvis until
 * the lowest foot is on the floor, so no step floats. Angles are radians; a
 * positive `f` swings a limb forward, a positive `k` bends a knee, a positive
 * pitch on the spine, chest, neck or head leans it toward the viewer.
 *
 * What differs between monsters is the proportions (`Dims`: how high the
 * pelvis sits, how long the legs and arms are, how wide the shoulders and
 * hips) and what is hung on the joints (each monster's own file).
 */

interface Arm { f: number; out?: number; tw?: number; e?: number; w?: number }
interface Leg { f: number; k?: number; out?: number; toe?: number }
export type { Arm, Leg };

export interface Std {
  root?: V3; pelvis?: Rot; spine?: Rot; chest?: Rot; neck?: Rot; head?: Rot;
  jaw?: number;
  /** The monster's own named scalars (`gut`, `claw`, `bile`...), read by its parts. */
  x?: Record<string, number>;
  aL?: Arm; aR?: Arm; lL?: Leg; lR?: Leg;
  /** Lower the pelvis so the lowest foot is on the floor (default), or leave `root` as given. */
  ground?: boolean;
  floor?: number;
}

/** A skeleton's proportions, rig metres. Anything not given is the ghoul's. */
export interface Dims {
  pelvisY: number;
  spineY: number; chestY: number; neckY: number; neckZ: number; headY: number; headZ: number; jawY: number; jawZ: number;
  shoulderX: number; shoulderY: number; upperArm: number; foreArm: number;
  hipX: number; hipDrop: number; thigh: number; shin: number; ankleY: number;
  /** What an unnamed joint of a pose rests at. */
  rest: { spine: Rot; chest: Rot; neck: Rot; head: Rot; jaw: number; arm: Arm; leg: Leg };
}

export const GHOUL_DIMS: Dims = {
  pelvisY: 0.88, spineY: 0.06, chestY: 0.27, neckY: 0.35, neckZ: -0.02, headY: 0.085, headZ: -0.03, jawY: 0.035 * 1.26, jawZ: -0.005 * 1.26,
  shoulderX: 0.29, shoulderY: 0.27, upperArm: 0.30, foreArm: 0.28,
  hipX: 0.135, hipDrop: 0.04, thigh: 0.41, shin: 0.39, ankleY: 0.04,
  rest: { spine: [0.1, 0, 0], chest: [0.12, 0, 0], neck: [0.02, 0, 0], head: [0.08, 0, 0], jaw: 0.3, arm: { f: 0.1, out: 0.16, e: 0.5, w: 0.12 }, leg: { f: 0, k: 0.08, out: 0.03 } },
};

/** `GHOUL_DIMS` with `o` over it. */
export function dims(o: Partial<Omit<Dims, "rest">> & { rest?: Partial<Dims["rest"]> }): Dims {
  return { ...GHOUL_DIMS, ...o, rest: { ...GHOUL_DIMS.rest, ...o.rest } };
}

const J = (name: string, parent: string | null, x: number, y: number, z: number): Joint => ({ name, parent, at: [x, y, z] });

/** The joints of the two-legged skeleton: pelvis, spine, chest, neck, head, jaw, an arm each side (shoulder, elbow, wrist) and a leg (hip, knee, ankle). */
export function humanJoints(d: Dims): Joint[] {
  return [
    J("pelvis", null, 0, d.pelvisY, 0),
    J("spine", "pelvis", 0, d.spineY, 0), J("chest", "spine", 0, d.chestY, 0), J("neck", "chest", 0, d.neckY, d.neckZ), J("head", "neck", 0, d.headY, d.headZ), J("jaw", "head", 0, d.jawY, d.jawZ),
    J("shoulderL", "chest", -d.shoulderX, d.shoulderY, 0), J("elbowL", "shoulderL", 0, -d.upperArm, 0), J("wristL", "elbowL", 0, -d.foreArm, 0),
    J("shoulderR", "chest", d.shoulderX, d.shoulderY, 0), J("elbowR", "shoulderR", 0, -d.upperArm, 0), J("wristR", "elbowR", 0, -d.foreArm, 0),
    J("hipL", "pelvis", -d.hipX, -d.hipDrop, 0), J("kneeL", "hipL", 0, -d.thigh, 0), J("ankleL", "kneeL", 0, -d.shin, 0),
    J("hipR", "pelvis", d.hipX, -d.hipDrop, 0), J("kneeR", "hipR", 0, -d.thigh, 0), J("ankleR", "kneeR", 0, -d.shin, 0),
  ];
}

/** The pose maker for a skeleton of these proportions: `Std` in, `RigPose` out. */
export function makeStd(d: Dims): (s: Std) => RigPose {
  /** Height of an ankle below the pelvis for a leg swung `f` with its knee bent `k`. */
  const ankleBelow = (f: number, k: number): number => -d.hipDrop - d.thigh * Math.cos(f) - d.shin * Math.cos(f - k);
  return (s: Std): RigPose => {
    const rot: Record<string, Rot> = {};
    const set = (n: string, r: Rot | undefined): void => { if (r) rot[n] = r; };
    set("pelvis", s.pelvis); set("spine", s.spine ?? d.rest.spine); set("chest", s.chest ?? d.rest.chest);
    set("neck", s.neck ?? d.rest.neck); set("head", s.head ?? d.rest.head);
    rot.jaw = [s.jaw ?? d.rest.jaw, 0, 0];
    const arm = (side: "L" | "R", a: Arm | undefined): void => {
      const q = a ?? d.rest.arm, o = side === "L" ? 1 : -1;
      rot["shoulder" + side] = [-q.f, q.tw ?? 0, (q.out ?? d.rest.arm.out ?? 0.16) * o];
      rot["elbow" + side] = [-(q.e ?? d.rest.arm.e ?? 0.5), 0, 0];
      rot["wrist" + side] = [-(q.w ?? d.rest.arm.w ?? 0.12), 0, 0];
    };
    arm("L", s.aL); arm("R", s.aR);
    const lg = (side: "L" | "R", l: Leg | undefined): number => {
      const q = l ?? d.rest.leg, k = q.k ?? d.rest.leg.k ?? 0.08, o = side === "L" ? 1 : -1;
      rot["hip" + side] = [-q.f, 0, (q.out ?? d.rest.leg.out ?? 0.03) * o];
      rot["knee" + side] = [k, 0, 0];
      rot["ankle" + side] = [q.f - k + (q.toe ?? 0), 0, 0];
      return ankleBelow(q.f, k);
    };
    const low = Math.min(lg("L", s.lL), lg("R", s.lR));
    let root: V3 = s.root ?? [0, 0, 0];
    if (s.ground !== false) root = [root[0], root[1] + d.ankleY - d.pelvisY - low, root[2]];
    return pose(root, rot, { jaw: 0, ...s.x }, s.floor);
  };
}

import type { Joint, RigPose, RigPoses, Rot } from "./kit";
import { pose } from "./kit";
import type { V3 } from "../../render/viewmodel/builder";
import { dims } from "./humanoid";
import { grounded } from "./ground";

/**
 * THE DRAGGER'S SKELETON AND POSES: half a man, torn through at the waist,
 * hauling itself along on its two arms with its own entrails dragging behind.
 *
 * It lies along z like the hound (the head at -z, toward the player, the torn
 * waist behind, `frame.yaw` turning the rig so the length of it crosses the
 * sprite). The torso is `spine` and `chest`, propped on two arms that reach, plant
 * and pull (`shoulder`, `elbow`, `wrist`: the monster's `lArm`/`rArm`), and what
 * trails is the monster's `legs`: two ropes of gut (`hip`, `knee`, `ankle` —
 * each a chain along +z, so a pose can make them slither) hung from the
 * waist. With them gone it hauls the torso alone, lower; with an arm gone it
 * drags on the other; with both it lies on its face.
 *
 * Poses are written with `root` 0 and grounded by forward kinematics
 * (`ground.ts`): the lowest hand is on the floor.
 */

export const DRAGGER_BODY = dims({ upperArm: 0.28, foreArm: 0.28, thigh: 0.26, shin: 0.26 });

const J = (name: string, parent: string | null, x: number, y: number, z: number): Joint => ({ name, parent, at: [x, y, z] });
export const DRAGGER_JOINTS: Joint[] = [
  J("pelvis", null, 0, 0.2, 0.36), J("spine", "pelvis", 0, 0.0, -0.28), J("chest", "spine", 0, 0.03, -0.22),
  J("neck", "chest", 0, 0.1, -0.16), J("head", "neck", 0, 0.12, -0.02), J("jaw", "head", 0, -0.02, -0.03),
  J("shoulderL", "chest", -0.2, 0.0, -0.1), J("elbowL", "shoulderL", 0, -0.28, 0), J("wristL", "elbowL", 0, -0.28, 0),
  J("shoulderR", "chest", 0.2, 0.0, -0.1), J("elbowR", "shoulderR", 0, -0.28, 0), J("wristR", "elbowR", 0, -0.28, 0),
  J("hipL", "pelvis", -0.07, -0.04, 0.04), J("kneeL", "hipL", 0, 0, 0.26), J("ankleL", "kneeL", 0, 0, 0.26),
  J("hipR", "pelvis", 0.07, -0.04, 0.04), J("kneeR", "hipR", 0, 0, 0.26), J("ankleR", "kneeR", 0, 0, 0.26),
];

interface Arm { f: number; e?: number; w?: number; out?: number }
export interface DStd {
  root?: V3; pelvis?: Rot; spine?: Rot; chest?: Rot; neck?: Rot; head?: Rot; jaw?: number;
  aL?: Arm; aR?: Arm;
  /** The two ropes of gut: [pitch, yaw] of each of their three links, left then right. */
  gL?: [number, number, number, number, number, number]; gR?: [number, number, number, number, number, number];
  ground?: boolean; floor?: number;
  x?: Record<string, number>;
}

const HANDS = ["wristL", "wristR"];
const REST_GUT: [number, number, number, number, number, number] = [-0.12, 0.05, -0.1, 0.1, -0.1, 0.1];

/** A `DStd` as a pose. */
export function make(s: DStd): RigPose {
  const rot: Record<string, Rot> = {};
  rot.pelvis = s.pelvis ?? [-0.12, 0, 0]; rot.spine = s.spine ?? [0, 0, 0]; rot.chest = s.chest ?? [0.05, 0, 0];
  rot.neck = s.neck ?? [0.2, 0, 0]; rot.head = s.head ?? [-0.3, 0, 0]; rot.jaw = [s.jaw ?? 0.4, 0, 0];
  const arm = (j: string, side: 1 | -1, a: Arm | undefined, d: Arm): void => {
    const q = a ?? d;
    rot["shoulder" + j] = [-q.f, 0, (q.out ?? d.out ?? 0.2) * side]; rot["elbow" + j] = [q.e ?? d.e ?? 0.5, 0, 0]; rot["wrist" + j] = [(q.w ?? d.w ?? 0.3), 0, 0];
  };
  arm("L", 1, s.aL, { f: 1.0, e: 1.0, w: 0.3, out: 0.2 }); arm("R", -1, s.aR, { f: 0.8, e: 1.0, w: 0.3, out: 0.2 });
  const g = (j: string, v: number[]): void => {
    rot["hip" + j] = [v[0], v[1], 0]; rot["knee" + j] = [v[2], v[3], 0]; rot["ankle" + j] = [v[4], v[5], 0];
  };
  const gl = s.gL ?? REST_GUT, gr = s.gR ?? REST_GUT;
  g("L", gl); g("R", gr);
  const p = pose(s.root ?? [0, 0, 0], rot, { jaw: 0, claw: 0.4, sway: 0, ...s.x }, s.floor);
  return s.ground === false ? p : grounded(DRAGGER_JOINTS, p, HANDS, 0.05);
}

const TAU = Math.PI * 2;
const x = (claw: number, sway = 0): Record<string, number> => ({ claw, sway });
const gut = (a: number, b: number, c: number, y: number): [number, number, number, number, number, number] => [-0.1, y * a, -0.08, y * b, -0.06, y * c];

/** One haul of six: reach with one arm, plant, pull the body up to it; the torso undulates and the guts slither behind. */
function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.04 * c, 0.12 * c, 0.04 * s], chest: [0.05, -0.14 * c, 0.05 * s], neck: [0.22, 0.12 * c, 0], head: [-0.32, 0.12 * c, 0], jaw: 0.4 + 0.15 * Math.sin(p + 1),
    aL: { f: 1.0 + 0.7 * s, e: 0.9 + 0.4 * Math.max(0, -s), w: 0.3 }, aR: { f: 0.8 - 0.7 * s, e: 0.9 + 0.4 * Math.max(0, s), w: 0.3 },
    gL: gut(0.6, 0.9, 1.2, Math.sin(p)), gR: gut(0.6, 0.9, 1.2, -Math.sin(p + 0.8)),
    root: [0, 0.015 * Math.cos(2 * p), 0.05 * c], x: x(0.4 + 0.2 * s, c),
  });
}

const idle = make({ jaw: 0.3, x: x(0.3, 0), aL: { f: 0.9, e: 1.0, w: 0.3 }, aR: { f: 0.75, e: 1.05, w: 0.3 } });

/** Rears up on its arms, lunges with one hand out to grab, drags itself back. */
const atk: RigPose[] = [
  make({ pelvis: [-0.55, 0, 0], chest: [-0.12, 0, 0], neck: [0.1, 0, 0], head: [-0.5, 0, 0], jaw: 0.9, x: x(0.1, 1), aL: { f: 0.5, e: 0.8, w: 0.2 }, aR: { f: 0.4, e: 0.8, w: 0.2 }, gL: gut(0.3, 0.5, 0.7, 0.4), gR: gut(0.3, 0.5, 0.7, -0.4) }),
  make({ pelvis: [-0.25, 0, 0], chest: [0.25, 0, 0], neck: [0.2, 0, 0], head: [-0.2, 0, 0], jaw: 1.1, x: x(1, -1), aL: { f: 2.1, e: 0.15, w: 0.1 }, aR: { f: 1.0, e: 0.5, w: 0.3 }, gL: gut(0.7, 1, 1.3, -0.5), gR: gut(0.7, 1, 1.3, 0.5), root: [0, 0, -0.16] }),
  make({ pelvis: [-0.35, 0, 0], chest: [0.1, 0, 0], neck: [0.2, 0, 0], head: [-0.3, 0, 0], jaw: 0.5, x: x(0.7, 0.3), aL: { f: 1.5, e: 0.4, w: 0.3 }, aR: { f: 1.0, e: 0.5, w: 0.3 }, gL: gut(0.5, 0.8, 1, 0.3), gR: gut(0.5, 0.8, 1, -0.3), root: [0, 0, -0.06] }),
];
const pain: RigPose[] = [
  make({ pelvis: [-0.6, 0.05, 0.05], chest: [-0.2, 0.15, 0], neck: [0.0, 0.1, 0], head: [-0.6, 0.15, 0], jaw: 1.0, x: x(0, 1), aL: { f: 0.2, e: 0.9, w: 0.1, out: 0.6 }, aR: { f: 0.3, e: 0.8, w: 0.1, out: 0.6 }, gL: gut(0.3, 0.6, 0.9, 0.5), gR: gut(0.3, 0.6, 0.9, 0.3), root: [0, 0, 0.05] }),
  make({ pelvis: [-0.2, -0.05, 0], chest: [0.3, -0.1, 0], neck: [0.4, 0, 0], head: [0.0, 0, 0], jaw: 0.3, x: x(0.9, -0.5), aL: { f: 1.3, e: 1.3, w: 0.3 }, aR: { f: 1.3, e: 1.3, w: 0.3 }, gL: gut(0.5, 0.7, 1, -0.4), gR: gut(0.5, 0.7, 1, -0.2) }),
];

/** Death: it slackens, the chest drops, the head lolls, and it lies flat, finally still. Each frame is drawn on the floor the sinking sprite is at. */
const die: RigPose[] = [
  make({ pelvis: [-0.6, 0, 0.05], chest: [-0.2, 0, 0], neck: [0.0, 0, 0], head: [-0.6, 0, 0], jaw: 1.0, x: x(0, 1), aL: { f: 0.6, e: 0.9, w: 0.1 }, aR: { f: 0.5, e: 0.9, w: 0.1 }, gL: gut(0.3, 0.6, 0.9, 0.5), gR: gut(0.3, 0.6, 0.9, 0.3), root: [0.02, 0, 0.04], floor: 0.975 }),
  make({ pelvis: [-0.35, 0, 0.1], chest: [0.15, 0.1, 0.1], neck: [0.3, 0, 0], head: [-0.2, 0.2, 0.1], jaw: 0.7, x: x(0.2, 0), aL: { f: 0.6, e: 1.4, w: 0.2, out: 0.5 }, aR: { f: 0.7, e: 1.3, w: 0.2, out: 0.5 }, gL: gut(0.3, 0.5, 0.7, 0.2), gR: gut(0.3, 0.5, 0.7, 0.1), ground: false, root: [0, -0.06, 0.04], floor: 0.93 }),
  make({ pelvis: [-0.18, 0, 0.25], chest: [0.2, 0.1, 0.1], neck: [0.3, 0, 0.1], head: [0.1, 0.2, 0.2], jaw: 0.6, x: x(0.2, 0), aL: { f: 0.3, e: 1.2, w: 0.1, out: 0.7 }, aR: { f: 0.4, e: 1.1, w: 0.1, out: 0.7 }, gL: gut(0.2, 0.3, 0.4, 0.1), gR: gut(0.2, 0.3, 0.4, 0.05), ground: false, root: [-0.04, -0.1, 0.04], floor: 0.866 }),
  make({ pelvis: [-0.06, 0, 0.4], spine: [0.0, 0, 0.1], chest: [0.2, 0.1, 0.1], neck: [0.3, 0, 0.1], head: [0.1, 0.2, 0.3], jaw: 0.5, x: x(0.2, 0), aL: { f: 0.2, e: 0.9, w: 0.1, out: 0.9 }, aR: { f: 0.3, e: 0.9, w: 0.1, out: 0.9 }, gL: gut(0.1, 0.2, 0.2, 0.1), gR: gut(0.1, 0.2, 0.2, 0.0), ground: false, root: [-0.06, -0.13, 0.04], floor: 0.78 }),
  make({ pelvis: [0.0, 0, 0.5], spine: [0.0, 0, 0.1], chest: [0.2, 0.1, 0.1], neck: [0.2, 0, 0.1], head: [0.1, 0.2, 0.3], jaw: 0.45, x: x(0.1, 0), aL: { f: 0.1, e: 0.8, w: 0.1, out: 1.0 }, aR: { f: 0.2, e: 0.8, w: 0.1, out: 1.0 }, gL: gut(0.05, 0.1, 0.1, 0.1), gR: gut(0.05, 0.1, 0.1, 0.0), ground: false, root: [-0.08, -0.15, 0.04], floor: 0.7 }),
];

/** Without the entrails it is only a torso on two arms: flatter, quicker. */
function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    pelvis: [-0.2, 0, 0], spine: [0.04 * c, 0.1 * c, 0.04 * s], chest: [0.05, -0.12 * c, 0.05 * s], neck: [0.2, 0.1 * c, 0], head: [-0.3, 0.1 * c, 0], jaw: 0.4 + 0.15 * Math.max(0, s),
    aL: { f: 1.0 + 0.7 * s, e: 0.45 + 0.4 * Math.max(0, -s), w: 0.3 }, aR: { f: 0.8 - 0.7 * s, e: 0.45 + 0.4 * Math.max(0, s), w: 0.3 }, root: [0, 0, 0.04 * c], x: x(0.5, 0),
  });
}
const crawlAtk: RigPose[] = [
  make({ pelvis: [-0.35, 0, 0], chest: [-0.1, 0, 0], neck: [0.1, 0, 0], head: [-0.5, 0, 0], jaw: 0.9, x: x(0.1, 0), aL: { f: 0.5, e: 0.8, w: 0.2 }, aR: { f: 0.4, e: 0.8, w: 0.2 } }),
  make({ pelvis: [-0.1, 0, 0], chest: [0.25, 0, 0], neck: [0.2, 0, 0], head: [-0.2, 0, 0], jaw: 1.1, x: x(1, 0), aL: { f: 2.0, e: 0.15, w: 0.1 }, aR: { f: 1.0, e: 0.5, w: 0.3 }, root: [0, 0, -0.14] }),
  make({ pelvis: [-0.2, 0, 0], chest: [0.1, 0, 0], neck: [0.2, 0, 0], head: [-0.3, 0, 0], jaw: 0.5, x: x(0.7, 0), aL: { f: 1.5, e: 0.4, w: 0.3 }, aR: { f: 1.0, e: 0.5, w: 0.3 }, root: [0, 0, -0.05] }),
];
const crawlPain: RigPose[] = [
  make({ pelvis: [-0.4, 0.05, 0.05], chest: [-0.2, 0.15, 0], neck: [0.0, 0.1, 0], head: [-0.6, 0.15, 0], jaw: 1.0, x: x(0, 0), aL: { f: 0.2, e: 0.9, w: 0.1, out: 0.6 }, aR: { f: 0.3, e: 0.8, w: 0.1, out: 0.6 }, root: [0, 0, 0.05] }),
  make({ pelvis: [-0.1, -0.05, 0], chest: [0.3, -0.1, 0], neck: [0.4, 0, 0], head: [0.0, 0, 0], jaw: 0.3, x: x(0.9, 0), aL: { f: 1.3, e: 1.3, w: 0.3 }, aR: { f: 1.3, e: 1.3, w: 0.3 } }),
];
const crawlDie: RigPose[] = die.map((d, k) => make({
  ground: false, floor: d.floor, root: [d.root[0], d.root[1] - 0.04 * (k > 0 ? 1 : 0), d.root[2]], pelvis: d.rot.pelvis, spine: d.rot.spine, chest: d.rot.chest, neck: d.rot.neck, head: d.rot.head, jaw: d.rot.jaw[0],
  aL: { f: -d.rot.shoulderL[0], e: d.rot.elbowL[0], w: d.rot.wristL[0], out: d.rot.shoulderL[2] }, aR: { f: -d.rot.shoulderR[0], e: d.rot.elbowR[0], w: d.rot.wristR[0], out: -d.rot.shoulderR[2] },
}));

export const DRAGGER_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die,
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie,
};

export const DRAGGER_PART_POSES = {
  head: make({ neck: [0, 0, 0], head: [0, 0, 0], jaw: 0.5, ground: false }),
  arm: make({ aL: { f: 0.2, e: 0.5, w: 0.2 }, aR: { f: 0.2, e: 0.5, w: 0.2 }, ground: false }),
  // the ropes of gut, laid out
  legs: make({ pelvis: [0, 0, 0], gL: [0.0, 0.2, 0.0, 0.2, 0.0, 0.2], gR: [0.0, -0.2, 0.0, -0.2, 0.0, -0.2], ground: false }),
};

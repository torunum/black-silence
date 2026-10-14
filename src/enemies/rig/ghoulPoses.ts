import { lerpPose, pose, type Rot, type RigPose, type RigPoses } from "./kit";
import type { V3 } from "../../render/viewmodel/builder";

/**
 * THE GHOUL'S POSES: a walk of six, an idle, an attack of three (the wind-up,
 * the strike, the recover), two of pain and five of death, and the same again
 * for the legless ghoul that drags itself on its arms.
 *
 * Every pose is a handful of numbers (`Std`): the spine's lean, the head's
 * hang, each arm's swing and bend, each leg's swing and knee. `make` turns
 * them into joint rotations and, for a standing pose, lowers the pelvis until
 * the lowest foot is on the floor, so no step floats. Angles are radians; a
 * positive `f` swings a limb forward, a positive `k` bends a knee, a positive
 * pitch on the spine, chest, neck or head leans it toward the viewer.
 *
 * The walk is a function of the phase, so its six frames are the same cycle
 * sampled six times; a limp (the right leg short of its stride and dragging)
 * keeps it the ghoul's and not a man's.
 */

interface Arm { f: number; out?: number; tw?: number; e?: number; w?: number }
interface Leg { f: number; k?: number; out?: number; toe?: number }
interface Std {
  root?: V3; pelvis?: Rot; spine?: Rot; chest?: Rot; neck?: Rot; head?: Rot;
  jaw?: number; gut?: number; claw?: number;
  aL?: Arm; aR?: Arm; lL?: Leg; lR?: Leg;
  /** Lower the pelvis so the lowest foot is on the floor (default), or leave `root` as given. */
  ground?: boolean;
  floor?: number;
}

const PEL_Y = 0.88, ANKLE_Y = 0.04;
/** Height of an ankle below the pelvis for a leg swung `f` with its knee bent `k`. */
const ankleBelow = (f: number, k: number): number => -0.04 - 0.41 * Math.cos(f) - 0.39 * Math.cos(f - k);

function make(s: Std): RigPose {
  const rot: Record<string, Rot> = {};
  const set = (n: string, r: Rot | undefined): void => { if (r) rot[n] = r; };
  set("pelvis", s.pelvis); set("spine", s.spine ?? [0.1, 0, 0]); set("chest", s.chest ?? [0.12, 0, 0]);
  set("neck", s.neck ?? [0.02, 0, 0]); set("head", s.head ?? [0.08, 0, 0]);
  rot.jaw = [s.jaw ?? 0.3, 0, 0];
  const arm = (side: "L" | "R", a: Arm | undefined): void => {
    const d = a ?? { f: 0.1 }, o = side === "L" ? 1 : -1;
    rot["shoulder" + side] = [-d.f, d.tw ?? 0, (d.out ?? 0.16) * o];
    rot["elbow" + side] = [-(d.e ?? 0.5), 0, 0];
    rot["wrist" + side] = [-(d.w ?? 0.12), 0, 0];
  };
  arm("L", s.aL); arm("R", s.aR);
  const lg = (side: "L" | "R", l: Leg | undefined): number => {
    const d = l ?? { f: 0 }, k = d.k ?? 0.08, o = side === "L" ? 1 : -1;
    rot["hip" + side] = [-d.f, 0, (d.out ?? 0.03) * o];
    rot["knee" + side] = [k, 0, 0];
    rot["ankle" + side] = [d.f - k + (d.toe ?? 0), 0, 0];
    return ankleBelow(d.f, k);
  };
  const low = Math.min(lg("L", s.lL), lg("R", s.lR));
  let root: V3 = s.root ?? [0, 0, 0];
  if (s.ground !== false) root = [root[0], root[1] + ANKLE_Y - PEL_Y - low, root[2]];
  return pose(root, rot, { jaw: 0, gut: s.gut ?? 0, claw: s.claw ?? 0.4 }, s.floor);
}

const TAU = Math.PI * 2;

/** One step of the walk, `i` of 6. */
function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  const stride = 0.52, kneeL = 0.1 + 0.8 * Math.max(0, c), kneeR = 0.12 + 0.55 * Math.max(0, -c);
  return make({
    spine: [0.14 + 0.03 * c, 0.1 * c, 0.03 * s], chest: [0.22 - 0.04 * c, -0.16 * c, 0.05 * s],
    neck: [0.12, 0.12 * c, 0], head: [0.24 + 0.05 * Math.cos(2 * p), 0.1 * c, -0.04 * s],
    jaw: 0.28 + 0.16 * Math.max(0, Math.sin(2 * p)),
    gut: Math.sin(p + 0.9), claw: 0.35 + 0.15 * s,
    aL: { f: 0.18 - 0.32 * s, out: 0.3, e: 0.55 + 0.2 * c, w: 0.1 },
    aR: { f: 0.45 + 0.34 * s, out: 0.22, e: 0.85 - 0.25 * c, w: 0.25 },
    lL: { f: stride * s, k: kneeL, toe: 0.2 * Math.max(0, -s) },
    lR: { f: -0.8 * stride * s, k: kneeR, toe: 0.1 },
    root: [0.02 * s, 0.012 * Math.cos(2 * p), 0],
  });
}

const idle = make({ jaw: 0.3, gut: 0.15, aL: { f: 0.12, out: 0.28, e: 0.5 }, aR: { f: 0.34, out: 0.2, e: 0.8, w: 0.25 }, lL: { f: 0.05, k: 0.1 }, lR: { f: -0.1, k: 0.16 } });

/** The attack: the ghoul rears (it has no wind-up to speak of, `atkAnim` lasts .22 s), lunges and rakes, and recovers. */
const atk: RigPose[] = [
  make({ spine: [-0.12, 0, 0], chest: [-0.12, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0], jaw: 1.0, claw: 0, gut: -0.4,
    aL: { f: 1.85, out: 0.5, e: 0.5, w: 0.1 }, aR: { f: 1.95, out: 0.4, e: 0.4, w: 0.1 },
    lL: { f: 0.35, k: 0.7 }, lR: { f: -0.2, k: 0.55 }, root: [0, 0, 0.04] }),
  make({ spine: [0.55, -0.1, 0], chest: [0.5, -0.18, 0], neck: [-0.35, 0, 0], head: [-0.25, 0, 0], jaw: 0.75, claw: 1, gut: 0.9,
    aL: { f: 1.2, out: 0.3, e: 0.3, w: 0.35 }, aR: { f: 1.0, out: 0.2, e: 0.4, w: 0.35 },
    lL: { f: 0.6, k: 0.75 }, lR: { f: -0.35, k: 0.5 }, root: [0, 0, -0.1] }),
  make({ spine: [0.34, 0, 0], chest: [0.36, 0, 0], neck: [0.15, 0, 0], head: [0.34, 0, 0], jaw: 0.3, claw: 0.8, gut: 0.4,
    aL: { f: 0.55, out: 0.25, e: 0.6 }, aR: { f: 0.7, out: 0.15, e: 0.8 },
    lL: { f: 0.3, k: 0.4 }, lR: { f: -0.2, k: 0.3 }, root: [0, 0, -0.04] }),
];

/** Pain: thrown back with the mouth open, then folded over the wound. */
const pain: RigPose[] = [
  make({ spine: [-0.1, 0.1, 0.05], chest: [-0.2, 0.2, 0.06], neck: [-0.15, 0, 0], head: [-0.35, 0.15, 0], jaw: 0.95, claw: 0, gut: -0.5,
    aL: { f: -0.3, out: 0.75, e: 0.35, w: 0 }, aR: { f: 0.2, out: 0.7, e: 0.3, w: 0 },
    lL: { f: -0.15, k: 0.25 }, lR: { f: 0.12, k: 0.2 }, root: [0, 0, 0.05] }),
  make({ spine: [0.5, -0.1, 0], chest: [0.45, -0.1, 0], neck: [-0.3, 0, 0], head: [-0.1, 0, 0], jaw: 0.35, claw: 0.9, gut: 0.7,
    aL: { f: 0.9, out: -0.05, e: 1.5, w: 0.3 }, aR: { f: 0.9, out: -0.05, e: 1.5, w: 0.3 },
    lL: { f: 0.25, k: 0.55 }, lR: { f: -0.1, k: 0.45 }, root: [0, 0, 0] }),
];

/** Death, with the floor each frame is drawn on (`enemyTick` sinks a dying sprite as it falls, so the floor rises in the frame). */
const die: RigPose[] = [
  make({ spine: [-0.16, 0, 0.1], chest: [-0.28, 0.1, 0.12], neck: [-0.2, 0, 0], head: [-0.45, 0, 0], jaw: 1.05, claw: 0, gut: -0.6,
    aL: { f: 1.2, out: 0.8, e: 0.3, w: 0 }, aR: { f: 1.0, out: 0.8, e: 0.3, w: 0 },
    lL: { f: 0.2, k: 0.45 }, lR: { f: -0.18, k: 0.4 }, root: [0.02, 0, 0.07], floor: 0.975 }),
  make({ spine: [0.1, 0, 0.14], chest: [-0.12, 0.1, 0.18], neck: [-0.15, 0, 0], head: [-0.2, 0.2, 0.1], jaw: 0.8, claw: 0.1, gut: 0.5,
    aL: { f: 0.1, out: 0.55, e: 0.25, w: 0 }, aR: { f: 0.3, out: 0.65, e: 0.3, w: 0 },
    lL: { f: 1.35, k: 1.95, out: 0.15 }, lR: { f: 1.2, k: 1.85, out: 0.15 },
    ground: false, root: [-0.04, -0.4, -0.04], floor: 0.93 }),
  make({ pelvis: [0, 0, 0.55], spine: [0.1, 0, 0.3], chest: [-0.05, 0, 0.3], neck: [-0.1, 0, 0.1], head: [-0.1, 0.1, 0.3], jaw: 0.6, claw: 0.2, gut: 0.8,
    aL: { f: 0.2, out: 0.4, e: 0.3 }, aR: { f: -0.2, out: 0.35, e: 0.4 },
    lL: { f: 1.0, k: 1.7, out: 0.2 }, lR: { f: 0.6, k: 1.6, out: 0.2 },
    ground: false, root: [-0.26, -0.44, 0], floor: 0.866 }),
  make({ pelvis: [0, 0, 1.15], spine: [0.1, 0, 0.2], chest: [0.0, 0, 0.2], neck: [0, 0, 0.1], head: [0.1, 0.1, 0.25], jaw: 0.5, claw: 0.3, gut: 0.3,
    aL: { f: -0.1, out: 0.45, e: 0.5 }, aR: { f: 0.3, out: 0.55, e: 0.7 },
    lL: { f: 1.35, k: 2.1, out: 0.25 }, lR: { f: 0.9, k: 1.95, out: 0.2 },
    ground: false, root: [-0.33, -0.5, 0], floor: 0.78 }),
  make({ pelvis: [0, 0, 1.4], spine: [0.1, 0, 0.1], chest: [0.05, 0, 0.1], neck: [0, 0, 0.05], head: [0.1, 0.1, 0.2], jaw: 0.5, claw: 0.2, gut: 0,
    aL: { f: -0.2, out: 0.5, e: 0.5 }, aR: { f: 0.4, out: 0.6, e: 0.8 },
    lL: { f: 1.45, k: 2.2, out: 0.3 }, lR: { f: 1.1, k: 2.05, out: 0.3 },
    ground: false, root: [-0.35, -0.52, 0], floor: 0.7 }),
];

/** Walking on its arms, with the legs gone: the hips drag, the body is propped up on its arms and the head comes up to look. */
function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.7 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.14 * c, 0.05 * s], chest: [0.3, -0.2 * c, 0.06 * s], neck: [-0.35, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0], jaw: 0.2 + 0.12 * Math.max(0, s), gut: c, claw: 0.7,
    aL: { f: 0.55 + 0.4 * s, out: 0.35, e: 0.85 - 0.3 * s, w: 0.4 }, aR: { f: 0.55 - 0.4 * s, out: 0.3, e: 0.85 + 0.3 * s, w: 0.4 },
  });
}

const crawlIdle = crawl(0);
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.66, 0.05], spine: [0.15, 0, 0], chest: [-0.1, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0], jaw: 1.0, claw: 0, gut: -0.5,
    aL: { f: 2.0, out: 0.5, e: 0.4 }, aR: { f: 2.1, out: 0.4, e: 0.4 } }),
  make({ ground: false, root: [0, -0.75, -0.1], spine: [0.85, 0, 0], chest: [0.5, -0.2, 0], neck: [-0.5, 0, 0], head: [-0.3, 0, 0], jaw: 0.75, claw: 1, gut: 0.8,
    aL: { f: 1.3, out: 0.3, e: 0.3 }, aR: { f: 1.15, out: 0.25, e: 0.4 } }),
  make({ ground: false, root: [0.05, -0.72, -0.04], spine: [0.65, 0, 0], chest: [0.4, 0, 0], neck: [-0.4, 0, 0], head: [-0.3, 0, 0], jaw: 0.3, claw: 0.7, gut: 0.3,
    aL: { f: 0.9, out: 0.4, e: 0.5 }, aR: { f: 0.95, out: 0.4, e: 0.55 } }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.68, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.6, 0.15, 0], jaw: 0.95, claw: 0, gut: -0.5,
    aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.85, e: 0.3, w: 0 } }),
  make({ ground: false, root: [0, -0.76, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], jaw: 0.35, claw: 0.8, gut: 0.6,
    aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 } }),
];
const crawlDie: RigPose[] = [
  make({ ground: false, floor: 0.975, root: [0.02, -0.7, 0.05], spine: [0.0, 0, 0.1], chest: [-0.2, 0, 0.1], neck: [-0.3, 0, 0], head: [-0.5, 0, 0.1], jaw: 1.0, claw: 0, gut: -0.4,
    aL: { f: 1.5, out: 0.6, e: 0.2, w: 0 }, aR: { f: 1.4, out: 0.6, e: 0.2, w: 0 } }),
  make({ ground: false, floor: 0.93, root: [-0.10, -0.7, 0], pelvis: [0, 0, 0.45], spine: [0.3, 0, 0.1], chest: [0.1, 0, 0.1], neck: [-0.1, 0, 0], head: [-0.2, 0.1, 0.1], jaw: 0.7, claw: 0.1, gut: 0.4,
    aL: { f: 0.9, out: 0.7, e: 0.4 }, aR: { f: 1.0, out: 0.7, e: 0.4 } }),
  make({ ground: false, floor: 0.866, root: [-0.24, -0.66, 0], pelvis: [0, 0, 0.95], spine: [0.2, 0, 0.1], chest: [0.1, 0, 0.1], neck: [0, 0, 0], head: [0.1, 0.1, 0.1], jaw: 0.5, claw: 0.2, gut: 0.2,
    aL: { f: 0.5, out: 0.9, e: 0.3 }, aR: { f: 0.7, out: 0.9, e: 0.3 } }),
  make({ ground: false, floor: 0.78, root: [-0.32, -0.64, 0], pelvis: [0, 0, 1.3], spine: [0.1, 0, 0.1], chest: [0.1, 0, 0.1], neck: [0.1, 0, 0], head: [0.2, 0.1, 0.1], jaw: 0.5, claw: 0.2, gut: 0.1,
    aL: { f: -0.1, out: 0.7, e: 0.5 }, aR: { f: 0.0, out: 0.7, e: 0.5 } }),
  make({ ground: false, floor: 0.7, root: [-0.37, -0.64, 0], pelvis: [0, 0, 1.45], spine: [0.1, 0, 0.1], chest: [0.1, 0, 0.1], neck: [0.1, 0, 0], head: [0.3, 0.1, 0.1], jaw: 0.45, claw: 0.1, gut: 0,
    aL: { f: -0.2, out: 0.75, e: 0.5 }, aR: { f: -0.1, out: 0.75, e: 0.5 } }),
];

export const GHOUL_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die,
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle, crawlAtk, crawlPain, crawlDie,
};

/** The poses the severed parts are baked in: upright, nothing leaning. */
export const GHOUL_PART_POSES = {
  head: make({ head: [0.05, 0, 0], jaw: 0.35, ground: false }),
  arm: make({ aL: { f: 0, out: 0.1, e: 0.35, w: 0.1 }, aR: { f: 0, out: 0.1, e: 0.35, w: 0.1 }, claw: 0.5, ground: false }),
  legs: make({ lL: { f: 0, k: 0.1 }, lR: { f: 0, k: 0.1 } }),
};

export { lerpPose };

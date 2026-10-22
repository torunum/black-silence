import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE SLAUGHTAUR'S POSES: a trot of six (the forelegs are the rig's legs; the hind ones stride with them, `stride`), the shield
 * held before it; an idle; the attack brings the shield up and the skull in it screams blue fire (`fire`); two of pain, five of
 * death, and the crawl of the man-half when the horse is shot out from under it.
 */

type KStd = Omit<Std, "x"> & { stride?: number; fire?: number };
export const SLAUGHTAUR_BODY = dims({
  pelvisY: 0.96, spineY: 0.06, chestY: 0.28, neckY: 0.38, neckZ: -0.01, headY: 0.07, headZ: 0, jawY: 0.03, jawZ: 0,
  shoulderX: 0.38, shoulderY: 0.28, upperArm: 0.31, foreArm: 0.29, hipX: 0.16, hipDrop: 0.24, thigh: 0.36, shin: 0.32, ankleY: 0.04,
  rest: { spine: [0.0, 0, 0], chest: [0.0, 0, 0], neck: [0, 0, 0], head: [0.05, 0, 0], jaw: 0, arm: { f: 0.2, out: 0.25, e: 0.5, w: 0.1 }, leg: { f: 0.0, k: 0.15, out: 0.0 } },
});
const std = makeStd(SLAUGHTAUR_BODY);
/** The horse half shot off, as it flies: standing on its own legs, not lying on its side (on its side it is wider than the monster). */
export const SLAUGHTAUR_LEGS_POSE: RigPose = std({ lL: { f: 0.3, k: 0.5 }, lR: { f: -0.2, k: 0.3 }, ground: false });
const make = (s: KStd): RigPose => std({ ...s, x: { stride: s.stride ?? 0, fire: s.fire ?? 0 } });
const TAU = Math.PI * 2;
const GUARD = { aL: { f: 0.4, out: 0.3, tw: -0.6, e: 1.1, w: 0 }, aR: { f: 0.3, out: 0.3, e: 0.7, w: 0.2 } };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.03 * c, 0.05 * c, 0.02 * s], chest: [0.02, -0.06 * c, 0.02 * s], head: [0.05, 0.05 * c, 0],
    aL: { ...GUARD.aL, f: GUARD.aL.f + 0.05 * s }, aR: { ...GUARD.aR, f: GUARD.aR.f + 0.25 * s },
    lL: { f: 0.5 * s, k: 0.15 + 0.9 * Math.max(0, c) }, lR: { f: -0.5 * s, k: 0.15 + 0.9 * Math.max(0, -c) },
    root: [0, 0.02 * Math.cos(2 * p), 0], stride: c,
  });
}

const idle = make({ ...GUARD, lL: { f: 0.05, k: 0.15 }, lR: { f: -0.05, k: 0.15 } });

/** The shield up, the skull in it screaming fire; down again. */
const atk: RigPose[] = [
  make({ aL: { f: 0.9, out: 0.2, tw: -0.6, e: 0.9, w: 0 }, aR: { f: 0.1, out: 0.5, e: 0.4 }, spine: [-0.05, 0.1, 0], chest: [-0.05, 0.1, 0], fire: 0.4, lL: { f: 0.3, k: 0.6 }, lR: { f: -0.1, k: 0.2 } }),
  make({ aL: { f: 1.3, out: 0.15, tw: -0.5, e: 0.5, w: 0 }, aR: { f: -0.1, out: 0.6, e: 0.3 }, spine: [0.08, 0.15, 0], chest: [0.08, 0.15, 0], head: [0.15, 0, 0], fire: 1, lL: { f: 0.4, k: 0.8 }, lR: { f: -0.15, k: 0.25 }, root: [0, 0, -0.06] }),
  make({ aL: { f: 0.8, out: 0.25, tw: -0.6, e: 0.9, w: 0 }, aR: { f: 0.2, out: 0.4, e: 0.6 }, spine: [0.04, 0.08, 0], chest: [0.04, 0.08, 0], fire: 0.3, lL: { f: 0.2, k: 0.4 }, lR: { f: -0.1, k: 0.2 } }),
];

const pain: RigPose[] = [
  make({ spine: [-0.15, 0.1, 0.05], chest: [-0.2, 0.12, 0.05], head: [-0.3, 0.1, 0], aL: { ...GUARD.aL, f: 0.7, out: 0.6 }, aR: { f: -0.1, out: 0.8, e: 0.3 }, lL: { f: -0.3, k: 0.3 }, lR: { f: 0.2, k: 0.3 }, stride: -0.5, root: [0, 0, 0.05] }),
  make({ spine: [0.3, -0.06, 0], chest: [0.25, -0.06, 0], head: [0.1, 0, 0], aL: { ...GUARD.aL, f: 0.9, e: 1.3 }, aR: { f: 0.6, out: 0.15, e: 1.1 }, lL: { f: 0.5, k: 1.0 }, lR: { f: 0.3, k: 0.8 }, stride: 0.6 }),
];

const fall = { y: 1.1, x: 1.1, xs: (k: number) => ({ stride: [0.5, 1, 1, 1, 1][k], fire: 0 }) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.66 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.16 * c, 0.06 * s], neck: [-0.35, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0],
    aL: { f: 0.6 + 0.4 * s, out: 0.38, e: 0.8 - 0.3 * s, w: 0.4 }, aR: { f: 0.6 - 0.4 * s, out: 0.3, e: 0.8 + 0.3 * s, w: 0.2 }, stride: 1,
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.62, 0.05], spine: [0.25, 0, 0], chest: [0.05, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 1.1, out: 0.2, e: 0.6 }, aR: { f: 0.6, out: 0.4, e: 0.6 }, fire: 0.4, stride: 1 }),
  make({ ground: false, root: [0.05, -0.62, 0.08], spine: [0.2, 0, 0], chest: [0.0, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 1.4, out: 0.15, e: 0.3 }, aR: { f: 0.5, out: 0.4, e: 0.6 }, fire: 1, stride: 1 }),
  make({ ground: false, root: [0.05, -0.66, 0.03], spine: [0.4, 0, 0], chest: [0.2, 0, 0], neck: [-0.3, 0, 0], head: [-0.25, 0, 0], aL: { f: 0.9, out: 0.3, e: 0.7 }, aR: { f: 0.6, out: 0.4, e: 0.6 }, fire: 0.3, stride: 1 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.62, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.5, 0.15, 0], aL: { f: 0.3, out: 0.8, e: 0.5 }, aR: { f: 0.4, out: 0.8, e: 0.4 }, stride: 1 }),
  make({ ground: false, root: [0, -0.7, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 }, stride: 1 }),
];

export const SLAUGHTAUR_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

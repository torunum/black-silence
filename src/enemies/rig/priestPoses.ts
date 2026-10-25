import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE PRIEST'S POSES: a procession of six (slow, upright, the crosier planted ahead with each step, the censer swinging:
 * `swing`), an idle, the cast (the crosier raised, the light in its crook: `cast`, then thrust at you), two of pain, five of
 * death and the crawl.
 */

type QStd = Omit<Std, "x"> & { cast?: number; swing?: number; tilt?: number };
export const PRIEST_BODY = dims({
  pelvisY: 1.0, spineY: 0.07, chestY: 0.32, neckY: 0.4, neckZ: -0.01, headY: 0.1, headZ: -0.01, jawY: 0.0, jawZ: 0,
  shoulderX: 0.3, shoulderY: 0.3, upperArm: 0.36, foreArm: 0.34, hipX: 0.12, hipDrop: 0.04, thigh: 0.47, shin: 0.45, ankleY: 0.04,
  rest: { spine: [0.04, 0, 0], chest: [0.06, 0, 0], neck: [0.06, 0, 0], head: [0.04, 0, 0], jaw: 0, arm: { f: 0.2, out: 0.2, e: 0.5, w: 0.1 }, leg: { f: 0, k: 0.05, out: 0.04 } },
});
const std = makeStd(PRIEST_BODY);
const make = (s: QStd): RigPose => std({ ...s, x: { cast: s.cast ?? 0, swing: s.swing ?? 0, tilt: s.tilt ?? 0.6 } });
const TAU = Math.PI * 2;
/** The crosier held upright before him (the right forearm forward), the censer hanging from the left. */
const HOLD = { aR: { f: 0.25, out: 0.5, e: 1.2, w: 0.15 }, aL: { f: 0.1, out: 0.3, e: 0.3, w: 0.1 } };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.04 + 0.02 * c, 0.04 * c, 0.02 * s], chest: [0.06, -0.05 * c, 0.02 * s], head: [0.04, 0.04 * c, 0],
    aR: { ...HOLD.aR, f: HOLD.aR.f + 0.12 * s }, aL: { ...HOLD.aL, f: HOLD.aL.f - 0.15 * s },
    lL: { f: 0.32 * s, k: 0.05 + 0.6 * Math.max(0, c) }, lR: { f: -0.32 * s, k: 0.05 + 0.6 * Math.max(0, -c) },
    root: [0.01 * s, 0.01 * Math.cos(2 * p), 0], swing: s,
  });
}

const idle = make({ ...HOLD });

const atk: RigPose[] = [
  make({ aR: { f: 2.3, out: 0.3, e: 0.6, w: 0 }, aL: { f: 0.5, out: 0.8, e: 0.3 }, spine: [-0.08, 0, 0], chest: [-0.1, 0, 0], head: [-0.15, 0, 0], cast: 0.5, swing: 0.8, tilt: 0, root: [0, 0, 0.04] }),
  make({ aR: { f: 1.45, out: 0.2, e: 0.2, w: 0 }, aL: { f: 0.3, out: 0.9, e: 0.2 }, spine: [0.15, 0, 0], chest: [0.15, 0, 0], head: [0.1, 0, 0], cast: 1, swing: -0.6, tilt: 0, lL: { f: 0.25, k: 0.3 }, lR: { f: -0.15, k: 0.15 }, root: [0, 0, -0.06] }),
  make({ aR: { f: 0.9, out: 0.25, e: 0.8, w: -0.1 }, aL: { f: 0.2, out: 0.5, e: 0.3 }, spine: [0.08, 0, 0], chest: [0.08, 0, 0], cast: 0.3, swing: 0.3, tilt: 0.3 }),
];

const pain: RigPose[] = [
  make({ spine: [-0.15, 0.1, 0.05], chest: [-0.2, 0.12, 0.05], neck: [-0.1, 0, 0], head: [-0.3, 0.1, 0], aR: { ...HOLD.aR, out: 0.6 }, aL: { f: -0.2, out: 0.9, e: 0.4 }, lL: { f: -0.1, k: 0.15 }, lR: { f: 0.08, k: 0.15 }, swing: 1, root: [0, 0, 0.05] }),
  make({ spine: [0.35, -0.08, 0], chest: [0.3, -0.08, 0], head: [0.15, 0, 0], aR: { ...HOLD.aR, f: 0.6 }, aL: { f: 0.9, out: 0.1, e: 1.4 }, lL: { f: 0.2, k: 0.4 }, lR: { f: -0.08, k: 0.3 }, swing: -1 }),
];

const fall = { y: 1.14, x: 1.2, xs: (k: number) => ({ cast: 0, swing: [1, 0.5, -0.5, -1, -1][k] }) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.8 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.16 * c, 0.06 * s], neck: [-0.35, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0],
    aL: { f: 0.6 + 0.4 * s, out: 0.38, e: 0.8 - 0.3 * s, w: 0.4 }, aR: { f: 0.6 - 0.4 * s, out: 0.3, e: 0.8 + 0.3 * s, w: 0.2 }, swing: s,
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.76, 0.05], spine: [0.2, 0, 0], chest: [0, 0, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 0.8, out: 0.4, e: 0.6 }, aR: { f: 2.2, out: 0.3, e: 0.5 }, cast: 0.5 }),
  make({ ground: false, root: [0.05, -0.78, -0.06], spine: [0.4, 0, 0], chest: [0.2, 0, 0], neck: [-0.3, 0, 0], head: [-0.2, 0, 0], aL: { f: 0.8, out: 0.4, e: 0.6 }, aR: { f: 1.4, out: 0.2, e: 0.2 }, cast: 1 }),
  make({ ground: false, root: [0.05, -0.8, -0.02], spine: [0.45, 0, 0], chest: [0.25, 0, 0], neck: [-0.3, 0, 0], head: [-0.25, 0, 0], aL: { f: 0.7, out: 0.4, e: 0.6 }, aR: { f: 0.9, out: 0.3, e: 0.6 }, cast: 0.3 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.76, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.5, 0.15, 0], aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.8, e: 0.4, w: 0 } }),
  make({ ground: false, root: [0, -0.84, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 } }),
];

export const PRIEST_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

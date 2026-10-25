import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE UNMADE PRIEST'S POSES: a lope of six, bent double, the long arms swinging nearly to the floor and the rags with them
 * (`swing`); an idle; the cast (both arms thrown up, the light in his hooks: `cast`, then flung); pain; a fall; the crawl.
 */

type QStd = Omit<Std, "x"> & { cast?: number; swing?: number };
export const PRIEST2_BODY = dims({
  pelvisY: 0.92, spineY: 0.07, chestY: 0.32, neckY: 0.42, neckZ: -0.05, headY: 0.08, headZ: -0.04, jawY: 0.02, jawZ: -0.01,
  shoulderX: 0.44, shoulderY: 0.3, upperArm: 0.44, foreArm: 0.42, hipX: 0.15, hipDrop: 0.04, thigh: 0.44, shin: 0.42, ankleY: 0.045,
  rest: { spine: [0.35, 0, 0], chest: [0.3, 0, 0], neck: [-0.35, 0, 0], head: [-0.15, 0, 0], jaw: 0.35, arm: { f: 0.3, out: 0.35, e: 0.4, w: 0.2 }, leg: { f: 0.15, k: 0.45, out: 0.12 } },
});
const std = makeStd(PRIEST2_BODY);
const make = (s: QStd): RigPose => std({ ...s, x: { cast: s.cast ?? 0, swing: s.swing ?? 0 } });
const TAU = Math.PI * 2;

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.38 + 0.04 * c, 0.08 * c, 0.04 * s], chest: [0.3, -0.12 * c, 0.05 * s], neck: [-0.35, 0.06 * c, 0], head: [-0.15, 0.08 * c, -0.04 * s], jaw: 0.35 + 0.2 * Math.max(0, s),
    aL: { f: 0.3 - 0.45 * s, out: 0.4, e: 0.35 + 0.2 * c, w: 0.2 }, aR: { f: 0.3 + 0.45 * s, out: 0.4, e: 0.35 - 0.2 * c, w: 0.2 },
    lL: { f: 0.15 + 0.45 * s, k: 0.45 + 0.6 * Math.max(0, c), out: 0.13 }, lR: { f: 0.15 - 0.45 * s, k: 0.45 + 0.6 * Math.max(0, -c), out: 0.13 },
    root: [0.03 * s, 0.02 * Math.cos(2 * p), 0], swing: s,
  });
}

const idle = make({});

const atk: RigPose[] = [
  make({ spine: [0.05, 0, 0], chest: [-0.05, 0, 0], neck: [-0.2, 0, 0], head: [-0.25, 0, 0], jaw: 0.9, aL: { f: 2.4, out: 0.6, e: 0.3 }, aR: { f: 2.4, out: 0.6, e: 0.3 }, cast: 0.5, swing: 0.8, root: [0, 0, 0.05] }),
  make({ spine: [0.45, 0, 0], chest: [0.35, 0, 0], neck: [-0.3, 0, 0], head: [-0.1, 0, 0], jaw: 1.1, aL: { f: 1.3, out: 0.4, e: 0.1 }, aR: { f: 1.3, out: 0.4, e: 0.1 }, cast: 1, swing: -0.8, lL: { f: 0.4, k: 0.7 }, lR: { f: -0.1, k: 0.4 }, root: [0, 0, -0.1] }),
  make({ spine: [0.4, 0, 0], chest: [0.3, 0, 0], jaw: 0.6, aL: { f: 0.7, out: 0.4, e: 0.4 }, aR: { f: 0.7, out: 0.4, e: 0.4 }, cast: 0.3, swing: -0.3 }),
];

const pain: RigPose[] = [
  make({ spine: [0.05, 0.12, 0.05], chest: [-0.1, 0.16, 0.06], neck: [-0.3, 0, 0], head: [-0.4, 0.12, 0], jaw: 1.1, aL: { f: -0.2, out: 0.9, e: 0.4 }, aR: { f: 0.1, out: 0.9, e: 0.4 }, swing: 1, root: [0, 0, 0.05] }),
  make({ spine: [0.6, -0.1, 0], chest: [0.45, -0.1, 0], neck: [-0.2, 0, 0], head: [0.0, 0, 0], jaw: 0.5, aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 }, swing: -1 }),
];

const fall = { y: 1.05, x: 1.2, xs: (k: number) => ({ cast: 0, swing: [1, 0.5, -0.5, -1, -1][k] }), jaw: (k: number) => [1.1, 0.9, 0.7, 0.6, 0.6][k] };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.72 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.16 * c, 0.06 * s], neck: [-0.4, 0.1 * c, 0], head: [-0.2, 0.1 * c, 0],
    aL: { f: 0.6 + 0.4 * s, out: 0.4, e: 0.6 - 0.3 * s, w: 0.4 }, aR: { f: 0.6 - 0.4 * s, out: 0.4, e: 0.6 + 0.3 * s, w: 0.4 }, swing: s,
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.68, 0.05], spine: [0.15, 0, 0], chest: [-0.05, 0, 0], neck: [-0.3, 0, 0], head: [-0.2, 0, 0], jaw: 0.9, aL: { f: 2.2, out: 0.5, e: 0.3 }, aR: { f: 2.2, out: 0.5, e: 0.3 }, cast: 0.5 }),
  make({ ground: false, root: [0, -0.76, -0.08], spine: [0.6, 0, 0], chest: [0.4, 0, 0], neck: [-0.45, 0, 0], head: [-0.2, 0, 0], jaw: 1.1, aL: { f: 1.2, out: 0.4, e: 0.2 }, aR: { f: 1.2, out: 0.4, e: 0.2 }, cast: 1 }),
  make({ ground: false, root: [0.05, -0.72, -0.03], spine: [0.5, 0, 0], chest: [0.35, 0, 0], neck: [-0.4, 0, 0], head: [-0.2, 0, 0], jaw: 0.6, aL: { f: 0.8, out: 0.4, e: 0.5 }, aR: { f: 0.8, out: 0.4, e: 0.5 }, cast: 0.3 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.68, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.2, 0, 0], head: [-0.5, 0.15, 0], jaw: 1.1, aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.8, e: 0.3, w: 0 } }),
  make({ ground: false, root: [0, -0.76, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], jaw: 0.5, aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 } }),
];

export const PRIEST2_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

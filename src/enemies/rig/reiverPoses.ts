import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE REIVER'S POSES. It flies: the "walk" is six frames of it drifting with its rags streaming (`trail`), the arms swimming at
 * the air; the attack draws them back and flings them, the light in its hands (`cast`); pain, a fall, and the crawl (its rags and
 * spine torn away, it hangs on).
 */

type RStd = Omit<Std, "x"> & { trail?: number; cast?: number };
export const REIVER_BODY = dims({
  pelvisY: 0.75, spineY: 0.04, chestY: 0.3, neckY: 0.34, neckZ: -0.04, headY: 0.06, headZ: -0.02, jawY: 0.02, jawZ: -0.01,
  shoulderX: 0.27, shoulderY: 0.28, upperArm: 0.3, foreArm: 0.3, hipX: 0.04, hipDrop: 0.02, thigh: 0.36, shin: 0.32, ankleY: 0.02,
  rest: { spine: [0.15, 0, 0], chest: [0.15, 0, 0], neck: [0.05, 0, 0], head: [0.0, 0, 0], jaw: 0.35, arm: { f: 0.6, out: 0.5, e: 0.8, w: 0.3 }, leg: { f: -0.4, k: 0.4, out: 0.05 } },
});
const std = makeStd(REIVER_BODY);
const make = (s: RStd): RigPose => std({ ...s, x: { trail: s.trail ?? 0.4, cast: s.cast ?? 0.25 } });   // a witch-light burns in its claws even when it is not throwing it
const TAU = Math.PI * 2;

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.15 + 0.04 * c, 0.06 * s, 0.03 * s], chest: [0.15, -0.06 * s, 0.03 * c], head: [0.02 * c, 0.08 * s, 0], jaw: 0.3 + 0.15 * Math.max(0, s),
    aL: { f: 0.6 + 0.4 * s, out: 0.8, e: 0.7 - 0.3 * c, w: 0.3 }, aR: { f: 0.6 - 0.4 * s, out: 0.8, e: 0.7 + 0.3 * c, w: 0.3 },
    lL: { f: -0.4 + 0.2 * s, k: 0.4 + 0.3 * c }, lR: { f: -0.4 - 0.2 * s, k: 0.4 - 0.3 * c },
    root: [0.02 * s, 0.03 * Math.sin(p + 1), 0], trail: 0.5 + 0.3 * s,
  });
}

const idle = make({ trail: 0.3, aL: { f: 0.5, out: 0.85, e: 0.8, w: 0.3 }, aR: { f: 0.5, out: 0.85, e: 0.8, w: 0.3 } });

const atk: RigPose[] = [
  make({ spine: [-0.05, 0, 0], chest: [-0.1, 0, 0], head: [-0.1, 0, 0], jaw: 0.6, aL: { f: -0.2, out: 1.0, e: 1.0 }, aR: { f: -0.2, out: 1.0, e: 1.0 }, trail: 0.2, cast: 0.4, root: [0, 0, 0.05] }),
  make({ spine: [0.35, 0, 0], chest: [0.3, 0, 0], head: [0.1, 0, 0], jaw: 1.0, aL: { f: 1.4, out: 0.35, e: 0.2 }, aR: { f: 1.4, out: 0.35, e: 0.2 }, trail: 0.9, cast: 1, root: [0, 0, -0.08] }),
  make({ spine: [0.25, 0, 0], chest: [0.2, 0, 0], head: [0.05, 0, 0], jaw: 0.5, aL: { f: 1.0, out: 0.45, e: 0.5 }, aR: { f: 1.0, out: 0.45, e: 0.5 }, trail: 0.6, cast: 0.3, root: [0, 0, -0.03] }),
];

const pain: RigPose[] = [
  make({ spine: [-0.15, 0.15, 0.1], chest: [-0.2, 0.2, 0.1], head: [-0.4, 0.15, 0], jaw: 0.9, aL: { f: -0.2, out: 1.1, e: 0.3 }, aR: { f: 0.1, out: 1.0, e: 0.3 }, trail: 0.1, root: [0.02, 0, 0.05] }),
  make({ spine: [0.5, -0.1, 0], chest: [0.35, -0.1, 0], head: [0.1, 0, 0], jaw: 0.4, aL: { f: 1.0, out: 0.2, e: 1.5 }, aR: { f: 1.0, out: 0.2, e: 1.5 }, trail: 0.7 }),
];

const fall = { y: 0.85, x: 0.9, xs: (k: number) => ({ trail: [0.2, 0.5, 0.8, 1, 1][k], cast: [0.2, 0.1, 0, 0, 0][k] }), jaw: (k: number) => [1, 0.8, 0.6, 0.5, 0.5][k] };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({ ground: false, root: [0.02 * s, -0.45 + 0.02 * c, 0], spine: [0.2, 0.05 * s, 0], chest: [0.15, 0, 0], aL: { f: 0.7 + 0.35 * s, out: 0.6, e: 0.7 }, aR: { f: 0.7 - 0.35 * s, out: 0.6, e: 0.7 }, trail: 0.4 });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0, -0.45, 0.05], spine: [-0.05, 0, 0], chest: [-0.1, 0, 0], jaw: 0.6, aL: { f: -0.2, out: 1.0, e: 1.0 }, aR: { f: -0.2, out: 1.0, e: 1.0 }, cast: 0.4 }),
  make({ ground: false, root: [0, -0.47, -0.08], spine: [0.35, 0, 0], chest: [0.3, 0, 0], jaw: 1.0, aL: { f: 1.4, out: 0.35, e: 0.2 }, aR: { f: 1.4, out: 0.35, e: 0.2 }, cast: 1 }),
  make({ ground: false, root: [0, -0.46, -0.03], spine: [0.25, 0, 0], chest: [0.2, 0, 0], jaw: 0.5, aL: { f: 1.0, out: 0.45, e: 0.5 }, aR: { f: 1.0, out: 0.45, e: 0.5 }, cast: 0.3 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.02, -0.45, 0.05], spine: [-0.15, 0.15, 0.1], chest: [-0.2, 0.2, 0.1], head: [-0.4, 0.15, 0], jaw: 0.9, aL: { f: -0.2, out: 1.1, e: 0.3 }, aR: { f: 0.1, out: 1.0, e: 0.3 } }),
  make({ ground: false, root: [0, -0.47, 0], spine: [0.5, -0.1, 0], chest: [0.35, -0.1, 0], jaw: 0.4, aL: { f: 1.0, out: 0.2, e: 1.5 }, aR: { f: 1.0, out: 0.2, e: 1.5 } }),
];

export const REIVER_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

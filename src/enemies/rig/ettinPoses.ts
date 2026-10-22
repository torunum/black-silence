import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE ETTIN'S POSES: a lumbering walk of six (hunched, the long arms swinging, the maul in the right), an idle, the slam (the
 * maul up over the heads in both fists, down in front of it, the recover), two of pain, five of death and the crawl. `sway`
 * swings the loincloth; `jaw` hangs both mouths.
 */

type NStd = Omit<Std, "x"> & { sway?: number; tilt?: number };
export const ETTIN_BODY = dims({
  pelvisY: 0.86, spineY: 0.08, chestY: 0.32, neckY: 0.38, neckZ: -0.06, headY: 0.07, headZ: -0.04, jawY: 0.03, jawZ: -0.01,
  shoulderX: 0.46, shoulderY: 0.28, upperArm: 0.38, foreArm: 0.36, hipX: 0.17, hipDrop: 0.05, thigh: 0.4, shin: 0.39, ankleY: 0.055,
  rest: { spine: [0.18, 0, 0], chest: [0.2, 0, 0], neck: [0.15, 0, 0], head: [-0.05, 0, 0], jaw: 0.3, arm: { f: 0.15, out: 0.3, e: 0.45, w: 0.1 }, leg: { f: 0, k: 0.12, out: 0.12 } },
});
const std = makeStd(ETTIN_BODY);
const make = (s: NStd): RigPose => std({ ...s, x: { sway: s.sway ?? 0, tilt: s.tilt ?? 0 } });
const TAU = Math.PI * 2;

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.2 + 0.03 * c, 0.09 * c, 0.04 * s], chest: [0.2, -0.12 * c, 0.05 * s], neck: [0.15, 0.08 * c, 0], head: [-0.05, 0.08 * c, -0.04 * s], jaw: 0.3 + 0.15 * Math.max(0, s),
    aL: { f: 0.15 - 0.4 * s, out: 0.32, e: 0.5 + 0.2 * c, w: 0.1 }, aR: { f: 0.35 + 0.3 * s, out: 0.32, e: 0.55 - 0.15 * c, w: 0.2 },
    lL: { f: 0.45 * s, k: 0.14 + 0.8 * Math.max(0, c), out: 0.13 }, lR: { f: -0.45 * s, k: 0.14 + 0.8 * Math.max(0, -c), out: 0.13 },
    root: [0.03 * s, 0.018 * Math.cos(2 * p), 0], sway: s,
  });
}

const idle = make({ aL: { f: 0.2, out: 0.32, e: 0.5 }, aR: { f: 0.35, out: 0.3, e: 0.6, w: 0.2 }, lL: { f: 0.06, k: 0.12, out: 0.14 }, lR: { f: -0.06, k: 0.14, out: 0.14 } });

/** The slam: the maul raised over the heads, brought down before it, and dragged back up. */
const atk: RigPose[] = [
  make({ spine: [-0.05, 0, 0], chest: [-0.1, 0, 0], neck: [0, 0, 0], head: [-0.2, 0, 0], jaw: 0.7,
    aL: { f: 0.9, out: 0.2, e: 1.2, w: 0 }, aR: { f: 0.5, out: 1.0, e: 0.6, w: 0 }, tilt: 2.2, lL: { f: 0.2, k: 0.35 }, lR: { f: -0.2, k: 0.3 }, root: [0, 0, 0.06] }),
  make({ spine: [0.55, 0, 0], chest: [0.4, 0, 0], neck: [0.1, 0, 0], head: [0.1, 0, 0], jaw: 0.8, sway: 0.8,
    aL: { f: 1.1, out: 0.05, e: 0.2, w: 0.1 }, aR: { f: 1.0, out: 0.05, e: 0.15, w: 0.3 }, lL: { f: 0.45, k: 0.7 }, lR: { f: -0.3, k: 0.45 }, root: [0, 0, -0.12] }),
  make({ spine: [0.4, 0, 0], chest: [0.3, 0, 0], neck: [0.1, 0, 0], head: [0.0, 0, 0], jaw: 0.5, sway: 0.4,
    aL: { f: 0.7, out: 0.2, e: 0.5 }, aR: { f: 0.6, out: 0.2, e: 0.5, w: 0.3 }, lL: { f: 0.35, k: 0.5 }, lR: { f: -0.2, k: 0.3 }, root: [0, 0, -0.06] }),
];

const pain: RigPose[] = [
  make({ spine: [-0.05, 0.1, 0.05], chest: [-0.12, 0.16, 0.06], neck: [-0.1, 0, 0], head: [-0.35, 0.12, 0], jaw: 0.9, aL: { f: -0.2, out: 0.8, e: 0.4, w: 0 }, aR: { f: 0.1, out: 0.7, e: 0.4 },
    lL: { f: -0.12, k: 0.2 }, lR: { f: 0.1, k: 0.2 }, root: [0, 0, 0.05], sway: -0.6 }),
  make({ spine: [0.45, -0.1, 0], chest: [0.35, -0.1, 0], neck: [0.0, 0, 0], head: [0.05, 0, 0], jaw: 0.5, aL: { f: 0.8, out: 0.1, e: 1.3, w: 0.2 }, aR: { f: 0.7, out: 0.1, e: 1.1 },
    lL: { f: 0.2, k: 0.5 }, lR: { f: -0.08, k: 0.4 }, sway: 0.4 }),
];

const fall = { y: 0.98, x: 1.1, xs: (k: number) => ({ sway: [-0.5, -0.2, 0.3, 0.4, 0.2][k] }), jaw: (k: number) => [0.9, 0.7, 0.6, 0.5, 0.5][k] };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.68 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.16 * c, 0.06 * s], neck: [-0.3, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0],
    aL: { f: 0.6 + 0.4 * s, out: 0.4, e: 0.8 - 0.3 * s, w: 0.4 }, aR: { f: 0.6 - 0.4 * s, out: 0.4, e: 0.6 + 0.3 * s, w: 0.2 },
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.62, 0.05], spine: [0.15, 0, 0], chest: [-0.1, 0, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 2.2, out: 0.2, e: 0.4 }, aR: { f: 2.3, out: 0.1, e: 0.3 } }),
  make({ ground: false, root: [0, -0.72, -0.1], spine: [0.85, 0, 0], chest: [0.5, 0, 0], neck: [-0.5, 0, 0], head: [-0.3, 0, 0], aL: { f: 1.1, out: 0.1, e: 0.3 }, aR: { f: 1.05, out: 0.05, e: 0.2 } }),
  make({ ground: false, root: [0.05, -0.68, -0.04], spine: [0.65, 0, 0], chest: [0.4, 0, 0], neck: [-0.4, 0, 0], head: [-0.3, 0, 0], aL: { f: 0.9, out: 0.3, e: 0.5 }, aR: { f: 0.9, out: 0.3, e: 0.5 } }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.64, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.5, 0.15, 0], aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.8, e: 0.3, w: 0 } }),
  make({ ground: false, root: [0, -0.72, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.2 } }),
];

export const ETTIN_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

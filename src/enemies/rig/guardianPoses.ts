import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE GUARDIAN'S POSES: a tread of six (slow, `sp` 2.0, every step set down; the shield held before it, the sword low), an idle,
 * an attack of three (the sword over its shoulder, down, back to guard), two of pain (stone does not flinch much), five of death
 * and the crawl. Its own scalar: `sway`, the surcoat's swing.
 */

type GStd = Omit<Std, "x"> & { sway?: number };
export const GUARDIAN_BODY = dims({
  pelvisY: 0.95, spineY: 0.07, chestY: 0.3, neckY: 0.4, neckZ: -0.01, headY: 0.07, headZ: 0, jawY: 0.03, jawZ: 0,
  shoulderX: 0.43, shoulderY: 0.29, upperArm: 0.33, foreArm: 0.31, hipX: 0.16, hipDrop: 0.05, thigh: 0.45, shin: 0.43, ankleY: 0.05,
  rest: { spine: [0.02, 0, 0], chest: [0.02, 0, 0], neck: [0, 0, 0], head: [0.04, 0, 0], jaw: 0, arm: { f: 0.1, out: 0.2, e: 0.3, w: 0.1 }, leg: { f: 0, k: 0.05, out: 0.06 } },
});
const std = makeStd(GUARDIAN_BODY);
const make = (s: GStd): RigPose => std({ ...s, x: { sway: s.sway ?? 0 } });
const TAU = Math.PI * 2;

/** The guard: the shield before the body, the sword low and forward. */
const GUARD = { aL: { f: 0.35, out: 0.25, tw: -0.6, e: 1.2, w: 0 }, aR: { f: 0.25, out: 0.22, e: 0.45, w: 0.5 } };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.03, 0.05 * c, 0.02 * s], chest: [0.03, -0.06 * c, 0.03 * s], head: [0.04, 0.04 * c, -0.02 * s],
    aL: { ...GUARD.aL, f: GUARD.aL.f + 0.06 * s }, aR: { ...GUARD.aR, f: GUARD.aR.f + 0.18 * s, e: GUARD.aR.e + 0.1 * c },
    lL: { f: 0.4 * s, k: 0.06 + 0.8 * Math.max(0, c), out: 0.07 }, lR: { f: -0.4 * s, k: 0.06 + 0.8 * Math.max(0, -c), out: 0.07 },
    root: [0.02 * s, 0.012 * Math.cos(2 * p), 0], sway: s,
  });
}

const idle = make({ ...GUARD, lL: { f: 0.06, k: 0.05, out: 0.08 }, lR: { f: -0.06, k: 0.07, out: 0.08 } });

const atk: RigPose[] = [
  make({ aL: { ...GUARD.aL, f: 0.5 }, aR: { f: 2.7, out: 0.45, e: 0.5, w: 0.3 }, spine: [-0.1, -0.15, 0], chest: [-0.12, -0.2, 0], head: [-0.05, 0.1, 0], lL: { f: 0.25, k: 0.3 }, lR: { f: -0.2, k: 0.2 }, root: [0, 0, 0.05] }),
  make({ aL: { ...GUARD.aL, f: 0.2, e: 1.0 }, aR: { f: 0.9, out: 0.05, tw: 0.4, e: 0.15, w: 0.2 }, spine: [0.35, 0.15, 0], chest: [0.3, 0.2, 0], head: [0.15, -0.1, 0], lL: { f: 0.45, k: 0.6 }, lR: { f: -0.3, k: 0.3 }, root: [0, 0, -0.1], sway: 0.6 }),
  make({ aL: { ...GUARD.aL }, aR: { f: 0.55, out: 0.15, e: 0.6, w: 0.4 }, spine: [0.15, 0.05, 0], chest: [0.12, 0.05, 0], head: [0.08, 0, 0], lL: { f: 0.3, k: 0.35 }, lR: { f: -0.15, k: 0.2 }, root: [0, 0, -0.04], sway: 0.3 }),
];

const pain: RigPose[] = [
  make({ spine: [-0.1, 0.08, 0.04], chest: [-0.14, 0.1, 0.05], head: [-0.2, 0.1, 0], aL: { ...GUARD.aL, f: 0.6, out: 0.5 }, aR: { f: 0.0, out: 0.6, e: 0.3, w: 0.2 }, lL: { f: -0.1, k: 0.15 }, lR: { f: 0.08, k: 0.15 }, root: [0, 0, 0.04], sway: -0.5 }),
  make({ spine: [0.25, -0.06, 0], chest: [0.2, -0.06, 0], head: [0.1, 0, 0], aL: { ...GUARD.aL, f: 0.8, e: 1.3 }, aR: { f: 0.5, out: 0.15, e: 0.9, w: 0.3 }, lL: { f: 0.15, k: 0.4 }, lR: { f: -0.06, k: 0.3 }, sway: 0.3 }),
];

const fall = { y: 1.08, x: 1.1, xs: (k: number) => ({ sway: [-0.4, -0.2, 0.2, 0.3, 0.1][k] }) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.76 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.45, 0.1 * c, 0.05 * s], chest: [0.3, -0.15 * c, 0.05 * s], neck: [-0.3, 0.08 * c, 0], head: [-0.25, 0.08 * c, 0],
    aL: { f: 0.5 + 0.35 * s, out: 0.4, e: 0.9 - 0.3 * s, w: 0.3 }, aR: { f: 0.6 - 0.35 * s, out: 0.35, e: 0.7 + 0.3 * s, w: 0.4 },
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.72, 0.05], spine: [0.15, 0, 0], chest: [-0.05, -0.1, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 0.7, out: 0.4, e: 0.8 }, aR: { f: 2.5, out: 0.4, e: 0.4 } }),
  make({ ground: false, root: [0, -0.8, -0.08], spine: [0.7, 0, 0], chest: [0.45, 0.1, 0], neck: [-0.45, 0, 0], head: [-0.3, 0, 0], aL: { f: 0.8, out: 0.3, e: 0.6 }, aR: { f: 0.9, out: 0.1, e: 0.15 } }),
  make({ ground: false, root: [0.05, -0.76, -0.03], spine: [0.55, 0, 0], chest: [0.35, 0, 0], neck: [-0.35, 0, 0], head: [-0.3, 0, 0], aL: { f: 0.7, out: 0.4, e: 0.7 }, aR: { f: 0.7, out: 0.3, e: 0.6 } }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.72, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.15, 0], neck: [-0.1, 0, 0], head: [-0.4, 0.12, 0], aL: { f: 0.3, out: 0.8, e: 0.6 }, aR: { f: 0.3, out: 0.8, e: 0.3 } }),
  make({ ground: false, root: [0, -0.8, 0], spine: [0.8, -0.1, 0], chest: [0.45, 0, 0], neck: [-0.3, 0, 0], head: [0, 0, 0], aL: { f: 0.9, out: 0.1, e: 1.2 }, aR: { f: 0.9, out: 0.1, e: 1.1 } }),
];

export const GUARDIAN_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

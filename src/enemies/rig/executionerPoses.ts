import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE EXECUTIONER'S POSES: a heavy stride of six (the axe dragged in the right hand, the left swinging), an idle, the stroke
 * (the axe raised over its head in both hands, brought down, the head of it buried at its feet), two of pain, five of death
 * and the crawl. `sway` swings the apron.
 */

type XStd = Omit<Std, "x"> & { sway?: number; tilt?: number };
export const EXECUTIONER_BODY = dims({
  pelvisY: 0.98, spineY: 0.08, chestY: 0.34, neckY: 0.42, neckZ: -0.04, headY: 0.08, headZ: -0.03, jawY: 0.03, jawZ: -0.01,
  shoulderX: 0.5, shoulderY: 0.3, upperArm: 0.38, foreArm: 0.36, hipX: 0.19, hipDrop: 0.05, thigh: 0.46, shin: 0.44, ankleY: 0.055,
  rest: { spine: [0.08, 0, 0], chest: [0.12, 0, 0], neck: [0.1, 0, 0], head: [0.08, 0, 0], jaw: 0.1, arm: { f: 0.1, out: 0.32, e: 0.4, w: 0.1 }, leg: { f: 0, k: 0.08, out: 0.1 } },
});
const std = makeStd(EXECUTIONER_BODY);
const make = (s: XStd): RigPose => std({ ...s, x: { sway: s.sway ?? 0, tilt: s.tilt ?? 0 } });
const TAU = Math.PI * 2;
/** The haft turned across the body in the wind-up, the head of the axe low on the far side: the swing is coming. */
const TILT = 2.2;

/** The axe dragged: the right arm down and out, the haft trailing forward and down to the floor. */
const DRAG = { f: 0.35, out: 0.38, tw: 0.2, e: 0.1, w: 0.15 };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.1 + 0.03 * c, 0.07 * c, 0.03 * s], chest: [0.12, -0.1 * c, 0.04 * s], neck: [0.1, 0.06 * c, 0], head: [0.08, 0.06 * c, -0.03 * s], jaw: 0.1,
    aL: { f: 0.1 - 0.35 * s, out: 0.32, e: 0.45 + 0.2 * c, w: 0.1 }, aR: { ...DRAG, f: DRAG.f + 0.08 * s },
    lL: { f: 0.42 * s, k: 0.1 + 0.85 * Math.max(0, c), out: 0.11 }, lR: { f: -0.42 * s, k: 0.1 + 0.85 * Math.max(0, -c), out: 0.11 },
    root: [0.03 * s, 0.016 * Math.cos(2 * p), 0], sway: s,
  });
}

const idle = make({ aL: { f: 0.15, out: 0.32, e: 0.5 }, aR: DRAG, lL: { f: 0.06, k: 0.08, out: 0.12 }, lR: { f: -0.06, k: 0.1, out: 0.12 } });

/** The stroke: both hands on the haft over its head, the axe down through whatever is before it, and the head of it in the floor. */
const atk: RigPose[] = [
  make({ spine: [-0.14, 0, 0], chest: [-0.16, 0, 0], neck: [-0.05, 0, 0], head: [-0.05, 0, 0], jaw: 0.4,
    aL: { f: 0.9, out: 0.2, e: 1.2, w: 0 }, aR: { f: 0.5, out: 1.0, e: 0.6, w: 0 }, tilt: TILT, lL: { f: 0.2, k: 0.35 }, lR: { f: -0.2, k: 0.3 }, root: [0, 0, 0.06] }),
  make({ spine: [0.45, 0, 0], chest: [0.35, 0, 0], neck: [0.1, 0, 0], head: [0.2, 0, 0], jaw: 0.5, sway: 0.8,
    aL: { f: 1.35, out: -0.15, e: 0.2, w: 0.1 }, aR: { f: 1.25, out: 0.02, e: 0.15, w: 0.4 }, lL: { f: 0.45, k: 0.65 }, lR: { f: -0.3, k: 0.4 }, root: [0, 0, -0.12] }),
  make({ spine: [0.32, 0, 0], chest: [0.25, 0, 0], neck: [0.08, 0, 0], head: [0.15, 0, 0], jaw: 0.3, sway: 0.4,
    aL: { f: 0.9, out: 0.0, e: 0.35 }, aR: { f: 0.8, out: 0.1, e: 0.3, w: 0.4 }, lL: { f: 0.35, k: 0.5 }, lR: { f: -0.2, k: 0.3 }, root: [0, 0, -0.06] }),
];

const pain: RigPose[] = [
  make({ spine: [-0.12, 0.1, 0.05], chest: [-0.2, 0.16, 0.06], neck: [-0.1, 0, 0], head: [-0.3, 0.12, 0], jaw: 0.6, aL: { f: -0.2, out: 0.8, e: 0.4, w: 0 }, aR: { ...DRAG, out: 0.6 },
    lL: { f: -0.12, k: 0.2 }, lR: { f: 0.1, k: 0.2 }, root: [0, 0, 0.05], sway: -0.6 }),
  make({ spine: [0.35, -0.1, 0], chest: [0.3, -0.1, 0], neck: [-0.1, 0, 0], head: [0.05, 0, 0], jaw: 0.3, aL: { f: 0.8, out: 0.1, e: 1.3, w: 0.2 }, aR: { ...DRAG, f: 0.6 },
    lL: { f: 0.2, k: 0.5 }, lR: { f: -0.08, k: 0.4 }, sway: 0.4 }),
];

const fall = { y: 1.1, x: 1.2, xs: (k: number) => ({ sway: [-0.5, -0.2, 0.3, 0.4, 0.2][k] }), jaw: (k: number) => [0.7, 0.5, 0.4, 0.3, 0.3][k] };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.78 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.16 * c, 0.06 * s], neck: [-0.3, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0],
    aL: { f: 0.6 + 0.4 * s, out: 0.4, e: 0.8 - 0.3 * s, w: 0.4 }, aR: { f: 0.6 - 0.4 * s, out: 0.4, e: 0.6 + 0.3 * s, w: 0.2 },
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.72, 0.05], spine: [0.15, 0, 0], chest: [-0.1, 0, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 2.2, out: 0.2, e: 0.4 }, aR: { f: 2.4, out: 0.1, e: 0.3 } }),
  make({ ground: false, root: [0, -0.82, -0.1], spine: [0.85, 0, 0], chest: [0.5, 0, 0], neck: [-0.5, 0, 0], head: [-0.3, 0, 0], aL: { f: 1.1, out: 0.1, e: 0.3 }, aR: { f: 1.05, out: 0.05, e: 0.2 } }),
  make({ ground: false, root: [0.05, -0.78, -0.04], spine: [0.65, 0, 0], chest: [0.4, 0, 0], neck: [-0.4, 0, 0], head: [-0.3, 0, 0], aL: { f: 0.9, out: 0.3, e: 0.5 }, aR: { f: 0.9, out: 0.3, e: 0.5 } }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.74, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.5, 0.15, 0], aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.8, e: 0.3, w: 0 } }),
  make({ ground: false, root: [0, -0.82, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.2 } }),
];

export const EXECUTIONER_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

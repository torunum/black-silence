import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE ETTIN'S POSES: a stomp of six (it is heavy, `sp` 2.8: the body leans into
 * each step and the maul rides its shoulder), an idle, an attack of three that
 * is the slam (both hands up over its head on the haft, down through whatever
 * is in front of it, a heave back to guard; the game holds these frames for the
 * half second of its stun while the blow lands), two of pain, five of death
 * and the crawl of one that has lost its legs. Its one scalar is `heave`, how
 * hard it is breathing: the chest swells with it.
 */

export const ETTIN_BODY = dims({
  pelvisY: 1.0, spineY: 0.06, chestY: 0.3, neckY: 0.34, neckZ: -0.02, headY: 0.07, headZ: -0.05, jawY: 0.02, jawZ: -0.02,
  shoulderX: 0.6, shoulderY: 0.3, upperArm: 0.38, foreArm: 0.34, hipX: 0.26, hipDrop: 0.05, thigh: 0.46, shin: 0.44, ankleY: 0.05,
  rest: { spine: [0.06, 0, 0], chest: [0.06, 0, 0], neck: [0.0, 0, 0], head: [0.02, 0, 0], jaw: 0.25, arm: { f: 0.1, out: 0.4, e: 0.4, w: 0.1 }, leg: { f: 0, k: 0.08, out: 0.1 } },
});
const std = makeStd(ETTIN_BODY);
const TAU = Math.PI * 2;
const x = (heave: number): Record<string, number> => ({ heave });
/** The maul arm at rest: the forearm raised and turned out, the haft over the shoulder. */
const MAUL = { f: 0.8, tw: -0.2, out: 0.35, e: 1.95, w: 0.0 };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    spine: [0.08 + 0.04 * c, 0.08 * c, 0.04 * s], chest: [0.06, -0.1 * c, 0.04 * s], neck: [0.0, 0.05 * c, 0], head: [0.02 + 0.03 * Math.cos(2 * p), 0.06 * c, -0.04 * s], jaw: 0.25 + 0.1 * Math.max(0, s),
    aL: { f: 0.1 - 0.4 * s, out: 0.4, e: 0.4 + 0.2 * c }, aR: { ...MAUL, f: MAUL.f + 0.08 * s },
    lL: { f: 0.45 * s, k: 0.1 + 0.8 * Math.max(0, c), out: 0.1 }, lR: { f: -0.45 * s, k: 0.1 + 0.8 * Math.max(0, -c), out: 0.1 },
    root: [0.03 * s, 0.025 * Math.cos(2 * p), 0], x: x(0.5 + 0.5 * Math.abs(s)),
  });
}

const idle = std({ aL: { f: 0.15, out: 0.4, e: 0.5 }, aR: MAUL, lL: { f: 0.05, k: 0.1, out: 0.1 }, lR: { f: -0.05, k: 0.12, out: 0.1 }, x: x(0.3) });

/** The slam: the maul and both hands go up behind its head, come down through the middle of whatever stands in front of it, and are heaved back. */
const atk: RigPose[] = [
  std({ spine: [-0.25, 0, 0], chest: [-0.2, 0, 0], neck: [-0.1, 0, 0], head: [-0.2, 0, 0], jaw: 0.8, x: x(1),
    aL: { f: 1.9, out: 0.25, e: 0.5, w: 0.1 }, aR: { f: 1.95, tw: -0.2, out: 0.2, e: 0.5, w: 0.1 }, lL: { f: 0.2, k: 0.35 }, lR: { f: -0.2, k: 0.3 }, root: [0, 0, 0.06] }),
  std({ spine: [0.6, 0, 0], chest: [0.45, 0, 0], neck: [0.1, 0, 0], head: [0.3, 0, 0], jaw: 0.5, x: x(0.6),
    aL: { f: 1.05, out: 0.15, e: 0.15, w: 0 }, aR: { f: 1.25, tw: 0.2, out: 0.1, e: 0.1, w: 0 }, lL: { f: 0.5, k: 0.65 }, lR: { f: -0.3, k: 0.45 }, root: [0, 0, -0.16] }),
  std({ spine: [0.35, 0, 0], chest: [0.25, 0, 0], neck: [0.05, 0, 0], head: [0.15, 0, 0], jaw: 0.3, x: x(1),
    aL: { f: 0.7, out: 0.2, e: 0.6 }, aR: { f: 0.8, tw: -0.2, out: 0.15, e: 0.7 }, lL: { f: 0.3, k: 0.4 }, lR: { f: -0.15, k: 0.3 }, root: [0, 0, -0.06] }),
];

/** Pain: it rears back roaring, the maul flung wide, then hunches over the wound. */
const pain: RigPose[] = [
  std({ spine: [-0.15, 0.1, 0.06], chest: [-0.22, 0.2, 0.06], neck: [-0.12, 0, 0], head: [-0.45, 0.1, 0], jaw: 1.0, x: x(1),
    aL: { f: -0.3, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.9, tw: -0.5, out: 0.7, e: 0.8, w: 0.2 }, lL: { f: -0.12, k: 0.2 }, lR: { f: 0.1, k: 0.25 }, root: [0, 0, 0.05] }),
  std({ spine: [0.5, -0.1, 0], chest: [0.4, -0.1, 0], neck: [0.15, 0, 0], head: [0.1, 0, 0], jaw: 0.4, x: x(0.8),
    aL: { f: 0.9, out: 0.05, e: 1.3, w: 0.2 }, aR: { f: 0.9, tw: -0.3, out: 0.1, e: 1.2, w: 0.2 }, lL: { f: 0.25, k: 0.5 }, lR: { f: -0.08, k: 0.4 } }),
];

const fall = { y: 1.0, x: 1.1, xs: (k: number) => x([1, 0.7, 0.4, 0.2, 0][k]), jaw: (k: number) => [1.0, 0.8, 0.6, 0.5, 0.4][k] };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    ground: false, root: [0.05 + 0.03 * s, -0.8 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.18 * c, 0.06 * s], neck: [-0.35, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0], jaw: 0.3 + 0.2 * Math.max(0, s), x: x(0.9),
    aL: { f: 0.65 + 0.45 * s, out: 0.38, e: 0.8 - 0.3 * s, w: 0.4 }, aR: { f: 0.65 - 0.45 * s, out: 0.34, e: 0.8 + 0.3 * s, w: 0.4 },
  });
}
const crawlAtk: RigPose[] = [
  std({ ground: false, root: [0.05, -0.76, 0.05], spine: [0.15, 0, 0], chest: [-0.1, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0], jaw: 0.8, x: x(1), aL: { f: 2.2, out: 0.5, e: 0.4 }, aR: { f: 2.3, out: 0.4, e: 0.4 } }),
  std({ ground: false, root: [0, -0.86, -0.1], spine: [0.85, 0, 0], chest: [0.5, -0.2, 0], neck: [-0.5, 0, 0], head: [-0.3, 0, 0], jaw: 0.5, x: x(0.6), aL: { f: 1.0, out: 0.3, e: 0.3 }, aR: { f: 0.95, out: 0.25, e: 0.4 } }),
  std({ ground: false, root: [0.05, -0.82, -0.04], spine: [0.65, 0, 0], chest: [0.4, 0, 0], neck: [-0.4, 0, 0], head: [-0.3, 0, 0], jaw: 0.3, x: x(1), aL: { f: 0.9, out: 0.4, e: 0.5 }, aR: { f: 0.95, out: 0.4, e: 0.55 } }),
];
const crawlPain: RigPose[] = [
  std({ ground: false, root: [0.06, -0.78, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.6, 0.15, 0], jaw: 1.0, x: x(1), aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.85, e: 0.3, w: 0 } }),
  std({ ground: false, root: [0, -0.86, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], jaw: 0.4, x: x(0.8), aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 } }),
];

export const ETTIN_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

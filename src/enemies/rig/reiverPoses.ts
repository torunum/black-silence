import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE REIVER'S POSES: it hangs in the air, leaning into its flight with its
 * ragged legs trailing behind it and its long arms sweeping. A hover of six (the
 * arms beat, the body rises on the downstroke, the rags stream), an idle, an
 * attack of three that is the bolt (the arms swept back and wide, thrust forward
 * together with a ball of green light between the hands and the jaw wide, spread
 * again), two of pain, five of death (it comes down, folds and lies in its rags)
 * and the dragging of one with no legs. Scalars: `orb` (the light in its hands) and
 * `rag` (how far the rags stream).
 */

export const REIVER_BODY = dims({
  pelvisY: 0.78, spineY: 0.05, chestY: 0.24, neckY: 0.28, neckZ: -0.02, headY: 0.06, headZ: -0.03, jawY: 0.04, jawZ: -0.01,
  shoulderX: 0.27, shoulderY: 0.25, upperArm: 0.32, foreArm: 0.32, hipX: 0.1, hipDrop: 0.03, thigh: 0.27, shin: 0.26, ankleY: 0.04,
  rest: { spine: [0.3, 0, 0], chest: [0.2, 0, 0], neck: [-0.15, 0, 0], head: [-0.1, 0, 0], jaw: 0.45, arm: { f: 0.5, out: 0.5, e: 0.5, w: 0.2 }, leg: { f: -0.35, k: 0.4, out: 0.06 } },
});
const std = makeStd(REIVER_BODY);
const TAU = Math.PI * 2;
const x = (orb: number, rag: number): Record<string, number> => ({ orb, rag });

function hover(i: number, drop = 0): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    ground: false, root: [0.01 * s, 0.06 - 0.05 * s - drop, 0], spine: [0.32 + 0.05 * s, 0.05 * c, 0.03 * c], chest: [0.2, -0.06 * c, 0], neck: [-0.15, 0, 0], head: [-0.1 - 0.05 * s, 0.06 * c, 0], jaw: 0.45 + 0.15 * Math.sin(2 * p),
    aL: { f: 0.45 + 0.7 * s, out: 0.7 + 0.3 * c, e: 0.5 - 0.2 * s, w: 0.3 }, aR: { f: 0.45 - 0.7 * s, out: 0.7 - 0.3 * c, e: 0.5 + 0.2 * s, w: 0.3 },
    lL: { f: -0.4 + 0.15 * c, k: 0.4 + 0.2 * s, out: 0.06 }, lR: { f: -0.35 - 0.15 * c, k: 0.4 - 0.2 * s, out: 0.06 }, x: x(0, 0.5 + 0.4 * c),
  });
}

const idle = std({ ground: false, root: [0, 0.06, 0], jaw: 0.5, aL: { f: 0.5, out: 0.55, e: 0.5, w: 0.3 }, aR: { f: 0.45, out: 0.5, e: 0.55, w: 0.3 }, x: x(0, 0.4) });

/** The bolt: the arms sweep back and wide as the light gathers; they are thrust forward together over the ball of it; they spread again. */
const atk: RigPose[] = [
  std({ ground: false, root: [0, 0.1, 0.08], spine: [0.1, 0, 0], chest: [0.0, 0, 0], head: [-0.3, 0, 0], jaw: 0.6, aL: { f: 0.2, out: 1.25, e: 0.4, w: 0.2 }, aR: { f: 0.2, out: 1.25, e: 0.4, w: 0.2 }, x: x(0.3, 0.9) }),
  std({ ground: false, root: [0, 0.04, -0.16], spine: [0.45, 0, 0], chest: [0.3, 0, 0], head: [-0.2, 0, 0], jaw: 1.1, aL: { f: 1.5, out: 0.05, tw: 0.45, e: 0.3, w: 0.1 }, aR: { f: 1.5, out: 0.05, tw: -0.45, e: 0.3, w: 0.1 }, x: x(1, 0.2) }),
  std({ ground: false, root: [0, 0.02, -0.06], spine: [0.38, 0, 0], chest: [0.25, 0, 0], jaw: 0.6, aL: { f: 1.0, out: 0.6, e: 0.4, w: 0.2 }, aR: { f: 1.0, out: 0.6, e: 0.4, w: 0.2 }, x: x(0.2, 0.6) }),
];

const pain: RigPose[] = [
  std({ ground: false, root: [0.02, 0.1, 0.07], spine: [-0.05, 0.1, 0.08], chest: [-0.15, 0.2, 0.06], neck: [-0.2, 0, 0], head: [-0.5, 0.1, 0], jaw: 1.0, aL: { f: 0.2, out: 1.0, e: 0.3, w: 0 }, aR: { f: 0.9, out: 0.9, e: 0.4, w: 0 }, lL: { f: -0.1, k: 0.4 }, lR: { f: 0.1, k: 0.6 }, x: x(0, 1) }),
  std({ ground: false, root: [-0.02, 0.0, 0], spine: [0.55, -0.1, 0], chest: [0.4, 0, 0], neck: [-0.1, 0, 0], head: [0.1, 0, 0], jaw: 0.5, aL: { f: 0.9, out: 0.2, e: 1.2, w: 0.3 }, aR: { f: 0.9, out: 0.2, e: 1.2, w: 0.3 }, lL: { f: -0.3, k: 0.5 }, lR: { f: -0.2, k: 0.5 }, x: x(0, 0.2) }),
];

const fall = { y: 0.88, x: 1, xs: (k: number) => x(0, [1, 0.7, 0.4, 0.2, 0.1][k]), jaw: (k: number) => [1.1, 0.9, 0.7, 0.6, 0.5][k] };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    ground: false, root: [0.05 + 0.03 * s, -0.5 + 0.02 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.18 * c, 0.06 * s], neck: [-0.35, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0], jaw: 0.6 + 0.2 * Math.max(0, s), x: x(0, 0.5),
    aL: { f: 0.7 + 0.5 * s, out: 0.45, e: 0.8 - 0.3 * s, w: 0.4 }, aR: { f: 0.7 - 0.5 * s, out: 0.4, e: 0.8 + 0.3 * s, w: 0.4 },
  });
}
const crawlAtk: RigPose[] = [
  std({ ground: false, root: [0.05, -0.46, 0.05], spine: [0.15, 0, 0], chest: [-0.1, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0], jaw: 0.7, aL: { f: 0.4, out: 1.2, e: 0.4 }, aR: { f: 0.4, out: 1.2, e: 0.4 }, x: x(0.3, 0.5) }),
  std({ ground: false, root: [0, -0.56, -0.1], spine: [0.8, 0, 0], chest: [0.5, -0.2, 0], neck: [-0.5, 0, 0], head: [-0.3, 0, 0], jaw: 1.1, aL: { f: 1.5, tw: 0.4, out: 0.1, e: 0.3 }, aR: { f: 1.5, tw: -0.4, out: 0.1, e: 0.3 }, x: x(1, 0.2) }),
  std({ ground: false, root: [0.05, -0.52, -0.04], spine: [0.6, 0, 0], chest: [0.4, 0, 0], neck: [-0.4, 0, 0], head: [-0.3, 0, 0], jaw: 0.6, aL: { f: 1.0, out: 0.6, e: 0.5 }, aR: { f: 1.0, out: 0.6, e: 0.5 }, x: x(0.2, 0.4) }),
];
const crawlPain: RigPose[] = [
  std({ ground: false, root: [0.06, -0.46, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.6, 0.15, 0], jaw: 1.0, aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.85, e: 0.3, w: 0 }, x: x(0, 1) }),
  std({ ground: false, root: [0, -0.56, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], jaw: 0.5, aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 }, x: x(0, 0.2) }),
];

export const REIVER_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map((i) => hover(i)), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

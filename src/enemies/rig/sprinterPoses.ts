import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE FLAYED SPRINTER'S POSES: a sprint of six, a crouching idle, an attack of
 * three (it coils, pounces with the claws out and the jaw unhinged, lands), two
 * of pain, five of death and the crawl of one without its legs.
 *
 * It never stands up: even its idle is a crouch, the spine pitched toward you,
 * the arms hanging long and wide and the knees bent. Its one scalar is `claw`,
 * how far its fingers are spread.
 */

export const SPRINTER_BODY = dims({
  pelvisY: 0.84, spineY: 0.05, chestY: 0.25, neckY: 0.32, neckZ: -0.03, headY: 0.07, headZ: -0.04, jawY: 0.052, jawZ: -0.006,
  shoulderX: 0.39, shoulderY: 0.27, upperArm: 0.31, foreArm: 0.3, hipX: 0.18, hipDrop: 0.04, thigh: 0.4, shin: 0.4, ankleY: 0.04,
  rest: { spine: [0.5, 0, 0], chest: [0.2, 0, 0], neck: [-0.25, 0, 0], head: [-0.05, 0, 0], jaw: 0.85, arm: { f: 0.3, out: 0.55, e: 0.6, w: 0.3 }, leg: { f: 0.45, k: 1.0, out: 0.14 } },
});
const std = makeStd(SPRINTER_BODY);
const TAU = Math.PI * 2;
const x = (claw: number): Record<string, number> => ({ claw });

/** One stride of the sprint, `i` of 6: long, low, the arms pumping out wide. */
function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    spine: [0.5 + 0.06 * c, 0.12 * c, 0.05 * s], chest: [0.2, -0.2 * c, 0.05 * s], neck: [-0.25, 0.1 * c, 0], head: [-0.05 + 0.05 * Math.cos(2 * p), 0.1 * c, -0.05 * s], jaw: 0.85 + 0.15 * Math.sin(2 * p),
    aL: { f: 0.35 - 0.7 * s, out: 0.55, e: 0.7 - 0.3 * s, w: 0.3 }, aR: { f: 0.35 + 0.7 * s, out: 0.55, e: 0.7 + 0.3 * s, w: 0.3 },
    lL: { f: 0.75 * s + 0.15, k: 0.35 + 0.95 * Math.max(0, c), out: 0.12, toe: 0.3 * Math.max(0, -s) }, lR: { f: -0.75 * s + 0.15, k: 0.35 + 0.95 * Math.max(0, -c), out: 0.12, toe: 0.3 * Math.max(0, s) },
    root: [0.02 * s, 0.03 * Math.cos(2 * p), 0], x: x(0.7 + 0.2 * s),
  });
}

const idle = std({ jaw: 0.8, x: x(0.6), aL: { f: 0.25, out: 0.55, e: 0.6, w: 0.3 }, aR: { f: 0.4, out: 0.5, e: 0.7, w: 0.3 }, lL: { f: 0.55, k: 1.05, out: 0.14 }, lR: { f: 0.0, k: 0.8, out: 0.14 } });

/** Coils low, pounces long with the claws spread and the jaw as wide as it goes, lands in a crouch. */
const atk: RigPose[] = [
  std({ spine: [0.8, 0, 0], chest: [0.1, 0.15, 0], neck: [-0.5, 0, 0], head: [-0.2, 0, 0], jaw: 0.9, x: x(0.3),
    aL: { f: -0.4, out: 0.8, e: 0.8, w: 0.1 }, aR: { f: -0.5, out: 0.8, e: 0.8, w: 0.1 }, lL: { f: 0.55, k: 1.05, out: 0.14 }, lR: { f: 0.1, k: 0.9, out: 0.14 }, root: [0, 0, 0.08] }),
  std({ spine: [0.3, -0.1, 0], chest: [0.15, -0.15, 0], neck: [-0.3, 0, 0], head: [0.05, 0, 0], jaw: 1.25, x: x(1),
    aL: { f: 1.8, out: 0.35, e: 0.15, w: 0.4 }, aR: { f: 1.7, out: 0.3, e: 0.2, w: 0.4 }, lL: { f: -0.55, k: 0.15, out: 0.14 }, lR: { f: -0.65, k: 0.3, out: 0.14 },
    ground: false, root: [0, 0.12, -0.2] }),
  std({ spine: [0.65, 0, 0], chest: [0.25, 0, 0], neck: [-0.35, 0, 0], head: [-0.1, 0, 0], jaw: 0.7, x: x(0.8),
    aL: { f: 1.0, out: 0.4, e: 0.5, w: 0.3 }, aR: { f: 1.1, out: 0.4, e: 0.5, w: 0.3 }, lL: { f: 0.5, k: 0.95, out: 0.14 }, lR: { f: 0.2, k: 0.8, out: 0.14 }, root: [0, 0, -0.1] }),
];

/** Pain: flung upright with the jaw wide, then folded over a wound. */
const pain: RigPose[] = [
  std({ spine: [-0.1, 0.1, 0.06], chest: [-0.2, 0.2, 0.06], neck: [-0.15, 0, 0], head: [-0.4, 0.15, 0], jaw: 1.2, x: x(0),
    aL: { f: -0.3, out: 0.9, e: 0.35, w: 0 }, aR: { f: 0.2, out: 0.85, e: 0.3, w: 0 }, lL: { f: 0.05, k: 0.35 }, lR: { f: -0.12, k: 0.3 }, root: [0, 0, 0.06] }),
  std({ spine: [0.75, -0.1, 0], chest: [0.4, -0.1, 0], neck: [-0.35, 0, 0], head: [-0.15, 0, 0], jaw: 0.6, x: x(0.9),
    aL: { f: 0.9, out: 0.1, e: 1.4, w: 0.3 }, aR: { f: 0.9, out: 0.1, e: 1.4, w: 0.3 }, lL: { f: 0.4, k: 0.9 }, lR: { f: 0.05, k: 0.75 } }),
];

const fall = { y: 0.95, x: 1, xs: (k: number) => x([0, 0.1, 0.2, 0.3, 0.3][k]) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    ground: false, root: [0.05 + 0.03 * s, -0.66 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.14 * c, 0.05 * s], chest: [0.3, -0.2 * c, 0.06 * s], neck: [-0.4, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0], jaw: 0.8 + 0.2 * Math.max(0, s), x: x(0.8),
    aL: { f: 0.65 + 0.45 * s, out: 0.45, e: 0.75 - 0.3 * s, w: 0.4 }, aR: { f: 0.65 - 0.45 * s, out: 0.4, e: 0.75 + 0.3 * s, w: 0.4 },
  });
}
const crawlAtk: RigPose[] = [
  std({ ground: false, root: [0.05, -0.62, 0.05], spine: [0.15, 0, 0], chest: [-0.1, 0.1, 0], neck: [-0.3, 0, 0], head: [-0.3, 0, 0], jaw: 1.0, x: x(0.3), aL: { f: 2.0, out: 0.5, e: 0.4 }, aR: { f: 2.1, out: 0.4, e: 0.4 } }),
  std({ ground: false, root: [0, -0.72, -0.1], spine: [0.85, 0, 0], chest: [0.5, -0.2, 0], neck: [-0.5, 0, 0], head: [-0.3, 0, 0], jaw: 1.25, x: x(1), aL: { f: 1.4, out: 0.3, e: 0.2 }, aR: { f: 1.3, out: 0.25, e: 0.3 } }),
  std({ ground: false, root: [0.05, -0.68, -0.04], spine: [0.65, 0, 0], chest: [0.4, 0, 0], neck: [-0.4, 0, 0], head: [-0.3, 0, 0], jaw: 0.6, x: x(0.8), aL: { f: 0.9, out: 0.4, e: 0.5 }, aR: { f: 0.95, out: 0.4, e: 0.55 } }),
];
const crawlPain: RigPose[] = [
  std({ ground: false, root: [0.06, -0.64, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.6, 0.15, 0], jaw: 1.2, x: x(0), aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.85, e: 0.3, w: 0 } }),
  std({ ground: false, root: [0, -0.72, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], jaw: 0.5, x: x(0.8), aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 } }),
];

export const SPRINTER_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE WAILER'S POSES: a shamble of six (long strides, arms reaching, the shroud
 * trailing), an idle with its head back, an attack of three that is the scream
 * (it gathers itself, throws its head back with the arms flung wide and the
 * shroud flaring, slumps), two of pain, five of death (the jaw, which has hung
 * open since it died the first time, finally shuts) and the crawl of one that
 * has lost its legs.
 *
 * Its own scalars: `claw` (the fingers), `rag` (how far the shroud flares).
 */

export const WAILER_BODY = dims({
  pelvisY: 0.96, spineY: 0.06, chestY: 0.3, neckY: 0.34, neckZ: -0.02, headY: 0.05, headZ: -0.03, jawY: 0.074, jawZ: -0.01,
  shoulderX: 0.34, shoulderY: 0.3, upperArm: 0.34, foreArm: 0.32, hipX: 0.12, hipDrop: 0.04, thigh: 0.43, shin: 0.42, ankleY: 0.04,
  rest: { spine: [0.1, 0, 0], chest: [0.14, 0, 0], neck: [0.0, 0, 0], head: [-0.1, 0, 0], jaw: 1.0, arm: { f: 0.1, out: 0.5, e: 0.4, w: 0.15 }, leg: { f: 0, k: 0.06, out: 0.04 } },
});
const std = makeStd(WAILER_BODY);
const TAU = Math.PI * 2;
const x = (claw: number, rag: number): Record<string, number> => ({ claw, rag });

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    spine: [0.12 + 0.03 * c, 0.1 * c, 0.04 * s], chest: [0.16, -0.14 * c, 0.05 * s], neck: [0.04, 0.1 * c, 0], head: [-0.12 + 0.05 * Math.cos(2 * p), 0.1 * c, -0.05 * s], jaw: 1.0 + 0.1 * Math.sin(p),
    aL: { f: 0.8 - 0.25 * s, out: 0.6, e: 0.3 + 0.1 * c, w: 0.2 }, aR: { f: 0.55 + 0.25 * s, out: 0.55, e: 0.4 - 0.1 * c, w: 0.2 },
    lL: { f: 0.5 * s, k: 0.08 + 0.7 * Math.max(0, c), out: 0.05, toe: 0.2 * Math.max(0, -s) }, lR: { f: -0.5 * s, k: 0.08 + 0.7 * Math.max(0, -c), out: 0.05 },
    root: [0.02 * s, 0.014 * Math.cos(2 * p), 0], x: x(0.5 + 0.2 * s, 0.25 + 0.2 * Math.sin(p + 1)),
  });
}

const idle = std({ head: [-0.3, 0, 0], jaw: 1.05, x: x(0.4, 0.15), aL: { f: 0.15, out: 0.3, e: 0.4 }, aR: { f: 0.3, out: 0.28, e: 0.55 }, lL: { f: 0.04, k: 0.07 }, lR: { f: -0.06, k: 0.09 } });

/** The scream: gathers itself, throws back its head with the arms flung wide, slumps. */
const atk: RigPose[] = [
  std({ spine: [0.35, 0, 0], chest: [0.4, 0, 0], neck: [0.2, 0, 0], head: [0.2, 0, 0], jaw: 0.5, x: x(0.8, 0),
    aL: { f: 0.6, out: 0.1, e: 1.2, w: 0.3 }, aR: { f: 0.6, out: 0.1, e: 1.2, w: 0.3 }, lL: { f: 0.1, k: 0.2 }, lR: { f: -0.1, k: 0.2 }, root: [0, 0, -0.04] }),
  std({ spine: [-0.12, 0, 0], chest: [-0.2, 0, 0], neck: [-0.15, 0, 0], head: [-0.32, 0, 0], jaw: 1.45, x: x(1, 1),
    aL: { f: 0.9, out: 1.35, e: 0.15, w: 0 }, aR: { f: 0.9, out: 1.35, e: 0.15, w: 0 }, lL: { f: 0.1, k: 0.3, out: 0.1 }, lR: { f: -0.1, k: 0.25, out: 0.1 }, root: [0, 0, 0.06] }),
  std({ spine: [0.3, 0, 0], chest: [0.28, 0, 0], neck: [0.1, 0, 0], head: [0.0, 0, 0], jaw: 0.9, x: x(0.6, 0.4),
    aL: { f: 0.5, out: 0.5, e: 0.7 }, aR: { f: 0.55, out: 0.5, e: 0.7 }, lL: { f: 0.1, k: 0.2 }, lR: { f: -0.08, k: 0.2 }, root: [0, 0, -0.02] }),
];

const pain: RigPose[] = [
  std({ spine: [-0.15, 0.1, 0.06], chest: [-0.25, 0.2, 0.06], neck: [-0.15, 0, 0], head: [-0.5, 0.15, 0], jaw: 1.3, x: x(0.1, 0.8),
    aL: { f: -0.2, out: 0.9, e: 0.35, w: 0 }, aR: { f: 0.3, out: 0.85, e: 0.3, w: 0 }, lL: { f: -0.12, k: 0.2 }, lR: { f: 0.1, k: 0.2 }, root: [0, 0, 0.05] }),
  std({ spine: [0.5, -0.1, 0], chest: [0.45, -0.1, 0], neck: [0.1, 0, 0], head: [0.1, 0, 0], jaw: 0.9, x: x(0.9, 0.3),
    aL: { f: 0.8, out: 0.05, e: 1.5, w: 0.3 }, aR: { f: 0.8, out: 0.05, e: 1.5, w: 0.3 }, lL: { f: 0.2, k: 0.5 }, lR: { f: -0.08, k: 0.4 } }),
];

const fall = { y: 1.1, x: 1, xs: (k: number) => x([0.1, 0.1, 0.2, 0.3, 0.3][k], [0.7, 0.5, 0.3, 0.1, 0][k]), jaw: (k: number) => [1.3, 0.95, 0.6, 0.3, 0.05][k] };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    ground: false, root: [0.05 + 0.03 * s, -0.78 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.14 * c, 0.05 * s], chest: [0.3, -0.2 * c, 0.06 * s], neck: [-0.4, 0.1 * c, 0], head: [-0.4, 0.1 * c, 0], jaw: 1.0 + 0.2 * Math.max(0, s), x: x(0.7, 0.2),
    aL: { f: 0.7 + 0.45 * s, out: 0.4, e: 0.7 - 0.3 * s, w: 0.4 }, aR: { f: 0.7 - 0.45 * s, out: 0.35, e: 0.7 + 0.3 * s, w: 0.4 },
  });
}
const crawlAtk: RigPose[] = [
  std({ ground: false, root: [0.05, -0.72, 0.05], spine: [0.7, 0, 0], chest: [0.3, 0, 0], neck: [-0.1, 0, 0], head: [0.1, 0, 0], jaw: 0.5, x: x(0.8, 0), aL: { f: 0.9, out: 0.2, e: 1.0 }, aR: { f: 0.9, out: 0.2, e: 1.0 } }),
  std({ ground: false, root: [0, -0.7, 0.05], spine: [0.2, 0, 0], chest: [-0.2, 0, 0], neck: [-0.5, 0, 0], head: [-0.6, 0, 0], jaw: 1.45, x: x(1, 1), aL: { f: 1.3, out: 1.0, e: 0.3 }, aR: { f: 1.3, out: 1.0, e: 0.3 } }),
  std({ ground: false, root: [0.05, -0.78, -0.04], spine: [0.65, 0, 0], chest: [0.4, 0, 0], neck: [-0.3, 0, 0], head: [-0.3, 0, 0], jaw: 0.9, x: x(0.6, 0.3), aL: { f: 0.9, out: 0.4, e: 0.5 }, aR: { f: 0.95, out: 0.4, e: 0.55 } }),
];
const crawlPain: RigPose[] = [
  std({ ground: false, root: [0.06, -0.74, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.7, 0.15, 0], jaw: 1.3, x: x(0.1, 0.8), aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.85, e: 0.3, w: 0 } }),
  std({ ground: false, root: [0, -0.82, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [-0.1, 0, 0], jaw: 0.9, x: x(0.9, 0.3), aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 } }),
];

export const WAILER_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

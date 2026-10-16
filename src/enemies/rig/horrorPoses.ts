import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE PLATED HORROR'S POSES: a stomp of six (it is slow, `sp` 2.2, and heavy:
 * the knee comes up, the foot comes down, the body barely moves above it), an
 * idle, an attack of three (the slam: both arms over its head, down, recover),
 * two of pain, five of death (the plates splay open as it falls: `open`) and
 * the crawl of one that has lost its legs.
 */

export const HORROR_BODY = dims({
  shoulderX: 0.4, shoulderY: 0.27, hipX: 0.16, neckY: 0.36, headY: 0.07, jawY: 0.03, jawZ: -0.01,
  rest: { spine: [0.06, 0, 0], chest: [0.06, 0, 0], neck: [0.0, 0, 0], head: [0.05, 0, 0], jaw: 0.2, arm: { f: 0.1, out: 0.24, e: 0.35, w: 0.1 }, leg: { f: 0, k: 0.06, out: 0.08 } },
});
const std = makeStd(HORROR_BODY);
const TAU = Math.PI * 2;
const open = (v: number): Record<string, number> => ({ open: v });

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    spine: [0.07 + 0.02 * c, 0.05 * c, 0.03 * s], chest: [0.07, -0.08 * c, 0.03 * s], neck: [0, 0.04 * c, 0], head: [0.05 + 0.02 * Math.cos(2 * p), 0.05 * c, -0.03 * s], jaw: 0.2,
    aL: { f: 0.1 - 0.3 * s, out: 0.26, e: 0.35 + 0.15 * c }, aR: { f: 0.1 + 0.3 * s, out: 0.26, e: 0.35 - 0.15 * c },
    lL: { f: 0.45 * s, k: 0.1 + 0.85 * Math.max(0, c), out: 0.1 }, lR: { f: -0.45 * s, k: 0.1 + 0.85 * Math.max(0, -c), out: 0.1 },
    root: [0.02 * s, 0.014 * Math.cos(2 * p), 0], x: open(0.04 * Math.abs(s)),
  });
}

const idle = std({ aL: { f: 0.12, out: 0.26, e: 0.35 }, aR: { f: 0.2, out: 0.24, e: 0.45 }, lL: { f: 0.04, k: 0.08, out: 0.09 }, lR: { f: -0.05, k: 0.1, out: 0.09 } });

/** The slam: both fists over its head, down through the middle of whatever is in front of it, back to guard. */
const atk: RigPose[] = [
  std({ spine: [-0.16, 0, 0], chest: [-0.16, 0, 0], neck: [-0.05, 0, 0], head: [-0.1, 0, 0], jaw: 0.5, x: open(0.1),
    aL: { f: 2.5, out: 0.3, e: 0.3, w: 0.1 }, aR: { f: 2.45, out: 0.3, e: 0.3, w: 0.1 }, lL: { f: 0.15, k: 0.35 }, lR: { f: -0.15, k: 0.3 }, root: [0, 0, 0.05] }),
  std({ spine: [0.5, 0, 0], chest: [0.4, 0, 0], neck: [0.1, 0, 0], head: [0.25, 0, 0], jaw: 0.45, x: open(0.2),
    aL: { f: 0.55, out: 0.1, e: 0.25, w: 0.2 }, aR: { f: 0.5, out: 0.1, e: 0.25, w: 0.2 }, lL: { f: 0.4, k: 0.6 }, lR: { f: -0.25, k: 0.4 }, root: [0, 0, -0.12] }),
  std({ spine: [0.25, 0, 0], chest: [0.22, 0, 0], neck: [0.05, 0, 0], head: [0.12, 0, 0], jaw: 0.25, x: open(0.08),
    aL: { f: 0.75, out: 0.2, e: 0.7 }, aR: { f: 0.8, out: 0.2, e: 0.7 }, lL: { f: 0.25, k: 0.35 }, lR: { f: -0.12, k: 0.25 }, root: [0, 0, -0.04] }),
];

/** Pain: the armour takes it (a hit rattles the plates open) and the thing inside flinches. */
const pain: RigPose[] = [
  std({ spine: [-0.12, 0.1, 0.05], chest: [-0.2, 0.18, 0.06], neck: [-0.1, 0, 0], head: [-0.3, 0.12, 0], jaw: 0.7, x: open(0.3),
    aL: { f: -0.3, out: 0.8, e: 0.3, w: 0 }, aR: { f: 0.2, out: 0.75, e: 0.3, w: 0 }, lL: { f: -0.12, k: 0.2 }, lR: { f: 0.1, k: 0.2 }, root: [0, 0, 0.05] }),
  std({ spine: [0.4, -0.1, 0], chest: [0.35, -0.1, 0], neck: [-0.2, 0, 0], head: [0.0, 0, 0], jaw: 0.3, x: open(0.1),
    aL: { f: 0.9, out: 0.05, e: 1.4, w: 0.2 }, aR: { f: 0.9, out: 0.05, e: 1.4, w: 0.2 }, lL: { f: 0.2, k: 0.5 }, lR: { f: -0.08, k: 0.4 } }),
];

const fall = { y: 0.98, x: 1.1, xs: (k: number) => open([0.2, 0.35, 0.6, 0.85, 1][k]), jaw: (k: number) => [0.8, 0.6, 0.5, 0.45, 0.4][k] };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    ground: false, root: [0.05 + 0.03 * s, -0.68 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.18 * c, 0.06 * s], neck: [-0.35, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0], jaw: 0.2 + 0.1 * Math.max(0, s), x: open(0.2 + 0.1 * c),
    aL: { f: 0.55 + 0.4 * s, out: 0.38, e: 0.85 - 0.3 * s, w: 0.4 }, aR: { f: 0.55 - 0.4 * s, out: 0.34, e: 0.85 + 0.3 * s, w: 0.4 },
  });
}
const crawlAtk: RigPose[] = [
  std({ ground: false, root: [0.05, -0.64, 0.05], spine: [0.15, 0, 0], chest: [-0.1, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0], jaw: 0.5, x: open(0.2), aL: { f: 2.2, out: 0.5, e: 0.4 }, aR: { f: 2.2, out: 0.4, e: 0.4 } }),
  std({ ground: false, root: [0, -0.74, -0.1], spine: [0.85, 0, 0], chest: [0.5, -0.2, 0], neck: [-0.5, 0, 0], head: [-0.3, 0, 0], jaw: 0.45, x: open(0.3), aL: { f: 1.0, out: 0.3, e: 0.3 }, aR: { f: 0.95, out: 0.25, e: 0.4 } }),
  std({ ground: false, root: [0.05, -0.7, -0.04], spine: [0.65, 0, 0], chest: [0.4, 0, 0], neck: [-0.4, 0, 0], head: [-0.3, 0, 0], jaw: 0.3, x: open(0.2), aL: { f: 0.9, out: 0.4, e: 0.5 }, aR: { f: 0.95, out: 0.4, e: 0.55 } }),
];
const crawlPain: RigPose[] = [
  std({ ground: false, root: [0.06, -0.66, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.6, 0.15, 0], jaw: 0.7, x: open(0.4), aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.85, e: 0.3, w: 0 } }),
  std({ ground: false, root: [0, -0.74, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], jaw: 0.3, x: open(0.15), aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 } }),
];

export const HORROR_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

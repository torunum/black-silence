import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE CULTIST'S POSES: a brisk walk of six (it is quick, `sp` 3.2, and it
 * dodges: the gun stays up in its right hand while the left arm swings), an
 * idle with the gun held low, an attack of three that is the shot (it brings
 * the gun up, fires with the muzzle flash lit and the hand kicked back, and
 * lowers it), two of pain (the hood thrown back, then doubled over), five of
 * death (the hood falls open as it goes) and the crawl of one that has lost
 * its legs. Its own scalars: `flash` (the muzzle's fire) and `hood` (how far
 * the hood is thrown back, showing the dark under it).
 */

export const CULTIST_BODY = dims({
  pelvisY: 0.86, spineY: 0.05, chestY: 0.26, neckY: 0.3, neckZ: -0.02, headY: 0.07, headZ: -0.02, jawY: 0.0, jawZ: 0.0,
  shoulderX: 0.33, shoulderY: 0.24, upperArm: 0.29, foreArm: 0.27, hipX: 0.13, hipDrop: 0.04, thigh: 0.42, shin: 0.4, ankleY: 0.04,
  rest: { spine: [0.06, 0, 0], chest: [0.06, 0, 0], neck: [0.0, 0, 0], head: [0.04, 0, 0], jaw: 0, arm: { f: 0.12, out: 0.3, e: 0.35, w: 0.1 }, leg: { f: 0, k: 0.08, out: 0.03 } },
});
const std = makeStd(CULTIST_BODY);
const TAU = Math.PI * 2;
const x = (flash: number, hood = 0): Record<string, number> => ({ flash, hood });
/** The gun arm at rest: the forearm brought up and forward, the pistol held at the belt. */
const GUN = { f: 0.75, tw: -0.8, out: 0.2, e: 0.85, w: 0.0 };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    spine: [0.08 + 0.02 * c, 0.1 * c, 0.03 * s], chest: [0.07, -0.12 * c, 0.03 * s], neck: [0, 0.06 * c, 0], head: [0.04 + 0.02 * Math.cos(2 * p), 0.06 * c, -0.03 * s],
    aL: { f: 0.1 - 0.5 * s, out: 0.16, e: 0.35 + 0.25 * c }, aR: { ...GUN, f: GUN.f + 0.08 * s },
    lL: { f: 0.55 * s, k: 0.1 + 0.8 * Math.max(0, c), out: 0.05 }, lR: { f: -0.55 * s, k: 0.1 + 0.8 * Math.max(0, -c), out: 0.05 },
    root: [0.02 * s, 0.018 * Math.cos(2 * p), 0], x: x(0),
  });
}

const idle = std({ aL: { f: 0.12, out: 0.16, e: 0.4 }, aR: GUN, lL: { f: 0.04, k: 0.1 }, lR: { f: -0.05, k: 0.12 }, x: x(0) });

/** The shot: the gun comes up, it fires (the hand kicked back, the muzzle alight), it brings the gun down. */
const atk: RigPose[] = [
  std({ spine: [-0.05, 0.1, 0], chest: [0.0, 0.15, 0], head: [0.0, 0, 0], aL: { f: 0.5, out: 0.3, e: 0.9, w: 0.1 }, aR: { f: 1.35, out: 0.1, e: 0.7, w: 0.2 },
    lL: { f: 0.2, k: 0.25 }, lR: { f: -0.18, k: 0.2 }, x: x(0) }),
  std({ spine: [0.1, 0.12, 0], chest: [0.08, 0.2, 0], head: [-0.02, 0, 0], aL: { f: 0.55, out: 0.35, e: 0.9, w: 0.1 }, aR: { f: 1.55, out: 0.08, e: 0.12, w: 0.1 },
    lL: { f: 0.3, k: 0.35 }, lR: { f: -0.22, k: 0.25 }, root: [0, 0, -0.03], x: x(1) }),
  std({ spine: [-0.04, 0.05, 0], chest: [-0.04, 0.1, 0], head: [-0.08, 0, 0], aL: { f: 0.3, out: 0.2, e: 0.6, w: 0.1 }, aR: { f: 1.85, out: 0.12, e: 0.5, w: 0.5 },
    lL: { f: 0.15, k: 0.2 }, lR: { f: -0.1, k: 0.15 }, root: [0, 0, 0.03], x: x(0.35) }),
];

/** Pain: thrown back with the hood falling open, then doubled over the wound. */
const pain: RigPose[] = [
  std({ spine: [-0.14, 0.12, 0.06], chest: [-0.22, 0.2, 0.06], neck: [-0.1, 0, 0], head: [-0.4, 0.1, 0], aL: { f: -0.25, out: 0.8, e: 0.3, w: 0 }, aR: { f: 1.0, out: 0.5, e: 0.8, w: 0.3 },
    lL: { f: -0.12, k: 0.2 }, lR: { f: 0.12, k: 0.25 }, root: [0, 0, 0.05], x: x(0, 0.8) }),
  std({ spine: [0.45, -0.1, 0], chest: [0.4, -0.1, 0], neck: [0.1, 0, 0], head: [0.15, 0, 0], aL: { f: 0.8, out: 0.05, e: 1.4, w: 0.2 }, aR: { f: 0.9, out: 0.1, e: 1.3, w: 0.2 },
    lL: { f: 0.2, k: 0.5 }, lR: { f: -0.08, k: 0.4 }, x: x(0, 0.2) }),
];

const fall = { y: 0.97, x: 1, xs: (k: number) => x(0, [0.3, 0.6, 0.8, 0.9, 1][k]) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return std({
    ground: false, root: [0.05 + 0.03 * s, -0.7 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.18 * c, 0.06 * s], neck: [-0.3, 0.1 * c, 0], head: [-0.2, 0.1 * c, 0],
    aL: { f: 0.65 + 0.45 * s, out: 0.4, e: 0.8 - 0.3 * s, w: 0.4 }, aR: { f: 0.65 - 0.45 * s, out: 0.38, e: 0.8 + 0.3 * s, w: 0.4 }, x: x(0, 0.3),
  });
}
const crawlAtk: RigPose[] = [
  std({ ground: false, root: [0.05, -0.66, 0.05], spine: [0.15, 0, 0], chest: [-0.1, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.3, 0, 0], aL: { f: 1.0, out: 0.4, e: 0.5 }, aR: { f: 1.5, out: 0.1, e: 0.5 }, x: x(0, 0.3) }),
  std({ ground: false, root: [0, -0.74, -0.1], spine: [0.6, 0, 0], chest: [0.3, 0.1, 0], neck: [-0.4, 0, 0], head: [-0.3, 0, 0], aL: { f: 1.0, out: 0.3, e: 0.5 }, aR: { f: 1.6, out: 0.08, e: 0.1 }, x: x(1, 0.3) }),
  std({ ground: false, root: [0.05, -0.7, -0.04], spine: [0.55, 0, 0], chest: [0.3, 0, 0], neck: [-0.4, 0, 0], head: [-0.3, 0, 0], aL: { f: 0.8, out: 0.4, e: 0.6 }, aR: { f: 1.9, out: 0.1, e: 0.5, w: 0.5 }, x: x(0.3, 0.3) }),
];
const crawlPain: RigPose[] = [
  std({ ground: false, root: [0.06, -0.66, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.6, 0.15, 0], aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.85, e: 0.3, w: 0 }, x: x(0, 0.9) }),
  std({ ground: false, root: [0, -0.74, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 }, x: x(0, 0.2) }),
];

export const CULTIST_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

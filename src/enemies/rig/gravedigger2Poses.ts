import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE UNEARTHED GRAVEDIGGER'S POSES: the gravedigger's (`./gravediggerPoses.ts`) on the wraith's taller, thinner frame: a
 * trudge of six, the shovel across him, the rags swinging (`sway`); an idle; the attack (the shovel raised over his shoulder, the green on its blade: `cast`, and brought
 * down); two of pain; five of death; the crawl. `tilt` turns the haft in his fist.
 */

type NStd = Omit<Std, "x"> & { sway?: number; cast?: number; tilt?: number };
export const DIGGER2_BODY = dims({
  pelvisY: 1.0, spineY: 0.07, chestY: 0.32, neckY: 0.37, neckZ: -0.04, headY: 0.07, headZ: -0.03,
  shoulderX: 0.32, shoulderY: 0.3, upperArm: 0.4, foreArm: 0.38, hipX: 0.12, hipDrop: 0.04, thigh: 0.48, shin: 0.46, ankleY: 0.05,
  rest: { spine: [0.14, 0, 0], chest: [0.12, 0, 0], neck: [0.1, 0, 0], head: [0.1, 0, 0], jaw: 0, arm: { f: 0.3, out: 0.2, e: 0.9, w: 0.1 }, leg: { f: 0, k: 0.08, out: 0.06 } },
});
const std = makeStd(DIGGER2_BODY);
const make = (s: NStd): RigPose => std({ ...s, x: { sway: s.sway ?? 0, cast: s.cast ?? 0, tilt: s.tilt ?? TILT } });
const TAU = Math.PI * 2;
/** The haft turned across his body in the carry: the blade low on his left. */
const TILT = 2.0;
const CARRY = { aR: { f: 0.35, out: 0.45, e: 0.9, w: 0.1 }, aL: { f: 0.4, out: 0.5, e: 0.7, w: 0.1 } };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.15 + 0.02 * c, 0.06 * c, 0.02 * s], chest: [0.12, -0.08 * c, 0.03 * s], neck: [0.1, 0.04 * c, 0], head: [0.1, 0.05 * c, 0],
    aR: { ...CARRY.aR, f: CARRY.aR.f + 0.06 * s }, aL: { ...CARRY.aL, f: CARRY.aL.f + 0.06 * s },
    lL: { f: 0.4 * s, k: 0.08 + 0.75 * Math.max(0, c), out: 0.07 }, lR: { f: -0.4 * s, k: 0.08 + 0.75 * Math.max(0, -c), out: 0.07 },
    root: [0.015 * s, 0.012 * Math.cos(2 * p), 0], sway: s,
  });
}

const idle = make({ ...CARRY, lL: { f: 0.05, k: 0.08, out: 0.08 }, lR: { f: -0.05, k: 0.1, out: 0.08 } });

const atk: RigPose[] = [
  make({ aR: { f: 0.5, out: 1.0, e: 0.6, w: 0 }, aL: { f: 0.9, out: 0.2, e: 1.2 }, tilt: 2.4, spine: [-0.05, -0.15, 0], chest: [-0.08, -0.2, 0], head: [0.05, 0.1, 0], cast: 0.5, lL: { f: 0.2, k: 0.3 }, lR: { f: -0.2, k: 0.25 }, root: [0, 0, 0.05] }),
  make({ aR: { f: 1.1, out: 0.1, e: 0.15, w: 0.3 }, aL: { f: 1.0, out: -0.1, e: 0.3 }, tilt: 0, spine: [0.45, 0.1, 0], chest: [0.35, 0.15, 0], head: [0.2, -0.1, 0], cast: 1, sway: 0.8, lL: { f: 0.45, k: 0.6 }, lR: { f: -0.3, k: 0.4 }, root: [0, 0, -0.1] }),
  make({ aR: { f: 0.7, out: 0.2, e: 0.5, w: 0.3 }, aL: { f: 0.8, out: 0.0, e: 0.6 }, tilt: 0.6, spine: [0.3, 0.05, 0], chest: [0.25, 0.05, 0], head: [0.15, 0, 0], cast: 0.3, sway: 0.4, lL: { f: 0.3, k: 0.4 }, lR: { f: -0.15, k: 0.25 } }),
];

const pain: RigPose[] = [
  make({ spine: [-0.1, 0.1, 0.05], chest: [-0.18, 0.15, 0.06], neck: [-0.1, 0, 0], head: [-0.3, 0.1, 0], aR: { ...CARRY.aR, out: 0.7 }, aL: { f: -0.2, out: 0.8, e: 0.4 }, lL: { f: -0.12, k: 0.2 }, lR: { f: 0.1, k: 0.2 }, root: [0, 0, 0.05], sway: -0.6 }),
  make({ spine: [0.4, -0.08, 0], chest: [0.32, -0.08, 0], head: [0.1, 0, 0], aR: { ...CARRY.aR, f: 0.6 }, aL: { f: 0.9, out: 0.1, e: 1.3 }, lL: { f: 0.2, k: 0.5 }, lR: { f: -0.08, k: 0.4 }, sway: 0.4 }),
];

const fall = { y: 1.08, x: 1.1, xs: (k: number) => ({ sway: [-0.5, -0.2, 0.3, 0.4, 0.2][k], cast: 0, tilt: TILT }) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.74 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.16 * c, 0.06 * s], neck: [-0.35, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0],
    aL: { f: 0.6 + 0.4 * s, out: 0.38, e: 0.8 - 0.3 * s, w: 0.4 }, aR: { f: 0.6 - 0.4 * s, out: 0.3, e: 0.8 + 0.3 * s, w: 0.2 },
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.7, 0.05], spine: [0.15, 0, 0], chest: [-0.05, -0.1, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 0.8, out: 0.4, e: 0.6 }, aR: { f: 0.5, out: 1.0, e: 0.6 }, tilt: 2.4, cast: 0.5 }),
  make({ ground: false, root: [0, -0.78, -0.08], spine: [0.7, 0, 0], chest: [0.45, 0.1, 0], neck: [-0.45, 0, 0], head: [-0.3, 0, 0], aL: { f: 0.9, out: 0.2, e: 0.4 }, aR: { f: 1.1, out: 0.1, e: 0.15 }, tilt: 0, cast: 1 }),
  make({ ground: false, root: [0.05, -0.74, -0.03], spine: [0.55, 0, 0], chest: [0.35, 0, 0], neck: [-0.35, 0, 0], head: [-0.3, 0, 0], aL: { f: 0.7, out: 0.4, e: 0.7 }, aR: { f: 0.7, out: 0.3, e: 0.6 }, tilt: 0.6, cast: 0.3 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.7, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.15, 0], neck: [-0.1, 0, 0], head: [-0.4, 0.12, 0], aL: { f: 0.3, out: 0.8, e: 0.6 }, aR: { f: 0.3, out: 0.8, e: 0.3 } }),
  make({ ground: false, root: [0, -0.78, 0], spine: [0.8, -0.1, 0], chest: [0.45, 0, 0], neck: [-0.3, 0, 0], head: [0, 0, 0], aL: { f: 0.9, out: 0.1, e: 1.2 }, aR: { f: 0.9, out: 0.1, e: 1.1 } }),
];

export const DIGGER2_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";

/**
 * THE PLAGUE BLOAT'S POSES: a waddle of six, an idle, an attack of three (it
 * rears back and swells, thrusts and spews, recovers), two of pain, five of
 * death (the belly splits wider as it falls) and the crawl of one that has lost
 * its legs and hauls the barrel of itself on its arms.
 *
 * Its own scalars: `bile` (how the drips hang and swing), `spew` (the stream
 * out of its mouth) and `burst` (how far the belly is torn open).
 */

/** Short legs, a high wide chest, a head sunk between the shoulders. */
export const BLOAT_BODY = dims({
  pelvisY: 0.76, spineY: 0.1, chestY: 0.36, neckY: 0.3, neckZ: -0.04, headY: 0.06, headZ: -0.04, jawY: 0.03, jawZ: -0.01,
  shoulderX: 0.4, shoulderY: 0.2, upperArm: 0.26, foreArm: 0.26, hipX: 0.17, hipDrop: 0.05, thigh: 0.34, shin: 0.34, ankleY: 0.035,
  rest: { spine: [0.05, 0, 0], chest: [0.05, 0, 0], neck: [0.1, 0, 0], head: [0.05, 0, 0], jaw: 0.15, arm: { f: 0.05, out: 0.45, e: 0.3, w: 0.1 }, leg: { f: 0, k: 0.06, out: 0.1 } },
});
const std = makeStd(BLOAT_BODY);

type BStd = Omit<Std, "x"> & { bile?: number; spew?: number; burst?: number };
const make = (s: BStd): RigPose => std({ ...s, x: { bile: s.bile ?? 0, spew: s.spew ?? 0, burst: s.burst ?? 0 } });

const TAU = Math.PI * 2;

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    pelvis: [0, 0, 0.05 * s],
    spine: [0.05 + 0.02 * c, 0.06 * c, 0.11 * s], chest: [0.06, -0.06 * c, -0.07 * s], neck: [0.1, 0.05 * c, 0], head: [0.06 + 0.03 * Math.cos(2 * p), 0.05 * c, -0.06 * s],
    jaw: 0.12 + 0.1 * Math.max(0, Math.sin(2 * p)), bile: Math.sin(p + 0.9),
    aL: { f: 0.1 - 0.25 * s, out: 0.5, e: 0.3 + 0.1 * c }, aR: { f: 0.1 + 0.25 * s, out: 0.5, e: 0.3 - 0.1 * c },
    lL: { f: 0.4 * s, k: 0.08 + 0.55 * Math.max(0, c), out: 0.14 }, lR: { f: -0.4 * s, k: 0.08 + 0.55 * Math.max(0, -c), out: 0.14 },
    root: [0.035 * s, 0.012 * Math.cos(2 * p), 0],
  });
}

const idle = make({ jaw: 0.18, bile: 0.15, lL: { f: 0.04, k: 0.07, out: 0.12 }, lR: { f: -0.04, k: 0.07, out: 0.12 } });

/** Rears back and swells, thrusts forward and spews, recovers. */
const atk: RigPose[] = [
  make({ spine: [-0.2, 0, 0], chest: [-0.2, 0, 0], neck: [-0.25, 0, 0], head: [-0.5, 0, 0], jaw: 0.95, bile: 0.4,
    aL: { f: 0.35, out: 0.6, e: 0.4 }, aR: { f: 0.35, out: 0.6, e: 0.4 }, lL: { f: 0.15, k: 0.3, out: 0.16 }, lR: { f: -0.1, k: 0.25, out: 0.16 }, root: [0, 0, 0.07] }),
  make({ spine: [0.32, 0, 0], chest: [0.2, 0, 0], neck: [-0.1, 0, 0], head: [0.3, 0, 0], jaw: 0.85, spew: 1, bile: 0.9,
    aL: { f: 1.0, out: 0.3, e: 0.5, w: 0.2 }, aR: { f: 0.9, out: 0.3, e: 0.5, w: 0.2 }, lL: { f: 0.3, k: 0.55, out: 0.14 }, lR: { f: -0.25, k: 0.4, out: 0.14 }, root: [0, 0, -0.12] }),
  make({ spine: [0.2, 0, 0], chest: [0.2, 0, 0], neck: [0.1, 0, 0], head: [0.2, 0, 0], jaw: 0.45, spew: 0.3, bile: 0.4,
    aL: { f: 0.4, out: 0.35, e: 0.4 }, aR: { f: 0.5, out: 0.35, e: 0.4 }, lL: { f: 0.2, k: 0.3, out: 0.12 }, lR: { f: -0.15, k: 0.25, out: 0.12 }, root: [0, 0, -0.04] }),
];

/** Pain: thrown back with a bellow, then doubled over its belly. */
const pain: RigPose[] = [
  make({ spine: [-0.18, 0.1, 0.06], chest: [-0.22, 0.18, 0.06], neck: [-0.2, 0, 0], head: [-0.4, 0.15, 0], jaw: 0.95, bile: -0.5, burst: 0.1,
    aL: { f: -0.2, out: 0.8, e: 0.35, w: 0 }, aR: { f: 0.2, out: 0.8, e: 0.3, w: 0 }, lL: { f: -0.12, k: 0.2, out: 0.18 }, lR: { f: 0.1, k: 0.2, out: 0.18 }, root: [0, 0, 0.05] }),
  make({ spine: [0.4, -0.1, 0], chest: [0.38, -0.1, 0], neck: [-0.2, 0, 0], head: [-0.05, 0, 0], jaw: 0.4, bile: 0.7, burst: 0.1,
    aL: { f: 0.8, out: 0.0, e: 1.2, w: 0.2 }, aR: { f: 0.8, out: 0.0, e: 1.2, w: 0.2 }, lL: { f: 0.2, k: 0.45, out: 0.14 }, lR: { f: -0.08, k: 0.4, out: 0.14 } }),
];

/** Death: the belly bursts as it goes down; each frame is drawn on the floor the sinking sprite is at. */
const die: RigPose[] = [
  make({ spine: [-0.18, 0, 0.1], chest: [-0.28, 0.1, 0.12], neck: [-0.2, 0, 0], head: [-0.5, 0, 0], jaw: 1.0, bile: -0.6, burst: 0.2,
    aL: { f: 1.0, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.9, out: 0.9, e: 0.3, w: 0 }, lL: { f: 0.18, k: 0.4, out: 0.16 }, lR: { f: -0.15, k: 0.35, out: 0.16 }, root: [0.02, 0, 0.07], floor: 0.975 }),
  make({ spine: [0.1, 0, 0.12], chest: [-0.1, 0.1, 0.16], neck: [-0.15, 0, 0], head: [-0.2, 0.2, 0.1], jaw: 0.8, bile: 0.5, burst: 0.45,
    aL: { f: 0.1, out: 0.6, e: 0.25, w: 0 }, aR: { f: 0.3, out: 0.7, e: 0.3, w: 0 }, lL: { f: 1.3, k: 1.9, out: 0.2 }, lR: { f: 1.15, k: 1.8, out: 0.2 },
    ground: false, root: [-0.04, -0.34, -0.04], floor: 0.93 }),
  make({ pelvis: [0, 0, 0.55], spine: [0.1, 0, 0.3], chest: [-0.05, 0, 0.3], neck: [-0.1, 0, 0.1], head: [-0.1, 0.1, 0.3], jaw: 0.6, bile: 0.8, burst: 0.7,
    aL: { f: 0.2, out: 0.5, e: 0.3 }, aR: { f: -0.2, out: 0.45, e: 0.4 }, lL: { f: 1.0, k: 1.7, out: 0.25 }, lR: { f: 0.6, k: 1.6, out: 0.25 },
    ground: false, root: [-0.3, -0.36, 0], floor: 0.866 }),
  make({ pelvis: [0, 0, 1.15], spine: [0.1, 0, 0.2], chest: [0.0, 0, 0.2], neck: [0, 0, 0.1], head: [0.1, 0.1, 0.25], jaw: 0.5, bile: 0.3, burst: 0.9,
    aL: { f: -0.1, out: 0.5, e: 0.5 }, aR: { f: 0.3, out: 0.6, e: 0.7 }, lL: { f: 1.3, k: 2.05, out: 0.3 }, lR: { f: 0.9, k: 1.9, out: 0.25 },
    ground: false, root: [-0.4, -0.4, 0], floor: 0.78 }),
  make({ pelvis: [0, 0, 1.4], spine: [0.1, 0, 0.1], chest: [0.05, 0, 0.1], neck: [0, 0, 0.05], head: [0.1, 0.1, 0.2], jaw: 0.5, bile: 0, burst: 1,
    aL: { f: -0.2, out: 0.55, e: 0.5 }, aR: { f: 0.4, out: 0.65, e: 0.8 }, lL: { f: 1.4, k: 2.15, out: 0.35 }, lR: { f: 1.05, k: 2.0, out: 0.35 },
    ground: false, root: [-0.42, -0.42, 0], floor: 0.7 }),
];

/** Hauling itself on its arms with the legs gone: the belly drags. */
function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.04 + 0.03 * s, -0.55 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.45, 0.1 * c, 0.05 * s], chest: [0.28, -0.14 * c, 0.05 * s], neck: [-0.3, 0.1 * c, 0], head: [-0.2, 0.1 * c, 0], jaw: 0.2 + 0.1 * Math.max(0, s), bile: c, burst: 0.15,
    aL: { f: 0.6 + 0.4 * s, out: 0.4, e: 0.7 - 0.3 * s, w: 0.3 }, aR: { f: 0.6 - 0.4 * s, out: 0.4, e: 0.7 + 0.3 * s, w: 0.3 },
  });
}
const crawlIdle = crawl(0);
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.04, -0.52, 0.05], spine: [0.1, 0, 0], chest: [-0.1, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.4, 0, 0], jaw: 0.95, bile: 0.3, burst: 0.15,
    aL: { f: 1.6, out: 0.5, e: 0.4 }, aR: { f: 1.7, out: 0.5, e: 0.4 } }),
  make({ ground: false, root: [0, -0.6, -0.1], spine: [0.8, 0, 0], chest: [0.5, 0, 0], neck: [-0.4, 0, 0], head: [0.0, 0, 0], jaw: 0.8, spew: 1, bile: 0.8, burst: 0.2,
    aL: { f: 1.1, out: 0.3, e: 0.3 }, aR: { f: 1.0, out: 0.3, e: 0.4 } }),
  make({ ground: false, root: [0.04, -0.56, -0.04], spine: [0.6, 0, 0], chest: [0.4, 0, 0], neck: [-0.3, 0, 0], head: [-0.1, 0, 0], jaw: 0.4, spew: 0.3, bile: 0.3, burst: 0.15,
    aL: { f: 0.8, out: 0.4, e: 0.5 }, aR: { f: 0.8, out: 0.4, e: 0.5 } }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.05, -0.53, 0.05], spine: [0.15, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.55, 0.15, 0], jaw: 0.95, bile: -0.5, burst: 0.2,
    aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.85, e: 0.3, w: 0 } }),
  make({ ground: false, root: [0, -0.6, 0], spine: [0.8, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], jaw: 0.4, bile: 0.6, burst: 0.2,
    aL: { f: 0.8, out: 0.1, e: 1.2 }, aR: { f: 0.8, out: 0.1, e: 1.2 } }),
];
const crawlDie: RigPose[] = [
  make({ ground: false, floor: 0.975, root: [0.02, -0.55, 0.05], spine: [0.0, 0, 0.1], chest: [-0.2, 0, 0.1], neck: [-0.3, 0, 0], head: [-0.5, 0, 0.1], jaw: 1.0, bile: -0.4, burst: 0.3,
    aL: { f: 1.4, out: 0.6, e: 0.2, w: 0 }, aR: { f: 1.3, out: 0.6, e: 0.2, w: 0 } }),
  make({ ground: false, floor: 0.93, root: [-0.1, -0.55, 0], pelvis: [0, 0, 0.45], spine: [0.3, 0, 0.1], chest: [0.1, 0, 0.1], neck: [-0.1, 0, 0], head: [-0.2, 0.1, 0.1], jaw: 0.7, bile: 0.4, burst: 0.5,
    aL: { f: 0.9, out: 0.7, e: 0.4 }, aR: { f: 1.0, out: 0.7, e: 0.4 } }),
  make({ ground: false, floor: 0.866, root: [-0.26, -0.5, 0], pelvis: [0, 0, 0.95], spine: [0.2, 0, 0.1], chest: [0.1, 0, 0.1], neck: [0, 0, 0], head: [0.1, 0.1, 0.1], jaw: 0.5, bile: 0.2, burst: 0.75,
    aL: { f: 0.5, out: 0.9, e: 0.3 }, aR: { f: 0.7, out: 0.9, e: 0.3 } }),
  make({ ground: false, floor: 0.78, root: [-0.34, -0.48, 0], pelvis: [0, 0, 1.3], spine: [0.1, 0, 0.1], chest: [0.1, 0, 0.1], neck: [0.1, 0, 0], head: [0.2, 0.1, 0.1], jaw: 0.5, bile: 0.1, burst: 0.9,
    aL: { f: -0.1, out: 0.7, e: 0.5 }, aR: { f: 0.0, out: 0.7, e: 0.5 } }),
  make({ ground: false, floor: 0.7, root: [-0.4, -0.48, 0], pelvis: [0, 0, 1.45], spine: [0.1, 0, 0.1], chest: [0.1, 0, 0.1], neck: [0.1, 0, 0], head: [0.3, 0.1, 0.1], jaw: 0.45, bile: 0, burst: 1,
    aL: { f: -0.2, out: 0.75, e: 0.5 }, aR: { f: -0.1, out: 0.75, e: 0.5 } }),
];

export const BLOAT_POSES: RigPoses = { walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die, crawl: [0, 1, 2, 3].map(crawl), crawlIdle, crawlAtk, crawlPain, crawlDie };

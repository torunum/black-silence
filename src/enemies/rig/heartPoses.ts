import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE HEART'S POSES. It does not walk so much as heave itself along on its roots: six frames of the beat (`beat`: swelling,
 * clenching), the arteries lashing, the roots dragging; an idle beating; the attack (the ventricle's mouth gapes, `gape`, the
 * arteries thrown forward to spit); two of pain; five of death (it topples, still beating less); the crawl, its roots torn out.
 */

type GStd = Omit<Std, "x"> & { beat?: number; gape?: number };
export const HEART_BODY = dims({
  pelvisY: 0.74, spineY: 0.1, chestY: 0.45, neckY: 0.5, neckZ: 0.02, headY: 0.0, headZ: 0, jawY: 0, jawZ: 0,
  shoulderX: 0.52, shoulderY: 0.1, upperArm: 0.36, foreArm: 0.34, hipX: 0.16, hipDrop: 0.0, thigh: 0.36, shin: 0.34, ankleY: 0.04,
  rest: { spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], jaw: 0, arm: { f: 0.2, out: 0.7, e: 0.6, w: 0.3 }, leg: { f: 0, k: 0.6, out: 0.5 } },
});
const std = makeStd(HEART_BODY);
const make = (s: GStd): RigPose => std({ ...s, x: { beat: s.beat ?? 0.3, gape: s.gape ?? 0.2 } });
const TAU = Math.PI * 2;

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p), beat = Math.max(0, Math.sin(2 * p));
  return make({
    chest: [0.04 * s, 0.06 * c, 0.03 * s],
    aL: { f: 0.2 + 0.4 * s, out: 0.75 + 0.15 * c, e: 0.6 - 0.3 * s, w: 0.3 }, aR: { f: 0.2 - 0.4 * s, out: 0.75 - 0.15 * c, e: 0.6 + 0.3 * s, w: 0.3 },
    lL: { f: 0.2 * s, k: 0.6 + 0.3 * Math.max(0, c), out: 0.5 }, lR: { f: -0.2 * s, k: 0.6 + 0.3 * Math.max(0, -c), out: 0.5 },
    root: [0.02 * s, 0.02 * beat, 0], beat, gape: 0.2 + 0.15 * beat,
  });
}

const idle = make({ beat: 0.5 });

const atk: RigPose[] = [
  make({ chest: [-0.12, 0, 0], aL: { f: -0.3, out: 1.0, e: 1.0 }, aR: { f: -0.3, out: 1.0, e: 1.0 }, beat: 1, gape: 0.6, root: [0, 0, 0.05] }),
  make({ chest: [0.15, 0, 0], aL: { f: 1.3, out: 0.4, e: 0.2 }, aR: { f: 1.3, out: 0.4, e: 0.2 }, beat: 0.2, gape: 1, root: [0, 0, -0.06] }),
  make({ chest: [0.05, 0, 0], aL: { f: 0.7, out: 0.6, e: 0.5 }, aR: { f: 0.7, out: 0.6, e: 0.5 }, beat: 0.6, gape: 0.5 }),
];

const pain: RigPose[] = [
  make({ chest: [-0.15, 0.12, 0.08], aL: { f: -0.2, out: 1.1, e: 0.3 }, aR: { f: 0.1, out: 1.1, e: 0.3 }, beat: 1, gape: 0.9, root: [0, 0, 0.05] }),
  make({ chest: [0.12, -0.1, -0.06], aL: { f: 0.9, out: 0.4, e: 1.3 }, aR: { f: 0.9, out: 0.4, e: 1.3 }, beat: 0, gape: 0.3 }),
];

const fall = { y: 0.84, x: 1.2, xs: (k: number) => ({ beat: [0.8, 0.5, 0.3, 0.1, 0][k], gape: [0.9, 0.7, 0.5, 0.4, 0.4][k] }) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({ ground: false, root: [0.02 * s, -0.5 + 0.02 * c, 0], chest: [0.04 * s, 0.06 * c, 0], aL: { f: 0.6 + 0.4 * s, out: 0.8, e: 0.6 }, aR: { f: 0.6 - 0.4 * s, out: 0.8, e: 0.6 }, beat: Math.max(0, s) });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0, -0.5, 0.05], chest: [-0.12, 0, 0], aL: { f: -0.3, out: 1.0, e: 1.0 }, aR: { f: -0.3, out: 1.0, e: 1.0 }, beat: 1, gape: 0.6 }),
  make({ ground: false, root: [0, -0.5, -0.06], chest: [0.15, 0, 0], aL: { f: 1.3, out: 0.4, e: 0.2 }, aR: { f: 1.3, out: 0.4, e: 0.2 }, beat: 0.2, gape: 1 }),
  make({ ground: false, root: [0, -0.5, -0.02], chest: [0.05, 0, 0], aL: { f: 0.7, out: 0.6, e: 0.5 }, aR: { f: 0.7, out: 0.6, e: 0.5 }, beat: 0.6, gape: 0.5 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0, -0.5, 0.05], chest: [-0.15, 0.12, 0.08], aL: { f: -0.2, out: 1.1, e: 0.3 }, aR: { f: 0.1, out: 1.1, e: 0.3 }, beat: 1, gape: 0.9 }),
  make({ ground: false, root: [0, -0.52, 0], chest: [0.12, -0.1, -0.06], aL: { f: 0.9, out: 0.4, e: 1.3 }, aR: { f: 0.9, out: 0.4, e: 1.3 }, beat: 0 }),
];

export const HEART_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

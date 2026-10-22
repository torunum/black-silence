import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE LOST SOUL'S POSES. It flies, so the "walk" is six frames of it hanging in the air with its fire leaping (`flick`), the
 * spine swinging under it and the arms clawing; the attack is the charge (the jaw drops, the arms reach, the fire streams back:
 * `rush`); pain, a fall, and the crawl of a skull whose spine is gone.
 */

type LStd = Omit<Std, "x"> & { flick?: number; rush?: number };
export const SOUL_BODY = dims({
  pelvisY: 0.45, spineY: 0.04, chestY: 0.12, neckY: 0.2, neckZ: 0, headY: 0.0, headZ: 0, jawY: -0.32, jawZ: 0.0,
  shoulderX: 0.15, shoulderY: -0.12, upperArm: 0.14, foreArm: 0.13, hipX: 0.025, hipDrop: 0.0, thigh: 0.18, shin: 0.16, ankleY: 0.03,
  rest: { spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], jaw: 0.35, arm: { f: 0.5, out: 0.5, e: 0.7, w: 0.3 }, leg: { f: -0.3, k: 0.5, out: 0.15 } },
});
const std = makeStd(SOUL_BODY);
const make = (s: LStd): RigPose => std({ ...s, x: { flick: s.flick ?? 0, rush: s.rush ?? 0 } });
const TAU = Math.PI * 2;

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    chest: [0.05 * s, 0.1 * c, 0.05 * s], jaw: 0.35 + 0.15 * Math.max(0, Math.sin(2 * p)),
    aL: { f: 0.5 + 0.35 * s, out: 0.55, e: 0.7 - 0.3 * s, w: 0.3 }, aR: { f: 0.5 - 0.35 * s, out: 0.55, e: 0.7 + 0.3 * s, w: 0.3 },
    lL: { f: -0.3 + 0.3 * s, k: 0.5 + 0.3 * c, out: 0.15 }, lR: { f: -0.3 - 0.3 * s, k: 0.5 - 0.3 * c, out: 0.15 },
    root: [0.02 * s, 0.03 * Math.sin(p + 1), 0], flick: i / 6,
  });
}

const idle = make({ flick: 0.5 });

const atk: RigPose[] = [
  make({ chest: [-0.2, 0, 0], jaw: 0.6, aL: { f: 0.4, out: 0.9, e: 0.6 }, aR: { f: 0.4, out: 0.9, e: 0.6 }, flick: 0.2, rush: 0.4, root: [0, 0, 0.04] }),
  make({ chest: [0.25, 0, 0], jaw: 1.0, aL: { f: 1.3, out: 0.3, e: 0.2 }, aR: { f: 1.3, out: 0.3, e: 0.2 }, lL: { f: -0.9, k: 0.3, out: 0.1 }, lR: { f: -0.9, k: 0.3, out: 0.1 }, flick: 0.7, rush: 1, root: [0, 0, -0.06] }),
  make({ chest: [0.1, 0, 0], jaw: 0.6, aL: { f: 0.8, out: 0.5, e: 0.5 }, aR: { f: 0.8, out: 0.5, e: 0.5 }, flick: 0.9, rush: 0.5, root: [0, 0, -0.02] }),
];

const pain: RigPose[] = [
  make({ chest: [-0.3, 0.25, 0.2], jaw: 0.9, aL: { f: -0.2, out: 1.0, e: 0.3 }, aR: { f: 0.0, out: 1.0, e: 0.3 }, lL: { f: 0.3, k: 0.2, out: 0.4 }, lR: { f: 0.2, k: 0.2, out: 0.4 }, flick: 0.3, rush: 0.6, root: [0.02, 0.02, 0.04] }),
  make({ chest: [0.25, -0.2, -0.1], jaw: 0.5, aL: { f: 1.0, out: 0.2, e: 1.3 }, aR: { f: 1.0, out: 0.2, e: 1.3 }, flick: 0.6, rush: 0.2 }),
];

const fall = { y: 0.5, x: 0.6, xs: (k: number) => ({ flick: k * 0.2, rush: [0.4, 0.2, 0, 0, 0][k] }), jaw: (k: number) => [1, 0.8, 0.6, 0.5, 0.5][k] };

/** The spine gone: the skull hangs low, a stump of meat where it was. */
function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({ ground: false, root: [0.02 * s, -0.22 + 0.02 * c, 0], chest: [0.05 * s, 0.1 * c, 0], aL: { f: 0.6 + 0.3 * s, out: 0.6, e: 0.7 }, aR: { f: 0.6 - 0.3 * s, out: 0.6, e: 0.7 }, flick: i / 4 });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0, -0.22, 0.04], chest: [-0.2, 0, 0], jaw: 0.6, aL: { f: 0.4, out: 0.9, e: 0.6 }, aR: { f: 0.4, out: 0.9, e: 0.6 }, rush: 0.4 }),
  make({ ground: false, root: [0, -0.22, -0.06], chest: [0.25, 0, 0], jaw: 1.0, aL: { f: 1.3, out: 0.3, e: 0.2 }, aR: { f: 1.3, out: 0.3, e: 0.2 }, rush: 1, flick: 0.5 }),
  make({ ground: false, root: [0, -0.22, -0.02], chest: [0.1, 0, 0], jaw: 0.6, aL: { f: 0.8, out: 0.5, e: 0.5 }, aR: { f: 0.8, out: 0.5, e: 0.5 }, rush: 0.5, flick: 0.8 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.02, -0.22, 0.04], chest: [-0.3, 0.25, 0.2], jaw: 0.9, aL: { f: -0.2, out: 1.0, e: 0.3 }, aR: { f: 0.0, out: 1.0, e: 0.3 }, rush: 0.6 }),
  make({ ground: false, root: [0, -0.23, 0], chest: [0.25, -0.2, -0.1], jaw: 0.5, aL: { f: 1.0, out: 0.2, e: 1.3 }, aR: { f: 1.0, out: 0.2, e: 1.3 }, flick: 0.6 }),
];

export const SOUL_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

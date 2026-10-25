import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE FOREMAN'S POSES: a heavy tread of six, the cannons carried forward, the firebox breathing (`heat`); an idle; the attack
 * (both cannons levelled, fired — `fire` — and the recoil); two of pain; five of death; the crawl.
 */

type VStd = Omit<Std, "x"> & { heat?: number; fire?: number };
export const FOREMAN_BODY = dims({
  pelvisY: 0.95, spineY: 0.08, chestY: 0.32, neckY: 0.42, neckZ: -0.01, headY: 0.08, headZ: -0.01, jawY: 0.0, jawZ: 0,
  shoulderX: 0.5, shoulderY: 0.3, upperArm: 0.34, foreArm: 0.32, hipX: 0.19, hipDrop: 0.05, thigh: 0.45, shin: 0.43, ankleY: 0.06,
  rest: { spine: [0.04, 0, 0], chest: [0.04, 0, 0], neck: [0, 0, 0], head: [0.04, 0, 0], jaw: 0, arm: { f: 0.3, out: 0.3, e: 0.9, w: 0 }, leg: { f: 0, k: 0.06, out: 0.08 } },
});
const std = makeStd(FOREMAN_BODY);
const make = (s: VStd): RigPose => std({ ...s, x: { heat: s.heat ?? 0.6, fire: s.fire ?? 0 } });
const TAU = Math.PI * 2;
const CARRY = { aL: { f: 0.35, out: 0.32, e: 0.9, w: 0 }, aR: { f: 0.35, out: 0.32, e: 0.9, w: 0 } };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.05 + 0.02 * c, 0.05 * c, 0.02 * s], chest: [0.04, -0.06 * c, 0.03 * s], head: [0.04, 0.04 * c, 0],
    aL: { ...CARRY.aL, f: CARRY.aL.f - 0.15 * s }, aR: { ...CARRY.aR, f: CARRY.aR.f + 0.15 * s },
    lL: { f: 0.4 * s, k: 0.06 + 0.8 * Math.max(0, c), out: 0.09 }, lR: { f: -0.4 * s, k: 0.06 + 0.8 * Math.max(0, -c), out: 0.09 },
    root: [0.02 * s, 0.014 * Math.cos(2 * p), 0], heat: 0.5 + 0.3 * Math.max(0, Math.sin(2 * p)),
  });
}

const idle = make({ ...CARRY, lL: { f: 0.06, k: 0.06, out: 0.1 }, lR: { f: -0.06, k: 0.08, out: 0.1 } });

const atk: RigPose[] = [
  make({ aL: { f: 1.0, out: 0.25, e: 0.6 }, aR: { f: 1.0, out: 0.25, e: 0.6 }, spine: [0.0, 0, 0], chest: [-0.04, 0, 0], heat: 0.9, fire: 0.3, lL: { f: 0.25, k: 0.3 }, lR: { f: -0.2, k: 0.2 } }),
  make({ aL: { f: 1.35, out: 0.2, e: 0.25 }, aR: { f: 1.35, out: 0.2, e: 0.25 }, spine: [-0.1, 0, 0], chest: [-0.12, 0, 0], head: [0.08, 0, 0], heat: 1, fire: 1, lL: { f: 0.3, k: 0.35 }, lR: { f: -0.25, k: 0.2 }, root: [0, 0, 0.06] }),
  make({ aL: { f: 1.1, out: 0.25, e: 0.55 }, aR: { f: 1.1, out: 0.25, e: 0.55 }, spine: [-0.04, 0, 0], chest: [-0.05, 0, 0], heat: 0.8, fire: 0.3, lL: { f: 0.25, k: 0.3 }, lR: { f: -0.2, k: 0.2 }, root: [0, 0, 0.03] }),
];

const pain: RigPose[] = [
  make({ spine: [-0.12, 0.08, 0.04], chest: [-0.16, 0.1, 0.05], head: [-0.25, 0.1, 0], aL: { f: 0.1, out: 0.7, e: 0.5 }, aR: { f: 0.2, out: 0.6, e: 0.5 }, lL: { f: -0.1, k: 0.15 }, lR: { f: 0.08, k: 0.15 }, heat: 1, root: [0, 0, 0.04] }),
  make({ spine: [0.3, -0.06, 0], chest: [0.25, -0.06, 0], head: [0.1, 0, 0], aL: { f: 0.8, out: 0.15, e: 1.2 }, aR: { f: 0.8, out: 0.15, e: 1.2 }, lL: { f: 0.15, k: 0.4 }, lR: { f: -0.06, k: 0.3 }, heat: 0.3 }),
];

const fall = { y: 1.08, x: 1.1, xs: (k: number) => ({ heat: [1, 0.8, 0.5, 0.2, 0][k], fire: 0 }) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.76 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.45, 0.1 * c, 0.05 * s], chest: [0.3, -0.15 * c, 0.05 * s], neck: [-0.3, 0.08 * c, 0], head: [-0.25, 0.08 * c, 0],
    aL: { f: 0.5 + 0.35 * s, out: 0.4, e: 0.9 - 0.3 * s }, aR: { f: 0.5 - 0.35 * s, out: 0.4, e: 0.9 + 0.3 * s },
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.72, 0.05], spine: [0.2, 0, 0], chest: [0, 0, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 1.0, out: 0.3, e: 0.5 }, aR: { f: 1.0, out: 0.3, e: 0.5 }, heat: 0.9, fire: 0.3 }),
  make({ ground: false, root: [0.05, -0.72, 0.08], spine: [0.15, 0, 0], chest: [-0.05, 0, 0], neck: [-0.2, 0, 0], head: [-0.15, 0, 0], aL: { f: 1.3, out: 0.25, e: 0.25 }, aR: { f: 1.3, out: 0.25, e: 0.25 }, heat: 1, fire: 1 }),
  make({ ground: false, root: [0.05, -0.74, 0.03], spine: [0.3, 0, 0], chest: [0.1, 0, 0], neck: [-0.25, 0, 0], head: [-0.2, 0, 0], aL: { f: 1.0, out: 0.3, e: 0.5 }, aR: { f: 1.0, out: 0.3, e: 0.5 }, heat: 0.8, fire: 0.3 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.72, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.15, 0], neck: [-0.1, 0, 0], head: [-0.4, 0.12, 0], aL: { f: 0.3, out: 0.8, e: 0.6 }, aR: { f: 0.3, out: 0.8, e: 0.5 } }),
  make({ ground: false, root: [0, -0.8, 0], spine: [0.8, -0.1, 0], chest: [0.45, 0, 0], neck: [-0.3, 0, 0], head: [0, 0, 0], aL: { f: 0.9, out: 0.1, e: 1.2 }, aR: { f: 0.9, out: 0.1, e: 1.1 } }),
];

export const FOREMAN_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

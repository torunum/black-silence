import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE GARGOYLE'S POSES. It does not walk, it flies: the "walk" is six frames of a wingbeat (`flap`: the wings high, then down
 * and driving, the body lifting on the stroke), its legs drawn up under it; an idle hovering with the wings spread; the attack
 * throws its arms and wings wide and opens its jaws on Cheogh's fire (`glow`); pain, a fall of five and the crawl.
 * Its scalars: `flap` (the wings' lift, -1 down .. 1 up), `spread` (0 folded .. 1 wide), `claw`, `glow`.
 */

type YStd = Omit<Std, "x"> & { flap?: number; spread?: number; claw?: number; glow?: number };
export const GARGOYLE_BODY = dims({
  pelvisY: 0.72, spineY: 0.05, chestY: 0.26, neckY: 0.32, neckZ: -0.06, headY: 0.06, headZ: -0.04, jawY: 0.02, jawZ: -0.01,
  shoulderX: 0.31, shoulderY: 0.27, upperArm: 0.28, foreArm: 0.27, hipX: 0.13, hipDrop: 0.04, thigh: 0.32, shin: 0.32, ankleY: 0.04,
  rest: { spine: [0.35, 0, 0], chest: [0.3, 0, 0], neck: [-0.45, 0, 0], head: [-0.25, 0, 0], jaw: 0.3, arm: { f: 0.5, out: 0.35, e: 0.9, w: 0.2 }, leg: { f: 1.0, k: 1.7, out: 0.2 } },
});
const std = makeStd(GARGOYLE_BODY);
const make = (s: YStd): RigPose => std({ ...s, x: { flap: s.flap ?? 0, spread: s.spread ?? 0.7, claw: s.claw ?? 0.6, glow: s.glow ?? 0 } });
const TAU = Math.PI * 2;
const TUCK = { lL: { f: 1.0, k: 1.75, out: 0.22, toe: 0.4 }, lR: { f: 0.9, k: 1.65, out: 0.22, toe: 0.4 } };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ...TUCK, spine: [0.35 + 0.05 * s, 0, 0], chest: [0.3 - 0.05 * s, 0, 0], neck: [-0.45, 0, 0], head: [-0.25 + 0.05 * s, 0.05 * c, 0], jaw: 0.3,
    aL: { f: 0.5 + 0.1 * s, out: 0.4, e: 0.9, w: 0.2 }, aR: { f: 0.5 + 0.1 * s, out: 0.4, e: 0.9, w: 0.2 },
    lL: { ...TUCK.lL, f: TUCK.lL.f + 0.1 * c }, lR: { ...TUCK.lR, f: TUCK.lR.f + 0.1 * c },
    flap: c, spread: 0.85 + 0.15 * s, root: [0, 0.04 * -c, 0],
  });
}

const idle = make({ ...TUCK, flap: 0.3, spread: 0.85 });

const atk: RigPose[] = [
  make({ ...TUCK, spine: [0.15, 0, 0], chest: [0.05, 0, 0], neck: [-0.1, 0, 0], head: [-0.25, 0, 0], jaw: 0.5, aL: { f: 0.9, out: 1.0, e: 0.5 }, aR: { f: 0.9, out: 1.0, e: 0.5 }, flap: 1, spread: 1, glow: 0.5, claw: 1 }),
  make({ ...TUCK, spine: [0.45, 0, 0], chest: [0.35, 0, 0], neck: [-0.05, 0, 0], head: [-0.1, 0, 0], jaw: 1.0, aL: { f: 1.2, out: 0.6, e: 0.2 }, aR: { f: 1.2, out: 0.6, e: 0.2 }, flap: -0.6, spread: 1, glow: 1, claw: 1, root: [0, 0, -0.08] }),
  make({ ...TUCK, spine: [0.4, 0, 0], chest: [0.3, 0, 0], neck: [-0.15, 0, 0], head: [-0.15, 0, 0], jaw: 0.6, aL: { f: 0.7, out: 0.5, e: 0.7 }, aR: { f: 0.7, out: 0.5, e: 0.7 }, flap: 0.2, spread: 0.8, glow: 0.3 }),
];

const pain: RigPose[] = [
  make({ ...TUCK, spine: [0.1, 0.1, 0.1], chest: [0.0, 0.15, 0.1], head: [-0.5, 0.1, 0], jaw: 0.9, aL: { f: 0.2, out: 1.0, e: 0.4 }, aR: { f: 0.3, out: 0.9, e: 0.4 }, flap: 1, spread: 0.4 }),
  make({ ...TUCK, spine: [0.6, -0.1, 0], chest: [0.4, -0.1, 0], head: [0.0, 0, 0], jaw: 0.5, aL: { f: 1.0, out: 0.2, e: 1.4 }, aR: { f: 1.0, out: 0.2, e: 1.4 }, flap: -1, spread: 0.3 }),
];

const fall = { y: 0.82, x: 0.9, xs: (k: number) => ({ flap: [1, 0.5, -0.5, -1, -1][k], spread: [0.6, 0.8, 1, 1, 1][k], claw: 0.2, glow: 0 }) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0, -0.56 + 0.03 * c, 0], spine: [0.35, 0, 0], chest: [0.3, 0, 0], neck: [-0.2, 0, 0], head: [-0.2, 0.05 * s, 0],
    aL: { f: 0.6 + 0.1 * s, out: 0.45, e: 0.8 }, aR: { f: 0.6 + 0.1 * s, out: 0.45, e: 0.8 }, flap: c, spread: 0.8,
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0, -0.56, 0], spine: [0.15, 0, 0], chest: [0.05, 0, 0], head: [-0.25, 0, 0], jaw: 0.5, aL: { f: 0.9, out: 1.0, e: 0.5 }, aR: { f: 0.9, out: 1.0, e: 0.5 }, flap: 1, spread: 1, glow: 0.5 }),
  make({ ground: false, root: [0, -0.6, -0.08], spine: [0.45, 0, 0], chest: [0.35, 0, 0], head: [-0.1, 0, 0], jaw: 1.0, aL: { f: 1.2, out: 0.6, e: 0.2 }, aR: { f: 1.2, out: 0.6, e: 0.2 }, flap: -0.6, spread: 1, glow: 1 }),
  make({ ground: false, root: [0, -0.58, -0.04], spine: [0.4, 0, 0], chest: [0.3, 0, 0], head: [-0.15, 0, 0], jaw: 0.6, aL: { f: 0.7, out: 0.5, e: 0.7 }, aR: { f: 0.7, out: 0.5, e: 0.7 }, flap: 0.2, spread: 0.8, glow: 0.3 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0, -0.56, 0.04], spine: [0.1, 0.1, 0.1], chest: [0.0, 0.15, 0.1], head: [-0.5, 0.1, 0], jaw: 0.9, aL: { f: 0.2, out: 1.0, e: 0.4 }, aR: { f: 0.3, out: 0.9, e: 0.4 }, flap: 1, spread: 0.4 }),
  make({ ground: false, root: [0, -0.62, 0], spine: [0.6, -0.1, 0], chest: [0.4, -0.1, 0], head: [0, 0, 0], jaw: 0.5, aL: { f: 1.0, out: 0.2, e: 1.4 }, aR: { f: 1.0, out: 0.2, e: 1.4 }, flap: -1, spread: 0.3 }),
];

export const GARGOYLE_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

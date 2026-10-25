import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE CULTIST'S POSES: a march of six (upright, the gun carried across the body in both hands, the robe swinging: `sway`), an
 * idle, an attack of three (the gun comes up, fires — `flash` — and comes down), two of pain, five of death and the crawl of
 * one that has lost its legs, still holding the gun.
 */

type CStd = Omit<Std, "x"> & { sway?: number; flash?: number };
export const CULTIST_BODY = dims({
  pelvisY: 0.9, shoulderX: 0.33, hipX: 0.13, neckY: 0.35,
  rest: { spine: [0.03, 0, 0], chest: [0.04, 0, 0], neck: [0.0, 0, 0], head: [0.06, 0, 0], jaw: 0.1, arm: { f: 0.4, out: 0.18, e: 1.0, w: 0.1 }, leg: { f: 0, k: 0.06, out: 0.05 } },
});
const std = makeStd(CULTIST_BODY);
const make = (s: CStd): RigPose => std({ ...s, x: { sway: s.sway ?? 0, flash: s.flash ?? 0 } });
const TAU = Math.PI * 2;

/** The gun carried low across the body: the right hand on the grip at the hip, the left under the barrel; the twist turns the forearms across. */
const PORT = { aR: { f: 0.25, out: 0.15, tw: 0.9, e: 1.35, w: 0.05 }, aL: { f: 0.45, out: 0.12, tw: -0.5, e: 1.2, w: 0.1 } };

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    spine: [0.05 + 0.02 * c, 0.06 * c, 0.02 * s], chest: [0.05, -0.08 * c, 0.03 * s], neck: [0, 0.04 * c, 0], head: [0.06, 0.06 * c, -0.02 * s],
    aR: { ...PORT.aR, f: PORT.aR.f + 0.05 * s }, aL: { ...PORT.aL, f: PORT.aL.f + 0.05 * s },
    lL: { f: 0.42 * s, k: 0.08 + 0.75 * Math.max(0, c), out: 0.06 }, lR: { f: -0.42 * s, k: 0.08 + 0.75 * Math.max(0, -c), out: 0.06 },
    root: [0.015 * s, 0.012 * Math.cos(2 * p), 0], sway: s,
  });
}

const idle = make({ ...PORT, lL: { f: 0.05, k: 0.06, out: 0.07 }, lR: { f: -0.05, k: 0.08, out: 0.07 } });

/** The gun up at the player, chest high: it fires, and comes down again. */
const AIM = { aR: { f: 0.95, out: 0.15, tw: 0.45, e: 0.85, w: 0.0 }, aL: { f: 0.95, out: 0.12, tw: -0.45, e: 0.9, w: 0.1 } };
const atk: RigPose[] = [
  make({ ...AIM, aR: { ...AIM.aR, f: 0.6, e: 1.1 }, aL: { ...AIM.aL, f: 0.7, e: 1.05 }, spine: [0.02, 0.1, 0], chest: [0.02, 0.12, 0], head: [0.1, -0.1, 0], lL: { f: 0.2, k: 0.25 }, lR: { f: -0.2, k: 0.15 } }),
  make({ ...AIM, spine: [-0.06, 0.12, 0], chest: [-0.08, 0.14, 0], head: [0.12, -0.12, 0], flash: 1, lL: { f: 0.22, k: 0.3 }, lR: { f: -0.22, k: 0.15 }, root: [0, 0, 0.04] }),
  make({ ...AIM, aR: { ...AIM.aR, f: 0.75, e: 1.0 }, aL: { ...AIM.aL, f: 0.85, e: 0.95 }, spine: [-0.02, 0.1, 0], chest: [-0.03, 0.1, 0], head: [0.08, -0.08, 0], flash: 0.35, lL: { f: 0.2, k: 0.25 }, lR: { f: -0.2, k: 0.15 }, root: [0, 0, 0.02] }),
];

const pain: RigPose[] = [
  make({ spine: [-0.14, 0.12, 0.05], chest: [-0.22, 0.16, 0.06], neck: [-0.1, 0, 0], head: [-0.3, 0.12, 0], aR: { f: 0.1, out: 0.7, e: 0.6 }, aL: { f: -0.2, out: 0.8, e: 0.4, w: 0 },
    lL: { f: -0.12, k: 0.2 }, lR: { f: 0.1, k: 0.2 }, root: [0, 0, 0.05], sway: -0.6 }),
  make({ spine: [0.38, -0.1, 0], chest: [0.32, -0.1, 0], neck: [-0.15, 0, 0], head: [0.05, 0, 0], aR: { f: 0.6, out: 0.1, e: 1.3 }, aL: { f: 0.9, out: -0.05, e: 1.3, w: 0.2 },
    lL: { f: 0.2, k: 0.5 }, lR: { f: -0.08, k: 0.4 }, sway: 0.4 }),
];

const fall = { y: 1.02, x: 1, xs: (k: number) => ({ sway: [-0.5, -0.2, 0.3, 0.4, 0.2][k], flash: 0 }) };

function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.05 + 0.03 * s, -0.7 + 0.015 * Math.cos(2 * p), 0],
    spine: [0.5, 0.12 * c, 0.05 * s], chest: [0.3, -0.16 * c, 0.06 * s], neck: [-0.35, 0.1 * c, 0], head: [-0.25, 0.1 * c, 0],
    aL: { f: 0.6 + 0.4 * s, out: 0.38, e: 0.8 - 0.3 * s, w: 0.4 }, aR: { f: 0.6 - 0.4 * s, out: 0.3, e: 0.8 + 0.3 * s, w: 0.2 },
  });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0.05, -0.66, 0.05], spine: [0.25, 0, 0], chest: [0.05, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 0.9, out: 0.4, e: 0.6 }, aR: { f: 1.2, out: 0.1, e: 0.4 } }),
  make({ ground: false, root: [0.05, -0.66, 0.08], spine: [0.2, 0, 0], chest: [0.0, 0.1, 0], neck: [-0.2, 0, 0], head: [-0.2, 0, 0], aL: { f: 0.9, out: 0.4, e: 0.6 }, aR: { f: 1.35, out: 0.1, e: 0.2 }, flash: 1 }),
  make({ ground: false, root: [0.05, -0.7, 0.03], spine: [0.4, 0, 0], chest: [0.2, 0, 0], neck: [-0.3, 0, 0], head: [-0.25, 0, 0], aL: { f: 0.8, out: 0.4, e: 0.6 }, aR: { f: 1.0, out: 0.2, e: 0.6 }, flash: 0.3 }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.06, -0.66, 0.05], spine: [0.2, 0.1, 0], chest: [-0.1, 0.2, 0], neck: [-0.1, 0, 0], head: [-0.5, 0.15, 0], aL: { f: 0.2, out: 0.9, e: 0.3, w: 0 }, aR: { f: 0.4, out: 0.8, e: 0.4, w: 0 } }),
  make({ ground: false, root: [0, -0.74, 0], spine: [0.9, -0.1, 0], chest: [0.5, 0, 0], neck: [-0.3, 0, 0], head: [0.0, 0, 0], aL: { f: 0.9, out: 0.1, e: 1.3 }, aR: { f: 0.9, out: 0.1, e: 1.3 } }),
];

export const CULTIST_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

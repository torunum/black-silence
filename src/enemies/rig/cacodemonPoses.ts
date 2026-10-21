import type { RigPose, RigPoses } from "./kit";
import { dims, makeStd, type Std } from "./humanoid";
import { crawlDieSeq, dieSeq } from "./humanFall";

/**
 * THE CACODEMON'S POSES. It floats: the "walk" is six frames of it drifting — the ball bobbing, the tentacles under it writhing in
 * turn, the eye rolling (`look`), the mouth working (`gape`); the attack opens the mouth on the green (`spit`); pain screws the eye
 * shut (`squint`); the death is the ball dropping and rolling over; the crawl is the ball low, its tentacles gone.
 */

type CStd = Omit<Std, "x"> & { gape?: number; look?: number; squint?: number; spit?: number };
export const CACO_BODY = dims({
  pelvisY: 0.55, spineY: 0.05, chestY: 0.25, neckY: 0.56, neckZ: 0, headY: 0.02, headZ: 0, jawY: 0.0, jawZ: 0,
  shoulderX: 0.46, shoulderY: -0.3, upperArm: 0.18, foreArm: 0.16, hipX: 0.15, hipDrop: 0.24, thigh: 0.26, shin: 0.24, ankleY: 0.03,
  rest: { spine: [0, 0, 0], chest: [0, 0, 0], neck: [0, 0, 0], head: [0, 0, 0], jaw: 0, arm: { f: 0.3, out: 0.6, e: 0.7, w: 0.3 }, leg: { f: 0.1, k: 0.3, out: 0.25 } },
});
const std = makeStd(CACO_BODY);
const make = (s: CStd): RigPose => std({ ...s, x: { gape: s.gape ?? 0.1, look: s.look ?? 0, squint: s.squint ?? 0, spit: s.spit ?? 0 } });
const TAU = Math.PI * 2;

function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    chest: [0.05 * s, 0.08 * c, 0.04 * s],
    aL: { f: 0.3 + 0.25 * s, out: 0.6, e: 0.7 + 0.3 * c, w: 0.3 }, aR: { f: 0.3 - 0.25 * s, out: 0.6, e: 0.7 - 0.3 * c, w: 0.3 },
    lL: { f: 0.1 + 0.35 * s, k: 0.3 + 0.4 * Math.max(0, c), out: 0.25 + 0.1 * c }, lR: { f: 0.1 - 0.35 * s, k: 0.3 + 0.4 * Math.max(0, -c), out: 0.25 - 0.1 * c },
    root: [0.02 * s, 0.05 * Math.sin(p + 1), 0], gape: 0.1 + 0.12 * Math.max(0, Math.sin(2 * p)), look: Math.sin(p * 0.5 + 0.6),
  });
}

const idle = make({ gape: 0.12 });

const atk: RigPose[] = [
  make({ chest: [-0.12, 0, 0], gape: 0.55, spit: 0.3, squint: 0.3, aL: { f: 0.8, out: 0.6, e: 0.6 }, aR: { f: 0.8, out: 0.6, e: 0.6 }, root: [0, 0.03, 0.05] }),
  make({ chest: [0.15, 0, 0], gape: 1, spit: 1, squint: 0.1, aL: { f: 0.2, out: 0.8, e: 0.3 }, aR: { f: 0.2, out: 0.8, e: 0.3 }, lL: { f: -0.3, k: 0.2, out: 0.4 }, lR: { f: -0.3, k: 0.2, out: 0.4 }, root: [0, 0, -0.06] }),
  make({ chest: [0.05, 0, 0], gape: 0.4, spit: 0.25, aL: { f: 0.5, out: 0.45, e: 0.8 }, aR: { f: 0.5, out: 0.45, e: 0.8 }, root: [0, 0, -0.02] }),
];

const pain: RigPose[] = [
  make({ chest: [-0.2, 0.2, 0.15], gape: 0.7, squint: 1, aL: { f: -0.2, out: 0.9, e: 0.3 }, aR: { f: 0.0, out: 0.9, e: 0.3 }, lL: { f: 0.6, k: 0.8, out: 0.5 }, lR: { f: 0.5, k: 0.7, out: 0.5 }, root: [0.03, 0.04, 0.05] }),
  make({ chest: [0.15, -0.15, -0.1], gape: 0.3, squint: 0.7, aL: { f: 0.9, out: 0.2, e: 1.3 }, aR: { f: 0.9, out: 0.2, e: 1.3 }, lL: { f: -0.2, k: 0.6, out: 0.15 }, lR: { f: -0.2, k: 0.6, out: 0.15 } }),
];

const fall = { y: 0.6, x: 0.8, xs: (k: number) => ({ gape: [0.9, 0.8, 0.6, 0.5, 0.45][k], squint: [0.6, 0.8, 0.9, 1, 1][k], look: 0, spit: 0 }) };

/** Its tentacles torn away: the ball hangs low, a stump of meat under it. */
function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({ ground: false, root: [0.02 * s, -0.29 + 0.03 * c, 0], chest: [0.06 * s, 0.08 * c, 0.05 * s], aL: { f: 0.3 + 0.3 * s, out: 0.5, e: 0.9 }, aR: { f: 0.3 - 0.3 * s, out: 0.5, e: 0.9 }, gape: 0.2 + 0.1 * c, look: s });
}
const crawlAtk: RigPose[] = [
  make({ ground: false, root: [0, -0.28, 0.05], chest: [-0.12, 0, 0], gape: 0.55, spit: 0.3, squint: 0.3, aL: { f: 0.8, out: 0.6, e: 0.6 }, aR: { f: 0.8, out: 0.6, e: 0.6 } }),
  make({ ground: false, root: [0, -0.3, -0.06], chest: [0.15, 0, 0], gape: 1, spit: 1, aL: { f: 0.2, out: 0.8, e: 0.3 }, aR: { f: 0.2, out: 0.8, e: 0.3 } }),
  make({ ground: false, root: [0, -0.29, -0.02], chest: [0.05, 0, 0], gape: 0.4, spit: 0.25, aL: { f: 0.5, out: 0.45, e: 0.8 }, aR: { f: 0.5, out: 0.45, e: 0.8 } }),
];
const crawlPain: RigPose[] = [
  make({ ground: false, root: [0.03, -0.28, 0.05], chest: [-0.2, 0.2, 0.15], gape: 0.7, squint: 1, aL: { f: -0.2, out: 0.9, e: 0.3 }, aR: { f: 0.0, out: 0.9, e: 0.3 } }),
  make({ ground: false, root: [0, -0.3, 0], chest: [0.15, -0.15, -0.1], gape: 0.3, squint: 0.7, aL: { f: 0.9, out: 0.2, e: 1.3 }, aR: { f: 0.9, out: 0.2, e: 1.3 } }),
];

export const CACO_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die: dieSeq(std, fall),
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie: crawlDieSeq(std, fall),
};

import type { Joint, RigPose, RigPoses, Rot } from "./kit";
import { pose } from "./kit";
import type { V3 } from "../../render/viewmodel/builder";
import { dims } from "./humanoid";
import { grounded } from "./ground";

/**
 * THE HOUND'S SKELETON AND POSES: a flayed quadruped that runs, leaps, and when
 * its hind legs are gone hauls itself along on its forelegs.
 *
 * The body runs along z: the muzzle at -z (toward the player), the tail at +z,
 * and the rig is seen from its front quarter (`frame.yaw` about 1.15 rad) so
 * that the long body lies across the sprite and the head comes at you.
 * A foreleg hangs from the chest the way a human arm hangs (`shoulder`,
 * `elbow`, `wrist` — they are the monster's `lArm`/`rArm`: the screen's two
 * sides), a hind leg the way a human leg does (`hip`, `knee`, `ankle` — `legs`).
 * A positive pitch on the spine, chest and neck leans the front toward the
 * viewer (down, for a dog); a positive `f` swings a leg forward and `k` bends
 * it (the elbow or the hock) back. Poses are written with `root` 0 and grounded
 * by forward kinematics (`ground.ts`): the lowest paw touches the floor.
 *
 * Gaits: a trot-gallop of six (the diagonal pairs swing together while the spine
 * arches and flattens), a standing pant, a leap (crouch, airborne with the jaw
 * unhinged, landing), a yelp and a cower, a collapse onto its side, and the
 * drag of a hound with no hind legs.
 */

/** Proportions only `armParts`/`legParts` read: the foreleg and hind leg segments. */
export const HOUND_BODY = dims({ upperArm: 0.26, foreArm: 0.26, thigh: 0.26, shin: 0.26, hipX: 0.12 });

const J = (name: string, parent: string | null, x: number, y: number, z: number): Joint => ({ name, parent, at: [x, y, z] });
export const HOUND_JOINTS: Joint[] = [
  J("pelvis", null, 0, 0.58, 0.32), J("spine", "pelvis", 0, 0.0, -0.3), J("chest", "spine", 0, 0.04, -0.28),
  J("neck", "chest", 0, 0.08, -0.2), J("head", "neck", 0, 0.28, 0), J("jaw", "head", 0, -0.02, -0.04),
  J("tail1", "pelvis", 0, 0.12, 0.16), J("tail2", "tail1", 0, 0, 0.2),
  J("shoulderL", "chest", -0.13, -0.12, -0.05), J("elbowL", "shoulderL", 0, -0.26, 0), J("wristL", "elbowL", 0, -0.26, 0),
  J("shoulderR", "chest", 0.13, -0.12, -0.05), J("elbowR", "shoulderR", 0, -0.26, 0), J("wristR", "elbowR", 0, -0.26, 0),
  J("hipL", "pelvis", -0.12, -0.08, 0), J("kneeL", "hipL", 0, -0.26, 0), J("ankleL", "kneeL", 0, -0.26, 0),
  J("hipR", "pelvis", 0.12, -0.08, 0), J("kneeR", "hipR", 0, -0.26, 0), J("ankleR", "kneeR", 0, -0.26, 0),
];

interface Leg { f: number; k?: number; out?: number }
export interface HStd {
  root?: V3; pelvis?: Rot; spine?: Rot; chest?: Rot; neck?: Rot; head?: Rot; jaw?: number; tail?: [number, number, number, number];
  fL?: Leg; fR?: Leg; hL?: Leg; hR?: Leg;
  /** Lower the root until the lowest paw is on the floor (default), or leave it as given. */
  ground?: boolean; floor?: number;
  /** Which paws count (a hound with no hind legs stands on its forelegs). */
  paws?: readonly string[];
  /** The hound's scalars: `drool`. */
  x?: Record<string, number>;
}

const FEET = ["wristL", "wristR", "ankleL", "ankleR"];
const PAW = 0.05;
const FORE = ["wristL", "wristR"];

/** A `HStd` as a pose. */
export function make(s: HStd): RigPose {
  const rot: Record<string, Rot> = {};
  rot.pelvis = s.pelvis ?? [0, 0, 0]; rot.spine = s.spine ?? [0, 0, 0]; rot.chest = s.chest ?? [0, 0, 0];
  rot.neck = s.neck ?? [0.85, 0, 0]; rot.head = s.head ?? [-0.5, 0, 0]; rot.jaw = [s.jaw ?? 0.2, 0, 0];
  const t = s.tail ?? [0.2, 0, 0.1, 0];
  rot.tail1 = [t[0], t[1], 0]; rot.tail2 = [t[2], t[3], 0];
  const leg = (j: string, side: 1 | -1, l: Leg | undefined, d: Leg, hip: boolean): void => {
    const q = l ?? d, k = q.k ?? d.k ?? 0.3, o = (q.out ?? d.out ?? 0.04) * side;
    const [a, b, c] = hip ? ["hip", "knee", "ankle"] : ["shoulder", "elbow", "wrist"];
    rot[a + j] = [-q.f, 0, o]; rot[b + j] = [k, 0, 0]; rot[c + j] = [q.f - k, 0, 0];
  };
  leg("L", 1, s.fL, { f: 0.1, k: 0.3 }, false); leg("R", -1, s.fR, { f: 0.1, k: 0.3 }, false);
  leg("L", 1, s.hL, { f: 0.45, k: 0.85 }, true); leg("R", -1, s.hR, { f: 0.45, k: 0.85 }, true);
  const p = pose(s.root ?? [0, 0, 0], rot, { jaw: 0, drool: 0, ...s.x }, s.floor);
  return s.ground === false ? p : grounded(HOUND_JOINTS, p, s.paws ?? FEET, PAW);
}

const TAU = Math.PI * 2;

/** One stride of the trot-gallop, `i` of 6: diagonal pairs swing together, the spine arches as the legs gather and flattens as they reach. */
function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p), g = Math.cos(2 * p);
  return make({
    pelvis: [0.12 * g, 0, 0.04 * s], spine: [-0.1 * g, 0.06 * c, 0], chest: [0.1 * g, -0.06 * c, 0.03 * s], neck: [0.8 + 0.1 * g, 0.05 * c, 0], head: [-0.5 - 0.1 * g, 0.06 * c, 0], jaw: 0.4 + 0.2 * Math.max(0, Math.sin(p + 1)),
    tail: [0.1 + 0.15 * g, 0.3 * s, 0.1, 0.5 * c],
    fL: { f: 0.8 * s + 0.1, k: 0.3 + 0.6 * Math.max(0, c) }, fR: { f: -0.8 * s + 0.1, k: 0.3 + 0.6 * Math.max(0, -c) },
    hL: { f: -0.7 * s + 0.4, k: 0.85 + 0.5 * Math.max(0, -c) }, hR: { f: 0.7 * s + 0.4, k: 0.85 + 0.5 * Math.max(0, c) },
    root: [0.01 * s, 0.05 * Math.max(0, g), 0], x: { drool: Math.sin(p + 0.5) },
  });
}

const idle = make({ pelvis: [0.02, 0, 0], neck: [0.75, 0, 0], head: [-0.35, 0.05, 0], jaw: 0.45, tail: [0.15, 0.15, 0.2, 0.2], fL: { f: 0.12, k: 0.3 }, fR: { f: -0.05, k: 0.25 }, hL: { f: 0.42, k: 0.8 }, hR: { f: 0.38, k: 0.75 }, x: { drool: 0.3 } });

/** The leap: it sinks onto its haunches, springs with the jaw unhinged and the body stretched out, lands with its forelegs braced. */
const atk: RigPose[] = [
  make({ pelvis: [-0.15, 0, 0], spine: [0.1, 0, 0], chest: [0.28, 0, 0], neck: [0.5, 0, 0], head: [-0.65, 0, 0], jaw: 0.55, tail: [-0.2, 0, 0.2, 0],
    fL: { f: 0.55, k: 0.6 }, fR: { f: 0.45, k: 0.55 }, hL: { f: 0.85, k: 1.4 }, hR: { f: 0.8, k: 1.35 }, root: [0, 0, 0.1], x: { drool: 0.8 } }),
  make({ pelvis: [0.08, 0, 0], spine: [-0.05, 0, 0], chest: [-0.12, 0, 0], neck: [0.5, 0, 0], head: [-0.45, 0, 0], jaw: 1.3, tail: [-0.3, 0, -0.1, 0],
    fL: { f: 1.15, k: 0.2 }, fR: { f: 1.0, k: 0.25 }, hL: { f: -0.7, k: 0.2 }, hR: { f: -0.85, k: 0.3 }, ground: false, root: [0, 0.28, -0.22], x: { drool: -0.6 } }),
  make({ pelvis: [-0.06, 0, 0], spine: [0.05, 0, 0], chest: [0.18, 0, 0], neck: [0.7, 0, 0], head: [-0.5, 0, 0], jaw: 0.65, tail: [0.2, 0, 0.1, 0],
    fL: { f: 0.65, k: 0.35 }, fR: { f: 0.55, k: 0.3 }, hL: { f: 0.6, k: 0.9 }, hR: { f: 0.5, k: 0.85 }, root: [0, 0, -0.1], x: { drool: 0.2 } }),
];

/** Pain: a yelp (head up, a foreleg lifted, the jaw wide), then a cower (head low, tail tucked). */
const pain: RigPose[] = [
  make({ pelvis: [-0.08, 0, 0.05], chest: [-0.15, 0.1, 0.05], neck: [0.25, 0.1, 0], head: [-0.2, 0.15, 0], jaw: 1.1, tail: [0.6, 0, 0.5, 0],
    fL: { f: 1.0, k: 1.0 }, fR: { f: 0.05, k: 0.3 }, hL: { f: 0.3, k: 0.7 }, hR: { f: 0.5, k: 0.9 }, root: [0, 0, 0.06], x: { drool: -0.5 } }),
  make({ pelvis: [0.12, 0, 0], chest: [0.3, -0.1, 0], neck: [0.9, -0.1, 0], head: [-0.9, 0, 0], jaw: 0.6, tail: [1.0, 0, 0.6, 0],
    fL: { f: 0.45, k: 0.7 }, fR: { f: 0.4, k: 0.7 }, hL: { f: 0.7, k: 1.2 }, hR: { f: 0.65, k: 1.15 }, x: { drool: 0.5 } }),
];

/** Death: it staggers, folds, tips and lies on its side with its legs stiff. Each frame is drawn on the floor the sinking sprite is at. */
const die: RigPose[] = [
  make({ pelvis: [-0.1, 0, 0.05], chest: [-0.2, 0.1, 0.1], neck: [0.3, 0, 0.1], head: [-0.2, 0.15, 0.1], jaw: 1.2, tail: [0.5, 0, 0.5, 0],
    fL: { f: 0.9, k: 0.9 }, fR: { f: 0.4, k: 0.5 }, hL: { f: 0.4, k: 0.8 }, hR: { f: 0.6, k: 1.0 }, root: [0.02, 0, 0.05], floor: 0.975 }),
  make({ pelvis: [0.05, 0, 0.3], chest: [0.1, 0.1, 0.3], neck: [0.6, 0, 0.1], head: [-0.5, 0.2, 0.2], jaw: 0.9, tail: [0.6, 0, 0.5, 0],
    fL: { f: 0.2, k: 1.2, out: 0.3 }, fR: { f: 0.5, k: 1.1, out: 0.3 }, hL: { f: 0.9, k: 1.5, out: 0.2 }, hR: { f: 1.0, k: 1.5, out: 0.2 }, ground: false, root: [-0.04, -0.18, 0], floor: 0.93 }),
  make({ pelvis: [0, 0, 0.8], spine: [0, 0, 0.25], chest: [0, 0, 0.35], neck: [0.7, 0, 0.2], head: [-0.6, 0.2, 0.3], jaw: 0.7, tail: [0.5, 0, 0.4, 0],
    fL: { f: 0.0, k: 0.8, out: 0.6 }, fR: { f: 0.6, k: 0.7, out: 0.5 }, hL: { f: 0.5, k: 1.0, out: 0.4 }, hR: { f: 0.9, k: 1.2, out: 0.5 }, ground: false, root: [-0.12, -0.28, 0], floor: 0.866 }),
  make({ pelvis: [0, 0, 1.25], spine: [0, 0, 0.2], chest: [0, 0, 0.3], neck: [0.7, 0, 0.1], head: [-0.6, 0.2, 0.4], jaw: 0.6, tail: [0.3, 0, 0.3, 0],
    fL: { f: -0.3, k: 0.4, out: 0.8 }, fR: { f: 0.3, k: 0.5, out: 0.8 }, hL: { f: 0.2, k: 0.5, out: 0.6 }, hR: { f: 0.5, k: 0.8, out: 0.7 }, ground: false, root: [-0.2, -0.33, 0], floor: 0.78 }),
  make({ pelvis: [0, 0, 1.45], spine: [0, 0, 0.1], chest: [0, 0, 0.15], neck: [0.7, 0, 0.1], head: [-0.7, 0.2, 0.4], jaw: 0.55, tail: [0.1, 0, 0.2, 0],
    fL: { f: -0.5, k: 0.3, out: 0.9 }, fR: { f: 0.1, k: 0.3, out: 0.9 }, hL: { f: 0.0, k: 0.4, out: 0.7 }, hR: { f: 0.3, k: 0.5, out: 0.8 }, ground: false, root: [-0.24, -0.35, 0], floor: 0.7 }),
];

/** With its hind legs gone it hauls itself on the forelegs, the rump dragging (the pelvis pitched down behind, the chest lifted on the forelegs); the head comes up. */
function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    paws: FORE, pelvis: [-0.3, 0.05 * c, 0.05 * s], spine: [0.1, 0.1 * c, 0], chest: [0.3, -0.1 * c, 0.03 * s], neck: [0.5, 0.06 * c, 0], head: [-0.5, 0.08 * c, 0], jaw: 0.5 + 0.3 * Math.max(0, s), tail: [-0.1, 0.2 * c, 0.2, 0],
    fL: { f: 0.9 * s + 0.3, k: 1.0 + 0.7 * Math.max(0, c) }, fR: { f: -0.9 * s + 0.3, k: 1.0 + 0.7 * Math.max(0, -c) },
    root: [0.02 * s, 0.01 * Math.cos(2 * p), 0.08], x: { drool: c },
  });
}
const crawlAtk: RigPose[] = [
  make({ paws: FORE, pelvis: [-0.6, 0, 0], chest: [0.4, 0, 0], neck: [0.3, 0, 0], head: [-0.5, 0, 0], jaw: 0.6, fL: { f: 0.7, k: 0.5 }, fR: { f: 0.6, k: 0.5 }, x: { drool: 0.8 }, root: [0, 0, 0.1] }),
  make({ paws: FORE, pelvis: [-0.35, 0, 0], chest: [0.15, 0, 0], neck: [0.5, 0, 0], head: [-0.4, 0, 0], jaw: 1.3, fL: { f: 1.4, k: 0.2 }, fR: { f: 1.3, k: 0.2 }, x: { drool: -0.6 }, root: [0, 0, -0.12] }),
  make({ paws: FORE, pelvis: [-0.5, 0, 0], chest: [0.3, 0, 0], neck: [0.6, 0, 0], head: [-0.5, 0, 0], jaw: 0.65, fL: { f: 0.8, k: 0.4 }, fR: { f: 0.7, k: 0.4 }, x: { drool: 0.2 }, root: [0, 0, -0.04] }),
];
const crawlPain: RigPose[] = [
  make({ paws: FORE, pelvis: [-0.55, 0, 0.06], chest: [0.2, 0.1, 0], neck: [0.25, 0.1, 0], head: [-0.2, 0.15, 0], jaw: 1.1, tail: [0.2, 0, 0.5, 0], fL: { f: 0.9, k: 0.9 }, fR: { f: 0.1, k: 0.3 }, x: { drool: -0.5 }, root: [0, 0, 0.06] }),
  make({ paws: FORE, pelvis: [-0.7, 0, 0], chest: [0.4, 0, 0], neck: [0.9, 0, 0], head: [-0.9, 0, 0], jaw: 0.6, tail: [0.2, 0, 0.6, 0], fL: { f: 0.3, k: 0.7 }, fR: { f: 0.3, k: 0.7 }, x: { drool: 0.5 } }),
];
const crawlDie: RigPose[] = die.map((d, k) => make({
  ground: false, floor: d.floor, root: [d.root[0], d.root[1] + (k === 0 ? -0.2 : -0.08), d.root[2]], pelvis: d.rot.pelvis, spine: d.rot.spine, chest: d.rot.chest, neck: d.rot.neck, head: d.rot.head,
  jaw: d.rot.jaw[0], tail: [d.rot.tail1[0], d.rot.tail1[1], d.rot.tail2[0], d.rot.tail2[1]],
  fL: { f: -d.rot.shoulderL[0], k: d.rot.elbowL[0], out: d.rot.shoulderL[2] }, fR: { f: -d.rot.shoulderR[0], k: d.rot.elbowR[0], out: -d.rot.shoulderR[2] },
}));

export const HOUND_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die,
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie,
};

/** The poses its severed parts are baked in. */
export const HOUND_PART_POSES = {
  head: make({ neck: [0, 0, 0], head: [0, 0, 0], jaw: 0.5, ground: false }),
  leg: make({ fL: { f: 0, k: 0.5 }, fR: { f: 0, k: 0.5 }, hL: { f: 0.2, k: 0.5 }, hR: { f: 0.2, k: 0.5 }, ground: false }),
  // the hind pair, lying on their side
  legs: make({ pelvis: [0, 0, Math.PI / 2], hL: { f: 0.1, k: 0.3 }, hR: { f: 0.1, k: 0.3 }, ground: false }),
};

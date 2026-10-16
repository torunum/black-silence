import type { Joint, RigPose, RigPoses, Rot } from "./kit";
import { pose } from "./kit";
import type { V3 } from "../../render/viewmodel/builder";
import { dims } from "./humanoid";
import { grounded } from "./ground";

/**
 * THE SLAUGHTAUR'S SKELETON AND POSES: an armoured centaur, a man's body
 * grown out of a horse's chest, with a shield that screams.
 *
 * The horse runs along z, the rump at +z and the chest at -z, toward the
 * player (seen from its front quarter). A man's spine (`spine`, `chest`,
 * `neck`, `head`) stands up out of the withers, with a man's arms
 * (`shoulderL`..`wristR`: the monster's `lArm` and `rArm`, the shield arm and
 * the mace arm, the screen's two sides) and the horse has four legs: the hind
 * pair on `pelvis` (`hipL`.. the monster's `legs`), the fore pair on the
 * `spine` (`fhipL`..), and a tail. Torn off, all four legs leave it lying on
 * its barrel with a man's torso on top, which crawls.
 *
 * Poses: a trot of six (diagonal legs together, the torso counter-rolling, the
 * shield and the mace carried), an idle, an attack of three that is the
 * shield's scream (it hauls the shield back, thrusts it out with the skull's
 * jaw wide and blue fire in it, lowers it), two of pain, five of death (it rears,
 * folds and goes over on its side), and the crawl of a barrel with a man on it.
 * Its scalars: `scream` (the skull's jaw and the fire in it), `swish` (the tail), `sh` (the shield arm's turn, which the shield undoes so that it always faces the player).
 */

const J = (name: string, parent: string | null, x: number, y: number, z: number): Joint => ({ name, parent, at: [x, y, z] });
export const CENT_BODY = dims({ upperArm: 0.32, foreArm: 0.3, thigh: 0.36, shin: 0.36, shoulderX: 0.4, shoulderY: 0.36, hipX: 0.17, hipDrop: 0.1 });
export const CENT_JOINTS: Joint[] = [
  J("pelvis", null, 0, 0.78, 0.3), J("spine", "pelvis", 0, 0.28, -0.56), J("chest", "spine", 0, 0.06, 0), J("neck", "chest", 0, 0.5, -0.02), J("head", "neck", 0, 0.08, -0.04), J("jaw", "head", 0, 0.03, -0.005),
  J("shoulderL", "chest", -0.4, 0.36, 0), J("elbowL", "shoulderL", 0, -0.32, 0), J("wristL", "elbowL", 0, -0.3, 0),
  J("shoulderR", "chest", 0.4, 0.36, 0), J("elbowR", "shoulderR", 0, -0.32, 0), J("wristR", "elbowR", 0, -0.3, 0),
  J("hipL", "pelvis", -0.17, -0.1, 0), J("kneeL", "hipL", 0, -0.36, 0), J("ankleL", "kneeL", 0, -0.36, 0),
  J("hipR", "pelvis", 0.17, -0.1, 0), J("kneeR", "hipR", 0, -0.36, 0), J("ankleR", "kneeR", 0, -0.36, 0),
  J("fhipL", "spine", -0.2, -0.3, 0.02), J("fkneeL", "fhipL", 0, -0.36, 0), J("fankleL", "fkneeL", 0, -0.36, 0),
  J("fhipR", "spine", 0.2, -0.3, 0.02), J("fkneeR", "fhipR", 0, -0.36, 0), J("fankleR", "fkneeR", 0, -0.36, 0),
  J("tail1", "pelvis", 0, 0.1, 0.28), J("tail2", "tail1", 0, 0, 0.26),
];

interface Arm { f: number; tw?: number; out?: number; e?: number; w?: number }
interface Leg { f: number; k?: number; out?: number }
export interface CStd {
  root?: V3; pelvis?: Rot; spine?: Rot; chest?: Rot; neck?: Rot; head?: Rot; jaw?: number; tail?: [number, number, number, number];
  aL?: Arm; aR?: Arm; fL?: Leg; fR?: Leg; hL?: Leg; hR?: Leg;
  /** Lower the root until the lowest hoof is on the floor (default), or leave it as given. */
  ground?: boolean; floor?: number; x?: Record<string, number>;
}

const HOOVES = ["fankleL", "fankleR", "ankleL", "ankleR"];
/** The shield arm at rest (the shield held up before it), and the mace arm (the mace carried up beside the head). */
const SHIELD: Arm = { f: 0.55, out: 0.25, e: 0.8, w: 0 };
const MACE: Arm = { f: 0.95, tw: -0.3, out: 0.35, e: 1.75, w: 0 };

/** A `CStd` as a pose. */
export function make(s: CStd): RigPose {
  const rot: Record<string, Rot> = {};
  rot.pelvis = s.pelvis ?? [0, 0, 0]; rot.spine = s.spine ?? [0.05, 0, 0]; rot.chest = s.chest ?? [0.05, 0, 0]; rot.neck = s.neck ?? [0.02, 0, 0]; rot.head = s.head ?? [0.02, 0, 0]; rot.jaw = [s.jaw ?? 0.2, 0, 0];
  const t = s.tail ?? [0.4, 0, 0.3, 0];
  rot.tail1 = [t[0], t[1], 0]; rot.tail2 = [t[2], t[3], 0];
  const arm = (side: "L" | "R", a: Arm): void => {
    const o = side === "L" ? 1 : -1;
    rot["shoulder" + side] = [-a.f, a.tw ?? 0, (a.out ?? 0.25) * o]; rot["elbow" + side] = [-(a.e ?? 0.5), 0, 0]; rot["wrist" + side] = [-(a.w ?? 0), 0, 0];
  };
  arm("L", s.aL ?? SHIELD); arm("R", s.aR ?? MACE);
  const leg = (j: string, side: 1 | -1, l: Leg | undefined, d: Leg, fore: boolean): void => {
    const q = l ?? d, k = q.k ?? d.k ?? 0.2, o = (q.out ?? 0.04) * side, p = fore ? "f" : "";
    rot[p + "hip" + j] = [-q.f, 0, o]; rot[p + "knee" + j] = [k, 0, 0]; rot[p + "ankle" + j] = [q.f - k, 0, 0];
  };
  leg("L", 1, s.fL, { f: 0.1, k: 0.15 }, true); leg("R", -1, s.fR, { f: 0.1, k: 0.15 }, true);
  leg("L", 1, s.hL, { f: 0.35, k: 0.7 }, false); leg("R", -1, s.hR, { f: 0.35, k: 0.7 }, false);
  const al = s.aL ?? SHIELD;
  const p = pose(s.root ?? [0, 0, 0], rot, { scream: 0, swish: 0, sh: al.f + (al.e ?? 0.5) + (al.w ?? 0), ...s.x }, s.floor);
  return s.ground === false ? p : grounded(CENT_JOINTS, p, HOOVES, 0.04);
}

const TAU = Math.PI * 2;
const sc = (scream: number, swish = 0): Record<string, number> => ({ scream, swish });

/** One stride of the trot, `i` of 6: the left fore and right hind swing together, then the other pair; the man rides it, counter-rolling. */
function walk(i: number): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p), g = Math.cos(2 * p);
  return make({
    pelvis: [0.04 * g, 0, 0.03 * s], spine: [0.05 - 0.04 * g, -0.06 * c, -0.03 * s], chest: [0.05, 0.1 * c, -0.03 * s], neck: [0.02, 0, 0], head: [0.02 + 0.03 * g, -0.05 * c, 0.03 * s],
    aL: { ...SHIELD, f: SHIELD.f + 0.1 * s }, aR: { ...MACE, f: MACE.f - 0.08 * s },
    fL: { f: 0.7 * s + 0.1, k: 0.2 + 0.7 * Math.max(0, c) }, fR: { f: -0.7 * s + 0.1, k: 0.2 + 0.7 * Math.max(0, -c) },
    hL: { f: -0.6 * s + 0.35, k: 0.7 + 0.5 * Math.max(0, -c) }, hR: { f: 0.6 * s + 0.35, k: 0.7 + 0.5 * Math.max(0, c) },
    tail: [0.4 + 0.2 * g, 0.4 * s, 0.3, 0.5 * c], root: [0.01 * s, 0.04 * Math.max(0, g), 0], x: sc(0, s),
  });
}

const idle = make({ jaw: 0.25, tail: [0.35, 0.2, 0.3, 0.2], fL: { f: 0.12, k: 0.18 }, fR: { f: 0.0, k: 0.15 }, hL: { f: 0.38, k: 0.7 }, hR: { f: 0.32, k: 0.66 }, x: sc(0, 0.3) });

/** The scream: the shield is hauled back with the skull's jaw closing, thrust out wide open with fire in it, lowered. The horse braces. */
const atk: RigPose[] = [
  make({ pelvis: [-0.06, 0, 0], spine: [-0.15, 0.15, 0], chest: [-0.1, 0.2, 0], head: [-0.1, 0, 0], jaw: 0.5, aL: { f: 0.5, out: 0.6, e: 1.3, w: 0.1 }, aR: { f: 1.3, tw: -0.3, out: 0.4, e: 1.8, w: 0 },
    fL: { f: 0.45, k: 0.5 }, fR: { f: 0.35, k: 0.5 }, hL: { f: 0.6, k: 1.0 }, hR: { f: 0.55, k: 0.95 }, tail: [0.7, 0, 0.4, 0], x: sc(0.3, 0), root: [0, 0, 0.06] }),
  make({ pelvis: [0.05, 0, 0], spine: [0.15, -0.1, 0], chest: [0.1, -0.15, 0], head: [0.0, 0, 0], jaw: 0.9, aL: { f: 1.45, tw: 0.15, out: 0.15, e: 0.25, w: 0 }, aR: { f: 1.15, tw: -0.3, out: 0.35, e: 1.6, w: 0 },
    fL: { f: 0.9, k: 0.3 }, fR: { f: 0.7, k: 0.3 }, hL: { f: 0.3, k: 0.8 }, hR: { f: 0.25, k: 0.75 }, tail: [0.2, 0, 0.1, 0], x: sc(1, 0), root: [0, 0, -0.14] }),
  make({ pelvis: [0.0, 0, 0], spine: [0.08, 0, 0], chest: [0.05, -0.05, 0], jaw: 0.4, aL: { f: 0.9, out: 0.2, e: 0.6, w: 0 }, aR: { f: 1.0, tw: -0.3, out: 0.35, e: 1.7, w: 0 },
    fL: { f: 0.45, k: 0.4 }, fR: { f: 0.35, k: 0.4 }, hL: { f: 0.45, k: 0.8 }, hR: { f: 0.4, k: 0.78 }, tail: [0.4, 0, 0.3, 0], x: sc(0.3, 0.2), root: [0, 0, -0.04] }),
];

/** Pain: the horse rears and the man throws back his head, the shield up; then it shies, head down behind the shield. */
const pain: RigPose[] = [
  make({ pelvis: [-0.3, 0, 0.05], spine: [-0.2, 0.1, 0.05], chest: [-0.2, 0.15, 0.05], neck: [-0.1, 0, 0], head: [-0.35, 0.1, 0], jaw: 0.8, aL: { f: 1.0, out: 0.5, e: 0.5, w: 0 }, aR: { f: 1.5, tw: -0.4, out: 0.6, e: 1.4, w: 0 },
    fL: { f: 1.1, k: 1.0 }, fR: { f: 0.8, k: 1.0 }, hL: { f: 0.2, k: 0.5 }, hR: { f: 0.35, k: 0.6 }, tail: [0.9, 0, 0.5, 0], x: sc(0.6, 0), root: [0, 0, 0.06] }),
  make({ pelvis: [0.08, 0, 0], spine: [0.35, -0.1, 0], chest: [0.3, -0.1, 0], neck: [0.15, 0, 0], head: [0.1, 0, 0], jaw: 0.3, aL: { f: 1.2, out: 0.1, e: 1.0, w: 0 }, aR: { f: 0.9, tw: -0.3, out: 0.3, e: 1.7, w: 0 },
    fL: { f: 0.5, k: 0.6 }, fR: { f: 0.45, k: 0.6 }, hL: { f: 0.55, k: 0.95 }, hR: { f: 0.5, k: 0.9 }, tail: [0.8, 0, 0.5, 0], x: sc(0, 0.5) }),
];

/** Death: it rears, folds at the knees, and goes over on its side with the man across it. Each frame is on the floor the sinking sprite is at. */
const D = (f: number, r: V3, p: Rot, extra: Partial<CStd> = {}): RigPose => make({ ground: false, floor: f, root: r, pelvis: p, ...extra });
const die: RigPose[] = [
  D(0.975, [0, 0, 0.06], [-0.35, 0, 0.05], { spine: [-0.2, 0, 0.1], chest: [-0.25, 0.1, 0.1], head: [-0.4, 0, 0], jaw: 1.0, aL: { f: 0.3, out: 0.8, e: 0.3 }, aR: { f: 1.6, tw: -0.4, out: 0.8, e: 1.0 }, fL: { f: 1.2, k: 1.1 }, fR: { f: 1.0, k: 1.1 }, hL: { f: 0.1, k: 0.5 }, hR: { f: 0.2, k: 0.6 }, x: sc(0.5) }),
  D(0.93, [0, -0.28, 0.02], [0.05, 0, 0.3], { spine: [0.1, 0, 0.2], chest: [0.1, 0, 0.2], head: [-0.2, 0.2, 0.2], jaw: 0.8, aL: { f: 0.2, out: 0.7, e: 0.4 }, aR: { f: 0.3, out: 0.8, e: 0.6 }, fL: { f: 0.6, k: 1.8 }, fR: { f: 0.5, k: 1.7 }, hL: { f: 0.9, k: 1.5 }, hR: { f: 0.8, k: 1.4 } }),
  D(0.866, [-0.1, -0.4, 0], [0, 0, 0.75], { spine: [0.1, 0, 0.3], chest: [0.1, 0, 0.3], head: [0.0, 0.2, 0.3], jaw: 0.6, aL: { f: 0.0, out: 0.8, e: 0.4 }, aR: { f: 0.4, out: 0.9, e: 0.7 }, fL: { f: 0.2, k: 1.4, out: 0.5 }, fR: { f: 0.5, k: 1.3, out: 0.5 }, hL: { f: 0.8, k: 1.4, out: 0.3 }, hR: { f: 0.9, k: 1.4, out: 0.3 } }),
  D(0.78, [-0.2, -0.5, 0], [0, 0, 1.2], { spine: [0.1, 0, 0.2], chest: [0.05, 0, 0.2], head: [0.1, 0.2, 0.3], jaw: 0.5, aL: { f: -0.1, out: 0.8, e: 0.5 }, aR: { f: 0.2, out: 0.9, e: 0.8 }, fL: { f: -0.1, k: 0.9, out: 0.7 }, fR: { f: 0.3, k: 1.0, out: 0.7 }, hL: { f: 0.5, k: 1.0, out: 0.5 }, hR: { f: 0.7, k: 1.1, out: 0.5 } }),
  D(0.7, [-0.26, -0.54, 0], [0, 0, 1.45], { spine: [0.1, 0, 0.1], chest: [0.05, 0, 0.1], head: [0.1, 0.2, 0.3], jaw: 0.4, aL: { f: -0.2, out: 0.8, e: 0.5 }, aR: { f: 0.1, out: 0.9, e: 0.8 }, fL: { f: -0.3, k: 0.6, out: 0.8 }, fR: { f: 0.1, k: 0.8, out: 0.8 }, hL: { f: 0.2, k: 0.6, out: 0.6 }, hR: { f: 0.5, k: 0.9, out: 0.6 } }),
];

/** With all four legs gone it is a barrel on the floor with a man on it, hauling himself by his arms. */
const LOW = -0.5;
function crawl(i: number): RigPose {
  const p = (i / 4) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    ground: false, root: [0.04 * s, LOW + 0.012 * Math.cos(2 * p), 0], pelvis: [0.05, 0.06 * c, 0], spine: [0.2, 0.1 * c, 0.04 * s], chest: [0.15, -0.14 * c, 0.05 * s], head: [0.02, 0.08 * c, 0], jaw: 0.3,
    aL: { f: 0.9 + 0.5 * s, out: 0.4, e: 0.7 - 0.3 * s, w: 0.2 }, aR: { f: 0.9 - 0.5 * s, out: 0.35, e: 0.7 + 0.3 * s, w: 0.2 }, tail: [0.1, 0.2 * c, 0.1, 0], x: sc(0, c),
  });
}
const crawlAtk: RigPose[] = atk.map((a) => ({ ...a, root: [a.root[0], a.root[1] + LOW, a.root[2]] as V3 }));
const crawlPain: RigPose[] = pain.map((a) => ({ ...a, root: [a.root[0], a.root[1] + LOW, a.root[2]] as V3 }));
const crawlDie: RigPose[] = die.map((a, k) => ({ ...a, root: [a.root[0], a.root[1] + LOW * [1, 0.8, 0.5, 0.2, 0][k], a.root[2]] as V3 }));

export const CENT_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map(walk), idle, atk, pain, die,
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie,
};

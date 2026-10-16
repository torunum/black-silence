import type { Joint, RigPose, RigPoses, Rot } from "./kit";
import type { V3 } from "../../render/viewmodel/builder";
import { dims, humanJoints, makeStd, type Std } from "./humanoid";

/**
 * THE STONE GARGOYLE'S SKELETON AND POSES: a winged thing of grey stone that
 * hangs in the air on the beat of its wings.
 *
 * A man's skeleton (the humanoid kit's) with a hover for a walk and two wings
 * on its back, each a wing and a wrist (`wingL`, `wtipL`: the wing folds at the
 * wrist as it beats). A wing goes with the arm on its side (the zones a hit can
 * tear off a flyer: the sprite's two sides are its arms, its bottom its legs), so
 * a torn-off arm is the claw and the wing with it. Poses: a hover of six (the
 * wings beat and fold, the body bobs against them, the legs dangle), an idle,
 * a swoop of three (wings drawn up and back, the claws thrust forward as it
 * dives, the wings sweeping round), two of pain (the stone shudders, cracks run
 * across it), five of death (the eyes go out, it drops, hits the floor, cracks
 * through and breaks into rubble) and the lower-slung hover of one with no legs.
 * Scalars: `glow` (its eyes), `crack` (how cracked it is), `rubble` (the
 * fragments lying round it).
 */

export const GARG_BODY = dims({
  pelvisY: 0.86, spineY: 0.05, chestY: 0.24, neckY: 0.3, neckZ: -0.03, headY: 0.06, headZ: -0.03, jawY: 0.0, jawZ: 0.0,
  shoulderX: 0.3, shoulderY: 0.24, upperArm: 0.28, foreArm: 0.26, hipX: 0.12, hipDrop: 0.04, thigh: 0.26, shin: 0.26, ankleY: 0.04,
  rest: { spine: [0.22, 0, 0], chest: [0.2, 0, 0], neck: [-0.1, 0, 0], head: [-0.05, 0, 0], jaw: 0.2, arm: { f: 0.6, out: 0.3, e: 0.7, w: 0.2 }, leg: { f: 0.6, k: 1.0, out: 0.1 } },
});
const J = (name: string, parent: string | null, x: number, y: number, z: number): Joint => ({ name, parent, at: [x, y, z] });
export const GARG_JOINTS: Joint[] = [
  ...humanJoints(GARG_BODY),
  J("wingL", "chest", -0.14, 0.2, 0.1), J("wtipL", "wingL", -0.396, 0.27, 0), J("wingR", "chest", 0.14, 0.2, 0.1), J("wtipR", "wingR", 0.396, 0.27, 0),
  J("tail", "pelvis", 0, -0.1, 0.1),
];
const std = makeStd(GARG_BODY);

/** A pose: the humanoid's, with the wings. `wL`/`wR`: how far each is raised (roll, 0 is level, up positive), swept forward (pitch) and the fold at the wrist (roll). */
interface GS extends Std { wL?: [number, number, number]; wR?: [number, number, number]; tail?: number }
export function make(s: GS): RigPose {
  const p = std({ ground: false, ...s, x: { glow: 1, crack: 0, rubble: 0, ...s.x } });
  const wl = s.wL ?? [0.3, 0.1, 0.3], wr = s.wR ?? [0.3, 0.1, 0.3];
  const rot: Record<string, Rot> = { ...p.rot };
  rot.wingL = [wl[1], 0, wl[0]]; rot.wtipL = [0, 0, wl[2]]; rot.wingR = [wr[1], 0, -wr[0]]; rot.wtipR = [0, 0, -wr[2]];
  rot.tail = [s.tail ?? 0.5, 0, 0];
  return { ...p, rot };
}
const HOVER = 0.0;
const x = (glow: number, crack = 0, rubble = 0): Record<string, number> => ({ glow, crack, rubble });
const TAU = Math.PI * 2;

/** One beat of the hover, `i` of 6: the wings sweep up and down and fold at the wrist, the body rises on the downbeat, the legs dangle and trail. */
function hover(i: number, drop = 0): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    root: [0, HOVER - 0.05 * s - drop, 0], spine: [0.24 + 0.04 * s, 0, 0.03 * c], chest: [0.2, 0, 0], head: [-0.05 - 0.04 * s, 0.05 * c, 0], jaw: 0.25,
    aL: { f: 0.65 + 0.1 * s, out: 0.25, e: 0.8, w: 0.2 }, aR: { f: 0.6 - 0.1 * s, out: 0.25, e: 0.8, w: 0.2 },
    lL: { f: 0.65 - 0.15 * s, k: 1.0 + 0.2 * c, out: 0.08 }, lR: { f: 0.6 + 0.15 * s, k: 1.0 - 0.2 * c, out: 0.08 },
    wL: [0.2 + 0.6 * s, 0.1, 0.35 + 0.4 * c], wR: [0.2 + 0.6 * s, 0.1, 0.35 + 0.4 * c], tail: 0.5 + 0.2 * c, x: x(1),
  });
}

const idle = make({ wL: [0.35, 0.15, 0.4], wR: [0.35, 0.15, 0.4], x: x(1) });

/** The swoop: wings drawn up and back, the claws brought up; the dive, the claws thrust at you and the wings thrown forward; the wings sweep round, the claws drop. */
const atk: RigPose[] = [
  make({ root: [0, 0.12, 0.08], spine: [-0.2, 0, 0], chest: [-0.15, 0, 0], head: [-0.25, 0, 0], jaw: 0.7, aL: { f: 1.0, out: 0.5, e: 1.0, w: 0.2 }, aR: { f: 1.0, out: 0.5, e: 1.0, w: 0.2 },
    lL: { f: 0.1, k: 0.6 }, lR: { f: 0.1, k: 0.6 }, wL: [1.3, -0.3, 0.5], wR: [1.3, -0.3, 0.5], tail: 0.9, x: x(1.2) }),
  make({ root: [0, -0.1, -0.2], spine: [0.4, 0, 0], chest: [0.3, 0, 0], head: [0.2, 0, 0], jaw: 1.0, aL: { f: 1.6, out: 0.15, e: 0.15, w: -0.1 }, aR: { f: 1.6, out: 0.15, e: 0.15, w: -0.1 },
    lL: { f: 0.6, k: 0.9 }, lR: { f: 0.6, k: 0.9 }, wL: [0.5, 0.9, 0.2], wR: [0.5, 0.9, 0.2], tail: 0.1, x: x(1.4) }),
  make({ root: [0, -0.04, -0.06], spine: [0.2, 0, 0], chest: [0.15, 0, 0], jaw: 0.4, aL: { f: 1.0, out: 0.3, e: 0.6, w: 0.1 }, aR: { f: 1.0, out: 0.3, e: 0.6, w: 0.1 },
    lL: { f: 0.35, k: 0.6 }, lR: { f: 0.3, k: 0.6 }, wL: [-0.3, 0.5, 0.4], wR: [-0.3, 0.5, 0.4], tail: 0.4, x: x(1) }),
];

/** Pain: the stone shudders, cracks run across it and its eyes flare; the wings jerk in. */
const pain: RigPose[] = [
  make({ root: [0.02, 0.03, 0.06], spine: [-0.15, 0.1, 0.06], chest: [-0.2, 0.15, 0.05], head: [-0.4, 0.1, 0], jaw: 0.9, aL: { f: 0.3, out: 0.8, e: 0.4, w: 0 }, aR: { f: 0.9, out: 0.6, e: 0.5, w: 0 },
    lL: { f: 0.0, k: 0.4 }, lR: { f: 0.4, k: 0.7 }, wL: [1.0, 0.0, 0.8], wR: [0.7, 0.0, 0.8], tail: 0.8, x: x(1.5, 0.8) }),
  make({ root: [-0.02, -0.06, 0], spine: [0.35, -0.1, 0], chest: [0.3, 0, 0], head: [0.15, 0, 0], jaw: 0.4, aL: { f: 0.9, out: 0.1, e: 1.2, w: 0.2 }, aR: { f: 0.9, out: 0.1, e: 1.2, w: 0.2 },
    lL: { f: 0.4, k: 0.8 }, lR: { f: 0.3, k: 0.8 }, wL: [0.1, 0.4, 1.0], wR: [0.1, 0.4, 1.0], tail: 0.3, x: x(0.8, 0.5) }),
];

/** Death: the eyes go out, it drops with the wings folded, hits the floor, cracks through, and the pieces lie where they broke. Each frame is on the floor the sinking sprite is at. */
const FLOORS = [0.975, 0.93, 0.866, 0.78, 0.7];
const D = (f: number, o: GS): RigPose => make({ floor: f, ...o });
const die: RigPose[] = [
  D(FLOORS[0], { root: [0, 0.02, 0.04], spine: [-0.2, 0, 0.1], chest: [-0.2, 0.1, 0.1], head: [-0.4, 0, 0], jaw: 0.9, aL: { f: 0.4, out: 0.8, e: 0.5, w: 0 }, aR: { f: 0.9, out: 0.8, e: 0.5, w: 0 }, lL: { f: 0.1, k: 0.4 }, lR: { f: 0.3, k: 0.6 }, wL: [1.1, 0.0, 0.7], wR: [0.9, 0.0, 0.7], tail: 0.8, x: x(0.3, 1) }),
  D(FLOORS[1], { root: [0, -0.45, 0.02], pelvis: [0, 0, 0.2], spine: [0.1, 0, 0.2], chest: [0.1, 0, 0.2], head: [-0.1, 0.2, 0.3], jaw: 0.7, aL: { f: 0.2, out: 0.7, e: 0.5 }, aR: { f: 0.5, out: 0.8, e: 0.7 }, lL: { f: 0.5, k: 0.9 }, lR: { f: 0.7, k: 1.0 }, wL: [0.5, 0.0, 1.0], wR: [0.3, 0.0, 1.0], tail: 0.4, x: x(0, 1) }),
  D(FLOORS[2], { root: [-0.08, -0.7, 0], pelvis: [0, 0, 0.7], spine: [0.1, 0, 0.2], chest: [0.1, 0, 0.2], head: [0.0, 0.2, 0.3], jaw: 0.5, aL: { f: 0.0, out: 0.8, e: 0.5 }, aR: { f: 0.4, out: 0.9, e: 0.8 }, lL: { f: 0.8, k: 1.2, out: 0.2 }, lR: { f: 0.9, k: 1.3, out: 0.2 }, wL: [-0.1, 0.0, 1.2], wR: [-0.3, 0.0, 1.2], tail: 0.2, x: x(0, 1, 0.4) }),
  D(FLOORS[3], { root: [-0.2, -0.78, 0], pelvis: [0, 0, 1.2], spine: [0.1, 0, 0.1], chest: [0.05, 0, 0.1], head: [0.1, 0.2, 0.3], jaw: 0.4, aL: { f: -0.1, out: 0.8, e: 0.5 }, aR: { f: 0.3, out: 0.9, e: 0.8 }, lL: { f: 0.9, k: 1.3, out: 0.3 }, lR: { f: 1.0, k: 1.4, out: 0.3 }, wL: [-0.3, 0.0, 1.3], wR: [-0.5, 0.0, 1.3], tail: 0.1, x: x(0, 1, 0.8) }),
  D(FLOORS[4], { root: [-0.28, -0.8, 0], pelvis: [0, 0, 1.45], spine: [0.1, 0, 0.1], chest: [0.05, 0, 0.1], head: [0.1, 0.2, 0.3], jaw: 0.4, aL: { f: -0.2, out: 0.8, e: 0.5 }, aR: { f: 0.2, out: 0.9, e: 0.8 }, lL: { f: 1.0, k: 1.4, out: 0.3 }, lR: { f: 1.1, k: 1.5, out: 0.3 }, wL: [-0.4, 0.0, 1.4], wR: [-0.6, 0.0, 1.4], tail: 0.0, x: x(0, 1, 1) }),
];

/** Without its legs it hangs lower and hunched, wings low. */
const LOW = 0.38;
const drop = (a: RigPose, k = 1): RigPose => ({ ...a, root: [a.root[0], a.root[1] - LOW * k, a.root[2]] as V3 });
export const GARG_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map((i) => hover(i)), idle, atk, pain, die,
  crawl: [0, 1, 2, 3].map((i) => drop(hover(i * 1.5))), crawlIdle: drop(hover(0)), crawlAtk: atk.map((a) => drop(a)), crawlPain: pain.map((a) => drop(a)), crawlDie: die.map((a, k) => drop(a, [1, 0.7, 0.4, 0.15, 0][k])),
};

/** The poses its severed parts are baked in. */
export const GARG_PART_POSES = {
  head: make({ head: [0.05, 0, 0], jaw: 0.4 }),
  arm: make({ aL: { f: 0.2, out: 0.1, e: 0.3, w: 0.1 }, aR: { f: 0.2, out: 0.1, e: 0.3, w: 0.1 }, wL: [0.15, 0.0, 0.3], wR: [0.15, 0.0, 0.3] }),
  legs: make({ pelvis: [0, 0, Math.PI / 2], lL: { f: 0, k: 0.2 }, lR: { f: 0, k: 0.2 } }),
};

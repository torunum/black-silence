import type { Joint, RigPose, RigPoses, Rot } from "./kit";
import { pose } from "./kit";
import type { V3 } from "../../render/viewmodel/builder";

/**
 * THE CACODEMON'S SKELETON AND POSES: a floating orb of meat with one huge eye.
 *
 * `core` is the orb. On it hang the eye (`eye`, which looks about), the two
 * flippers it steers with (`finL`, `finR`: its arms), the crown of horns
 * (`horns`: the "head" group the game never tears off, a flyer has no head row)
 * and, under the orb, the jaw and the tail that is its underbelly (`belly`: its
 * legs). Torn off, the underbelly leaves the orb with a raw, ragged underside; the
 * orb then drops to the floor, deflated, and drags itself there on its fins.
 *
 * Poses: a hover of six (the flippers beat, the orb bobs, the tail swings), an
 * idle, an attack of three (it swells and its eye goes red; the maw opens on a
 * ball of green plasma; it spits it and the orb snaps back), two of pain (the lid
 * clamps over the eye, the orb is squashed; it rebounds), a death of five (it jerks,
 * deflates, sags, bursts and lies as a husk) and the dragged one.
 * Scalars: `maw` (how far the jaw is open, which the parts read), `sq` (0..1 how flat the orb is), `sw` (how swollen), `lid` (the eye
 * shut), `rage` (the iris red), `charge` (plasma in the maw), `burst` (the wound
 * and the chunks), `look` (the pupil's drift, -1..1), `pup` (its size).
 */

const J = (name: string, parent: string | null, x: number, y: number, z: number): Joint => ({ name, parent, at: [x, y, z] });
export const CACO_JOINTS: Joint[] = [
  J("core", null, 0, 0.75, 0), J("eye", "core", 0, 0.12, -0.5), J("horns", "core", 0, 0.5, -0.05),
  J("finL", "core", -0.5, 0.05, 0.05), J("tipL", "finL", -0.35, 0, 0), J("finR", "core", 0.5, 0.05, 0.05), J("tipR", "finR", 0.35, 0, 0),
  J("belly", "core", 0, -0.38, -0.08), J("jaw", "belly", 0, -0.04, -0.3), J("tail", "belly", 0, -0.16, 0.12),
];

interface CS {
  root?: V3; core?: Rot; eye?: Rot; jaw?: number; belly?: Rot; tail?: number;
  /** A flipper: how far it is raised (roll), swept forward (pitch) and the tip's flick. */
  fL?: [number, number, number]; fR?: [number, number, number];
  sq?: number; sw?: number; lid?: number; rage?: number; charge?: number; burst?: number; look?: number; pup?: number; floor?: number;
}
const FIN: [number, number, number] = [-0.25, 0.1, 0.2];

export function make(s: CS): RigPose {
  const fl = s.fL ?? FIN, fr = s.fR ?? FIN;
  const rot: Record<string, Rot> = {
    core: s.core ?? [0, 0, 0], eye: s.eye ?? [0, 0, 0], jaw: [s.jaw ?? 0.15, 0, 0], belly: s.belly ?? [0, 0, 0], tail: [s.tail ?? 0.2, 0, 0],
    finL: [fl[1], 0, -fl[0]], tipL: [0, 0, -fl[2]], finR: [fr[1], 0, fr[0]], tipR: [0, 0, fr[2]], horns: [0, 0, 0],
  };
  return pose(s.root ?? [0, 0, 0], rot, { maw: s.jaw ?? 0.15, sq: s.sq ?? 0, sw: s.sw ?? 0, lid: s.lid ?? 0, rage: s.rage ?? 0, charge: s.charge ?? 0, burst: s.burst ?? 0, look: s.look ?? 0, pup: s.pup ?? 0.5 }, s.floor);
}

const TAU = Math.PI * 2;

/** One beat of the hover, `i` of 6: the flippers rise and fall, the orb bobs against them, the tail swings. */
function hover(i: number, drop = 0, sq = 0): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    root: [0.01 * s, 0.045 * s - drop, 0], core: [0.04 * c, 0.08 * s, 0.03 * c], belly: [0.1 * s, 0, 0.08 * c], tail: 0.2 + 0.3 * c, jaw: 0.18 + 0.1 * Math.sin(p * 2),
    fL: [-0.35 + 0.8 * s, 0.1, 0.2 + 0.4 * c], fR: [-0.35 - 0.8 * s, 0.1, 0.2 - 0.4 * c], look: 0.5 * Math.sin(p + 1), pup: 0.5 + 0.1 * c, sw: 0.03 * s, sq,
  });
}

const idle = make({ look: 0.2 });

/** The spit: the orb swells and its eye goes red as the maw opens on a ball of plasma, which it fires, and it snaps back. */
const atk: RigPose[] = [
  make({ root: [0, 0.04, 0.06], core: [-0.12, 0, 0], jaw: 0.65, sw: 0.1, rage: 1, pup: 0.9, fL: [0.4, 0.2, 0.1], fR: [0.4, 0.2, 0.1], tail: 0.5, charge: 0.3 }),
  make({ root: [0, -0.02, -0.12], core: [0.1, 0, 0], jaw: 1.25, sw: 0.16, rage: 1, pup: 1, fL: [0.9, 0.5, 0.3], fR: [0.9, 0.5, 0.3], tail: -0.1, charge: 1 }),
  make({ root: [0, -0.04, 0.04], core: [0.06, 0, 0], jaw: 0.35, sw: -0.04, rage: 0.4, pup: 0.35, fL: [-0.1, 0.1, 0.0], fR: [-0.1, 0.1, 0.0], tail: 0.1, charge: 0.1 }),
];

/** Pain: the lid clamps over the eye and the orb is squashed by the blow; then it bulges back. */
const pain: RigPose[] = [
  make({ root: [0.02, -0.05, 0.05], core: [-0.2, 0.2, 0.12], jaw: 0.9, sq: 0.2, sw: -0.04, lid: 1, pup: 0.2, fL: [0.9, 0.3, 0.5], fR: [0.6, 0.3, 0.5], tail: 0.6 }),
  make({ root: [-0.01, 0.02, 0], core: [0.1, -0.1, -0.1], jaw: 0.5, sq: -0.02, sw: 0.1, lid: 0.45, pup: 0.7, fL: [-0.6, 0.2, 0.1], fR: [-0.5, 0.2, 0.1], tail: 0.1 }),
];

/**
 * Death: it jerks and swells, deflates, sags, bursts and lies as a husk. The floor of each frame is where the sinking sprite is, and each
 * orb rests on it: `drop` brings the root to the floor line as the orb flattens.
 */
const FLOORS = [0.975, 0.93, 0.866, 0.78, 0.7];
const rest = (sq: number): number => -(0.75 - (0.04 + 0.58 * (1 - sq)));   // the root that sets an orb of flatness `sq` on the floor
const die: RigPose[] = [
  make({ root: [0, 0.02, 0.04], core: [-0.2, 0, 0.1], eye: [0, 0, 0], jaw: 1.1, sw: 0.18, rage: 0.5, pup: 1, fL: [0.9, 0.3, 0.5], fR: [0.9, 0.3, 0.5], tail: 0.7, floor: FLOORS[0] }),
  make({ root: [0, rest(0.28) * 0.7, 0], core: [0.1, 0, 0.2], eye: [-0.5, 0, 0], jaw: 0.8, sq: 0.28, sw: -0.05, look: 0.5, pup: 0.15, lid: 0.35, fL: [0.0, 0.1, 0.5], fR: [0.1, 0.1, 0.5], tail: 0.2, floor: FLOORS[1] }),
  make({ root: [-0.02, rest(0.5) * 0.9, 0], core: [0.15, 0, 0.3], eye: [-0.8, 0, 0], jaw: 0.6, sq: 0.5, sw: 0.0, look: 0.9, pup: 0.1, lid: 0.6, burst: 0.25, fL: [-0.5, 0.0, 0.6], fR: [-0.4, 0.0, 0.6], tail: -0.1, floor: FLOORS[2] }),
  make({ root: [-0.02, rest(0.62), 0], core: [0.1, 0, 0.15], eye: [-0.9, 0, 0.1], jaw: 0.5, sq: 0.62, sw: 0.1, lid: 0.7, burst: 0.7, fL: [-0.8, -0.1, 0.7], fR: [-0.7, -0.1, 0.7], tail: -0.3, floor: FLOORS[3] }),
  make({ root: [0, rest(0.7), 0], core: [0.05, 0, 0.05], eye: [-1.0, 0.2, 0], jaw: 0.4, sq: 0.7, sw: 0.14, lid: 0.8, burst: 1, fL: [-0.9, -0.2, 0.8], fR: [-0.8, -0.2, 0.8], tail: -0.4, floor: FLOORS[4] }),
];

/** Without its underbelly it is down on the floor, deflated, dragging itself on its fins (the frame is a third shorter). */
const SQ = 0.32, DROP = rest(SQ);
const crawl = (i: number): RigPose => ({ ...hover(i * 1.5, 0, SQ), root: [0.01 * Math.sin(i), DROP + 0.035 * Math.sin((i / 4) * TAU), 0] as V3 });
const dropped = (a: RigPose, k = 1): RigPose => ({ ...a, root: [a.root[0], a.root[1] + DROP * k, a.root[2]] as V3, x: { ...a.x, sq: Math.max(a.x?.sq ?? 0, SQ) } });
const crawlDie: RigPose[] = die.map((a, k) => (k < 2 ? dropped(a, 0.6) : a));

export const CACO_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map((i) => hover(i)), idle, atk, pain, die,
  crawl: [0, 1, 2, 3].map(crawl), crawlIdle: crawl(0), crawlAtk: atk.map((a) => dropped(a)), crawlPain: pain.map((a) => dropped(a)), crawlDie,
};

/** The poses its severed parts are baked in. */
export const CACO_PART_POSES = {
  horns: make({}),
  fin: make({ fL: [-0.1, 0.1, 0.2], fR: [-0.1, 0.1, 0.2] }),
  belly: make({ jaw: 0.5, tail: 0.3 }),
};

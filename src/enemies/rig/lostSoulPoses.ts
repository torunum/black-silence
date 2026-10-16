import type { Joint, RigPose, RigPoses, Rot } from "./kit";
import { pose } from "./kit";
import type { V3 } from "../../render/viewmodel/builder";

/**
 * THE LOST SOUL'S SKELETON AND POSES: a burning skull that hangs in the air.
 *
 * The skull (`core`) carries a jaw on its hinge, two plumes of fire streaming
 * from the temples (`plumeL`, `plumeR`, each with a flickering tip), a crown
 * of flame on top and a tail of fire behind. Its groups, for the three zones
 * the game's hit test cuts a sprite into (`Hitscan`: a flyer's art has no head
 * row, so the top of it is never a head hit): the plumes to either side are
 * its arms, and the jaw, hanging under the skull, its legs; the crown of flame is its "head" group, which the game
 * never tears off (`regions.head` 0). Torn off, the jaw leaves a skull with a raw splintered hinge and a
 * dark where it was.
 *
 * Poses: a hover of six (the plumes beat, the skull bobs and rolls), an idle,
 * a bite of three (it draws back with the jaw wide, lunges with the fire
 * streaming behind it, snaps shut), two of pain (the skull jerks back, the fire
 * flares), a death of five (the skull cracks, comes apart, the halves fall and
 * the fire gutters out on the floor) and the hover of a jawless skull, sunk
 * lower. Its scalars: `fl` (how long the fire burns), `split` (how far the
 * cracked skull has come apart), `shard` (the fragments scattered on the floor).
 */

const J = (name: string, parent: string | null, x: number, y: number, z: number): Joint => ({ name, parent, at: [x, y, z] });
export const LOST_JOINTS: Joint[] = [
  J("core", null, 0, 0.38, 0), J("jaw", "core", 0, -0.1, -0.07),
  J("plumeL", "core", -0.16, 0.08, -0.04), J("tipL", "plumeL", 0, 0.2, 0), J("plumeR", "core", 0.16, 0.08, -0.04), J("tipR", "plumeR", 0, 0.2, 0),
  J("crown", "core", 0, 0.17, 0.0), J("trail", "core", 0, -0.02, 0.14),
];

interface LS {
  root?: V3; core?: Rot; jaw?: number;
  /** A plume: how far it is flung out (roll, 0 straight up), swept back (pitch, positive back) and the tip's flick. */
  pL?: [number, number, number]; pR?: [number, number, number];
  crown?: number; trail?: number;
  fl?: number; split?: number; shard?: number; floor?: number;
}
const REST_PLUME: [number, number, number] = [1.35, 0.0, 0.3];

export function make(s: LS): RigPose {
  const pl = s.pL ?? REST_PLUME, pr = s.pR ?? REST_PLUME;
  const rot: Record<string, Rot> = {
    core: s.core ?? [0, 0, 0], jaw: [s.jaw ?? 0.25, 0, 0],
    plumeL: [pl[1], 0, pl[0] * 1], tipL: [0.2, 0, pl[2]], plumeR: [pr[1], 0, -pr[0]], tipR: [0.2, 0, -pr[2]],
    crown: [s.crown ?? 0, 0, 0], trail: [s.trail ?? 0, 0, 0],
  };
  return pose(s.root ?? [0, 0, 0], rot, { fl: s.fl ?? 1, split: s.split ?? 0, shard: s.shard ?? 0 }, s.floor);
}

const TAU = Math.PI * 2;

/** One beat of the hover, `i` of 6: the plumes rise and fall, the skull bobs against them and rolls a little. */
function hover(i: number, low = 0): RigPose {
  const p = (i / 6) * TAU, s = Math.sin(p), c = Math.cos(p);
  return make({
    root: [0.01 * s, 0.035 * s - low, 0], core: [0.06 * c, 0.1 * s, 0.05 * c], jaw: 0.3 + 0.12 * Math.sin(p * 2),
    pL: [1.3 + 0.5 * s, 0.1 + 0.2 * c, 0.3 + 0.5 * c], pR: [1.3 - 0.5 * s, 0.1 - 0.2 * c, 0.3 - 0.5 * c], crown: 0.1 * c, trail: 0.2 * s,
    fl: 1 + 0.25 * Math.sin(p * 2 + 1),
  });
}

const idle = make({ jaw: 0.35, fl: 0.95 });

/** The bite: draws back with the jaw wide, lunges with the fire streaming behind it, snaps shut. */
const atk: RigPose[] = [
  make({ root: [0, 0.02, 0.1], core: [-0.35, 0, 0], jaw: 1.05, pL: [1.5, 0.2, 0.2], pR: [1.5, 0.2, 0.2], crown: -0.3, trail: -0.2, fl: 1.2 }),
  make({ root: [0, -0.02, -0.18], core: [0.3, 0, 0], jaw: 1.2, pL: [0.5, 1.5, 0.6], pR: [0.5, 1.5, 0.6], crown: 0.9, trail: 0.7, fl: 1.5 }),
  make({ root: [0, -0.06, -0.06], core: [0.15, 0, 0], jaw: 0.05, pL: [0.8, 1.0, 0.4], pR: [0.8, 1.0, 0.4], crown: 0.5, trail: 0.4, fl: 1.1 }),
];

/** Pain: the skull is flung back and the fire flares; then it rolls over the blow with the jaw hanging. */
const pain: RigPose[] = [
  make({ root: [0.02, 0.04, 0.08], core: [-0.45, 0.2, 0.2], jaw: 1.0, pL: [1.7, 0.1, 0.8], pR: [1.4, 0.3, 0.1], crown: -0.4, fl: 1.55 }),
  make({ root: [-0.02, -0.03, 0], core: [0.35, -0.15, -0.3], jaw: 0.7, pL: [0.9, 0.8, 0.2], pR: [0.7, 0.8, 0.4], crown: 0.3, trail: 0.3, fl: 0.8 }),
];

/** Death: it cracks, comes apart in the air, the halves fall and the fire gutters out among the pieces. Each frame is on the floor the sinking sprite is at. */
const FLOORS = [0.975, 0.93, 0.866, 0.78, 0.7];
const die: RigPose[] = [
  make({ root: [0, 0.03, 0.04], core: [-0.3, 0, 0.1], jaw: 1.1, pL: [1.7, 0.3, 0.5], pR: [1.6, 0.3, 0.2], crown: -0.3, fl: 1.6, split: 0.25, floor: FLOORS[0] }),
  make({ root: [0, -0.06, 0.02], core: [-0.1, 0.1, 0.25], jaw: 0.6, pL: [1.3, 0.8, 0.7], pR: [1.1, 0.9, 0.6], crown: 0.3, fl: 1.1, split: 0.7, floor: FLOORS[1] }),
  make({ root: [0, -0.2, 0], core: [0.2, 0.2, 0.5], jaw: 0.9, pL: [0.9, 1.3, 0.3], pR: [0.7, 1.3, 0.4], crown: 0.5, fl: 0.7, split: 1.3, shard: 0.3, floor: FLOORS[2] }),
  make({ root: [0, -0.3, 0], core: [0.4, 0.2, 0.9], jaw: 0.5, pL: [0.5, 1.5, 0.2], pR: [0.4, 1.5, 0.2], crown: 0.8, fl: 0.4, split: 2.0, shard: 0.7, floor: FLOORS[3] }),
  make({ root: [0, -0.35, 0], core: [0.5, 0.2, 1.2], jaw: 0.3, pL: [0.3, 1.5, 0.1], pR: [0.2, 1.5, 0.1], crown: 1.0, fl: 0.2, split: 2.3, shard: 1, floor: FLOORS[4] }),
];

/** Jawless it hovers lower, the fire short (its frame is a third lower than the skull's). */
const LOW = 0.11;
const crawl = (i: number): RigPose => ({ ...hover(i, LOW), x: { ...hover(i, LOW).x, fl: 0.55 } });
const crawlAtk: RigPose[] = atk.map((a) => ({ ...a, root: [a.root[0], a.root[1] - LOW, a.root[2]] as V3, x: { ...a.x, fl: (a.x?.fl ?? 1) * 0.55 } }));
const crawlPain: RigPose[] = pain.map((a) => ({ ...a, root: [a.root[0], a.root[1] - LOW, a.root[2]] as V3, x: { ...a.x, fl: (a.x?.fl ?? 1) * 0.55 } }));
const crawlDie: RigPose[] = die.map((a) => ({ ...a, root: [a.root[0], a.root[1] - LOW * 0.6, a.root[2]] as V3 }));

export const LOST_POSES: RigPoses = {
  walk: [0, 1, 2, 3, 4, 5].map((i) => hover(i)), idle, atk, pain, die,
  crawl: [0, 1, 2, 3].map((i) => crawl(i * 1.5)), crawlIdle: crawl(0), crawlAtk, crawlPain, crawlDie,
};

/** The poses its severed parts are baked in. */
export const LOST_PART_POSES = {
  crown: make({ core: [0, 0, 0], fl: 1 }),
  plume: make({ pL: [1.0, 0.5, 0.2], pR: [1.0, 0.5, 0.2], fl: 0.6 }),
  jaw: make({ jaw: 0.45 }),
};

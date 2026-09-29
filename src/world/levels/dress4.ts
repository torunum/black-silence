import type { DecorSpec, Grid } from "../LevelBuilder";
import { Decorator } from "../decor/place";

/**
 * LEVEL 4 — THE GRAVEYARD, dressed (levels-feel-full plan, Task 2).
 *
 * The reference's graveyard is the necropolis's floor plan with different names ("potter's
 * field", "weeping row", "pauper trench"), a few `F` shelves standing for graves, and pickups
 * — nothing a grave is made of. Here each yard has headstones and crosses standing in it,
 * open graves and mounds in the earth, iron fence along its outer wall, and the chapel yard
 * (the merged 2x2 room, x 9-23, z 7-17) has table tombs and dead trees to fight round.
 *
 * Headstones, crosses, saplings, dead trees and table tombs are masses (`masses.ts`): thin
 * boxes for the stones, so a row of them is walked between and not through, and it is
 * cover — a shot stops on a headstone, as it does on a wall. The placement rules keep every
 * one out of every path and off every pickup; fences, mounds, open graves and bones are
 * ground and wall dressing that a step walks over.
 *
 * **Task 3 (lights and stuck enemies).** Three crook lanterns (`gravelamp`) light the yard: the level had three
 * point lights to spare. And the stones no longer stand on the open floor, and the yard has two table tombs and
 * one dead tree of the four and two it had: enemies have no pathfinding, and one that walks at a player behind a
 * stone meets its face and stays there (`tests/enemies/stuckCheck.test.ts` puts the player in 24 places and
 * found them), so the free-standing ones were taken out, and the ones that still pinned.
 */

export function dressLevel4(L: { g: Grid; W: number; H: number }): DecorSpec[] {
  const d = new Decorator(L, "graveyard");

  // THE CHAPEL YARD — table tombs and dead trees round the arena
  for (const [x, z] of [[12, 10], [20, 14]]) d.place("tombfree", x, z);
  d.place("deadtree", 14, 9);
  // lanterns on crooks left for the dead: one in each half of the yard and one on the way between them
  d.place("gravelamp", 14, 11).place("gravelamp", 16, 14).place("gravelamp", 18, 11);
  // the dead trees of the outer yards
  for (const [x, z] of [[1, 5], [14, 1], [17, 1], [30, 5], [1, 10], [14, 22], [30, 22]]) d.place("deadtree", x, z);

  // the stones themselves, along every wall: what a graveyard is made of
  d.clutter({ density: .4, seed: 40, kinds: ["gravestone", "gravecross"] });
  d.clutter({ density: .42, seed: 41 });
  d.clutter({ density: .14, seed: 42, interior: true, kinds: ["opengrave", "mound", "bonesLoose"] });   // no stones on the open floor: an enemy walks into a stone's face and stays there (tests/enemies/stuckCheck.test.ts)
  // stones that enemies walking at a player got pinned against (tests/enemies/stuckCheck.test.ts), taken out
  return d.specs.filter((s) => !STUCK.has(`${s.k}@${Math.floor(s.x + .5)},${Math.floor(s.z + .5)}`));
}

const STUCK = new Set(["gravestone@25,11", "gravestone@15,19", "gravecross@19,23"]);

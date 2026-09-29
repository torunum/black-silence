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
 */

export function dressLevel4(L: { g: Grid; W: number; H: number }): DecorSpec[] {
  const d = new Decorator(L, "graveyard");

  // THE CHAPEL YARD — table tombs and dead trees round the arena
  for (const [x, z] of [[12, 10], [20, 10], [12, 14], [20, 14]]) d.place("tombfree", x, z);
  d.place("deadtree", 14, 9).place("deadtree", 16, 15);
  // the dead trees of the outer yards
  for (const [x, z] of [[1, 5], [14, 1], [17, 1], [30, 5], [1, 10], [14, 22], [30, 22]]) d.place("deadtree", x, z);

  d.clutter({ density: .36, seed: 41 });
  d.clutter({ density: .14, seed: 42, interior: true, kinds: ["gravestone", "gravecross", "opengrave", "mound", "bonesLoose", "sapling"] });
  return d.specs;
}

import type { DecorSpec, Grid } from "../LevelBuilder";
import { Decorator } from "../decor/place";

/**
 * LEVEL 3 — THE NECROPOLIS, dressed (levels-feel-full plan, Task 2).
 *
 * The reference's necropolis calls its middle "a sarcophagus colonnade" and its
 * rooms "ossuary", "embalming chamber", "charnel", and then holds four `F` shelves
 * and a few pickups: it named a place it did not build. What it names is built here.
 *
 *  - THE GREAT TOMB (x 9-23, z 7-17, the tiers and the sovereign pit): the four stepped
 *    daises the level cut into the pit's corners each carry a sarcophagus, two table tombs
 *    lie either side of the crowning pillar, and sarcophagi stand against the colonnade's
 *    walls between niches of bones. A player crossing the pit walks between the dead.
 *  - Every other room and corridor: burial niches (skulls in the walls), urns in the corners,
 *    stacks of long bones, heaps of skulls and the odd sarcophagus, from the necropolis vocabulary.
 *
 * The solid pieces (sarcophagi, table tombs) are masses (`masses.ts`): they block the player,
 * the enemies and the shots, and the placement rules keep every one out of every corridor,
 * bend, junction and doorway and off every pickup. No trace fixture records this level.
 */

export function dressLevel3(L: { g: Grid; W: number; H: number }): DecorSpec[] {
  const d = new Decorator(L, "necropolis");

  // THE GREAT TOMB — a sarcophagus on each dais, table tombs by the crown, the colonnade's sarcophagi
  for (const [x, z] of [[13, 10], [19, 10], [13, 14], [19, 14]]) d.place("sarcofree", x, z);
  d.place("tombfree", 16, 10).place("tombfree", 16, 14);
  d.place("sarcophagus", 14, 7, { side: "n" }).place("sarcophagus", 18, 7, { side: "n" });
  d.place("sarcophagus", 13, 17, { side: "s" }).place("sarcophagus", 15, 17, { side: "s" });

  d.clutter({ density: .36, seed: 31 });
  d.clutter({ density: .12, seed: 32, interior: true, kinds: ["urn", "skullpile", "rubble", "bonesLoose", "chainLoose"] });
  return d.specs;
}

import type { DecorSpec, Grid } from "../LevelBuilder";
import { Decorator } from "../decor/place";

/**
 * LEVEL 1 — THE GOTHIC DUNGEON, dressed (levels-feel-full plan, Task 2).
 *
 * The reference's grid is one enormous hall: the great hall (x 14-32, z 8-26), the
 * vestry above it (x 18-28, z 2-7: its "windows" and door are single cells in a row
 * that is otherwise open floor), the west room (x 9-13, z 12-22) and the east wing
 * (x 34-41, z 12-22) all run into one another — 257 connected cells with nothing
 * in them but a ring of pillars and eight enemies. It was the emptiest place in the
 * game. Each part is given the reason it was missing:
 *
 *  - THE TORTURE HALL (the great hall's floor): an execution slab at the centre of the
 *    pillar ring, racks and stocks round it, cages on chains overhead, iron maidens
 *    standing against the north and south walls. The enemies fight among instruments.
 *  - THE CHANCEL (the vestry): the red key sits before an altar under banners, guarded.
 *  - THE STORE (the east wing): crate piles against three walls, stocks by the door.
 *  - THE GUARD ROOM (the west room), THE CELL (the start chamber), the corridors and the
 *    secret cache: straw, shackles, bones and sconces along the walls. Small things only.
 *  - THE WAY OUT (the exit chamber): crate piles and rubble round the pad.
 *
 * **Nothing solid on the recorded route.** `tests/integration/combatTrace.test.ts` walks
 * the start chamber, the x=9 corridor, the z=24 jog and the west room (`ROUTE` below), and
 * fights at its north end; a mass there would move the recording for a reason unrelated to
 * what the trace guards. Everything solid (crate piles, racks, the slab, stocks, maidens)
 * stands east of x=13 or north of z=12, and `ROUTE` gets clutter that can be walked through.
 *
 * Decor crate piles never stand within two cells of the level's real crate `x` (38,21).
 */

/** The start chamber, the corridor, the jog and the west room: where the combat trace walks and fights. */
const ROUTE = (x: number, z: number): boolean => x <= 13 && z >= 12;
/** The dungeon vocabulary without its one solid piece: what may go along the route. */
const WALKABLE = ["straw", "rubble", "bonesLoose", "skullpile", "chainLoose", "shackles", "cage", "sconce", "bench"];

export function dressLevel1(L: { g: Grid; W: number; H: number }): DecorSpec[] {
  const d = new Decorator(L, "dungeon");
  const H = Math.PI / 2;

  // THE TORTURE HALL — the pillar ring's floor
  d.place("slab", 23, 15);
  d.place("rack", 19, 19).place("rack", 27, 18, { r: H }).place("rack", 27, 13).place("rack", 22, 21);
  d.place("stocks", 25, 20).place("stocks", 18, 16).place("stocks", 28, 22);
  for (const [x, z] of [[18, 13], [21, 13], [26, 15], [21, 17], [24, 19], [29, 16], [19, 22], [26, 23]]) d.place("cage", x, z);
  // iron maidens against the hall's north wall (where the vestry does not open) and its south wall
  for (const x of [15, 17, 30, 32]) d.place("maiden", x, 8, { side: "n" });
  for (const x of [17, 20, 25, 28]) d.place("maiden", x, 26, { side: "s" });

  // THE CHANCEL — the vestry, the red key's reliquary
  d.place("altar", 23, 2, { side: "n" });
  for (const x of [19, 21, 25, 27]) d.place("banner", x, 2, { side: "n" });
  d.place("candelabra", 21, 3).place("candelabra", 25, 3);

  // THE STORE — the east wing (the real crate is at 38,21: crate piles keep two cells clear of it)
  for (const x of [35, 37, 40]) d.place("cratepile", x, 12, { side: "n" });
  d.place("cratepile", 41, 14, { side: "e" }).place("cratepile", 41, 20, { side: "e" });
  d.place("stocks", 36, 17);

  // the rest: crate piles and all elsewhere, only what can be walked through on the route
  d.clutter({ density: .34, seed: 5, where: (x, z) => !ROUTE(x, z) });
  d.clutter({ density: .42, seed: 6, kinds: WALKABLE, where: ROUTE });
  d.clutter({ density: .12, seed: 7, interior: true, kinds: WALKABLE });   // the floor of the hall and everywhere else: nothing solid
  return d.specs;
}

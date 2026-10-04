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
 *  - THE TORTURE HALL (the great hall's floor): racks and stocks against its walls (Task 3 took
 *    the slab and the instruments on the open floor out: enemies pinned on them), cages on chains overhead, iron maidens
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
 * what the trace guards. Everything solid (crate piles, racks, stocks, maidens)
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
  // THE TORTURE HALL — the pillar ring's floor
  // The instruments stand against the walls. They first stood on the open floor (a slab at the pillar ring's centre, four racks,
  // three stocks); enemies have no pathfinding, and one that walks at a player behind a rack meets its flat face and stays there
  // (tests/enemies/stuckCheck.test.ts), so they were moved to the wall or, where they still pinned enemies, taken out.
  // The slab goes first: the merged meshes are made in the order the list first asks for each material, and the combat trace's recording
  // hashes the scene's children in order. Its `rock` mesh is one only the slab makes.
  d.place("slab", 29, 8);
  d.place("rack", 22, 26, { r: Math.PI }).place("stocks", 23, 26, { r: Math.PI });
  d.place("rack", 16, 8).place("rack", 31, 8);
  for (const [x, z] of [[18, 13], [21, 13], [26, 15], [21, 17], [24, 19], [29, 16], [19, 22], [26, 23]]) d.place("cage", x, z);
  // iron maidens against the hall's north wall (where the vestry does not open) and its south wall
  for (const x of [15, 17, 30, 32]) d.place("maiden", x, 8, { side: "n" });
  d.place("maiden", 20, 26, { side: "s" });

  // THE CHANCEL — the vestry, the red key's reliquary
  d.place("altar", 27, 2, { side: "n" });
  for (const x of [19, 21, 23, 25]) d.place("banner", x, 2, { side: "n" });
  d.place("candelabra", 21, 3).place("candelabra", 25, 3);

  // THE STORE — the east wing (the real crate is at 38,21: crate piles keep two cells clear of it)
  for (const x of [35, 40]) d.place("cratepile", x, 12, { side: "n" });
  d.place("cratepile", 41, 14, { side: "e" });

  // the rest: crate piles and all elsewhere, only what can be walked through on the route
  d.clutter({ density: .34, seed: 5, where: (x, z) => !ROUTE(x, z) });
  d.clutter({ density: .42, seed: 6, kinds: WALKABLE, where: ROUTE });
  d.clutter({ density: .12, seed: 7, interior: true, kinds: WALKABLE });   // the floor of the hall and everywhere else: nothing solid
  // THE LIGHT — braziers in the halls the torches do not reach (glow only: a real light would move the trace fixtures). Last, so the
  // pieces before them keep their order, and with it the order of the merged meshes the combat trace's recording hashes.
  for (const [x, z] of [[18, 2], [22, 2], [26, 12], [30, 14], [26, 16], [30, 18], [19, 12], [22, 15], [36, 12], [41, 12], [34, 16], [38, 24], [27, 31], [34, 31]]) d.place("brazier", x, z);
  // a crate pile the clutter pass stood where an enemy walking at a player meets its flat face (tests/enemies/stuckCheck.test.ts), taken out
  return d.specs.filter((s) => !STUCK.has(`${s.k}@${Math.floor(s.x + .5)},${Math.floor(s.z + .5)}`));
}

const STUCK = new Set(["cratepile@15,26"]);

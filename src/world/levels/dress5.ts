import type { DecorSpec, Grid } from "../LevelBuilder";
import { Decorator, type PlaceOptions } from "../decor/place";

/**
 * LEVEL 5 — THE SEWERS, dressed (levels-feel-full plan, Task 3).
 *
 * The reference's sewers are a lattice of seven-by-five rooms named for what a sewer has
 * ("inflow grate", "pump room", "settling basin", "sump", "outfall") and furnished with a
 * crate, a barrel and some pickups. What each name promises is built here:
 *
 *  - THE MAIN TUNNEL (x 1-23, z 1-5: inflow grate, main tunnel and junction are one long
 *    culvert): settling tanks and pumps stand along its north wall, pipes run above them, iron
 *    grates and pools of scum lie in its floor, cages hang from the vault, a lantern lights
 *    its middle. The player wakes under the inflow's outfalls.
 *  - THE PUMP ROOM (x 25-31, z 1-5): a bank of pumps and a tank, and a lantern over them.
 *  - THE SETTLING BASIN (x 9-23, z 7-17, with the overflow and the drowned passage west of it):
 *    tanks on its rim, lanterns on its north and south walls, grates and scum on its floor.
 *    **Its floor is left open**: nothing solid stands further than one cell from a wall (only the
 *    basin's own pillars, which the grid already has), so the fight has the room it had.
 *  - THE BOSS HALL (x 9-31, z 19-23: lower main, sump and outfall are one hall): tanks and pumps
 *    along the south wall, lanterns on the north, and the three middle rows (z 20-22) clear.
 *  - Every other room and passage: pipes, outfalls, ladders, grates, scum and debris along the
 *    walls and in the corners, from the sewers' vocabulary.
 *
 * The solid pieces (tanks, pumps, drums) are masses (`decor/masses.ts`); the placement rules keep
 * every one out of every corridor, doorway and junction, off every pickup, and two cells clear of
 * the level's real barrels `O` and crates `x`. No trace fixture records this level.
 */

/** The basin and the boss hall: where the fight is. Only wall-side cells may hold anything solid. */
export const BASIN = (x: number, z: number): boolean => x >= 9 && x <= 23 && z >= 7 && z <= 17;
export const HALL = (x: number, z: number): boolean => x >= 9 && x <= 31 && z >= 19 && z <= 23;

export function dressLevel5(L: { g: Grid; W: number; H: number }): DecorSpec[] {
  const d = new Decorator(L, "sewers");
  const at = (k: string, cells: ReadonlyArray<readonly [number, number]>, o: PlaceOptions = {}) => { for (const [x, z] of cells) d.place(k, x, z, o); };

  // THE MAIN TUNNEL — settling tanks and pumps along the north wall, the inflow's outfalls, the ladder up to the street
  at("pipedrop", [[9, 1], [10, 1], [14, 1], [15, 1]], { side: "n" });
  at("outfall", [[4, 1], [6, 1], [18, 1], [20, 1], [22, 1]], { side: "n" });
  d.place("ladder", 1, 4, { side: "w" });
  at("tank", [[22, 5], [23, 5]], { side: "s" });
  at("pump", [[20, 5]], { side: "s" });
  at("gauge", [[11, 5]], { side: "s" });
  at("cage", [[10, 3], [16, 3], [20, 2], [5, 3]]);
  at("grate", [[4, 3], [12, 3], [16, 4], [20, 4], [3, 4]]);
  at("sludge", [[3, 2], [8, 3], [14, 3], [18, 2], [13, 2]]);

  // THE PUMP ROOM
  at("pump", [[26, 1], [30, 1]], { side: "n" });
  at("lantern", [[13, 1], [28, 1]], { side: "n" });
  d.place("tank", 31, 1, { side: "n" });
  at("grate", [[29, 4]]); d.place("sludge", 27, 4);

  // THE SETTLING BASIN — the rim only: tanks on the north, east and south walls, pumps between
  at("gauge", [[18, 7]], { side: "n" });
  at("pipedrop", [[14, 7]], { side: "n" });
  at("lantern", [[16, 7]], { side: "n" });
  at("pipedrop", [[14, 17]]);
  at("tank", [[23, 13]]);
  at("gauge", [[23, 11]]);
  at("pump", [[19, 17], [9, 12]]);
  at("grate", [[13, 9], [19, 15], [16, 10], [16, 14], [12, 12], [20, 12]]);
  at("sludge", [[12, 10], [18, 14], [14, 13], [20, 10]]);

  // THE WEST SHAFT — the overflow and the drowned passage
  at("pump", [[7, 16]]);
  at("gauge", [[1, 12]]);
  at("pipedrop", [[1, 9]]);
  at("pipedrop", [[1, 14], [1, 6]]);
  at("cage", [[4, 8], [3, 14]]);
  at("grate", [[4, 10], [4, 15], [5, 12]]);

  // THE EAST TUNNEL and THE SLUDGE GALLERY
  at("pump", [[26, 7]]);
  at("tank", [[25, 17]]);
  at("cage", [[27, 9], [29, 11], [27, 15]]);
  at("grate", [[28, 8], [28, 13], [26, 12]]);

  // THE BOSS HALL — tanks and pumps along the south wall, the middle rows clear
  at("tank", [[10, 23], [11, 23]], { side: "s" });
  at("pipedrop", [[21, 23], [22, 23]], { side: "s" });
  at("outfall", [[24, 23], [26, 23]], { side: "s" });
  at("pump", [[10, 19]], { side: "n" });
  at("pipedrop", [[13, 19]], { side: "n" });
  at("pipedrop", [[19, 19], [25, 19]], { side: "n" });
  d.place("gauge", 31, 23, { side: "s" });
  at("outfall", [[27, 19]], { side: "n" });
  at("lantern", [[16, 19], [23, 23]]);
  at("grate", [[16, 22], [24, 21], [12, 21]]);

  // THE MAINTENANCE RELIQUARY (secret)
  d.place("cage", 4, 22);

  d.clutter({ density: .5, seed: 51 });
  d.clutter({ density: .2, seed: 52, interior: true, kinds: ["grate", "sludge", "debris", "cage", "chainLoose"] });
  // THE DIM LANTERNS — glow only, in the side rooms the five real lanterns do not reach
  for (const [x, z, side] of [[1, 1, "w"], [7, 12, "e"], [30, 7, "n"], [1, 19, "n"], [7, 22, "e"], [29, 19, "n"], [29, 23, "s"]] as const) d.place("lanternDim", x, z, { side });
  return d.specs;
}

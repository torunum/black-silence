import type { DecorSpec, Grid } from "../LevelBuilder";
import { Decorator, type PlaceOptions } from "../decor/place";

/**
 * LEVEL 6 — THE FACTORY, dressed (levels-feel-full plan, Task 3).
 *
 * The reference's factory names its rooms "loading dock", "conveyor hall", "press room", "furnace
 * control", "foundry floor", "assembly", "slag sump", "smelter" and holds a crate, barrels and
 * pickups in each: a plant with nothing in it that makes anything. What the names promise is built:
 *
 *  - THE LOADING DOCK (x 1-7, z 1-5): crate piles and drums against its walls, a conveyor running
 *    in through the wall, hooks and chains overhead.
 *  - THE CONVEYOR HALL AND PRESS ROOM (x 9-23, z 1-5): conveyors down its north wall, a press at
 *    each end, machines between, a work lamp on a cable over the middle.
 *  - FURNACE CONTROL (x 25-31, z 1-5): the furnace on the north wall, machines and gauges round it.
 *  - THE FOUNDRY FLOOR (x 9-23, z 7-17: the boss arena of the reference): machines and presses on
 *    the rim, work lamps hung over the floor, iron grates and pipes; **its floor is left open**:
 *    nothing solid stands further than one cell from a wall (its own pillars, its fuel barrels are the grid's).
 *  - THE BOSS HALL (x 9-23, z 19-23, the assembly and the slag sump): presses, crate piles and
 *    machines against the south wall, conveyors on the north, the three middle rows clear.
 *  - Every other room: machines, drums, crate piles, hooks, chains, gauges and pipes along the walls.
 *
 * The solid pieces are masses (`decor/masses.ts`) kept out of every corridor, doorway and junction,
 * off every pickup, and — for the crate piles and drums a player might take for the level's real
 * `x` and `O`, of which this factory has many — two cells clear of them. No trace fixture records this level.
 */

export const FOUNDRY = (x: number, z: number): boolean => x >= 9 && x <= 23 && z >= 7 && z <= 17;
export const HALL = (x: number, z: number): boolean => x >= 9 && x <= 23 && z >= 19 && z <= 23;

export function dressLevel6(L: { g: Grid; W: number; H: number }): DecorSpec[] {
  const d = new Decorator(L, "factory");
  const at = (k: string, cells: ReadonlyArray<readonly [number, number]>, o: PlaceOptions = {}) => { for (const [x, z] of cells) d.place(k, x, z, o); };

  // THE LOADING DOCK — a conveyor in through the north wall, crate piles and drums stacked along the walls, hooks on chains
  d.place("conveyor", 4, 1, { side: "n" });
  at("cratepile", [[5, 1], [6, 1]], { side: "n" });
  at("gauge", [[7, 4]], { side: "e" });
  at("hook", [[3, 3], [5, 3], [2, 4]]);
  // THE PIPE GALLERY — machines down its west wall and by the door
  at("machine", [[1, 9], [1, 10]], { side: "w" });
  d.place("gauge", 7, 7, { side: "e" });

  // THE CONVEYOR HALL AND PRESS ROOM — conveyors down the north wall, a press at each end, machines between, a lamp over the middle
  at("press", [[12, 1]], { side: "n" });
  at("pipedrop", [[20, 1]], { side: "n" });
  at("pipedrop", [[14, 1]], { side: "n" });
  at("pipedrop", [[17, 1], [18, 1]], { side: "n" });
  at("machine", [[11, 5]], { side: "s" });
  at("gauge", [[21, 5]], { side: "s" });
  at("hook", [[13, 3], [20, 2], [16, 3]]);
  at("worklamp", [[16, 2]]);

  // FURNACE CONTROL — the furnace on the north wall, a press and machines round it
  at("furnace", [[28, 1]], { side: "n" });
  at("press", [[27, 1]], { side: "n" });
  at("machine", [[30, 1]]);

  // THE FOUNDRY FLOOR — the rim only: presses and machines on the north wall, conveyors on the east, presses on the south
  at("pipedrop", [[18, 7]], { side: "n" });
  at("pipedrop", [[14, 7]], { side: "n" });
  at("gauge", [[16, 7]], { side: "n" });
  at("conveyor", [[23, 11], [23, 13]], { side: "e" });
  at("machine", [[9, 12], [9, 14]], { side: "w" });
  at("machine", [[13, 17], [19, 17]], { side: "s" });
  at("worklamp", [[16, 10]]);
  at("hook", [[13, 9], [19, 15], [20, 11]]);

  // THE EAST WING — the reactor walk and the smelter
  at("machine", [[25, 8]], { side: "w" });
  at("pipedrop", [[25, 14]], { side: "w" });
  at("gauge", [[25, 10]], { side: "w" });
  at("press", [[25, 16]], { side: "w" });

  // THE BOSS HALL — conveyors on the north wall, presses and crate piles on the south, the middle rows clear
  at("conveyor", [[13, 19]], { side: "n" });
  at("pipedrop", [[21, 19]], { side: "n" });
  at("cratepile", [[13, 23]], { side: "s" });
  at("pipedrop", [[19, 23]], { side: "s" });
  at("pipedrop", [[20, 23]], { side: "s" });
  at("worklamp", [[16, 22]]);

  // THE COOLANT PIT and THE CACHE, the overseer's reliquary
  at("machine", [[1, 15]], { side: "w" });
  at("cratepile", [[7, 22]], { side: "e" });
  at("hook", [[4, 15], [3, 22]]);

  d.clutter({ density: .5, seed: 61 });
  d.clutter({ density: .2, seed: 62, interior: true, kinds: ["hook", "chainLoose", "rubble"] });
  // THE DIM WORK LAMPS — glow only, hung in the side rooms the four real lights do not reach
  for (const [x, z] of [[1, 1], [5, 10], [31, 7], [1, 19], [5, 20], [28, 19], [31, 22]]) d.place("worklampDim", x, z);
  // THE CHECKPOINTS — a pilot light at each of the east column's outer doors (28,6 and 28,18): it lights when the player passes (src/world/Checkpoints.ts)
  for (const [x, z, side] of [[29, 5, "s"], [27, 19, "n"]] as const) d.place("pilotlight", x, z, { side });
  // a drum the clutter pass stood where enemies walking along the hall's south wall meet its flat face (tests/enemies/stuckCheck.test.ts), taken out
  return d.specs.filter((s) => !STUCK.has(`${s.k}@${Math.floor(s.x + .5)},${Math.floor(s.z + .5)}`));
}

const STUCK = new Set(["drum@18,23", "conveyor@1,18", "drum@13,1", "cratepile@7,6", "machine@17,7"]);

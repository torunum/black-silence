import type { Decorator, PlaceOptions } from "../decor/place";
import type { Room } from "../authoring/Plan";

/**
 * LEVEL 6 — THE FACTORY, dressed: machines and presses against the walls, furnaces glowing in the smelting floor, drums and crate piles,
 * gauges and pipes, hooks and chains hung from the beams, conveyors; work lamps. All through the kit's `Decorator`, all `may`: what a
 * rule refuses is skipped, never forced.
 *
 *  - THE CASTING PIT: furnaces along its north wall, the moulds (drums) along its south; the floor between its columns is kept clear
 *    (the Foreman fights there).
 *  - THE BOILER HOUSE: machines and drums along its walls, its middle kept open (the arena).
 *  - THE PRESS HALL: presses on its walls; THE SMELTING FLOOR: furnaces; THE COAL STORE: crate piles and drums.
 */
export interface FactoryRooms {
  yard: Room; boiler: Room; crib: Room; coal: Room; pit: Room; press: Room; smelt: Room; safe: Room; office: Room;
}

export function dressFactory(d: Decorator, r: FactoryRooms): void {
  const { yard, boiler, coal, press, smelt, office } = r;
  const may = (k: string, x: number, z: number, o: PlaceOptions = {}): void => { d.tryPlace(k, x, z, o); };
  const inside = (...rs: Room[]) => (x: number, z: number): boolean => rs.some((q) => q.contains(x, z));

  // THE CASTING PIT (x 14-26, z 10-21)
  for (const x of [16, 24]) may("furnace", x, 10, { side: "n" });
  may("machine", 20, 10, { side: "n" });
  for (const x of [15, 19, 25]) may("drum", x, 21, { side: "s" });
  d.clutter({ density: .35, seed: 633, kinds: ["rubble", "debris", "grate"], interior: true, where: inside(r.pit) });   // slag and spilt iron underfoot: flat, walked over

  // THE BOILER HOUSE (x 12-27, z 33-41)
  for (const x of [13, 17, 21, 25]) may("machine", x, 33, { side: "n" });
  may("worklamp", 19, 36);   // hung over the boiler house, by its machines
  // THE PRESS HALL (x 31-44, z 30-41)
  for (const x of [35, 41]) may("press", x, 30, { side: "n" });
  for (const x of [36, 40]) may("conveyor", x, 41, { side: "s" });
  may("worklamp", 31, 35, { side: "w" });
  // THE SMELTING FLOOR (x 36-51, z 12-23)
  for (const x of [40, 48]) may("furnace", x, 12, { side: "n" });
  for (const x of [44, 51]) may("machine", x, 12, { side: "n" });
  may("worklamp", 51, 17, { side: "e" });
  // THE COAL STORE, THE OFFICE, THE YARD
  SET_STORE(d, coal); SET_STORE(d, yard);
  may("bench", office.x0 + 2, office.z0, { side: "n" }); may("gauge", office.x1, office.z0 + 2, { side: "e" });

  // everything: pipes, gauges, hooks, chains, drums, rubble
  d.clutter({ density: .5, seed: 631, where: inside(...Object.values(r)) });   // rooms only: the corridors keep their walls for the shrines
  d.clutter({ density: .12, seed: 632, interior: true, kinds: ["rubble", "chainLoose", "hook"], where: inside(boiler, press, smelt, coal) });
  for (const [x, z, side] of [[2, 38, "w"], [9, 35, "n"], [36, 5, "w"], [55, 34, "e"], [15, 44, "s"], [44, 6, "n"], [33, 40, "s"], [50, 19, "e"]] as const) may("worklampDim", x, z, { side });
}

/** Crate piles along a room's north and south walls, drums in its corners. */
function SET_STORE(d: Decorator, r: Room): void {
  for (let x = r.x0 + 1; x < r.x1; x += 3) { d.tryPlace("cratepile", x, r.z0, { side: "n" }); d.tryPlace("cratepile", x, r.z1, { side: "s" }); }
  for (const [x, z] of [[r.x0, r.z0], [r.x1, r.z1]]) d.tryPlace("drum", x, z);
}

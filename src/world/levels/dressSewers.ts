import type { Decorator, PlaceOptions } from "../decor/place";
import type { Room } from "../authoring/Plan";

/**
 * LEVEL 5 — THE SEWERS, dressed: pipes along every wall and dropping from the vault, outfalls spilling into the channels, iron grates
 * and pools of scum in the floor, debris, cages and chains hung from the vault; the pumping station's pumps and tanks, the settling
 * tanks' tanks; lanterns. All through the kit's `Decorator`, all `may`: what a rule refuses is skipped, never forced.
 *
 *  - THE GREAT CISTERN: tanks and pumps along its north wall, scum and grates on its floor; the floor between its columns is kept
 *    clear (the Leviathan fights there).
 *  - THE OVERFLOW CHAMBER: outfalls on its walls, scum pooled round its columns; its middle is kept open (the arena).
 */
export interface SewerRooms {
  outfall: Room; station: Room; cupboard: Room; valve: Room; drain: Room; store: Room; overflow: Room; tanks: Room; cistern: Room;
}

export function dressSewers(d: Decorator, r: SewerRooms): void {
  const { outfall, station, valve, drain, store, overflow, tanks, cistern } = r;
  const may = (k: string, x: number, z: number, o: PlaceOptions = {}): void => { d.tryPlace(k, x, z, o); };
  const inside = (...rs: Room[]) => (x: number, z: number): boolean => rs.some((q) => q.contains(x, z));

  // THE GREAT CISTERN (x 14-26, z 9-20)
  for (const x of [16, 24]) may("pump", x, 9, { side: "n" });
  may("tank", 22, 9, { side: "n" }); for (const x of [18, 22]) may("pump", x, 20, { side: "s" });
  may("lantern", 14, 14, { side: "w" }); may("lantern", 26, 16, { side: "e" });
  d.clutter({ density: .25, seed: 531, kinds: ["sludge", "grate"], interior: true, where: inside(cistern) });

  // THE OVERFLOW CHAMBER (x 35-47, z 29-41)
  for (const [x, z, side] of [[37, 29, "n"], [45, 29, "n"], [35, 35, "w"], [47, 35, "e"]] as const) may("outfall", x, z, { side });
  d.clutter({ density: .3, seed: 532, kinds: ["sludge", "grate", "debris"], interior: true, where: inside(overflow, drain) });
  may("lantern", 39, 41, { side: "s" });

  // THE PUMPING STATION (x 38-52, z 15-24) and THE VALVE ROOM
  for (const x of [42, 50]) may("pump", x, 15, { side: "n" }); may("tank", 46, 15, { side: "n" });
  may("lantern", 43, 24, { side: "s" });
  for (const x of [29, 33]) may("tank", x, valve.z0, { side: "n" });

  // THE SETTLING TANKS (x 38-53, z 3-11)
  for (const x of [39, 43, 47, 51]) { may("tank", x, 3, { side: "n" }); may("tank", x + 1, 11, { side: "s" }); }
  d.clutter({ density: .35, seed: 533, kinds: ["sludge", "grate"], interior: true, where: inside(tanks) });
  may("lantern", 45, 3, { side: "n" }); may("lantern", 42, 11, { side: "s" });

  // everything else: pipes, drops, ladders, debris, cages
  d.clutter({ density: .5, seed: 534 });
  d.clutter({ density: .12, seed: 535, interior: true, kinds: ["debris", "sludge", "cage", "chainLoose"], where: inside(outfall, station, store, drain) });
  // dim lanterns, glow only, where the torches do not reach
  for (const [x, z, side] of [[2, 40, "w"], [21, 37, "n"], [14, 44, "s"], [52, 21, "e"], [28, 16, "w"], [53, 6, "e"]] as const) may("lanternDim", x, z, { side });
}

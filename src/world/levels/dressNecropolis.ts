import type { Decorator, PlaceOptions } from "../decor/place";
import type { Room } from "../authoring/Plan";
import { SET_PIECES } from "../authoring/sets";

/**
 * LEVEL 3 — THE NECROPOLIS, dressed: the city of the dead in its own vocabulary — burial niches in every wall, urns, stacks of long
 * bones, skull heaps — and its set-pieces placed by hand. All of it through the kit's `Decorator` and all of it `may`: what a rule
 * refuses (a pickup beside it, a doorway) is skipped, never forced.
 *
 *  - THE COURT: an altar of bone on its north wall under banners, candelabra in its corners, sarcophagi along its south wall; the
 *    floor between the columns is kept clear (the Sovereign fights there).
 *  - THE PLAZA: table tombs and free sarcophagi among the obelisks, votives at their feet, skull heaps in its corners.
 *  - THE CHURCH: the ossuary set along its north wall, banners down the arcade, candelabra.
 *  - THE TOMB HOUSES, THE CRYPT, THE RELIQUARY: sarcophagi against the walls; THE PITS: open graves and mounds; THE LOFT: the
 *    embalmers' slabs.
 */
export interface NecropolisRooms {
  stair: Room; loft: Room; street: Room; tombA: Room; tombB: Room; crypt: Room; church: Room; plaza: Room; reliquary: Room; pits: Room; court: Room;
}

export function dressNecropolis(d: Decorator, r: NecropolisRooms): void {
  const { stair, loft, street, tombA, tombB, crypt, church, plaza, reliquary, pits } = r;
  const may = (k: string, x: number, z: number, o: PlaceOptions = {}): void => { d.tryPlace(k, x, z, o); };
  const inside = (...rs: Room[]) => (x: number, z: number): boolean => rs.some((q) => q.contains(x, z));

  // THE COURT (x 14-26, z 12-22)
  may("altar", 21, 12, { side: "n" });
  for (const x of [16, 18, 23, 25]) may("banner", x, 12, { side: "n" });
  for (const [x, z] of [[15, 13], [25, 13], [15, 21], [25, 21]]) may("candelabra", x, z);
  for (const x of [17, 21, 25]) may("sarcophagus", x, 22, { side: "s" });
  for (const [x, z] of [[19, 15], [23, 15], [19, 19], [23, 19]]) may("votive", x, z);

  // THE PLAZA (x 32-50, z 22-38)
  // the tombs stand against the obelisks, never free on the open floor (an enemy walking at a player behind one would stay there)
  may("tombfree", 41, 28); may("sarcofree", 37, 26);   // (a tomb at (40,31) and a sarcophagus at (46,34) pinned enemies: tests/enemies/stuckCheck.test.ts)
  for (const [x, z] of [[37, 26], [45, 26], [37, 33], [45, 33], [42, 29], [40, 30]]) may("votive", x, z);
  for (const [x, z] of [[32, 22], [50, 22], [32, 38], [50, 38]]) may("skullpile", x, z);
  d.clutter({ density: .3, seed: 331, kinds: ["bonesLoose", "rubble"], interior: true, where: inside(plaza) });

  // THE CHURCH (x 32-47, z 5-16)
  SET_PIECES.ossuary(d, church, "necropolis");
  for (const x of [33, 37, 43, 47]) may("banner", x, 16, { side: "s" });
  for (const [x, z] of [[36, 10], [42, 10], [36, 11], [42, 11]]) may("candelabra", x, z);

  // THE TOMBS, THE CRYPT, THE RELIQUARY: the dead along the walls
  for (const q of [tombA, tombB, crypt, reliquary]) {
    may("sarcophagus", q.x0 + 1, q.z0, { side: "n" }); may("sarcophagus", q.x1 - 1, q.z0, { side: "n" });
    may("urn", q.x0, q.z1); may("urn", q.x1, q.z1);
    may("sarcophagus", q.x0 + 1, q.z1, { side: "s" }); may("sarcophagus", q.x1 - 1, q.z1, { side: "s" });
  }
  // THE LOFT: the embalmers' slabs; THE PITS: graves and mounds
  for (const x of [22, 25]) may("slab", x, loft.z1, { side: "s" });
  d.clutter({ density: .3, seed: 332, kinds: ["opengrave", "mound", "bonesLoose"], interior: true, where: inside(pits) });
  for (const [x, z] of [[4, 5], [9, 10], [15, 5]]) may("votive", x, z);
  for (const x of [4, 8, 12, 16]) may("sarcophagus", x, pits.z0, { side: "n" });   // the pits' old dead, along their north wall

  // the walls of everything: niches, urns, bones
  d.clutter({ density: .45, seed: 333 });
  d.clutter({ density: .14, seed: 334, interior: true, kinds: ["urn", "skullpile", "bonesLoose"], where: inside(street, tombA, tombB, stair, loft) });
  // candles where the torches do not reach (glow, not lights)
  for (const [x, z] of [[3, 40], [7, 36], [12, 38], [27, 37], [21, 6], [27, 9], [6, 30], [39, 42]]) may("votive", x, z);
}

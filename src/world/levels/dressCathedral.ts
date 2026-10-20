import type { Decorator, PlaceOptions } from "../decor/place";
import type { Room } from "../authoring/Plan";

/**
 * LEVEL 7 — THE BONE CATHEDRAL, dressed. The necropolis's vocabulary (sarcophagi, urns, niches, skull piles, loose bones) laid
 * through a church's rooms (the altar, banners, candelabra, votives, glass). Every placement goes through the kit's `Decorator`;
 * all of it is `may` — dressing the kit refuses (a pickup beside it, a doorway) is skipped, never forced.
 *
 *  - THE SANCTUARY: the throne's altar on the west wall between its two windows, banners, candelabra; nothing else solid (the boss fights there).
 *  - THE NAVE: banners along the aisle walls, candelabra and votives down the aisles, skull piles in the corners. The pews are props.
 *  - THE CRYPT and THE PIT: sarcophagi against the walls, urns, niches, skulls and bones underfoot.
 *  - THE CHAPELS and THE TRIFORIUM: an altar, banners, skull piles; votives and braziers for light (glow only, not lights).
 */
export interface CathedralRooms {
  porch: Room; cryptE: Room; cryptW: Room; vault: Room; nave: Room; chapelN: Room; chapelL: Room; reliquary: Room; ossuary: Room; sanctuary: Room; triforium: Room;
}

export function dressCathedral(d: Decorator, r: CathedralRooms): void {
  const { porch, cryptE, cryptW, vault, nave, chapelN, chapelL, ossuary } = r;
  const may = (k: string, x: number, z: number, o: PlaceOptions = {}): void => { d.tryPlace(k, x, z, o); };

  // THE SANCTUARY (x 14-26, z 12-22): the altar on the west wall
  may("altar", 14, 17, { side: "w" });
  for (const z of [16, 18]) may("banner", 14, z, { side: "w" });
  for (const x of [17, 21, 25]) { may("banner", x, 12, { side: "n" }); may("banner", x, 22, { side: "s" }); }
  for (const [x, z] of [[15, 13], [15, 21], [25, 13], [25, 21]]) may("candelabra", x, z);
  may("votive", 15, 15); may("votive", 15, 19);

  // THE NAVE (x 28-47, z 14-27)
  for (const x of [29, 33, 37, 41, 45]) { may("banner", x, 14, { side: "n" }); may("banner", x, 27, { side: "s" }); }
  for (const x of [32, 36, 40, 44]) may("candelabra", x, 18);
  for (const [x, z] of [[28, 15], [47, 15], [28, 26], [47, 26]]) may("skullpile", x, z);
  for (const [x, z] of [[30, 21], [38, 21], [46, 21], [36, 25], [42, 16]]) may("votive", x, z);
  d.clutter({ density: .25, seed: 71, kinds: ["bonesLoose", "rubble", "glass"], interior: true, where: (x, z) => nave.contains(x, z) });

  // THE PORCH, beneath: bones, an urn or two, braziers
  for (const [x, z] of [[53, 33], [58, 38]]) may("urn", x, z);
  may("brazier", 59, 33); may("brazier", 52, 38);
  d.clutter({ density: .4, seed: 72, kinds: ["bonesLoose", "skullpile", "rubble"], interior: true, where: (x, z) => porch.contains(x, z) });

  // THE CRYPT (the west vault x 12-31, the east vault x 37-47, z 33-40) and THE CHARNEL VAULT: sarcophagi against the walls, urns, niches, skulls
  for (const x of [14, 20, 28, 40, 45]) { may("sarcophagus", x, 33, { side: "n" }); may("niche", x + 1, 40, { side: "s" }); }
  for (const x of [13, 23, 31, 38, 47]) may("urn", x, 40);
  d.clutter({ density: .35, seed: 73, kinds: ["bonesLoose", "skullpile", "rubble"], interior: true, where: (x, z) => cryptE.contains(x, z) || cryptW.contains(x, z) || vault.contains(x, z) });
  may("brazier", 12, 36); may("brazier", 47, 35); may("brazier", 27, 40);
  for (const [x, z] of [[15, 43], [21, 43]]) may("skullpile", x, z);
  // THE OSSUARY (secret): bone stacks and niches
  for (const x of [ossuary.x0 + 1, ossuary.x0 + 5]) may("bonestack", x, ossuary.z0, { side: "n" });
  may("skullpile", ossuary.x0 + 7, ossuary.z0 + 4);

  // THE CHAPELS and THE TRIFORIUM
  for (const room of [chapelN, chapelL]) {
    may("altar", room.x0 + (room.w >> 1), room.z0, { side: "n" });
    may("banner", room.x0 + 1, room.z0, { side: "n" }); may("banner", room.x0 + room.w - 2, room.z0, { side: "n" });
    may("votive", room.x0, room.z0 + room.h - 1); may("votive", room.x0 + room.w - 1, room.z0 + room.h - 1);
  }
  for (const [x, z] of [[53, 3], [56, 8], [59, 6]]) may("skullpile", x, z);
  // the candle stands the dark corners keep: the east vault's tombs, the lady chapel's altar, the vestry stair, the porch
  for (const [x, z] of [[39, 34], [44, 34], [47, 39], [37, 39], [42, 7], [46, 9], [53, 35], [58, 34], [13, 34], [30, 39], [21, 34]]) may("votive", x, z);
  may("brazier", 42, 40); may("brazier", 31, 33);
  may("brazier", 59, 3); may("votive", 51, 8);
}

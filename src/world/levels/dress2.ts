import type { Decorator, PlaceOptions } from "../decor/place";
import type { Room } from "../authoring/Plan";

/**
 * LEVEL 2 — THE ABANDONED CHURCH, dressed (levels-feel-full plan, Task 2; rebuilt for the deeper-levels plan, Task 4).
 *
 * The rooms are new, the dressing is the church's vocabulary put where the new rooms ask for it. Every placement goes through the kit's
 * `Decorator`, whose rules throw (or, through `tryPlace`, say no) rather than hide a pickup or wall a corridor:
 *
 *  - THE CHANCEL: the altar on the west wall between two windows of stained glass, banners hung beside it, candelabra in the corners: the
 *    game's strongest frame is the one the player comes upon through the arch, down the whole length of the nave.
 *    **Nothing else solid stands in it**: `tests/integration/bossTrace.test.ts` stands the player in the chancel and fights the Priest there
 *    (`tests/world/levelDressing.test.ts` holds it to the altar alone), so its orbs, its summons' paths and the line of sight between them are the
 *    ones recorded.
 *  - THE NAVE: saints toppled against the aisle walls, banners between the windows, candelabra down the aisle, broken glass beneath the glass,
 *    candle stands in the aisles; the pews are props (`v`), the arcade's pillars are grid cells.
 *  - THE NARTHEX: the font by the door, benches. THE CHAPELS: an altar each under banners. THE CHOIR LOFT: lecterns round the organ.
 *    THE SACRISTY: lecterns and banners. THE BELFRY and the ringing chamber: ropes hanging to the floor, rubble.
 *  - THE CRYPT and the OSSUARY (the necropolis's pieces, for what lies under a church): sarcophagi against the walls, urns, niches, skull piles.
 *  - THE LIGHT: candle stands and braziers (glow only; a real light is a budget, `tests/world/lightBudget.test.ts`) in every room the torches and the
 *    windows leave dark, and in the corners of the big ones: a church lit by what is left in it.
 *
 * Racks of masses stand against walls: enemies have no pathfinding, and one that walks at a player behind a free-standing mass meets its flat face
 * and stays there (`tests/enemies/stuckCheck.test.ts`, run with `STUCK_PLACES=999`).
 */

export interface Rooms {
  narthex: Room; nave: Room; chancel: Room; ringing: Room; chapelA: Room; chapelB: Room; reliquary: Room; sacristy: Room;
  southChapel: Room; belfry: Room; loft: Room; crypt: Room; ossuary: Room;
}

/** A mass the clutter pass or a hand placement stood where an enemy walking at a player meets its flat face (`tests/enemies/stuckCheck.test.ts`): taken out. */
export const PINNERS_2: readonly string[] = ["fallenstatue@33,14", "fallenstatue@38,14", "fallenstatue@33,28", "fallenstatue@38,28", "sarcophagus@9,36"];

/** The church vocabulary without its solid pieces (a fallen saint, the font): what may go on the floors the fights cross. */
const WALKABLE = ["glass", "rubble", "candelabra", "lectern", "banner", "sconce", "bonesLoose"];

export function dressLevel2(d: Decorator, r: Rooms): void {
  const { narthex, nave, chancel, ringing, chapelA, chapelB, sacristy, southChapel, belfry, loft, crypt, ossuary } = r;
  /** An authored piece the kit refuses is a layout bug, not a log line. */
  const must = (k: string, x: number, z: number, o: PlaceOptions = {}): void => { const e = d.tryPlace(k, x, z, o); if (e) throw new Error(`level 2 dressing: ${k} at (${x},${z}) refused: ${e}`); };
  /** What is only dressing: skipped if the kit says no (a pickup beside it, a wall already hung). */
  const may = (k: string, x: number, z: number, o: PlaceOptions = {}): void => { d.tryPlace(k, x, z, o); };

  // THE CHANCEL (x 14-24, z 14-22): the altar on the west wall, a window of coloured glass either side of it
  must("altar", 14, 18, { side: "w" });
  for (const z of [17, 19]) must("banner", 14, z, { side: "w" });
  for (const x of [20, 23]) may("banner", x, 14, { side: "n" });
  for (const x of [17, 22]) may("banner", x, 22, { side: "s" });
  for (const [x, z] of [[15, 15], [15, 21], [23, 15], [23, 21]]) may("candelabra", x, z);
  may("votive", 15, 17); may("votive", 15, 19);
  for (const [x, z] of [[18, 16], [20, 20], [22, 18], [17, 21]]) may("glass", x, z);

  // THE NAVE (x 26-49, z 14-28): saints against the aisle walls, banners between the windows, candelabra down the aisle
  // (the saints that lay along the aisle walls, at x 33 and 38, pinned the nave's dead on their flat faces: tests/enemies/stuckCheck.test.ts, `PINNERS_2`; two of them lie in the chapels now)
  may("fallenstatue", 14, 8, { side: "w" }); may("fallenstatue", 46, 10, { side: "e" });
  for (const x of [27, 35, 40, 44, 48]) { may("banner", x, 14, { side: "n" }); may("banner", x, 28, { side: "s" }); }
  for (const x of [30, 34, 38, 44, 47]) for (const z of [20, 22]) may("candelabra", x, z);
  for (const [x, z] of [[29, 14], [36, 14], [46, 14], [29, 28], [36, 28], [46, 28]]) may("glass", x, z);   // the glass beneath its window
  for (const [x, z] of [[27, 15], [48, 15], [27, 27], [48, 27], [38, 18], [38, 24]]) may("votive", x, z);

  // THE NARTHEX (x 54-61, z 18-28): the font by the door, benches, banners
  must("font", 55, 18, { side: "n" });
  for (const z of [24, 26]) may("bench", 61, z, { side: "e" });
  for (const [x, z] of [[56, 21], [58, 25], [55, 22], [59, 20]]) may("candelabra", x, z);
  d.clutter({ density: .45, seed: 25, kinds: ["glass", "rubble", "bonesLoose"], interior: true, where: (x, z) => narthex.contains(x, z) });
  for (const x of [59, 61]) may("banner", x, 18, { side: "n" });
  for (const x of [56, 58]) may("banner", x, 28, { side: "s" });
  may("candelabra", 55, 24); may("votive", 61, 24); may("votive", 54, 27);

  // THE RINGING CHAMBER and the BELFRY: the ropes hang to the floor
  for (const [x, z] of [[54, 11], [58, 13], [60, 11]]) may("chainLoose", x, z);
  for (const [x, z] of [[54, 3], [57, 4], [59, 3], [56, 5]]) may("chainLoose", x, z);
  for (const [x, z] of [[53, 12], [61, 12]]) may("rubble", x, z);
  may("votive", 52, 12); may("votive", 61, 5); may("votive", 55, 5); may("candelabra", 59, 2);

  // THE CHAPELS: an altar each, under banners
  for (const [room, x] of [[chapelA, 31], [chapelB, 42]] as const) {
    must("altar", x, room.z0, { side: "n" });
    for (const dx of [-2, 2]) may("banner", x + dx, room.z0, { side: "n" });
    may("candelabra", x - 3, room.z0 + 1); may("candelabra", x + 3, room.z0 + 1);
    may("votive", room.x0, room.z1); may("votive", room.x1, room.z1);
    may("glass", x - 1, room.z0 + 2); may("glass", x + 1, room.z0 + 3);
  }
  may("bench", 28, 10, { side: "s" }); may("bench", 34, 10, { side: "s" }); may("bench", 39, 10, { side: "s" }); may("bench", 45, 10, { side: "s" });

  // THE SOUTH CHAPEL: the altar on the west wall, the way down to the dead beyond the south wall
  must("altar", 38, 34, { side: "w" });
  for (const z of [33, 35]) may("banner", 38, z, { side: "w" });
  may("candelabra", 40, 33); may("candelabra", 40, 36); may("votive", 46, 32); may("votive", 46, 36);

  // THE RELIQUARY (behind its secret door): candles and old glass
  d.clutter({ density: .6, seed: 14, kinds: ["glass", "rubble", "candelabra"], where: (x, z) => r.reliquary.contains(x, z) });

  // THE CHOIR LOFT: lecterns and banners round the organ
  for (const x of [16, 22]) may("lectern", x, loft.z0, { side: "n" });
  for (const x of [15, 18, 21, 23]) may("banner", x, loft.z0, { side: "n" });
  may("lectern", 14, 7, { side: "w" }); may("candelabra", 15, 9); may("candelabra", 23, 8); may("votive", 14, 4); may("votive", 24, 4);

  // THE SACRISTY: lecterns, banners, a font of old water
  may("lectern", 17, sacristy.z1, { side: "s" }); may("lectern", 24, 30, { side: "e" });
  for (const x of [16, 23]) may("banner", x, sacristy.z0, { side: "n" });
  may("font", 24, 32, { side: "e" }); may("candelabra", 15, 28); may("votive", 24, 28); may("votive", 14, 32);

  // THE CRYPT and the OSSUARY: the dead, in their own furniture
  for (const x of [14, 29, 32]) may("sarcophagus", x, crypt.z0, { side: "n" });
  for (const x of [8, 12, 16, 24, 30, 33]) may(x % 4 ? "niche" : "urn", x, crypt.z1, { side: "s" });
  for (const x of [6, 18, 26]) may("bonestack", x, crypt.z1, { side: "s" });
  may("skullpile", 4, crypt.z0); may("skullpile", 34, crypt.z1);
  for (const [x, z] of [[8, 40], [13, 38], [17, 40], [23, 38], [26, 42], [31, 40]]) may("brazier", x, z);
  d.clutter({ density: .5, seed: 15, kinds: ["rubble", "bonesLoose"], interior: true, where: (x, z) => crypt.contains(x, z) });
  for (let x = ossuary.x0; x <= ossuary.x1; x += 2) may(x % 4 ? "niche" : "urn", x, ossuary.z0, { side: "n" });
  may("skullpile", ossuary.x0, ossuary.z1, { side: "s" }); may("skullpile", ossuary.x1, ossuary.z1, { side: "s" });
  may("votive", 8, 31); may("votive", 5, 33);

  // the rest, by the area: a church's walls hold what a church holds. Nothing solid goes where it was filtered out (`PINNERS_2`).
  d.clutter({ density: .3, seed: 21, kinds: WALKABLE, where: (x, z) => nave.contains(x, z) || narthex.contains(x, z) || chapelA.contains(x, z) || chapelB.contains(x, z) });
  d.clutter({ density: .35, seed: 22, kinds: WALKABLE, where: (x, z) => chancel.contains(x, z) || sacristy.contains(x, z) || loft.contains(x, z) || southChapel.contains(x, z) });
  d.clutter({ density: .35, seed: 23, kinds: ["glass", "rubble", "bonesLoose"], interior: true, where: (x, z) => ringing.contains(x, z) || belfry.contains(x, z) });
  // the floors of the big rooms, which have no wall beside them: only what lies on the floor, nothing solid
  d.clutter({ density: .1, seed: 24, kinds: ["glass", "rubble", "bonesLoose"], interior: true, where: (x, z) => nave.contains(x, z) || chancel.contains(x, z) });
}

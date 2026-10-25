import type { Decorator, PlaceOptions } from "../decor/place";
import type { Room } from "../authoring/Plan";
import { SET_PIECES } from "../authoring/sets";

/**
 * LEVEL 4 — THE GRAVEYARD, dressed. Headstones and crosses stand along every wall and fence, the open ground has open graves and
 * mounds and loose bones underfoot (no stone stands free on the open floor: an enemy walking at a player behind one meets its face and
 * stays there, `tests/enemies/stuckCheck.test.ts`), dead trees in the corners, lanterns on crooks for the dead. All of it through the
 * kit's `Decorator` and all of it `may`: what a rule refuses is skipped, never forced.
 *
 *  - THE CHAPEL OF REST: an altar on its north wall under banners, candelabra, a bier (the table tomb) before the altar.
 *  - THE COTTAGE and its loft: a bench, crate piles, the gravekeeper's lamp; THE CHARNEL: bones heaped and stacked.
 *  - THE NEW GRAVES: open graves dug in rows, the mounds of the ones filled, the Gravedigger's lanterns.
 */
export interface GraveyardRooms {
  lych: Room; yews: Room; field: Room; cottage: Room; charnel: Room; graves: Room; terr1: Room; vault: Room; chapel: Room; bells: Room; loft: Room; terr2: Room;
}

export function dressGraveyard(d: Decorator, r: GraveyardRooms): void {
  const { lych, yews, field, cottage, charnel, graves, terr1, chapel, loft, terr2 } = r;
  const may = (k: string, x: number, z: number, o: PlaceOptions = {}): void => { d.tryPlace(k, x, z, o); };
  const inside = (...rs: Room[]) => (x: number, z: number): boolean => rs.some((q) => q.contains(x, z));

  // THE NEW GRAVES (x 14-27, z 10-21): rows of open graves and filled ones, lanterns
  for (const [x, z] of [[18, 12], [22, 12], [25, 14], [18, 20], [22, 20], [25, 18]]) may("opengrave", x, z);
  for (const [x, z] of [[20, 13], [24, 16], [20, 19]]) may("mound", x, z);
  for (const [x, z] of [[15, 11], [26, 20]]) may("gravelamp", x, z);
  for (const [x, z] of [[26, 11], [15, 20]]) may("gravelampDim", x, z);
  may("deadtree", 27, 21);
  d.clutter({ density: .3, seed: 437, kinds: ["bonesLoose", "mound", "hand"], interior: true, where: inside(graves) });   // the dug earth underfoot: flat, walked over

  // THE POTTER'S FIELD (x 11-30, z 33-42): graves dug and not filled, the dead trees, the lanterns
  d.clutter({ density: .2, seed: 431, kinds: ["opengrave", "mound", "bonesLoose", "hand"], interior: true, where: inside(field) });
  for (const [x, z] of [[11, 33], [30, 42]]) may("deadtree", x, z);
  for (const [x, z] of [[15, 36], [25, 39]]) may("gravelamp", x, z);
  may("gravelampDim", 20, 34);

  // THE CHAPEL OF REST (x 40-53, z 4-15)
  may("altar", 47, 4, { side: "n" });
  for (const x of [41, 45, 49, 53]) may("banner", x, 4, { side: "n" });
  may("tombfree", 47, 9);
  for (const [x, z] of [[41, 5], [53, 5], [41, 14], [53, 14]]) may("candelabra", x, z);

  // THE COTTAGE and ITS LOFT
  may("bench", 35, 41, { side: "s" }); may("cratepile", 41, 35, { side: "n" }); may("cratepile", 34, 27, { side: "n" });
  may("sconce", 34, 38, { side: "w" }); may("sconce", 41, 29, { side: "e" });

  // THE CHARNEL (x 29-37, z 3-10): bones
  SET_PIECES.ossuary(d, charnel, "graveyard");
  d.clutter({ density: .3, seed: 432, kinds: ["bonesLoose", "skullpile"], interior: true, where: inside(charnel) });

  // THE TERRACES, THE YEWS, THE LYCHGATE: trees, graves underfoot, lanterns
  for (const [x, z] of [[46, 40], [56, 34], [45, 21], [56, 28], [3, 5], [8, 5], [3, 30], [9, 20], [3, 37], [7, 41]]) may("deadtree", x, z);
  d.clutter({ density: .16, seed: 433, kinds: ["mound", "opengrave", "bonesLoose"], interior: true, where: inside(terr1, terr2, yews) });
  for (const [x, z] of [[48, 36], [49, 24]]) may("gravelamp", x, z);
  for (const [x, z] of [[54, 38], [54, 26], [5, 10], [5, 24]]) may("gravelampDim", x, z);

  d.clutter({ density: .05, seed: 439, kinds: ["deadtree"], where: inside(field, terr1, terr2, yews, lych) });   // the dead trees along the walls
  // every wall: the stones, the fences
  d.clutter({ density: .42, seed: 434, kinds: ["gravestone", "gravecross"], where: inside(field, graves, terr1, terr2, yews, lych) });
  d.clutter({ density: .4, seed: 435, where: inside(field, graves, terr1, terr2, yews, lych) });
  d.clutter({ density: .3, seed: 436, kinds: ["bonesLoose", "rubble"], where: inside(cottage, loft, chapel) });
  d.clutter({ density: .12, seed: 438, kinds: ["bonesLoose", "rubble"], interior: true });   // and underfoot everywhere else: the passages too
  // lanterns, glow only, where the torches do not reach
  for (const [x, z] of [[3, 37], [12, 41], [29, 34], [56, 40], [56, 22], [36, 4], [21, 15]]) may("gravelampDim", x, z);
}

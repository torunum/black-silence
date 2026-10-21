import type { Decorator, PlaceOptions } from "../decor/place";

/**
 * THE HOLLOW VILLAGE, DRESSED. Over the blockout, once its ways and fights were settled: the houses' slate roofs and chimneys against
 * the sky (each a gable over its block of walls), the church's roof and cross along the square's north side, the well and the gallows on
 * the square, the dead corn of the field with its scarecrows and fences, the barn's hay and cart, the smithy's furnace and woodpiles, the
 * undertaker's coffins and slabs, the burned house's rubble, the cellars' crates, and the graveyard's stones. Everything goes through the
 * kit's `Decorator` as `may`: a piece the kit refuses (a pickup beside it, a doorway, a way it would block) is skipped, never forced.
 * Nothing here gives light.
 */

type Box = readonly [number, number, number, number];
const hash = (x: number, z: number, s: number): number => (((x * 73856093) ^ (z * 19349663) ^ (s * 83492791)) >>> 0) % 100;

/** The houses' blocks, walls included: `[x0, z0, x1, z1]` — a roof goes over each, its ridge along the longer side. */
const HOUSES: readonly Box[] = [
  [13, 4, 25, 15],    // the inn
  [46, 4, 56, 13],    // the store
  [21, 21, 31, 31],   // the undertaker's
  [40, 21, 49, 29],   // the smithy
  [40, 32, 49, 40],   // the cottage
  [58, 15, 69, 32],   // the mill
  [2, 46, 18, 60],    // the barn
];

export function dressVillage(d: Decorator): void {
  const may = (k: string, x: number, z: number, o: PlaceOptions = {}): boolean => d.tryPlace(k, x, z, o) === null;
  const strew = (box: Box, kinds: readonly string[], pct: number, seed: number, o: PlaceOptions = {}): void => {
    const [x0, z0, x1, z1] = box;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const h = hash(x, z, seed);
      if (h >= pct) continue;
      for (let i = 0; i < kinds.length; i++) if (may(kinds[(h + i) % kinds.length], x, z, o)) break;
    }
  };

  // ---- the roofs: a gable over every house, the ridge along its longer side; the church's along the square's north
  for (const [x0, z0, x1, z1] of HOUSES) {
    const w = (x1 - x0 + 1) * 2, dep = (z1 - z0 + 1) * 2, along = dep >= w;
    may("houseroof", (x0 + x1) / 2, (z0 + z1) / 2, along ? { s: w, h: dep } : { s: dep, h: w, r: Math.PI / 2 });
  }
  may("roof", 35.5, 1.5, { s: 30, h: 8 });   // the church, its cross over the doors

  // ---- the square: the well in its middle, the gallows, a cart, a fingerpost; benches by the houses
  may("villagewell", 35, 12);
  may("gallows", 30, 9);
  may("cart", 41, 9, { r: .4 });
  may("signpost", 26, 19);
  may("signpost", 39, 20);
  strew([26, 4, 45, 19], ["bench", "rubble", "bonesLoose", "haybale"], 4, 1);

  // ---- the street and the lanes: carts left where they stood, hay, the dead's leavings
  may("cart", 38, 34, { r: -.3 });
  strew([32, 20, 39, 44], ["rubble", "bonesLoose", "haybale", "debris"], 5, 2);
  strew([51, 16, 57, 44], ["haybale", "woodpile", "rubble", "cratepile"], 7, 3);

  // ---- the field: the corn higher than a man, fences round it, scarecrows, the way to the barn's doors left clear
  for (let z = 17; z <= 44; z++) for (let x = 3; x <= 19; x++) {
    if (x >= 9 && x <= 11 && z >= 38) continue;   // the cart track to the barn
    if (hash(x, z, 4) < 46) may("corn", x, z);
  }
  for (let z = 18; z <= 44; z += 2) may("fence", 3, z, { side: "w" });
  may("scarecrow", 6, 26); may("scarecrow", 15, 36);
  strew([3, 17, 19, 44], ["haybale", "mound", "bonesLoose"], 3, 5);

  // ---- the barn: hay, a cart, crates, chains and hooks from the beams; straw over the hayloft
  may("cart", 13, 52, { r: 1.2 });
  strew([8, 47, 17, 58], ["haybale", "cratepile", "straw", "chainLoose"], 14, 6);
  strew([3, 47, 7, 58], ["haybale", "straw"], 30, 7);

  // ---- the houses: the inn's benches, the store's crates, the undertaker's coffins and slabs, the smithy's furnace and logs
  strew([18, 5, 24, 13], ["bench", "lectern", "urn", "straw"], 10, 8);
  strew([47, 5, 55, 12], ["cratepile", "urn", "rack"], 12, 9);
  strew([22, 22, 30, 29], ["coffin", "slab", "candelabra", "urn"], 14, 10);
  may("furnace", 48, 25, { side: "e" });
  strew([41, 22, 48, 28], ["woodpile", "drum", "hook", "chainLoose"], 14, 11);
  strew([41, 33, 48, 39], ["bench", "straw", "urn", "cratepile"], 10, 12);
  strew([22, 33, 30, 40], ["rubble", "debris", "glass", "bonesLoose"], 30, 13);   // the burned house: what fell in
  strew([59, 20, 64, 29], ["cratepile", "haybale", "machine", "chainLoose"], 12, 14);   // the mill's floor: clear of the stair along its south wall
  strew([65, 20, 68, 30], ["cratepile", "straw"], 10, 18);   // its loft
  // the cellars and the tunnel
  strew([60, 4, 68, 11], ["cratepile", "drum", "rubble", "bonesLoose"], 16, 15);
  strew([15, 1, 20, 3], ["drum", "urn"], 30, 16);

  // ---- the graveyard: stones in rows, open graves, dead trees, the mausoleum's and the crypt's roofs
  strew([24, 46, 47, 61], ["gravestone", "gravecross", "opengrave", "mound", "gravestone", "deadtree", "bonesLoose"], 14, 17);
  may("roof", 42, 51, { s: 10, h: 10 });
  may("roof", 28.5, 55.5, { s: 8, h: 8 });
}

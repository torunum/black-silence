import type { Decorator, PlaceOptions } from "../decor/place";

/**
 * THE ASH BELL MONASTERY, dressed (the brief's "mimari dil": damp stone, pointed arches, high ceilings, rusted iron, worn wood, broken
 * stained glass, grave niches and sooted furnaces, and the cult's traces everywhere). The blockout's pass, after its ways and fights were
 * settled: each region gets its own vocabulary from the kit, whatever the level's theme, laid by a fixed hash over its cells. Everything
 * goes through the kit's `Decorator` as `may`: a piece the kit refuses (a pickup beside it, a doorway, a corridor it would block) is
 * skipped, never forced. Nothing here gives light: the level is at its light budget.
 *
 *   crypt, vault          sarcophagi along the walls, urns, wall niches, bones and skulls underfoot
 *   graveyard             headstones and crosses among the stones, open graves, mounds, a few dead saplings; fences on the terraces
 *   courtyard, cloister   a fallen statue, benches, broken glass, rubble, urns
 *   morgue                autopsy slabs, racks, chains, loose bones
 *   crematorium, coal     machines and drums along the walls, hooks and chains hung, pipes, debris and ash
 *   library, stacks       lecterns and banners, candelabra, broken glass from the windows
 *   tower                 rubble, hung chains
 *   ossuary, bone chapel  bone stacks, skull piles, niches, urns
 *   cistern, pump room    pipes and drops on the walls, grates, sludge, a tank and a pump
 *   rite chapel           the altar against its block, the cult's banners, candelabra round the ring, skulls
 */

type Box = readonly [number, number, number, number];
const hash = (x: number, z: number, s: number): number => (((x * 73856093) ^ (z * 19349663) ^ (s * 83492791)) >>> 0) % 100;

export function dressMonastery(d: Decorator): void {
  const may = (k: string, x: number, z: number, o: PlaceOptions = {}): boolean => d.tryPlace(k, x, z, o) === null;
  /** Over every cell of a box, at `pct` percent of cells (by the hash), try the kinds in turn until one fits. */
  const strew = (box: Box, kinds: readonly string[], pct: number, seed: number): void => {
    const [x0, z0, x1, z1] = box;
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      const h = hash(x, z, seed);
      if (h >= pct) continue;
      for (let i = 0; i < kinds.length; i++) if (may(kinds[(h + i) % kinds.length], x, z)) break;
    }
  };

  // the family crypt and vault
  strew([76, 62, 90, 70], ["sarcophagus", "niche", "urn", "bonestack"], 22, 1);
  strew([80, 74, 86, 80], ["niche", "bonesLoose", "urn"], 14, 2);
  strew([88, 72, 96, 80], ["sarcophagus", "urn", "skullpile", "niche"], 24, 3);
  // the graveyard and the ruined bone chapel
  strew([34, 68, 73, 82], ["gravestone", "gravecross", "opengrave", "mound", "gravestone", "sapling", "bonesLoose"], 12, 4);
  strew([34, 68, 38, 82], ["fence"], 18, 5);
  strew([24, 69, 32, 81], ["rubble", "bonestack", "skullpile", "fallenstatue"], 16, 6);
  // the courtyard and the cloister
  strew([38, 30, 63, 57], ["rubble", "glass", "urn", "bench", "fallenstatue"], 5, 7);
  strew([68, 44, 86, 58], ["bench", "urn", "glass", "rubble", "fallenstatue"], 8, 8);
  // the morgue
  strew([28, 30, 36, 36], ["bench", "rack", "chainLoose", "bonesLoose"], 14, 9);
  strew([18, 30, 26, 36], ["rack", "chainLoose", "hook", "bonesLoose"], 16, 10);
  strew([24, 39, 36, 46], ["slab", "rack", "chainLoose", "bonesLoose"], 12, 11);
  strew([12, 38, 22, 46], ["slab", "chainLoose", "bonesLoose"], 10, 12);
  // the crematorium and the coal store
  strew([10, 50, 34, 66], ["machine", "drum", "hook", "pipe", "pipedrop", "debris", "rubble"], 16, 13);
  strew([13, 68, 22, 74], ["cratepile", "drum", "debris", "chainLoose"], 18, 14);
  // the library, its gallery and the stacks; the chapter house
  strew([66, 25, 90, 40], ["lectern", "banner", "candelabra", "glass", "bench"], 9, 15);
  strew([82, 4, 96, 18], ["banner", "lectern", "rubble"], 6, 16);
  strew([88, 44, 96, 58], ["banner", "bench", "candelabra", "urn"], 12, 17);
  // the tower and the rampart
  strew([56, 28, 63, 37], ["rubble", "chainLoose"], 14, 18);
  strew([44, 28, 54, 29], ["rubble", "bonesLoose"], 12, 19);
  // under the courtyard: the ossuary, the bone chapel, the cistern, the pump room
  strew([43, 4, 60, 17], ["bonestack", "skullpile", "niche", "urn", "bonesLoose"], 18, 20);
  strew([62, 4, 74, 15], ["bonestack", "skullpile", "niche", "bonesLoose"], 20, 21);
  strew([26, 2, 39, 24], ["pipe", "pipedrop", "grate", "sludge", "debris"], 14, 22);
  strew([7, 1, 24, 3], ["tank", "pump", "pipe", "pipedrop"], 22, 23);
  // the rite chapel: the altar against its block, the ring
  may("altar", 16, 14, { side: "n" });
  for (const x of [8, 12, 20, 24]) may("banner", x, 26, { side: "s" });
  for (const z of [16, 20]) { may("banner", 6, z, { side: "w" }); may("banner", 24, z, { side: "e" }); }
  for (const [x, z] of [[12, 15], [20, 15], [12, 18], [20, 18]] as const) may("candelabra", x, z);
  strew([6, 6, 24, 26], ["skullpile", "bonesLoose", "bonestack"], 6, 24);
}

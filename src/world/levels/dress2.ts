import type { DecorSpec, Grid } from "../LevelBuilder";
import { Decorator } from "../decor/place";

/**
 * LEVEL 2 — THE ABANDONED CHURCH, dressed (levels-feel-full plan, Task 2).
 *
 * The reference's church is a ring of seven-by-five rooms round a nave, and every
 * room carries its four to six sprites — a church you could not tell from a
 * warehouse, because its walls, floors and corners were bare. What it lacked was
 * what makes a church a church:
 *
 *  - THE NAVE (x 9-23, z 7-17): candelabra down both sides of the aisle, pilgrims' banners
 *    on the walls, saints toppled from their plinths against the side walls, rubble and
 *    broken glass beneath the stained-glass windows.
 *  - THE CHAPEL: an altar under its window; THE NARTHEX: the font by the door.
 *  - Every other room (bell tower, priest's chambers, sacristy, catacombs, ossuary, the
 *    secret reliquary): banners, lecterns, candelabra, rubble, the odd fallen statue,
 *    along the walls and in the corners, from the church vocabulary.
 *
 * **Nothing solid where the boss trace fights.** `tests/integration/bossTrace.test.ts`
 * stands the player at (21,21) and fights the Corrupted Priest from the doorway (16,20):
 * the ritual room and the crypt (`BOSS`) get only what can be walked through, so the fight
 * (its orbs, its summons' paths, the line of sight between them) is the one recorded.
 * The nave, north of the crypt's wall, is another room and takes the statues.
 *
 * The benches of the church vocabulary are left out: the real pews (`v`, breakable
 * props) stand in the nave, and a decor bench beside them would be taken for one.
 */

/** The ritual room and the crypt: where the boss trace fights. */
const BOSS = (x: number, z: number): boolean => x >= 9 && x <= 23 && z >= 19;
/** The church vocabulary without its solid pieces (fallen statue, font) and without benches. */
const WALKABLE = ["glass", "rubble", "candelabra", "lectern", "banner", "sconce", "bonesLoose"];
const FURNISH = [...WALKABLE, "fallenstatue", "font"];

export function dressLevel2(L: { g: Grid; W: number; H: number }): DecorSpec[] {
  const d = new Decorator(L, "church");

  // THE NAVE — the saints fallen against the side walls, the candelabra of the aisle, the banners of the north and south walls
  d.place("fallenstatue", 9, 10, { side: "w" }).place("fallenstatue", 9, 14, { side: "w" });
  d.place("fallenstatue", 23, 10, { side: "e" }).place("fallenstatue", 23, 14, { side: "e" });
  for (const x of [14, 18]) for (const z of [9, 12, 15]) d.place("candelabra", x, z);
  for (const x of [10, 14, 18, 22]) d.place("banner", x, 7, { side: "n" });
  for (const x of [11, 16, 21]) d.place("banner", x, 17, { side: "s" });
  // THE CHAPEL — an altar under the window, banners either side
  d.place("altar", 20, 1, { side: "n" }).place("banner", 18, 1, { side: "n" }).place("banner", 22, 1, { side: "n" });
  // THE NARTHEX — the font by the door
  d.place("font", 14, 1, { side: "n" });
  // THE BELL TOWER — the ropes hang to the floor
  d.place("chainLoose", 3, 2).place("chainLoose", 5, 2).place("chainLoose", 3, 4).place("chainLoose", 5, 4);

  d.clutter({ density: .44, seed: 21, kinds: FURNISH, where: (x, z) => !BOSS(x, z) });
  d.clutter({ density: .44, seed: 22, kinds: WALKABLE, where: BOSS });
  d.clutter({ density: .1, seed: 23, interior: true, kinds: ["glass", "rubble", "candelabra", "bonesLoose"] });
  // THE LIGHT — candle stands in the rooms the torches do not reach (glow only: level 2 is recorded by the boss trace)
  for (const [x, z] of [[26, 1], [31, 1], [27, 7], [1, 19], [5, 22], [9, 22], [29, 19], [25, 22]]) d.place("votive", x, z);
  return d.specs;
}

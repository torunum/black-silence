import type { Decorator } from "../decor/place";
import type { Room } from "../authoring/Plan";

/**
 * LEVEL 1 — THE GOTHIC DUNGEON, dressed (levels-feel-full plan Task 2; rebuilt for the deeper-levels plan, Task 3).
 *
 * The rooms are new, the dressing is the old level's vocabulary put where the new rooms ask for it. Every placement goes through the
 * kit's `Decorator`, whose rules throw (or, through `tryPlace`, say no) rather than hide a pickup or wall a corridor:
 *
 *  - THE TORTURE HALL (the arena, floor 0): a rack and the stocks at the north wall either side of the stair mouth, the execution slab
 *    between them, iron maidens against the south wall, cages on chains over the floor. Racks and stocks stand against walls: enemies have
 *    no pathfinding, and one that walks at a player behind a free-standing rack meets its flat face and stays there
 *    (`tests/enemies/stuckCheck.test.ts`, run with `STUCK_PLACES=999`).
 *  - THE UPPER GAOL (the cell block and its three cells): straw, shackles and bones, benches and sconces. Small things.
 *  - THE GUARD ROOM: benches, crate piles, a sconce each side of the stair door. THE ARMOURY: crate piles round three walls.
 *  - THE WARD (the Guardian's): an altar under banners, candelabra in the corners; THE WAY OUT: crates and rubble round the pad.
 *  - THE UNDERCROFT and the closet: bones, chains, rubble, skulls, more of it the lower it is.
 *  - THE LIGHT: braziers (glow only; a real light is a budget, `tests/world/lightBudget.test.ts`) in the halls the torches do not reach.
 *
 * **Nothing solid in the upper gaol** (the spawn cell, the cell block and its cells): the combat trace starts at the spawn and fights in the
 * cell block (`UPPER_GAOL` in `tests/world/levelDressing.test.ts`), so only what can be walked through goes there.
 *
 * Nothing is dressed on a doorway, the stair mouths, or within a cell of a pickup, as the kit's rules say.
 */

export interface Rooms {
  spawn: Room; block: Room; guard: Room; undercroft: Room; closet: Room; hall: Room; armoury: Room; ward: Room; exit: Room; hoard1: Room; hoard2: Room;
}

/** A mass the clutter pass stood where an enemy walking at a player meets its flat face (`tests/enemies/stuckCheck.test.ts`): taken out. */
export const PINNERS_1: readonly string[] = [];

/** The dungeon vocabulary without its one solid piece: what may go in the upper gaol, where the combat trace walks and fights (`tests/integration/combatTrace.test.ts`). */
const WALKABLE = ["straw", "rubble", "bonesLoose", "skullpile", "chainLoose", "shackles", "cage", "sconce", "bench"];

export function dressLevel1(d: Decorator, r: Rooms): void {
  const { block, guard, undercroft, closet, hall, armoury, ward, exit } = r;
  const note = (e: string | null, what: string): void => { if (e) console.log(`DRESS ${what}: ${e}`); };

  // THE TORTURE HALL (x 24-42, z 18-30; the stair comes in at x 36)
  note(d.tryPlace("rack", 27, 18, { r: 0 }), "rack");
  note(d.tryPlace("stocks", 29, 18, { r: 0 }), "stocks");
  note(d.tryPlace("slab", 32, 18, { r: 0 }), "slab");
  note(d.tryPlace("rack", 39, 18, { r: 0 }), "second rack");
  for (const x of [28, 32, 39]) note(d.tryPlace("maiden", x, 30, { side: "s" }), `maiden ${x}`);
  for (const [x, z] of [[27, 22], [31, 21], [30, 25], [35, 22], [37, 26], [33, 27], [41, 21]]) d.tryPlace("cage", x, z);

  // THE WARD: the Guardian's altar
  note(d.tryPlace("altar", ward.x0 + 8, ward.z0, { side: "n" }), "altar");
  for (const x of [ward.x0 + 3, ward.x0 + 5, ward.x0 + 7, ward.x0 + 11]) d.tryPlace("banner", x, ward.z0, { side: "n" });
  d.tryPlace("candelabra", ward.x0 + 1, ward.z0 + 1); d.tryPlace("candelabra", ward.x1 - 1, ward.z0 + 1);

  // THE ARMOURY: a store
  for (const x of [armoury.x0 + 1, armoury.x0 + 4, armoury.x0 + 7]) d.tryPlace("cratepile", x, armoury.z1, { side: "s" });
  d.tryPlace("cratepile", armoury.x1, armoury.z0 + 2, { side: "e" });
  d.tryPlace("cratepile", armoury.x1, armoury.z0 + 6, { side: "e" });
  for (const x of [armoury.x0 + 2, armoury.x0 + 6]) d.tryPlace("bench", x, armoury.z0, { side: "n" });

  // THE GUARD ROOM
  for (const z of [guard.z0 + 3, guard.z0 + 6]) d.tryPlace("bench", guard.x1, z, { side: "e" });
  d.tryPlace("cratepile", guard.x0 + 2, guard.z1, { side: "s" }); d.tryPlace("cratepile", guard.x0 + 6, guard.z1, { side: "s" });
  d.tryPlace("sconce", 35, 12, { side: "s" }); d.tryPlace("sconce", 37, 12, { side: "s" });

  // THE WAY OUT
  for (const x of [exit.x0 + 3, exit.x0 + 7]) d.tryPlace("cratepile", x, exit.z1, { side: "s" });
  d.tryPlace("cratepile", exit.x0 + 5, exit.z0, { side: "n" });
  d.clutter({ density: .5, seed: 11, kinds: ["rubble", "skullpile", "bonesLoose"], where: (x, z) => exit.contains(x, z) });

  // THE CELLS: straw, shackles, bones
  for (const [x0, z0, x1] of [[11, 9, 15], [17, 9, 21], [23, 9, 27]]) {
    d.tryPlace("shackles", x0 + 2, z0 + 3, { side: "s" });
    d.tryPlace("straw", x0 + 1, z0 + 2); d.tryPlace("straw", x1 - 1, z0 + 1);
  }
  d.tryPlace("bench", block.x0 + 12, block.z0, { side: "n" });
  d.tryPlace("bench", block.x0 + 5, block.z1, { side: "s" });

  // clutter: the rest, by the area. Nothing solid goes where it was filtered out (`PINNERS_1`).
  d.clutter({ density: .34, seed: 5, kinds: WALKABLE, where: (x, z) => block.contains(x, z) });
  d.clutter({ density: .3, seed: 5, where: (x, z) => guard.contains(x, z) || armoury.contains(x, z) || ward.contains(x, z) });
  d.clutter({ density: .45, seed: 6, kinds: ["rubble", "skullpile", "bonesLoose", "chainLoose", "straw", "shackles"], where: (x, z) => undercroft.contains(x, z) || closet.contains(x, z) });
  d.clutter({ density: .3, seed: 7, where: (x, z) => hall.contains(x, z) && x !== 36 });
  // the floors of the big rooms, which have no wall beside them: only what lies on the floor or hangs over it, nothing solid
  const FLOOR = ["straw", "skullpile", "bonesLoose", "chainLoose", "rubble", "cage"];
  d.clutter({ density: .2, seed: 8, kinds: FLOOR, interior: true, where: (x, z) => hall.contains(x, z) || block.contains(x, z) || guard.contains(x, z) || armoury.contains(x, z) });
  d.clutter({ density: .3, seed: 12, kinds: FLOOR, interior: true, where: (x, z) => ward.contains(x, z) || exit.contains(x, z) || undercroft.contains(x, z) || closet.contains(x, z) });
  d.clutter({ density: .55, seed: 9, kinds: ["skullpile", "bonesLoose", "rubble", "straw"], where: (x, z) => r.hoard1.contains(x, z) || r.hoard2.contains(x, z) });

  // THE LIGHT: glow only (braziers), where the torches leave a room dark
  for (const [x, z] of [[11, 3], [24, 6], [8, 7], [34, 9], [43, 3], [25, 19], [41, 19], [24, 29], [42, 29], [45, 18], [53, 26], [45, 26], [46, 32], [56, 32], [56, 40], [33, 40], [40, 34],
    [5, 15], [16, 20], [12, 22], [20, 22], [20, 26]]) d.tryPlace("brazier", x, z);
}

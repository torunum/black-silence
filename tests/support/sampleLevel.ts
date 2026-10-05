import { LevelPlan } from "../../src/world/authoring/Plan";
import type { BuiltLevel } from "../../src/world/LevelBuilder";

/**
 * THE WELL — a small level written with the toolkit (deeper-levels plan, Task 2): the example the authoring layer is
 * shown by, and the fixture its tests and the structure tests run through. 40 x 28, one theme, every feature once:
 *
 *  - six rooms: the cell (spawn), the hall, the gallery (floor 1.8) and the loft (2.4, with a raised ceiling) above it, the
 *    vault (the exit) and the cache behind a secret door;
 *  - two corridors between the cell and the hall, one with a plain door: a loop;
 *  - the way up from the hall to the gallery is three steps of 0.45; the gallery reaches the loft through a door and a
 *    corridor graded from 1.8 to 2.4;
 *  - the red key is in the loft; the vault's door is locked; the exit is in the vault. So the way through is: cell,
 *    hall, up to the loft for the key, back down, through the locked door to the vault: 95 steps, 52 of them the detour for the key;
 *  - the cache (a secret door off the corridor along the south) holds the reward and is not on the way;
 *  - a shrine in the hall beside the vault's door, which every way to the exit passes.
 *
 * `tests/world/authoring.test.ts` holds every one of those sentences to the grid; `tests/world/authoringLoad.test.ts` loads it into the game.
 */
export function buildWell(): BuiltLevel {
  const lv = new LevelPlan(40, 28, "dungeon");
  const cell = lv.room("cell", { x: 2, z: 19, w: 6, h: 5 });
  const hall = lv.room("hall", { x: 14, z: 10, w: 12, h: 10 });
  const gallery = lv.room("gallery", { x: 14, z: 3, w: 12, h: 4, floor: 1.8 });
  const loft = lv.room("loft", { x: 30, z: 3, w: 7, h: 6, floor: 2.4, ceil: 5 });
  const vault = lv.room("vault", { x: 30, z: 14, w: 6, h: 6 });
  const cache = lv.room("cache", { x: 15, z: 23, w: 5, h: 3 });

  lv.corridor(cell, hall, { bend: "hv", door: "plain" });                                  // A: along the south, up into the hall
  lv.corridor(cell, hall, { bend: "vh", via: [[4, 16]] });                                 // B: up from the cell, east into the hall: a loop
  lv.corridor(hall, gallery, { bend: "vh", grade: false });                                // the way up...
  lv.stairs(19, 9, 19, 7);                                                                  // ...as three steps, 0.45 each (the floors either side, inferred)
  lv.corridor(gallery, loft, { door: "plain" });                                           // graded 1.8 -> 2.4 along its four cells
  lv.corridor(hall, vault, { door: "locked" });                                            // the red key's door
  lv.door(17, 22, "secret");                                                               // off corridor A, into the cache

  lv.spawn(cell.at(1, 1)).light("i", cell.at(4, 3));
  lv.enemy("f", hall.at(3, 2), hall.at(8, 7)).enemy("g", gallery.at(5, 2)).enemy("m", loft.at(3, 3)).enemy("s", vault.at(2, 3));
  lv.pickup("h", hall.at(1, 8)).pickup("a", hall.at(10, 1)).pickup("b", loft.at(5, 4)).pickup("a", vault.at(1, 1));
  lv.prop("x", hall.at(6, 4)).prop("O", hall.at(9, 6));
  lv.key(loft.at(5, 1)).exit(vault.at(5, 3));
  lv.pickup("r", cache.at(1, 1)).pickup("h", cache.at(3, 1));                              // the reward

  lv.set("braziers", hall).set("store", vault).clutter({ density: .3, seed: 3 });
  lv.checkpoint(hall.at(11, 3), { side: "e" });                                            // by the vault's door: every way to the exit passes it
  return lv.build();
}

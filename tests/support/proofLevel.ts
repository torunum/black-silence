import { LevelPlan, type Room } from "../../src/world/authoring/Plan";
import type { BuiltLevel } from "../../src/world/LevelBuilder";

/**
 * THE CHARNEL STAIR — a level written with the toolkit to meet every target a rebuilt level is held to
 * (`src/world/structure/targets.ts`; deeper-levels plan, Task 2). It is not a level of the game: it is the proof that
 * the toolkit can build one, that the targets are reachable together, and the pattern Tasks 3-9 start from. It is
 * held to `checkTargets(3, ...)` as if it were a rebuilt level 3 (an old critical path of 44, so 80 to 132 steps).
 *
 * A 4 x 3 lattice of rooms (9 x 7), three floors, six hops of the way through and a dead end with the key off it:
 *
 *                 col 0        col 1        col 2        col 3
 *   floor 0   row 0  spawn ═══ hall ═══╤═══ crypt          .
 *                    ║                 ║
 *   floor 1.8 row 1  key room        (locked) ═══ nave ═══ ARENA (a boss and his guard)
 *                                      ║
 *   floor 3.6 row 2  .             ossuary ═══ EXIT
 *
 * with a second link between the spawn room and the hall (the loop), two secrets (a cache off the hall, another off
 * the nave) and a shrine in the corridor every route takes, halfway.
 */
export function buildCharnel(): BuiltLevel {
  const lv = new LevelPlan(62, 40, "necropolis");
  const at = (c: number, r: number, floor: number, name: string): Room => lv.room(name, { x: 3 + 15 * c, z: 3 + 13 * r, w: 9, h: 7, floor });
  const spawn = at(0, 0, 0, "spawn"), hall = at(1, 0, 0, "hall"), crypt = at(2, 0, 0, "crypt");
  const keyRoom = at(0, 1, 1.8, "key room"), nave = at(2, 1, 1.8, "nave"), arena = at(3, 1, 1.8, "arena"), locked = at(1, 1, 1.8, "sepulchre");
  const ossuary = at(1, 2, 3.6, "ossuary"), exit = at(2, 2, 3.6, "exit hall");
  const cache = lv.room("cache", { x: 39, z: 11, w: 5, h: 3 });
  const cache2 = lv.room("second cache", { x: 34, z: 24, w: 5, h: 3, floor: 1.8 });

  lv.corridor(spawn, hall, { door: "plain" });
  lv.corridor(spawn.at(8, 6), hall, { bend: "vh", via: [[11, 11], [22, 11]] });             // the second way, round the south: the loop
  lv.corridor(hall, crypt);
  lv.corridor(spawn, keyRoom);                                                              // the dead end with the key
  lv.corridor(crypt, nave);                                                                  // down to the second floor
  lv.corridor(nave, arena);
  lv.corridor(nave, locked, { door: "locked" });                                            // the red key's door
  lv.corridor(locked, ossuary);                                                              // up to the third floor
  lv.corridor(ossuary, exit);
  lv.door(40, 10, "secret");                                                                 // crypt -> cache
  lv.door(36, 23, "secret");                                                                 // nave -> second cache

  lv.spawn(spawn.at(1, 1)).light("i", spawn.at(7, 1));
  lv.key(keyRoom.at(4, 3)).enemy("f", keyRoom.at(2, 2), keyRoom.at(6, 4));
  lv.enemy("z", hall.at(3, 2), hall.at(6, 4)).enemy("g", crypt.at(4, 3)).enemy("m", nave.at(3, 3)).enemy("f", nave.at(6, 2));
  lv.enemy("E", arena.at(4, 3)).enemy("f", arena.at(1, 1), arena.at(7, 1), arena.at(1, 5), arena.at(7, 5));
  lv.enemy("z", locked.at(4, 3)).enemy("s", ossuary.at(3, 3), ossuary.at(5, 4));
  lv.pickup("a", spawn.at(7, 5), hall.at(1, 5), crypt.at(7, 1), nave.at(1, 5)).pickup("h", hall.at(7, 1), crypt.at(1, 5), nave.at(7, 5)).pickup("r", crypt.at(4, 1));
  lv.pickup("a", ossuary.at(1, 1)).pickup("h", exit.at(1, 1)).pickup("b", ossuary.at(7, 5));
  lv.pickup("r", cache.at(1, 1)).pickup("c", cache.at(3, 1)).pickup("h", cache.at(2, 2));
  lv.pickup("o", cache2.at(1, 1)).pickup("b", cache2.at(3, 1)).pickup("r", cache2.at(2, 2));
  lv.exit(exit.at(7, 3));
  lv.checkpoint([30, 6], { side: "n" });                                                       // in the corridor from the hall to the crypt: every route passes it, about halfway
  lv.set("ossuary", hall).set("ossuary", crypt).clutter({ density: .25, seed: 9 });
  return lv.build();
}

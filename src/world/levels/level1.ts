import type { BuiltLevel } from "../LevelBuilder";
import { LevelPlan } from "../authoring/Plan";
import { dressLevel1, PINNERS_1 } from "./dress1";

/**
 * LEVEL 1 — THE GOTHIC DUNGEON, rebuilt (deeper-levels plan, Task 3): the template the other levels follow.
 *
 * The reference's level 1 (a start chamber, one dog-legged corridor, one great hall with its wings run into it, a vestry, an exit
 * chamber: 42 steps from the spawn to the exit, no loop, no height, a key that opened nothing) is gone, on purpose: the owner asked for
 * longer levels, a little more complex ("make the levels longer and a bit more complex", 2026-10-05). `tests/fidelity.test.ts` records
 * the divergence and pins this level in the reference's place. It is written with `LevelPlan` (`src/world/authoring/Plan.ts`) and held to the
 * numbers a rebuilt level must meet (`src/world/structure/targets.ts`, `docs/level-structure.md`).
 *
 * It is a descent, in three tiers (the floor is raised, never sunk: the loader draws no floor below 0):
 *
 *   tier 2.4 (the upper gaol)    spawn cell -> the cell block (a hall, three cells off it, two ways on)
 *   tier 1.2 (the warders')      the guard room, with its hoard behind a secret door
 *   tier 0   (the dungeon)       the great torture hall (the arena), the torturer's closet, the armoury behind the iron gate,
 *                                the boss's ward and the way out; and below the cell block, the UNDERCROFT, a long ramp down
 *                                from the block's west end: a drowned vault with the red key at its far end, and a second hoard
 *
 *   - THE WAY: spawn -> block -> (the key: down the ramp and back) -> guard room, by either of two passages (the loop: along the
 *     block, or through the warden's cell) -> the one stair down to the hall, where the shrine stands -> the hall -> the iron gate
 *     (locked: the key opens it) -> the armoury -> the ward (THE CATHEDRAL GUARDIAN) -> the way out.
 *   - Everything that needs a door has it on floor 0 or 1.2: a door is a full-height slab, and on a 2.4 floor it would stand to the eye.
 *     The upper gaol has doorways, not doors.
 *   - The roster is the old level's (`z f g m t s j`, and the Guardian `U`); the supply, the rooms and the ground are new.
 *
 * Dressing is in `dress1.ts`; the encounters are argued in `docs/level-structure.md` (what each fight is worth against what can have
 * been found by then) and `.superpowers/sdd/2026-10-05-deeper-levels/task-3-report.md`.
 */
export const W = 58, H = 44;
export const UP = 2.4, MID = 1.2;

export function buildLevel1(): BuiltLevel {
  const lv = new LevelPlan(W, H, "dungeon").headroom(3);

  // ---- the upper gaol (2.4)
  const spawn = lv.room("cell", { x: 2, z: 3, w: 5, h: 4, floor: UP });
  const block = lv.room("cell block", { x: 8, z: 2, w: 20, h: 6, floor: UP });
  const cellB = lv.room("cell B", { x: 11, z: 9, w: 5, h: 4, floor: UP });
  const cellC = lv.room("cell C", { x: 17, z: 9, w: 5, h: 4, floor: UP });
  const wardenCell = lv.room("warden's cell", { x: 23, z: 9, w: 5, h: 4, floor: UP });
  lv.carve(7, 5, 7, 5, UP);                                 // the doorway out of the spawn cell
  for (const x of [13, 19, 25]) lv.carve(x, 8, x, 8, UP);   // a doorway into each cell
  // ---- the warders' tier (1.2)
  const guard = lv.room("guard room", { x: 34, z: 3, w: 10, h: 9, floor: MID });
  // ---- the dungeon (0)
  const undercroft = lv.room("undercroft", { x: 3, z: 14, w: 14, h: 9 });
  const closet = lv.room("torturer's closet", { x: 18, z: 21, w: 5, h: 7 });
  const hall = lv.room("great hall", { x: 24, z: 18, w: 19, h: 13 });
  const armoury = lv.room("armoury", { x: 45, z: 18, w: 9, h: 9 });
  const ward = lv.room("ward", { x: 44, z: 31, w: 13, h: 11 });
  const exit = lv.room("way out", { x: 30, z: 33, w: 11, h: 8 });
  const hoard1 = lv.room("warders' hoard", { x: 45, z: 5, w: 5, h: 5 });
  const hoard2 = lv.room("drowned ossuary", { x: 5, z: 24, w: 9, h: 4 });

  lv.corridor(block.at(1, 5), undercroft, { bend: "vh" });  // the ramp: 2.4 down to 0 over seven cells, under the cell block's west end
  lv.door(9, 13, "plain");                                  // a hatch at its foot
  lv.corridor(block.at(19, 2), guard);                      // the north passage: along the block
  lv.corridor(wardenCell.at(4, 2), guard);                  // the south passage: through the warden's cell: the loop
  lv.door(33, 4, "plain"); lv.door(33, 11, "plain");
  lv.corridor([36, 11], [36, 18]);                          // the one stair down to the hall
  lv.door(36, 12, "plain");
  lv.door(23, 24, "plain");                                 // the closet
  lv.corridor(hall.at(18, 6), armoury, { door: "locked" }); // the iron gate
  lv.corridor(armoury.at(4, 8), ward, { door: "plain" });
  lv.corridor(ward, exit, { door: "plain" });
  lv.door(44, 7, "secret");                                 // the guard room -> the warders' hoard
  lv.door(9, 23, "secret");                                 // the undercroft -> the drowned ossuary
  lv.pillars(hall, 4);

  // ---- the player, the key, the way out
  lv.spawn(spawn.at(1, 2)).key(undercroft.at(9, 3)).exit(exit.at(1, 3));

  // ---- the quiet: the spawn cell and the cell block's west end hold nothing. Then the rising fights.
  lv.enemy("z", block.at(13, 1), block.at(17, 4));                                  // the cell block
  lv.enemy("s", cellC.at(3, 2));
  lv.enemy("g", undercroft.at(6, 4), undercroft.at(10, 6)).enemy("t", undercroft.at(11, 4));   // the undercroft
  lv.enemy("j", guard.at(7, 2)).enemy("f", guard.at(3, 6)).enemy("m", guard.at(5, 3));   // the guard room
  lv.enemy("z", hall.at(9, 4), hall.at(15, 5), hall.at(1, 10)).enemy("m", hall.at(8, 8)).enemy("j", hall.at(12, 7))
    .enemy("f", hall.at(2, 6)).enemy("g", hall.at(15, 11)).enemy("s", hall.at(2, 9));   // the hall: the arena
  lv.enemy("s", closet.at(2, 3));
  lv.enemy("m", armoury.at(5, 3)).enemy("t", armoury.at(2, 6)).enemy("z", armoury.at(7, 6));
  lv.enemy("U", ward.at(7, 3));           // the ward: the Guardian

  // ---- the supply
  lv.pickup("a", block.at(2, 1), block.at(10, 4), cellB.at(2, 1), cellC.at(1, 1)).pickup("h", block.at(16, 5)).pickup("h", wardenCell.at(2, 1));
  lv.pickup("a", undercroft.at(2, 2), undercroft.at(11, 1)).pickup("h", undercroft.at(13, 1));
  lv.pickup("2", guard.at(1, 1)).pickup("a", guard.at(8, 7)).pickup("h", guard.at(2, 4), guard.at(5, 7)).pickup("b", guard.at(8, 1));
  lv.pickup("a", hall.at(16, 1), hall.at(16, 11)).pickup("h", hall.at(15, 2)).pickup("r", hall.at(14, 1)).pickup("h", hall.at(2, 11), hall.at(16, 5)).pickup("b", hall.at(2, 2));
  lv.pickup("r", closet.at(3, 5)).pickup("a", closet.at(1, 1));
  lv.pickup("3", armoury.at(7, 1)).pickup("a", armoury.at(1, 1), armoury.at(1, 7)).pickup("b", armoury.at(7, 7)).pickup("h", armoury.at(3, 3)).pickup("r", armoury.at(2, 2));
  lv.pickup("a", ward.at(1, 1)).pickup("h", ward.at(11, 1), ward.at(1, 9), ward.at(11, 9)).pickup("r", ward.at(6, 9));
  lv.pickup("r", hoard1.at(1, 1)).pickup("c", hoard1.at(3, 1)).pickup("h", hoard1.at(2, 3)).pickup("b", hoard1.at(3, 3));
  lv.pickup("a", hoard2.at(1, 1), hoard2.at(7, 1)).pickup("o", hoard2.at(3, 2)).pickup("h", hoard2.at(5, 2));
  lv.prop("O", hall.at(4, 4), hall.at(14, 6)).prop("x", armoury.at(4, 5));

  // ---- the light: torches (real lights: the level's budget is 17 of them with the exit and the windows), then glow in dress1.ts
  lv.light("i", spawn.at(3, 0), block.at(6, 0), block.at(14, 0), block.at(19, 5), guard.at(1, 8), guard.at(8, 0), undercroft.at(5, 8),
    hall.at(1, 4), hall.at(17, 8), hall.at(9, 12), armoury.at(0, 4), ward.at(1, 2), exit.at(9, 0));

  lv.dress((d) => dressLevel1(d, { spawn, block, guard, undercroft, closet, hall, armoury, ward, exit, hoard1, hoard2 }));
  lv.checkpoint([36, 14], { side: "w" });   // the stair down to the hall: every route passes it, at 55% of the way
  lv.checkpoint([50, 29], { side: "w" });   // the passage to the ward: the last shrine before the Guardian
  const L = lv.build();
  if (PINNERS_1.length) L.decor = L.decor!.filter((s) => !PINNERS_1.includes(`${s.k}@${Math.floor(s.x + .5)},${Math.floor(s.z + .5)}`));
  return L;
}

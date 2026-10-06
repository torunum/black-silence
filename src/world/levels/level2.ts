import type { BuiltLevel } from "../LevelBuilder";
import { LevelPlan } from "../authoring/Plan";
import { dressLevel2, PINNERS_2 } from "./dress2";

/**
 * LEVEL 2 — THE ABANDONED CHURCH, rebuilt (deeper-levels plan, Task 4).
 *
 * The reference's church was a 4 x 4 lattice of seven-by-five rooms round a merged nave: a ring walk, one flat floor, 66 steps from the
 * spawn to the exit, a red key found 32 steps off the way, one secret. It is gone, on purpose (the owner, 2026-10-05: "make the levels longer
 * and a bit more complex"); `tests/fidelity.test.ts` records the divergence and pins this level in its place. It is written with `LevelPlan`
 * and held to the numbers a rebuilt level must meet (`src/world/structure/targets.ts`, `docs/level-structure.md`).
 *
 * A church, east to west: the narthex where the player comes in, the nave with its pews, the chancel where the priest waits at the altar.
 * The floor is raised, never sunk (the loader draws none below 0), so the church stands at 1.2 and what lies beneath it at 0:
 *
 *   floor 3.6   the belfry (the top of the bell tower: the red key)
 *   floor 2.4   the choir loft (the gallery over the chancel's north side: the organ)
 *   floor 1.2   the church: narthex, nave and its aisles, the chancel, the side chapels, the sacristy, the ringing chamber, the reliquary
 *   floor 0     the crypt beneath the sacristy, and the ossuary behind its secret door
 *
 *   - THE WAY: the narthex -> the bell tower (a long ramp up its two runs, the key at the top: the key hunt) -> back down -> the narthex's grand doors
 *     (locked: the key opens them) -> the nave (the arena: pews, an arcade, eight of the dead) -> down into the crypt (the Guardian) by the short ramp at the nave's
 *     south aisle -> the stair up into the sacristy -> the passage to the chancel -> the Priest at his altar. The nave and the chancel are not joined: between them stands a
 *     rood screen of five pillars, which the player sees the altar through and cannot pass, and the way to the Priest is under the church and up behind it.
 *     The Priest's death opens the exit (`openExit`: the first open cell of `EXIT_CELLS`, which is (16,16), in the chancel), so the chancel is where the grid's cell (16,16) is.
 *   - THE LOOP: the nave reaches the crypt twice, by the short ramp and by the long one through the south chapel.
 *   - THE CHECKPOINTS: the grand doors (every route to the nave passes them, key in hand: 57% of the way), the head of the short ramp, and the sacristy's passage (the last, before the Priest).
 *   - Everything that needs a door has it on floor 0 or 1.2: a door is a full-height slab, and on a 2.4 floor it would stand to the eye. The
 *     choir loft and the belfry have doorways, not doors.
 *   - Level 2 has no Foreman and no Mancubus (KNOWN-4, KNOWN-11): a pew is `v`, armour is `r`; and no chair (`C` is a Cacodemon): the
 *     priest's chambers' one chair is gone with the chambers.
 *   - The roster is the old church's (`z f g m t w s`, the Guardian `U`, the Priest `Q`).
 *
 * Dressing is in `dress2.ts`; the encounters are argued in `docs/level-structure.md` and `.superpowers/sdd/2026-10-05-deeper-levels/task-4-report.md`.
 */
export const W = 64, H = 46;
export const CH = 1.2, LOFT = 2.4, TOWER = 3.6;

export function buildLevel2(): BuiltLevel {
  const lv = new LevelPlan(W, H, "church").headroom(3);

  // ---- the church (1.2)
  const narthex = lv.room("narthex", { x: 54, z: 18, w: 8, h: 11, floor: CH, ceil: 5.6 });
  const nave = lv.room("nave", { x: 26, z: 14, w: 24, h: 15, floor: CH, ceil: 6.6 });
  const chancel = lv.room("chancel", { x: 14, z: 14, w: 11, h: 9, floor: CH, ceil: 7.4 });
  const ringing = lv.room("ringing chamber", { x: 52, z: 11, w: 10, h: 3, floor: CH });
  const chapelA = lv.room("north chapel", { x: 27, z: 6, w: 9, h: 5, floor: CH });
  const chapelB = lv.room("lady chapel", { x: 38, z: 6, w: 9, h: 5, floor: CH });
  const reliquary = lv.room("reliquary", { x: 48, z: 6, w: 3, h: 5, floor: CH });
  const sacristy = lv.room("sacristy", { x: 14, z: 27, w: 11, h: 6, floor: CH });
  const southChapel = lv.room("south chapel", { x: 38, z: 32, w: 9, h: 6, floor: CH });
  // ---- above it
  const belfry = lv.room("belfry", { x: 52, z: 2, w: 10, h: 4, floor: TOWER });
  const loft = lv.room("choir loft", { x: 14, z: 4, w: 11, h: 6, floor: LOFT });
  // ---- beneath it (0)
  const crypt = lv.room("crypt", { x: 4, z: 36, w: 31, h: 8 });
  const ossuary = lv.room("ossuary", { x: 3, z: 29, w: 9, h: 6 });

  // ---- the doors and the ways between
  lv.corridor([57, 18], [57, 13], { door: "plain" });                     // narthex -> the tower's foot
  lv.corridor([54, 23], [49, 23], { door: "locked" });                    // the grand doors: the nave (the red key)
  lv.carve(25, 19, 25, 23, CH);                                           // the rood screen: five pillars, between the nave and the chancel, which are seen through it and not walked
  lv.corridor([19, 22], [19, 27], { door: "plain" });                     // chancel -> sacristy
  lv.corridor([31, 10], [31, 14], { door: "plain" });                     // north chapel -> nave
  lv.corridor([42, 10], [42, 14], { door: "plain" });                     // lady chapel -> nave
  lv.corridor([42, 32], [42, 28], { door: "plain" });                     // south chapel -> nave
  lv.corridor([27, 8], [24, 8]);                                          // the loft's stair: three steps up from the north chapel
  lv.corridor([21, 32], [21, 36]);                                        // the sacristy's stair down to the crypt
  lv.corridor([34, 40], [42, 37], { via: [[42, 40]] });                   // the crypt's long ramp up to the south chapel
  lv.corridor([31, 36], [31, 28]);                                        // and its short one, up to the nave's south aisle: the way the Priest's is reached by
  lv.door(47, 8, "secret");                                               // lady chapel -> the reliquary
  lv.door(7, 35, "secret");                                               // crypt -> the ossuary
  // the bell tower: from the ringing chamber a ramp climbs, in two runs, to the belfry
  lv.corridor([56, 12], [56, 3], { via: [[60, 12], [60, 9], [53, 9], [53, 7], [60, 7], [60, 3]] });
  // the nave's arcade
  for (const z of [17, 25]) for (let x = 28; x <= 46; x += 3) lv.put("I", x, z);
  for (let z = 19; z <= 23; z++) lv.put("I", 25, z);

  // ---- the player, the key, the way out (the priest's death opens the cell (16,16) in the chancel)
  lv.spawn([60, 22]).key([52, 3]);
  lv.enemy("Q", [19, 18]);

  // ---- the quiet: the narthex holds nothing. Then, up the tower: two in the ringing chamber, one on each run of the ramp, three in the belfry
  lv.enemy("z", [53, 12]).enemy("w", [61, 13]).enemy("t", [53, 11]);                      // the ringing chamber
  lv.enemy("f", [56, 9]).enemy("g", [57, 7]);                                            // the ramp
  lv.enemy("s", [57, 3]).enemy("t", [58, 4]).enemy("z", [54, 4]);                        // the belfry
  // ---- the nave: the arena. Nine of the dead among the pews, the nearest of them eight cells from the grand doors
  lv.enemy("z", [42, 22], [39, 20]).enemy("f", [36, 26]).enemy("w", [36, 16]).enemy("m", [33, 21])
    .enemy("g", [44, 15]).enemy("w", [45, 27]).enemy("s", [29, 15]);
  lv.enemy("z", [33, 8]).enemy("s", [29, 7]);                                            // the north chapel
  lv.enemy("t", [44, 8]).enemy("g", [40, 9]);                                            // the lady chapel
  lv.enemy("t", [20, 5]).enemy("w", [17, 8]);                                            // the choir loft
  lv.enemy("m", [16, 29]).enemy("z", [22, 29]).enemy("f", [19, 31]);                     // the sacristy
  lv.enemy("U", [27, 40]).enemy("g", [12, 39], [14, 41]).enemy("w", [8, 38], [9, 42]).enemy("z", [29, 38], [30, 42]);   // the crypt: the Guardian
  lv.enemy("z", [40, 34]).enemy("t", [45, 34]);                                          // the south chapel

  // ---- the supply
  lv.pickup("h", [55, 26]).pickup("a", [61, 20]);                                        // the narthex
  lv.pickup("a", [52, 11]).pickup("h", [61, 11]);                                        // the ringing chamber
  lv.pickup("h", [53, 8]).pickup("a", [60, 6]);                                          // the ramp
  lv.pickup("5", [53, 2]).pickup("o", [54, 2], [60, 2]).pickup("h", [61, 3]).pickup("a", [61, 5]);   // the belfry: the sniper rifle
  lv.pickup("a", [48, 15], [28, 16], [28, 26]).pickup("h", [48, 27], [27, 22]).pickup("r", [27, 21]).pickup("b", [47, 21]);   // the nave
  lv.pickup("a", [28, 10]).pickup("h", [34, 6]).pickup("b", [28, 6]);                    // the north chapel
  lv.pickup("h", [39, 6]).pickup("a", [45, 10]).pickup("b", [39, 10]);                   // the lady chapel
  lv.pickup("4", [49, 8]).pickup("r", [49, 6]).pickup("c", [49, 10]).pickup("h", [48, 7]);   // the reliquary
  lv.pickup("a", [15, 5]).pickup("h", [23, 5]).pickup("b", [23, 9]);                     // the choir loft
  lv.pickup("6", [15, 20]).pickup("c", [16, 21], [22, 15]).pickup("h", [22, 21], [24, 21], [24, 19], [17, 22]).pickup("r", [15, 22]).pickup("o", [23, 20]).pickup("a", [22, 16], [15, 16], [20, 15], [24, 17]).pickup("b", [23, 17]);   // the chancel
  lv.pickup("r", [15, 32]).pickup("h", [23, 31], [16, 28]).pickup("b", [14, 27]).pickup("a", [24, 27], [23, 28], [20, 31], [15, 30]).pickup("o", [22, 28], [17, 31]);   // the sacristy
  lv.pickup("a", [5, 37], [5, 43]).pickup("h", [6, 41], [33, 43]).pickup("r", [33, 37]).pickup("o", [20, 42]);   // the crypt
  lv.pickup("a", [4, 30], [10, 33]).pickup("o", [10, 30]).pickup("h", [4, 33]).pickup("c", [7, 32]);   // the ossuary
  lv.pickup("a", [39, 37]).pickup("h", [45, 37]).pickup("b", [40, 33]);                  // the south chapel
  lv.prop("F", [14, 29], [14, 31]);                                                    // the sacristy: shelves against the west wall
  lv.prop("x", [36, 40]).prop("O", [13, 36]);                                            // the crypt: a crate, a barrel
  // the nave's pews: two blocks a side of the aisle, the crossing between them (nine cells wide: where the transept would be)
  for (const z of [19, 23]) for (const x of [29, 31, 33, 43, 45, 47]) lv.prop("v", [x, z]);

  // ---- the light: torches (real lights: 17 is the budget with the windows), then glow in dress2.ts
  lv.light("i", [61, 19], [57, 15], [57, 9], [26, 19], [17, 29], [10, 37], [28, 37]);
  for (const x of [29, 36, 46]) { lv.window(x, 13); lv.window(x, 29); }
  lv.window(13, 16).window(13, 20).window(57, 1);   // the chancel's two, either side of the altar
  lv.light("p", [19, 4]);   // the organ, in the choir loft
  lv.light("l", [54, 18], [61, 28], [27, 7], [35, 10], [39, 8], [45, 7], [18, 7], [24, 5]);

  const rooms = { narthex, nave, chancel, ringing, chapelA, chapelB, reliquary, sacristy, southChapel, belfry, loft, crypt, ossuary };

  lv.dress((d) => dressLevel2(d, rooms));
  lv.checkpoint([52, 23], { side: "n" });   // the grand doors: every route to the nave, with the key in hand
  lv.checkpoint([30, 28], { side: "s" });   // the nave's south aisle, at the head of the short ramp down to the crypt
  lv.checkpoint([20, 27], { side: "n" });   // the sacristy, at the foot of the passage to the chancel: every route to the Priest passes it, and it is the last
  const L = lv.build();
  if (PINNERS_2.length) L.decor = L.decor!.filter((sp) => !PINNERS_2.includes(`${sp.k}@${Math.floor(sp.x + .5)},${Math.floor(sp.z + .5)}`));
  return L;
}

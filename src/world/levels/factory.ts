import type { BuiltLevel } from "../LevelBuilder";
import { LevelPlan } from "../authoring/Plan";
import { dressFactory } from "./dressFactory";

/**
 * LEVEL 6 — THE FACTORY, rebuilt (owner, 2026-10-21: "bölümleri de geliştirelim. hala zayıf duruyorlar"). The reference's factory was
 * the lattice of seven-by-five rooms once more, the same 44 steps through; `tests/fidelity.test.ts` records the divergence. Written with
 * `LevelPlan` and held to the numbers a rebuilt level must meet (`src/world/structure/targets.ts`).
 *
 * The works the parish's money built, still running with no one at the machines. Three floors (raised, never sunk):
 *
 *   floor 2.4   the foreman's office over the press hall, where THE RED KEY is kept
 *   floor 1.2   the press hall; the smelting floor above the casting pit (THE CATHEDRAL GUARDIAN)
 *   floor 0     the loading yard where the player comes in, the boiler house (the arena), the tool crib behind a secret door, the coal
 *               store (THE EXECUTIONER) and the paymaster's safe behind another, the runner and THE CASTING PIT at its end
 *
 *   - THE WAY: the yard -> the boiler house -> up into the press hall -> the foreman's office (the key: the key hunt) -> back -> up into
 *     the smelting floor by either of its two stairs (the loop) -> the runner gate (locked: the key opens it) -> down the runner -> the
 *     casting pit -> THE FACTORY FOREMAN. His death opens the exit at (16,16), in the pit (`DoorSite.ts`'s `EXIT_CELLS`).
 *   - THE WING: the coal store, north of the smelting floor: the Executioner and what he keeps.
 *   - Its three Cacodemons are `C` on purpose (KNOWN-4: a pew is `v`); no `V` but the Foreman, no `A` (KNOWN-11): armour is `r`.
 */
export const W = 58, H = 46;
export const MID = 1.2, UP = 2.4;

export function buildFactory(): BuiltLevel {
  const lv = new LevelPlan(W, H, "factory").headroom(3);

  // ---- 0
  const yard = lv.room("loading yard", { x: 2, z: 35, w: 8, h: 8, ceil: 8 });
  const boiler = lv.room("boiler house", { x: 12, z: 33, w: 16, h: 9, ceil: 7 });
  const crib = lv.room("tool crib", { x: 15, z: 43, w: 8, h: 2 });
  const coal = lv.room("coal store", { x: 36, z: 2, w: 16, h: 8 });
  const pit = lv.room("casting pit", { x: 14, z: 10, w: 13, h: 12, ceil: 9 });
  // ---- 1.2
  const press = lv.room("press hall", { x: 31, z: 30, w: 14, h: 12, floor: MID, ceil: 7 });
  const smelt = lv.room("smelting floor", { x: 36, z: 12, w: 16, h: 12, floor: MID, ceil: 8 });
  const safe = lv.room("paymaster's safe", { x: 53, z: 3, w: 3, h: 5 });
  // ---- 2.4
  const office = lv.room("foreman's office", { x: 48, z: 32, w: 8, h: 6, floor: UP });

  // ---- the ways between
  lv.corridor([9, 38], [12, 38]);                                    // the yard -> the boiler house
  lv.corridor([27, 36], [31, 36], { door: "plain" });                // the boiler house -> up into the press hall
  lv.corridor([44, 34], [48, 34]);                                   // the press hall -> up into the office
  lv.corridor([38, 30], [38, 23], { door: "plain" });                // the press hall -> the smelting floor: the west stair
  lv.corridor([42, 30], [42, 23], { door: "plain" });                //   and the east: the loop
  lv.corridor([44, 12], [44, 9], { door: "plain" });                 // the smelting floor -> down into the coal store: the wing
  lv.corridor([36, 18], pit, { via: [[30, 18]], door: "locked" });   // the runner gate, and the runner down to the casting pit
  lv.door(18, 42, "secret");                                         // the boiler house -> the tool crib
  lv.door(52, 5, "secret");                                          // the coal store -> the paymaster's safe
  // columns: the boiler house's, the press hall's, the smelting floor's, the pit's
  for (const x of [15, 19, 23]) { lv.put("I", x, 35); lv.put("I", x, 39); }
  for (const [x, z] of [[34, 33], [41, 33], [34, 38], [41, 38]]) lv.put("I", x, z);
  for (const x of [40, 44, 48]) { lv.put("I", x, 15); lv.put("I", x, 20); }
  for (const [x, z] of [[17, 13], [23, 13], [17, 19], [23, 19]]) lv.put("I", x, z);

  // ---- the player, the key; the Foreman's death opens (16,16)
  lv.spawn(yard.at(3, 3)).key(office.at(6, 2));
  lv.enemy("V", pit.at(7, 6));

  // ---- the boiler house: the arena
  lv.enemy("j", boiler.at(4, 1), boiler.at(12, 7)).enemy("z", boiler.at(1, 5), boiler.at(9, 3), boiler.at(14, 1)).enemy("m", boiler.at(8, 7))
    .enemy("L", boiler.at(6, 4), boiler.at(13, 4)).enemy("n", boiler.at(10, 5));
  // ---- the press hall, the office
  lv.enemy("j", press.at(2, 2), press.at(11, 9)).enemy("C", press.at(6, 5)).enemy("z", press.at(12, 2), press.at(1, 10)).enemy("m", press.at(9, 3));
  lv.enemy("n", office.at(3, 3)).enemy("L", office.at(6, 4));
  // ---- the smelting floor
  lv.enemy("U", smelt.at(8, 6)).enemy("C", smelt.at(2, 2)).enemy("j", smelt.at(14, 1), smelt.at(13, 10)).enemy("L", smelt.at(1, 10));
  // ---- the coal store (the wing)
  lv.enemy("E", coal.at(8, 4)).enemy("n", coal.at(2, 2)).enemy("z", coal.at(13, 6), coal.at(5, 6)).enemy("L", coal.at(12, 1));
  // ---- the runner and the pit
  lv.enemy("j", [28, 18]).enemy("L", [33, 18]);
  lv.enemy("C", pit.at(11, 2)).enemy("j", pit.at(1, 10), pit.at(11, 10));

  // ---- the supply
  lv.pickup("h", yard.at(0, 0), yard.at(7, 7)).pickup("a", yard.at(7, 0)).pickup("b", yard.at(0, 7)).pickup("5", yard.at(6, 5));
  lv.pickup("a", boiler.at(0, 0), boiler.at(15, 0), boiler.at(15, 8)).pickup("h", boiler.at(7, 0), boiler.at(0, 8), boiler.at(11, 8)).pickup("b", boiler.at(4, 8), boiler.at(11, 0))
    .pickup("r", boiler.at(15, 4)).pickup("9", boiler.at(0, 3)).pickup("e", boiler.at(7, 8));
  lv.pickup("6", crib.at(1, 0)).pickup("r", crib.at(6, 1)).pickup("h", crib.at(3, 1)).pickup("c", crib.at(5, 0));
  lv.pickup("a", press.at(0, 0), press.at(13, 11)).pickup("h", press.at(13, 0), press.at(0, 11), press.at(7, 11)).pickup("b", press.at(7, 0))
    .pickup("r", press.at(13, 6)).pickup("c", press.at(0, 6)).pickup("o", press.at(10, 11)).pickup("9", press.at(4, 11));
  lv.pickup("h", office.at(7, 0), office.at(7, 5)).pickup("a", office.at(1, 5)).pickup("o", office.at(1, 0));
  lv.pickup("a", smelt.at(0, 0), smelt.at(15, 11)).pickup("h", smelt.at(15, 0), smelt.at(0, 11), smelt.at(7, 11)).pickup("b", smelt.at(7, 0))
    .pickup("r", smelt.at(15, 6)).pickup("c", smelt.at(0, 6)).pickup("0", smelt.at(11, 11));
  lv.pickup("8", safe.at(1, 0)).pickup("r", safe.at(0, 2)).pickup("h", safe.at(2, 4)).pickup("0", safe.at(0, 4));
  lv.pickup("u", coal.at(0, 0)).pickup("1", coal.at(0, 7), coal.at(15, 7)).pickup("h", coal.at(8, 7), coal.at(15, 0)).pickup("r", coal.at(8, 0)).pickup("b", coal.at(4, 0));
  lv.pickup("a", [32, 18]).pickup("h", [30, 18]);
  lv.pickup("h", pit.at(0, 0), pit.at(12, 11), pit.at(0, 11)).pickup("r", pit.at(12, 0)).pickup("b", pit.at(6, 11)).pickup("c", pit.at(12, 5)).pickup("o", pit.at(6, 0)).pickup("0", pit.at(0, 5));
  lv.prop("O", boiler.at(2, 2), boiler.at(13, 6)).prop("O", press.at(10, 6), coal.at(11, 4), yard.at(2, 6)).prop("x", yard.at(5, 1), press.at(5, 9));

  // ---- the light: torches (real lights, within the budget); then the work lamps and the furnace glow of the dressing
  lv.light("i", yard.at(0, 3), boiler.at(0, 4), boiler.at(15, 2), press.at(0, 3), press.at(13, 8), office.at(4, 0), smelt.at(0, 3), smelt.at(15, 8),
    coal.at(0, 4));
  lv.light("l", crib.at(0, 0), safe.at(1, 2), smelt.at(7, 5));

  const rooms = { yard, boiler, crib, coal, pit, press, smelt, safe, office };
  lv.dress((d) => dressFactory(d, rooms));
  lv.checkpoint([29, 36], { side: "n" });   // the boiler house door, up into the press hall: every route
  lv.checkpoint([46, 34], { side: "n" });   // the stair up to the office: every route to the key
  lv.checkpoint([31, 18], { side: "n" });   // the runner, the last before the Foreman
  return lv.build();
}

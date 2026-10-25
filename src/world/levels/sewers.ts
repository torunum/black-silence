import type { BuiltLevel } from "../LevelBuilder";
import { LevelPlan } from "../authoring/Plan";
import { dressSewers } from "./dressSewers";

/**
 * LEVEL 5 — THE SEWERS, rebuilt (owner, 2026-10-21: "bölümleri de geliştirelim. hala zayıf duruyorlar"). The reference's sewers were the
 * lattice of seven-by-five rooms again — the necropolis's and the graveyard's floor plan — with the same 44-step way through;
 * `tests/fidelity.test.ts` records the divergence. Written with `LevelPlan`, held to the numbers a rebuilt level must meet
 * (`src/world/structure/targets.ts`).
 *
 * Under the town, where everything it threw away went. Three floors (raised, never sunk):
 *
 *   floor 2.4   the valve room over the pumping station, where THE RED KEY hangs on the valve wheel
 *   floor 1.2   the outfall where the player comes in, the pumping station (THE CATHEDRAL GUARDIAN), the inspector's cupboard (a secret)
 *   floor 0     the main drain, the overflow chamber (the arena), the settling tanks (THE EXECUTIONER), the flooded store behind a secret
 *               door, the brick culvert and THE GREAT CISTERN at its end
 *
 *   - THE WAY: the outfall -> the main drain -> the overflow chamber -> up into the pumping station by either of its two ladders-and-stairs
 *     (the loop) -> the valve room (the key: the key hunt) -> back down -> the sluice gate (locked: the key opens it) -> the culvert ->
 *     the great cistern -> THE HOLLOW LEVIATHAN. Its death opens the exit at (16,16), in the cistern (`DoorSite.ts`'s `EXIT_CELLS`).
 *   - THE WING: the settling tanks, north of the station: the Executioner and what he keeps.
 *   - THE WATER: standing sewage down the drain's channel, over the store, the overflow, the cistern and the tanks' basins (`src/fx/Water.ts`).
 *   - No `C`, no `V`, no `A` (KNOWN-4, KNOWN-11): armour is `r`.
 */
export const W = 58, H = 46;
export const MID = 1.2, UP = 2.4;

export function buildSewers(): BuiltLevel {
  const lv = new LevelPlan(W, H, "sewers").headroom(3);

  // ---- 1.2
  const outfall = lv.room("outfall", { x: 2, z: 36, w: 7, h: 7, floor: MID });
  const station = lv.room("pumping station", { x: 38, z: 15, w: 15, h: 10, floor: MID, ceil: 6.5 });
  const cupboard = lv.room("inspector's cupboard", { x: 54, z: 17, w: 2, h: 5, floor: MID });
  // ---- 2.4
  const valve = lv.room("valve room", { x: 28, z: 14, w: 8, h: 6, floor: UP });
  // ---- 0
  const drain = lv.room("main drain", { x: 11, z: 37, w: 22, h: 4, ceil: 4.6 });
  const store = lv.room("flooded store", { x: 14, z: 42, w: 8, h: 3 });
  const overflow = lv.room("overflow chamber", { x: 35, z: 29, w: 13, h: 13, ceil: 7 });
  const tanks = lv.room("settling tanks", { x: 38, z: 3, w: 16, h: 9 });
  const cistern = lv.room("great cistern", { x: 14, z: 9, w: 13, h: 12, ceil: 8 });

  // ---- the ways between
  lv.corridor([8, 38], [11, 38]);                                    // the outfall, down into the drain
  lv.corridor([32, 38], [35, 38], { door: "plain" });                // the drain -> the overflow chamber
  lv.corridor([40, 29], [40, 24], { door: "plain" });                // the overflow -> up into the station: the west stair
  lv.corridor([45, 29], [45, 24], { door: "plain" });                //   and the east: the loop
  lv.corridor([38, 17], [35, 17]);                                   // the station -> up into the valve room
  lv.corridor([46, 15], [46, 11], { door: "plain" });                // the station -> down into the settling tanks: the wing
  lv.corridor([38, 22], cistern, { via: [[30, 22]], door: "locked" });   // the sluice gate and the culvert, to the cistern
  lv.door(17, 41, "secret");                                         // the drain -> the flooded store
  lv.door(53, 19, "secret");                                         // the station -> the inspector's cupboard
  // columns: the overflow's, the station's, the cistern's
  for (const [x, z] of [[38, 32], [44, 32], [38, 38], [44, 38], [41, 35]]) lv.put("I", x, z);
  for (const x of [41, 45, 49]) lv.put("I", x, 19);
  for (const [x, z] of [[17, 12], [23, 12], [17, 18], [23, 18]]) lv.put("I", x, z);

  // ---- the player, the key; the Leviathan's death opens (16,16)
  lv.spawn(outfall.at(3, 3)).key(valve.at(1, 2));
  lv.enemy("H", cistern.at(7, 6));

  // ---- the drain
  lv.enemy("t", drain.at(6, 1), drain.at(15, 2)).enemy("z", drain.at(10, 0), drain.at(19, 3)).enemy("w", drain.at(13, 3));
  // ---- the overflow: the arena
  lv.enemy("t", overflow.at(2, 2), overflow.at(10, 10), overflow.at(10, 2)).enemy("z", overflow.at(5, 6), overflow.at(8, 4), overflow.at(3, 11)).enemy("f", overflow.at(11, 6))
    .enemy("m", overflow.at(6, 9)).enemy("w", overflow.at(1, 8), overflow.at(12, 12)).enemy("s", overflow.at(7, 1));
  // ---- the station, the valve room
  lv.enemy("U", station.at(8, 4)).enemy("z", station.at(2, 1), station.at(13, 8)).enemy("s", station.at(13, 1)).enemy("t", station.at(1, 8));
  lv.enemy("w", valve.at(5, 3)).enemy("f", valve.at(6, 1));
  // ---- the tanks (the wing)
  lv.enemy("E", tanks.at(8, 4)).enemy("t", tanks.at(2, 2), tanks.at(13, 6)).enemy("z", tanks.at(4, 7)).enemy("w", tanks.at(12, 1));
  // ---- the culvert and the cistern
  lv.enemy("w", [28, 22]).enemy("t", [34, 22]);
  lv.enemy("s", cistern.at(1, 1), cistern.at(11, 10)).enemy("t", cistern.at(11, 1));

  // ---- the supply
  lv.pickup("h", outfall.at(0, 0), outfall.at(6, 6)).pickup("a", outfall.at(6, 0)).pickup("b", outfall.at(0, 6));
  lv.pickup("a", drain.at(2, 0), drain.at(12, 3), drain.at(21, 0)).pickup("h", drain.at(17, 3), drain.at(4, 3)).pickup("b", drain.at(9, 3)).pickup("5", drain.at(20, 3));
  lv.pickup("9", store.at(1, 1)).pickup("r", store.at(6, 1)).pickup("h", store.at(3, 2)).pickup("b", store.at(5, 0));
  lv.pickup("a", overflow.at(0, 0), overflow.at(12, 0), overflow.at(0, 12)).pickup("h", overflow.at(6, 0), overflow.at(6, 12), overflow.at(12, 6)).pickup("b", overflow.at(0, 6), overflow.at(12, 9))
    .pickup("r", overflow.at(12, 3)).pickup("e", overflow.at(3, 12)).pickup("o", overflow.at(9, 12));
  lv.pickup("a", station.at(0, 0), station.at(14, 9)).pickup("h", station.at(14, 0), station.at(0, 9), station.at(7, 9)).pickup("b", station.at(7, 0))
    .pickup("r", station.at(14, 5)).pickup("c", station.at(0, 5)).pickup("o", station.at(11, 9));
  lv.pickup("7", cupboard.at(0, 0)).pickup("r", cupboard.at(1, 2)).pickup("h", cupboard.at(0, 4)).pickup("o", cupboard.at(1, 4));
  lv.pickup("h", valve.at(7, 0), valve.at(7, 5)).pickup("a", valve.at(0, 5)).pickup("c", valve.at(4, 0));
  lv.pickup("u", tanks.at(0, 0)).pickup("1", tanks.at(0, 8), tanks.at(15, 8)).pickup("h", tanks.at(8, 8), tanks.at(15, 0)).pickup("r", tanks.at(8, 0)).pickup("b", tanks.at(4, 0));
  lv.pickup("a", [32, 22]).pickup("h", [24, 22]);
  lv.pickup("h", cistern.at(0, 0), cistern.at(12, 11), cistern.at(0, 11)).pickup("r", cistern.at(12, 0)).pickup("b", cistern.at(6, 11)).pickup("c", cistern.at(12, 5)).pickup("o", cistern.at(6, 0));
  lv.prop("O", overflow.at(4, 3), overflow.at(9, 8)).prop("O", tanks.at(11, 4)).prop("x", drain.at(7, 0)).prop("x", station.at(4, 6));

  // ---- the light: torches (real lights, within the budget); then the lanterns of the dressing
  lv.light("i", outfall.at(0, 3), drain.at(5, 0), drain.at(16, 0), overflow.at(0, 3), overflow.at(12, 11), station.at(0, 2), station.at(14, 7),
    valve.at(3, 5), cistern.at(3, 0), cistern.at(9, 11));
  lv.light("l", store.at(0, 0), cupboard.at(1, 0), station.at(7, 5));

  const rooms = { outfall, station, cupboard, valve, drain, store, overflow, tanks, cistern };
  lv.dress((d) => dressSewers(d, rooms));
  lv.checkpoint([34, 38], { side: "n" });   // the drain's end, before the overflow: every route
  lv.checkpoint([37, 17], { side: "n" });   // the stair up to the valve room: every route to the key
  lv.checkpoint([26, 22], { side: "n" });   // the culvert, the last before the Leviathan
  const L = lv.build();
  // the standing water (2026-10-22, `src/fx/Water.ts`): down the drain's channel, the store drowned, the overflow and the cistern flooded
  // but for a dry rim along their walls, and the settling tanks' two basins
  L.water = [[11, 38, 32, 39], [14, 42, 21, 44], [36, 30, 46, 40], [40, 5, 45, 9], [47, 5, 52, 9], [15, 10, 25, 19]];
  // masses an enemy walking at a player was found pinned against (tests/enemies/stuckCheck.test.ts), taken out
  L.decor = L.decor!.filter((s) => !PINNERS.includes(`${s.k}@${Math.floor(s.x + .5)},${Math.floor(s.z + .5)}`));
  return L;
}

export const PINNERS: readonly string[] = ["pump@42,15"];

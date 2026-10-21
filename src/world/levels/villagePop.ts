import type { LevelPlan, Room } from "../authoring/Plan";
import { dressVillage } from "./dressVillage";

/** The village's rooms, by name (`./village.ts` builds them). */
export interface VillageRooms {
  inn: Room; cellar1: Room; store: Room; cellar2: Room; mill: Room; hoard: Room; undertaker: Room; coffin: Room; burned: Room;
  smithy: Room; cottage: Room; barn: Room;
}

/**
 * WHAT IS IN THE VILLAGE: the fights by place, the key, the supplies, three secrets' rewards, the light and the shrines.
 *   E1  the square: the dead about the well, cultists at its corners, a wailer — seen from the church steps, met in the open
 *   E2  the inn: close, round the bar; cultists on the gallery above
 *   E3  the street: the dead down its length, quick ones among them, dogs loosed from the gate end, a cultist at the far end
 *   E4  the field: dogs and crawlers in the corn, where nothing can be seen coming until it is out of it
 *   E5  the barn: the dead on its floor; THE BUTCHER (an ettin) on the hayloft with THE RED KEY, a cultist with him
 *   E6  the graveyard: the last of them out of the graves, gargoyles off the mausoleum, an ettin by the gate out
 *   and in the houses off the way: the undertaker's, the burned house, the smithy, the cottage, the store and its cellar, the mill.
 */
export function populateVillage(lv: LevelPlan, r: VillageRooms): void {
  void r;
  // ---- the player, on the church steps, and the key
  lv.spawn([35, 5]);
  lv.key([5, 50]);
  lv.pickup("h", [33, 5]).pickup("a", [38, 5]);

  // ---- E1 the square
  lv.enemy("z", [30, 15], [41, 16], [36, 17], [28, 10], [44, 7]).enemy("j", [27, 18], [44, 18]).enemy("s", [43, 13]);
  lv.pickup("b", [27, 5]).pickup("h", [44, 15]).pickup("a", [31, 13]);

  // ---- E2 the inn; SECRET 1 the wine cellar
  lv.enemy("z", [20, 8], [22, 12]).enemy("f", [19, 6]).enemy("j", [15, 6], [16, 12]);
  lv.pickup("h", [24, 6]).pickup("a", [15, 13]).pickup("b", [21, 13]).pickup("r", [14, 5]);
  lv.pickup("r", [16, 2]).pickup("h", [19, 2]).pickup("b", [17, 1]).pickup("e", [20, 3]);

  // ---- the store, its cellar, the tunnel, the mill and its loft; SECRET 2 the miller's hoard
  lv.enemy("m", [51, 9]).enemy("z", [53, 6]);
  lv.pickup("a", [48, 6]).pickup("b", [55, 11]).pickup("1", [52, 12]).pickup("h", [49, 11]);
  lv.enemy("w", [62, 6], [66, 9]);
  lv.pickup("e", [68, 4]).pickup("h", [60, 11]).pickup("a", [64, 7]);
  lv.enemy("t", [61, 15]);
  lv.enemy("z", [60, 24], [63, 28]).enemy("j", [66, 22], [67, 29]);
  lv.pickup("b", [60, 21]).pickup("h", [68, 21]).pickup("o", [66, 30]).pickup("a", [62, 27]);
  lv.pickup("h", [65, 16]).pickup("r", [68, 16]).pickup("o", [66, 18]).pickup("1", [68, 18]);

  // ---- E3 the street
  lv.enemy("z", [34, 24], [37, 28], [33, 33], [38, 38]).enemy("f", [35, 30], [36, 40]).enemy("j", [33, 43]).enemy("g", [38, 43], [34, 42]);
  lv.pickup("a", [32, 22]).pickup("h", [39, 32]).pickup("b", [33, 40]);

  // ---- the undertaker's; SECRET 3 the hidden coffin
  lv.enemy("m", [24, 24], [28, 27]).enemy("z", [26, 23]).enemy("w", [23, 28]);
  lv.pickup("a", [30, 28]).pickup("h", [22, 22]).pickup("c", [30, 22]);
  lv.pickup("h", [24, 31]).pickup("r", [27, 31]).pickup("e", [26, 31]);

  // ---- the burned house: through to the field
  lv.enemy("s", [24, 35], [29, 39]).enemy("w", [26, 38], [23, 40]);
  lv.pickup("b", [22, 33]).pickup("h", [30, 40]);

  // ---- the smithy, the cottage, the east lane
  lv.enemy("t", [45, 24]).enemy("z", [43, 27], [47, 23]);
  lv.pickup("a", [48, 28]).pickup("o", [41, 22]).pickup("e", [48, 22]);
  lv.enemy("f", [44, 35], [46, 38]).enemy("z", [42, 38]);
  lv.pickup("h", [48, 33]).pickup("b", [41, 39]);
  lv.enemy("g", [54, 20], [53, 34], [56, 40]).enemy("z", [52, 26], [55, 30]);
  lv.pickup("a", [51, 43]).pickup("h", [57, 17]).pickup("1", [57, 44]);
  // THE GAUNTLET's plate (KNOWN-21: wired since the reference and placed in no level until now), in the lane's yard behind the cottage:
  // step on it and five come out of the dark round it; kill them for armour, crosses and bullets
  lv.plate([54, 38]);

  // ---- E4 the field
  lv.enemy("g", [8, 20], [15, 25], [6, 33], [12, 40]).enemy("w", [10, 28], [16, 33], [5, 42]).enemy("z", [13, 22], [7, 37]).enemy("j", [18, 42]);
  lv.pickup("h", [3, 17]).pickup("a", [19, 30]).pickup("b", [3, 44]).pickup("1", [18, 17]);

  // ---- E5 the barn: the butcher and the key on the hayloft
  lv.enemy("z", [10, 50], [14, 54], [9, 56]).enemy("f", [12, 48], [16, 57]).enemy("n", [5, 53]).enemy("j", [4, 57]);
  lv.pickup("h", [17, 47]).pickup("a", [17, 58]).pickup("b", [3, 47]).pickup("r", [7, 48]).pickup("e", [12, 51]);

  // ---- E6 the graveyard
  lv.enemy("y", [30, 50], [44, 58]).enemy("j", [26, 48], [46, 47], [33, 60]).enemy("z", [32, 52], [38, 55], [25, 58], [46, 56]).enemy("m", [36, 48], [42, 56]).enemy("n", [34, 57]);
  lv.pickup("h", [24, 46], [24, 61]).pickup("a", [47, 46]).pickup("b", [47, 61]).pickup("r", [38, 47]).pickup("e", [29, 47]);

  // ---- the light: lanterns on posts in the open where the eye needs a mark, candles in the houses
  lv.light("i", [29, 4], [42, 4], [26, 12], [45, 12], [32, 32], [39, 24], [51, 30], [19, 20], [10, 48], [35, 47], [47, 52], [59, 20]);   // twelve: with the window, the exit, the smithy's furnace, the gauntlet's plate and the player's four, a margin of one under the budget
  lv.light("l", [20, 5], [26, 28], [18, 1], [44, 33], [51, 5], [16, 52]);

  // ---- the dressing: each place its own (./dressVillage.ts) — and no theme clutter over it: the graveyard kit's stones belong in the graveyard
  lv.dress((d) => dressVillage(d));

  // ---- the shrines
  lv.checkpoint([32, 21], { side: "w" });     // the head of the street
  lv.checkpoint([19, 17], { side: "n" });     // the edge of the field
  lv.checkpoint([10, 46], { side: "w" });     // the barn's doors: every way to the key
  lv.checkpoint([9, 59], { side: "s" });     // on the hayloft's stair: the one way up to the key
  lv.checkpoint([32, 44], { side: "w" });     // before the town gate
  lv.checkpoint([47, 47], { side: "e" });     // the graveyard
}

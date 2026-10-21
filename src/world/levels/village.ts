import type { BuiltLevel } from "../LevelBuilder";
import { LevelPlan } from "../authoring/Plan";
import { populateVillage, type VillageRooms } from "./villagePop";
import { villageZones } from "./villageZones";

/**
 * THE HOLLOW VILLAGE (owner, 2026-10-21: "açık havada geçen, Blood tarzı bölümler") — the village round the abandoned church, at night,
 * under the open sky. ADEM comes out through the church's doors onto its square; the dead are in the street, dogs in the corn, cultists
 * in the windows. The way south out of it, through the town gate to the graveyard and the necropolis beyond, is locked, and the red key
 * is up in the barn's hayloft across the field, with the butcher who keeps it.
 *
 * Built blockout-first, as the monastery was: the ways, the fights and the length in plain geometry, then the dressing.
 *
 *   floor 1.2   the ground: the square, the street, the lanes and alleys, the field, the graveyard, and every house's ground floor
 *   floor 0     the store's cellar and the tunnel from it up into the mill
 *   floor 3.6   the inn's gallery, the mill's loft and the barn's hayloft (each up a stair inside), and the miller's hoard behind his loft
 *
 *   THE WAY: the church steps -> the square (the hub: the inn west, the store east, the street south, an alley either side) -> the street
 *   south -> the town gate, LOCKED -> west, through the burned house's broken back wall or the square's west alley, into the cornfield ->
 *   the barn -> up to the hayloft: THE RED KEY, and the butcher -> back across the field and down the street -> the gate -> the graveyard,
 *   its last fight -> the cemetery gate out (the exit) to the necropolis.
 *   Off the way: the undertaker's and its hidden coffin, the smithy and the cottage, the east lane, the store, its cellar and the tunnel
 *   up into the mill and its loft (a loop back to the lane), the inn and its gallery, and three secrets.
 */
export const W = 72, H = 64;
export const G = 1.2, CELLAR = 0, UPPER = 3.6;

/** Floor over a box, except the boxes in `solid` (a mausoleum: left standing as wall). */
function carveAround(lv: LevelPlan, x0: number, z0: number, x1: number, z1: number, floor: number, solid: ReadonlyArray<readonly [number, number, number, number]>): void {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (solid.some(([a, b, c, d]) => x >= a && x <= c && z >= b && z <= d)) continue;
    lv.carve(x, z, x, z, floor);
  }
}

export function buildVillage(): BuiltLevel {
  const lv = new LevelPlan(W, H, "graveyard").headroom(3.2);

  // ---- 1. THE SQUARE (1.2, open sky): before the church's doors, the well in the middle, the gallows
  lv.carve(26, 4, 45, 19, G);                                                   // (the well and the gallows: ./dressVillage.ts)

  // ---- 2. THE INN (west of the square): the bar, a gallery up a stair inside, a window on the square; SECRET 1, the wine cellar
  const inn = lv.room("inn", { x: 14, z: 5, w: 11, h: 10, floor: G, ceil: 7.2 });
  lv.carve(14, 5, 17, 14, UPPER).stairs(23, 14, 18, 14, { from: G, to: UPPER });   // the gallery along the west wall, the stair to it
  lv.door(25, 9, "plain");
  lv.window(25, 6);
  const cellar1 = lv.room("wine cellar", { x: 15, z: 1, w: 6, h: 3, floor: G });
  lv.door(18, 4, "secret");

  // ---- 3. THE STORE (east of the square), its cellar (0), and the tunnel from the cellar up into the mill
  const store = lv.room("store", { x: 47, z: 5, w: 9, h: 8, floor: G });
  lv.door(46, 8, "plain");
  lv.corridor([50, 12], [50, 16], { door: "plain" });                           // its back door, out to the alley behind
  const cellar2 = lv.room("store cellar", { x: 60, z: 4, w: 9, h: 8, floor: CELLAR });
  lv.corridor([55, 9], [60, 9], { door: "plain" });                            // down from the store, graded
  const mill = lv.room("mill", { x: 59, z: 20, w: 10, h: 12, floor: G, ceil: 7.2 });
  lv.corridor([61, 11], [61, 20], { door: "plain" });                          // the tunnel, graded up into the mill
  lv.carve(65, 20, 68, 31, UPPER).stairs(59, 31, 64, 31, { from: G, to: UPPER });   // the loft, the stair up along the south wall
  const hoard = lv.room("miller's hoard", { x: 65, z: 16, w: 4, h: 3, floor: UPPER });
  lv.door(66, 19, "secret");                                                    // SECRET 2: behind the loft's sacks

  // ---- 4. THE ALLEYS AND THE EAST LANE (1.2, open sky): round the backs of the east houses, to the mill's door
  lv.carve(46, 16, 50, 18, G);                                                  // the square -> the lane
  lv.carve(51, 16, 57, 44, G);                                                  // the lane
  lv.door(58, 26, "plain");                                                     // the lane -> the mill
  lv.carve(40, 30, 50, 31, G);                                                  // the street -> the lane, between the smithy and the cottage

  // ---- 5. THE STREET (1.2, open sky), and its houses
  lv.carve(32, 20, 39, 44, G);
  const undertaker = lv.room("undertaker's", { x: 22, z: 22, w: 9, h: 7, floor: G });
  lv.door(31, 25, "plain");
  const coffin = lv.room("hidden coffin", { x: 24, z: 30, w: 4, h: 2, floor: G });
  lv.door(25, 29, "secret");                                                    // SECRET 3: a coffin stood against the back wall
  const burned = lv.room("burned house", { x: 22, z: 33, w: 9, h: 8, floor: G });   // roofless: the sky its ceiling (./villageZones.ts)
  lv.door(31, 36, "plain");
  lv.carve(20, 37, 21, 37, G);                                                  // its back wall fallen in: through to the field
  const smithy = lv.room("smithy", { x: 41, z: 22, w: 8, h: 7, floor: G });
  lv.door(40, 25, "plain");
  const cottage = lv.room("cottage", { x: 41, z: 33, w: 8, h: 7, floor: G });
  lv.door(40, 36, "plain");

  // ---- 6. THE FIELD AND THE BARN (west): the dead corn, the barn, its hayloft (3.6) up a stair
  lv.carve(20, 17, 25, 19, G);                                                  // the square's west alley -> the field
  lv.carve(3, 17, 19, 44, G);                                                   // the field
  const barn = lv.room("barn", { x: 3, z: 47, w: 15, h: 13, floor: G, ceil: 7.2 });
  lv.corridor([10, 44], [10, 47], { door: "plain" });                           // the barn's doors
  lv.carve(3, 47, 7, 59, UPPER).stairs(15, 59, 8, 59, { from: G, to: UPPER });    // the hayloft, the stair up along the south wall

  // ---- 7. THE TOWN GATE (locked: the red key) and THE GRAVEYARD (1.2, open sky) beyond it; the cemetery gate out
  lv.door(35, 45, "locked");
  const mausoleum = [40, 49, 44, 53] as const, crypt = [27, 54, 30, 57] as const;
  carveAround(lv, 24, 46, 47, 61, G, [mausoleum, crypt]);
  lv.exit([36, 60]);

  const rooms: VillageRooms = { inn, cellar1, store, cellar2, mill, hoard, undertaker, coffin, burned, smithy, cottage, barn };
  populateVillage(lv, rooms);
  const level = lv.build();
  level.zones = villageZones(W, H);
  return level;
}

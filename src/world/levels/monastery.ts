import type { BuiltLevel } from "../LevelBuilder";
import type { MonasteryRooms } from "./monasteryPop";
import { LevelPlan } from "../authoring/Plan";
import { MONASTERY_SCRIPT } from "./monasteryScript";
import { populateMonastery } from "./monasteryPop";
import { moreMonastery } from "./monasteryMore";
import { monasteryZones } from "./monasteryZones";

/**
 * LEVEL 1 — THE ASH BELL MONASTERY (owner, 2026-10-20: "Kül Çanı Manastırı"). The chapter after the prologue: a forbidden rite kept
 * under an old monastery, its graveyard and its funeral houses. Built blockout-first, as the owner asked: the whole level playable in
 * plain geometry, its ways, fights and length checked, the dressing after.
 *
 *   floor 0     the family crypt (where the player comes in) and everything under the courtyard: the ossuary, the cistern, the rite chapel
 *   floor 1.2   the graveyard (terraces at 1.8, a watch platform at 2.4), the courtyard, the west wing (morgue, crematorium), the east
 *               wing (cloister, library)
 *   floor 3.0   the library's gallery and the reading room behind it; the tower's north landing; the rampart along the courtyard's north
 *   floor 6.0   the bell chamber at the top of the tower, and the lift's top
 *
 *   THE WAY: crypt -> graveyard -> courtyard (the hub: the tower in its north-east corner, both wings' doors, the sealed gate) -> either
 *   wing, in either order:
 *     WEST  courtyard -> morgue (reception, cold room, autopsy: close quarters, windows on the courtyard) -> crematorium (round the
 *           furnaces: THE ASH SEAL on its platform) -> the service door back into the courtyard (barred from the courtyard side)
 *     EAST  courtyard -> cloister -> library (the floor and its gallery) -> the tower (two flights, the north landing, the rampart's
 *           door) -> the bell chamber: THE BELL SEAL, and the lever — the great bell tolls once, the courtyard's four niches open, the
 *           lift's chain comes loose -> the lift down into the courtyard
 *   -> the gate (both seals) -> down to the ossuary -> the cistern (the floor or the bridges) -> the rite chapel: the Gravedigger.
 *   His death opens the great gate out (the exit, at (16,16)).
 *
 * The geometry is here; what stands in it is `./monasteryPop.ts`; the regions' looks `./monasteryZones.ts`; the seals, the gate, the
 * barred door, the bell and the lift `./monasteryScript.ts`.
 */
export const W = 100, H = 86;
export const G = 1.2, TERRACE = 1.8, WATCH = 2.4, UPPER = 3.0, TOP = 6.0;

/** Floor over a box, except the boxes in `solid` (a mausoleum, a furnace: left standing as wall). */
function carveAround(lv: LevelPlan, x0: number, z0: number, x1: number, z1: number, floor: number, solid: ReadonlyArray<readonly [number, number, number, number]>): void {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    if (solid.some(([a, b, c, d]) => x >= a && x <= c && z >= b && z <= d)) continue;
    lv.carve(x, z, x, z, floor);
  }
}

export function buildMonastery(): BuiltLevel {
  const lv = new LevelPlan(W, H, "church").headroom(3);

  // ---- 1. THE FAMILY CRYPT (0): the cell the player wakes in, the hall of the family's tombs, a cracked wall
  const cell = lv.room("crypt cell", { x: 80, z: 74, w: 7, h: 7 });
  const hall = lv.room("crypt hall", { x: 76, z: 62, w: 15, h: 9 });
  const niche = lv.room("crypt niche", { x: 92, z: 63, w: 5, h: 5 });
  lv.corridor([83, 74], [83, 70], { door: "plain" });
  lv.door(91, 65, "secret");                                                    // SECRET 1: the cracked wall in the tomb hall
  for (let x = 78; x <= 88; x += 2) { lv.put("I", x, 64); lv.put("I", x, 68); }  // the family's tombs, in two rows

  // ---- 2. THE CROOKED GRAVEYARD (1.2, open sky): mausoleums and a chapel left standing, terraces, a watch platform
  const cem = { x0: 34, z0: 68, x1: 73, z1: 82 };
  const mausoleum = [40, 71, 43, 73] as const, chapelB = [46, 77, 51, 81] as const, vaultM = [56, 76, 59, 79] as const, tombM = [63, 70, 66, 72] as const;
  carveAround(lv, cem.x0, cem.z0, cem.x1, cem.z1, G, [mausoleum, chapelB, vaultM, tombM]);
  lv.carve(34, 68, 38, 82, TERRACE);                                            // the west terrace
  lv.carve(68, 75, 73, 82, TERRACE).carve(70, 79, 73, 82, WATCH);               // the east terrace, and its watch platform
  const gchapel = lv.room("graveyard chapel", { x: 47, z: 78, w: 4, h: 3, floor: G });
  lv.door(48, 77, "plain");
  const tomb = lv.room("sealed tomb", { x: 57, z: 77, w: 2, h: 2, floor: G });
  lv.window(58, 76);                                                            // SECRET 2: the hoard seen through the bars...
  lv.door(59, 78, "secret");                                                    // ...and the way in, round the back
  for (const [x, z] of [[45, 70], [48, 70], [51, 70], [54, 70], [57, 70], [60, 70], [45, 74], [49, 74], [53, 74], [61, 74], [65, 76], [62, 80], [54, 81], [43, 77], [40, 80], [44, 81]] as const) lv.put("I", x, z);   // gravestones: the sight broken
  lv.corridor([76, 65], [73, 68], { door: "plain" });                            // up out of the crypt into the graveyard's north-east corner (graded)
  lv.carve(50, 58, 52, 67, G);                                                   // the gatehouse: north into the courtyard

  // ---- 3. THE COURTYARD (1.2, open sky): the hub. The tower stands in its north-east corner; a rampart runs along its north
  lv.carve(38, 28, 54, 57, G).carve(55, 39, 63, 57, G);
  lv.carve(44, 28, 54, 29, UPPER);                                              // the rampart: seen from below, walked from the tower
  lv.carve(55, 28, 55, 28, UPPER);                                              // its doorway into the tower's north landing
  lv.carve(41, 13, 41, 26, 0).stairs(41, 26, 41, 20, { from: G, to: 0 });       // the stair down from the gate
  lv.door(41, 27, "plain");                                                     // THE GATE: both seals (monasteryScript)
  const hoard = lv.room("rampart hoard", { x: 43, z: 22, w: 5, h: 5, floor: UPPER });
  lv.door(44, 27, "secret");                                                    // SECRET 7: off the rampart's west end
  // the four niches the bell opens: two in the south wall, two in the east
  const niches = [lv.room("niche sw", { x: 42, z: 59, w: 2, h: 2, floor: G }), lv.room("niche se", { x: 58, z: 59, w: 2, h: 2, floor: G }),
    lv.room("niche e1", { x: 65, z: 43, w: 2, h: 2, floor: G }), lv.room("niche e2", { x: 65, z: 53, w: 2, h: 2, floor: G })];
  lv.door(42, 58, "plain").door(58, 58, "plain").door(64, 43, "plain").door(64, 53, "plain");

  // ---- 4. THE TOWER (in the courtyard's corner): flight east up to the north landing (3.0), flight west up to the bell chamber (6.0)
  lv.carve(62, 29, 63, 37, G).stairs(62, 37, 63, 29, { from: G, to: UPPER });
  lv.carve(56, 28, 63, 28, UPPER);                                              // the north landing
  lv.carve(56, 29, 57, 34, UPPER).stairs(56, 29, 57, 34, { from: UPPER, to: TOP });
  const bellroom = lv.room("bell chamber", { x: 56, z: 35, w: 6, h: 3, floor: TOP, ceil: TOP + 3.4 });
  lv.carve(58, 38, 59, 38, 0);                                                  // THE LIFT's shaft, its floor ridden by the script
  lv.carve(65, 36, 65, 36, G); lv.door(64, 36, "plain");                        // the tower's foot, from the library side

  // ---- 5. THE WEST WING (1.2): the morgue, then the crematorium
  const reception = lv.room("morgue reception", { x: 28, z: 30, w: 9, h: 7, floor: G });
  const cold = lv.room("cold room", { x: 18, z: 30, w: 9, h: 7, floor: G });
  const drawers = lv.room("drawer room", { x: 13, z: 31, w: 4, h: 4, floor: G });
  const autopsy = lv.room("autopsy", { x: 24, z: 39, w: 13, h: 8, floor: G });
  lv.door(37, 33, "plain");                                                     // the courtyard -> the morgue
  lv.door(27, 33, "plain");                                                     // reception -> cold room
  lv.door(17, 32, "secret");                                                    // SECRET 4: a drawer that is a door
  // (no door from the reception to the autopsy: the way goes round, through the cold room and the embalming room: ./monasteryMore.ts)
  lv.window(37, 43); lv.window(37, 44);                                         // the autopsy looks out on the courtyard
  const furnaces = [[14, 54, 17, 57], [21, 54, 24, 57], [14, 60, 17, 63], [21, 60, 24, 63], [28, 56, 31, 60]] as const;
  carveAround(lv, 10, 50, 34, 66, G, furnaces);
  lv.carve(10, 50, 12, 52, 2.6).stairs(15, 50, 13, 50, { from: G, to: 2.6 });   // the platform the Ash Seal lies on, too high to climb but by its stair
  lv.corridor([30, 46], [30, 50], { door: "plain" });                           // autopsy -> crematorium
  const ashes = lv.room("ash closet", { x: 6, z: 58, w: 3, h: 4, floor: G });
  lv.door(9, 59, "secret");                                                     // SECRET 5: behind the coldest furnace
  lv.corridor([34, 52], [38, 52], { door: "plain" });                           // THE SERVICE DOOR: barred on the courtyard's side

  // ---- 6. THE EAST WING (1.2): the cloister round its garth, the library and its gallery (3.0)
  lv.corridor([63, 50], [68, 50], { door: "plain", grade: false });   // the courtyard -> the cloister (level: the cloister is carved after it)
  const cloister = lv.room("cloister", { x: 68, z: 44, w: 19, h: 15, floor: G });
  for (let x = 71; x <= 83; x += 3) { lv.put("I", x, 47); lv.put("I", x, 55); }
  for (const z of [50, 52]) { lv.put("I", 71, z); lv.put("I", 83, z); }
  const library = lv.room("library", { x: 66, z: 25, w: 25, h: 16, floor: G, ceil: 7 });
  // (the cloister does not open on the library: the way goes through the chapter house: ./monasteryMore.ts)
  lv.carve(66, 25, 90, 26, UPPER).carve(89, 25, 90, 40, UPPER).stairs(89, 40, 90, 33, { from: G, to: UPPER });
  const reading = lv.room("reading room", { x: 76, z: 19, w: 5, h: 5, floor: UPPER });
  lv.door(78, 24, "secret");                                                    // SECRET 6: seen from the gallery, a door in the shelves

  // ---- 7. UNDER THE COURTYARD (0): the ossuary, the cistern, the rite chapel
  const ossuary = lv.room("ossuary", { x: 43, z: 4, w: 18, h: 14 });
  lv.door(42, 13, "plain");                                                     // the gate's stair -> the ossuary
  for (let x = 45; x <= 59; x += 2) { lv.put("I", x, 6); lv.put("I", x, 15); }   // the wall niches of bones
  for (let z = 8; z <= 13; z += 2) { lv.put("I", 47, z); lv.put("I", 53, z); lv.put("I", 57, z); }
  lv.carve(40, 6, 41, 6, 0); lv.door(42, 6, "plain");                           // the ossuary -> the cistern
  const cistern = lv.room("cistern", { x: 26, z: 2, w: 14, h: 23, ceil: 7 });
  lv.carve(26, 9, 35, 10, TERRACE).carve(32, 2, 33, 24, TERRACE);               // the bridges, across and along
  lv.stairs(36, 9, 38, 10, { from: TERRACE, to: 0 }).stairs(32, 20, 33, 24, { from: TERRACE, to: 0 }).stairs(28, 6, 28, 8, { from: 0, to: TERRACE });
  for (const [x, z] of [[29, 5], [36, 5], [29, 14], [36, 14], [29, 19], [36, 19]] as const) lv.put("I", x, z);
  const chapel = lv.room("rite chapel", { x: 6, z: 14, w: 19, h: 13, ceil: 8 });
  carveAround(lv, 6, 6, 24, 13, 0, [[14, 9, 18, 13]]);                           // the north of the chapel, round the altar block
  lv.door(25, 16, "plain");                                                     // the cistern -> the rite chapel
  // the altar stands against the block; (16,16) before it is where the great gate out opens when the Gravedigger dies
  for (let x = 10; x <= 22; x += 3) { lv.put("I", x, 8); lv.put("I", x, 22); }
  for (const z of [13, 16, 19]) { lv.put("I", 10, z); lv.put("I", 22, z); }

  const rooms: MonasteryRooms = { cell, hall, niche, gchapel, tomb, hoard, niches, bellroom, reception, cold, drawers, autopsy, ashes, cloister, library, reading, ossuary, cistern, chapel };
  moreMonastery(lv);   // the side spaces each region was missing (./monasteryMore.ts)
  populateMonastery(lv, rooms);
  const level = lv.build();
  // the lift's shaft and the bell chamber stand open to the top of the tower
  for (const [x, z] of [[58, 38], [59, 38]] as const) { if (level.cmap) level.cmap[z][x] = TOP + 3.4; if (level.hmap) level.hmap[z][x] = TOP; }   // the lift starts at the top
  level.zones = monasteryZones(W, H);
  level.script = MONASTERY_SCRIPT;
  return level;
}

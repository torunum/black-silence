import type { BuiltLevel } from "../LevelBuilder";
import { LevelPlan } from "../authoring/Plan";
import { dressNecropolis } from "./dressNecropolis";

/**
 * LEVEL 3 — THE NECROPOLIS, rebuilt (owner, 2026-10-21: "bölümleri de geliştirelim. hala zayıf duruyorlar. cok gelişmeleri lazım").
 *
 * The level it replaces was the reference's lattice — a 4 x 4 grid of 7 x 5 rooms joined door by door — with the necropolis's names on
 * it, the critical path the same 44 steps as the graveyard's, the sewers' and the factory's ("the same building with different
 * wallpaper", `docs/level-density.md`), and its key opening a side chamber nobody needed. `tests/fidelity.test.ts` records the
 * divergence and pins this level in the reference's place. Written with `LevelPlan`, held to the numbers a rebuilt level must meet
 * (`src/world/structure/targets.ts`), as the dungeon, the church and the cathedral are.
 *
 * The city the parish buried under the hill, come in at its cemetery gate. Three floors (raised, never sunk):
 *
 *   floor 2.4   the cemetery stair where the player comes down into it; the embalmers' loft, where THE RED KEY is kept
 *   floor 1.2   the street of the dead and its two tomb houses (joined behind: a loop), the warden's crypt behind a secret door;
 *               the ossuary church over the plaza
 *   floor 0     the plaza of the dead (the arena, among its obelisks), the reliquary off it behind a secret door, the burial pits
 *               (THE EXECUTIONER among the open graves) under the loft, the bone road, and THE COURT OF THE SOVEREIGN at its end
 *
 *   - THE WAY: the stair -> the street (the tomb houses off it) -> the plaza (the shrine at its mouth) -> up into the ossuary church
 *     (THE CATHEDRAL GUARDIAN) by either of its two stairs (the loop) -> the embalmers' loft (the key: the key hunt) -> back down to
 *     the plaza -> the sovereign's gate (locked: the key opens it) -> the bone road -> the court -> THE BONE SOVEREIGN. Its death
 *     opens the exit at (16,16), in the court (`DoorSite.ts`'s `EXIT_CELLS`).
 *   - THE WING: the burial pits, down from the loft's west end: the Executioner and what he keeps.
 *   - Doors stand on floors 0 and 1.2 only; the loft has doorways.
 *   - No `C`, no `V`, no `A` (KNOWN-4, KNOWN-11): armour is `r`.
 */
export const W = 54, H = 46;
export const MID = 1.2, UP = 2.4;

export function buildNecropolis(): BuiltLevel {
  const lv = new LevelPlan(W, H, "necropolis").headroom(3);

  // ---- 2.4
  const stair = lv.room("cemetery stair", { x: 2, z: 36, w: 6, h: 6, floor: UP, ceil: 6.4 });
  const loft = lv.room("embalmers' loft", { x: 20, z: 5, w: 9, h: 6, floor: UP });
  // ---- 1.2
  const street = lv.room("street of the dead", { x: 11, z: 37, w: 18, h: 4, floor: MID, ceil: 6 });
  const tombA = lv.room("tomb of the lamplighters", { x: 11, z: 29, w: 7, h: 6, floor: MID });
  const tombB = lv.room("tomb of the drowned", { x: 20, z: 29, w: 7, h: 6, floor: MID });
  const crypt = lv.room("warden's crypt", { x: 5, z: 29, w: 5, h: 5, floor: MID });
  const church = lv.room("ossuary church", { x: 32, z: 5, w: 16, h: 12, floor: MID, ceil: 7.2 });
  // ---- 0
  const plaza = lv.room("plaza of the dead", { x: 32, z: 22, w: 19, h: 17, ceil: 8 });
  const reliquary = lv.room("reliquary", { x: 37, z: 40, w: 8, h: 4 });
  const pits = lv.room("burial pits", { x: 2, z: 3, w: 17, h: 8 });
  const court = lv.room("court of the sovereign", { x: 14, z: 12, w: 13, h: 11, ceil: 7 });

  // ---- the ways between
  lv.corridor(stair, street);                                         // down off the stair onto the street
  lv.corridor([14, 35], [14, 36], { door: "plain" });                 // the tomb houses' doors
  lv.corridor([23, 35], [23, 36], { door: "plain" });
  lv.corridor([18, 31], [19, 31]);                                    // joined behind: the loop
  lv.door(10, 31, "secret");                                          // the lamplighters' tomb -> the warden's crypt
  lv.corridor([28, 38], [32, 38]);                                    // the street's end, the stair down into the plaza
  lv.corridor([34, 22], [34, 16], { door: "plain" });                 // the plaza -> the church: its one stair
  lv.corridor([32, 8], [28, 8]);                                      // the church -> up into the loft
  lv.corridor([20, 9], [18, 9]);                                      // the loft -> down into the pits: the wing
  lv.door(41, 39, "secret");                                          // the plaza -> the reliquary
  lv.corridor([32, 27], court, { via: [[29, 27], [29, 17]], door: "locked" });   // the sovereign's gate and the bone road
  // the plaza's obelisks, the church's arcade, the court's colonnade
  for (const [x, z] of [[36, 26], [46, 26], [36, 33], [46, 33], [41, 29], [41, 30]]) lv.put("I", x, z);
  for (let x = 35; x <= 44; x += 3) { lv.put("I", x, 8); lv.put("I", x, 13); }
  for (const z of [14, 20]) for (const x of [19, 23]) lv.put("I", x, z);

  // ---- the player, the key; the Sovereign's death opens (16,16)
  lv.spawn(stair.at(2, 1)).key(church.at(5, 1));
  lv.enemy("Z", court.at(7, 5));

  // ---- the street and the tombs
  lv.enemy("z", street.at(9, 1), street.at(16, 2)).enemy("w", street.at(13, 0));
  lv.enemy("z", tombA.at(3, 2)).enemy("s", tombA.at(5, 4));
  lv.enemy("t", tombB.at(3, 2)).enemy("g", tombB.at(5, 1));
  lv.enemy("y", crypt.at(2, 2));
  // ---- the plaza: the arena
  lv.enemy("z", plaza.at(4, 3), plaza.at(13, 5), plaza.at(8, 12), plaza.at(16, 13)).enemy("m", plaza.at(9, 9)).enemy("f", plaza.at(2, 11), plaza.at(17, 2))
    .enemy("g", plaza.at(12, 14)).enemy("R", plaza.at(15, 8)).enemy("y", plaza.at(6, 1)).enemy("s", plaza.at(1, 6));
  // ---- the church
  lv.enemy("U", church.at(7, 5)).enemy("z", church.at(2, 2), church.at(13, 9)).enemy("s", church.at(14, 1)).enemy("w", church.at(1, 10));
  // ---- the loft, the pits
  lv.enemy("R", loft.at(2, 3)).enemy("f", loft.at(4, 5));
  lv.enemy("E", pits.at(5, 4)).enemy("z", pits.at(10, 2), pits.at(13, 6)).enemy("t", pits.at(2, 6)).enemy("k", pits.at(14, 1));
  // ---- the bone road and the court
  lv.enemy("w", [29, 22]).enemy("g", [30, 27]);
  lv.enemy("s", court.at(2, 2), court.at(11, 8)).enemy("j", court.at(11, 1));

  // ---- the supply
  lv.pickup("h", stair.at(0, 0), stair.at(5, 5)).pickup("a", stair.at(5, 0)).pickup("b", stair.at(0, 5));
  lv.pickup("a", street.at(4, 0), street.at(12, 3), street.at(17, 0)).pickup("h", street.at(15, 3)).pickup("b", street.at(8, 3));
  lv.pickup("a", tombA.at(0, 0), tombA.at(6, 5)).pickup("h", tombA.at(6, 0)).pickup("b", tombA.at(0, 5));
  lv.pickup("o", tombB.at(6, 0)).pickup("h", tombB.at(0, 5)).pickup("a", tombB.at(6, 5)).pickup("e", tombB.at(0, 0));
  lv.pickup("r", crypt.at(0, 0)).pickup("h", crypt.at(4, 4)).pickup("6", crypt.at(4, 0)).pickup("c", crypt.at(0, 4));
  lv.pickup("a", plaza.at(0, 0), plaza.at(18, 0), plaza.at(0, 15), plaza.at(18, 15)).pickup("h", plaza.at(9, 0), plaza.at(9, 15), plaza.at(18, 8))
    .pickup("b", plaza.at(0, 8), plaza.at(14, 15)).pickup("o", plaza.at(4, 15)).pickup("r", plaza.at(18, 12)).pickup("1", plaza.at(11, 0));
  lv.pickup("7", reliquary.at(1, 1)).pickup("r", reliquary.at(6, 1)).pickup("h", reliquary.at(3, 3)).pickup("o", reliquary.at(5, 3));
  lv.pickup("a", church.at(0, 0), church.at(15, 11)).pickup("h", church.at(14, 0), church.at(0, 11), church.at(8, 11)).pickup("b", church.at(8, 0))
    .pickup("r", church.at(15, 6)).pickup("c", church.at(0, 6)).pickup("o", church.at(11, 11));
  lv.pickup("h", loft.at(8, 0), loft.at(8, 5)).pickup("a", loft.at(1, 5)).pickup("b", loft.at(4, 0));
  lv.pickup("u", pits.at(0, 0)).pickup("1", pits.at(0, 7), pits.at(16, 7)).pickup("h", pits.at(8, 7), pits.at(16, 0)).pickup("r", pits.at(8, 0)).pickup("b", pits.at(4, 7));
  lv.pickup("a", [29, 20]).pickup("h", [29, 25]);
  lv.pickup("h", court.at(0, 0), court.at(12, 10), court.at(0, 10)).pickup("r", court.at(12, 0)).pickup("b", court.at(6, 10)).pickup("c", court.at(12, 5));
  lv.prop("O", plaza.at(3, 7), plaza.at(15, 11)).prop("O", pits.at(12, 4)).prop("x", tombB.at(4, 4));

  // ---- the light: torches (real lights, within the budget), candles; then glow in the dressing
  lv.light("i", stair.at(0, 2), street.at(6, 0), street.at(17, 3), plaza.at(0, 4), plaza.at(18, 4), plaza.at(9, 6), church.at(0, 3), church.at(15, 3),
    loft.at(6, 0), pits.at(1, 3), court.at(6, 0), court.at(3, 10));
  lv.light("l", tombA.at(3, 0), tombB.at(3, 5), crypt.at(2, 0), reliquary.at(0, 0), church.at(7, 11));

  const rooms = { stair, loft, street, tombA, tombB, crypt, church, plaza, reliquary, pits, court };
  lv.dress((d) => dressNecropolis(d, rooms));
  lv.checkpoint([30, 38], { side: "s" });   // the street's end, above the plaza: every route
  lv.checkpoint([34, 19], { side: "w" });   // the church stair: every route to the key
  lv.checkpoint([29, 19], { side: "e" });   // the bone road, the last before the Sovereign
  return lv.build();
}

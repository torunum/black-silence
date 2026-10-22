import type { BuiltLevel } from "../LevelBuilder";
import { LevelPlan } from "../authoring/Plan";
import { dressGraveyard } from "./dressGraveyard";
import { graveyardZones } from "./graveyardZones";

/**
 * LEVEL 4 — THE GRAVEYARD, rebuilt (owner, 2026-10-21: "bölümleri de geliştirelim. hala zayıf duruyorlar"). The reference's
 * graveyard was the necropolis's lattice again with other names on its rooms and the same 44-step way through; `tests/fidelity.test.ts`
 * records the divergence. Written with `LevelPlan` and held to the numbers a rebuilt level must meet (`src/world/structure/targets.ts`).
 *
 * The parish's own burying ground, at night, on its hill: the lychgate at its foot, the potter's field, the gravekeeper's cottage and
 * its loft, the terraces of the old families climbing the hill to the chapel of rest at its top, the charnel under the chapel, and the
 * new graves behind the cemetery gate, where the one who digs them is waiting. Three floors (raised, never sunk):
 *
 *   floor 2.4   the gravekeeper's loft; the upper terrace
 *   floor 1.2   the lower terrace and the family vault behind its secret door; the chapel of rest and its bell loft (a secret)
 *   floor 0     the lychgate, the yew walk, the potter's field (the arena), the cottage, the charnel, the new graves
 *
 *   - THE WAY: the lychgate -> the potter's field -> the cottage (THE RED KEY is up in its loft: the key hunt) -> the terraces up the
 *     hill (the loft's own bridge to the upper terrace makes the loop) -> the chapel of rest (THE CATHEDRAL GUARDIAN) -> down into the
 *     charnel (THE EXECUTIONER) -> the cemetery gate (locked: the key opens it) -> the new graves -> THE GRAVEDIGGER. His death opens
 *     the exit at (16,16), among the new graves (`DoorSite.ts`'s `EXIT_CELLS`).
 *   - THE WING: the yew walk, north from the lychgate along the west wall: the dogs, and what the dead left there.
 *   - No `C`, no `V`, no `A` (KNOWN-4, KNOWN-11): armour is `r`.
 */
export const W = 62, H = 46;
export const MID = 1.2, UP = 2.4;

export function buildGraveyard(): BuiltLevel {
  const lv = new LevelPlan(W, H, "graveyard").headroom(3);

  // ---- 0
  const lych = lv.room("lychgate", { x: 2, z: 36, w: 7, h: 7 });
  const yews = lv.room("yew walk", { x: 2, z: 4, w: 8, h: 28 });
  const field = lv.room("potter's field", { x: 11, z: 33, w: 20, h: 10, ceil: 9 });
  const cottage = lv.room("gravekeeper's cottage", { x: 34, z: 35, w: 8, h: 7 });
  const charnel = lv.room("charnel", { x: 29, z: 3, w: 9, h: 8 });
  const graves = lv.room("new graves", { x: 14, z: 10, w: 14, h: 12, ceil: 9 });
  // ---- 1.2
  const terr1 = lv.room("lower terrace", { x: 45, z: 33, w: 13, h: 9, floor: MID, ceil: 9 });
  const vault = lv.room("family vault", { x: 59, z: 35, w: 2, h: 5, floor: MID });
  const chapel = lv.room("chapel of rest", { x: 40, z: 4, w: 14, h: 12, floor: MID, ceil: 7 });
  const bells = lv.room("bell loft", { x: 42, z: 1, w: 6, h: 2, floor: MID });
  // ---- 2.4
  const loft = lv.room("gravekeeper's loft", { x: 34, z: 27, w: 8, h: 5, floor: UP });
  const terr2 = lv.room("upper terrace", { x: 45, z: 21, w: 13, h: 9, floor: UP, ceil: 9 });

  // ---- the ways between
  lv.corridor([5, 36], [5, 31]);                                     // the lychgate -> the yew walk
  lv.corridor([9, 28], [11, 33]);                                    // the yew walk's gap in the hedge, into the potter's field: the loop
  lv.corridor([8, 39], [11, 39]);                                    // the lychgate -> the potter's field
  lv.corridor([30, 38], [34, 38], { door: "plain" });                // the field -> the cottage
  lv.corridor([37, 35], [37, 31]);                                   // the cottage's stair up to its loft
  lv.corridor([41, 38], [45, 38], { door: "plain" });                // the cottage -> the lower terrace
  lv.corridor([47, 33], [47, 29]);                                   // the terrace steps
  lv.corridor([46, 15], [46, 21], { door: "plain" });                // the upper terrace -> the chapel of rest
  lv.corridor([40, 10], [37, 10], { door: "plain" });                  // the chapel -> down into the charnel
  lv.corridor([29, 10], [26, 12], { door: "locked" });                // the cemetery gate -> the new graves
  lv.door(58, 37, "secret");                                         // the lower terrace -> the family vault
  lv.door(44, 3, "secret");                                          // the chapel -> the bell loft
  // the chapel's columns
  for (const x of [43, 47, 51]) { lv.put("I", x, 7); lv.put("I", x, 12); }

  // ---- the player, the key; the Gravedigger's death opens (16,16)
  lv.spawn(lych.at(5, 3)).key(loft.at(1, 1));
  lv.enemy("N", graves.at(7, 6));

  // ---- the yews (the wing)
  lv.enemy("g", yews.at(3, 20), yews.at(5, 12)).enemy("z", yews.at(2, 6), yews.at(6, 2)).enemy("w", yews.at(4, 16));
  // ---- the field: the arena
  lv.enemy("z", field.at(3, 2), field.at(8, 6), field.at(12, 3), field.at(17, 7)).enemy("w", field.at(6, 8), field.at(14, 1)).enemy("f", field.at(16, 4))
    .enemy("m", field.at(10, 5)).enemy("g", field.at(18, 8)).enemy("s", field.at(1, 7));
  // ---- the cottage and its loft
  lv.enemy("t", cottage.at(5, 2)).enemy("s", loft.at(6, 3)).enemy("z", loft.at(3, 1));
  // ---- the terraces
  lv.enemy("z", terr1.at(4, 3), terr1.at(9, 6)).enemy("f", terr1.at(11, 1)).enemy("m", terr1.at(6, 7));
  lv.enemy("w", terr2.at(3, 4), terr2.at(10, 2)).enemy("g", terr2.at(7, 6)).enemy("t", terr2.at(1, 1));
  // ---- the chapel, the charnel
  lv.enemy("U", chapel.at(7, 5)).enemy("s", chapel.at(2, 2), chapel.at(12, 10)).enemy("z", chapel.at(12, 1));
  lv.enemy("E", charnel.at(4, 4)).enemy("w", charnel.at(1, 1));
  // ---- the new graves
  lv.enemy("z", graves.at(2, 2), graves.at(11, 9)).enemy("w", graves.at(11, 2));

  // ---- the supply
  lv.pickup("h", lych.at(0, 0), lych.at(6, 6)).pickup("a", lych.at(6, 0)).pickup("b", lych.at(0, 6));
  lv.pickup("a", yews.at(0, 0), yews.at(7, 10)).pickup("h", yews.at(7, 0), yews.at(0, 18)).pickup("4", yews.at(1, 3)).pickup("r", yews.at(7, 25)).pickup("b", yews.at(0, 26));
  lv.pickup("a", field.at(0, 0), field.at(19, 0), field.at(19, 9)).pickup("h", field.at(9, 0), field.at(9, 9), field.at(0, 9)).pickup("b", field.at(5, 9), field.at(15, 0))
    .pickup("r", field.at(19, 5)).pickup("e", field.at(4, 0));
  lv.pickup("h", cottage.at(0, 0), cottage.at(7, 6)).pickup("b", cottage.at(7, 0)).pickup("a", cottage.at(0, 6));
  lv.pickup("o", loft.at(7, 0)).pickup("h", loft.at(7, 4)).pickup("c", loft.at(0, 4));
  lv.pickup("a", terr1.at(0, 0), terr1.at(12, 8)).pickup("h", terr1.at(12, 0), terr1.at(0, 8)).pickup("b", terr1.at(6, 0)).pickup("r", terr1.at(6, 8));
  lv.pickup("7", vault.at(0, 0)).pickup("r", vault.at(1, 2)).pickup("h", vault.at(0, 4)).pickup("o", vault.at(1, 4));
  lv.pickup("a", terr2.at(0, 8), terr2.at(12, 8)).pickup("h", terr2.at(12, 0), terr2.at(6, 8)).pickup("o", terr2.at(0, 4)).pickup("1", terr2.at(12, 4));
  lv.pickup("a", chapel.at(0, 0), chapel.at(13, 11)).pickup("h", chapel.at(13, 0), chapel.at(0, 11), chapel.at(7, 11)).pickup("b", chapel.at(7, 0))
    .pickup("r", chapel.at(13, 6)).pickup("c", chapel.at(0, 6)).pickup("u", chapel.at(4, 11));
  lv.pickup("9", bells.at(0, 0)).pickup("r", bells.at(5, 1)).pickup("h", bells.at(3, 0)).pickup("c", bells.at(5, 0));
  lv.pickup("a", charnel.at(0, 0), charnel.at(8, 7)).pickup("h", charnel.at(8, 0), charnel.at(0, 7)).pickup("b", charnel.at(4, 7)).pickup("1", charnel.at(8, 4));
  lv.pickup("h", graves.at(0, 0), graves.at(13, 11), graves.at(0, 11)).pickup("r", graves.at(13, 0)).pickup("b", graves.at(6, 11)).pickup("o", graves.at(13, 6));
  lv.prop("O", field.at(7, 4), terr1.at(3, 6)).prop("x", cottage.at(3, 5)).prop("T", cottage.at(4, 2));

  // ---- the light: torches (real lights, within the budget); then the lanterns of the dressing
  lv.light("i", lych.at(0, 3), field.at(0, 4), field.at(19, 3), cottage.at(7, 3), terr1.at(12, 4), terr2.at(0, 1), chapel.at(0, 3), chapel.at(13, 3),
    charnel.at(0, 4), graves.at(6, 0));
  lv.light("l", vault.at(1, 0), bells.at(1, 1), chapel.at(7, 1), graves.at(0, 6), yews.at(4, 0));

  const rooms = { lych, yews, field, cottage, charnel, graves, terr1, vault, chapel, bells, loft, terr2 };
  lv.dress((d) => dressGraveyard(d, rooms));
  lv.checkpoint([47, 31], { side: "w" });   // the terrace steps: every route
  lv.checkpoint([46, 17], { side: "w" });   // the steps up to the chapel
  lv.checkpoint([38, 10], { side: "n" });    // the stair down into the charnel, the last before the Gravedigger
  const L = lv.build();
  L.zones = graveyardZones(W, H);   // under the sky but for its roofs (2026-10-22: it was roofed over like a cellar)
  // masses an enemy walking at a player was found pinned against (tests/enemies/stuckCheck.test.ts), taken out
  L.decor = L.decor!.filter((s) => !PINNERS.includes(`${s.k}@${Math.floor(s.x + .5)},${Math.floor(s.z + .5)}`));
  return L;
}

export const PINNERS: readonly string[] = [];

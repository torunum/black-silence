import type { BuiltLevel } from "../LevelBuilder";
import { LevelPlan } from "../authoring/Plan";
import { dressWomb } from "./dressWomb";

/**
 * LEVEL 8 — THE WOMB, rebuilt (owner, 2026-10-21: "bölümleri de geliştirelim. hala zayıf duruyorlar"). The reference's womb was the
 * lattice of seven-by-five rooms with flesh on its walls, 32 steps from the spawn to the heart; `tests/fidelity.test.ts` records the
 * divergence. Written with `LevelPlan` and held to the numbers a rebuilt level must meet (`src/world/structure/targets.ts`).
 *
 * Under the cathedral's crypt the thing the parish fed is one body, and the player walks in it. Three floors (raised, never sunk):
 *
 *   floor 2.4   the lung, where THE RED KEY is held in a fold of it
 *   floor 1.2   the gut; the spine over the heart's chamber (THE CATHEDRAL GUARDIAN); the sac (THE EXECUTIONER); the gland (a secret)
 *   floor 0     the birth canal where the player comes in, the great ventricle (the arena), the cyst behind a secret door, and
 *               THE CHAMBER OF THE HEART
 *
 *   - THE WAY: the canal -> the great ventricle -> up into the gut -> the spine by either of its two vertebral stairs (the loop) -> up
 *     into the lung (the key: the key hunt) -> back -> the valve (locked: the key opens it) -> THE LIVING HEART. Its
 *     death is the end of the game.
 *   - THE WING: the sac, up from the lung: the Executioner, and what it was growing.
 *   - THE BLOOD: a lake of it in the ventricle and round the heart, and the sac full of it (`src/fx/Water.ts`).
 *   - Its Cacodemons are `C` on purpose (KNOWN-4); no `V`, no `A` (KNOWN-11): armour is `r`.
 */
export const W = 50, H = 42;
export const MID = 1.2, UP = 2.4;

export function buildWomb(): BuiltLevel {
  const lv = new LevelPlan(W, H, "womb").headroom(3);

  // ---- 0
  const canal = lv.room("birth canal", { x: 2, z: 29, w: 5, h: 7 });
  const ventricle = lv.room("great ventricle", { x: 9, z: 26, w: 13, h: 11, ceil: 7 });
  const cyst = lv.room("cyst", { x: 12, z: 38, w: 6, h: 2 });
  const heart = lv.room("chamber of the heart", { x: 6, z: 4, w: 18, h: 12, ceil: 9 });
  // ---- 1.2
  const gut = lv.room("gut", { x: 24, z: 29, w: 11, h: 6, floor: MID });
  const spine = lv.room("spine", { x: 25, z: 14, w: 12, h: 8, floor: MID, ceil: 6 });
  const gland = lv.room("gland", { x: 38, z: 13, w: 3, h: 4, floor: MID });
  const sac = lv.room("sac", { x: 40, z: 3, w: 8, h: 7, floor: MID });
  // ---- 2.4
  const lung = lv.room("lung", { x: 38, z: 20, w: 8, h: 14, floor: UP, ceil: 6 });

  // ---- the ways between
  lv.corridor([6, 32], [9, 32]);                                     // the canal opens into the ventricle
  lv.corridor([21, 31], [24, 31], { door: "plain" });                // the ventricle -> up into the gut
  lv.corridor([27, 29], [27, 21], { door: "plain" });                // the gut -> the spine: one vertebral stair
  lv.corridor([32, 29], [32, 21], { door: "plain" });                //   and the other: the loop
  lv.corridor([36, 21], [38, 21]);                                   // the spine -> up into the lung
  lv.corridor([42, 20], [42, 9]);                                    // the lung -> down into the sac: the wing
  lv.corridor([25, 15], [23, 15], { door: "locked" });              // the valve, into the heart's chamber
  lv.door(15, 37, "secret");                                         // the ventricle -> the cyst
  lv.door(37, 15, "secret");                                         // the spine -> the gland
  // cartilage: the ventricle's columns, the spine's, the heart chamber's
  for (const [x, z] of [[12, 29], [18, 29], [12, 33], [18, 33]]) lv.put("I", x, z);
  for (const x of [28, 31, 34]) { lv.put("I", x, 16); lv.put("I", x, 19); }
  for (const [x, z] of [[9, 7], [18, 7], [9, 12], [18, 12]]) lv.put("I", x, z);

  // ---- the player, the key, the heart
  lv.spawn(canal.at(4, 2)).key(lung.at(4, 6));
  lv.enemy("G", heart.at(11, 6));

  // ---- the ventricle: the arena
  lv.enemy("z", ventricle.at(2, 2), ventricle.at(10, 8), ventricle.at(11, 1)).enemy("t", ventricle.at(5, 5), ventricle.at(1, 9)).enemy("f", ventricle.at(8, 3))
    .enemy("m", ventricle.at(6, 8)).enemy("C", ventricle.at(10, 9)).enemy("L", ventricle.at(4, 1));
  // ---- the gut, the lung
  lv.enemy("n", gut.at(5, 3)).enemy("j", gut.at(9, 1)).enemy("t", gut.at(1, 4));
  lv.enemy("C", lung.at(3, 8)).enemy("L", lung.at(6, 11), lung.at(1, 4)).enemy("s", lung.at(6, 6));
  // ---- the spine
  lv.enemy("U", spine.at(6, 4)).enemy("j", spine.at(1, 1), spine.at(10, 6)).enemy("w", spine.at(10, 1));
  // ---- the sac (the wing)
  lv.enemy("E", sac.at(4, 3)).enemy("t", sac.at(1, 1), sac.at(6, 5)).enemy("L", sac.at(6, 1));
  // ---- the aorta and the heart's chamber
    lv.enemy("C", heart.at(2, 2)).enemy("n", heart.at(13, 9)).enemy("L", heart.at(13, 2), heart.at(2, 9));

  // ---- the supply
  lv.pickup("h", canal.at(0, 0), canal.at(4, 6)).pickup("a", canal.at(4, 0)).pickup("b", canal.at(0, 6));
  lv.pickup("a", ventricle.at(0, 0), ventricle.at(12, 0), ventricle.at(12, 10)).pickup("h", ventricle.at(6, 0), ventricle.at(0, 10), ventricle.at(6, 10)).pickup("b", ventricle.at(0, 5), ventricle.at(12, 5))
    .pickup("r", ventricle.at(9, 10)).pickup("9", ventricle.at(3, 10)).pickup("o", ventricle.at(9, 0));
  lv.pickup("8", cyst.at(1, 0)).pickup("r", cyst.at(4, 1)).pickup("h", cyst.at(2, 1)).pickup("0", cyst.at(5, 0));
  lv.pickup("a", gut.at(0, 0), gut.at(10, 5)).pickup("h", gut.at(10, 0), gut.at(0, 5)).pickup("b", gut.at(5, 0)).pickup("c", gut.at(5, 5)).pickup("e", gut.at(7, 5));
  lv.pickup("h", lung.at(0, 0), lung.at(7, 13), lung.at(0, 13)).pickup("a", lung.at(7, 0)).pickup("o", lung.at(7, 7)).pickup("0", lung.at(0, 7)).pickup("r", lung.at(4, 13));
  lv.pickup("a", spine.at(0, 0), spine.at(11, 7)).pickup("h", spine.at(11, 0), spine.at(0, 7), spine.at(5, 7)).pickup("b", spine.at(5, 0)).pickup("r", spine.at(11, 4)).pickup("c", spine.at(0, 4));
  lv.pickup("7", gland.at(1, 0)).pickup("r", gland.at(0, 2)).pickup("h", gland.at(2, 3)).pickup("o", gland.at(0, 3));
  lv.pickup("u", sac.at(0, 0)).pickup("1", sac.at(7, 6), sac.at(0, 6)).pickup("h", sac.at(7, 0), sac.at(3, 6)).pickup("r", sac.at(4, 0));
    lv.pickup("h", heart.at(0, 0), heart.at(15, 11), heart.at(0, 11), heart.at(15, 0)).pickup("r", heart.at(7, 0), heart.at(7, 11)).pickup("0", heart.at(0, 5), heart.at(15, 5))
    .pickup("c", heart.at(4, 11)).pickup("o", heart.at(11, 11)).pickup("b", heart.at(11, 0));
  lv.prop("O", ventricle.at(3, 4), gut.at(8, 3)).prop("O", sac.at(2, 4));

  // ---- the light: torches (real lights, within the budget); then the glow bulbs of the dressing
  lv.light("i", canal.at(0, 3), ventricle.at(0, 3), ventricle.at(12, 7), gut.at(10, 2), lung.at(0, 10), spine.at(0, 3), spine.at(11, 2), sac.at(7, 3),
    heart.at(3, 0), heart.at(12, 0), heart.at(3, 11), heart.at(12, 11));
  lv.light("l", cyst.at(0, 0), gland.at(2, 0));

  const rooms = { canal, ventricle, cyst, heart, gut, spine, gland, sac, lung };
  lv.dress((d) => dressWomb(d, rooms));
  lv.checkpoint([23, 31], { side: "n" });   // the ventricle's stair up into the gut: every route
  lv.checkpoint([37, 21], { side: "s" });   // the stair up into the lung: every route to the key
  lv.checkpoint([25, 16], { side: "w" });   // the spine at the valve, the last before the heart
  const L = lv.build();
  // the blood (2026-10-22, `src/fx/Water.ts`): a lake in the ventricle and round the heart, a dry rim along their walls; the sac full
  L.water = [[10, 27, 20, 35], [7, 5, 22, 14], [41, 4, 46, 8]];
  L.fluid = "blood";
  // masses an enemy walking at a player was found pinned against (tests/enemies/stuckCheck.test.ts), taken out
  L.decor = L.decor!.filter((s) => !PINNERS.includes(`${s.k}@${Math.floor(s.x + .5)},${Math.floor(s.z + .5)}`));
  return L;
}

export const PINNERS: readonly string[] = [];

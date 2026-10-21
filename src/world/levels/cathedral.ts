import type { BuiltLevel } from "../LevelBuilder";
import { LevelPlan } from "../authoring/Plan";
import { dressCathedral } from "./dressCathedral";

/**
 * LEVEL 7 — THE BONE CATHEDRAL (owner, 2026-10-20: "daha yeni bölüm eklenmesi"). A new chapter between the factory and the womb:
 * the cathedral the parish built over the thing beneath it, every wall of it laid in bone. Its crypt goes down into the womb.
 *
 * Written with `LevelPlan` and held to the numbers a rebuilt level must meet (`src/world/structure/targets.ts`), as levels 1 and 2 are.
 * The floor is raised, never sunk (the loader draws none below 0), so the cathedral stands at 1.2 and what lies beneath it at 0:
 *
 *   floor 2.4   the triforium (the gallery over the lady chapel: the Holy Cross Launcher and a hoard)
 *   floor 1.2   the cathedral: the nave and its arcade, the two chapels, the sanctuary, the reliquary and the ossuary behind their secret doors
 *   floor 0     the bone porch where the player comes in, the charnel crypt under the nave (two vaults and the narrow passage between them),
 *               and the charnel vault off it where the red key lies
 *
 *   - THE WAY: the porch -> the grand stair up into the nave (the arena: the dead among the pillars and the pews) -> the ramp down at the nave's
 *     south-east -> the east vault of the crypt -> the bone passage (the one way west: a shrine) -> the west vault (the Guardian) -> the charnel vault
 *     (the key: the key hunt) -> back -> the bone gate (locked: the key opens it) and the vestry stair up behind the sanctuary -> THE BONE SOVEREIGN on
 *     its throne. The nave and the sanctuary are not joined: a rood screen of pillars stands between them, which the player sees the throne through
 *     and cannot pass. The Sovereign's death opens the exit at (16,16), in the sanctuary.
 *   - THE LOOP: the nave, the ossuary chapel and the lady chapel, joined behind the nave. THE WING: the lady chapel's stair up to the triforium.
 *   - THE SECRETS: the reliquary off the nave's east wall, the ossuary off the ossuary chapel's west wall.
 *   - Everything that needs a door has it on floor 0 or 1.2; the triforium has a doorway, not a door.
 *   - No `C`, no `V`, no `A` anywhere (KNOWN-4, KNOWN-11): a pew is `v`, armour is `r`.
 */
export const W = 62, H = 46;
export const CH = 1.2, GALLERY = 2.4;

export function buildCathedral(): BuiltLevel {
  const lv = new LevelPlan(W, H, "necropolis").headroom(3);

  // ---- beneath (0)
  const porch = lv.room("bone porch", { x: 52, z: 32, w: 8, h: 8, ceil: 5 });
  const cryptE = lv.room("east vault", { x: 37, z: 33, w: 11, h: 8 });
  const cryptW = lv.room("west vault", { x: 12, z: 33, w: 20, h: 8 });
  const vault = lv.room("charnel vault", { x: 14, z: 42, w: 9, h: 3 });
  // ---- the cathedral (1.2)
  const nave = lv.room("nave", { x: 28, z: 14, w: 20, h: 14, floor: CH, ceil: 7 });
  const chapelN = lv.room("ossuary chapel", { x: 30, z: 6, w: 9, h: 5, floor: CH });
  const chapelL = lv.room("lady chapel", { x: 41, z: 6, w: 7, h: 5, floor: CH });
  const reliquary = lv.room("reliquary", { x: 49, z: 13, w: 4, h: 5, floor: CH });
  const ossuary = lv.room("ossuary", { x: 21, z: 5, w: 8, h: 5, floor: CH });
  const sanctuary = lv.room("sanctuary", { x: 14, z: 12, w: 13, h: 11, floor: CH, ceil: 7.4 });
  // ---- above (2.4)
  const triforium = lv.room("triforium", { x: 51, z: 3, w: 9, h: 6, floor: GALLERY });

  // ---- the ways between
  lv.corridor([55, 31], [48, 21], { via: [[55, 21]], door: "plain" });   // the grand stair: a door at its foot, up from the porch, then west into the nave's east end
  lv.corridor([34, 11], [34, 14], { door: "plain" });                     // the ossuary chapel -> the nave
  lv.corridor([44, 11], [44, 14], { door: "plain" });                     // the lady chapel -> the nave
  lv.corridor([39, 8], [41, 8]);                                          // the two chapels joined behind the nave: the loop
  lv.corridor([48, 8], [51, 8]);                                          // the lady chapel -> up into the triforium (a doorway: no door at 2.4)
  lv.corridor([44, 28], [44, 33], { door: "plain" });                     // the ramp at the nave's south-east, down into the east vault
  lv.corridor([36, 37], [32, 37]);                                        // the bone passage: the one way between the two vaults
  lv.corridor([18, 40], [18, 42], { door: "plain" });                     // the west vault -> the charnel vault (the key)
  lv.corridor([24, 33], [24, 22], { door: "locked" });                    // the bone gate, and the vestry stair up behind the sanctuary
  lv.door(48, 15, "secret");                                              // the nave -> the reliquary
  lv.door(29, 7, "secret");                                               // the ossuary chapel -> the ossuary
  // the rood screen: pillars between the nave and the sanctuary, seen through and not walked
  lv.carve(27, 16, 27, 21, CH);
  for (let z = 16; z <= 21; z++) lv.put("I", 27, z);
  // the nave's arcade
  for (const z of [17, 24]) for (let x = 30; x <= 46; x += 4) lv.put("I", x, z);

  // ---- the player, the key; the Sovereign's death opens (16,16)
  lv.spawn(porch.at(3, 1)).key(vault.at(4, 1));
  lv.enemy("Z", sanctuary.at(5, 4));

  // ---- the quiet porch, then the stair
  lv.enemy("z", [55, 25]).enemy("w", [53, 21]);
  // ---- the nave: the arena
  lv.enemy("z", nave.at(6, 4), nave.at(12, 9), nave.at(16, 2)).enemy("m", nave.at(9, 6)).enemy("f", nave.at(3, 11)).enemy("j", nave.at(14, 12))
    .enemy("g", nave.at(5, 1)).enemy("s", nave.at(18, 7)).enemy("t", nave.at(2, 6));
  lv.enemy("z", chapelN.at(2, 2)).enemy("s", chapelN.at(7, 1));                                 // the ossuary chapel
  lv.enemy("t", chapelL.at(3, 1)).enemy("g", chapelL.at(5, 3));                                 // the lady chapel
  lv.enemy("j", triforium.at(2, 2)).enemy("w", triforium.at(5, 4)).enemy("f", triforium.at(8, 3));   // the triforium
  lv.enemy("z", cryptE.at(3, 2), cryptE.at(8, 6)).enemy("t", cryptE.at(6, 4)).enemy("w", cryptE.at(2, 6));   // the east vault
  lv.enemy("U", cryptW.at(8, 4)).enemy("g", cryptW.at(2, 2), cryptW.at(4, 6)).enemy("w", cryptW.at(14, 2))
    .enemy("z", cryptW.at(17, 6)).enemy("m", cryptW.at(11, 1));                               // the west vault: the Guardian
  lv.enemy("s", vault.at(1, 1)).enemy("z", vault.at(7, 1));                                    // the charnel vault
  lv.enemy("s", sanctuary.at(10, 2)).enemy("j", sanctuary.at(10, 8));                          // the Sovereign's choir

  // ---- the supply
  lv.pickup("h", porch.at(1, 1), porch.at(6, 1)).pickup("a", porch.at(1, 6)).pickup("b", porch.at(6, 6));
  lv.pickup("a", [55, 28]).pickup("h", [52, 21]);
  lv.pickup("d", [56, 34]).pickup("e", [41, 37], [30, 25]);   // DYNAMITE: a bundle on the porch, more in the vault and the nave
  lv.pickup("u", cryptE.at(2, 4)).pickup("1", cryptW.at(10, 4), nave.at(4, 7));   // THE STAKE GUN (2026-10-21) in the east vault, stakes in the west vault and the nave
  lv.pickup("a", nave.at(1, 1), nave.at(19, 1), nave.at(1, 13), nave.at(19, 13)).pickup("h", nave.at(10, 1), nave.at(10, 13), nave.at(19, 7))
    .pickup("b", nave.at(1, 7), nave.at(7, 13)).pickup("o", nave.at(13, 1)).pickup("r", nave.at(19, 10)).pickup("c", nave.at(16, 13));
  lv.pickup("a", chapelN.at(0, 0), chapelN.at(8, 4)).pickup("h", chapelN.at(4, 0)).pickup("b", chapelN.at(0, 4));
  lv.pickup("h", chapelL.at(0, 0)).pickup("a", chapelL.at(6, 4)).pickup("b", chapelL.at(0, 4));
  lv.pickup("6", triforium.at(1, 4)).pickup("c", triforium.at(0, 5), triforium.at(3, 5)).pickup("h", triforium.at(8, 0), triforium.at(8, 5)).pickup("a", triforium.at(4, 0)).pickup("r", triforium.at(6, 5));
  lv.pickup("7", reliquary.at(1, 1)).pickup("r", reliquary.at(2, 3)).pickup("h", reliquary.at(1, 4)).pickup("o", reliquary.at(3, 0));
  lv.pickup("8", ossuary.at(3, 2)).pickup("r", ossuary.at(1, 1)).pickup("h", ossuary.at(6, 1), ossuary.at(1, 4)).pickup("o", ossuary.at(6, 4)).pickup("c", ossuary.at(4, 0));
  lv.pickup("a", cryptE.at(0, 0), cryptE.at(10, 7), cryptE.at(10, 0)).pickup("h", cryptE.at(0, 7), cryptE.at(5, 0)).pickup("b", cryptE.at(5, 7)).pickup("r", cryptE.at(9, 3));
  lv.pickup("a", cryptW.at(0, 0), cryptW.at(0, 7), cryptW.at(19, 0), cryptW.at(19, 7)).pickup("h", cryptW.at(2, 4), cryptW.at(15, 7), cryptW.at(19, 4))
    .pickup("b", cryptW.at(8, 0), cryptW.at(10, 7)).pickup("o", cryptW.at(14, 7)).pickup("r", cryptW.at(5, 0), cryptW.at(6, 7)).pickup("c", cryptW.at(16, 0));
  lv.pickup("h", vault.at(0, 2), vault.at(8, 2)).pickup("r", vault.at(6, 0)).pickup("a", vault.at(2, 0));
  lv.pickup("h", sanctuary.at(0, 10), sanctuary.at(12, 10), sanctuary.at(12, 0)).pickup("r", sanctuary.at(0, 0), sanctuary.at(6, 10))
    .pickup("a", sanctuary.at(3, 10), sanctuary.at(9, 10)).pickup("b", sanctuary.at(12, 5)).pickup("c", sanctuary.at(0, 5)).pickup("o", sanctuary.at(9, 0));
  for (const x of [31, 35, 39, 43]) lv.prop("v", [x, 20]);
  for (const x of [35, 39]) lv.prop("v", [x, 22]);
  lv.prop("O", cryptW.at(13, 3)).prop("x", cryptE.at(7, 2)).prop("O", porch.at(7, 3));

  // ---- the light: torches (real lights, within the budget with the windows), candles; then glow in the dressing
  lv.light("i", porch.at(0, 3), [55, 22], nave.at(0, 3), nave.at(19, 3), nave.at(9, 0), cryptW.at(1, 3), cryptW.at(12, 0), cryptE.at(5, 3),
    triforium.at(0, 0), sanctuary.at(6, 0), vault.at(4, 0));
  for (const x of [37, 41, 47]) lv.window(x, 28);
  lv.window(13, 15).window(13, 19);
  lv.light("l", chapelN.at(4, 4), chapelL.at(3, 4), reliquary.at(0, 0), ossuary.at(0, 0), sanctuary.at(2, 2), sanctuary.at(2, 8));

  const rooms = { porch, cryptE, cryptW, vault, nave, chapelN, chapelL, reliquary, ossuary, sanctuary, triforium };
  lv.dress((d) => dressCathedral(d, rooms));
  lv.checkpoint([50, 21], { side: "n" });   // the top of the grand stair: every route into the nave
  lv.checkpoint([34, 37], { side: "s" });   // the bone passage between the vaults: every route to the key and the Sovereign
  lv.checkpoint([24, 27], { side: "w" });   // the vestry stair, past the bone gate: the last before the Sovereign
  return lv.build();
}

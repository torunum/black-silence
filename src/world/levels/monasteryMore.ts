import type { LevelPlan } from "../authoring/Plan";

/**
 * THE MONASTERY'S SIDE SPACES (the brief: "Her bölge gerektiğinde birkaç alt mekân, bağlantı ve keşif noktası içersin"; and its length:
 * 25-35 minutes made of content, not of corridor). The blockout measured short; each region gets the room it was missing, and most of them
 * a second way through, so the length comes from places and fights:
 *
 *   the family vault        off the crypt cell: the family's sarcophagi, and the first of the dead to stand up
 *   the ruined bone chapel  off the graveyard's west terrace: a gallery over its floor, and a way down into the west wing's coal store
 *   the coal store          under the crematorium: joins the bone chapel to the furnaces — the west wing entered from the graveyard
 *   the embalming room      between the cold room and the autopsy: the way through the morgue goes round by it
 *   the chapter house       east of the cloister: the brothers' hall, pillared, a crowd in it; the way on to the library
 *   the archive stacks      north of the library's gallery, on the gallery's floor (3.0): cultists among the shelves
 *   the bone chapel         east of the ossuary: the quiet broken once
 *   the pump room           over the rite chapel: from the cistern, and down into the chapel's north side — the final entered two ways
 */
export function moreMonastery(lv: LevelPlan): void {
  const G = 1.2, TERRACE = 1.8, UPPER = 3.0;

  // ---- the family vault (0), off the crypt cell's east wall
  const vault = lv.room("family vault", { x: 88, z: 72, w: 9, h: 9 });
  lv.door(87, 77, "plain");
  for (const [x, z] of [[90, 74], [94, 74], [90, 78], [94, 78]] as const) lv.put("I", x, z);
  lv.enemy("z", vault.at(4, 1), vault.at(8, 7)).enemy("w", vault.at(1, 8));
  lv.pickup("b", vault.at(8, 0)).pickup("h", vault.at(0, 0)).pickup("a", vault.at(4, 8));
  lv.light("l", vault.at(4, 4));

  // ---- the ruined bone chapel (1.8, its gallery 3.0), off the graveyard's west terrace
  const ruin = lv.room("ruined bone chapel", { x: 24, z: 69, w: 9, h: 13, floor: TERRACE });
  lv.door(33, 75, "plain");
  lv.carve(24, 69, 32, 70, UPPER).stairs(31, 75, 32, 71, { from: TERRACE, to: UPPER });   // the gallery along its north side, and its stair
  for (const z of [73, 76, 79]) lv.put("I", 28, z);
  lv.enemy("z", ruin.at(6, 2), ruin.at(7, 10)).enemy("j", [24, 70], [25, 72]).enemy("f", ruin.at(5, 6));
  lv.pickup("h", ruin.at(8, 12)).pickup("b", [24, 69]).pickup("a", ruin.at(8, 0));

  // ---- the coal store (1.2), under the crematorium: the bone chapel's way down into the west wing
  const coal = lv.room("coal store", { x: 13, z: 68, w: 10, h: 7, floor: G });
  lv.door(17, 67, "plain").door(23, 74, "plain");
  lv.prop("x", coal.at(1, 1), coal.at(2, 1), coal.at(8, 5)).prop("O", coal.at(8, 1));
  lv.enemy("t", coal.at(5, 3)).enemy("z", coal.at(1, 5), coal.at(7, 3)).enemy("g", coal.at(9, 6));
  lv.pickup("e", coal.at(0, 6)).pickup("b", coal.at(9, 0));

  // ---- the embalming room (1.2): the cold room -> here -> the autopsy, a loop
  const emb = lv.room("embalming room", { x: 12, z: 38, w: 11, h: 9, floor: G });
  lv.door(23, 42, "plain");
  lv.corridor([20, 36], [20, 38], { door: "plain" });
  lv.prop("T", emb.at(3, 3), emb.at(7, 3), emb.at(3, 6), emb.at(7, 6));
  lv.enemy("z", emb.at(1, 1), emb.at(9, 7)).enemy("m", emb.at(5, 4)).enemy("w", emb.at(10, 1));
  lv.pickup("h", emb.at(0, 8)).pickup("a", emb.at(10, 8)).pickup("r", emb.at(5, 0));
  lv.light("l", emb.at(5, 8));

  // ---- the chapter house (1.2), east of the cloister
  const chapter = lv.room("chapter house", { x: 88, z: 44, w: 9, h: 15, floor: G, ceil: 6 });
  lv.door(87, 51, "plain");
  lv.corridor([90, 44], [90, 40], { door: "plain" });   // the chapter house -> up into the library
  for (const z of [47, 51, 55]) { lv.put("I", 90, z); lv.put("I", 94, z); }
  lv.enemy("z", chapter.at(4, 2), chapter.at(4, 12), chapter.at(8, 7)).enemy("f", chapter.at(1, 10)).enemy("j", chapter.at(4, 7)).enemy("s", chapter.at(8, 1));
  lv.pickup("h", chapter.at(8, 14), chapter.at(0, 0)).pickup("b", chapter.at(0, 14)).pickup("a", chapter.at(8, 4));
  lv.light("l", chapter.at(4, 0));

  // ---- the archive stacks (3.0), north of the library's gallery
  const stacks = lv.room("archive stacks", { x: 82, z: 4, w: 15, h: 15, floor: UPPER });
  lv.corridor([88, 25], [88, 18], { door: "plain" });
  for (let x = 84; x <= 94; x += 2) for (const z of [6, 7, 10, 11, 14, 15]) lv.prop("F", [x, z]);
  lv.enemy("j", stacks.at(1, 1), stacks.at(13, 5), stacks.at(7, 13)).enemy("z", stacks.at(13, 13), stacks.at(1, 9)).enemy("f", stacks.at(7, 2));
  lv.pickup("o", stacks.at(14, 0)).pickup("h", stacks.at(0, 14), stacks.at(14, 14)).pickup("a", stacks.at(0, 4)).pickup("b", stacks.at(14, 8));
  lv.light("l", stacks.at(7, 7));

  // ---- the bone chapel (0), east of the ossuary
  const bones = lv.room("bone chapel", { x: 62, z: 4, w: 13, h: 12 });
  lv.door(61, 10, "plain");
  for (const x of [65, 68, 71]) { lv.put("I", x, 6); lv.put("I", x, 13); }
  lv.enemy("w", bones.at(2, 2), bones.at(10, 9), bones.at(11, 1)).enemy("s", bones.at(6, 6)).enemy("t", bones.at(1, 10));
  lv.pickup("h", bones.at(12, 11)).pickup("b", bones.at(12, 0)).pickup("e", bones.at(0, 0));
  lv.pickup("u", bones.at(12, 5)).pickup("1", bones.at(12, 6));   // THE STAKE GUN (2026-10-21) on the chapel's east step, with a bundle of stakes
  lv.light("l", bones.at(6, 0));

  // ---- the pump room (0), over the rite chapel: from the cistern, and down into the chapel's north side
  const pump = lv.room("pump room", { x: 7, z: 1, w: 18, h: 3 });
  lv.door(25, 2, "plain");
  lv.corridor([16, 3], [16, 6], { door: "plain" });
  lv.prop("O", pump.at(2, 1), pump.at(9, 0));
  lv.enemy("t", pump.at(5, 1)).enemy("z", pump.at(13, 2), pump.at(1, 0));
  lv.pickup("h", pump.at(17, 0)).pickup("b", pump.at(0, 2));
}

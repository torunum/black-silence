import type { LevelPlan, Room } from "../authoring/Plan";
import { dressMonastery } from "./dressMonastery";

/** The monastery's rooms, by name (`./monastery.ts` builds them). */
export interface MonasteryRooms {
  cell: Room; hall: Room; niche: Room; gchapel: Room; tomb: Room; hoard: Room; niches: Room[]; bellroom: Room;
  reception: Room; cold: Room; drawers: Room; autopsy: Room; ashes: Room; cloister: Room; library: Room; reading: Room;
  ossuary: Room; cistern: Room; chapel: Room;
}

/**
 * WHAT STANDS IN THE MONASTERY: twelve fights, the seals, the weapons on the way, the supplies, six secrets' rewards, the light and the
 * shrines. Placed by what each place is for:
 *   E1  the crypt hall: two of the dead and a crawler, to wake to                               (start: the flare pistol, 60 rounds)
 *   E2  the graveyard: the dead among the stones, dogs, two cultists shooting from the terraces   (the sawed-off, in the graveyard chapel)
 *   E3  the courtyard, first time: a few, and a wailer
 *   E4  the morgue: close, round corners — reception, the cold room, the autopsy                  (the tommy gun, on the autopsy table)
 *   E5  the crematorium: a crowd to circle round the furnaces, the side ways between them          (DYNAMITE; the ASH SEAL on its platform)
 *   E6  the cloister: a pack of dogs round the garth
 *   E7  the library: the dead on the floor, cultists on the gallery above                          (the combat rifle, on the gallery)
 *   E8  the tower: a fight on every flight and landing                                           (the BELL SEAL; the lever)
 *   E9  the bell's answer: the four niches open in the courtyard, once
 *   E10 the ossuary: quiet, narrow, crawlers in the niches and a wailer
 *   E11 the cistern: cultists on the bridges, the dead and the bloated below
 *   E12 the rite chapel: THE GRAVEDIGGER, his cultists and his runners round the altar
 */
export function populateMonastery(lv: LevelPlan, r: MonasteryRooms): void {
  const { cell, hall, niche, gchapel, tomb, hoard, niches, bellroom, reception, cold, drawers, autopsy, ashes, cloister, library, reading, ossuary, cistern, chapel } = r;

  // ---- the player
  lv.spawn(cell.at(3, 2));
  lv.pickup("h", cell.at(0, 6)).pickup("a", cell.at(6, 6));

  // ---- E1 the crypt hall; SECRET 1 the cracked wall's niche
  lv.enemy("z", hall.at(4, 4), hall.at(11, 4)).enemy("w", hall.at(1, 7));
  lv.pickup("a", hall.at(14, 0)).pickup("h", hall.at(0, 0));
  lv.pickup("r", niche.at(2, 2)).pickup("b", niche.at(0, 0), niche.at(4, 4));

  // ---- E2 the graveyard; the sawed-off in its chapel; SECRET 2 the sealed tomb
  lv.enemy("z", [46, 72], [55, 72], [62, 77], [44, 79], [58, 81]).enemy("f", [44, 75], [66, 74]).enemy("g", [60, 72], [52, 75]);
  lv.enemy("j", [36, 74], [72, 80]);
  lv.pickup("2", gchapel.at(1, 1)).pickup("b", gchapel.at(3, 2), gchapel.at(0, 2)).pickup("h", [69, 70]).pickup("a", [36, 70], [64, 81]);
  lv.pickup("h", tomb.at(0, 0)).pickup("b", tomb.at(1, 1)).pickup("r", tomb.at(1, 0));

  // ---- E3 the courtyard, first time
  lv.enemy("z", [46, 40], [56, 46]).enemy("s", [44, 50]);
  lv.pickup("h", [39, 56], [62, 56]).pickup("b", [52, 33]).pickup("a", [40, 30]);

  // ---- E4 the morgue; SECRET 4 the drawer room
  lv.enemy("z", reception.at(2, 1), cold.at(4, 5)).enemy("w", cold.at(1, 1)).enemy("t", cold.at(7, 2));
  lv.enemy("m", autopsy.at(6, 4)).enemy("z", autopsy.at(2, 6), autopsy.at(11, 1)).enemy("f", autopsy.at(10, 6));
  lv.pickup("4", autopsy.at(6, 1)).pickup("a", reception.at(8, 0), autopsy.at(0, 0)).pickup("h", cold.at(8, 6)).pickup("b", reception.at(0, 6));
  lv.pickup("r", drawers.at(1, 1)).pickup("h", drawers.at(3, 3)).pickup("a", drawers.at(0, 3));

  // ---- E5 the crematorium; the ASH SEAL; SECRET 5 the ash closet
  lv.enemy("f", [19, 52], [26, 64], [12, 58]).enemy("z", [19, 59], [33, 54], [26, 51]).enemy("t", [12, 65], [33, 63]).enemy("j", [11, 52]).enemy("m", [19, 65]);
  lv.put("J", 11, 51);
  lv.pickup("d", [33, 51]).pickup("e", [26, 58], [19, 62]).pickup("h", [33, 66], [10, 63]).pickup("a", [26, 66]).pickup("b", [10, 56]);
  lv.pickup("e", ashes.at(1, 1), ashes.at(1, 2)).pickup("h", ashes.at(0, 3));

  // ---- E6 the cloister
  lv.enemy("g", cloister.at(9, 6), cloister.at(4, 9), cloister.at(14, 4)).enemy("z", cloister.at(16, 12), cloister.at(2, 2));
  lv.pickup("h", cloister.at(18, 14), cloister.at(0, 14)).pickup("b", cloister.at(18, 0)).pickup("a", cloister.at(9, 14));

  // ---- E7 the library and its gallery; SECRET 6 the reading room
  lv.enemy("z", library.at(6, 8), library.at(14, 12), library.at(18, 6)).enemy("f", library.at(3, 13));
  lv.enemy("j", [70, 25], [82, 26], [90, 28]);
  lv.pickup("3", [86, 25]).pickup("a", [74, 26], library.at(12, 15)).pickup("h", library.at(0, 15), [90, 30]).pickup("b", library.at(22, 14));
  lv.pickup("r", reading.at(2, 2)).pickup("a", reading.at(0, 0), reading.at(4, 4)).pickup("h", reading.at(4, 0));

  // ---- E8 the tower; the BELL SEAL
  lv.enemy("f", [62, 33], [63, 30]).enemy("j", [59, 28]).enemy("s", [56, 31]).enemy("m", bellroom.at(2, 1));
  lv.put("M", 60, 36);
  lv.pickup("h", [56, 28], bellroom.at(5, 0)).pickup("a", [63, 28]).pickup("b", bellroom.at(0, 0));
  // SECRET 7 the rampart's hoard
  lv.pickup("b", hoard.at(0, 0), hoard.at(4, 0)).pickup("r", hoard.at(2, 2)).pickup("h", hoard.at(4, 4)).pickup("e", hoard.at(0, 4));

  // ---- E9 what the bell lets out
  lv.enemy("z", niches[0].at(0, 0)).enemy("f", niches[0].at(1, 1));
  lv.enemy("g", niches[1].at(0, 0), niches[1].at(1, 1));
  lv.enemy("m", niches[2].at(0, 0)).enemy("z", niches[2].at(1, 1));
  lv.enemy("f", niches[3].at(0, 0)).enemy("t", niches[3].at(1, 1));

  // ---- E10 the ossuary
  lv.enemy("w", ossuary.at(4, 3), ossuary.at(12, 9), ossuary.at(15, 3), ossuary.at(8, 12)).enemy("s", ossuary.at(16, 12)).enemy("z", ossuary.at(9, 5), ossuary.at(2, 10));
  lv.pickup("h", ossuary.at(17, 0), ossuary.at(0, 13)).pickup("b", ossuary.at(17, 13)).pickup("a", ossuary.at(11, 7));

  // ---- E11 the cistern
  lv.enemy("j", [30, 10], [33, 4]).enemy("z", [28, 17], [37, 22], [37, 3]).enemy("t", [28, 3], [35, 16]);
  lv.pickup("h", cistern.at(0, 22), cistern.at(13, 0)).pickup("b", cistern.at(13, 22)).pickup("a", cistern.at(0, 0)).pickup("e", [32, 3]);

  // ---- E12 the rite chapel: the Gravedigger (his death opens the gate out, at (16,16))
  lv.enemy("N", [16, 14]);
  lv.enemy("j", [8, 7], chapel.at(16, 10)).enemy("f", [22, 7], chapel.at(2, 10));
  lv.pickup("h", chapel.at(18, 12), [24, 6], chapel.at(0, 12)).pickup("b", [6, 6]).pickup("r", chapel.at(18, 4)).pickup("e", chapel.at(0, 4));

  // ---- the light: torches where the eye needs a mark, candles where the dead are kept
  lv.light("i", hall.at(7, 0), [55, 69], [72, 76], [38, 31], [51, 57], reception.at(4, 0), [20, 50], cloister.at(9, 0), library.at(0, 8),
    [60, 37], [41, 14], ossuary.at(0, 0), [13, 7]);   // thirteen: the budget (tests/world/lightBudget.test.ts) with the windows
  lv.light("l", cell.at(6, 0), gchapel.at(2, 0), cold.at(0, 0), ashes.at(2, 0), reading.at(2, 0), ossuary.at(17, 7), [13, 13], [19, 13]);

  // ---- the dressing: each region its own vocabulary (./dressMonastery.ts), then the theme's clutter thinly along what is left
  lv.dress((d) => dressMonastery(d));
  lv.clutter({ density: 0.15, seed: 9 });

  // ---- the shrines: one at each turn of the way
  lv.checkpoint([79, 62], { side: "n" });     // the crypt hall, on the way up
  lv.checkpoint([52, 60], { side: "e" });     // the gatehouse, into the courtyard
  lv.checkpoint([13, 50], { side: "n" });     // the top of the ash platform's stair: every way to the Ash Seal
  lv.checkpoint([90, 41], { side: "e" });     // the stair up from the chapter house: every way to the library
  lv.checkpoint([65, 36], { side: "n" });     // the tower's foot: the one way up to the bell
  lv.checkpoint([41, 15], { side: "e" });     // the foot of the gate's stair
  lv.checkpoint([26, 22], { side: "w" });     // the cistern, before the chapel
}

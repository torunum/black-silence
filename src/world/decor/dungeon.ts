import { grain } from "../../render/BandTextures";
import { loc, skull, WZ, type Piece } from "./kit";

/**
 * THE DUNGEON'S PIECES (and the clutter every dark place shares): shackles
 * on the wall, a hanging cage, straw, a pile of broken crates, an unlit
 * sconce, rubble, a heap of skulls, a bench. Levels-feel-full plan, Task 1.
 *
 * Every piece is boxes and cylinders in its own frame — y=0 on its floor, +z
 * its front, the wall it stands against at z=WZ (-1: half a cell back) — and
 * every scatter of small parts places them by `grain`, the integer hash of
 * the piece's cell, so the same level always builds the same clutter and
 * nothing here calls `Math.random`.
 *
 * The crates are deliberately splintered and stained, and dark gaps show
 * where slats are gone: a player who has shot a `x` crate open will try the
 * same on these, and the shot goes through. Decor takes no shots (see
 * `Decor.ts`); the look is the only signal that these are not the same thing.
 */
const cellHash = (x: number, z: number): number => Math.floor(x) * 31 + Math.floor(z) * 17;

export const DUNGEON_PIECES: Record<string, Piece> = {
  shackles: (box) => {   // a board bolted to the wall with an iron bar, two manacles hanging from it on chains
    box("wood", 1.1, .14, .07, loc(0, 2.2, WZ + .035));
    box("wrought", 1.0, .07, .09, loc(0, 2.1, WZ + .085));
    for (const s of [-.32, .32]) {
      box("wrought", .1, .14, .1, loc(s, 2.0, WZ + .1));
      for (let i = 0; i < 4; i++) box("wrought", i % 2 ? .1 : .03, .15, i % 2 ? .03 : .1, loc(s, 1.85 - i * .13, WZ + .12));
      box("wrought", .26, .07, .2, loc(s, 1.27, WZ + .13));
      box("wrought", .3, .04, .24, loc(s, 1.2, WZ + .13));
    }
  },
  cage: (box, _c, d, top) => {   // an iron cage on a chain from the ceiling, a skull and a bone on its floor
    const yt = Math.min(2.45, top - .3), y0 = yt - .9;
    for (const [x, z] of [[-.28, -.28], [.28, -.28], [-.28, .28], [.28, .28]]) box("wrought", .04, .9, .04, loc(x, y0 + .45, z));
    for (const y of [y0 + .02, yt - .02]) for (const s of [-.28, .28]) {
      box("wrought", .6, .04, .04, loc(0, y, s)); box("wrought", .04, .04, .6, loc(s, y, 0));
    }
    for (const s of [-.28, .28]) { box("wrought", .03, .9, .03, loc(0, y0 + .45, s)); box("wrought", .03, .9, .03, loc(s, y0 + .45, 0)); }
    box("wrought", .6, .03, .6, loc(0, y0 + .01, 0));
    const n = Math.floor((top - yt) / .17);
    for (let i = 0; i < n; i++) box("wrought", i % 2 ? .08 : .025, .16, i % 2 ? .025 : .08, loc(0, yt + .1 + i * .17, 0));
    skull(box, loc(.05, y0 + .02, .02, 0, .5));
    box("bone", .3, .04, .04, loc(-.12, y0 + .05, -.1, 0, .7));
  },
  straw: (box, _c, d) => {   // a bed of straw: nine layers of stalks
    const s = cellHash(d.x, d.z);
    for (let i = 0; i < 9; i++) {
      const x = (grain(i, s, 21) - .5) * 1.2, z = (grain(i, s, 22) - .5) * 1.2;
      box("straw", .4 + grain(i, s, 23) * .4, .05, .16 + grain(i, s, 26) * .1, loc(x, .03 + (i % 3) * .022, z, 0, grain(i, s, 24) * Math.PI));
    }
  },
  cratepile: (box, _c, d) => {   // two crates and a third askew on top, slats gone, a plank on the floor
    const t = (grain(1, cellHash(d.x, d.z), 25) - .5) * .3;
    box("crate", .8, .8, .8, loc(-.5, .4, WZ + .45, 0, .05 + t));
    box("crate", .74, .74, .74, loc(.45, .37, WZ + .43, 0, -.12));
    box("crate", .62, .62, .62, loc(-.42, 1.11, WZ + .44, 0, .4 + t));
    box("dark", .5, .07, .02, loc(-.5, .52, WZ + .89));
    box("dark", .44, .06, .02, loc(.45, .3, WZ + .82));
    box("crate", .62, .05, .14, loc(.25, .03, WZ + 1.0, 0, .5));
  },
  sconce: (box, cyl) => {   // an iron bracket and cup with a charred stub of torch in it — out
    box("wrought", .24, .44, .06, loc(0, 1.9, WZ + .04));
    box("wrought", .1, .1, .38, loc(0, 1.78, WZ + .22));
    cyl("wrought", .16, .1, .2, loc(0, 1.86, WZ + .4), 6);
    cyl("bark", .07, .08, .55, loc(0, 2.1, WZ + .4, .06), 5);
    box("dark", .14, .08, .14, loc(0, 2.4, WZ + .41));
  },
  rubble: (box, _c, d) => {   // fallen masonry: eleven chunks of stone
    const s = cellHash(d.x, d.z);
    for (let i = 0; i < 11; i++) {
      const w = .2 + grain(i, s, 27) * .4, h = .12 + grain(i, s, 28) * .28;
      box("rock", w, h, .2 + grain(i, s, 29) * .35, loc((grain(i, s, 30) - .5) * 1.5, h / 2 - .02, (grain(i, s, 31) - .5) * 1.5,
        grain(i, s, 32) * .5, grain(i, s, 33) * 3, grain(i, s, 34) * .5));
    }
  },
  skullpile: (box, _c, d) => {   // four skulls heaped, two long bones
    const s = cellHash(d.x, d.z);
    skull(box, loc(-.22, 0, -.05, 0, .5), 1.6); skull(box, loc(.2, 0, .05, 0, -.4), 1.5); skull(box, loc(0, 0, .35, 0, 2.5), 1.6);
    skull(box, loc(-.02, .17, .05, 0, .2 + grain(1, s, 35)), 1.4);
    box("bone", .5, .06, .06, loc(.45, .04, -.25, 0, .8)); box("bone", .45, .06, .06, loc(-.4, .04, .4, 0, -.5));
  },
  bench: (box) => {   // a plank bench along the wall
    box("wood", 1.7, .07, .4, loc(0, .42, WZ + .3));
    box("wood", .08, .4, .34, loc(-.7, .2, WZ + .3)); box("wood", .08, .4, .34, loc(.7, .2, WZ + .3));
  },
};

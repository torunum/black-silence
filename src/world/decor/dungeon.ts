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
  cratepile: (box, _c, d) => {   // strapped crates, dark with age: a lid pried off the top one, a wall of slats stove in, a tarp over the third
    const t = (grain(1, cellHash(d.x, d.z), 25) - .5) * .3;
    const strapped = (x: number, y: number, z: number, s: number, ry: number): void => {
      box("crate", s, s, s, loc(x, y, z, 0, ry));
      for (const dy of [-.3, .3]) box("wrought", s + .03, .06, s + .03, loc(x, y + dy * s, z, 0, ry));
    };
    strapped(-.5, .4, WZ + .45, .8, .05 + t);
    strapped(.45, .37, WZ + .43, .74, -.12);
    strapped(-.42, 1.11, WZ + .44, .62, .4 + t);
    box("dark", .5, .02, .5, loc(-.42, 1.43, WZ + .44, 0, .4 + t));   // the open top of the upper crate, and the slats left across it
    box("crate", .5, .04, .08, loc(-.42, 1.44, WZ + .44, 0, .4 + t)); box("crate", .08, .04, .5, loc(-.3, 1.44, WZ + .4, 0, .4 + t));
    box("dark", .5, .07, .02, loc(-.5, .52, WZ + .89));
    box("dark", .44, .06, .02, loc(.45, .3, WZ + .82));
    box("canvas", .72, .05, .6, loc(.45, .76, WZ + .43, .08, -.12, .1));
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
  rack: (box, cyl) => {   // a torture rack: a plank bed on four legs between two windlass rollers with hand-spokes, ropes and a cuff at each end
    for (const x of [-.8, .8]) for (const z of [-.3, .3]) box("wood", .12, .5, .12, loc(x, .25, z));
    for (const z of [-.3, .3]) box("wood", 1.85, .1, .12, loc(0, .55, z));
    for (let i = 0; i < 6; i++) box("wood", .16, .05, .6, loc(-.7 + i * .28, .61, 0));
    for (const x of [-.85, .85]) {
      cyl("bark", .1, .1, .84, loc(x, .72, 0, Math.PI / 2), 6);
      box("wrought", .05, .5, .05, loc(x, .72, .43)); box("wrought", .05, .05, .3, loc(x, .95, .43));
      box("wrought", .16, .04, .16, loc(x * .82, .66, .16)); box("wrought", .16, .04, .16, loc(x * .82, .66, -.16));
      box("bark", .04, .03, .36, loc(x * .9, .68, 0));
    }
    box("blood", .7, .01, .34, loc(-.1, .645, 0, 0, .2));
  },
  slab: (box, cyl) => {   // a stone execution slab: a block base, a slate top channelled for blood, iron rings at the corners, a pail
    box("rock", 1.5, .6, .6, loc(0, .3, 0));
    box("slate", 1.85, .16, .9, loc(0, .68, 0));
    box("blood", 1.5, .02, .07, loc(0, .77, 0)); box("blood", .07, .02, .5, loc(.55, .77, 0));
    for (const x of [-.85, .85]) for (const z of [-.4, .4]) box("wrought", .1, .1, .06, loc(x, .68, z * 1.08));
    box("blood", .3, .012, .3, loc(.7, .006, .6));
    cyl("wrought", .14, .11, .24, loc(.7, .12, .6), 6);
  },
  maiden: (box) => {   // an iron maiden: a tall riveted iron case, its door swung open on a black inside set with spikes
    box("rustplate", .86, 1.9, .6, loc(0, .95, WZ + .35));
    box("wrought", .94, .1, .66, loc(0, 1.95, WZ + .35)); box("wrought", .9, .1, .64, loc(0, .05, WZ + .35));
    box("dark", .5, 1.5, .02, loc(-.05, 1.05, WZ + .66));
    for (let i = 0; i < 5; i++) for (const s of [-.2, .1]) box("wrought", .03, .03, .16, loc(s, .55 + i * .27, WZ + .72));
    box("rustplate", .42, 1.8, .05, loc(.7, .95, WZ + .7, 0, -1.0));
    box("blood", .05, .5, .02, loc(.12, .7, WZ + .67));
  },
  stocks: (box) => {   // the pillory: two posts, a hinged board with three holes, on a low base, a beam over it
    box("wood", 1.5, .08, .5, loc(0, .04, 0));
    for (const x of [-.65, .65]) box("wood", .1, 1.4, .1, loc(x, .75, 0));
    box("wood", 1.3, .22, .08, loc(0, .84, 0)); box("wood", 1.3, .22, .08, loc(0, 1.08, 0, 0, 0, -.03));
    for (const x of [-.4, 0, .4]) box("dark", .13, .17, .1, loc(x, .96, 0));
    box("wood", 1.5, .08, .12, loc(0, 1.46, 0));
    box("blood", .3, .01, .3, loc(.25, .085, .05));
  },
};

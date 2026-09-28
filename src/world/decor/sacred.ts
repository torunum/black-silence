import { grain } from "../../render/BandTextures";
import { loc, skull, within, WZ, type Piece } from "./kit";

/**
 * THE CHURCH'S, THE NECROPOLIS'S AND THE GRAVEYARD'S PIECES. Church: a
 * candelabrum, a lectern, a toppled statue, a banner, broken glass, a font.
 * Necropolis: a sarcophagus, urns, a bone niche, a stack of long bones.
 * Graveyard: an iron fence and an open grave (its headstones, crosses and
 * dead trees are the prologue's, in `registry.ts` at a size a level can
 * stand freely). Levels-feel-full plan, Task 1. Conventions: `dungeon.ts`.
 */
const cellHash = (x: number, z: number): number => Math.floor(x) * 31 + Math.floor(z) * 17;

export const SACRED_PIECES: Record<string, Piece> = {
  candelabra: (box, cyl) => {   // a brass stand, three lit candles
    cyl("brass", .2, .12, .08, loc(0, .04, 0), 8);
    cyl("brass", .03, .03, 1.15, loc(0, .7, 0), 5);
    box("brass", .56, .03, .03, loc(0, 1.2, 0));
    for (const [x, y] of [[-.28, 1.24], [0, 1.3], [.28, 1.24]] as const) {
      cyl("brass", .05, .03, .05, loc(x, y, 0), 5);
      cyl("bone", .022, .022, .16, loc(x, y + .1, 0), 4);
      box("flame", .05, .09, .05, loc(x, y + .23, 0));
    }
  },
  lectern: (box) => {   // a wooden reading desk with a book open on it
    box("wood", .6, .06, .5, loc(0, .03, WZ + .4));
    box("wood", .5, .95, .3, loc(0, .475, WZ + .4));
    box("wood", .7, .06, .5, loc(0, 1.0, WZ + .42, .45));
    box("bone", .4, .05, .3, loc(0, 1.05, WZ + .43, .45));
  },
  fallenstatue: (box) => {   // a saint toppled from a shattered plinth: torso with crossed arms, legs, the head rolled off, a broken arm
    box("slate", .8, .3, .6, loc(.5, .15, WZ + .45, .1, .3, .08));
    box("marble", .8, .34, .5, loc(-.2, .22, WZ + .6, 0, .15, .1));
    box("marble", .5, .12, .14, loc(-.2, .44, WZ + .6, 0, .15, .1));
    box("marble", .7, .24, .36, loc(.5, .3, WZ + .55, 0, -.05, .1));
    box("marble", .26, .3, .26, loc(-.85, .15, WZ + .85, 0, .7));
    box("dark", .18, .04, .02, within(loc(-.85, .15, WZ + .85, 0, .7), 0, .06, .135));
    box("marble", .5, .12, .12, loc(.05, .08, WZ + .95, 0, .5));
  },
  banner: (box) => {   // a church banner on a pole, faded, its hem torn
    box("wood", .95, .045, .045, loc(0, 2.95, WZ + .07));
    box("cloth", .72, 1.25, .025, loc(0, 2.3, WZ + .06));
    box("cloth", .22, .28, .025, loc(-.25, 1.52, WZ + .06));
    box("cloth", .16, .18, .025, loc(.2, 1.56, WZ + .06));
  },
  glass: (box, _c, d) => {   // broken stained glass on the floor
    const s = cellHash(d.x, d.z);
    for (let i = 0; i < 12; i++) {
      const g = grain(i, s, 41);
      box("glass", .2 + g * .35, .02, .16 + grain(i, s, 42) * .25,
        loc((grain(i, s, 43) - .5) * 1.6, .015 + g * .03, (grain(i, s, 44) - .5) * 1.6, (g - .5) * .3, grain(i, s, 45) * 3, (g - .5) * .3));
    }
  },
  font: (_b, cyl) => {   // a stone font on a pedestal, its water black
    cyl("stone", .32, .34, .12, loc(0, .06, WZ + .6), 8);
    cyl("stone", .15, .2, .7, loc(0, .47, WZ + .6), 8);
    cyl("stone", .45, .3, .2, loc(0, .9, WZ + .6), 8);
    cyl("dark", .36, .36, .02, loc(0, 1.0, WZ + .6), 8);
  },

  sarcophagus: (box) => {   // a slate coffin along the wall, its marble lid pushed askew on a black gap and a hand in it
    box("slate", 1.75, .55, .78, loc(0, .275, WZ + .5));
    box("marble", 1.85, .15, .86, loc(.06, .63, WZ + .5, 0, .06));
    box("dark", 1.4, .06, .04, loc(-.05, .55, WZ + .91));
    box("marble", .5, .1, .6, loc(.05, .74, WZ + .5, 0, .06));
    box("bone", .06, .05, .25, loc(.5, .5, WZ + .98, 0, .3));
  },
  urn: (_b, cyl) => {   // a burial urn, and a smaller one knocked over
    const one = (base: ReturnType<typeof loc>) => {
      cyl("clay", .19, .13, .16, within(base, 0, .12, 0), 6);
      cyl("clay", .11, .19, .16, within(base, 0, .28, 0), 6);
      cyl("clay", .08, .1, .08, within(base, 0, .4, 0), 6);
      cyl("clay", .12, .1, .05, within(base, 0, .46, 0), 6);
    };
    one(loc(-.12, 0, 0));
    cyl("clay", .1, .14, .2, loc(.3, .12, .25, 0, 0, 1.4), 6);
    cyl("clay", .09, .08, .05, loc(.19, .07, .27, 0, 0, 1.4), 6);
  },
  niche: (box) => {   // a burial niche in the wall: a slate frame, black inside, skulls and long bones
    const y = 1.45;
    box("slate", 1.0, .12, .18, loc(0, y + .55, WZ + .09)); box("slate", 1.0, .12, .18, loc(0, y - .55, WZ + .09));
    box("slate", .12, 1.1, .18, loc(-.44, y, WZ + .09)); box("slate", .12, 1.1, .18, loc(.44, y, WZ + .09));
    box("dark", .78, 1.0, .02, loc(0, y, WZ + .03));
    skull(box, loc(-.22, y - .49, WZ + .1), 1.5); skull(box, loc(.08, y - .49, WZ + .1, 0, -.2), 1.5); skull(box, loc(-.08, y - .28, WZ + .1, 0, .2), 1.5);
    box("bone", .6, .06, .06, loc(.02, y + .12, WZ + .07, 0, 0, .15)); box("bone", .55, .06, .06, loc(0, y + .3, WZ + .07, 0, 0, -.2));
  },
  bonestack: (box, _c, d) => {   // long bones stacked like cordwood, two skulls on top
    const s = cellHash(d.x, d.z);
    for (let l = 0; l < 5; l++) for (let j = 0; j < 4; j++) {
      const alongX = l % 2 === 0, k = (j - 1.5) * (alongX ? .16 : .42);
      box("bone", alongX ? 1.6 : .09, .1, alongX ? .09 : .55, loc(alongX ? 0 : k, .06 + l * .1, WZ + .45 + (alongX ? k : 0), 0, (grain(l * 4 + j, s, 46) - .5) * .12));
    }
    skull(box, loc(-.35, .56, WZ + .45, 0, .4), 1.6); skull(box, loc(.35, .56, WZ + .4, 0, -.5), 1.5);
  },

  fence: (box, _c, d) => {   // an iron fence along the wall between two stone posts: a bar gone, its neighbour bent
    const broken = Math.floor(grain(2, cellHash(d.x, d.z), 47) * 9);
    for (let i = 0; i < 9; i++) {
      if (i === broken) continue;
      const x = -.9 + i * .225, lean = i === broken + 1 ? .25 : 0;
      box("wrought", .035, 1.0, .035, loc(x, .5, WZ + .12, 0, 0, lean));
      box("wrought", .06, .1, .06, loc(x, 1.03, WZ + .12, 0, .78, lean));
    }
    box("wrought", 2, .04, .05, loc(0, .3, WZ + .12)); box("wrought", 2, .04, .05, loc(0, .85, WZ + .12));
    box("stone", .12, 1.15, .12, loc(-.94, .58, WZ + .12)); box("stone", .12, 1.15, .12, loc(.94, .58, WZ + .12));
  },
  opengrave: (box) => {   // a dug grave: a black pit, the spoil heaped either side, a plank across it
    box("dark", .95, .04, 1.9, loc(0, .022, 0));
    box("earth", .5, .24, 1.7, loc(.72, .12, 0, 0, 0, -.1));
    box("earth", .3, .16, 1.3, loc(-.7, .08, .1));
    box("wood", 1.0, .05, .14, loc(0, .07, .3, 0, .06));
  },
};

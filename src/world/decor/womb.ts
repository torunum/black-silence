import { grain } from "../../render/BandTextures";
import { loc, WZ, type Piece } from "./kit";

/**
 * THE WOMB'S PIECES: a flesh growth, sinew from floor to ceiling, tendrils
 * hanging, a cluster of pods, an eye in the wall, veins across the floor.
 * Levels-feel-full plan, Task 1. Spheres are six segments by four — a
 * lump, in this game's resolution, not a ball. Conventions: `dungeon.ts`.
 */
const cellHash = (x: number, z: number): number => Math.floor(x) * 31 + Math.floor(z) * 17;

export const WOMB_PIECES: Record<string, Piece> = {
  growth: (box, _c, _d, _t, sph) => {   // a tumorous heap of bruised flesh against the wall, warts on it, veins creeping from it
    sph("flesh", .55, loc(0, .42, WZ + .5, 0, 0, 0, 1.15, .85, 1));
    sph("flesh", .36, loc(-.64, .26, WZ + .4, 0, 0, 0, 1, .8, 1));
    sph("flesh", .28, loc(.62, .2, WZ + .6));
    sph("flesh", .24, loc(.1, .82, WZ + .36, 0, 0, 0, 1, .9, 1));
    for (const [x, y] of [[-.2, .7], [.3, .6], [-.42, .5], [.1, .3]] as const)   // on the big lump's surface
      sph("wart", .08, loc(x, y, WZ + .5 + .55 * Math.sqrt(Math.max(0, 1 - (x / .63) ** 2 - ((y - .42) / .47) ** 2))));
    box("sinew", .1, .04, .6, loc(.3, .02, WZ + .85, 0, .5)); box("sinew", .1, .04, .5, loc(-.3, .02, WZ + .85, 0, -.3));
  },
  sinew: (_b, cyl, _d, top, sph) => {   // three cords of sinew from floor to ceiling, knotted
    for (const [x, lean] of [[-.3, .03], [.05, -.02], [.38, .04]] as const) {
      cyl("sinew", .07, .11, top, loc(x, top / 2, WZ + .14, 0, 0, lean), 5);
      sph("sinew", .16, loc(x + lean * 1.2, 1.1 + x, WZ + .14, 0, 0, 0, 1, 1.5, 1));
    }
  },
  drape: (_b, cyl, d, top, sph) => {   // tendrils hanging from a swollen lump in the ceiling
    const s = cellHash(d.x, d.z);
    for (let i = 0; i < 5; i++) {
      const len = .8 + grain(i, s, 61) * 1.0;
      cyl("sinew", .08, .02, len, loc((grain(i, s, 62) - .5) * 1.2, top - len / 2, (grain(i, s, 63) - .5) * 1.2), 4);
    }
    sph("flesh", .3, loc(0, top - .05, 0, 0, 0, 0, 1.6, .5, 1.6));
  },
  pod: (_b, _c, _d, _t, sph) => {   // egg-sacs on a mound of flesh, each with a dark shape in it
    sph("flesh", .55, loc(0, .14, WZ + .6, 0, 0, 0, 1.05, .3, 1));
    for (const [x, z, s] of [[-.4, .45, 1], [.3, .6, .8], [-.05, .95, .65]] as const) {
      sph("pod", .3 * s, loc(x, .5 * s + .1, WZ + z, 0, 0, 0, .9, 1.5, .9));
      sph("dark", .1 * s, loc(x, .55 * s + .1, WZ + z + .12 * s, 0, 0, 0, .8, 1.4, .8));
    }
  },
  eye: (box, _c, _d, _t, sph) => {   // an eye in the wall: swollen lids, a white, a yellow iris, a slit pupil
    sph("flesh", .38, loc(0, 1.7, WZ + .16, 0, 0, 0, 1.05, .85, .55));
    sph("eyewhite", .3, loc(0, 1.7, WZ + .2, 0, 0, 0, 1, .85, .6));
    sph("iris", .14, loc(.03, 1.7, WZ + .36, 0, 0, 0, 1, 1, .4));
    box("dark", .05, .16, .02, loc(.03, 1.7, WZ + .42));
  },
  vein: (box, _c, d) => {   // a thick vein snaking across the floor with two branches, kept inside the cell
    const s = cellHash(d.x, d.z), keep = (v: number) => Math.max(-.6, Math.min(.6, v));
    let ang = Math.PI / 2 + (grain(1, s, 64) - .5) * .5, x = -.75, z = (grain(2, s, 65) - .5) * .4;
    for (let i = 0; i < 4; i++) {
      const nx = x + Math.sin(ang) * .4, nz = keep(z + Math.cos(ang) * .4);
      box("sinew", .2 + (i % 2) * .06, .06, .5, loc((x + nx) / 2, .02, (z + nz) / 2, 0, Math.atan2(nx - x, nz - z)));
      if (i === 1) box("sinew", .08, .04, .4, loc(nx + .1, .02, keep(nz + .15), 0, ang + .9));
      if (i === 2) box("sinew", .08, .04, .35, loc(nx + .08, .02, keep(nz - .15), 0, ang - 1));
      x = nx; z = nz;
      ang += (grain(i, s, 66) - .5) * .5;
    }
  },
};

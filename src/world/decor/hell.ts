import { grain } from "../../render/BandTextures";
import { loc, skull, WZ, type Piece } from "./kit";

/**
 * HELL'S PIECES — what breaks up the cavern's walls and banks (the prologue's
 * hell rework, `docs/superpowers/plans/2026-10-04-hell-rework.md`): a rock
 * outcrop shouldered out of a wall, stalagmites, basalt columns, floor spikes,
 * a skull on a stake, stalactites, a burning pyre, the ribs of something that
 * died here. The hell has no kit theme (`kit.ts`: only the prologue is hell, and
 * it is hand-dressed), so `registry.ts` lists these as pieces and the prologue's
 * builder places them.
 *
 * Boxes, cones and low hexagonal columns in the piece's own frame (y=0 on its
 * floor, +z its front, the wall it stands against at z = `WZ`). A cone is a
 * cylinder whose top radius is 0 (or, for a stalactite, whose bottom is). What
 * glows is the unlit `magma` material, a seam in the rock where the fire shows;
 * nothing here carries a light. Every "random" angle is the integer hash of the
 * piece's cell (`grain`): the same cavern every load, no `Math.random`.
 */
const cellHash = (x: number, z: number): number => Math.floor(x) * 31 + Math.floor(z) * 17;

export const HELL_PIECES: Record<string, Piece> = {
  outcrop: (box, cyl) => {   // fat spires of basalt shouldered out of the wall, leaning on it, fused at the foot, fire glowing in the gaps between
    cyl("basalt", .16, .62, 3.1, loc(-.4, 1.55, WZ + .5, -.05, 0, .04), 6);
    cyl("basalt", .14, .58, 2.5, loc(.35, 1.25, WZ + .48, -.06, 0, -.05), 6);
    cyl("basalt", .1, .46, 2.0, loc(.05, 1.0, WZ + .66, -.04, 0, .02), 6);
    cyl("basalt", .08, .38, 1.45, loc(-.62, .72, WZ + .68, -.04, 0, .1), 5);
    cyl("basalt", .06, .34, 1.1, loc(.68, .55, WZ + .66, -.04, 0, -.12), 5);
    box("basalt", 1.7, .3, .9, loc(0, .15, WZ + .5, 0, .05));
    box("magma", .5, .1, .08, loc(-.1, .34, WZ + 1.02, 0, .3));        // the fire between them, low, where they meet
    box("magma", .35, .08, .08, loc(.4, .5, WZ + .98, 0, -.4, .2));
    box("magma", .08, .6, .08, loc(-.2, 1.2, WZ + .9, 0, 0, .12));
  },
  stalagmite: (box, cyl, d) => {   // a cluster of fangs of rock rising from the floor
    const s = cellHash(d.x, d.z);
    cyl("basalt", 0, .3, 1.7, loc(0, .85, 0), 6);
    cyl("basalt", 0, .21, 1.1, loc(.38, .55, .22, 0, 0, .06), 6);
    cyl("basalt", 0, .18, .75, loc(-.32, .38, .28, 0, 0, -.05), 6);
    cyl("basalt", 0, .24, 1.3, loc(-.28, .65, -.32, 0, 0, -.04), 6);
    cyl("basalt", 0, .12, .5, loc(.3, .25, -.38), 5);
    box("magma", .5, .04, .04, loc(0, .06 + grain(1, s, 61) * .1, .26, 0, .4));
  },
  shards: (box, cyl, d) => {   // knee-high splinters of rock and a fist of cooled magma, walked over: the floor is not smooth
    const s = cellHash(d.x, d.z);
    for (let i = 0; i < 6; i++) {
      const a = grain(i, s, 69) * 6.28, r = .15 + grain(i, s, 70) * .55, h = .14 + grain(i, s, 71) * .22;
      cyl("basalt", 0, .08 + grain(i, s, 72) * .08, h, loc(Math.sin(a) * r, h / 2 - .02, Math.cos(a) * r, (grain(i, s, 73) - .5) * .5, 0, (grain(i, s, 74) - .5) * .5), 5);
    }
    box("magma", .22, .03, .06, loc(.0, .02, .0, 0, grain(1, s, 75) * 3));
  },
  basaltcol: (_b, cyl, d) => {   // three hexagonal columns of different heights, one snapped off; the way basalt breaks
    const s = cellHash(d.x, d.z);
    cyl("basalt", .34, .38, 3.1, loc(-.2, 1.55, -.1), 6);
    cyl("basalt", .32, .36, 2.0, loc(.42, 1.0, .14, 0, .5), 6);
    cyl("basalt", .3, .34, 1.1, loc(-.05, .55, .5, 0, 1.0), 6);
    cyl("magma", .31, .31, .05, loc(.42, 2.01, .14, 0, .5), 6);   // the broken one still glows at the break
    cyl("basalt", .22, .3, .3, loc(.5, .15, -.5, 0, grain(2, s, 62)), 6);
  },
  spikes: (_b, cyl, d) => {   // a patch of iron spikes in the floor, as a pit's edge is set with
    const s = cellHash(d.x, d.z);
    for (let i = 0; i < 9; i++) {
      const x = ((i % 3) - 1) * .42 + (grain(i, s, 63) - .5) * .2, z = (Math.floor(i / 3) - 1) * .42 + (grain(i, s, 64) - .5) * .2;
      cyl("iron", 0, .06, .26 + grain(i, s, 65) * .02, loc(x, .13, z, (grain(i, s, 66) - .5) * .2, 0, (grain(i, s, 67) - .5) * .2), 4);
    }
  },
  skullpole: (box, _c, d) => {   // a stake with a skull on it, and the strip of cloth that was a flag
    const s = cellHash(d.x, d.z), lean = (grain(1, s, 68) - .5) * .12;
    box("wood", .06, 1.55, .06, loc(0, .78, 0, 0, 0, lean));
    box("wood", .3, .05, .05, loc(0, 1.2, 0, 0, 0, lean));
    skull(box, loc(Math.sin(lean) * -1.55, 1.55, 0, 0, 0.3, lean), 1.4);
    box("canvas", .05, .34, .16, loc(.13, 1.04, 0, 0, 0, lean * .5));
    box("bone", .3, .05, .05, loc(.2, .03, .2, 0, 1.1)); box("bone", .22, .05, .05, loc(-.18, .03, -.15, 0, -.4));
  },
  stalactite: (_b, cyl, d, top) => {   // fangs of rock hanging from the roof: `h` is the longest one's length
    const L = d.h || 1.8;
    cyl("basalt", .34, 0, L, loc(0, top - L / 2, 0), 6);
    cyl("basalt", .24, 0, L * .65, loc(.5, top - L * .325, .25), 6);
    cyl("basalt", .2, 0, L * .45, loc(-.4, top - L * .225, -.3), 5);
    cyl("basalt", .5, .34, .3, loc(0, top - .15, 0), 6);
  },
  pyre: (box, cyl) => {   // a heap of charred timbers and bones, the coals under it still orange, a flame standing out of it
    for (let i = 0; i < 8; i++) box("char", 1.5, .16, .16, loc(Math.sin(i * 1.3) * .15, .1 + (i % 4) * .13, Math.cos(i * 1.3) * .15, 0, i * .8, (i % 2 - .5) * .25));
    box("coal", .9, .12, .8, loc(0, .26, 0, 0, .3));
    box("coal", .5, .1, .5, loc(.1, .4, -.05, 0, .9));
    cyl("flame", 0, .3, 1.0, loc(0, .85, 0), 5);
    cyl("flame", 0, .16, .7, loc(.22, .65, .12), 4);
    cyl("flame", 0, .14, .6, loc(-.2, .6, -.14), 4);
    box("bone", .4, .06, .06, loc(.6, .05, .5, 0, .8));
  },
  ribs: (box) => {   // the ribs of something large, half out of the ground: a spine along the floor, five arches off it
    box("oldbone", 1.7, .12, .12, loc(0, .09, -.4));
    for (let r = 0; r < 5; r++) {
      const x = -.56 + r * .28, R = .62 + .1 * Math.sin(r * .8 + .3), tilt = (r - 2) * .02;
      let py = .1, pz = -.4;
      for (let a = 1; a <= 5; a++) {
        const th = a / 5 * Math.PI * .8, ny = .1 + R * Math.sin(th) * .9, nz = -.4 + R * (1 - Math.cos(th)) * .85;
        const len = Math.hypot(ny - py, nz - pz), ang = Math.atan2(ny - py, nz - pz);
        box("oldbone", .07, .06, len + .02, loc(x + tilt * a, (ny + py) / 2, (nz + pz) / 2, -ang, 0, 0));
        py = ny; pz = nz;
      }
    }
  },
};

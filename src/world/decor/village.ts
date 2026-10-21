import { WALLH as WALL } from "../Grid";
import { loc, within, type Piece } from "./kit";

/**
 * THE VILLAGE'S PIECES (owner, 2026-10-21: "açık havada geçen, Blood tarzı bölümler") — what stands in the hollow village round the
 * church (`../levels/village.ts`): the houses' gabled slate roofs with their chimneys against the night sky, the square's well, a
 * gallows, a farm cart, hay bales, a woodpile, a scarecrow, a fingerpost, and the dead corn of the field, standing higher than a man.
 * Conventions: `dungeon.ts` (y = 0 on the floor, +z the piece's front, -z its back against a wall).
 */

const hash = (x: number, z: number, s: number): number => (((Math.floor(x * 7) * 73856093) ^ (Math.floor(z * 7) * 19349663) ^ (s * 83492791)) >>> 0) % 1000 / 1000;

export const VILLAGE_PIECES: Record<string, Piece> = {
  /** A gable over a house: `s` its width across x, `h` its depth along z (world units), the ridge along z; `r` turns it. A chimney. */
  houseroof: (box, _c, d, top) => {
    // its eaves on the house's walls: they rise to the house's own ceiling, or a wall's height where that is lower (`top`, the headroom at its middle)
    const WALLH = Math.max(top, WALL);
    const w = d.s || 8, dep = d.h || 8, rise = Math.min(2.4, w * .32), half = w / 2 + .35, slope = Math.hypot(half, rise), ang = Math.atan2(rise, half);
    box("slate", slope, .18, dep + .7, loc(-half / 2, WALLH + rise / 2, 0, 0, 0, ang));
    box("slate", slope, .18, dep + .7, loc(half / 2, WALLH + rise / 2, 0, 0, 0, -ang));
    box("wood", .2, .2, dep + .8, loc(0, WALLH + rise + .02, 0));   // the ridge beam
    for (const zf of [dep / 2 + .05, -dep / 2 - .05]) {   // the gable ends: boards, stepped up to the ridge
      for (let i = 0; i < 5; i++) { const f = (i + .5) / 5; box("bark", 2 * half * (1 - f) - .2, rise / 5, .12, loc(0, WALLH + rise * i / 5 + rise / 10, zf)); }
    }
    const cx = (hash(d.x, d.z, 1) - .5) * w * .5, cz = (hash(d.x, d.z, 2) - .5) * dep * .6;
    box("brick", .6, rise + 1.1, .6, loc(cx, WALLH + (rise + 1.1) / 2, cz));   // the chimney, through the slope
    box("brick", .72, .12, .72, loc(cx, WALLH + rise + 1.16, cz));
  },
  /** The square's well: a stone ring, two posts, a little roof and a winch, a bucket on the rim. */
  villagewell: (box, cyl) => {
    cyl("stone", .78, .82, .8, loc(0, .4, 0), 12);
    cyl("dark", .6, .6, .02, loc(0, .81, 0), 12);
    for (const sd of [-1, 1]) box("wood", .12, 1.9, .12, loc(sd * .8, 1.35, 0));
    box("wood", 1.8, .08, .08, loc(0, 1.9, 0));
    cyl("wood", .09, .09, 1.5, loc(0, 1.7, 0, 0, 0, Math.PI / 2), 6);
    for (const sd of [-1, 1]) box("slate", 1.2, .08, 1.9, loc(sd * .42, 2.45, 0, 0, 0, sd * -.55));
    cyl("iron", .14, .11, .22, loc(.55, .93, .5), 6);
  },
  /** A gallows: two posts, the beam, a brace, and a rope with its noose. */
  gallows: (box) => {
    box("wood", .4, .5, 2.6, loc(0, .25, 0));   // the platform's step
    for (const z of [-1.1, 1.1]) box("wood", .16, 3.1, .16, loc(-.1, 1.55, z));
    box("wood", .16, .16, 2.6, loc(-.1, 3.05, 0));
    box("wood", .1, .9, .1, loc(-.1, 2.7, .75, .7, 0, 0));
    box("canvas", .03, .9, .03, loc(.05, 2.55, 0));
    box("canvas", .2, .05, .2, loc(.05, 2.1, 0));
  },
  /** A two-wheeled farm cart, its shafts down, a sack in it. */
  cart: (box, cyl) => {
    box("wood", 1.5, .1, 1.0, loc(0, .62, 0));
    for (const sd of [-1, 1]) box("wood", 1.5, .3, .06, loc(0, .8, sd * .5));
    box("wood", .06, .3, 1.0, loc(-.75, .8, 0));
    for (const sd of [-1, 1]) cyl("wood", .5, .5, .08, loc(.1, .5, sd * .58, Math.PI / 2, 0, 0), 10);
    for (const sd of [-1, 1]) box("wood", 1.4, .07, .07, loc(1.35, .35, sd * .35, 0, 0, -.35));
    box("canvas", .6, .4, .5, loc(-.2, .87, .05, 0, .3, 0));
  },
  haybale: (box, _c, d) => {
    const t = hash(d.x, d.z, 3) * .6;
    box("straw", 1.0, .55, .6, loc(0, .28, 0, 0, t, 0));
    if (hash(d.x, d.z, 4) > .4) box("straw", 1.0, .55, .6, loc(.08, .83, .02, 0, t + .3, 0));
  },
  /** Split logs stacked against a wall, an axe in the block. */
  woodpile: (box, cyl) => {
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6 - row; i++) cyl("bark", .11, .11, .6, loc(-.6 + i * .24 + row * .12, .12 + row * .2, -.65, Math.PI / 2, 0, 0), 6);
    cyl("wood", .22, .24, .45, loc(.7, .22, -.3), 8);
    box("iron", .05, .14, .2, loc(.7, .5, -.3, 0, 0, .3));
    box("wood", .04, .5, .04, loc(.6, .62, -.3, 0, 0, .9));
  },
  /** A scarecrow on its pole in the field: arms out on a crossbar, a sacking head, a hat. */
  scarecrow: (box) => {
    box("wood", .1, 2.2, .1, loc(0, 1.1, 0));
    box("wood", 1.5, .08, .08, loc(0, 1.65, 0));
    box("canvas", .5, .7, .28, loc(0, 1.45, 0));
    box("canvas", .26, .3, .26, loc(0, 2.05, 0));
    box("char", .5, .04, .5, loc(0, 2.22, 0));
    box("char", .26, .18, .26, loc(0, 2.32, 0));
    for (const sd of [-1, 1]) box("straw", .2, .14, .12, loc(sd * .78, 1.62, 0));
  },
  /** A fingerpost at a corner, two arms. */
  signpost: (box) => {
    box("wood", .12, 2.1, .12, loc(0, 1.05, 0));
    box("wood", .9, .2, .04, loc(.42, 1.85, 0, 0, .3, 0));
    box("wood", .8, .2, .04, loc(-.36, 1.55, 0, 0, -.5, 0));
  },
  /** A clump of dead corn, higher than a man: thin stalks, some leaning, ragged leaves. Walked through, and hides what is in it. */
  corn: (box, _c, d) => {
    for (let i = 0; i < 9; i++) {
      const x = (hash(d.x + i, d.z, 5) - .5) * 1.7, z = (hash(d.x, d.z + i, 6) - .5) * 1.7, h = 1.7 + hash(d.x + i, d.z + i, 7) * .7;
      const lean = (hash(d.x - i, d.z, 8) - .5) * .3, base = loc(x, 0, z, lean, 0, (hash(d.x, d.z - i, 9) - .5) * .3);
      box("straw", .035, h, .035, within(base, 0, h / 2, 0));
      box("straw", .32, .03, .09, within(base, .1, h * .55, 0, 0, i, .5));
      box("straw", .28, .03, .08, within(base, -.08, h * .75, 0, 0, i + 2, -.4));
    }
  },
};

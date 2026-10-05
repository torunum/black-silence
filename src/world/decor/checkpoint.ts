import { loc, skull, WZ, type Piece } from "./kit";

/**
 * THE CHECKPOINT MARKERS — one per theme (deeper-levels plan, Task 1: checkpoints). A marker is set
 * dressing the player's death is answered by: it stands unlit (a dead wick, a black lens, a dull
 * bulb) until the player comes within `LIT_RADIUS` of it, and then it catches — a flame and a glow
 * appear at its `anchors`, a sound plays, a message says so — and what the player has then is what
 * they rise with (`src/world/Checkpoints.ts`, `Respawn.ts`).
 *
 * They are `wall` pieces of the kit like a sconce or a lantern: thin, hung on or standing against a
 * wall, so a level may put one in a one-wide corridor or beside a door, where the route is forced, and
 * the placement rules (`place.ts`) keep it off doors, pickups and the spawn. They are clutter — no
 * shadow, no mass, nothing to collide with — and they take **no light of their own**: the lit flame is
 * a sprite and an additive glow added when the marker catches (`Checkpoints.ts`), never a point light,
 * because a light added mid-level makes three.js rebuild every lit material (a visible hitch), and
 * because the lights of a level are a budget (`tests/world/lightBudget.test.ts`).
 *
 * The unlit look is the piece itself; nothing here uses a `flame`, `lamp*` or `glow*` material. Every
 * material is one the theme's own dressing already asks for, so a level that gains a marker gains
 * geometry in meshes it already had, not a mesh. No `Math.random`.
 *
 * | theme      | piece         | what it is                                                   |
 * |------------|---------------|--------------------------------------------------------------|
 * | dungeon    | `candlestub`  | a tallow candle on a skull on an iron shelf                  |
 * | church     | `shrine`      | a wayside shrine: a saint on a plinth, two votive dishes     |
 * | necropolis | `ossuarylamp` | a bone niche whose skull holds a clay bowl of tallow         |
 * | graveyard  | `hooklantern` | an iron lantern on a hook, its lens black                    |
 * | sewers     | `shutlamp`    | a caged lantern on a pipe bracket, shuttered                 |
 * | factory    | `pilotlight`  | a boiler plate and a gas burner with no flame                |
 * | womb       | `quickening`  | a dull swollen bulb of flesh, buds round it: it quickens     |
 */

/** How close the player must come, in world units (a cell is 2), for a marker to catch. A corridor is one cell wide, so one wall's marker is within reach of the whole width. */
export const LIT_RADIUS = 2.6;

export interface CheckpointLook {
  /** What the HUD says when it catches. */
  msg: string;
  /** The flame sprite's tint, and the additive glow's. */
  flame: number;
  glow: number;
  /** The flame sprite's size (w, h), and the glow's diameter, in world units. */
  size: readonly [number, number];
  halo: number;
  /** Where the flames stand, in the piece's own frame (the same frame as the piece's parts). */
  anchors: ReadonlyArray<readonly [number, number, number]>;
}

export const CHECKPOINTS: Readonly<Record<string, CheckpointLook>> = {
  candlestub: { msg: "THE CANDLE CATCHES", flame: 0xffc060, glow: 0xff9a30, size: [.2, .3], halo: 1.5, anchors: [[0, 1.6, WZ + .2]] },
  shrine: { msg: "THE SHRINE ANSWERS", flame: 0xffd890, glow: 0xffb050, size: [.14, .22], halo: 1.2, anchors: [[-.28, .8, WZ + .32], [.28, .8, WZ + .32]] },
  ossuarylamp: { msg: "THE ASH TAKES A FLAME", flame: 0xffb868, glow: 0xff8c3c, size: [.2, .3], halo: 1.4, anchors: [[0, 1.06, WZ + .22]] },
  hooklantern: { msg: "THE LANTERN WAKES", flame: 0xffd070, glow: 0xffa840, size: [.26, .34], halo: 1.7, anchors: [[0, 1.62, WZ + .4]] },
  shutlamp: { msg: "THE LAMP SPUTTERS ALIVE", flame: 0xc4e070, glow: 0x9acc44, size: [.26, .34], halo: 1.7, anchors: [[0, 1.66, WZ + .4]] },
  pilotlight: { msg: "THE PILOT LIGHT CATCHES", flame: 0x9ec8ff, glow: 0xff9a50, size: [.16, .26], halo: 1.4, anchors: [[0, 1.0, WZ + .36]] },
  quickening: { msg: "THE GROWTH QUICKENS", flame: 0xff8a72, glow: 0xff5a4a, size: [.5, .5], halo: 2.2, anchors: [[0, 1.2, WZ + .4]] },
};

/** Is this kind of decor a checkpoint marker? */
export const isCheckpointKind = (k: string): boolean => k in CHECKPOINTS;

export const CHECKPOINT_PIECES: Record<string, Piece> = {
  candlestub: (box, cyl) => {   // a fat tallow candle on a skull, on an iron shelf: a wick, cold
    box("wrought", .34, .5, .05, loc(0, 1.2, WZ + .03));
    box("wrought", .44, .05, .34, loc(0, 1.0, WZ + .2));
    box("wrought", .04, .26, .04, loc(.18, .86, WZ + .12));
    skull(box, loc(0, 1.025, WZ + .2), 2);
    cyl("bone", .06, .075, .3, loc(0, 1.4, WZ + .2), 6);
    cyl("bone", .085, .075, .05, loc(0, 1.27, WZ + .2), 6);   // wax run down onto the skull
    box("dark", .016, .06, .016, loc(0, 1.58, WZ + .2));
  },
  shrine: (box, cyl) => {   // a wayside shrine: a saint's robe and head on a stone plinth under a canopy, two dishes of votive wax
    box("stone", .86, .5, .42, loc(0, .25, WZ + .21));
    box("stone", .9, .06, .46, loc(0, .53, WZ + .23));
    box("stone", .7, 1.2, .1, loc(0, 1.1, WZ + .05));
    box("stone", .86, .1, .3, loc(0, 1.78, WZ + .15));
    cyl("bone", .08, .16, .62, loc(0, .87, WZ + .3), 6);   // the saint's robe
    box("bone", .13, .14, .13, loc(0, 1.26, WZ + .3));   // the head
    box("brass", .34, .025, .025, loc(0, 1.42, WZ + .3));   // a halo's bar
    for (const x of [-.28, .28]) {
      cyl("brass", .1, .08, .04, loc(x, .58, WZ + .32), 6);
      cyl("bone", .035, .04, .16, loc(x, .68, WZ + .32), 5);
      box("dark", .012, .04, .012, loc(x, .78, WZ + .32));
    }
  },
  ossuarylamp: (box, cyl) => {   // a burial niche, a skull on its sill with a clay bowl of tallow on its crown
    const y = 1.45;
    box("slate", 1.0, .12, .18, loc(0, y + .55, WZ + .09)); box("slate", 1.0, .12, .18, loc(0, y - .55, WZ + .09));
    box("slate", .12, 1.1, .18, loc(-.44, y, WZ + .09)); box("slate", .12, 1.1, .18, loc(.44, y, WZ + .09));
    box("dark", .78, 1.0, .02, loc(0, y, WZ + .03));
    box("slate", .84, .08, .34, loc(0, y - .52, WZ + .2));   // the sill
    skull(box, loc(0, y - .48, WZ + .22), 2);
    cyl("clay", .14, .09, .09, loc(0, y - .2, WZ + .22), 6);
    box("dark", .014, .05, .014, loc(0, y - .13, WZ + .22));
    skull(box, loc(-.28, y - .48, WZ + .16), 1.3);
  },
  hooklantern: (box, cyl) => {   // a lantern on an iron hook: the cage, a black lens, nothing behind it
    box("wrought", .07, .07, .46, loc(0, 2.0, WZ + .25));
    box("wrought", .05, .6, .05, loc(0, 1.72, WZ + .04));
    box("wrought", .03, .2, .03, loc(0, 1.92, WZ + .44));
    cyl("wrought", .04, .15, .1, loc(0, 1.82, WZ + .44), 6);
    cyl("dark", .1, .1, .3, loc(0, 1.62, WZ + .44), 6);
    for (const [x, z] of [[-.12, 0], [.12, 0], [0, -.12], [0, .12]]) box("wrought", .025, .32, .025, loc(x, 1.62, WZ + .44 + z));
    cyl("wrought", .14, .14, .04, loc(0, 1.45, WZ + .44), 6);
  },
  shutlamp: (box, cyl) => {   // a caged lantern on a pipe bracket, the shutter closed over its lens
    box("wrought", .5, .06, .06, loc(0, 2.05, WZ + .05));
    box("wrought", .06, .06, .44, loc(0, 2.0, WZ + .24));
    cyl("wrought", .035, .035, .26, loc(0, 1.88, WZ + .44), 5);
    cyl("wrought", .04, .15, .1, loc(0, 1.86, WZ + .44), 6);
    cyl("dark", .11, .11, .3, loc(0, 1.66, WZ + .44), 6);
    for (const [x, z] of [[-.12, 0], [.12, 0], [0, -.12], [0, .12]]) box("wrought", .025, .32, .025, loc(x, 1.66, WZ + .44 + z));
    cyl("wrought", .14, .14, .04, loc(0, 1.5, WZ + .44), 6);
    box("wrought", .05, .5, .05, loc(0, 1.78, WZ + .04));
  },
  pilotlight: (box, cyl) => {   // a boiler plate with a gas burner on a pipe: the pilot, out
    const HP = Math.PI / 2;
    box("rustplate", .8, 1.0, .1, loc(0, 1.45, WZ + .07));
    cyl("pipe", .07, .07, .9, loc(0, .7, WZ + .2), 6);
    cyl("pipe", .06, .06, .3, loc(0, .96, WZ + .32, HP), 6);
    cyl("wrought", .05, .09, .1, loc(0, 1.0, WZ + .5, HP), 6);
    cyl("wrought", .17, .17, .05, loc(-.2, 1.72, WZ + .16, HP), 8);
    cyl("wrought", .17, .17, .05, loc(.2, 1.72, WZ + .16, HP), 8);
    box("wrought", .03, .15, .01, loc(-.2, 1.74, WZ + .2, 0, 0, -.5));
    box("wrought", .03, .15, .01, loc(.2, 1.74, WZ + .2, 0, 0, .4));
  },
  quickening: (box, _c, _d, _t, sph) => {   // a dull swollen bulb of flesh on a stalk, buds round it, veins creeping from it
    sph("flesh", .3, loc(0, .08, WZ + .3, 0, 0, 0, 1.3, .35, 1.1));
    box("sinew", .1, 1.0, .1, loc(0, .55, WZ + .2, 0, .3, .05));
    sph("sinew", .24, loc(0, 1.2, WZ + .34, 0, 0, 0, 1, 1.3, 1));
    for (const [x, y] of [[-.3, .7], [.3, .8], [-.18, 1.55]] as const) sph("flesh", .09, loc(x, y, WZ + .3));
    box("sinew", .1, .04, .4, loc(.2, .02, WZ + .3, 0, .5)); box("sinew", .09, .04, .36, loc(-.25, .02, WZ + .3, 0, -.3));
  },
};

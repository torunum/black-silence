import { grain } from "../../render/BandTextures";
import { loc, WZ, type Piece } from "./kit";

/**
 * THE SEWERS' AND THE FACTORY'S PIECES. Sewers: pipes along the walls, a
 * pipe dropping to the floor with a valve, an iron grate over black, sludge,
 * debris, an outfall spilling slime, a ladder. Factory: a machinery block, a
 * few steel drums, a meat hook on a chain, a conveyor, a gauge panel (and
 * both share the pipes). Levels-feel-full plan, Task 1. Conventions:
 * `dungeon.ts`.
 *
 * The drums are steel-grey riveted plate with two of them upright and one
 * on its side — not the reference's red-brown explosive barrel (`O`), which
 * a player has learned to shoot. These take no shot and never blow.
 */
const cellHash = (x: number, z: number): number => Math.floor(x) * 31 + Math.floor(z) * 17;
const HP = Math.PI / 2;

export const PIPE_PIECES: Record<string, Piece> = {
  pipe: (box, cyl) => {   // two pipes run along the wall under the ceiling, on brackets, with a flange
    cyl("pipe", .09, .09, 2.0, loc(0, 2.45, WZ + .13, 0, 0, HP), 6);
    cyl("pipe", .05, .05, 2.0, loc(0, 2.2, WZ + .09, 0, 0, HP), 5);
    cyl("wrought", .13, .13, .05, loc(.3, 2.45, WZ + .13, 0, 0, HP), 6);
    for (const x of [-.7, .7]) box("wrought", .1, .34, .1, loc(x, 2.35, WZ + .06));
  },
  pipedrop: (box, cyl, _d, top) => {   // a pipe from the ceiling to the floor against the wall, flanged, with a valve wheel
    const x0 = .35;
    cyl("pipe", .1, .1, top, loc(x0, top / 2, WZ + .14), 6);
    for (const y of [.5, 1.8, top - .3]) cyl("wrought", .14, .14, .05, loc(x0, y, WZ + .14), 6);
    cyl("wrought", .15, .15, .03, loc(x0, 1.2, WZ + .3, HP), 8);
    box("wrought", .3, .03, .03, loc(x0, 1.2, WZ + .3)); box("wrought", .03, .3, .03, loc(x0, 1.2, WZ + .3));
    box("wrought", .04, .04, .14, loc(x0, 1.2, WZ + .24));
  },
  grate: (box) => {   // an iron grate set in the floor over black
    box("dark", 1.2, .015, 1.2, loc(0, .01, 0));
    for (let i = 0; i < 7; i++) box("wrought", .05, .04, 1.2, loc(-.5 + i * .1667, .03, 0));
    for (const s of [-.6, .6]) { box("wrought", 1.28, .05, .06, loc(0, .03, s)); box("wrought", .06, .05, 1.2, loc(s, .03, 0)); }
  },
  sludge: (box, _c, d) => {   // four overlapping pools of sewer scum
    const s = cellHash(d.x, d.z);
    for (let i = 0; i < 4; i++)
      box("sludge", .5 + grain(i, s, 51) * .6, .014, .5 + grain(i, s, 52) * .5,
        loc((grain(i, s, 53) - .5) * .5, .012 + i * .003, (grain(i, s, 54) - .5) * .5, 0, grain(i, s, 55) * 3));
  },
  debris: (box, cyl) => {   // splintered planks, a dented bucket on its side, chunks of stone, a bone
    box("wood", .7, .04, .12, loc(-.3, .03, -.2, 0, .4, .05)); box("wood", .5, .04, .1, loc(.25, .05, .15, 0, -.7, .1));
    box("wood", .4, .04, .1, loc(.1, .08, -.05, 0, 1.9, .08));
    cyl("wrought", .1, .12, .22, loc(.55, .11, -.4, 0, 0, 1.4), 6);
    box("rock", .25, .14, .2, loc(-.55, .07, .4, .2, .5, .1)); box("rock", .15, .1, .14, loc(-.35, .05, .55, 0, 1, .2));
    box("bone", .3, .04, .04, loc(.2, .03, .6, 0, .3));
  },
  outfall: (box, cyl) => {   // a drain mouth in the wall, black inside, slime streaking down and spilling over the floor
    cyl("wrought", .4, .4, .05, loc(0, .85, WZ + .03, HP), 8);
    cyl("pipe", .34, .34, .3, loc(0, .85, WZ + .15, HP), 8);
    cyl("dark", .27, .27, .02, loc(0, .85, WZ + .31, HP), 8);
    box("sludge", .34, .85, .012, loc(0, .42, WZ + .02));
    box("sludge", .7, .014, .4, loc(0, .01, WZ + .25, 0, .1));
  },
  ladder: (box, _c, _d, top) => {   // an iron ladder up the wall
    const h = Math.min(top, 3.2);
    for (const x of [-.28, .28]) box("wrought", .05, h, .05, loc(x, h / 2, WZ + .07));
    for (let i = 0; i < Math.floor((h - .2) / .34); i++) box("wrought", .56, .04, .04, loc(0, .25 + i * .34, WZ + .05));
  },

  machine: (box, cyl) => {   // a riveted machine block: a control panel with lamps and dials, a flywheel, vent pipes
    box("rustplate", 1.6, 1.2, .8, loc(0, .6, WZ + .45));
    box("wrought", 1.7, .1, .9, loc(0, 1.25, WZ + .45));
    box("wrought", .7, .45, .06, loc(-.35, .8, WZ + .88));
    for (const x of [-.55, -.4, -.25]) box("led", .06, .06, .02, loc(x, .95, WZ + .92));
    for (const x of [-.5, -.2]) cyl("wrought", .08, .08, .04, loc(x, .7, WZ + .92, HP), 6);
    cyl("wrought", .3, .3, .08, loc(.55, .75, WZ + .9, HP), 8);
    cyl("wrought", .07, .07, .12, loc(.55, .75, WZ + .9, HP), 5);
    cyl("pipe", .07, .07, .7, loc(.5, 1.65, WZ + .4), 5); cyl("pipe", .07, .07, .5, loc(-.5, 1.55, WZ + .5), 5);
  },
  drum: (_b, cyl) => {   // two steel drums standing and one on its side
    for (const [x, z] of [[-.5, .3], [.1, .32]] as const) {
      cyl("rustplate", .22, .22, .6, loc(x, .3, WZ + z), 8);
      cyl("wrought", .235, .235, .035, loc(x, .12, WZ + z), 8); cyl("wrought", .235, .235, .035, loc(x, .48, WZ + z), 8);
    }
    cyl("rustplate", .22, .22, .6, loc(.5, .22, WZ + .85, 0, .4, HP), 8);
  },
  hook: (box, _c, d, top) => {   // a meat hook on a heavy chain from the ceiling
    const len = Math.max(.6, Math.min(d.h || 1.2, top - 2.3)), n = Math.floor(len / .24);
    for (let i = 0; i < n; i++) box("wrought", i % 2 ? .16 : .05, .24, i % 2 ? .05 : .16, loc(0, top - .12 - i * .24, 0));
    const y = top - n * .24;
    box("wrought", .16, .16, .16, loc(0, y - .08, 0));
    box("wrought", .1, .5, .1, loc(0, y - .4, 0));
    box("wrought", .42, .1, .1, loc(.14, y - .72, 0, 0, 0, .3));
    box("wrought", .09, .32, .09, loc(.33, y - .58, 0));
  },
  conveyor: (box) => {   // a low conveyor along the wall: a frame on four legs, a black belt, cross slats
    box("wrought", 1.9, .1, .62, loc(0, .55, WZ + .4));
    for (const x of [-.85, .85]) for (const z of [.12, .68]) box("wrought", .08, .5, .08, loc(x, .25, WZ + z));
    box("dark", 1.8, .03, .5, loc(0, .62, WZ + .4));
    for (let i = 0; i < 8; i++) box("wrought", .05, .04, .5, loc(-.8 + i * .23, .65, WZ + .4));
  },
  gauge: (box, cyl) => {   // a wall panel: two dials with red needles, two lamps, a pipe stub below
    box("rustplate", .9, .9, .12, loc(0, 1.6, WZ + .08));
    for (const x of [-.22, .22]) {
      cyl("wrought", .17, .17, .05, loc(x, 1.78, WZ + .16, HP), 8);
      box("led", .03, .15, .01, loc(x, 1.8, WZ + .2, 0, 0, x * 3));
    }
    for (const x of [-.2, .2]) box("led", .09, .09, .02, loc(x, 1.36, WZ + .15));
    cyl("pipe", .08, .08, .6, loc(0, .98, WZ + .16), 5);
  },

  // levels 5 and 6's set-pieces (Task 3): the sewers' pump, tank and lantern, the factory's press, furnace and work lamp
  pump: (box, cyl) => {   // a sewage pump: a volute casing and a motor on a slab, a valve wheel on top, a pipe into the wall and one up
    box("wrought", 1.5, .14, 1.05, loc(0, .07, WZ + .6));
    cyl("pipe", .42, .48, .62, loc(-.3, .45, WZ + .6), 8);
    cyl("wrought", .3, .3, .06, loc(-.3, .8, WZ + .6), 8);
    box("rustplate", .62, .55, .55, loc(.5, .42, WZ + .6));
    for (const x of [.32, .5, .68]) box("wrought", .03, .5, .58, loc(x, .42, WZ + .6));
    cyl("wrought", .24, .24, .04, loc(-.3, .95, WZ + .6), 8);
    box("wrought", .5, .04, .04, loc(-.3, .95, WZ + .6)); box("wrought", .04, .04, .5, loc(-.3, .95, WZ + .6));
    cyl("pipe", .1, .1, .5, loc(-.3, .55, WZ + .3, HP), 6);
    cyl("pipe", .09, .09, 1.6, loc(.5, 1.5, WZ + .2), 6);
    box("led", .05, .05, .02, loc(.6, .6, WZ + .89));
  },
  tank: (box, cyl) => {   // a riveted settling tank against the wall, banded, with a gauge glass, a hatch and a pipe up into the ceiling
    cyl("rustplate", .58, .58, 2.3, loc(0, 1.15, WZ + .64), 10);
    for (const y of [.25, 1.15, 2.05]) cyl("wrought", .6, .6, .07, loc(0, y, WZ + .64), 10);
    cyl("wrought", .5, .58, .14, loc(0, 2.37, WZ + .64), 10);
    box("sludge", .05, .8, .02, loc(.32, 1.0, WZ + 1.22));
    box("wrought", .12, .9, .04, loc(.32, 1.0, WZ + 1.21));
    cyl("wrought", .17, .17, .05, loc(-.2, .7, WZ + 1.22, HP), 8);
    cyl("pipe", .08, .08, 1.0, loc(-.2, 2.9, WZ + .64), 6);
  },
  lantern: (box, cyl) => {   // a caged lantern on an iron bracket, its glass sickly green: the sewers' light
    box("wrought", .07, .07, .4, loc(0, 2.0, WZ + .22));
    box("wrought", .05, .5, .05, loc(0, 1.78, WZ + .04));
    box("wrought", .03, .18, .03, loc(0, 1.92, WZ + .4));
    cyl("wrought", .04, .15, .1, loc(0, 1.86, WZ + .4), 6);
    cyl("lampgreen", .11, .11, .3, loc(0, 1.66, WZ + .4), 6);
    for (const [x, z] of [[-.12, 0], [.12, 0], [0, -.12], [0, .12]]) box("wrought", .025, .32, .025, loc(x, 1.66, WZ + .4 + z));
    cyl("wrought", .14, .14, .04, loc(0, 1.5, WZ + .4), 6);
  },
  press: (box, cyl) => {   // a hydraulic press: two uprights and a crown over an anvil, the piston down, hazard lamp on the crown
    box("wrought", 1.5, .3, 1.0, loc(0, .15, WZ + .55));
    for (const x of [-.6, .6]) box("rustplate", .16, 2.0, .16, loc(x, 1.3, WZ + .55));
    box("wrought", 1.5, .26, .55, loc(0, 2.35, WZ + .55));
    box("wrought", .7, .16, .5, loc(0, .38, WZ + .55));
    cyl("wrought", .11, .11, .85, loc(0, 1.95, WZ + .55), 6);
    box("rustplate", .8, .14, .6, loc(0, 1.47, WZ + .55));
    box("led", .08, .08, .04, loc(.5, 2.35, WZ + .84));
    cyl("pipe", .06, .06, .9, loc(-.35, 2.9, WZ + .3), 5);
  },
  furnace: (box, cyl) => {   // a brick furnace with an iron door open on a bed of coals, a flue to the ceiling: the factory's fire
    box("brick", 1.7, 1.5, .95, loc(0, .75, WZ + .5));
    box("wrought", 1.8, .1, 1.05, loc(0, 1.55, WZ + .5));
    box("wrought", 1.8, .12, 1.05, loc(0, .06, WZ + .5));
    box("wrought", .9, .72, .04, loc(0, .62, WZ + .97));
    box("coal", .7, .5, .03, loc(0, .55, WZ + 1.0));
    for (const x of [-.2, 0, .2]) box("wrought", .03, .5, .04, loc(x, .55, WZ + 1.03));
    cyl("pipe", .2, .2, 2.4, loc(0, 2.7, WZ + .4), 6);
    box("led", .07, .07, .02, loc(.68, 1.2, WZ + .98));
  },
  worklamp: (_b, cyl, _d, top, sph) => {   // a work lamp on a cable from the ceiling: a tin shade, a bare bulb in a wire cage
    const y = top - 1.15;
    cyl("wrought", .012, .012, 1.0, loc(0, top - .5, 0), 4);
    cyl("wrought", .06, .3, .2, loc(0, y + .2, 0), 8);
    sph("lampwhite", .12, loc(0, y, 0));
    cyl("wrought", .16, .16, .02, loc(0, y - .12, 0), 8);
    for (const [x, z] of [[-.14, 0], [.14, 0], [0, -.14], [0, .14]]) cyl("wrought", .008, .008, .34, loc(x, y + .04, z), 3);
  },
};

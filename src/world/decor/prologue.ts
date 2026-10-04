import * as THREE from "three";
import { grain } from "../../render/BandTextures";
import { CELL, WALLH } from "../Grid";
import { loc, type Piece } from "./kit";

/**
 * THE PROLOGUE'S PIECES - headstones, crosses, a table tomb, the dead tree,
 * a coffin and its lid, bones, chains, a brazier bowl, the burning floor, the
 * bridge, a filled grave, a clawing hand, dead grass, a shovel and the
 * mausoleum's roof. Moved here unchanged from `Decor.ts` when the dressing
 * kit was split out (levels-feel-full plan, Task 1); `registry.ts` gives each
 * its mode and shadow class, and the prologue's scene is exactly what it was.
 */
export const PROLOGUE_PIECES: Record<string, Piece> = {
  headstone: (box, _c, d) => {
    const lean = d.h || 0;
    box("stone", .72, .92, .15, loc(0, .46, 0, lean));
    box("stone", .5, .16, .15, loc(0, .98 * Math.cos(lean), .98 * Math.sin(lean), lean));
    box("stone", .9, .08, .3, loc(0, .04, 0));
  },
  cross: (box, _c, d) => {
    const lean = d.h || 0;
    box("stone", .13, 1.3, .13, loc(0, .65, 0, 0, 0, lean));
    box("stone", .62, .12, .12, loc(-.93 * Math.sin(lean), .93 * Math.cos(lean), 0, 0, 0, lean));
  },
  tomb: (box) => {
    box("stone", 1.0, .52, 1.7, loc(0, .26, 0));
    box("stone", 1.14, .1, 1.86, loc(0, .57, 0));
  },
  tree: (_b, cyl, d) => {
    cyl("bark", .13, .27, 3.0, loc(0, 1.5, 0));
    // five limbs and a twig off each, angles from the spec's cell by the integer hash
    for (let i = 0; i < 5; i++) {
      const yaw = i * 1.26 + grain(i, d.x * 31 + d.z, 7) * .8, pitch = .55 + grain(i, 3, 11) * .6;
      const len = 1.1 + grain(i, 5, 13) * .8, y0 = 1.5 + i * .3, r = .07 - i * .006;
      const dir = new THREE.Vector3(Math.sin(pitch) * Math.cos(yaw), Math.cos(pitch), Math.sin(pitch) * Math.sin(yaw));
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const mid = dir.clone().multiplyScalar(len / 2).add(new THREE.Vector3(0, y0, 0));
      cyl("bark", r * .55, r, len, new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)), 5);
      const tip = dir.clone().multiplyScalar(len).add(new THREE.Vector3(0, y0, 0));
      const dir2 = new THREE.Vector3(dir.x * .5 + Math.cos(yaw + 1.3) * .6, .7, dir.z * .5 + Math.sin(yaw + 1.3) * .6).normalize();
      const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2);
      cyl("bark", .012, r * .5, .7, new THREE.Matrix4().compose(dir2.clone().multiplyScalar(.35).add(tip), q2, new THREE.Vector3(1, 1, 1)), 4);
    }
  },
  coffin: (box) => {
    box("wood", .62, .06, 1.8, loc(0, .03, 0));
    box("wood", .06, .34, 1.8, loc(.28, .17, 0)); box("wood", .06, .34, 1.8, loc(-.28, .17, 0));
    box("wood", .62, .34, .06, loc(0, .17, .87)); box("wood", .62, .34, .06, loc(0, .17, -.87));
  },
  lid: (box) => {
    box("wood", .64, .06, 1.2, loc(0, .2, -.3, -.3));   // the lid, split, the long half tipped on the spoil
    box("wood", .64, .06, .66, loc(.08, .04, .72, .06, .3));
    box("wood", .3, .06, .7, loc(.5, .03, .2, 0, .5));   // a split plank on the ground
  },
  bones: (box) => {
    box("bone", .2, .17, .22, loc(0, .085, 0, 0, .4));
    box("bone", .14, .05, .12, loc(.02, .025, .14, 0, .4));
    box("bone", .06, .06, .48, loc(.32, .03, .1, 0, .7));
    box("bone", .06, .06, .42, loc(-.28, .03, -.18, 0, -1.2));
    for (let i = 0; i < 3; i++) box("bone", .34, .03, .03, loc(.02, .02, -.32 - i * .08, 0, .2 + i * .1));
  },
  chain: (box, _c, d, top) => {
    const n = Math.max(2, Math.floor((d.h || 2) / .17));
    for (let i = 0; i < n; i++) box("iron", i % 2 ? .1 : .025, .16, i % 2 ? .025 : .1, loc(0, top - .08 - i * .17, 0));
    box("iron", .04, .22, .04, loc(0, top - .08 - n * .17, 0));
    box("iron", .16, .04, .04, loc(.06, top - .2 - n * .17, 0, 0, 0, .5));
  },
  bowl: (_b, cyl) => {
    cyl("iron", .4, .22, .24, loc(0, 1.04, 0), 8);
    cyl("iron", .1, .1, .06, loc(0, .9, 0), 6);
  },
  ember: () => {},   // a burning cell is a fire emitter (`Decor.ts`), and the lava under it is the lake's (`src/fx/Lava.ts`); a slab over the lava was the reference's grid
  bridge: (box) => {   // a deck of dressed stone and a kerb down each side; runs along x
    box("slab", CELL, .08, CELL - .5, loc(0, .04, 0));
    box("char", CELL, .32, .22, loc(0, .16, CELL / 2 - .11)); box("char", CELL, .32, .22, loc(0, .16, -CELL / 2 + .11));
    // the lip of the deck catches the lava's light (the cliff under it is lit by the lake's own lights and its own cracks)
    for (const zs of [1, -1]) box("glow", CELL, .05, .02, loc(0, .03, zs * (CELL / 2 + .012)));
  },
  mound: (box, _c, d) => {   // a filled grave's earth, sunk and settled
    box("earth", .95, .16, 1.75, loc(0, .08, 0, 0, 0, (d.h || 0) * .1));
    box("earth", .7, .1, 1.4, loc(0, .19, .05));
  },
  hand: (box, _c, d) => {   // a bony hand clawing up out of the ground, as his did
    const lean = d.h || .35;
    box("bone", .07, .42, .07, loc(0, .18, 0, lean));
    const wy = .38 * Math.cos(lean), wz = .38 * Math.sin(lean);
    box("bone", .16, .12, .05, loc(0, wy, wz, lean));
    for (let f = 0; f < 4; f++) box("bone", .025, .15, .025, loc(-.06 + f * .04, wy + .12 * Math.cos(lean - .5), wz + .12 * Math.sin(lean - .5), lean - .5 - (f % 2) * .25));
    box("bone", .025, .1, .025, loc(.1, wy - .02, wz, lean, 0, -.9));
  },
  grass: (box, _c, d) => {   // dead tufts scattered over a cell, placed by the integer hash of the cell
    for (let i = 0; i < 7; i++) {
      const x = (grain(i, d.x * 37 + d.z, 5) - .5) * CELL * .9, z = (grain(i, d.x * 37 + d.z, 6) - .5) * CELL * .9;
      for (let b = 0; b < 3; b++) {
        const h = .12 + grain(i * 3 + b, d.x + d.z * 31, 7) * .16;
        box("grass", .025, h, .025, loc(x + (b - 1) * .03, h / 2, z, (b - 1) * .3, 0, (b - 1) * .25));
      }
    }
  },
  shovel: (box, _c, d) => {   // the gravedigger's, left standing in the spoil
    const lean = d.h || .25;
    box("wood", .045, 1.1, .045, loc(0, .62, 0, 0, 0, lean));
    box("wood", .2, .04, .04, loc(-1.18 * Math.sin(lean) * .98, 1.18 * Math.cos(lean), 0, 0, 0, lean));
    box("iron", .24, .3, .025, loc(.03 * Math.sin(lean), .02, 0, 0, 0, lean));
  },
  roof: (box, _c, d) => {
    // a gable over the mausoleum: w along x, depth along z, pitched about z, ridge 1.7 up
    const w = d.s || 8, dep = d.h || 8, rise = 1.7, half = w / 2 + .3, slope = Math.hypot(half, rise), ang = Math.atan2(rise, half);
    box("stone", slope, .22, dep + .6, loc(-half / 2, WALLH + rise / 2, 0, 0, 0, ang));
    box("stone", slope, .22, dep + .6, loc(half / 2, WALLH + rise / 2, 0, 0, 0, -ang));
    for (const zf of [dep / 2 + .1, -dep / 2 - .1]) {
      for (let i = 0; i < 6; i++) {   // the gable end, stepped in six courses
        const f = (i + .5) / 6;
        box("stone", 2 * half * (1 - f), rise / 6, .3, loc(0, WALLH + rise * i / 6 + rise / 12, zf));
      }
    }
    box("stone", .16, 1.1, .16, loc(0, WALLH + rise + .5, dep / 2 + .1));
    box("stone", .7, .14, .14, loc(0, WALLH + rise + .7, dep / 2 + .1));
  },
};

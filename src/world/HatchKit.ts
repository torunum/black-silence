import * as THREE from "three";
import { TEX } from "../render/ProcTextures";
import { DOORTEX } from "../render/DoorTextures";
import { track } from "../render/DisposeRegistry";
import { basic, lambert, ring, slab } from "./DoorParts";
import type { Rig, StyleSpec } from "./DoorTypes";

/**
 * THE LADDER AND THE HATCH (owner, 2026-10-21: "prologue u da diğer bölüme bağla") — how the prologue runs straight into the monastery.
 * ADEM climbs out of hell up a ladder at the top of the climb, shoulders a stone slab aside, and comes up through the floor of the
 * monastery's family crypt — where the monastery begins. One shaft, seen from its two ends, built in a door's frame so that
 * `ExitDoor.ts` sites them and `Transition.ts` takes the player through them (origin on the floor at the wall's face, `+z` into the room):
 *
 *  - **the ladder** (an exit): an old wooden ladder against the wall, up to a square of dressed stone in the roof where a slab lies over
 *    the shaft, cold grey light leaking round its edges. Going through it is climbing the ladder; the slab slides off at the top.
 *  - **the hatch** (an entrance): the same slab in a crypt's floor, a stone rim round it. The
 *    player comes up out of it; it is pushed off, and pulled back over the shaft behind him, a red glow from below while it is open.
 *
 * Nothing here gives light or draws from `Math.random`.
 */

/** (`w` is twice the slab: `pose` slides a leaf half the width, and the slab must clear the shaft.) */
export const LADDER_SPEC: StyleSpec = { w: 2.0, h: 3.32, rise: 0, move: "slide", glow: 0xa8b8d0, sound: "stone", name: "THE LADDER UP" };
export const HATCH_SPEC: StyleSpec = { w: 2.0, h: 0.1, rise: 0, move: "slide", glow: 0xff5a28, sound: "stone", name: "THE CRYPT HATCH" };
/** How far from the wall the shaft's middle is: the ladder's top, and the hatch. */
export const SHAFT_OUT = 0.62;
/** The height the ladder is climbed through (the roof's slab is at the top of it). */
export const CLIMB = 3.0;

const SIDE = 1.0, RIM = .14;

/** A ladder of `h` from the floor at (0,0,z), its rails `sep` apart, its rungs every .3. */
function ladder(h: number, z: number, wood: THREE.Material, into: THREE.Group, lean = .1): void {
  const l = new THREE.Group();
  for (const sd of [-1, 1]) l.add(slab(.06, h, .06, wood, sd * .24, h / 2, 0, false));
  for (let y = .3; y < h - .05; y += .3) l.add(slab(.48, .04, .045, wood, 0, y, 0, false));
  l.position.z = z; l.rotation.x = -lean;   // its top leans back to the wall
  into.add(l);
}

/** The square stone rim round the shaft's mouth, at height `y`, `t` thick, round a hole `SIDE` across centred `z` out. */
function rim(y: number, t: number, z: number, stone: THREE.Material, into: THREE.Group): void {
  const o = SIDE / 2 + RIM / 2;
  into.add(slab(SIDE + 2 * RIM, t, RIM, stone, 0, y, z - o, false));
  into.add(slab(SIDE + 2 * RIM, t, RIM, stone, 0, y, z + o, false));
  for (const sd of [-1, 1]) into.add(slab(RIM, t, SIDE, stone, sd * o, y, z, false));
}

/** The slab over the shaft, its ring uppermost: a leaf that slides `SIDE` along +x to open. */
function lid(y: number, z: number, under: boolean, rig: Rig): void {
  const n = new THREE.Group(), stone = lambert(DOORTEX.slab), iron = lambert(undefined, 0x24221f);
  n.add(slab(SIDE - .02, .1, SIDE - .02, stone, 0, 0, 0, false));
  const r = ring(.07, .014, iron, 0, under ? -.06 : .06, 0); r.rotation.x = Math.PI / 2; n.add(r);
  n.position.set(0, y, z);
  rig.group.add(n);
  rig.leaves.push({ node: n, side: 1, home: n.position.clone() });
}

/** Builds the ladder (`ladder`) or the hatch (`hatch`) as a door rig; `name` is the scene name of its solid group. */
export function buildHatchRig(style: "ladder" | "hatch", name: string): Rig {
  const s = style === "ladder" ? LADDER_SPEC : HATCH_SPEC, g = new THREE.Group(), gl = new THREE.Group();
  g.name = name; gl.name = "doorGlow";
  const rig: Rig = { style, spec: s, group: g, glow: gl, leaves: [], wheel: null, seam: [], open: 0 };
  const stone = lambert(TEX.dungeonWall, 0x8c8a86), wood = lambert(DOORTEX.oak, 0x9a8a78);
  const z = SHAFT_OUT, seamMat = basic(s.glow, undefined, true);
  if (style === "ladder") {
    ladder(CLIMB + .35, .3, wood, g, .06);
    rim(s.h - .03, .08, z, stone, g);
    lid(s.h - .02, z, true, rig);
    // the shaft beyond the slab: a square of grey light, seen once the slab is off
    const sky = new THREE.Mesh(track(new THREE.PlaneGeometry(SIDE, SIDE)), basic(s.glow, DOORTEX.glow, true));
    sky.rotation.x = Math.PI / 2; sky.position.set(0, s.h + .03, z); gl.add(sky);
    // the light round the slab's edges while it lies there, and down the wall onto the ladder's foot
    for (const [w, d, x, zz] of [[SIDE, .03, 0, z - SIDE / 2], [SIDE, .03, 0, z + SIDE / 2], [.03, SIDE, -SIDE / 2, z], [.03, SIDE, SIDE / 2, z]] as const) {
      const m = new THREE.Mesh(track(new THREE.PlaneGeometry(w, d)), seamMat); m.rotation.x = Math.PI / 2; m.position.set(x, s.h - .08, zz); gl.add(m); rig.seam.push(m);
    }
    const pool = new THREE.Mesh(track(new THREE.PlaneGeometry(1.6, 1.6)), basic(s.glow, DOORTEX.glow, true));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, .03, z); gl.add(pool);
    // the litter at its foot: fallen mortar, a bone
    for (const [x, zz, w] of [[-.4, .9, .16], [.35, 1.1, .1], [.1, 1.3, .12]] as const) g.add(slab(w, .05, w * .8, stone, x, .025, zz, false));
  } else {
    // the shaft's mouth in the floor: the rim, the dark below, and the slab
    rim(.03, .06, z, stone, g);
    const dark = new THREE.Mesh(track(new THREE.PlaneGeometry(SIDE, SIDE)), basic(0x020101)); dark.rotation.x = -Math.PI / 2; dark.position.set(0, .012, z); g.add(dark);
    lid(.06, z, false, rig);
    // hell's glow up the shaft while it is open, and round the slab's edges while it is shut
    const pit = new THREE.Mesh(track(new THREE.PlaneGeometry(SIDE, SIDE)), basic(s.glow, DOORTEX.glow, true)); pit.rotation.x = -Math.PI / 2; pit.position.set(0, .02, z); gl.add(pit);
    for (const [w, d, x, zz] of [[SIDE, .03, 0, z - SIDE / 2], [SIDE, .03, 0, z + SIDE / 2], [.03, SIDE, -SIDE / 2, z], [.03, SIDE, SIDE / 2, z]] as const) {
      const m = new THREE.Mesh(track(new THREE.PlaneGeometry(w, d)), seamMat); m.rotation.x = -Math.PI / 2; m.position.set(x, .12, zz); gl.add(m); rig.seam.push(m);
    }
  }
  return rig;
}

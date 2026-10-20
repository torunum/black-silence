import * as THREE from "three";
import { TEX } from "../render/ProcTextures";
import { DOORTEX } from "../render/DoorTextures";
import { track } from "../render/DisposeRegistry";
import type { Rig, StyleSpec } from "./DoorTypes";

/**
 * THE WELL AND THE ROPE (owner, 2026-10-20: "diğer bölümde de kuyuya inebilir iple. 3. bölümde kuyu icinden başlar gibi"). Two ways
 * through a level that are not doors, built in a door's frame so that `ExitDoor.ts` sites them and `Transition.ts` takes the player
 * through them like any other (origin on the floor at the wall's face, `+z` into the room):
 *
 *  - **the well** (an exit): a ring of stone a step out from the wall, black inside, under a winch on two posts with its rope hanging
 *    into the dark, a plank lid that slides off when it is used. Going through it is climbing down the rope (`Transition.ts`).
 *  - **the rope** (an entrance): the bottom of a shaft — a rope come down the wall from a square of grey light high up, a ring of
 *    fallen stones and a puddle where it ends. Arriving by it is coming down it.
 *
 * Nothing here gives light or draws from `Math.random`.
 */

export const WELL_SPEC: StyleSpec = { w: 1.3, h: 0.8, rise: 0, move: "slide", glow: 0x6a8aa8, sound: "stone", name: "THE WELL" };
export const ROPE_SPEC: StyleSpec = { w: 1.0, h: 2.4, rise: 0, move: "slide", glow: 0x8a98a8, sound: "stone", name: "THE WELL'S BOTTOM" };
/** How far from the wall the well's centre stands, and how deep the climb down is. */
export const WELL_OUT = 0.95, WELL_DEPTH = 4.2;

function lambert(map: THREE.Texture | undefined, color = 0xffffff): THREE.MeshLambertMaterial {
  return track(new THREE.MeshLambertMaterial(map ? { map, color } : { color }));
}
function black(): THREE.MeshBasicMaterial { return track(new THREE.MeshBasicMaterial({ color: 0x010101 })); }

function cyl(r0: number, r1: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 10, open = false): THREE.Mesh {
  const m = new THREE.Mesh(track(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open)), mat);
  m.position.set(x, y, z);
  return m;
}
function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), mat);
  m.position.set(x, y, z);
  return m;
}

/** Builds the well (`well`) or the rope's foot (`rope`) as a door rig; `name` is the scene name of its solid group. */
export function buildWellRig(style: "well" | "rope", name: string): Rig {
  const s = style === "well" ? WELL_SPEC : ROPE_SPEC, g = new THREE.Group(), gl = new THREE.Group();
  g.name = name; gl.name = "doorGlow";
  const rig: Rig = { style, spec: s, group: g, glow: gl, leaves: [], wheel: null, seam: [], open: 0 };
  const stone = lambert(TEX.dungeonWall, 0x8a8a8e), wood = lambert(DOORTEX.crypt, 0x7a5a3a), rope = lambert(undefined, 0x8a7448);
  const z = WELL_OUT;
  if (style === "well") {
    // the ring: an outer wall and an inner one, a capping course, the black inside
    g.add(cyl(.66, .7, s.h, stone, 0, s.h / 2, z, 14, true));
    g.add(cyl(.5, .5, s.h, stone, 0, s.h / 2, z, 14, true));
    const cap = new THREE.Mesh(track(new THREE.RingGeometry(.5, .72, 14)), stone); cap.rotation.x = -Math.PI / 2; cap.position.set(0, s.h + .01, z); g.add(cap);
    const dark = new THREE.Mesh(track(new THREE.CircleGeometry(.5, 14)), black()); dark.rotation.x = -Math.PI / 2; dark.position.set(0, .06, z); g.add(dark);
    // the winch: two posts, the axle with its drum, a crank, the rope down into the well
    for (const sd of [-1, 1]) g.add(box(.12, 2.0, .12, wood, sd * .78, 1.0, z));
    g.add(cyl(.05, .05, 1.7, wood, 0, 1.86, z, 6)); g.children[g.children.length - 1].rotation.z = Math.PI / 2;
    g.add(cyl(.14, .14, .5, wood, 0, 1.86, z, 8)); g.children[g.children.length - 1].rotation.z = Math.PI / 2;
    g.add(box(.05, .32, .05, wood, .9, 1.72, z));
    g.add(cyl(.018, .018, 1.6, rope, 0, 1.0, z + .12, 5));
    // the lid: planks across the ring, slid off when the way is taken
    const lid = new THREE.Group();
    for (let i = -2; i <= 2; i++) lid.add(box(.24, .05, 1.3, wood, i * .26, 0, 0));
    lid.position.set(0, s.h + .04, z); g.add(lid);
    rig.leaves.push({ node: lid, side: 1, home: lid.position.clone() });
    // a faint cold breath of light up out of it, for the way on
    const pool = new THREE.Mesh(track(new THREE.CircleGeometry(.48, 14)), track(new THREE.MeshBasicMaterial({ color: s.glow, map: DOORTEX.glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, .3, z); gl.add(pool);
  } else {
    // the shaft's foot: the rope down the wall from a square of grey sky, stones fallen round where it ends, a puddle
    g.add(cyl(.02, .02, 3.2, rope, 0, 1.6, .35, 5));
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, r = .55 + (i % 3) * .08;
      g.add(box(.22 + (i % 2) * .1, .14, .18, stone, Math.cos(a) * r, .07, .5 + Math.sin(a) * r * .6));
    }
    const puddle = new THREE.Mesh(track(new THREE.CircleGeometry(.42, 12)), track(new THREE.MeshBasicMaterial({ color: 0x0c1418 })));
    puddle.rotation.x = -Math.PI / 2; puddle.position.set(.1, .02, .55); g.add(puddle);
    const sky = new THREE.Mesh(track(new THREE.PlaneGeometry(1.1, 1.1)), track(new THREE.MeshBasicMaterial({ color: s.glow, map: DOORTEX.glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    sky.rotation.x = Math.PI / 2; sky.position.set(0, 3.25, .5); gl.add(sky);
  }
  return rig;
}

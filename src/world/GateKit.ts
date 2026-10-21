import * as THREE from "three";
import { TEX } from "../render/ProcTextures";
import { DOORTEX } from "../render/DoorTextures";
import { track } from "../render/DisposeRegistry";
import { JAMB, PORCH, archFrame, basic, flame, lambert, outline, ring, slab } from "./DoorParts";
import type { Rig, StyleSpec } from "./DoorTypes";

/**
 * THE GREAT GATE (owner, 2026-10-20: "ilk bölüm büyük bir kapıdan geçerek bitebilir. diğer bölüm başlayabilir") — the monastery's way
 * out and the dungeon's way in: the same gate, seen from either side. Two tall leaves of thick oak with a diagonal brace and rows of
 * iron studs (`DOORTEX.gate`), each with a heavy ring, under a pointed arch of dressed stone with a keystone; above the leaves, in the
 * arch's head, the monastery's bronze bell hangs in a niche; two iron braziers on posts either side. It opens as the church doors do,
 * both leaves swung in on their hinges.
 *
 * The frame is a great door's (`./DoorKit.ts`): origin on the floor at the middle of the wall face, `+z` into the room. Wider than a
 * cell (the porch stands in front of the wall, so it may), and its head stays under the lowest ceiling a level's spawn has (`WALLH`).
 * Nothing here gives light or draws from `Math.random`.
 */

export const GATE_SPEC: StyleSpec = { w: 1.8, h: 2.3, rise: 0.6, move: "swing", glow: 0xffc070, sound: "gate", name: "THE GREAT GATE" };

/** Builds the great gate as a door rig; `name` is the scene name of its solid group. */
export function buildGateRig(name: string): Rig {
  const s = GATE_SPEC, g = new THREE.Group(), gl = new THREE.Group();
  g.name = name; gl.name = "doorGlow";
  const rig: Rig = { style: "gate", spec: s, group: g, glow: gl, leaves: [], wheel: null, seam: [], open: 0 };
  const hw = s.w / 2, top = s.h + s.rise;
  const stone = lambert(TEX.churchWall, 0xa8a49a), iron = lambert(undefined, 0x1c1a18), bronze = lambert(undefined, 0x8a6a34);

  // ---- the arch: a deep surround cut to the pointed opening, a keystone, a plinth either side, the sill
  g.add(archFrame(s, stone));
  const outer = outline(s, JAMB + .16); outer.holes.push(outline(s, JAMB));
  const course = new THREE.Mesh(track(new THREE.ExtrudeGeometry(outer, { depth: PORCH * .6, bevelEnabled: false })), stone);
  g.add(course);   // a second, shallower order of the arch round the first
  g.add(slab(.36, .44, PORCH + .12, stone, 0, top + JAMB * .7, (PORCH + .12) / 2));   // the keystone
  for (const sd of [-1, 1]) g.add(slab(JAMB + .3, .5, PORCH + .2, stone, sd * (hw + JAMB / 2 + .08), .25, (PORCH + .2) / 2));
  g.add(slab(s.w + 2 * JAMB + .5, .06, PORCH + .3, stone, 0, .03, (PORCH + .3) / 2));

  // ---- the dark beyond the leaves, the bloom in it, the lit threshold
  const plane = (): THREE.PlaneGeometry => track(new THREE.PlaneGeometry(s.w + .02, top));
  const hole = new THREE.Mesh(plane(), basic(0x020202)); hole.position.set(0, top / 2, .02); g.add(hole);
  const bloom = new THREE.Mesh(plane(), basic(s.glow, DOORTEX.glow, true)); bloom.position.set(0, top / 2, .03); gl.add(bloom);
  const pool = new THREE.Mesh(track(new THREE.PlaneGeometry(s.w * 2.4, 2.6)), basic(s.glow, DOORTEX.glow, true));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, .07, 1.1); gl.add(pool);

  // ---- the tympanum: the arch's head filled with boards, and the bell hanging in a niche in it
  const head = new THREE.Shape(), a = hw, r = s.rise, R = (a * a + r * r) / (2 * a), cx = a - R, apex = Math.acos(-cx / R);
  head.moveTo(-a, s.h); head.lineTo(a, s.h);
  for (let i = 1; i <= 8; i++) { const t = apex * (1 - i / 8); head.lineTo(cx + R * Math.cos(t), s.h + R * Math.sin(t)); }
  for (let i = 7; i >= 1; i--) { const t = apex * (1 - i / 8); head.lineTo(-(cx + R * Math.cos(t)), s.h + R * Math.sin(t)); }
  head.lineTo(-a, s.h);
  const tymp = new THREE.Mesh(track(new THREE.ExtrudeGeometry(head, { depth: .08, bevelEnabled: false })), lambert(DOORTEX.gate, 0x8a7a6a));
  tymp.position.z = PORCH - .14; g.add(tymp);
  const bell = new THREE.Mesh(track(new THREE.LatheGeometry(
    [[0, .2], [.05, .2], [.08, .16], [.09, .08], [.11, .02], [.14, -.02], [.14, -.04], [0, -.04]].map(([x, y]) => new THREE.Vector2(x, y)), 10)), bronze);
  bell.position.set(0, s.h + .14, PORCH - .02); g.add(bell);
  g.add(slab(.2, .03, .06, iron, 0, s.h + .36, PORCH - .04, false));

  // ---- the leaves: hinged at the jambs, swung into the room; a ring and a lock plate each
  const T = .11, leafZ = PORCH - .12, mat = lambert(DOORTEX.gate);
  for (const sd of [-1, 1] as const) {
    const lf = new THREE.Group(), w = hw - .01;
    const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, s.h, T)), mat); m.position.set(-sd * w / 2, s.h / 2, 0); lf.add(m);
    lf.add(ring(.1, .022, iron, -sd * (w - .16), s.h * .48, T / 2 + .02));
    lf.add(slab(.12, .16, .02, iron, -sd * (w - .16), s.h * .48 + .13, T / 2 + .01, false));
    for (const y of [.3, s.h - .3]) lf.add(slab(w * .8, .07, .02, iron, -sd * w * .45, y, T / 2 + .01, false));   // strap hinges
    lf.position.set(sd * hw, 0, leafZ); g.add(lf);
    rig.leaves.push({ node: lf, side: sd, home: lf.position.clone() });
  }

  // ---- the braziers: iron bowls on posts, burning whether the gate is open or not
  for (const sd of [-1, 1]) {
    const x = sd * (hw + JAMB + .62);
    const bowl = new THREE.Mesh(track(new THREE.CylinderGeometry(.2, .1, .14, 8, 1, true)), iron);
    bowl.position.set(x, 1.15, .45); g.add(bowl);
    flame(0xffa040, x, 1.32, .45, iron, g, .16);   // the stem is the post
  }

  // ---- light through the crack while it is shut: down the seam, along the sill, a halo round the arch
  const seamMat = basic(s.glow, undefined, true);
  const v = new THREE.Mesh(track(new THREE.PlaneGeometry(.05, s.h)), seamMat); v.position.set(0, s.h / 2, PORCH + .02);
  const sill = new THREE.Mesh(track(new THREE.PlaneGeometry(s.w, .06)), seamMat); sill.rotation.x = -Math.PI / 2; sill.position.set(0, .08, PORCH + .14);
  const haloMat = basic(s.glow, DOORTEX.glow, true); haloMat.opacity = .5;
  const halo = new THREE.Mesh(track(new THREE.PlaneGeometry((s.w + 2 * JAMB) * 2, top + 1.2)), haloMat); halo.position.set(0, top / 2 + .25, PORCH + .03);
  rig.seam = [v, sill, halo]; gl.add(v, sill, halo);
  return rig;
}

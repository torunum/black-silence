import * as THREE from "three";
import { track } from "../render/DisposeRegistry";
import type { StyleSpec } from "./DoorTypes";

/**
 * The pieces the great doors are built from (`./DoorKit.ts`, `./GateKit.ts`, `./HatchKit.ts`): tiled slabs, the outline of an opening
 * with a square or pointed head, a stone surround cut to it, rings, posts, small flames and bare lit boxes. Apart from the kits so that
 * each kit can use them and `DoorKit.ts` can still hand every style to its own kit, without a cycle between them.
 */

/** How deep the porch stands off the wall, and the width of a jamb. */
export const PORCH = 0.34, JAMB = 0.28;

export const lambert = (map: THREE.Texture | undefined, color = 0xffffff): THREE.MeshLambertMaterial =>
  track(new THREE.MeshLambertMaterial(map ? { map, color } : { color }));
export const basic = (color: number, map?: THREE.Texture, additive = false): THREE.MeshBasicMaterial =>
  track(new THREE.MeshBasicMaterial({
    color, map, transparent: additive || !!map, depthWrite: !additive, side: THREE.DoubleSide,
    ...(additive ? { blending: THREE.AdditiveBlending, opacity: .9 } : {}),
  }));

/** A box with its texture tiled at the wall's density (one tile a `CELL` across, one a `WALLH` up), not stretched. */
export function slab(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, tile = true): THREE.Mesh {
  const g = track(new THREE.BoxGeometry(w, h, d));
  if (tile) {
    const uv = g.attributes.uv, dims: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const j = f * 4 + i;
      uv.setXY(j, uv.getX(j) * dims[f][0] / 2, uv.getY(j) * dims[f][1] / 3.4);
    }
  }
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
}

/**
 * The opening's outline, grown by `grow` all round: a rectangle with a square
 * head, or with a pointed one (two arcs of radius R centred on the opposite
 * side of the axis, meeting at the apex).
 */
export function outline(s: StyleSpec, grow = 0): THREE.Shape {
  const a = s.w / 2 + grow, sh = new THREE.Shape();
  sh.moveTo(-a, 0); sh.lineTo(a, 0); sh.lineTo(a, s.h);
  if (s.rise > 0) {
    const r = s.rise + grow, R = (a * a + r * r) / (2 * a), cx = a - R, top = Math.acos(-cx / R);
    for (let i = 1; i <= 8; i++) { const t = top * (1 - i / 8); sh.lineTo(cx + R * Math.cos(t), s.h + R * Math.sin(t)); }
    for (let i = 7; i >= 1; i--) { const t = top * (1 - i / 8); sh.lineTo(-(cx + R * Math.cos(t)), s.h + R * Math.sin(t)); }
  } else sh.lineTo(0, s.h + grow);
  sh.lineTo(-a, s.h); sh.lineTo(-a, 0);
  return sh;
}

/** The stone surround of a pointed opening, extruded the porch's depth: one piece, the opening cut out of it. */
export function archFrame(s: StyleSpec, mat: THREE.Material): THREE.Mesh {
  const outer = outline(s, JAMB);
  outer.holes.push(outline(s));
  return new THREE.Mesh(track(new THREE.ExtrudeGeometry(outer, { depth: PORCH, bevelEnabled: false })), mat);
}

export function ring(r: number, tube: number, mat: THREE.Material, x: number, y: number, z: number, arc = Math.PI * 2): THREE.Mesh {
  const m = new THREE.Mesh(track(new THREE.TorusGeometry(r, tube, 5, 14, arc)), mat);
  m.position.set(x, y, z);
  return m;
}

export function post(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(track(new THREE.CylinderGeometry(r, r, h, 6)), mat);
  m.position.set(x, y, z);
  return m;
}

/** A small flame on a stem: lit but throwing no light. A sconce, a candle. It burns whether the way on is open or not. */
export function flame(color: number, x: number, y: number, z: number, stem: THREE.Material, into: THREE.Group, size = .1): void {
  into.add(post(.025, y - .15, stem, x, (y - .15) / 2, z));
  const f = new THREE.Mesh(track(new THREE.BoxGeometry(size, size * 1.7, size)), basic(color));
  f.position.set(x, y, z); into.add(f);
}

/** A bare light: one lit box. */
export function lamp(color: number, w: number, h: number, d: number, x: number, y: number, z: number, into: THREE.Group): void {
  const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), basic(color));
  m.position.set(x, y, z); into.add(m);
}


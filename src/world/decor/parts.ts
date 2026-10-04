import * as THREE from "three";
import { CELL } from "../Grid";
import { floorHeightAt, ceilHeightAt } from "../Collision";
import type { DecorSpec } from "../LevelBuilder";
import { PIECES } from "./registry";
import type { Klass } from "./kit";

/**
 * FROM SPECS TO GEOMETRY — every piece's parts, transformed to where the
 * spec puts it and gathered by (shadow class, material), which is what
 * `Decor.ts` then merges into one mesh each. Pure geometry: no scene, no
 * materials, so the tests can count the meshes a level would cost without
 * booting the game. Moved out of `Decor.ts` with the kit (levels-feel-full
 * plan, Task 1); the prologue's parts are gathered in the same order they
 * always were, so its scene is unchanged.
 */

/** Geometry lists keyed `class|material`, in the order a level first asks for each. */
export type Parts = Map<string, THREE.BufferGeometry[]>;

const key = (cls: Klass, mat: string): string => cls + "|" + mat;
export const partClass = (k: string): Klass => k.slice(0, k.indexOf("|")) as Klass;
export const partMaterial = (k: string): string => k.slice(k.indexOf("|") + 1);

function put(parts: Parts, k: string, g: THREE.BufferGeometry, m: THREE.Matrix4): void {
  const flat = g.index ? g.toNonIndexed() : g;
  if (flat !== g) g.dispose();
  flat.applyMatrix4(m);
  const list = parts.get(k);
  if (list) list.push(flat); else parts.set(k, [flat]);
}

/** Adds one spec's parts. `decor: no piece called …` if the kind is not in the kit. */
export function addPiece(parts: Parts, d: DecorSpec): void {
  const info = PIECES[d.k];
  if (!info) throw new Error("decor: no piece called " + d.k);
  if (info.h !== undefined && d.h === undefined) d = { ...d, h: info.h };
  const wx = (d.x + .5) * CELL, wz = (d.z + .5) * CELL, fy = floorHeightAt(wx, wz);
  const base = new THREE.Matrix4().compose(new THREE.Vector3(wx, fy, wz),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.r || 0),
    new THREE.Vector3(1, 1, 1).multiplyScalar(info.fixed ? 1 : d.s || info.scale || 1));
  const top = ceilHeightAt(wx, wz) - fy, at = (mat: string) => key(info.cls, mat);
  info.build(
    (mat, w, h, dd, m) => put(parts, at(mat), new THREE.BoxGeometry(w, h, dd), base.clone().multiply(m)),
    (mat, r0, r1, h, m, seg = 6) => put(parts, at(mat), new THREE.CylinderGeometry(r0, r1, h, seg), base.clone().multiply(m)),
    d, top,
    (mat, r, m) => put(parts, at(mat), new THREE.SphereGeometry(r, 6, 4), base.clone().multiply(m)));
}

/** The raw floats of a list of non-indexed geometries, concatenated into one. */
export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const size = name === "uv" ? 2 : 3, total = list.reduce((n, g) => n + g.getAttribute(name).count * size, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const g of list) { const a = g.getAttribute(name).array as Float32Array; arr.set(a, o); o += a.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  for (const g of list) g.dispose();
  return out;
}

/** What a set of specs costs to draw: meshes (one per class and material), triangles, and how many of them cast a shadow — without building any. */
export function costOf(specs: DecorSpec[]): { meshes: number; triangles: number; castTriangles: number; byClass: Record<Klass, number> } {
  const parts: Parts = new Map();
  for (const d of specs) if (d.k !== "light") addPiece(parts, d);
  let triangles = 0, castTriangles = 0;
  const byClass: Record<Klass, number> = { decor: 0, clutter: 0, grass: 0 };
  for (const [k, list] of parts) {
    byClass[partClass(k)]++;
    for (const g of list) {
      const t = g.getAttribute("position").count / 3;
      triangles += t;
      if (partClass(k) === "decor") castTriangles += t;   // what the lamp's cube shadow draws six times a frame
    }
  }
  for (const list of parts.values()) for (const g of list) g.dispose();
  return { meshes: parts.size, triangles, castTriangles, byClass };
}

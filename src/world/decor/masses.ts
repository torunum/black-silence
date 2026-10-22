import * as THREE from "three";
import { CELL, WALLH } from "../Grid";
import type { DecorSpec } from "../LevelBuilder";
import type { MassBox } from "../WorldState";
import { PIECES } from "./registry";

/**
 * SOLID MASSES (levels-feel-full plan, Task 2). Decor is visual, but a sarcophagus,
 * a machine, a pile of crates, a torture rack are things a player must not walk
 * through: each piece the registry gives a `mass` footprint becomes a box in world
 * units, and `solidAt` (`Collision.ts`) treats a point inside one as a wall.
 *
 * That one call is what the player (`collides` samples eight points round the
 * player's radius through it), every enemy's step, a projectile, a hitscan ray and
 * an enemy's line of sight all ask, so a mass stops all of them. A shot is the
 * exception (owner, 2026-10-21: "kısa cisimlerin üzerinden mermi gitmiyor"): a mass
 * knows how tall it stands (`y1`, measured off the piece's own parts), and
 * `shotSolidAt` lets a bullet, a nail, a stake or an orb pass over one it clears —
 * a crate pile is cover to crouch behind, not a wall to the ceiling. The placement
 * rules (`place.ts`) keep a mass out of every corridor, doorway and junction: what
 * a mass may not do is cut the level in two.
 *
 * Boxes are the axis-aligned bounds of the footprint after the spec's yaw and
 * size. A wall piece's yaw is a multiple of 90 degrees, so its box is exact; a
 * free piece placed by hand is given one too (the level's builder passes `r`),
 * and a free piece at any other yaw gets its bounding box, a little larger than
 * the piece, which is the safe side to be wrong on.
 */

/** The mass a spec makes, in world units, or null if its piece is not one. */
export function massBox(d: DecorSpec): MassBox | null {
  const info = PIECES[d.k];
  if (!info || !info.mass) return null;
  const k = info.fixed ? 1 : d.s || info.scale || 1, [a, b, c, e] = info.mass, r = d.r || 0;
  const cos = Math.cos(r), sin = Math.sin(r), wx = (d.x + .5) * CELL, wz = (d.z + .5) * CELL;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [lx, lz] of [[a, c], [a, e], [b, c], [b, e]] as const) {
    // three's rotation about y: x' = x cos r + z sin r, z' = -x sin r + z cos r
    const x = wx + (lx * cos + lz * sin) * k, z = wz + (-lx * sin + lz * cos) * k;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
  }
  return { x0, x1, z0, z1, y1: pieceTop(d) * k };
}

const tops = new Map<string, number>();
/** How tall a piece stands over its floor, before its scale: the highest corner of any of its parts (measured once a kind). */
export function pieceTop(d: DecorSpec): number {
  const info = PIECES[d.k], id = d.k + "|" + (d.h ?? "");
  let top = tops.get(id);
  if (top !== undefined) return top;
  top = 0;
  const v = new THREE.Vector3();
  const take = (m: THREE.Matrix4, hx: number, hy: number, hz: number): void => {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { v.set(sx * hx, sy * hy, sz * hz).applyMatrix4(m); if (v.y > top!) top = v.y; }
  };
  const spec = info.h !== undefined && d.h === undefined ? { ...d, h: info.h } : d;
  info.build((_m, w, h, dd, m) => take(m, w / 2, h / 2, dd / 2), (_m, r0, r1, h, m) => take(m, Math.max(r0, r1), h / 2, Math.max(r0, r1)), spec, WALLH, (_m, r, m) => take(m, r, r, r));
  tops.set(id, top);
  return top;
}

/** Every mass of a decor list. */
export function massBoxes(specs: readonly DecorSpec[]): MassBox[] {
  const out: MassBox[] = [];
  for (const d of specs) { const m = massBox(d); if (m) out.push(m); }
  return out;
}

const cellKey = (gx: number, gz: number): number => gz * 4096 + gx;

/** The boxes by grid cell, for `solidAt`'s one lookup: a box is listed under every cell it touches. Empty for a level with no masses. */
export function massMap(specs: readonly DecorSpec[] | undefined): Map<number, MassBox[]> {
  const map = new Map<number, MassBox[]>();
  for (const m of massBoxes(specs || [])) {
    for (let gz = Math.floor(m.z0 / CELL); gz <= Math.floor((m.z1 - 1e-9) / CELL); gz++)
      for (let gx = Math.floor(m.x0 / CELL); gx <= Math.floor((m.x1 - 1e-9) / CELL); gx++) {
        const list = map.get(cellKey(gx, gz));
        if (list) list.push(m); else map.set(cellKey(gx, gz), [m]);
      }
  }
  return map;
}

/** The grid cells a spec's mass touches (for the placement rules and the tests). */
export function massCells(d: DecorSpec): Array<[number, number]> {
  const m = massBox(d), out: Array<[number, number]> = [];
  if (!m) return out;
  for (let gz = Math.floor(m.z0 / CELL); gz <= Math.floor((m.z1 - 1e-9) / CELL); gz++)
    for (let gx = Math.floor(m.x0 / CELL); gx <= Math.floor((m.x1 - 1e-9) / CELL); gx++) out.push([gx, gz]);
  return out;
}

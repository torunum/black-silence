import { CELL } from "../Grid";
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
 * an enemy's line of sight all ask, so a mass stops all of them. **Shots stop on
 * a mass, at any height**: `solidAt` has no height, and a knee-high fallen statue
 * is as much cover as a machine. That is the trade for one rule instead of five,
 * and it is why the placement rules (`place.ts`) keep a mass out of every
 * corridor, doorway and junction: what a mass may not do is cut the level in two.
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
  return { x0, x1, z0, z1 };
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

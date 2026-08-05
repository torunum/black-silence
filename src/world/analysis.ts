import type { Grid } from "./LevelBuilder";

export interface Cell { x: number; z: number; }

/** Characters the player can never walk through. Mirrors solidAt() in legacy.js. */
const SOLID = new Set(["#", "I", "W"]);

/** The red-key door. Passable only once the key is held. */
const LOCKED = "D";

/** True if ch can be walked through. Doors (+) and secrets (S) always can. */
export function isWalkable(ch: string | undefined, throughLocked: boolean): boolean {
  if (ch === undefined) return false;
  if (SOLID.has(ch)) return false;
  if (ch === LOCKED) return throughLocked;
  return true;
}

/** True if (x,z) is inside the grid and is not a solid wall. */
export function isOpen(g: Grid, x: number, z: number): boolean {
  const row = g[z];
  if (!row) return false;
  const ch = row[x];
  if (ch === undefined) return false;
  return !SOLID.has(ch);
}

/** Every cell holding ch, in row-major order. */
export function findAll(g: Grid, ch: string): Cell[] {
  const out: Cell[] = [];
  for (let z = 0; z < g.length; z++) {
    for (let x = 0; x < g[z].length; x++) {
      if (g[z][x] === ch) out.push({ x, z });
    }
  }
  return out;
}

/**
 * Four-way flood fill from `start`.
 * Returns a same-shaped boolean grid of reachable cells.
 */
export function floodFill(g: Grid, start: Cell, throughLocked: boolean): boolean[][] {
  const seen: boolean[][] = g.map((row) => row.map(() => false));
  if (!isWalkable(g[start.z]?.[start.x], throughLocked)) return seen;

  const stack: Cell[] = [start];
  seen[start.z][start.x] = true;

  while (stack.length > 0) {
    const { x, z } = stack.pop()!;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (!g[nz] || g[nz][nx] === undefined) continue;
      if (seen[nz][nx]) continue;
      if (!isWalkable(g[nz][nx], throughLocked)) continue;
      seen[nz][nx] = true;
      stack.push({ x: nx, z: nz });
    }
  }
  return seen;
}

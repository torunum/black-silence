import { world } from "../../world/WorldState";
import { solidAt, segsCrossRay } from "../../world/Collision";
import { CELL } from "../../world/Grid";
import type { Enemy as EnemyShape } from "../Enemy";

/**
 * Perception — how enemies learn where a noise came from, and whether they
 * can see the player.
 *
 * `alertSound` is grouped with the level loader/prop section in
 * `src/legacy.js` (formerly line 394) but is an enemy-perception concern.
 * This plan originally left it for Task 10 to move here alongside `los`,
 * but moves now instead: `explodeBarrel` (Task 5, `src/world/Props.ts`)
 * calls it, and `explodeBarrel` moves in this same task. Leaving it behind
 * would have meant a third `src/core/Context.ts` entry for a function that
 * needs neither the locator nor a cycle-break — it is a four-line
 * zero-dependency leaf that reads `world.enemies` and writes
 * `e.alertX`/`e.alertZ`, calling nothing at all. Task 10 adds `los` here.
 *
 * Seven call sites existed in `legacy.js` before this move (the weapon fire
 * path, `damageEnemy`, `interact()`, and `explodeBarrel`'s own, formerly
 * ~141, 285, 393, 630, 1258, 1286 plus the definition at 394); the ones
 * that stay in `legacy.js` become imports of this module.
 *
 * `los` (line-of-sight) moved verbatim from `src/legacy.js` (formerly lines
 * 156-161, Task 10). Like `alertSound` it is a leaf with respect to the AI
 * DAG: its only calls are to `src/world/Collision.ts`'s already-migrated
 * `solidAt`/`segsCrossRay`. It is by far the AI section's most-called
 * function (`priestTeleport`, `enemyTick` and itself's own callers all
 * reach it), which is exactly why it needs to sit at the bottom of the DAG
 * rather than alongside any one caller.
 */

/** What alertSound's noise-propagation write touches on a `world.enemies` element. */
type Enemy = Pick<EnemyShape, "x" | "z" | "dead" | "dormant" | "alertX" | "alertZ">;

/**
 * SOUND, AS DOOM CARRIES IT (owner, 2026-10-20: "Blood veya Doom gibi oynanış"). A noise used to reach every enemy within
 * `radius` units as the crow flies — through solid walls — and send it walking at the noise in a straight line, so a monster in
 * the next room heard the shot and then stood against the wall between. Now the noise floods the grid from where it was made, as
 * Doom's flows through open sectors: through floor, open doors and doorways, around corners, stopped by walls, pillars, windows
 * and closed doors, out to `radius × REACH` units of walking. Every enemy it reaches is alerted, and the flood is kept as a field
 * the enemy walks down (`soundStep`), cell by cell, to where the noise was: it comes round the corner and through the door for you.
 *
 * With no grid (a bare test world) the old reach — the straight-line radius — is kept. Nothing here draws from `Math.random`.
 */
export const REACH = 1.5;
const sound = { grid: null as string[][] | null, W: 0, H: 0, dist: new Int16Array(0), x: -1, z: -1 };

function soundPasses(gx: number, gz: number): boolean {
  const row = world.grid[gz]; if (!row) return false;
  const ch = row[gx]; if (ch === undefined) return false;
  if (ch === "#" || ch === "I" || ch === "W") return false;
  if (ch === "+" || ch === "D" || ch === "S") { const d = world.doors[gx + "," + gz] as { open?: boolean } | undefined; return !!d && !!d.open; }
  return true;
}

export function alertSound(x: number, z: number, radius: number): void {
  const enemies: readonly Enemy[] = world.enemies;   // checked widening, not a cast
  const W = world.GW, H = world.GH;
  if (!W || !H || !world.grid.length) {
    for (const e of enemies) {
      if (e.dead || e.dormant) continue;
      if (Math.hypot(e.x - x, e.z - z) < radius) { e.alertX = x; e.alertZ = z; }
    }
    return;
  }
  // the flood: a breadth-first walk of the grid from the noise's cell, out to the reach
  const n = W * H;
  if (sound.dist.length !== n) sound.dist = new Int16Array(n);
  const dist = sound.dist; dist.fill(-1);
  const sx = Math.min(W - 1, Math.max(0, Math.floor(x / CELL))), sz = Math.min(H - 1, Math.max(0, Math.floor(z / CELL)));
  const max = Math.ceil(radius * REACH / CELL);
  const queue = new Int32Array(n);
  let head = 0, tail = 0;
  dist[sz * W + sx] = 0; queue[tail++] = sz * W + sx;
  while (head < tail) {
    const c = queue[head++], d = dist[c];
    if (d >= max) continue;
    const cx = c % W, cz = (c - cx) / W;
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), nz = cz + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const ni = nz * W + nx;
      if (dist[ni] >= 0 || !soundPasses(nx, nz)) continue;
      dist[ni] = d + 1; queue[tail++] = ni;
    }
  }
  sound.grid = world.grid; sound.W = W; sound.H = H; sound.x = x; sound.z = z;
  for (const e of enemies) {
    if (e.dead || e.dormant) continue;
    const gx = Math.floor(e.x / CELL), gz = Math.floor(e.z / CELL);
    if (gx < 0 || gz < 0 || gx >= W || gz >= H) continue;
    if (dist[gz * W + gx] >= 0) { e.alertX = x; e.alertZ = z; }
  }
}

/**
 * Where an enemy alerted by the last noise walks next: the centre of the neighbouring cell one step nearer the noise along the
 * flood, or null when it is not on the flood, is already in the noise's cell, or is chasing some other alert (`ax`,`az`: the
 * enemy's own `alertX`/`alertZ`, which must be the last noise's). The enemy walks straight at the noise then, as it always did.
 */
export function soundStep(ex: number, ez: number, ax: number, az: number): { x: number; z: number } | null {
  if (sound.grid !== world.grid || ax !== sound.x || az !== sound.z) return null;
  const W = sound.W, H = sound.H, gx = Math.floor(ex / CELL), gz = Math.floor(ez / CELL);
  if (gx < 0 || gz < 0 || gx >= W || gz >= H) return null;
  const d = sound.dist[gz * W + gx];
  if (d <= 0) return null;
  for (let k = 0; k < 4; k++) {
    const nx = gx + (k === 0 ? 1 : k === 1 ? -1 : 0), nz = gz + (k === 2 ? 1 : k === 3 ? -1 : 0);
    if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
    if (sound.dist[nz * W + nx] === d - 1) return { x: (nx + .5) * CELL, z: (nz + .5) * CELL };
  }
  return null;
}

export function los(x1: number, z1: number, x2: number, z2: number): boolean {
  const d=Math.hypot(x2-x1,z2-z1),steps=d/.3|0;
  for(let i=1;i<steps;i++){const t=i/steps;
    if(solidAt(x1+(x2-x1)*t,z1+(z2-z1)*t))return false;}
  if(world.wallSegs.length&&segsCrossRay(x1,z1,x2,z2))return false;
  return true;}

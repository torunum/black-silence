import { world } from "../../world/WorldState";
import { solidAt, segsCrossRay } from "../../world/Collision";

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

interface Enemy {
  x: number;
  z: number;
  dead?: boolean;
  dormant?: boolean;
  alertX?: number;
  alertZ?: number;
}

export function alertSound(x: number, z: number, radius: number): void {
  for (const e of world.enemies as unknown as Enemy[]) {
    if (e.dead || e.dormant) continue;
    if (Math.hypot(e.x - x, e.z - z) < radius) { e.alertX = x; e.alertZ = z; }
  }
}

export function los(x1: number, z1: number, x2: number, z2: number): boolean {
  const d=Math.hypot(x2-x1,z2-z1),steps=d/.3|0;
  for(let i=1;i<steps;i++){const t=i/steps;
    if(solidAt(x1+(x2-x1)*t,z1+(z2-z1)*t))return false;}
  if(world.wallSegs.length&&segsCrossRay(x1,z1,x2,z2))return false;
  return true;}

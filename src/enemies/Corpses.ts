import { getScene } from "../render/SceneRef";

/**
 * THE CORPSE BUDGET (`docs/superpowers/plans/2026-10-08-impact.md`, Task 3):
 * a monster that dies and is not gibbed stays where it fell — a sprite and
 * its shadow in the scene — and a long fight on a big level could leave
 * hundreds. The last `CORPSE_MAX` stay; the oldest past that is taken out of
 * the scene (`gone`, which every system already skips) and is a stain on the
 * floor and nothing else. A boss's corpse is not counted. The enemy itself is
 * not touched: it is as dead as it was, and the kill counts stand.
 */

export const CORPSE_MAX = 60;

/** What the budget reads and writes of a body. */
export interface Corpse { gone: boolean; sp: object; blob: object }

let corpses: Corpse[] = [];

export function resetCorpses(): void { corpses = []; }

/** How many are being kept. */
export function corpseCount(): number { return corpses.length; }

/** `e` has just died and lies where it fell. */
export function trackCorpse(e: Corpse): void {
  corpses.push(e);
  while (corpses.length > CORPSE_MAX) {
    const old = corpses.shift()!;
    old.gone = true;
    const scene = getScene() as unknown as { remove(o: object): void };
    scene.remove(old.sp);
    scene.remove(old.blob);
  }
}

import { resetHitFeel } from "./HitFeel";
import { resetMarker } from "./HitMarker";
import { resetPunch } from "./ViewPunch";
import { reseedFx } from "./FxRand";

/**
 * Starts the impact effects (`docs/superpowers/plans/2026-10-08-impact.md`)
 * over: no blow waiting to be felt, no marker, no punch, and the effects'
 * own dice back at their seed, so a level's gore is the same every run.
 * `loadLevel` calls it beside `resetGibs`/`resetDecals`; a restart after a
 * death calls it too, so nothing of the dead run's lands in the new one.
 */
export function resetImpactFx(): void {
  resetHitFeel();
  resetMarker();
  resetPunch();
  reseedFx();
}

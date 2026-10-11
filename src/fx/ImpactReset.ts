import { resetHitFeel } from "./HitFeel";
import { resetMarker } from "./HitMarker";
import { resetPunch } from "./ViewPunch";
import { reseedFx } from "./FxRand";
import { buildGore } from "./GoreFx";
import { resetCorpses } from "../enemies/Corpses";

/**
 * Starts the impact effects (`docs/superpowers/plans/2026-10-08-impact.md`)
 * over: no blow waiting to be felt, no marker, no punch, the effects'
 * own dice back at their seed (so a level's gore is the same every run), no
 * corpse counted, and the level's gore pools built fresh in the new scene.
 * `loadLevel` calls it beside `resetGibs`/`resetDecals`; a restart after a
 * death calls it too, so nothing of the dead run's lands in the new one.
 */
export function resetImpactFx(): void {
  resetHitFeel();
  resetMarker();
  resetPunch();
  reseedFx();
  resetCorpses();
  buildGore();   // the level's blood, chunks and drops: five scene children, however long the fight (src/fx/GoreFx.ts)
}

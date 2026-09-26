import { ctx } from "../audio/AudioEngine";
import { ambientStinger, heartbeat, breath } from "../audio/sounds/world";
import { rnd } from "../utils/math";
import { ambienceState } from "./AmbienceState";
import { S } from "../core/State";

/**
 * `src/world/AmbienceState.ts` (Plan 0D) is the *state* — the ambience/vitals
 * timers (`ambT`, `heartT`, `breathT`). This file is the *logic* that reads
 * and counts them down each frame: the random ambient stinger (`ambience`)
 * and the low-health heartbeat/breathing layer (`vitalsAudio`). The two are
 * deliberately not merged, the same split `ProjectileTick.ts`/`Projectiles.ts`
 * (Task 8) and `WeaponState.ts`/`WeaponRuntime.ts` (Task 6) made.
 *
 * Moved verbatim from `src/legacy.js`'s "AMBIENT AUDIO" section (formerly
 * lines 110-125; `reference/sonsurum.html`'s equivalent section). `ctx()`
 * here is `src/audio/AudioEngine.ts`'s accessor for the live WebAudio
 * context, exactly as it read in `legacy.js` — there is no locator import in
 * this file, so the name has only the one meaning.
 */

export function ambience(dt: number): void {
  if(!ctx())return;ambienceState.ambT-=dt;if(ambienceState.ambT>0)return;
  ambienceState.ambT=rnd(8,18);
  ambientStinger();
}
export function vitalsAudio(dt: number): void {
  if(!ctx()||S.dead)return;
  if(S.hp<35){ambienceState.heartT-=dt;
    if(ambienceState.heartT<=0){ambienceState.heartT=S.hp<15?.55:.85;
      heartbeat();}}
  if(S.hp<50){ambienceState.breathT-=dt;
    if(ambienceState.breathT<=0){ambienceState.breathT=rnd(2.2,3);breath();}}}

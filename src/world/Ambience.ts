import { ctx } from "../audio/AudioEngine";
import { blip, bang } from "../audio/Sfx";
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
  const r=Math.random();
  if(r<.28)blip(rnd(480,720),1.4,"sine",.022,rnd(140,200),true);      // distant scream
  else if(r<.5)for(let i=0;i<3;i++)setTimeout(()=>bang(.08,.05,400),i*rnd(120,260)); // machinery
  else if(r<.72){bang(.3,.03,6000,1800);setTimeout(()=>bang(.15,.025,6000,1800),200);} // static
  else blip(rnd(1200,2200),.08,"sine",.03,undefined,true);            // drip
}
export function vitalsAudio(dt: number): void {
  if(!ctx()||S.dead)return;
  if(S.hp<35){ambienceState.heartT-=dt;
    if(ambienceState.heartT<=0){ambienceState.heartT=S.hp<15?.55:.85;
      blip(52,.1,"sine",.22,40);setTimeout(()=>blip(48,.12,"sine",.18,36),130);}}
  if(S.hp<50){ambienceState.breathT-=dt;
    if(ambienceState.breathT<=0){ambienceState.breathT=rnd(2.2,3);bang(.5,.04,900,300);}}}

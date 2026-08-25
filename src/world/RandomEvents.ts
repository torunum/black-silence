import { ambienceState } from "./AmbienceState";
import { renderState } from "../render/Renderer";
import { world } from "./WorldState";
import { S } from "../core/State";
import { showMsg } from "../ui/HudMessages";
import { say } from "../ui/Subtitles";
import { bellToll } from "../audio/Ambient";
import { blip, bang } from "../audio/Sfx";
import { rnd } from "../utils/math";

/**
 * The three random world events that fire on a rolling timer while a level
 * plays: a blackout (torches off, ambient light dimmed, restored once
 * `ambienceState.darkT` counts down), the bells (level 1 only — a toll,
 * subtitle, and every live enemy goes into a frenzy), and distant whispers.
 *
 * Moved verbatim from `src/legacy.js`'s "RANDOM EVENTS" section (formerly
 * lines 130-148; `reference/sonsurum.html`'s equivalent section). Contains
 * no reference to the piano — `WHITE`/`BLACK`/`KEYMAP` sit immediately after
 * this section in `legacy.js` but belong to Plan 0F's piano, not this task.
 */

/** world.torches elements, cast for the blackout branch's light toggle. */
interface Torch {
  L: { visible: boolean };
}

/** world.enemies elements, cast for the bells branch's frenzy trigger. */
interface Enemy {
  dead?: boolean;
  dormant?: boolean;
  frenzy?: number;
}

export function eventTick(dt: number): void {
  if(ambienceState.darkT>0){ambienceState.darkT-=dt;
    if(ambienceState.darkT<=0){renderState.ambLight.intensity=ambienceState.savedAmb;
      for(const tc of world.torches as unknown as Torch[])tc.L.visible=true;
      showMsg("THE LIGHT RETURNS");}}
  world.eventT-=dt;if(world.eventT>0)return;
  world.eventT=rnd(55,100);
  const r=Math.random();
  if(r<.45){ /* blackout */
    ambienceState.savedAmb=renderState.ambLight.intensity;renderState.ambLight.intensity=.12;
    for(const tc of world.torches as unknown as Torch[])tc.L.visible=false;
    ambienceState.darkT=8;say("event_dark",true);
    blip(50,2,"sine",.1,30,true);bang(.4,.1,300);
  }else if(r<.8&&S.level===1){ /* the bells */
    bellToll();say("event_bell",true);
    for(const e of world.enemies as unknown as Enemy[]){if(!e.dead&&!e.dormant)e.frenzy=7;}
    showMsg("THE BELLS ARE RINGING",3);
  }else{ /* whispers */
    for(let i=0;i<3;i++)setTimeout(()=>blip(rnd(300,500),.7,"sine",.025,rnd(120,200),true),i*600);}}

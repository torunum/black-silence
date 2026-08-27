import { game } from "./Game";
import { time } from "./Time";
import { S } from "./State";
import { screenShake } from "../fx/ShakeState";
import { overlayOpen, keys, input } from "../player/Input";
import { cineTick } from "../enemies/Boss";
import { playerTick } from "../player/Player";
import { weaponTick, WEAPONS, EQUIP_T, UNEQUIP_T } from "../weapons/WeaponState";
import { enemyTick } from "../enemies/ai/Behaviors";
import { projTick } from "../fx/ProjectileTick";
import { ringTick, strikeTick, poisonTick } from "../enemies/ai/Attacks";
import { itemsTick, doorTick, propTick, torchTick } from "../player/Interact";
import { eventTick } from "../world/RandomEvents";
import { ambience, vitalsAudio } from "../world/Ambience";
import { chatterTick } from "../ui/Chatter";
import { tickMessage } from "../ui/HudMessages";
import { partTick } from "../fx/Particles";
import { gibTick } from "../fx/Gibs";
import { poolTick } from "../fx/Decals";
import { headTick } from "../enemies/Death";
import { fxTick } from "../render/Overlay2D";
import { drawKickBoot, drawViewmodel } from "../render/viewmodel/draw";
import { renderState } from "../render/Renderer";
import { weaponRuntime } from "../weapons/WeaponRuntime";
import { player } from "../player/PlayerState";
import { hud } from "../ui/Hud";

/**
 * The frame orchestrator. Moved verbatim from `src/legacy.js`'s `loop`
 * (formerly the tail of its "MAIN LOOP + BOOT" section) — every module it
 * calls was already extracted by an earlier task; this task only moves the
 * one function left that ties them together each frame.
 *
 * Three details survive unchanged from the original, on purpose:
 *
 * - `requestAnimationFrame(loop)` stays the FIRST statement, above the
 *   `!game.started` early return — moving it below would stop the loop dead
 *   on the title screen.
 * - `paused`'s `game.pianoOpen||overlayOpen()&&!game.pianoOpen` is
 *   redundant (`&&` binds tighter, so it reduces to
 *   `pianoOpen||overlayOpen()`) but is left as-is; Phase 0 moves code
 *   verbatim.
 * - The `fxTick` call's 18-field `ViewmodelFrame` literal is the seam
 *   KNOWN-9 documents and `tests/integration/wiring.test.ts` covers; copied
 *   field by field.
 *
 * `time.dt`/`time.scaledDt` are new writes, not reads — nothing consumes
 * them yet. See `Time.ts`.
 */
function loop(t){
  requestAnimationFrame(loop);
  let dt=Math.min(.05,(t-game.last)/1000);game.last=t;
  time.dt=dt;
  if(!game.started){return;}
  if(screenShake.hitStop>0){screenShake.hitStop-=dt;dt*=.08;}
  time.scaledDt=dt;
  const paused=game.pianoOpen||overlayOpen()&&!game.pianoOpen;
  let anyAware=false;
  if(!paused&&!S.dead&&!S.won){
    cineTick(dt);
    playerTick(dt);weaponTick(dt);
    anyAware=enemyTick(dt)||false;
    projTick(dt);ringTick(dt);strikeTick(dt);poisonTick(dt);
    itemsTick(dt);doorTick(dt);propTick(dt);
    eventTick(dt);ambience(dt);vitalsAudio(dt);
    chatterTick(dt,anyAware);
    tickMessage(dt);}
  if(renderState.scene){
    partTick(dt);gibTick(dt);poolTick(dt);headTick(dt);torchTick(dt,t);
    fxTick(dt,t,weaponRuntime.zoomLerp,
      ()=>drawKickBoot(weaponRuntime.kickAnim),
      (fdt,ft)=>drawViewmodel(fdt,ft,{
        started:game.started,dead:S.dead,pianoOpen:game.pianoOpen,zoomLerp:weaponRuntime.zoomLerp,cur:S.cur,vx:player.vx,vz:player.vz,
        sprintKey:!!(keys.ShiftLeft||keys.ShiftRight),bobT:player.bobT,wstate:weaponRuntime.wstate,wtime:weaponRuntime.wtime,
        equipT:EQUIP_T,unequipT:UNEQUIP_T,kickAmt:weaponRuntime.kickAmt,kickRot:weaponRuntime.kickRot,swayX:input.swayX,swayY:input.swayY,muzzle:weaponRuntime.muzzle,
      },WEAPONS));
    hud();
    renderState.renderer.render(renderState.scene,renderState.camera);}}

/** Kicks off the frame loop. Called once, from `main.ts`, at boot. */
export function startLoop(): void { requestAnimationFrame(loop); }

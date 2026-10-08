import { game } from "./Game";
import { time, tickScheduled } from "./Time";
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
import { zoneTick } from "../world/Zones";
import { openingTick, openingHidesWeapon } from "../world/Opening";
import { transitionTick } from "../world/Transition";
import { transitionHidesHands } from "../world/TransitionState";
import { ambience, vitalsAudio } from "../world/Ambience";
import { chatterTick } from "../ui/Chatter";
import { musicTick } from "../audio/Music";
import { tickMessage } from "../ui/HudMessages";
import { partTick } from "../fx/Particles";
import { fireTick } from "../fx/HellFire";
import { lavaTick } from "../fx/Lava";
import { gibTick } from "../fx/Gibs";
import { feelTick } from "../fx/HitFeel";
import { punchTick, withViewPunch } from "../fx/ViewPunch";
import { poolTick } from "../fx/Decals";
import { headTick } from "../enemies/Death";
import { fxTick } from "../render/Overlay2D";
import { drawKickStreaks, drawViewmodel } from "../render/viewmodel/draw";
import { withKickLean, KickShown } from "../render/viewmodel/kick";
import { renderState } from "../render/Renderer";
import { updateListener } from "../audio/Listener";
import { weaponRuntime } from "../weapons/WeaponRuntime";
import { player } from "../player/PlayerState";
import { hud } from "../ui/Hud";
import { animCues } from "./AnimCues";

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
 * - The `fxTick` call's `ViewmodelFrame` literal is the seam KNOWN-9
 *   documents and `tests/integration/wiring.test.ts` covers; copied field
 *   by field. Player feedback round 2, Task 2 added three fields to the
 *   original eighteen (`vy`, `grounded`, `yaw`) for the viewmodel's jump,
 *   landing and strafe motion — read here, never written by the animation.
 *   Task 3 added `kickAnim`: the kicking leg is drawn with the weapon now.
 *   Task 4 added the five `cue*` fields, copied from `./AnimCues.ts`: counters
 *   gameplay bumps (hit, pickup, dry click, input) for the hands to react to.
 *   The branch's review added `paused` (below): 28 fields in all. The prologue
 *   plan's Task 2 added `hidden` (no hands while ADEM climbs out of his
 *   grave, `src/world/Opening.ts`): 29.
 * - `renderer.render` runs inside `withKickLean` (round 2, Task 3): the view
 *   leans into a kick for the render only, and the camera is restored exactly
 *   afterwards, so gameplay, the listener and the trace fixtures never see it.
 * - The leg, the streaks and the lean are all given `kickShown`, not
 *   `weaponRuntime.kickAnim` itself: a kick frozen by death or a win (the
 *   gameplay tick stops, so kickAnim stops counting down), or carried into a
 *   newly loaded level, is not shown (`KickShown` in
 *   src/render/viewmodel/kick.ts). kickAnim is untouched: gameplay reads it.
 * - `paused` is also handed to the viewmodel, so the hands do not fidget
 *   behind an overlay.
 *
 * `time.dt`/`time.scaledDt` are Task 4 writes; Task 5 adds the first read:
 * `tickScheduled(dt)` is called **last** in the `!paused&&!S.dead&&!S.won`
 * block, using `dt` at the point it has already had hit-stop's `*=.08`
 * applied (line `time.scaledDt=dt` above is the same value). Last, not
 * first, deliberately: the four callbacks this replaces used to run as
 * `setTimeout`s the browser drained at a frame boundary, *after* every one
 * of that frame's own tick functions had already run (confirmed against
 * `tests/support/domStubs.ts`'s fake clock, which the trace harness drains
 * the same way — after the frame's rAF callback returns). Calling
 * `tickScheduled` last reproduces that ordering as closely as a single
 * synchronous call can: a callback firing this frame sees this frame's
 * movement, damage and AI already applied, the same as the original. Calling
 * it first would let a scheduled callback (e.g. the power-kick hit test)
 * observe stale enemy/player positions a full frame early instead.
 *
 * `updateListener()` (Plan 1 Task 3) is the one call in the
 * `if(renderState.scene){...}` block with no reference counterpart — the
 * reference never had a positional audio listener to keep in sync. It sits
 * first in the block, alongside the other per-frame camera readers
 * (`partTick`/`gibTick`/`poolTick`/`headTick`/`torchTick`/`fxTick`), and by
 * the block's own gate only ever runs after a level has loaded, which is
 * always after `src/core/Boot.ts`'s `startGame` has already called
 * `audioInit()` — so it is never the first thing to touch a still-unbuilt
 * audio graph.
 *
 * `musicTick(dt,anyAware)` (Plan 1 Task 5) sits right beside
 * `chatterTick(dt,anyAware)` — same `anyAware` value `enemyTick` returned
 * two lines up, same `!paused&&!S.dead&&!S.won` gate, so the adaptive-music
 * state machine (`src/audio/Music.ts`) pauses with the game and stops
 * advancing on death/win with no second mechanism, exactly like `chatterTick`.
 */
const kickShown=new KickShown();

function loop(t: number){
  requestAnimationFrame(loop);
  let dt=Math.min(.05,(t-game.last)/1000);game.last=t;
  time.dt=dt;
  if(!game.started){return;}
  if(screenShake.hitStop>0){screenShake.hitStop-=dt;dt*=.08;}
  time.scaledDt=dt;
  const paused=game.pianoOpen||overlayOpen()&&!game.pianoOpen;
  let anyAware=false;
  if(!S.dead)transitionTick(dt);   // the walk through an exit door runs with the game stopped (S.won), the card with an overlay up
  if(!paused&&!S.dead&&!S.won){
    cineTick(dt);openingTick(dt);
    playerTick(dt);zoneTick(dt);weaponTick(dt);
    anyAware=enemyTick(dt)||false;
    projTick(dt);ringTick(dt);strikeTick(dt);poisonTick(dt);
    itemsTick(dt);doorTick(dt);propTick(dt);
    eventTick(dt);ambience(dt);vitalsAudio(dt);
    chatterTick(dt,anyAware);
    musicTick(dt,anyAware);
    tickMessage(dt);
    tickScheduled(dt);}
  if(renderState.scene){
    updateListener();
    partTick(dt);fireTick(dt);lavaTick(dt);gibTick(dt);poolTick(dt);headTick(dt);torchTick(dt,t);
    feelTick(time.dt);punchTick(dt);   // this frame's blows become one stop, punch, marker and sound (src/fx/HitFeel.ts); the punch ages with the game's clock, so it holds through a freeze
    const kick=kickShown.shown(weaponRuntime.kickAnim,S.dead||S.won,renderState.scene);
    fxTick(dt,t,weaponRuntime.zoomLerp,
      ()=>drawKickStreaks(kick),
      (fdt,ft)=>drawViewmodel(fdt,ft,{
        started:game.started,dead:S.dead,pianoOpen:game.pianoOpen,zoomLerp:weaponRuntime.zoomLerp,cur:S.cur,vx:player.vx,vz:player.vz,vy:player.vy,grounded:player.grounded,yaw:input.yaw,
        sprintKey:!!(keys.ShiftLeft||keys.ShiftRight),bobT:player.bobT,wstate:weaponRuntime.wstate,wtime:weaponRuntime.wtime,
        equipT:EQUIP_T,unequipT:UNEQUIP_T,kickAmt:weaponRuntime.kickAmt,kickRot:weaponRuntime.kickRot,kickAnim:kick,swayX:input.swayX,swayY:input.swayY,muzzle:weaponRuntime.muzzle,
        cueHurt:animCues.hurt,cueHurtAmt:animCues.hurtAmt,cuePickup:animCues.pickup,cueDryFire:animCues.dryFire,cueInput:animCues.input,paused,hidden:openingHidesWeapon()||transitionHidesHands(),
      },WEAPONS));
    hud();
    withKickLean(renderState.camera,kick,()=>withViewPunch(renderState.camera,()=>renderState.renderer.render(renderState.scene,renderState.camera)));}}

/** Kicks off the frame loop. Called once, from `main.ts`, at boot. */
export function startLoop(): void { requestAnimationFrame(loop); }

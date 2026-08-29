import { setInputHooks } from "./player/Input";
import { game } from "./core/Game";
import { weaponRuntime } from "./weapons/WeaponRuntime";
import { renderState } from "./render/Renderer";
import { S } from "./core/State";
import { pianoKeyDown, closePiano } from "./ui/Piano";
import { interact } from "./player/Interact";
import { startReload, requestSwitch, doKick } from "./weapons/WeaponState";
import { startGame } from "./core/Boot";
import { initMenus } from "./ui/Menus";
import { startLoop } from "./core/Loop";
import { loadSave } from "./save/persist";

/**
 * Boot wiring, and nothing else. Moved verbatim from `src/legacy.js`, whose
 * module body — after four prior tasks carved everything else out — held
 * exactly these three things, in this order:
 *
 * 1. `setInputHooks({...})`, the thirteen-entry block `src/player/Input.ts`
 *    needs to reach the gameplay code its listeners call into. Moved
 *    without editing a single entry — Plan 0D broke a neighbouring entry
 *    doing exactly that, and `checkJs:false` meant nothing caught it.
 * 2. `initMenus(startGame)`.
 * 3. Starting the frame loop.
 *
 * Evaluation order matters and is exactly what `legacy.js` relied on:
 * `src/player/Input.ts`'s `addEventListener` calls run at that module's own
 * top level, so by the time this file's body runs (after every static
 * import it and its graph pull in has finished evaluating) those listeners
 * already exist — `setInputHooks` only has to land before the first event
 * is *delivered*, not before the listeners are registered, and it does
 * because both happen synchronously before the event loop ever gets a
 * turn. `setInputHooks` itself must run at this module's top level, not
 * inside a callback, for the same reason. `initMenus(startGame)` likewise
 * runs at top level because its volume-slider IIFE reads `getMasterVolume()`
 * at registration time, painting the slider immediately rather than on
 * first open. `startLoop()` runs last, once both are wired.
 *
 * `loadSave()` (Phase 1) now runs before all three, for the same
 * registration-time reason: `initMenus`'s volume-slider IIFE paints from
 * whatever `save.masterVolume` holds *at that call*, so a load that ran
 * after `initMenus` would paint the hardcoded default and then clobber
 * whatever the player had stored on their first interaction with either
 * slider. Loading first means every reader — `initMenus`'s IIFE, `startLoop`,
 * everything downstream — sees the persisted values, never the defaults,
 * from the moment it first looks.
 */
setInputHooks({
  isPianoOpen:()=>game.pianoOpen, isStarted:()=>game.started, isInputLocked:()=>game.inputLock,
  zoomLerp:()=>weaponRuntime.zoomLerp, canvas:()=>renderState.renderer.domElement,
  currentWeapon:()=>S.cur, ownsWeapon:i=>!!S.weapons[i],
  pianoKeyDown:code=>pianoKeyDown(code), closePiano:()=>closePiano(),
  interact:()=>interact(), startReload:()=>startReload(),
  requestSwitch:i=>requestSwitch(i), doKick:()=>doKick(),
});

loadSave();
initMenus(startGame);
startLoop();

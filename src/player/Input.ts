import { clamp } from "../utils/math";
import { el } from "../ui/dom";

/**
 * Keyboard, mouse look, pointer lock and the mouse wheel — everything the
 * player physically does.
 *
 * Copied verbatim from reference/sonsurum.html lines 1875-1904 (see
 * tests/support/reference.ts's REF.input). Every listener is still
 * registered at **module scope**, on the same target the reference used
 * (`window` for keydown/keyup/wheel/mousedown/mouseup/contextmenu,
 * `document` for mousemove and pointerlockchange, keydown alone passing an
 * explicit `false` third argument). Moving registration into an
 * `initInput()` called from boot would change *when* the listeners attach,
 * which Plan 0C forbids.
 *
 * ## The hooks
 *
 * The handlers call back into gameplay code that still lives in
 * src/legacy.js — interact, startReload, requestSwitch, doKick, the piano —
 * and read state that lives there too (pianoOpen, started, inputLock,
 * zoomLerp, S.cur, S.weapons, renderer.domElement). In the reference those
 * are all hoisted declarations and mutable globals in one script, so they
 * simply exist. Across a module boundary they cannot, so legacy.js hands
 * them over once, at ITS module scope, through setInputHooks.
 *
 * That leaves a window — from this module's evaluation until legacy.js
 * calls setInputHooks — in which a handler would have no hooks. Every
 * handler returns early in that window rather than throwing. Nothing can
 * actually happen there: module evaluation is synchronous, and no DOM event
 * is delivered until the whole graph has finished evaluating and the stack
 * has unwound. The guard exists so that a future reordering fails silently
 * and visibly (no input) rather than with an exception storm inside an
 * event handler.
 *
 * ## The state
 *
 * yaw/pitch/swayX/swayY/firing/zoomOn/locked are written here AND, every
 * frame, by gameplay code in legacy.js (the sway decay, the cinematic
 * camera turn, respawn, the piano). They cannot be bare exported `let`
 * bindings — an ES module's `let` export is read-only to importers — so,
 * like every other piece of state in this codebase (`screenShake`, `game`,
 * `weaponRuntime`, `renderState`, `world`, `player`, `S`, …), they live as
 * properties on one exported object, `input`, and legacy.js reads and
 * writes them directly.
 *
 * `keys` follows the same rule and stays a plain exported const: it is an
 * object that is only ever mutated in place, never reassigned, so its
 * binding crosses the boundary intact and legacy.js's `keys.KeyW` reads
 * work untouched.
 */

/** The live key map: `keys[e.code]` is true while that physical key is held. */
export const keys: Record<string, boolean> = {};

export const input = {
  yaw: Math.PI, pitch: 0, locked: false,
  swayX: 0, swayY: 0, firing: false, zoomOn: false,
};

/** What the input handlers need from the gameplay code that still lives in src/legacy.js. */
export interface InputHooks {
  isPianoOpen(): boolean;
  isStarted(): boolean;
  isInputLocked(): boolean;
  /** The sniper zoom blend, 0..1 — mouse sensitivity scales down with it. */
  zoomLerp(): number;
  /** renderer.domElement, the pointer-lock target. */
  canvas(): HTMLElement;
  /** S.cur — the equipped weapon slot. */
  currentWeapon(): number;
  /** S.weapons[i] — whether the player has picked that slot up. */
  ownsWeapon(i: number): boolean;
  pianoKeyDown(code: string): void;
  closePiano(): void;
  interact(): void;
  startReload(): void;
  requestSwitch(i: number): void;
  doKick(): void;
}

let hooks: InputHooks | null = null;

/** Called once from src/legacy.js's module scope, before any event can be delivered. */
export function setInputHooks(h: InputHooks): void {
  hooks = h;
}

addEventListener("keydown", e => {
  if (!hooks) return;
  if (hooks.isPianoOpen()) { hooks.pianoKeyDown(e.code); if (e.code === "KeyE") hooks.closePiano(); return; }
  keys[e.code] = true;
  if (e.code === "KeyE") hooks.interact();
  if (e.code === "KeyR") hooks.startReload();
  if (e.code === "KeyZ" && hooks.currentWeapon() === 4) input.zoomOn = !input.zoomOn;
  if (/^Digit[1-8]$/.test(e.code)) hooks.requestSwitch(+e.code[5] - 1);
}, false);
addEventListener("keyup", e => keys[e.code] = false);
addEventListener("wheel", e => {
  if (!hooks) return;
  if (!hooks.isStarted() || hooks.isPianoOpen()) return;
  let i = hooks.currentWeapon(); for (let k = 0; k < 8; k++) {
    i = (i + (e.deltaY > 0 ? 1 : 7)) % 8;
    if (hooks.ownsWeapon(i)) { hooks.requestSwitch(i); break; }
  }
});
document.addEventListener("mousemove", e => {
  if (!hooks) return;
  if (!input.locked || hooks.isInputLocked()) return;
  const sens = .0022 * (1 - .68 * hooks.zoomLerp());
  input.yaw -= e.movementX * sens; input.pitch -= e.movementY * sens;
  input.pitch = clamp(input.pitch, -1.45, 1.45);
  input.swayX = clamp(input.swayX + e.movementX * .035, -10, 10);
  input.swayY = clamp(input.swayY + e.movementY * .035, -7, 7);
});
document.addEventListener("pointerlockchange", () => {
  if (!hooks) return;
  input.locked = document.pointerLockElement === hooks.canvas();
});
addEventListener("mousedown", e => {
  if (!hooks) return;
  if (hooks.isPianoOpen()) return;
  if (hooks.isStarted() && !input.locked && !overlayOpen()) hooks.canvas().requestPointerLock();
  if (e.button === 0) input.firing = true;
  if (e.button === 2) hooks.doKick();
});
addEventListener("mouseup", e => { if (e.button === 0) input.firing = false; });
addEventListener("contextmenu", e => e.preventDefault());

/** True while any of the three full-screen overlays — level end, win, death — or the piano is up. */
export function overlayOpen(): boolean {
  return !el("levelend").classList.contains("hidden") ||
    !el("win").classList.contains("hidden") ||
    !el("dead").classList.contains("hidden") || (hooks ? hooks.isPianoOpen() : false);
}

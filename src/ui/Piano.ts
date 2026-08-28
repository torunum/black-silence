import { pianoState } from "./PianoState";
import { pianoNote, organChord } from "../audio/Ambient";
import { say } from "./Subtitles";
import { ach } from "./Toasts";
import { ACHIEVEMENTS } from "../content/achievements";
import { addSprite } from "../render/RenderCore";
import { ITEMTEX } from "../render/ItemTextures";
import { S } from "../core/State";
import { game } from "../core/Game";
import { input } from "../player/Input";
import { world } from "../world/WorldState";
import { renderState } from "../render/Renderer";
import { after } from "../core/Timers";
import { el } from "./dom";
import type * as THREE from "three";

/**
 * `src/ui/PianoState.ts` (Plan 0D) is the *state* — the key-element map and
 * the rolling note history the RECITAL achievement checks. This file is the
 * *behavior*: building the keyboard's DOM, handling a key press (mouse or
 * keyboard), and opening/closing the piano overlay. The two are deliberately
 * not merged, the same split as `src/fx/Projectiles.ts`/`ProjectileTick.ts`
 * and `src/weapons/WeaponState.ts`/`WeaponRuntime.ts`.
 *
 * Moved verbatim from `src/legacy.js`'s "PLAYABLE PIANO" section (formerly
 * lines 101-143; `reference/sonsurum.html`'s equivalent section). `pressKey`
 * clears its key highlight through `src/core/Timers.ts`'s `after(...,140)`
 * as of Plan 0F Task 6 — a UI fade, not gameplay, so it stays wall-clock and
 * is now cancelled on level load along with the game's other raw timers.
 */

/** world.pianoPos's actual shape, set by LevelLoader.ts for the "p" tile. */
interface PianoPos {
  x: number;
  z: number;
}

const WHITE: Array<[number, string]> = [[60, "A"], [62, "S"], [64, "D"], [65, "F"], [67, "G"], [69, "H"], [71, "J"], [72, "K"], [74, "L"], [76, ";"]];
const BLACK: Array<[number, string, number]> = [[61, "W", 0], [63, "E", 1], [66, "T", 3], [68, "Y", 4], [70, "U", 5], [73, "O", 7], [75, "P", 8]];
const KEYMAP: Record<string, number> = {
  KeyA: 60, KeyS: 62, KeyD: 64, KeyF: 65, KeyG: 67, KeyH: 69, KeyJ: 71, KeyK: 72, KeyL: 74, Semicolon: 76,
  KeyW: 61, KeyE: 63, KeyT: 66, KeyY: 68, KeyU: 70, KeyO: 73, KeyP: 75,
};

export function buildPiano(): void {
  const wrap = el("pkeys");
  WHITE.forEach(([midi, label]) => {
    const k = document.createElement("div"); k.className = "wk";
    k.innerHTML = "<span>" + label + "</span>";
    k.addEventListener("mousedown", () => pressKey(midi));
    wrap.appendChild(k); pianoState.keyEls[midi] = k;
  });
  BLACK.forEach(([midi, label, after]) => {
    const k = document.createElement("div"); k.className = "bk";
    k.style.left = (after * 43 + 43 - 13) + "px";
    k.innerHTML = "<span>" + label + "</span>";
    k.addEventListener("mousedown", ev => { ev.stopPropagation(); pressKey(midi); });
    wrap.appendChild(k); pianoState.keyEls[midi] = k;
  });
}
export function pressKey(midi: number): void {
  pianoNote(midi);
  S.pianoNotes++;
  const el = pianoState.keyEls[midi];
  if (el) { el.classList.add("on"); after(() => el.classList.remove("on"), 140); }
  pianoState.noteHist.push(midi); if (pianoState.noteHist.length > 8) pianoState.noteHist.shift();
  if (S.pianoNotes === 12) ach(ACHIEVEMENTS.pianist, S.ach);
  /* E D C D E E E — recital */
  const want = [64, 62, 60, 62, 64, 64, 64];
  if (pianoState.noteHist.length >= 7 && want.every((m, i) => pianoState.noteHist[pianoState.noteHist.length - 7 + i] === m)) {
    pianoState.noteHist = [];
    ach(ACHIEVEMENTS.recital, S.ach);
    say("piano_played", true); organChord();
    if (world.pianoPos) world.items.push({ kind: "crosses", x: (world.pianoPos as unknown as PianoPos).x + 1.4, z: (world.pianoPos as unknown as PianoPos).z,
      sp: addSprite(ITEMTEX.crosses as THREE.CanvasTexture, (world.pianoPos as unknown as PianoPos).x + 1.4, (world.pianoPos as unknown as PianoPos).z, .55, .55, .5), bob: 0 });
  }
}
export function pianoKeyDown(code: string): void { const m = KEYMAP[code]; if (m) pressKey(m); }
export function openPiano(): void {
  game.pianoOpen = true; input.firing = false;
  el("piano").style.display = "flex";
  document.exitPointerLock();
  say("piano", true);
}
export function closePiano(): void {
  game.pianoOpen = false;
  el("piano").style.display = "none";
  renderState.renderer.domElement.requestPointerLock();
}

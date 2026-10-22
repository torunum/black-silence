import { game } from "../core/Game";
import { S } from "../core/State";

/**
 * THE PAUSE (owner, 2026-10-20: "Blood veya Doom gibi"). `Esc` used to let go of the mouse and leave the game running behind
 * it — the README said so — so a player who reached for a drink came back dead. Now losing the mouse in play pauses the game,
 * as Doom's and Blood's menus do: the `#pause` overlay comes up, the loop stops (`src/core/Loop.ts`'s `paused`), and a click
 * takes the mouse back and the game with it (`src/player/Input.ts`'s mousedown asks for the lock; regaining it closes this).
 *
 * Only a lock that was *held* and is then *lost* pauses: the menu, the overlays and the test harness (which never holds the
 * lock) are untouched. The menu button reloads the page, as the death screen's "descend again" does.
 */

let open = false;
let held = false;

/** True while the pause overlay is up. */
export function pauseOpen(): boolean { return open; }

function el(): HTMLElement | null { return document.getElementById("pause"); }

function show(v: boolean): void {
  open = v;
  el()?.classList.toggle("hidden", !v);
}

/** Called on every pointer-lock change with whether the game canvas now holds the lock, and whether another overlay is up. */
export function pointerLockChanged(locked: boolean, otherOverlay: boolean): void {
  if (locked) { held = true; if (open) show(false); return; }
  const wasHeld = held; held = false;
  if (wasHeld && game.started && !S.dead && !S.won && !otherOverlay) show(true);
}

/** Closes the pause without the lock (a level change or a death underneath). */
export function closePause(): void { show(false); }

function wire(): void { document.getElementById("pauseMenu")?.addEventListener("click", () => location.reload()); }
if (document.getElementById("pauseMenu")) wire(); else addEventListener("DOMContentLoaded", wire);

import { lv } from "../Levels";
import { jit, play } from "../Layers";
import { bell, clack, rattle, slide, thud, tick } from "../Material";

/**
 * THE SOUND CATALOGUE — UI. Cues that tell the player something rather than
 * sounding a thing in the world. Player feedback round 2 Task 5
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`): subtle,
 * not chiptune — the old ones were a bare sine sweep, a noise click and a
 * square-wave blip (on the sound board as "old"). Every one of them is in
 * the UI category, the quietest (`../Levels.ts`).
 *
 * - **Menus**: hovering a menu row is a soft felt tick; choosing one is a
 *   low wooden thock with a faint bell above it. (The menus had no sound at
 *   all before; `src/ui/Menus.ts` plays these. On the title screen the audio
 *   does not exist yet — a browser starts it only on the click that starts
 *   the game — so there the first sound is that click's own "select".)
 * - **Achievement**: a small bell, far off in the room.
 * - **Kick ready**: the boot set down, ready.
 * - **The scrap SMG** assembled from the dead: parts snapping together, a
 *   bolt run home.
 */

/** The pointer comes onto a menu row. */
export function uiHover(): void {
  // soft-edged on purpose: a 30 ms click measured 20 dB of crest (peak -11 dBFS for a -31 LK cue) — a felt brush is subtler
  lv("uiHover", () => { play([{ noise: "pink", filters: [{ type: "bandpass", f: 1600, q: 1.5 }], env: { a: 0.006, h: 0.01, d: 0.05 }, level: 0.5 }, { tone: "sine", f: 330, env: { a: 0.004, d: 0.06 }, level: 0.08 }]); });
}
/** A menu row is chosen. */
export function uiSelect(): void {
  lv("uiSelect", () => {
    play([
      { tone: "sine", f: 180, to: 120, over: 0.05, env: { a: 0.002, h: 0.005, d: 0.08 }, drive: 1.2, level: 0.6 },
      tick(0, 1400, 2, 0.03, 0.4, 1.2),
      { at: 0.01, tone: "sine", f: [659.3, 988], env: { a: 0.003, d: 0.45 }, level: 0.07 },
    ]);
  });
}
/** An achievement toast slides in (`src/ui/Toasts.ts`'s `ach`). */
export function achievementChime(): void { lv("achievementChime", () => { play(bell(0, 523.25, 0.5, 0.7)); }); }
/** The power kick's cooldown has run out (`weaponTick`). */
export function kickReady(): void {
  const p = jit(0.04);
  lv("kickReady", () => { play([tick(0, 900 * p, 2, 0.05, 0.45, 1.2), thud(0.005, 140 * p, 0.05, 0.35)]); });
}
/** Eight kills without finding the SMG: it is assembled from the dead (`itemsTick`). */
export function scrapSmgAssembled(): void {
  lv("scrapSmgAssembled", () => {
    play([
      ...clack(0, [2100, 3200], 0.04, 0.35), ...clack(0.06, [1800, 2750], 0.04, 0.3),
      rattle(0.09, 3000, 40, 0.06, 0.15), slide(0.12, 800, 1400, 0.06, 0.25),
      ...clack(0.2, [1500, 2400, 3600], 0.08, 0.55), thud(0.2, 170, 0.07, 0.5),
    ]);
  });
}

import { mountSoundboard, type SoundboardApi } from "./page";

/**
 * Entry point of `soundboard.html` — never imported by the game. Built by
 * `vite.soundboard.config.ts` into `dist/soundboard.html` beside the game.
 */
declare global {
  interface Window {
    soundboard?: SoundboardApi;
  }
}

const root = document.getElementById("board");
if (!root) throw new Error("soundboard.html has no #board element");
window.soundboard = mountSoundboard(root);

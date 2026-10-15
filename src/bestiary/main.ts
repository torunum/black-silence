import { mountBestiary, type BestiaryApi } from "./page";

/**
 * Entry point of `bestiary.html` — never imported by the game. Built by
 * `vite.bestiary.config.ts` into `dist/bestiary.html` beside the game.
 */
declare global {
  interface Window {
    bestiary?: BestiaryApi;
  }
}

const root = document.getElementById("board");
if (!root) throw new Error("bestiary.html has no #board element");
window.bestiary = mountBestiary(root);

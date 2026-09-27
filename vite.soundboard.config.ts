import { defineConfig } from "vite";

/**
 * Builds the sound board (`soundboard.html`, `src/soundboard/`) into `dist/`
 * beside the game, as a second, separate build — player feedback round 2,
 * Task 1. Separate on purpose: a second entry in `vite.config.ts` would let
 * Rollup split the audio code into a chunk shared by both pages, the game's
 * `index.html` would then import that chunk, and
 * `scripts/inline-single-file.mjs` — which inlines only the scripts
 * `dist/index.html` names — would ship a single-file game that fetches a
 * chunk it cannot find. Built alone, the board carries its own copy of the
 * audio code, and the game's bundle never learns the board exists.
 *
 * `emptyOutDir: false` because it runs after the game's build into the same
 * `dist/` (`npm run build`). The dev server needs none of this: Vite serves
 * any HTML file in the project root, so `npm run dev` answers
 * `/soundboard.html` as it is.
 */
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: { soundboard: "soundboard.html" },
    },
  },
});

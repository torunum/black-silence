import { defineConfig } from "vite";

/**
 * Builds the bestiary (`bestiary.html`, `src/bestiary/`) into `dist/` beside
 * the game and the sound board, as a third, separate build — the enemies
 * plan, Task 1. Separate for the sound board's reason
 * (`vite.soundboard.config.ts`): a second entry in `vite.config.ts` would let
 * Rollup split shared code into a chunk the game's `index.html` would then
 * import, and `scripts/inline-single-file.mjs` — which inlines only the
 * scripts `dist/index.html` names — would ship a single-file game that
 * fetches a chunk it cannot find. Built alone, the page carries its own copy
 * of the art it plays, and the game's bundle never learns it exists
 * (`tests/bestiary/bestiary.test.ts` holds that, from the import graph).
 *
 * `emptyOutDir: false` because it runs after the game's build into the same
 * `dist/` (`npm run build`). The dev server needs none of this: Vite serves
 * any HTML file in the project root, so `npm run dev` answers
 * `/bestiary.html` as it is.
 */
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: { bestiary: "bestiary.html" },
    },
  },
});

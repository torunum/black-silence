/**
 * The player's persisted state: the highest chapter unlocked, the master
 * volume, and the render width.
 *
 * **This is now persisted.** `src/save/persist.ts`'s `loadSave`/`flushSave`
 * read and write it to `localStorage` under a versioned schema — see that
 * file for the format and the failure handling. This file only owns the
 * shape and its defaults.
 *
 * `masterVolume` and `renderWidth` default to the values that were
 * hardcoded before this phase — `0.5` in `AudioEngine.ts`, `400` in
 * `RenderCore.ts`'s `sizeRender` — so that a fresh save (or a load that
 * finds nothing in storage) behaves exactly as today until something
 * changes them. Wiring those two fields to the audio and render code is a
 * later task's job; this object only holds them.
 *
 * One property of this object is load-bearing for the test suite and must
 * survive whatever this phase does: it is a plain mutable object rather
 * than an exported `let`, a getter, or a proxy, so a test can assign
 * `save.maxLevel = 1` synchronously, with no boot step, and reach a level
 * other than the prologue. That is what made the combat trace possible
 * (Plan 0E Task 1) and it is why the entire combat path has coverage at
 * all — `loadSave`/`flushSave` must never turn this into anything other
 * than a plain object a caller can read and write directly.
 */
export const save = { maxLevel: 0, masterVolume: 0.5, renderWidth: 400 };

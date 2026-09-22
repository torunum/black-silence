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
 * `shadows` (Phase 2B, shadowed lighting) defaults to `false`. The feature
 * exists and is fully wired — the player's lamp casting is six extra depth
 * passes a frame — but a review of Task 1 measured that cost directly
 * (`renderer.info` after a real frame, `autoReset = false`): **+12 draw
 * calls and +16,608 triangles on level 1, about 6.8x the beauty pass's
 * triangle load, every frame, unconditionally**, against a benefit that the
 * same review's own before/after board measured as a black difference
 * panel at the shipped camera angles. Measured cost beside measured zero
 * benefit is why the default flipped from the phase's original `true`. The
 * toggle stays because the still-frame measurement is a lower bound, not an
 * upper one — a human walking past a pillar may see a swinging shadow a
 * static frame sweep cannot — so one slider turns the feature on for
 * whoever wants to judge that for themselves. See `src/render/Shadows.ts`.
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
export const save = { maxLevel: 0, masterVolume: 0.5, renderWidth: 400, shadows: false };

/**
 * The highest chapter the player has unlocked.
 *
 * **Nothing here is persisted.** The name is aspirational: the frozen
 * reference keeps this in memory only, so a browser reload loses it, and the
 * port reproduces that faithfully. There is no `localStorage` call anywhere
 * in `src/` or in `reference/sonsurum.html` — confirmed by grep, not assumed.
 *
 * An earlier version of this comment said Plan 0F owned adding real
 * persistence. It did not, and that was never Plan 0F's scope:
 * `docs/direction.md`'s roadmap assigns the save system to **Phase 1**,
 * alongside the resolution setting. Phase 0 was a mechanical port and adding
 * persistence would have been a new feature.
 *
 * One property of this object is load-bearing for the test suite and must
 * survive whatever Phase 1 does: it is a plain mutable object rather than an
 * exported `let`, so a test can assign `save.maxLevel = 1` and reach a level
 * other than the prologue. That is what made the combat trace possible
 * (Plan 0E Task 1) and it is why the entire combat path has coverage at all.
 */
export const save = { maxLevel: 0 };

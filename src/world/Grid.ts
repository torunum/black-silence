/**
 * Grid geometry constants — how big a map cell is, and how tall a wall is.
 *
 * Split out of `src/legacy.js`'s `const CELL=2, WALLH=3.4, EYE=1.0;`
 * (originally one declaration, line 44; `reference/sonsurum.html` line
 * 213). `EYE` is untouched and stays in `legacy.js` — it is out of this
 * migration's scope (Plan 0E Tasks 7/9/10 read it) and neither constant
 * here is used by anything that reads `EYE`.
 *
 * This gets its own module rather than living in `src/world/Collision.ts`,
 * even though Collision is `CELL`'s first mover. Both constants have
 * consumers outside collision: `CELL` alone is read by `loadLevel`'s
 * geometry and by `interact()`'s door-cell lookup (Task 5 and Task 8), and
 * `WALLH` is read only by `hitscan`/`crossExplode` (Task 6) and by
 * `loadLevel`, never by any of Collision's seven functions. Homing both in
 * Collision.ts would make Task 6's Hitscan module import a *collision*
 * concern for a *grid-size* constant it otherwise has nothing to do with —
 * this small neutral module is the shared home instead.
 */
export const CELL = 2;
export const WALLH = 3.4;

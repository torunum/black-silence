/**
 * Grid geometry constants — how big a map cell is, how tall a wall is, and
 * the player's eye height above the floor.
 *
 * Split out of `src/legacy.js`'s `const CELL=2, WALLH=3.4, EYE=1.0;`
 * (originally one declaration, line 44; `reference/sonsurum.html` line
 * 213). Task 3 moved `CELL`/`WALLH` here and left `EYE` behind as its own
 * `const` in `legacy.js`, reasoning that only later tasks (7/9/10, the
 * player-movement and enemy-AI code) read it. That reasoning missed a
 * reader: Task 5's `loadLevel` also reads it, on level entry
 * (`player.pyy=EYE+floorHeightAt(player.px,player.pz)`), and `loadLevel`
 * moves to `src/world/LevelLoader.ts` in that same task. A bare `const` in
 * `legacy.js` would have left `LevelLoader.ts` no way to reach it short of
 * importing back from `legacy.js` — a cycle, since `legacy.js` already
 * imports `LevelLoader.ts` for `loadLevel` itself — so `EYE` moves here
 * too. `legacy.js`'s remaining readers (Tasks 7/9/10) now import it from
 * here, the same way they already do for `CELL`/`WALLH`.
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
export const EYE = 1.0;

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

/**
 * How fast an opened door sinks into the floor, units per second of game
 * time (`src/player/Interact.ts`'s `doorTick`), and so how long it takes:
 * from its rest at `WALLH/2` until its centre is within 0.1 of `-WALLH/2`.
 * Written down here (player feedback round 2 Task 5) so the stone door's
 * grind (`src/audio/sounds/doors.ts`) lasts exactly as long as the door
 * moves — this file imports nothing, so the audio can read it without a
 * cycle. `doorTick` keeps its own literal (the task changed no gameplay
 * line); `tests/world/doorGrind.test.ts` runs the real `doorTick` and fails
 * if the two ever disagree.
 */
export const DOOR_SINK_SPEED = 2.6;
export const DOOR_SINK_SECONDS = (WALLH - 0.1) / DOOR_SINK_SPEED;

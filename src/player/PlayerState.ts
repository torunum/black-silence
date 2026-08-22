/**
 * The player's position, velocity and gait.
 *
 * `px`/`pz` are the world position on the floor plane; `pyy` is eye height,
 * not feet — the reference's camera reads it directly. There is no `py`:
 * vertical position is `pyy` and vertical velocity is `vy`, an asymmetry
 * inherited from the reference and left alone.
 *
 * `bobT` and `lastBobSin` drive the walk bob and the footstep trigger;
 * `spawnGuard` is the brief invulnerability on level entry (2.0s, set by
 * loadLevel).
 *
 * `pyy` starts at `0`, not the reference's `EYE` (a module-scope const in
 * legacy.js, out of this migration's scope). `loadLevel` unconditionally
 * sets the real value (`pyy=EYE+floorHeightAt(px,pz)`) before startGame's
 * render loop ever reads it, so a placeholder here costs nothing and avoids
 * a cross-module import for a single initializer.
 */
export const player = {
  px: 3, pz: 3,
  vx: 0, vy: 0, vz: 0,
  pyy: 0,
  grounded: true,
  bobT: 0,
  lastBobSin: 0,
  spawnGuard: 0,
};

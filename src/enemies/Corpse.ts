/**
 * HOW A BODY FALLS (impact plan, Task 3). A monster killed by a blow falls
 * over in `FALL_SECS`; one whose head has just been taken off does not fall
 * at once: it stands, sways on its legs for `STAGGER_SECS`, its sprite
 * stumbling a step along the shot (`stumbleK`: an offset of the sprite alone,
 * so the simulation's body, its pools and its drop stay where the game has
 * always put them), and then goes down. Pure functions of the time
 * since death, read by `enemyTick`'s dead branch for the corpse's tilt and
 * height; no state.
 */

/** Seconds of a decapitated body's stagger before it falls, and how long its fall takes. */
export const STAGGER_SECS = 0.28, FALL_SECS = 0.42;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 0 upright .. 1 down, `deathT` seconds after the death: a plain kill goes down in .45 s (`deathKind` 1), a headless body (`deathKind` 2) staggers first. */
export function fallT(deathKind: number, deathT: number): number {
  return deathKind === 2 ? clamp01((deathT - STAGGER_SECS) / FALL_SECS) : clamp01(deathT / 0.45);
}

/** The sway of a headless body on its feet, radians: a few swings of a tenth of a radian, dying away as it falls. 0 for any other. */
export function swayAt(deathKind: number, deathT: number): number {
  if (deathKind !== 2 || deathT > STAGGER_SECS + FALL_SECS) return 0;
  return Math.sin(deathT * 17) * 0.11 * (1 - fallT(deathKind, deathT));
}

/** How far along its stumble a headless body's sprite is, 0..1, `deathT` seconds after the death: eased out over `STUMBLE_SECS`. */
export const STUMBLE_SECS = 0.55;
/** How far the sprite of a headless body stumbles along the shot, metres. */
export const STUMBLE_DIST = 0.7;
export function stumbleK(deathT: number): number {
  const u = clamp01(deathT / STUMBLE_SECS);
  return 1 - (1 - u) * (1 - u);
}

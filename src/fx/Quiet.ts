/**
 * Makes things without touching the game's dice. three.js gives every
 * object, material, geometry and texture it builds a uuid, and `generateUUID`
 * draws four numbers from `Math.random()` to do it. The impact plan builds
 * things at odd moments — a pool of decals when a level loads, a part's
 * sprite the first time a monster loses a limb — and every one of those
 * would otherwise move every draw the game makes after it: its enemies'
 * rolls at load, its fixtures' seeded stream (the trace harness keeps the
 * uuid draws out of its own stream, but other seeded tests, like
 * `tests/enemies/stuckCheck.test.ts`, do not). `quietly` hands three a
 * private counter for the duration of `make`, so presentation takes
 * nothing from gameplay's stream, in the tests and out of them.
 */
export function quietly<T>(make: () => T): T {
  const real = Math.random;
  let n = 0;
  Math.random = (): number => (n = (n + 0.6180339887498949) % 1);
  try {
    return make();
  } finally {
    Math.random = real;
  }
}

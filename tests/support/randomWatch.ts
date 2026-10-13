/**
 * Counts the draws made from `Math.random()` while a test runs, leaving out
 * three's own: every `THREE.Object3D`, `Texture`, `Material` and geometry
 * made takes a uuid, which is four draws (`generateUUID`), and the fixtures'
 * harness keeps those out of the seeded stream the same way
 * (`tests/integration/gameplayTrace.ts`'s `installUuidStub`). What this counts
 * is what the code under test draws itself.
 */
export function watchRandom(): { draws: () => number; stop: () => void } {
  const real = Math.random;
  let n = 0;
  Math.random = (): number => {
    if (!new Error().stack?.includes("generateUUID")) n++;
    return real();
  };
  return { draws: () => n, stop: () => { Math.random = real; } };
}

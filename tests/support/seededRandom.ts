/**
 * Installs a deterministic Math.random for the duration of a behavioral
 * comparison (see tests/behavior/textures.test.ts and
 * tests/behavior/audio.test.ts).
 *
 * The drawing and synthesis code under test is NOT deterministic:
 * noiseFill alone calls Math.random() hundreds of times per texture, and
 * makeTex's draw callbacks (plus src/utils/math.ts's rnd/pick, which call
 * Math.random() internally) use it throughout. Two runs of the same
 * function produce different call logs unless both sides draw from the
 * same pseudo-random sequence. Seeding the global Math.random covers
 * rnd/pick "for free" — it patches the one shared primitive they're both
 * built on, so no production function needs a seed parameter added to it
 * (that would be a source change, forbidden by this plan).
 *
 * mulberry32 is a small, fast 32-bit PRNG — plenty for making two runs of
 * the same code draw identically; no cryptographic property is needed
 * here, only reproducibility.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Replaces the global Math.random with a deterministic generator seeded by
 * `seed`. Returns a restore function that puts the original Math.random
 * back — always call it, even on a thrown assertion, or the seeded
 * generator leaks into every test that runs afterward.
 */
export function seedRandom(seed: number): () => void {
  const original = Math.random;
  Math.random = mulberry32(seed);
  return () => {
    Math.random = original;
  };
}

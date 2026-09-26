/**
 * SOUND'S OWN DICE — player feedback round 2, Task 1. The one source of
 * chance for sound: pitch jitter, LFO rates, which ambient stinger plays and
 * when the next one comes. Never `Math.random()`, which is the game's own
 * generator — see `./Noise.ts`'s header for why the two must never be the
 * same stream. No imports, on purpose: `AudioEngine.ts` needs this and
 * `Noise.ts` needs `AudioEngine.ts`, so it has to sit below both.
 */

/** mulberry32 — the same small, fast, well-distributed generator `tests/support/seededRandom.ts` seeds the gameplay stream with. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The jitter stream's seed. Arbitrary and fixed ("SND!"), so a sound's variations are the same sequence on every run. */
export const SOUND_SEED = 0x534e4421;

let jitter = mulberry32(SOUND_SEED);

/** Sound's own `Math.random()`: a float in [0,1). Never the gameplay generator. */
export function soundRandom(): number {
  return jitter();
}

/** Sound's own `rnd(a,b)`: a float in [a,b), the same formula as `src/utils/math.ts`'s `rnd`. */
export function soundRnd(a: number, b: number): number {
  return a + soundRandom() * (b - a);
}

/**
 * Restarts the jitter stream. For tests, which need a sound's variations to
 * be a known sequence (and `Noise.ts`'s `resetNoiseOffsets()` alongside it);
 * the game never calls it.
 */
export function reseedSoundRandom(seed: number = SOUND_SEED): void {
  jitter = mulberry32(seed);
}

/**
 * The impact effects' own dice — a small seeded generator (mulberry32) that
 * the hit, kick and gore effects draw from instead of `Math.random()`.
 *
 * Why: the three trace fixtures are recorded under a seeded `Math.random`
 * stream, and the boss trace's phase-3 guard window is 16 frames wide, so
 * a presentation effect that took even one extra draw from the game's stream
 * would move the fight. Sound solved the same problem the same way
 * (`src/audio/SoundRandom.ts`). Everything new in `docs/superpowers/plans/
 * 2026-10-08-impact.md` — spray directions, chunk spins, splat rotations —
 * varies from here, so the existing effects' draws (blood, gibs, decals,
 * which are pinned to the reference) keep their count and order exactly.
 *
 * `reseedFx` starts the sequence over; `loadLevel` calls it, so a level's
 * gore is the same from run to run.
 */
let state = 0x9e3779b9;

export function reseedFx(seed = 0x9e3779b9): void { state = seed >>> 0; }

/** A float in [0, 1). */
export function fxr(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A float in [a, b). */
export function fxRange(a: number, b: number): number { return a + fxr() * (b - a); }

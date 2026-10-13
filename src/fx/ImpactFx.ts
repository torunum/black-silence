import { spawnP } from "./Particles";
import { fxRange } from "./FxRand";

/**
 * THE IMPACT PLAN'S PARTICLE EMITTERS — dust, blood and stone chips, thrown
 * into the one pooled `Points` buffer `Particles.ts` owns (`spawnP` recycles
 * the oldest slot at the cap: nothing here allocates), with every random
 * number from `./FxRand.ts`'s own generator, so a kick or a decapitation
 * never moves the seeded stream the trace fixtures are recorded under.
 *
 * Each takes a place (`x`,`y`,`z`), a count `n` and a strength `pow`, and
 * optionally the direction (`dx`,`dz`, a unit vector on the floor) the spray
 * is thrown along: a body hit from the west bleeds to the east.
 */

/** A puff of dust: grey-tan, drifting up and out (particle kind 3, which rises and never lands). */
export function dustFx(x: number, y: number, z: number, n: number, pow = 1, dx = 0, dz = 0): void {
  for (let i = 0; i < n; i++) {
    spawnP(x + fxRange(-0.12, 0.12), y + fxRange(0, 0.15), z + fxRange(-0.12, 0.12),
      dx * pow * 0.9 + fxRange(-0.55, 0.55) * pow, fxRange(0.15, 0.8) * pow, dz * pow * 0.9 + fxRange(-0.55, 0.55) * pow,
      fxRange(0.44, 0.52), fxRange(0.4, 0.46), fxRange(0.33, 0.4), fxRange(0.5, 1.2), 3);
  }
}

/** Blood drops (particle kind 4): thrown along (`dx`,`dz`) and up, falling, landing as a pool now and then. */
export function bloodFx(x: number, y: number, z: number, n: number, pow = 1, dx = 0, dz = 0): void {
  for (let i = 0; i < n; i++) {
    spawnP(x, y, z,
      dx * pow * 1.3 + fxRange(-1, 1) * pow * 0.6, fxRange(0.4, 1.9) * pow, dz * pow * 1.3 + fxRange(-1, 1) * pow * 0.6,
      fxRange(0.35, 0.62), fxRange(0.02, 0.08), fxRange(0.01, 0.04), fxRange(0.5, 1.3), 4);
  }
}

/** Stone chips (particle kind 2: they bounce): grey, thrown out hard. */
export function chipFx(x: number, y: number, z: number, n: number, pow = 1, dx = 0, dz = 0): void {
  for (let i = 0; i < n; i++) {
    spawnP(x, y, z,
      dx * pow * 1.1 + fxRange(-1.6, 1.6) * pow, fxRange(0.6, 2.6) * pow, dz * pow * 1.1 + fxRange(-1.6, 1.6) * pow,
      fxRange(0.55, 0.7), fxRange(0.53, 0.66), fxRange(0.48, 0.6), fxRange(0.3, 0.7), 2);
  }
}

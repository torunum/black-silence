/** Random float in [a, b). */
export function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

/** Constrain v to [a, b]. */
export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

/** A uniformly random element of a. */
export function pick<T>(a: readonly T[]): T {
  return a[(Math.random() * a.length) | 0];
}

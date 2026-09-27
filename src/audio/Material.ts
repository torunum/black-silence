import type { Layer } from "./Layers";

/**
 * MATERIALS — the small vocabulary the foley and the world are built from
 * (player feedback round 2, Tasks 3 and 5,
 * `docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). Each is a
 * layer, or a few, for `./Layers.ts`'s `play`: what a thing is made of,
 * struck, dragged or shaken. Task 3's weapon mechanisms were built from the
 * first four (they lived in `./sounds/foley.ts` until Task 5 needed them
 * for pickups, doors and debris too; moved, not changed). No sound plays
 * here, and nothing here draws a die: variation comes in through the
 * arguments, from the caller's `jit()`.
 *
 * - `clack` — metal meeting metal: a tick of bright noise and a few
 *   inharmonic partials ringing down (a struck plate's modes).
 * - `thud` — mass arriving: a sine dropping an octave.
 * - `slide` — friction: noise through a narrow band that moves.
 * - `rattle` — loose things shaken: a band of noise chattering.
 * - `tick` — a single hard contact: a filtered noise click, no ring.
 * - `grit` — crunching: noise chopped by a square wave (sand, ash, gravel).
 * - `bell` — a church bell's partials (hum, prime, minor third, fifth,
 *   nominal …), each ringing its own length.
 */

/** Metal on metal at `at` s: a noise tick and partials `f` (Hz) ringing for `d` s. */
export function clack(at: number, f: readonly number[], d: number, level: number): Layer[] {
  return [
    { at, noise: "white", filters: [{ type: "bandpass", f: f[0] * 1.4, q: 1.4 }], env: { a: 0.0003, d: 0.012 }, drive: 2, level: level * 0.9 },
    { at, tone: "sine", f: [...f], env: { a: 0.0004, d }, level },
  ];
}
/** Mass arriving at `at` s: a sine falling from `f` to half, for `d` s. */
export function thud(at: number, f: number, d: number, level: number): Layer {
  return { at, tone: "sine", f, to: f * 0.5, over: d * 0.6, env: { a: 0.001, h: 0.004, d }, drive: 1.4, level };
}
/** Friction from `at` s for `dur` s: a band of noise moving from `from` to `to` Hz. */
export function slide(at: number, from: number, to: number, dur: number, level: number, q = 2): Layer {
  return { at, noise: "pink", filters: [{ type: "bandpass", f: from, q, to, over: dur }], env: { a: dur * 0.3, h: dur * 0.2, d: dur * 0.6 }, level };
}
/** Loose rounds or nails shaken: a band of noise chattering at `rate` Hz. */
export function rattle(at: number, f: number, rate: number, d: number, level: number): Layer {
  return { at, noise: "white", filters: [{ type: "bandpass", f, q: 3 }], env: { a: 0.004, h: d * 0.3, d }, am: { rate, depth: 0.5, type: "square" }, level };
}
/** One hard contact at `at` s: noise through a band at `f` Hz (width `q`), gone in `d` s. */
export function tick(at: number, f: number, q: number, d: number, level: number, drive = 1.6): Layer {
  return { at, noise: "white", filters: [{ type: "bandpass", f, q }], env: { a: 0.0004, h: 0.001, d }, drive, level };
}
/** Crunching from `at` s for about `d` s: a band of noise at `f` Hz chopped `rate` times a second. */
export function grit(at: number, f: number, rate: number, d: number, level: number, q = 0.9): Layer {
  return { at, noise: "white", filters: [{ type: "bandpass", f, q }], env: { a: 0.002, h: d * 0.2, d }, am: { rate, depth: 0.45, type: "square" }, level };
}

/** A church bell's partials: [ratio to the strike note, ring (s), level]. */
export const BELL = [[0.5, 1.8, 0.35], [1, 1.5, 0.5], [1.183, 1.1, 0.3], [1.506, 0.9, 0.2], [2, 0.8, 0.22], [2.514, 0.55, 0.1], [3.011, 0.4, 0.07]] as const;

/** A bell struck at `at` s on `f0` Hz: its partials at `level`, each ringing `ring` times its own length. */
export function bell(at: number, f0: number, level: number, ring = 1): Layer[] {
  return BELL.map(([ratio, d, l]): Layer => ({ at, tone: "sine", f: f0 * ratio, env: { a: 0.002, d: d * ring }, level: l * level }));
}

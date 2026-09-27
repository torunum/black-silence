import { jit, type Glue, type Layer } from "./Layers";
import { tick } from "./Material";
import { soundRandom } from "./SoundRandom";

/**
 * AN EXPLOSION'S DESIGN — player feedback round 2 Task 5. What the three
 * explosions in `./sounds/explosions.ts` play (see that file for the
 * why): the crack, the body, the sub, the debris and the long tail, at a
 * power. Kept out of the catalogue file so the design can be read by tests
 * without the catalogue exporting a function that is not a sound.
 */

/** How hard each explosion is saturated as a whole. */
export const BLAST_GLUE: Glue = { pre: 0.6, drive: 1.8 };

/** An explosion of `power` — exported so tests can read a design without playing it. */
export function explosionDesign(power: number): Layer[] {
  const s = Math.max(0.5, Math.min(1.5, Number.isFinite(power) ? power : 1));
  const p = jit(0.04);
  const stones: Layer[] = [];
  const n = Math.round(6 * s);
  for (let i = 0; i < n; i++) {
    const at = 0.15 + (i * 0.9 * s) / n + soundRandom() * 0.08;
    stones.push(tick(at, 1800 + soundRandom() * 2400, 2.5, 0.02 + soundRandom() * 0.02, 0.3 * (1 - (0.65 * i) / n), 1.8));
  }
  return [
    // the crack
    { noise: "white", filters: [{ type: "highpass", f: 1200 }], env: { a: 0.0005, h: 0.003, d: 0.04 }, drive: 4, level: 0.7 },
    // the body
    { noise: "white", filters: [{ type: "lowpass", f: 4200 * p, to: 260, over: 0.45 * s, q: 0.6 }], env: { a: 0.002, h: 0.06 * s, d: 0.8 * s }, drive: 2.6, level: 1 },
    // the sub
    { tone: "sine", f: 72 * p, to: 26, over: 0.5 * s, fm: { ratio: 1.41, index: 1.2, to: 0 }, env: { a: 0.004, h: 0.08, d: 1.0 * s }, drive: 2, level: 1 },
    // the debris: gravel rolling, stones landing
    { at: 0.06, noise: "white", filters: [{ type: "bandpass", f: 1700, q: 0.9, to: 900, over: 0.8 }], env: { a: 0.03, h: 0.1, d: 0.7 * s }, am: { rate: 19, depth: 0.45, type: "square", to: 11, over: 0.9 }, level: 0.35 },
    ...stones,
    // the tail: a long low roll
    { at: 0.04, noise: "brown", filters: [{ type: "lowpass", f: 520, to: 90, over: 2.2 * s }], env: { a: 0.12, h: 0.25, d: 2.2 * s }, am: { rate: 3.1, depth: 0.35, to: 1.6, over: 2.5 }, drive: 1.3, level: 0.8 },
  ];
}

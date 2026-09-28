import { lv } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { thud, tick, grit } from "../Material";

/**
 * THE SOUND CATALOGUE — THE GRAVE. The prologue's opening
 * (`src/world/Opening.ts`, the prologue plan's Task 2,
 * `docs/superpowers/plans/2026-09-27-player-feedback-2-prologue.md`): ADEM
 * wakes in his coffin six feet down, in the dark, and claws his way out.
 *
 * Everything before the lid splits is heard **from inside a box under a
 * ton of earth**, so it is muffled — every layer of the breath, the
 * heartbeat and the earth goes through a low lowpass, and nothing in them
 * has a hard edge. The lid is the first sharp sound of the game, on
 * purpose: the moment the outside gets in.
 *
 * - `graveBreath` — one ragged breath in the box: an inhale and a longer
 *   exhale, breath noise through the throat's formants, close and dull.
 * - `graveHeartbeat` — lub-dub, felt more than heard: two low thumps.
 * - `earthShifts` — the weight above settling and giving: a deep grinding
 *   rumble, soil trickling, a pebble or two knocking on the wood.
 * - `lidCracks` — the coffin lid splitting under his hands: a wood crack
 *   with a creak before it, splinters, and the earth above coming in.
 * - `dirtFalls` — soil pouring off him as he rises: a crunching pour and
 *   clods landing.
 *
 * Nothing here draws from `Math.random()` (`jit` is sound's own
 * generator, `../SoundRandom.ts`), and each plays at its own entry in
 * `../Levels.ts`, like every other catalogue sound. Also on the sound
 * board (`src/soundboard/registry.ts`, "World").
 */

/** One breath in the coffin, `p` scaling its pitch. Exported so tests can read it without playing it. */
export function graveBreathDesign(p = 1): Layer[] {
  const muffle = { type: "lowpass" as const, f: 900 * p, q: 0.6 };
  return [
    // the inhale: sharp, through the teeth
    { noise: "pink", filters: [muffle, { type: "bandpass", f: 1400 * p, q: 1.1, to: 1800 * p, over: 0.45 }], env: { a: 0.28, h: 0.06, d: 0.16 }, am: { rate: 17, depth: 0.18 }, level: 0.8 },
    // the exhale: longer, lower, shaking
    { at: 0.62, noise: "pink", filters: [muffle, { type: "bandpass", f: 700 * p, q: 0.9, to: 420 * p, over: 0.8 }], env: { a: 0.08, h: 0.2, d: 0.62 }, am: { rate: 7.5, depth: 0.3 }, level: 0.9 },
    // the chest behind it
    { at: 0.62, tone: "sine", f: 95 * p, to: 70 * p, over: 0.8, filters: [{ type: "lowpass", f: 220 }], env: { a: 0.1, h: 0.15, d: 0.5 }, level: 0.18 },
  ];
}

/** One heartbeat, lub then dub, muffled. Exported for tests. */
export function graveHeartbeatDesign(p = 1): Layer[] {
  return [
    { tone: "sine", f: 58 * p, to: 38, over: 0.09, filters: [{ type: "lowpass", f: 160 }], env: { a: 0.006, h: 0.02, d: 0.16 }, drive: 1.5, level: 1 },
    { noise: "brown", filters: [{ type: "lowpass", f: 140 }], env: { a: 0.004, h: 0.01, d: 0.08 }, level: 0.5 },
    { at: 0.17, tone: "sine", f: 52 * p, to: 34, over: 0.1, filters: [{ type: "lowpass", f: 150 }], env: { a: 0.006, h: 0.02, d: 0.2 }, drive: 1.4, level: 0.8 },
  ];
}

/** The earth above shifting and giving. Exported for tests. */
export function earthShiftsDesign(p = 1): Layer[] {
  return [
    // the weight of it: a deep grinding rumble
    { noise: "brown", filters: [{ type: "lowpass", f: 180 * p, q: 0.9 }], env: { a: 0.25, h: 0.5, d: 0.7 }, am: { rate: 6.5, depth: 0.35, to: 3, over: 1.4 }, drive: 1.5, level: 1 },
    { tone: "sine", f: 38 * p, to: 30, over: 1.4, env: { a: 0.3, h: 0.4, d: 0.7 }, level: 0.45 },
    // soil trickling through the joints of the lid
    { ...grit(0.2, 1100 * p, 31, 0.9, 0.12), filters: [{ type: "lowpass", f: 1500 }, { type: "bandpass", f: 900 * p, q: 0.8 }] },
    // pebbles knocking on the wood
    { ...tick(0.45, 520 * p, 3, 0.05, 0.3), filters: [{ type: "bandpass", f: 520 * p, q: 3 }, { type: "lowpass", f: 1200 }] },
    { ...tick(0.83, 430 * p, 3, 0.06, 0.25), filters: [{ type: "bandpass", f: 430 * p, q: 3 }, { type: "lowpass", f: 1200 }] },
  ];
}

/** The coffin lid splitting: a creak, the crack, splinters, the earth coming in. Exported for tests. */
export function lidCracksDesign(p = 1): Layer[] {
  return [
    // the creak as the board bows
    { tone: "sawtooth", f: 140 * p, to: 95 * p, over: 0.22, filters: [{ type: "bandpass", f: 700 * p, q: 5 }], env: { a: 0.08, h: 0.08, d: 0.08 }, am: { rate: 38, depth: 0.45 }, level: 0.35 },
    // the crack: wood letting go
    { at: 0.24, noise: "white", filters: [{ type: "bandpass", f: 1800 * p, q: 0.9 }], env: { a: 0.0005, h: 0.004, d: 0.06 }, drive: 3.2, level: 1 },
    { at: 0.24, noise: "white", filters: [{ type: "bandpass", f: 520 * p, q: 1.3 }], env: { a: 0.001, h: 0.01, d: 0.16 }, drive: 2, level: 0.8 },
    thud(0.24, 120 * p, 0.2, 0.7),
    // splinters
    tick(0.3, 3200 * p, 4, 0.02, 0.3),
    tick(0.36, 2600 * p, 4, 0.025, 0.25),
    tick(0.45, 3800 * p, 4, 0.02, 0.2),
    // and the earth coming in through the split
    grit(0.3, 1400 * p, 27, 0.7, 0.3),
    { at: 0.3, noise: "brown", filters: [{ type: "lowpass", f: 300 }], env: { a: 0.05, h: 0.2, d: 0.5 }, level: 0.5 },
  ];
}

/** Soil pouring off him as he rises. Exported for tests. */
export function dirtFallsDesign(p = 1): Layer[] {
  return [
    { ...grit(0, 1300 * p, 24, 1.1, 0.5), filters: [{ type: "bandpass", f: 1300 * p, q: 0.7 }, { type: "lowpass", f: 3000 }] },
    { noise: "pink", filters: [{ type: "lowpass", f: 600 * p }], env: { a: 0.05, h: 0.35, d: 0.7 }, am: { rate: 11, depth: 0.3 }, level: 0.5 },
    thud(0.12, 90 * p, 0.12, 0.45),
    thud(0.41, 80 * p, 0.12, 0.35),
    thud(0.77, 100 * p, 0.1, 0.25),
  ];
}

/** Waking in the coffin: one breath (`Opening.ts`). */
export function graveBreath(): void { const p = jit(0.04); lv("graveBreath", () => { play(graveBreathDesign(p)); }); }
/** Waking in the coffin: one heartbeat (`Opening.ts`). */
export function graveHeartbeat(): void { const p = jit(0.03); lv("graveHeartbeat", () => { play(graveHeartbeatDesign(p)); }); }
/** The earth above the coffin shifting (`Opening.ts`). */
export function earthShifts(): void { const p = jit(0.05); lv("earthShifts", () => { play(earthShiftsDesign(p)); }); }
/** The coffin lid splitting (`Opening.ts`). */
export function lidCracks(): void { const p = jit(0.04); lv("lidCracks", () => { play(lidCracksDesign(p)); }); }
/** Soil falling off him as he climbs out (`Opening.ts`). */
export function dirtFalls(): void { const p = jit(0.06); lv("dirtFalls", () => { play(dirtFallsDesign(p)); }); }

import { lv } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { grit, thud, tick } from "../Material";

/**
 * THE SOUND CATALOGUE — GORE. `docs/superpowers/plans/2026-10-08-impact.md`,
 * Task 3. `limbTorn`, `decapitation`, `gibBurst` and `headBounce` (in
 * `./monsters.ts`, pinned to the reference) keep playing; these four are
 * played with them:
 *
 * - **boneSnap** — the crack of a bone going, a low thud and a wet tick:
 *   at a limb torn off and at a neck.
 * - **spurtPulse** — one pulse of a stump: a wet hiss of spray over a
 *   gurgle, played once for each beat of the heart that is left.
 * - **partLands** — a severed arm or a pair of legs coming down: a slap
 *   and a thud.
 * - **gibMeat** — a body bursting: a sub-bass boom, a long wet roar of
 *   noise, and chunks of meat landing after it, one by one.
 *
 * Nobody here has heard them; the owner is the judge, on the sound board.
 * Each draws only from sound's own generator (`jit`).
 */

export function boneSnapDesign(p = 1, q = 1): Layer[] {
  return [
    tick(0, 2400 * q, 2.2, 0.014, 1, 3),
    tick(0.006, 3700 * p, 3, 0.01, 0.55, 2),
    { tone: "sine", f: 165 * p, to: 68, over: 0.08, env: { a: 0.001, h: 0.006, d: 0.12 }, drive: 2, level: 0.5 },
    { at: 0.01, noise: "pink", filters: [{ type: "lowpass", f: 900 * q }], env: { a: 0.004, h: 0.01, d: 0.1 }, level: 0.3 },
  ];
}
export function spurtPulseDesign(p = 1, q = 1): Layer[] {
  return [
    { noise: "white", filters: [{ type: "bandpass", f: 2100 * q, q: 1.1, to: 850 * q, over: 0.2 }], env: { a: 0.012, h: 0.05, d: 0.18 }, am: { rate: 24, depth: 0.4 }, drive: 1.6, level: 0.7 },
    { at: 0.01, tone: "sine", f: [150 * p, 232 * p], to: 85, over: 0.14, env: { a: 0.01, h: 0.03, d: 0.16 }, am: { rate: 14, depth: 0.35 }, level: 0.25 },
  ];
}
export function partLandsDesign(p = 1): Layer[] {
  return [
    { noise: "white", filters: [{ type: "lowpass", f: 1500 * p, q: 0.9, to: 300, over: 0.06 }], env: { a: 0.001, h: 0.006, d: 0.1 }, drive: 2, level: 0.9 },
    thud(0, 112 * p, 0.11, 0.55),
    grit(0.012, 800 * p, 40, 0.08, 0.2),
  ];
}
export function gibMeatDesign(p = 1, q = 1): Layer[] {
  return [
    { tone: "sine", f: 82 * p, to: 34, over: 0.2, env: { a: 0.002, h: 0.03, d: 0.4 }, drive: 2.6, level: 1 },
    { noise: "white", filters: [{ type: "lowpass", f: 2300 * q, q: 0.8, to: 200, over: 0.26 }], env: { a: 0.002, h: 0.04, d: 0.34 }, drive: 2.2, level: 0.9 },
    tick(0.004, 1400 * q, 1.2, 0.04, 0.8, 3),
    { at: 0.05, noise: "pink", filters: [{ type: "bandpass", f: 520 * p, q: 1.3 }], env: { a: 0.01, h: 0.05, d: 0.3 }, am: { rate: 18, depth: 0.4 }, level: 0.5 },
    thud(0.13, 92 * p, 0.15, 0.5),
    tick(0.16, 900 * p, 1.5, 0.03, 0.5, 2),
    thud(0.23, 70 * p, 0.14, 0.38),
    grit(0.26, 1100 * q, 36, 0.2, 0.25),
  ];
}

/** A bone going. */
export function boneSnap(): void { const p = jit(0.06), q = jit(0.08); lv("boneSnap", () => { play(boneSnapDesign(p, q)); }); }
/** One beat of a stump. */
export function spurtPulse(): void { const p = jit(0.08), q = jit(0.1); lv("spurtPulse", () => { play(spurtPulseDesign(p, q)); }); }
/** A part comes down. */
export function partLands(): void { const p = jit(0.08); lv("partLands", () => { play(partLandsDesign(p)); }); }
/** A body bursts. */
export function gibMeat(): void { const p = jit(0.06), q = jit(0.08); lv("gibMeat", () => { play(gibMeatDesign(p, q)); }); }

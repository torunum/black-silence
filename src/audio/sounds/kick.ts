import { lv } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { grit, thud, tick } from "../Material";

/**
 * THE SOUND CATALOGUE: THE KICK CONNECTS. `docs/superpowers/plans/
 * 2026-10-08-impact.md`, Task 2. `kickSwing` (the leg going out) and
 * `kickImpact` (the sole on a body or a wall, `./impacts.ts`) are as round 2
 * made them; these four are layered with them on the frame the hit resolves,
 * so the kick has weight under its snap:
 *
 * - **kickSlamFlesh** — the boot driving into a body: a sub-bass whump a
 *   third of a second long, the crack of the blow, a wet slap, a bone
 *   tick. Plays *with* `kickImpact("flesh")`.
 * - **kickSlamStone** — the boot into a wall or a crate: the whump, a harder
 *   crack, grit, and dust falling after. Plays with `kickImpact("stone")`.
 * - **kickWhiff** — a kick that finds nothing: the swish of the leg going
 *   all the way through, and the body's weight pitching after it.
 * - **kickLands** — a kicked monster coming down: a thud, a slap, a skid of
 *   grit.
 *
 * Nobody has heard these; the owner is the judge, on the sound board.
 */

/** The whump, the crack and the wet slap of a boot in a body (exported so a test can read the design). */
export function kickSlamFleshDesign(p = 1, q = 1): Layer[] {
  return [
    { tone: "sine", f: 74 * p, to: 33, over: 0.13, env: { a: 0.002, h: 0.03, d: 0.34 }, drive: 2.6, level: 0.95 },
    { noise: "white", filters: [{ type: "lowpass", f: 2600 * q, q: 0.8, to: 420, over: 0.1 }], env: { a: 0.001, h: 0.012, d: 0.13 }, drive: 2.4, level: 0.8 },
    tick(0, 1500 * q, 1.2, 0.03, 0.9, 3),
    { at: 0.012, noise: "pink", filters: [{ type: "bandpass", f: 420 * p, q: 1.4 }], env: { a: 0.004, h: 0.02, d: 0.2 }, am: { rate: 26, depth: 0.35 }, level: 0.5 },
    tick(0.022, 3100 * p, 2.5, 0.012, 0.4, 2),
  ];
}
/** The whump, a harder crack, grit, and dust coming down. */
export function kickSlamStoneDesign(p = 1, q = 1): Layer[] {
  return [
    { tone: "sine", f: 62 * p, to: 30, over: 0.12, env: { a: 0.002, h: 0.02, d: 0.3 }, drive: 2.2, level: 0.85 },
    tick(0, 900 * q, 1.2, 0.05, 1, 3.2),
    grit(0.004, 2400 * p, 80, 0.11, 0.3),
    { at: 0.03, noise: "pink", filters: [{ type: "lowpass", f: 520 }], env: { a: 0.03, h: 0.04, d: 0.34 }, level: 0.3 },
  ];
}
/** A leg through air, and the body pitching after it. */
export function kickWhiffDesign(p = 1): Layer[] {
  return [
    { noise: "pink", filters: [{ type: "bandpass", f: 2300 * p, q: 1.1, to: 480 * p, over: 0.16 }], env: { a: 0.02, h: 0.02, d: 0.17 }, level: 0.7 },
    { at: 0.03, tone: "sine", f: 92 * p, to: 52, over: 0.1, env: { a: 0.01, h: 0.01, d: 0.14 }, level: 0.34 },
  ];
}
/** A kicked monster landing: a thud, a slap, a skid. */
export function kickLandsDesign(p = 1): Layer[] {
  return [
    thud(0, 82 * p, 0.2, 0.85),
    tick(0, 1100 * p, 1.4, 0.03, 0.7, 2.4),
    grit(0.01, 900 * p, 48, 0.16, 0.3),
  ];
}

export function kickSlamFlesh(): void { const p = jit(0.06), q = jit(0.08); lv("kickSlamFlesh", () => { play(kickSlamFleshDesign(p, q)); }); }
export function kickSlamStone(): void { const p = jit(0.06), q = jit(0.08); lv("kickSlamStone", () => { play(kickSlamStoneDesign(p, q)); }); }
export function kickWhiff(): void { const p = jit(0.05); lv("kickWhiff", () => { play(kickWhiffDesign(p)); }); }
export function kickLands(): void { const p = jit(0.06); lv("kickLands", () => { play(kickLandsDesign(p)); }); }

import { lv } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { clack, grit, thud, tick } from "../Material";

/**
 * THE SOUND CATALOGUE — HIT CONFIRMATION. `docs/superpowers/plans/
 * 2026-10-08-impact.md`, Task 1. A short, crisp sound played at the
 * crosshair (not at the monster: it is the player's feedback, not the
 * world's) the moment a blow lands, layered over the report and the wet
 * thwack `bulletHitsFlesh` already makes at the blood. Four kinds, each
 * readable by ear alone:
 *
 * - **flesh** — a dry tick and a low knock: it hit something soft.
 * - **head** — a bright, short ring on top of the tick: the skull.
 * - **armour** — a metal clink, no thump: it did not get through.
 * - **kill** — the knock goes down an octave, a bone cracks and gravel
 *   follows: it is dead.
 *
 * Every sound is a few tens of milliseconds long and draws only from
 * sound's own generator (`jit`). Nobody here has heard them; the owner is
 * the judge, on the sound board (`soundboard.html`, group Weapons).
 */

/** A hit in flesh: its design, exported so a test can read it without playing it. */
export function hitFleshDesign(p = 1, q = 1): Layer[] {
  return [
    tick(0, 3300 * q, 1.5, 0.016, 0.85, 2.4),
    thud(0.002, 190 * p, 0.06, 0.5),
    { at: 0.004, noise: "pink", filters: [{ type: "bandpass", f: 950 * p, q: 1.3 }], env: { a: 0.002, h: 0.004, d: 0.05 }, level: 0.3 },
  ];
}
/** A hit in the head: the flesh tick with a short bright ring over it. */
export function hitHeadDesign(p = 1, q = 1): Layer[] {
  return [
    tick(0, 4200 * q, 1.4, 0.014, 0.8, 2.4),
    { tone: "sine", f: [2350 * p, 3520 * p], env: { a: 0.0006, d: 0.11 }, level: 0.3 },
    thud(0.002, 230 * p, 0.05, 0.42),
  ];
}
/** A hit on armour: a metal clink with no thump under it. */
export function hitArmourDesign(p = 1): Layer[] {
  return [...clack(0, [1850 * p, 2960 * p, 4410 * p], 0.16, 0.5), tick(0, 3600, 2, 0.01, 0.4, 2)];
}
/** A kill: the knock an octave down, a bone cracking, gravel falling after. */
export function hitKillDesign(p = 1, q = 1): Layer[] {
  return [
    { tone: "sine", f: 118 * p, to: 44, over: 0.09, env: { a: 0.001, h: 0.012, d: 0.24 }, drive: 2.4, level: 0.9 },
    { noise: "white", filters: [{ type: "lowpass", f: 1700 * q, q: 0.9, to: 320, over: 0.09 }], env: { a: 0.001, h: 0.01, d: 0.11 }, drive: 2.2, level: 0.8 },
    tick(0.012, 2300 * q, 1.8, 0.02, 0.8, 2.6),
    tick(0.03, 3600 * p, 3, 0.012, 0.3, 1.4),
    grit(0.05, 1500 * p, 55, 0.12, 0.22),
  ];
}

/** The player hit flesh (`feelTick`). */
export function hitFlesh(): void { const p = jit(0.07), q = jit(0.1); lv("hitFlesh", () => { play(hitFleshDesign(p, q)); }); }
/** The player hit a head without killing. */
export function hitHead(): void { const p = jit(0.06), q = jit(0.08); lv("hitHead", () => { play(hitHeadDesign(p, q)); }); }
/** The player hit armour. */
export function hitArmour(): void { const p = jit(0.05); lv("hitArmour", () => { play(hitArmourDesign(p)); }); }
/** The player killed something. */
export function hitKill(): void { const p = jit(0.06), q = jit(0.08); lv("hitKill", () => { play(hitKillDesign(p, q)); }); }

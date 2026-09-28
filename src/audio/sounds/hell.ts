import { lv } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { soundRandom } from "../SoundRandom";
import { tick } from "../Material";

/**
 * THE SOUND CATALOGUE — ROOM TONES. What the prologue's zones sound like
 * standing still (the prologue plan's Task 3): hell's cavern — a low roar of
 * fire that never stops, distant screams, the crackle of the pit — and the
 * churchyard's wind. `src/world/ZoneBed.ts` plays them, per zone, in place of
 * the level's random ambient stingers.
 *
 * A room tone here is a **swell**, not a loop: `hellRoar` is 5.6 seconds
 * of rumble that rises and falls, and the bed starts the next one every 3.6
 * seconds, so they overlap into one unbroken roar that breathes. That keeps
 * each sound a catalogue call with a length and a level like every other
 * (`../Levels.ts`), measured on the sound board, and leaves nothing running
 * to be stopped when the player walks out: the last swell dies away by
 * itself, as a room tone should behind a door.
 *
 * Sound's own generator only (`jit`, `soundRandom`) — never `Math.random`.
 */

/** One swell of the cavern's roar, `p` scaling its pitch. Exported for tests. */
export function hellRoarDesign(p = 1): Layer[] {
  return [
    // the fire's breath: brown noise, low, rolling
    { noise: "brown", filters: [{ type: "lowpass", f: 220 * p, q: .7 }], env: { a: 2.0, h: 1.4, d: 2.2 }, am: { rate: .35 * p, depth: .3 }, drive: 1.3, level: 1 },
    // its throat: a band of rush above it
    { noise: "pink", filters: [{ type: "bandpass", f: 480 * p, q: .8 }], env: { a: 2.2, h: 1.0, d: 2.2 }, am: { rate: .6, depth: .35 }, level: .25 },
    // the ground under it
    { tone: "sine", f: 36 * p, to: 33 * p, over: 5, env: { a: 2.0, h: 1.2, d: 2.2 }, level: .35 },
  ];
}

/** Someone screaming far off in the cavern: two or three voices, gliding down, in a lot of room. Exported for tests. */
export function hellScreamDesign(p = 1, voices = 2): Layer[] {
  const out: Layer[] = [];
  for (let v = 0; v < voices; v++) {
    const f = (520 + v * 170) * p, at = v * .35;
    out.push({ at, tone: "sawtooth", f, to: f * .55, over: 1.6, vibrato: { rate: 6 + v, cents: 40 },
      formants: [{ f: 800 * p, q: 6, gain: 1 }, { f: 1150 * p, q: 7, gain: .7 }, { f: 2600 * p, q: 8, gain: .3 }],
      filters: [{ type: "lowpass", f: 1800 }], env: { a: .25, h: .5, d: 1.1 }, level: .5 });
  }
  return out;
}

/** The pit crackling: a scatter of pops and snaps over a hiss. Exported for tests. */
export function fireCrackleDesign(p = 1, pops: readonly number[] = [0, .07, .19, .26, .41]): Layer[] {
  return [
    { noise: "pink", filters: [{ type: "bandpass", f: 2600 * p, q: .6 }], env: { a: .05, h: .3, d: .25 }, am: { rate: 23, depth: .45, type: "square" }, level: .25 },
    ...pops.map((t, i): Layer => tick(t, (1400 + (i % 3) * 900) * p, 2.5, .02 + (i % 2) * .015, .7 - i * .08, 2.2)),
  ];
}

/** Wind over the churchyard: a slow gust through the stones and the dead tree. Exported for tests. */
export function churchyardWindDesign(p = 1): Layer[] {
  return [
    { noise: "pink", filters: [{ type: "bandpass", f: 520 * p, q: 1.2, to: 900 * p, over: 2.2 }], env: { a: 1.8, h: .6, d: 2.0 }, am: { rate: .7, depth: .3 }, level: .8 },
    // the whistle in the railings and the branches
    { noise: "white", filters: [{ type: "bandpass", f: 1500 * p, q: 9, to: 1900 * p, over: 2.5 }], env: { a: 1.9, h: .4, d: 1.8 }, level: .12 },
  ];
}

/** Hell's room tone: one swell of the roar (`ZoneBed.ts`, every 3.6 s in hell). */
export function hellRoar(): void { const p = jit(.04); lv("hellRoar", () => { play(hellRoarDesign(p)); }); }
/** Hell: a distant scream (`ZoneBed.ts`). */
export function hellScream(): void {
  const p = jit(.12), voices = soundRandom() < .5 ? 2 : 3;
  lv("hellScream", () => { play(hellScreamDesign(p, voices)); });
}
/** Hell: the pit crackling (`ZoneBed.ts`). */
export function fireCrackle(): void {
  const p = jit(.1), pops = [0, .05 + soundRandom() * .1, .15 + soundRandom() * .15, .3 + soundRandom() * .15];
  lv("fireCrackle", () => { play(fireCrackleDesign(p, pops)); });
}
/** The churchyard's room tone: a gust of wind (`ZoneBed.ts`). */
export function churchyardWind(): void { const p = jit(.15); lv("churchyardWind", () => { play(churchyardWindDesign(p)); }); }

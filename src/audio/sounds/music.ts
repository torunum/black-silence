import { lv } from "../Levels";
import { play, type Layer } from "../Layers";
import { bell } from "../Material";

/**
 * THE SOUND CATALOGUE — MUSIC: the boss pulse, the organ, the church bells.
 * Player feedback round 2 Task 5's ambience check
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`): were the
 * music and the ambience part of "the sounds are very bad"? Partly:
 *
 * - The **drone bed** (`../AudioEngine.ts`'s `audioInit`: a 33 Hz saw, sines
 *   at 49.5 and 66 Hz, a 24.7 Hz triangle, each breathing on its own slow
 *   LFO, all through a 170 Hz lowpass) is a sub-bass hum. Nothing of a raw
 *   saw survives a 170 Hz corner; it is left as it is.
 * - The **organ chord** was four square waves (65-156 Hz) through a
 *   lowpass that opened to 420-500 Hz: a buzzing chiptune chord, the most
 *   "sound chip" thing in the game. Now it is an organ: each note two
 *   detuned saws and a sine an octave up (a principal and an octave stop),
 *   through a lowpass, with a slow tremulant, the wind in the pipes, a slow
 *   swell and release, and a large share of the room.
 * - The **church bells** were three bare sines. Now they are bells: the
 *   same partials as the cross launcher's (hum, prime, tierce, quint,
 *   nominal …), rung as a peal — the big bell first, the others after it.
 * - The **boss pulse** was a noise thump every 300 ms, a noise tock every
 *   second beat and a 49 Hz saw every fourth, dry and at no level (its
 *   beats fired from a `setInterval` no scope reached). Its timing is the
 *   same — `../Ambient.ts`'s `startBossMusic` still owns the 300 ms
 *   interval and its guard, and `../Music.ts`'s layer machine, its 4 s
 *   dwell and its 2.5 s fade are untouched — but each beat is now a drum: a
 *   kick with a falling pitch and a beater's click, a low tom-like knock on
 *   the off-beat, and on every fourth a bass note of three detuned saws
 *   through a lowpass, with a sine under them — in a level of its own, and
 *   sending to the room.
 */

/** One beat of the boss pulse, `beat` counting from 0 (`startBossMusic`, every 300 ms). Exported for tests. */
export function bossBeatDesign(beat: number): Layer[] {
  const b = Number.isFinite(beat) ? Math.abs(Math.floor(beat)) : 0;
  const layers: Layer[] = [
    // the kick
    { tone: "sine", f: 130, to: 45, over: 0.07, env: { a: 0.001, h: 0.01, d: 0.22 }, drive: 1.8, level: 0.9 },
    { noise: "white", filters: [{ type: "bandpass", f: 3000, q: 1.2 }], env: { a: 0.0005, d: 0.006 }, level: 0.2 },
    { noise: "white", filters: [{ type: "lowpass", f: 180 }], env: { a: 0.001, h: 0.01, d: 0.1 }, level: 0.4 },
  ];
  if (b % 2 === 1) {
    // the off-beat: a low knock
    layers.push(
      { noise: "white", filters: [{ type: "bandpass", f: 520, q: 1.4 }], env: { a: 0.001, h: 0.004, d: 0.05 }, drive: 1.4, level: 0.35 },
      { tone: "sine", f: 190, to: 150, over: 0.04, env: { a: 0.001, d: 0.06 }, level: 0.25 },
    );
  }
  if (b % 4 === 3) {
    // the bass note, every fourth beat
    layers.push(
      { tone: "sawtooth", f: [49, 49.35, 48.6], to: 46, over: 0.25, filters: [{ type: "lowpass", f: 260, q: 1.2 }], env: { a: 0.01, h: 0.08, d: 0.3 }, level: 0.55 },
      { tone: "sine", f: 49, to: 46, over: 0.25, env: { a: 0.01, h: 0.08, d: 0.3 }, level: 0.5 },
    );
  }
  return layers;
}

/** One beat of the boss pulse. */
export function bossBeat(beat: number): void { lv("bossPulse", () => { play(bossBeatDesign(beat)); }); }

/** The organ's chord: C minor across two octaves, as the old one. */
const ORGAN = [65.4, 98, 130.8, 155.6];

/** The organ chord: the priest's phase changes (`Boss.ts`), and the piano recital's end (`Piano.ts`). Four seconds, as before. */
export function organSting(): void {
  lv("organSting", () => {
    play([
      ...ORGAN.flatMap((f): Layer[] => [
        { tone: "sawtooth", f: [f, f * 1.0035], filters: [{ type: "lowpass", f: 1100, q: 0.7 }], vibrato: { rate: 5.5, cents: 6 }, env: { a: 0.25, h: 2.2, d: 1.5 }, level: 0.3 },
        { tone: "sine", f: f * 2, vibrato: { rate: 5.5, cents: 6 }, env: { a: 0.3, h: 2.1, d: 1.5 }, level: 0.12 },
      ]),
      // the wind in the pipes
      { noise: "pink", filters: [{ type: "bandpass", f: 1800, q: 0.8 }], env: { a: 0.3, h: 2.2, d: 1.4 }, level: 0.03 },
    ]);
  });
}

/** The random-event church bells (`eventTick`): a peal — the big bell, then two smaller ones. */
export function churchBells(): void {
  lv("churchBells", () => {
    play([...bell(0, 98, 0.9, 1.6), ...bell(0.55, 147, 0.7, 1.4), ...bell(1.1, 196, 0.6, 1.2)]);
  });
}

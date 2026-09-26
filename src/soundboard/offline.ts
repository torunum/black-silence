import { audioInit } from "../audio/AudioEngine";

/**
 * Renders one sound to samples through an `OfflineAudioContext` and
 * measures it — the "nobody here can hear, but everything here can measure"
 * half of player feedback round 2's method. The owner never needs this; it
 * is for whoever changes a sound next, from the browser's console on the
 * sound board: `await soundboard.render("weapon-fire-1")`.
 *
 * It runs the game's real engine on the offline context (`audioInit`'s
 * `context` option), with the drone bed off so only the sound is measured.
 * Parts of a sound that the game schedules with a timer (the casing clink,
 * the heartbeat's second beat, a boss roar's second growl, the wet door's
 * gurgle, the whispers and machinery) fire after rendering has finished and
 * are not in the render; the first part is.
 */
export interface Rendered {
  samples: Float32Array;
  sampleRate: number;
  /** Largest absolute sample, and in dBFS. */
  peak: number;
  peakDb: number;
  /** RMS over the stretch that is within 60 dB of the peak, in dBFS. */
  rmsDb: number;
  /** Seconds until the sound last rises above -60 dB relative to its peak. */
  seconds: number;
  /** Samples at or beyond full scale. */
  clipped: number;
  /** Mean sample value — a DC offset makes a click at the start and end. */
  dc: number;
}

const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -Infinity);

export async function renderOffline(play: () => void, seconds = 2, sampleRate = 44100): Promise<Rendered> {
  const off = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate);
  audioInit({ context: off, drones: false });
  play();
  const buf = await off.startRendering();
  const samples = buf.getChannelData(0);
  let peak = 0, sum = 0, clipped = 0;
  for (const s of samples) {
    const a = Math.abs(s);
    if (a > peak) peak = a;
    if (a >= 1) clipped++;
    sum += s;
  }
  const floor = peak * 0.001;
  let last = 0, sq = 0, n = 0;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > floor) { last = i; }
  }
  for (let i = 0; i <= last; i++) { sq += samples[i] * samples[i]; n++; }
  return {
    samples, sampleRate, peak, peakDb: db(peak), rmsDb: db(Math.sqrt(sq / Math.max(1, n))),
    seconds: (last + 1) / sampleRate, clipped, dc: sum / samples.length,
  };
}

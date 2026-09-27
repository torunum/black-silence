import { audioInit, currentRoom, getMasterVolume, setRoom } from "../audio/AudioEngine";
import { newMix, type MixFactory } from "../audio/Mix";
import type { RoomName } from "../audio/Room";
import { reseedSoundRandom } from "../audio/SoundRandom";
import { resetNoiseOffsets } from "../audio/Noise";

/**
 * Renders a sound to samples through an `OfflineAudioContext` and measures
 * it — the "nobody here can hear, but everything here can measure" half of
 * player feedback round 2's method. The owner never needs this; it is for
 * whoever changes a sound next, from the browser's console on the sound
 * board: `await soundboard.render("weapon-fire-1")`, and for
 * `scripts/sound-levels.mjs`, which measures every sound this way.
 *
 * It runs the game's real engine on the offline context (`audioInit`'s
 * `context` option), with the drone bed off so only the sound is measured,
 * through whichever mix is asked for (the game's, or the board's "Old mix"),
 * in whichever room, at whichever master volume.
 *
 * **Timers render too** (player feedback round 2 Task 2; in Task 1 they
 * did not). A sound's delayed parts — the casing clink, the heartbeat's
 * second beat, a boss roar's second growl, the wet door's gurgle, the
 * whispers, the boss pulse — are scheduled with `setTimeout`/`setInterval`
 * (`src/core/Timers.ts`'s `after` looks `setTimeout` up at call time). While
 * a render runs those globals are replaced by ones that suspend the offline
 * context at the callback's time (rounded up to the next 128-frame render
 * quantum, 2.7 ms at 48 kHz), run it, and resume — so the delayed part lands
 * in the render at the time it would have played. The real timers are back
 * the moment the render ends.
 *
 * Every render reseeds sound's own dice and noise offsets first, so the same
 * sound renders to the same samples every time.
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
  /** Wall-clock milliseconds the render took. */
  renderMs: number;
}

export interface RenderOptions {
  /** Seconds to render. Default 2. */
  seconds?: number;
  /** Default 48000 — the rate the K-weighting in `./measure.ts` is specified at. */
  sampleRate?: number;
  /** Default the game's (`newMix`). */
  mix?: MixFactory;
  /** Default the room the board is set to (the engine's current one). */
  room?: RoomName;
  /** Master volume for this render only, 0-1. Default the game's current volume. Never saved. */
  volume?: number;
  /** Start the drone bed too. Default false. */
  drones?: boolean;
}

export const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -Infinity);

type TimerGlobals = Pick<typeof globalThis, "setTimeout" | "clearTimeout" | "setInterval" | "clearInterval">;

/** Replaces the four timer globals with ones that fire inside `off`'s render; returns the restorer, and `at` to run something at a render time. */
function offlineTimers(off: OfflineAudioContext): { restore: () => void; at: (seconds: number, fn: () => void) => void } {
  const g = globalThis as unknown as Record<keyof TimerGlobals, unknown>;
  const saved = { setTimeout: g.setTimeout, clearTimeout: g.clearTimeout, setInterval: g.setInterval, clearInterval: g.clearInterval };
  const Q = 128;
  const end = off.length;
  const due = new Map<number, Array<() => void>>();
  const cancelled = new Set<number>();
  let nextId = 1;
  const nowFrame = (): number => Math.round(off.currentTime * off.sampleRate);
  function at(seconds: number, fn: () => void): void {
    let frame = Math.ceil((seconds * off.sampleRate) / Q) * Q;
    frame = Math.max(frame, nowFrame() + Q, Q);
    if (frame >= end) return;
    let list = due.get(frame);
    if (!list) {
      due.set(frame, (list = []));
      const run = list;
      void off.suspend(frame / off.sampleRate).then(() => {
        for (let i = 0; i < run.length; i++) run[i]();
        due.delete(frame);
        void off.resume();
      });
    }
    list.push(fn);
  }
  g.setTimeout = (fn: () => void, ms = 0): number => {
    const id = nextId++;
    at(off.currentTime + ms / 1000, () => { if (!cancelled.has(id)) fn(); });
    return id;
  };
  g.setInterval = (fn: () => void, ms = 0): number => {
    const id = nextId++;
    const tick = (t: number): void => at(t, () => { if (cancelled.has(id)) return; fn(); tick(t + ms / 1000); });
    tick(off.currentTime + ms / 1000);
    return id;
  };
  g.clearTimeout = g.clearInterval = (id: number): void => { cancelled.add(id); };
  return { restore: () => Object.assign(g, saved), at };
}

/**
 * Seconds of silence rendered before the sound starts, then cut off the
 * result. Chrome's `DynamicsCompressorNode` does not start transparent: a
 * sound at the very first frame of a render comes out 11-14 dB down even at
 * ratio 1 (measured on the shotgun: -6.8 dBFS through no compressor, -20.8
 * through a ratio-1 one when played at t=0, -6.8 through both when played
 * 1 s in). In the game the chain has been running since `audioInit`, so the
 * render gives it the same head start. 0.5 s is past the artifact.
 */
export const LEAD_SECONDS = 0.5;

export async function renderOffline(play: () => void, opts: RenderOptions = {}): Promise<Rendered> {
  const sampleRate = opts.sampleRate ?? 48000;
  const lead = Math.round(LEAD_SECONDS * sampleRate / 128) * 128;
  const off = new OfflineAudioContext(1, lead + Math.ceil((opts.seconds ?? 2) * sampleRate), sampleRate);
  const base = opts.mix ?? newMix;
  const volume = opts.volume ?? getMasterVolume();
  const roomBefore = currentRoom().wanted;
  if (opts.room) setRoom(opts.room);
  reseedSoundRandom();
  resetNoiseOffsets();
  const { restore, at } = offlineTimers(off);
  const t0 = performance.now();
  let buf: AudioBuffer;
  try {
    audioInit({ context: off, drones: opts.drones ?? false, mix: (ac, _v, room) => base(ac, volume, room) });
    at(lead / sampleRate, play);
    buf = await off.startRendering();
  } finally {
    restore();
    setRoom(roomBefore);
  }
  const renderMs = performance.now() - t0;
  const samples = buf.getChannelData(0).slice(lead);
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
    seconds: (last + 1) / sampleRate, clipped, dc: sum / samples.length, renderMs,
  };
}

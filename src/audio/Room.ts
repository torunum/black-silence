import { mulberry32 } from "./SoundRandom";

/**
 * THE ROOMS — player feedback round 2, Task 2
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). Every
 * level is a space, and every sound now rings in it: a convolution reverb
 * (`./Mix.ts`) whose impulse response is built here, procedurally, from
 * seeded noise — no sample files (the asset policy) and no `Math.random()`
 * (KNOWN-22: sound never touches the game's dice).
 *
 * ## How an impulse response is made
 *
 * Two channels, each its own seeded white noise, so the tail is wide
 * (decorrelated left and right) rather than a mono smear. Per channel:
 *
 * 1. **Pre-delay** — silence for `predelay` seconds: the time the first
 *    reflection takes to come back. Short in a close room, long in a big one.
 * 2. **The diffuse tail** — the noise under an exponential envelope that
 *    falls 60 dB in `rt60` seconds, after an `attack` ramp (a real tail
 *    builds up over the first few tens of milliseconds as reflections
 *    multiply, it does not start at full density).
 * 3. **Damping** — the tail runs through a 12 dB/octave lowpass whose corner
 *    slides from `bright[0]` Hz down to `bright[1]` Hz over `rt60`: stone,
 *    air and flesh swallow high frequencies faster than low ones, so a real
 *    tail darkens as it dies. A static corner is what makes cheap reverb
 *    sound like hiss. A one-pole highpass at `lowCut` keeps the tail from
 *    booming: the first spectrograms (the shotgun in the stone hall) showed
 *    its 36-120 Hz thump ringing on for a second and a half under the tail,
 *    which is mud, not space — so the tail starts at 120-220 Hz, and the
 *    thump stays in the dry sound. Hell keeps more of its low end (70 Hz).
 * 4. **Early reflections** — a handful of discrete taps: the nearest walls.
 *    `early.count` taps between `early.from` and `early.to` ms, each a
 *    three-sample smear (a gentle lowpass: stone does not reflect a perfect
 *    click), random sign, gains falling from `early.gain`. `regular` spaces
 *    them evenly — a flutter echo, the sound of a tunnel. The left and right
 *    channels get slightly different tap times, the way two ears would.
 * 5. **Normalised** to unit energy (sum of squares = 1) per channel, with a
 *    40 ms fade at the very end so the IR itself cannot click. Unit energy
 *    means a room's loudness is set by `wet` (the return gain) alone, not by
 *    how long its tail happens to be — the rooms are comparable.
 *
 * Built once per room per audio context, lazily (`./Mix.ts` caches them), at
 * the context's own sample rate.
 *
 * ## Which room a level gets
 *
 * `roomFor(levelDef)` — from the flags and the `sub` theme every level
 * already carries (`src/world/levels/index.ts`); `loadLevel` calls it.
 */

export type RoomName = "hall" | "hell" | "flesh" | "graveyard" | "sewer" | "factory";

export interface RoomSpec {
  /** Shown on the sound board. */
  label: string;
  /** Length of the impulse response, seconds. Kept short: a convolver's cost grows with it. */
  seconds: number;
  /** Seconds for the tail to fall 60 dB. */
  rt60: number;
  /** Seconds of silence before anything comes back. */
  predelay: number;
  /** Seconds over which the diffuse tail builds up to full density. */
  attack: number;
  /** Damping lowpass corner, Hz: at the start of the tail, and by `rt60`. */
  bright: readonly [number, number];
  /** One-pole highpass corner, Hz. */
  lowCut: number;
  /** Early reflections: `count` taps between `from` and `to` ms, the first at amplitude `gain` (of the unit-energy tail), each later one quieter. */
  early: { count: number; from: number; to: number; gain: number; regular?: boolean };
  /** Return level of the reverb into the mix. */
  wet: number;
}

export const ROOMS: Readonly<Record<RoomName, RoomSpec>> = {
  // Dungeon, church, necropolis: vaulted stone. A clear pre-delay, bright
  // early reflections off near walls, a two-second tail that darkens.
  hall: {
    label: "Stone hall (dungeon, church, necropolis)",
    seconds: 2.4, rt60: 2.0, predelay: 0.018, attack: 0.02,
    bright: [6500, 1300], lowCut: 180,
    early: { count: 8, from: 9, to: 75, gain: 0.32 },
    wet: 0.42,
  },
  // The pit: larger and darker than any hall. Late, sparse reflections off
  // walls far away, a three-second tail with almost no top end, the low end
  // left in.
  hell: {
    label: "Hell (the prologue)",
    seconds: 3.0, rt60: 2.9, predelay: 0.05, attack: 0.06,
    bright: [2600, 320], lowCut: 70,
    early: { count: 5, from: 55, to: 170, gain: 0.26 },
    wet: 0.5,
  },
  // The womb: wet and close. The walls are right there (dense taps in the
  // first 20 ms), soft (a low damping corner from the first moment), and
  // short — flesh absorbs, it does not ring.
  flesh: {
    label: "Flesh (the womb)",
    seconds: 1.1, rt60: 0.8, predelay: 0.003, attack: 0.006,
    bright: [2200, 450], lowCut: 120,
    early: { count: 12, from: 1.5, to: 20, gain: 0.3 },
    wet: 0.46,
  },
  // Open night air among the tombs: little tail, low in level, and a few
  // distant slaps off mausoleum walls.
  graveyard: {
    label: "Graveyard (open air)",
    seconds: 1.6, rt60: 1.3, predelay: 0.035, attack: 0.03,
    bright: [5000, 1400], lowCut: 200,
    early: { count: 4, from: 70, to: 230, gain: 0.3 },
    wet: 0.26,
  },
  // A brick tunnel: a flutter echo (evenly spaced taps between the two
  // walls), mid-heavy, a long wet tail.
  sewer: {
    label: "Sewer (tunnel)",
    seconds: 2.4, rt60: 2.2, predelay: 0.008, attack: 0.015,
    bright: [4200, 700], lowCut: 220,
    early: { count: 10, from: 22, to: 230, gain: 0.3, regular: true },
    wet: 0.42,
  },
  // A factory floor: hard, bright metal and brick, a medium tail that keeps
  // its top end longer than stone does.
  factory: {
    label: "Factory (metal hall)",
    seconds: 2.0, rt60: 1.7, predelay: 0.012, attack: 0.012,
    bright: [9000, 2400], lowCut: 180,
    early: { count: 10, from: 5, to: 55, gain: 0.3 },
    wet: 0.38,
  },
};

export const ROOM_NAMES = Object.keys(ROOMS) as RoomName[];

/** What a level definition tells us about its space — the three flags and the `sub` theme `src/world/levels/index.ts` gives every level. */
export interface LevelTheme {
  hell?: boolean;
  flesh?: boolean;
  dungeon?: boolean;
  sub?: string;
}

/** The room a level sounds in. Hell and flesh by their flags; the rest by theme; stone hall for anything unrecognised. */
export function roomFor(level: LevelTheme): RoomName {
  if (level.hell) return "hell";
  if (level.flesh) return "flesh";
  if (level.sub === "graveyard") return "graveyard";
  if (level.sub === "sewers") return "sewer";
  if (level.sub === "factory") return "factory";
  return "hall";
}

/** Each room's noise has its own seed, and each channel its own: a room's IR never depends on which room was built first. */
function seedFor(room: RoomName, channel: number): number {
  let h = 0x524f4f4d; // "ROOM"
  for (const ch of room) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return (h ^ (channel * 0x9e3779b9)) >>> 0;
}

/** Fills one channel of an impulse response. Pure: the same room, channel and sample rate always give the same samples. */
export function fillImpulse(d: Float32Array, sampleRate: number, spec: RoomSpec, seed: number): void {
  const next = mulberry32(seed);
  const sr = sampleRate;
  const decay = Math.log(1000) / spec.rt60; // 60 dB at rt60
  const hpA = Math.exp((-2 * Math.PI * spec.lowCut) / sr);
  const [b0, b1] = spec.bright;
  let lp1 = 0, lp2 = 0, hpY = 0, hpX = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / sr - spec.predelay;
    let x = 0;
    if (t >= 0) {
      const env = Math.exp(-decay * t) * Math.min(1, t / spec.attack);
      x = (next() * 2 - 1) * env;
    }
    const fc = b0 * Math.pow(b1 / b0, Math.min(1, Math.max(0, t) / spec.rt60));
    const a = Math.exp((-2 * Math.PI * fc) / sr);
    lp1 = (1 - a) * x + a * lp1;
    lp2 = (1 - a) * lp1 + a * lp2;
    hpY = hpA * (hpY + lp2 - hpX);
    hpX = lp2;
    d[i] = hpY;
  }
  normalise(d);
  // Early reflections, on the unit-energy tail.
  const { count, from, to, gain, regular } = spec.early;
  for (let k = 0; k < count; k++) {
    const frac = count === 1 ? 0 : k / (count - 1);
    const jitter = regular ? 0 : (next() - 0.5) * (to - from) / count;
    const ms = from + frac * (to - from) + jitter + (next() - 0.5) * 0.6; // ±0.3 ms between the ears
    const idx = Math.round((spec.predelay * 1000 + ms) * sr / 1000);
    const g = gain * Math.pow(0.82, k) * (next() < 0.5 ? -1 : 1) / Math.sqrt(1.5);
    if (idx > 0 && idx + 1 < d.length) {
      d[idx - 1] += g * 0.5;
      d[idx] += g;
      d[idx + 1] += g * 0.5;
    }
  }
  // A 40 ms fade at the end, so truncating the tail cannot click.
  const fade = Math.min(d.length, Math.round(0.04 * sr));
  for (let i = 0; i < fade; i++) d[d.length - 1 - i] *= i / fade;
  normalise(d);
}

function normalise(d: Float32Array): void {
  let e = 0;
  for (let i = 0; i < d.length; i++) e += d[i] * d[i];
  if (e > 0) {
    const s = 1 / Math.sqrt(e);
    for (let i = 0; i < d.length; i++) d[i] *= s;
  }
}

/** The room's impulse response on `ac`: two channels, `spec.seconds` long at the context's own sample rate. */
export function buildImpulse(ac: BaseAudioContext, room: RoomName): AudioBuffer {
  const spec = ROOMS[room];
  const buf = ac.createBuffer(2, Math.max(1, Math.ceil(spec.seconds * ac.sampleRate)), ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) fillImpulse(buf.getChannelData(ch), ac.sampleRate, spec, seedFor(room, ch));
  return buf;
}

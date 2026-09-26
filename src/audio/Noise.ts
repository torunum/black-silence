import { ctx } from "./AudioEngine";
import { mulberry32 } from "./SoundRandom";

/**
 * SOUND'S OWN DICE, AND ITS OWN NOISE — player feedback round 2, Task 1
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 *
 * ## Why this file exists
 *
 * Until this task every noise sound (`bang`, `boom`, `gunshot`, and through
 * the old `noiseBuf` every growl, gurgle, pain cry and door) built a fresh
 * `AudioBuffer` each time it played and filled it with `Math.random()`, and
 * a dozen sounds drew their pitch jitter from `Math.random()` too. That is
 * the same generator the game rolls its dice with — enemy dodges, flank
 * signs, drops, the priest's teleports — and the one the trace harness
 * seeds to make a recorded run repeatable. So every sound that played moved
 * every gameplay roll after it, and any change to how the game *sounds*
 * could change how a fight *played*: a kick cooldown letting a click fire
 * once more moved a trace fixture in player feedback round 1, and this
 * plan's Tasks 2-5 rebuild every sound in the game. (It was filed as
 * `docs/known-issues.md` KNOWN-22, which this file closes.)
 *
 * ## What it does instead
 *
 * - **`soundRandom()`** (`./SoundRandom.ts`) — the one source of chance for
 *   sound: pitch jitter, LFO rates, which ambient stinger plays, when the
 *   next one comes. A small local generator (mulberry32) with a fixed seed.
 *   Nothing in `src/audio/` calls `Math.random()`, and
 *   `tests/audio/soundSources.test.ts` fails the build if anything does.
 * - **`noise(colour)`** — a few seconds of noise per colour, generated once
 *   per audio context from its own fixed seed and shared by every sound.
 *   Built lazily, the first time a sound asks for that colour, so a colour
 *   nobody uses costs nothing.
 * - **`noiseOffset(dur)`** — where in that buffer this play starts. A sound
 *   used to be different every time because its buffer was freshly random;
 *   it is now different every time because it reads a different stretch of
 *   the same buffer. Successive offsets step by the golden ratio (a Weyl
 *   sequence), which spreads them as evenly as a sequence can, so two
 *   bangs in a row never read the same few milliseconds. A counter, not a
 *   generator, and not `soundRandom()`: where a noise burst starts is a
 *   mechanism, and drawing it from the jitter stream would make every
 *   noise play shift which pitch the next growl gets.
 * - **`fadeCurve(power)`** — the envelope that used to be baked into each
 *   fresh buffer's samples (`bang`'s `(1-t)^2`, `boom`'s `(1-t)^1.6`), now
 *   applied as a gain curve over the shared noise. Same shape, on an
 *   `AudioParam` rather than in the samples.
 *
 * ## The colours
 *
 * `white` is what every sound in the game used before this task and uses
 * after it. `pink` (equal energy per octave, Paul Kellett's refined filter)
 * and `brown` (integrated white, a steep low rumble) exist for Tasks 2-5 —
 * a reverb impulse, wind, fire, a stone door's grind — and are built only
 * if something asks for them. All three are normalised to a peak of 1.
 */

/** Seconds of noise per colour. Longer than any single noise sound in the game (the wet door is 1.1 s). */
export const NOISE_SECONDS = 4;

export type NoiseColour = "white" | "pink" | "brown";

/** The noise bank's seed. Separate from `soundRandom()`'s: building the bank must not move the jitter stream. */
const NOISE_SEED = 0x4e4f4953;

let offsetStep = 0;

/** Restarts the offset sequence. For tests, alongside `reseedSoundRandom()`; the game never calls it. */
export function resetNoiseOffsets(): void {
  offsetStep = 0;
}

/** 1/φ — the golden-ratio step that makes successive offsets land as far from each other as possible. */
const GOLDEN = 0.6180339887498949;

/**
 * Where in the noise buffer a play of `dur` seconds starts, in seconds —
 * always early enough that the whole play fits inside the buffer.
 */
export function noiseOffset(dur: number): number {
  offsetStep = (offsetStep + 1) % 1_000_000;
  const room = Math.max(0, NOISE_SECONDS - dur);
  return ((offsetStep * GOLDEN) % 1) * room;
}

let bankCtx: BaseAudioContext | null = null;
let bank: Partial<Record<NoiseColour, AudioBuffer>> = {};

/** The shared noise buffer of that colour for the live audio context, built on first use. Only call after `ctx()` exists. */
export function noise(colour: NoiseColour = "white"): AudioBuffer {
  const ac = ctx();
  if (bankCtx !== ac) {
    bankCtx = ac;
    bank = {};
  }
  return (bank[colour] ??= buildNoise(ac, colour));
}

function buildNoise(ac: BaseAudioContext, colour: NoiseColour): AudioBuffer {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * NOISE_SECONDS), ac.sampleRate);
  const d = buf.getChannelData(0);
  // One generator per colour, seeded from the colour, so building pink
  // first or last never changes what white sounds like.
  const next = mulberry32(NOISE_SEED ^ (colour === "white" ? 0 : colour === "pink" ? 0x1111 : 0x2222));
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = next() * 2 - 1;
    if (colour === "white") d[i] = w;
    else if (colour === "pink") {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    } else {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last;
    }
  }
  let peak = 0;
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < d.length; i++) d[i] /= peak;
  return buf;
}

const curves = new Map<number, Float32Array>();

/**
 * `(1-t)^power` from 1 down to 0, as a gain curve for
 * `AudioParam.setValueCurveAtTime` — the fade the old per-play buffers had
 * baked into their samples. 256 points: the browser interpolates linearly
 * between them, which is inaudibly close to the old per-sample fade.
 */
export function fadeCurve(power: number): Float32Array {
  let c = curves.get(power);
  if (!c) {
    c = new Float32Array(256);
    for (let i = 0; i < c.length; i++) c[i] = Math.pow(1 - i / (c.length - 1), power);
    curves.set(power, c);
  }
  return c;
}

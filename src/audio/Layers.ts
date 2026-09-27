import { ctx, masterBus } from "./AudioEngine";
import { noise, noiseOffset, type NoiseColour } from "./Noise";
import { soundRandom } from "./SoundRandom";

/**
 * LAYERED SOUNDS — the building blocks of player feedback round 2 Task 3's
 * weapons and mechanisms (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 * `blip` and `bang` (`./Sfx.ts`) are one oscillator or one filtered noise
 * burst each; a gunshot is several things happening at once with different
 * shapes — a transient, a body, a thump, a mechanism, a room — so a sound
 * here is a list of **layers**, each its own source, filters, envelope and
 * saturation, summed into one gain and one `masterBus()` call (so a
 * positioned sound costs one HRTF panner, however many layers it has).
 *
 * A layer is:
 *
 * ```
 *  source ─▶ filters (in series) ─▶ [formants, in parallel] ─▶ envelope ─▶ [AM] ─▶ [saturation] ─▶ level ─▶ sum
 * ```
 *
 * - **Source**: the shared noise (`./Noise.ts`, white, pink or brown) at a
 *   fresh offset, or one or more oscillators (a chord), optionally frequency
 *   modulated, optionally sweeping in pitch.
 * - **Envelope** (`Env`): from silence, a linear attack, an optional hold at
 *   the peak, then an exponential fall of 80 dB. It starts and ends at
 *   silence on purpose — a gain that jumps is a click.
 * - **Saturation** (`drive`): a `WaveShaper` with a tanh curve after the
 *   envelope. The envelope's peak drives it, so the loudest part of the
 *   sound is squashed the most: that is what lets a transient hit hard
 *   without being a single tall spike, and what gives a blast its grit.
 *   Oversampled 2x, so the new harmonics do not fold back as hash.
 * - **AM**: an oscillator wobbling the level — the crackle of a flare, the
 *   roll of a long report, the stutter of a discharge.
 *
 * Nothing here draws from `Math.random()`: `jit()` is sound's own
 * generator (`./SoundRandom.ts`), and the noise offset is a counter.
 */

/** Envelope: attack `a`, hold `h`, then an exponential fall of 80 dB over `d` (seconds), from `peak`. */
export interface Env { peak?: number; a: number; h?: number; d: number }
/** A biquad in the layer's series chain, optionally sweeping its corner from `f` to `to` over `over` seconds. */
export interface Filt { type: BiquadFilterType; f: number; q?: number; to?: number; over?: number }
/** A formant: a bandpass in parallel with the others, at its own gain. */
export interface Formant { f: number; q: number; gain: number; to?: number; over?: number }
/** Amplitude modulation: the level wobbles between `1-2·depth` and 1 at `rate` Hz (`depth` at most .5). */
export interface Mod { rate: number; depth: number; type?: OscillatorType; to?: number; over?: number }

interface Common {
  /** Seconds after the sound starts. */
  at?: number;
  env: Env;
  /** Gain after the saturation (or after the envelope, with none). Default 1. */
  level?: number;
  /** tanh drive of the saturation, 1 = gentle, 8 = nearly square. None when absent. */
  drive?: number;
  filters?: Filt[];
  formants?: Formant[];
  am?: Mod;
}
export interface NoiseLayer extends Common { noise: NoiseColour; rate?: number }
export interface ToneLayer extends Common {
  tone: OscillatorType;
  /** Hz, or several for a chord (each voice gets the same sweep, scaled). */
  f: number | number[];
  to?: number;
  over?: number;
  /** FM: a sine at `ratio`×f modulating the pitch by `index`×f Hz, the index falling to `to` over the envelope. */
  fm?: { ratio: number; index: number; to?: number };
  /** Vibrato: cents of depth at `rate` Hz, on every voice. */
  vibrato?: { rate: number; cents: number };
}
export type Layer = NoiseLayer | ToneLayer;

/** Seconds from a layer's start to the end of its envelope. */
export const envEnd = (e: Env): number => e.a + (e.h ?? 0) + e.d;

/** How long a whole sound lasts: its latest layer's end. */
export function length(layers: readonly Layer[]): number {
  return Math.max(0, ...layers.map((l) => (l.at ?? 0) + envEnd(l.env)));
}

/** 1 ± up to `amount`, from sound's own generator — per-shot variation. */
export function jit(amount: number): number {
  return 1 + (soundRandom() * 2 - 1) * amount;
}

/**
 * Saturation on the whole sum: the layers are scaled by `pre` into a tanh of
 * drive `drive`. A recorded gunshot is clipped as a whole, not layer by
 * layer, and this is what does it here — the transient, the body and the
 * thump squash together, so the report's peak is set by its design rather
 * than by how its layers happen to line up, and it can be loud for its
 * length without being tall for one sample.
 */
export interface Glue { pre: number; drive: number }

/** Plays `layers` now, summed into one gain (saturated as a whole with `glue`) and one `masterBus()` call. */
export function play(layers: readonly Layer[], glue?: Glue): void {
  if (!ctx()) return;
  const t0 = ctx().currentTime;
  const out = ctx().createGain();
  if (glue) {
    out.gain.value = glue.pre;
    const ws = ctx().createWaveShaper();
    ws.curve = saturationCurve(glue.drive);
    ws.oversample = "2x";
    out.connect(ws);
    ws.connect(masterBus());
  } else out.connect(masterBus());
  for (const l of layers) layer(out, t0 + (l.at ?? 0), l);
}

const curves = new Map<number, Float32Array<ArrayBuffer>>();
/** tanh(k·x)/tanh(k): unity at full scale, the steeper the harder it squashes. */
export function saturationCurve(k: number): Float32Array<ArrayBuffer> {
  let c = curves.get(k);
  if (!c) {
    c = new Float32Array(1025);
    const n = Math.tanh(k);
    for (let i = 0; i < c.length; i++) c[i] = Math.tanh(k * (i / 512 - 1)) / n;
    curves.set(k, c);
  }
  return c;
}

function envelope(t: number, e: Env): GainNode {
  const g = ctx().createGain(), p = g.gain, peak = e.peak ?? 1;
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + e.a);
  if (e.h) p.setValueAtTime(peak, t + e.a + e.h);
  p.exponentialRampToValueAtTime(peak * 1e-4, t + envEnd(e));
  return g;
}

function biquad(t: number, type: BiquadFilterType, f: number, q: number, to?: number, over?: number): BiquadFilterNode {
  const b = ctx().createBiquadFilter();
  b.type = type;
  b.Q.value = q;
  b.frequency.setValueAtTime(f, t);
  if (to !== undefined) b.frequency.exponentialRampToValueAtTime(to, t + (over ?? 0.1));
  return b;
}

function oscillator(t: number, type: OscillatorType, f: number, to: number | undefined, over: number | undefined, end: number): OscillatorNode {
  const o = ctx().createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (to !== undefined) o.frequency.exponentialRampToValueAtTime(to, t + (over ?? 0.1));
  o.start(t);
  o.stop(end);
  return o;
}

/** Builds one layer into `out`, starting at `t` — `play` above, and `./Speak.ts` for the layers under a voice. */
export function layer(out: AudioNode, t: number, l: Layer): void {
  const end = t + envEnd(l.env) + 0.02;
  // the source(s), into the head of the chain
  const head = ctx().createGain();
  if ("noise" in l) {
    const n = ctx().createBufferSource();
    n.buffer = noise(l.noise);
    if (l.rate) n.playbackRate.value = l.rate;
    n.connect(head);
    n.start(t, noiseOffset((end - t + 0.05) * (l.rate ?? 1)));
    n.stop(end);
  } else {
    const fs = Array.isArray(l.f) ? l.f : [l.f];
    const base = fs[0];
    const vib = l.vibrato ? oscillator(t, "sine", l.vibrato.rate, undefined, undefined, end) : null;
    const vibDepth = vib && l.vibrato ? ctx().createGain() : null;
    if (vib && vibDepth && l.vibrato) { vibDepth.gain.value = l.vibrato.cents; vib.connect(vibDepth); }
    for (const f of fs) {
      const k = f / base;
      const o = oscillator(t, l.tone, f, l.to !== undefined ? l.to * k : undefined, l.over, end);
      if (vibDepth) vibDepth.connect(o.detune);
      if (l.fm) {
        const m = oscillator(t, "sine", f * l.fm.ratio, l.to !== undefined ? l.to * k * l.fm.ratio : undefined, l.over, end);
        const mg = ctx().createGain();
        mg.gain.setValueAtTime(l.fm.index * f, t);
        mg.gain.linearRampToValueAtTime((l.fm.to ?? 0) * f, t + envEnd(l.env));
        m.connect(mg);
        mg.connect(o.frequency);
      }
      o.connect(head);
    }
    if (fs.length > 1) head.gain.value = 1 / Math.sqrt(fs.length);
  }
  // series filters, then parallel formants
  let node: AudioNode = head;
  for (const f of l.filters ?? []) {
    const b = biquad(t, f.type, f.f, f.q ?? 0.707, f.to, f.over);
    node.connect(b);
    node = b;
  }
  if (l.formants?.length) {
    const sum = ctx().createGain();
    for (const fm of l.formants) {
      const b = biquad(t, "bandpass", fm.f, fm.q, fm.to, fm.over);
      const g = ctx().createGain();
      g.gain.value = fm.gain;
      node.connect(b);
      b.connect(g);
      g.connect(sum);
    }
    node = sum;
  }
  const env = envelope(t, l.env);
  node.connect(env);
  node = env;
  if (l.am) {
    const am = ctx().createGain();
    am.gain.value = 1 - l.am.depth;
    const lfo = oscillator(t, l.am.type ?? "sine", l.am.rate, l.am.to, l.am.over, end);
    const depth = ctx().createGain();
    depth.gain.value = l.am.depth;
    lfo.connect(depth);
    depth.connect(am.gain);
    node.connect(am);
    node = am;
  }
  if (l.drive) {
    const ws = ctx().createWaveShaper();
    ws.curve = saturationCurve(l.drive);
    ws.oversample = "2x";
    node.connect(ws);
    node = ws;
  }
  const lv = ctx().createGain();
  lv.gain.value = l.level ?? 1;
  node.connect(lv);
  lv.connect(out);
}

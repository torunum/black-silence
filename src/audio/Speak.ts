import { ctx, echoBus, masterBus } from "./AudioEngine";
import { noise, noiseOffset } from "./Noise";
import { layer, saturationCurve, type Layer } from "./Layers";
import { voicePlan, type VocalEvent, type VoicePlan } from "./VoiceTable";

/**
 * A MONSTER SPEAKS — builds one emission of a voice (`./VoiceTable.ts`,
 * player feedback round 2 Task 4) as a WebAudio graph:
 *
 * ```
 *  saw/square (f0, jitter walk, vibrato) ─┐
 *  [sub: the same an octave down] ────────┼─▶ larynx ─▶ grit (WaveShaper) ─┬▶ F1 ─▶ ×g1 ─┐
 *  shared noise (breath) ─────────────────┘                                ├▶ F2 ─▶ ×g2 ─┼▶ envelope ─▶ growl (AM 30-80 Hz) ─▶ out ─▶ one bus call
 *                                                                           └▶ F3 ─▶ ×g3 ─┘                               ▲
 *                                                            [extra layers: a gurgle, a rake, a whoosh — ./Layers.ts] ────┘
 * ```
 *
 * 19 nodes (21 with a boss's sub-octave; about 7 more per extra layer), plus the one `PannerNode`
 * a positioned sound gets: everything reaches the bus through a single
 * `masterBus()`/`echoBus()` call, so `at(x,y,z, ...)` places the whole voice,
 * extra layers included. `tests/audio/monsterVoices.test.ts` measures the
 * count; the render cost of ten at once is in `docs/sound-levels.md`.
 */

/** Builds `plan`, plus any `extra` layers into the same output, now. */
export function voice(plan: VoicePlan, extra: readonly Layer[] = []): void {
  if (!ctx()) return;
  const ac = ctx();
  const t0 = ac.currentTime;
  const end = t0 + plan.dur + 0.03;
  const out = ac.createGain();
  out.gain.value = plan.level;
  out.connect(plan.echo ? echoBus() : masterBus());

  // the cords, and the breath, into the larynx
  const larynx = ac.createGain();
  larynx.gain.value = 0.7;
  const cords = ac.createGain();
  cords.gain.value = 1 - plan.breath * 0.6;
  cords.connect(larynx);
  const vib = ac.createOscillator();
  vib.frequency.value = plan.vibrato.rate;
  const vibDepth = ac.createGain();
  vibDepth.gain.value = plan.vibrato.cents;
  vib.connect(vibDepth);
  vib.start(t0);
  vib.stop(end);
  const cord = (ratio: number, gain: number): void => {
    const o = ac.createOscillator();
    o.type = plan.wave;
    const [first, ...rest] = plan.pitch;
    o.frequency.setValueAtTime(first[1] * ratio, t0 + first[0]);
    for (const [t, f] of rest) o.frequency.linearRampToValueAtTime(f * ratio, t0 + t);
    vibDepth.connect(o.detune);
    if (gain === 1) o.connect(cords);
    else {
      const g = ac.createGain();
      g.gain.value = gain;
      o.connect(g);
      g.connect(cords);
    }
    o.start(t0);
    o.stop(end);
  };
  cord(1, 1);
  if (plan.sub) cord(0.5, 0.8);
  const breath = ac.createBufferSource();
  breath.buffer = noise();
  const breathGain = ac.createGain();
  breathGain.gain.value = plan.breath * 0.8;
  breath.connect(breathGain);
  breathGain.connect(larynx);
  breath.start(t0, noiseOffset(end - t0));
  breath.stop(end);

  // grit, then the throat: three formants in parallel, gliding from one vowel to the next
  let throat: AudioNode = larynx;
  if (plan.grit > 0) {
    const ws = ac.createWaveShaper();
    ws.curve = saturationCurve(plan.grit);
    larynx.connect(ws);
    throat = ws;
  }
  const env = ac.createGain();
  for (const f of plan.formants) {
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = f.q;
    bp.frequency.setValueAtTime(f.from, t0);
    bp.frequency.exponentialRampToValueAtTime(f.to, t0 + plan.dur);
    const g = ac.createGain();
    g.gain.value = f.gain;
    throat.connect(bp);
    bp.connect(g);
    g.connect(env);
  }

  // the envelope: from silence, a peak, a sustain sagging to 3/4, then an 80 dB fall — no step at either end
  const p = env.gain;
  p.setValueAtTime(0, t0);
  p.linearRampToValueAtTime(1, t0 + plan.attack);
  p.linearRampToValueAtTime(0.75, t0 + plan.attack + (plan.dur - plan.attack) * 0.45);
  p.exponentialRampToValueAtTime(1e-4, t0 + plan.dur);

  // the growl: the level wobbles between 1-2·depth and 1
  const growl = ac.createGain();
  growl.gain.value = 1 - plan.growl.depth;
  const lfo = ac.createOscillator();
  lfo.type = plan.growl.wave;
  lfo.frequency.value = plan.growl.rate;
  const depth = ac.createGain();
  depth.gain.value = plan.growl.depth;
  lfo.connect(depth);
  depth.connect(growl.gain);
  lfo.start(t0);
  lfo.stop(end);
  env.connect(growl);
  growl.connect(out);

  for (const l of plan.wet ? [gurgleLayer(plan.dur), ...extra] : extra) layer(out, t0 + (l.at ?? 0), l);
}

/** The wet death: bubbling low noise under the last half of the cry. */
function gurgleLayer(dur: number): Layer {
  return {
    at: dur * 0.45, noise: "white",
    filters: [{ type: "lowpass", f: 900, q: 2, to: 260, over: dur * 0.6 }],
    env: { a: 0.04, h: dur * 0.15, d: dur * 0.5 },
    am: { rate: 13, depth: 0.45, type: "square", to: 7, over: dur * 0.6 },
    level: 0.9,
  };
}

/** `kind` makes `event` now: a fresh plan (sound's own dice), built, with any `extra` layers under it. */
export function speak(kind: string, event: VocalEvent, extra: readonly Layer[] = []): void {
  if (!ctx()) return;
  voice(voicePlan(kind, event), extra);
}

/** When each throat last made each event, per audio context — see `speakOnce`. */
const spoken = new WeakMap<BaseAudioContext, WeakMap<object, Map<string, number>>>();
/** The throat a caller that names none speaks with: one per kind (the sound board, the tests). */
const ANY = {};

/**
 * `speak`, unless the same throat already made the same event within
 * `window` seconds of audio time. One call site fires once per *hit*: the
 * sawed-off's eight pellets are eight `damageEnemy` calls in one frame, and
 * a priest's volley is five `fireOrb` calls. The old sounds stacked eight
 * identical yelps (louder, not richer); a voice is one throat, so the
 * second and later calls of the same instant are the same cry.
 *
 * `who` is the throat: the game passes the enemy itself, so a rocket that
 * hurts three zombies at once still gets three yelps, each at its own
 * zombie. It is only ever a key in a `WeakMap` — nothing reads it. Without
 * one, every monster of a kind shares a throat. Returns whether it spoke.
 */
export function speakOnce(kind: string, event: VocalEvent, window: number, extra: readonly Layer[] = [], who: object = ANY): boolean {
  if (!ctx()) return false;
  const ac = ctx();
  let throats = spoken.get(ac);
  if (!throats) spoken.set(ac, (throats = new WeakMap()));
  let last = throats.get(who);
  if (!last) throats.set(who, (last = new Map()));
  const key = `${kind}:${event}`;
  const now = ac.currentTime;
  const was = last.get(key);
  if (was !== undefined && now - was < window) return false;
  last.set(key, now);
  voice(voicePlan(kind, event), extra);
  return true;
}

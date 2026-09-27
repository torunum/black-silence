import { buildImpulse, ROOMS, type RoomName } from "./Room";

/**
 * THE MIX — player feedback round 2, Task 2
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). Where
 * every sound goes after its own synthesis: into a room, then through a
 * master chain that glues layered sounds together and cannot clip.
 *
 * ```
 *  sound ─▶ strip (its level trim) ─┬──────────────────────────────▶ sum
 *                                   └▶ send (its amount) ─▶ reverb ─▶ return ─▶ sum
 *  drone bed ─────────────────────────────────────────────────────────────▶ sum
 *  sum ─▶ glue compressor ─▶ limiter ─▶ soft clip ─▶ master volume ─▶ speakers
 * ```
 *
 * ## What it replaced
 *
 * The reference's "echo bus" was a 340 ms feedback delay (feedback .42)
 * with no dry path at all: a sound routed to it was heard *only* as a
 * repeat, a third of a second late, then again and again at -7.5 dB steps.
 * Everything else went straight to one gain node and on to the speakers, so
 * nothing stopped three monsters and an explosion from summing past full
 * scale. The board keeps that graph as "Old mix"
 * (`src/soundboard/previous/mix.ts`) so the two can be heard side by side.
 *
 * ## The room
 *
 * A `ConvolverNode` with a procedural impulse response per level theme
 * (`./Room.ts`), `normalize` off because the IRs are already unit-energy.
 * A sound reaches it by an **amount**, not a flag: the old `echo` argument
 * still exists on `blip`/`growl` and friends and now picks between two
 * amounts, `DRY_SEND` (everything sits in the room a little) and
 * `ECHO_SEND` (the sounds the reference sent to its echo — distant, holy or
 * enormous — sit in it a lot), and each sound's entry in `./Levels.ts` can
 * scale that by its own `room` factor. The send is taken after the level
 * trim and after the HRTF panner (`AudioEngine.ts`'s `busFor`), so a
 * positioned sound reaches the room too, attenuated by distance exactly as
 * much as its dry signal is.
 *
 * Swapping rooms builds a new convolver (older browsers refused to take a
 * second buffer on an existing one) and drops the old one; a tail ringing at
 * that moment is cut, which only happens at a level load.
 *
 * ## The chain
 *
 * - **Glue** (`GLUE`): a gentle compressor — 2.5:1 above -14 dBFS with a
 *   12 dB soft knee, 10 ms attack, 250 ms release — that pulls layered
 *   sounds (a shotgun over a monster over the drone) into one picture
 *   instead of a pile.
 * - **Limiter** (`LIMIT`): a hard-knee 20:1 compressor at -2 dBFS with the
 *   fastest attack the node allows. The Web Audio compressor adds its own
 *   make-up gain and its attack is not instantaneous, so on its own it can
 *   still let a transient past full scale.
 * - **Soft clip** (`CLIP`): a `WaveShaper`, linear up to `CLIP.knee`, a tanh
 *   shoulder above it, flattening out below `CLIP.ceiling`. A wave shaper's
 *   output is its curve's value, and inputs beyond ±1 read the curve's end
 *   points — so whatever reaches it, nothing leaves it above the ceiling.
 *   `oversample` is `"none"` on purpose: oversampling's reconstruction
 *   filter could ring past the ceiling, and this stage exists to be a
 *   guarantee, not a sound.
 * - **Master volume** last, so the settings slider scales the finished mix
 *   and the compressors see the same signal at any volume. It is clamped to
 *   [0, 1]: the output can never exceed `CLIP.ceiling`.
 */

/** A request for somewhere to connect a sound: which old accessor it came through, and its level. */
export interface Route {
  /** True when the sound asked for `echoBus()` — what the old mix needs to know. */
  echo: boolean;
  /** How much of it goes to the room. */
  send: number;
  /** Its level trim, linear. */
  gain: number;
}

export interface Mix {
  /** The node a sound connects into. */
  route(r: Route): GainNode;
  /** Where the ambient drone bed connects. */
  readonly bed: AudioNode;
  setVolume(v: number): void;
  /** The master volume the output stage is at. */
  volume(): number;
  /** Which room the reverb is in. A no-op on a mix without one. */
  setRoom(room: RoomName): void;
  /** The room the reverb is currently built for, or null before the first sound (or on a mix without one). */
  room(): RoomName | null;
}

/** Builds a mix on a context — `newMix` below for the game; the board also has the pre-Task-2 one. */
export type MixFactory = (ac: BaseAudioContext, volume: number, room: RoomName) => Mix;

/** The send for a sound that came through `masterBus()`: a little room on everything. */
export const DRY_SEND = 0.3;
/** The send for a sound that came through `echoBus()` — what the reference sent to its delay. */
export const ECHO_SEND = 0.8;

export const GLUE = { threshold: -14, knee: 12, ratio: 2.5, attack: 0.01, release: 0.25 } as const;
export const LIMIT = { threshold: -2, knee: 0, ratio: 20, attack: 0, release: 0.06 } as const;
export const CLIP = { knee: 0.8, ceiling: 0.966 } as const;

/**
 * The soft-clip transfer curve: identity up to `knee`, then a tanh shoulder
 * that approaches (and never reaches) `ceiling`. Odd-symmetric.
 */
export function softClipCurve(points = 4096): Float32Array<ArrayBuffer> {
  const c = new Float32Array(points);
  const room = CLIP.ceiling - CLIP.knee;
  for (let i = 0; i < points; i++) {
    const x = (i / (points - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= CLIP.knee ? a : CLIP.knee + room * Math.tanh((a - CLIP.knee) / room);
    c[i] = Math.sign(x) * y;
  }
  return c;
}

function setParams(node: DynamicsCompressorNode, p: { threshold: number; knee: number; ratio: number; attack: number; release: number }): void {
  node.threshold.value = p.threshold;
  node.knee.value = p.knee;
  node.ratio.value = p.ratio;
  node.attack.value = p.attack;
  node.release.value = p.release;
}

const clampVolume = (v: number): number => Math.min(1, Math.max(0, v));

/** The game's mix: room, glue, limiter, soft clip, volume. See the module doc comment. */
export const newMix: MixFactory = (ac, volume, initialRoom) => {
  const sum = ac.createGain();
  const glue = ac.createDynamicsCompressor();
  setParams(glue, GLUE);
  const limit = ac.createDynamicsCompressor();
  setParams(limit, LIMIT);
  const clip = ac.createWaveShaper();
  clip.curve = softClipCurve();
  clip.oversample = "none";
  const out = ac.createGain();
  out.gain.value = clampVolume(volume);
  sum.connect(glue);
  glue.connect(limit);
  limit.connect(clip);
  clip.connect(out);
  out.connect(ac.destination);

  // The room: send -> convolver -> return -> sum. The convolver itself is
  // built lazily — at the first sound that sends to it, or at setRoom() —
  // so a context that plays nothing, or changes level before its first
  // sound, never builds an impulse response it does not use.
  const send = ac.createGain();
  const ret = ac.createGain();
  ret.connect(sum);
  const impulses = new Map<RoomName, AudioBuffer>();
  let wanted = initialRoom;
  let built: RoomName | null = null;
  let conv: ConvolverNode | null = null;
  function install(room: RoomName): void {
    if (built === room) return;
    let ir = impulses.get(room);
    if (!ir) impulses.set(room, (ir = buildImpulse(ac, room)));
    const c = ac.createConvolver();
    c.normalize = false;
    c.buffer = ir;
    send.connect(c);
    c.connect(ret);
    ret.gain.value = ROOMS[room].wet;
    if (conv) {
      send.disconnect(conv);
      conv.disconnect();
    }
    conv = c;
    built = room;
  }

  // One strip per distinct (trim, send) pair, kept for the context's life:
  // every play of a sound reuses its strip, so the room costs no per-sound
  // allocation. A panner (AudioEngine.ts's busFor) connects into a strip
  // like any other source.
  const strips = new Map<string, GainNode>();
  return {
    bed: sum,
    route({ send: amount, gain }) {
      if (amount > 0) install(wanted);
      const key = `${gain}|${amount}`;
      let s = strips.get(key);
      if (!s) {
        s = ac.createGain();
        s.gain.value = gain;
        s.connect(sum);
        if (amount > 0) {
          const g = ac.createGain();
          g.gain.value = amount;
          s.connect(g);
          g.connect(send);
        }
        strips.set(key, s);
      }
      return s;
    },
    setVolume(v) { out.gain.value = clampVolume(v); },
    volume: () => out.gain.value,
    setRoom(room) {
      wanted = room;
      install(room);
    },
    room: () => built,
  };
};

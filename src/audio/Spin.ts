import { ctx, masterBus } from "./AudioEngine";

/**
 * THE NAIL CANNON'S MOTOR — the one continuous weapon sound. Player
 * feedback round 2 Task 3: the viewmodel spins the barrel cluster up while
 * the trigger is held and lets it wind down after (`src/render/viewmodel/
 * animate.ts`); this is that spin, audible. A sawtooth whine and its
 * octave, through a lowpass, with the barrels passing the feed as a
 * rattle (amplitude modulation at the barrel rate) — all three following
 * the spin.
 *
 * **It follows the picture's own law.** The animation eases the spin
 * toward its target at `SPIN.up` per second while firing and `SPIN.down`
 * after (`src/render/viewmodel/phases.ts`): a first-order lag. Every
 * parameter here is set with `setTargetAtTime` at time constants
 * `1/up` and `1/down`, which is the same curve, run by the audio clock.
 *
 * **It stops by itself.** While firing, the game calls `spin(true)` every
 * frame, and each call says "full speed now, and start winding down
 * `HOLD` seconds from now unless told again". If the frames stop coming —
 * the game paused, the tab hidden — the motor winds down on its own
 * instead of whining forever. After `spin(false)` it winds down at once;
 * once it has been quiet for `STOP_AFTER` seconds the nodes are stopped
 * and dropped, and the next spin-up builds new ones.
 */

/** Seconds of full speed each frame's "still firing" buys. A few frames' worth. */
export const HOLD = 0.12;
/** Seconds of winding down before the voice is stopped (the spin is under 1% by then: 1.6/s × 3.2 s ≈ e^-5). */
export const STOP_AFTER = 3.2;
/** The whine at full speed and at rest, Hz, and the barrel rate at full speed (6 barrels × 26 rad/s ÷ 2π). */
const WHINE = { full: 620, rest: 55 };
const BARRELS_HZ = 24.8;

interface Voice {
  ac: BaseAudioContext;
  saw: OscillatorNode;
  oct: OscillatorNode;
  lfo: OscillatorNode;
  gain: GainNode;
  /** Whether it is being driven up, and when it last was. */
  up: boolean;
  lastUp: number;
}
let v: Voice | null = null;

/** True while the motor is making sound (or winding down). */
export function spinning(): boolean {
  return v !== null && v.ac === ctx();
}

function build(): Voice {
  const ac = ctx(), t = ac.currentTime;
  const saw = ac.createOscillator(); saw.type = "sawtooth"; saw.frequency.setValueAtTime(WHINE.rest, t);
  const oct = ac.createOscillator(); oct.type = "sine"; oct.frequency.setValueAtTime(WHINE.rest * 2.01, t);
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; lp.Q.value = 1.2;
  const octG = ac.createGain(); octG.gain.value = 0.5;
  // the barrels passing: the level wobbles at the barrel rate
  const am = ac.createGain(); am.gain.value = 0.7;
  const lfo = ac.createOscillator(); lfo.type = "triangle"; lfo.frequency.setValueAtTime(1, t);
  const lfoG = ac.createGain(); lfoG.gain.value = 0.3;
  const gain = ac.createGain(); gain.gain.setValueAtTime(0, t);
  saw.connect(lp); oct.connect(octG); octG.connect(lp);
  lp.connect(am); lfo.connect(lfoG); lfoG.connect(am.gain);
  am.connect(gain); gain.connect(masterBus());
  saw.start(t); oct.start(t); lfo.start(t);
  return { ac, saw, oct, lfo, gain, up: false, lastUp: t };
}

/** Sets every parameter toward spin level `s` (0..1) with time constant `tau`, from `t`. */
function toward(x: Voice, s: number, t: number, tau: number): void {
  const f = WHINE.rest + (WHINE.full - WHINE.rest) * s;
  x.saw.frequency.setTargetAtTime(f, t, tau);
  x.oct.frequency.setTargetAtTime(f * 2.01, t, tau);
  x.lfo.frequency.setTargetAtTime(1 + (BARRELS_HZ - 1) * s, t, tau);
  x.gain.gain.setTargetAtTime(0.3 * s, t, tau);
}

function cancel(x: Voice, t: number): void {
  for (const p of [x.saw.frequency, x.oct.frequency, x.lfo.frequency, x.gain.gain]) p.cancelScheduledValues(t);
}

/**
 * Drives the motor: `on` while the barrels are being driven, with time
 * constants `1/up` and `1/down` (seconds). `gone` winds it down fast — the
 * weapon was put away.
 */
export function spin(on: boolean, up: number, down: number, gone = false): void {
  if (!ctx()) return;
  const t = ctx().currentTime;
  if (!v || v.ac !== ctx()) {
    if (!on) { v = null; return; }
    v = build();
  }
  if (on) {
    cancel(v, t);
    toward(v, 1, t, 1 / up);
    toward(v, 0, t + HOLD, 1 / down);
    v.up = true;
    v.lastUp = t;
    return;
  }
  if (v.up || gone) {
    cancel(v, t);
    toward(v, 0, t, gone ? 0.04 : 1 / down);
    v.up = false;
    v.lastUp = t;
  }
  if (t - v.lastUp > STOP_AFTER) {
    cancel(v, t);
    v.gain.gain.setTargetAtTime(0, t, 0.01);
    for (const o of [v.saw, v.oct, v.lfo]) o.stop(t + 0.1);
    v = null;
  }
}

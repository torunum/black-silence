import { ctx, echoBus, masterBus } from "./AudioEngine";
import { fadeCurve, noise, noiseOffset } from "./Noise";

/**
 * ONE-SHOT SOUND EFFECTS — blip (the general-purpose tone/sweep used for
 * nearly every gunshot, UI beep and monster cue), bang (a filtered-noise
 * transient for footsteps, impacts and static), click (a bang() preset for
 * UI clicks) and boom (the one clean explosion: a sub thud plus a soft
 * noise tail). Copied verbatim from reference/sonsurum.html lines 1665-1709
 * (see tests/support/reference.ts's REF.blip/bang/click/boom), with the
 * reference's bare AC/masterG/echoG references replaced one-for-one by
 * calls to AudioEngine's ctx()/masterBus()/echoBus() accessors — every
 * frequency, duration, gain and filter setting is otherwise untouched.
 *
 * Every function keeps the reference's `if (!AC) return;` early exit (as
 * `if (!ctx()) return;`): the game calls these on paths that can run before
 * audioInit() — before the player has interacted with the page at all — and
 * relies on them being silent no-ops rather than throwing.
 *
 * `gunshot()`, round 1's weapon report (player feedback round 1 task 4),
 * used to live at the bottom of this file. Player feedback round 2 Task 3
 * replaced every weapon report with a layered design (`./Layers.ts`,
 * `./sounds/weapons.ts`) and moved `gunshot()` to the sound board's record
 * of the old sounds, `src/soundboard/previous/weapons.ts`.
 *
 * PLAYER FEEDBACK ROUND 2 TASK 1 — SOUND DRAWS NO DICE (KNOWN-22). The one
 * deliberate departure from the reference in this file: where the
 * reference drew from `Math.random()` — the game's own generator — this
 * draws from `soundRandom()` (`./SoundRandom.ts`), and where it filled a
 * fresh buffer with random samples per sound it plays `./Noise.ts`'s
 * shared noise at an offset. Nothing else about the synthesis changed; the
 * oracles in `tests/behavior/` and `tests/fidelity.test.ts` check exactly
 * that, with the substitution reversed.
 */

export function blip(freq: number, dur: number, type?: OscillatorType, vol?: number, slide?: number, echo?: boolean): void {
  if(!ctx())return;
  const o=ctx().createOscillator(),g=ctx().createGain();
  o.type=type||"square";o.frequency.setValueAtTime(freq,ctx().currentTime);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,ctx().currentTime+dur);
  g.gain.setValueAtTime(vol||.15,ctx().currentTime);
  g.gain.exponentialRampToValueAtTime(.001,ctx().currentTime+dur);
  o.connect(g);
  // harsh waveforms get muffled through a lowpass so they read as dark/organic, not chiptune
  if(o.type==="square"||o.type==="sawtooth"){
    const lp=ctx().createBiquadFilter();lp.type="lowpass";
    lp.frequency.value=Math.max(420,Math.min(freq*3.2,2200));lp.Q.value=.6;
    g.connect(lp);lp.connect(echo?echoBus():masterBus());
  } else g.connect(echo?echoBus():masterBus());
  o.start();o.stop(ctx().currentTime+dur);}
export function bang(dur: number, vol?: number, low?: number, hi?: number): void {
  if(!ctx())return;
  const t0=ctx().currentTime;
  // The shared noise at a fresh offset, and the (1-t)^2 fade that used to be
  // baked into a fresh Math.random() buffer as a gain curve — see Noise.ts.
  const n=ctx().createBufferSource();n.buffer=noise();
  const env=ctx().createGain();env.gain.setValueCurveAtTime(fadeCurve(2),t0,dur);
  const f=ctx().createBiquadFilter();f.type="lowpass";f.frequency.value=low||1800;
  let node=f;
  if(hi){const h=ctx().createBiquadFilter();h.type="highpass";h.frequency.value=hi;f.connect(h);node=h;}
  const g=ctx().createGain();g.gain.value=vol||.4;
  n.connect(env);env.connect(f);node.connect(g);g.connect(masterBus());n.start(t0,noiseOffset(dur));n.stop(t0+dur);}
export function click(vol?: number): void {bang(.025,vol||.18,4000,600);}
/* one clean, deep explosion — low body thud + soft noise tail, no chiptune, no stacking */
export function boom(power?: number): void {
  if(!ctx())return;const t0=ctx().currentTime;power=power||1;
  const out=ctx().createGain();out.gain.value=Math.min(.7,.5*power);out.connect(masterBus());
  // sub thud (sine drop)
  const o=ctx().createOscillator();o.type="sine";
  o.frequency.setValueAtTime(150,t0);o.frequency.exponentialRampToValueAtTime(38,t0+.4);
  const og=ctx().createGain();og.gain.setValueAtTime(.9,t0);og.gain.exponentialRampToValueAtTime(.001,t0+.5);
  o.connect(og);og.connect(out);o.start(t0);o.stop(t0+.5);
  // low rumble noise, lowpassed, fading
  // (the shared noise and its once-baked (1-t)^1.6 fade — see bang() and Noise.ts)
  const dur=.7;const ns=ctx().createBufferSource();ns.buffer=noise();
  const env=ctx().createGain();env.gain.setValueCurveAtTime(fadeCurve(1.6),t0,dur);
  const lp=ctx().createBiquadFilter();lp.type="lowpass";
  lp.frequency.setValueAtTime(900,t0);lp.frequency.exponentialRampToValueAtTime(120,t0+dur);
  const ng=ctx().createGain();ng.gain.setValueAtTime(.6,t0);ng.gain.exponentialRampToValueAtTime(.001,t0+dur);
  ns.connect(env);env.connect(lp);lp.connect(ng);ng.connect(out);ns.start(t0,noiseOffset(dur));ns.stop(t0+dur);}

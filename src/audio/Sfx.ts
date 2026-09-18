import { ctx, echoBus, masterBus } from "./AudioEngine";

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
 * `gunshot()` at the bottom of this file is the one exception to all of the
 * above: it is NOT ported from the reference, it is new synthesis written
 * for player-feedback round 1 task 4 (2026-09-17). See its own doc comment.
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
  const n=ctx().createBufferSource(),buf=ctx().createBuffer(1,ctx().sampleRate*dur,ctx().sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
  n.buffer=buf;
  const f=ctx().createBiquadFilter();f.type="lowpass";f.frequency.value=low||1800;
  let node=f;
  if(hi){const h=ctx().createBiquadFilter();h.type="highpass";h.frequency.value=hi;f.connect(h);node=h;}
  const g=ctx().createGain();g.gain.value=vol||.4;
  n.connect(f);node.connect(g);g.connect(masterBus());n.start();}
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
  const dur=.7;const ns=ctx().createBufferSource();
  const buf=ctx().createBuffer(1,ctx().sampleRate*dur,ctx().sampleRate);const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.6);
  ns.buffer=buf;
  const lp=ctx().createBiquadFilter();lp.type="lowpass";
  lp.frequency.setValueAtTime(900,t0);lp.frequency.exponentialRampToValueAtTime(120,t0+dur);
  const ng=ctx().createGain();ng.gain.setValueAtTime(.6,t0);ng.gain.exponentialRampToValueAtTime(.001,t0+dur);
  ns.connect(lp);lp.connect(ng);ng.connect(out);ns.start(t0);ns.stop(t0+dur);}

/**
 * THE WEAPON REPORT — new synthesis, not a port. The project owner played
 * the game and reported "the gun firing sound is bad" (player feedback
 * round 1, 2026-09-17). This is the replacement, and the honest framing is
 * in `docs/direction.md`: "Procedural WebAudio cannot produce a convincing
 * shotgun." Real CC0 `.ogg` files (Phase 1 Task 6, outstanding since
 * 2026-08-29) are the actual answer; `docs/assets.md` says where to drop
 * them. This is a better placeholder, not a finished sound, and nobody who
 * wrote it has heard it.
 *
 * WHAT THE OLD REPORT WAS, STRUCTURALLY. Every weapon's `snd` closure was
 * one `bang(dur,vol,low)` — `sampleRate*dur` samples of white noise scaled
 * in the buffer by `(1-i/N)^2`, pushed through a single fixed `lowpass` at
 * `low`, into a gain node with a CONSTANT `gain.value` — plus, on four of
 * the six, one `blip(...,"square"|"sawtooth",...)`: a pitched tone swept
 * downward, two of them through the echo bus. Three consequences:
 *
 * 1. NO TRANSIENT. The lowpass corner was 1400-3200 Hz depending on the
 *    weapon, and it was the only filter in the chain. Nothing in any weapon
 *    report had any energy above its own corner, ever. A firearm report is
 *    a broadband shock front — a crack that reaches well past 10 kHz in its
 *    first couple of milliseconds. That content was heavily attenuated here;
 *    a biquad lowpass rolls off at roughly 12 dB/octave, so it does not
 *    produce zero energy at any frequency, but the result was inaudibly quiet.
 * 2. DECAY TOO LONG, AND THE WRONG LAW. `(1-t/T)^2` is a polynomial fade:
 *    at half the duration the amplitude is still 0.25 (-12 dB), and it
 *    stays audible until it hits the buffer's end. Over the pistol's 130 ms
 *    that is a sustained hiss, not a report. A real report's body is an
 *    exponential decay with a time constant in the tens of milliseconds.
 * 3. THE BUZZ IS THE PITCHED TONE. A square wave is odd harmonics; swept
 *    downward over 50-300 ms and (on the pistol and sniper) repeated
 *    through the delay feedback loop, it reads as a chiptune "pew" laid
 *    under the noise. Nothing about a firearm is pitched.
 *
 * WHAT IT IS NOW. One noise source — the same acoustic event, not two
 * independent noises — split into two parallel filter paths at `split` Hz,
 * plus a low sine thump, summed into a single output gain:
 *
 * - CRACK: the noise highpassed at `split`, gain enveloped from `crack` down
 *   to .001 over CRACK_DUR (4 ms). This is the band the old sound stopped
 *   at, so `split` is exactly the old `bang`'s lowpass corner and the two
 *   new paths cross over where the old single filter used to end. 4 ms is
 *   long enough to be a click rather than a sample discontinuity and far
 *   too short — and far too high-passed — to be heard as a pitch.
 * - BODY: the same noise lowpassed, with the CORNER ITSELF ramping down
 *   from `split` to `bodyEndHz` across `bodyDur` while the gain decays
 *   exponentially from `body` to .001. The moving corner is the structural
 *   point: the old filter was static for the sound's whole length, which is
 *   what makes filtered noise read as hiss. A real report's spectral
 *   centroid collapses as the blast expands. `bodyDur` is also ~0.7x the
 *   old `dur` in every profile, and the decay law is now exponential rather
 *   than polynomial — at half the duration an exponential run to .001 is
 *   around -27 dB where `(1-t/T)^2` was -12 dB, so the audible length drops
 *   by much more than the 0.7 suggests. That is the "decay too long" fix.
 * - PUNCH: a SINE (no harmonics, so it cannot buzz) dropping from `punchHz`
 *   to `punchEndHz` — always under 90 Hz — inside `punchDur`. A pitch drop
 *   that fast and that low is heard as a thump, not a note. This is what
 *   replaces the square/sawtooth blip, and it is DRY: nothing here goes to
 *   the echo bus, so the pitched repeat is gone too.
 *
 * LOUDNESS IS DELIBERATELY UNCHANGED. `crack + body + punch` equals the old
 * closure's summed peak gain, per weapon, exactly — so the report's level
 * against every sound this task did NOT touch (footsteps, monsters, doors,
 * explosions) is the same as before. Only the distribution across the three
 * layers moved. `tests/behavior/audio.test.ts` derives both sums from the
 * recorded logs and asserts they match, which is why `out.gain` below is
 * left at its Web Audio default of 1 rather than assigned: an explicit
 * assignment would land in the same log and break that derivation.
 *
 * ONE BUS CALL, ON PURPOSE. `masterBus()` is called exactly once, which is
 * why the unity `out` gain exists at all. Under `AudioEngine.ts`'s `at()`,
 * every `masterBus()`/`echoBus()` call inside the scope builds its own
 * HRTF panner — `busFor()` deliberately does not consume the armed position
 * (its body says so; `tests/audio/positional.test.ts` pins it; NOTE that
 * three of that file's other doc comments still claim the opposite, which
 * is a live documentation trap, not a code defect). So the old weapon
 * closures, at two or three bus calls each, would allocate two or three
 * panners for one gunshot; this allocates one. `fire()` emits the report
 * unpositioned today — it is first-person — so this buys nothing live. It
 * is the structural property of the rebuild that can be proven without
 * hearing anything, which is most of why it is here.
 * `tests/behavior/weaponReport.test.ts` checks it, and demonstrates the old
 * shape on the two closures this task left alone.
 */
export interface GunshotProfile {
  /** Hz. Crack highpass corner AND body lowpass start — the old `bang`'s single `low`. */
  split: number;
  /** Peak gain of the crack layer. */
  crack: number;
  /** Peak gain of the body layer. */
  body: number;
  /** Body decay, seconds. Roughly 0.7x the old closure's `bang` duration. */
  bodyDur: number;
  /** Hz. Where the body's lowpass corner lands at the end of `bodyDur`. */
  bodyEndHz: number;
  /** Peak gain of the low sine thump. */
  punch: number;
  /** Hz. Thump pitch at t0. */
  punchHz: number;
  /** Hz. Thump pitch at the end of `punchDur` — always under 90, so it reads as a thump. */
  punchEndHz: number;
  /** Thump decay, seconds. */
  punchDur: number;
}

/** 4 ms. See the crack paragraph above. */
const CRACK_DUR = 0.004;
/**
 * 1/sqrt(2) — the Butterworth Q, the only value with no resonant peak at the
 * corner. Both filters get it explicitly rather than the Web Audio default
 * of 1 (which bumps ~+1 dB at the corner): a resonance sitting on the
 * crossover would ring at the crossover frequency, and ringing is the exact
 * thing this rebuild exists to remove.
 */
const FLAT_Q = 0.707;

export function gunshot(p: GunshotProfile): void {
  if(!ctx())return;
  const t0=ctx().currentTime;
  // Unity sum bus. Deliberately no gain assignment — see the doc comment.
  const out=ctx().createGain();out.connect(masterBus());
  // One noise source for both paths: a report's crack and body are the same
  // event seen through two filters, not two independent noises. It also
  // keeps this function to a single Math.random() fill loop, the same count
  // the old single `bang` made — see docs/known-issues.md KNOWN-20 for why
  // that number is load-bearing for the trace fixtures.
  const n=ctx().createBufferSource();
  const buf=ctx().createBuffer(1,Math.ceil(ctx().sampleRate*p.bodyDur),ctx().sampleRate);
  const d=buf.getChannelData(0);
  // Flat fill: every envelope below is on an AudioParam, not baked into the
  // samples. That is audibly the point (the shape is now a real exponential)
  // and it is also the only way the recorder can see it — a buffer fill is a
  // typed-array write, invisible to a call-log oracle (KNOWN-5 item 3).
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  n.buffer=buf;
  // CRACK — broadband, above the old corner, gone in 4 ms.
  const hp=ctx().createBiquadFilter();hp.type="highpass";
  hp.frequency.value=p.split;hp.Q.value=FLAT_Q;
  const cg=ctx().createGain();
  cg.gain.setValueAtTime(p.crack,t0);cg.gain.exponentialRampToValueAtTime(.001,t0+CRACK_DUR);
  n.connect(hp);hp.connect(cg);cg.connect(out);
  // BODY — below the old corner, corner and gain both collapsing.
  const lp=ctx().createBiquadFilter();lp.type="lowpass";lp.Q.value=FLAT_Q;
  lp.frequency.setValueAtTime(p.split,t0);
  lp.frequency.exponentialRampToValueAtTime(p.bodyEndHz,t0+p.bodyDur);
  const bg=ctx().createGain();
  bg.gain.setValueAtTime(p.body,t0);bg.gain.exponentialRampToValueAtTime(.001,t0+p.bodyDur);
  n.connect(lp);lp.connect(bg);bg.connect(out);
  n.start(t0);n.stop(t0+p.bodyDur);
  // PUNCH — sine, dry, under 90 Hz by the end.
  const o=ctx().createOscillator();o.type="sine";
  o.frequency.setValueAtTime(p.punchHz,t0);
  o.frequency.exponentialRampToValueAtTime(p.punchEndHz,t0+p.punchDur);
  const pg=ctx().createGain();
  pg.gain.setValueAtTime(p.punch,t0);pg.gain.exponentialRampToValueAtTime(.001,t0+p.punchDur);
  o.connect(pg);pg.connect(out);o.start(t0);o.stop(t0+p.punchDur);}

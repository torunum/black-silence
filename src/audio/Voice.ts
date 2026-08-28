import { ctx, echoBus, masterBus } from "./AudioEngine";
import { bang, blip } from "./Sfx";
import { after } from "../core/Timers";

/**
 * GUTTURAL MONSTER VOICES (Doom/Blood style, not chiptune) — built from
 * filtered noise plus detuned low oscillators through a formant bandpass,
 * so they read as wet, throaty, organic — never clean beeps. docs/direction.md
 * names this synthesis as one of the five things worth preserving from the
 * original reference, "far better than chiptune beeps".
 *
 * Copied verbatim from reference/sonsurum.html lines 1713-1792 (see
 * tests/support/reference.ts's REF.noiseBuf/growl/gurgle/pain/deathCry/snarl),
 * with the reference's bare AC/masterG/echoG references replaced one-for-one
 * by calls to AudioEngine's ctx()/masterBus()/echoBus() accessors — every
 * frequency, detune ratio, filter Q, envelope time and gain is sound design
 * and is otherwise untouched.
 *
 * Every function keeps the reference's `if (!AC) return;` early exit (as
 * `if (!ctx()) return;`): the game calls these on paths that can run before
 * audioInit() and relies on them being silent no-ops rather than throwing.
 * noiseBuf itself has no such guard in the reference either — it is only
 * ever called from functions that have already checked ctx().
 */

export function noiseBuf(dur: number): AudioBuffer {
  const n=ctx().createBuffer(1,Math.max(1,ctx().sampleRate*dur|0),ctx().sampleRate);
  const d=n.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return n;}
/* low throaty growl: a roar with a formant + tremolo "vocal cords" */
export function growl(base: number, dur: number, vol?: number, echo?: boolean): void {
  if(!ctx())return;
  const t0=ctx().currentTime;
  const out=ctx().createGain();out.gain.value=vol||.5;out.connect(echo?echoBus():masterBus());
  // rumble oscillators (detuned, sub + body)
  [base,base*1.01,base*1.5,base*.5].forEach((f,i)=>{
    const o=ctx().createOscillator();o.type=i<2?"sawtooth":"square";
    o.frequency.setValueAtTime(f*1.15,t0);
    o.frequency.exponentialRampToValueAtTime(f*.7,t0+dur);
    const g=ctx().createGain();g.gain.value=(i<2?.6:.25);
    o.connect(g);g.connect(out);o.start(t0);o.stop(t0+dur);});
  // breathy noise layer through a moving bandpass (the "throat")
  const ns=ctx().createBufferSource();ns.buffer=noiseBuf(dur);
  const bp=ctx().createBiquadFilter();bp.type="bandpass";bp.Q.value=4;
  bp.frequency.setValueAtTime(420,t0);bp.frequency.linearRampToValueAtTime(160,t0+dur);
  const ng=ctx().createGain();ng.gain.value=.5;
  ns.connect(bp);bp.connect(ng);ng.connect(out);ns.start(t0);ns.stop(t0+dur);
  // vocal-cord tremolo
  const lfo=ctx().createOscillator();lfo.type="sine";lfo.frequency.value=22+Math.random()*18;
  const lg=ctx().createGain();lg.gain.value=vol*.5||.25;lfo.connect(lg);lg.connect(out.gain);
  lfo.start(t0);lfo.stop(t0+dur);
  // amplitude envelope
  out.gain.setValueAtTime(.0001,t0);
  out.gain.exponentialRampToValueAtTime(vol||.5,t0+.04);
  out.gain.exponentialRampToValueAtTime(.0001,t0+dur);}
/* wet gurgle / splatter — bubbling viscera */
export function gurgle(dur: number, vol?: number): void {
  if(!ctx())return;const t0=ctx().currentTime;
  const out=ctx().createGain();out.gain.value=vol||.4;out.connect(masterBus());
  const ns=ctx().createBufferSource();ns.buffer=noiseBuf(dur);
  const lp=ctx().createBiquadFilter();lp.type="lowpass";lp.frequency.value=900;
  ns.connect(lp);lp.connect(out);ns.start(t0);ns.stop(t0+dur);
  // burbling pitch wobble
  const o=ctx().createOscillator();o.type="sawtooth";
  o.frequency.setValueAtTime(120,t0);
  for(let i=0;i<6;i++)o.frequency.linearRampToValueAtTime(80+Math.random()*120,t0+dur*(i+1)/6);
  const og=ctx().createGain();og.gain.value=.3;o.connect(og);og.connect(out);
  o.start(t0);o.stop(t0+dur);
  out.gain.setValueAtTime(vol||.4,t0);out.gain.exponentialRampToValueAtTime(.0001,t0+dur);}
/* pain yelp — short rising-then-falling throaty cry */
export function pain(base: number, vol?: number): void {
  if(!ctx())return;const t0=ctx().currentTime,dur=.22;
  const out=ctx().createGain();out.gain.value=vol||.3;out.connect(echoBus());
  const o=ctx().createOscillator();o.type="sawtooth";
  o.frequency.setValueAtTime(base*1.4,t0);
  o.frequency.exponentialRampToValueAtTime(base*.6,t0+dur);
  const bp=ctx().createBiquadFilter();bp.type="bandpass";bp.Q.value=3;bp.frequency.value=base*2;
  o.connect(bp);bp.connect(out);
  const ns=ctx().createBufferSource();ns.buffer=noiseBuf(dur);
  const hp=ctx().createBiquadFilter();hp.type="highpass";hp.frequency.value=600;
  const ng=ctx().createGain();ng.gain.value=.25;ns.connect(hp);hp.connect(ng);ng.connect(out);
  ns.start(t0);ns.stop(t0+dur);
  o.start(t0);o.stop(t0+dur);
  out.gain.setValueAtTime(.0001,t0);out.gain.exponentialRampToValueAtTime(vol||.3,t0+.02);
  out.gain.exponentialRampToValueAtTime(.0001,t0+dur);}
/* death — guttural roar collapsing into a wet gurgle */
export function deathCry(base: number): void {
  if(!ctx())return;
  growl(base,.5,.5,true);
  after(()=>gurgle(.4,.4),180);}
/* sighting snarl per enemy archetype */
export function snarl(kind: string): void {
  if(!ctx())return;
  if(kind==="C"){growl(70,.7,.4,true);}          // cacodemon bellow
  else if(kind==="A"){growl(48,.9,.55,true);}    // mancubus deep groan
  else if(kind==="L"){blip(900,.18,"sawtooth",.14,1700,true);growl(220,.25,.25);} // lost soul shriek
  else if(kind==="j"){growl(180,.3,.2);bang(.06,.1,800);} // cultist chant-grunt
  else if(kind==="n"){growl(60,.7,.5,true);}     // ettin roar
  else if(kind==="k"){growl(70,.5,.4,true);blip(300,.12,"square",.08,160);} // slaughtaur
  else if(kind==="q"){blip(820,.2,"sawtooth",.12,1500,true);growl(180,.3,.25);} // afrit screech
  else if(kind==="R"){growl(90,.5,.35,true);blip(500,.2,"sine",.08,260,true);} // reiver wail
  else if(kind==="y"){growl(54,.6,.45,true);}    // gargoyle stone growl
  else if(kind==="s"){blip(680,.5,"sawtooth",.14,1500,true);growl(240,.4,.3,true);} // wailer
  else growl(110+Math.random()*60,.45,.32,true);} // generic ghoul moan

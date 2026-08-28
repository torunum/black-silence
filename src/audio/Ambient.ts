import { ctx, echoBus } from "./AudioEngine";
import { bang, blip } from "./Sfx";
import { gurgle, noiseBuf } from "./Voice";
import { after } from "../core/Timers";

/**
 * AMBIENT STINGERS — doors, bells, the piano and the boss music pulse.
 * Copied verbatim from reference/sonsurum.html lines 1794-1847 (see
 * tests/support/reference.ts's REF.wetDoor/stoneDoor/bellToll/organChord/
 * pianoNote/startBossMusic/stopBossMusic), with the reference's bare
 * AC/masterG/echoG references replaced one-for-one by calls to
 * AudioEngine's ctx()/masterBus()/echoBus() accessors — every frequency,
 * filter Q, envelope time and gain is otherwise untouched. wetDoor and
 * stoneDoor share Voice.ts's noiseBuf/gurgle, the same "wet, organic, not
 * chiptune" synthesis docs/direction.md calls out for the monster voices.
 *
 * Every function keeps the reference's `if (!AC) return;` early exit (as
 * `if (!ctx()) return;`): the game calls these on paths that can run before
 * audioInit() and relies on them being silent no-ops rather than throwing.
 *
 * bossPulse is the one piece of live mutable state in this module: the
 * reference declares it as a bare global (`let bossPulse=null` alongside
 * AC/masterG/echoG/masterVol) so that startBossMusic and stopBossMusic can
 * share it; here it is private module state for the same reason
 * AudioEngine.ts's AC/masterG/echoG are — an ES module binding can't be
 * exported as a live, externally-mutable `let`. startBossMusic's
 * `if(!ctx()||bossPulse)return;` guard is preserved exactly: without it, a
 * second call would layer a second setInterval and the pulse would double
 * in tempo instead of no-op'ing.
 */

let bossPulse: ReturnType<typeof setInterval> | null = null;

/* wet flesh door — tearing membrane, squelch, low organic groan */
export function wetDoor(): void {
  if(!ctx())return;const t0=ctx().currentTime,dur=1.1;
  const out=ctx().createGain();out.gain.value=.5;out.connect(echoBus());
  // squelch: lowpassed noise sweeping down (suction/tearing)
  const ns=ctx().createBufferSource();ns.buffer=noiseBuf(dur);
  const lp=ctx().createBiquadFilter();lp.type="lowpass";
  lp.frequency.setValueAtTime(1400,t0);lp.frequency.exponentialRampToValueAtTime(180,t0+dur);
  const ng=ctx().createGain();ng.gain.value=.6;
  ns.connect(lp);lp.connect(ng);ng.connect(out);ns.start(t0);ns.stop(t0+dur);
  // low organic groan underneath
  const o=ctx().createOscillator();o.type="sawtooth";
  o.frequency.setValueAtTime(60,t0);o.frequency.linearRampToValueAtTime(38,t0+dur);
  const bp=ctx().createBiquadFilter();bp.type="bandpass";bp.Q.value=5;bp.frequency.value=160;
  const og=ctx().createGain();og.gain.value=.4;
  o.connect(bp);bp.connect(og);og.connect(out);o.start(t0);o.stop(t0+dur);
  out.gain.setValueAtTime(.0001,t0);out.gain.exponentialRampToValueAtTime(.5,t0+.06);
  out.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  after(()=>gurgle(.4,.35),260);}
/* heavy stone/iron door — deep grind + low thud, no chiptune */
export function stoneDoor(): void {
  if(!ctx())return;const t0=ctx().currentTime,dur=.9;
  const out=ctx().createGain();out.gain.value=.45;out.connect(echoBus());
  const ns=ctx().createBufferSource();ns.buffer=noiseBuf(dur);
  const bp=ctx().createBiquadFilter();bp.type="bandpass";bp.Q.value=2;
  bp.frequency.setValueAtTime(300,t0);bp.frequency.linearRampToValueAtTime(90,t0+dur);
  const ng=ctx().createGain();ng.gain.value=.5;
  ns.connect(bp);bp.connect(ng);ng.connect(out);ns.start(t0);ns.stop(t0+dur);
  const o=ctx().createOscillator();o.type="square";
  o.frequency.setValueAtTime(44,t0);o.frequency.linearRampToValueAtTime(30,t0+dur);
  const og=ctx().createGain();og.gain.value=.3;o.connect(og);og.connect(out);
  o.start(t0);o.stop(t0+dur);
  out.gain.setValueAtTime(.0001,t0);out.gain.exponentialRampToValueAtTime(.45,t0+.05);
  out.gain.exponentialRampToValueAtTime(.0001,t0+dur);}
export function bellToll(): void {if(!ctx())return;
  [196,98,147].forEach((f,i)=>blip(f,2.6-i*.4,"sine",.05-i*.012,f*.99,true));}
export function organChord(): void {if(!ctx())return;
  [65.4,98,130.8,155.6].forEach(f=>blip(f,4,"square",.012,f*.995,true));}
export function pianoNote(midi: number): void {
  if(!ctx())return;
  const f=440*Math.pow(2,(midi-69)/12);
  [[f,"triangle",.12],[f*2,"sine",.04],[f*.5,"sine",.03]].forEach(([fr,t,v]:[number,OscillatorType,number])=>{
    const o=ctx().createOscillator(),g=ctx().createGain();
    o.type=t;o.frequency.value=fr;
    g.gain.setValueAtTime(v,ctx().currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx().currentTime+1.4);
    o.connect(g);g.connect(echoBus());o.start();o.stop(ctx().currentTime+1.4);});}
export function startBossMusic(): void {if(!ctx()||bossPulse)return;
  let beat=0;
  bossPulse=setInterval(()=>{
    bang(.09,.22,140);
    if(beat%2===1)bang(.05,.1,900,300);
    if(beat%4===3)blip(49,.25,"sawtooth",.07,46);
    beat++;},300);}
export function stopBossMusic(): void {if(bossPulse){clearInterval(bossPulse);bossPulse=null;}}

/**
 * THE AUDIO ENGINE — builds the WebAudio graph: the master gain bus, the
 * echo/delay feedback loop that distant or reverberant effects route
 * through, the ambience lowpass, and the four detuned drone oscillators
 * (each with its own slow LFO modulating its gain) that make up the game's
 * ambient bed. audioInit()'s body is copied verbatim from
 * reference/sonsurum.html lines 1650-1664 (see tests/support/reference.ts's
 * REF.audioInit) — every frequency, waveform, gain and LFO rate is sound
 * design and must never change.
 *
 * This is the first module in the port that owns live mutable state: AC,
 * masterG, echoG and masterVol are assigned after construction (by
 * audioInit, below) and read from several places across the game, including
 * the settings volume slider in legacy.js. ES module bindings are immutable
 * across module boundaries, so bare exported `let`s cannot work here — the
 * state stays private to this module and every other file reaches it only
 * through the accessor functions below. Every accessor is called at its
 * point of use, never hoisted into a cached local — the graph does not
 * exist until audioInit() runs, so a value captured any earlier would be
 * stale (or null) forever.
 */

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let AC: AudioContext | null = null;
let masterG: GainNode | null = null;
let echoG: GainNode | null = null;
let masterVol = 0.5;

export function ctx(): AudioContext | null {
  return AC;
}
export function masterBus(): GainNode | null {
  return masterG;
}
export function echoBus(): GainNode | null {
  return echoG;
}
export function isReady(): boolean {
  return AC !== null;
}
export function getMasterVolume(): number {
  return masterVol;
}

/** Sets the stored volume and, if the graph already exists, the master gain node's live value. */
export function setMasterVolume(v: number): void {
  masterVol = v;
  if (masterG) masterG.gain.value = masterVol;
}

/** Build the audio graph and start the ambient drone bed. Call once, on game start. */
export function audioInit(): void {
  AC=new (window.AudioContext||window.webkitAudioContext)();
  masterG=AC.createGain();masterG.gain.value=masterVol;masterG.connect(AC.destination);
  const dly=AC.createDelay(1);dly.delayTime.value=.34;
  const fb=AC.createGain();fb.gain.value=.42;
  echoG=AC.createGain();echoG.gain.value=1;
  echoG.connect(dly);dly.connect(fb);fb.connect(dly);dly.connect(masterG);
  const lp=AC.createBiquadFilter();lp.type="lowpass";lp.frequency.value=170;lp.connect(masterG);
  [[33,"sawtooth",.05],[49.5,"sine",.07],[24.7,"triangle",.06],[66,"sine",.025]].forEach(([f,t,g]:[number,OscillatorType,number])=>{
    const o=AC.createOscillator();o.type=t;o.frequency.value=f;
    const og=AC.createGain();og.gain.value=g;
    const lfo=AC.createOscillator();lfo.frequency.value=.05+Math.random()*.07;
    const lg=AC.createGain();lg.gain.value=g*.6;
    lfo.connect(lg);lg.connect(og.gain);
    o.connect(og);og.connect(lp);o.start();lfo.start();});}

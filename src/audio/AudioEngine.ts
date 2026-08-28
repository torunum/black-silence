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

/**
 * TYPE HONESTY NOTE (applies to ctx()/masterBus()/echoBus() below): all three
 * accessors are declared as returning their node type, never `| null`, even
 * though AC/masterG/echoG are genuinely null until audioInit() runs — the
 * declared type is stricter than the runtime guarantee.
 *
 * This is deliberate, not an oversight. Every one of the ~85 call sites
 * across src/audio/Voice.ts, Sfx.ts and Ambient.ts already opens with the
 * reference's own `if(!ctx())return;` guard, copied verbatim as part of a
 * dozen function bodies tests/fidelity.test.ts compares byte-for-byte
 * against reference/sonsurum.html — so those bodies cannot gain a second
 * narrowing line without breaking that comparison. But TypeScript cannot
 * narrow across a re-invoked function call: after `if(!ctx())return;`, a
 * later `ctx().createOscillator()` calls the accessor again and TS has no
 * way to know it returns the same value. A nullable return type is
 * therefore unfixable at those call sites without editing every one of
 * them — which is the `!`-at-85-sites problem in different clothing. Typing
 * the accessors as non-nullable moves the (real, honored) contract "call
 * this only after checking readiness" from the type system to the doc
 * comment: it satisfies every existing call site for free, but it also
 * means a *new* caller that forgets the guard gets no compile error and
 * fails at runtime instead — the type is asserting something the runtime
 * cannot fully guarantee. isReady() (below) is the actual runtime
 * predicate; check it (or the equivalent `if(!ctx())return;` early exit)
 * before calling any audio function, because the type of ctx() itself will
 * not stop you if you don't.
 */
export function ctx(): AudioContext {
  return AC as AudioContext;
}
export function masterBus(): GainNode {
  return masterG as GainNode;
}
export function echoBus(): GainNode {
  return echoG as GainNode;
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
  // AC is genuinely non-null here (assigned two statements above, in this
  // same synchronous call, with nothing in between that could reset it) —
  // but that narrowing doesn't extend into the forEach callback below since
  // it's a separate function scope closing over the module-level `let`.
  // Capturing it into a `const` here is a real (not asserted) narrowing:
  // unlike ctx()/masterBus()/echoBus() above, `ac` cannot be reassigned, so
  // TypeScript carries its non-null type into the closure honestly.
  const ac=AC;
  [[33,"sawtooth",.05],[49.5,"sine",.07],[24.7,"triangle",.06],[66,"sine",.025]].forEach(([f,t,g]:[number,OscillatorType,number])=>{
    const o=ac.createOscillator();o.type=t;o.frequency.value=f;
    const og=ac.createGain();og.gain.value=g;
    const lfo=ac.createOscillator();lfo.frequency.value=.05+Math.random()*.07;
    const lg=ac.createGain();lg.gain.value=g*.6;
    lfo.connect(lg);lg.connect(og.gain);
    o.connect(og);og.connect(lp);o.start();lfo.start();});}

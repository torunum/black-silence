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
 *
 * Plan 1 Task 3 adds one more piece of live state, `pendingPos`: the
 * position (if any) `emitAt()` armed for the next `masterBus()`/`echoBus()`
 * call. Every one of the ~85 call sites into those two accessors already
 * sits inside a function body, invoked at emission time (verified by
 * `grep -rn "masterBus()\|echoBus()" src/audio/*.ts`, ten of them outside
 * this file, none at module scope) — that is what lets a single shared
 * `pendingPos` turn any emitter positional without editing the emitter.
 * `pendingPos` starts `null`, same as every other module-scope literal
 * here, and nothing reads it before `emitAt()` has been called at least
 * once — there is no boot-ordering hazard the way reading a *loaded* value
 * at module scope would create (see Phase 1 Task 2's two bugs, both that
 * shape).
 */

import { save } from "../save/SaveGame";
import { flushSave } from "../save/persist";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let AC: AudioContext | null = null;
let masterG: GainNode | null = null;
let echoG: GainNode | null = null;
let masterVol = 0.5;
/** See the module doc comment's "Plan 1 Task 3" paragraph above. */
let pendingPos: { x: number; y: number; z: number } | null = null;

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
 *
 * masterBus()/echoBus() widen to `GainNode | PannerNode` below (Plan 1 Task
 * 3) — still never `| null`, so the same reasoning applies unchanged: every
 * existing call site only ever does `.connect(masterBus())`/`echoBus()`,
 * which accepts either node type identically, so the widening needs no
 * change at any of the ten call sites either.
 */
export function ctx(): AudioContext {
  return AC as AudioContext;
}
/**
 * The node a caller should connect a master-bus-routed sound into: `masterG`
 * itself when no position is pending, or a fresh `PannerNode` — positioned
 * there and connected to `masterG` — when `emitAt()` armed one. See
 * `busFor()` below for the panner's parameters and why each was picked.
 */
export function masterBus(): GainNode | PannerNode {
  return busFor(masterG as GainNode);
}
/** `echoBus()`'s counterpart to `masterBus()` above — same panner, into `echoG` instead. */
export function echoBus(): GainNode | PannerNode {
  return busFor(echoG as GainNode);
}
export function isReady(): boolean {
  return AC !== null;
}
export function getMasterVolume(): number {
  return masterVol;
}

/**
 * Arms the position the very next `masterBus()`/`echoBus()` call will use —
 * not the next *emitter function* call. Most emitters (`blip`, `bang`,
 * `boom`, `growl`, `gurgle`, `pain`, `wetDoor`, `stoneDoor`) call one of the
 * two accessors exactly once per call, so in practice "next accessor call"
 * and "next emitter call" coincide. A few (`pianoNote`'s three harmonics,
 * `bellToll`'s three tones, `organChord`'s four) call `echoBus()`/`blip()`
 * (which itself calls a bus accessor) more than once per call — for those,
 * only the first sub-call would be positioned under this contract. Task 3
 * gives nobody a position, so no caller exercises that edge yet; it is
 * recorded here for whoever writes Task 4's call sites.
 *
 * Not read at module scope, and not persisted — see the module doc
 * comment's "Plan 1 Task 3" paragraph for why that matters.
 */
export function emitAt(x: number, y: number, z: number): void {
  pendingPos = { x, y, z };
}

/**
 * Cancels a pending `emitAt()` before it is consumed by a `masterBus()`/
 * `echoBus()` call — the "changed my mind, this one is not positional after
 * all" case. `masterBus()`/`echoBus()` already clear `pendingPos` themselves
 * once they consume it (see `busFor()`), so this reset only matters for the
 * gap between `emitAt()` and the accessor call it was meant for; without it,
 * a cancelled position would still be sitting there for whatever the next
 * accessor call turns out to be.
 */
export function emitHere(): void {
  pendingPos = null;
}

/**
 * Shared implementation behind masterBus()/echoBus(): `target` unchanged
 * when nothing is pending, or a new `PannerNode` — positioned at the
 * pending coordinates and connected to `target` — when there is. Consumes
 * (clears) `pendingPos` as soon as it reads it, so the position affects
 * only this one call and never leaks into whatever calls masterBus()/
 * echoBus() next.
 *
 * A fresh panner every time, never a shared/cached one: these sounds are
 * short and the node is garbage the moment playback ends, so caching would
 * only save a cheap allocation while actively breaking simultaneous sounds
 * at different positions (they would all inherit whichever position was
 * set last).
 *
 * Every panner parameter is picked deliberately, not left at the Web Audio
 * default, because the default (`panningModel: "equalpower"`,
 * `distanceModel: "inverse"`, `refDistance: 1`, `maxDistance: 10000`,
 * `rolloffFactor: 1`) gets two of five right by coincidence and the other
 * three are wrong for this game's scale:
 *
 * - `panningModel: "HRTF"` — head-related transfer function panning, not
 *   the default `"equalpower"`. Equalpower only varies left/right gain; HRTF
 *   also filters for front/back and up/down cues, which is what actually
 *   sells "that gunshot is behind me" rather than just "that gunshot is to
 *   my right." More expensive per node, but these nodes live for at most a
 *   couple of seconds each.
 * - `distanceModel: "inverse"` — matches the plan and how real sound
 *   pressure falls off (~1/distance), so it reads as physical rather than a
 *   hand-tuned ramp. This is also the Web Audio default, kept rather than
 *   changed.
 * - `refDistance: 1` (world units; `CELL` in `src/world/Grid.ts` is `2`, so
 *   this is half a grid cell) — the radius inside which a sound is at full
 *   volume. The "inverse" model clamps distance to at least `refDistance`
 *   before computing gain, so **a sound at distance 0 — emitted exactly at
 *   the listener — resolves to gain 1 for any `refDistance > 0`**: this is
 *   the property the charter's "indistinguishable in level from today"
 *   requirement actually rests on, not the specific value chosen. `1` still
 *   matters for anything close-but-not-exactly-at-the-listener (a torch
 *   crackle a step away should not already be attenuating).
 * - `maxDistance: 60` (30 cells) — comfortably past the largest level's
 *   reach without being so large the far end of the "inverse" curve's floor
 *   collapses distant-but-still-in-level sounds to near silence. The camera
 *   itself is built with a far plane of `90` (`src/render/RenderCore.ts`),
 *   so `60` stays inside what the player can ever see.
 * - `rolloffFactor: 1` — the Web Audio default; a neutral 1/distance
 *   falloff, neither exaggerated nor flattened. Nothing about this game's
 *   scale argued for a different rate, so the default stood.
 *
 * `coneInnerAngle`/`coneOuterAngle`/`coneOuterGain` are left at their Web
 * Audio defaults (360/360/0 — omnidirectional). None of this game's sources
 * face a particular direction the way a real speaker cone or a character's
 * mouth would, so a directional cone would be inventing a fact the sound
 * design has no opinion on.
 *
 * `positionX`/`positionY`/`positionZ` are used directly, with no
 * `setPosition()` fallback: unlike `AudioListener` (see `Listener.ts`),
 * `PannerNode.positionX` has been in every engine this project targets
 * (evergreen browsers, and this repo's own `recordingAudioContext` test
 * double) for years, so there is no environment here that needs the
 * deprecated form for the panner specifically.
 */
function busFor(target: GainNode): GainNode | PannerNode {
  if (!pendingPos) return target;
  const { x, y, z } = pendingPos;
  pendingPos = null;
  const p = ctx().createPanner();
  p.panningModel = "HRTF";
  p.distanceModel = "inverse";
  p.refDistance = 1;
  p.maxDistance = 60;
  p.rolloffFactor = 1;
  p.positionX.value = x;
  p.positionY.value = y;
  p.positionZ.value = z;
  p.connect(target);
  return p;
}

/**
 * Sets the in-memory volume and, if the graph already exists, the master
 * gain node's live value — then writes through to `save.masterVolume` and
 * flushes it to storage, so a change survives a reload.
 *
 * This is also the only way a *loaded* volume reaches this module's private
 * `masterVol` (and, once `audioInit()` runs, `masterG`): `masterVol`
 * initialises to the reference's `0.5` at module scope, same as every other
 * module-scope literal in this port, and nothing else in this file ever
 * reads `save.masterVolume`. `src/ui/Menus.ts`'s volume IIFE calls this with
 * `save.masterVolume` at registration time (after `loadSave()` has run) for
 * exactly that reason — see the comment there.
 */
export function setMasterVolume(v: number): void {
  masterVol = v;
  if (masterG) masterG.gain.value = masterVol;
  save.masterVolume = v;
  flushSave();
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
  // Typed here, as a separate const, rather than an inline tuple annotation
  // on the callback parameter: strictFunctionTypes (Plan 0F Task 10) checks
  // an explicitly-annotated callback parameter contravariantly against
  // forEach's own (wider, string|number[]-inferred) parameter type and
  // rejects it. Annotating the array instead lets the callback's parameter
  // type come from plain contextual inference, which needs no such check.
  const drones: [number, OscillatorType, number][] = [[33,"sawtooth",.05],[49.5,"sine",.07],[24.7,"triangle",.06],[66,"sine",.025]];
  drones.forEach(([f,t,g])=>{
    const o=ac.createOscillator();o.type=t;o.frequency.value=f;
    const og=ac.createGain();og.gain.value=g;
    const lfo=ac.createOscillator();lfo.frequency.value=.05+Math.random()*.07;
    const lg=ac.createGain();lg.gain.value=g*.6;
    lfo.connect(lg);lg.connect(og.gain);
    o.connect(og);og.connect(lp);o.start();lfo.start();});}

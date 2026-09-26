/**
 * THE AUDIO ENGINE — builds the WebAudio graph: the mix every sound goes
 * into (`./Mix.ts`, since player feedback round 2 Task 2), the ambience
 * lowpass, and the four detuned drone oscillators (each with its own slow
 * LFO on its gain) that make up the game's ambient bed. The drone bed is the
 * reference's (reference/sonsurum.html 1650-1664, REF.audioInit) — every
 * frequency, waveform, gain and LFO rate range is sound design.
 *
 * This is the first module in the port that owns live mutable state: AC,
 * the mix and masterVol are assigned after construction (by
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
 *
 * The four LFO rates are drawn from `soundRandom()` (`./SoundRandom.ts`),
 * not `Math.random()`: player feedback round 2 Task 1 (KNOWN-22) took all
 * sound off the game's generator. Same ranges, different dice.
 *
 * PLAYER FEEDBACK ROUND 2 TASK 2 — THE MIX. The graph after a sound is no
 * longer built here: `audioInit` asks a `MixFactory` (`./Mix.ts`'s
 * `newMix` unless told otherwise) for it — a room, a glue compressor, a
 * limiter, a soft clip, the master volume. The reference's masterG/echoG
 * graph survives only on the sound board, as "Old mix"
 * (`src/soundboard/previous/mix.ts`), which is also what the tests that
 * compare sound bodies with the reference run on. Two more pieces of live
 * state come with it: the room the current level asked for (`setRoom`,
 * called by `loadLevel`), and `pendingLevel`, the level of the sound being
 * emitted (`voiced`, used by `./Levels.ts`) — a dynamic scope exactly like
 * `pendingPos`, carried into the sound's own delayed halves through
 * `src/core/Timers.ts`'s `carryIntoTimers`.
 */

import { save } from "../save/SaveGame";
import { flushSave } from "../save/persist";
import { carryIntoTimers } from "../core/Timers";
import { soundRandom } from "./SoundRandom";
import { DRY_SEND, ECHO_SEND, newMix, type Mix, type MixFactory } from "./Mix";
import type { RoomName } from "./Room";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let AC: AudioContext | null = null;
let mix: Mix | null = null;
let masterVol = 0.5;
/** See the module doc comment's "Plan 1 Task 3" paragraph above. */
let pendingPos: { x: number; y: number; z: number } | null = null;
/** The room the current level sounds in — kept here so a level loaded before audioInit() still gets it. */
let room: RoomName = "hall";

/**
 * A sound's level: its trim (linear gain) and how much more or less of it
 * goes to the room than its `echo` flag alone would send. `./Levels.ts`
 * resolves these from the loudness table.
 */
export interface Level {
  gain: number;
  room: number;
}
/** The level of the sound being emitted right now (see `voiced`), or null outside any. */
let pendingLevel: Level | null = null;
/** How many bus connections were made outside any level — see `unscopedConnections`. */
let unscoped = 0;

/**
 * Runs `emit` with every sound it makes at `level`. Nested scopes restore
 * the outer one on the way out (unlike `at()`, whose one position per
 * logical sound makes nesting meaningless): a catalogue sound that plays
 * another catalogue sound hands it over, then takes its own level back.
 * Carried into `after()` timers the sound schedules, below.
 */
export function voiced<T>(level: Level, emit: () => T): T {
  const outer = pendingLevel;
  pendingLevel = level;
  try {
    return emit();
  } finally {
    pendingLevel = outer;
  }
}

carryIntoTimers(() => {
  const level = pendingLevel;
  return level ? (fn) => voiced(level, fn) : null;
});

/**
 * Bus connections made with no level in scope, ever. Every sound the game
 * plays goes through a level (`./Levels.ts`) except the boss music pulse,
 * whose beats fire from a `setInterval` inside a body pinned byte-for-byte
 * to the reference — `tests/audio/mix.test.ts` holds that line.
 */
export function unscopedConnections(): number {
  return unscoped;
}

/**
 * TYPE HONESTY NOTE (ctx()/masterBus()/echoBus() below): declared
 * non-null, though AC and the mix are null until audioInit() runs. Every
 * call site in Voice.ts, Sfx.ts and Ambient.ts opens with the reference's
 * own `if(!ctx())return;`, inside bodies tests/fidelity.test.ts compares
 * byte-for-byte, and TypeScript cannot narrow across a re-invoked accessor,
 * so a nullable type would need a `!` at ~85 sites. The contract "check
 * isReady() (or `if(!ctx())return;`) first" lives in this comment, not the
 * type: a new caller that forgets it compiles and fails at runtime.
 * masterBus()/echoBus() return `GainNode | PannerNode` (Plan 1 Task 3);
 * every caller only `.connect()`s into them, which takes either.
 */
export function ctx(): AudioContext {
  return AC as AudioContext;
}
/**
 * The node a caller should connect a master-bus-routed sound into: the
 * mix's strip for the current level at `DRY_SEND` when no position is
 * pending, or a fresh `PannerNode` — positioned there and connected to that
 * strip — when `emitAt()` armed one. See `busFor()` below for the panner's
 * parameters and why each was picked.
 */
export function masterBus(): GainNode | PannerNode {
  return busFor(false);
}
/** `echoBus()`'s counterpart to `masterBus()` above — the same, at `ECHO_SEND`: more of it in the room. */
export function echoBus(): GainNode | PannerNode {
  return busFor(true);
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
 * Emits everything `emit()` produces from one world position, then clears it.
 *
 * **This is the form callers should reach for.** `emitAt`/`emitHere` are the
 * bare primitive and leak if a caller forgets the second half; `at()` cannot,
 * because the reset is in a `finally`. It also spans an emitter that makes
 * more than one sound — `snarl("k")` calls both `growl` and `blip`, and under
 * a consume-on-first-use contract only the growl would have been positioned.
 *
 *     at(e.x, e.h * 0.6, e.z, () => snarl(e.key));
 *
 * Nested calls are not supported and are not needed: one logical sound has one
 * position. The inner scope would restore `null` rather than the outer
 * position, so if a use for nesting ever appears, save and restore instead.
 */
export function at<T>(x: number, y: number, z: number, emit: () => T): T {
  pendingPos = { x, y, z };
  try {
    return emit();
  } finally {
    pendingPos = null;
  }
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
function busFor(echo: boolean): GainNode | PannerNode {
  const level = pendingLevel;
  if (!level) unscoped++;
  const target = (mix as Mix).route({
    echo,
    send: (echo ? ECHO_SEND : DRY_SEND) * (level ? level.room : 1),
    gain: level ? level.gain : 1,
  });
  if (!pendingPos) return target;
  const { x, y, z } = pendingPos;
  // Deliberately NOT cleared here. `snarl` alone calls two emitters for six of
  // its eleven branches, so a consume-on-first-use contract would position the
  // growl and leave the blip at the listener — half an enemy bark coming from
  // inside the player's head. The position lives until `emitHere()` or the end
  // of an `at()` scope, so every accessor call for one logical sound gets it.
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
 * `masterVol` (and, once `audioInit()` runs, the mix's output stage): `masterVol`
 * initialises to the reference's `0.5` at module scope, same as every other
 * module-scope literal in this port, and nothing else in this file ever
 * reads `save.masterVolume`. `src/ui/Menus.ts`'s volume IIFE calls this with
 * `save.masterVolume` at registration time (after `loadSave()` has run) for
 * exactly that reason — see the comment there.
 */
export function setMasterVolume(v: number): void {
  masterVol = v;
  if (mix) mix.setVolume(masterVol);
  save.masterVolume = v;
  flushSave();
}

/** The master volume the live graph's output stage is actually at, or null before `audioInit()`. */
export function liveVolume(): number | null {
  return mix ? mix.volume() : null;
}

/**
 * The room the current level sounds in (`./Room.ts`'s `roomFor`, called by
 * `src/world/LevelLoader.ts`'s `loadLevel`). Before `audioInit()` it is
 * remembered for the graph to come; after, the mix builds that room's
 * impulse response now — at the level load, not at the level's first shot.
 */
export function setRoom(r: RoomName): void {
  room = r;
  if (mix) mix.setRoom(r);
}

/** The room asked for last (`setRoom`), and the one the live graph has built, if any. */
export function currentRoom(): { wanted: RoomName; built: RoomName | null } {
  return { wanted: room, built: mix ? mix.room() : null };
}

/**
 * The two things the sound board (`soundboard.html`, `src/soundboard/`) needs
 * that the game does not — player feedback round 2 Task 1. Both default to
 * exactly what the game has always done, and the game passes neither.
 */
export interface AudioInitOptions {
  /**
   * Start the four-oscillator ambient drone bed. Default `true`. The board
   * turns it off so a sound can be judged on its own, not over a hum.
   */
  drones?: boolean;
  /**
   * Build the graph on this context instead of a new `AudioContext` — an
   * `OfflineAudioContext` renders a sound to samples that can be measured.
   * Every node this engine and its sounds create exists on
   * `BaseAudioContext`, which is why the cast below is honest in practice.
   */
  context?: BaseAudioContext;
  /**
   * The mix to build (`./Mix.ts`). Default `newMix`, the game's. The board
   * passes `src/soundboard/previous/mix.ts` to hear the pre-Task-2 mix; the
   * tests that compare sound bodies with the reference pass it too.
   */
  mix?: MixFactory;
}

/** Build the audio graph and start the ambient drone bed. Call once, on game start. */
export function audioInit(opts: AudioInitOptions = {}): void {
  AC=(opts.context as AudioContext|undefined)??new (window.AudioContext||window.webkitAudioContext)();
  mix=(opts.mix??newMix)(AC,masterVol,room);
  const lp=AC.createBiquadFilter();lp.type="lowpass";lp.frequency.value=170;lp.connect(mix.bed);
  // `ac`: a const, so its non-null type reaches the forEach closure below
  // (the module-level `let` would not narrow there). The drone table is
  // typed on the array, not the callback parameter, for strictFunctionTypes.
  const ac=AC;
  if(opts.drones===false)return;
  const drones: [number, OscillatorType, number][] = [[33,"sawtooth",.05],[49.5,"sine",.07],[24.7,"triangle",.06],[66,"sine",.025]];
  drones.forEach(([f,t,g])=>{
    const o=ac.createOscillator();o.type=t;o.frequency.value=f;
    const og=ac.createGain();og.gain.value=g;
    const lfo=ac.createOscillator();lfo.frequency.value=.05+soundRandom()*.07;
    const lg=ac.createGain();lg.gain.value=g*.6;
    lfo.connect(lg);lg.connect(og.gain);
    o.connect(og);og.connect(lp);o.start();lfo.start();});}

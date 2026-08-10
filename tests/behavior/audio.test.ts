// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { evalReference, REF, refSource } from "../support/reference";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import { seedRandom } from "../support/seededRandom";
import { audioInit as moduleAudioInit } from "../../src/audio/AudioEngine";
import { bang as moduleBang, blip as moduleBlip, boom as moduleBoom } from "../../src/audio/Sfx";
import { growl as moduleGrowl, snarl as moduleSnarl } from "../../src/audio/Voice";

/**
 * The audio half of the behavioral oracle (see tests/behavior/textures.test.ts's
 * doc comment for the overall rationale, and docs/known-issues.md KNOWN-5).
 *
 * The reference declares AC/masterG/echoG/masterVol as bare `let`s
 * (REF.audioState) that audioInit/blip/bang/boom/growl/snarl all close over
 * by name — unlike tests/fidelity.test.ts's byte-comparison entries, this
 * file actually *executes* that code, so REF.audioState must ride along in
 * the same evalReference call as every other audio chunk here, ahead of
 * them, so the bare `AC` etc. references resolve inside that one shared vm
 * script (Node's vm module gives top-level `let`s in a single script a
 * shared lexical scope — verified directly against Node's vm module before
 * relying on it here).
 *
 * The reference's audioInit does `new (window.AudioContext||...)()`, so
 * `window.AudioContext` is injected as a constructor function that simply
 * returns the pre-built recording ctx object — a constructor that
 * explicitly returns an object makes `new` use that object instead of a
 * fresh `this`, which is exactly what's needed to hand both the reference
 * and the module the very same recording surface. Math is injected
 * alongside document/THREE-style globals in tests/fidelity.test.ts,
 * because vm sandboxes get their own separate realm intrinsics: without
 * explicitly passing the *outer* Math object (the one seedRandom patches)
 * into the sandbox, the sandboxed code would call its own, unpatched
 * Math.random and the seed would silently do nothing (verified directly
 * against Node's vm module before relying on it here).
 *
 * Each function-under-test is exercised after a fresh audioInit() call (so
 * ctx()/masterBus()/echoBus() are populated, exactly like real usage), and
 * only the events logged *after* that setup are compared — audioInit gets
 * its own dedicated describe block below that compares its full log
 * instead.
 */

const AUDIO_CHUNKS = [
  refSource(REF.audioState),
  refSource(REF.audioInit),
  refSource(REF.blip),
  refSource(REF.bang),
  refSource(REF.boom),
  refSource(REF.noiseBuf),
  refSource(REF.growl),
  refSource(REF.snarl),
];
const AUDIO_EXPR = "({audioInit,blip,bang,boom,growl,snarl})";

interface RefAudioFns {
  audioInit: () => void;
  blip: (freq: number, dur: number, type?: string, vol?: number, slide?: number, echo?: boolean) => void;
  bang: (dur: number, vol?: number, low?: number, hi?: number) => void;
  boom: (power?: number) => void;
  growl: (base: number, dur: number, vol?: number, echo?: boolean) => void;
  snarl: (kind: string) => void;
}

/** A `new Ctor()` that always returns `target`, regardless of what's called on it — the trick that lets `new (window.AudioContext||...)()` hand back a pre-built recording context object instead of constructing a real one. */
function constructorReturning(target: unknown): new () => unknown {
  function Ctor(): unknown {
    return target;
  }
  return Ctor as unknown as new () => unknown;
}

function startReferenceAudioSession(seed: number): { fns: RefAudioFns; events: AudioEvent[]; restore: () => void } {
  const { ctx, events } = recordingAudioContext();
  const restoreRandom = seedRandom(seed);
  const fns = evalReference<RefAudioFns>(AUDIO_CHUNKS, AUDIO_EXPR, {
    window: { AudioContext: constructorReturning(ctx) },
    Math,
  });
  return { fns, events, restore: restoreRandom };
}

let restoreGlobalAudioContext: (() => void) | undefined;

function startModuleAudioSession(seed: number): { events: AudioEvent[]; restore: () => void } {
  const { ctx, events } = recordingAudioContext();
  const previous = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = constructorReturning(ctx);
  const restoreRandom = seedRandom(seed);
  const restore = () => {
    restoreRandom();
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = previous;
  };
  restoreGlobalAudioContext = restore;
  return { events, restore };
}

afterEach(() => {
  // Safety net: if an assertion throws mid-test, still undo the
  // window.AudioContext patch and the Math.random seed so a failure in one
  // test can't leak determinism/global state into the next.
  restoreGlobalAudioContext?.();
  restoreGlobalAudioContext = undefined;
});

describe("audioInit behavioral parity with reference", () => {
  it("builds an identical WebAudio graph for the echo loop, ambience lowpass and four-oscillator drone bed", () => {
    const ref = startReferenceAudioSession(10);
    ref.fns.audioInit();
    const referenceEvents = [...ref.events];
    ref.restore();

    const mod = startModuleAudioSession(10);
    moduleAudioInit();
    const moduleEvents = [...mod.events];
    mod.restore();

    // A recorder that can pass on an empty log proves nothing.
    expect(referenceEvents.length).toBeGreaterThan(50);
    expect(moduleEvents).toEqual(referenceEvents);
  });
});

describe("blip behavioral parity with reference", () => {
  it("schedules an identical oscillator+gain graph, including the harsh-waveform lowpass and echo-bus routing branches", () => {
    const ref = startReferenceAudioSession(11);
    ref.fns.audioInit();
    const refBaseline = ref.events.length;
    ref.fns.blip(440, 0.12, "square", 0.2, 900, false); // square -> lowpass branch, dry
    ref.fns.blip(660, 0.08, "sine", 0.15, 0, true); // sine -> no lowpass, echo bus
    const referenceEvents = ref.events.slice(refBaseline);
    ref.restore();

    const mod = startModuleAudioSession(11);
    moduleAudioInit();
    const modBaseline = mod.events.length;
    moduleBlip(440, 0.12, "square", 0.2, 900, false);
    moduleBlip(660, 0.08, "sine", 0.15, 0, true);
    const moduleEvents = mod.events.slice(modBaseline);
    mod.restore();

    expect(referenceEvents.length).toBeGreaterThan(10);
    expect(moduleEvents).toEqual(referenceEvents);
  });
});

describe("bang behavioral parity with reference", () => {
  it("schedules an identical buffer-source+filter(+highpass) graph", () => {
    const ref = startReferenceAudioSession(12);
    ref.fns.audioInit();
    const refBaseline = ref.events.length;
    ref.fns.bang(0.02, 0.3, 1200, 300); // hi given -> highpass branch
    ref.fns.bang(0.015, 0.18); // defaults -> no highpass
    const referenceEvents = ref.events.slice(refBaseline);
    ref.restore();

    const mod = startModuleAudioSession(12);
    moduleAudioInit();
    const modBaseline = mod.events.length;
    moduleBang(0.02, 0.3, 1200, 300);
    moduleBang(0.015, 0.18);
    const moduleEvents = mod.events.slice(modBaseline);
    mod.restore();

    expect(referenceEvents.length).toBeGreaterThan(10);
    expect(moduleEvents).toEqual(referenceEvents);
  });
});

describe("boom behavioral parity with reference", () => {
  it("schedules an identical sub-thud + noise-tail graph", () => {
    const ref = startReferenceAudioSession(13);
    ref.fns.audioInit();
    const refBaseline = ref.events.length;
    ref.fns.boom(1.2);
    const referenceEvents = ref.events.slice(refBaseline);
    ref.restore();

    const mod = startModuleAudioSession(13);
    moduleAudioInit();
    const modBaseline = mod.events.length;
    moduleBoom(1.2);
    const moduleEvents = mod.events.slice(modBaseline);
    mod.restore();

    expect(referenceEvents.length).toBeGreaterThan(10);
    expect(moduleEvents).toEqual(referenceEvents);
  });
});

describe("growl behavioral parity with reference", () => {
  it("schedules an identical rumble+throat+tremolo graph — the detuned oscillators, moving bandpass and vocal-cord LFO", () => {
    const ref = startReferenceAudioSession(14);
    ref.fns.audioInit();
    const refBaseline = ref.events.length;
    ref.fns.growl(70, 0.3, 0.4, true);
    const referenceEvents = ref.events.slice(refBaseline);
    ref.restore();

    const mod = startModuleAudioSession(14);
    moduleAudioInit();
    const modBaseline = mod.events.length;
    moduleGrowl(70, 0.3, 0.4, true);
    const moduleEvents = mod.events.slice(modBaseline);
    mod.restore();

    expect(referenceEvents.length).toBeGreaterThan(10);
    expect(moduleEvents).toEqual(referenceEvents);
  });
});

describe("snarl behavioral parity with reference", () => {
  it("dispatches identically per enemy archetype, including the Math.random-seeded generic-ghoul fallback", () => {
    const kinds = ["C", "L", "j", "unknown-fallback"];

    const ref = startReferenceAudioSession(15);
    ref.fns.audioInit();
    const refBaseline = ref.events.length;
    for (const kind of kinds) ref.fns.snarl(kind);
    const referenceEvents = ref.events.slice(refBaseline);
    ref.restore();

    const mod = startModuleAudioSession(15);
    moduleAudioInit();
    const modBaseline = mod.events.length;
    for (const kind of kinds) moduleSnarl(kind);
    const moduleEvents = mod.events.slice(modBaseline);
    mod.restore();

    expect(referenceEvents.length).toBeGreaterThan(10);
    expect(moduleEvents).toEqual(referenceEvents);
  });
});

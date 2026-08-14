// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { evalReference, REF, refSource } from "../support/reference";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import { seedRandom } from "../support/seededRandom";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
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
 * alongside document/THREE-style globals in tests/behavior/textures.test.ts,
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
 *
 * withReferenceAudioSession/withModuleAudioSession are callback-shaped
 * (rather than returning a `{ ..., restore }` the test calls manually) so
 * the seedRandom/window.AudioContext restore is inside a `try/finally` —
 * guaranteed to run even if something inside `run` throws, matching how
 * tests/behavior/textures.test.ts's recordCanvasCalls is structured. A
 * manual-restore-at-the-end shape does NOT give that guarantee: an
 * exception between session start and the manual restore call (a real bug
 * in the audio code under test, not just a failed assertion) would leak
 * the seeded Math.random into every test that runs afterward in this file.
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

/** Runs `run` against a fresh recording session built from the reference's audio functions, seeded for the duration. `run` gets both the reference functions and the live, still-growing `events` array, so callers can mark a baseline (e.g. right after audioInit()) and slice off just their own contribution. */
function withReferenceAudioSession<T>(seed: number, run: (fns: RefAudioFns, events: AudioEvent[]) => T): T {
  const { ctx, events } = recordingAudioContext();
  const restoreRandom = seedRandom(seed);
  try {
    const fns = evalReference<RefAudioFns>(AUDIO_CHUNKS, AUDIO_EXPR, {
      window: { AudioContext: constructorReturning(ctx) },
      Math,
    });
    return run(fns, events);
  } finally {
    restoreRandom();
  }
}

/** The module-side equivalent of withReferenceAudioSession: patches window.AudioContext to hand back the recording ctx, seeds Math.random, and guarantees both are undone in a finally. */
function withModuleAudioSession<T>(seed: number, run: (events: AudioEvent[]) => T): T {
  const { ctx, events } = recordingAudioContext();
  const previous = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = constructorReturning(ctx);
  const restoreRandom = seedRandom(seed);
  try {
    return run(events);
  } finally {
    restoreRandom();
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = previous;
  }
}

describe("audioInit behavioral parity with reference", () => {
  it("builds an identical WebAudio graph for the echo loop, ambience lowpass and four-oscillator drone bed", () => {
    const referenceEvents = withReferenceAudioSession(10, (fns, events) => {
      fns.audioInit();
      return [...events];
    });
    const moduleEvents = withModuleAudioSession(10, (events) => {
      moduleAudioInit();
      return [...events];
    });

    // A recorder that can pass on an empty log proves nothing.
    expect(referenceEvents.length).toBeGreaterThan(50);
    expectCallLogEqual(moduleEvents, referenceEvents, "audioInit event log");
  });
});

describe("blip behavioral parity with reference", () => {
  it("schedules an identical oscillator+gain graph, including the harsh-waveform lowpass branch, echo-bus routing, and the type/vol default-argument fallbacks", () => {
    const run = (fns: Pick<RefAudioFns, "blip">) => {
      fns.blip(440, 0.12, "square", 0.2, 900, false); // square -> lowpass branch, dry
      fns.blip(660, 0.08, "sine", 0.15, 0, true); // sine -> no lowpass, echo bus
      fns.blip(300, 0.05); // type/vol/slide/echo all omitted -> type||"square", vol||.15
    };

    const referenceEvents = withReferenceAudioSession(11, (fns, events) => {
      fns.audioInit();
      const baseline = events.length;
      run(fns);
      return events.slice(baseline);
    });
    const moduleEvents = withModuleAudioSession(11, (events) => {
      moduleAudioInit();
      const baseline = events.length;
      run({ blip: moduleBlip });
      return events.slice(baseline);
    });

    expect(referenceEvents.length).toBeGreaterThan(10);
    expectCallLogEqual(moduleEvents, referenceEvents, "blip call log");
  });
});

describe("bang behavioral parity with reference", () => {
  it("schedules an identical buffer-source+filter(+highpass) graph", () => {
    const run = (fns: Pick<RefAudioFns, "bang">) => {
      fns.bang(0.02, 0.3, 1200, 300); // hi given -> highpass branch
      fns.bang(0.015, 0.18); // low/hi omitted -> defaults
    };

    const referenceEvents = withReferenceAudioSession(12, (fns, events) => {
      fns.audioInit();
      const baseline = events.length;
      run(fns);
      return events.slice(baseline);
    });
    const moduleEvents = withModuleAudioSession(12, (events) => {
      moduleAudioInit();
      const baseline = events.length;
      run({ bang: moduleBang });
      return events.slice(baseline);
    });

    expect(referenceEvents.length).toBeGreaterThan(10);
    expectCallLogEqual(moduleEvents, referenceEvents, "bang call log");
  });
});

describe("boom behavioral parity with reference", () => {
  it("schedules an identical sub-thud + noise-tail graph, including the power default-argument fallback", () => {
    const run = (fns: Pick<RefAudioFns, "boom">) => {
      fns.boom(1.2);
      fns.boom(); // power omitted -> power||1
    };

    const referenceEvents = withReferenceAudioSession(13, (fns, events) => {
      fns.audioInit();
      const baseline = events.length;
      run(fns);
      return events.slice(baseline);
    });
    const moduleEvents = withModuleAudioSession(13, (events) => {
      moduleAudioInit();
      const baseline = events.length;
      run({ boom: moduleBoom });
      return events.slice(baseline);
    });

    expect(referenceEvents.length).toBeGreaterThan(10);
    expectCallLogEqual(moduleEvents, referenceEvents, "boom call log");
  });
});

describe("growl behavioral parity with reference", () => {
  it("schedules an identical rumble+throat+tremolo graph — the detuned oscillators, moving bandpass, vocal-cord LFO, and the vol/echo default-argument fallbacks", () => {
    const run = (fns: Pick<RefAudioFns, "growl">) => {
      fns.growl(70, 0.3, 0.4, true);
      fns.growl(90, 0.2); // vol/echo omitted -> vol||.5, vol*.5||.25, echo?...:masterBus()
    };

    const referenceEvents = withReferenceAudioSession(14, (fns, events) => {
      fns.audioInit();
      const baseline = events.length;
      run(fns);
      return events.slice(baseline);
    });
    const moduleEvents = withModuleAudioSession(14, (events) => {
      moduleAudioInit();
      const baseline = events.length;
      run({ growl: moduleGrowl });
      return events.slice(baseline);
    });

    expect(referenceEvents.length).toBeGreaterThan(10);
    expectCallLogEqual(moduleEvents, referenceEvents, "growl call log");
  });
});

describe("snarl behavioral parity with reference", () => {
  it("dispatches identically for every enemy archetype (C, A, L, j, n, k, q, R, y, s) plus the Math.random-seeded generic-ghoul fallback", () => {
    // Every branch of snarl's kind dispatch (src/audio/Voice.ts) — not a
    // sample, all eleven, so a change to any single archetype's call is
    // guaranteed to be caught rather than hoping the sampled subset happens
    // to include it.
    const kinds = ["C", "A", "L", "j", "n", "k", "q", "R", "y", "s", "unknown-fallback"];

    const referenceEvents = withReferenceAudioSession(15, (fns, events) => {
      fns.audioInit();
      const baseline = events.length;
      for (const kind of kinds) fns.snarl(kind);
      return events.slice(baseline);
    });
    const moduleEvents = withModuleAudioSession(15, (events) => {
      moduleAudioInit();
      const baseline = events.length;
      for (const kind of kinds) moduleSnarl(kind);
      return events.slice(baseline);
    });

    expect(referenceEvents.length).toBeGreaterThan(10);
    expectCallLogEqual(moduleEvents, referenceEvents, "snarl call log");
  });
});

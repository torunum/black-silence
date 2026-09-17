// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { seedRandom } from "../support/seededRandom";
import { installAudioStub } from "./gameplayTrace";

/**
 * Pins `installAudioStub` — the harness piece that keeps audio synthesis's
 * `Math.random()` draws out of the seeded gameplay stream.
 *
 * ## Why this test exists and the fixtures are not enough
 *
 * The three committed traces would notice the stub being deleted only as a
 * digest that no longer matches — a hash mismatch, with nothing saying that
 * audio was the cause. Worse, the failure they cannot show at all is the
 * *silent* one: a stack-sniffing check that stops matching (a renamed
 * directory, a different stack format, a bundler that rewrites frames) makes
 * every sound rejoin the gameplay stream, and the next person to regenerate
 * a fixture bakes that in. `installAudioStub`'s zero-intercept guard is the
 * alarm for that; this file is what proves the alarm and the mechanism it
 * guards actually work, by driving real sounds rather than a fixture.
 *
 * Every case below runs the **real** `src/audio` functions — `click()`,
 * `bang()` and `growl()`, the three shapes of draw the stub has to cover
 * (a preset, a direct noise-buffer fill, and per-call jitter around
 * `noiseBuf`) — not a fake that merely calls `Math.random()`.
 */

type Sfx = typeof import("../../src/audio/Sfx");
type Voice = typeof import("../../src/audio/Voice");
type MathUtil = typeof import("../../src/utils/math");

let sfx: Sfx;
let voice: Voice;
let mathUtil: MathUtil;

const SEED = 20260917;

/** Draws `n` values straight from a freshly seeded stream, with no stub installed. */
function seededDraws(n: number): number[] {
  const restore = seedRandom(SEED);
  try {
    return Array.from({ length: n }, () => Math.random());
  } finally {
    restore();
  }
}

beforeAll(async () => {
  installDomStubs();
  const engine = await import("../../src/audio/AudioEngine");
  // Every function in Sfx/Voice opens with `if(!ctx())return;`, so without a
  // live AudioContext this whole file would test a no-op and pass. The
  // "an unstubbed run really does shift the stream" case below is what
  // proves it did not: a silent no-op draws nothing and would fail there.
  engine.audioInit();
  sfx = await import("../../src/audio/Sfx");
  voice = await import("../../src/audio/Voice");
  mathUtil = await import("../../src/utils/math");
});

describe("installAudioStub keeps audio out of the seeded gameplay stream", () => {
  it("leaves the gameplay stream exactly where it was, across a sound", () => {
    const reference = seededDraws(2);

    const restoreSeed = seedRandom(SEED);
    const restoreStub = installAudioStub();
    let observed: number[];
    try {
      const before = Math.random();
      sfx.click();
      sfx.bang(0.05);
      voice.growl(120, 0.3);
      const after = Math.random();
      observed = [before, after];
    } finally {
      restoreStub();
      restoreSeed();
    }

    // The second draw is the load-bearing one: three sounds fired between
    // the two, and the gameplay stream handed out the very next value it
    // would have with no sound at all.
    expect(observed).toEqual(reference);
  });

  it("is not vacuous — the same sounds DO shift the stream when unstubbed", () => {
    const reference = seededDraws(2);

    const restoreSeed = seedRandom(SEED);
    let observed: number[];
    try {
      const before = Math.random();
      sfx.click();
      sfx.bang(0.05);
      voice.growl(120, 0.3);
      observed = [before, Math.random()];
    } finally {
      restoreSeed();
    }

    expect(observed[0]).toBe(reference[0]);
    // Same three sounds, no stub: the stream has moved on, which is exactly
    // the coupling the stub removes. If this ever passes as equal, the
    // sounds stopped drawing and the case above proves nothing.
    expect(observed[1]).not.toBe(reference[1]);
  });

  it("lets a non-audio draw through — including one made by src/utils/math", () => {
    const reference = seededDraws(3);

    const restoreSeed = seedRandom(SEED);
    const restoreStub = installAudioStub();
    let observed: number[];
    try {
      // `rnd` maps its draw onto [a,b); with a=0,b=1 it is the raw value, so
      // this compares the *stream*, not just "something random happened".
      observed = [Math.random(), mathUtil.rnd(0, 1), Math.random()];
      sfx.click(); // so the guard below has something to have intercepted
    } finally {
      restoreStub();
      restoreSeed();
    }

    expect(observed).toEqual(reference);
  });

  it("throws on restore if it intercepted nothing", () => {
    const restoreSeed = seedRandom(SEED);
    const restoreStub = installAudioStub();
    Math.random(); // a gameplay draw, and deliberately not a sound
    expect(() => restoreStub()).toThrow(/intercepted no Math\.random/);
    restoreSeed();
  });

  it("restores Math.random even when the guard fires", () => {
    const original = Math.random;
    const restoreStub = installAudioStub();
    expect(Math.random).not.toBe(original);
    expect(() => restoreStub()).toThrow();
    // The guard throws *after* putting Math.random back; a stub that leaked
    // past its own failure would poison every test that ran afterwards.
    expect(Math.random).toBe(original);
  });
});

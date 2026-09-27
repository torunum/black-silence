// @vitest-environment jsdom
import { runInThisContext } from "node:vm";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import { seedRandom } from "../support/seededRandom";
import { installAudioDrawGuard } from "./gameplayTrace";

/**
 * Sound draws no dice — player feedback round 2, Task 1, closing
 * `docs/known-issues.md` KNOWN-22.
 *
 * This file used to be `audioStub.test.ts`, the proof for a harness stub
 * (`installAudioStub`) that could divert sound's `Math.random()` draws away
 * from the seeded gameplay stream and was never wired in. Task 1 removed
 * the draws instead, so the property that stub existed to fake is now a
 * property of the game itself, and this file pins it on the game:
 *
 * 1. Real sounds, **no stub of any kind**, leave the seeded gameplay stream
 *    exactly where it was — and are not vacuous: they really built graphs.
 * 2. The guard every trace now runs under (`installAudioDrawGuard`, in
 *    `gameplayTrace.ts`) really would catch a sound that started drawing
 *    again, and really does let the game's own draws through.
 *
 * `tests/audio/soundSources.test.ts` is the static and exhaustive half: it
 * reads every file in `src/audio/` and plays every catalogue sound under a
 * `Math.random` that counts.
 */

type Sfx = typeof import("../../src/audio/Sfx");
type Voice = typeof import("../../src/audio/Voice");
type Ambient = typeof import("../../src/audio/Ambient");
type Engine = typeof import("../../src/audio/AudioEngine");
type Weapons = typeof import("../../src/audio/sounds/weapons");
let sfx: Sfx, voice: Voice, ambient: Ambient, engine: Engine, weapons: Weapons;
let events: AudioEvent[];

const SEED = 20260926;

beforeAll(async () => {
  installDomStubs();
  const rec = recordingAudioContext();
  events = rec.events;
  function Ctor(): unknown { return rec.ctx; }
  (globalThis as { AudioContext?: unknown }).AudioContext = Ctor;
  engine = await import("../../src/audio/AudioEngine");
  engine.audioInit();
  sfx = await import("../../src/audio/Sfx");
  voice = await import("../../src/audio/Voice");
  ambient = await import("../../src/audio/Ambient");
  weapons = await import("../../src/audio/sounds/weapons");
});

function seededDraws(n: number): number[] {
  const restore = seedRandom(SEED);
  try {
    return Array.from({ length: n }, () => Math.random());
  } finally {
    restore();
  }
}

/** One of every kind of draw sound used to make: noise fills, pitch jitter, an LFO rate, a wobble. */
function playEverySortOfSound(): void {
  sfx.bang(0.05, 0.3, 1200, 300);
  sfx.boom(1);
  sfx.click();
  // A layered weapon report (player feedback round 2 Task 3): its per-shot jitter is sound's own dice.
  for (const fire of weapons.WEAPON_FIRE_SOUNDS) fire();
  voice.growl(120, 0.3);
  voice.gurgle(0.2, 0.3);
  voice.pain(200, 0.1);
  voice.snarl("not-a-kind"); // the generic moan, the one snarl branch that jittered its pitch
  ambient.wetDoor();
  ambient.stoneDoor();
}

describe("sound leaves the seeded gameplay stream alone — no stub, no harness", () => {
  it("the gameplay draw after a burst of sound is the one it would have been with none", () => {
    const reference = seededDraws(2);
    const before = events.length;
    const restore = seedRandom(SEED);
    let observed: number[];
    try {
      const first = Math.random();
      playEverySortOfSound();
      observed = [first, Math.random()];
    } finally {
      restore();
    }
    expect(observed).toEqual(reference);
    // Not vacuous: all of that really synthesised — dozens of nodes, ten
    // noise sources among them.
    const made = events.slice(before);
    expect(made.length).toBeGreaterThan(100);
    expect(made.filter((e) => e.kind === "create" && e.detail.type === "AudioBufferSourceNode").length).toBeGreaterThanOrEqual(10);
  });

  it("audioInit itself draws nothing either (its four drone LFO rates used to)", () => {
    const reference = seededDraws(2);
    const restore = seedRandom(SEED);
    let observed: number[];
    try {
      const first = Math.random();
      engine.audioInit();
      observed = [first, Math.random()];
    } finally {
      restore();
    }
    expect(observed).toEqual(reference);
  });
});

/**
 * A function whose stack frame says it lives in `src/audio/`, so the guard
 * can be shown a sound drawing without anything in `src/` having to draw.
 * `runInThisContext`'s `filename` is what a stack trace prints for it.
 */
function drawAsIf(file: string): () => number {
  return runInThisContext("(function drawingSound(){ return Math.random(); })", { filename: file }) as () => number;
}

describe("installAudioDrawGuard — the trace harness's tripwire", () => {
  const AUDIO_FILE = join(__dirname, "..", "..", "src", "audio", "Pretend.ts");
  const GAME_FILE = join(__dirname, "..", "..", "src", "enemies", "Pretend.ts");

  it("throws on restore when a src/audio/ frame drew, and names it", () => {
    const restore = installAudioDrawGuard();
    drawAsIf(AUDIO_FILE)();
    expect(() => restore()).toThrow(/sound drew 1 value.*Pretend\.ts/);
  });

  it("lets the game's own draws through, including rnd() from src/utils/math", async () => {
    const { rnd } = await import("../../src/utils/math");
    const restore = installAudioDrawGuard();
    drawAsIf(GAME_FILE)();
    rnd(0, 1);
    Math.random();
    expect(() => restore()).not.toThrow();
  });

  it("does not change a single value it passes through", () => {
    const reference = seededDraws(3);
    const restoreSeed = seedRandom(SEED);
    const restore = installAudioDrawGuard();
    const observed = [Math.random(), drawAsIf(GAME_FILE)(), Math.random()];
    restore();
    restoreSeed();
    expect(observed).toEqual(reference);
  });

  it("restores Math.random even when it throws", () => {
    const original = Math.random;
    const restore = installAudioDrawGuard();
    expect(Math.random).not.toBe(original);
    drawAsIf(AUDIO_FILE)();
    expect(() => restore()).toThrow();
    expect(Math.random).toBe(original);
  });
});

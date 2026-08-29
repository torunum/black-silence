// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
import { audioInit, echoBus, emitAt, emitHere, masterBus } from "../../src/audio/AudioEngine";
import { blip } from "../../src/audio/Sfx";
import { renderState } from "../../src/render/Renderer";
import { updateListener } from "../../src/audio/Listener";
import blipBaselineHead3474437 from "./__fixtures__/blip-baseline-head-3474437.json";

/**
 * Plan 1 Task 3's own tests: the per-emission panner
 * (`src/audio/AudioEngine.ts`'s `emitAt()`/`emitHere()`/`masterBus()`/
 * `echoBus()`) and the WebAudio listener (`src/audio/Listener.ts`).
 *
 * `withModuleAudioSession`/`constructorReturning` mirror
 * `tests/behavior/audio.test.ts`'s helpers of the same name — patch
 * `window.AudioContext` to hand back a `recordingAudioContext()`, restore it
 * afterward. No `seedRandom` here: nothing under test in this file reads
 * `Math.random()` (unlike `blip`/`bang`/`growl` internals, `masterBus()`/
 * `echoBus()`/`emitAt()`/`updateListener()` are all pure with respect to it).
 *
 * `afterEach` calls `emitHere()`: `AudioEngine.ts`'s module state (including
 * `pendingPos`) persists across every `it()` in this file — vitest does not
 * reset modules between tests in the same file — so a position armed by one
 * test and never consumed would otherwise leak into whichever test runs
 * next. `audioInit()` does not clear `pendingPos` (there is no reason it
 * should; a caller mid-arming a position across a graph rebuild is not a
 * real scenario), so the tests below take care of it themselves.
 */

function constructorReturning(target: unknown): new () => unknown {
  function Ctor(): unknown {
    return target;
  }
  return Ctor as unknown as new () => unknown;
}

function withModuleAudioSession<T>(run: (events: AudioEvent[]) => T): T {
  const { ctx, events } = recordingAudioContext();
  const previous = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = constructorReturning(ctx);
  try {
    return run(events);
  } finally {
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = previous;
  }
}

/** Same as withModuleAudioSession, but lets the caller attach extra properties (e.g. a fake `listener`) onto the recording ctx before it is installed. */
function withConfiguredAudioSession<T>(configure: (ctx: Record<string, unknown>) => void, run: () => T): T {
  const { ctx } = recordingAudioContext();
  configure(ctx as Record<string, unknown>);
  const previous = (globalThis as unknown as { AudioContext?: unknown }).AudioContext;
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = constructorReturning(ctx);
  try {
    return run();
  } finally {
    (globalThis as unknown as { AudioContext?: unknown }).AudioContext = previous;
  }
}

afterEach(() => {
  emitHere();
});

describe("masterBus()/echoBus() — nothing regressed when no position is set", () => {
  // THE MOST IMPORTANT ASSERTION IN THIS TASK (brief, Step 5.1): with no
  // emitAt() call anywhere, blip()'s graph must be byte-for-byte what it was
  // on HEAD (3474437) before this task touched AudioEngine.ts — captured via
  // this exact scenario (see the fixture file's own generation, reproduced
  // in this test's arrange/act) before a single line of Task 3 code existed.
  it("blip()'s graph is identical to the one captured on HEAD, before Task 3", () => {
    const moduleEvents = withModuleAudioSession((events) => {
      audioInit();
      const baseline = events.length;
      blip(440, 0.12, "square", 0.2, 900, false); // square -> lowpass branch, dry (masterBus)
      blip(660, 0.08, "sine", 0.15, 0, true); // sine -> no lowpass, echo bus
      blip(300, 0.05); // defaults -> type||"square", vol||.15 (masterBus)
      return events.slice(baseline);
    });

    expect(blipBaselineHead3474437.length).toBeGreaterThan(10);
    expectCallLogEqual(moduleEvents, blipBaselineHead3474437 as unknown as AudioEvent[], "blip call log vs. HEAD baseline");
  });

  // Mutation: swap the x/z (or drop the reset) mutations below can't touch
  // this test — it never calls emitAt() — so it stays green under those and
  // only breaks if masterBus()/echoBus() themselves stop being transparent
  // pass-throughs when nothing is pending.
});

describe("masterBus()/echoBus() — emitAt() arms a positional panner", () => {
  it("masterBus() hands back a PannerNode positioned at emitAt()'s coordinates, connected into masterG", () => {
    withModuleAudioSession((events) => {
      audioInit();
      const baseline = events.length;
      emitAt(10, 0, 5);
      const bus = masterBus();

      const created = events.slice(baseline).filter((e) => e.kind === "create" && e.detail.type === "PannerNode");
      expect(created).toHaveLength(1);
      const pannerId = created[0].detail.node as string;
      expect((bus as unknown as Record<string, unknown>).positionX).toBeDefined();

      const paramsFor = (prop: string) =>
        events
          .slice(baseline)
          .filter((e) => e.kind === "param" && e.detail.node === pannerId && e.detail.prop === prop);

      // The exact coordinates, by axis name — not just "some connect
      // happened somewhere" — so a swapped x/z write is caught here rather
      // than passing by accident.
      expect(paramsFor("positionX").at(-1)?.detail.value).toBe(10);
      expect(paramsFor("positionY").at(-1)?.detail.value).toBe(0);
      expect(paramsFor("positionZ").at(-1)?.detail.value).toBe(5);

      // Every tuned parameter, by name and value — see AudioEngine.ts's
      // busFor() doc comment for why each was picked.
      expect(paramsFor("panningModel").at(-1)?.detail.value).toBe("HRTF");
      expect(paramsFor("distanceModel").at(-1)?.detail.value).toBe("inverse");
      expect(paramsFor("refDistance").at(-1)?.detail.value).toBe(1);
      expect(paramsFor("maxDistance").at(-1)?.detail.value).toBe(60);
      expect(paramsFor("rolloffFactor").at(-1)?.detail.value).toBe(1);

      // Connected into masterG (audioInit()'s first createGain() call is
      // masterG — always GainNode#1 in a fresh recording session), not the
      // raw destination.
      const wiring = events.slice(baseline).find((e) => e.kind === "connect" && e.detail.from === pannerId);
      expect(wiring?.detail.to).toBe("GainNode#1");
    });
  });

  it("echoBus() does the same into echoG", () => {
    withModuleAudioSession((events) => {
      audioInit();
      const baseline = events.length;
      emitAt(-3, 2, 7);
      echoBus();

      const created = events.slice(baseline).filter((e) => e.kind === "create" && e.detail.type === "PannerNode");
      expect(created).toHaveLength(1);
      const pannerId = created[0].detail.node as string;

      const paramsFor = (prop: string) =>
        events
          .slice(baseline)
          .filter((e) => e.kind === "param" && e.detail.node === pannerId && e.detail.prop === prop);
      expect(paramsFor("positionX").at(-1)?.detail.value).toBe(-3);
      expect(paramsFor("positionY").at(-1)?.detail.value).toBe(2);
      expect(paramsFor("positionZ").at(-1)?.detail.value).toBe(7);

      // audioInit() builds echoG third (masterG, the feedback gain, then
      // echoG) — always GainNode#3 in a fresh recording session.
      const wiring = events.slice(baseline).find((e) => e.kind === "connect" && e.detail.from === pannerId);
      expect(wiring?.detail.to).toBe("GainNode#3");
    });
  });
});

describe("masterBus()/echoBus() — a position affects exactly one emission", () => {
  it("a second masterBus() call, with no new emitAt(), gets the plain bus back — not a second panner", () => {
    withModuleAudioSession((events) => {
      audioInit();
      emitAt(10, 0, 5);
      const first = masterBus();
      const second = masterBus(); // no emitAt() in between

      const panners = events.filter((e) => e.kind === "create" && e.detail.type === "PannerNode");
      expect(panners).toHaveLength(1);

      expect((first as unknown as Record<string, unknown>).positionX).toBeDefined();
      expect((second as unknown as Record<string, unknown>).positionX).toBeUndefined();
      expect((second as unknown as Record<string, unknown>).gain).toBeDefined();
    });
  });

  it("emitHere() cancels a pending emitAt() before it is ever consumed", () => {
    withModuleAudioSession((events) => {
      audioInit();
      emitAt(10, 0, 5);
      emitHere(); // changed my mind — nothing has read the position yet
      const bus = masterBus();

      const panners = events.filter((e) => e.kind === "create" && e.detail.type === "PannerNode");
      expect(panners).toHaveLength(0);
      expect((bus as unknown as Record<string, unknown>).gain).toBeDefined();
    });
  });
});

/** A minimal camera stand-in: only the three members Listener.ts reads. */
function fakeCamera(pos: [number, number, number], dir: [number, number, number], up: [number, number, number]) {
  return {
    position: { x: pos[0], y: pos[1], z: pos[2] },
    up: { x: up[0], y: up[1], z: up[2] },
    getWorldDirection(target: THREE.Vector3) {
      target.set(dir[0], dir[1], dir[2]);
      return target;
    },
  } as unknown as THREE.PerspectiveCamera;
}

describe("updateListener()", () => {
  it("writes the camera's position/forward/up through positionX/forwardX/upX when the listener exposes them", () => {
    const written: Record<string, number> = {};
    const param = (name: string) => ({
      get value() {
        return written[name];
      },
      set value(v: number) {
        written[name] = v;
      },
    });
    const fakeListener = {
      positionX: param("positionX"), positionY: param("positionY"), positionZ: param("positionZ"),
      forwardX: param("forwardX"), forwardY: param("forwardY"), forwardZ: param("forwardZ"),
      upX: param("upX"), upY: param("upY"), upZ: param("upZ"),
    };

    withConfiguredAudioSession(
      (ctx) => {
        ctx.listener = fakeListener;
      },
      () => {
        audioInit();
        renderState.camera = fakeCamera([3, 1.6, -2], [0, 0, -1], [0, 1, 0]);
        updateListener();

        expect(written.positionX).toBe(3);
        expect(written.positionY).toBe(1.6);
        expect(written.positionZ).toBe(-2);
        expect(written.forwardX).toBe(0);
        expect(written.forwardY).toBe(0);
        expect(written.forwardZ).toBe(-1);
        expect(written.upX).toBe(0);
        expect(written.upY).toBe(1);
        expect(written.upZ).toBe(0);
      },
    );
  });

  it("falls back to the deprecated setPosition()/setOrientation() when positionX is absent — the jsdom/older-Safari shape", () => {
    const calls: { position?: number[]; orientation?: number[] } = {};
    const fakeListener = {
      setPosition(x: number, y: number, z: number) {
        calls.position = [x, y, z];
      },
      setOrientation(fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) {
        calls.orientation = [fx, fy, fz, ux, uy, uz];
      },
    };

    withConfiguredAudioSession(
      (ctx) => {
        ctx.listener = fakeListener;
      },
      () => {
        audioInit();
        renderState.camera = fakeCamera([5, 0, 9], [1, 0, 0], [0, 1, 0]);
        updateListener();

        expect(calls.position).toEqual([5, 0, 9]);
        expect(calls.orientation).toEqual([1, 0, 0, 0, 1, 0]);
      },
    );
  });

  it("does not throw when the context has no listener at all", () => {
    withConfiguredAudioSession(
      () => {
        /* recordingAudioContext's ctx has no `listener` by default */
      },
      () => {
        audioInit();
        renderState.camera = fakeCamera([0, 0, 0], [0, 0, -1], [0, 1, 0]);
        expect(() => updateListener()).not.toThrow();
      },
    );
  });
});

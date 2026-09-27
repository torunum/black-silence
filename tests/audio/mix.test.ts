// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import { audioInit, currentRoom, liveVolume, masterBus, echoBus, setMasterVolume, setRoom } from "../../src/audio/AudioEngine";
import { CLIP, GLUE, LIMIT, newMix, softClipCurve } from "../../src/audio/Mix";
import { buildImpulse, fillImpulse, ROOM_NAMES, ROOMS, roomFor, type RoomName } from "../../src/audio/Room";
import { LEVELS } from "../../src/world/levels/index";

/**
 * THE MIX AND THE ROOMS — player feedback round 2, Task 2
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`).
 * `src/audio/Mix.ts` and `src/audio/Room.ts`. What has to be true:
 *
 * 1. The chain ends in a limiter and a soft clip whose curve cannot leave
 *    [-ceiling, ceiling], then the master volume clamped to [0, 1] — so the
 *    output is bounded below 0 dBFS by construction, whatever goes in. (The
 *    measured worst case is in `docs/sound-levels.md`.)
 * 2. Every sound reaches a convolver whose impulse response is the level's
 *    room: non-silent, deterministic, decaying, unit-energy.
 * 3. A level's theme picks its room.
 */

function constructorReturning(target: unknown): new () => unknown {
  function Ctor(): unknown { return target; }
  return Ctor as unknown as new () => unknown;
}

function session(): { events: AudioEvent[]; ctx: Record<string, unknown> } {
  const { ctx, events } = recordingAudioContext();
  (globalThis as { AudioContext?: unknown }).AudioContext = constructorReturning(ctx);
  return { events, ctx: ctx as Record<string, unknown> };
}

const outs = (events: AudioEvent[], from: string): string[] =>
  events.filter((e) => e.kind === "connect" && e.detail.from === from).map((e) => e.detail.to as string);
const paramOf = (events: AudioEvent[], node: string, prop: string): unknown =>
  events.filter((e) => e.kind === "param" && e.detail.node === node && e.detail.prop === prop).at(-1)?.detail.value;
const created = (events: AudioEvent[], type: string): string[] =>
  events.filter((e) => e.kind === "create" && e.detail.type === type).map((e) => e.detail.node as string);

afterEach(() => {
  setMasterVolume(0.5);
  setRoom("hall");
});

describe("the master chain", () => {
  it("runs sum -> glue compressor -> limiter -> soft clip -> master volume -> speakers, and nothing else reaches the speakers", () => {
    const { events } = session();
    audioInit({ drones: false });
    const [glue, limit] = created(events, "DynamicsCompressorNode");
    const [clip] = created(events, "WaveShaperNode");
    expect(outs(events, glue)).toEqual([limit]);
    expect(outs(events, limit)).toEqual([clip]);
    const [vol] = outs(events, clip);
    expect(outs(events, vol)).toEqual(["destination"]);
    const toSpeakers = events.filter((e) => e.kind === "connect" && e.detail.to === "destination");
    expect(toSpeakers).toHaveLength(1);
    // The glue is gentle, the limiter is a limiter.
    for (const [k, v] of Object.entries(GLUE)) expect(paramOf(events, glue, k), `glue ${k}`).toBe(v);
    for (const [k, v] of Object.entries(LIMIT)) expect(paramOf(events, limit, k), `limit ${k}`).toBe(v);
    expect(LIMIT.ratio).toBeGreaterThanOrEqual(20);
    expect(LIMIT.knee).toBe(0);
    expect(GLUE.ratio).toBeLessThanOrEqual(3);
    // The soft clip: its curve is bounded under full scale, and not oversampled (a reconstruction filter could ring past it).
    const curve = paramOf(events, clip, "curve") as { length: number; min: number; max: number };
    expect(curve.max).toBeLessThan(1);
    expect(curve.min).toBeGreaterThan(-1);
    expect(paramOf(events, clip, "oversample")).toBe("none");
  });

  it("a sound goes into the chain, never around it", () => {
    const { events } = session();
    audioInit({ drones: false });
    const baseline = events.length;
    masterBus();
    const [glue] = created(events, "DynamicsCompressorNode");
    const stripId = created(events.slice(baseline), "GainNode")[0];
    // strip -> sum -> glue
    const sum = outs(events, stripId).find((t) => outs(events, t).includes(glue));
    expect(sum, "the strip feeds the node the glue compressor reads").toBeDefined();
  });

  it("the soft-clip curve is the identity below its knee and never reaches the ceiling", () => {
    const c = softClipCurve(4097);
    const at = (x: number) => c[Math.round(((x + 1) / 2) * (c.length - 1))];
    for (const x of [-0.8, -0.5, -0.1, 0, 0.3, 0.7, 0.8]) expect(at(x)).toBeCloseTo(x, 3);
    for (const x of [0.9, 0.99, 1]) {
      expect(at(x)).toBeLessThan(CLIP.ceiling);
      expect(at(x)).toBeLessThan(x);
    }
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThanOrEqual(c[i - 1]); // monotonic: no fold-back
    expect(CLIP.ceiling).toBeLessThan(1);
  });

  it("the master volume is the last stage and is clamped to [0, 1], so the output cannot exceed the clip's ceiling", () => {
    session();
    audioInit({ drones: false });
    setMasterVolume(0.8);
    expect(liveVolume()).toBe(0.8);
    setMasterVolume(3);
    expect(liveVolume()).toBe(1);
    setMasterVolume(-1);
    expect(liveVolume()).toBe(0);
  });
});

describe("the room", () => {
  it("every room's impulse response is two non-silent, unit-energy, decaying channels of 1-3 s", () => {
    for (const room of ROOM_NAMES) {
      const spec = ROOMS[room];
      expect(spec.seconds, room).toBeGreaterThanOrEqual(1);
      expect(spec.seconds, room).toBeLessThanOrEqual(3);
      for (const ch of [0, 1]) {
        const d = new Float32Array(Math.ceil(spec.seconds * 44100));
        fillImpulse(d, 44100, spec, 1234 + ch);
        let e = 0, head = 0, tail = 0;
        const tenth = Math.floor(d.length / 10);
        for (let i = 0; i < d.length; i++) {
          e += d[i] * d[i];
          if (i < tenth) head += d[i] * d[i];
          if (i >= d.length - tenth) tail += d[i] * d[i];
        }
        expect(e, room).toBeCloseTo(1, 4);
        expect(head, `${room}: its energy is at the start`).toBeGreaterThan(0.1);
        expect(tail / head, `${room}: and it dies away (> 40 dB down by the last tenth)`).toBeLessThan(1e-4);
        expect(Math.abs(d[d.length - 1]), `${room}: ends at silence, so it cannot click`).toBe(0);
      }
    }
  });

  it("is deterministic — the same room gives the same samples, a different room different ones — and draws no dice", () => {
    const { ctx } = recordingAudioContext();
    const real = Math.random;
    let draws = 0;
    Math.random = () => { draws++; return real(); };
    try {
      const a = buildImpulse(ctx as unknown as BaseAudioContext, "hall");
      const b = buildImpulse(ctx as unknown as BaseAudioContext, "hall");
      const c = buildImpulse(ctx as unknown as BaseAudioContext, "hell");
      // Compared by a loop, not toEqual: a failing deep diff of 115,200 floats takes minutes.
      const differ = (x: Float32Array, y: Float32Array): number => { let n = x.length === y.length ? 0 : 1; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) n++; return n; };
      expect(differ(a.getChannelData(0), b.getChannelData(0)), "samples that differ, channel 0").toBe(0);
      expect(differ(a.getChannelData(1), b.getChannelData(1)), "samples that differ, channel 1").toBe(0);
      expect(a.getChannelData(0)[2000]).not.toBe(a.getChannelData(1)[2000]); // two channels, decorrelated
      expect(differ(a.getChannelData(0).slice(0, 5000), c.getChannelData(0).slice(0, 5000))).toBeGreaterThan(4000);
    } finally {
      Math.random = real;
    }
    expect(draws).toBe(0);
  });

  it("hell is larger and darker than the stone hall; flesh is the closest and shortest", () => {
    // Darkness: the share of high-frequency energy (first difference) in the tail's second half.
    const bright = (room: RoomName): number => {
      const d = new Float32Array(Math.ceil(ROOMS[room].seconds * 44100));
      fillImpulse(d, 44100, ROOMS[room], 99);
      let hf = 0, all = 0;
      for (let i = Math.floor(d.length * 0.3); i < d.length; i++) { hf += (d[i] - d[i - 1]) ** 2; all += d[i] * d[i]; }
      return hf / all;
    };
    expect(ROOMS.hell.rt60).toBeGreaterThan(ROOMS.hall.rt60);
    expect(ROOMS.hell.predelay).toBeGreaterThan(ROOMS.hall.predelay);
    expect(bright("hell")).toBeLessThan(bright("hall"));
    for (const r of ROOM_NAMES) if (r !== "flesh") {
      expect(ROOMS.flesh.rt60, r).toBeLessThan(ROOMS[r].rt60);
      expect(ROOMS.flesh.predelay, r).toBeLessThan(ROOMS[r].predelay);
    }
  });

  it("a positioned or unpositioned sound, dry or echo, reaches a convolver holding the room's impulse, built only when first needed", () => {
    const { events } = session();
    setRoom("flesh");
    audioInit({ drones: false });
    expect(created(events, "ConvolverNode"), "nothing built before a sound needs it").toHaveLength(0);
    expect(currentRoom()).toEqual({ wanted: "flesh", built: null });
    echoBus();
    const [conv] = created(events, "ConvolverNode");
    expect(conv).toBeDefined();
    expect(paramOf(events, conv, "normalize")).toBe(false);
    const buffer = paramOf(events, conv, "buffer") as string;
    const args = events.find((e) => e.kind === "create" && e.detail.node === buffer)!.detail.args as number[];
    expect(args).toEqual([2, Math.ceil(ROOMS.flesh.seconds * 44100), 44100]);
    expect(currentRoom().built).toBe("flesh");
    // The return level is the room's.
    const ret = outs(events, conv)[0];
    expect(paramOf(events, ret, "gain")).toBe(ROOMS.flesh.wet);
  });

  it("changing the room after the graph exists builds the new one at once and drops the old, and a room already built is reused", () => {
    const { events } = session();
    audioInit({ drones: false });
    setRoom("hell");
    setRoom("hall");
    setRoom("hell");
    const convs = created(events, "ConvolverNode");
    expect(convs).toHaveLength(3);
    expect(created(events, "AudioBuffer"), "two impulses, the third install reused hell's").toHaveLength(2);
    const disconnected = events.filter((e) => e.kind === "connect" && e.detail.to === null).map((e) => e.detail.from);
    expect(disconnected).toEqual(expect.arrayContaining([convs[0], convs[1]]));
    expect(currentRoom().built).toBe("hell");
  });

  it("the mix builds no room at all for a context that plays nothing", () => {
    const { ctx, events } = recordingAudioContext();
    newMix(ctx as unknown as BaseAudioContext, 0.5, "hall");
    expect(created(events, "ConvolverNode")).toHaveLength(0);
    expect(created(events, "AudioBuffer")).toHaveLength(0);
  });
});

describe("each level's theme picks its room", () => {
  it("prologue is hell, the womb is flesh, dungeon/church/necropolis are the stone hall, and the others their own", () => {
    const rooms = LEVELS.map((l) => roomFor(l));
    expect(rooms).toEqual(["hell", "hall", "hall", "hall", "graveyard", "sewer", "factory", "flesh"]);
    // Every room is used by some level.
    expect(new Set(rooms)).toEqual(new Set(ROOM_NAMES));
  });
});

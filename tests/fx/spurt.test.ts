// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { gorePit } from "../support/goreWorld";
import { watchRandom } from "../support/randomWatch";

const beats = vi.hoisted(() => ({ times: [] as number[], clock: { t: 0 } }));
vi.mock("../../src/audio/sounds/gore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/audio/sounds/gore")>();
  return { ...actual, spurtPulse: () => { beats.times.push(beats.clock.t); } };
});

/**
 * A STUMP THAT SPURTS (impact plan, Task 3): a neck, a shoulder or a hip
 * pumping in pulses that slow and weaken as the heart empties, with a thread
 * between them, carried with the body as it staggers and falls, ending when
 * it has run dry or the body is gone. Twelve at a time.
 */

let U: typeof import("../../src/fx/Spurt");
let D: typeof import("../../src/fx/GoreDrops");
let SP: typeof import("../../src/fx/Splats");
beforeAll(async () => {
  installDomStubs();
  U = await import("../../src/fx/Spurt");
  D = await import("../../src/fx/GoreDrops");
  SP = await import("../../src/fx/Splats");
});

type Host = import("../../src/fx/Spurt").SpurtHost;
const host = (x = 24, z = 24): Host => ({ x, z, h: 1.8, w: 1.2, fy: 0, sp: { position: { x, y: 0.9, z }, material: { rotation: 0 } } });

beforeEach(() => { gorePit(); beats.times.length = 0; beats.clock.t = 0; });

/** Runs `secs` of 60 fps frames, recording the live gout count right after each frame that had a beat (what the pulse threw). */
function run(secs: number, onFrame?: (t: number) => void): { thrown: number[] } {
  const thrown: number[] = [];
  for (let i = 0; i < secs * 60; i++) {
    const beatsBefore = beats.times.length, before = D.dropStats().drops;
    beats.clock.t = (i + 1) / 60;
    U.spurtTick(1 / 60);
    D.dropTick(1 / 60);
    if (beats.times.length > beatsBefore) thrown.push(D.dropStats().drops - before);
    onFrame?.(beats.clock.t);
  }
  return { thrown };
}

describe("a neck", () => {
  it("pumps in pulses for about 2.8 seconds, each a little later than the last", () => {
    U.startSpurt(host(), U.NECK, 0, 0.3, 0, 1, 0);
    expect(U.spurtCount()).toBe(1);
    run(3);
    expect(beats.times.length, "pulses").toBeGreaterThanOrEqual(5);
    expect(beats.times.length).toBeLessThanOrEqual(9);
    const gaps = beats.times.slice(1).map((t, i) => t - beats.times[i]);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i], `gap ${i}`).toBeGreaterThanOrEqual(gaps[i - 1] - 1 / 60);
    expect(gaps[0]).toBeGreaterThan(0.28); expect(gaps[0]).toBeLessThan(0.4);
    expect(Math.max(...gaps)).toBeLessThan(0.7);
    expect(U.spurtCount(), "dry").toBe(0);
    expect(beats.times[beats.times.length - 1], "the last beat is before it ended").toBeLessThan(U.LIFE[U.NECK]);
  });

  it("each pulse throws fewer and weaker gouts than the one before: it starts a fountain and ends a dribble", () => {
    U.startSpurt(host(), U.NECK, 0, 0.3, 0, 1, 0);
    const { thrown } = run(3);
    expect(thrown.length).toBeGreaterThanOrEqual(5);
    expect(thrown[0]).toBeGreaterThanOrEqual(20);
    expect(thrown[thrown.length - 1]).toBeLessThanOrEqual(thrown[0] * 0.55);
    for (let i = 1; i < thrown.length; i++) expect(thrown[i]).toBeLessThanOrEqual(thrown[i - 1] + 1);
  });

  it("throws up: a neck's drops are above the stump a moment after a pulse", () => {
    const h = host();
    U.startSpurt(h, U.NECK, 0, 0.3, 0, 0, 0);
    run(0.05);
    for (let i = 0; i < 12; i++) { U.spurtTick(0); D.dropTick(1 / 60); }
    const p = D.dropStats().dropPoints!.geometry.attributes.position.array as Float32Array;
    let above = 0, live = 0;
    for (let i = 0; i < D.DROP_MAX; i++) if (p[i * 3 + 1] > -99) { live++; if (p[i * 3 + 1] > 0.9 + 0.54 + 0.3) above++; }
    expect(live).toBeGreaterThan(10);
    expect(above).toBeGreaterThan(live / 2);
  });

  it("leaves blood on the floor round it as it pumps", () => {
    U.startSpurt(host(), U.NECK, 0, 0.3, 0, 1, 0);
    run(3);
    run(2);   // the last drops land
    expect(D.dropStats().drops, "every drop has landed").toBe(0);
    expect(SP.splatStats().blobs, "and left its pools").toBeGreaterThan(6);
  });
});

describe("a stump goes where the body goes", () => {
  it("is carried by the sprite: it follows the body's place, and turns with it as it falls", () => {
    const h = host(24, 24);
    const out = { x: 0, y: 0, z: 0 };
    U.stumpPosition(h, 0, 0.3, out);
    expect(out.x).toBeCloseTo(24, 6); expect(out.y).toBeCloseTo(0.9 + 0.3 * 1.8, 6); expect(out.z).toBeCloseTo(24, 6);
    h.sp.position.x = 30; h.sp.position.y = 0.5;
    U.stumpPosition(h, 0, 0.3, out);
    expect(out.x).toBeCloseTo(30, 6); expect(out.y).toBeCloseTo(0.5 + 0.54, 6);
    // a body on its side (rotation a quarter turn): the neck, which was above the centre, is to its side, at the same distance
    h.sp.position.x = 24; h.sp.position.y = 0.9; h.sp.material.rotation = Math.PI / 2;
    U.stumpPosition(h, 0, 0.3, out);
    expect(out.y).toBeCloseTo(0.9, 5);
    expect(Math.abs(out.x - 24)).toBeCloseTo(0.54, 5);
  });

  it("a shoulder is out to its side of the sprite, a hip low", () => {
    const h = host();
    const out = { x: 0, y: 0, z: 0 };
    U.stumpPosition(h, 0.28, 0.1, out);
    expect(out.x).toBeCloseTo(24 + 0.28 * 1.2, 6);   // to the screen's right, facing -z at yaw 0: right is +x
    U.stumpPosition(h, 0, -0.38, out);
    expect(out.y).toBeLessThan(0.9 - 0.6);
  });

  it("a shoulder pumps out to the side it was torn from, and up", () => {
    U.startSpurt(host(), U.SHOULDER, 0.28, 0.1, 1, 0, 0);
    run(0.05);
    for (let i = 0; i < 6; i++) { U.spurtTick(0); D.dropTick(1 / 60); }
    const p = D.dropStats().dropPoints!.geometry.attributes.position.array as Float32Array;
    let east = 0, west = 0;
    for (let i = 0; i < D.DROP_MAX; i++) if (p[i * 3 + 1] > -99) (p[i * 3] > 24 + 0.34 ? east++ : west++);
    expect(east).toBeGreaterThan(west);
  });
});

describe("it ends", () => {
  it("when the body is gibbed or gone: the next frame", () => {
    const h = host();
    U.startSpurt(h, U.NECK, 0, 0.3, 0, 1, 0);
    run(0.5);
    expect(U.spurtCount()).toBe(1);
    h.gone = true;
    U.spurtTick(1 / 60);
    expect(U.spurtCount()).toBe(0);
  });

  it("a limb's stump runs dry sooner than a neck's", () => {
    expect(U.LIFE[U.SHOULDER]).toBeLessThan(U.LIFE[U.NECK]);
    U.startSpurt(host(), U.SHOULDER, 0.28, 0.1, 1, 0, 0);
    run(2);
    expect(U.spurtCount()).toBe(0);
  });

  it("is twelve at a time: a thirteenth takes the oldest one's place", () => {
    const first = host(24, 24);
    U.startSpurt(first, U.NECK, 0, 0.3, 0, 1, 0);
    for (let i = 1; i < U.SPURT_MAX; i++) U.startSpurt(host(10 + i, 10), U.NECK, 0, 0.3, 0, 1, 0);
    expect(U.spurtCount()).toBe(U.SPURT_MAX);
    U.startSpurt(host(40, 40), U.NECK, 0, 0.3, 0, 1, 0);
    expect(U.spurtCount()).toBe(U.SPURT_MAX);
    // the first one's host is no longer pumped: move it and run — nothing is thrown at its place
    first.sp.position.x = 8; first.sp.position.z = 38;
    run(0.4);
    const p = D.dropStats().dropPoints!.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < D.DROP_MAX; i++) if (p[i * 3 + 1] > -99) expect(Math.hypot(p[i * 3] - 8, p[i * 3 + 2] - 38), "nothing near the first body's new place").toBeGreaterThan(2);
  });

  it("resets to none, and is quiet when there is no level", () => {
    U.startSpurt(host(), U.NECK, 0, 0.3, 0, 1, 0);
    U.resetSpurts();
    expect(U.spurtCount()).toBe(0);
    U.startSpurt(host(), U.NECK, 0, 0.3, 0, 1, 0);
    D.resetDrops();
    expect(() => run(0.5)).not.toThrow();
  });
});

describe("the dice", () => {
  it("draws nothing from Math.random", () => {
    const w = watchRandom();
    try { U.startSpurt(host(), U.NECK, 0, 0.3, 0, 1, 0); run(3); } finally { w.stop(); }
    expect(w.draws()).toBe(0);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { setScene } from "../../src/render/SceneRef";
import { fakeScene } from "../support/fakeScene";
import {
  blood, buildParticles, emberP, fireP, holyP, particleCount, partTick,
  smoke3d, sparks, spawnP, toxicP, woodP,
} from "../../src/fx/Particles";

/**
 * Unit coverage for src/fx/Particles.ts — the "pure math on a typed-array
 * pool" part of the FX layer that tests/behavior's recorder cannot reach
 * (there is no canvas call and no fixed-parameter Three object to compare;
 * the only THREE construction here, buildParticles()'s one-time
 * Points/BufferGeometry build, is covered separately by
 * tests/behavior/fx.test.ts). See the task report for the full coverage
 * map.
 *
 * Every test below reads the pool's state through the live THREE.Points
 * object a fake scene captures (tests/support/fakeScene.ts) — position and
 * colour are stored in Float32Array buffers directly on that object's
 * geometry, so this never needs an extra test-only export beyond
 * particleCount() (which the brief already specifies).
 */

function buildWithFakeScene() {
  const { scene, added } = fakeScene();
  setScene(scene);
  buildParticles();
  const points = added[0] as unknown as {
    geometry: { attributes: { position: { array: Float32Array }; color: { array: Float32Array } } };
  };
  return {
    posArr: points.geometry.attributes.position.array,
    colArr: points.geometry.attributes.color.array,
  };
}

describe("particle pool", () => {
  beforeEach(() => {
    buildWithFakeScene();
  });

  it("has PMAX=1100 pool slots", () => {
    expect(particleCount()).toBe(1100);
  });

  it("recycles rather than growing without bound", () => {
    // PMAX is 1100 in the reference; spawning more must wrap, not allocate.
    for (let i = 0; i < 2000; i++) spawnP(0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0);
    expect(particleCount()).toBe(1100);
  });

  it("wraps pNext back to slot 0 after PMAX spawns, overwriting the oldest particle's colour", () => {
    const { colArr } = buildWithFakeScene();
    spawnP(0, 0, 0, 0, 0, 0, 0.11, 0.22, 0.33, 1, 0); // slot 0
    for (let i = 1; i < 1100; i++) spawnP(0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0); // fill slots 1..1099
    expect(colArr[0]).toBeCloseTo(0.11); // slot 0 untouched so far
    spawnP(0, 0, 0, 0, 0, 0, 0.99, 0.88, 0.77, 1, 0); // the 1101th spawn wraps back to slot 0
    expect(colArr[0]).toBeCloseTo(0.99); // slot 0 recycled, not a 1101st slot
  });
});

describe("spawners emit exactly the requested particle count", () => {
  // Each spawner's colour channels are art (see src/fx/Particles.ts), but
  // every one of them is bounded away from the pool's pristine (zero) state,
  // so "is slot n still (0,0,0)?" is a reliable way to prove a spawner wrote
  // exactly n particles, not more and not fewer, without a dedicated
  // test-only accessor.
  it("blood(n) writes n particles with r in [.35,.62] and leaves slot n untouched", () => {
    const { colArr } = buildWithFakeScene();
    blood(0, 0, 0, 7, 1);
    for (let i = 0; i < 7; i++) expect(colArr[i * 3]).toBeGreaterThanOrEqual(0.35);
    for (let i = 0; i < 7; i++) expect(colArr[i * 3]).toBeLessThanOrEqual(0.62);
    expect(colArr[7 * 3]).toBe(0);
  });

  it("sparks(n) writes n particles with r in [.8,1] and leaves slot n untouched", () => {
    const { colArr } = buildWithFakeScene();
    sparks(0, 0, 0, 6);
    for (let i = 0; i < 6; i++) {
      expect(colArr[i * 3]).toBeGreaterThanOrEqual(0.8);
      expect(colArr[i * 3]).toBeLessThanOrEqual(1);
    }
    expect(colArr[6 * 3]).toBe(0);
  });

  it("smoke3d(n) writes n particles with the fixed colour (.28,.28,.3) and leaves slot n untouched", () => {
    const { colArr } = buildWithFakeScene();
    smoke3d(0, 0, 0, 5);
    for (let i = 0; i < 5; i++) {
      expect(colArr[i * 3]).toBeCloseTo(0.28);
      expect(colArr[i * 3 + 1]).toBeCloseTo(0.28);
      expect(colArr[i * 3 + 2]).toBeCloseTo(0.3);
    }
    expect(colArr[5 * 3]).toBe(0);
  });

  it("fireP(n) writes n particles with r in [.85,1] and leaves slot n untouched", () => {
    const { colArr } = buildWithFakeScene();
    fireP(0, 0, 0, 4);
    for (let i = 0; i < 4; i++) expect(colArr[i * 3]).toBeGreaterThanOrEqual(0.85);
    expect(colArr[4 * 3]).toBe(0);
  });

  it("holyP(n) writes n particles with r in [.9,1] and leaves slot n untouched", () => {
    const { colArr } = buildWithFakeScene();
    holyP(0, 0, 0, 4);
    for (let i = 0; i < 4; i++) expect(colArr[i * 3]).toBeGreaterThanOrEqual(0.9);
    expect(colArr[4 * 3]).toBe(0);
  });

  it("toxicP(n) writes n particles with r in [.3,.5] and leaves slot n untouched", () => {
    const { colArr } = buildWithFakeScene();
    toxicP(0, 0, 0, 3);
    for (let i = 0; i < 3; i++) {
      expect(colArr[i * 3]).toBeGreaterThanOrEqual(0.3);
      expect(colArr[i * 3]).toBeLessThanOrEqual(0.5);
    }
    expect(colArr[3 * 3]).toBe(0);
  });

  it("emberP() writes exactly one particle with r in [.85,1]", () => {
    const { colArr } = buildWithFakeScene();
    emberP(0, 0, 0);
    expect(colArr[0]).toBeGreaterThanOrEqual(0.85);
    expect(colArr[3]).toBe(0);
  });

  it("woodP(n) writes n particles with r in [.32,.45] and leaves slot n untouched", () => {
    const { colArr } = buildWithFakeScene();
    woodP(0, 0, 0, 8);
    for (let i = 0; i < 8; i++) {
      expect(colArr[i * 3]).toBeGreaterThanOrEqual(0.32);
      expect(colArr[i * 3]).toBeLessThanOrEqual(0.45);
    }
    expect(colArr[8 * 3]).toBe(0);
  });
});

/**
 * Pins Math.random() to 0, which collapses every rnd(a,b) call to its
 * minimum, a — including blood(x,y,z,n,pow)'s life parameter, rnd(.5,1.3).
 * That turns an otherwise-unobservable "art" numeric literal (life isn't
 * reflected in the position/colour buffers directly, only in *when*
 * partTick eventually retires the particle) into something a test can pin
 * down exactly, by straddling the two dt values that bracket the literal.
 */
function withRandomPinnedToZero<T>(fn: () => T): T {
  const original = Math.random;
  Math.random = () => 0;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

describe("blood's minimum life bound (the .5 in rnd(.5,1.3)) determines exactly when a particle retires", () => {
  it("keeps a particle alive through 2 ticks of dt=.49 (just under the .5 bound)", () => {
    const { posArr } = buildWithFakeScene();
    withRandomPinnedToZero(() => blood(1, 5, 1, 1, 1)); // life pinned to exactly .5
    partTick(0.49); // life: .5 -> .01, still alive
    partTick(0.49); // entering .01>0 -> not yet retired; decrements to -.48
    expect(posArr[1]).not.toBe(-100);
  });

  it("retires the same particle within 2 ticks of dt=.51 (just over the .5 bound)", () => {
    const { posArr } = buildWithFakeScene();
    withRandomPinnedToZero(() => blood(1, 5, 1, 1, 1)); // life pinned to exactly .5
    partTick(0.51); // life: .5 -> -.01
    partTick(0.51); // entering -.01<=0 -> retired
    expect(posArr[1]).toBe(-100);
  });
});

describe("partTick", () => {
  it("decrements life gradually before retiring a particle to y=-100", () => {
    const { posArr } = buildWithFakeScene();
    // slot 0: parked high above the ground (y=5) so ground-collision logic
    // never fires — this isolates the life-decrement/retirement path from
    // the separate settle/bounce behaviour. kind=0 (not blood, not smoke)
    // so it falls under standard gravity with no special-casing.
    spawnP(1, 5, 1, 0, 0, 0, 1, 1, 1, 0.05, 0);

    partTick(0.02); // life: .05 -> .03, still alive
    expect(posArr[1]).not.toBe(-100);
    const yAfterFirstTick = posArr[1];

    partTick(0.02); // life: .03 -> .01, still alive
    expect(posArr[1]).not.toBe(-100);
    expect(posArr[1]).not.toBe(yAfterFirstTick); // position keeps advancing under gravity

    partTick(0.02); // life: .01 -> -.01 (this tick still moves it — retirement is checked on entry)
    expect(posArr[1]).not.toBe(-100);

    partTick(0.02); // entering with life<=0 -> retired
    expect(posArr[1]).toBe(-100);
  });

  it("settles a blood (kind=1) particle into the ground and kills it in one tick", () => {
    const { posArr } = buildWithFakeScene();
    // y already below the 0.02 ground threshold, so the very first tick
    // both keeps it at slot 0's own y (kind 1's settle branch sets
    // p.life=0, not p.y, but the write-back below still records the
    // pre-retirement position for this tick) and marks it dead — the next
    // tick then retires it to -100.
    spawnP(2, 0.01, 2, 0, 0, 0, 1, 1, 1, 5, 1);
    partTick(0.016);
    expect(posArr[1]).not.toBe(-100); // this tick still wrote a real position
    partTick(0.016); // now retired (life was forced to 0 last tick)
    expect(posArr[1]).toBe(-100);
  });
});

import { describe, expect, it } from "vitest";
import { seedRandom } from "./seededRandom";

/**
 * The determinism problem (see task-1-brief.md Step 1): buildTextures,
 * texFromPx and the audio synthesis functions all call Math.random()
 * directly (or via src/utils/math.ts's rnd/pick, which call it internally),
 * so two runs of the same drawing/synthesis code produce different call
 * logs unless Math.random is made deterministic for the duration of the
 * comparison. This is the primitive the behavioral recorders build on.
 */
describe("seedRandom", () => {
  it("produces an identical sequence when reseeded with the same value, and restores the original Math.random afterward", () => {
    const before = Math.random;

    const restore1 = seedRandom(12345);
    const first = Array.from({ length: 25 }, () => Math.random());
    restore1();

    expect(Math.random).toBe(before);

    const restore2 = seedRandom(12345);
    const second = Array.from({ length: 25 }, () => Math.random());
    restore2();

    expect(second).toEqual(first);
    expect(Math.random).toBe(before);
  });

  it("produces values in [0, 1), never repeating the same value twice in a row across a long run", () => {
    const restore = seedRandom(7);
    let prev = -1;
    for (let i = 0; i < 2000; i++) {
      const v = Math.random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(v).not.toBe(prev);
      prev = v;
    }
    restore();
  });

  it("different seeds produce different sequences", () => {
    const restoreA = seedRandom(1);
    const a = Array.from({ length: 10 }, () => Math.random());
    restoreA();

    const restoreB = seedRandom(2);
    const b = Array.from({ length: 10 }, () => Math.random());
    restoreB();

    expect(a).not.toEqual(b);
  });
});

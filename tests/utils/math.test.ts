import { describe, expect, it } from "vitest";
import { clamp, pick, rnd } from "../../src/utils/math";

describe("clamp", () => {
  it("returns the value when it is inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps below the low bound", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it("clamps above the high bound", () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("rnd", () => {
  it("stays within the half-open range across many samples", () => {
    for (let i = 0; i < 500; i++) {
      const v = rnd(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
    }
  });
});

describe("pick", () => {
  it("always returns an element of the array", () => {
    const xs = ["a", "b", "c"] as const;
    for (let i = 0; i < 200; i++) expect(xs).toContain(pick(xs));
  });
});

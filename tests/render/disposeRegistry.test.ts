import { describe, expect, it } from "vitest";
import { track, disposeAll } from "../../src/render/DisposeRegistry";

describe("DisposeRegistry", () => {
  it("disposes everything tracked, exactly once", () => {
    let a = 0, b = 0;
    track({ dispose: () => a++ });
    track({ dispose: () => b++ });
    disposeAll();
    disposeAll();
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it("ignores values with no dispose method and returns what it was given", () => {
    const obj = { name: "not disposable" };
    expect(track(obj)).toBe(obj);
    expect(() => disposeAll()).not.toThrow();
  });
});

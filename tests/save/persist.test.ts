// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { save } from "../../src/save/SaveGame";
import { loadSave, flushSave, SAVE_VERSION } from "../../src/save/persist";

const KEY = "blacksilence.save";

describe("persistence", () => {
  beforeEach(() => { localStorage.clear(); save.maxLevel = 0; });

  it("round-trips maxLevel through storage", () => {
    save.maxLevel = 3;
    flushSave();
    save.maxLevel = 0;
    loadSave();
    expect(save.maxLevel).toBe(3);
  });

  it("writes a version field", () => {
    flushSave();
    expect(JSON.parse(localStorage.getItem(KEY)!).v).toBe(SAVE_VERSION);
  });

  it("falls back to defaults on corrupt JSON without throwing", () => {
    localStorage.setItem(KEY, "{not json");
    expect(() => loadSave()).not.toThrow();
    expect(save.maxLevel).toBe(0);
  });

  it("falls back to defaults on an unknown future version", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION + 99, maxLevel: 7 }));
    loadSave();
    expect(save.maxLevel).toBe(0);
  });

  it("ignores a field the schema does not know", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, maxLevel: 2, wat: 1 }));
    loadSave();
    expect(save.maxLevel).toBe(2);
  });

  it("survives storage being unavailable", () => {
    const orig = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      get() { throw new Error("blocked"); }, configurable: true,
    });
    expect(() => loadSave()).not.toThrow();
    expect(() => flushSave()).not.toThrow();
    if (orig) Object.defineProperty(globalThis, "localStorage", orig);
  });
});

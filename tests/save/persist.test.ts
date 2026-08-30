// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { save } from "../../src/save/SaveGame";
import { loadSave, flushSave, SAVE_VERSION } from "../../src/save/persist";

const KEY = "blacksilence.save";

describe("persistence", () => {
  // All three fields, not just maxLevel: the wrong-typed cases below assert a
  // field kept its default, which only means anything if the previous test did
  // not already leave it there by accident.
  beforeEach(() => {
    localStorage.clear();
    save.maxLevel = 0; save.masterVolume = 0.5; save.renderWidth = 400;
  });

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

  // The three per-field `typeof === "number"` guards in loadSave had no test
  // when this file was first written: removing all three left the original six
  // green, because none of them supplied a wrong-typed value. Found by the
  // Task 1 implementer, which flagged it rather than quietly leaving an
  // unproven guard in place. A store is user-writable — localStorage is a
  // devtools panel away — so a string where a number belongs is a real input,
  // not a hypothetical.
  it.each([
    ["maxLevel", "3", 0],
    ["masterVolume", "loud", 0.5],
    ["renderWidth", null, 400],
  ] as const)("ignores a wrong-typed %s and keeps the default", (field, bad, expected) => {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, [field]: bad }));
    loadSave();
    expect(save[field as "maxLevel" | "masterVolume" | "renderWidth"]).toBe(expected);
  });

  it("still accepts the other fields when one of them is wrong-typed", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, maxLevel: "nope", renderWidth: 640 }));
    loadSave();
    expect(save.maxLevel).toBe(0);
    expect(save.renderWidth).toBe(640);
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

import { describe, expect, it } from "vitest";
import { expectCallLogEqual } from "./expectCallLogEqual";

describe("expectCallLogEqual", () => {
  it("passes silently when both logs are equal", () => {
    const a = [{ method: "fillRect", args: [1, 2, 3, 4] }];
    const b = [{ method: "fillRect", args: [1, 2, 3, 4] }];
    expect(() => expectCallLogEqual(a, b)).not.toThrow();
  });

  it("throws with the first divergent index and a small window, not the whole arrays", () => {
    const a = [
      { method: "a", args: [0] },
      { method: "b", args: [1] },
      { method: "c", args: [2] },
    ];
    const b = [
      { method: "a", args: [0] },
      { method: "WRONG", args: [1] },
      { method: "c", args: [2] },
    ];
    try {
      expectCallLogEqual(a, b, "test log");
      expect.unreachable("expected expectCallLogEqual to throw");
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toContain("mismatch at index 1");
      expect(message).toContain("WRONG");
      // Proves it's a windowed report, not a full-array dump: the
      // out-of-window entries shouldn't appear by index label.
      expect(message).not.toContain("[99]");
    }
  });

  it("reports a length mismatch at the first divergent index", () => {
    const a = [{ method: "a", args: [] }];
    const b = [
      { method: "a", args: [] },
      { method: "b", args: [] },
    ];
    try {
      expectCallLogEqual(a, b, "test log");
      expect.unreachable("expected expectCallLogEqual to throw");
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toContain("expected 2 entries, got 1");
    }
  });
});

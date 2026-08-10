import { describe, expect, it } from "vitest";
import { recordingCanvas } from "./recordingCanvas";

describe("recordingCanvas", () => {
  it("records method calls in order with their arguments", () => {
    const { ctx, calls } = recordingCanvas();
    const c = ctx as any;
    c.fillRect(1, 2, 3, 4);
    c.beginPath();
    c.arc(5, 6, 7, 0, 7);
    expect(calls).toEqual([
      { method: "fillRect", args: [1, 2, 3, 4] },
      { method: "beginPath", args: [] },
      { method: "arc", args: [5, 6, 7, 0, 7] },
    ]);
  });

  it("records property assignments, because colour is set that way", () => {
    // g.fillStyle = "#262a2e" is how every colour in this codebase is chosen.
    // A recorder that ignores assignments would miss every art change.
    const { ctx, calls } = recordingCanvas();
    const c = ctx as any;
    c.fillStyle = "#262a2e";
    c.fillRect(0, 0, 1, 1);
    expect(calls).toEqual([
      { method: "set:fillStyle", args: ["#262a2e"] },
      { method: "fillRect", args: [0, 0, 1, 1] },
    ]);
  });

  it("returns a gradient object that also records", () => {
    const { ctx, calls } = recordingCanvas();
    const c = ctx as any;
    const g = c.createLinearGradient(0, 0, 10, 0);
    g.addColorStop(0, "#fff");
    expect(calls).toContainEqual({ method: "createLinearGradient", args: [0, 0, 10, 0] });
    expect(calls).toContainEqual({ method: "gradient.addColorStop", args: [0, "#fff"] });
  });
});

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

  // A gradient is a Proxy over {} with no state of its own — its
  // addColorStop calls are recorded separately — so without an identity,
  // any two gradients look identical wherever they show up as a plain
  // logged value (e.g. `g.fillStyle = someGradient`), and a bug that
  // assigns the WRONG (but still previously-created) gradient would be
  // invisible. Task 3 of this plan ports gradient-based weapon viewmodel
  // drawing (vGrad/vTube/vWood), so this matters starting there.
  it("gives a gradient assigned to a property a stable id instead of leaking the live object", () => {
    const { ctx, calls } = recordingCanvas();
    const c = ctx as any;
    const g = c.createLinearGradient(0, 0, 10, 0);
    g.addColorStop(0, "#000");
    c.fillStyle = g;
    expect(calls).toContainEqual({ method: "set:fillStyle", args: ["Gradient#1"] });
  });

  it("assigns different gradients different ids, in creation order, so swapping which gradient is used is a detectable diff", () => {
    const { ctx, calls } = recordingCanvas();
    const c = ctx as any;
    const gA = c.createLinearGradient(0, 0, 10, 0);
    const gB = c.createRadialGradient(0, 0, 0, 0, 0, 10);
    c.fillStyle = gA;
    c.strokeStyle = gB;
    expect(calls).toContainEqual({ method: "set:fillStyle", args: ["Gradient#1"] });
    expect(calls).toContainEqual({ method: "set:strokeStyle", args: ["Gradient#2"] });

    // The same code with fillStyle/strokeStyle swapped produces a
    // different log — proof this is a real, comparable diff and not just
    // two id strings that happen never to collide.
    const swapped = recordingCanvas();
    const sc = swapped.ctx as any;
    const sgA = sc.createLinearGradient(0, 0, 10, 0);
    const sgB = sc.createRadialGradient(0, 0, 0, 0, 0, 10);
    sc.fillStyle = sgB;
    sc.strokeStyle = sgA;
    expect(swapped.calls).not.toEqual(calls);
  });
});

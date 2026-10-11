// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { recordingCanvas, type DrawCall } from "../support/recordingCanvas";

/**
 * THE MARKER IS DRAWN BY THE OVERLAY (impact plan, Task 1). tests/fx/hitMarker
 * holds the marker's own drawing; this holds that `fxTick` — the one place
 * the game draws the 2D layer each frame — calls it, last (after the weapon
 * and the leg), and calls it for nothing while idle.
 */

let calls: DrawCall[];
let fxTick: (dt: number, t: number, zoom: number, kick: () => void, vm: (dt: number, t: number) => void) => void;
let showMarker: (k: "flesh" | "kill") => void;
let resetMarker: () => void;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  const rec = recordingCanvas();
  calls = rec.calls;
  (HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => rec.ctx;
  ({ fxTick } = await import("../../src/render/Overlay2D"));
  ({ showMarker, resetMarker } = await import("../../src/fx/HitMarker"));
});

const tick = (): DrawCall[] => {
  const start = calls.length;
  fxTick(1 / 60, 0, 0, () => { calls.push({ method: "callback:kick", args: [] }); }, () => { calls.push({ method: "callback:vm", args: [] }); });
  return calls.slice(start);
};

describe("fxTick draws the hit marker", () => {
  it("nothing of it while idle", () => {
    resetMarker();
    expect(tick().filter((c) => c.method === "rect")).toEqual([]);
  });

  it("after a kill: red ticks around the middle, drawn after the weapon and the leg", () => {
    showMarker("kill");
    const log = tick();
    const vmAt = log.findIndex((c) => c.method === "callback:vm");
    const rects = log.map((c, i) => [c, i] as const).filter(([c]) => c.method === "rect");
    expect(vmAt).toBeGreaterThan(-1);
    expect(rects.length).toBeGreaterThan(8);
    for (const [, i] of rects) expect(i).toBeGreaterThan(vmAt);
    const styles = log.filter((c) => c.method === "set:fillStyle").map((c) => c.args[0]);
    expect(styles).toContain("#e2301c");
    resetMarker();
  });
});

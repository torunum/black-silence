// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { recordingCanvas, type DrawCall } from "../support/recordingCanvas";

/**
 * THE MARKER IS NOT DRAWN (owner, 2026-10-20: "düşmana sıkınca çıkan x işaretini kaldır").
 * The impact plan's hit marker still keeps its state (tests/fx/hitMarker, tests/fx/hitFeel), but
 * `fxTick` — the one place the game draws the 2D layer each frame — no longer draws it, idle or not.
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

describe("fxTick does not draw the hit marker", () => {
  it("nothing of it while idle", () => {
    resetMarker();
    expect(tick().filter((c) => c.method === "rect")).toEqual([]);
  });

  it("nothing of it after a kill either: no ticks, no red", () => {
    showMarker("kill");
    const log = tick();
    expect(log.filter((c) => c.method === "rect")).toEqual([]);
    const styles = log.filter((c) => c.method === "set:fillStyle").map((c) => c.args[0]);
    expect(styles).not.toContain("#e2301c");
    resetMarker();
  });
});

// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { recordingCanvas, type DrawCall } from "../support/recordingCanvas";

/**
 * THE OVERLAY DRAWS NO HIT MARKER (owner, 2026-10-17). `fxTick` is the one
 * place the game draws the 2D layer each frame. A blow of any kind, felt
 * through `feelTick`, must leave its drawing exactly as an idle frame's:
 * the same calls in the same order, no corner ticks, none of the old
 * marker colours.
 */

let calls: DrawCall[];
let fxTick: (dt: number, t: number, zoom: number, kick: () => void, vm: (dt: number, t: number) => void) => void;
let feelTick: (dt: number) => void;
let registerHit: (e: { wIdx: number; kill?: boolean; head?: boolean; gib?: boolean; plate?: boolean; side: number }) => void;
let resetHitFeel: () => void;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  const rec = recordingCanvas();
  calls = rec.calls;
  (HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => rec.ctx;
  ({ fxTick } = await import("../../src/render/Overlay2D"));
  ({ feelTick, registerHit, resetHitFeel } = await import("../../src/fx/HitFeel"));
});

const tick = (): DrawCall[] => {
  const start = calls.length;
  fxTick(1 / 60, 0, 0, () => { calls.push({ method: "callback:kick", args: [] }); }, () => { calls.push({ method: "callback:vm", args: [] }); });
  return calls.slice(start);
};

const OLD_MARKER_COLOURS = ["#efe6d2", "#f2c444", "#a9b1ba", "#e2301c", "#ff4a22"];

describe("fxTick draws no hit marker", () => {
  const blows: Array<[string, Parameters<typeof registerHit>[0]]> = [
    ["a hit", { wIdx: 0, side: 0 }],
    ["a headshot", { wIdx: 0, head: true, side: 0 }],
    ["armour", { wIdx: 0, plate: true, side: 0 }],
    ["a kill", { wIdx: 0, kill: true, side: 0 }],
    ["a head-kill", { wIdx: 0, kill: true, head: true, side: 0 }],
    ["a gib", { wIdx: 0, kill: true, gib: true, side: 0 }],
  ];

  it.each(blows)("after %s the frame is the idle frame, call for call", (_n, ev) => {
    resetHitFeel();
    const idle = tick();
    registerHit(ev);
    feelTick(1 / 60);
    const after = tick();
    expect(after).toEqual(idle);
    expect(after.filter((c) => c.method === "rect")).toEqual([]);
    const styles = after.filter((c) => c.method === "set:fillStyle").map((c) => c.args[0]);
    for (const c of OLD_MARKER_COLOURS) expect(styles).not.toContain(c);
    resetHitFeel();
  });

  it("and a few frames on, still nothing", () => {
    resetHitFeel();
    const idle = tick();
    registerHit({ wIdx: 0, kill: true, gib: true, side: 0 });
    feelTick(1 / 60);
    for (let i = 0; i < 40; i++) expect(tick()).toEqual(idle);
    resetHitFeel();
  });
});

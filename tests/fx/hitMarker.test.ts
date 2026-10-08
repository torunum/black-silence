import { beforeEach, describe, expect, it } from "vitest";
import { LOOKS, drawHitMarker, marker, resetMarker, showMarker, type MarkerKind } from "../../src/fx/HitMarker";

/**
 * THE HIT MARKER (impact plan, Task 1): four corner ticks around the
 * crosshair when a blow lands — cream for flesh, gold with a pip for a
 * headshot, grey and a plus for armour, red and larger, flying outward, for
 * a kill. Drawn pixel by pixel into the 320-wide overlay, and silent
 * (nothing at all drawn) while idle.
 */

interface Call { op: string; args: unknown[] }
/** A 2D context that records what is drawn: the rects of each fill, with the fillStyle and globalAlpha in force. */
function recorder(): { g: CanvasRenderingContext2D; calls: Call[]; fills: Array<{ style: string; alpha: number; rects: number[][] }> } {
  const calls: Call[] = [];
  const fills: Array<{ style: string; alpha: number; rects: number[][] }> = [];
  let rects: number[][] = [];
  const state = { fillStyle: "", globalAlpha: 1 };
  const g = new Proxy({} as Record<string, unknown>, {
    get(_t, k: string) {
      if (k === "fillStyle" || k === "globalAlpha") return state[k];
      if (k === "beginPath") return () => { calls.push({ op: k, args: [] }); rects = []; };
      if (k === "rect") return (...a: number[]) => { calls.push({ op: k, args: a }); rects.push(a); };
      if (k === "fill") return () => { calls.push({ op: k, args: [] }); fills.push({ style: state.fillStyle, alpha: state.globalAlpha, rects: [...rects] }); };
      return (...a: unknown[]) => { calls.push({ op: k, args: a }); };
    },
    set(_t, k: string, v: unknown) { (state as Record<string, unknown>)[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  return { g, calls, fills };
}
const VW = 320, VH = 180;

beforeEach(() => resetMarker());

describe("the marker draws only while a blow is fresh", () => {
  it("draws nothing at all while idle — not a path, not a fill", () => {
    const { g, calls } = recorder();
    drawHitMarker(g, VW, VH, 1 / 60);
    expect(calls).toEqual([]);
  });

  it("appears when a hit lands, at the middle of the overlay, and is gone after its time", () => {
    showMarker("flesh");
    const { g, fills } = recorder();
    drawHitMarker(g, VW, VH, 1 / 60);
    expect(fills.length).toBe(2);   // a shadow, then the colour
    const rects = fills[1].rects;
    expect(rects.length).toBeGreaterThanOrEqual(12);
    // four ticks, one in each quadrant about the centre (160, 90)
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      expect(rects.some(([x, y]) => Math.sign(x - 160) === sx && Math.sign(y - 90) === sy), `quadrant ${sx},${sy}`).toBe(true);
    }
    // it ages with the frame time and ends
    const n = Math.ceil(LOOKS.flesh.secs * 60) + 2;
    let drawn = 0;
    for (let i = 0; i < n; i++) { const r = recorder(); drawHitMarker(r.g, VW, VH, 1 / 60); if (r.fills.length) drawn++; }
    expect(drawn).toBeLessThan(n);
    expect(marker.left).toBeLessThanOrEqual(0);
    const after = recorder();
    drawHitMarker(after.g, VW, VH, 1 / 60);
    expect(after.calls).toEqual([]);
  });

  it("holds while the game is frozen: a zero dt does not age it", () => {
    showMarker("kill");
    const left = marker.left;
    const { g } = recorder();
    drawHitMarker(g, VW, VH, 0);
    expect(marker.left).toBe(left);
  });
});

describe("each kind is distinct", () => {
  const colourOf = (k: MarkerKind): string => { resetMarker(); showMarker(k); const r = recorder(); drawHitMarker(r.g, VW, VH, 0); return r.fills[1].style; };
  const extentOf = (k: MarkerKind): number => {
    resetMarker(); showMarker(k);
    const r = recorder(); drawHitMarker(r.g, VW, VH, 0);
    return Math.max(...r.fills[1].rects.map(([x, y]) => Math.max(Math.abs(x - 160), Math.abs(y - 90))));
  };

  it("flesh is cream, a headshot gold, armour grey, a kill red: four colours", () => {
    const c = (["flesh", "head", "armour", "kill"] as const).map(colourOf);
    expect(new Set(c).size).toBe(4);
    expect(colourOf("flesh")).toBe("#efe6d2");
    expect(colourOf("head")).toBe("#f2c444");
    expect(colourOf("armour")).toBe("#a9b1ba");
    expect(colourOf("kill")).toBe("#e2301c");
  });

  it("a kill is drawn larger than a hit, and a gib larger than a kill", () => {
    expect(extentOf("kill")).toBeGreaterThan(extentOf("flesh"));
    expect(extentOf("gib")).toBeGreaterThan(extentOf("kill"));
  });

  it("a headshot has a pip above the centre that a plain hit does not; armour is a plus, not a cross", () => {
    const pipAbove = (k: MarkerKind): boolean => {
      resetMarker(); showMarker(k);
      const r = recorder(); drawHitMarker(r.g, VW, VH, 0);
      return r.fills[1].rects.some(([x, y, w, h]) => x === 160 && h === 3 && y < 90 - 6 && w === 1);
    };
    expect(pipAbove("head")).toBe(true);
    expect(pipAbove("flesh")).toBe(false);
    resetMarker(); showMarker("armour");
    const r = recorder(); drawHitMarker(r.g, VW, VH, 0);
    const rs = r.fills[1].rects;
    expect(rs.some(([x, y]) => y === 90 && x !== 160), "arms of a plus on the horizontal").toBe(true);
    expect(rs.some(([x, y]) => Math.abs(x - 160) === Math.abs(y - 90) && x !== 160), "no diagonal").toBe(false);
  });

  it("a kill's ticks fly outward as it fades", () => {
    showMarker("kill");
    const early = recorder(); drawHitMarker(early.g, VW, VH, 0);
    marker.left = LOOKS.kill.secs * 0.2;
    const late = recorder(); drawHitMarker(late.g, VW, VH, 0);
    const near = (r: ReturnType<typeof recorder>): number => Math.min(...r.fills[1].rects.map(([x]) => Math.abs(x - 160)));
    expect(near(late)).toBeGreaterThan(near(early));
  });
});

describe("a bigger blow is not overwritten by a smaller one still showing", () => {
  it("a hit during a kill's marker leaves the kill; a kill during a hit replaces it", () => {
    showMarker("kill");
    showMarker("flesh");
    expect(marker.kind).toBe("kill");
    resetMarker(); showMarker("flesh"); showMarker("kill");
    expect(marker.kind).toBe("kill");
  });

  it("once a kill's marker is half gone a hit may take over", () => {
    showMarker("kill");
    marker.left = LOOKS.kill.secs * 0.3;
    showMarker("flesh");
    expect(marker.kind).toBe("flesh");
  });
});

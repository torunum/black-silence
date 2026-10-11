// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { recordingCanvas, type DrawCall } from "../support/recordingCanvas";
import { watchRandom } from "../support/randomWatch";

/**
 * THE GORE'S TEXTURES (impact plan, Task 3): the splat and the streak, and the
 * parts cut from each monster's own pixel sprite with a wet stump at the tear.
 * Baked by hash, never by `Math.random()`: a part's texture is made in the
 * middle of a fight, the first time that monster loses that part, and must
 * take nothing from the seeded stream the fixtures are recorded under.
 */

let calls: DrawCall[];
let tex: typeof import("../../src/fx/GoreTex");
let PXDEF: Record<string, { head?: number; px: string[]; pal: Record<string, string> }>;

beforeAll(async () => {
  installDomStubs();
  const rec = recordingCanvas();
  calls = rec.calls;
  (HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => rec.ctx;
  tex = await import("../../src/fx/GoreTex");
  ({ PXDEF } = await import("../../src/enemies/pixels/index") as never);
});

/** The fillStyles drawn while `run` ran. */
function styles(run: () => void): Set<string> {
  const from = calls.length;
  run();
  return new Set(calls.slice(from).filter((c) => c.method === "set:fillStyle").map((c) => String(c.args[0])));
}

describe("hash2, the textures' own dice", () => {
  it("is a pure function of its two integers, in [0,1), and spreads", () => {
    expect(tex.hash2(3, 5)).toBe(tex.hash2(3, 5));
    expect(tex.hash2(3, 5)).not.toBe(tex.hash2(5, 3));
    let lo = 1, hi = 0, sum = 0;
    for (let i = 0; i < 400; i++) { const v = tex.hash2(i, i * 7 + 1); lo = Math.min(lo, v); hi = Math.max(hi, v); sum += v; expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
    expect(lo).toBeLessThan(0.05); expect(hi).toBeGreaterThan(0.95);
    expect(sum / 400).toBeGreaterThan(0.4); expect(sum / 400).toBeLessThan(0.6);
  });
});

describe("the splat and the streak", () => {
  it("are baked once, from nothing but the hash: no Math.random, the same pixels every time", () => {
    const w = watchRandom();
    try {
      const a = tex.splatTexture(), b = tex.streakTexture();
      expect(tex.splatTexture()).toBe(a);        // kept
      expect(tex.streakTexture()).toBe(b);
    } finally { w.stop(); }
    expect(w.draws()).toBe(0);
  });

  it("are white on clear, so the decal's instance colour tints them, with a lighter core and a darker rim", () => {
    const s = styles(() => { /* baked above */ });
    expect(s.size).toBe(0);   // nothing new: they were already made
    const grey = [...new Set(calls.filter((c) => c.method === "set:fillStyle").map((c) => String(c.args[0])))].filter((f) => /^rgb\((\d+),\1,\1\)$/.test(f));
    const levels = grey.map((f) => Number(/\((\d+)/.exec(f)![1]));
    expect(Math.max(...levels)).toBe(255);      // the core
    expect(Math.min(...levels)).toBeLessThan(200); // the rim
  });
});

describe("a monster's parts", () => {
  it("every monster has two arms and legs to lose, and a head to lose if its sprite has one", () => {
    for (const [key, d] of Object.entries(PXDEF)) {
      for (const kind of ["lArm", "rArm", "legs"] as const) {
        const art = tex.partArt(key, kind);
        expect(art, `${key} ${kind}`).not.toBeNull();
        expect(art!.cw).toBeGreaterThan(1); expect(art!.ch).toBeGreaterThan(1);
      }
      const head = tex.partArt(key, "head");
      if ((d.head || 0) > 0) { expect(head, `${key} head`).not.toBeNull(); expect(head!.ch).toBe((d.head || 0) + 1); }
      else expect(head, `${key} has no head`).toBeNull();
    }
  });

  it("each cut is capped with wet meat and a pale bone, drawn in the monster's own palette: the stump's reds and the bone's white are among the colours it paints", () => {
    const fills = new Set(calls.filter((c) => c.method === "set:fillStyle").map((c) => String(c.args[0])));
    for (const c of ["#b8341c", "#d8d0b8"]) expect(fills.has(c), c).toBe(true);
    // and the monster's own colours are there too: the zombie's flesh and rot
    expect(fills.has(PXDEF.z.pal.R) || fills.has(PXDEF.z.pal.b)).toBe(true);
  });

  it("is made once and kept, and draws nothing from Math.random", () => {
    const w = watchRandom();
    try {
      const a = tex.partArt("j", "lArm"), b = tex.partArt("j", "lArm");
      expect(b).toBe(a);
      for (const k of Object.keys(PXDEF)) for (const kind of ["head", "lArm", "rArm", "legs"] as const) tex.partArt(k, kind);
    } finally { w.stop(); }
    expect(w.draws()).toBe(0);
  });

  it("the crop is the region the sprite's own dismembered frame masks: the arm's columns, the head's rows, the legs' bottom", () => {
    const d = PXDEF.z;
    const H = d.px.length, W = Math.max(...d.px.map((r) => r.length));
    const armTop = d.head || 0, armBot = Math.min(H - 3, armTop + Math.ceil((H - armTop) * 0.45));
    const lArm = tex.partArt("z", "lArm")!, rArm = tex.partArt("z", "rArm")!, legs = tex.partArt("z", "legs")!, head = tex.partArt("z", "head")!;
    expect(lArm.ch).toBe(armBot - armTop);
    expect(rArm.ch).toBe(armBot - armTop);
    expect(lArm.cw).toBe(Math.ceil(W * 0.32) + 1);          // the region and the one cell the stump takes
    expect(rArm.cw).toBe(W - (Math.floor(W * 0.68) - 1));
    expect(head.cw).toBe(W);
    expect(legs.cw).toBe(W);
    expect(legs.ch).toBe(tex.legRows(H));
    expect(tex.legRows(H)).toBe(Math.ceil(H * 0.28));
    expect(head.W).toBe(W); expect(head.H).toBe(H);
  });
});

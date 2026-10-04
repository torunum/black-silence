// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { recordingCanvas, installRecordingGetContext, type DrawCall } from "../support/recordingCanvas";
import { seedRandom } from "../support/seededRandom";
import { HELLTEX, buildHellTextures, glowOf } from "../../src/render/HellTextures";
import { paintBand, paintBridge, paintChunk, paintRock, paintScorch, paintVault } from "../../src/render/HellRock";
import { paintCrust, paintFall, paintLava } from "../../src/render/HellLava";
import { SELF_LIT, shown, type Bitmap } from "../../src/render/HellPaint";
import { TEX, buildTextures } from "../../src/render/ProcTextures";
import { themeTex, bandOf } from "../../src/world/ZoneLook";
import { ZONES } from "../../src/world/levels/prologue";
import { buildBandTextures } from "../../src/render/BandTextures";
import { buildDressTextures } from "../../src/render/DressTextures";

/**
 * HELL'S TEXTURES (`src/render/HellTextures.ts`, painters in `HellRock.ts` / `HellLava.ts` on `HellPaint.ts`; the
 * prologue's hell rework, `docs/superpowers/plans/2026-10-04-hell-rework.md`).
 *
 * The owner's complaint was a *look*: a brick grid with straight orange lines drawn across it, tiled. A look is
 * numbers once it is looked at: how dark the rock is, how much of it glows, whether a glowing line runs the whole
 * width of a face (the old texture's did), whether a texture's edges meet (they are mapped in world space and a
 * seam would repeat every eight units). The painters are pure, so these are measured on the pixels. Like the
 * trim bands and the dressing textures they are built at boot inside the window where the trace harness has
 * seeded `Math.random`, so they must not draw from it, and they must not join `TEX`, whose key set is the reference's.
 */

function recordBuild(seed: number): DrawCall[] {
  const { ctx, calls } = recordingCanvas();
  const restoreGetContext = installRecordingGetContext(ctx, calls);
  const restoreRandom = seedRandom(seed);
  try { buildHellTextures(); } finally { restoreRandom(); restoreGetContext(); }
  return calls;
}

let texKeys: string[] = [];
beforeAll(() => {
  installDomStubs();
  buildTextures();
  buildBandTextures();
  buildDressTextures();
  texKeys = Object.keys(TEX).sort();
});

const lum = (b: Bitmap, i: number): number => .3 * b.data[i] + .59 * b.data[i + 1] + .11 * b.data[i + 2];
const mean = (b: Bitmap): number => { let s = 0; for (let i = 0; i < b.data.length; i += 4) s += lum(b, i); return s / (b.w * b.h); };
/** Whether a glow map glows at a texel: any channel shows brighter than 120 on screen (the maps are painted through the inverse of the tone mapping, `shown` undoes it). */
const glowing = (b: Bitmap, x: number, y: number): boolean => { const i = (y * b.w + x) * 4; return shown(b.data[i]) > 120 || shown(b.data[i + 1]) > 120 || shown(b.data[i + 2]) > 120; };

describe("deterministic", () => {
  it("draws the same canvas calls whatever Math.random is seeded with", () => {
    const a = recordBuild(1), b = recordBuild(424242);
    expect(a.length).toBeGreaterThan(20_000);
    expect(b).toEqual(a);
  });

  it("takes no draw from Math.random except three's own texture UUIDs", () => {
    const real = Math.random;
    let uuid = 0, other = 0;
    Math.random = () => { if (new Error().stack?.includes("generateUUID")) uuid++; else other++; return real(); };
    try { buildHellTextures(); } finally { Math.random = real; }
    expect(uuid).toBeGreaterThan(0);
    expect(other).toBe(0);
  });

  it("paints the same pixels every time, and other pixels for another seed", () => {
    expect(paintRock(1).color.data).toEqual(paintRock(1).color.data);
    expect(paintRock(1).glow!.data).toEqual(paintRock(1).glow!.data);
    expect(paintRock(1).color.data).not.toEqual(paintRock(2).color.data);
    expect(paintScorch(11).color.data).not.toEqual(paintScorch(12).color.data);
    expect(paintLava(51)).toEqual(paintLava(51));
    expect(paintLava(51).data).not.toEqual(paintLava(52).data);
    expect(paintCrust(61).data).toEqual(paintCrust(61).data);
  });
});

describe("the registry", () => {
  it("builds hell's textures and leaves TEX's key set alone", () => {
    buildHellTextures();
    expect(Object.keys(HELLTEX).sort()).toEqual(["band", "bridge", "chunk", "chunkGlow", "crust", "fall", "lava", "rock", "rockGlow", "scorch", "scorchGlow", "vault", "vaultGlow"]);
    expect(Object.keys(TEX).sort()).toEqual(texKeys);
    expect(Object.keys(TEX), "the reference's hell textures are still there for the levels that name them").toEqual(expect.arrayContaining(["hellWall", "hellFloor", "hellCeil"]));
  });

  it("pairs each cracked surface with its emissive map, and a clone of the colour map finds it too", () => {
    buildHellTextures();
    for (const k of ["rock", "scorch", "vault", "chunk"] as const) {
      expect(glowOf(HELLTEX[k]), k).toBe(HELLTEX[`${k}Glow` as "rockGlow"]);
      expect(glowOf(HELLTEX[k]!.clone()), `${k} clone`).toBe(HELLTEX[`${k}Glow` as "rockGlow"]);
    }
    expect(glowOf(HELLTEX.lava), "the lava lights itself and has no map to add").toBeUndefined();
    expect(glowOf(TEX.hellWall)).toBeUndefined();
  });
});

describe("the rock reads as rock, not as a fence", () => {
  const rock = paintRock(1);

  it("is dark and only a few percent of it glows", () => {
    expect(mean(rock.color)).toBeGreaterThan(10);
    expect(mean(rock.color)).toBeLessThan(45);
    let hot = 0;
    for (let y = 0; y < rock.glow!.h; y++) for (let x = 0; x < rock.glow!.w; x++) if (glowing(rock.glow!, x, y)) hot++;
    const share = hot / (rock.glow!.w * rock.glow!.h);
    expect(share).toBeGreaterThan(.008);
    expect(share).toBeLessThan(.12);
  });

  it("has no glowing line across a whole row or column (the reference's wall had five, edge to edge)", () => {
    const g = rock.glow!;
    for (let y = 0; y < g.h; y++) { let n = 0; for (let x = 0; x < g.w; x++) if (glowing(g, x, y)) n++; expect(n / g.w, `row ${y}`).toBeLessThan(.4); }
    for (let x = 0; x < g.w; x++) { let n = 0; for (let y = 0; y < g.h; y++) if (glowing(g, x, y)) n++; expect(n / g.h, `column ${x}`).toBeLessThan(.4); }
  });

  it("is hotter near the lava than under the roof: the bottom third of the map glows more than twice the top third", () => {
    const g = rock.glow!, third = Math.floor(g.h / 3);
    const sum = (y0: number, y1: number): number => { let s = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < g.w; x++) s += lum(g, (y * g.w + x) * 4); return s; };
    expect(sum(g.h - third, g.h)).toBeGreaterThan(2 * sum(0, third));
  });

  it("wraps: its edges meet as well as neighbouring columns and rows do", () => {
    // mapped in world space, so a seam would repeat every 8 units down a wall. MUTATION TARGET: stop `Cells` wrapping its lattice.
    for (const [name, b] of [["rock", rock.color], ["scorch", paintScorch(11).color], ["lava", paintLava(51)], ["fall", paintFall(71)], ["chunk", paintChunk(31).color], ["vault", paintVault(21).color]] as const) {
      const colDiff = (x0: number, x1: number): number => { let s = 0; for (let y = 0; y < b.h; y++) s += Math.abs(lum(b, (y * b.w + x0) * 4) - lum(b, (y * b.w + x1) * 4)); return s / b.h; };
      const rowDiff = (y0: number, y1: number): number => { let s = 0; for (let x = 0; x < b.w; x++) s += Math.abs(lum(b, (y0 * b.w + x) * 4) - lum(b, (y1 * b.w + x) * 4)); return s / b.w; };
      let inner = 0, innerRows = 0;
      for (let x = 0; x < b.w - 1; x++) inner += colDiff(x, x + 1);
      for (let y = 0; y < b.h - 1; y++) innerRows += rowDiff(y, y + 1);
      inner /= b.w - 1; innerRows /= b.h - 1;
      expect(colDiff(b.w - 1, 0), `${name}: left and right edges`).toBeLessThan(inner * 2.5 + 2);
      expect(rowDiff(b.h - 1, 0), `${name}: top and bottom edges`).toBeLessThan(innerRows * 2.5 + 2);
    }
  });
});

describe("the ground, the vault, the stone", () => {
  it("scorched ground is darker than the rock's brightest and glows in a few cracks and embers", () => {
    const s = paintScorch(11);
    expect(mean(s.color)).toBeLessThan(40);
    let hot = 0;
    for (let y = 0; y < s.glow!.h; y++) for (let x = 0; x < s.glow!.w; x++) if (glowing(s.glow!, x, y)) hot++;
    expect(hot / (s.glow!.w * s.glow!.h)).toBeGreaterThan(.003);
    expect(hot / (s.glow!.w * s.glow!.h)).toBeLessThan(.08);
  });

  it("the vault is the darkest of the rock and barely cracked: the roof is not lit by the lava", () => {
    const v = paintVault(21);
    expect(mean(v.color)).toBeLessThan(mean(paintRock(1).color));
    let hot = 0;
    for (let y = 0; y < v.glow!.h; y++) for (let x = 0; x < v.glow!.w; x++) if (glowing(v.glow!, x, y)) hot++;
    expect(hot / (v.glow!.w * v.glow!.h)).toBeLessThan(.03);
  });

  it("the band and the bridge's deck are plain stone: no glow map, and darker than the reference's brick", () => {
    for (const p of [paintBand(), paintBridge()]) { expect(p.glow).toBeNull(); expect(mean(p.color)).toBeLessThan(80); }
  });
});

describe("the lava", () => {
  it("is fire all over: every texel of the sheet red over green over blue, bright, with the whole range of the ramp", () => {
    const l = paintLava(51);
    let min = 255, max = 0, sum = 0;
    for (let i = 0; i < l.data.length; i += 4) {
      expect(l.data[i], "red").toBeGreaterThanOrEqual(l.data[i + 1]);
      expect(l.data[i + 1], "green").toBeGreaterThanOrEqual(l.data[i + 2]);
      expect(l.data[i + 3]).toBe(255);
      const r = shown(l.data[i]);   // as the screen shows it
      min = Math.min(min, r); max = Math.max(max, r); sum += r;
    }
    expect(min, "the darkest trough is still a red-hot one").toBeGreaterThan(90);
    expect(max, "and the ridges reach the top of what the tone mapping lets through").toBeGreaterThan(215);
    expect(sum / (l.w * l.h), "bright as a whole: the pit is the light").toBeGreaterThan(160);
  });

  it("is painted to be seen after the tone mapping: the wanted colour, through the inverse of the renderer's pipeline", () => {
    // what the screen shows of a painted value, and what to paint to show a value (`HellPaint.ts`)
    for (const d of [0, 64, 128, 180, 220]) expect(Math.abs(shown(SELF_LIT[d]) - d), `wanted ${d}`).toBeLessThanOrEqual(2);
    for (let d = 1; d < 256; d++) expect(SELF_LIT[d]).toBeGreaterThanOrEqual(SELF_LIT[d - 1]);
    expect(shown(245), "the reference's own orange comes out pale: that is why").toBeGreaterThan(215);
  });

  it("has a crust that is opaque or absent, never half there: it is alpha-tested", () => {
    const c = paintCrust(61);
    let opaque = 0;
    for (let i = 3; i < c.data.length; i += 4) { expect([0, 255]).toContain(c.data[i]); if (c.data[i] === 255) opaque++; }
    const share = opaque / (c.w * c.h);
    expect(share).toBeGreaterThan(.2);
    expect(share).toBeLessThan(.65);
  });
});

describe("only hell wears them", () => {
  const hellZone = ZONES.find((z) => z.id === "hell")!;
  const all = (): unknown[] => Object.values(HELLTEX);

  it("the hell zone's wall, floor, ceiling, side and trim band are hell's own, and the reference's hell textures are not worn", () => {
    buildHellTextures();
    const t = themeTex(hellZone);
    for (const [name, tex] of Object.entries(t)) expect(all(), `hell ${name}`).toContain(tex);
    expect(bandOf(hellZone)).toBe(HELLTEX.band);
    for (const ref of [TEX.hellWall, TEX.hellFloor, TEX.hellCeil]) for (const tex of Object.values(t)) expect(tex).not.toBe(ref);
  });

  it("no other zone, and no level, wears one", () => {
    buildHellTextures();
    for (const z of ZONES.filter((z) => z.id !== "hell")) {
      for (const [name, tex] of Object.entries(themeTex(z))) expect(all(), `${z.id} ${name}`).not.toContain(tex);
      expect(all(), `${z.id} band`).not.toContain(bandOf(z));
    }
  });

  it("a level definition that is merely flagged hell still wears the reference's textures", () => {
    const t = themeTex({ hell: true });
    expect([t.wall, t.floor, t.ceil]).toEqual([TEX.hellWall, TEX.hellFloor, TEX.hellCeil]);
  });
});

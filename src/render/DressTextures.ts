import * as THREE from "three";
import { makeTex } from "./ProcTextures";
import { grain } from "./BandTextures";

/**
 * DRESSING TEXTURES — the prologue's own surfaces, which the reference's
 * texture set never had: the churchyard's earth and grass, the raw soil of
 * an open grave's walls and the soft spark the fire's particles are drawn with (the prologue
 * plan's Task 3, `docs/superpowers/plans/2026-09-27-player-feedback-2-prologue.md`).
 *
 * The levels-feel-full plan's Task 1 added four more, for the dressing kit
 * (`src/world/decor/`): `straw` (a dungeon's bedding), `rust` (riveted plate,
 * for machinery, drums and pipes), `sludge` (sewer scum) and `banner` (a church
 * banner's faded crimson and tarnished cross). Same rules: hashed, not random,
 * and named `dress.<key>` in the trace's texture index.
 *
 * A named registry of its own, `DRESSTEX`, for the reason `BandTextures.ts`
 * gives for `BANDTEX`: `tests/fidelity.test.ts` holds `TEX`'s key set equal
 * to the frozen reference's, and `tests/behavior/textures.test.ts` compares
 * `buildTextures`'s canvas calls with the reference's in order, so a new
 * texture cannot go in either. `tests/integration/gameplayTrace.ts`'s
 * `buildTextureIndex` names these `dress.<key>`, indexed after the other
 * four sources so nothing they name is renamed.
 *
 * Built at boot by `startGame`, beside `buildBandTextures`. Every texel comes
 * from `grain`, the integer hash — no `Math.random`, so building them moves
 * nothing in the seeded stream the traces record (three's texture UUIDs are
 * already kept out of it by the harness). A zone asks for one by key: its
 * `ground` for the ground and the tops of raised ground, its `side` for the
 * faces of raised ground (`ZoneLook.ts`'s `themeTex`).
 */

export type DressKey = "yardEarth" | "graveEarth" | "spark" | "straw" | "rust" | "sludge" | "banner";

export const DRESSTEX: Partial<Record<DressKey, THREE.CanvasTexture>> = {};

type RGB = readonly [number, number, number];
const rgb = (c: RGB, v: number): string => `rgb(${c[0] + v | 0},${c[1] + v | 0},${c[2] + v | 0})`;

/** The churchyard's ground: dark earth, clods, a few pale stones, and tufts of dead grass. */
function yardEarth(g: CanvasRenderingContext2D, w: number, h: number): void {
  const soil: RGB = [40, 33, 25];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // two scales of hash: a lumpy clod pattern under a fine grain
    const clod = grain(x >> 3, y >> 3, 61) - .5, fine = grain(x, y, 62) - .5;
    g.fillStyle = rgb(soil, clod * 14 + fine * 12);
    g.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 26; i++) {   // stones
    const x = grain(i, 1, 63) * w | 0, y = grain(i, 2, 63) * h | 0, s = 1 + (grain(i, 3, 63) * 2 | 0);
    g.fillStyle = rgb([70, 64, 56], (grain(i, 4, 63) - .5) * 16); g.fillRect(x, y, s, s);
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, y + s, s, 1);
  }
  for (let i = 0; i < 46; i++) {   // grass: tufts of dry blades
    const x = grain(i, 5, 64) * w | 0, y = grain(i, 6, 64) * h | 0, n = 2 + (grain(i, 7, 64) * 3 | 0);
    for (let k = 0; k < n; k++) {
      const len = 2 + (grain(i, 8 + k, 64) * 4 | 0), lean = grain(i, 20 + k, 64) < .5 ? -1 : 1;
      g.fillStyle = rgb(grain(i, 30, 64) < .6 ? [40, 47, 26] : [55, 50, 32], (grain(i, 40 + k, 64) - .5) * 14);
      for (let j = 0; j < len; j++) g.fillRect((x + k + (j > 1 ? lean : 0)) & (w - 1), (y - j) & (h - 1), 1, 1);
    }
  }
}

/** An open grave's walls: layered soil, stones and roots. */
function graveEarth(g: CanvasRenderingContext2D, w: number, h: number): void {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const band = Math.sin(y * .45 + grain(x >> 4, y >> 2, 71) * 1.5) * 6;   // strata
    const fine = grain(x, y, 72) - .5;
    g.fillStyle = rgb([48, 37, 27], band + fine * 16 - y * .12);
    g.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 18; i++) {   // stones in the soil
    const x = grain(i, 1, 73) * w | 0, y = grain(i, 2, 73) * h | 0, s = 2 + (grain(i, 3, 73) * 3 | 0);
    g.fillStyle = rgb([82, 76, 68], (grain(i, 4, 73) - .5) * 20); g.fillRect(x, y, s, s - 1);
    g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(x, y + s - 1, s, 1);
  }
  g.fillStyle = "rgba(22,15,10,.85)";   // roots
  for (let i = 0; i < 6; i++) {
    let x = grain(i, 5, 74) * w, y = grain(i, 6, 74) * h;
    for (let j = 0; j < 22; j++) {
      g.fillRect(x & (w - 1), y & (h - 1), 1, 1);
      x += grain(i, 30 + j, 74) * 2 - .6; y += grain(i, 60 + j, 74) < .7 ? 1 : 0;
    }
  }
}

/** One soft spark: white at the centre, gone at the rim — the fire's particles are tinted per vertex. */
function spark(g: CanvasRenderingContext2D, w: number, h: number): void {
  g.clearRect(0, 0, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = Math.hypot(x - w / 2 + .5, y - h / 2 + .5) / (w / 2), a = Math.max(0, 1 - r) ** 1.1;
    if (a <= 0) continue;
    g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; g.fillRect(x, y, 1, 1);
  }
}

/** Straw: pale stalks laid every way over a dusty ground of a darker gold. */
function straw(g: CanvasRenderingContext2D, w: number, h: number): void {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    g.fillStyle = rgb([92, 76, 42], (grain(x, y, 91) - .5) * 16); g.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 70; i++) {   // stalks, each a short run in one of four directions
    let x = grain(i, 1, 92) * w | 0, y = grain(i, 2, 92) * h | 0;
    const dx = [1, 1, 0, 1][i & 3], dy = [0, 1, 1, -1][i & 3], len = 4 + (grain(i, 3, 92) * 8 | 0);
    g.fillStyle = rgb(grain(i, 4, 92) < .5 ? [150, 126, 66] : [118, 96, 50], (grain(i, 5, 92) - .5) * 20);
    for (let j = 0; j < len; j++) { g.fillRect(x & (w - 1), y & (h - 1), 1, 1); x += dx; y += dy; }
  }
}

/** Riveted iron plate gone to rust: dark steel, seams, rows of rivets, orange streaks running down from them. */
function rust(g: CanvasRenderingContext2D, w: number, h: number): void {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const streak = Math.max(0, grain(x >> 1, 3, 93) - .55) * (1 - y / h) * 70;   // rust weeps from the top of each plate
    g.fillStyle = rgb([38 + streak * .9, 33 + streak * .34, 30 - streak * .1], (grain(x, y, 94) - .5) * 12);
    g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = "#15120f"; g.fillRect(0, 0, w, 1); g.fillRect(0, h / 2, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w / 2, 0, 1, h);
  for (let y = 4; y < h; y += h / 2) for (let x = 4; x < w; x += 8) {   // rivets
    g.fillStyle = "#8a6a48"; g.fillRect(x, y, 2, 2); g.fillStyle = "#1a1410"; g.fillRect(x, y + 2, 2, 1);
  }
}

/** Sewer sludge: a scum of murky green over black, with paler bubbles. */
function sludge(g: CanvasRenderingContext2D, w: number, h: number): void {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const swirl = grain(x >> 2, y >> 2, 95) - .5;
    g.fillStyle = rgb([34, 46, 28], swirl * 22 + (grain(x, y, 96) - .5) * 8); g.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 12; i++) {
    const x = grain(i, 1, 97) * w | 0, y = grain(i, 2, 97) * h | 0;
    g.fillStyle = "rgb(82,100,58)"; g.fillRect(x, y, 2, 2); g.fillStyle = "rgb(22,30,18)"; g.fillRect(x, y + 2, 2, 1);
  }
}

/** A church banner: faded crimson cloth, a tarnished gold cross, a frayed hem. */
function banner(g: CanvasRenderingContext2D, w: number, h: number): void {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fold = Math.sin(x * .55) * 6;   // vertical folds
    g.fillStyle = rgb([96, 26, 30], fold + (grain(x, y, 98) - .5) * 12 - y * .12); g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = "rgb(150,120,52)";
  g.fillRect(w / 2 - 2, h * .2, 4, h * .55); g.fillRect(w * .3, h * .36, w * .4, 4);   // the cross
  g.fillStyle = "rgba(0,0,0,.45)";
  for (let x = 0; x < w; x += 3) g.fillRect(x, h - 2 - (grain(x, 1, 99) * 5 | 0), 2, 6);   // the hem, frayed
}

/** Builds every dressing texture into `DRESSTEX`. Called once at boot, by `startGame`. */
export function buildDressTextures(): void {
  DRESSTEX.yardEarth = makeTex(yardEarth);
  DRESSTEX.graveEarth = makeTex(graveEarth);
  DRESSTEX.straw = makeTex(straw);
  DRESSTEX.rust = makeTex(rust);
  DRESSTEX.sludge = makeTex(sludge);
  DRESSTEX.banner = makeTex(banner);
  const s = makeTex(spark, 16, 16);
  s.magFilter = THREE.LinearFilter; s.minFilter = THREE.LinearFilter;   // a soft dot, not a pixel square
  DRESSTEX.spark = s;
}

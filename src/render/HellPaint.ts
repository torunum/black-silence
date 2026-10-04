/**
 * HELL'S PAINTING TOOLKIT — the pure half of `HellTextures.ts`: pixel buffers,
 * the integer hash, tileable noise and tileable cellular (Voronoi) fields.
 *
 * Nothing here touches a canvas, three.js or `Math.random`, which is what lets
 * a texture be tested as numbers (its brightness, how much of it glows, that it
 * is the same twice) and looked at without a browser. Every field is **tileable
 * in both axes** — a lattice of period `gx x gy` cells wraps — because the hell
 * surfaces are mapped in world space (`src/world/HellShell.ts`): one texture
 * runs unbroken across a whole wall, and a texture that did not wrap would show
 * its seam every eight units.
 */

/** RGBA, 8 bits a channel, row 0 at the top (a canvas's own order). */
export interface Bitmap { w: number; h: number; data: Uint8ClampedArray }

export const bitmap = (w: number, h: number): Bitmap => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });

/** Sets a texel from 0-255 floats; the buffer clamps. */
export function put(b: Bitmap, x: number, y: number, r: number, g: number, bl: number, a = 255): void {
  const i = (y * b.w + x) * 4;
  b.data[i] = r; b.data[i + 1] = g; b.data[i + 2] = bl; b.data[i + 3] = a;
}

/** Integer hash of (a, b, seed) to [0, 1): the same mixing as `BandTextures.ts`'s `grain`, kept local so this file imports nothing. */
export function hash(a: number, b: number, seed: number): number {
  let t = Math.imul(a + 1, 0x27d4eb2d) ^ Math.imul(b + 1, 0x165667b1) ^ Math.imul(seed, 0x9e3779b9);
  t = Math.imul(t ^ (t >>> 15), 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smooth = (a: number, b: number, t: number): number => { const k = clamp01((t - a) / (b - a)); return k * k * (3 - 2 * k); };
const wrap = (i: number, n: number): number => ((i % n) + n) % n;

/**
 * What the renderer does to a colour on its way to the screen: three's ACES filmic tone mapping at the game's
 * exposure of 1.15 (`RenderCore.ts`: the input is scaled by 1.15 / 0.6), then the sRGB encode. Texture values
 * are read as linear (`ColorPolicy.ts`), so a surface that lights itself — lava, a crack's emissive map — shows as
 * a good deal paler and yellower than the numbers painted into it: (245, 96, 10) comes out cream. `shown` is that
 * pipeline per channel, 0-255 in and out (the matrices ACES mixes the channels with are left out: they are the
 * identity on greys and a few percent on a fire's colours), and `SELF_LIT` its inverse, the value to paint to *get*
 * a colour on screen. Surfaces that take light (the rock, the ground) are lit before the pipeline and are not
 * painted through it: they are simply painted dark, since the lamp and the lava are bright.
 */
const aces = (x: number): number => (x * (x + .0245786) - .000090537) / (x * (.983729 * x + .432951) + .238081);
const encode = (l: number): number => (l <= .0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - .055);
export function shown(authored: number): number {
  const l = aces(clamp01(authored / 255) * 1.15 / .6);
  return Math.round(255 * encode(l < 0 ? 0 : l > 1 ? 1 : l));
}
export const SELF_LIT: Uint8Array = (() => {
  const t = new Uint8Array(256);
  let a = 0;
  for (let d = 0; d < 256; d++) { while (a < 255 && shown(a) < d) a++; t[d] = a; }
  return t;
})();
const lit8 = (c: number): number => SELF_LIT[c < 0 ? 0 : c > 255 ? 255 : Math.round(c)];

/** `put` for a surface that lights itself: the colour given is the one wanted on screen. */
export function putLit(b: Bitmap, x: number, y: number, r: number, g: number, bl: number, a = 255): void {
  put(b, x, y, lit8(r), lit8(g), lit8(bl), a);
}

/** The hashed values of a lattice of `px x py` cells, built once per (seed, period): a painter asks for the same few lattices 65,000 times. */
const lattices = new Map<number, Float32Array>();
function lattice(px: number, py: number, seed: number): Float32Array {
  const key = (seed * 4099 + px) * 4099 + py;
  let g = lattices.get(key);
  if (!g) {
    g = new Float32Array(px * py);
    for (let j = 0; j < py; j++) for (let i = 0; i < px; i++) g[j * px + i] = hash(i, j, seed);
    lattices.set(key, g);
  }
  return g;
}

/** Value noise on a lattice that wraps every `px` x `py` cells; (x, y) in lattice units. */
export function noise(x: number, y: number, px: number, py: number, seed: number): number {
  const g = lattice(px, py, seed);
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const xa = wrap(x0, px), xb = wrap(x0 + 1, px), ya = wrap(y0, py) * px, yb = wrap(y0 + 1, py) * px;
  const a = g[ya + xa], b = g[ya + xb], c = g[yb + xa], d = g[yb + xb];
  return mix(mix(a, b, sx), mix(c, d, sx), sy);
}

/** Fractal noise, `oct` octaves, each doubling the frequency (and so the wrap period); result in [0, 1). */
export function fbm(x: number, y: number, px: number, py: number, seed: number, oct = 3): number {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < oct; o++, f *= 2, amp *= .5) { sum += amp * noise(x * f, y * f, px * f, py * f, seed + o * 17); norm += amp; }
  return sum / norm;
}

/** What `Cells.query` found: the nearest plate, the next nearest, and how far the texel is from the line between them. */
export interface Hit {
  /** Distance to the nearest site, and the offset of the texel from it. */
  d1: number; ox: number; oy: number;
  /** Distance to the edge between the two nearest plates (texels, > 0). */
  e: number;
  /** The unit vector from the nearest site toward the neighbour: the edge's outward normal. */
  nx: number; ny: number;
  /** The two plates' ids (their index in the lattice). */
  id1: number; id2: number;
}

export const newHit = (): Hit => ({ d1: 0, ox: 0, oy: 0, e: 0, nx: 0, ny: 1, id1: 0, id2: 0 });

/**
 * A jittered lattice of plate sites on a torus `w x h`, `gx x gy` of them.
 * `query` is exact for the nearest site and nearly so for the second (it looks
 * at the 3x3 lattice cells round the texel), which is the only thing the edge
 * distance needs; with the jitter used here the misses are a texel or two long
 * and invisible under the crack noise.
 */
export class Cells {
  private px: Float32Array; private py: Float32Array;
  private cw: number; private ch: number;
  constructor(readonly w: number, readonly h: number, readonly gx: number, readonly gy: number, seed: number, jitter = .85) {
    this.cw = w / gx; this.ch = h / gy;
    this.px = new Float32Array(gx * gy); this.py = new Float32Array(gx * gy);
    for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) {
      this.px[j * gx + i] = (i + .5 + (hash(i, j, seed) - .5) * jitter) * this.cw;
      this.py[j * gx + i] = (j + .5 + (hash(i, j, seed + 1) - .5) * jitter) * this.ch;
    }
  }

  query(x: number, y: number, out: Hit): void {
    const { gx, gy, cw, ch, w, h } = this;
    const ci = Math.floor(x / cw), cj = Math.floor(y / ch);
    let d1 = Infinity, d2 = Infinity, p1x = 0, p1y = 0, p2x = 0, p2y = 0, i1 = 0, i2 = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = ci + di, jj = cj + dj, wi = wrap(ii, gx), wj = wrap(jj, gy), id = wj * gx + wi;
      const sx = this.px[id] + Math.floor(ii / gx) * w, sy = this.py[id] + Math.floor(jj / gy) * h;
      const d = (sx - x) * (sx - x) + (sy - y) * (sy - y);
      if (d < d1) { d2 = d1; p2x = p1x; p2y = p1y; i2 = i1; d1 = d; p1x = sx; p1y = sy; i1 = id; }
      else if (d < d2) { d2 = d; p2x = sx; p2y = sy; i2 = id; }
    }
    const ex = p2x - p1x, ey = p2y - p1y, len = Math.hypot(ex, ey) || 1;
    out.d1 = Math.sqrt(d1); out.ox = x - p1x; out.oy = y - p1y;
    out.e = Math.max(0, (d2 - d1) / (2 * len));
    out.nx = ex / len; out.ny = ey / len; out.id1 = i1; out.id2 = i2;
  }
}

/** Colour stops `[t, r, g, b]`, ascending in t; the colour at `t`, written into `out` (no allocation). */
export function ramp(stops: ReadonlyArray<readonly [number, number, number, number]>, t: number, out: number[]): void {
  if (t <= stops[0][0]) { out[0] = stops[0][1]; out[1] = stops[0][2]; out[2] = stops[0][3]; return; }
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const a = stops[i - 1], b = stops[i], k = (t - a[0]) / (b[0] - a[0]);
      out[0] = mix(a[1], b[1], k); out[1] = mix(a[2], b[2], k); out[2] = mix(a[3], b[3], k);
      return;
    }
  }
  const l = stops[stops.length - 1]; out[0] = l[1]; out[1] = l[2]; out[2] = l[3];
}

/** The fire ramp every crack, seam and flow is coloured with: dull red, orange, yellow, white-yellow at the core. */
export const FIRE: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 110, 18, 8], [.3, 190, 44, 10], [.55, 245, 105, 16], [.8, 255, 190, 60], [1, 255, 236, 150],
];

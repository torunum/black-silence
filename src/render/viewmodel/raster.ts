import { MATERIALS, MAT, RGBA_LUT, toneCount } from "./palette";

/**
 * A tiny software rasterizer for the viewmodel: indexed colour, a depth
 * buffer and a part-id buffer at a fixed low resolution. Nothing here
 * touches the DOM — ./rig.ts fills a Raster, ./draw.ts copies it to a
 * canvas — so tests can read the pixels directly.
 *
 * Why a rasterizer and not canvas paths: a canvas antialiases every path
 * edge, and an antialiased edge upscaled nearest-neighbour is a smear of
 * in-between colours. Filling pixel centres by hand keeps every edge hard
 * and every colour on a material ramp, which is what makes it pixel art.
 *
 * Why depth: the weapons are built from boxes and prisms in 3D (see
 * ./builder.ts) so they can be seen from behind and above with real
 * foreshortening and animated by moving parts; a depth buffer means no
 * part ever needs sorting against another.
 */

/** Logical resolution: the overlay's 320-wide space, 1:1 — one art pixel is one overlay unit (two canvas pixels at the overlay's 640 backing width). 200 rows covers the lower 200 of a 16:9 overlay's 180 and a 16:10's 200. */
export const RW = 320, RH = 200;

export class Raster {
  readonly w: number;
  readonly h: number;
  /** Palette index per pixel (material*8+tone); 0 is empty. */
  readonly col: Uint8Array;
  /** Camera-space depth per pixel; Infinity where empty. */
  readonly z: Float32Array;
  /** Which primitive wrote the pixel; 0 where empty. Drives the contour pass. */
  readonly part: Uint16Array;
  /** Scratch for finish()'s post passes; all zero between frames. */
  readonly mark: Uint8Array;
  /** Dirty box of the last frame, inclusive-exclusive. */
  x0 = 0; y0 = 0; x1 = 0; y1 = 0;

  constructor(w = RW, h = RH) {
    this.w = w; this.h = h;
    this.col = new Uint8Array(w * h);
    this.z = new Float32Array(w * h).fill(Infinity);
    this.part = new Uint16Array(w * h);
    this.mark = new Uint8Array(w * h);
  }

  clear(): void {
    const { w } = this;
    for (let y = this.y0; y < this.y1; y++) {
      const a = y * w + this.x0, b = y * w + this.x1;
      this.col.fill(0, a, b); this.z.fill(Infinity, a, b); this.part.fill(0, a, b);
    }
    this.x0 = this.w; this.y0 = this.h; this.x1 = 0; this.y1 = 0;
  }

  grow(x: number, y: number): void {
    if (x < this.x0) this.x0 = x;
    if (x + 1 > this.x1) this.x1 = x + 1;
    if (y < this.y0) this.y0 = y;
    if (y + 1 > this.y1) this.y1 = y + 1;
  }

  /** Number of non-empty pixels. */
  count(): number {
    let n = 0;
    for (let i = 0; i < this.col.length; i++) if (this.col[i]) n++;
    return n;
  }
}

/**
 * Per-pixel shading hook for a primitive: gets the pixel's point in the
 * primitive's own local space and returns a tone offset (e.g. wood grain,
 * knurling, engraving). Must be deterministic — no Math.random.
 */
export type TexFn = (x: number, y: number, z: number) => number;

/** Everything fillFace needs about one face, already in camera space. */
export interface Face {
  /** Projected vertices, raster pixels. */
  sx: number[]; sy: number[];
  /** Camera-space plane: n·p = k. */
  nx: number; ny: number; nz: number; k: number;
  mat: number; part: number;
  /** Continuous tone, 0..toneCount-1. */
  tone: number;
  /** Optional local-space shader plus the camera->local transform it needs (row-major 3x4). */
  tex?: TexFn; inv?: Float64Array;
}

/** Fills one convex-or-concave projected polygon with plane depth and a flat tone (a shader may vary it per pixel, dithered only on a tone boundary). */
export function fillFace(r: Raster, f: Face, F: number, cx: number, cy: number): void {
  const n = f.sx.length, sx = f.sx, sy = f.sy;
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) { if (sy[i] < minY) minY = sy[i]; if (sy[i] > maxY) maxY = sy[i]; }
  const yA = Math.max(0, Math.ceil(minY - 0.5)), yB = Math.min(r.h - 1, Math.floor(maxY - 0.5));
  if (yB < yA) return;
  const W = r.w, zb = r.z, cb = r.col, pb = r.part, part = f.part, k = f.k, nx = f.nx;
  const top = toneCount(f.mat) - 1, low = MATERIALS[f.mat]?.emissive ? 1 : 0, base = f.mat * 8;
  const tex = f.tex, m = f.inv;
  // A shaded pixel's tone; a 2x2 dither only where a shader's value sits right on a tone boundary.
  const pick = (t: number, odd: number): number => {
    let tone = Math.floor(t);
    const frac = t - tone;
    if (frac > 0.56 || (frac > 0.44 && odd)) tone++;
    return base + (tone < low ? low : tone > top ? top : tone);
  };
  // Without a shader the tone is one flat colour over the whole face, rounded: dithering a big
  // flat face reads as a screen door once it is upscaled, so flat faces never dither.
  const flat = pick(Math.round(f.tone), 0);
  const invF = 1 / F, stepDen = nx * invF;
  const xs = XS;
  let bx0 = W, bx1 = 0, by0 = -1, by1 = -1;
  for (let y = yA; y <= yB; y++) {
    const yc = y + 0.5;
    let c = 0;
    for (let i = 0, j = n - 1; i < n && c < XS.length; j = i++) {
      const ya = sy[j], yb = sy[i];
      if ((ya <= yc && yc < yb) || (yb <= yc && yc < ya)) xs[c++] = sx[j] + (yc - ya) * (sx[i] - sx[j]) / (yb - ya);
    }
    if (c < 2) continue;
    for (let i = 1; i < c; i++) { const v = xs[i]; let j = i - 1; while (j >= 0 && xs[j] > v) { xs[j + 1] = xs[j]; j--; } xs[j + 1] = v; }
    const dy = -(yc - cy) * invF, rowDen = f.ny * dy + f.nz, row = y * W;
    for (let s = 0; s + 1 < c; s += 2) {
      const xa = Math.max(0, Math.ceil(xs[s] - 0.5)), xb = Math.min(W, Math.ceil(xs[s + 1] - 0.5));
      if (xb <= xa) continue;
      let den = nx * (xa + 0.5 - cx) * invF + rowDen;
      for (let x = xa; x < xb; x++, den += stepDen) {
        let z = k / den;
        if (!(z > 0) || z === Infinity) z = 1e-3;
        const i = row + x;
        if (z >= zb[i]) continue;
        let ci: number;
        if (tex && m) {
          const dx = (x + 0.5 - cx) * invF, px = dx * z, py = dy * z;
          ci = pick(f.tone + tex(
            m[0] * px + m[1] * py + m[2] * z + m[3],
            m[4] * px + m[5] * py + m[6] * z + m[7],
            m[8] * px + m[9] * py + m[10] * z + m[11]), (x ^ y) & 1);
        } else ci = flat;
        zb[i] = z; cb[i] = ci; pb[i] = part;
        if (x < bx0) bx0 = x;
        if (x >= bx1) bx1 = x + 1;
        if (by0 < 0) by0 = y;
        by1 = y;
      }
    }
  }
  if (by0 >= 0) { r.grow(bx0, by0); r.grow(bx1 - 1, by1); }
}
/** Scratch for one scanline's edge crossings (a face never has more than a few). */
const XS = new Float64Array(32);

/**
 * The post passes that make it read as drawn rather than rendered:
 * - a dark outline one pixel outside the silhouette (the Doom/Blood sprite edge);
 * - a contour where one part sits clearly in front of another (the line an
 *   artist draws between a hand and the gun it holds);
 * - a rim of light on the top edge of metal parts.
 */
export function finish(r: Raster): void {
  const { w, h, col, z, part } = r;
  const X0 = Math.max(0, r.x0 - 1), Y0 = Math.max(0, r.y0 - 1);
  const X1 = Math.min(w, r.x1 + 1), Y1 = Math.min(h, r.y1 + 1);
  if (X1 <= X0 || Y1 <= Y0) return;
  // mark first (1 outline, 2 contour, 3 rim), then apply, so no pass reads another's result
  const mark = r.mark;
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0; x < X1; x++) {
      const i = y * w + x, c = col[i];
      const up = y > 0 ? i - w : -1, dn = y < h - 1 ? i + w : -1;
      const lf = x > 0 ? i - 1 : -1, rt = x < w - 1 ? i + 1 : -1;
      if (!c) {
        if ((up >= 0 && col[up]) || (dn >= 0 && col[dn]) || (lf >= 0 && col[lf]) || (rt >= 0 && col[rt])) mark[i] = 1;
        continue;
      }
      const zi = z[i] * 0.94, p = part[i];
      if ((up >= 0 && col[up] && part[up] !== p && z[up] < zi) || (dn >= 0 && col[dn] && part[dn] !== p && z[dn] < zi) ||
          (lf >= 0 && col[lf] && part[lf] !== p && z[lf] < zi) || (rt >= 0 && col[rt] && part[rt] !== p && z[rt] < zi)) { mark[i] = 2; continue; }
      if (RIM[c >> 3] && up >= 0 && (!col[up] || z[up] > z[i] * 1.2)) mark[i] = 3;
    }
  }
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0; x < X1; x++) {
      const i = y * w + x, mk = mark[i];
      if (!mk) continue;
      mark[i] = 0;
      const mat = col[i] >> 3;
      if (mk === 1) { col[i] = MAT.OUT * 8; z[i] = 1e9; }
      else if (mk === 2) { if (mat !== MAT.SOUL && mat !== MAT.FLAME) col[i] = MAT.OUT * 8; }
      else col[i] = mat * 8 + Math.min((col[i] & 7) + 2, toneCount(mat) - 1);
    }
  }
  r.x0 = X0; r.y0 = Y0; r.x1 = X1; r.y1 = Y1;
}
/** Materials that take a rim of light, by id. */
const RIM: boolean[] = [];
for (const key of Object.keys(MATERIALS)) RIM[Number(key)] = !!MATERIALS[Number(key)].rim;

/** Writes the raster's dirty box into an RGBA buffer the size of the raster (clearing what the previous frame left outside it). */
export function toRGBA(r: Raster, out: Uint8ClampedArray, prev?: { x0: number; y0: number; x1: number; y1: number }): void {
  const { w, col } = r;
  const X0 = Math.min(r.x0, prev?.x0 ?? r.x0), Y0 = Math.min(r.y0, prev?.y0 ?? r.y0);
  const X1 = Math.max(r.x1, prev?.x1 ?? r.x1), Y1 = Math.max(r.y1, prev?.y1 ?? r.y1);
  for (let y = Y0; y < Y1; y++) {
    for (let x = X0; x < X1; x++) {
      const i = y * w + x, o = i * 4, c = col[i] * 4;
      out[o] = RGBA_LUT[c]; out[o + 1] = RGBA_LUT[c + 1]; out[o + 2] = RGBA_LUT[c + 2]; out[o + 3] = RGBA_LUT[c + 3];
    }
  }
}

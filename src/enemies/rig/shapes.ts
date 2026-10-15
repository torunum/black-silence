import type { Builder, PrimOpts } from "../../render/viewmodel/builder";
import type { TexFn } from "../../render/viewmodel/raster";

/**
 * Shapes and surface shaders the rigs share. `Builder` extrudes along z (a
 * prism) and x/z (profiles); a limb hangs along y, so `limb` turns a prism to
 * stand on its end. The `*Tex` shaders return a tone offset per pixel from
 * the pixel's point in the part's own frame — sums of sines, no
 * `Math.random`, so the same body always bakes the same skin.
 */

const HALF_PI = Math.PI / 2;

/** A tapered rod standing along local y from `y0` to `y1` at (`x`,`z`), radius `r0` at `y0` and `r1` at `y1`. Its `tex` sees the rod's own frame (z is its length). */
export function limb(b: Builder, x: number, z: number, y0: number, y1: number, r0: number, r1: number, mat: number, n = 7, o?: PrimOpts & { caps?: boolean }): void {
  b.push(); b.translate(x, 0, z); b.pitch(HALF_PI);
  if (y1 >= y0) b.cyl(0, 0, y0, y1, r0, r1, n, mat, o);
  else b.cyl(0, 0, y1, y0, r1, r0, n, mat, o);   // a prism runs from its low end to its high: a limb drawn downward is the same one, the other way round
  b.pop();
}

/** A rod along local x from `x0` to `x1` at (`y`,`z`). */
export function rodX(b: Builder, x0: number, x1: number, y: number, z: number, r0: number, r1: number, mat: number, n = 6, o?: PrimOpts): void {
  b.push(); b.translate(0, y, z); b.yaw(HALF_PI);
  b.cyl(0, 0, x0, x1, r0, r1, n, mat, o);
  b.pop();
}

/** A rod along local z from `z0` to `z1` at (`x`,`y`). */
export function rodZ(b: Builder, x: number, y: number, z0: number, z1: number, r0: number, r1: number, mat: number, n = 6, o?: PrimOpts): void {
  b.cyl(x, y, z0, z1, r0, r1, n, mat, o);
}

/** Blotchy patches: dark rot where two waves agree, a wet sheen where they cancel. `s` scales the patches. */
export const blotchTex = (s = 1, rot = 1.1, sheen = -1.3): TexFn => (x, y, z) => {
  const v = Math.sin(x * 47 * s + z * 31 * s) * Math.sin(y * 53 * s + x * 17 * s) + Math.sin(z * 61 * s + y * 23 * s) * 0.8;
  return v > rot ? -1.3 : v < sheen ? 0.8 : 0;
};

/** Torn cloth: faint horizontal weave and the odd dark stain. */
export const clothTex: TexFn = (x, y, z) => {
  const v = Math.sin(y * 130 + Math.sin(x * 40 + z * 20) * 2.4);
  return v > 0.8 ? -0.7 : Math.sin(x * 33 + y * 21 + z * 18) > 0.9 ? -1.1 : 0;
};

/** Bone: a few dark hairline cracks. */
export const crackTex: TexFn = (x, y, z) => {
  const c = Math.sin(x * 90 + y * 60 + Math.sin(z * 50) * 3);
  return Math.abs(c) < 0.07 ? -1.4 : 0;
};

/** Wet meat: a running glisten along the grain, and darker pits. */
export const meatTex: TexFn = (x, y, z) => {
  const g = Math.sin(y * 85 + Math.sin(x * 55 + z * 35) * 1.6);
  return g > 0.86 ? 1.1 : g < -0.88 ? -0.9 : 0;
};

/**
 * `b` drawing everything `k` times larger: the builder has no scale (its rotations must stay orthonormal), so a part drawn
 * at one size and wanted at another — a head larger than the anatomy's, a boss's claw — is drawn through this. Joint
 * frames are the caller's: only the primitives and the translations made through the returned builder are scaled.
 */
export function scaled(b: Builder, k: number): Builder {
  const f = (p: string | symbol): unknown => {
    switch (p) {
      case "box": return (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: number, o?: PrimOpts) => b.box(x0 * k, y0 * k, z0 * k, x1 * k, y1 * k, z1 * k, m, o);
      case "cbox": return (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number, m: number, o?: PrimOpts) => b.cbox(x0 * k, y0 * k, z0 * k, x1 * k, y1 * k, z1 * k, c * k, m, o);
      case "cyl": return (x: number, y: number, z0: number, z1: number, r0: number, r1: number, n: number, m: number, o?: PrimOpts & { a0?: number; caps?: boolean }) => b.cyl(x * k, y * k, z0 * k, z1 * k, r0 * k, r1 * k, n, m, o);
      case "prz": return (pr: Array<[number, number]>, z0: number, z1: number, m: number, o?: PrimOpts & { r1?: number }) => b.prz(pr.map(([x, y]) => [x * k, y * k] as [number, number]), z0 * k, z1 * k, m, o);
      case "ball": return (x: number, y: number, z: number, r: number, m: number, seg?: number, o?: PrimOpts) => b.ball(x * k, y * k, z * k, r * k, m, seg, o);
      case "translate": return (x: number, y: number, z: number) => b.translate(x * k, y * k, z * k);
      default: { const v = (b as unknown as Record<string | symbol, unknown>)[p]; return typeof v === "function" ? v.bind(b) : v; }
    }
  };
  return new Proxy(b, { get: (_t, p) => f(p) });
}

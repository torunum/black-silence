import { Cells, bitmap, clamp01, fbm, hash, mix, newHit, noise, putLit, ramp, smooth, type Bitmap } from "./HellPaint";

/**
 * HELL'S LAVA — the two layers of the burning pit (`src/fx/Lava.ts` lays them
 * over each other and moves them): a molten sheet and, above it, a drifting
 * crust. Both are 256 x 256 texels over 8 world units (32 texels a unit, the
 * density of every wall in the game), both wrap, and the only thing that ever
 * moves is their texture offset — nothing is repainted.
 *
 * **Why two textures and not one.** A single scrolling texture slides as a
 * rigid sheet and reads as a conveyor belt. Two layers moving at different
 * speeds and angles shear against each other: the crust plates ride the
 * flow, break apart and come together over the bright metal underneath, which
 * is what a surface of cooling lava does.
 *
 * - **The sheet** is warped, ridged noise run through a fire ramp and posterised
 *   to a handful of bands: dull red troughs, orange fields, yellow veins where
 *   the ridges are. Banding is a deliberate choice for the pixelated renderer —
 *   a smooth gradient dithers into mush, bands read as shapes.
 * - **The crust** is a lattice of plates (`Cells`), some missing, each hot red at
 *   its rim where it meets the sheet and cooling to charred black toward the middle,
 *   with a paler lit upper edge. A texel is fully opaque or fully gone (the material
 *   is alpha-tested), so there is nothing to sort.
 *
 * Both are unlit, so their colours are painted through `putLit` (`HellPaint.ts`
 * says why): the numbers below are the colours wanted on screen.
 */

/** The colours wanted on screen, dull red to a pale yellow that only the ridges reach. */
const SHEET: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, 120, 20, 6], [.22, 176, 36, 8], [.45, 214, 66, 10], [.68, 232, 106, 16], [.86, 240, 156, 36], [1, 246, 206, 96],
];
const BANDS = 7;
const N = 256;

/** The molten sheet: 256 x 256, opaque. */
export function paintLava(seed = 51): Bitmap {
  const b = bitmap(N, N), c = [0, 0, 0];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    // domain warp: the field is dragged sideways by a slower one, which makes the veins meander
    const X = x + (noise(x / 32, y / 32, 8, 8, seed) - .5) * 28, Y = y + (noise(x / 32, y / 32, 8, 8, seed + 1) - .5) * 28;
    const flow = fbm(X / 64, Y / 64, 4, 4, seed + 2, 3);
    const vein = 1 - Math.abs(2 * fbm(X / 42.667, Y / 42.667, 6, 6, seed + 3, 2) - 1);   // 1 along a ridge
    const heat = clamp01(.30 * flow + .66 * vein ** 3 + .05);
    const q = Math.floor(heat * BANDS) / BANDS + 1 / (BANDS * 2);                        // posterised, centred in its band
    ramp(SHEET, q, c);
    const grain = (hash(x, y, seed + 9) - .5) * 12;
    putLit(b, x, y, c[0] + grain, c[1] + grain * .6, c[2] + grain * .3);
  }
  return b;
}

/**
 * The lava fall's sheet: 64 x 256 texels, 2 x 8 world units, streaks that run the length of the fall. Noise stretched
 * eight to one along the fall, hot yellow-white ribbons in orange, now and then a dull-red gap. Wraps both ways.
 */
export function paintFall(seed = 71): Bitmap {
  const W = 64, H = 256, b = bitmap(W, H), c = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = .62 * noise(x / 4, y / 32, 16, 8, seed) + .38 * noise(x / 2, y / 16, 32, 16, seed + 1);
    const heat = clamp01(.12 + 1.5 * (n - .28));
    const q = Math.floor(heat * 6) / 6 + 1 / 12;
    ramp(SHEET, .18 + q * .82, c);
    const grain = (hash(x, y, seed + 2) - .5) * 10;
    putLit(b, x, y, c[0] + grain, c[1] + grain * .6, c[2] + grain * .3);
  }
  return b;
}

/** The cooling crust: 256 x 256 RGBA, a texel opaque or absent. About two plates in three are there, and no two outlines alike. */
export function paintCrust(seed = 61): Bitmap {
  const b = bitmap(N, N), cells = new Cells(N, N, 6, 6, seed, .9), h = newHit();
  const hot: readonly number[] = [168, 44, 14], cold: readonly number[] = [30, 20, 18];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    cells.query(x + .5, y + .5, h);
    if (hash(h.id1, 1, seed) > .68) continue;                                    // no plate here: the sheet shows through
    const ragged = (noise(x / 8, y / 8, 32, 32, seed + 4) - .5) * 12;            // the outline wanders
    const e = h.e + ragged - 2 - hash(h.id1, 2, seed) * 4;                       // plates are smaller than their cells, each by its own margin
    if (e < 0) continue;
    const lit = (h.nx * -.55 + h.ny * -.83) * (1 - smooth(0, 6, e)) * 20;        // upper left edges catch the glow of the pit
    const grain = (hash(x, y, seed + 5) - .5) * 8;
    if (e < 3) { putLit(b, x, y, 232, 84 + e * 12, 14 + e * 6); continue; }       // the molten rim
    const t = smooth(3, 17, e);                                                  // red at the rim, charred in the middle
    putLit(b, x, y, mix(hot[0], cold[0], t) + grain + lit, mix(hot[1], cold[1], t) + grain * .7 + lit * .6, mix(hot[2], cold[2], t) + grain * .5 + lit * .4);
  }
  return b;
}

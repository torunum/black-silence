import { bitmap, clamp01, fbm, hash, mix, noise, put, smooth, type Bitmap } from "./HellPaint";

/**
 * THE SEWERS' WATER (and the womb's blood, the same two layers in its own colours, `TONES`) — the two layers of standing sewage (`src/fx/Water.ts` lays them over each other and moves them), painted the way
 * hell's lava is (`HellLava.ts`): a sheet and a broken layer over it, each wrapping, and nothing ever repainted — only their offsets move.
 * 128 x 128 texels over 4 world units (32 a unit, the density of every wall in the game).
 *
 * - **The sheet** is murky green-brown water with the light lying on it in ripples: ridged noise, posterised to a few bands so the
 *   pixelated renderer draws shapes and not mush. It is lit (a torch shows on it, the dark swallows it), unlike the lava, which is the light.
 * - **The scum** is the froth and filth riding on it: ragged blotches, fully opaque or fully gone (alpha-tested, nothing to sort), drifting
 *   slower than the water and across it, so the two shear and the surface reads as moving water and not a conveyor belt.
 */

const N = 128;
const BANDS = 5;

/** A fluid's colours: the sheet's darkest and lightest, the scum's froth and its thick middle (r, g, b each). */
export interface FluidTone { lo: readonly number[]; hi: readonly number[]; froth: readonly number[]; thick: readonly number[] }
/** The sewers' sewage, and the womb's blood (dark arterial red, the light on it pink, clots riding on it). */
export const TONES: Readonly<Record<"sewage" | "blood", FluidTone>> = {
  sewage: { lo: [14, 22, 16], hi: [104, 112, 84], froth: [112, 104, 70], thick: [52, 44, 26] },
  blood: { lo: [26, 4, 6], hi: [150, 44, 46], froth: [96, 18, 20], thick: [44, 6, 8] },
};

/** The sheet: opaque, dark water with the ripples' highlights. */
export function paintWater(seed = 81, tone: FluidTone = TONES.sewage): Bitmap {
  const b = bitmap(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const X = x + (noise(x / 16, y / 16, 8, 8, seed) - .5) * 14, Y = y + (noise(x / 16, y / 16, 8, 8, seed + 1) - .5) * 14;
    const depth = fbm(X / 32, Y / 32, 4, 4, seed + 2, 3);                              // darker and lighter water
    const ridge = 1 - Math.abs(2 * fbm(X / 21.333, Y / 21.333, 6, 6, seed + 3, 2) - 1);   // 1 along a ripple's crest
    const lite = clamp01(.38 * depth + .85 * ridge ** 6 - .1);                        // dark water; the light only on the crests
    const q = Math.floor(lite * BANDS) / BANDS + 1 / (BANDS * 2);
    const grain = (hash(x, y, seed + 9) - .5) * 6;
    const k = q * q, { lo, hi } = tone;
    put(b, x, y, mix(lo[0], hi[0], k) + grain, mix(lo[1], hi[1], k) + grain, mix(lo[2], hi[2], k) + grain * .6);
  }
  return b;
}

/** The scum: RGBA, a texel opaque or absent; about a tenth of the surface is filth. */
export function paintScum(seed = 91, tone: FluidTone = TONES.sewage): Bitmap {
  const b = bitmap(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const f = fbm(x / 16, y / 16, 8, 8, seed, 3) + (noise(x / 4, y / 4, 32, 32, seed + 1) - .5) * .12;
    if (f < .66) continue;
    const t = smooth(.66, .8, f);                                                       // a rim of froth, thick filth inside
    const grain = (hash(x, y, seed + 2) - .5) * 14;
    const { froth: f0, thick: f1 } = tone;
    put(b, x, y, mix(f0[0], f1[0], t) + grain, mix(f0[1], f1[1], t) + grain, mix(f0[2], f1[2], t) + grain * .6);
  }
  return b;
}

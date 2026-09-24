/**
 * The viewmodel's indexed palette: every weapon, glove and sleeve is drawn
 * with a handful of hard tones per material, never a gradient — the game
 * upscales the overlay nearest-neighbour with no antialiasing, so a smooth
 * ramp would only turn into banding anyway. Each material is a ramp, dark
 * to light; the rasterizer (./raster.ts) picks a tone per face from the
 * light and never blends two colours.
 *
 * A pixel's palette index is `material*8+tone` (tone 0..7), so a Uint8Array
 * holds the whole frame and the post passes (outline, contour, rim) can
 * darken or lighten a pixel by moving along its own ramp. Index 0 is empty.
 *
 * Player feedback round 2, Task 1 (docs/superpowers/plans/
 * 2026-09-24-player-feedback-2-hands.md): this replaces the reference's
 * baked pixel grids and their `GP` palette. Built at module load from
 * literals only — no `Math.random`, nothing drawn (KNOWN-20).
 */

export interface Material {
  /** Dark to light, at most 8 tones. */
  ramp: readonly string[];
  /** Ignores the light: always its top tones (glow cores, lenses, flame). */
  emissive?: boolean;
  /** Lower bound of the lit value, 0..1 — how much of the ramp a face turned away from the light still gets. */
  amb?: number;
  /** Specular strength, 0..1 — polished metal gets a hard top-tone glint. */
  spec?: number;
  /** Top silhouette edges gain a tone (a rim of light along barrels and receivers). */
  rim?: boolean;
}

export const MAT = {
  NONE: 0, OUT: 1, IRON: 2, BLUED: 3, BRASS: 4, WOOD: 5, GLOVE: 6, COAT: 7,
  CUFF: 8, ORANGE: 9, RED: 10, GOLD: 11, BONE: 12, SOUL: 13, LENS: 14,
  COPPER: 15, BLACK: 16, FLAME: 17, SILVER: 18, SKIN: 19, DEADSOUL: 20,
} as const;
export type MatId = typeof MAT[keyof typeof MAT];

export const MATERIALS: Record<number, Material> = {
  [MAT.OUT]:    { ramp: ["#07060a", "#0d0b10", "#15121a"], amb: 1 },
  [MAT.IRON]:   { ramp: ["#131519", "#1e2127", "#2c3038", "#3e444e", "#566069", "#77828c", "#a2adb6"], amb: .18, spec: .5, rim: true },
  [MAT.BLUED]:  { ramp: ["#0e1118", "#161b26", "#212a39", "#2f3c52", "#43556f", "#667d9a"], amb: .2, spec: .6, rim: true },
  [MAT.BRASS]:  { ramp: ["#2e1f0a", "#4f3710", "#77551c", "#a17a2c", "#c89f46", "#e8c676", "#fbe9b2"], amb: .2, spec: .7, rim: true },
  [MAT.WOOD]:   { ramp: ["#1e1109", "#321d0e", "#4a2c15", "#63401f", "#7e552b", "#9a6c3a"], amb: .22 },
  [MAT.GLOVE]:  { ramp: ["#1a110b", "#2e1e13", "#45301f", "#5d432c", "#77593a", "#92704a"], amb: .22, spec: .15 },
  [MAT.COAT]:   { ramp: ["#0d0d11", "#16161c", "#202028", "#2c2c36", "#3a3a46", "#4a4a57"], amb: .25 },
  [MAT.CUFF]:   { ramp: ["#2e2a22", "#48433a", "#665f51", "#86806c", "#a39c86"], amb: .3 },
  [MAT.ORANGE]: { ramp: ["#330f05", "#561a07", "#80290b", "#aa3d10", "#d45a1a", "#f47d2e", "#ffae66"], amb: .22, spec: .35, rim: true },
  [MAT.RED]:    { ramp: ["#2a0706", "#4a0e0a", "#70180f", "#982616", "#c23a20", "#e05a34"], amb: .25, spec: .2 },
  [MAT.GOLD]:   { ramp: ["#35260a", "#5e4412", "#8c6a1e", "#b8922e", "#dcba4c", "#f2d97c", "#fff4c4"], amb: .25, spec: .8, rim: true },
  [MAT.BONE]:   { ramp: ["#2c261c", "#484032", "#686049", "#8c8366", "#b0a787", "#d2caa9", "#ece6cc"], amb: .25, spec: .2 },
  [MAT.SOUL]:   { ramp: ["#0f3812", "#1f6a1f", "#3aa02c", "#6cd13f", "#a7f06a", "#e2ffc0"], emissive: true },
  [MAT.LENS]:   { ramp: ["#0b1220", "#162742", "#28497a", "#4f7fb8", "#a8d4ff"], amb: .1, spec: 1 },
  [MAT.COPPER]: { ramp: ["#2a1007", "#461c0c", "#6a2e15", "#904322", "#b65e32", "#d8804a", "#f2ab78"], amb: .2, spec: .6, rim: true },
  [MAT.BLACK]:  { ramp: ["#08090b", "#0f1014", "#17191e", "#21242a", "#2d3138"], amb: .15, spec: .4 },
  [MAT.FLAME]:  { ramp: ["#7a2a08", "#c0480e", "#f07a1c", "#ffb040", "#ffe08a", "#fff6d8"], emissive: true },
  [MAT.SILVER]: { ramp: ["#23262b", "#3b4047", "#5a616b", "#818a95", "#adb6bf", "#d8dee4", "#f6f8fa"], amb: .25, spec: .9, rim: true },
  [MAT.SKIN]:   { ramp: ["#2c1812", "#4a2a1e", "#6c4130", "#8e5a42", "#ad7458"], amb: .3 },
  [MAT.DEADSOUL]: { ramp: ["#0c100c", "#162016", "#223022", "#2f4230", "#3e563f"], amb: .3, spec: .5 },
};

/** Tones in a material's ramp. */
export function toneCount(mat: number): number {
  return MATERIALS[mat]?.ramp.length ?? 1;
}

/** RGBA per palette index (index = material*8+tone), built once from the ramps above. */
export const RGBA_LUT: Uint8Array = (() => {
  const lut = new Uint8Array(256 * 4);
  for (const key of Object.keys(MATERIALS)) {
    const mat = Number(key), ramp = MATERIALS[mat].ramp;
    for (let t = 0; t < 8; t++) {
      const hex = ramp[Math.min(t, ramp.length - 1)];
      const i = (mat * 8 + t) * 4;
      lut[i] = parseInt(hex.slice(1, 3), 16);
      lut[i + 1] = parseInt(hex.slice(3, 5), 16);
      lut[i + 2] = parseInt(hex.slice(5, 7), 16);
      lut[i + 3] = 255;
    }
  }
  return lut;
})();

import * as THREE from "three";
import { makeTex } from "./ProcTextures";

/**
 * TRIM BANDS — one plain dressed-stone texture per wall theme, for the wall
 * courses `src/world/Trim.ts` builds (the plinth and the cornice).
 *
 * The courses used to wear the level's own wall texture. That read well on
 * the grey stone levels and badly everywhere else: the prologue's orange
 * veins ran straight through the band and made it busy, and on the flesh
 * level the course dissolved into the wall it was meant to frame. A course
 * is a line drawn around a room; it needs a surface of its own that is
 * quieter than the wall and a different value from it. So each theme gets
 * a band: joints every half cell, a faint tone step from block to block,
 * a little grain, and nothing else.
 *
 * ## Why this is its own module and not part of `buildTextures`
 *
 * `tests/behavior/textures.test.ts` runs `buildTextures` and the frozen
 * reference's copy of it side by side and compares every canvas call, in
 * order. A texture added there would make the port's log diverge from the
 * reference's. And `tests/fidelity.test.ts` holds `TEX`'s key set equal to
 * the reference's, so the bands live in their own registry, `BANDTEX`,
 * which `tests/integration/gameplayTrace.ts`'s `buildTextureIndex` names as
 * `band.<theme>` — a fixture reads `band.hell`, never an `unnamed#N` whose
 * number would shift every other unnamed texture after it.
 *
 * ## Why nothing here calls `Math.random`
 *
 * Textures are built at boot, and the trace harness seeds `Math.random`, so
 * every draw a boot-time texture takes shifts every gameplay draw after it
 * — enemy timing, elite rolls, everything (the same coupling as
 * `docs/known-issues.md`'s KNOWN-20 and Phase 2A's `generateUUID` finding).
 * The grain and the block tones come from `grain`, an integer hash of the
 * texel's coordinates and the theme's seed: the same texture every boot,
 * and not one draw from the shared stream. `tests/render/bandTextures.test.ts`
 * pins both halves. (Constructing any three.js texture still draws a UUID;
 * the trace harness already keeps those out of the seeded stream.)
 *
 * ## Size, and what the course actually samples
 *
 * 64 x 64, the size of every wall texture, because `Trim.ts` maps the
 * course at the wall's own texel density (64 texels per `WALLH` up, 64 per
 * `CELL` along). So the course's 0.34-unit height covers only about six
 * rows at the bottom of the canvas, and every row here is the same pattern:
 * the band has no vertical structure to lose to that crop, and the course's
 * chamfer — lit at a different angle from its face — draws the one line a
 * moulding needs. Along the course, a joint every 32 texels is a block one
 * unit long, and the joint is two texels wide so it stays a line rather
 * than a flicker at room distances under `NearestFilter`.
 */

/** The four wall themes `loadLevel` chooses between, and so the four bands. */
export type BandTheme = "hell" | "flesh" | "dungeon" | "church";

/** Base stone colour, joint colour, and a seed for the grain — per theme. */
interface BandSpec { stone: [number, number, number]; joint: [number, number, number]; seed: number }

/**
 * Each band is a stone of a different value and a lower saturation than the
 * wall it runs along: ash-grey against the prologue's dark red brick, pale
 * bone against the flesh level's raw red, and a lighter, warmer dressing of
 * the dungeon's and the church's own greys.
 */
export const BAND_SPECS: Readonly<Record<BandTheme, BandSpec>> = {
  hell: { stone: [66, 56, 52], joint: [24, 16, 14], seed: 1 },
  flesh: { stone: [112, 100, 88], joint: [46, 30, 28], seed: 2 },
  dungeon: { stone: [64, 66, 66], joint: [22, 24, 26], seed: 3 },
  church: { stone: [76, 70, 74], joint: [30, 26, 32], seed: 4 },
};

/** Texels between joints along the course, and the joint's width. */
export const BLOCK_LEN = 32, JOINT_W = 2;

export const BANDTEX: Partial<Record<BandTheme, THREE.CanvasTexture>> = {};

/** A deterministic hash of (a, b, seed) to [0, 1). Integer mixing only — no generator state, no `Math.random`. */
export function grain(a: number, b: number, seed: number): number {
  let t = Math.imul(a + 1, 0x27d4eb2d) ^ Math.imul(b + 1, 0x165667b1) ^ Math.imul(seed, 0x9e3779b9);
  t = Math.imul(t ^ (t >>> 15), 0x85ebca6b);
  t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
  return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
}

function drawBand(spec: BandSpec) {
  return (g: CanvasRenderingContext2D, w: number, h: number): void => {
    for (let x = 0; x < w; x++) {
      const joint = x % BLOCK_LEN < JOINT_W;
      const block = Math.floor(x / BLOCK_LEN);
      const tone = joint ? 0 : (grain(block, 0, spec.seed) - .5) * 10;   // one block a shade off the next
      const [r, gg, b] = joint ? spec.joint : spec.stone;
      for (let y = 0; y < h; y++) {
        const v = tone + (grain(x, y, spec.seed) - .5) * 8;
        g.fillStyle = `rgb(${r + v | 0},${gg + v | 0},${b + v | 0})`;
        g.fillRect(x, y, 1, 1);
      }
    }
  };
}

/** Builds all four bands into `BANDTEX`. Called once at boot, by `startGame`, after `buildTextures`. */
export function buildBandTextures(): void {
  for (const theme of Object.keys(BAND_SPECS) as BandTheme[]) BANDTEX[theme] = makeTex(drawBand(BAND_SPECS[theme]));
}

/** The theme `loadLevel` gives a level's walls, by the same flags and in the same order it tests them. */
export function bandTheme(def: { hell?: boolean; flesh?: boolean; dungeon?: boolean }): BandTheme {
  return def.hell ? "hell" : def.flesh ? "flesh" : def.dungeon ? "dungeon" : "church";
}

/** The built band for a level definition. Throws if `buildBandTextures` has not run — a course with no map would draw as flat white. */
export function bandFor(def: { hell?: boolean; flesh?: boolean; dungeon?: boolean }): THREE.CanvasTexture {
  const t = BANDTEX[bandTheme(def)];
  if (!t) throw new Error("bandFor: the trim bands were not built — buildBandTextures() runs at boot, before loadLevel");
  return t;
}

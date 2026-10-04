import * as THREE from "three";
import { makeTex } from "./ProcTextures";
import type { Bitmap } from "./HellPaint";
import { paintBand, paintBridge, paintChunk, paintRock, paintScorch, paintVault, type Painted } from "./HellRock";
import { paintCrust, paintFall, paintLava } from "./HellLava";

/**
 * HELL'S TEXTURES — the burning cavern's own surfaces, which the reference's
 * three hell textures (`TEX.hellWall/hellFloor/hellCeil`) are no longer worn
 * for. The owner, 2026-10-04: "the hell part is really bad, the textures don't
 * feel good at all" — a brick grid with straight lines drawn across it, tiled
 * on every wall (`docs/superpowers/plans/2026-10-04-hell-rework.md`).
 *
 * A named registry of its own, `HELLTEX`, for the reason `DressTextures.ts`
 * gives for `DRESSTEX` and `BandTextures.ts` for `BANDTEX`: the reference's
 * `TEX` key set is pinned to the frozen file, and `buildTextures` is pinned
 * call for call to its draws on the seeded `Math.random`, so a texture cannot go
 * into either. `tests/integration/gameplayTrace.ts`'s `buildTextureIndex` names
 * these `hell.<key>` — a fixture reads `hell.rock`, never an `unnamed#N` — as a
 * sixth source, after the other five, so nothing they name is renamed.
 *
 * The painters (`HellRock.ts`, `HellLava.ts`, on `HellPaint.ts`) are pure and
 * take no `Math.random`: every texel is the integer hash of its coordinates and
 * a seed, so building them moves nothing in the stream the traces seed. What this
 * file does is put the pixels on canvases.
 *
 * - `rock`, `scorch` — the cavern's walls and cliffs, the banks' ground: big,
 *   wrapping, world-mapped (`src/world/HellShell.ts`); `vault` is the ceiling,
 *   64 x 64 per cell, and the stone between two ceilings;
 * - `chunk` — the rock of the dressing (outcrops, fangs, columns), 64 x 64 per face;
 * - `rockGlow`, `scorchGlow`, `vaultGlow`, `chunkGlow` — their cracks alone, on black: the
 *   `emissiveMap` that keeps a fissure hot in the dark (`glowOf`);
 * - `band` — the trim courses; `bridge` — the deck;
 * - `lava`, `crust` — the pit's two layers; `fall` — the lava falls' streaks (`src/fx/Lava.ts` moves them).
 */

export type HellKey = "rock" | "rockGlow" | "scorch" | "scorchGlow" | "vault" | "vaultGlow" | "chunk" | "chunkGlow" | "band" | "bridge" | "lava" | "crust" | "fall";

export const HELLTEX: Partial<Record<HellKey, THREE.CanvasTexture>> = {};

/** Colour map -> its emissive map, by the canvas they share (a clone shares its original's canvas). */
const glowByImage = new WeakMap<object, THREE.Texture>();

/** The emissive map for a hell colour map (or a clone of one), or undefined for a surface that does not glow. */
export function glowOf(map: THREE.Texture | undefined | null): THREE.Texture | undefined {
  return map && map.image ? glowByImage.get(map.image as object) : undefined;
}

/**
 * Pixels onto a canvas: one `putImageData` where the context has it (every browser), else a `fillRect` a texel
 * (the test doubles' contexts, which only log calls) with equal neighbours merged into one run.
 */
function blit(g: CanvasRenderingContext2D, b: Bitmap): void {
  const id = typeof g.createImageData === "function" ? g.createImageData(b.w, b.h) : null;
  if (id && id.data && id.data.length === b.data.length) { id.data.set(b.data); g.putImageData(id, 0, 0); return; }
  const d = b.data;
  for (let y = 0; y < b.h; y++) {
    let x = 0;
    while (x < b.w) {
      const i = (y * b.w + x) * 4;
      let run = 1;
      while (x + run < b.w) {
        const j = i + run * 4;
        if (d[j] !== d[i] || d[j + 1] !== d[i + 1] || d[j + 2] !== d[i + 2] || d[j + 3] !== d[i + 3]) break;
        run++;
      }
      if (d[i + 3] > 0) {
        g.fillStyle = d[i + 3] === 255 ? `rgb(${d[i]},${d[i + 1]},${d[i + 2]})` : `rgba(${d[i]},${d[i + 1]},${d[i + 2]},${(d[i + 3] / 255).toFixed(3)})`;
        g.fillRect(x, y, run, 1);
      }
      x += run;
    }
  }
}

const canvasOf = (b: Bitmap): THREE.CanvasTexture => makeTex((g) => blit(g, b), b.w, b.h);

/** A colour map and (when it glows) its emissive map, into the registry. */
function addPainted(key: "rock" | "scorch" | "vault" | "chunk", p: Painted): void {
  const color = canvasOf(p.color);
  HELLTEX[key] = color;
  if (p.glow) { const glow = canvasOf(p.glow); HELLTEX[`${key}Glow` as HellKey] = glow; glowByImage.set(color.image as object, glow); }
}

/** Builds every hell texture into `HELLTEX`. Called once at boot, by `startGame`, beside `buildDressTextures`. */
export function buildHellTextures(): void {
  addPainted("rock", paintRock(1));
  addPainted("scorch", paintScorch(11));
  addPainted("vault", paintVault(21));
  addPainted("chunk", paintChunk(31));
  HELLTEX.band = canvasOf(paintBand().color);
  HELLTEX.bridge = canvasOf(paintBridge().color);
  HELLTEX.lava = canvasOf(paintLava(51));
  HELLTEX.crust = canvasOf(paintCrust(61));
  HELLTEX.fall = canvasOf(paintFall(71));
}

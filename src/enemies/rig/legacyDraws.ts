import * as THREE from "three";
import type { PixelDef } from "../pixels/types";

/**
 * THE SHIM: what the legacy bake drew from the seeded stream, for the
 * monsters that no longer have one.
 *
 * `buildSprites` bakes every creature from its rows, and doing so draws from
 * `Math.random` in two places: `texFromPx`'s wet stump colours (one draw for
 * every cell on the cut line of each torn-edge frame) and three.js's uuids
 * (`CanvasTexture` -> `Texture` and its `Source` each call `generateUUID`,
 * four draws apiece). Every gameplay trace is recorded under a seeded
 * `Math.random`, and the dice the game rolls after boot are the dice that come
 * after those draws. A rigged monster bakes none (its textures are made under
 * `quietly`), so to leave every fixture's gameplay exactly where it was,
 * `burnLegacySpriteDraws` consumes what its legacy bake would have: the stump
 * draws as `Math.random()` calls, and the uuid draws as `generateUUID()` calls,
 * so wherever the uuid draws are counted (the real game, `stuckCheck`) or
 * stubbed out of the stream (the trace harness) the stream moves as it did.
 *
 * `legacyDraws` derives the counts from the creature's rows, the way
 * `buildSprites` would have walked them; `tests/enemies/legacyDraws.test.ts`
 * runs the real legacy bake with a counter and holds the two equal for every
 * creature. Delete this file the day the fixtures are re-recorded anyway.
 */

/** The cells of row `y` of `px` in columns `[x0,x1)` that are not blank: the stump draws one mask makes. */
function stumpCells(px: readonly string[], y: number, x0: number, x1: number): number {
  if (y >= px.length || !px[y]) return 0;
  let n = 0;
  for (let x = x0; x < x1; x++) if (px[y][x] && px[y][x] !== " ") n++;
  return n;
}

export interface LegacyDraws {
  /** `Math.random()` calls: stump colours. */
  stumps: number;
  /** Textures built: each draws two uuids (a `Texture`'s and its `Source`'s). */
  textures: number;
}

/** What `buildSprites` draws for one creature. Mirrors its mask arithmetic exactly (the normalized body of `buildSprites` is pinned to the reference). */
export function legacyDraws(d: PixelDef): LegacyDraws {
  const W = d.px[0].length, H = d.px.length, head = d.head || 0;
  const armBot = Math.min(H - 3, head + Math.ceil((H - head) * 0.45));
  const lArm = stumpCells(d.px, armBot, 0, Math.ceil(W * 0.32));
  const rArm = stumpCells(d.px, armBot, Math.floor(W * 0.68), W);
  const headCells = head > 0 ? stumpCells(d.px, head, 0, W) : 0;
  const legs = stumpCells(d.px, H, 0, W);            // the legs' cut is at row H: off the grid, no stump
  // each torn-edge frame is baked twice, plain and mirrored: the head's, the arms', the legs', and the two gibbed ones
  const stumps = 2 * (headCells + lArm + rArm + legs + (headCells + lArm + rArm));
  const textures = 4 + (head > 0 ? 2 : 0) + 6 + 2 + (d.atk ? 1 : 0) + (d.die1 ? 1 : 0) + (d.die2 ? 1 : 0);
  return { stumps, textures };
}

/** Consumes the draws the legacy bake of `d` would have made. */
export function burnLegacySpriteDraws(d: PixelDef): void {
  const { stumps, textures } = legacyDraws(d);
  for (let i = 0; i < stumps; i++) Math.random();
  for (let i = 0; i < textures * 2; i++) THREE.MathUtils.generateUUID();
}

import { CELL, WALLH } from "./Grid";
import type { BuiltLevel } from "./LevelBuilder";
import { lampsOf } from "./decor/lamps";
import { PIECES } from "./decor/registry";
import { decorCell } from "./density";

/**
 * HOW LIT A ROOM IS (levels-feel-full plan, Task 3). The player carries a lamp, so a piece
 * of set dressing is always lit *when the player is beside it*; what a room's own lights
 * decide is whether it can be seen from across the room, before the lamp reaches it. This
 * adds up the level's static point lights — the torches, the windows' glow, the exit pad,
 * the challenge plate, the light-bearing decor — at a point, with three.js's own falloff
 * (`pow(saturate(1 - (d/range)^4), 2) / d^decay`), as the loader builds them
 * (`LevelLoader.ts`), and leaves the player's lamp out.
 *
 * `LIT` is the line: the light the lamp itself gives a surface 7 units off (the lamp is
 * 1.7 at range 9, decay 1.6). A cell whose static light is under that is one whose
 * pieces are not readable until the player is within lamp range: dark.
 */
export const LIT = 0.03;

interface Source { x: number; y: number; z: number; intensity: number; range: number; decay: number }

/** Every static point light of a built level, in world units, as `loadLevel` and `dressLevel` make them. */
export function staticLights(L: Pick<BuiltLevel, "g" | "decor">): Source[] {
  const out: Source[] = [], g = L.g;
  g.forEach((row, z) => row.forEach((c, x) => {
    const wx = (x + .5) * CELL, wz = (z + .5) * CELL;
    if (c === "i") out.push({ x: wx, y: 1.45, z: wz, intensity: 1.6, range: 10, decay: 1.8 });
    else if (c === "X") out.push({ x: wx, y: 1, z: wz, intensity: .9, range: 6, decay: 1 });
    else if (c === "Y") out.push({ x: wx, y: .8, z: wz, intensity: .7, range: 5, decay: 1 });
    else if (c === "W") {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const n = g[z + dz]?.[x + dx];
        if (n && !"#W".includes(n)) { out.push({ x: wx + dx * 1.7, y: WALLH * .6, z: wz + dz * 1.7, intensity: 1.1, range: 9, decay: 1.5 }); break; }
      }
    }
  }));
  for (const d of L.decor || []) if (d.k === "light") out.push({ x: (d.x + .5) * CELL, y: .8, z: (d.z + .5) * CELL, intensity: d.s || 1.5, range: d.h || 12, decay: 1.4 });
  for (const l of lampsOf(L.decor)) out.push({ x: l.x, y: l.y, z: l.z, intensity: l.intensity, range: l.range, decay: 1.8 });
  return out;
}

/** The static light at the middle of a cell at chest height. */
export function lightAt(lights: readonly Source[], cx: number, cz: number): number {
  const x = (cx + .5) * CELL, z = (cz + .5) * CELL;
  let sum = 0;
  for (const s of lights) {
    const d = Math.hypot(x - s.x, 1.2 - s.y, z - s.z), w = Math.max(0, 1 - (d / s.range) ** 4);
    sum += s.intensity * w * w / Math.max(d ** s.decay, .01);
  }
  return sum;
}

/** The pieces a room is built round — masses and light-bearers — and which of them stand in a cell the level's own lights leave dark. */
export function setPieceLight(L: Pick<BuiltLevel, "g" | "decor">, where: (x: number, z: number) => boolean = () => true): { total: number; dark: string[] } {
  const lights = staticLights(L), dark: string[] = [];
  let total = 0;
  for (const d of L.decor || []) {
    const info = PIECES[d.k];
    if (!info || (!info.mass && !info.light)) continue;
    const { x, z } = decorCell(d);
    if (!where(x, z)) continue;
    total++;
    if (lightAt(lights, x, z) < LIT) dark.push(`${d.k}(${x},${z})`);
  }
  return { total, dark };
}

/** How many of a level's walkable cells its static lights leave dark (under `LIT`), and how many it has. */
export function darkShare(L: Pick<BuiltLevel, "g" | "decor">, where: (x: number, z: number) => boolean = () => true): { dark: number; walk: number } {
  const lights = staticLights(L);
  let dark = 0, walk = 0;
  L.g.forEach((row, z) => row.forEach((c, x) => {
    if ("#W".includes(c) || !where(x, z)) return;
    walk++;
    if (lightAt(lights, x, z) < LIT) dark++;
  }));
  return { dark, walk };
}

/** The pieces that give a room something to be seen by: a point-light bearer, or a glow-only lamp (an unlit emissive piece). */
export const GLOW_PIECES: readonly string[] = ["brazier", "votive", "gravelampDim", "lanternDim", "worklampDim", "bulbDim"];
export const isLightGiver = (k: string): boolean => !!PIECES[k]?.light || GLOW_PIECES.includes(k);

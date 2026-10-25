import * as THREE from "three";
import { canvasOf } from "../render/HellTextures";
import { paintScum, paintWater, TONES } from "../render/SewerWater";
import { track } from "../render/DisposeRegistry";
import { CELL } from "../world/Grid";
import type { Grid } from "../world/LevelBuilder";

/**
 * WATER — standing sewage over the sewers' floors (owner, 2026-10-22: "geliştirmeye devam et"; the rebuilt sewers had no water in them,
 * only pools of scum dressed on dry stone; the womb's pools of blood are the same thing in its colours). Built the way hell's lava lake is (`./Lava.ts`): two flat meshes over the flooded cells,
 * a sheet and, 1 cm above it, the scum riding on it (`src/render/SewerWater.ts` paints both), world-mapped so they run unbroken over
 * the whole flood, and only their texture offsets move — 4 numbers a frame, no allocation, no `Math.random`.
 *
 * Unlike the lava the water is lit (a Phong sheet: the torches glint on it and the dark swallows it). It stands 6 cm deep on whatever
 * floor it covers, raised or not, so a wader's feet are in it; it is dressing and nothing else — no cell, no mass, no step changes.
 */

/** How deep the water stands over the floor it floods, metres. */
export const DEPTH = .06;

const water = {
  t: 0,
  sheet: null as THREE.Texture | null, scum: null as THREE.Texture | null,
};

/** Drops the last level's water. Called by every level load whether it has water or not. */
export function clearWater(): void {
  water.sheet = water.scum = null;
  water.t = 0;
}

/** The floodable cells of the given rectangles (grid x0, z0, x1, z1, inclusive): every one not a wall, a window or a door. */
export function floodCells(g: Grid, rects: ReadonlyArray<readonly [number, number, number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [], seen = new Set<number>();
  for (const [x0, z0, x1, z1] of rects) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const ch = g[z]?.[x];
    if (ch === undefined || "#WDS+".includes(ch) || seen.has(z * 4096 + x)) continue;
    seen.add(z * 4096 + x); out.push([x, z]);
  }
  return out;
}

/** World-mapped quads, one per cell at its floor plus the depth; UV = world / 4, the textures' span. */
function floodGeometry(cells: ReadonlyArray<readonly [number, number]>, hmap: number[][] | null): THREE.BufferGeometry {
  const pos = new Float32Array(cells.length * 18), nrm = new Float32Array(cells.length * 18), uv = new Float32Array(cells.length * 12);
  let p = 0, u = 0;
  for (const [cx, cz] of cells) {
    const x0 = cx * CELL, x1 = x0 + CELL, z0 = cz * CELL, z1 = z0 + CELL, y = (hmap?.[cz]?.[cx] || 0) + DEPTH;
    for (const [x, z] of [[x0, z0], [x0, z1], [x1, z1], [x0, z0], [x1, z1], [x1, z0]] as const) {
      pos[p] = x; pos[p + 1] = y; pos[p + 2] = z; nrm[p + 1] = 1; p += 3;
      uv[u++] = x / 4; uv[u++] = z / 4;
    }
  }
  const g = track(new THREE.BufferGeometry());
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

const own = (t: THREE.Texture): THREE.Texture => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true;
  return track(t);
};

/** Floods the given rectangles of the grid with the named fluid. Two scene children, `water` and `waterScum`; none when there is nothing to flood. */
export function buildWater(scene: THREE.Scene, g: Grid, rects: ReadonlyArray<readonly [number, number, number, number]> | undefined, hmap: number[][] | null,
  fluid: keyof typeof TONES = "sewage"): void {
  clearWater();
  const cells = rects ? floodCells(g, rects) : [];
  if (!cells.length) return;
  const geo = floodGeometry(cells, hmap);
  water.sheet = own(canvasOf(paintWater(81, TONES[fluid])));
  water.scum = own(canvasOf(paintScum(91, TONES[fluid])));
  water.scum.repeat.set(4 / 6, 4 / 6);   // the scum's blotches larger than the ripples: its own scale, its own period
  const sheet = new THREE.Mesh(geo, track(new THREE.MeshPhongMaterial({ map: water.sheet, specular: fluid === "blood" ? 0x6a3a3a : 0x4a5a44, shininess: fluid === "blood" ? 60 : 38 })));
  sheet.name = "water"; scene.add(sheet);
  const scum = new THREE.Mesh(geo, track(new THREE.MeshLambertMaterial({ map: water.scum, alphaTest: .5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
  scum.name = "waterScum"; scum.position.y = .01; scene.add(scum);
}

/** Every frame, from `Loop.ts`'s render block: the water flows, the scum drifts slower and across it. */
export function waterTick(dt: number): void {
  if (!water.sheet || !water.scum) return;
  const t = (water.t += dt);
  water.sheet.offset.set(t * .05 + .012 * Math.sin(t * .5), .01 * Math.sin(t * .37));
  water.scum.offset.set(t * .022, .02 * Math.sin(t * .23) + t * .004);
}

/** What the flood holds, for tests. */
export function waterState(): { built: boolean; t: number; sheet: THREE.Texture | null; scum: THREE.Texture | null } {
  return { built: !!water.sheet, t: water.t, sheet: water.sheet, scum: water.scum };
}

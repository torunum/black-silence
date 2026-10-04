import * as THREE from "three";
import { CELL } from "./Grid";
import { world } from "./WorldState";
import { ceilHeightAtCell } from "./Collision";
import { isOpenCell } from "./Trim";
import { litMaterial, shellAt, zoneThemeAt } from "./ZoneLook";
import { HELLTEX } from "../render/HellTextures";
import { track } from "../render/DisposeRegistry";
import { buildLava, clearLava } from "../fx/Lava";

/**
 * THE CAVERN'S SHELL — hell's walls, cliffs and ground as meshes mapped in
 * **world space** (the prologue's hell rework,
 * `docs/superpowers/plans/2026-10-04-hell-rework.md`).
 *
 * The rest of the game builds walls as one instanced box per cell, every face
 * wearing the same 64 x 64 tile, so a wall is a row of identical 2-unit
 * squares. That is what a texture of rock cannot survive: a fissure that runs
 * off the edge of a tile is cut off, and the cut repeats every 2 units down the
 * wall — a grid. Here every exposed face of a hell cell is a quad whose UVs are
 * *world* coordinates (`u` along the wall in eighths of a unit, `v` up in
 * sevenths), over the one wrapping texture of `HellRock.ts`, so a crack runs the
 * whole length of its wall and the rock never repeats within 8 units.
 *
 * Three groups of surface come out of it, from the grid and the height map:
 *
 *  - **walls** — each face of a wall cell onto an open cell, from that cell's floor
 *    to its ceiling (so it carries the wall on up where the ceiling is high; the
 *    ceiling's own riser is not built there, `Ceiling.ts`);
 *  - **cliffs** — where open ground is higher than its neighbour, the drop between
 *    them: the bank's side above the pit, a step's riser. The same rock, so a
 *    wall and the cliff at its foot are one surface;
 *  - **ground** — the top of every raised cell, over the scorched ground's wrapping
 *    texture, and the **lake**: the cells at floor 0 are lava (`src/fx/Lava.ts`).
 *
 * Vertex colours darken the rock with height (the lava is the light, so the roof of
 * the cave is not lit by it) and are the only lighting that is not a real light;
 * the cracks themselves are an emissive map and need no light at all.
 *
 * Only cells of a zone with `shell` are built here; the level loader skips those
 * cells' boxes, platforms and floor quads (`ZoneLook.shellAt`), and the climb's first
 * step, a platform of another zone, keeps its own sides. Pure geometry from `world`:
 * nothing here collides, draws a number from `Math.random` or is read back.
 */

/** Texels are 32 a unit; the rock map is 8 x 7 units and the ground 8 x 8. */
const U = 1 / 8, V_ROCK = 1 / 7;

/** How lit the rock is at a height: the lava's glow carries up the first few units and the roof is dark. */
const shade = (y: number): number => Math.max(.45, Math.min(1.1, 1.05 - .09 * y));

/** Triangles being gathered into one mesh. */
class Soup {
  pos: number[] = []; nrm: number[] = []; uv: number[] = []; col: number[] = [];
  /** A quad from four corners given counter-clockwise as seen from its front. */
  quad(c: ReadonlyArray<readonly [number, number, number]>, n: readonly [number, number, number], uvOf: (x: number, y: number, z: number) => readonly [number, number], lit: (y: number) => number): void {
    for (const i of [0, 1, 2, 0, 2, 3]) {
      const [x, y, z] = c[i], [u, v] = uvOf(x, y, z), k = lit(y);
      this.pos.push(x, y, z); this.nrm.push(n[0], n[1], n[2]); this.uv.push(u, v); this.col.push(k, k, k);
    }
  }
  get count(): number { return this.pos.length / 3; }
  geometry(): THREE.BufferGeometry {
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
}

const floorAt = (x: number, z: number): number => (world.heightMap && world.heightMap[z] && world.heightMap[z][x]) || 0;
const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** A vertical face on the edge of cell (x, z) toward (dx, dz), from y0 to y1, facing that way. u runs along the face, so a wall is one piece of rock. */
function wall(s: Soup, x: number, z: number, dx: number, dz: number, y0: number, y1: number): void {
  const cx = (x + .5) * CELL + dx * CELL / 2, cz = (z + .5) * CELL + dz * CELL / 2, rx = dz * CELL / 2, rz = -dx * CELL / 2;
  s.quad([[cx - rx, y0, cz - rz], [cx + rx, y0, cz + rz], [cx + rx, y1, cz + rz], [cx - rx, y1, cz - rz]], [dx, 0, dz],
    (px, py, pz) => [(px * dz - pz * dx) * U, py * V_ROCK], shade);
}

/** The top of a raised cell at height `h`, UV = world. */
function top(s: Soup, x: number, z: number, h: number): void {
  const x0 = x * CELL, x1 = x0 + CELL, z0 = z * CELL, z1 = z0 + CELL;
  s.quad([[x0, h, z0], [x0, h, z1], [x1, h, z1], [x1, h, z0]], [0, 1, 0], (px, _py, pz) => [px * U, pz * U], () => 1);
}

/** Builds the shell of every `shell` zone, and the lake. Called by `loadLevel` after the platforms; clears the last level's lake on a level with none. */
export function buildHell(scene: THREE.Scene): void {
  const zs = world.zones;
  if (!zs || !zs.themes.some((t) => t.shell) || !HELLTEX.rock || !HELLTEX.scorch) { clearLava(); return; }
  const rock = new Soup(), ground = new Soup(), pit: Array<[number, number]> = [];
  for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
    if (!shellAt(x, z)) continue;
    const ch = world.grid[z][x];
    if (ch === "#" || ch === "W") {
      for (const [dx, dz] of DIRS) {
        const nx = x + dx, nz = z + dz;
        if (isOpenCell(nx, nz)) wall(rock, x, z, dx, dz, floorAt(nx, nz), ceilHeightAtCell(nx, nz));
      }
      continue;
    }
    if (!isOpenCell(x, z)) continue;
    const h = floorAt(x, z);
    if (h <= 0) { const t = zoneThemeAt(x, z); if (t && t.lava) pit.push([x, z]); continue; }
    top(ground, x, z, h);
    for (const [dx, dz] of DIRS) {
      const nx = x + dx, nz = z + dz;
      if (isOpenCell(nx, nz) && floorAt(nx, nz) < h) wall(rock, x, z, dx, dz, floorAt(nx, nz), h);
    }
  }
  if (rock.count) {
    const m = new THREE.Mesh(rock.geometry(), track(litMaterial(HELLTEX.rock, { vertexColors: true })));
    m.name = "hellRock"; scene.add(m);
  }
  if (ground.count) {
    const m = new THREE.Mesh(ground.geometry(), track(litMaterial(HELLTEX.scorch)));
    m.name = "hellGround"; scene.add(m);
  }
  buildLava(scene, pit);
}

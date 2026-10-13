import * as THREE from "three";
import { world } from "../../src/world/WorldState";
import { setScene } from "../../src/render/SceneRef";
import { reseedFx } from "../../src/fx/FxRand";
import { buildGore, resetGore } from "../../src/fx/GoreFx";
import { renderState } from "../../src/render/Renderer";
import { buildParticles } from "../../src/fx/Particles";
import { resetDecals } from "../../src/fx/Decals";
import { resetGibs } from "../../src/fx/Gibs";
import { headPool } from "../../src/fx/Heads";

/**
 * A bare world for the gore's unit tests (impact plan, Task 3): an open
 * arena of `N` x `N` cells (2 units each) whose floor at a cell is
 * `floorAt(gx, gz)`, a real `THREE.Scene` set for the FX modules, the
 * effects' own dice reseeded, and the level's gore pools built in it.
 * Returns the scene. No level is loaded: only the fields `solidAt`,
 * `floorHeightAt` and the pools read are laid down.
 */
export const ARENA_N = 24;

export function gorePit(floorAt: (gx: number, gz: number) => number = () => 0, walls: Array<[number, number]> = []): THREE.Scene {
  world.grid = Array.from({ length: ARENA_N }, () => Array.from({ length: ARENA_N }, () => "."));
  for (const [gx, gz] of walls) world.grid[gz][gx] = "#";
  // a ring of wall round the arena, so nothing flies out of the world
  for (let i = 0; i < ARENA_N; i++) { world.grid[0][i] = "#"; world.grid[ARENA_N - 1][i] = "#"; world.grid[i][0] = "#"; world.grid[i][ARENA_N - 1] = "#"; }
  world.GW = ARENA_N; world.GH = ARENA_N;
  world.heightMap = Array.from({ length: ARENA_N }, (_, gz) => Array.from({ length: ARENA_N }, (_, gx) => floorAt(gx, gz)));
  world.ceilMap = null;
  world.masses.clear(); world.doors = {}; world.wallSegs = []; world.props = [];
  const scene = new THREE.Scene();
  setScene(scene);
  (renderState as { scene: unknown }).scene = scene;
  reseedFx();
  buildParticles(); resetDecals(); resetGibs(); headPool.heads = [];   // the game's own pools, which the parts' blood and bounces still draw on
  resetGore();
  buildGore();
  return scene;
}

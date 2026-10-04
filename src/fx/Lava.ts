import * as THREE from "three";
import { HELLTEX } from "../render/HellTextures";
import { track } from "../render/DisposeRegistry";
import { CELL } from "../world/Grid";
import type { DecorSpec } from "../world/LevelBuilder";

/**
 * LAVA — the burning pit as a lake of fire, a lava fall down its far wall,
 * and the heat that breathes in every cracked surface of hell (the prologue's
 * hell rework, `docs/superpowers/plans/2026-10-04-hell-rework.md`).
 *
 * **What it is.** Two flat meshes over the pit's floor cells. `lava` is the
 * molten sheet (`HELLTEX.lava`); `lavaCrust` hangs 3 cm above it and wears the
 * cooling crust (`HELLTEX.crust`, alpha-tested, so it needs no sorting). Both
 * are `MeshBasicMaterial`s: **unlit**, so the lava glows however dark the
 * cavern is and the lamp, the torches and the shadow map have no say in it —
 * and the fog still takes it, which is what lets depth read across the pit.
 * The light it throws on the walls is the pit's real point lights
 * (`decorLight`, `HellFire.ts`), not the mesh.
 *
 * **What moves, and what it costs.** Nothing is repainted. Each frame the sheet's
 * and the crust's `texture.offset` are set from a clock — the sheet flowing along
 * the pit's length, the crust drifting slower and across it, so the two shear
 * against each other (`HellLava.ts` says why) — and the sheet's brightness
 * swells and gutters on two sines. That is 4 numbers written into 2 textures, 1
 * colour, and `emissiveIntensity` on the handful of cracked-rock materials
 * (`heatMaterial`): no allocation, no `Math.random`, no per-frame upload (the
 * offset reaches the shader as a uniform). Two draw calls for the whole pit, one
 * more for the fall. `tests/fx/lava.test.ts` counts the allocations.
 */

interface Heat { m: THREE.MeshLambertMaterial; seed: number }

const lava = {
  t: 0,
  sheet: null as THREE.Texture | null, crust: null as THREE.Texture | null, sheetMat: null as THREE.MeshBasicMaterial | null,
  fall: null as THREE.Texture | null,
  heat: [] as Heat[],
};

/** Cracked rock's emissive maps pulse with the pit: register a material and its `emissiveIntensity` follows the clock until it is disposed. */
export function heatMaterial(m: THREE.MeshLambertMaterial): void {
  const h: Heat = { m, seed: lava.heat.length * 1.9 + .4 };
  lava.heat.push(h);
  m.addEventListener("dispose", () => { const i = lava.heat.indexOf(h); if (i >= 0) lava.heat.splice(i, 1); });
}

/** Drops the last level's lake. Called by every level load whether it has lava or not. */
export function clearLava(): void {
  lava.sheet = lava.crust = lava.sheetMat = lava.fall = null;
  lava.t = 0;   // every load starts the fire at the same moment: the lake is a pure function of the clock since the level began
}

/** World-mapped quads: one per cell, UV = world / 8, so the sheet and the crust run unbroken across the whole pit. */
function pitGeometry(cells: ReadonlyArray<readonly [number, number]>): THREE.BufferGeometry {
  const pos = new Float32Array(cells.length * 18), nrm = new Float32Array(cells.length * 18), uv = new Float32Array(cells.length * 12);
  let p = 0, u = 0;
  for (const [cx, cz] of cells) {
    const x0 = cx * CELL, x1 = x0 + CELL, z0 = cz * CELL, z1 = z0 + CELL;
    for (const [x, z] of [[x0, z0], [x0, z1], [x1, z1], [x0, z0], [x1, z1], [x1, z0]] as const) {
      pos[p] = x; pos[p + 1] = 0; pos[p + 2] = z; nrm[p + 1] = 1; p += 3;
      uv[u++] = x / 8; uv[u++] = z / 8;
    }
  }
  const g = track(new THREE.BufferGeometry());
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

const own = (t: THREE.Texture): THREE.Texture => {
  const c = track(t.clone());
  c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.magFilter = c.minFilter = THREE.NearestFilter;
  return c;
};

/** Lays the lake over the given cells (grid x, z). Two scene children: `lava` and `lavaCrust`. */
export function buildLava(scene: THREE.Scene, cells: ReadonlyArray<readonly [number, number]>): void {
  clearLava();
  if (!cells.length || !HELLTEX.lava || !HELLTEX.crust) return;
  const geo = pitGeometry(cells);
  lava.sheet = own(HELLTEX.lava);
  lava.crust = own(HELLTEX.crust);
  lava.crust.repeat.set(8 / 12, 8 / 12);                  // the crust's plates are larger than the sheet's features: its own scale, its own period
  lava.sheetMat = track(new THREE.MeshBasicMaterial({ map: lava.sheet }));
  const sheet = new THREE.Mesh(geo, lava.sheetMat);
  sheet.name = "lava"; scene.add(sheet);
  const crust = new THREE.Mesh(geo, track(new THREE.MeshBasicMaterial({ map: lava.crust, alphaTest: .5, color: 0xe6c8b4, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })));
  crust.name = "lavaCrust"; crust.position.y = .03; scene.add(crust);
}

/** A fall of lava down a wall: `d.x, d.z` the cell it hangs in, `r` the yaw it faces, `s` its width, `h` its height from the pit's level. One scene child. */
export function buildLavafall(scene: THREE.Scene, d: DecorSpec): void {
  if (!HELLTEX.fall) return;
  const w = d.s || 2, h = d.h || 6;
  lava.fall = own(HELLTEX.fall);
  lava.fall.repeat.set(w / 2, h / 8);                       // 32 texels a unit across, 32 down: the texture is 2 x 8 units
  const m = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), track(new THREE.MeshBasicMaterial({ map: lava.fall, fog: false })));   // a beacon: the far wall's glow carries through the haze
  m.name = "lavafall";
  m.position.set((d.x + .5) * CELL, h / 2, (d.z + .5) * CELL);
  m.rotation.y = d.r || 0;
  scene.add(m);
}

/** Every frame, from `Loop.ts`'s render block. */
export function lavaTick(dt: number): void {
  const t = (lava.t += dt);
  if (lava.sheet && lava.crust && lava.sheetMat) {
    lava.sheet.offset.set(t * .006 + .01 * Math.sin(t * .31), t * .016);
    lava.crust.offset.set(-t * .004 + .015 * Math.sin(t * .2), t * .007 + .01 * Math.sin(t * .27 + 1));
    lava.sheetMat.color.setScalar(.9 + .1 * Math.sin(t * 1.3) * Math.sin(t * .7 + 1) + .03 * Math.sin(t * 5.1));
  }
  if (lava.fall) lava.fall.offset.set(.05 * Math.sin(t * .4), -t * .16);
  for (const h of lava.heat) h.m.emissiveIntensity = .95 + .17 * Math.sin(t * 1.7 + h.seed) + .06 * Math.sin(t * 6.3 + 2 * h.seed);
}

/** What the lake holds, for tests: whether it is built, the clock, and how many materials breathe with it. */
export function lavaState(): { built: boolean; t: number; heat: number; sheet: THREE.Texture | null; crust: THREE.Texture | null; sheetMat: THREE.MeshBasicMaterial | null } {
  return { built: !!lava.sheet, t: lava.t, heat: lava.heat.length, sheet: lava.sheet, crust: lava.crust, sheetMat: lava.sheetMat };
}

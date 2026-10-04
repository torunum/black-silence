import * as THREE from "three";
import { CELL } from "./Grid";
import { world } from "./WorldState";
import { track } from "../render/DisposeRegistry";
import { themeTex, themeKey, surfaceKey, lookAt, litMaterial, shellAt, type ThemeFlags } from "./ZoneLook";

/**
 * The level's walls, floor and raised platforms as scene children — moved
 * out of `src/world/LevelLoader.ts` (prologue plan, Task 1), which was 375
 * lines against the 400-line gate and had to learn zones. The same seam
 * `Ceiling.ts` and `Trim.ts` were cut along: everything here reads `world`
 * and writes nothing but scene children, and the loader never looks at
 * these meshes again.
 *
 * **One mesh per look.** Walls, platforms and (on a zoned level) the floor
 * are grouped by the look of their cell (`ZoneLook.ts`), one `InstancedMesh`
 * per group. A level with no zones has exactly one group — the level's own
 * look — so it gets back the very children it always had: one `wall`
 * `InstancedMesh` with one material, one `platform` `InstancedMesh` with the
 * six-face material array, and the single floor `PlaneGeometry` with its
 * texture cloned and repeated `GW x GH`. Pinned by `tests/world/zones.test.ts`
 * and by the level-1 and level-2 trace fixtures, which did not move.
 *
 * **The zoned floor** is one quad per cell, instanced per look, with the
 * texture at `repeat(1,1)` — the big plane tiles its texture once per cell,
 * so a per-cell quad shows the very same tile. It exists because a plane can
 * wear only one texture.
 */

/** The level's wall material for a cell — one per look, shared, created on first ask. */
export function wallMaterials(level: ThemeFlags): (x: number, z: number) => THREE.MeshLambertMaterial {
  const byKey = new Map<string, THREE.MeshLambertMaterial>();
  return (x, z) => {
    const look = lookAt(x, z, level), key = themeKey(look);
    let m = byKey.get(key);
    if (!m) { m = track(litMaterial(themeTex(look).wall)); byKey.set(key, m); }
    return m;
  };
}

/** One named `InstancedMesh` per material, in the order each material was first seen. */
export function addInstanced(scene: THREE.Scene, geo: THREE.BufferGeometry,
  groups: Map<THREE.Material | THREE.Material[], THREE.Matrix4[]>, name: string): void {
  for (const [mat, mats] of groups) {
    if (!mats.length) continue;
    const mesh = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((mtx, i) => mesh.setMatrixAt(i, mtx));
    mesh.name = name;
    mesh.instanceMatrix.needsUpdate = true; scene.add(mesh);
  }
}

/** Pushes `mtx` onto `mat`'s list. */
export function groupPush<K>(groups: Map<K, THREE.Matrix4[]>, key: K, mtx: THREE.Matrix4): void {
  const list = groups.get(key);
  if (list) list.push(mtx); else groups.set(key, [mtx]);
}

function nearestTex(base: THREE.Texture, rx: number, rz: number): THREE.Texture {
  const t = track(base.clone());
  t.needsUpdate = true; t.repeat.set(rx, rz);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return t;
}

/** The floor: the level's one plane, or on a zoned level one quad per cell, instanced per look. */
export function buildFloor(scene: THREE.Scene, level: ThemeFlags): void {
  if (!world.zones) {
    const floorTex = nearestTex(themeTex(level).floor, world.GW, world.GH);
    const fm = new THREE.Mesh(track(new THREE.PlaneGeometry(world.GW * CELL, world.GH * CELL)),
      track(new THREE.MeshLambertMaterial({ map: floorTex })));
    fm.name = "floor";
    fm.rotation.x = -Math.PI / 2; fm.position.set(world.GW * CELL / 2, 0, world.GH * CELL / 2); scene.add(fm);
    return;
  }
  const mats = new Map<string, THREE.Material>(), groups = new Map<THREE.Material, THREE.Matrix4[]>();
  for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
    if (shellAt(x, z)) continue;   // a shell zone's ground and lake are HellShell.ts's
    const look = lookAt(x, z, level), key = surfaceKey(look);
    let m = mats.get(key);
    if (!m) { m = track(new THREE.MeshLambertMaterial({ map: nearestTex(themeTex(look).floor, 1, 1) })); mats.set(key, m); }
    groupPush(groups, m, new THREE.Matrix4().setPosition((x + .5) * CELL, 0, (z + .5) * CELL));
  }
  const geo = track(new THREE.PlaneGeometry(CELL, CELL)); geo.rotateX(-Math.PI / 2);
  addInstanced(scene, geo, groups, "floorCells");
}

/*
 * Raised floor platforms (verticality) — a textured block per elevated cell,
 * instanced as one unit box scaled per instance to (CELL,hgt,CELL). three's
 * InstancedMesh normal-matrix handling (defaultnormal_vertex.glsl.js)
 * accounts for exactly this non-uniform per-instance scale, so lighting on
 * the tall faces is unaffected. Moved verbatim from `loadLevel`, grouped by
 * look: box face order +x,-x,+y,-y,+z,-z, so the top is the third material.
 */
export function buildPlatforms(scene: THREE.Scene, level: ThemeFlags): void {
  if (!world.heightMap) return;
  const faces = new Map<string, THREE.Material[]>(), groups = new Map<THREE.Material[], THREE.Matrix4[]>();
  for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
    const hgt = world.heightMap[z] && world.heightMap[z][x] || 0;
    if (hgt <= 0 || shellAt(x, z)) continue;   // (a shell zone's raised ground is HellShell.ts's)
    const look = lookAt(x, z, level), key = surfaceKey(look, true);
    let pm = faces.get(key);
    if (!pm) {
      const tt = themeTex(look);
      const topMat = track(new THREE.MeshLambertMaterial({ map: tt.floor }));
      const sideMat = track(new THREE.MeshLambertMaterial({ map: tt.side }));
      pm = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]; faces.set(key, pm);
    }
    groupPush(groups, pm, new THREE.Matrix4().compose(
      new THREE.Vector3((x + .5) * CELL, hgt / 2, (z + .5) * CELL), new THREE.Quaternion(), new THREE.Vector3(CELL, hgt, CELL)));
  }
  if (groups.size) addInstanced(scene, track(new THREE.BoxGeometry(1, 1, 1)), groups, "platform");
}

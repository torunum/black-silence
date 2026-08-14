import * as THREE from "three";
import { rnd } from "../utils/math";
import { getScene } from "../render/SceneRef";

/**
 * DECALS — floor blood pools (addPool/poolTick) and wall splatter/bullet
 * hole decals (addWallDecal), both pooled and recycled the same way as
 * Particles.ts's particle ring buffer: once the pool hits its cap, the
 * oldest mesh is reused (repositioned, and for wall decals re-materialed)
 * instead of a new one being allocated.
 *
 * Copied verbatim from reference/sonsurum.html lines 1596-1617 (see
 * tests/support/reference.ts's REF.particlesDecalsGibs) — every colour,
 * opacity, radius and pool size is art and must never change.
 *
 * scorchMat is exported even though addPool/addWallDecal never reference it
 * themselves: legacy.js's explodeBarrel() builds its own
 * `new THREE.Mesh(new THREE.CircleGeometry(1.5,10), scorchMat)` directly,
 * outside the pooled addWallDecal/addPool path — a scorch mark is permanent,
 * never recycled (an existing quirk this port preserves, not a bug this
 * task fixes) — so the material still has to be reachable from legacy.js.
 */

export const poolMat = new THREE.MeshBasicMaterial({ color: 0x4a0d06, transparent: true, opacity: .85, depthWrite: false });
export const splatMat = new THREE.MeshBasicMaterial({ color: 0x5a1008, transparent: true, opacity: .8, depthWrite: false });
export const holeMat = new THREE.MeshBasicMaterial({ color: 0x0c0d10, transparent: true, opacity: .9, depthWrite: false });
export const scorchMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: .85, depthWrite: false });

const POOLMAX = 150, WDMAX = 200;

let pools: THREE.Mesh[] = [];
let wallDecals: THREE.Mesh[] = [];

/**
 * Called from legacy.js's loadLevel() in place of the reference's direct
 * `pools=[];wallDecals=[];` reset. Without this call, a level's blood pools
 * and wall decals would still be sitting in the *new* level's scene graph
 * (loadLevel replaces `scene` itself, but never touches the meshes this
 * module already added to the old one) — this only clears the bookkeeping
 * arrays, which is exactly what the reference did too; leftover meshes are
 * simply not visited by poolTick/addPool/addWallDecal any more.
 */
export function resetDecals(): void {
  pools = [];
  wallDecals = [];
}

export function addPool(x: number, z: number, s: number): void {
  const scene = getScene();
  let m: THREE.Mesh;
  if (pools.length >= POOLMAX) { m = pools.shift()!; }
  else { m = new THREE.Mesh(new THREE.CircleGeometry(1, 8), poolMat); m.rotation.x = -Math.PI / 2; scene.add(m); }
  m.position.set(x, .01 + Math.random() * .004, z); m.scale.set(s * .3, s * .3, 1); m.userData.target = s;
  pools.push(m);
}

export function poolTick(dt: number): void {
  for (const m of pools) {
    const t = m.userData.target;
    if (m.scale.x < t) { m.scale.x = Math.min(t, m.scale.x + dt * 1.4); m.scale.y = m.scale.x; }
  }
}

export function addWallDecal(x: number, y: number, z: number, nx: number, nz: number, s: number, mat: THREE.Material): void {
  const scene = getScene();
  let m: THREE.Mesh;
  if (wallDecals.length >= WDMAX) { m = wallDecals.shift()!; m.material = mat; }
  else { m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); scene.add(m); }
  m.scale.set(s, s * rnd(.7, 1.3), 1);
  m.position.set(x + nx * .012, y, z + nz * .012);
  m.lookAt(x + nx, y, z + nz); m.rotation.z = Math.random() * Math.PI;
  wallDecals.push(m);
}

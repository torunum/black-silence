import * as THREE from "three";
import "../render/ColorPolicy";
import { getScene } from "../render/SceneRef";
import { track } from "../render/DisposeRegistry";
import { floorHeightAt } from "../world/Collision";
import { fxRange } from "./FxRand";
import { splatTexture, streakTexture } from "./GoreTex";

/**
 * BLOOD THAT STAYS — floor pools, wall splatter, drips and smears
 * (`docs/superpowers/plans/2026-10-08-impact.md`, Task 3). Every decal is
 * one instance of one of two `InstancedMesh`es (a blot and a streak), so a
 * level's blood is two scene children however much of it there is, and a
 * fight adds none: the ring recycles the oldest decal at the cap, and
 * `Decals.ts`'s own pools (`addPool`, `addWallDecal`, pinned to the
 * reference) keep doing what they did, beside these.
 *
 * - **Budgets**: `BLOB_MAX` 224 blots and `STREAK_MAX` 96 streaks. At the
 *   cap the oldest is reused. Nothing is allocated per decal or per frame:
 *   the matrix, the vectors and the quaternions below are made once.
 * - **A pool grows**: a floor blot is born at a third of its size and
 *   reaches it in about a second (`GROW_MAX` 24 at a time).
 * - **Where it sits**: a floor decal on the floor under it (`floorHeightAt`),
 *   a wall decal a hair off the wall along its normal; both with a little
 *   depth bias per instance so two decals never fight for a pixel.
 * - **Dice**: `FxRand`'s, never `Math.random`.
 *
 * Nothing draws until `buildSplats` has made the meshes for the level; before
 * that (a test that kills a monster with no level loaded) every call is a
 * quiet no-op.
 */

export const BLOB_MAX = 224, STREAK_MAX = 96, GROW_MAX = 24;

interface Pool {
  mesh: THREE.InstancedMesh;
  max: number;
  next: number;
  /** How many have ever been placed, up to `max` (for the tests and the budget line). */
  used: number;
}

let blobs: Pool | null = null, streaks: Pool | null = null;

// scratch, made once
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), COL = new THREE.Color();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);

/** Floor blots still growing: the instance, where it is, how big it ends, its turn, and the seconds it has grown. */
interface Grow { i: number; x: number; y: number; z: number; rot: number; to: number; t: number; on: boolean }
const grows: Grow[] = Array.from({ length: GROW_MAX }, () => ({ i: 0, x: 0, y: 0, z: 0, rot: 0, to: 0, t: 0, on: false }));
let growNext = 0;
const GROW_SECS = 1.1, GROW_FROM = 0.34;

function makePool(max: number, tex: THREE.Texture): Pool {
  const mat = track(new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false, opacity: 0.92,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  const geo = track(new THREE.PlaneGeometry(1, 1));
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.name = "goreSplats";
  // every instance starts folded away to nothing, with its colour set so the colour buffer exists
  M.makeScale(0, 0, 0);
  COL.setRGB(0.3, 0.03, 0.02);
  for (let i = 0; i < max; i++) { mesh.setMatrixAt(i, M); mesh.setColorAt(i, COL); }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  getScene().add(mesh);
  return { mesh, max, next: 0, used: 0 };
}

/** Makes the level's two decal meshes. Called by `resetImpactFx` after the scene is new. */
export function buildSplats(): void {
  blobs = makePool(BLOB_MAX, splatTexture());
  streaks = makePool(STREAK_MAX, streakTexture());
  for (const g of grows) g.on = false;
  growNext = 0;
}

/** Forgets the level's decals (the scene they were in is gone). */
export function resetSplats(): void { blobs = null; streaks = null; for (const g of grows) g.on = false; growNext = 0; }

/** How many of each are on the level, and the budgets: for the tests and the report. */
export function splatStats(): { blobs: number; streaks: number; blobMax: number; streakMax: number; growing: number } {
  return { blobs: blobs?.used ?? 0, streaks: streaks?.used ?? 0, blobMax: BLOB_MAX, streakMax: STREAK_MAX, growing: grows.filter((g) => g.on).length };
}

/** The meshes, for the tests. */
export function splatMeshes(): { blobs: THREE.InstancedMesh | null; streaks: THREE.InstancedMesh | null } {
  return { blobs: blobs?.mesh ?? null, streaks: streaks?.mesh ?? null };
}

function tint(p: Pool, i: number, tone: number): void {
  // a fresh wet red, a little different each time: dark enough to read as blood in a dim hall
  const k = fxRange(0.85, 1.15) * tone;
  COL.setRGB(0.34 * k, 0.035 * k, 0.025 * k);
  p.mesh.setColorAt(i, COL);
  if (p.mesh.instanceColor) p.mesh.instanceColor.needsUpdate = true;
}

function place(p: Pool): number {
  const i = p.next;
  p.next = (p.next + 1) % p.max;
  if (p.used < p.max) p.used++;
  if (p === blobs) for (const g of grows) if (g.on && g.i === i) g.on = false;   // the ring has come round to a pool still growing: it is the new decal's now
  return i;
}

/** A floor blot at (`x`,`z`), `size` metres across when grown, turned `rot`; `tone` darkens (<1) or brightens (>1) it. */
export function splatFloor(x: number, z: number, size: number, tone = 1, grow = true, rot = fxRange(0, Math.PI * 2)): void {
  const p = blobs;
  if (!p) return;
  const i = place(p);
  const y = floorHeightAt(x, z) + 0.011 + (i % 17) * 0.00035;
  tint(p, i, tone);
  if (grow) {
    const g = grows[growNext]; growNext = (growNext + 1) % GROW_MAX;
    g.i = i; g.x = x; g.y = y; g.z = z; g.rot = rot; g.to = size; g.t = 0; g.on = true;
    writeFloor(p, i, x, y, z, rot, size * GROW_FROM);
  } else writeFloor(p, i, x, y, z, rot, size);
}

function writeFloor(p: Pool, i: number, x: number, y: number, z: number, rot: number, size: number): void {
  Q.setFromAxisAngle(AX, -Math.PI / 2);
  Q2.setFromAxisAngle(AY, rot);
  Q2.multiply(Q);
  P.set(x, y, z); S.set(size, size, 1);
  M.compose(P, Q2, S);
  p.mesh.setMatrixAt(i, M);
  p.mesh.instanceMatrix.needsUpdate = true;
}

/** A blot on a wall at (`x`,`y`,`z`), facing the way (`nx`,`nz`) points, `size` across. */
export function splatWall(x: number, y: number, z: number, nx: number, nz: number, size: number, tone = 1, rot = fxRange(0, Math.PI * 2)): void {
  const p = blobs;
  if (!p) return;
  const i = place(p);
  tint(p, i, tone);
  writeWall(p, i, x, y, z, nx, nz, rot, size, size * fxRange(0.75, 1.25));
}

/** A drip down a wall from (`x`,`y`,`z`): `len` long, hanging from its head. */
export function dripWall(x: number, y: number, z: number, nx: number, nz: number, len: number, tone = 1): void {
  const p = streaks;
  if (!p) return;
  const i = place(p);
  tint(p, i, tone);
  // the streak's head is at its top: centre it half its length below the point
  writeWall(p, i, x, y - len * 0.5, z, nx, nz, 0, len * 0.34, len);
}

function writeWall(p: Pool, i: number, x: number, y: number, z: number, nx: number, nz: number, rot: number, sx: number, sy: number): void {
  const phi = Math.atan2(nx, nz);
  Q.setFromAxisAngle(AY, phi);
  Q2.setFromAxisAngle(AZ, rot);
  Q.multiply(Q2);
  const off = 0.014 + (i % 13) * 0.0004;
  P.set(x + nx * off, y, z + nz * off); S.set(sx, sy, 1);
  M.compose(P, Q, S);
  p.mesh.setMatrixAt(i, M);
  p.mesh.instanceMatrix.needsUpdate = true;
}

/** A smear along the floor from (`x`,`z`) in the direction (`dx`,`dz`), `len` long, where a body slid or a limb dragged. */
export function smearFloor(x: number, z: number, dx: number, dz: number, len: number, tone = 1): void {
  const p = streaks;
  if (!p) return;
  const i = place(p);
  tint(p, i, tone);
  const d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
  const y = floorHeightAt(x, z) + 0.012 + (i % 11) * 0.0004;
  // the streak's head (its top) leads: laid with its long axis along the direction of travel, head ahead
  Q.setFromAxisAngle(AX, -Math.PI / 2);
  Q2.setFromAxisAngle(AY, Math.atan2(-ux, -uz));
  Q2.multiply(Q);
  P.set(x + ux * len * 0.5, y, z + uz * len * 0.5); S.set(len * 0.3, len, 1);
  M.compose(P, Q2, S);
  p.mesh.setMatrixAt(i, M);
  p.mesh.instanceMatrix.needsUpdate = true;
}

/** Grows the floor pools that are still growing. Once a frame, with the game's own clock. */
export function splatTick(dt: number): void {
  const p = blobs;
  if (!p) return;
  for (const g of grows) {
    if (!g.on) continue;
    g.t += dt;
    const u = Math.min(1, g.t / GROW_SECS), e = 1 - (1 - u) * (1 - u);   // eases out
    writeFloor(p, g.i, g.x, g.y, g.z, g.rot, g.to * (GROW_FROM + (1 - GROW_FROM) * e));
    if (u >= 1) g.on = false;
  }
}

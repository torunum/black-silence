import * as THREE from "three";
import "../render/ColorPolicy";
import { getScene } from "../render/SceneRef";
import { track } from "../render/DisposeRegistry";
import { floorHeightAt, solidAt } from "../world/Collision";
import { fxr, fxRange } from "./FxRand";
import { splatFloor } from "./Splats";

/**
 * MEAT, BONE AND ORGANS — the chunks a body bursts into
 * (`docs/superpowers/plans/2026-10-08-impact.md`, Task 3). One
 * `InstancedMesh` of boxes (`CHUNK_MAX` of them, one scene child), each
 * chunk with its own size, shape and instance colour: **meat** (dark red,
 * blocky), **organs** (purple and pink, rounder), **bone** (pale, long and
 * thin) and **sinew** (dark and thin). They fly, tumble, bounce on the floor
 * under them (`floorHeightAt`, so on a raised floor they land on it), turn
 * back off walls, leave a small splat where they first hit the floor and
 * come to rest, where they stay — until the ring comes round and the
 * oldest is reused. A chunk at rest costs nothing per frame.
 *
 * Lit by the level's own lights (a Lambert material), cast no shadow, never
 * allocated per frame: the arrays are fixed and the scratch objects made once.
 * Dice: `FxRand`'s.
 */

export const CHUNK_MAX = 160;
/** Seconds of flight a chunk (or a part, or a gout) has already had when it is thrown: a hit-stop slows the first frames of a burst to a crawl, and they must already show it bursting. */
export const HEAD_START = 0.09;
export type ChunkKind = 0 | 1 | 2 | 3;   // meat, organ, bone, sinew
export const MEAT: ChunkKind = 0, ORGAN: ChunkKind = 1, BONE: ChunkKind = 2, SINEW: ChunkKind = 3;

const x = new Float32Array(CHUNK_MAX), y = new Float32Array(CHUNK_MAX), z = new Float32Array(CHUNK_MAX);
const vx = new Float32Array(CHUNK_MAX), vy = new Float32Array(CHUNK_MAX), vz = new Float32Array(CHUNK_MAX);
const rx = new Float32Array(CHUNK_MAX), ry = new Float32Array(CHUNK_MAX), rz = new Float32Array(CHUNK_MAX);
const sx = new Float32Array(CHUNK_MAX), sy = new Float32Array(CHUNK_MAX), sz = new Float32Array(CHUNK_MAX);
const wx = new Float32Array(CHUNK_MAX), wy = new Float32Array(CHUNK_MAX), wz = new Float32Array(CHUNK_MAX);   // spin
const state = new Uint8Array(CHUNK_MAX);   // 0 empty, 1 flying, 2 at rest
const bounced = new Uint8Array(CHUNK_MAX);
let next = 0;
let mesh: THREE.InstancedMesh | null = null;

const M = new THREE.Matrix4(), E = new THREE.Euler(0, 0, 0, "XYZ"), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), COL = new THREE.Color();
const HIDE = new THREE.Matrix4().makeScale(0, 0, 0);

/** Makes the level's chunk mesh. Called by `resetImpactFx` once the scene is new. */
export function buildChunks(): void {
  const mat = track(new THREE.MeshLambertMaterial({ color: 0xffffff }));
  const geo = track(new THREE.BoxGeometry(1, 1, 1));
  mesh = new THREE.InstancedMesh(geo, mat, CHUNK_MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.name = "goreChunks";
  COL.setRGB(0.4, 0.05, 0.04);
  for (let i = 0; i < CHUNK_MAX; i++) { mesh.setMatrixAt(i, HIDE); mesh.setColorAt(i, COL); }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  getScene().add(mesh);
  state.fill(0); next = 0;
}

export function resetChunks(): void { mesh = null; state.fill(0); next = 0; }

/** The mesh and how many chunks are in the world, in the air and at rest: for the tests. */
export function chunkStats(): { mesh: THREE.InstancedMesh | null; max: number; used: number; flying: number; resting: number } {
  let f = 0, r = 0;
  for (let i = 0; i < CHUNK_MAX; i++) { if (state[i] === 1) f++; else if (state[i] === 2) r++; }
  return { mesh, max: CHUNK_MAX, used: f + r, flying: f, resting: r };
}
/** A chunk's place and size, for the tests. */
export function chunkAt(i: number): { x: number; y: number; z: number; sy: number; state: number } {
  return { x: x[i], y: y[i], z: z[i], sy: sy[i], state: state[i] };
}

function paint(i: number, kind: ChunkKind): void {
  const k = fxRange(0.8, 1.15);
  if (kind === MEAT) COL.setRGB(0.42 * k, 0.05 * k, 0.04 * k);
  else if (kind === ORGAN) { const r = fxr() < 0.5; COL.setRGB((r ? 0.52 : 0.34) * k, (r ? 0.12 : 0.05) * k, (r ? 0.2 : 0.16) * k); }
  else if (kind === BONE) COL.setRGB(0.8 * k, 0.76 * k, 0.64 * k);
  else COL.setRGB(0.3 * k, 0.1 * k, 0.07 * k);
  mesh!.setColorAt(i, COL);
}

/**
 * Throws `n` chunks from (`px`,`py`,`pz`): `pow` is the burst's strength (metres a second), (`dx`,`dz`) the way a shot was
 * going (it biases the throw; 0,0 for none), `mix` the shares of meat, organs, bone and sinew (they need not add up to 1).
 */
export function burstChunks(px: number, py: number, pz: number, n: number, pow: number, dx = 0, dz = 0, mix: readonly [number, number, number, number] = [0.45, 0.2, 0.2, 0.15]): void {
  if (!mesh) return;
  const total = mix[0] + mix[1] + mix[2] + mix[3];
  for (let c = 0; c < n; c++) {
    const i = next; next = (next + 1) % CHUNK_MAX;
    let pick = fxr() * total, kind: ChunkKind = 3;
    for (let k = 0; k < 4; k++) { if (pick < mix[k]) { kind = k as ChunkKind; break; } pick -= mix[k]; }
    x[i] = px + fxRange(-0.15, 0.15); y[i] = py + fxRange(-0.15, 0.2); z[i] = pz + fxRange(-0.15, 0.15);
    const a = fxRange(0, Math.PI * 2), s = fxRange(0.35, 1) * pow;
    vx[i] = Math.cos(a) * s + dx * pow * 0.55; vz[i] = Math.sin(a) * s + dz * pow * 0.55; vy[i] = fxRange(0.5, 1.25) * pow * 0.8;
    x[i] += vx[i] * HEAD_START; y[i] += vy[i] * HEAD_START; z[i] += vz[i] * HEAD_START;   // already apart on the frame it bursts
    rx[i] = fxRange(0, 6.28); ry[i] = fxRange(0, 6.28); rz[i] = fxRange(0, 6.28);
    wx[i] = fxRange(-11, 11); wy[i] = fxRange(-11, 11); wz[i] = fxRange(-11, 11);
    if (kind === MEAT) { const b = fxRange(0.1, 0.2); sx[i] = b * fxRange(0.8, 1.4); sy[i] = b * fxRange(0.6, 1.1); sz[i] = b * fxRange(0.8, 1.4); }
    else if (kind === ORGAN) { const b = fxRange(0.09, 0.17); sx[i] = b; sy[i] = b * fxRange(0.7, 1); sz[i] = b * fxRange(1, 1.5); }
    else if (kind === BONE) { sx[i] = fxRange(0.035, 0.06); sy[i] = fxRange(0.035, 0.06); sz[i] = fxRange(0.16, 0.3); }
    else { sx[i] = fxRange(0.03, 0.05); sy[i] = fxRange(0.03, 0.05); sz[i] = fxRange(0.12, 0.22); }
    paint(i, kind);
    state[i] = 1; bounced[i] = 0;
    writeMatrix(i);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

function writeMatrix(i: number): void {
  E.set(rx[i], ry[i], rz[i]);
  Q.setFromEuler(E);
  P.set(x[i], y[i], z[i]); S.set(sx[i], sy[i], sz[i]);
  M.compose(P, Q, S);
  mesh!.setMatrixAt(i, M);
}

/** Flies the chunks in the air. Once a frame, with the game's own clock. */
export function chunkTick(dt: number): void {
  if (!mesh) return;
  let any = false;
  for (let i = 0; i < CHUNK_MAX; i++) {
    if (state[i] !== 1) continue;
    any = true;
    vy[i] -= 16 * dt;
    let nx = x[i] + vx[i] * dt, nz = z[i] + vz[i] * dt;
    if (solidAt(nx, nz)) {
      // turned back by the wall: whichever axis of the move met it is reflected and cancelled
      if (!solidAt(nx, z[i])) { vz[i] *= -0.35; nz = z[i]; }
      else if (!solidAt(x[i], nz)) { vx[i] *= -0.35; nx = x[i]; }
      else { vx[i] *= -0.35; vz[i] *= -0.35; nx = x[i]; nz = z[i]; }
    }
    x[i] = nx; z[i] = nz; y[i] += vy[i] * dt;
    rx[i] += wx[i] * dt; ry[i] += wy[i] * dt; rz[i] += wz[i] * dt;
    const half = Math.min(sx[i], sy[i], sz[i]) * 0.5 + 0.015;   // a chunk lies on its thin side
    const floor = floorHeightAt(x[i], z[i]) + half;
    if (y[i] < floor) {
      y[i] = floor;
      if (Math.abs(vy[i]) > 1.6) {
        if (!bounced[i] && fxr() < 0.4) splatFloor(x[i], z[i], fxRange(0.14, 0.3), 0.9);   // where it first lands
        bounced[i] = 1;
        vy[i] *= -0.36; vx[i] *= 0.55; vz[i] *= 0.55; wx[i] *= 0.6; wy[i] *= 0.6; wz[i] *= 0.6;
      } else { state[i] = 2; vy[i] = 0; }
    }
    writeMatrix(i);
  }
  if (any) mesh.instanceMatrix.needsUpdate = true;
}

import * as THREE from "three";
import { getScene } from "../render/SceneRef";
import { track } from "../render/DisposeRegistry";
import { floorHeightAt, solidAt, wallNormal } from "../world/Collision";
import { fxr, fxRange } from "./FxRand";
import { splatFloor, splatWall } from "./Splats";

/**
 * GOUTS AND MIST — the big drops a stump pumps and a burst throws, and the
 * red haze a body leaves when it comes apart
 * (`docs/superpowers/plans/2026-10-08-impact.md`, Task 3). Two pooled
 * `THREE.Points` (two scene children for the level, fixed buffers, a ring
 * that reuses the oldest slot at the cap, nothing allocated per frame):
 *
 * - **drops** (`DROP_MAX` 320, 13 cm squares): thrown by `goutFx`, they fall
 *   under gravity, and where one lands it leaves a splat on the floor
 *   (`splatFloor`, a quarter of the time) and where one meets a wall it
 *   leaves a spatter there (`splatWall`, a third of the time) — the way blood
 *   gets onto the walls of a room;
 * - **mist** (`MIST_MAX` 48, 42 cm squares at 24% opacity): `mistFx` lets a
 *   few drift up and thin out, slowly.
 *
 * The smaller drops of `bloodFx` (`ImpactFx.ts`) are the particle ring's
 * (`Particles.ts`); these are the ones you can see across a room. Dice:
 * `FxRand`'s.
 */

export const DROP_MAX = 320, MIST_MAX = 48;

interface Cloud {
  geo: THREE.BufferGeometry;
  pos: Float32Array;
  col: Float32Array;
  max: number;
  life: Float32Array;
  vx: Float32Array; vy: Float32Array; vz: Float32Array;
  next: number;
  points: THREE.Points;
}

let drops: Cloud | null = null, mist: Cloud | null = null;

function makeCloud(max: number, size: number, opacity: number): Cloud {
  const geo = track(new THREE.BufferGeometry());
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 3);
  for (let i = 0; i < max; i++) pos[i * 3 + 1] = -100;
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const mat = track(new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.name = opacity < 1 ? "goreMist" : "goreDrops";
  getScene().add(points);
  return { geo, pos, col, max, life: new Float32Array(max), vx: new Float32Array(max), vy: new Float32Array(max), vz: new Float32Array(max), next: 0, points };
}

/** Makes the level's two clouds. Called by `resetImpactFx` once the scene is new. */
export function buildDrops(): void {
  drops = makeCloud(DROP_MAX, 0.13, 1);
  mist = makeCloud(MIST_MAX, 0.42, 0.24);
}

export function resetDrops(): void { drops = null; mist = null; }

/** How many are alive, and the budgets: for the tests. */
export function dropStats(): { drops: number; mist: number; dropMax: number; mistMax: number; dropPoints: THREE.Points | null; mistPoints: THREE.Points | null } {
  const live = (c: Cloud | null): number => { if (!c) return 0; let n = 0; for (let i = 0; i < c.max; i++) if (c.life[i] > 0) n++; return n; };
  return { drops: live(drops), mist: live(mist), dropMax: DROP_MAX, mistMax: MIST_MAX, dropPoints: drops?.points ?? null, mistPoints: mist?.points ?? null };
}

/**
 * Throws `n` gouts from (`px`,`py`,`pz`). `pow` is metres a second; (`dx`,`dz`) the way they are thrown (a unit
 * vector, or 0,0 for straight up and round); `up` how much of the throw is upward (1 is a fountain, 0 a spray).
 */
export function goutFx(px: number, py: number, pz: number, n: number, pow: number, dx = 0, dz = 0, up = 1): void {
  const c = drops;
  if (!c) return;
  for (let k = 0; k < n; k++) {
    const i = c.next; c.next = (c.next + 1) % c.max;
    const a = fxRange(0, Math.PI * 2), s = fxRange(0.2, 1) * pow * (0.6 - 0.35 * up) + 0.3;
    c.pos[i * 3] = px; c.pos[i * 3 + 1] = py; c.pos[i * 3 + 2] = pz;
    c.vx[i] = Math.cos(a) * s + dx * pow * 0.8; c.vz[i] = Math.sin(a) * s + dz * pow * 0.8; c.vy[i] = pow * (0.35 + 0.65 * up) * fxRange(0.75, 1.2);
    c.pos[i * 3] += c.vx[i] * 0.04; c.pos[i * 3 + 1] += c.vy[i] * 0.04; c.pos[i * 3 + 2] += c.vz[i] * 0.04;   // a hair of flight already, see GoreChunks.HEAD_START
    c.life[i] = fxRange(0.8, 1.6);
    const r = fxRange(0.38, 0.66);
    c.col[i * 3] = r; c.col[i * 3 + 1] = fxRange(0.02, 0.07); c.col[i * 3 + 2] = fxRange(0.015, 0.045);
  }
  c.geo.attributes.color.needsUpdate = true;
}

/** `n` puffs of red mist from (`px`,`py`,`pz`), drifting up and out. */
export function mistFx(px: number, py: number, pz: number, n: number, pow = 1): void {
  const c = mist;
  if (!c) return;
  for (let k = 0; k < n; k++) {
    const i = c.next; c.next = (c.next + 1) % c.max;
    c.pos[i * 3] = px + fxRange(-0.3, 0.3); c.pos[i * 3 + 1] = py + fxRange(-0.2, 0.3); c.pos[i * 3 + 2] = pz + fxRange(-0.3, 0.3);
    c.vx[i] = fxRange(-0.6, 0.6) * pow; c.vy[i] = fxRange(0.15, 0.55) * pow; c.vz[i] = fxRange(-0.6, 0.6) * pow;
    c.life[i] = fxRange(1.4, 2.6);
    c.col[i * 3] = fxRange(0.5, 0.65); c.col[i * 3 + 1] = fxRange(0.03, 0.06); c.col[i * 3 + 2] = fxRange(0.02, 0.04);
  }
  c.geo.attributes.color.needsUpdate = true;
}

/** Ages and moves both clouds. Once a frame, with the game's own clock. */
export function dropTick(dt: number): void {
  const c = drops;
  if (c) {
    for (let i = 0; i < c.max; i++) {
      if (c.life[i] <= 0) { c.pos[i * 3 + 1] = -100; continue; }
      c.life[i] -= dt;
      c.vy[i] -= 14 * dt;
      const ox = c.pos[i * 3], oz = c.pos[i * 3 + 2];
      let nx = ox + c.vx[i] * dt, nz = oz + c.vz[i] * dt;
      const ny = c.pos[i * 3 + 1] + c.vy[i] * dt;
      if (solidAt(nx, nz)) {
        // the wall takes it: a spatter where it hit, a third of the time
        if (fxr() < 0.33) {
          const d = Math.hypot(c.vx[i], c.vz[i]) || 1, n = wallNormal(nx, nz, { x: c.vx[i] / d, z: c.vz[i] / d });
          splatWall(ox, Math.max(0.15, ny), oz, n.x, n.z, fxRange(0.1, 0.24), 0.95);
        }
        c.life[i] = 0; c.pos[i * 3 + 1] = -100; continue;
      }
      const floor = floorHeightAt(nx, nz) + 0.02;
      if (ny < floor) {
        if (fxr() < 0.28) splatFloor(nx, nz, fxRange(0.1, 0.26), 0.95);
        c.life[i] = 0; c.pos[i * 3 + 1] = -100; continue;
      }
      c.pos[i * 3] = nx; c.pos[i * 3 + 1] = ny; c.pos[i * 3 + 2] = nz;
    }
    c.geo.attributes.position.needsUpdate = true;
  }
  const m = mist;
  if (m) {
    for (let i = 0; i < m.max; i++) {
      if (m.life[i] <= 0) { m.pos[i * 3 + 1] = -100; continue; }
      m.life[i] -= dt;
      m.vx[i] *= 1 - 0.8 * dt; m.vz[i] *= 1 - 0.8 * dt;
      m.pos[i * 3] += m.vx[i] * dt; m.pos[i * 3 + 1] += m.vy[i] * dt; m.pos[i * 3 + 2] += m.vz[i] * dt;
    }
    m.geo.attributes.position.needsUpdate = true;
  }
}

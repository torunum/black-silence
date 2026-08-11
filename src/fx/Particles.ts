import * as THREE from "three";
import { rnd } from "../utils/math";
import { getScene } from "../render/SceneRef";
import { addPool } from "./Decals";

/**
 * PARTICLES — a single pooled THREE.Points object (a fixed-size PMAX ring
 * buffer, rebuilt per level by buildParticles()) plus every spawner that
 * feeds it: blood, sparks, smoke, fire, holy light, toxic gas, embers, and
 * (the stray helper below) wood-chip debris.
 *
 * Copied verbatim from reference/sonsurum.html lines 1548-1595 (see
 * tests/support/reference.ts's REF.particlesDecalsGibs) plus woodP at
 * reference/sonsurum.html lines 2650-2652 (REF.woodP) — that helper sits
 * under the reference's "AMBIENT AUDIO + MISSING PARTICLE HELPER" banner
 * (lines 2648-2649) alongside ambience()/vitalsAudio(), which stay in
 * legacy.js; only the particle spawner belongs to this module. Every
 * particle count, velocity range, lifetime and colour is art and must never
 * change.
 *
 * spawnP never grows the pool: pNext advances modulo PMAX, so the
 * (PMAX+1)th live particle silently recycles the oldest slot instead of
 * allocating — see particleCount(), a read-only accessor reporting how many
 * slots exist (always PMAX), not how many are currently alive.
 *
 * partTick() is the one place this module reaches outside itself: a
 * settling blood particle (kind===1) has a chance to leave a floor decal via
 * Decals.ts's addPool().
 */

const PMAX = 1100;

interface Particle {
  life: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  kind: number;
}

let pGeo: THREE.BufferGeometry;
let pPos: Float32Array;
let pCol: Float32Array;
let points: THREE.Points;
let parts: Particle[];
let pNext = 0;

/** How many pool slots exist (always PMAX) — not how many are alive. */
export function particleCount(): number {
  return PMAX;
}

export function buildParticles(): void {
  const scene = getScene();
  pGeo = new THREE.BufferGeometry();
  pPos = new Float32Array(PMAX * 3); pCol = new Float32Array(PMAX * 3);
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.PointsMaterial({ size: .09, vertexColors: true, sizeAttenuation: true });
  points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);
  parts = Array.from({ length: PMAX }, () => ({ life: 0 } as Particle));
  pNext = 0;
  for (let i = 0; i < PMAX; i++) pPos[i * 3 + 1] = -100;
}

export function spawnP(
  x: number, y: number, z: number,
  vx: number, vy: number, vz: number,
  r: number, g: number, b: number,
  life: number, kind: number,
): void {
  const i = pNext; pNext = (pNext + 1) % PMAX;
  const p = parts[i];
  p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = life; p.kind = kind || 0;
  pCol[i * 3] = r; pCol[i * 3 + 1] = g; pCol[i * 3 + 2] = b;
}

export function blood(x: number, y: number, z: number, n: number, pow: number): void {
  for (let i = 0; i < n; i++)
    spawnP(x, y, z, rnd(-1, 1) * pow, rnd(.3, 1.6) * pow, rnd(-1, 1) * pow,
      rnd(.35, .62), rnd(.02, .08), rnd(.01, .04), rnd(.5, 1.3), 1);
}
export function sparks(x: number, y: number, z: number, n: number): void {
  for (let i = 0; i < n; i++)
    spawnP(x, y, z, rnd(-2.4, 2.4), rnd(.5, 3), rnd(-2.4, 2.4),
      rnd(.8, 1), rnd(.6, .85), rnd(.2, .4), rnd(.15, .4), 2);
}
export function smoke3d(x: number, y: number, z: number, n: number): void {
  for (let i = 0; i < n; i++)
    spawnP(x, y, z, rnd(-.3, .3), rnd(.4, 1), rnd(-.3, .3), .28, .28, .3, rnd(.6, 1.4), 3);
}
export function fireP(x: number, y: number, z: number, n: number): void {
  for (let i = 0; i < n; i++)
    spawnP(x, y, z, rnd(-1.5, 1.5), rnd(1, 4), rnd(-1.5, 1.5),
      rnd(.85, 1), rnd(.3, .6), .1, rnd(.3, .8), 2);
}
export function holyP(x: number, y: number, z: number, n: number): void {
  for (let i = 0; i < n; i++)
    spawnP(x, y, z, rnd(-2.5, 2.5), rnd(.5, 3.5), rnd(-2.5, 2.5),
      rnd(.9, 1), rnd(.85, 1), rnd(.5, .7), rnd(.3, .7), 2);
}
export function toxicP(x: number, y: number, z: number, n: number): void {
  for (let i = 0; i < n; i++)
    spawnP(x, y, z, rnd(-.6, .6), rnd(.1, .8), rnd(-.6, .6),
      rnd(.3, .5), rnd(.6, .85), rnd(.15, .25), rnd(.4, 1), 3);
}
export function emberP(x: number, y: number, z: number): void {
  spawnP(x, y, z, rnd(-.2, .2), rnd(.4, .9), rnd(-.2, .2),
    rnd(.85, 1), rnd(.45, .65), .15, rnd(.3, .7), 3);
}
/**
 * The stray particle helper from the reference's "AMBIENT AUDIO + MISSING
 * PARTICLE HELPER" banner (reference/sonsurum.html lines 2648-2652) — wood
 * chip debris spawned by legacy.js's breakProp(). Ambient audio itself
 * (ambience/vitalsAudio, same banner) stays in legacy.js.
 */
export function woodP(x: number, y: number, z: number, n: number): void {
  for (let i = 0; i < n; i++)
    spawnP(x, y, z, rnd(-2.5, 2.5), rnd(.6, 3.4), rnd(-2.5, 2.5),
      rnd(.32, .45), rnd(.2, .3), rnd(.08, .14), rnd(.4, .9), 2);
}

export function partTick(dt: number): void {
  for (let i = 0; i < PMAX; i++) {
    const p = parts[i];
    if (p.life <= 0) { pPos[i * 3 + 1] = -100; continue; }
    p.life -= dt;
    p.vy -= (p.kind === 3 ? -1.2 : 14) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.y < 0.02 && p.kind !== 3) {
      if (p.kind === 1) { if (Math.random() < .14) addPool(p.x, p.z, rnd(.12, .3)); p.life = 0; }
      else { p.y = .02; p.vy *= -.35; p.vx *= .6; p.vz *= .6; }
    }
    pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}

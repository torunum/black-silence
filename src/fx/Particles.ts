import * as THREE from "three";
import { rnd } from "../utils/math";
import { getScene } from "../render/SceneRef";
import { addPool } from "./Decals";
import { track } from "../render/DisposeRegistry";
import { floorHeightAt } from "../world/Collision";
import { fxr, fxRange } from "./FxRand";
import { splatFloor } from "./Splats";

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

/** How many particles are alive right now (the tests read it; nothing in the game does). */
export function liveParticles(): number {
  let n = 0;
  for (let i = 0; i < PMAX; i++) if (parts[i].life > 0) n++;
  return n;
}

export function buildParticles(): void {
  const scene = getScene();
  // pGeo/pMat are rebuilt fresh here on every level, not shared across levels
  // like the module-scope resources in Decals.ts/Gibs.ts/Attacks.ts — track
  // them so loadLevel's disposeAll() frees the previous level's copies
  // before this call replaces them with new ones.
  pGeo = track(new THREE.BufferGeometry());
  pPos = new Float32Array(PMAX * 3); pCol = new Float32Array(PMAX * 3);
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  // a soft round disc, not the square a bare point is (owner, 2026-10-22: the muzzle's smoke half a metre in front of the eye was a
  // grey square the size of a fist over the crosshair); the colour, size and every count are the reference's
  const pMat = track(new THREE.PointsMaterial({ size: .09, vertexColors: true, sizeAttenuation: true, map: discTexture(), transparent: true, alphaTest: .02, depthWrite: false }));
  points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);
  parts = Array.from({ length: PMAX }, () => ({ life: 0 } as Particle));
  pNext = 0;
  for (let i = 0; i < PMAX; i++) pPos[i * 3 + 1] = -100;
}

let disc: THREE.Texture | null = null;
/** The particles' round soft disc: white, opaque in the middle, fading to nothing at its rim. Built once, drawn with no dice. */
function discTexture(): THREE.Texture | null {
  if (disc) return disc;
  const c = typeof document !== "undefined" ? document.createElement("canvas") : null;
  const g = c?.getContext?.("2d") as CanvasRenderingContext2D | null | undefined;
  if (!c || !g || typeof g.createRadialGradient !== "function") return null;
  c.width = c.height = 32;
  const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(.45, "rgba(255,255,255,.85)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
  disc = new THREE.CanvasTexture(c);
  return disc;
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
    const floor = floorHeightAt(p.x, p.z) + .02;   // the floor under it now, which is not always 0
    if (p.y < floor && p.kind !== 3) {
      if (p.kind === 1) { if (Math.random() < .14) addPool(p.x, p.z, rnd(.12, .3)); p.life = 0; }
      // kind 4: a drop of the impact plan's blood (src/fx/ImpactFx.ts): lands as kind 1 does, but its dice are the effects' own, not the game's
      else if (p.kind === 4) { if (fxr() < .14) splatFloor(p.x, p.z, fxRange(.12, .3)); p.life = 0; }   // (`addPool` jitters its height with Math.random: a splat does not)
      else { p.y = floor; p.vy *= -.35; p.vx *= .6; p.vz *= .6; }
    }
    pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}

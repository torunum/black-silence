import * as THREE from "three";
// Side-effect import: this module builds six coloured materials at module
// scope, so THREE.ColorManagement has to be settled before its body runs.
import "../render/ColorPolicy";
import { rnd } from "../utils/math";
import { getScene } from "../render/SceneRef";
import { blood } from "./Particles";
import { addPool } from "./Decals";
import { floorHeightAt } from "../world/Collision";
import { quietly } from "./Quiet";

/**
 * GIBS — flying body-part chunks spawned on overkill/dismemberment/prop
 * destruction, pooled and recycled the same way as Particles.ts and
 * Decals.ts.
 *
 * Copied from reference/sonsurum.html lines 1618-1644 (see
 * tests/support/reference.ts's REF.particlesDecalsGibs) — every velocity
 * range, spin range and draw is art and must never change.
 *
 * **One thing here is not the reference's: how a flesh gib looks** (enemies
 * plan, Task 1). The reference's gibs are .13 boxes in three flat Lambert
 * colours, one of them a pale grey (`0x9a948a`), and near the camera they
 * read as large pale squares: placeholder boxes, not meat. A flesh gib is now
 * a lump — a faceted, lopsided ball of the same size — in three materials that
 * are what a body comes apart into: raw **meat**, **organ** and **bone**, each
 * with hard dark creases and a blood-smeared underside painted in the vertex
 * colours (flat tones, like the weapons and the rig's monsters, no texture
 * and no canvas). The three-way pick (`(Math.random()*3)|0`), the count, the
 * sizes, the throws and the physics are exactly the reference's, draw for draw,
 * so no fixture's gameplay moves; the wood gibs of a smashed crate are still
 * the reference's boxes, in the reference's colours (`woodGeo`, `gibMatsWood`).
 * `tests/behavior/fx.test.ts` pins the divergence: everything of a flesh gib
 * but its geometry and colour is still compared with the reference's.
 *
 * gibGeo and gibMatsFlesh are exported alongside spawnGibs/gibTick/
 * resetGibs/spawnGibChunk because legacy.js's throwFlesh() builds its own
 * one-off flesh-chunk projectile mesh directly from them
 * (`new THREE.Mesh(gibGeo, gibMatsFlesh[0].clone())`, reference line 3237)
 * to use as a thrown "orb" projectile — that mesh is never pushed into the
 * gibs[] pool, so throwFlesh needs the geometry/material reachable but has
 * no reason to call any function here.
 *
 * spawnGibChunk is a deviation from the brief's Interfaces list, which only
 * named spawnGibs/gibTick/resetGibs (the 62-162 range). legacy.js's
 * severLimb() (reference lines 3008-3024, outside that range) reads and
 * writes the gibs[] pool directly to throw one oversized chunk in the shot
 * direction — the brief's line-range boundary didn't cover that call site,
 * but "the module owns the state, never a bare exported let" (this task's
 * brief, and the AudioEngine precedent it points to) still applies to it.
 * Leaving gibs[]/GIBMAX/gibGeo reachable as mutable exports so legacy.js
 * could keep manipulating the pool inline was the alternative; wrapping the
 * exact same body in a function here was the smaller surface. See the task
 * report for the full reasoning.
 */

export interface Gib {
  m: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  live: boolean;
  wood: boolean;
}

/** Raw meat, organ, bone: the three things a flesh gib can be. The index is the reference's (`gibMatsFlesh[0]` is also the thrown flesh of `throwFlesh` and the big chunk of `spawnGibChunk`). Their colours multiply the lump's vertex colours (`chunkGeometry`). */
export const gibMatsFlesh = [
  new THREE.MeshLambertMaterial({ color: 0xa8281a, vertexColors: true }),   // meat: wet, red
  new THREE.MeshLambertMaterial({ color: 0x8a3a58, vertexColors: true }),   // organ: a bruised purple-pink
  new THREE.MeshLambertMaterial({ color: 0xcdbf98, vertexColors: true }),   // bone: yellowed ivory, not grey
];
export const gibMatsWood = [
  new THREE.MeshLambertMaterial({ color: 0x4a3826 }),
  new THREE.MeshLambertMaterial({ color: 0x2e2418 }),
  new THREE.MeshLambertMaterial({ color: 0x6a543a }),
];
/** A hash of a point to [0,1): the lump's own dice (no `Math.random`: the same lump every run). */
function hash3(x: number, y: number, z: number): number {
  let h = (Math.imul(Math.round(x * 4000), 374761393) + Math.imul(Math.round(y * 4000), 668265263) + Math.imul(Math.round(z * 4000), 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) & 0xffff) / 0x10000;
}

/**
 * A lump of flesh the size of the reference's .13 box: a faceted ball with every point pushed in or out by its own hash
 * (the same push for the same point, so it stays whole), stretched a little, with flat per-face tones in four steps
 * painted in its vertex colours and a blood-smeared underside. Built with a uuid's four draws, exactly as the box was.
 */
function chunkGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.085, 1);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.78 + 0.42 * hash3(x, y, z);
    p.setXYZ(i, x * k * 1.12, y * k * 0.86, z * k * 1.05);
  }
  g.computeVertexNormals();
  const c = new Float32Array(p.count * 3), TONES = [0.5, 0.7, 0.88, 1];
  for (let t = 0; t < p.count; t += 3) {
    const cx = (p.getX(t) + p.getX(t + 1) + p.getX(t + 2)) / 3, cy = (p.getY(t) + p.getY(t + 1) + p.getY(t + 2)) / 3, cz = (p.getZ(t) + p.getZ(t + 1) + p.getZ(t + 2)) / 3;
    const tone = TONES[Math.floor(hash3(cx + 1, cy + 2, cz + 3) * 4)], wet = cy < -0.012 ? 1 : 0;   // the underside is smeared
    for (let v = 0; v < 3; v++) { c[(t + v) * 3] = tone; c[(t + v) * 3 + 1] = tone * (wet ? 0.62 : 1); c[(t + v) * 3 + 2] = tone * (wet ? 0.55 : 1); }
  }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return g;
}

/** A flesh gib's shape. (Shared by every level, never disposed.) */
export const gibGeo: THREE.BufferGeometry = chunkGeometry();
/** A crate's splinters keep the reference's .13 box. Built without drawing a uuid (`quietly`): `gibGeo` took the box's place in the stream. */
export const woodGeo: THREE.BufferGeometry = quietly(() => new THREE.BoxGeometry(.13, .13, .13));

const GIBMAX = 110;

let gibs: Gib[] = [];

/** Called from legacy.js's loadLevel() in place of the reference's direct `gibs=[];` reset. */
export function resetGibs(): void {
  gibs = [];
}

export function spawnGibs(x: number, y: number, z: number, n: number, pow: number, wood?: boolean): void {
  const scene = getScene();
  const mats = wood ? gibMatsWood : gibMatsFlesh;
  for (let i = 0; i < n; i++) {
    let g: Gib;
    if (gibs.length >= GIBMAX) { g = gibs.shift()!; }
    else { g = { m: new THREE.Mesh(wood ? woodGeo : gibGeo, mats[0]) } as unknown as Gib; scene.add(g.m); }
    g.m.geometry = wood ? woodGeo : gibGeo;
    g.m.material = mats[(Math.random() * 3) | 0];
    g.m.position.set(x, y, z);
    g.vx = rnd(-1, 1) * pow; g.vy = rnd(.5, 1.4) * pow; g.vz = rnd(-1, 1) * pow;
    g.spin = rnd(2, 9); g.live = true; g.wood = !!wood;
    g.m.scale.setScalar(rnd(.6, 1.7));
    gibs.push(g);
  }
  if (!wood) blood(x, y, z, Math.min(40, n * 3), 3.4);
}

export function gibTick(dt: number): void {
  for (const g of gibs) {
    if (!g.live) continue;
    g.vy -= 16 * dt; g.m.position.x += g.vx * dt; g.m.position.y += g.vy * dt; g.m.position.z += g.vz * dt;
    g.m.rotation.x += g.spin * dt; g.m.rotation.z += g.spin * .7 * dt;
    const floor = floorHeightAt(g.m.position.x, g.m.position.z) + .07;   // the floor under it now: it can roll onto another height
    if (g.m.position.y < floor) {
      g.m.position.y = floor;
      if (Math.abs(g.vy) > 1.2) {
        g.vy *= -.4; g.vx *= .5; g.vz *= .5;
        if (!g.wood && Math.random() < .5) addPool(g.m.position.x, g.m.position.z, rnd(.15, .35));
      } else { g.live = false; g.vy = 0; }
    }
  }
}

/**
 * Throws one oversized flesh chunk in a fixed direction — legacy.js's
 * severLimb() custom "big chunk flies off in the shot direction" behaviour
 * (reference/sonsurum.html lines 3016-3023), reproduced verbatim here as a
 * function instead of inline gibs[] manipulation. Preserves the original's
 * exact rnd()/Math.random() call order: dirx*5+rnd(-2,2), then rnd(3,5),
 * then dirz*5+rnd(-2,2), then rnd(6,12) — load-bearing for replay/PRNG
 * determinism, so this order must never change independently of the
 * reference.
 */
export function spawnGibChunk(x: number, y: number, z: number, dirx: number, dirz: number): void {
  const scene = getScene();
  let g: Gib;
  if (gibs.length >= GIBMAX) { g = gibs.shift()!; }
  else { g = { m: new THREE.Mesh(gibGeo, gibMatsFlesh[0]) } as unknown as Gib; scene.add(g.m); }
  g.m.geometry = gibGeo;
  g.m.material = gibMatsFlesh[0];
  g.m.position.set(x, y, z); g.m.scale.setScalar(2.2);
  g.vx = dirx * 5 + rnd(-2, 2); g.vy = rnd(3, 5); g.vz = dirz * 5 + rnd(-2, 2);
  g.spin = rnd(6, 12); g.live = true; g.wood = false;
  gibs.push(g);
}

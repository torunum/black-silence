import * as THREE from "three";
import { rnd } from "../utils/math";
import { getScene } from "../render/SceneRef";
import { blood } from "./Particles";
import { addPool } from "./Decals";

/**
 * GIBS — flying body-part chunks spawned on overkill/dismemberment/prop
 * destruction, pooled and recycled the same way as Particles.ts and
 * Decals.ts.
 *
 * Copied verbatim from reference/sonsurum.html lines 1618-1644 (see
 * tests/support/reference.ts's REF.particlesDecalsGibs) — every material
 * colour, velocity range and spin range is art and must never change.
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

export const gibMatsFlesh = [
  new THREE.MeshLambertMaterial({ color: 0x6e1208 }),
  new THREE.MeshLambertMaterial({ color: 0x3a0c06 }),
  new THREE.MeshLambertMaterial({ color: 0x9a948a }),
];
export const gibMatsWood = [
  new THREE.MeshLambertMaterial({ color: 0x4a3826 }),
  new THREE.MeshLambertMaterial({ color: 0x2e2418 }),
  new THREE.MeshLambertMaterial({ color: 0x6a543a }),
];
export const gibGeo = new THREE.BoxGeometry(.13, .13, .13);

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
    else { g = { m: new THREE.Mesh(gibGeo, mats[0]) } as unknown as Gib; scene.add(g.m); }
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
    if (g.m.position.y < .07) {
      g.m.position.y = .07;
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
  g.m.material = gibMatsFlesh[0];
  g.m.position.set(x, y, z); g.m.scale.setScalar(2.2);
  g.vx = dirx * 5 + rnd(-2, 2); g.vy = rnd(3, 5); g.vz = dirz * 5 + rnd(-2, 2);
  g.spin = rnd(6, 12); g.live = true; g.wood = false;
  gibs.push(g);
}

import * as THREE from "three";
import "../render/ColorPolicy";
import { at } from "../audio/AudioEngine";
import { bulletHitsFlesh } from "../audio/sounds/world";
import { stakeThunk } from "../audio/sounds/foley";
import { blood, fireP, smoke3d, sparks, spawnP } from "../fx/Particles";
import { addPool } from "../fx/Decals";
import { renderState } from "../render/Renderer";
import { S } from "../core/State";
import { damageEnemy } from "../enemies/Damage";
import { world } from "../world/WorldState";
import { ceilHeightAt, floorHeightAt, solidAt } from "../world/Collision";
import { breakProp, explodeBarrel, type Prop } from "../world/Props";
import type { Enemy } from "../enemies/Enemy";
import { flying, stuck, STUCK_MAX, type FlyingStake } from "./StakeState";

/**
 * THE STAKE GUN (owner, 2026-10-20: "sonra kazık eklensin") — slot 9, key 0, the tenth weapon: a pneumatic launcher that drives a
 * sharpened ash stake with an iron point, laid into its trough one at a time. The stake is a real thing in the world, not a hitscan:
 *
 *  - it flies fast (`SPEED`) and drops a little (`GRAVITY`), so a long shot is aimed a touch high;
 *  - after `IGNITE` seconds in the air the friction sets it alight, and a burning stake strikes half as hard again (`BURN`) — the
 *    reward for a shot from range, as the stake gun's in Painkiller;
 *  - it goes through what it kills, a little slower and weaker each time (`THROUGH`, `THROUGH_KEEP`), and stops in what it does not;
 *  - a strike high on the body counts as the head (`HEAD`), and every strike throws the body back along the shot;
 *  - what it meets that is not flesh — a wall, the floor, a beam overhead — it is driven into and stays in, point first, the oldest
 *    pulled out once there are `STUCK_MAX` (`./StakeState.ts`); a prop it breaks, a barrel it sets off.
 *
 * The flight is stepped in pieces no longer than `STEP`, so a stake at 46 m/s cannot pass through a body or a wall between two
 * frames. Nothing here draws from `Math.random` but the particles' own visual noise.
 */

export const SPEED = 46;          // m/s along the aim
export const GRAVITY = 3.2;
export const IGNITE = 0.28;       // seconds in the air before it burns
export const BURN = 1.5;          // a burning stake's damage, times
export const HEAD = 1.5;          // a strike in the top fifth of a body, times
export const THROUGH = 3;         // bodies it can go through, killing each
export const THROUGH_KEEP = 0.7;  // what is left of its damage and speed after each
export const SHOVE = 6;           // m/s the struck body is thrown back
export const LIFE = 3;
const STEP = 0.2, LENGTH = 0.62, BITE = 0.14;

export { resetStakes, stakesLive } from "./StakeState";

const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
const ironMat = new THREE.MeshLambertMaterial({ color: 0x3a3c42 });
const charMat = new THREE.MeshLambertMaterial({ color: 0x2a1a10 });
let shaftGeo: THREE.CylinderGeometry | null = null, tipGeo: THREE.ConeGeometry | null = null, bandGeo: THREE.CylinderGeometry | null = null;

/** A stake, its iron point at the origin, pointing along +z (so `lookAt` aims it). */
function stakeMesh(): THREE.Group {
  shaftGeo ??= new THREE.CylinderGeometry(.03, .036, LENGTH - .1, 7).rotateX(Math.PI / 2);
  tipGeo ??= new THREE.ConeGeometry(.034, .12, 7).rotateX(Math.PI / 2);
  bandGeo ??= new THREE.CylinderGeometry(.04, .04, .03, 7).rotateX(Math.PI / 2);
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(shaftGeo, woodMat); shaft.position.z = -.06 - (LENGTH - .1) / 2; shaft.name = "shaft"; g.add(shaft);
  const tip = new THREE.Mesh(tipGeo, ironMat); tip.position.z = -.06; g.add(tip);
  const band = new THREE.Mesh(bandGeo, ironMat); band.position.z = -LENGTH + .05; g.add(band);
  return g;
}

function aim(s: FlyingStake): void {
  s.m.position.set(s.x, s.y, s.z);
  s.m.lookAt(s.x + s.vx, s.y + s.vy, s.z + s.vz);
}

/** The shot: a stake leaves the muzzle along `dir` (a unit vector) with `dmg` to strike with. */
export function fireStake(dir: THREE.Vector3, dmg: number): void {
  const cam = renderState.camera.position;
  const m = stakeMesh();
  const s: FlyingStake = {
    m, x: cam.x + dir.x * .7, y: cam.y - .08 + dir.y * .7, z: cam.z + dir.z * .7,
    vx: dir.x * SPEED, vy: dir.y * SPEED, vz: dir.z * SPEED, t: 0, dmg, through: 0, burning: false, hit: new Set(),
  };
  aim(s);
  renderState.scene.add(m);
  flying.push(s);
}

/** Drives the stake in where it is, point first, and leaves it there. */
function driveIn(s: FlyingStake, i: number): void {
  const v = Math.hypot(s.vx, s.vy, s.vz) || 1;
  s.x += s.vx / v * BITE; s.y += s.vy / v * BITE; s.z += s.vz / v * BITE;
  aim(s);
  if (s.burning) for (const c of s.m.children) if (c.name === "shaft") (c as THREE.Mesh).material = charMat;
  sparks(s.x, s.y, s.z, 4); smoke3d(s.x, s.y, s.z, 3);
  at(s.x, s.y, s.z, () => stakeThunk());
  flying.splice(i, 1);
  stuck.push(s.m);
  if (stuck.length > STUCK_MAX) renderState.scene.remove(stuck.shift() as THREE.Object3D);
}

function gone(s: FlyingStake, i: number): void { renderState.scene.remove(s.m); flying.splice(i, 1); }

type Body = Pick<Enemy, "dead" | "dormant" | "x" | "z" | "w" | "h" | "fy" | "kx" | "kz" | "kbRes">;

/** What the point meets at (x,y,z): a wall or floor or beam ("hard"), a prop, a body, or nothing. */
function meets(s: FlyingStake, x: number, y: number, z: number): "hard" | Prop | Body | null {
  if (solidAt(x, z) || y < floorHeightAt(x, z) + .02 || y > ceilHeightAt(x, z) - .02) return "hard";
  for (const p of world.props as unknown as Prop[]) if (!p.dead && Math.hypot(x - p.x, z - p.z) < p.r + .05 && y < p.hgt) return p;
  for (const e of world.enemies as readonly Body[]) {
    if (e.dead || e.dormant || s.hit.has(e)) continue;
    const fy = e.fy || 0;
    if (Math.hypot(x - e.x, z - e.z) < e.w * .5 && y > fy && y < fy + e.h * 1.05) return e;
  }
  return null;
}

/** One body struck: the damage, the shove, the blood; true if the stake goes on through it. */
function strike(s: FlyingStake, e: Body): boolean {
  s.hit.add(e);
  const v = Math.hypot(s.vx, s.vz) || 1, dx = s.vx / v, dz = s.vz / v;
  const head = s.y > (e.fy || 0) + e.h * .8;
  const dmg = s.dmg * (s.burning ? BURN : 1) * (head ? HEAD : 1);
  S.hitsLanded++;
  blood(s.x, s.y, s.z, head ? 14 : 9, 2.4); addPool(e.x, e.z, .3);
  at(s.x, s.y, s.z, () => bulletHitsFlesh(e));
  if (s.burning) fireP(s.x, s.y, s.z, 6);
  const res = 1 - (e.kbRes || 0);
  e.kx += dx * SHOVE * res; e.kz += dz * SHOVE * res;
  damageEnemy(e, dmg, { wIdx: 9, head, dir: { x: dx, z: dz }, hx: s.x, hy: s.y, hz: s.z });
  if (!e.dead || s.through >= THROUGH - 1) return false;
  s.through++; s.dmg *= THROUGH_KEEP; s.vx *= THROUGH_KEEP; s.vy *= THROUGH_KEEP; s.vz *= THROUGH_KEEP;
  return true;
}

/** One frame: flight, fire, what it strikes. Called from `src/fx/ProjectileTick.ts`'s `projTick`. */
export function stakeTick(dt: number): void {
  for (let i = flying.length - 1; i >= 0; i--) {
    const s = flying[i];
    s.t += dt;
    if (!s.burning && s.t >= IGNITE) s.burning = true;
    s.vy -= GRAVITY * dt;
    const len = Math.hypot(s.vx, s.vy, s.vz) * dt, n = Math.max(1, Math.ceil(len / STEP));
    let ended = false;
    for (let k = 0; k < n && !ended; k++) {
      const x = s.x + s.vx * dt / n, y = s.y + s.vy * dt / n, z = s.z + s.vz * dt / n;
      const what = meets(s, x, y, z);
      if (what === "hard") { driveIn(s, i); ended = true; break; }
      s.x = x; s.y = y; s.z = z;
      if (what === null) continue;
      if ("hgt" in what) {
        if (what.explosive) explodeBarrel(what); else breakProp(what);
        smoke3d(x, y, z, 4); gone(s, i); ended = true;
      } else if (!strike(s, what)) { gone(s, i); ended = true; }
    }
    if (ended) continue;
    aim(s);
    if (s.burning) { fireP(s.x, s.y, s.z, 1); if ((s.t * 40 | 0) % 2 === 0) spawnP(s.x, s.y, s.z, 0, .4, 0, 1, .55, .2, .18, 1); }
    if (s.t >= LIFE) gone(s, i);
  }
}

import * as THREE from "three";
import "../render/ColorPolicy";
import { at } from "../audio/AudioEngine";
import { barrelExplosion } from "../audio/sounds/explosions";
import { fireP, smoke3d, sparks, spawnP } from "../fx/Particles";
import { spawnGibs } from "../fx/Gibs";
import { scorchMat } from "../fx/Decals";
import { track } from "../render/DisposeRegistry";
import { shake, screenShake } from "../fx/ShakeState";
import { renderState } from "../render/Renderer";
import { player } from "../player/PlayerState";
import { alertSound } from "../enemies/ai/Perception";
import { damageEnemy } from "../enemies/Damage";
import { damagePlayer } from "../player/Player";
import { world } from "../world/WorldState";
import { ceilHeightAt, floorHeightAt, solidAt } from "../world/Collision";
import { breakProp, explodeBarrel, type Prop } from "../world/Props";
import type { Enemy } from "../enemies/Enemy";
import { sticks } from "./DynamiteState";
import { blastWindows } from "../world/Windows";

/**
 * DYNAMITE (owner, 2026-10-20: "ilk dinamit eklensin") — slot 8, the game's ninth weapon, after Blood's own: a bundle of three
 * sticks with a lit fuse, thrown underhand in an arc. It bounces off the floor and the walls, rolls to a stop, and goes off when
 * its fuse burns down — not when it touches anything — so it can be bounced round a corner into a room, dropped at a doorway
 * for what follows, or cooked on a crowd. The blast is a barrel's and more: it throws bodies, breaks props, sets off barrels and
 * hurts the thrower too if he stands in it, as Blood's does.
 *
 * Thrown from the camera along the aim with a lift; gravity 14 (a heavier thing than a cross); each bounce keeps 45% of the speed
 * into the surface and 70% along it. Nothing here draws from `Math.random` but the particles' own visual noise (the same pool
 * every other effect uses).
 */

export const FUSE = 1.7;          // seconds from the throw to the bang
export const THROW = 13;          // m/s along the aim
export const LOB = 3.2;           // m/s added upward
export const GRAVITY = 14;
export const BLAST_R = 5.5;       // the blast's reach, world units
export const BLAST_DMG = 150;     // at the centre, falling to nothing at the edge (plus 30 to anything in it)
export const SELF_R = 4.5, SELF_DMG = 55;

export { resetDynamite, sticksLive } from "./DynamiteState";

const stickMat = new THREE.MeshLambertMaterial({ color: 0xa8281a });
const tapeMat = new THREE.MeshLambertMaterial({ color: 0x1a1612 });
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd060 });
let stickGeo: THREE.CylinderGeometry | null = null, tapeGeo: THREE.CylinderGeometry | null = null, sparkGeo: THREE.SphereGeometry | null = null;

function bundle(): THREE.Group {
  stickGeo ??= new THREE.CylinderGeometry(.045, .045, .34, 8);
  tapeGeo ??= new THREE.CylinderGeometry(.1, .1, .05, 10);
  sparkGeo ??= new THREE.SphereGeometry(.045, 6, 6);
  const g = new THREE.Group();
  for (const [x, z] of [[-.05, 0], [.05, 0], [0, .075]]) { const s = new THREE.Mesh(stickGeo, stickMat); s.position.set(x, 0, z - .025); g.add(s); }
  for (const y of [-.09, .09]) { const t = new THREE.Mesh(tapeGeo, tapeMat); t.position.y = y; g.add(t); }
  const sp = new THREE.Mesh(sparkGeo, sparkMat); sp.position.y = .24; sp.name = "spark"; g.add(sp);
  return g;
}

/** The throw: a bundle leaves the camera along `dir` (unit vector), with the lob. */
export function throwDynamite(dir: THREE.Vector3): void {
  const cam = renderState.camera.position;
  const m = bundle();
  const x = cam.x + dir.x * .5, y = cam.y - .15 + dir.y * .5, z = cam.z + dir.z * .5;
  m.position.set(x, y, z);
  renderState.scene.add(m);
  sticks.push({ m, x, y, z, vx: dir.x * THROW, vy: dir.y * THROW + LOB, vz: dir.z * THROW, fuse: FUSE, spin: 9 });
}

/** One frame: flight, bounces, the fuse's sparks, and the bang. Called from `src/fx/ProjectileTick.ts`'s `projTick`. */
export function dynamiteTick(dt: number): void {
  for (let i = sticks.length - 1; i >= 0; i--) {
    const s = sticks[i];
    s.fuse -= dt;
    s.vy -= GRAVITY * dt;
    // x and z apart, so a wall turns the bundle back along its own axis
    const nx = s.x + s.vx * dt;
    if (solidAt(nx, s.z)) { s.vx *= -.45; s.vz *= .7; } else s.x = nx;
    const nz = s.z + s.vz * dt;
    if (solidAt(s.x, nz)) { s.vz *= -.45; s.vx *= .7; } else s.z = nz;
    s.y += s.vy * dt;
    const floor = floorHeightAt(s.x, s.z) + .06, ceil = ceilHeightAt(s.x, s.z) - .1;
    if (s.y < floor) { s.y = floor; s.vy = Math.abs(s.vy) > 1.5 ? -s.vy * .45 : 0; s.vx *= .7; s.vz *= .7; s.spin *= .6; }
    if (s.y > ceil) { s.y = ceil; s.vy = -Math.abs(s.vy) * .4; }
    if (s.y <= floor + .001 && s.vy === 0) { s.vx *= Math.exp(-5 * dt); s.vz *= Math.exp(-5 * dt); }   // rolling to a stop
    // what it meets: an enemy stops it at its feet, it does not go off
    for (const e of world.enemies as readonly Pick<Enemy, "dead" | "dormant" | "x" | "z" | "w">[]) {
      if (e.dead || e.dormant) continue;
      if (Math.hypot(s.x - e.x, s.z - e.z) < e.w * .5 + .1) { s.vx *= -.2; s.vz *= -.2; break; }
    }
    s.m.position.set(s.x, s.y, s.z);
    s.m.rotation.x += s.spin * dt; s.m.rotation.z += s.spin * .6 * dt;
    // the fuse fizzes: sparks off its end, more of them as it burns down
    if ((s.fuse * 30 | 0) % 2 === 0) spawnP(s.x, s.y + .2, s.z, 0, 1, 0, 1, .75, .3, .12, 1);
    if (s.fuse <= 0) {
      sticks.splice(i, 1);
      renderState.scene.remove(s.m);
      dynamiteBlast(s.x, Math.max(s.y, floorHeightAt(s.x, s.z) + .3), s.z);
    }
  }
}

/** The bang: light, fire, smoke, sparks, a scorch, the sound; bodies thrown and hurt, props broken, barrels set off, the thrower too. */
export function dynamiteBlast(x: number, y: number, z: number): void {
  shake(.85); screenShake.hitStop = Math.max(screenShake.hitStop, .06);
  renderState.boomLight.position.set(x, y + .9, z); renderState.boomLight.intensity = 5; renderState.boomLight.color.setHex(0xff8a3a);
  fireP(x, y + .4, z, 55); smoke3d(x, y + .6, z, 30); sparks(x, y + .4, z, 26);
  spawnGibs(x, y + .3, z, 5, 6, true);
  const fy = floorHeightAt(x, z);
  const sc = new THREE.Mesh(track(new THREE.CircleGeometry(1.9, 12)), scorchMat);
  sc.rotation.x = -Math.PI / 2; sc.position.set(x, fy + .016, z); renderState.scene.add(sc);
  at(x, y, z, () => barrelExplosion());
  const pd = Math.hypot(player.px - x, player.pz - z);
  if (pd < SELF_R) damagePlayer(SELF_DMG * (1 - pd / SELF_R));
  for (const e of world.enemies as readonly Pick<Enemy, "dead" | "x" | "z" | "kx" | "kz">[]) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d < BLAST_R) {
      const f = Math.max(d, .2);
      e.kx += (e.x - x) / f * 11; e.kz += (e.z - z) / f * 11;
      damageEnemy(e, BLAST_DMG * (1 - d / BLAST_R) + 30, { explosive: true, dir: { x: (e.x - x) / f, z: (e.z - z) / f } });
    }
  }
  for (const p of world.props as unknown as Prop[]) {
    if (p.dead || Math.hypot(p.x - x, p.z - z) >= BLAST_R - .8) continue;
    if (p.explosive) explodeBarrel(p); else breakProp(p);
  }
  blastWindows(x, z, BLAST_R + 1);   // and the glass in the walls round it (../world/Windows.ts)
  alertSound(x, z, 26);
}

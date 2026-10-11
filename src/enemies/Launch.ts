import { addHitPunch } from "../fx/ViewPunch";
import { bloodFx, chipFx, dustFx } from "../fx/ImpactFx";
import { addWallDecal, splatMat } from "../fx/Decals";
import { wallNormal } from "../world/Collision";
import { shake } from "../fx/ShakeState";
import { rnd } from "../utils/math";
import { at } from "../audio/AudioEngine";
import { kickLands } from "../audio/sounds/kick";
import { wallSplat } from "../audio/sounds/monsters";
import { player } from "../player/PlayerState";
import { sideOf } from "../fx/HitFeel";
import { viewYaw } from "../render/ViewYaw";

/**
 * A KICKED BODY IN THE AIR — lifted, tumbling, trailing blood, landing
 * with a thud and a skid. `docs/superpowers/plans/2026-10-08-impact.md`,
 * Task 2. The flight itself is the game's (`enemyTick`'s `flung` branch:
 * `doKick` sets `e.flung` to .9 s and a 16 units/s shove; the body keeps
 * that speed for the whole flight, fourteen units, and slides on after it):
 * only what the player sees of it is made here.
 *
 * **Presentation only.** The lift is the sprite's height, the tumble its
 * rotation, the trail and the dust particles; none is read back by the
 * simulation. Every random number is `FxRand`'s.
 */

/** The flight's length, seconds (`doKick`'s `flung`), how high the arc peaks (was 1.1 until the impact plan), and the whole turns of the tumble. */
export const FLIGHT = { secs: 0.9, arc: 1.7, turns: 2 };

/** How high above its feet a body is `t` seconds into its flight. */
export function liftAt(t: number): number {
  return Math.sin(Math.min(1, Math.max(0, t) / FLIGHT.secs) * Math.PI) * FLIGHT.arc;
}

/**
 * The sprite's rotation `t` seconds into the flight: `turns` whole turns, head over heels
 * (or the other way, by `spin`'s sign), so it ends at exactly upright when the flight does.
 */
export function tumbleAt(t: number, spin: number): number {
  return spin * Math.min(1, Math.max(0, t) / FLIGHT.secs) * FLIGHT.turns * Math.PI * 2;
}

/** Which way a body thrown along (`dx`,`dz`) tumbles: toward the side of the screen it is thrown to (a thrown-left body goes over the left shoulder). */
export function spinFor(dx: number, dz: number): number {
  const yaw = viewYaw();
  return dx * Math.cos(yaw) - dz * Math.sin(yaw) >= 0 ? -1 : 1;
}

/** Thirty blood drops a second off a body in the air. `prevT` and `t` are its flight time before and after this frame. */
export function trailFx(x: number, y: number, z: number, vx: number, vz: number, prevT: number, t: number): void {
  if (Math.floor(t * 30) === Math.floor(prevT * 30)) return;
  const d = Math.hypot(vx, vz) || 1;
  bloodFx(x, y, z, 2, 0.5, -vx / d * 0.5, -vz / d * 0.5);
}

/** A body comes down: a thud, a puff of dust, a few drops. */
export function landFx(x: number, fy: number, z: number, vx: number, vz: number): void {
  const d = Math.hypot(vx, vz) || 1;
  dustFx(x, fy + 0.1, z, 9, 1, vx / d * 0.8, vz / d * 0.8);
  bloodFx(x, fy + 0.2, z, 5, 1, vx / d, vz / d);
  at(x, fy + 0.3, z, () => kickLands());
}

/** A skid: dust off the feet of a body sliding fast, every third call. */
let skid = 0;
export function skidFx(x: number, fy: number, z: number, vx: number, vz: number): void {
  if ((++skid & 3) !== 0 || Math.abs(vx) + Math.abs(vz) < 5) return;
  const d = Math.hypot(vx, vz) || 1;
  dustFx(x, fy + 0.05, z, 2, 0.6, -vx / d * 0.4, -vz / d * 0.4);
}

/** The view takes a wall hit that is in sight of the player: a punch, harder the nearer. */
export function wallSlamPunch(x: number, z: number): void {
  const d = Math.hypot(x - player.px, z - player.pz);
  if (d > 16) return;
  addHitPunch(Math.max(0.3, 1 - d / 16), sideOf(player.px, player.pz, x, z, viewYaw()));
}

/**
 * A living body slams into a wall (`enemyTick` has already taken its 40 damage, its stun and the
 * game's own blood, decal and sound): the blood sprays back off the wall, dust and chips fly, and the view takes it.
 */
export function wallSlamFx(e: { h: number; fy?: number }, nx: number, nz: number, dx: number, dz: number): void {
  const y = e.h * 0.55 + (e.fy || 0);
  bloodFx(nx - dx * 0.3, y, nz - dz * 0.3, 26, 2.6, -dx, -dz);
  dustFx(nx - dx * 0.3, y - 0.3, nz - dz * 0.3, 10, 1.2, -dx, -dz);
  chipFx(nx - dx * 0.3, y, nz - dz * 0.3, 6, 1, -dx, -dz);
  wallSlamPunch(nx, nz);
}

/**
 * A corpse the kick killed is slammed into a wall: all of the above, and the splat the live body gets
 * (a decal on the wall, its sound), without the damage a corpse cannot take.
 */
export function corpseSlam(e: { h: number; fy?: number; x: number; z: number; kx: number; kz: number }, nx: number, nz: number): void {
  const d = Math.hypot(e.kx, e.kz) || 1, dx = e.kx / d, dz = e.kz / d;
  const n = wallNormal(nx, nz, { x: dx, z: dz });
  addWallDecal(nx - dx * 0.2, rnd(0.8, 1.6) + (e.fy || 0), nz - dz * 0.2, n.x, n.z, rnd(0.5, 0.8), splatMat);
  wallSlamFx(e, nx, nz, dx, dz);
  at(nx, e.h * 0.6 + (e.fy || 0), nz, () => wallSplat());
  shake(0.12);
}

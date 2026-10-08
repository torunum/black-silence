import type { LeanCamera } from "../render/viewmodel/kick";

/**
 * THE VIEW PUNCH — the camera jolting toward what the player just hit (or
 * back from the gun he just fired), for the render only.
 * `docs/superpowers/plans/2026-10-08-impact.md`, Task 1.
 *
 * Three numbers, each decaying on its own: `lunge` (metres along the facing;
 * positive is toward the target, negative is the gun's shove back), `pitch`
 * (radians; negative dips the view) and `roll` (radians; tilts toward the
 * side the target is on). They are written by `addHitPunch`/`addFirePunch`
 * and aged by `punchTick` with the hit-stop-scaled dt, so a punch hangs at
 * its peak through the freeze and lets go after it — which is the feel of a
 * hit-stop.
 *
 * **Render only, like the kick's lean** (`src/render/viewmodel/kick.ts`'s
 * `withKickLean`): `withViewPunch` moves the camera around the one
 * `renderer.render` call and puts it back by assignment, so the camera
 * gameplay reads — the hitscan's aim, the listener, the trace fixtures'
 * camera — never sees it. Shaking the *aim* is recoil, and that is
 * `weaponRuntime.recoilPitch`'s, unchanged.
 */

export const punch = { lunge: 0, pitch: 0, roll: 0 };

/** The full-strength (1.0) punch of a hit, and the ceilings no pile of hits can pass. */
export const HIT_PUNCH = { lunge: 0.085, pitch: -0.026, roll: 0.034 };
export const FIRE_PUNCH = { lunge: -0.055, pitch: 0.012, roll: 0.012 };
export const PUNCH_MAX = { lunge: 0.14, pitch: 0.045, roll: 0.06 };
/** Decay rates, per second (the larger, the snappier). */
export const PUNCH_RATE = { lunge: 15, pitch: 13, roll: 11 };

/**
 * How hard each weapon shoves the view back when it fires, by slot (0..1):
 * the shotgun and the BMG are enormous, the pistol and the cross launcher
 * are solid, the automatic weapons barely move the view (their stream is
 * the feel, not each round).
 */
export const FIRE_STRENGTH: Readonly<Record<number, number>> = { 0: 0.45, 1: 1, 2: 0.2, 3: 0.1, 4: 1, 5: 0.6, 6: 0.06, 7: 0.7 };

const clampTo = (v: number, m: number): number => (v > m ? m : v < -m ? -m : v);

/** A blow landed with `strength` (0..1) on a body `side` of the view (-1 left .. 1 right). */
export function addHitPunch(strength: number, side: number): void {
  punch.lunge = clampTo(punch.lunge + HIT_PUNCH.lunge * strength, PUNCH_MAX.lunge);
  punch.pitch = clampTo(punch.pitch + HIT_PUNCH.pitch * strength, PUNCH_MAX.pitch);
  punch.roll = clampTo(punch.roll + HIT_PUNCH.roll * strength * (side >= 0 ? -1 : 1) * (0.5 + 0.5 * Math.min(1, Math.abs(side) * 2)), PUNCH_MAX.roll);
}

/** A heavy gun was fired (`strength` 0..1): the view is shoved back and kicks up. */
export function addFirePunch(strength: number, flip: number): void {
  punch.lunge = clampTo(punch.lunge + FIRE_PUNCH.lunge * strength, PUNCH_MAX.lunge);
  punch.pitch = clampTo(punch.pitch + FIRE_PUNCH.pitch * strength, PUNCH_MAX.pitch);
  punch.roll = clampTo(punch.roll + FIRE_PUNCH.roll * strength * (flip & 1 ? 1 : -1), PUNCH_MAX.roll);
}

export function punchTick(dt: number): void {
  punch.lunge *= Math.exp(-PUNCH_RATE.lunge * dt);
  punch.pitch *= Math.exp(-PUNCH_RATE.pitch * dt);
  punch.roll *= Math.exp(-PUNCH_RATE.roll * dt);
  if (Math.abs(punch.lunge) < 1e-5) punch.lunge = 0;
  if (Math.abs(punch.pitch) < 1e-5) punch.pitch = 0;
  if (Math.abs(punch.roll) < 1e-5) punch.roll = 0;
}

export function resetPunch(): void { punch.lunge = punch.pitch = punch.roll = 0; }

/** Renders with the view punched, then puts the camera back exactly as it was (see the module comment). */
export function withViewPunch(cam: LeanCamera, render: () => void): void {
  if (punch.lunge === 0 && punch.pitch === 0 && punch.roll === 0) { render(); return; }
  const { x: px, y: py, z: pz } = cam.position, { x: rx, z: rz } = cam.rotation, yaw = cam.rotation.y;
  cam.position.x = px - Math.sin(yaw) * punch.lunge;
  cam.position.z = pz - Math.cos(yaw) * punch.lunge;
  cam.rotation.x = rx + punch.pitch;
  cam.rotation.z = rz + punch.roll;
  try {
    render();
  } finally {
    cam.position.x = px; cam.position.y = py; cam.position.z = pz;
    cam.rotation.x = rx; cam.rotation.z = rz;
    cam.updateMatrixWorld(true);
  }
}

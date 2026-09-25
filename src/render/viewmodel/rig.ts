import { Builder } from "./builder";
import { finish, type Raster } from "./raster";
import type { Pose, WeaponArt } from "./pose";

/**
 * Renders one weapon, hands and sleeves for one pose into a Raster and
 * returns where its anchors (the muzzle tip, a glow core) landed, in raster
 * pixels. Pure: no DOM, no Math.random, same pose in -> same pixels out.
 *
 * FOCAL is the viewmodel's own focal length in raster pixels: a short lens,
 * so the gun and hands take up about a third of the screen's height, as
 * Doom/Quake viewmodels do.
 *
 * AIM_DX/AIM_DY shift the lens: the viewmodel's vanishing point sits this
 * far right of and below the crosshair. A barrel held straight forward
 * converges on its vanishing point, so without the shift every muzzle
 * points exactly at the crosshair and the gun covers what the player is
 * shooting at. With the shift the weapon still reads as pointing forward,
 * but it stays low and out of the centre of the screen.
 * tests/behavior/viewmodel.test.ts pins this: every weapon, at rest, firing
 * and reloading, and at more than one aspect ratio, stays below a line 15%
 * of the screen's height under the crosshair (CLEAR_BELOW).
 */
export const FOCAL = 170;
export const AIM_DX = 14, AIM_DY = 38;
/** How far below the crosshair, as a fraction of screen height, the weapon's topmost pixel must stay. */
export const CLEAR_BELOW = 0.15;

export function renderWeapon(r: Raster, art: WeaponArt, pose: Pose, cx: number, cy: number): Record<string, [number, number]> {
  r.clear();
  const b = new Builder(r, FOCAL, cx + AIM_DX, cy + AIM_DY);
  const h = art.hold;
  b.translate(h.x + pose.x, h.y + pose.y, h.z + pose.z);
  b.yaw(h.yaw + pose.yaw);
  b.pitch(h.pitch + pose.pitch);
  b.roll(h.roll + pose.roll);
  // recoil: straight back into the hand, muzzle rising about the grip
  b.translate(0, 0, -pose.recoil * art.kick.back);
  b.pitch(pose.recoil * art.kick.lift);
  art.draw(b, pose);
  finish(r);
  return b.anchors;
}

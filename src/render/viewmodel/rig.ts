import { Builder } from "./builder";
import { finish, type Raster } from "./raster";
import type { Pose, WeaponArt } from "./pose";

/**
 * Renders one weapon, hands and sleeves for one pose into a Raster and
 * returns where its anchors (the muzzle tip, a glow core) landed, in raster
 * pixels. Pure: no DOM, no Math.random, same pose in -> same pixels out.
 *
 * FOCAL is the viewmodel's own focal length in raster pixels — a narrower
 * field of view than the world camera's 78 degrees (about 64 degrees
 * vertically over the 200-row raster), the usual viewmodel trick that
 * keeps a gun held at arm's length from stretching like a fisheye.
 */
export const FOCAL = 200;

export function renderWeapon(r: Raster, art: WeaponArt, pose: Pose, cx: number, cy: number): Record<string, [number, number]> {
  r.clear();
  const b = new Builder(r, FOCAL, cx, cy);
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

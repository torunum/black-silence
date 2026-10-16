import { Builder } from "./builder";
import { finish, type Raster } from "./raster";
import type { Pose, WeaponArt } from "./pose";
import { drawLeg, legPose } from "./kick";

/**
 * Renders one weapon, hands and sleeves for one pose into a Raster and
 * returns where its anchors (the muzzle tip, a glow core) landed, in raster
 * pixels. Pure: no DOM, no Math.random, same pose in -> same pixels out.
 *
 * FOCAL is the viewmodel's own focal length in raster pixels: a short lens,
 * so the gun and hands take up about a third of the screen's height, as
 * Doom/Quake viewmodels do.
 *
 * The viewmodel looks straight down the view axis: its vanishing point is the
 * crosshair (AIM_DX = AIM_DY = 0), so a barrel held parallel to the view
 * runs up the screen toward the crosshair and is not canted. It used to
 * shift the lens (14 px right, 38 px down) so the weapon would stay clear
 * of the crosshair, and every weapon was then held yawed and rolled to
 * show its length: they read as crooked (owner, 2026-10-17). Clearance now
 * comes from where and how large the weapon is held, never from a tilt.
 * tests/behavior/viewmodel.test.ts pins that every weapon, at rest, firing
 * and reloading, and at more than one aspect ratio, stays below a line 15%
 * of the screen's height under the crosshair (CLEAR_BELOW), and
 * tests/behavior/viewmodelStraight.test.ts that every barrel is parallel
 * to the view at rest, with no roll.
 */
export const FOCAL = 170;
export const AIM_DX = 0, AIM_DY = 0;
/** How far below the crosshair, as a fraction of screen height, the weapon's topmost pixel must stay. */
export const CLEAR_BELOW = 0.15;

export function renderWeapon(r: Raster, art: WeaponArt | null, pose: Pose, cx: number, cy: number): Record<string, [number, number]> {
  r.clear();
  const b = new Builder(r, FOCAL, cx + AIM_DX, cy + AIM_DY);
  if (art) { // null: the scoped-in sniper, hidden, while a kick still shows the leg
    const h = art.hold;
    b.translate(h.x + pose.x, h.y + pose.y, h.z + pose.z);
    b.yaw(h.yaw + pose.yaw);
    b.pitch(h.pitch + pose.pitch);
    b.roll(h.roll + pose.roll);
    // recoil: straight back into the hand, muzzle rising about the grip
    b.translate(0, 0, -pose.recoil * art.kick.back);
    b.pitch(pose.recoil * art.kick.lift);
    art.draw(b, pose);
  }
  // the kicking leg (./kick.ts): same raster, depth buffer and light, but projected from the true eye
  // (no AIM shift) — the kick is aimed at the crosshair, which the weapons deliberately are not
  const leg = legPose(pose.kick);
  if (leg) {
    const lb = new Builder(r, FOCAL, cx, cy, LEG_PART);
    drawLeg(lb, leg);
    Object.assign(b.anchors, lb.anchors);
  }
  finish(r);
  return b.anchors;
}
/** The leg's primitives are numbered from here, clear of any weapon's. */
const LEG_PART = 4000;

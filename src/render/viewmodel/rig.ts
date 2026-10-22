import { Builder } from "./builder";
import { finish, VM_RES, type Raster } from "./raster";
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
export const FOCAL = 170 * VM_RES;
export const AIM_DX = 0, AIM_DY = 40 * VM_RES;
/**
 * The weapons' own lens, longer than the leg's FOCAL (owner, 2026-10-20: the weapons stood crooked, "daha Doom Blood gibi").
 * Every gun is now held square to the screen — no cant, no swing across it — a little right of the crosshair and pointing
 * straight ahead, so it reads as looking where the player looks while its side still shows (the owner chose this over a gun dead
 * centre, seen end-on: "option 3, a bit more upright"). A longer lens keeps it big and flat, as Doom's and Blood's sprites are.
 */
export const WEAPON_FOCAL = 280 * VM_RES;
/** Where every weapon stands, over its own hold (owner, 2026-10-22: "Blood gibi sağ-alt"): moved right and down from the straight-ahead stance. */
export const STANCE = { x: 0.065, y: 0.01, z: 0.08, yaw: -0.07, pitch: -0.12, roll: 0 };
/** How far below the crosshair, as a fraction of screen height, the weapon's topmost pixel must stay. */
export const CLEAR_BELOW = 0.1;
/** While reloading nothing is fired, and the reload is brought up into view (pose.ts's `present`): the weapon may then rise to just under the crosshair, never over it. */
export const RELOAD_CLEAR = 0.02;

export function renderWeapon(r: Raster, art: WeaponArt | null, pose: Pose, cx: number, cy: number): Record<string, [number, number]> {
  r.clear();
  const b = new Builder(r, WEAPON_FOCAL, cx + AIM_DX, cy + AIM_DY);
  if (art) { // null: the scoped-in sniper, hidden, while a kick still shows the leg
    const h = art.hold, st = STANCE;
    b.translate(h.x + st.x + pose.x, h.y + st.y + pose.y, h.z + st.z + pose.z);
    b.yaw(h.yaw + st.yaw + pose.yaw);
    b.pitch(st.pitch);
    b.roll(st.roll);
    b.pitch(h.pitch + pose.pitch);
    b.roll(h.roll + pose.roll);
    // recoil: straight back into the hand, muzzle rising about the grip
    b.translate(0, 0, -pose.recoil * art.kick.back);
    b.pitch(pose.recoil * art.kick.lift);
    art.draw(b, pose);
  }
  // the kicking leg (./kick.ts): same raster, depth buffer and light, but projected from the true eye
  // (no AIM shift) — the kick is aimed at the crosshair, which the weapons deliberately are not
  const leg = legPose(pose.kick, pose.drop > 0);
  if (leg) {
    const lb = new Builder(r, FOCAL, cx, cy, LEG_PART);
    drawLeg(lb, leg);
    const other = pose.drop > 0 ? legPose(pose.kick, true, true) : null;   // the drop kick's other boot, beside the first
    if (other) { const foot = lb.anchors.foot; drawLeg(lb, other); if (foot) lb.anchors.foot = foot; }
    Object.assign(b.anchors, lb.anchors);
  }
  finish(r);
  return b.anchors;
}
/** The leg's primitives are numbered from here, clear of any weapon's. */
const LEG_PART = 4000;

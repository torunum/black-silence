import type { Builder } from "../builder";
import { MAT } from "../palette";
import { fist, forearm } from "../hands";
import { hump, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 6, NAIL CANNON — a rotary nailer: six iron barrels in a ring,
 * clamped by copper bands, turning in front of a fat riveted copper motor
 * drum; a brass nail hopper on the left side feeding in through a hose; an
 * iron carry handle on top; the left hand on an upright side handle.
 *
 * Fire: the barrel cluster spins up and keeps turning while the trigger is
 * held, winding down after (the spin is integrated over time by
 * ../animate.ts, not picked from a frame). Reload (2.0 s): the gun rolls
 * right, the left hand lifts the empty hopper off (18%), brings a full one
 * and drops it on its post (62%).
 */

const rivetTex = (x: number, y: number, z: number): number => {
  const a = Math.atan2(y, x);
  const ring = Math.abs(z + 0.1) < 0.006 || Math.abs(z - 0.08) < 0.006;
  return ring && (Math.floor((a + 4) * 4) & 1) === 0 ? 1.4 : ring ? -0.8 : 0;
};
const hopperTex = (x: number, y: number): number =>
  y > 0.02 && Math.abs(x) < 0.02 && ((Math.floor(x * 300) & 1) === 0) ? -1.5 : 0; // sight slit showing it is empty or full

const AXIS_Y = 0.058;

function hopper(b: Builder): void {
  b.cyl(0, 0, 0.0, 0.12, 0.021, 0.021, 10, MAT.BRASS, { tex: (x, y) => hopperTex(x, y) });
  b.cyl(0, 0, 0.12, 0.13, 0.024, 0.024, 10, MAT.IRON);
  b.cyl(0, 0, -0.01, 0.002, 0.024, 0.024, 10, MAT.IRON);
}

export const nailCannon: WeaponArt = {
  name: "NAIL CANNON",
  hold: { x: 0.13, y: -0.112, z: 0.32, pitch: -0.03, yaw: -0.2, roll: 0.1 },
  kick: { back: 0.012, lift: 0.03 },
  action: (p) => p,
  spinRate: 26,
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);
    b.translate(0, 0.02 * tilt, 0); b.roll(0.3 * tilt); b.pitch(0.1 * tilt);

    // motor drum, carry handle
    b.cyl(0, AXIS_Y, -0.04, 0.08, 0.036, 0.036, 12, MAT.COPPER, { tex: (x, y, z) => rivetTex(x, y - AXIS_Y, z) });
    b.cyl(0, AXIS_Y, -0.05, -0.04, 0.028, 0.028, 12, MAT.IRON);
    b.cyl(0, AXIS_Y, 0.08, 0.1, 0.046, 0.046, 12, MAT.IRON);
    b.cbox(-0.006, AXIS_Y + 0.05, -0.05, 0.006, AXIS_Y + 0.058, 0.07, 0.002, MAT.IRON);
    b.box(-0.005, AXIS_Y + 0.036, -0.05, 0.005, AXIS_Y + 0.058, -0.038, MAT.IRON);
    b.box(-0.005, AXIS_Y + 0.036, 0.058, 0.005, AXIS_Y + 0.058, 0.07, MAT.IRON);

    // the spinning cluster: six barrels, two bands, a hub
    b.push(); b.translate(0, AXIS_Y, 0); b.roll(pose.spin);
    for (let i = 0; i < 6; i++) {
      const ang = i * Math.PI / 3;
      b.cyl(Math.cos(ang) * 0.03, Math.sin(ang) * 0.03, 0.1, 0.5, 0.0115, 0.0115, 6, MAT.IRON);
    }
    for (const z of [0.22, 0.46]) b.cyl(0, 0, z, z + 0.022, 0.047, 0.047, 6, MAT.COPPER, { a0: 0 });
    b.cyl(0, 0, 0.1, 0.49, 0.014, 0.014, 6, MAT.BLACK);
    b.pop();
    b.anchor("muzzle", 0, AXIS_Y, 0.5);

    // hopper on its post on the left side, hose into the drum
    b.cbox(-0.05, AXIS_Y - 0.02, -0.02, -0.036, AXIS_Y - 0.006, 0.04, 0.003, MAT.IRON);
    const lift = r < 0 ? 0 : hump(r, 0.12, 0.66, 0.12);
    {
      b.push();
      b.translate(-0.056 - 0.03 * lift, AXIS_Y - 0.03 + 0.12 * lift, -0.02 + 0.14 * lift);
      b.roll(-0.6 * lift);
      hopper(b);
      b.pop();
    }
    b.push(); b.translate(-0.07, AXIS_Y + 0.012, 0.075); b.yaw(1.2); b.cyl(0, 0, 0, 0.04, 0.007, 0.007, 6, MAT.BLACK); b.pop();

    // left hand: on the side handle, or carrying hoppers
    if (lift < 0.05) {
      b.push(); b.translate(-0.06, AXIS_Y - 0.03, 0.14);
      b.cbox(0.0, -0.004, -0.01, 0.02, 0.004, 0.01, 0.002, MAT.IRON);
      b.ext([[-0.012, 0.0], [0.012, 0.0], [0.01, -0.08], [-0.01, -0.08]], -0.012, 0.012, MAT.WOOD);
      fist(b, -1, { w: 0.012 });
      forearm(b, -0.01, -0.05, -0.05, [-0.45, -0.5, -1], 0.03);
      b.pop();
    } else {
      b.push();
      b.translate(-0.07 - 0.03 * lift, AXIS_Y - 0.05 + 0.12 * lift, 0.02 + 0.14 * lift);
      b.roll(-0.5); b.pitch(0.3);
      fist(b, -1, { w: 0.02, fingers: 3 });
      forearm(b, -0.01, -0.05, -0.045, [-0.3, -1, -0.2], 0.03);
      b.pop();
    }

    // iron pistol grip, guard, right hand
    b.ext([[-0.03, 0.01], [0.004, 0.01], [-0.012, -0.1], [-0.042, -0.104], [-0.05, -0.02]], -0.017, 0.017, MAT.IRON);
    b.ext([[0.0, 0.01], [0.06, 0.01], [0.06, 0.002], [0.046, -0.028], [0.012, -0.03], [0.006, -0.024], [0.042, -0.022], [0.052, 0.002], [0.0, 0.002]], -0.004, 0.004, MAT.IRON);
    b.push(); b.pitch(-0.25); fist(b, 1, { trigger: true, w: 0.017 }); b.pop();
    forearm(b, 0.012, -0.05, -0.06, [0.3, -0.42, -1], 0.031);
  },
};

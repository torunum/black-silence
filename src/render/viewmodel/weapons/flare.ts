import type { Builder } from "../builder";
import { MAT } from "../palette";
import { fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 0, FLARE PISTOL — a wide-bore signal pistol held in one hand: a fat
 * orange-painted barrel with brass bands on a brass frame, a big spur
 * hammer, a black chequered grip. Held canted, seen from the right and
 * behind so the length of that barrel reads.
 *
 * Fire: the hammer falls, the muzzle flips up hard, the thumb rolls the
 * hammer back. Reload: the gun turns to show its breech, the barrel breaks
 * open downward on its front hinge, the spent shell kicks out (the game
 * ejects casings at 18%), the left hand brings a fresh red flare shell up
 * and pushes it in (the 62% click), the barrel snaps shut.
 */

const gripTex = (_x: number, y: number, z: number): number =>
  ((Math.floor(y * 240) + Math.floor(z * 240)) & 1) ? -0.8 : 0; // chequered grip panel
const bandTex = (_x: number, _y: number, z: number): number =>
  (Math.floor(z * 200) & 1) ? -0.6 : 0; // milled rings on the breech

/** A flare shell: brass head at z0, red paper hull forward of it. */
function shell(b: Builder, z0: number): void {
  b.cyl(0, 0, z0 + 0.012, z0 + 0.09, 0.019, 0.019, 8, MAT.RED);
  b.cyl(0, 0, z0, z0 + 0.016, 0.022, 0.022, 8, MAT.BRASS);
}

export const flarePistol: WeaponArt = {
  name: "FLARE PISTOL",
  hold: { x: 0.082, y: -0.086, z: 0.36, pitch: 0.02, yaw: -0.4, roll: 0.12 },
  kick: { back: 0.035, lift: 0.42 },
  action: (p) => 1 - ramp(p, 0.5, 0.9),
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const open = r < 0 ? 0 : hump(r, 0.08, 0.88, 0.1);    // breech angle 0..1
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);    // whole gun turned to show the breech
    b.roll(-0.3 * tilt); b.pitch(0.22 * tilt); b.yaw(0.25 * tilt);

    // frame, grip, guard
    b.cbox(-0.015, 0.0, -0.045, 0.015, 0.03, 0.06, 0.005, MAT.BRASS);
    b.ext([[-0.046, 0.002], [0.0, 0.002], [-0.012, -0.1], [-0.02, -0.108], [-0.058, -0.104], [-0.06, -0.09]], -0.015, 0.015, MAT.BLACK, { tex: gripTex });
    b.cbox(-0.016, -0.114, -0.062, 0.016, -0.1, -0.012, 0.004, MAT.BRASS); // butt cap
    b.ext([[0.0, 0.0], [0.052, 0.0], [0.052, -0.008], [0.04, -0.036], [0.012, -0.04], [0.004, -0.032], [0.034, -0.03], [0.044, -0.008], [0.0, -0.008]], -0.004, 0.004, MAT.IRON);

    // hammer: cocked back at rest, forward when fired
    b.push();
    b.translate(0, 0.026, -0.036);
    b.pitch(-0.85 + 0.85 * pose.action);
    b.cbox(-0.006, 0.0, -0.01, 0.006, 0.05, 0.004, 0.002, MAT.IRON);
    b.cbox(-0.01, 0.042, -0.026, 0.01, 0.052, 0.004, 0.002, MAT.IRON); // chequered spur
    b.pop();

    // barrel on its front hinge
    b.push();
    b.translate(0, 0.01, 0.058);
    b.pitch(-1.0 * open);
    b.translate(0, -0.01, -0.058);
    const cy = 0.054;
    b.cyl(0, cy, -0.03, 0.03, 0.031, 0.031, 12, MAT.BRASS, { tex: bandTex }); // breech
    b.cyl(0, cy, 0.03, 0.25, 0.027, 0.026, 12, MAT.ORANGE);                     // the wide barrel
    b.cyl(0, cy, 0.12, 0.132, 0.03, 0.03, 12, MAT.BRASS);                       // barrel band
    b.cyl(0, cy, 0.236, 0.262, 0.032, 0.032, 12, MAT.BRASS);                    // muzzle ring
    b.cbox(-0.005, cy + 0.024, 0.02, 0.005, cy + 0.032, 0.24, 0.002, MAT.BRASS); // top rib
    b.cbox(-0.004, cy + 0.03, 0.225, 0.004, cy + 0.042, 0.238, 0.001, MAT.BRASS); // front sight
    if (open > 0.25) {
      b.cyl(0, cy, -0.032, -0.03, 0.022, 0.022, 12, MAT.BLACK);                // the open bore
      if (r > 0.12 && r < 0.24) {                                             // spent shell kicking out
        const u = (r - 0.12) / 0.12;
        b.push(); b.translate(0.02 * u, cy + 0.03 * u - 0.12 * u * u, -0.03 - 0.16 * u); b.pitch(1.5 * u); shell(b, 0); b.pop();
      }
      if (r > 0.6 && r < 0.84) { b.push(); b.translate(0, cy, -0.03); shell(b, 0); b.pop(); } // fresh shell seated
    }
    b.anchor("muzzle", 0, cy, 0.262);
    b.pop();

    // right hand on the grip, finger on the trigger
    b.push();
    b.pitch(-0.22);
    fist(b, 1, { trigger: true, w: 0.016 });
    b.pop();
    forearm(b, 0.012, -0.05, -0.055, [0.3, -0.45, -1], 0.03);

    // left hand: comes up with a fresh shell and pushes it into the breech
    if (r >= 0) {
      const inn = hump(r, 0.3, 0.78, 0.16), push = ramp(r, 0.48, 0.6);
      if (inn > 0 && r < 0.62) {
        b.push();
        b.translate(-0.02 + 0.015 * inn, -0.16 + 0.19 * inn, -0.13 + 0.06 * inn + 0.03 * push);
        b.pitch(-0.9);
        shell(b, 0);
        b.pop();
      }
      if (inn > 0) {
        b.push();
        b.translate(-0.05 + 0.02 * inn, -0.2 + 0.19 * inn, -0.14 + 0.05 * inn + 0.03 * push);
        b.roll(-0.6); b.pitch(0.4);
        fist(b, -1, { w: 0.012, fingers: 3 });
        forearm(b, -0.01, -0.05, -0.045, [-0.6, -0.5, -1], 0.03);
        b.pop();
      }
    }
  },
};

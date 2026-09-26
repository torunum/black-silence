import type { Builder } from "../builder";
import { MAT } from "../palette";
import { fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 0, FLARE PISTOL — a wide-bore signal pistol held in one hand: a fat
 * orange-painted barrel with brass bands on a brass frame, a spur hammer,
 * a long raked black chequered grip with a brass butt cap and lanyard
 * ring. Held canted, seen from the right and behind, so the grip and the
 * hand on it read as a pistol.
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
  b.cyl(0, 0, z0 + 0.01, z0 + 0.07, 0.015, 0.015, 8, MAT.RED);
  b.cyl(0, 0, z0, z0 + 0.013, 0.017, 0.017, 8, MAT.BRASS);
}

export const flarePistol: WeaponArt = {
  name: "FLARE PISTOL",
  hold: { x: 0.1, y: -0.075, z: 0.45, pitch: 0.0, yaw: -0.55, roll: 0.2 },
  kick: { back: 0.06, lift: 0.1 },
  action: (p) => 1 - ramp(p, 0.5, 0.9),
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const open = r < 0 ? 0 : hump(r, 0.08, 0.88, 0.1);    // breech angle 0..1
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);    // whole gun canted and dipped to show the breech
    b.translate(0, -0.03 * tilt, 0); b.roll(-0.35 * tilt); b.pitch(-0.25 * tilt); b.yaw(0.2 * tilt);

    // frame; a long raked grip with a brass butt cap and lanyard ring; the guard
    b.cbox(-0.013, 0.0, -0.04, 0.013, 0.026, 0.05, 0.004, MAT.BRASS);
    b.ext([[-0.044, 0.002], [0.0, 0.002], [-0.02, -0.11], [-0.028, -0.118], [-0.068, -0.112], [-0.064, -0.09]], -0.014, 0.014, MAT.BLACK, { tex: gripTex });
    b.push(); b.translate(0, -0.113, -0.047); b.pitch(-0.3);
    b.cbox(-0.015, -0.007, -0.024, 0.015, 0.005, 0.024, 0.003, MAT.BRASS);
    b.pop();
    b.push(); b.translate(0, -0.126, -0.052); b.yaw(Math.PI / 2); b.cyl(0, 0, -0.002, 0.002, 0.008, 0.008, 8, MAT.BRASS); b.pop();
    b.ext([[0.0, 0.0], [0.046, 0.0], [0.046, -0.008], [0.036, -0.034], [0.01, -0.038], [0.002, -0.03], [0.03, -0.028], [0.038, -0.008], [0.0, -0.008]], -0.004, 0.004, MAT.IRON);

    // hammer: cocked back at rest, forward when fired
    b.push();
    b.translate(0, 0.022, -0.032);
    b.pitch(-0.85 + 0.85 * pose.action);
    b.cbox(-0.005, 0.0, -0.009, 0.005, 0.042, 0.003, 0.002, MAT.IRON);
    b.cbox(-0.009, 0.035, -0.022, 0.009, 0.044, 0.003, 0.002, MAT.IRON); // chequered spur
    b.pop();

    // short wide barrel on its front hinge
    b.push();
    b.translate(0, 0.01, 0.045);
    b.pitch(-0.6 * open);
    b.translate(0, -0.01, -0.045);
    const cy = 0.044;
    b.cyl(0, cy, -0.028, 0.02, 0.023, 0.023, 12, MAT.BRASS, { tex: bandTex }); // breech
    b.cyl(0, cy, 0.02, 0.17, 0.02, 0.0195, 12, MAT.ORANGE);                     // the wide barrel
    b.cyl(0, cy, 0.09, 0.1, 0.022, 0.022, 12, MAT.BRASS);                       // barrel band
    b.cyl(0, cy, 0.158, 0.178, 0.024, 0.024, 12, MAT.BRASS);                    // muzzle ring
    b.cbox(-0.004, cy + 0.017, 0.01, 0.004, cy + 0.024, 0.16, 0.0015, MAT.BRASS); // top rib
    b.cbox(-0.003, cy + 0.022, 0.148, 0.003, cy + 0.032, 0.158, 0.001, MAT.BRASS); // front sight
    if (open > 0.25) {
      b.cyl(0, cy, -0.03, -0.028, 0.016, 0.016, 12, MAT.BLACK);                // the open bore
      if (r > 0.12 && r < 0.26) {                                             // spent shell drops out
        const u = (r - 0.12) / 0.14;
        b.push(); b.translate(0.015 * u, cy - 0.12 * u * u, -0.035 - 0.05 * u); b.pitch(-1.2 * u); shell(b, 0); b.pop();
      }
      if (r > 0.6 && r < 0.84) { b.push(); b.translate(0, cy, -0.028); shell(b, 0); b.pop(); } // fresh shell seated
    }
    b.anchor("muzzle", 0, cy, 0.178);
    b.pop();

    // right hand on the grip, finger on the trigger
    b.push();
    b.translate(0, 0, -0.004); b.pitch(-0.2);
    fist(b, 1, { trigger: true, w: 0.015 });
    b.pop();
    forearm(b, 0.012, -0.06, -0.06, [0.3, -0.5, -1], 0.03);

    // left hand: comes up from below with a fresh shell and pushes it into the breech
    if (r >= 0) {
      const inn = hump(r, 0.3, 0.78, 0.16), push = ramp(r, 0.48, 0.6);
      if (inn > 0 && r < 0.62) {
        b.push();
        b.translate(-0.01 + 0.01 * inn, -0.12 + 0.15 * inn, -0.1 + 0.03 * inn + 0.03 * push);
        b.pitch(-0.6);
        shell(b, 0);
        b.pop();
      }
      if (inn > 0) {
        b.push();
        b.translate(-0.04 + 0.02 * inn, -0.16 + 0.15 * inn, -0.11 + 0.03 * inn + 0.03 * push);
        b.roll(-0.6); b.pitch(0.4);
        fist(b, -1, { w: 0.012, fingers: 3 });
        forearm(b, -0.01, -0.05, -0.045, [-0.4, -1, -0.4], 0.03);
        b.pop();
      }
    }
  },
};

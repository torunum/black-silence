import type { Builder } from "../builder";
import { MAT } from "../palette";
import { cup, fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 2, COMBAT RIFLE — a long iron receiver with a carry handle and its
 * rear sight on top, a front sight tower out on the barrel, a vented black
 * handguard, a flash hider and a curved box magazine.
 *
 * Fire: the T-handle at the back of the receiver snaps back and home with
 * every round (the game ejects the casing on the shot). Reload (1.7 s): the rifle
 * cants to show its right side, the magazine drops out (the 18% click), the
 * left hand leaves the handguard, brings a fresh magazine up and seats it
 * (62%), then pulls the T-handle back and lets it fly.
 */

const ventTex = (_x: number, y: number, z: number): number =>
  (Math.floor(z * 110) & 1) && y > -0.012 && y < 0.006 ? -2 : 0; // cooling slots
const magTex = (_x: number, y: number): number =>
  (Math.floor(y * 120) & 1) ? -0.5 : 0; // ribbed magazine

/** Curved box magazine hanging from (0,0,0), front edge forward. */
function magazine(b: Builder): void {
  b.ext([[-0.024, 0.0], [0.02, 0.0], [0.03, -0.06], [0.046, -0.12], [0.004, -0.128], [-0.012, -0.066]], -0.011, 0.011, MAT.BLUED, { tex: magTex });
  b.ext([[0.0, -0.118], [0.05, -0.122], [0.052, -0.13], [0.0, -0.137]], -0.012, 0.012, MAT.IRON); // base plate
}

export const combatRifle: WeaponArt = {
  name: "COMBAT RIFLE",
  hold: { x: 0.13, y: -0.112, z: 0.32, pitch: -0.03, yaw: -0.2, roll: 0.06 },
  kick: { back: 0.025, lift: 0.08 },
  action: (p) => hump(p, 0.0, 0.9, 0.3),
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);
    b.roll(0.35 * tilt); b.pitch(0.1 * tilt); b.yaw(-0.06 * tilt);

    // receiver, carry handle, rear sight
    b.cbox(-0.02, 0.0, -0.09, 0.02, 0.05, 0.14, 0.006, MAT.IRON);
    b.cbox(-0.009, 0.05, -0.1, 0.009, 0.064, 0.09, 0.003, MAT.IRON);                 // handle rail
    b.box(-0.008, 0.042, -0.1, 0.008, 0.066, -0.07, MAT.IRON);                       // handle rear post
    b.box(-0.008, 0.042, 0.07, 0.008, 0.066, 0.09, MAT.IRON);                        // handle front post
    b.box(-0.006, 0.064, -0.098, 0.006, 0.076, -0.08, MAT.IRON);                     // aperture
    b.box(-0.002, 0.068, -0.1, 0.002, 0.073, -0.078, MAT.BLACK);
    b.box(0.02, 0.018, -0.03, 0.022, 0.036, 0.05, MAT.BLACK);                        // ejection port
    // T-shaped charging handle at the back of the receiver: rides back with the action, and with the reload's pull
    const ch = Math.max(pose.action, r < 0 ? 0 : hump(r, 0.78, 0.96, 0.05));
    b.cbox(-0.006, 0.046, -0.06 - 0.06 * ch, 0.006, 0.056, -0.02 - 0.06 * ch, 0.002, MAT.SILVER); // T-handle shaft
    b.cbox(-0.026, 0.044, -0.1 - 0.06 * ch, 0.026, 0.058, -0.086 - 0.06 * ch, 0.003, MAT.SILVER); // T-handle grip

    // pistol grip and guard (the stock runs down to the shoulder, out of frame)
    b.ext([[-0.03, 0.0], [0.004, 0.0], [-0.012, -0.1], [-0.042, -0.104], [-0.05, -0.02]], -0.016, 0.016, MAT.BLACK);
    b.ext([[0.0, 0.0], [0.07, 0.0], [0.07, -0.008], [0.056, -0.028], [0.014, -0.03], [0.006, -0.024], [0.05, -0.022], [0.062, -0.008], [0.0, -0.008]], -0.004, 0.004, MAT.IRON);

    // handguard, barrel, front sight tower, flash hider
    b.cyl(0, 0.028, 0.14, 0.4, 0.027, 0.025, 8, MAT.BLACK, { tex: ventTex, a0: 0 });
    b.cyl(0, 0.028, 0.14, 0.152, 0.03, 0.03, 8, MAT.IRON, { a0: 0 });
    b.cyl(0, 0.028, 0.4, 0.62, 0.009, 0.009, 8, MAT.BLUED);
    b.ext([[0.43, 0.03], [0.47, 0.03], [0.465, 0.085], [0.45, 0.085]], -0.006, 0.006, MAT.IRON);
    b.box(-0.0035, 0.085, 0.452, 0.0035, 0.1, 0.46, MAT.IRON);                        // front post
    b.cyl(0, 0.028, 0.6, 0.66, 0.013, 0.012, 6, MAT.IRON, { tex: (_x, _y, z) => ((z * 180) | 0) & 1 ? -1.4 : 0 });
    b.anchor("muzzle", 0, 0.028, 0.66);

    // magazine: out, swapped, in
    const drop = r < 0 ? 0 : ramp(r, 0.1, 0.22), seat = r < 0 ? 1 : ramp(r, 0.42, 0.6);
    const handAway = r < 0 ? 0 : hump(r, 0.14, 0.86, 0.12);
    if (r >= 0 && r < 0.3) {
      b.push(); b.translate(0, -0.2 * drop * drop, 0.1 - 0.02 * drop); b.pitch(-0.5 * drop); magazine(b); b.pop();
    }
    if (r >= 0.3 || r < 0) {
      if (r < 0 || r >= 0.6) { b.push(); b.translate(0, 0, 0.1); magazine(b); b.pop(); }
      else {
        b.push(); b.translate(-0.02 * (1 - seat), -0.14 * (1 - seat), 0.1 - 0.03 * (1 - seat)); b.roll(-0.3 * (1 - seat));
        magazine(b);
        b.translate(0.0, -0.075, 0.01); b.pitch(1.3); b.roll(0.2);
        fist(b, -1, { w: 0.012, fingers: 3 });
        forearm(b, -0.01, -0.05, -0.045, [-0.6, -0.4, -1], 0.03);
        b.pop();
      }
    }
    // the left hand: on the handguard, or pulling the T-handle
    if (handAway < 0.05) { b.push(); b.translate(0, 0.028, 0.29); cup(b, 0.027, 0.027); b.pop(); }
    else if (r > 0.72) {
      b.push(); b.translate(-0.022, 0.051, -0.093 - 0.06 * ch); b.roll(-Math.PI / 2);
      fist(b, -1, { w: 0.007, fingers: 3 });
      forearm(b, -0.01, -0.05, -0.045, [-0.5, -0.5, -1], 0.03);
      b.pop();
    }

    // right hand on the grip
    b.push(); b.pitch(-0.3); fist(b, 1, { trigger: true, w: 0.016 }); b.pop();
    forearm(b, 0.012, -0.05, -0.06, [0.3, -0.42, -1], 0.031);
  },
};

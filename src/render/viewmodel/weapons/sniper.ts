import type { Builder } from "../builder";
import { MAT } from "../palette";
import { cup, fist, forearm } from "../hands";
import { hump, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 4, BMG SNIPER — a heavy bolt-action anti-materiel rifle: a long,
 * thick blued barrel ending in a big two-port muzzle brake, a scope on
 * rings along the top (its eyepiece glinting back at the viewer), a bolt
 * handle out to the right, a short box magazine and a folded bipod.
 *
 * Fire: a big kick, then the bolt cycles within the fire window — handle
 * up, back, forward, down (the game ejects the casing on reload, not here,
 * so the bolt only runs the action). Reload (2.4 s): the bolt opens and the
 * spent case flies (18%), the left hand swaps the magazine (62%), the bolt
 * closes and locks.
 */

const brakeTex = (_x: number, y: number, z: number): number =>
  Math.abs(y) < 0.009 && (Math.floor((z - 0.8) * 70) & 1) ? -3 : 0; // brake ports

function bolt(b: Builder, lift: number, back: number): void {
  b.push(); b.translate(0.0, 0.03, -0.05 - 0.06 * back);
  b.cyl(0, 0, -0.02, 0.05, 0.011, 0.011, 8, MAT.IRON);                       // bolt body in the raceway
  b.roll(-1.3 * lift);
  b.push(); b.translate(0, 0, -0.01); b.yaw(Math.PI / 2);
  b.cyl(0, 0, 0.0, 0.055, 0.005, 0.005, 6, MAT.SILVER);                         // handle
  b.pop();
  b.ball(0.058, 0, -0.01, 0.011, MAT.BLACK, 6);                                 // knob
  b.pop();
}

export const bmgSniper: WeaponArt = {
  name: "BMG SNIPER",
  hold: { x: 0.13, y: -0.125, z: 0.32, pitch: -0.03, yaw: -0.2, roll: 0.04 },
  kick: { back: 0.09, lift: 0.06 },
  action: (p) => p,
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.12);
    b.translate(0, -0.015 * tilt, 0); b.roll(0.3 * tilt); b.pitch(-0.05 * tilt);

    // bolt cycle: 0..0.2 nothing (kick), lift, back, forward, down
    const a = pose.action;
    let lift = hump(a, 0.25, 0.95, 0.12), back = hump(a, 0.37, 0.83, 0.2);
    if (r >= 0) { lift = hump(r, 0.08, 0.95, 0.06); back = hump(r, 0.12, 0.9, 0.08); }

    // receiver, grip, magazine (the stock is down at the shoulder, out of frame)
    b.cbox(-0.024, -0.005, -0.1, 0.024, 0.055, 0.16, 0.007, MAT.BLUED);
    b.box(0.022, 0.018, -0.09, 0.026, 0.04, 0.04, MAT.BLACK);                   // bolt raceway slot
    b.ext([[-0.03, 0.0], [0.004, 0.0], [-0.012, -0.1], [-0.044, -0.104], [-0.05, -0.02]], -0.017, 0.017, MAT.BLACK);
    b.ext([[0.0, 0.0], [0.06, 0.0], [0.06, -0.008], [0.046, -0.028], [0.012, -0.03], [0.006, -0.024], [0.042, -0.022], [0.052, -0.008], [0.0, -0.008]], -0.004, 0.004, MAT.IRON);
    const magOut = r < 0 ? 0 : hump(r, 0.26, 0.64, 0.1);
    b.push(); b.translate(-0.08 * magOut, -0.18 * magOut, 0.06);
    b.cbox(-0.02, -0.07, -0.04, 0.02, 0.0, 0.04, 0.004, MAT.IRON);
    if (magOut > 0.05) {
      b.translate(0, -0.02, 0.0); b.roll(-1.2);
      fist(b, -1, { w: 0.02, fingers: 3 });
      forearm(b, -0.01, -0.05, -0.045, [-0.5, -0.4, -1], 0.03);
    }
    b.pop();
    bolt(b, lift, back);
    if (r > 0.16 && r < 0.3) {                                                   // the spent .50 case flies
      const u = (r - 0.16) / 0.14;
      b.push(); b.translate(0.03 + 0.12 * u, 0.04 + 0.06 * u - 0.2 * u * u, -0.05); b.yaw(1.2 + 3 * u);
      b.cyl(0, 0, 0, 0.07, 0.009, 0.007, 6, MAT.BRASS); b.pop();
    }

    // heavy barrel, muzzle brake, folded bipod
    b.cyl(0, 0.026, 0.16, 0.8, 0.017, 0.015, 10, MAT.BLUED);
    b.cbox(-0.024, 0.004, 0.8, 0.024, 0.048, 0.9, 0.007, MAT.IRON, { tex: (x, y, z) => brakeTex(x, y - 0.026, z) });
    b.anchor("muzzle", 0, 0.026, 0.9);
    b.cbox(-0.022, -0.02, 0.16, 0.022, 0.012, 0.34, 0.006, MAT.BLACK);            // forend
    for (const s of [-1, 1]) b.cbox(s * 0.012 - 0.004, 0.0, 0.34, s * 0.012 + 0.004, 0.008, 0.6, 0.002, MAT.IRON); // bipod legs folded

    // scope on two rings, eyepiece towards the eye
    for (const z of [-0.02, 0.12]) b.cbox(-0.012, 0.05, z, 0.012, 0.078, z + 0.024, 0.003, MAT.IRON);
    b.cyl(0, 0.098, -0.1, -0.03, 0.022, 0.018, 12, MAT.BLACK);                    // eyepiece bell
    b.cyl(0, 0.098, -0.03, 0.18, 0.016, 0.016, 12, MAT.BLACK);                    // tube
    b.cyl(0, 0.098, 0.18, 0.28, 0.018, 0.026, 12, MAT.BLACK);                     // objective bell
    b.cyl(0, 0.098, -0.102, -0.098, 0.017, 0.017, 12, MAT.LENS);                  // eyepiece glass
    b.cyl(0.0, 0.122, 0.01, 0.04, 0.009, 0.009, 8, MAT.IRON);                     // elevation turret
    b.push(); b.translate(0.022, 0.098, 0.025); b.yaw(Math.PI / 2); b.cyl(0, 0, 0, 0.018, 0.009, 0.009, 8, MAT.IRON); b.pop();

    // left hand under the forend (or away on the magazine)
    if (magOut <= 0.05) { b.push(); b.translate(0, -0.004, 0.25); cup(b, 0.022, 0.016); b.pop(); }

    // right hand on the grip
    b.push(); b.pitch(-0.25); fist(b, 1, { trigger: true, w: 0.017 }); b.pop();
    forearm(b, 0.012, -0.05, -0.06, [0.3, -0.42, -1], 0.031);
  },
};

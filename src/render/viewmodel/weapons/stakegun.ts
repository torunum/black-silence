import type { Builder } from "../builder";
import { MAT } from "../palette";
import { cup, fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";
import { STAKE } from "../phases";

/**
 * Slot 9, STAKE GUN (owner, 2026-10-20: "sonra kazık eklensin") — a long body of dark oak bound with iron bands, an open iron
 * trough along its top with a sharpened ash stake lying in it, iron point forward; a riveted copper air tank slung under the
 * front, an iron ram at the back of the trough that drives the stake, and a pump lever down the left side. The muzzle is the
 * trough's iron collar.
 *
 * Fire: the ram slams forward and the stake whips out of the trough and is gone (it is in the world now,
 * `src/weapons/Stake.ts`); the ram is drawn back, the trough left empty. Reload (0.8 s): the gun rolls to show its left side, the
 * left hand brings a stake up from below and lays it in (seated at 50%, the knock of wood on iron), then pumps the lever back
 * and lets it home (the ratchet), and returns to the tank.
 */

const grainTex = (x: number, y: number, z: number): number => (Math.abs(Math.sin(z * 90 + y * 300 + x * 40)) < 0.1 ? -0.9 : 0);
const rivetTex = (x: number, y: number, z: number): number =>
  (Math.abs(z - 0.12) < 0.005 || Math.abs(z - 0.32) < 0.005) && (Math.floor((Math.atan2(y + 0.012, x) + 4) * 5) & 1) === 0 ? 1.3 : 0;

/** Where the stake lies: the trough's floor, its axis at this height. */
const AXIS_Y = 0.07;

/** A stake along +z from `z0`: the ash shaft, an iron ferrule at the butt, the iron point. */
function stake(b: Builder, z0: number): void {
  b.cyl(0, AXIS_Y, z0, z0 + 0.42, 0.0105, 0.012, 7, MAT.WOOD, { tex: grainTex });
  b.cyl(0, AXIS_Y, z0 - 0.004, z0 + 0.018, 0.0135, 0.0135, 7, MAT.IRON);
  b.cyl(0, AXIS_Y, z0 + 0.42, z0 + 0.5, 0.0115, 0.0008, 7, MAT.IRON);
}

export const stakeGun: WeaponArt = {
  name: "STAKE GUN",
  hold: { x: 0.022, y: -0.1185, z: 0.32, pitch: 0.15, yaw: 0, roll: 0 },  // a little right of centre, square to the screen, looking ahead, as the others
  present: { y: 0.07, pitch: 0.2, roll: -0.45 },   // the reload brought up into view, its left side turned to the eye (pose.ts)
  kick: { back: 0.06, lift: 0.1 },
  action: (p) => hump(p, ...STAKE.ram),
  draw(b: Builder, pose: Pose) {
    const r = pose.reload, a = pose.action;
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);
    b.translate(0, -0.01 * tilt, 0); b.roll(-0.3 * tilt); b.pitch(-0.05 * tilt);

    // the body: dark oak, iron bands; the trough's two iron walls along its top, out to the collar
    b.cbox(-0.026, 0.0, -0.06, 0.026, 0.052, 0.3, 0.008, MAT.WOOD, { tex: grainTex });
    for (const z of [-0.04, 0.06, 0.2, 0.29]) b.cbox(-0.028, -0.002, z, 0.028, 0.054, z + 0.016, 0.004, MAT.IRON);
    for (const x of [-1, 1]) b.cbox(x * 0.017 - 0.003, 0.05, -0.04, x * 0.017 + 0.003, 0.066, 0.56, 0.0015, MAT.IRON);   // low, so the stake shows over them
    b.cbox(-0.02, 0.046, 0.3, 0.02, 0.054, 0.56, 0.002, MAT.IRON);                        // the trough's floor out past the body
    b.cyl(0, AXIS_Y, 0.53, 0.58, 0.026, 0.024, 8, MAT.IRON, { a0: Math.PI / 8 });         // the collar
    b.cyl(0, AXIS_Y, 0.575, 0.582, 0.017, 0.017, 8, MAT.BLACK);
    b.anchor("muzzle", 0, AXIS_Y, 0.58);

    // the copper air tank under the front, its iron straps, the hose back into the body
    b.cyl(0, -0.012, 0.08, 0.36, 0.03, 0.03, 10, MAT.COPPER, { tex: rivetTex });
    b.cyl(0, -0.012, 0.36, 0.375, 0.022, 0.012, 10, MAT.COPPER);
    for (const z of [0.1, 0.3]) b.cbox(-0.034, -0.044, z, 0.034, 0.004, z + 0.012, 0.004, MAT.IRON);
    b.cyl(0.02, 0.0, 0.03, 0.09, 0.006, 0.006, 6, MAT.BLACK);

    // the ram at the back of the trough: slams forward on the shot, drawn back after
    const ram = Math.max(a, 0);
    b.cbox(-0.011, 0.054, -0.07 + 0.1 * ram, 0.011, 0.074, -0.05 + 0.1 * ram, 0.003, MAT.IRON);
    b.cyl(0, AXIS_Y - 0.006, -0.09, -0.07 + 0.1 * ram, 0.005, 0.005, 6, MAT.BLACK);

    // the pump lever down the left side, pivoted at the back band, its handle forward by the tank; swung down in the reload
    const pump = r < 0 ? 0 : hump(r, ...STAKE.pump);
    const lever = (): void => { b.translate(-0.031, 0.018, -0.03); b.pitch(0.6 * pump); };
    b.push(); lever();
    b.cbox(-0.005, -0.005, 0.0, 0.0, 0.005, 0.2, 0.002, MAT.IRON);
    b.cbox(-0.011, -0.01, 0.15, 0.002, 0.01, 0.22, 0.004, MAT.WOOD, { tex: grainTex });   // its handle
    b.pop();

    // the stake: in the trough when loaded; leaving with the ram; laid in by the left hand in the reload
    const lay = r < 0 ? 1 : ramp(r, ...STAKE.lay);
    if (r < 0) {
      if (!pose.empty) stake(b, -0.05);
      else if (a > 0 && a < 0.2) stake(b, -0.05 + 3 * a);   // the first instant of the shot: whipping out of the collar
    } else if (lay >= 1) stake(b, -0.05);
    else if (r > STAKE.lay[0] - 0.12) {
      const u = 1 - lay;
      b.push(); b.translate(-0.06 * u, -0.17 * u, -0.04 * u); b.roll(0.5 * u); b.pitch(0.25 * u);
      stake(b, -0.05);
      b.translate(0, AXIS_Y - 0.022, 0.2); b.pitch(1.25); b.roll(0.25);
      fist(b, -1, { w: 0.011, fingers: 3 });
      forearm(b, -0.01, -0.05, -0.045, [-0.6, -0.45, -1], 0.03);
      b.pop();
    }

    // the left hand: under the tank, or on the lever's handle
    if (r < 0 || r < STAKE.lay[0] - 0.12 || r > 0.97) { b.push(); b.translate(0, -0.012, 0.22); cup(b, 0.03, 0.03); b.pop(); }
    else if (r > STAKE.lay[1] + 0.02) {
      b.push(); lever(); b.translate(-0.014, 0, 0.185); b.roll(-Math.PI / 2);
      fist(b, -1, { w: 0.009, fingers: 4 });
      forearm(b, -0.01, -0.05, -0.045, [-0.5, -0.5, -1], 0.03);
      b.pop();
    }

    // the grip and guard, the right hand on them
    b.ext([[-0.03, 0.0], [0.004, 0.0], [-0.012, -0.1], [-0.042, -0.104], [-0.05, -0.02]], -0.016, 0.016, MAT.WOOD, { tex: grainTex });
    b.ext([[0.0, 0.0], [0.07, 0.0], [0.07, -0.008], [0.056, -0.028], [0.014, -0.03], [0.006, -0.024], [0.05, -0.022], [0.062, -0.008], [0.0, -0.008]], -0.004, 0.004, MAT.IRON);
    b.push(); b.pitch(-0.25); fist(b, 1, { trigger: true, w: 0.016 }); b.pop();
    forearm(b, 0.012, -0.05, -0.06, [0.3, -0.42, -1], 0.031);
  },
};

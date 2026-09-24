import type { Builder } from "../builder";
import { MAT } from "../palette";
import { fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 3, TOMMY GUN — a drum-fed submachine gun: a squat iron receiver with
 * the cocking knob on top, walnut pistol grip, stock and vertical foregrip,
 * a finned barrel ending in a slotted compensator, and the round drum
 * magazine hanging under the receiver, its face turned to the viewer.
 *
 * Fire: the cocking knob chatters back and forth in its slot with every
 * round while the gun shakes (recoil decays between the 65 ms shots, never
 * fully). Reload (1.5 s): the gun rolls to show its underside, the drum
 * slides out sideways and drops (18%), the left hand swings a full drum in
 * (62%), then racks the knob back.
 */

const woodTex = (x: number, y: number, z: number): number =>
  Math.sin(z * 150 + y * 60 + Math.sin(x * 120 + y * 50) * 2) > 0.7 ? -1 : 0;
const drumTex = (x: number, y: number): number => {
  const d = Math.hypot(x, y);
  return Math.abs(d - 0.034) < 0.003 || Math.abs(d - 0.056) < 0.0025 ? -1.2 : d < 0.009 ? 1 : 0;
};

/** The drum: a fat disc whose axis runs along local x, hung from its top edge at the origin. */
function drum(b: Builder): void {
  b.push(); b.translate(0, -0.068, 0.0); b.yaw(Math.PI / 2);
  b.cyl(0, 0, -0.026, 0.026, 0.07, 0.07, 16, MAT.BLUED, { tex: (x, y) => drumTex(y, x) });
  b.cyl(0, 0, -0.03, 0.03, 0.02, 0.02, 8, MAT.IRON);   // winding key hub
  b.pop();
}

export const tommyGun: WeaponArt = {
  name: "TOMMY GUN",
  hold: { x: 0.11, y: -0.135, z: 0.4, pitch: 0.02, yaw: -0.3, roll: 0.16 },
  kick: { back: 0.016, lift: 0.05 },
  action: (p) => hump(p, 0.0, 1.0, 0.45),
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);
    b.roll(0.3 * tilt); b.pitch(0.12 * tilt);

    // receiver with the knob slot, rear sight, stock
    b.cbox(-0.022, 0.0, -0.08, 0.022, 0.05, 0.13, 0.006, MAT.IRON);
    b.box(-0.004, 0.049, -0.06, 0.004, 0.051, 0.06, MAT.BLACK);
    const knob = Math.max(pose.action, r < 0 ? 0 : hump(r, 0.78, 0.97, 0.06));
    b.ball(0, 0.06, 0.05 - 0.08 * knob, 0.011, MAT.SILVER, 6);
    b.cbox(-0.009, 0.05, -0.075, 0.009, 0.068, -0.058, 0.003, MAT.IRON);                 // ladder sight
    b.ext([[-0.08, 0.04], [-0.08, -0.02], [-0.1, -0.06], [-0.12, 0.03]], -0.02, 0.02, MAT.WOOD, { tex: woodTex });

    // walnut pistol grip and guard
    b.ext([[-0.03, 0.0], [0.004, 0.0], [-0.01, -0.095], [-0.04, -0.1], [-0.05, -0.02]], -0.016, 0.016, MAT.WOOD, { tex: woodTex });
    b.ext([[0.0, 0.0], [0.06, 0.0], [0.06, -0.008], [0.046, -0.028], [0.012, -0.03], [0.006, -0.024], [0.042, -0.022], [0.052, -0.008], [0.0, -0.008]], -0.004, 0.004, MAT.IRON);

    // finned barrel, compensator
    for (let i = 0; i < 9; i++) b.cyl(0, 0.028, 0.14 + i * 0.022, 0.152 + i * 0.022, 0.021, 0.021, 10, MAT.IRON);
    b.cyl(0, 0.028, 0.13, 0.35, 0.014, 0.014, 10, MAT.BLUED);
    b.cbox(-0.016, 0.012, 0.35, 0.016, 0.044, 0.41, 0.004, MAT.IRON, { tex: (_x, y, z) => (y > 0.03 && (Math.floor(z * 150) & 1) ? -2 : 0) });
    b.box(-0.003, 0.044, 0.39, 0.003, 0.054, 0.4, MAT.IRON);
    b.anchor("muzzle", 0, 0.028, 0.41);

    // vertical foregrip with the left hand on it
    const handAway = r < 0 ? 0 : hump(r, 0.12, 0.86, 0.1);
    b.push(); b.translate(0, 0.0, 0.25);
    b.ext([[-0.018, 0.012], [0.018, 0.012], [0.02, -0.06], [0.012, -0.09], [-0.014, -0.09], [-0.02, -0.06]], -0.017, 0.017, MAT.WOOD, { tex: woodTex });
    b.cbox(-0.02, 0.0, -0.03, 0.02, 0.014, 0.03, 0.004, MAT.IRON);
    if (handAway < 0.05) {
      b.translate(0, -0.012, 0); b.pitch(-0.1);
      fist(b, -1, { w: 0.017 });
      forearm(b, -0.012, -0.06, -0.03, [-0.35, -0.9, -0.55], 0.03);
    }
    b.pop();

    // the drum: in, out and dropping, the fresh one swung in by hand
    const out = r < 0 ? 0 : ramp(r, 0.08, 0.24), seat = r < 0 ? 1 : ramp(r, 0.4, 0.6);
    if (r < 0 || r >= 0.6) { b.push(); b.translate(0, 0.0, 0.1); drum(b); b.pop(); }
    else if (r < 0.32) { b.push(); b.translate(-0.12 * out, -0.25 * out * out, 0.1); b.roll(-0.6 * out); drum(b); b.pop(); }
    else {
      b.push(); b.translate(-0.13 * (1 - seat), -0.08 * (1 - seat), 0.1); b.roll(-0.5 * (1 - seat));
      drum(b);
      b.translate(-0.05, -0.07, -0.01); b.roll(-1.3);
      fist(b, -1, { w: 0.012, fingers: 3 });
      forearm(b, -0.01, -0.05, -0.045, [-0.6, -0.3, -1], 0.03);
      b.pop();
    }
    if (handAway >= 0.05 && r > 0.74) {                  // left hand racks the knob
      b.push(); b.translate(-0.02, 0.07, 0.03 - 0.08 * knob); b.roll(-1.6); b.pitch(0.4);
      fist(b, -1, { w: 0.008, fingers: 4 });
      forearm(b, -0.01, -0.05, -0.045, [-0.7, -0.5, -1], 0.03);
      b.pop();
    }

    // right hand on the grip
    b.push(); b.pitch(-0.25); fist(b, 1, { trigger: true, w: 0.016 }); b.pop();
    forearm(b, 0.012, -0.05, -0.06, [0.3, -0.42, -1], 0.031);
  },
};

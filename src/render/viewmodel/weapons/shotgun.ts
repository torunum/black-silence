import type { Builder } from "../builder";
import { MAT } from "../palette";
import { cup, fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 1, SAWED-OFF SHOTGUN — two blued barrels side by side, cut short,
 * on an iron action with silver side plates and twin outside hammers; a
 * wooden pistol grip where the stock was sawn off; a wooden slide forend
 * under the barrels (the stats say `pump: true`, and the game plays a pump
 * clack and ejects a hull 300 ms after every shot).
 *
 * Fire: both hammers drop, a heavy kick, then the left hand racks the
 * forend back and forward — timed so the stroke's back end lands on the
 * game's 300 ms hull ejection. Reload: the barrels break open downward on
 * the hinge, two spent hulls jump out (18%), the left hand leaves the
 * forend, brings two red shells up and drops them into the chambers (62%),
 * returns, and the barrels snap shut.
 */

const woodTex = (x: number, y: number, z: number): number =>
  Math.sin(z * 170 + Math.sin(y * 90 + x * 40) * 2.2) > 0.72 ? -1 : 0;
const plateTex = (_x: number, y: number, z: number): number =>
  Math.abs(Math.sin(z * 260) * 0.006 - (y - 0.03)) < 0.0022 ? -1.3 : 0; // engraved scroll

function hull(b: Builder, x: number, y: number, z: number): void {
  b.cyl(x, y, z + 0.01, z + 0.07, 0.0105, 0.0105, 8, MAT.RED);
  b.cyl(x, y, z, z + 0.014, 0.012, 0.012, 8, MAT.BRASS);
}

export const sawedOff: WeaponArt = {
  name: "SAWED-OFF SHOTGUN",
  hold: { x: 0.08, y: -0.132, z: 0.29, pitch: 0.12, yaw: -0.2, roll: 0.14 },
  kick: { back: 0.08, lift: 0.08 },
  // p runs over the 0.35 s fire window; the pump's back end sits at p≈0.86 (0.30 s)
  action: (p) => hump(p, 0.45, 1.0, 0.38),
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    b.pitch(-0.06 * pose.action); // the gun dips as the pump is racked
    const open = r < 0 ? 0 : hump(r, 0.08, 0.86, 0.1);
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);
    b.translate(0, -0.02 * tilt, 0); b.roll(-0.2 * tilt); b.pitch(-0.1 * tilt); b.yaw(0.12 * tilt);

    // action body, side plates, hammers
    b.cbox(-0.026, 0.008, -0.07, 0.026, 0.048, 0.045, 0.006, MAT.IRON);
    b.box(0.0255, 0.014, -0.06, 0.029, 0.044, 0.03, MAT.SILVER, { tex: plateTex });
    b.box(-0.029, 0.014, -0.06, -0.0255, 0.044, 0.03, MAT.SILVER, { tex: plateTex });
    const fall = pose.action > 0 || pose.recoil > 0.6 ? 1 : 0;
    for (const hx of [-0.014, 0.014]) {
      b.push(); b.translate(hx, 0.04, -0.056); b.pitch(-0.7 + 0.6 * fall);
      b.cbox(-0.004, 0.0, -0.008, 0.004, 0.034, 0.004, 0.0015, MAT.IRON);
      b.cbox(-0.006, 0.028, -0.022, 0.006, 0.036, 0.004, 0.0015, MAT.IRON);
      b.pop();
    }
    // sawn-off wooden grip and guard
    b.ext([[-0.07, 0.03], [-0.004, 0.01], [-0.016, -0.1], [-0.032, -0.114], [-0.075, -0.1], [-0.086, -0.02]], -0.019, 0.019, MAT.WOOD, { tex: woodTex });
    b.ext([[0.0, 0.008], [0.06, 0.008], [0.06, 0.0], [0.046, -0.03], [0.014, -0.034], [0.004, -0.026], [0.04, -0.024], [0.05, 0.0], [0.0, 0.0]], -0.004, 0.004, MAT.IRON);

    // barrels on the hinge
    b.push();
    b.translate(0, 0.012, 0.045);
    b.pitch(-0.9 * open);
    b.translate(0, -0.012, -0.045);
    const by = 0.058;
    b.cbox(-0.032, 0.03, -0.055, 0.032, 0.062, 0.05, 0.007, MAT.BLUED);            // breech lump
    for (const bx of [-0.0165, 0.0165]) {
      b.cyl(bx, by, 0.04, 0.39, 0.016, 0.016, 10, MAT.BLUED);
      b.cyl(bx, by, 0.37, 0.392, 0.017, 0.017, 10, MAT.IRON);                      // sawn muzzle, filed bright
    }
    b.cbox(-0.003, by + 0.004, 0.05, 0.003, by + 0.009, 0.37, 0.001, MAT.BLACK);    // dark valley between the tubes
    b.ball(0, by + 0.012, 0.375, 0.0045, MAT.BRASS, 5);                               // bead
    if (open > 0.3) {
      for (const bx of [-0.0165, 0.0165]) b.cyl(bx, by, -0.057, -0.055, 0.011, 0.011, 10, MAT.BLACK);
      if (r > 0.14 && r < 0.3) {                                                    // spent hulls jumping clear
        const u = (r - 0.14) / 0.16;
        for (const bx of [-0.0165, 0.0165]) {
          b.push(); b.translate(bx + Math.sign(bx) * 0.05 * u, by + 0.09 * u - 0.12 * u * u, -0.07 + 0.03 * u); b.pitch(-1.2 * u); hull(b, 0, 0, 0); b.pop();
        }
      }
      if (r > 0.6) for (const bx of [-0.0165, 0.0165]) hull(b, bx, by, -0.058);    // fresh shells seated
    }
    b.anchor("muzzle", 0, by, 0.392);
    b.pop();

    // slide forend under the barrels, with the left hand on it
    const handOff = r < 0 ? 0 : hump(r, 0.22, 0.8, 0.14);
    const slide = -0.1 * pose.action;
    b.push();
    b.translate(0, 0.04, 0.2 + slide);
    // wider than the pair of barrels, so from above its wooden flanks show either side of them as it racks
    b.cbox(-0.04, -0.02, -0.07, 0.04, 0.012, 0.07, 0.01, MAT.WOOD, { tex: woodTex });
    if (handOff < 0.05) cup(b, 0.04, 0.02);
    b.pop();

    // left hand away from the forend: fetches two shells and drops them in
    if (handOff >= 0.05) {
      const load = ramp(r, 0.42, 0.6);
      b.push();
      b.translate(-0.07 + 0.05 * handOff, -0.16 + 0.19 * handOff - 0.02 * load, -0.02 - 0.05 * handOff);
      b.roll(-0.5); b.pitch(0.5);
      if (r < 0.6) { hull(b, 0.0, 0.03, -0.01); hull(b, 0.026, 0.03, -0.01); }
      fist(b, -1, { w: 0.014, fingers: 3 });
      forearm(b, -0.01, -0.05, -0.045, [-0.55, -0.5, -1], 0.03);
      b.pop();
    }

    // right hand on the grip
    b.push();
    b.pitch(-0.3);
    fist(b, 1, { trigger: true, w: 0.019 });
    b.pop();
    forearm(b, 0.012, -0.05, -0.06, [0.3, -0.42, -1], 0.031);
  },
};

import type { Builder } from "../builder";
import { MAT } from "../palette";
import { cup, fist, forearm } from "../hands";
import { hump, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 7, SOUL REAPER — an arcane device: a blackened iron spine wrapped
 * in bone ribs, a slowly turning silver ring of runes round its middle,
 * and at the front three hooked bone claws caging a glowing green soul
 * core. A glass vial of green soul-light sits in a cradle on top.
 *
 * Fire: the claws spring open, the core flares and is spent, the claws
 * close as it re-forms. Reload (2.6 s): the core gutters out to a dead
 * husk, the left hand pulls the spent vial (18%) and seats a glowing one
 * (62%), and the core swells back to full.
 */

const ribTex = (_x: number, y: number, z: number): number =>
  (Math.floor(z * 90) & 1) && y > 0.0 ? -1 : 0;
const runeTex = (x: number, y: number): number =>
  (Math.floor((Math.atan2(y, x) + 4) * 5) % 3) === 0 ? 2 : 0;

function vial(b: Builder, full: boolean): void {
  b.cyl(0, 0, 0.0, 0.07, 0.014, 0.014, 8, full ? MAT.SOUL : MAT.DEADSOUL);
  b.cyl(0, 0, -0.008, 0.004, 0.017, 0.017, 8, MAT.SILVER);
  b.cyl(0, 0, 0.066, 0.078, 0.017, 0.017, 8, MAT.SILVER);
}

export const soulReaper: WeaponArt = {
  name: "SOUL REAPER",
  hold: { x: 0.11, y: -0.135, z: 0.4, pitch: 0.02, yaw: -0.26, roll: 0.03 },
  kick: { back: 0.06, lift: 0.24 },
  action: (p) => p,
  spinRate: 5,
  idleSpin: 0.7,
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);
    b.translate(0, 0.03 * tilt, 0); b.roll(-0.3 * tilt); b.pitch(0.12 * tilt);

    b.translate(0, 0, 0.06);
    // spine and ribs
    b.cyl(0, 0.04, -0.08, 0.16, 0.026, 0.02, 7, MAT.BLACK, { tex: ribTex });
    for (let i = 0; i < 5; i++) {
      const z = -0.02 + i * 0.038;
      b.push(); b.translate(0, 0.04, z); b.roll(Math.PI / 2);
      b.cyl(0, 0, 0, 0.012, 0.04 - i * 0.003, 0.04 - i * 0.003, 9, MAT.BONE, { a0: 0.2 });
      b.pop();
    }
    // rune ring, turning
    b.push(); b.translate(0, 0.04, 0.02); b.roll(pose.spin);
    b.cyl(0, 0, 0.0, 0.016, 0.052, 0.052, 10, MAT.SILVER, { tex: runeTex });
    b.pop();

    // the core and the claws round it
    const a = pose.action;
    const openA = r >= 0 ? 0.15 * hump(r, 0.1, 0.9, 0.1) : 0.5 * hump(a, 0.0, 0.7, 0.12);
    const spent = r >= 0 ? hump(r, 0.08, 0.9, 0.12) : hump(a, 0.12, 1.0, 0.4);
    const coreR = 0.036 * (1 - 0.65 * spent) * (1 + 0.25 * pose.heat);
    b.ball(0, 0.04, 0.25, coreR, spent > 0.7 && r >= 0 ? MAT.DEADSOUL : MAT.SOUL, 8);
    b.anchor("muzzle", 0, 0.04, 0.25);
    b.anchor("glow", 0, 0.04, 0.25);
    for (let i = 0; i < 3; i++) {
      b.push(); b.translate(0, 0.04, 0.16); b.roll(i * 2 * Math.PI / 3 + Math.PI / 2);
      b.translate(0, 0.036, 0); b.pitch(-0.3 - openA);
      b.cbox(-0.007, -0.006, 0.0, 0.007, 0.006, 0.07, 0.003, MAT.BONE);
      b.translate(0, 0.0, 0.066); b.pitch(0.8 + openA * 0.6);
      b.cbox(-0.006, -0.005, 0.0, 0.006, 0.005, 0.06, 0.002, MAT.BONE);
      b.translate(0, 0.0, 0.056); b.pitch(0.7);
      b.cyl(0, 0, 0.0, 0.03, 0.006, 0.0005, 4, MAT.BONE);
      b.pop();
    }

    // vial cradle and vial
    b.cbox(-0.02, 0.066, -0.1, 0.02, 0.074, 0.0, 0.003, MAT.SILVER);
    const pull = r < 0 ? 0 : hump(r, 0.12, 0.64, 0.1);
    const full = r < 0 || r > 0.4;
    b.push(); b.translate(-0.1 * pull, 0.088 + 0.07 * pull, -0.09 + 0.05 * pull); b.roll(-0.6 * pull);
    vial(b, full);
    if (pull > 0.05) {
      b.translate(0.0, -0.02, 0.03); b.roll(-1.2);
      fist(b, -1, { w: 0.014, fingers: 3 });
      forearm(b, -0.01, -0.05, -0.045, [-0.45, -0.85, -0.5], 0.03);
    }
    b.pop();

    // bone grip; left hand steadies the spine
    b.ext([[-0.03, 0.02], [0.004, 0.02], [-0.012, -0.1], [-0.042, -0.104], [-0.05, -0.02]], -0.016, 0.016, MAT.BONE);
    if (pull <= 0.05) {
      b.push(); b.translate(0, 0.04, 0.1); cup(b, 0.026, 0.028); b.pop();
    }
    b.push(); b.pitch(-0.25); fist(b, 1, { w: 0.016 }); b.pop();
    forearm(b, 0.012, -0.05, -0.06, [0.3, -0.42, -1], 0.031);
  },
};

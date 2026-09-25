import type { Builder } from "../builder";
import { MAT } from "../palette";
import { cup, fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 7, SOUL REAPER — an arcane device: a blackened iron body with a
 * crest of bone spines along its back and bone ribs round it, a turning
 * silver ring of runes, and at the front three long hooked bone claws
 * caging a glowing green soul core (./draw.ts spills its light past the
 * cage).
 *
 * Fire: the claws spring open, the core flares and is spent, the claws
 * close as it re-forms. Reload (2.6 s): the core gutters out to a dead grey
 * husk, the left hand plucks it out of the cage (18%), brings a fresh
 * glowing soul up and presses it in (62%), and the claws close on it.
 */

const ribTex = (_x: number, y: number, z: number): number =>
  (Math.floor(z * 90) & 1) && y > 0.03 ? -1 : 0;
const runeTex = (x: number, y: number): number =>
  (Math.floor((Math.atan2(y, x) + 4) * 5) % 3) === 0 ? 2 : 0;

const CORE_Y = 0.04, CORE_Z = 0.32, CORE_R = 0.058;

export const soulReaper: WeaponArt = {
  name: "SOUL REAPER",
  hold: { x: 0.11, y: -0.1, z: 0.3, pitch: -0.01, yaw: -0.38, roll: 0.05 },
  kick: { back: 0.07, lift: 0.06 },
  action: (p) => p,
  spinRate: 5,
  idleSpin: 0.7,
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);
    b.translate(0, -0.015 * tilt, 0); b.roll(-0.3 * tilt); b.pitch(-0.06 * tilt);

    // blackened iron body, a crest of bone spines along its back, bone ribs round it
    b.cbox(-0.017, 0.02, 0.0, 0.017, 0.06, 0.2, 0.008, MAT.BLACK, { tex: ribTex });
    for (let i = 0; i < 4; i++) {
      b.push(); b.translate(0, 0.058, 0.04 + i * 0.045); b.pitch(Math.PI / 2 - 0.7);
      b.cyl(0, 0, 0, 0.05 - i * 0.006, 0.009, 0.0008, 4, MAT.BONE, { a0: Math.PI / 4 });
      b.pop();
    }
    for (let i = 0; i < 3; i++) {
      b.push(); b.translate(0, 0.04, 0.05 + i * 0.05); b.roll(Math.PI / 2);
      b.cyl(0, 0, 0, 0.014, 0.034, 0.034, 9, MAT.BONE, { a0: 0.2 });
      b.pop();
    }
    // rune ring, turning
    b.push(); b.translate(0, 0.04, 0.06); b.roll(pose.spin);
    b.cyl(0, 0, 0.0, 0.016, 0.042, 0.042, 10, MAT.SILVER, { tex: runeTex });
    b.pop();

    // the claws: spring open to fire, and open wide for the reload
    const a = pose.action;
    const openA = r >= 0 ? 0.5 * hump(r, 0.1, 0.72, 0.1) : 0.55 * hump(a, 0.0, 0.7, 0.12);
    for (let i = 0; i < 3; i++) {
      b.push(); b.translate(0, CORE_Y, 0.2); b.roll(i * 2 * Math.PI / 3 + Math.PI / 2);
      b.translate(0, 0.036, 0); b.pitch(-0.5 - openA);
      b.cbox(-0.012, -0.009, 0.0, 0.012, 0.009, 0.1, 0.004, MAT.BONE);
      b.translate(0, 0.0, 0.096); b.pitch(0.95 + openA * 0.6);
      b.cbox(-0.01, -0.008, 0.0, 0.01, 0.008, 0.09, 0.003, MAT.BONE);
      b.translate(0, 0.0, 0.086); b.pitch(0.8);
      b.cyl(0, 0, 0.0, 0.05, 0.009, 0.0005, 4, MAT.BONE);
      b.pop();
    }

    // the soul core: spent and re-forming when fired; plucked out dead and pressed in fresh on reload
    b.anchor("muzzle", 0, CORE_Y, CORE_Z);
    if (r < 0) {
      const spent = hump(a, 0.12, 1.0, 0.4);
      b.ball(0, CORE_Y, CORE_Z, CORE_R * (1 - 0.6 * spent) * (1 + 0.2 * pose.heat), MAT.SOUL, 10);
      b.anchor("glow", 0, CORE_Y, CORE_Z);
    } else {
      const dying = ramp(r, 0.02, 0.14);
      const out = ramp(r, 0.16, 0.34), inn = ramp(r, 0.4, 0.62);
      // where the hand is: at the cage, away down-left, or coming back
      const away = r < 0.4 ? out : 1 - inn;
      const hx = -0.1 * away, hy = CORE_Y - 0.1 * away, hz = CORE_Z - 0.08 * away;
      const inHand = r > 0.16 && r < 0.62;
      const fresh = r >= 0.38;
      if (!inHand) {
        if (fresh) { b.ball(0, CORE_Y, CORE_Z, CORE_R, MAT.SOUL, 10); b.anchor("glow", 0, CORE_Y, CORE_Z); }
        else b.ball(0, CORE_Y, CORE_Z, CORE_R * (1 - 0.35 * dying), dying > 0.5 ? MAT.DEADSOUL : MAT.SOUL, 10);
      }
      if (r > 0.12 && r < 0.7) {
        b.push(); b.translate(hx, hy, hz);
        if (inHand) {
          if (fresh) { b.ball(0, 0, 0, CORE_R, MAT.SOUL, 10); b.anchor("glow", 0, 0, 0); }
          else b.ball(0, 0, 0, CORE_R * 0.6, MAT.DEADSOUL, 10);
        }
        b.translate(0.0, -0.035, -0.03); b.roll(-0.5); b.pitch(0.9);
        fist(b, -1, { w: 0.018, fingers: 3 });
        forearm(b, -0.01, -0.05, -0.045, [-0.3, -1, -0.2], 0.03);
        b.pop();
      }
    }

    // bone grip; left hand steadies the body
    b.ext([[-0.03, 0.02], [0.004, 0.02], [-0.012, -0.1], [-0.042, -0.104], [-0.05, -0.02]], -0.016, 0.016, MAT.BONE);
    if (r < 0.12 || r >= 0.7) { b.push(); b.translate(0, CORE_Y, 0.12); cup(b, 0.026, 0.028); b.pop(); }
    b.push(); b.pitch(-0.25); fist(b, 1, { w: 0.016 }); b.pop();
    forearm(b, 0.012, -0.05, -0.06, [0.3, -0.42, -1], 0.031);
  },
};

import type { Builder } from "../builder";
import { MAT } from "../palette";
import { cup, fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 5, HOLY CROSS LAUNCHER — a reliquary made into a weapon: an ivory
 * housing with a pointed-arch roof like a chapel's, gilded bands and four
 * gilt pinnacles, a red rose window facing the bearer, and a gold cross
 * bolt lying head-forward along the ridge, ready to fly.
 *
 * Fire: the cross shoots forward off the ridge and is gone; the next one
 * rises out of the roof slot. Reload (2.2 s): the launcher turns up, its
 * roof hinges open along one side, the left hand lays new crosses in (the
 * 62% click) and the roof closes.
 */

const ivoryTex = (x: number, y: number, z: number): number =>
  Math.abs(Math.sin(z * 95) * 0.004 + Math.sin(x * 400) * 0.002 - (y - 0.03)) < 0.0018 ? -1.2 : 0; // carved vine

/** Pointed-arch cross-section, (x,y), as seen from behind. */
const ARCH: Array<[number, number]> = [[-0.032, 0.0], [0.032, 0.0], [0.032, 0.042], [0.022, 0.066], [0.0, 0.086], [-0.022, 0.066], [-0.032, 0.042]];
const ROOF_SPLIT = 0.042;

/** The cross bolt: a shaft along +z riding the roof ridge, ending in an upright cross standing over the mouth. */
export function crossBolt(b: Builder): void {
  b.cbox(-0.004, -0.004, -0.14, 0.004, 0.004, 0.12, 0.0015, MAT.GOLD);
  b.cbox(-0.006, -0.012, 0.11, 0.006, 0.09, 0.122, 0.002, MAT.GOLD);           // upright
  b.cbox(-0.036, 0.046, 0.11, 0.036, 0.058, 0.122, 0.002, MAT.GOLD);           // crossbar
  b.ball(0, 0.052, 0.108, 0.008, MAT.RED, 6);                                  // a garnet at the crossing
}

function pinnacle(b: Builder, x: number, y: number, z: number): void {
  b.push(); b.translate(x, y, z); b.pitch(Math.PI / 2);
  b.cyl(0, 0, 0, 0.04, 0.007, 0.0005, 4, MAT.GOLD, { a0: Math.PI / 4 });
  b.pop();
}

export const crossLauncher: WeaponArt = {
  name: "HOLY CROSS LAUNCHER",
  hold: { x: 0.125, y: -0.112, z: 0.33, pitch: -0.03, yaw: -0.2, roll: 0.04 },
  kick: { back: 0.05, lift: 0.2 },
  action: (p) => p,
  draw(b: Builder, pose: Pose) {
    const r = pose.reload;
    const tilt = r < 0 ? 0 : hump(r, 0.0, 0.98, 0.14);
    b.translate(0, 0.03 * tilt, 0); b.roll(-0.35 * tilt); b.pitch(0.14 * tilt);
    const lid = r < 0 ? 0 : hump(r, 0.1, 0.86, 0.12);

    // housing: walls, then the roof (hinged on its left eave for the reload)
    b.push(); b.translate(0, 0.0, 0.0);
    b.prz(ARCH.filter(([, y]) => y <= ROOF_SPLIT), -0.06, 0.22, MAT.BONE, { tex: ivoryTex });
    b.push(); b.translate(-0.032, ROOF_SPLIT, 0); b.roll(-1.4 * lid); b.translate(0.032, -ROOF_SPLIT, 0);
    b.prz(ARCH.filter(([, y]) => y >= ROOF_SPLIT), -0.06, 0.22, MAT.BONE);
    for (const z of [-0.06, 0.07, 0.2]) b.prz(ARCH.filter(([, y]) => y >= ROOF_SPLIT).map(([x, y]) => [x * 1.12, (y - ROOF_SPLIT) * 1.12 + ROOF_SPLIT]), z, z + 0.018, MAT.GOLD);
    b.pop();
    for (const z of [-0.06, 0.07, 0.2]) b.prz([[-0.035, -0.004], [0.035, -0.004], [0.035, ROOF_SPLIT], [-0.035, ROOF_SPLIT]], z, z + 0.018, MAT.GOLD);
    b.cyl(0, 0.04, -0.064, -0.06, 0.022, 0.022, 10, MAT.GOLD);                    // rose window frame
    b.cyl(0, 0.04, -0.066, -0.063, 0.016, 0.016, 10, MAT.RED);                    // its red glass
    for (const [x, z] of [[-0.034, -0.06], [0.034, -0.06], [-0.034, 0.2], [0.034, 0.2]]) pinnacle(b, x, ROOF_SPLIT, z);
    b.cbox(-0.02, 0.004, 0.22, 0.02, 0.05, 0.25, 0.006, MAT.GOLD);                 // the mouth
    b.cbox(-0.012, 0.012, 0.25, 0.012, 0.042, 0.252, 0.004, MAT.BLACK);
    b.pop();

    // the cross bolt: flies, then the next rises from the roof slot
    const a = r >= 0 ? 1 : pose.action;
    const loaded = r >= 0 ? ramp(r, 0.5, 0.62) : 1;
    if (r >= 0) {
      // the cross still riding the ridge as the reload starts, and the new one laid in and settled as it ends
      if (r < 0.1 || loaded > 0) { b.push(); b.translate(0, 0.09 - 0.02 * Math.min(1, lid * 2), 0.12); crossBolt(b); b.pop(); }
      if (r < 0.62 && r > 0.26) {                                                  // carried in by the left hand
        const inn = hump(r, 0.26, 0.64, 0.12);
        b.push(); b.translate(-0.1 + 0.08 * inn, -0.1 + 0.18 * inn, -0.02); b.roll(-0.4);
        crossBolt(b);
        b.translate(0, -0.012, -0.02); b.pitch(1.2);
        fist(b, -1, { w: 0.006, fingers: 3 });
        forearm(b, -0.01, -0.05, -0.045, [-0.6, -0.4, -1], 0.03);
        b.pop();
      }
    } else if (a < 0.2) {
      b.push(); b.translate(0, 0.09, 0.12 + 2.5 * a * a); crossBolt(b); b.pop();
    } else if (a > 0.5) {
      const up = ramp(a, 0.5, 0.95);
      b.push(); b.translate(0, 0.02 + 0.07 * up, 0.12); crossBolt(b); b.pop();
    }
    b.anchor("muzzle", 0, 0.03, 0.26);

    // wooden grip, guard; left hand cradles the front
    b.ext([[-0.03, 0.0], [0.004, 0.0], [-0.012, -0.1], [-0.042, -0.104], [-0.05, -0.02]], -0.016, 0.016, MAT.WOOD);
    b.ext([[0.0, 0.0], [0.06, 0.0], [0.06, -0.008], [0.046, -0.028], [0.012, -0.03], [0.006, -0.024], [0.042, -0.022], [0.052, -0.008], [0.0, -0.008]], -0.004, 0.004, MAT.GOLD);
    if (r < 0.2 || r > 0.7) { b.push(); b.translate(0, 0.02, 0.13); cup(b, 0.032, 0.02); b.pop(); }

    // right hand on the grip
    b.push(); b.pitch(-0.25); fist(b, 1, { trigger: true, w: 0.016 }); b.pop();
    forearm(b, 0.012, -0.05, -0.06, [0.3, -0.42, -1], 0.031);
  },
};

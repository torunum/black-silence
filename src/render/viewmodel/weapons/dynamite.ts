import type { Builder } from "../builder";
import { MAT } from "../palette";
import { fist, forearm } from "../hands";
import { hump, ramp, type Pose, type WeaponArt } from "../pose";

/**
 * Slot 8, DYNAMITE (owner, 2026-10-20) — three red sticks in brown paper, bound with black tape, a fuse curling off the top
 * with a spark on its end, held up in the right hand; the left hand low and to the left holds a brass lighter with its flame
 * up, as Blood's Caleb holds his. Seen like the others: a little right of centre, square to the screen.
 *
 * Fire (the throw, over the 0.35 s fire window): the hand draws back and down, then swings up and forward and opens — the bundle
 * leaves it at about 45% and is gone from the hand (it is in the world now, `src/weapons/Dynamite.ts`). Reload (the next one,
 * 0.75 s): a fresh bundle comes up from below into the hand, the lighter swings across to the fuse and lights it at 60%, and
 * goes back.
 */

const paperTex = (_x: number, y: number): number => (Math.abs(Math.sin(y * 260)) < 0.12 ? -0.8 : 0);   // the paper's wrap lines

function sticks(b: Builder, lit: boolean, spark: number): void {
  for (const [x, z] of [[-0.016, 0], [0.016, 0], [0, 0.026]] as const) {
    b.push(); b.translate(x, 0, z); b.pitch(-Math.PI / 2);
    b.cyl(0, 0, -0.07, 0.07, 0.0145, 0.0145, 10, MAT.RED, { tex: paperTex });
    b.cyl(0, 0, 0.068, 0.072, 0.012, 0.012, 10, MAT.BONE);   // the paper's folded end
    b.pop();
  }
  for (const y of [-0.035, 0.035]) b.cbox(-0.034, y - 0.006, -0.018, 0.034, y + 0.006, 0.046, 0.004, MAT.BLACK);   // tape
  // the fuse: up out of the middle stick and over
  b.push(); b.translate(0, 0.072, 0.008);
  b.cbox(-0.0022, 0, -0.0022, 0.0022, 0.03, 0.0022, 0.001, MAT.BLACK);
  b.translate(0, 0.03, 0); b.pitch(0.9);
  b.cbox(-0.0022, 0, -0.0022, 0.0022, 0.022, 0.0022, 0.001, MAT.BLACK);
  b.translate(0, 0.022, 0);
  if (lit) { b.ball(0, 0.004, 0, 0.006 + 0.003 * spark, MAT.FLAME, 6); b.anchor("glow", 0, 0.004, 0); }
  b.pop();
}

/** A brass trench lighter, its lid thrown back and its flame up (2026-10-22: drawn bigger, the flame a tongue of fire and not a white bead). */
function lighter(b: Builder, flame: boolean): void {
  b.cbox(-0.016, -0.04, -0.01, 0.016, 0.014, 0.01, 0.004, MAT.BRASS);   // the case
  b.cbox(-0.016, 0.014, -0.01, 0.016, 0.026, 0.01, 0.003, MAT.SILVER, { tex: (x, y) => (Math.floor(x * 400) & 1) && y > 0.016 ? -1.5 : 0 });   // the chimney, its holes
  b.push(); b.translate(-0.016, 0.014, 0); b.roll(0.5);
  b.cbox(-0.026, 0.0, -0.01, 0.0, 0.03, 0.01, 0.004, MAT.BRASS);       // the lid, thrown back
  b.pop();
  b.ball(0.012, 0.03, 0, 0.003, MAT.IRON, 5);                           // the wheel
  if (flame) {
    b.ball(0, 0.036, 0, 0.01, MAT.FLAME, 6, { tex: () => -2.6 });                    // the flame's orange body
    b.push(); b.translate(0, 0.036, 0); b.pitch(Math.PI / 2); b.cyl(0, 0, 0.0, 0.034, 0.009, 0.001, 6, MAT.FLAME, { tex: (_x, _y, z) => (z > 0.018 ? -3.4 : -1.8) }); b.pop();   // the tongue, a cone pointing up
    b.ball(0, 0.034, 0, 0.005, MAT.FLAME, 6);
  }
}

/** How far the bundle leans away from the eye (radians): upright it would stand taller than the whole frame under the crosshair. */
export const TILT = 0.5;
/** Where the right hand closes on the bundle, and where the lighter rests, in the bundle's frame (metres). */
const F_Y = -0.025;
const LY = 0;

export const dynamite: WeaponArt = {
  name: "DYNAMITE",
  hold: { x: 0.05, y: -0.09, z: 0.42, pitch: 0.1, yaw: 0, roll: 0 },
  kick: { back: 0.02, lift: 0.04 },
  // the throw: the bundle is out of the hand from 0.45 on
  action: (p) => ramp(p, 0, 1),
  draw(b: Builder, pose: Pose) {
    const r = pose.reload, a = pose.action;
    // the throw: drawn back and down (to 0.3), swung up and forward (to 0.7), and back to the aim
    const back = r < 0 ? hump(a, 0, 0.55, 0.25) : 0, fwd = r < 0 ? hump(a, 0.3, 1, 0.25) : 0;
    const thrown = r < 0 && (a > 0.45 || (pose.empty === 1 && a === 0));   // and gone from the hand until the next comes up
    // the next bundle comes up from below at the start of the reload, and the lighter lights it at 60%
    const up = r < 0 ? 0 : 1 - ramp(r, 0, 0.35);
    const light = r < 0 ? 0 : hump(r, 0.4, 0.82, 0.14);
    const lit = r < 0 ? (pose.heat >= 0 && !thrown) : r > 0.6;
    b.push();
    b.translate(0, -0.12 * up - 0.03 * back + 0.02 * fwd, -0.05 * back + 0.08 * fwd);
    b.pitch(0.5 * back - 0.6 * fwd);
    b.push(); b.pitch(-TILT);   // the bundle leans away, top first, as a hand holds it ready to throw
    if (!thrown || r >= 0) {
      if (r < 0 || up < 0.98) sticks(b, lit, Math.sin(pose.spin * 4) * 0.5 + 0.5);
    }
    b.anchor("muzzle", 0, 0.1, 0.01);
    // the right hand round the bundle's lower half, fingers across its front, and the arm down out of the frame
    if (!thrown || r >= 0) { b.push(); b.translate(0, F_Y, 0); fist(b, 1, { w: 0.032, fingers: 3 }); b.pop(); }
    b.pop();
    forearm(b, 0.03, -0.07, -0.06, [0.25, -0.6, -1], 0.034);
    b.pop();

    // the left hand and its lighter, low on the left; across to the fuse while lighting
    b.push();
    b.translate(-0.065 + 0.06 * light, LY + 0.045 + 0.05 * light, 0.01 - 0.012 * light);
    lighter(b, true);   // the lighter stays lit: the next bundle is lit from it
    b.push(); b.translate(0, -0.03, -0.006); fist(b, -1, { w: 0.012, fingers: 3 }); b.pop();
    forearm(b, -0.01, -0.06, -0.05, [-0.35, -0.55, -1], 0.03);
    b.pop();
  },
};

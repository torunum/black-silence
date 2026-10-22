import type { Builder } from "./builder";
import { MAT } from "./palette";

/**
 * Gloved hands and coat sleeves, shared by every weapon, the kick and the finish by hand. Worn brown leather gloves, a wrist strap with
 * a brass buckle, a dirty linen cuff and a dark wool coat sleeve running off the bottom of the screen — the same man for every weapon.
 *
 * Remodelled (owner, 2026-10-22: "elleri daha kaliteli modelle, çok kalitesiz duruyor"): a hand is no longer a block with rods stuck in
 * it. The back of the hand, the palm and the ball of the thumb are rounded masses (`Builder.ell`), every finger is three jointed
 * segments with a knuckle at each joint (`Builder.limb`), lit pixel by pixel round its curve, and the leather has its seams and
 * stitching, creases over the knuckles and a sheen. The signatures are the old ones: a weapon places a hand exactly where it did.
 *
 * Every function draws in the caller's current frame (the builder's matrix), so a weapon places a hand by translating/rotating to its
 * grip first.
 */

type P3 = [number, number, number];

/** Stitching: a dashed seam along the back of the glove and round the knuckles' edge. */
const seamTex = (x: number, y: number, z: number): number =>
  (Math.abs(z + 0.016) < 0.0016 && (Math.floor(y * 420) & 1) ? -1.6 : 0) + (Math.abs(Math.sin(x * 900 + y * 300)) < 0.06 ? -0.5 : 0);
/** Creases across the leather of a finger's joints. */
const creaseTex = (_x: number, _y: number, z: number): number => (Math.abs(Math.sin(z * 520)) < 0.12 ? -0.9 : 0);
/** Coat wool: a weave, and long folds down the sleeve so a large dark shape is not a flat slab. */
const coatTex = (x: number, y: number, z: number): number =>
  (((Math.floor((z + x) * 80) + Math.floor(y * 80)) & 3) === 0 ? -0.55 : 0) + (Math.sin(Math.atan2(y, x) * 5 + z * 9) > 0.82 ? -1.1 : 0);
/** Linen: coarse, and pleated where it bunches at the wrist. */
const linenTex = (x: number, y: number, z: number): number => (Math.sin(Math.atan2(y, x) * 9) > 0.6 ? -0.8 : 0) + ((Math.floor(z * 300) & 1) ? -0.25 : 0);

/** A rounded rod along local x from x0 to x1, at (y,z): a finger wrapped round a grip. */
export function rodX(b: Builder, x0: number, x1: number, y: number, z: number, r: number, mat: number, n = 8): void {
  b.limb([x0, y, z], [x1, y, z], r, r, mat, n);
  b.ball(x0, y, z, r, mat, n);
}
/** A rounded rod along local y from y0 to y1, at (x,z). */
export function rodY(b: Builder, y0: number, y1: number, x: number, z: number, r: number, mat: number, n = 8): void {
  b.limb([x, y0, z], [x, y1, z], r, r, mat, n);
  b.ball(x, y0, z, r, mat, n);
}

/** A finger through the points given, knuckle first: a jointed run of capsules, tapering from `r` by a sixth a joint. */
function finger(b: Builder, pts: readonly P3[], r: number): void {
  b.ball(pts[0][0], pts[0][1], pts[0][2], r * 1.12, MAT.GLOVE, 8, { tex: creaseTex });   // the knuckle
  for (let i = 1; i < pts.length; i++) b.limb(pts[i - 1], pts[i], r * (1 - (i - 1) / 6), r * (1 - i / 6), MAT.GLOVE, 8, { tex: creaseTex });
}

/**
 * A forearm leaving the wrist: glove gauntlet, its strap and buckle, the linen cuff, then the coat sleeve, pointing from the local point
 * (x,y,z) along `dir` — given in CAMERA space, so an arm always runs off toward the bottom of the screen however the hand at its end is
 * turned (a hand rolled on its side to hold a magazine must not send its arm across the screen). Long enough to run out of frame; the
 * near plane clips it.
 */
export function forearm(b: Builder, x: number, y: number, z: number, dir: [number, number, number], r = 0.03): void {
  b.push();
  b.translate(x, y, z);
  const [dx, dy, dz] = b.dirFromCam(dir);
  b.yaw(Math.atan2(dx, dz));
  b.pitch(Math.atan2(dy, Math.hypot(dx, dz)));
  b.cyl(0, 0, -0.012, 0.064, r * 0.9, r * 1.16, 12, MAT.GLOVE, { caps: false, tex: seamTex });   // the glove's gauntlet
  b.cyl(0, 0, 0.026, 0.04, r * 1.13, r * 1.15, 12, MAT.BLACK);                                   // its strap
  b.cbox(-r * 0.22, r * 1.08, 0.027, r * 0.22, r * 1.26, 0.039, 0.0015, MAT.IRON);              // and its iron buckle
  b.cyl(0, 0, 0.055, 0.088, r * 1.3, r * 1.42, 12, MAT.CUFF, { tex: linenTex });              // linen cuff
  b.cyl(0, 0, 0.078, 0.46, r * 1.6, r * 2.25, 12, MAT.COAT, { tex: coatTex });                  // coat sleeve
  b.cyl(0, 0, 0.078, 0.125, r * 1.74, r * 1.8, 12, MAT.COAT);                                  // turned-back sleeve end
  b.ball(r * 1.25, r * 1.2, 0.1, r * 0.13, MAT.IRON, 6);                                        // its button
  b.pop();
}

/**
 * The left hand cupped under a forend or barrel that runs along local z through the origin: palm underneath, fingers curled up the far
 * (left) side, thumb along the near (right) side, forearm running back and down to the left. `w` is the forend's half width, `h` its
 * depth below the axis.
 */
export function cup(b: Builder, w: number, h: number): void {
  const palm = b.part();
  b.ell(-0.004, -h - 0.013, -0.006, w + 0.014, 0.014, 0.046, MAT.GLOVE, 10, { tex: seamTex, part: palm });   // the palm, under it
  b.ell(-w - 0.01, -h - 0.004, -0.02, 0.012, 0.016, 0.034, MAT.GLOVE, 8, { part: palm });                      // the heel of the hand, round its far side
  for (let i = 0; i < 4; i++) {
    const z = -0.03 + i * 0.02, r = i === 3 ? 0.0082 : 0.0094;
    finger(b, [[-w - 0.006, -h - 0.008, z], [-w - 0.014, -h * 0.45, z + 0.002], [-w - 0.01, h * 0.05, z + 0.003], [-w + 0.002, h * 0.35 + 0.004, z + 0.002]], r);
  }
  // the thumb along the near side, its ball under the palm
  b.ell(w + 0.004, -h - 0.008, -0.04, 0.012, 0.012, 0.022, MAT.GLOVE, 8);
  finger(b, [[w + 0.007, -h - 0.004, -0.036], [w + 0.011, -h * 0.35, -0.006], [w + 0.008, -h * 0.1, 0.022]], 0.0108);
  forearm(b, -0.004, -h - 0.02, -0.05, [-0.4, -0.55, -1], 0.029);
}

/** Where the thumb grows from, for a hand of `side` round a grip of half width `w`; it points along +z. */
export const THUMB = (side: 1 | -1, w = 0.014): [number, number, number] => [side * (-w - 0.007), -0.002, -0.034];

/**
 * A fist closed around a grip. The grip runs down local -y from the origin, its front is +z. `side` is +1 for the right hand (back of
 * the hand outward on +x, thumb over the -x side) and -1 for the left. `trigger` lays the index finger along the frame to the trigger
 * instead of round the grip. `w` is the grip's half width. `thumb: false` leaves the thumb to the caller (`THUMB` is where it grows from).
 */
export function fist(b: Builder, side: 1 | -1, o: { trigger?: boolean; w?: number; fingers?: number; thumb?: boolean } = {}): void {
  const s = side, w = o.w ?? 0.014;
  // the back of the hand, outside and behind the grip; the palm behind it; the heel and the ball of the thumb on the far side
  const palm = b.part();   // one surface: no line drawn between the masses of the hand
  b.ell(s * (w + 0.006), -0.04, -0.02, 0.019, 0.046, 0.03, MAT.GLOVE, 10, { tex: seamTex, part: palm });
  b.ell(s * (-w * 0.15), -0.046, -0.03, w + 0.01, 0.04, 0.02, MAT.GLOVE, 9, { part: palm });
  b.ell(s * (-w - 0.002), -0.03, -0.03, 0.013, 0.026, 0.019, MAT.GLOVE, 8, { part: palm });
  // the fingers: from the knuckles at the back-outer corner, across the front of the grip, their tips hooked round the far side
  const n = o.fingers ?? 4, first = o.trigger ? 1 : 0;
  for (let i = first; i < n; i++) {
    const y = -0.013 - i * 0.0186, r = i === 3 ? 0.0084 : 0.0097;
    finger(b, [[s * (w + 0.012), y, 0.0], [s * (w + 0.005), y, w + 0.011], [s * (-w * 0.4), y - 0.001, w + 0.014], [s * (-w - 0.005), y - 0.002, 0.005]], r);
  }
  if (o.trigger) {   // the index laid along the frame and curled onto the trigger
    finger(b, [[s * (w + 0.012), -0.012, 0.0], [s * (w + 0.007), -0.012, 0.026], [s * (w * 0.35), -0.015, 0.045], [s * (-w * 0.05), -0.026, 0.05]], 0.0097);
  }
  if (o.thumb === false) return;
  // the thumb over the far side, pointing forward
  finger(b, [[s * (-w - 0.004), -0.008, -0.036], [s * (-w - 0.009), -0.003, -0.008], [s * (-w - 0.006), -0.004, 0.021]], 0.0118);
}

/**
 * An open hand, its palm facing forward and down, the fingers out along +z and bending down at every joint by `curl` (0 flat, 1 clenched
 * round something), splayed by `spread`; the thumb round the inner side. For hands that reach and take hold (the finish by hand).
 */
export function openHand(b: Builder, side: 1 | -1, curl: number, spread = 0.12): void {
  b.ell(0, 0, 0, 0.032, 0.015, 0.036, MAT.GLOVE, 10, { tex: seamTex });   // the back of the hand and the palm
  const lens = [0.042, 0.027, 0.022];
  for (let i = 0; i < 4; i++) {
    const phi = side * (i - 1.5) * spread * (1 - 0.6 * curl), r = i === 3 ? 0.0086 : 0.0098;
    const pts: P3[] = [[side * (-0.022 + i * 0.0148), 0.003, 0.03]];
    let th = 0.12 * curl;
    for (let j = 0; j < 3; j++) {
      th += 0.15 + 1.05 * curl;
      const [px, py, pz] = pts[j], L = lens[j] * (i === 3 ? 0.86 : i === 0 ? 0.95 : 1);
      pts.push([px + Math.sin(phi) * Math.cos(th) * L, py - Math.sin(th) * L, pz + Math.cos(phi) * Math.cos(th) * L]);
    }
    finger(b, pts, r);
  }
  b.ell(side * -0.026, -0.006, -0.012, 0.013, 0.012, 0.02, MAT.GLOVE, 8);   // the ball of the thumb
  const tc = 0.6 * curl;
  finger(b, [[side * -0.032, -0.006, -0.004], [side * (-0.046 + 0.014 * tc), -0.01 - 0.01 * tc, 0.02], [side * (-0.044 + 0.024 * tc), -0.016 - 0.014 * tc, 0.042]], 0.0115);
}

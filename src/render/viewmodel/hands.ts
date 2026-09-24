import type { Builder } from "./builder";
import { MAT } from "./palette";

/**
 * Gloved hands and coat sleeves, shared by all eight weapons. Worn brown
 * leather gloves with a seam across the back, a dirty linen cuff and a dark
 * wool coat sleeve running off the bottom of the screen — the same man for
 * every weapon.
 *
 * Both functions draw in the caller's current frame (the builder's matrix),
 * so a weapon places a hand by translating/rotating to its grip first.
 */

/** Seam and stitching on the back of the glove. */
const gloveTex = (_x: number, y: number, z: number): number =>
  (Math.abs(z + 0.02) < 0.003 && y > -0.07 ? -1.3 : 0);

/** Coat wool: a faint diagonal weave so a large dark shape is not a flat slab. */
const coatTex = (x: number, y: number, z: number): number =>
  ((Math.floor((z + x) * 80) + Math.floor(y * 80)) & 3) === 0 ? -0.55 : 0;

/** A rounded rod along local x from x0 to x1, at (y,z): a finger wrapped round a grip. */
export function rodX(b: Builder, x0: number, x1: number, y: number, z: number, r: number, mat: number, n = 6): void {
  b.push(); b.translate(0, y, z); b.yaw(Math.PI / 2);
  b.cyl(0, 0, x0, x1, r, r, n, mat);
  b.pop();
}
/** A rounded rod along local y from y0 to y1, at (x,z). */
export function rodY(b: Builder, y0: number, y1: number, x: number, z: number, r: number, mat: number, n = 6): void {
  b.push(); b.translate(x, 0, z); b.pitch(Math.PI / 2);
  b.cyl(0, 0, y0, y1, r, r, n, mat);
  b.pop();
}

/**
 * A forearm leaving the wrist: glove gauntlet, cuff, then sleeve, pointing
 * from the local point (x,y,z) along `dir` — given in CAMERA space, so an
 * arm always runs off toward the bottom of the screen however the hand at
 * its end is turned (a hand rolled on its side to hold a magazine must not
 * send its arm across the screen). Long enough to run out of frame; the
 * near plane clips it.
 */
export function forearm(b: Builder, x: number, y: number, z: number, dir: [number, number, number], r = 0.03): void {
  b.push();
  b.translate(x, y, z);
  const [dx, dy, dz] = b.dirFromCam(dir);
  b.yaw(Math.atan2(dx, dz));
  b.pitch(Math.atan2(dy, Math.hypot(dx, dz)));
  b.cyl(0, 0, -0.01, 0.06, r * 0.9, r * 1.12, 7, MAT.GLOVE, { caps: false });   // wrist of the glove
  b.cyl(0, 0, 0.05, 0.08, r * 1.3, r * 1.38, 8, MAT.CUFF);                       // linen cuff
  b.cyl(0, 0, 0.07, 0.45, r * 1.6, r * 2.2, 8, MAT.COAT, { tex: coatTex });        // coat sleeve
  b.cyl(0, 0, 0.07, 0.11, r * 1.72, r * 1.78, 8, MAT.COAT);                     // turned-back sleeve end
  b.pop();
}

/**
 * The left hand cupped under a forend or barrel that runs along local z
 * through the origin: palm underneath, fingers curled up the far (left)
 * side, thumb along the near (right) side, forearm running back and down
 * to the left. `w` is the forend's half width, `h` its depth below the axis.
 */
export function cup(b: Builder, w: number, h: number): void {
  b.cbox(-w - 0.008, -h - 0.024, -0.05, w + 0.01, -h + 0.002, 0.04, 0.007, MAT.GLOVE, { tex: gloveTex });
  for (let i = 0; i < 4; i++) {
    const z = -0.032 + i * 0.021;
    rodY(b, -h - 0.012, -h * 0.25 + 0.006 - i * 0.002, -w - 0.007, z, 0.0095, MAT.GLOVE);
  }
  b.push(); b.translate(w + 0.006, -h * 0.35, -0.05); b.cyl(0, 0, 0, 0.06, 0.011, 0.009, 6, MAT.GLOVE); b.pop();
  forearm(b, -0.004, -h - 0.018, -0.05, [-0.4, -0.55, -1], 0.029);
}

/**
 * A fist closed around a grip. The grip runs down local -y from the
 * origin, its front is +z. `side` is +1 for the right hand (back of the
 * hand outward on +x, thumb over the -x side) and -1 for the left.
 * `trigger` lays the index finger along the frame instead of round the grip.
 * `w` is the grip's half width.
 */
export function fist(b: Builder, side: 1 | -1, o: { trigger?: boolean; w?: number; fingers?: number } = {}): void {
  const s = side, w = o.w ?? 0.014;
  const X = (a: number, c: number): [number, number] => (s > 0 ? [a, c] : [-c, -a]);
  // the palm and the back of the hand: a rounded block behind and outside the grip
  const [px0, px1] = X(-w - 0.003, w + 0.02);
  b.ext([[-0.05, -0.01], [-0.036, 0.004], [-0.006, 0.004], [0.004, -0.008], [0.006, -0.066], [-0.006, -0.082], [-0.034, -0.084], [-0.054, -0.06]],
    px0, px1, MAT.GLOVE, { tex: gloveTex });
  // fingers wrapped round the front of the grip, their tips hooked over the far side
  const n = o.fingers ?? 4, first = o.trigger ? 1 : 0;
  for (let i = first; i < n; i++) {
    const y = -0.012 - i * 0.0185;
    rodX(b, ...X(-w - 0.01, w + 0.016), y, 0.008 - i * 0.001, 0.0105, MAT.GLOVE);
    const [tx0, tx1] = X(-w - 0.014, -w - 0.002);
    b.box(tx0, y - 0.008, -0.014, tx1, y + 0.008, 0.004, MAT.GLOVE);
  }
  if (o.trigger) {
    // index finger laid along the frame to the trigger
    b.push(); b.translate(s * (w + 0.006), -0.012, -0.004); b.cyl(0, 0, 0, 0.05, 0.0095, 0.008, 6, MAT.GLOVE); b.pop();
  }
  // thumb over the far side, pointing forward
  b.push(); b.translate(s * (-w - 0.007), -0.002, -0.034); b.yaw(s * 0.12);
  b.cyl(0, 0, 0, 0.052, 0.0115, 0.0095, 6, MAT.GLOVE); b.pop();
}

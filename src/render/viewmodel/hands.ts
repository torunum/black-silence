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
 * The left hand clasped round a fore-end that runs along local z, seen from
 * behind and to the left (the gun is held right of the view axis, so its
 * left flank faces the eye): the back of the hand lies against the left
 * flank, the four fingers curl over the top, the thumb runs forward along
 * the underside, and the forearm leaves the wrist back and down to the
 * left. `w` is the fore-end's half width, `top` and `bottom` its extent in
 * local y. The hand's anchor ("leftHand") is where it touches the flank.
 */
export function clasp(b: Builder, w: number, top: number, bottom: number): void {
  const mid = (top + bottom) / 2;
  b.anchor("leftHand", -w, mid, 0);
  // the back of the hand, against the flank
  b.cbox(-w - 0.034, bottom - 0.006, -0.05, -w + 0.001, top - 0.002, 0.04, 0.008, MAT.GLOVE, { tex: gloveTex });
  // four fingers over the top, their knuckles on the near side
  for (let i = 0; i < 4; i++) rodX(b, -w - 0.03, w * 0.35, top + 0.006, -0.036 + i * 0.02, 0.0095, MAT.GLOVE);
  // the thumb forward along the underside
  b.push(); b.translate(-w - 0.012, bottom + 0.004, -0.03); b.cyl(0, 0, 0, 0.07, 0.0115, 0.0095, 6, MAT.GLOVE); b.pop();
  forearm(b, -w - 0.018, bottom - 0.004, -0.05, [-0.45, -0.6, -1], 0.029);
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
  b.anchor(s > 0 ? "rightHand" : "leftHand", 0, -0.04, 0);
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

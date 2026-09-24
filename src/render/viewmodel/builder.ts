import { fillFace, type Raster, type TexFn } from "./raster";
import { MATERIALS, toneCount } from "./palette";

/**
 * Builds the viewmodel out of boxes, prisms and extrusions in 3D and draws
 * them straight into a Raster (./raster.ts). Camera space: x right, y up,
 * z into the screen; the eye is the origin. A weapon's draw function works
 * in its own local space through a matrix stack (translate/rotate/push/pop),
 * which is what lets a pose move a slide, rotate a barrel cluster or break
 * a shotgun open without a separate drawing for each state.
 *
 * Every primitive is closed and convex per face, emits outward normals
 * analytically (no winding guesswork), is back-face culled, clipped against
 * a near plane and filled with a flat tone from one fixed light — hard
 * facets, the look of low-res pixel art rather than smooth rendering.
 */

export type V3 = [number, number, number];

const NEAR = 0.04;
/** Key light, pointing from the surface toward the light: above, a little left, a little toward the viewer. */
const LX = -0.42, LY = 0.86, LZ = -0.29;

export interface PrimOpts { tex?: TexFn; }

export class Builder {
  /** Current model->camera transform, row-major 3x4. */
  private m: Float64Array = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
  private stack: Float64Array[] = [];
  private nextPart = 1;
  readonly anchors: Record<string, [number, number]> = {};

  constructor(readonly r: Raster, readonly F: number, readonly cx: number, readonly cy: number) {}

  push(): void { this.stack.push(this.m.slice()); }
  pop(): void { const m = this.stack.pop(); if (m) this.m = m; }

  translate(x: number, y: number, z: number): void {
    const m = this.m;
    m[3] += m[0] * x + m[1] * y + m[2] * z;
    m[7] += m[4] * x + m[5] * y + m[6] * z;
    m[11] += m[8] * x + m[9] * y + m[10] * z;
  }
  /** Right-multiplies a rotation (columns a,b,c of a 3x3). */
  private rot(a0: number, a1: number, a2: number, b0: number, b1: number, b2: number, c0: number, c1: number, c2: number): void {
    const m = this.m;
    for (let r = 0; r < 3; r++) {
      const o = r * 4, x = m[o], y = m[o + 1], z = m[o + 2];
      m[o] = x * a0 + y * a1 + z * a2;
      m[o + 1] = x * b0 + y * b1 + z * b2;
      m[o + 2] = x * c0 + y * c1 + z * c2;
    }
  }
  /** Positive pitch lifts +z (the muzzle) toward +y. */
  pitch(a: number): void { const c = Math.cos(a), s = Math.sin(a); this.rot(1, 0, 0, 0, c, -s, 0, s, c); }
  /** Positive yaw swings +z (the muzzle) toward +x (right). */
  yaw(a: number): void { const c = Math.cos(a), s = Math.sin(a); this.rot(c, 0, -s, 0, 1, 0, s, 0, c); }
  /** Positive roll turns +y (the top) toward +x (clockwise on screen). */
  roll(a: number): void { const c = Math.cos(a), s = Math.sin(a); this.rot(c, -s, 0, s, c, 0, 0, 0, 1); }

  /** Local point -> camera space. */
  toCam(x: number, y: number, z: number): V3 {
    const m = this.m;
    return [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]];
  }
  /** Local point -> raster pixel (unclipped). */
  project(x: number, y: number, z: number): [number, number] {
    const [a, b, c] = this.toCam(x, y, z);
    const zz = Math.max(c, NEAR);
    return [this.cx + this.F * a / zz, this.cy - this.F * b / zz];
  }
  /** A camera-space direction expressed in the current local frame (the rotation's transpose). */
  dirFromCam(d: V3): V3 {
    const m = this.m;
    return [m[0] * d[0] + m[4] * d[1] + m[8] * d[2], m[1] * d[0] + m[5] * d[1] + m[9] * d[2], m[2] * d[0] + m[6] * d[1] + m[10] * d[2]];
  }
  /** Records where a local point lands on the raster (muzzle tip, glow core). */
  anchor(name: string, x: number, y: number, z: number): void { this.anchors[name] = this.project(x, y, z); }

  /** Starts a new primitive: every face emitted until the next call shares one part id (contours are drawn between parts, not within one). */
  part(): number { return this.nextPart++; }

  private inverse(): Float64Array {
    const m = this.m;
    // rotation is orthonormal (no scale anywhere): inverse = [R^T | -R^T t]
    const inv = new Float64Array(12);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) inv[r * 4 + c] = m[c * 4 + r];
    for (let r = 0; r < 3; r++) inv[r * 4 + 3] = -(inv[r * 4] * m[3] + inv[r * 4 + 1] * m[7] + inv[r * 4 + 2] * m[11]);
    return inv;
  }

  /**
   * Emits one planar face: local vertices plus its local outward normal.
   * Culls, lights, clips and fills it.
   */
  face(pts: V3[], nl: V3, mat: number, part: number, o?: PrimOpts, inv?: Float64Array): void {
    const m = this.m;
    const nx = m[0] * nl[0] + m[1] * nl[1] + m[2] * nl[2];
    const ny = m[4] * nl[0] + m[5] * nl[1] + m[6] * nl[2];
    const nz = m[8] * nl[0] + m[9] * nl[1] + m[10] * nl[2];
    const cam = pts.map((p) => this.toCam(p[0], p[1], p[2]));
    const p0 = cam[0], k = nx * p0[0] + ny * p0[1] + nz * p0[2];
    if (k >= 0) return; // facing away from the eye
    const clipped = clipNear(cam);
    if (clipped.length < 3) return;
    const sx: number[] = [], sy: number[] = [];
    for (const p of clipped) { sx.push(this.cx + this.F * p[0] / p[2]); sy.push(this.cy - this.F * p[1] / p[2]); }
    fillFace(this.r, {
      sx, sy, nx, ny, nz, k, mat, part, tone: shade(mat, nx, ny, nz, p0),
      tex: o?.tex, inv: o?.tex ? (inv ?? this.inverse()) : undefined,
    }, this.F, this.cx, this.cy);
  }

  /** Axis-aligned box in local space. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mat: number, o?: PrimOpts): void {
    const p = this.part(), inv = o?.tex ? this.inverse() : undefined;
    const A: V3 = [x0, y0, z0], B: V3 = [x1, y0, z0], C: V3 = [x1, y1, z0], D: V3 = [x0, y1, z0];
    const E: V3 = [x0, y0, z1], G: V3 = [x1, y0, z1], H: V3 = [x1, y1, z1], I: V3 = [x0, y1, z1];
    this.face([A, B, C, D], [0, 0, -1], mat, p, o, inv);
    this.face([E, G, H, I], [0, 0, 1], mat, p, o, inv);
    this.face([A, B, G, E], [0, -1, 0], mat, p, o, inv);
    this.face([D, C, H, I], [0, 1, 0], mat, p, o, inv);
    this.face([A, D, I, E], [-1, 0, 0], mat, p, o, inv);
    this.face([B, C, H, G], [1, 0, 0], mat, p, o, inv);
  }

  /**
   * A prism along local z from z0 to z1, centred on (x,y), radius r0 at z0
   * tapering to r1 at z1, `n` sides, rotated `a0` about its axis.
   */
  cyl(x: number, y: number, z0: number, z1: number, r0: number, r1: number, n: number, mat: number, o?: PrimOpts & { a0?: number; caps?: boolean }): void {
    const p = this.part(), inv = o?.tex ? this.inverse() : undefined;
    const a0 = o?.a0 ?? Math.PI / n;
    const ring = (z: number, r: number): V3[] => {
      const out: V3[] = [];
      for (let i = 0; i < n; i++) { const a = a0 + i * 2 * Math.PI / n; out.push([x + Math.cos(a) * r, y + Math.sin(a) * r, z]); }
      return out;
    };
    const R0 = ring(z0, r0), R1 = ring(z1, r1);
    const slope = (r0 - r1) / Math.max(1e-6, z1 - z0);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = a0 + (i + 0.5) * 2 * Math.PI / n;
      const len = Math.hypot(1, slope);
      this.face([R0[i], R0[j], R1[j], R1[i]], [Math.cos(a) / len, Math.sin(a) / len, slope / len], mat, p, o, inv);
    }
    if (o?.caps !== false) {
      this.face(R0, [0, 0, -1], mat, p, o, inv);
      this.face(R1, [0, 0, 1], mat, p, o, inv);
    }
  }

  /**
   * Extrudes a 2D profile along local x from x0 to x1. The profile is in
   * the (z, y) plane — a side view, forward to the right, up is up — which
   * is how a stock, a grip or a trigger guard is naturally drawn. Any
   * simple polygon; the caps are filled even-odd, so concave is fine.
   */
  ext(profile: Array<[number, number]>, x0: number, x1: number, mat: number, o?: PrimOpts): void {
    const p = this.part(), inv = o?.tex ? this.inverse() : undefined;
    let area = 0;
    for (let i = 0, j = profile.length - 1; i < profile.length; j = i++) area += profile[j][0] * profile[i][1] - profile[i][0] * profile[j][1];
    const ccw = area > 0; // counter-clockwise in (z,y)
    const L = profile.map(([z, y]) => [x0, y, z] as V3), R = profile.map(([z, y]) => [x1, y, z] as V3);
    this.face(L, [-1, 0, 0], mat, p, o, inv);
    this.face(R, [1, 0, 0], mat, p, o, inv);
    for (let i = 0; i < profile.length; i++) {
      const j = (i + 1) % profile.length;
      const dz = profile[j][0] - profile[i][0], dy = profile[j][1] - profile[i][1];
      const len = Math.hypot(dz, dy) || 1;
      // outward normal of edge i->j in (z,y): rotate the edge by -90deg for a ccw polygon
      const nz = ccw ? dy / len : -dy / len, ny = ccw ? -dz / len : dz / len;
      this.face([L[i], L[j], R[j], R[i]], [0, ny, nz], mat, p, o, inv);
    }
  }

  /**
   * Extrudes a 2D cross-section along local z from z0 to z1 — the profile
   * is in the (x, y) plane, as seen from behind. `r1` scales the far end
   * about (0,0) for a taper.
   */
  prz(profile: Array<[number, number]>, z0: number, z1: number, mat: number, o?: PrimOpts & { r1?: number }): void {
    const p = this.part(), inv = o?.tex ? this.inverse() : undefined, k1 = o?.r1 ?? 1;
    let area = 0;
    for (let i = 0, j = profile.length - 1; i < profile.length; j = i++) area += profile[j][0] * profile[i][1] - profile[i][0] * profile[j][1];
    const ccw = area > 0;
    const A = profile.map(([x, y]) => [x, y, z0] as V3), B = profile.map(([x, y]) => [x * k1, y * k1, z1] as V3);
    this.face(A, [0, 0, -1], mat, p, o, inv);
    this.face(B, [0, 0, 1], mat, p, o, inv);
    const dzl = z1 - z0;
    for (let i = 0; i < profile.length; i++) {
      const j = (i + 1) % profile.length;
      const dx = profile[j][0] - profile[i][0], dy = profile[j][1] - profile[i][1];
      let nx = ccw ? dy : -dy, ny = ccw ? -dx : dx;
      const l2 = Math.hypot(nx, ny) || 1; nx /= l2; ny /= l2;
      // taper tilts the side normal toward -z by the edge's inward travel
      const mx = (profile[i][0] + profile[j][0]) / 2, my = (profile[i][1] + profile[j][1]) / 2;
      const nzz = ((1 - k1) * (mx * nx + my * ny)) / (dzl || 1);
      const l3 = Math.hypot(nx, ny, nzz);
      this.face([A[i], A[j], B[j], B[i]], [nx / l3, ny / l3, nzz / l3], mat, p, o, inv);
    }
  }

  /** A box with its four long (z) edges chamfered by c: machined steel, a stock's rounded corners. */
  cbox(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: number, mat: number, o?: PrimOpts): void {
    this.prz([[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]], z0, z1, mat, o);
  }

  /** A low-poly sphere (lat/long), for soul cores and knuckles. */
  ball(x: number, y: number, z: number, r: number, mat: number, seg = 6, o?: PrimOpts): void {
    const p = this.part(), inv = o?.tex ? this.inverse() : undefined;
    const rows = Math.max(3, seg - 2), pt = (i: number, j: number): V3 => {
      const th = Math.PI * i / rows, ph = 2 * Math.PI * j / seg;
      return [x + r * Math.sin(th) * Math.cos(ph), y + r * Math.cos(th), z + r * Math.sin(th) * Math.sin(ph)];
    };
    for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) {
      const th = Math.PI * (i + 0.5) / rows, ph = 2 * Math.PI * (j + 0.5) / seg;
      const n: V3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      const quad = [pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j)];
      this.face(i === 0 ? [quad[0], quad[2], quad[3]] : i === rows - 1 ? [quad[0], quad[1], quad[2]] : quad, n, mat, p, o, inv);
    }
  }
}

/** Continuous tone for a face: Lambert against the key light, plus a hard specular glint for polished materials. */
function shade(mat: number, nx: number, ny: number, nz: number, p: V3): number {
  const M = MATERIALS[mat], top = toneCount(mat) - 1;
  if (!M) return 0;
  if (M.emissive) return top - 0.2;
  const amb = M.amb ?? 0.2;
  const lam = Math.max(0, nx * LX + ny * LY + nz * LZ);
  let v = amb + (0.84 - amb) * lam;
  if (M.spec) {
    const pl = Math.hypot(p[0], p[1], p[2]) || 1;
    let hx = LX - p[0] / pl, hy = LY - p[1] / pl, hz = LZ - p[2] / pl;
    const hl = Math.hypot(hx, hy, hz) || 1; hx /= hl; hy /= hl; hz /= hl;
    const s = Math.max(0, nx * hx + ny * hy + nz * hz);
    v += M.spec * Math.pow(s, 24) * 0.8;
  }
  return Math.min(top, v * top);
}

/** Sutherland-Hodgman against z >= NEAR. */
function clipNear(pts: V3[]): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const ina = a[2] >= NEAR, inb = b[2] >= NEAR;
    if (ina) out.push(a);
    if (ina !== inb) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }
  return out;
}

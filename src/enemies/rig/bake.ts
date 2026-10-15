import * as THREE from "three";
import { Builder } from "../../render/viewmodel/builder";
import { Raster, finish } from "../../render/viewmodel/raster";
import { quietly } from "../../fx/Quiet";
import { drawFigure, type DrawOpts, type PartGroup, type Rig, type RigPose, type Role } from "./kit";

/**
 * BAKING THE RIG: a pose, a dismember mask and a mirror in, a texture out.
 *
 * `renderBitmap` rasterizes the posed skeleton with the weapons' builder and
 * rasterizer (`src/render/viewmodel/`) from the rig's view, into RGBA. The
 * camera is far back and its lens long (a nearly flat projection: a sprite
 * has no perspective of its own), so a metre is the same number of pixels
 * wherever it stands. `RigSet` bakes the frames a monster needs: the whole
 * monster's at boot and the dismembered variants the first time one is
 * wanted (a texture is a few KB; an arm has been torn off perhaps once a
 * level). All of it under `quietly`: three.js draws four numbers from
 * `Math.random` for every uuid it hands a texture, and presentation must
 * take none of the game's.
 */

/** Metres from the lens to the monster's floor-centre; with `FOCAL_PER_M` this is what makes the projection nearly flat. */
const DIST = 14;

export interface Bitmap { w: number; h: number; data: Uint8ClampedArray }

/** The pixels of `r` as RGBA through its palette, optionally mirrored left to right. */
function toBitmap(r: Raster, mirror: boolean): Bitmap {
  const { w, h, col } = r, lut = r.pal.lut, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = col[y * w + (mirror ? w - 1 - x : x)] * 4, o = (y * w + x) * 4;
      data[o] = lut[c]; data[o + 1] = lut[c + 1]; data[o + 2] = lut[c + 2]; data[o + 3] = lut[c + 3];
    }
  }
  return { w, h, data };
}

/** Rasterizes `rig` in `pose` into a `w` x `h` bitmap whose floor-centre is the pixel (`ox`,`oy`). */
function render(rig: Rig, p: RigPose, o: DrawOpts, w: number, h: number, ox: number, oy: number, mirror: boolean): Bitmap {
  const r = new Raster(w, h, rig.palette), pxPerM = rig.frame.h / rig.frame.worldH;
  const b = new Builder(r, pxPerM * DIST, ox, oy);
  b.translate(0, 0, DIST);
  b.pitch(rig.frame.pitch);
  b.yaw(rig.frame.yaw);
  drawFigure(b, rig, p, o);
  finish(r);
  return toBitmap(r, mirror);
}

/** One frame of the monster: the standing frame, or (`crawl`) the shorter one a legless monster's sprite is. */
export function renderBitmap(rig: Rig, p: RigPose, mask: number, crawl: boolean, mirror = false): Bitmap {
  const f = rig.frame, h = crawl ? Math.round(f.h * rig.crawlH) : f.h;
  const floor = p.floor ?? f.floor;
  return render(rig, p, { mask }, f.w, h, f.w / 2 + f.shift * (f.h / f.worldH), h * floor, mirror);
}

/** A torn-off part on its own: `group` only, with its torn end, cropped to what it covers. Returns the bitmap and its size in rig metres. */
export function renderPart(rig: Rig, group: PartGroup): { bmp: Bitmap; mw: number; mh: number } {
  const spec = rig.partSpecs[group as "head" | "lArm" | "rArm" | "legs"], f = rig.frame, pxPerM = f.h / f.worldH;
  const full = render(rig, spec.pose, { mask: 0, only: group, cap: spec.cap }, f.w, f.h, f.w / 2, f.h * f.floor, false);
  let x0 = full.w, y0 = full.h, x1 = -1, y1 = -1;
  for (let y = 0; y < full.h; y++) for (let x = 0; x < full.w; x++) if (full.data[(y * full.w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return { bmp: full, mw: full.w / pxPerM, mh: full.h / pxPerM };
  const w = x1 - x0 + 1, h = y1 - y0 + 1, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) data.set(full.data.subarray(((y + y0) * full.w + x0) * 4, ((y + y0) * full.w + x0 + w) * 4), y * w * 4);
  return { bmp: { w, h, data }, mw: w / pxPerM, mh: h / pxPerM };
}

/**
 * Pixels onto a canvas: one `putImageData` where the context has it (every browser), else a `fillRect` a texel (the test
 * doubles' contexts, which only log calls), runs of an equal colour merged.
 */
function blit(g: CanvasRenderingContext2D, b: Bitmap): void {
  const id = typeof g.createImageData === "function" ? g.createImageData(b.w, b.h) : null;
  if (id && id.data && id.data.length === b.data.length) { id.data.set(b.data); g.putImageData(id, 0, 0); return; }
  const d = b.data;
  for (let y = 0; y < b.h; y++) {
    let x = 0;
    while (x < b.w) {
      const i = (y * b.w + x) * 4;
      let run = 1;
      while (x + run < b.w) {
        const j = i + run * 4;
        if (d[j] !== d[i] || d[j + 1] !== d[i + 1] || d[j + 2] !== d[i + 2] || d[j + 3] !== d[i + 3]) break;
        run++;
      }
      if (d[i + 3] > 0) { g.fillStyle = `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`; g.fillRect(x, y, run, 1); }
      x += run;
    }
  }
}

/** A bitmap as a texture the way the legacy sprites are: hard-edged, no mipmaps. */
export function bitmapTexture(bmp: Bitmap): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = bmp.w; c.height = bmp.h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d context unavailable");
  blit(g, bmp);
  const t = quietly(() => new THREE.CanvasTexture(c));
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

/** A severed part's art, in the form `src/fx/Parts.ts` draws: the crop's size in cells of a nominal `W` x `H` grid over the monster's own sprite. */
export interface RigPartArt { tex: THREE.CanvasTexture; cw: number; ch: number; W: number; H: number }

/** How many poses a role has for a monster whose `mask` has (or has not) its legs. */
export function roleCount(rig: Rig, role: Role): number {
  const v = rig.poses[role];
  return Array.isArray(v) ? v.length : 1;
}

/** A role's `i`th pose (a single-pose role has only 0). */
export function rolePose(rig: Rig, role: Role, i: number): RigPose {
  const v = rig.poses[role];
  return Array.isArray(v) ? v[((i % v.length) + v.length) % v.length] : (v as RigPose);
}

const CRAWL: ReadonlySet<Role> = new Set<Role>(["crawl", "crawlIdle", "crawlAtk", "crawlPain", "crawlDie"]);

/**
 * A monster's baked frames, made on first use and kept. `tex(role, i, mask, mirror)` is the `i`th frame of `role` with the
 * groups of `mask` torn off; asking again returns the same texture.
 */
export class RigSet {
  private frames = new Map<string, THREE.CanvasTexture>();
  private bitmaps = new Map<string, RigPartArt>();
  /** How many frames this set has baked: for the boot-cost and memory counts. */
  baked = 0;
  constructor(readonly rig: Rig) {}

  tex(role: Role, i: number, mask = 0, mirror = false): THREE.CanvasTexture {
    const n = roleCount(this.rig, role), k = ((i % n) + n) % n, id = `${role}${k}:${mask}${mirror ? "m" : ""}`;
    let t = this.frames.get(id);
    if (!t) {
      t = bitmapTexture(renderBitmap(this.rig, rolePose(this.rig, role, k), mask, CRAWL.has(role), mirror));
      this.frames.set(id, t);
      this.baked++;
    }
    return t;
  }

  /** The art of a part that flies off (`head`, `lArm`, `rArm` or `legs`). */
  part(kind: "head" | "lArm" | "rArm" | "legs"): RigPartArt {
    let a = this.bitmaps.get(kind);
    if (!a) {
      const f = this.rig.frame, g = this.rig.regions, { bmp, mw, mh } = renderPart(this.rig, kind);
      const wFrame = f.worldH * (f.w / f.h);
      a = { tex: bitmapTexture(bmp), cw: (mw / wFrame) * g.W, ch: (mh / f.worldH) * g.H, W: g.W, H: g.H };
      this.bitmaps.set(kind, a);
      this.baked++;
    }
    return a;
  }

  /** Every texture baked so far, for disposal and counting. */
  all(): THREE.CanvasTexture[] {
    return [...this.frames.values(), ...[...this.bitmaps.values()].map((v) => v.tex)];
  }
}

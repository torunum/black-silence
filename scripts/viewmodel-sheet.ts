/**
 * Contact sheets of the eight viewmodel weapons, straight from the raster
 * (no browser): `npx vite-node scripts/viewmodel-sheet.ts -- <out-dir> <label> [slot]`.
 *
 * Writes, into <out-dir>:
 * - `<label>-rest.png`   all eight at rest on a 16:9 screen (320x180), 2x;
 * - `<label>-motion.png` one row per weapon: rest, fire at 5% and 50%, reload at 20/45/75%, 1x;
 * - with a slot, `<label>-slot<N>.png`: that weapon alone, at 3x, in all of those poses.
 *
 * Guides: a green cross is the crosshair; a red dotted line is the line of
 * fire (CLEAR_BELOW under the crosshair): nothing of the weapon may rise above it.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WEAPON_ART } from "../src/render/viewmodel/arts";
import { CLEAR_BELOW, renderWeapon } from "../src/render/viewmodel/rig";
import { Raster, RW, RH, toRGBA } from "../src/render/viewmodel/raster";
import { restPose, type Pose } from "../src/render/viewmodel/pose";

const SCREEN_H = 180, TOP0 = SCREEN_H - RH, CY = Math.round((SCREEN_H / 2 - TOP0));
const SHOW_FROM = 55;   // screen rows shown: from here to the bottom edge

function crc32(buf: Uint8Array): number {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), Buffer.from(data)]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w: number, h: number, rgba: Uint8Array): Buffer {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", new Uint8Array(0))]);
}

/** A canvas of RGBA pixels with `put`/`blit` so cells can be tiled into a sheet. */
class Img {
  readonly data: Uint8Array;
  constructor(readonly w: number, readonly h: number, bg = [0, 0, 0, 255]) {
    this.data = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) this.data.set(bg, i * 4);
  }
  put(x: number, y: number, c: number[]): void { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data.set(c, (y * this.w + x) * 4); }
  blit(src: Img, ox: number, oy: number): void {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) this.data.set(src.data.subarray((y * src.w + x) * 4, (y * src.w + x) * 4 + 4), ((oy + y) * this.w + ox + x) * 4);
  }
}

const raster = new Raster();
const rgba = new Uint8ClampedArray(RW * RH * 4);

/** A crop of an image. */
function crop(src: Img, x0: number, y0: number, w: number, h: number): Img {
  const out = new Img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.data.set(src.data.subarray(((y0 + y) * src.w + x0 + x) * 4, ((y0 + y) * src.w + x0 + x) * 4 + 4), (y * w + x) * 4);
  return out;
}

/** One weapon in one pose as a screen cell: 320 x (180 - SHOW_FROM), `scale` times, with the guides. */
function cell(slot: number, pose: Pose, scale: number): Img {
  renderWeapon(raster, WEAPON_ART[slot], pose, RW / 2, CY);
  rgba.fill(0);
  toRGBA(raster, rgba, { x0: 0, y0: 0, x1: RW, y1: RH });
  const h = SCREEN_H - SHOW_FROM;
  const img = new Img(RW * scale, h * scale);
  for (let y = 0; y < h * scale; y++) {
    for (let x = 0; x < RW * scale; x++) {
      const sx = Math.floor(x / scale), sy = Math.floor(y / scale) + SHOW_FROM;   // screen row
      const i = ((sy - TOP0) * RW + sx) * 4;                                      // raster row = screen row - TOP0
      const a = rgba[i + 3];
      const bg = ((sx >> 3) + (sy >> 3)) & 1 ? [58, 58, 66, 255] : [64, 64, 72, 255];
      img.put(x, y, a ? [rgba[i], rgba[i + 1], rgba[i + 2], 255] : bg);
    }
  }
  const mark = (sx: number, sy: number, c: number[]): void => {
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) img.put(sx * scale + dx, (sy - SHOW_FROM) * scale + dy, c);
  };
  const cx = RW / 2;
  for (let d = -5; d <= 5; d++) { if (Math.abs(d) > 1) { mark(cx + d, SCREEN_H / 2, [90, 255, 90, 255]); mark(cx, SCREEN_H / 2 + d, [90, 255, 90, 255]); } }
  const line = Math.round(SCREEN_H / 2 + CLEAR_BELOW * SCREEN_H);
  for (let x = 0; x < RW; x += 4) mark(x, line, [255, 70, 70, 255]);
  return img;
}

const poses = (slot: number): Array<[string, Pose]> => {
  const art = WEAPON_ART[slot];
  const at = (f: (p: Pose) => void): Pose => { const p = restPose(); f(p); return p; };
  return [
    ["rest", restPose()],
    ["fire 5%", at((p) => { p.recoil = 0.9; p.action = art.action(0.05); p.heat = 1; })],
    ["fire 50%", at((p) => { p.recoil = 0.35; p.action = art.action(0.5); p.heat = 0.4; })],
    ["reload 20%", at((p) => { p.reload = 0.2; })],
    ["reload 45%", at((p) => { p.reload = 0.45; })],
    ["reload 75%", at((p) => { p.reload = 0.75; })],
  ];
};

const [outDir = ".superpowers/sdd/2026-10-17-hands-straight", label = "sheet", slotArg] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

// rest sheet: 4 x 2 at 2x
{
  const c0 = cell(0, restPose(), 2), pad = 4;
  const sheet = new Img(4 * (c0.w + pad) + pad, 2 * (c0.h + pad) + pad, [20, 20, 24, 255]);
  for (let s = 0; s < 8; s++) sheet.blit(cell(s, restPose(), 2), pad + (s % 4) * (c0.w + pad), pad + Math.floor(s / 4) * (c0.h + pad));
  writeFileSync(join(outDir, `${label}-rest.png`), png(sheet.w, sheet.h, sheet.data));
}
// motion sheet: 8 rows x 6 columns at 1x
{
  const c0 = cell(0, restPose(), 1), pad = 3;
  const sheet = new Img(6 * (c0.w + pad) + pad, 8 * (c0.h + pad) + pad, [20, 20, 24, 255]);
  for (let s = 0; s < 8; s++) poses(s).forEach(([, p], i) => sheet.blit(cell(s, p, 1), pad + i * (c0.w + pad), pad + s * (c0.h + pad)));
  writeFileSync(join(outDir, `${label}-motion.png`), png(sheet.w, sheet.h, sheet.data));
}
if (slotArg !== undefined) {
  const s = Number(slotArg), ps = poses(s), c0 = cell(s, ps[0][1], 2), pad = 4;
  const sheet = new Img(2 * (c0.w + pad) + pad, 3 * (c0.h + pad) + pad, [20, 20, 24, 255]);
  ps.forEach(([, p], i) => sheet.blit(cell(s, p, 2), pad + (i % 2) * (c0.w + pad), pad + Math.floor(i / 2) * (c0.h + pad)));
  writeFileSync(join(outDir, `${label}-slot${s}.png`), png(sheet.w, sheet.h, sheet.data));
}
if (slotArg !== undefined) {
  // detail: the weapon at 6x in rest, fire 5% and reload 45%, cropped to where it is
  const s = Number(slotArg), ps = poses(s), pick = [ps[0], ps[1], ps[4]], pad = 4, SC = 6;
  const cells = pick.map(([, p]) => crop(cell(s, p, SC), 100 * SC, 40 * SC, 120 * SC, 85 * SC));
  const sheet = new Img(3 * (cells[0].w + pad) + pad, cells[0].h + 2 * pad, [20, 20, 24, 255]);
  cells.forEach((c, i) => sheet.blit(c, pad + i * (c.w + pad), pad));
  writeFileSync(join(outDir, `${label}-detail${s}.png`), png(sheet.w, sheet.h, sheet.data));
}
console.log("wrote sheets to", outDir);

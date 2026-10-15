import * as THREE from "three";
import { PX, texFromPx } from "../enemies/SpriteBaker";
import { HEAD, L_ARM, LEGS, R_ARM } from "../enemies/rig/kit";
import { PXDEF } from "../enemies/pixels/index";
import { quietly } from "./Quiet";

/**
 * THE TEXTURES OF THE GORE (`docs/superpowers/plans/2026-10-08-impact.md`,
 * Task 3): the splat and the streak the blood decals wear, and the parts a
 * monster comes apart into — its head, an arm, its legs — cut out of its
 * own pixel sprite with a wet stump at the torn end.
 *
 * A monster with a rig (`src/enemies/rig/`) has parts of its own, drawn from the
 * skeleton: its head with the neck torn off it, an arm with the shoulder torn
 * off, its legs with the pelvis torn off (`RigSet.part`), and its own crawler
 * (`RigSet.tex("crawl", ..)`) with the stumps at its real joints. `partArt` and
 * `crawlArt` return those for a rigged key and cut the legacy pixel sprite
 * for every other.
 *
 * Nothing here draws from `Math.random()`: the splat's ragged edge is a
 * hash of the pixel, so every run bakes the same textures, and baking one
 * in the middle of a fight (a part's texture is made the first time that
 * monster loses that part) takes nothing from the seeded stream the trace
 * fixtures are recorded under.
 */

/** An integer hash of two coordinates, in [0,1): the textures' own dice. */
export function hash2(x: number, y: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) & 0xffff) / 0x10000;
}

function nearest(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return t;
}

function canvas(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("2d context unavailable");
  return { c, g };
}

let splat: THREE.CanvasTexture | null = null;
let streak: THREE.CanvasTexture | null = null;

/**
 * A splat: a 32x32 ragged blot with satellite drops, white on clear so the
 * decal's instance colour tints it, lighter at the core and darker at the rim
 * so it has some body. Shared by every level (never disposed).
 */
export function splatTexture(): THREE.CanvasTexture {
  if (splat) return splat;
  const { c, g } = canvas(32, 32);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const dx = x - 15.5, dy = y - 15.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      // a radius that wanders with the angle: a few lobes and a ragged edge
      const bucket = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16);
      const r = 8.2 + 3.4 * hash2(bucket, 3) + 1.2 * hash2(x, y) - 1.5 * Math.cos(a * 3 + 1);
      let v = -1;
      if (d < r) v = d < r - 2.4 ? 255 : 170;
      else if (d > 11.5 && d < 15 && hash2(x * 7, y * 5) > 0.965) v = 200;   // a satellite drop
      if (v >= 0) { g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); }
    }
  }
  splat = nearest(c);
  return splat;
}

/** A drip or a smear: a 12x32 streak, round-headed at the top and tapering away, white on clear. */
export function streakTexture(): THREE.CanvasTexture {
  if (streak) return streak;
  const { c, g } = canvas(12, 32);
  for (let y = 0; y < 32; y++) {
    const half = y < 5 ? 2.2 + y * 0.45 : Math.max(0.6, 4.4 - (y - 5) * 0.14);   // a head, then a thinning trail
    for (let x = 0; x < 12; x++) {
      const d = Math.abs(x - 5.5);
      if (d < half - hash2(x, y) * 0.6) { const v = d < half - 1.3 ? 255 : 175; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); }
    }
  }
  streak = nearest(c);
  return streak;
}

export type PartKind = "head" | "lArm" | "rArm" | "legs";

/** How much larger than the monster's own scale a limb is drawn (a head is true size): `Parts.ts` multiplies by it, and a rig's limbs, which are drawn at their true size, are divided by it. */
export const LIMB_SCALE = 1.3;

export interface PartArt {
  tex: THREE.CanvasTexture;
  /** The crop's size in cells of the monster's sprite; the part is drawn at this many cells' worth of the monster's own size. */
  cw: number; ch: number;
  /** Cells in the whole sprite. */
  W: number; H: number;
  /**
   * A rig's part is drawn at its true size, but a part is also a physical thing (it bounces, lies and is kicked, and a kick that lands on one is a hit-stop),
   * and its physics are the legacy crop's: this is that crop's size in cells (the legacy cut of the same part from the PXDEF rows), so a rigged monster's parts
   * fall, rest and are struck exactly where the legacy monster's did and the game's clock does not move. Absent for a part cut from pixel art, which is its own box.
   */
  phys?: { cw: number; ch: number };
}

/** The size in cells of the legacy cut of `kind` from `key`'s PXDEF rows (what `partArt` crops for an unrigged monster): the physical box of a rig's part. */
function legacyBox(key: string, kind: PartKind): { cw: number; ch: number } | undefined {
  const d = PXDEF[key];
  if (!d || kind === "head") return undefined;   // a head's physics never depended on its art (`Parts.ts`)
  const H = d.px.length, W = Math.max(...d.px.map((r) => r.length)), head = d.head || 0;
  const armTop = head, armBot = Math.min(H - 3, head + Math.ceil((H - head) * 0.45));
  if (kind === "lArm") return { cw: Math.ceil(W * 0.32) + 1, ch: armBot - armTop };
  if (kind === "rArm") return { cw: W - (Math.floor(W * 0.68) - 1), ch: armBot - armTop };
  return { cw: W, ch: legRows(H) };
}

const arts = new Map<string, PartArt | null>();

/**
 * The wet red of a stump (two shades) and the white of a bone, added to a monster's palette under keys no sprite uses
 * (a monster's own R, b and d are its flesh, rot and bone, and must stay as they are).
 */
const MEAT = "¢", MEAT_DARK = "£", BONE = "¥";
const CAP: Record<string, string> = { [MEAT]: "#b8341c", [MEAT_DARK]: "#7a190c", [BONE]: "#d8d0b8" };

/** The cells `[x0,x1) x [y0,y1)` of `rows`, as rows of equal width. */
function crop(rows: readonly string[], x0: number, y0: number, x1: number, y1: number): string[] {
  const out: string[] = [];
  for (let y = y0; y < y1; y++) {
    const r = rows[y] ?? "";
    let s = "";
    for (let x = x0; x < x1; x++) s += r[x] ?? " ";
    out.push(s);
  }
  return out;
}

/**
 * Puts a wet stump on the torn edge of a crop: `edge` is which side of the
 * crop the body was joined to. Each row's outermost cell on that side
 * becomes meat; every third row a pale bone shows in it (two cells deep for
 * the head and the legs' cut, which is a flat edge).
 */
function cap(rows: string[], edge: "bottom" | "left" | "right" | "top"): string[] {
  const out = rows.map((r) => r.split(""));
  const h = out.length, w = h ? out[0].length : 0;
  const meat = (x: number, y: number, k: number): string => (hash2(x * 3 + k, y * 5) < 0.5 ? MEAT_DARK : MEAT);
  if (edge === "bottom" || edge === "top") {
    const y = edge === "bottom" ? h - 1 : 0, inner = edge === "bottom" ? h - 2 : 1;
    for (let x = 0; x < w; x++) {
      if (out[y][x] === " " && !(out[inner] && out[inner][x] !== " ")) continue;
      out[y][x] = (x + 1) % 3 === 0 && w > 5 ? BONE : MEAT;
      if (out[inner] && out[inner][x] !== " " && (x + 1) % 3 !== 0) out[inner][x] = meat(x, inner, 1);
    }
  } else {
    const x = edge === "left" ? 0 : w - 1, inner = edge === "left" ? 1 : w - 2;
    for (let y = 0; y < h; y++) {
      const has = out[y][x] !== " " || (out[y][inner] !== undefined && out[y][inner] !== " ");
      if (!has) continue;
      out[y][x] = y % 3 === 1 ? BONE : MEAT;
      if (out[y][inner] !== " " && out[y][inner] !== undefined && y % 3 !== 1) out[y][inner] = meat(inner, y, 2);
    }
  }
  return out.map((r) => r.join(""));
}

/**
 * The art for a monster's severed `kind` (its head, its left or right arm as the *screen* sees them, or its legs),
 * cut from its sprite with a wet stump at the tear; null if the monster has no such part (no head).
 * Baked on first use and kept: a 3x-cell canvas, a few hundred pixels.
 */
export function partArt(key: string, kind: PartKind): PartArt | null {
  const id = key + ":" + kind;
  if (arts.has(id)) return arts.get(id) ?? null;
  const rigSet = PX[key]?.rig;
  if (rigSet) {   // the monster's own part, drawn from its skeleton
    const r = rigSet.part(kind), k = kind === "head" ? 1 : 1 / LIMB_SCALE;
    const own: PartArt = { tex: r.tex, cw: r.cw * k, ch: r.ch * k, W: r.W, H: r.H, phys: legacyBox(key, kind) };
    arts.set(id, own);
    return own;
  }
  const d = PXDEF[key];
  let art: PartArt | null = null;
  if (d) {
    const H = d.px.length, W = Math.max(...d.px.map((r) => r.length));
    const head = d.head || 0;
    const armTop = head, armBot = Math.min(H - 3, head + Math.ceil((H - head) * 0.45));
    let rows: string[] | null = null;
    if (kind === "head" && head > 0) rows = cap(crop(d.px, 0, 0, W, head + 1), "bottom");
    else if (kind === "lArm") rows = cap(crop(d.px, 0, armTop, Math.ceil(W * 0.32) + 1, armBot), "right");
    else if (kind === "rArm") rows = cap(crop(d.px, Math.floor(W * 0.68) - 1, armTop, W, armBot), "left");
    else if (kind === "legs") rows = cap(crop(d.px, 0, H - legRows(H), W, H), "top");
    if (rows && rows.length && rows[0].length) {
      const pal: Record<string, string> = { ...d.pal, ...CAP };
      art = quietly(() => ({ tex: texFromPx(rows, pal), cw: rows[0].length, ch: rows.length, W, H }));
    }
  }
  arts.set(id, art);
  return art;
}

/** The rows of a monster's sprite its legs take (the bottom 28%): what is cut away when they are torn off, and what the severed legs are made of. */
export function legRows(H: number): number { return Math.ceil(H * 0.28); }

/** The sprite of a monster that has lost its legs: the rows above them, as a pair of walk frames (the second is the first mirrored). */
export interface CrawlArt { tex: THREE.CanvasTexture; texB: THREE.CanvasTexture; keep: number; H: number }

const crawls = new Map<string, CrawlArt | null>();

/**
 * A legless monster as it crawls: its upper body (`keep` = the rows above the legs), the hips wet and torn at the bottom,
 * and, if they are gone as well, its arms and its head with a stump where each was. Four variants of arms and one of the head per monster,
 * baked when first needed and kept. (Its hitbox is this much shorter too: `crawlFactor` in `src/enemies/Sever.ts`.)
 */
export function crawlArt(key: string, lArm: boolean, rArm: boolean, noHead: boolean): CrawlArt | null {
  const id = key + ":c" + (lArm ? "L" : "") + (rArm ? "R" : "") + (noHead ? "H" : "");
  if (crawls.has(id)) return crawls.get(id) ?? null;
  const rigSet = PX[key]?.rig;
  if (rigSet) {   // the monster's own crawler: its skeleton without legs, hips torn, and an arm or the head gone as well if they are
    const mask = LEGS | (lArm ? L_ARM : 0) | (rArm ? R_ARM : 0) | (noHead ? HEAD : 0), H = PX[key].regions.H;
    const own: CrawlArt = { tex: rigSet.tex("crawl", 0, mask), texB: rigSet.tex("crawl", 2, mask), keep: H - legRows(H), H };
    crawls.set(id, own);
    return own;
  }
  const d = PXDEF[key];
  let art: CrawlArt | null = null;
  if (d) {
    const H = d.px.length, W = Math.max(...d.px.map((r) => r.length));
    const head = d.head || 0, keep = H - legRows(H);
    const armTop = head, armBot = Math.min(keep, Math.min(H - 3, head + Math.ceil((H - head) * 0.45)));
    const g = d.px.slice(0, keep).map((r) => r.padEnd(W, " ").split(""));
    const clear = (x0: number, x1: number, y0: number, y1: number): void => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g[y][x] = " "; };
    const capCell = (x: number, y: number, bone: boolean): void => { if (g[y]?.[x] !== undefined && g[y][x] !== " ") g[y][x] = bone ? BONE : hash2(x * 3, y * 5) < 0.5 ? MEAT : MEAT_DARK; };
    if (lArm) { const e = Math.ceil(W * 0.32); clear(0, e, armTop, armBot); for (let y = armTop; y < armBot; y++) capCell(e, y, y % 3 === 1); }
    if (rArm) { const e = Math.floor(W * 0.68); clear(e, W, armTop, armBot); for (let y = armTop; y < armBot; y++) capCell(e - 1, y, y % 3 === 1); }
    if (noHead && head > 0) { clear(0, W, 0, head); for (let x = 0; x < W; x++) capCell(x, head, (x + 1) % 3 === 0); }
    for (let x = 0; x < W; x++) capCell(x, keep - 1, (x + 1) % 3 === 0);   // the hips
    const rows = g.map((r) => r.join(""));
    const pal: Record<string, string> = { ...d.pal, ...CAP };
    art = quietly(() => ({ tex: texFromPx(rows, pal), texB: texFromPx(rows, pal, { mirror: true }), keep, H }));
  }
  crawls.set(id, art);
  return art;
}

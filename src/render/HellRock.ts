import { Cells, FIRE, bitmap, fbm, hash, mix, newHit, noise, put, putLit, ramp, smooth, type Bitmap } from "./HellPaint";

/**
 * HELL'S STONE — the painters for the rock, the scorched ground, the cavern's
 * vault, the trim band and the bridge's deck (the prologue's hell rework,
 * `docs/superpowers/plans/2026-10-04-hell-rework.md`). Pure functions from a
 * seed to pixels; `HellTextures.ts` puts them on canvases.
 *
 * What the owner saw before was the reference's brick-and-straight-line
 * texture tiled on every face: a wire fence. These are *cellular*: a jittered
 * lattice of plates (`Cells`), the line between two plates is the crack, and a
 * crack either glows or it does not — decided once per pair of plates, so a
 * fissure runs the whole length of its edge and ends where the rock does,
 * instead of being drawn across the face. Two scales are stacked, big slabs
 * whose edges are the main fissures and smaller plates whose edges are mostly
 * dark seams. The chamfer of every plate is lit from the upper left, which is
 * what gives a plate its bevel at 400 pixels across.
 *
 * Each painter that glows also returns a **glow map**: the cracks alone, on
 * black, which the material wears as an `emissiveMap`. A crack drawn into the
 * colour map alone would be dimmed by the same dark lighting the rock is; in
 * the emissive map it stays hot in the dark, and the fog still takes it.
 *
 * ## Mapping
 * The rock and the ground are mapped in **world space** (`src/world/HellShell.ts`)
 * at 32 texels a unit, the density of every other wall in the game: the rock
 * map covers 8 x 7 units and the ground 8 x 8, and both wrap, so a wall is one
 * unbroken piece of cavern and not a row of 2-unit tiles. Row 0 is the top;
 * the bottom of the rock map is world y = 0, the lava's level, and the cracks
 * are thicker and more of them down there ("fade with height").
 */

/** A colour map and, where the surface glows, the emissive map to go with it. */
export interface Painted { color: Bitmap; glow: Bitmap | null }

/** Toward the light, in texture space (y down): the plates' upper left edges catch it. */
const LX = -.55, LY = -.83;

/**
 * The rock of the cavern's walls and cliffs: 256 x 224 texels, 8 x 7 world units.
 * `seed` gives another, equally good, rock (the shell wears one; a second is
 * kept for the tests and for variety should a face want it).
 */
export function paintRock(seed = 1): Painted {
  const W = 256, H = 224, color = bitmap(W, H), glow = bitmap(W, H);
  const big = new Cells(W, H, 5, 3, seed), mid = new Cells(W, H, 11, 7, seed + 7);
  const hb = newHit(), hm = newHit(), fire = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    // the lattice is read through a warp, large and small, so no edge is a straight line: strata that buckled, not a mosaic
    const wx = (noise(x / 32, y / 32, 8, 7, seed + 60) - .5) * 20 + (noise(x / 8, y / 8, 32, 28, seed + 61) - .5) * 6;
    const wy = (noise(x / 32, y / 32, 8, 7, seed + 62) - .5) * 20 + (noise(x / 8, y / 8, 32, 28, seed + 63) - .5) * 6;
    big.query(x + .5 + wx, y + .5 + wy, hb); mid.query(x + .5 + wx, y + .5 + wy, hm);
    const up = (H - y) / H;                                  // 0 at the lava, 1 at the top of the map
    // the plate: a dark basalt of its own tone, slightly warmer or cooler than its neighbours
    const lum = 14 + hash(hm.id1, 3, seed) * 15 + (hash(hb.id1, 5, seed) - .5) * 8, warm = hash(hm.id1, 9, seed);
    let v = (.5 - fbm(x / 32, y / 32, 8, 7, seed + 30)) * 16 + (hash(x, y, 99) - .5) * 8;
    // bevels: the small plates' edges and the slabs' wider ones, lit from the upper left; a dome across each plate
    if (hm.e < 3.2) v += (hm.nx * LX + hm.ny * LY) * (1 - hm.e / 3.2) * 24;
    if (hb.e < 5) v += (hb.nx * LX + hb.ny * LY) * (1 - hb.e / 5) * 18;
    v += (hm.ox * LX + hm.oy * LY) * .45;
    let k = 1;
    if (hm.e < 1.1) k *= .45;                                // the seam between two plates
    if (hb.e < 2) k *= .55;                                  // and the deeper one between slabs
    if (hash(x, y, seed + 50) < .012) v -= 14;               // pits
    let r = (lum * (.95 + .25 * warm) + v) * k, g = (lum * (.83 + .05 * warm) + v * .85) * k, b = (lum * (.84 - .14 * warm) + v * .8) * k;
    // the fissures: a crack exists for a pair of plates or it does not, and thins out with height
    const wob = noise(x / 8, y / 8, 32, 28, seed + 40);
    let heat = 0, halo = 0;
    const pb = hash(Math.min(hb.id1, hb.id2), Math.max(hb.id1, hb.id2), seed + 3);
    if (pb < .8 * (1 - .75 * up)) {
      const w = (1.5 + 2.2 * wob) * (.6 + .8 * hash(hb.id1 + hb.id2, 1, seed + 4));
      if (hb.e < w) heat = (1 - hb.e / w) * (.35 + .65 * smooth(.18, .4, noise(x / 8, y / 8, 32, 28, seed + 42)));   // a fissure is hot in stretches
      halo = Math.max(halo, 1 - smooth(0, w * 3.2, hb.e));
    }
    const pm = hash(Math.min(hm.id1, hm.id2), Math.max(hm.id1, hm.id2), seed + 5);
    if (pm < .3 * (1 - .8 * up)) {
      const w = .9 + 1.1 * noise(x / 8, y / 8, 32, 28, seed + 41);
      if (hm.e < w) heat = Math.max(heat, (1 - hm.e / w) * .75);
      halo = Math.max(halo, .45 * (1 - smooth(0, w * 2.6, hm.e)));
    }
    heat *= 1 - .4 * up; halo *= 1 - .5 * up;
    if (heat > 0) {
      ramp(FIRE, .15 + .85 * heat, fire);
      const m = smooth(0, .5, heat);
      r = mix(r, fire[0] * .35, m); g = mix(g, fire[1] * .3, m); b = mix(b, fire[2] * .25, m);
    }
    put(color, x, y, r, g, b);
    // the glow map: the crack at full strength, and a dull red spill on the rock beside it
    let gr = 0, gg = 0, gb = 0;
    if (heat > 0) { const e = heat ** .7; gr = fire[0] * e; gg = fire[1] * e; gb = fire[2] * e; }
    if (halo > 0) { const s = halo * .2; gr = Math.max(gr, 200 * s); gg = Math.max(gg, 46 * s); gb = Math.max(gb, 12 * s); }
    putLit(glow, x, y, gr, gg, gb);
  }
  return { color, glow };
}

/**
 * The rock of the dressing: 64 x 64, one tile per face. The cavern's rock (`paintRock`) is mapped 8 x 7 units to
 * a map, which on a 1.7-unit face of an outcrop is a speckle of minified texels; a piece's faces take their
 * UVs 0..1, so the pieces get a tile of their own at their own scale: slabs the size of a hand, cracks that
 * run across them and glow.
 */
export function paintChunk(seed = 31): Painted {
  const N = 64, color = bitmap(N, N), glow = bitmap(N, N);
  const big = new Cells(N, N, 2, 2, seed), mid = new Cells(N, N, 4, 4, seed + 7);
  const hb = newHit(), hm = newHit(), fire = [0, 0, 0];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const wx = (noise(x / 16, y / 16, 4, 4, seed + 60) - .5) * 8, wy = (noise(x / 16, y / 16, 4, 4, seed + 62) - .5) * 8;
    big.query(x + .5 + wx, y + .5 + wy, hb); mid.query(x + .5 + wx, y + .5 + wy, hm);
    const lum = 14 + hash(hm.id1, 3, seed) * 15, warm = hash(hm.id1, 9, seed);
    let v = (.5 - fbm(x / 16, y / 16, 4, 4, seed + 30)) * 12 + (hash(x, y, 96) - .5) * 7;
    if (hm.e < 2.4) v += (hm.nx * LX + hm.ny * LY) * (1 - hm.e / 2.4) * 16;
    let k = 1;
    if (hm.e < 1) k *= .45;
    if (hb.e < 1.6) k *= .55;
    let r = (lum * (.95 + .25 * warm) + v) * k, g = (lum * (.83 + .05 * warm) + v * .85) * k, b = (lum * (.84 - .14 * warm) + v * .8) * k;
    let heat = 0, halo = 0;
    const pb = hash(Math.min(hb.id1, hb.id2), Math.max(hb.id1, hb.id2), seed + 3);
    if (pb < .6) { const w = 1.3 + 1.4 * noise(x / 4, y / 4, 16, 16, seed + 40); if (hb.e < w) heat = 1 - hb.e / w; halo = 1 - smooth(0, w * 3, hb.e); }
    const pm = hash(Math.min(hm.id1, hm.id2), Math.max(hm.id1, hm.id2), seed + 5);
    if (pm < .2) { const w = .8 + .8 * noise(x / 4, y / 4, 16, 16, seed + 41); if (hm.e < w) heat = Math.max(heat, (1 - hm.e / w) * .7); }
    if (heat > 0) { ramp(FIRE, .15 + .85 * heat, fire); const m = smooth(0, .5, heat); r = mix(r, fire[0] * .35, m); g = mix(g, fire[1] * .3, m); b = mix(b, fire[2] * .25, m); }
    put(color, x, y, r, g, b);
    let gr = 0, gg = 0, gb = 0;
    if (heat > 0) { const e = heat ** .7; gr = fire[0] * e; gg = fire[1] * e; gb = fire[2] * e; }
    if (halo > 0) { const s = halo * .18; gr = Math.max(gr, 200 * s); gg = Math.max(gg, 46 * s); gb = Math.max(gb, 12 * s); }
    putLit(glow, x, y, gr, gg, gb);
  }
  return { color, glow };
}

/**
 * The scorched ground of the banks: 256 x 256 texels, 8 x 8 world units.
 * Charred plates, ash blown into drifts, crazing that is only a seam and a few
 * cracks with the fire still in them, and embers in the ash.
 */
export function paintScorch(seed = 11): Painted {
  const W = 256, H = 256, color = bitmap(W, H), glow = bitmap(W, H);
  const big = new Cells(W, H, 5, 5, seed), mid = new Cells(W, H, 10, 10, seed + 7);
  const hb = newHit(), hm = newHit(), fire = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = (noise(x / 32, y / 32, 8, 8, seed + 60) - .5) * 22 + (noise(x / 8, y / 8, 32, 32, seed + 61) - .5) * 6;
    const wy = (noise(x / 32, y / 32, 8, 8, seed + 62) - .5) * 22 + (noise(x / 8, y / 8, 32, 32, seed + 63) - .5) * 6;
    big.query(x + .5 + wx, y + .5 + wy, hb); mid.query(x + .5 + wx, y + .5 + wy, hm);
    const lum = 10 + hash(hm.id1, 3, seed) * 11 + (hash(hb.id1, 5, seed) - .5) * 4;
    let v = (.5 - fbm(x / 32, y / 32, 8, 8, seed + 30)) * 14 + (hash(x, y, 98) - .5) * 7;
    if (hm.e < 2.6) v += (hm.nx * LX + hm.ny * LY) * (1 - hm.e / 2.6) * 13;
    if (hb.e < 4) v += (hb.nx * LX + hb.ny * LY) * (1 - hb.e / 4) * 12;
    let k = 1;
    if (hm.e < 1.3) k *= .4;
    if (hb.e < 2.2) k *= .55;
    let r = (lum * 1.12 + v) * k, g = (lum * .86 + v * .85) * k, b = (lum * .76 + v * .8) * k;
    // ash: drifts where a slow noise is high, speckled so they are grain, not a wash
    const drift = smooth(.55, .78, fbm(x / 32, y / 32, 8, 8, seed + 31));
    if (drift > 0 && hash(x, y, seed + 32) < drift * .45) { const a = 30 + hash(x, y, seed + 33) * 20; r = mix(r, a, .6); g = mix(g, a * .92, .6); b = mix(b, a * .86, .6); }
    // the cracks that still burn
    const wob = noise(x / 8, y / 8, 32, 32, seed + 40);
    let heat = 0, halo = 0;
    const pb = hash(Math.min(hb.id1, hb.id2), Math.max(hb.id1, hb.id2), seed + 3);
    if (pb < .26) { const w = 1.3 + 1.7 * wob; if (hb.e < w) heat = (1 - hb.e / w) * (.3 + .7 * smooth(.2, .45, noise(x / 8, y / 8, 32, 32, seed + 42))); halo = 1 - smooth(0, w * 2.8, hb.e); }
    const pm = hash(Math.min(hm.id1, hm.id2), Math.max(hm.id1, hm.id2), seed + 5);
    if (pm < .07) { const w = .8 + 1.0 * noise(x / 8, y / 8, 32, 32, seed + 41); if (hm.e < w) heat = Math.max(heat, (1 - hm.e / w) * .7); halo = Math.max(halo, .4 * (1 - smooth(0, w * 2.4, hm.e))); }
    const ember = hash(x, y, seed + 60) < .0014;
    if (ember) heat = 1;
    if (heat > 0) {
      ramp(FIRE, .1 + .75 * heat, fire);
      const m = smooth(0, .5, heat);
      r = mix(r, fire[0] * .3, m); g = mix(g, fire[1] * .25, m); b = mix(b, fire[2] * .2, m);
    }
    put(color, x, y, r, g, b);
    let gr = 0, gg = 0, gb = 0;
    if (heat > 0) { const e = heat ** .8 * .62; gr = fire[0] * e; gg = fire[1] * e; gb = fire[2] * e; }
    if (halo > 0) { const s = halo * .13; gr = Math.max(gr, 200 * s); gg = Math.max(gg, 44 * s); gb = Math.max(gb, 10 * s); }
    putLit(glow, x, y, gr, gg, gb);
  }
  return { color, glow };
}

/** The cavern's vault: 64 x 64, tiled per cell, very dark rock with a few cracks that still smoulder. Also the riser stone between two ceilings. */
export function paintVault(seed = 21): Painted {
  const N = 64, color = bitmap(N, N), glow = bitmap(N, N);
  const big = new Cells(N, N, 2, 2, seed), mid = new Cells(N, N, 5, 5, seed + 7);
  const hb = newHit(), hm = newHit(), fire = [0, 0, 0];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    big.query(x + .5, y + .5, hb); mid.query(x + .5, y + .5, hm);
    const lum = 9 + hash(hm.id1, 3, seed) * 9;
    let v = (.5 - fbm(x / 16, y / 16, 4, 4, seed + 30)) * 10 + (hash(x, y, 97) - .5) * 6;
    if (hm.e < 2.4) v += (hm.nx * LX + hm.ny * LY) * (1 - hm.e / 2.4) * 10;
    let k = 1;
    if (hm.e < 1) k *= .5;
    if (hb.e < 1.6) k *= .6;
    let r = (lum * 1.1 + v) * k, g = (lum * .85 + v * .85) * k, b = (lum * .8 + v * .8) * k;
    let heat = 0;
    const pb = hash(Math.min(hb.id1, hb.id2), Math.max(hb.id1, hb.id2), seed + 3);
    if (pb < .1) { const w = 1.3 + 1.2 * noise(x / 4, y / 4, 16, 16, seed + 40); if (hb.e < w) heat = 1 - hb.e / w; }
    if (heat > 0) { ramp(FIRE, .05 + .5 * heat, fire); r = mix(r, fire[0] * .3, .7); g = mix(g, fire[1] * .25, .7); b = mix(b, fire[2] * .2, .7); }
    put(color, x, y, r, g, b);
    const e = heat > 0 ? heat * .3 : 0;
    putLit(glow, x, y, heat > 0 ? fire[0] * e : 0, heat > 0 ? fire[1] * e : 0, heat > 0 ? fire[2] * e : 0);
  }
  return { color, glow };
}

/**
 * The trim band hell's courses wear (`BandTextures.ts` says what a course samples: six rows of
 * 64, every row the same, so no vertical structure): blocks of charred basalt a unit long, a
 * dark joint between them, one block a shade off the next.
 */
export function paintBand(): Painted {
  const N = 64, color = bitmap(N, N);
  for (let x = 0; x < N; x++) {
    const joint = x % 32 < 2, block = Math.floor(x / 32), tone = joint ? 0 : (hash(block, 0, 31) - .5) * 9;
    for (let y = 0; y < N; y++) {
      const f = (hash(x, y, 32) - .5) * 8;
      if (joint) put(color, x, y, 17 + f * .4, 12 + f * .3, 12 + f * .3);
      else put(color, x, y, 40 + tone + f, 32 + tone + f * .9, 30 + tone + f * .85);
    }
  }
  return { color, glow: null };
}

/** The bridge's deck: two long slabs of dressed stone, blackened by the fire under them, hair cracks with the glow still in them. */
export function paintBridge(): Painted {
  const N = 64, color = bitmap(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const slab = x < N / 2 ? 0 : 1, fine = hash(x, y, 41) - .5, tone = (hash(slab, y >> 4, 42) - .5) * 9;
    const worn = Math.max(0, 1 - Math.abs(y - N / 2) / (N * .3)) * 9;
    const soot = Math.max(0, 1 - Math.min(y, N - 1 - y) / 8) * 22;
    const joint = x === 0 || x === N / 2 - 1 || x === N / 2;
    if (joint) { put(color, x, y, 16, 12, 11); continue; }
    put(color, x, y, 60 + tone + worn - soot + fine * 10, 50 + tone + worn - soot * 1.1 + fine * 9, 44 + tone + worn - soot * 1.2 + fine * 8);
  }
  for (let i = 0; i < 5; i++) {     // hair cracks, running down the slab with the fire in them
    let x = hash(i, 1, 43) * N, y = hash(i, 2, 43) * N;
    for (let j = 0; j < 12; j++) {
      const px = Math.floor(x) & (N - 1), py = Math.floor(y) & (N - 1);
      put(color, px, py, 190 - j * 6, 70 - j * 3, 14);
      x += hash(i, j, 44) < .5 ? 1 : 0; y += 1;
    }
  }
  return { color, glow: null };
}

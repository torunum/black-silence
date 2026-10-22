import * as THREE from "three";
import { makeTex } from "./ProcTextures";
import { grain } from "./BandTextures";

/**
 * THE EXIT DOORS' SURFACES — the leaves and light of the great doors that
 * end and begin a level (`src/world/DoorKit.ts`, the transitions plan
 * `docs/superpowers/plans/2026-10-05-transitions.md`).
 *
 * A registry of its own, `DOORTEX`, for the reason `HellTextures.ts` gives
 * for `HELLTEX`: the reference's `TEX` key set is pinned to the frozen file
 * and `buildTextures` is pinned call for call to its draws on the seeded
 * `Math.random`. These are painted from `grain`, an integer hash of the
 * texel's coordinates and a seed, so building them takes not one draw from
 * the stream the traces seed. `tests/integration/gameplayTrace.ts` names
 * them `door.<key>` in the scene digest, an eighth source after the seven
 * before it, so nothing already named is renamed.
 *
 * - `church`, `crypt`, `tomb`, `sluice`, `freight` — a leaf each (the doors
 *   of the church, the crypt slab, the tomb's black basalt, the sewer's
 *   riveted bulkhead, the factory's corrugated freight door);
 * - `hazard` — the freight door's yellow-and-black lintel;
 * - `glow` — a soft white bloom, brightest at the middle, which the door
 *   tints with its own colour and lays additively over the dark beyond it
 *   (the way on) and over the floor in front of it (the lit threshold);
 * - `sigil` — the tomb's carved mark on a black ground, the one part of a
 *   door that is drawn glowing even when the gate is shut.
 *
 * And since 2026-10-21 (owner: "kapıları yeniden yapabilirsin"), the leaves of the doors inside a level and of the new ways between
 * them (`src/world/LevelDoors.ts`, `src/world/GateKit.ts`, `src/world/HatchKit.ts`):
 * - `oak` — a plain door: worn oak planks, two long iron strap hinges with their nails, a darker foot where hands and boots wore it;
 * - `ironLeaf` — the locked door: riveted black iron plates and a red-painted lock plate with its keyhole (the red of the red key);
 * - `gate` — the great gate's leaf: thick oak boards, a diagonal brace, four rows of iron studs;
 * - `slab` — a crypt floor slab: grey flagstone, a carved cross, a chiselled border.
 */

export type DoorTexKey = "church" | "crypt" | "tomb" | "sluice" | "freight" | "hazard" | "glow" | "sigil" | "oak" | "ironLeaf" | "gate" | "slab";

export const DOORTEX: Partial<Record<DoorTexKey, THREE.CanvasTexture>> = {};

type Rgba = readonly [number, number, number, number?];

/** A canvas painted texel by texel from `at(x, y)`. */
function paint(w: number, h: number, at: (x: number, y: number) => Rgba): THREE.CanvasTexture {
  return makeTex((g) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const [r, gg, b, a = 1] = at(x, y);
        g.fillStyle = a >= 1 ? `rgb(${r | 0},${gg | 0},${b | 0})` : `rgba(${r | 0},${gg | 0},${b | 0},${a.toFixed(3)})`;
        g.fillRect(x, y, 1, 1);
      }
    }
  }, w, h);
}

const noise = (x: number, y: number, seed: number, amp: number): number => (grain(x, y, seed) - .5) * amp;
const shade = (c: readonly [number, number, number], v: number): Rgba => [c[0] + v, c[1] + v, c[2] + v];

/** Dark upright planks with three gilt straps and their studs. */
function church(): THREE.CanvasTexture {
  const W = 32, H = 96;
  return paint(W, H, (x, y) => {
    const plank = Math.floor(x / 8), seam = x % 8 === 0;
    const strap = [14, 47, 82].some((s) => y >= s && y < s + 6);
    const stud = strap && x % 8 === 4 && [16, 49, 84].includes(y);
    if (stud) return [214, 196, 120];
    if (strap) return shade([142, 120, 62], noise(x, y, 41, 16));
    if (seam) return [14, 9, 8];
    return shade([52 + (grain(plank, 0, 43) - .5) * 12, 32, 22], noise(x, y, 44, 14) + (grain(plank, y >> 3, 45) - .5) * 8);
  });
}

/** A slab of grey-green stone, a cross cut into it, and rust at two iron bands. */
function crypt(): THREE.CanvasTexture {
  const W = 64, H = 96;
  return paint(W, H, (x, y) => {
    const band = (y >= 20 && y < 25) || (y >= 70 && y < 75);
    if (band) return shade([84, 52, 32], noise(x, y, 51, 22));
    const cross = (x >= 29 && x < 35 && y >= 30 && y < 66) || (y >= 40 && y < 46 && x >= 20 && x < 44);
    const moss = grain(x >> 2, y >> 2, 52) > .8 && y > 50;
    let v = noise(x, y, 53, 18) + (grain(x >> 3, y >> 3, 54) - .5) * 14;
    if (cross) v -= 26;
    return moss ? [44 + v, 62 + v, 40 + v] : [88 + v, 94 + v, 90 + v];
  });
}

/** Black basalt, a seam up the middle and veins of a lighter stone. */
function tomb(): THREE.CanvasTexture {
  const W = 32, H = 96;
  return paint(W, H, (x, y) => {
    if (x === 0) return [4, 4, 6];
    const vein = grain(x >> 1, y >> 3, 61) > .86;
    return shade([22, 22, 28], noise(x, y, 62, 10) + (vein ? 16 : 0));
  });
}

/** The tomb's mark: a ring and a downward stroke, light on black. */
function sigil(): THREE.CanvasTexture {
  const S = 32;
  return paint(S, S, (x, y) => {
    const dx = x - 15.5, dy = y - 12, r = Math.hypot(dx, dy);
    const ring = r > 7 && r < 9.2;
    const stroke = Math.abs(dx) < 1.3 && y > 12 && y < 29;
    const bar = Math.abs(y - 21) < 1.2 && Math.abs(dx) < 6;
    return ring || stroke || bar ? [255, 255, 255, 1] : [0, 0, 0, 1];
  });
}

/** A riveted steel bulkhead, rust running from every rivet. */
function sluice(): THREE.CanvasTexture {
  const W = 64, H = 96;
  return paint(W, H, (x, y) => {
    const rivet = x % 12 === 6 && (y % 12 === 6);
    const edge = x < 3 || x >= W - 3 || y < 3 || y >= H - 3;
    const run = rivet || (x % 12 === 6 && y % 12 > 6 && grain(x, y >> 2, 71) > .55);
    let c: [number, number, number] = [58, 74, 68];
    if (edge) c = [38, 48, 44];
    const v = noise(x, y, 72, 14);
    if (rivet) return [118 + v, 130 + v, 124 + v];
    if (run && !edge) return [86 + v, 56 + v, 34 + v];
    return [c[0] + v, c[1] + v, c[2] + v];
  });
}

/** Corrugated steel: horizontal ribs, dust gathered in the troughs. */
function freight(): THREE.CanvasTexture {
  const W = 32, H = 64;
  return paint(W, H, (x, y) => {
    const rib = y % 8;
    const base = rib < 2 ? 40 : rib < 5 ? 108 : 78;
    return shade([base * .92, base * .9, base * .82], noise(x, y, 81, 12));
  });
}

/** Diagonal yellow and black, the way a lintel warns. */
function hazard(): THREE.CanvasTexture {
  const W = 64, H = 16;
  return paint(W, H, (x, y) => ((x + y) >> 3) % 2 === 0
    ? shade([188, 150, 30], noise(x, y, 91, 14)) : shade([20, 18, 14], noise(x, y, 92, 8)));
}

/** A soft bloom: white in the middle, falling to nothing at the edge. */
function glow(): THREE.CanvasTexture {
  const S = 32;
  return paint(S, S, (x, y) => {
    const d = Math.hypot((x - 15.5) / 16, (y - 15.5) / 16);
    const a = Math.max(0, 1 - d);
    return [255, 255, 255, a * a];
  });
}

/** Worn oak planks, two strap hinges nailed across them, the foot of the door darker. */
function oak(): THREE.CanvasTexture {
  const W = 32, H = 64;
  return paint(W, H, (x, y) => {
    const plank = Math.floor(x / 8), seam = x % 8 === 0;
    const strap = (y >= 9 && y < 13) || (y >= 50 && y < 54);
    const strapEnd = strap && x > 26;
    const nail = strap && x % 6 === 3 && (y === 11 || y === 52);
    if (nail) return [150, 150, 146];
    if (strap) return shade(strapEnd ? [44, 40, 36] : [36, 34, 32], noise(x, y, 101, 14));
    if (seam) return [18, 11, 7];
    const foot = y > 56 ? -14 : 0;
    const knot = grain(x >> 1, y >> 2, 102 + plank) > .93 ? -18 : 0;
    return shade([96 + (grain(plank, 0, 103) - .5) * 18, 66, 40], noise(x, y, 104, 16) + (grain(plank, y >> 2, 105) - .5) * 10 + foot + knot);
  });
}

/** Riveted black iron plates, and the red lock plate with its keyhole. */
function ironLeaf(): THREE.CanvasTexture {
  const W = 32, H = 64;
  return paint(W, H, (x, y) => {
    const plateEdge = y % 16 === 0 || x === 0 || x === W - 1;
    const rivet = (x % 8 === 4) && (y % 16 === 3 || y % 16 === 13);
    const lock = x >= 19 && x < 29 && y >= 27 && y < 39;
    const hole = (Math.hypot(x - 24, y - 31) < 1.6) || (x >= 23 && x < 25 && y >= 31 && y < 36);
    if (lock) return hole ? [6, 4, 4] : shade([150, 40, 28], noise(x, y, 111, 18));
    if (rivet) return [92, 96, 102];
    if (plateEdge) return [12, 12, 14];
    return shade([38, 38, 42], noise(x, y, 112, 12) + (grain(x >> 3, y >> 4, 113) - .5) * 10);
  });
}

/** The great gate: thick boards, a diagonal brace from corner to corner, four rows of iron studs. */
function gate(): THREE.CanvasTexture {
  const W = 32, H = 96;
  return paint(W, H, (x, y) => {
    const board = Math.floor(x / 6.4), seam = Math.floor(x % 6.4) === 0;
    const rail = [6, 46, 86].some((r) => y >= r && y < r + 5);
    const brace = Math.abs((y - 11) - (x * 35 / 32)) < 2.2 || Math.abs((y - 51) - (x * 35 / 32)) < 2.2;
    const stud = (x % 8 === 4) && [8, 48, 88, 28, 68].includes(y);
    if (stud) return [176, 170, 156];
    if (rail) return shade([40, 38, 36], noise(x, y, 121, 12));
    if (brace) return shade([70, 44, 26], noise(x, y, 122, 16));
    if (seam) return [16, 10, 6];
    return shade([84 + (grain(board, 0, 123) - .5) * 16, 56, 34], noise(x, y, 124, 16) + (grain(board, y >> 3, 125) - .5) * 10);
  });
}

/** A crypt's floor slab: grey flagstone with a chiselled border and a cross cut into it. */
function slabTex(): THREE.CanvasTexture {
  const S = 64;
  return paint(S, S, (x, y) => {
    const border = x < 4 || y < 4 || x >= S - 4 || y >= S - 4;
    const groove = x === 7 || y === 7 || x === S - 8 || y === S - 8;
    const cross = (Math.abs(x - 31.5) < 3 && y > 14 && y < 52) || (Math.abs(y - 26) < 3 && x > 19 && x < 44);
    let v = noise(x, y, 131, 16) + (grain(x >> 3, y >> 3, 132) - .5) * 14;
    if (groove || cross) v -= 30;
    if (border) v -= 8;
    return [104 + v, 104 + v, 100 + v];
  });
}

/** Builds every door texture into `DOORTEX`. Called once at boot, by `startGame`, beside `buildHellTextures`. */
export function buildDoorTextures(): void {
  DOORTEX.church = church();
  DOORTEX.crypt = crypt();
  DOORTEX.tomb = tomb();
  DOORTEX.sluice = sluice();
  DOORTEX.freight = freight();
  DOORTEX.hazard = hazard();
  DOORTEX.glow = glow();
  DOORTEX.sigil = sigil();
  DOORTEX.oak = oak();
  DOORTEX.ironLeaf = ironLeaf();
  DOORTEX.gate = gate();
  DOORTEX.slab = slabTex();
}

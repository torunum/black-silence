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
 */

export type DoorTexKey = "church" | "crypt" | "tomb" | "sluice" | "freight" | "hazard" | "glow" | "sigil";

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
}

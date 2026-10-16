// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { PXDEF } from "../../src/enemies/pixels";
import { PX, buildSprites } from "../../src/enemies/SpriteBaker";
import { RIGS } from "../../src/enemies/rig";
import { burnLegacySpriteDraws, legacyDraws } from "../../src/enemies/rig/legacyDraws";

/**
 * THE SHIM (enemies plan, Task 1, Global Constraints "Boot draws").
 *
 * `buildSprites` draws from `Math.random` at boot — stump colours in
 * `texFromPx` and three.js's uuids — and every trace fixture is recorded under
 * a seeded `Math.random`, so the dice the game rolls after boot are the dice
 * that come after those draws. A creature baked from a rig draws none
 * (`quietly`); `burnLegacySpriteDraws` consumes exactly what its legacy bake
 * would have, so no fixture's gameplay moves.
 *
 * What is held here, measured and not assumed:
 * 1. for every creature in PXDEF, the count `legacyDraws` derives from its rows
 *    equals what the real legacy bake draws (the real `buildSprites`, with the
 *    rigs out of the way and every other creature out of the loop), stump draws
 *    and uuid draws counted apart;
 * 2. `buildSprites` as the game runs it draws, in all, exactly what the all-legacy
 *    bake drew: the stream after boot is where it always was;
 * 3. the rig itself draws nothing, baking its variants included.
 */

/** Runs `fn` with `Math.random` counting its calls; returns how many came from `generateUUID` and how many from anywhere else. */
function countDraws(fn: () => void): { uuid: number; other: number } {
  const real = Math.random;
  let uuid = 0, other = 0;
  Math.random = (): number => {
    if (new Error().stack?.includes("generateUUID")) uuid++; else other++;
    return real();
  };
  try { fn(); } finally { Math.random = real; }
  return { uuid, other };
}

const rigs = RIGS as Record<string, (typeof RIGS)[string] | undefined>;
let saved: Record<string, (typeof RIGS)[string]>;
beforeAll(() => { installDomStubs(); saved = { ...RIGS }; });
afterEach(() => { for (const k of Object.keys(saved)) rigs[k] = saved[k]; });

/** The real legacy bake of just `key`: the rigs lifted out, every other creature taken out of PXDEF for the call. */
function legacyBakeOf(key: string): { uuid: number; other: number } {
  const all = { ...PXDEF };
  const rest = Object.keys(PXDEF).filter((k) => k !== key);
  const lifted = { ...saved };
  for (const k of Object.keys(lifted)) delete rigs[k];
  for (const k of rest) delete PXDEF[k];
  try { return countDraws(() => buildSprites()); }
  finally { for (const k of rest) PXDEF[k] = all[k]; for (const k of Object.keys(lifted)) rigs[k] = lifted[k]; }
}

describe("legacyDraws derives what the legacy bake draws", () => {
  it.each(Object.keys(PXDEF))("%s: the stump draws and the uuid draws, measured against the real bake", (key) => {
    const measured = legacyBakeOf(key), derived = legacyDraws(PXDEF[key]);
    expect(measured.other, `${key}: Math.random calls outside generateUUID`).toBe(derived.stumps);
    expect(measured.uuid, `${key}: Math.random calls inside generateUUID (four per uuid, two uuids a texture)`).toBe(derived.textures * 8);
  });

  // the numbers the shim burns for each re-rigged creature (stump colours; textures x 8 uuid draws), derived from the rows and held here so that a change to a row or a rig's key is seen
  it.each([["z", 52, 17], ["t", 88, 17], ["f", 60, 17], ["m", 48, 17], ["s", 64, 17], ["g", 20, 15], ["w", 36, 15],
    ["j", 60, 14], ["L", 36, 15], ["C", 52, 15], ["n", 60, 14], ["k", 52, 14], ["y", 32, 12], ["R", 24, 12]] as const)("%s: %i stump draws and %i textures (the shim's count)", (key, stumps, textures) => {
    expect(legacyDraws(PXDEF[key])).toEqual({ stumps, textures });
    expect(Object.keys(RIGS), "and it is a rig").toContain(key);
  });
  it("every creature with a rig is in that table", () => { expect(Object.keys(RIGS).sort()).toEqual(["C", "L", "R", "f", "g", "j", "k", "m", "n", "s", "t", "w", "y", "z"]); });
});

describe("burnLegacySpriteDraws consumes exactly that", () => {
  it.each(Object.keys(RIGS))("%s: the burn draws what its legacy bake drew, to the draw", (key) => {
    const measured = legacyBakeOf(key);
    const burned = countDraws(() => burnLegacySpriteDraws(PXDEF[key]));
    expect(burned).toEqual(measured);
  });
});

describe("buildSprites with the rigs in draws exactly what it drew with none", () => {
  it("the whole boot: the same number of draws from the same two sources", () => {
    const lifted = { ...saved };
    for (const k of Object.keys(lifted)) delete rigs[k];
    const legacy = countDraws(() => buildSprites());
    for (const k of Object.keys(lifted)) rigs[k] = lifted[k];
    const now = countDraws(() => buildSprites());
    expect(now).toEqual(legacy);
    expect(PX.z.rig, "and the ghoul is the rig's").toBeTruthy();
  });

  it.each(Object.keys(RIGS))("%s: the rig's own bake draws nothing: its eager frames, every dismembered variant, its parts and its crawler", async (key) => {
    const { rigSprite } = await import("../../src/enemies/rig/sprite");
    const { LEGS, HEAD, L_ARM, R_ARM } = await import("../../src/enemies/rig/kit");
    const d = countDraws(() => {
      const s = rigSprite(RIGS[key]);
      const set = s.rig!;
      for (const m of [0, HEAD, L_ARM, R_ARM, L_ARM | R_ARM, LEGS, LEGS | HEAD, LEGS | L_ARM | R_ARM]) {
        set.tex(m & LEGS ? "crawl" : "walk", 1, m);
        set.tex(m & LEGS ? "crawlDie" : "die", 3, m, true);
      }
      for (const k of ["head", "lArm", "rArm", "legs"] as const) set.part(k);
      void s.noHead; void s.gibbed; void s.noLegsB;
    });
    expect(d).toEqual({ uuid: 0, other: 0 });
  });
});


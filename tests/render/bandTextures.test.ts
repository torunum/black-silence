// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { recordingCanvas, installRecordingGetContext, type DrawCall } from "../support/recordingCanvas";
import { seedRandom } from "../support/seededRandom";
import { BANDTEX, BAND_SPECS, bandFor, bandTheme, buildBandTextures, type BandTheme } from "../../src/render/BandTextures";
import { TEX, buildTextures } from "../../src/render/ProcTextures";
import { LEVELS } from "../../src/world/levels/index";

/**
 * The trim bands (`src/render/BandTextures.ts`): one plain dressed-stone
 * texture per wall theme, for the wall courses.
 *
 * The property that matters most here is invisible on screen: the bands are
 * built at boot, inside the window where the trace harness has already
 * seeded `Math.random`, so a band that drew even once from it would shift
 * every gameplay draw after it and move every trace fixture's camera and
 * HUD. These cases pin that from both sides — the pattern does not depend
 * on the stream, and the build does not consume it — so the regression is
 * caught here, by name, rather than as an unexplained fixture divergence.
 *
 * What these cases cannot establish is whether the bands *look* right; that
 * verdict comes from matched before/after frames in a real browser (see
 * `.superpowers/sdd/2026-09-24-trim-finished/task-2-report.md`).
 */

const THEMES = Object.keys(BAND_SPECS) as BandTheme[];

function recordBuild(seed: number): DrawCall[] {
  const { ctx, calls } = recordingCanvas();
  const restoreGetContext = installRecordingGetContext(ctx, calls);
  const restoreRandom = seedRandom(seed);
  try {
    buildBandTextures();
  } finally {
    restoreRandom();
    restoreGetContext();
  }
  return calls;
}

/** TEX's keys as `buildTextures` alone leaves them — captured before any band is built in this file. */
let texKeys: string[] = [];

beforeAll(() => {
  installDomStubs();
  buildTextures();
  texKeys = Object.keys(TEX).sort();
});

describe("the trim bands are deterministic", () => {
  it("draws the same canvas calls whatever Math.random is seeded with", () => {
    // MUTATION TARGET: take the grain or the block tone from Math.random
    // (or rnd/noiseFill) instead of `grain`, and the two logs diverge.
    const a = recordBuild(1);
    const b = recordBuild(987654321);
    expect(a.length, "a recorder that logged nothing proves nothing").toBeGreaterThan(4 * 64 * 64);
    expect(b).toEqual(a);
  });

  it("takes no draw from Math.random except three's own texture UUIDs", () => {
    // The same stack test gameplayTrace.ts's installUuidStub uses: a
    // `generateUUID` frame is three constructing the texture, which the
    // trace harness already keeps out of the seeded stream. Anything else is
    // this module consuming the gameplay stream at boot.
    const real = Math.random;
    let uuid = 0, other = 0;
    Math.random = () => {
      if (new Error().stack?.includes("generateUUID")) uuid++;
      else other++;
      return real();
    };
    try {
      buildBandTextures();
    } finally {
      Math.random = real;
    }
    expect(uuid, "the UUID check stopped matching — this case would pass while looking at nothing").toBeGreaterThan(0);
    expect(other).toBe(0);
  });
});

describe("the registry", () => {
  it("builds one band per theme, at the wall textures' size and filtering", () => {
    buildBandTextures();
    expect(Object.keys(BANDTEX).sort()).toEqual([...THEMES].sort());
    for (const theme of THEMES) {
      const t = BANDTEX[theme]!;
      // 64 x 64 like every wall texture, so the course keeps the wall's
      // texel density (Trim.ts maps it at 64 texels per WALLH).
      expect(t.image.width, theme).toBe(TEX.hellWall.image.width);
      expect(t.image.height, theme).toBe(TEX.hellWall.image.height);
      expect(t.magFilter, `${theme} magFilter`).toBe(1003); // THREE.NearestFilter
      expect(t.minFilter, `${theme} minFilter`).toBe(1003);
      expect(t.wrapS, `${theme} wrapS`).toBe(1000);         // THREE.RepeatWrapping
      expect(t.wrapT, `${theme} wrapT`).toBe(1000);
      expect(Object.values(TEX), `${theme} is not a wall texture`).not.toContain(t);
    }
  });

  it("leaves TEX's key set alone — the bands are not reference textures", () => {
    // tests/fidelity.test.ts holds TEX's keys equal to the frozen
    // reference's — but only after buildTextures alone, so it would never
    // see a band registered into TEX at boot. Compared here against the key
    // set buildTextures left before any band existed.
    buildBandTextures();
    expect(Object.keys(TEX).sort()).toEqual(texKeys);
  });

  it("gives each level the band of the wall theme loadLevel gives it", () => {
    // Re-derived from the level flags here, in loadLevel's own order
    // (hell, then flesh, then dungeon, else church), so a band on the wrong
    // theme fails. tests/world/trim.test.ts checks the same thing on the
    // real, loaded scene.
    const seen = new Set<BandTheme>();
    for (const def of LEVELS) {
      const theme: BandTheme = def.hell ? "hell" : def.flesh ? "flesh" : def.dungeon ? "dungeon" : "church";
      expect(bandTheme(def), def.name).toBe(theme);
      expect(bandFor(def), def.name).toBe(BANDTEX[theme]);
      seen.add(theme);
    }
    // Every band is used by some level; a theme no level has would be dead.
    expect([...seen].sort()).toEqual([...THEMES].sort());
  });
});

// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { recordingCanvas, installRecordingGetContext, type DrawCall } from "../support/recordingCanvas";
import { seedRandom } from "../support/seededRandom";
import { DRESSTEX, buildDressTextures } from "../../src/render/DressTextures";
import { buildHellTextures } from "../../src/render/HellTextures";
import { TEX, buildTextures } from "../../src/render/ProcTextures";
import { themeTex } from "../../src/world/ZoneLook";
import { ZONES } from "../../src/world/levels/prologue";

/**
 * The prologue's own surfaces (`src/render/DressTextures.ts`, the prologue
 * plan's Task 3): the churchyard's earth, the grave's soil, the bridge's
 * stone, the fire's spark. Built at boot inside the window where the trace
 * harness has seeded `Math.random` — so, like the trim bands, they must not
 * draw from it, and must not join `TEX`, whose key set is the reference's.
 */

function recordBuild(seed: number): DrawCall[] {
  const { ctx, calls } = recordingCanvas();
  const restoreGetContext = installRecordingGetContext(ctx, calls);
  const restoreRandom = seedRandom(seed);
  try { buildDressTextures(); } finally { restoreRandom(); restoreGetContext(); }
  return calls;
}

let texKeys: string[] = [];
beforeAll(() => {
  installDomStubs();
  buildTextures();
  buildHellTextures();   // the hell zone names its stone by key (`themeTex`), which needs them built
  texKeys = Object.keys(TEX).sort();
});

describe("deterministic", () => {
  it("draws the same canvas calls whatever Math.random is seeded with", () => {
    const a = recordBuild(1), b = recordBuild(424242);
    expect(a.length).toBeGreaterThan(3 * 64 * 64);
    expect(b).toEqual(a);
  });

  it("takes no draw from Math.random except three's own texture UUIDs", () => {
    const real = Math.random;
    let uuid = 0, other = 0;
    Math.random = () => { if (new Error().stack?.includes("generateUUID")) uuid++; else other++; return real(); };
    try { buildDressTextures(); } finally { Math.random = real; }
    expect(uuid).toBeGreaterThan(0);
    expect(other).toBe(0);
  });
});

describe("the registry", () => {
  it("builds the seven (the bridge's stone is hell's now: HELLTEX.bridge), and leaves TEX's key set alone", () => {
    buildDressTextures();
    expect(Object.keys(DRESSTEX).sort()).toEqual(["banner", "graveEarth", "rust", "sludge", "spark", "straw", "yardEarth"]);
    expect(Object.keys(TEX).sort()).toEqual(texKeys);
  });

  it("dresses the churchyard in earth — its ground and its grave walls — and nothing else in the prologue", () => {
    buildDressTextures();
    const yard = ZONES.find((z) => z.id === "churchyard")!;
    expect(themeTex(yard).floor).toBe(DRESSTEX.yardEarth);
    expect(themeTex(yard).side).toBe(DRESSTEX.graveEarth);
    for (const z of ZONES.filter((t) => t.id !== "churchyard")) {
      const t = themeTex(z);
      expect(Object.values(DRESSTEX)).not.toContain(t.floor);
    }
  });
});

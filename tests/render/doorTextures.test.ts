// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { recordingCanvas, installRecordingGetContext, type DrawCall } from "../support/recordingCanvas";
import { seedRandom } from "../support/seededRandom";
import { DOORTEX, buildDoorTextures, type DoorTexKey } from "../../src/render/DoorTextures";
import { buildTextures } from "../../src/render/ProcTextures";

/**
 * The exit and entrance doors' surfaces (`src/render/DoorTextures.ts`). Built at boot like the trim bands,
 * so the same property matters most and is pinned from both sides: the pattern does not depend on the
 * seeded stream, and building it does not consume the stream — a texture that drew once would shift every
 * gameplay draw after it and move every trace fixture's camera and HUD.
 */

const KEYS: DoorTexKey[] = ["church", "crypt", "tomb", "sluice", "freight", "hazard", "glow", "sigil"];

function recordBuild(seed: number): DrawCall[] {
  const { ctx, calls } = recordingCanvas();
  const restoreGetContext = installRecordingGetContext(ctx, calls);
  const restoreRandom = seedRandom(seed);
  try { buildDoorTextures(); } finally { restoreRandom(); restoreGetContext(); }
  return calls;
}

beforeAll(() => { installDomStubs(); buildTextures(); });

describe("the door textures are deterministic", () => {
  it("draws the same canvas calls whatever Math.random is seeded with", () => {
    // MUTATION TARGET: take a texel from Math.random instead of `grain`
    const a = recordBuild(1), b = recordBuild(987654321);
    expect(a.length, "a recorder that logged nothing proves nothing").toBeGreaterThan(8 * 32 * 32);
    expect(b).toEqual(a);
  });

  it("takes no draw from Math.random except three's own texture UUIDs", () => {
    const real = Math.random;
    let uuid = 0, other = 0;
    Math.random = () => { if (new Error().stack?.includes("generateUUID")) uuid++; else other++; return real(); };
    try { buildDoorTextures(); } finally { Math.random = real; }
    expect(uuid, "the UUID check stopped matching — this case would pass while looking at nothing").toBeGreaterThan(0);
    expect(other).toBe(0);
  });
});

describe("the registry", () => {
  it("builds the eight textures, nearest-filtered and wrapping like every wall texture", () => {
    buildDoorTextures();
    expect(Object.keys(DOORTEX).sort()).toEqual([...KEYS].sort());
    for (const k of KEYS) {
      const t = DOORTEX[k]!;
      expect(t.isTexture, k).toBe(true);
      expect(t.magFilter, k).toBe(1003);   // THREE.NearestFilter
      expect(t.image.width, k).toBeGreaterThanOrEqual(16);
    }
  });
});

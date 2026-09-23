// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { buildSprites } from "../../src/enemies/SpriteBaker";
import { buildItemTex } from "../../src/render/ItemTextures";
import { buildTextures } from "../../src/render/ProcTextures";
import { BANDTEX, buildBandTextures } from "../../src/render/BandTextures";
import { buildTextureIndex } from "./gameplayTrace";

/**
 * Pins `buildTextureIndex`'s fallback-2 namer — the one piece of
 * `gameplayTrace.ts`'s texture index with no fixture behind it.
 *
 * **Why this file exists.** `buildTextureIndex` is not exported from
 * production code and neither committed fixture forces its `unnamed#N`
 * counter to distinguish more than the one texture (`blobTex`) that reaches
 * it today. If a later edit collapsed the counter to a single shared
 * `"unnamed"` constant — reintroducing, one level down, the exact blind spot
 * this whole index exists to close — both trace fixtures would still pass:
 * the digest hash would simply come out different, and a regeneration would
 * paper over it without anyone noticing that two distinct textures had
 * started comparing equal. Task 1's review round 1 called this out
 * (Important 2) and asked for a test that a collapsed fallback cannot pass.
 *
 * This file drives `buildTextureIndex` directly against synthetic
 * texture-like objects that are deliberately *not* in `PX`/`ITEMTEX`/`TEX`,
 * so they are guaranteed to land in fallback 2 rather than being named by
 * the real index. `buildTextures`/`buildSprites`/`buildItemTex` are still
 * run first so the guard-the-guard check (`buildTextureIndex` throws if it
 * indexes zero textures) does not fire.
 *
 * It also pins the fourth source the index gained with the trim bands
 * (`BANDTEX`, `src/render/BandTextures.ts`): each band is named
 * `band.<theme>`, and naming them leaves the `unnamed#N` counter where it
 * was — the reason they were put in a named registry at all.
 */
describe("buildTextureIndex — the unnamed# fallback", () => {
  beforeAll(() => {
    installDomStubs();
    buildTextures();
    buildBandTextures();
    buildSprites();
    buildItemTex();
  });

  it("gives distinct unnamed textures distinct names, and the same texture the same name back", async () => {
    const texName = await buildTextureIndex();

    // Plain objects, not in PX/ITEMTEX/TEX and sharing no `.image`/`.source`
    // with anything that is — each must fall all the way through to
    // fallback 2, the per-object `unnamed#N` counter.
    const a = { isTexture: true };
    const b = { isTexture: true };
    const c = { isTexture: true };

    const nameA = texName(a);
    const nameB = texName(b);
    const nameC = texName(c);

    // The property a collapsed fallback would lose: three different
    // textures must not compare equal.
    expect(new Set([nameA, nameB, nameC]).size).toBe(3);
    for (const name of [nameA, nameB, nameC]) {
      expect(name).toMatch(/^unnamed#\d+$/);
    }

    // Stability: re-querying the same object must return the same name,
    // not a freshly incremented one.
    expect(texName(a)).toBe(nameA);
    expect(texName(b)).toBe(nameB);
    expect(texName(c)).toBe(nameC);
  });

  it("names the trim bands from their own registry, band.<theme>, never unnamed#N", async () => {
    // MUTATION TARGET: drop BANDTEX from buildTextureIndex and every band
    // falls through to unnamed#N — which also renumbers every genuinely
    // unnamed texture seen after a course (blobTex today), so a fixture
    // regenerated then would be unreadable in a way no hash diff shows.
    const texName = await buildTextureIndex();
    const themes = Object.keys(BANDTEX);
    expect(themes.length).toBeGreaterThan(0);
    for (const theme of themes) expect(texName(BANDTEX[theme as keyof typeof BANDTEX])).toBe(`band.${theme}`);
    // And the counter is untouched by them: the first unknown object after
    // naming every band is still unnamed#1.
    expect(texName({ isTexture: true })).toBe("unnamed#1");
  });
});

// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { ITEMTEX, buildItemTex } from "../../src/render/ItemTextures";

describe("buildItemTex", () => {
  beforeAll(() => {
    installDomStubs();
    buildItemTex();
  });

  it("produces a texture for every pickup kind the game can drop", () => {
    // These strings come from loadLevel's map2 table and dropAmmo. A missing
    // one is an invisible pickup the player can never find.
    for (const kind of ["health", "bullets", "shells", "slugs", "crosses", "armor", "key", "gun"]) {
      expect(ITEMTEX[kind], `ITEMTEX.${kind} missing`).toBeDefined();
    }
  });

  it("gives the torch two frames and the candle one", () => {
    expect(Array.isArray(ITEMTEX.torch)).toBe(true);
    expect((ITEMTEX.torch as unknown[]).length).toBe(2);
    expect(Array.isArray(ITEMTEX.candle)).toBe(false);
  });
});

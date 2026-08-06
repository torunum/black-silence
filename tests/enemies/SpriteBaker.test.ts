// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { PX, buildSprites } from "../../src/enemies/SpriteBaker";
import { PXDEF } from "../../src/enemies/pixels";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";

describe("PXDEF", () => {
  it("defines sprite rows and a palette for every creature", () => {
    for (const [key, d] of Object.entries(PXDEF)) {
      expect(d.px.length, `${key} has no rows`).toBeGreaterThan(0);
      expect(Object.keys(d.pal).length, `${key} has no palette`).toBeGreaterThan(0);
    }
  });

  it("covers every enemy that can be spawned", () => {
    // spawnEnemy does PX[ch].a with no guard — a stat entry with no sprite
    // throws at spawn time, mid-level.
    for (const key of Object.keys(ENEMY_DEFS)) {
      expect(PXDEF[key], `ENEMY_DEFS.${key} has no sprite definition`).toBeDefined();
    }
  });

  it("uses only palette keys that the rows reference", () => {
    for (const [key, d] of Object.entries(PXDEF)) {
      const used = new Set<string>();
      for (const row of d.px) for (const ch of row) if (ch !== " ") used.add(ch);
      for (const ch of used) {
        expect(d.pal[ch], `${key}: row character '${ch}' has no palette entry`).toBeDefined();
      }
    }
  });
});

describe("buildSprites", () => {
  beforeAll(() => {
    installDomStubs();
    buildSprites();
  });

  it("bakes a walk pair and dismemberment frames for every creature", () => {
    for (const key of Object.keys(PXDEF)) {
      expect(PX[key].a, `${key}.a`).toBeDefined();
      expect(PX[key].b, `${key}.b`).toBeDefined();
      expect(PX[key].noLArm, `${key}.noLArm`).toBeDefined();
      expect(PX[key].noRArm, `${key}.noRArm`).toBeDefined();
      expect(PX[key].noLegs, `${key}.noLegs`).toBeDefined();
    }
  });

  it("bakes a headless frame only for creatures that declare a head", () => {
    for (const [key, d] of Object.entries(PXDEF)) {
      if (d.head && d.head > 0) expect(PX[key].noHead, `${key}.noHead`).not.toBeNull();
      else expect(PX[key].noHead, `${key}.noHead`).toBeNull();
    }
  });
});

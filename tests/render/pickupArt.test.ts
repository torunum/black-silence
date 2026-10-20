// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { PICKUP_ART, PICKUP_PAL, paintPickups } from "../../src/render/PickupArt";
import { ITEMTEX, buildItemTex } from "../../src/render/ItemTextures";
import { WEAPON_STATS } from "../../src/weapons/definitions";
import { ITEM_KIND } from "../../src/world/density";

/**
 * The pickups redrawn (owner, 2026-10-20: "ne oldugu da cok anlasılmıyor. pompalı mermisi vs simgesi hepsinin farklı olsun").
 */
describe("the pickup art", () => {
  beforeAll(() => { installDomStubs(); buildItemTex(); paintPickups(); });

  it("draws every pickup a level can place, every ammunition a weapon uses, and every weapon by slot", () => {
    for (const kind of new Set(Object.values(ITEM_KIND))) expect(PICKUP_ART[kind], kind).toBeDefined();
    for (const w of WEAPON_STATS) expect(PICKUP_ART[w.ammo], w.ammo).toBeDefined();
    WEAPON_STATS.forEach((_w, slot) => expect(PICKUP_ART[`w${slot}`], `w${slot}`).toBeDefined());
  });

  it("no two pictures are the same, and the ammunition types are told apart by shape, not only colour", () => {
    const shape = (rows: readonly string[]) => rows.map((r) => r.replace(/[^ ]/g, "#")).join("/");
    const keys = Object.keys(PICKUP_ART);
    for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) {
      expect(shape(PICKUP_ART[keys[a]]), `${keys[a]} vs ${keys[b]}`).not.toBe(shape(PICKUP_ART[keys[b]]));
    }
  });

  it("every picture is a rectangle of rows, and every colour it uses is in the palette", () => {
    for (const [k, rows] of Object.entries(PICKUP_ART)) {
      expect(new Set(rows.map((r) => r.length)).size, k).toBe(1);
      for (const ch of rows.join("")) if (ch !== " ") expect(PICKUP_PAL[ch], `${k}: '${ch}'`).toBeDefined();
    }
  });

  it("paints over the reference's textures under the same keys, nearest-filtered like them", () => {
    for (const k of Object.keys(PICKUP_ART)) {
      const t = ITEMTEX[k] as { magFilter: number; minFilter: number };
      expect(t, k).toBeDefined();
      expect(t.magFilter).toBe((ITEMTEX.candle as { magFilter: number }).magFilter);
    }
  });

  it("draws nothing from Math.random (the seeded traces must not see it)", () => {
    const real = Math.random;
    let n = 0;
    Math.random = () => { n++; return 0.5; };
    try { paintPickups(); } finally { Math.random = real; }
    expect(n).toBe(0);
  });
});

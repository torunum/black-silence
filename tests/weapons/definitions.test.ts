import { describe, expect, it } from "vitest";
import { WEAPON_STATS } from "../../src/weapons/definitions";

describe("WEAPON_STATS", () => {
  it("has eight slots in the reference order", () => {
    expect(WEAPON_STATS.map((w) => w.name)).toEqual([
      "FLARE PISTOL",
      "SAWED-OFF SHOTGUN",
      "COMBAT RIFLE",
      "TOMMY GUN",
      "BMG SNIPER",
      "HOLY CROSS LAUNCHER",
      "NAIL CANNON",
      "SOUL REAPER",
    ]);
  });

  it("gives every weapon a positive magazine, rate and reload", () => {
    for (const w of WEAPON_STATS) {
      expect(w.magSize, w.name).toBeGreaterThan(0);
      expect(w.rate, w.name).toBeGreaterThan(0);
      expect(w.reload, w.name).toBeGreaterThan(0);
      expect(w.pellets, w.name).toBeGreaterThan(0);
    }
  });

  it("draws every ammo type from the player's pool", () => {
    const pools = new Set(["bullets", "shells", "slugs", "crosses", "nails", "souls"]);
    for (const w of WEAPON_STATS) expect(pools.has(w.ammo), w.name).toBe(true);
  });

  it("preserves the reference stats for the shotgun", () => {
    const shotgun = WEAPON_STATS[1];
    expect(shotgun.dmg).toBe(9);
    expect(shotgun.pellets).toBe(8);
    expect(shotgun.magSize).toBe(5);
    expect(shotgun.pump).toBe(true);
  });
});

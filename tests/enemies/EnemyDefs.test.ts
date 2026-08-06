import { describe, expect, it } from "vitest";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";

describe("ENEMY_DEFS", () => {
  it("defines the full reference roster", () => {
    expect(Object.keys(ENEMY_DEFS)).toHaveLength(25);
  });

  it("gives every entry positive hp, speed, size and pain threshold", () => {
    for (const [key, d] of Object.entries(ENEMY_DEFS)) {
      expect(d.hp, key).toBeGreaterThan(0);
      expect(d.sp, key).toBeGreaterThan(0);
      expect(d.w, key).toBeGreaterThan(0);
      expect(d.h, key).toBeGreaterThan(0);
      expect(d.pain, key).toBeGreaterThan(0);
    }
  });

  it("gives every boss a name and a title for the boss bar", () => {
    for (const [key, d] of Object.entries(ENEMY_DEFS)) {
      if (!d.boss) continue;
      expect(d.name, key).toBeTruthy();
      expect(d.title, key).toBeTruthy();
    }
  });

  it("gives every flying enemy a hover height", () => {
    for (const [key, d] of Object.entries(ENEMY_DEFS)) {
      if (d.fly) expect(d.flyH, key).toBeGreaterThan(0);
    }
  });

  it("preserves the reference stats for the rotting ghoul", () => {
    expect(ENEMY_DEFS.z).toMatchObject({ hp: 50, sp: 2.4, mel: 12, pain: 170, fling: true });
  });
});

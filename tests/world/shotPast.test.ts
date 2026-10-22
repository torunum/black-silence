import { beforeEach, describe, expect, it } from "vitest";
import { world } from "../../src/world/WorldState";
import { CELL } from "../../src/world/Grid";
import { PILLAR_R, shotNormal, shotSolidAt, solidAt } from "../../src/world/Collision";
import { massBox, massMap, pieceTop } from "../../src/world/decor/masses";

/**
 * A SHOT GOES WHERE IT IS AIMED (owner, 2026-10-21: "sütunlar yakınında düşmanlara sıkınca gitmiyor, sanki mermi duvara çarpıyor ...
 * kısa cisimlerin üzerinden mermi gitmiyor"). `solidAt` is the walker's question and stays as it was; `shotSolidAt` is the shot's:
 * a pillar stops it only where its column is, a piece of solid dressing only below its top.
 */

beforeEach(() => {
  world.grid = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => "."));
  world.grid[2][2] = "I";
  world.heightMap = null; world.doors = {};
  world.masses = massMap([{ k: "cratepile", x: 1, z: 3, r: 0 }]);
});

describe("past a pillar", () => {
  const c = 2.5 * CELL;
  it("the walker is still kept out of the whole cell", () => { expect(solidAt(c + 0.85, c + 0.85)).toBe(true); });
  it("a shot through the cell's corner, clear of the column, goes on", () => {
    expect(shotSolidAt(c + 0.85, 1.2, c + 0.85)).toBe(false);
    expect(shotSolidAt(c + PILLAR_R + 0.05, 1.2, c)).toBe(false);
  });
  it("a shot into the column stops, and its mark faces out from the column", () => {
    expect(shotSolidAt(c + 0.3, 1.2, c)).toBe(true);
    const n = shotNormal(c + 0.5, c, { x: -1, z: 0 });
    expect(n.x).toBeCloseTo(1, 6); expect(n.z).toBeCloseTo(0, 6);
  });
});

describe("over a low piece of dressing", () => {
  it("a mass knows how tall it stands, measured off its own parts", () => {
    const top = pieceTop({ k: "cratepile", x: 0, z: 0 });
    expect(top).toBeGreaterThan(0.4); expect(top).toBeLessThan(2.6);
    expect(massBox({ k: "cratepile", x: 1, z: 3, r: 0 })!.y1).toBeCloseTo(top, 9);
  });
  it("a shot below its top stops on it; one above it passes over; the walker is kept off it either way", () => {
    const m = massBox({ k: "cratepile", x: 1, z: 3, r: 0 })!, x = (m.x0 + m.x1) / 2, z = (m.z0 + m.z1) / 2;
    expect(solidAt(x, z)).toBe(true);
    expect(shotSolidAt(x, m.y1 * 0.5, z)).toBe(true);
    expect(shotSolidAt(x, m.y1 + 0.1, z)).toBe(false);
  });
  it("a wall is a wall at any height", () => {
    world.grid[0][0] = "#";
    expect(shotSolidAt(1, 3, 1)).toBe(true);
  });
});

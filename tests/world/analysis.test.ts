import { describe, expect, it } from "vitest";
import { blankGrid, carve } from "../../src/world/LevelBuilder";
import { findAll, floodFill, isOpen, isWalkable } from "../../src/world/analysis";

describe("isWalkable", () => {
  it("treats walls, pillars and windows as solid", () => {
    for (const ch of ["#", "I", "W"]) expect(isWalkable(ch, true)).toBe(false);
  });
  it("treats floor, doors, secrets and content chars as passable", () => {
    for (const ch of [".", "+", "S", "P", "X", "K", "z", "h"]) {
      expect(isWalkable(ch, false)).toBe(true);
    }
  });
  it("gates locked doors on the throughLocked flag", () => {
    expect(isWalkable("D", false)).toBe(false);
    expect(isWalkable("D", true)).toBe(true);
  });
});

describe("findAll", () => {
  it("returns every coordinate holding the character", () => {
    const { g } = blankGrid(5, 5);
    g[1][1] = "K";
    g[3][4] = "K";
    expect(findAll(g, "K")).toEqual([{ x: 1, z: 1 }, { x: 4, z: 3 }]);
  });
  it("returns an empty array when the character is absent", () => {
    expect(findAll(blankGrid(4, 4).g, "K")).toEqual([]);
  });
});

describe("floodFill", () => {
  it("reaches every connected floor cell", () => {
    const { g } = blankGrid(6, 6);
    carve(g, 1, 1, 4, 4);
    const seen = floodFill(g, { x: 1, z: 1 }, false);
    expect(seen[4][4]).toBe(true);
    expect(seen[0][0]).toBe(false);
  });

  it("stops at a locked door when throughLocked is false", () => {
    const { g } = blankGrid(7, 3);
    carve(g, 1, 1, 5, 1);
    g[1][3] = "D";
    const seen = floodFill(g, { x: 1, z: 1 }, false);
    expect(seen[1][2]).toBe(true);
    expect(seen[1][4]).toBe(false);
  });

  it("passes the locked door when throughLocked is true", () => {
    const { g } = blankGrid(7, 3);
    carve(g, 1, 1, 5, 1);
    g[1][3] = "D";
    const seen = floodFill(g, { x: 1, z: 1 }, true);
    expect(seen[1][5]).toBe(true);
  });

  it("passes secret doors, which are never locked", () => {
    const { g } = blankGrid(7, 3);
    carve(g, 1, 1, 5, 1);
    g[1][3] = "S";
    expect(floodFill(g, { x: 1, z: 1 }, false)[1][5]).toBe(true);
  });
});

describe("isOpen", () => {
  it("is false outside the grid", () => {
    const { g } = blankGrid(4, 4);
    expect(isOpen(g, -1, 0)).toBe(false);
    expect(isOpen(g, 0, 99)).toBe(false);
  });
});

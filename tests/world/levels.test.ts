import { describe, expect, it } from "vitest";
import { LEVELS } from "../../src/world/levels";
import { findAll, floodFill, isOpen } from "../../src/world/analysis";

const built = LEVELS.map((def) => ({ name: def.name, grid: def.build().g }));

it("builds every declared level", () => {
  expect(built).toHaveLength(8);
});

describe.each(built)("$name", ({ grid }) => {
  it("has exactly one player spawn", () => {
    expect(findAll(grid, "P")).toHaveLength(1);
  });

  it("has at least one exit", () => {
    expect(findAll(grid, "X").length).toBeGreaterThan(0);
  });

  it("every exit is reachable from the spawn", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, true);
    for (const exit of findAll(grid, "X")) {
      expect(seen[exit.z][exit.x], `exit at ${exit.x},${exit.z}`).toBe(true);
    }
  });

  it("every key is reachable without passing a locked door", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, false);
    for (const key of findAll(grid, "K")) {
      expect(seen[key.z][key.x], `key at ${key.x},${key.z}`).toBe(true);
    }
  });

  it("every locked door is reachable without passing another locked door", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, false);
    const doors = findAll(grid, "D");
    if (doors.length === 0) return;
    const anyReachable = doors.some(
      (d) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => seen[d.z + dz]?.[d.x + dx]),
    );
    expect(anyReachable).toBe(true);
  });

  it("every secret door has open floor on both sides", () => {
    for (const s of findAll(grid, "S")) {
      const horizontal = isOpen(grid, s.x - 1, s.z) && isOpen(grid, s.x + 1, s.z);
      const vertical = isOpen(grid, s.x, s.z - 1) && isOpen(grid, s.x, s.z + 1);
      expect(horizontal || vertical, `secret at ${s.x},${s.z} opens onto solid rock`).toBe(true);
    }
  });

  it("every enemy, item and prop stands on reachable floor", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, true);
    const structural = new Set([".", "#", "I", "W", "+", "D", "S", "P"]);
    for (let z = 0; z < grid.length; z++) {
      for (let x = 0; x < grid[z].length; x++) {
        const ch = grid[z][x];
        if (structural.has(ch)) continue;
        expect(seen[z][x], `'${ch}' stranded at ${x},${z}`).toBe(true);
      }
    }
  });
});

/**
 * Characterization test for KNOWN-1. Level 1 places a red key and a Guardian
 * miniboss guarding it, but contains no locked door at all — the key does
 * nothing. Phase 0 preserves the bug; this pins it so it cannot spread
 * unnoticed and fails loudly when Phase 4 fixes it.
 */
it("records levels that place a key with no locked door (KNOWN-1)", () => {
  const offenders = built
    .filter(({ grid }) => findAll(grid, "K").length > 0 && findAll(grid, "D").length === 0)
    .map(({ name }) => name);
  expect(offenders).toEqual(["LEVEL 1 — THE GOTHIC DUNGEON"]);
});

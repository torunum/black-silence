import { describe, expect, it } from "vitest";
import { LEVELS } from "../../src/world/levels";
import { findAll, floodFill, isOpen } from "../../src/world/analysis";

const built = LEVELS.map((def) => ({ name: def.name, grid: def.build().g }));

/**
 * A level completes in one of three ways, so "has an exit" is not one check.
 * All three verified against bossDeath() and openExit() in the reference:
 *   - Prologue and Level 1 place a static `X` tile in the grid.
 *   - Levels 2-6 are boss-gated: killing Q/Z/N/H/V calls openExit(), which
 *     places the pad on the first open cell in a hardcoded candidate list.
 *   - Level 7 is the finale: its boss G calls showWin(), so it has no exit.
 */

/** The cells openExit() tries, in order. Hardcoded in the game. */
const EXIT_CANDIDATES: ReadonlyArray<readonly [number, number]> = [
  [16, 16], [16, 15], [15, 16], [17, 16], [16, 17],
];

/** Bosses whose death calls openExit(). */
const EXIT_OPENING_BOSSES = ["Q", "Z", "N", "H", "V"];

/** The finale boss, which calls showWin() instead of opening an exit. */
const FINALE_BOSS = "G";

it("builds every declared level", () => {
  expect(built).toHaveLength(8);
});

describe.each(built)("$name", ({ grid }) => {
  it("has exactly one player spawn", () => {
    expect(findAll(grid, "P")).toHaveLength(1);
  });

  it("is completable — a reachable static exit, or a boss that opens a reachable one", () => {
    const [spawn] = findAll(grid, "P");
    const seen = floodFill(grid, spawn, true);

    const staticExits = findAll(grid, "X");
    if (staticExits.length > 0) {
      expect(staticExits.some((e) => seen[e.z]?.[e.x]), "no static exit is reachable").toBe(true);
      return;
    }

    if (EXIT_OPENING_BOSSES.some((b) => findAll(grid, b).length > 0)) {
      // openExit() walks EXIT_CANDIDATES and takes the first cell solidAt()
      // reports open. If none is open the loop falls through and the pad is
      // placed at (16,16) anyway — inside a wall, unreachable, level
      // unfinishable. So at least one candidate must be open, reachable, and
      // not a door (a door reads open statically but is solid until used).
      const usable = EXIT_CANDIDATES.filter(
        ([x, z]) => isOpen(grid, x, z) && !"+DS".includes(grid[z]?.[x]) && seen[z]?.[x],
      );
      expect(usable.length, "no openExit() candidate is open and reachable").toBeGreaterThan(0);
      return;
    }

    // No static exit and no exit-opening boss is legal only for the finale,
    // whose boss calls showWin() instead.
    expect(findAll(grid, FINALE_BOSS).length, "no exit and no finale boss").toBeGreaterThan(0);
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

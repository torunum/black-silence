import { describe, expect, it } from "vitest";
import { LEVELS } from "../../src/world/levels/index";
import { bareGrid, classifyGlyph, densityMarkdown, measureLevel } from "../../src/world/density";
import type { DecorSpec } from "../../src/world/LevelBuilder";

/**
 * THE EMPTINESS MEASURE (levels-feel-full plan, Task 1; `src/world/density.ts`,
 * `scripts/level-density.ts`, `docs/level-density.md`). The numbers are the
 * baseline "the levels feel very empty" is checked against, so they are held
 * to a grid small enough to count by hand. That the classification matches
 * what `loadLevel` really builds is `tests/world/densityLoad.test.ts`.
 *
 * The grid, x across and z down (P spawn, h health, x crate, z zombie, i torch,
 * l candle, W a window with an open cell in front of it, straw and grass decor):
 *
 *     0123456789
 *   0 ##########
 *   1 #P.....h.#
 *   2 #........#
 *   3 #.x..z...#
 *   4 #........#      straw at (7,4), grass at (2,5), a fire light at (4,4)
 *   5 #........#
 *   6 #...i..l.#
 *   7 ####W#####
 *
 * Counted by hand: 48 walkable cells (8 by 6; the walls and the window are not).
 * The glyphs on the floor are P(1,1) h(7,1) x(2,3) z(5,3) i(4,6) l(7,6) — six —
 * and the straw at (7,4) is a seventh occupied cell (grass is ground cover and a
 * fire light is a light; neither furnishes). Each occupied cell spoils its 3x3
 * block. Row by row the spoiled cells are: z1 x1,2,6,7,8 (5); z2 x1-8 (8: the
 * zombie at (5,3) reaches x4-6, the crate x1-3, the health x6-8); z3 x1-8 (8);
 * z4 x1-8 (8); z5 x3-8 (6); z6 x3-8 (6): 41. That leaves 7 bare: (3,1)(4,1)(5,1)
 * and (1,5)(2,5)(1,6)(2,6). The longest straight run is three, along z=1 from
 * x=3 to 5; the biggest connected region is the four in the corner, x 1-2, z 5-6
 * (the other is the run of three).
 */
const G = [
  "##########",
  "#P.....h.#",
  "#........#",
  "#.x..z...#",
  "#........#",
  "#........#",
  "#...i..l.#",
  "####W#####",
].map((r) => [...r]);
const DECOR: DecorSpec[] = [{ k: "straw", x: 7, z: 4 }, { k: "grass", x: 2, z: 5 }, { k: "light", x: 4, z: 4 }];

describe("measureLevel, against a grid counted by hand", () => {
  const d = measureLevel({ g: G, decor: DECOR });

  it("counts walkable cells, props, pickups, enemies, torches, candles and lights", () => {
    expect(d.walkable).toBe(48);
    expect(d.props).toEqual({ crate: 1 });
    expect(d.propsTotal).toBe(1);
    expect(d.pickups).toEqual({ health: 1 });
    expect(d.pickupsTotal).toBe(1);
    expect(d.enemies).toBe(1);
    expect(d.bosses).toBe(0);
    expect(d.torches).toBe(1);
    expect(d.candles).toBe(1);
    expect(d.lights).toBe(3);   // the torch, the window (its front cell is open), the fire light
  });

  it("counts decor pieces, not the lights among them", () => {
    expect(d.decor).toBe(2);
    expect(d.decorByKind).toEqual({ straw: 1, grass: 1 });
  });

  it("finds the 7 bare cells: nothing on or beside them, ground cover and walls not counting", () => {
    expect(d.bareCells).toBe(7);
    const bare = bareGrid({ g: G, decor: DECOR });
    const cells: string[] = [];
    bare.forEach((row, z) => row.forEach((b, x) => { if (b) cells.push(x + "," + z); }));
    expect(cells.sort()).toEqual(["1,5", "1,6", "2,5", "2,6", "3,1", "4,1", "5,1"]);
  });

  it("finds the longest straight run and the largest bare region, and where they are", () => {
    expect(d.longestRun).toEqual({ cells: 3, x0: 3, z0: 1, x1: 5, z1: 1 });
    expect(d.emptiest).toEqual({ cells: 4, x0: 1, z0: 5, x1: 2, z1: 6 });
  });

  it("draws the grid: solid, furnished, bare, and the emptiest region", () => {
    expect(d.map).toEqual([
      "##########",
      "#++...+++#",
      "#++++++++#",
      "#++++++++#",
      "#++++++++#",
      "#RR++++++#",
      "#RR++++++#",
      "##########",
    ]);
  });

  it("does not count a window nothing opens in front of, and counts decor's cell as furnished", () => {
    const shut = G.map((r) => [...r]); shut[6][4] = "#";   // the torch's cell walled: the window at (4,7) has nothing open beside it
    expect(measureLevel({ g: shut, decor: [] }).lights).toBe(0);
        expect(measureLevel({ g: G, decor: DECOR }).bareCells).toBeLessThan(measureLevel({ g: G, decor: [] }).bareCells);
  });
});

describe("classifyGlyph follows loadLevel's own order", () => {
  it("makes C and V enemies (KNOWN-4), v a pew, A an enemy and r armour", () => {
    expect(classifyGlyph("C")).toBe("enemy");
    expect(classifyGlyph("V")).toBe("enemy");
    expect(classifyGlyph("v")).toBe("prop");
    expect(classifyGlyph("A")).toBe("enemy");
    expect(classifyGlyph("r")).toBe("pickup");
    expect(classifyGlyph("O")).toBe("prop");
    expect(classifyGlyph("p")).toBe("piano");
  });
});

describe("the table", () => {
  it("has a row and a section for every level", () => {
    const rows = LEVELS.map((l) => ({ name: l.name, d: measureLevel(l.build()) }));
    const md = densityMarkdown(rows);
    for (const l of LEVELS) expect(md).toContain(l.name);
    expect(md.match(/^\| /gm)!.length).toBe(LEVELS.length + 1);
    expect(md).toMatch(/generated/i);
  });
});

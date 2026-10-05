import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEVELS } from "../../src/world/levels/index";
import type { BuiltLevel } from "../../src/world/LevelBuilder";
import type { Baseline } from "../../src/world/density";
import { decorCell, measureLevel } from "../../src/world/density";
import { LIGHT_BUDGET, lampsOf } from "../../src/world/decor/lamps";
import { addPiece, type Parts } from "../../src/world/decor/parts";
import { PIECES } from "../../src/world/decor/registry";
import { GLOW_PIECES, darkShare, isLightGiver, setPieceLight } from "../../src/world/lightmap";
import { REBUILT } from "../../src/world/structure/targets";

/**
 * THE LIGHT (levels-feel-full plan, Task 3). The player carries a lamp, so a piece of dressing is lit when the
 * player stands beside it; what a room's own lights decide is whether it can be seen from across the room, and
 * whether a room reads as a place with a light in it. Dressing adds no light of its own, so a room the torches
 * do not reach stayed black however much stood in it. This holds what was done about that:
 *
 *  - **a budget**: no level's scene holds more point lights than level 3's 21 (the player's four included). A point
 *    light is a per-fragment cost on every lit surface in the scene, so lights are not spent where glow will do;
 *  - the real lights are the ones the plan names: five lanterns in the sewers, a furnace and three work lamps in the
 *    factory, four glowing bulbs in the womb, three crook lanterns in the yard; levels 1-3 have none added, because levels 1
 *    and 2 are recorded by trace fixtures (a light moves the recorded scene) and level 3 is at the budget;
 *  - **glow**: braziers, candle stands and dim lamps, built from unlit emissive materials, cost no light at all. Every
 *    block of a level that the static lights leave three quarters dark has one, and on levels 1 and 2 they add geometry
 *    to meshes the level already had, not a mesh, which is why the fixtures do not move.
 */
const built = (i: number): BuiltLevel => LEVELS[i].build();
const baseline = JSON.parse(readFileSync(new URL("../../docs/level-density-baseline.json", import.meta.url), "utf8")) as Baseline;
const measured = (i: number) => measureLevel(built(i)).lights;
const LEVELS_567 = [5, 6, 7] as const;

/** The blocks of the 33x25 lattice (levels 2-7): three columns by three rows of merged rooms. */
const BLOCKS: Array<[number, number, number, number]> = [];
for (const [z0, z1] of [[1, 5], [7, 17], [19, 23]]) for (const [x0, x1] of [[1, 7], [9, 23], [25, 31]]) BLOCKS.push([x0, x1, z0, z1]);
/** Level 1's dark halls (the rebuilt level's: the great hall's east half, the armoury, the ward, the way out), which the lattice does not describe. */
const HALLS_1: Array<[number, number, number, number]> = [[30, 42, 18, 30], [45, 53, 18, 26], [44, 56, 31, 41], [30, 40, 33, 40]];

describe("the real lights", () => {
  it("gives each level the lamps it was given: five lanterns in the sewers, a furnace and three work lamps in the factory, four bulbs in the womb, three lanterns in the yard", () => {
    const lamps = (i: number) => lampsOf(built(i).decor).map((l) => l.spec.k).sort();
    expect(lamps(5)).toEqual(["lantern", "lantern", "lantern", "lantern", "lantern"]);
    expect(lamps(6)).toEqual(["furnace", "worklamp", "worklamp", "worklamp"]);
    expect(lamps(7)).toEqual(["glowbulb", "glowbulb", "glowbulb", "glowbulb"]);
    expect(lamps(4)).toEqual(["gravelamp", "gravelamp", "gravelamp"]);
    for (const i of [4, ...LEVELS_567]) for (const l of lampsOf(built(i).decor)) { expect(l.y).toBeGreaterThan(.5); expect(l.y).toBeLessThan(3.4); }
  });

  it("keeps every level's point lights (the player's four included) inside the budget: the most any level had, level 3's 21", () => {
    for (let i = 0; i < LEVELS.length; i++) expect(measured(i) + 4, `${LEVELS[i].name}`).toBeLessThanOrEqual(LIGHT_BUDGET);
    expect(LIGHT_BUDGET, "the budget is level 3's count, the highest before this task").toBe(measured(3) + 4);
  });

  it("leaves levels 2 and 3 exactly the lights they had (level 2 is recorded by a trace fixture, level 3 is at the budget), and level 1, rebuilt, inside it", () => {
    for (const i of [1, 2, 3].filter((n) => !REBUILT.includes(n))) expect(measured(i), `level ${i}`).toBe(baseline.rows[i].lights);
    for (const i of [1, 2, 3]) expect(lampsOf(built(i).decor), `level ${i} has a light-bearing piece`).toEqual([]);
    // the rebuilt level: 13 torches, the exit and no window: 14 lights, the budget's 17 with a margin of three
    for (const i of REBUILT) expect(measured(i) + 4, `level ${i} (rebuilt)`).toBeLessThanOrEqual(LIGHT_BUDGET - 3);
  });

  it("gives every lamp the strength and reach of a torch's light, and the candles of level 3 none", () => {
    for (const k of ["lantern", "worklamp", "furnace", "glowbulb", "gravelamp"]) {
      const l = PIECES[k].light!;
      expect(l.intensity, k).toBeGreaterThanOrEqual(1.4); expect(l.intensity, k).toBeLessThanOrEqual(2.5);
      expect(l.range, k).toBeGreaterThanOrEqual(9); expect(l.range, k).toBeLessThanOrEqual(12);
    }
    expect(PIECES.votive.light, "the candles are glow only").toBeUndefined();
  });

  it("lights the rooms it says it does: the lamps take a tenth or more of each lit level's floor out of the dark", () => {
    for (const i of [4, ...LEVELS_567]) {
      const L = built(i), withLamps = darkShare(L);
      const without = darkShare({ g: L.g, decor: L.decor!.filter((d) => !PIECES[d.k].light) });
      expect((without.dark - withLamps.dark) / withLamps.walk, `level ${i}: dark ${without.dark} -> ${withLamps.dark} of ${withLamps.walk}`).toBeGreaterThanOrEqual(.1);
    }
  });

  it("leaves no more than a quarter of the sewers', factory's and womb's set-pieces in cells their own lights do not reach, and the yard's tomb and tree stand lit", () => {
    for (const i of LEVELS_567) {
      const lit = setPieceLight(built(i));
      expect(lit.dark.length / lit.total, `level ${i}: dark set-pieces ${lit.dark.join(" ")}`).toBeLessThanOrEqual(.25);
    }
    const yard = (x: number, z: number) => x >= 9 && x <= 23 && z >= 7 && z <= 17;
    const L = built(4), lit = setPieceLight({ g: L.g, decor: L.decor!.filter((d) => d.k === "tombfree" || d.k === "deadtree" || d.k === "gravelamp") }, yard);
    expect(lit.total).toBeGreaterThanOrEqual(4);
    expect(lit.dark, "the yard's trees and lanterns left dark").toEqual([]);
  });
});

describe("the glow", () => {
  const meshKeys = (specs: BuiltLevel["decor"]): string[] => {
    const parts: Parts = new Map();
    for (const d of specs || []) addPiece(parts, d);
    return [...parts.keys()];
  };

  it("costs no light: not one glow piece carries a point light, and every one builds some part from an unlit emissive material", () => {
    const unlit = ["flame", "lampgreen", "lampwhite", "lampamber", "glowflesh", "coal"];
    for (const k of GLOW_PIECES) {
      expect(PIECES[k].light, `${k} bears a light`).toBeUndefined();
      const parts: Parts = new Map();
      addPiece(parts, { k, x: 3, z: 3, r: 0 });
      expect([...parts.keys()].some((key) => unlit.includes(key.slice(key.indexOf("|") + 1))), `${k} glows`).toBe(true);
    }
  });

  it("is on every level: braziers in the dungeon's halls, candle stands in the church and the tomb, dim lamps in the yard, sewers, factory and womb", () => {
    const want: Record<number, string> = { 1: "brazier", 2: "votive", 3: "votive", 4: "gravelampDim", 5: "lanternDim", 6: "worklampDim", 7: "bulbDim" };
    const min: Record<number, number> = { 1: 10, 2: 6, 3: 8, 4: 6, 5: 6, 6: 6, 7: 6 };
    for (let i = 1; i <= 7; i++) expect(built(i).decor!.filter((d) => d.k === want[i]).length, `level ${i}: ${want[i]}`).toBeGreaterThanOrEqual(min[i]);
  });

  it("gives every block the static lights leave three quarters dark a light to be seen by: a real lamp or a glow piece in it", () => {
    for (let i = 2; i <= 7; i++) {
      const L = built(i), bare = { g: L.g, decor: L.decor!.filter((d) => !isLightGiver(d.k)) };
      for (const [x0, x1, z0, z1] of BLOCKS) {
        const inBlock = (x: number, z: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
        const { dark, walk } = darkShare(bare, inBlock);
        if (!walk || dark / walk < .75) continue;
        const givers = L.decor!.filter((d) => isLightGiver(d.k) && inBlock(decorCell(d).x, decorCell(d).z));
        expect(givers.length, `level ${i}: the block x ${x0}-${x1}, z ${z0}-${z1} is ${Math.round(100 * dark / walk)}% dark and has no light in it`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("does the same for level 1's halls (the hall's east half, the east wing, the exit chamber)", () => {
    const L = built(1), bare = { g: L.g, decor: L.decor!.filter((d) => !isLightGiver(d.k)) };
    for (const [x0, x1, z0, z1] of HALLS_1) {
      const inBlock = (x: number, z: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
      const { dark, walk } = darkShare(bare, inBlock);
      expect(dark / walk, `level 1: x ${x0}-${x1}, z ${z0}-${z1} was not a dark hall`).toBeGreaterThan(.5);
      const n = L.decor!.filter((d) => d.k === "brazier" && inBlock(decorCell(d).x, decorCell(d).z)).length;
      expect(n, `level 1: the hall x ${x0}-${x1}, z ${z0}-${z1} has no brazier`).toBeGreaterThanOrEqual(1);
    }
  });

  it("adds geometry to the meshes level 2 already had and no mesh of its own: its trace fixture records the scene's children, and the glow cannot move it (level 1's fixture was re-recorded with its rebuild)", () => {
    for (const i of [1, 2].filter((n) => !REBUILT.includes(n))) {
      const L = built(i), glow = L.decor!.filter((d) => GLOW_PIECES.includes(d.k)), rest = L.decor!.filter((d) => !GLOW_PIECES.includes(d.k));
      expect(glow.length, `level ${i} has glow`).toBeGreaterThan(5);
      expect(meshKeys(L.decor), `level ${i}: the glow brought a mesh with it`).toEqual(meshKeys(rest));
    }
  });
});

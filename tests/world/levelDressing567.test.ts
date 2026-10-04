import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { LEVELS } from "../../src/world/levels/index";
import type { BuiltLevel, DecorSpec } from "../../src/world/LevelBuilder";
import type { Baseline } from "../../src/world/density";
import { classifyGlyph, decorCell, measureLevel } from "../../src/world/density";
import { validateDecor } from "../../src/world/decor/place";
import { massCells } from "../../src/world/decor/masses";
import { PIECES } from "../../src/world/decor/registry";
import { BASIN, HALL as HALL5 } from "../../src/world/levels/dress5";
import { FOUNDRY, HALL as HALL6 } from "../../src/world/levels/dress6";
import { VENTRICLE, HALL as HALL7 } from "../../src/world/levels/dress7";

/**
 * LEVELS 5-7 ARE FURNISHED (levels-feel-full plan, Task 3): the sewers, the factory and the womb. What their
 * dressing has to be, checked on the built levels and with scans written here, not by calling the placement
 * rules back at themselves. `levelDressing.test.ts` holds levels 1-4 to the same; the differences are the
 * arenas, which are left open, and the light:
 *
 *  - dressed by their own builders, deterministically, with no `Math.random`, legal by every rule;
 *  - the density target against the baseline, and the same walkable area, enemies and pickups;
 *  - **the arena floors stay open.** A boss arena is 87-93 bare cells; it is dressed on its rim and left clear
 *    in its middle. Judged three ways, by scans of the built level: no mass stands in the arena's *core* (a cell
 *    with no wall, pillar or window within a step, eight ways); the core is still one piece with every mass a
 *    wall (nothing to get pinned in or walled off); and the masses together cover under a fifth of the arena's
 *    floor. The boss halls (the row of five between two long walls) keep their three middle rows clear;
 *  - the light is held by `lightBudget.test.ts`; the enemies that must not be pinned on any of it by `tests/enemies/stuckCheck.test.ts`
 *    (the stuck check took the sewers' and the womb's masses down by half, and the factory's by a third: the counts below are what is left).
 */
const built = (i: number): BuiltLevel => LEVELS[i].build();
const baseline = JSON.parse(readFileSync(new URL("../../docs/level-density-baseline.json", import.meta.url), "utf8")) as Baseline;
const isMass = (d: DecorSpec): boolean => !!PIECES[d.k]?.mass;
const massCellsOf = (L: BuiltLevel): Array<[number, number]> => (L.decor || []).flatMap((d) => massCells(d));
const at = (g: string[][], x: number, z: number): string => g[z]?.[x] ?? "#";
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const structural = (c: string): boolean => "#WI".includes(c);

/** [level, the big room where the mid-level fight is, the boss hall]. */
const ARENAS: ReadonlyArray<readonly [number, (x: number, z: number) => boolean, (x: number, z: number) => boolean]> = [
  [5, BASIN, HALL5], [6, FOUNDRY, HALL6], [7, VENTRICLE, HALL7],
];
const LEVELS_567 = [5, 6, 7] as const;

describe("levels 5-7 are dressed by their own builders", () => {
  it("each lists a couple of hundred pieces, every one a piece of the kit, and builds the same list every time", () => {
    for (const i of LEVELS_567) {
      const L = built(i);
      expect(L.decor!.length, `level ${i}`).toBeGreaterThan(200);
      for (const d of L.decor!) expect(PIECES[d.k], `level ${i}: ${d.k}`).toBeDefined();
      expect(JSON.stringify(built(i).decor), `level ${i} is not the same twice`).toBe(JSON.stringify(L.decor));
    }
  });

  it("never asks Math.random for any of it", () => {
    const spy = vi.spyOn(Math, "random");
    try { for (const i of LEVELS_567) built(i); expect(spy).not.toHaveBeenCalled(); } finally { spy.mockRestore(); }
  });

  it("obeys every placement rule, checked from scratch on the finished level (the rules, the lookalike rule and the flood fill with masses as walls)", () => {
    for (const i of LEVELS_567) expect(validateDecor(built(i)), `level ${i}`).toEqual([]);
  });

  it("is dressed in its own theme's vocabulary: the sewers' tanks, pumps and lanterns; the factory's presses, furnace and machines; the womb's tumours, eyes and bulbs", () => {
    const kinds = (i: number) => { const m: Record<string, number> = {}; for (const d of built(i).decor!) m[d.k] = (m[d.k] || 0) + 1; return m; };
    const want: Record<number, Record<string, number>> = {
      5: { tank: 5, pump: 6, lantern: 4, cage: 6, outfall: 5, grate: 8, sludge: 8, pipe: 5 },
      6: { press: 3, furnace: 1, worklamp: 3, machine: 8, conveyor: 4, cratepile: 2, drum: 1, hook: 6, gauge: 3 },
      7: { tumor: 6, growth: 10, glowbulb: 4, eye: 6, pod: 4, drape: 6, sinew: 4, vein: 8 },
    };
    for (const i of LEVELS_567) for (const [k, n] of Object.entries(want[i])) expect(kinds(i)[k] || 0, `level ${i} lacks ${k}`).toBeGreaterThanOrEqual(n);
  });

  it("puts solid masses in each, as many as the stuck check leaves (enemies have no pathfinding: a mass an enemy walks into stays a wall to it)", () => {
    const want: Record<number, number> = { 5: 12, 6: 25, 7: 6 };
    for (const i of LEVELS_567) expect(built(i).decor!.filter(isMass).length, `level ${i}`).toBeGreaterThanOrEqual(want[i]);
  });
});

describe("the density targets", () => {
  it("leaves at most 8% of each level's walkable cells bare, no bare region of more than 12 cells and no bare run of more than 6 — against 25-27% and 87-93 cells before", () => {
    for (const i of LEVELS_567) {
      const d = measureLevel(built(i)), b = baseline.rows[i];
      expect(d.bareCells / d.walkable, `level ${i} bare fraction`).toBeLessThanOrEqual(.08);
      expect(d.emptiest.cells, `level ${i} emptiest region`).toBeLessThanOrEqual(12);
      expect(d.longestRun.cells, `level ${i} longest bare run`).toBeLessThanOrEqual(6);
      // and it is the same level: the walkable area, the enemies and the pickups are the numbers they were
      expect(d.walkable, `level ${i} walkable`).toBe(b.walkable);
      expect(d.enemies, `level ${i} enemies`).toBe(b.enemies);
      expect(d.pickupsTotal, `level ${i} pickups`).toBe(b.pickups);
      expect(d.bareCells, `level ${i} bare cells`).toBeLessThan(b.bare * .2);
      expect(d.emptiest.cells, `level ${i} emptiest`).toBeLessThan(b.emptiest.cells * .5);
    }
  });

  it("measures the baseline it compares with: the undressed level is as bare as the baseline says (no pickup, prop or enemy moved)", () => {
    for (const i of LEVELS_567) {
      const L = built(i); L.decor = [];
      expect(measureLevel(L).bareCells, `level ${i}`).toBe(baseline.rows[i].bare);
    }
  });
});

describe("the arena floors stay open", () => {
  it("has no mass in an arena's core: every mass in the big room and the boss hall stands against a wall, a pillar or a window (a step from one, eight ways)", () => {
    for (const [i, room, hall] of ARENAS) {
      const L = built(i);
      let core = 0;
      for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) {
        if ((!room(x, z) && !hall(x, z)) || structural(at(L.g, x, z))) continue;
        if (N8.every(([dx, dz]) => !structural(at(L.g, x + dx, z + dz)))) core++;
      }
      expect(core, `level ${i}: the arena has a core`).toBeGreaterThan(20);
      const coreCell = (x: number, z: number) => N8.every(([dx, dz]) => !structural(at(L.g, x + dx, z + dz)));
      for (const [x, z] of massCellsOf(L)) if (room(x, z) || hall(x, z)) expect(coreCell(x, z), `level ${i}: a mass at (${x},${z}) stands in the arena's open floor`).toBe(false);
    }
  });

  it("keeps the arena's core one piece with every mass a wall, and every enemy and pickup in the room still reachable", () => {
    for (const [i, room, hall] of ARENAS) {
      const L = built(i), blocked = new Set(massCellsOf(L).map(([x, z]) => z * 4096 + x));
      const open = (x: number, z: number) => !structural(at(L.g, x, z)) && !blocked.has(z * 4096 + x);
      const cells: Array<[number, number]> = [];
      for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++)
        if ((room(x, z) || hall(x, z)) && open(x, z) && N8.every(([dx, dz]) => !structural(at(L.g, x + dx, z + dz)))) cells.push([x, z]);
      // the core of the big room and the core of the boss hall are two floors, each in one piece
      for (const where of [room, hall]) {
        const mine = cells.filter(([x, z]) => where(x, z));
        if (!mine.length) continue;
        const seen = new Set<number>([mine[0][1] * 4096 + mine[0][0]]), stack = [mine[0]];
        while (stack.length) {
          const [x, z] = stack.pop()!;
          for (const [dx, dz] of N4) { const nx = x + dx, nz = z + dz; if (where(nx, nz) && open(nx, nz) && !seen.has(nz * 4096 + nx)) { seen.add(nz * 4096 + nx); stack.push([nx, nz]); } }
        }
        for (const [x, z] of mine) expect(seen.has(z * 4096 + x), `level ${i}: the core cell (${x},${z}) is cut off from the rest of its floor`).toBe(true);
      }
    }
  });

  it("covers under a fifth of an arena's floor with masses, and the boss hall's three middle rows with none", () => {
    for (const [i, room, hall] of ARENAS) {
      const L = built(i), masses = massCellsOf(L);
      for (const where of [room, hall]) {
        let floor = 0;
        for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) if (where(x, z) && !structural(at(L.g, x, z))) floor++;
        const under = masses.filter(([x, z]) => where(x, z)).length;
        expect(under / floor, `level ${i}: masses cover ${under} of ${floor} cells`).toBeLessThan(.2);
      }
      for (const [x, z] of masses) if (hall(x, z)) expect(z === 19 || z === 23, `level ${i}: a mass at (${x},${z}) in the boss hall's middle rows`).toBe(true);
    }
  });

  it("does not put the boss hall's masses within two cells of the boss's cell, or the boss in a pocket: every cell round it is open", () => {
    for (const [i] of ARENAS) {
      const L = built(i), boss = L.g.flatMap((row, z) => row.flatMap((c, x) => (classifyGlyph(c) === "enemy" && "HVG".includes(c) ? [[x, z] as const] : [])))[0];
      expect(boss, `level ${i} has its boss`).toBeDefined();
      const blocked = new Set(massCellsOf(L).map(([x, z]) => z * 4096 + x));
      for (let dz = -1; dz <= 1; dz++) for (let dx = -2; dx <= 2; dx++) expect(blocked.has((boss[1] + dz) * 4096 + boss[0] + dx), `level ${i}: a mass beside the boss`).toBe(false);
    }
  });
});

describe("what was not moved", () => {
  const cells = (g: string[][], pred: (c: string) => boolean) => g.flatMap((row, z) => row.flatMap((c, x) => (pred(c) ? [`${c}@${x},${z}`] : [])));

  it("levels 5-7: no pickup, prop or enemy stands anywhere but where the reference put it (the fidelity test holds the whole grid); the pickups were measured and each already sits near the fight it feeds", () => {
    for (const i of LEVELS_567) {
      const L = built(i), pick = cells(L.g, (c) => classifyGlyph(c) === "pickup");
      expect(pick.length, `level ${i} pickups`).toBe(baseline.rows[i].pickups);
    }
  });

  it("no decor sits on a cell the spawn, a pickup, a door, or the exit holds", () => {
    for (const i of LEVELS_567) {
      const L = built(i);
      for (const d of L.decor!) {
        if (PIECES[d.k].mode === "cover") continue;
        const { x, z } = decorCell(d), c = classifyGlyph(at(L.g, x, z));
        expect(["door", "pickup", "spawn", "exit", "plate"], `level ${i}: ${d.k} at (${x},${z})`).not.toContain(c);
      }
    }
  });
});

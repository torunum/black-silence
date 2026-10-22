import { describe, expect, it, vi } from "vitest";
import { LEVELS } from "../../src/world/levels/index";
import type { BuiltLevel, DecorSpec } from "../../src/world/LevelBuilder";
import { classifyGlyph, decorCell, measureLevel } from "../../src/world/density";
import { validateDecor } from "../../src/world/decor/place";
import { massCells } from "../../src/world/decor/masses";
import { PIECES } from "../../src/world/decor/registry";

/**
 * THE FIVE LEVELS REBUILT ON 2026-10-21 ARE FURNISHED (owner: "bölümleri de geliştirelim. hala zayıf duruyorlar") — the necropolis, the
 * graveyard, the sewers, the factory and the womb, which replaced the reference's lattice levels (and this file replaced
 * `levelDressing567.test.ts`, which held the lattice sewers, factory and womb to the same). Checked on the built levels, with scans
 * written here:
 *
 *  - dressed by their own builders, deterministically, with no `Math.random`, legal by every rule;
 *  - the density targets: at most 8% of the walkable cells bare, no bare region of more than 12 cells, no bare run of more than 6;
 *  - **the arena floors stay open**: in the big room of each and in its boss's room, no mass stands in the core (a cell with no wall,
 *    pillar or window within a step, eight ways), the core is one piece with every mass a wall, masses cover under a fifth of the floor,
 *    and nothing solid stands within two cells of the boss;
 *  - each is dressed in its own theme's vocabulary; no decor sits on a door, a pickup, the spawn or the exit.
 */
const built = (i: number): BuiltLevel => LEVELS[i].build();
const isMass = (d: DecorSpec): boolean => !!PIECES[d.k]?.mass;
const massCellsOf = (L: BuiltLevel): Array<[number, number]> => (L.decor || []).flatMap((d) => massCells(d));
const at = (g: string[][], x: number, z: number): string => g[z]?.[x] ?? "#";
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
const structural = (c: string): boolean => "#WI".includes(c);
const rect = (x0: number, z0: number, x1: number, z1: number) => (x: number, z: number): boolean => x >= x0 && x <= x1 && z >= z0 && z <= z1;

/** [level, its arena, its boss's room, the boss]: the rooms as the level files lay them out. */
const ARENAS: ReadonlyArray<readonly [number, (x: number, z: number) => boolean, (x: number, z: number) => boolean, string]> = [
  [3, rect(32, 22, 50, 38), rect(14, 12, 26, 22), "Z"],   // the plaza of the dead; the court of the sovereign
  [4, rect(11, 33, 30, 42), rect(14, 10, 27, 21), "N"],   // the potter's field; the new graves
  [5, rect(35, 29, 47, 41), rect(14, 9, 26, 20), "H"],    // the overflow chamber; the great cistern
  [6, rect(12, 33, 27, 41), rect(14, 10, 26, 21), "V"],   // the boiler house; the casting pit
  [8, rect(9, 26, 21, 36), rect(6, 4, 23, 15), "G"],      // the great ventricle; the chamber of the heart
];
const REBUILT_NOW = ARENAS.map(([i]) => i);

describe("the rebuilt levels are dressed by their own builders", () => {
  it("each lists a couple of hundred pieces, every one a piece of the kit, and builds the same list every time", () => {
    for (const i of REBUILT_NOW) {
      const L = built(i);
      expect(L.decor!.length, `level ${i}`).toBeGreaterThan(200);
      for (const d of L.decor!) expect(PIECES[d.k], `level ${i}: ${d.k}`).toBeDefined();
      expect(JSON.stringify(built(i).decor), `level ${i} is not the same twice`).toBe(JSON.stringify(L.decor));
    }
  });

  it("never asks Math.random for any of it", () => {
    const spy = vi.spyOn(Math, "random");
    try { for (const i of REBUILT_NOW) built(i); expect(spy).not.toHaveBeenCalled(); } finally { spy.mockRestore(); }
  });

  it("obeys every placement rule, checked from scratch on the finished level", () => {
    for (const i of REBUILT_NOW) expect(validateDecor(built(i)), `level ${i}`).toEqual([]);
  });

  it("is dressed in its own theme's vocabulary", () => {
    const kinds = (i: number) => { const m: Record<string, number> = {}; for (const d of built(i).decor!) m[d.k] = (m[d.k] || 0) + 1; return m; };
    const want: Record<number, Record<string, number>> = {
      3: { sarcophagus: 6, urn: 6, niche: 6, altar: 1, banner: 4, votive: 10 },
      4: { gravestone: 15, gravecross: 8, opengrave: 6, mound: 6, deadtree: 6, gravelamp: 6 },
      5: { tank: 6, pump: 3, lantern: 4, outfall: 3, grate: 6, sludge: 6, pipe: 5 },
      6: { press: 2, furnace: 4, worklamp: 3, machine: 3, drum: 2, cratepile: 4 },
      8: { tumor: 4, growth: 6, glowbulb: 4, eye: 3, vein: 20 },
    };
    for (const i of REBUILT_NOW) for (const [k, n] of Object.entries(want[i])) expect(kinds(i)[k] || 0, `level ${i} lacks ${k}`).toBeGreaterThanOrEqual(n);
  });

  it("puts solid masses in each", () => {
    for (const i of REBUILT_NOW) expect(built(i).decor!.filter(isMass).length, `level ${i}`).toBeGreaterThanOrEqual(4);
  });

  it("meets the density targets: at most 8% bare, no bare region of more than 12 cells, no bare run of more than 6", () => {
    for (const i of REBUILT_NOW) {
      const d = measureLevel(built(i));
      expect(d.bareCells / d.walkable, `level ${i} bare fraction`).toBeLessThanOrEqual(.08);
      expect(d.emptiest.cells, `level ${i} emptiest region`).toBeLessThanOrEqual(12);
      expect(d.longestRun.cells, `level ${i} longest bare run`).toBeLessThanOrEqual(6);
    }
  });
});

describe("the arena floors stay open", () => {
  it("has no mass in an arena's core", () => {
    for (const [i, room, hall] of ARENAS) {
      const L = built(i);
      const coreCell = (x: number, z: number) => N8.every(([dx, dz]) => !structural(at(L.g, x + dx, z + dz)));
      let core = 0;
      for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) if ((room(x, z) || hall(x, z)) && !structural(at(L.g, x, z)) && coreCell(x, z)) core++;
      expect(core, `level ${i}: the arenas have a core`).toBeGreaterThan(40);
      for (const [x, z] of massCellsOf(L)) if (room(x, z) || hall(x, z)) expect(coreCell(x, z), `level ${i}: a mass at (${x},${z}) stands in an arena's open floor`).toBe(false);
    }
  });

  it("keeps each arena's core one piece with every mass a wall", () => {
    for (const [i, room, hall] of ARENAS) {
      const L = built(i), blocked = new Set(massCellsOf(L).map(([x, z]) => z * 4096 + x));
      const open = (x: number, z: number) => !structural(at(L.g, x, z)) && !blocked.has(z * 4096 + x);
      for (const where of [room, hall]) {
        const mine: Array<[number, number]> = [];
        for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) if (where(x, z) && open(x, z) && N8.every(([dx, dz]) => !structural(at(L.g, x + dx, z + dz)))) mine.push([x, z]);
        if (!mine.length) continue;
        const seen = new Set<number>([mine[0][1] * 4096 + mine[0][0]]), stack = [mine[0]];
        while (stack.length) {
          const [x, z] = stack.pop()!;
          for (const [dx, dz] of N4) { const nx = x + dx, nz = z + dz; if (where(nx, nz) && open(nx, nz) && !seen.has(nz * 4096 + nx)) { seen.add(nz * 4096 + nx); stack.push([nx, nz]); } }
        }
        for (const [x, z] of mine) expect(seen.has(z * 4096 + x), `level ${i}: the core cell (${x},${z}) is cut off`).toBe(true);
      }
    }
  });

  it("covers under a fifth of an arena's floor with masses", () => {
    for (const [i, room, hall] of ARENAS) {
      const L = built(i), masses = massCellsOf(L);
      for (const where of [room, hall]) {
        let floor = 0;
        for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) if (where(x, z) && !structural(at(L.g, x, z))) floor++;
        const under = masses.filter(([x, z]) => where(x, z)).length;
        expect(under / floor, `level ${i}: masses cover ${under} of ${floor} cells`).toBeLessThan(.2);
      }
    }
  });

  it("puts no mass within two cells of the boss, and the boss in its room", () => {
    for (const [i, , hall, key] of ARENAS) {
      const L = built(i), boss = L.g.flatMap((row, z) => row.flatMap((c, x) => (c === key ? [[x, z] as const] : [])))[0];
      expect(boss, `level ${i} has its boss`).toBeDefined();
      expect(hall(boss[0], boss[1]), `level ${i}: the boss is in its room`).toBe(true);
      const blocked = new Set(massCellsOf(L).map(([x, z]) => z * 4096 + x));
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) expect(blocked.has((boss[1] + dz) * 4096 + boss[0] + dx), `level ${i}: a mass beside the boss`).toBe(false);
    }
  });
});

describe("what decor leaves alone", () => {
  it("no decor sits on a cell the spawn, a pickup, a door, or the exit holds", () => {
    for (const i of REBUILT_NOW) {
      const L = built(i);
      for (const d of L.decor!) {
        if (PIECES[d.k].mode === "cover") continue;
        const { x, z } = decorCell(d), c = classifyGlyph(at(L.g, x, z));
        expect(["door", "pickup", "spawn", "exit", "plate"], `level ${i}: ${d.k} at (${x},${z})`).not.toContain(c);
      }
    }
  });
});

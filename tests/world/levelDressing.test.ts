import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { LEVELS } from "../../src/world/levels/index";
import type { BuiltLevel, DecorSpec } from "../../src/world/LevelBuilder";
import type { Baseline } from "../../src/world/density";
import { bareGrid, classifyGlyph, measureLevel } from "../../src/world/density";
import { Board, validateDecor } from "../../src/world/decor/place";
import { massBox, massCells } from "../../src/world/decor/masses";
import { PIECES, SETPIECES } from "../../src/world/decor/registry";
import { THEMES, WALL_ROT } from "../../src/world/decor/kit";
import { buildGallery } from "../../src/world/decor/gallery";
import { findAll, floodFill } from "../../src/world/analysis";
import { REBUILT } from "../../src/world/structure/targets";
import { idx, terrainOf, walk } from "../../src/world/structure/walk";

/**
 * LEVELS 1-4 ARE FURNISHED (levels-feel-full plan, Task 2). What the dressing of the dungeon, the
 * church, the necropolis and the graveyard has to be, checked on the built levels themselves and
 * with flood fills and scans written here, not by calling the placement rules back at themselves:
 *
 *  - dressed by their own builders, deterministically, with no `Math.random`;
 *  - legal by every placement rule, and by the from-scratch flood fill (`validateDecor`);
 *  - the density target (the bare fraction and the largest bare region), against the numbers
 *    before any level was dressed (`docs/level-density-baseline.json`);
 *  - the dungeon's great hall is a torture hall, not one empty region (level 1 was rebuilt, deeper-levels plan Task 3: its hall is x 24-42, z 18-30);
 *  - masses never sit in a doorway, on a pickup, in a corridor or a bend, or cut anything off;
 *  - decor never sits beside the real crates and barrels a player has learned to shoot;
 *  - nothing solid stands where the two trace fixtures walk and fight;
 *  - the pickups and props of level 1 (rebuilt) and the ones of levels 2-4 that did not move.
 * A rebuilt level (`REBUILT`) is held to the absolute targets (the bare fraction, the bare region) and not to the baseline it replaced.
 */
const DRESSED = [1, 2, 3, 4] as const;
/** Level 1's upper gaol, the part of the rebuilt level the combat trace walks and fights in: the spawn cell, the cell block and its cells. */
const UPPER_GAOL = { x1: 27, z1: 12 };
const built = (i: number): BuiltLevel => LEVELS[i].build();
const baseline = JSON.parse(readFileSync(new URL("../../docs/level-density-baseline.json", import.meta.url), "utf8")) as Baseline;
const grid = (...rows: string[]): string[][] => rows.map((r) => [...r]);
const at = (g: string[][], x: number, z: number): string => g[z]?.[x] ?? "#";
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const isMass = (d: DecorSpec): boolean => !!PIECES[d.k]?.mass;
/** Every grid cell some mass covers, from the pieces' boxes. */
const massCellsOf = (L: BuiltLevel): Array<[number, number]> => (L.decor || []).flatMap((d) => massCells(d));

describe("levels 1-4 are dressed by their own builders", () => {
  it("each lists a hundred and more pieces, every one a piece of the kit, and builds the same list every time", () => {
    for (const i of DRESSED) {
      const L = built(i);
      expect(L.decor!.length, `level ${i}`).toBeGreaterThan(120);
      for (const d of L.decor!) expect(PIECES[d.k], `level ${i}: ${d.k}`).toBeDefined();
      expect(JSON.stringify(built(i).decor), `level ${i} is not the same twice`).toBe(JSON.stringify(L.decor));
    }
  });

  it("never asks Math.random for any of it", () => {
    const spy = vi.spyOn(Math, "random");
    try { for (const i of DRESSED) built(i); expect(spy).not.toHaveBeenCalled(); } finally { spy.mockRestore(); }
  });

  it("obeys every placement rule, checked from scratch on the finished level (the rules, the lookalike rule and the flood fill with masses as walls)", () => {
    for (const i of DRESSED) expect(validateDecor(built(i)), `level ${i}`).toEqual([]);
  });

  it("puts solid masses in each: the dungeon's instruments, the church's altar and fallen saints, the tombs' sarcophagi, the yard's stones", () => {
    const want: Record<number, number> = { 1: 12, 2: 8, 3: 12, 4: 30 };
    for (const i of DRESSED) expect(built(i).decor!.filter(isMass).length, `level ${i}`).toBeGreaterThanOrEqual(want[i]);
    const kinds = (i: number) => new Set(built(i).decor!.filter(isMass).map((d) => d.k));
    for (const k of ["rack", "stocks", "maiden", "cratepile"]) expect(kinds(1).has(k), `the dungeon lacks a ${k}`).toBe(true);
    for (const k of ["altar", "fallenstatue", "font"]) expect(kinds(2).has(k), `the church lacks a ${k}`).toBe(true);
    for (const k of ["sarcofree", "tombfree", "sarcophagus"]) expect(kinds(3).has(k), `the necropolis lacks a ${k}`).toBe(true);
    for (const k of ["deadtree", "gravestone", "gravecross"]) expect(kinds(4).has(k), `the graveyard lacks a ${k}`).toBe(true);
  });
});

describe("the density targets", () => {
  it("leaves at most 8% of each level's walkable cells bare, no bare region of more than 12 cells and no bare run of more than 6 — against 17-46% and 45-257 cells before", () => {
    for (const i of DRESSED) {
      const d = measureLevel(built(i)), b = baseline.rows[i];
      expect(d.bareCells / d.walkable, `level ${i} bare fraction`).toBeLessThanOrEqual(.08);
      expect(d.emptiest.cells, `level ${i} emptiest region`).toBeLessThanOrEqual(12);
      expect(d.longestRun.cells, `level ${i} longest bare run`).toBeLessThanOrEqual(6);
      if (REBUILT.includes(i)) continue;   // a rebuilt level is another level: it has no baseline of its own to be a collapse from
      // and it is the same level: the walkable area, the enemies and the pickups are the numbers they were
      expect(d.walkable, `level ${i} walkable`).toBe(b.walkable);
      expect(d.enemies, `level ${i} enemies`).toBe(b.enemies);
      expect(d.pickupsTotal, `level ${i} pickups`).toBe(b.pickups);
      // the drop is a collapse, not a nudge
      expect(d.bareCells, `level ${i} bare cells`).toBeLessThan(b.bare * .2);
      expect(d.emptiest.cells, `level ${i} emptiest`).toBeLessThan(b.emptiest.cells * .5);
    }
  });

  it("measures the baseline it compares with: the undressed level is as bare as the baseline says", () => {
    for (const i of DRESSED.filter((n) => !REBUILT.includes(n))) {
      const L = built(i); L.decor = [];
      const d = measureLevel(L);
      // the pickups and barrels level 1 moved change its bare cells by a handful; the rest are the baseline's numbers to the cell
      const b = baseline.rows[i];
      expect(Math.abs(d.bareCells - b.bare), `level ${i}`).toBeLessThanOrEqual(i === 1 ? 24 : 0);
    }
  });

  it("holds the great hall to a torture hall: no bare region of more than 12 cells inside it, and the instruments are there (against its walls)", () => {
    const L = built(1), bare = bareGrid(L);
    const inHall = (x: number, z: number) => x >= 24 && x <= 42 && z >= 18 && z <= 30;
    const seen = new Set<string>();
    let biggest = 0;
    for (let z = 18; z <= 30; z++) for (let x = 24; x <= 42; x++) {
      if (!bare[z][x] || seen.has(x + "," + z)) continue;
      let n = 0; const stack: Array<[number, number]> = [[x, z]]; seen.add(x + "," + z);
      while (stack.length) {
        const [cx, cz] = stack.pop()!; n++;
        for (const [dx, dz] of N4) { const nx = cx + dx, nz = cz + dz; if (inHall(nx, nz) && bare[nz]?.[nx] && !seen.has(nx + "," + nz)) { seen.add(nx + "," + nz); stack.push([nx, nz]); } }
      }
      biggest = Math.max(biggest, n);
    }
    expect(biggest, "the hall's biggest bare region").toBeLessThanOrEqual(12);
    const inside = L.decor!.filter((d) => inHall(Math.floor(d.x + .5), Math.floor(d.z + .5)));
    const count = (k: string) => inside.filter((d) => d.k === k).length;
    expect(inside.length, "pieces in the hall").toBeGreaterThan(70);
    // (the rebuilt hall keeps the old one's lesson: the racks, the stocks and the slab stand against its north wall, not on the open floor,
    // because enemies pinned on their flat faces: tests/enemies/stuckCheck.test.ts)
    for (const k of ["slab", "rack", "stocks"]) for (const d of inside.filter((p) => p.k === k)) expect(d.z, `a ${k} stands on the north wall's row`).toBe(18);
    expect(count("slab"), "one slab").toBe(1);
    expect(count("rack"), "racks").toBeGreaterThanOrEqual(2);
    expect(count("stocks"), "stocks").toBeGreaterThanOrEqual(1);
    expect(count("cage"), "cages on chains").toBeGreaterThanOrEqual(6);
    expect(count("maiden"), "iron maidens on its south wall").toBeGreaterThanOrEqual(3);
    for (const d of inside.filter((p) => p.k === "maiden")) expect(d.z, "a maiden stands on the south wall's row").toBe(30);
  });
});

describe("masses never get in the way", () => {
  it("stand on plain floor: never on or beside a door, a pickup, the spawn, the exit; never on an enemy", () => {
    for (const i of DRESSED) {
      const L = built(i);
      for (const [x, z] of massCellsOf(L)) {
        const c = at(L.g, x, z);
        expect(c, `level ${i}: a mass at (${x},${z}) stands on '${c}'`).toBe(".");
        for (const [dx, dz] of N4) {
          const n = classifyGlyph(at(L.g, x + dx, z + dz));
          expect(["door", "pickup", "spawn", "exit", "plate"], `level ${i}: a mass at (${x},${z}) beside a ${n}`).not.toContain(n);
        }
      }
    }
  });

  it("leave every corridor, bend, junction and doorway passable: the open cells round each mass still reach one another with every mass a wall", () => {
    for (const i of DRESSED) {
      const L = built(i), blocked = new Set(massCellsOf(L).map(([x, z]) => z * 4096 + x));
      const open = (x: number, z: number) => !"#WI".includes(at(L.g, x, z)) && !blocked.has(z * 4096 + x);
      const component = (sx: number, sz: number): Set<number> => {
        const seen = new Set<number>([sz * 4096 + sx]), stack: Array<[number, number]> = [[sx, sz]];
        while (stack.length) {
          const [x, z] = stack.pop()!;
          for (const [dx, dz] of N4) { const nx = x + dx, nz = z + dz; if (open(nx, nz) && !seen.has(nz * 4096 + nx)) { seen.add(nz * 4096 + nx); stack.push([nx, nz]); } }
        }
        return seen;
      };
      for (const key of blocked) {
        const x = key % 4096, z = (key - x) / 4096;
        const around = N4.map(([dx, dz]) => [x + dx, z + dz] as const).filter(([nx, nz]) => open(nx, nz));
        if (around.length < 2) continue;
        const comp = component(around[0][0], around[0][1]);
        for (const [nx, nz] of around) expect(comp.has(nz * 4096 + nx), `level ${i}: the mass at (${x},${z}) cuts (${nx},${nz}) off from (${around[0][0]},${around[0][1]})`).toBe(true);
      }
    }
  });

  it("leave every pickup, key, exit, enemy spawn and prop reachable from the spawn by a flood fill with the masses as walls", () => {
    for (const i of DRESSED) {
      const L = built(i), [spawn] = findAll(L.g, "P");
      const walled = L.g.map((r) => [...r]);
      for (const [x, z] of massCellsOf(L)) walled[z][x] = "#";
      const before = floodFill(L.g, spawn, true), after = floodFill(walled, spawn, true);
      let targets = 0;
      for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) {
        const cls = classifyGlyph(L.g[z][x]);
        if (!["pickup", "enemy", "exit", "prop", "plate", "piano"].includes(cls) || !before[z][x]) continue;
        targets++;
        expect(after[z][x], `level ${i}: '${L.g[z][x]}' at (${x},${z}) is cut off`).toBe(true);
      }
      expect(targets, `level ${i} has things to reach`).toBeGreaterThan(25);
    }
  });

  it("are found by the from-scratch check when they do cut something off: a crate pile sealing a pickup in a dead end is reported twice, once by its own rule and once by the flood fill", () => {
    const g = grid("#######", "#P....#", "#####.#", "#####h#", "#######");
    const bad = validateDecor({ g, decor: [{ k: "cratepile", x: 5, z: 2, r: WALL_ROT.e }] });
    expect(bad.map((p) => p.why).join(" | ")).toMatch(/beside a pickup|blocks the way/);
    expect(bad.map((p) => p.why).join(" | ")).toMatch(/cut off the pickup 'h' at \(5,3\)/);
    expect(validateDecor({ g, decor: [] })).toEqual([]);
  });
});

describe("decor is never mistaken for a prop that breaks", () => {
  const ROOM = grid(
    "############",
    "#....x.....#",
    "#..........#",
    "#.....O....#",
    "#..........#",
    "############",
  );

  it("keeps a crate pile or a drum two cells from a real crate `x` or barrel `O`, and only that far", () => {
    const b = new Board(ROOM);
    for (const k of ["cratepile", "drum"]) {
      expect(b.why({ k, x: 3, z: 1, r: WALL_ROT.n }), `${k} two cells from the crate`).toMatch(/lookalike/);
      expect(b.why({ k, x: 7, z: 1, r: WALL_ROT.n }), `${k} two cells the other side`).toMatch(/lookalike/);
      expect(b.why({ k, x: 6, z: 4, r: WALL_ROT.s }), `${k} beside the barrel`).toMatch(/lookalike/);
      expect(b.why({ k, x: 2, z: 1, r: WALL_ROT.n }), `${k} three cells off`).toBeNull();
      expect(b.why({ k, x: 9, z: 4, r: WALL_ROT.s }), `${k} three cells from the barrel`).toBeNull();
    }
    expect(b.why({ k: "bench", x: 4, z: 1, r: WALL_ROT.n }), "a bench is not a lookalike").toBeNull();
    expect(b.why({ k: "sarcophagus", x: 4, z: 1, r: WALL_ROT.n }), "nor is a sarcophagus").toBeNull();
  });

  it("marks exactly the crate pile and the drum as lookalikes, and no other piece", () => {
    expect(Object.keys(PIECES).filter((k) => PIECES[k].lookalike).sort()).toEqual(["cratepile", "drum"]);
    expect(PIECES.cratepile.lookalike).toBe("crate");
    expect(PIECES.drum.lookalike).toBe("barrel");
  });

  it("puts no crate pile or drum within two cells of a real crate or barrel on any of the seven levels, scanned here and not by the rule", () => {
    for (let i = 1; i <= 7; i++) {
      const L = built(i);
      const real: Array<[number, number]> = [];
      L.g.forEach((row, z) => row.forEach((c, x) => { if (c === "x" || c === "O") real.push([x, z]); }));
      for (const d of L.decor || []) {
        if (!PIECES[d.k].lookalike) continue;
        const cx = Math.floor(d.x + .5), cz = Math.floor(d.z + .5);
        for (const [x, z] of real) expect(Math.max(Math.abs(x - cx), Math.abs(z - cz)), `level ${i}: a ${d.k} at (${cx},${cz}) beside the '${L.g[z][x]}' at (${x},${z})`).toBeGreaterThan(2);
      }
    }
  });

  it("makes the decor crate visibly not the shootable one: dark, strapped, its top pried open, a tarp over it", async () => {
    const { makeMat } = await import("../../src/world/decor/kit");
    const decorCrate = (makeMat("crate") as unknown as { color: { getHex(): number } }).color.getHex();
    const r = (h: number) => (h >> 16) & 255, gr = (h: number) => (h >> 8) & 255, b = (h: number) => h & 255;
    // the prop crate wears the wood texture untinted (white); the decor crate's tint is a dark brown, well under half brightness
    expect(Math.max(r(decorCrate), gr(decorCrate), b(decorCrate))).toBeLessThan(110);
    const parts = new Map<string, number>();
    const cratepile = PIECES.cratepile.build;
    cratepile((mat) => parts.set(mat, (parts.get(mat) || 0) + 1), () => {}, { k: "cratepile", x: 0, z: 0 }, 3, () => {});
    expect(parts.get("wrought"), "iron straps").toBeGreaterThanOrEqual(6);
    expect(parts.get("canvas"), "a tarp").toBeGreaterThanOrEqual(1);
    expect(parts.get("dark"), "the gap where a lid was pried off").toBeGreaterThanOrEqual(3);
  });
});

describe("the two traces walk where nothing solid stands", () => {
  it("level 1: no mass in the upper gaol (the spawn cell, the cell block and its three cells: x <= 27, z <= 12), where combatTrace.test.ts starts, walks and fights", () => {
    for (const [x, z] of massCellsOf(built(1))) expect(x <= UPPER_GAOL.x1 && z <= UPPER_GAOL.z1, `a mass at (${x},${z}) is on the combat trace's route`).toBe(false);
  });

  it("level 2: no mass in the ritual room or the crypt (x 9-23, z >= 19), where bossTrace.test.ts stands and fights", () => {
    for (const [x, z] of massCellsOf(built(2))) expect(x >= 9 && x <= 23 && z >= 19, `a mass at (${x},${z}) is where the boss trace fights`).toBe(false);
  });

  it("level 1: nothing stands within 15 steps of the spawn; the cell block's two zombies are 15-25 steps off: the fight comes to a player who walked there", () => {
    // the combat trace's fight: tests/integration/combatTrace.test.ts walks east from the spawn and meets them
    const L = built(1), t = terrainOf(L), [spawn] = findAll(L.g, "P"), dist = walk(t, idx(t, spawn.x, spawn.z), { secrets: "none" }).dist;
    const foes = ["z", "f", "g", "m", "t", "s", "j", "U"].flatMap((c) => findAll(L.g, c).map((p) => ({ c, ...p, d: dist[idx(t, p.x, p.z)] })));
    expect(Math.min(...foes.map((f) => f.d)), "the nearest enemy, steps").toBeGreaterThanOrEqual(15);
    const zs = foes.filter((f) => f.c === "z" && f.z <= 7).map((f) => f.d);
    expect(zs.length, "zombies in the cell block").toBe(2);
    for (const d of zs) { expect(d).toBeGreaterThanOrEqual(15); expect(d).toBeLessThanOrEqual(25); }
  });
});

describe("the pickups and props that moved, and the ones that did not", () => {
  const glyphs = (g: string[][], ch: string) => findAll(g, ch).map((c) => `${c.x},${c.z}`);

  it("level 1: the spawn cell holds no pickup and no enemy (the quiet start), and the cell block's west end only a bullets box", () => {
    const g = built(1).g;
    for (let z = 3; z <= 6; z++) for (let x = 2; x <= 6; x++) expect(["floor", "spawn", "torch"], `(${x},${z})`).toContain(classifyGlyph(g[z][x]));
    for (let z = 2; z <= 7; z++) for (let x = 8; x <= 12; x++) expect(["floor", "pickup", "torch"], `(${x},${z})`).toContain(classifyGlyph(g[z][x]));
    expect(measureLevel(built(1)).pickupsTotal).toBe(35);
  });

  it("level 1: two explosive barrels stand in the great hall, and the one crate in the armoury", () => {
    const g = built(1).g;
    expect(glyphs(g, "O").sort()).toEqual(["28,22", "38,24"].sort());
    expect(glyphs(g, "x")).toEqual(["49,23"]);
  });

  it("levels 2-4 keep every pickup where the reference put them: they were already spread through their rooms", () => {
    // recorded from commit 64b4e8d's grids: glyph@x,z in the loader's scan order
    const ref: Record<number, string> = {
      2: "o@2,2 o@6,2 5@4,3 h@23,5 h@26,5 a@26,8 r@28,9 b@2,11 h@7,13 K@31,17 b@15,19 c@2,20 c@6,20 4@4,21 6@16,21 h@20,21 o@27,21 c@29,21 b@12,22 r@4,23",
      3: "o@28,3 h@15,5 a@18,5 h@26,5 K@31,11 h@7,13 b@31,16 a@23,19 a@6,20 c@26,20 r@30,20 r@4,21 r@20,21 c@28,21 b@12,22 o@26,22 b@4,23 h@28,23",
      4: "o@28,3 h@15,5 a@18,5 h@26,5 K@31,11 h@7,13 b@31,16 a@23,19 a@6,20 9@26,20 r@30,20 r@4,21 r@20,21 7@28,21 b@12,22 9@26,22 b@4,23 h@28,23",
    };
    for (const i of [2, 3, 4]) {
      const L = built(i), out: string[] = [];
      for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) if (classifyGlyph(L.g[z][x]) === "pickup") out.push(`${L.g[z][x]}@${x},${z}`);
      expect(out.join(" "), `level ${i}`).toBe(ref[i]);
    }
  });
});

describe("the gallery shows the set-pieces too", () => {
  it("has every piece a theme's builder places by hand, legally", () => {
    for (const t of THEMES) {
      const L = buildGallery(t), shown = new Set(L.decor!.map((d) => d.k));
      for (const k of SETPIECES[t]) expect(shown.has(k), `${t} gallery lacks ${k}`).toBe(true);
      expect(validateDecor(L), t).toEqual([]);
    }
  });

  it("gives every set-piece that is a mass a box that fits its cell", () => {
    for (const t of THEMES) for (const k of SETPIECES[t]) {
      if (!PIECES[k].mass) continue;
      const b = massBox({ k, x: 3, z: 3, r: 0 })!;
      expect(b.x0).toBeGreaterThanOrEqual(6); expect(b.x1).toBeLessThanOrEqual(8);
      expect(b.z0).toBeGreaterThanOrEqual(6); expect(b.z1).toBeLessThanOrEqual(8);
    }
  });
});

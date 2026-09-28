import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { LEVELS } from "../../src/world/levels/index";
import type { DecorSpec } from "../../src/world/LevelBuilder";
import { MATERIAL_NAMES, THEMES, WALL_ROT, type Theme } from "../../src/world/decor/kit";
import { PIECES, VOCAB, themeOf } from "../../src/world/decor/registry";
import { addPiece, costOf, partMaterial, type Parts } from "../../src/world/decor/parts";
import { Board, Decorator, validateDecor } from "../../src/world/decor/place";
import { buildGallery } from "../../src/world/decor/gallery";
import { findAll, floodFill } from "../../src/world/analysis";

/**
 * THE DRESSING KIT (levels-feel-full plan, Task 1): a vocabulary for every
 * theme, pieces that stay inside their cell and their mode, placement rules
 * that keep decor off doors, pickups and corridors, a cost that stays bounded,
 * and a placement that is a pure function of the grid. What the loader does
 * with the pieces on screen (merging, the cast/receive split) is
 * `tests/world/decorKitScene.test.ts`.
 */

/** A small hand-drawn grid: rows of the level builders' own glyphs. */
const grid = (...rows: string[]): string[][] => rows.map((r) => [...r]);
const decorOf = (k: string, x: number, z: number, r?: number): DecorSpec => ({ k, x, z, ...(r === undefined ? {} : { r }) });
const N = WALL_ROT.n;

/** A room 7 wide with a pickup at (7,2) and a door at (8,3), and a 1-wide corridor running east from the door. */
const ROOM = grid(
  "#############",
  "#.......#####",
  "#......h#####",
  "#.......+....",
  "#.......#####",
  "#.......#####",
  "#############",
);
/** The prologue's own pieces, which the kit moved and did not change: held to the rules they were built under, not the kit's. */
const PROLOGUE = new Set(["headstone", "cross", "tomb", "tree", "coffin", "lid", "bones", "chain", "bowl", "ember", "bridge", "mound", "hand", "grass", "shovel", "roof"]);

describe("every theme has a vocabulary", () => {
  it("names at least six pieces for each of the seven themes, all of which exist and none twice", () => {
    expect(THEMES).toHaveLength(7);
    for (const t of THEMES) {
      const kinds = VOCAB[t].map((v) => v.k);
      expect(kinds.length, t).toBeGreaterThanOrEqual(6);
      expect(new Set(kinds).size, `${t} lists a piece twice`).toBe(kinds.length);
      for (const v of VOCAB[t]) { expect(PIECES[v.k], `${t}: ${v.k}`).toBeDefined(); expect(v.w).toBeGreaterThan(0); }
    }
  });

  it("gives every themed level of the game a theme, and hell and the prologue none", () => {
    const themed = LEVELS.map((l) => themeOf(l.sub));
    expect(themed.slice(1)).toEqual(["dungeon", "church", "necropolis", "graveyard", "sewers", "factory", "womb"]);
    expect(themed[0]).toBeUndefined();
  });

  it("has no piece in a vocabulary that another mode cannot reach: each theme offers wall, floor and ceiling dressing", () => {
    for (const t of THEMES) {
      const modes = new Set(VOCAB[t].map((v) => PIECES[v.k].mode));
      const walls = modes.has("wall") || modes.has("edge");
      const floor = modes.has("flat") || modes.has("free");
      expect(walls, `${t} has nothing for the walls`).toBe(true);
      expect(floor, `${t} has nothing for the floor`).toBe(true);
    }
  });
});

describe("each piece is cheap, and stays where it says", () => {
  /** Each piece built alone at cell (0,0) with its size and yaw untouched: its geometry, in cell-centred coordinates (world (1,_,1) is the centre). */
  function build(k: string): { boxes: THREE.Box3; mats: string[]; tris: number } {
    const parts: Parts = new Map();
    addPiece(parts, { k, x: 0, z: 0 });
    const boxes = new THREE.Box3(), mats: string[] = [];
    let tris = 0;
    for (const [key, list] of parts) {
      mats.push(partMaterial(key));
      for (const g of list) { g.computeBoundingBox(); boxes.union(g.boundingBox!); tris += g.getAttribute("position").count / 3; }
    }
    boxes.min.sub(new THREE.Vector3(1, 0, 1)); boxes.max.sub(new THREE.Vector3(1, 0, 1));
    return { boxes, mats, tris };
  }
  const kit = Object.keys(PIECES).filter((k) => !PROLOGUE.has(k));

  it("uses only materials the kit defines, and no more than 400 triangles", () => {
    for (const k of Object.keys(PIECES)) {
      const { mats, tris } = build(k);
      for (const m of mats) expect(MATERIAL_NAMES, `${k} asks for a material called ${m}`).toContain(m);
      if (!PROLOGUE.has(k) || !["grass", "ember", "bridge", "roof"].includes(k)) expect(tris, `${k} is ${tris} triangles`).toBeLessThanOrEqual(400);
    }
  });

  it("keeps every floor and wall piece inside its own cell (a wall piece may not go into the wall)", () => {
    for (const k of kit) {
      const { boxes } = build(k), mode = PIECES[k].mode;
      if (mode === "hang") continue;   // hung from the ceiling on the cell's axis
      expect(boxes.min.x, `${k} min x`).toBeGreaterThanOrEqual(-1.05);
      expect(boxes.max.x, `${k} max x`).toBeLessThanOrEqual(1.05);
      expect(boxes.max.z, `${k} max z`).toBeLessThanOrEqual(1.1);
      if (mode === "edge" || mode === "wall") expect(boxes.min.z, `${k} sinks into its wall`).toBeGreaterThanOrEqual(-1.06);
      else expect(boxes.min.z, `${k} min z`).toBeGreaterThanOrEqual(-1.05);
    }
  });

  it("holds each mode to its promise: flat pieces lie under 0.4, wall pieces stand out under 0.6, hung pieces clear a player's head", () => {
    for (const k of kit) {
      const { boxes } = build(k), mode = PIECES[k].mode;
      if (mode === "flat") expect(boxes.max.y, `${k} is not flat`).toBeLessThanOrEqual(.4);
      if (mode === "wall") expect(boxes.max.z, `${k} sticks out of the wall`).toBeLessThanOrEqual(-1 + .6);
      if (mode === "hang") expect(boxes.min.y, `${k} hangs into the player`).toBeGreaterThanOrEqual(1.3);
      if (mode === "edge") expect(boxes.max.z - -1, `${k} is deeper than a metre and a half`).toBeLessThanOrEqual(1.25);
    }
  });

  it("makes exactly the shadow casters the masses are: no small clutter casts", () => {
    for (const k of kit) {
      const info = PIECES[k];
      const { boxes } = build(k), big = (boxes.max.x - boxes.min.x) * (boxes.max.y - boxes.min.y) * (boxes.max.z - boxes.min.z);
      if (info.cls === "decor") expect(big, `${k} casts but is small`).toBeGreaterThan(.5);   // a caster is a mass
      // the flat, wall and hung pieces are never casters, and every kit piece is one or the other
      if (["flat", "wall", "hang"].includes(info.mode)) expect(info.cls, `${k} is ${info.mode} and must not cast`).toBe("clutter");
      expect(["decor", "clutter"], k).toContain(info.cls);
    }
    expect(kit.filter((k) => PIECES[k].cls === "decor").sort(), "the casters").toEqual(["cratepile", "conveyor", "fallenstatue", "machine", "sarcophagus"].sort());
  });

  it("leaves the prologue's own pieces as they were: casters, but the grass", () => {
    for (const k of ["headstone", "cross", "tomb", "tree", "coffin", "lid", "bones", "chain", "bowl", "ember", "bridge", "mound", "hand", "shovel", "roof"])
      expect(PIECES[k].cls, k).toBe("decor");
    expect(PIECES.grass.cls).toBe("grass");
  });
});

describe("placement rules", () => {
  const dress = (g: string[][]) => new Decorator({ g, W: g[0].length, H: g.length }, "dungeon");

  it("never puts decor on a door cell", () => {
    for (const k of ["straw", "cratepile", "banner", "cage", "candelabra"]) {
      expect(new Board(ROOM).why(decorOf(k, 8, 3, N)), k).toMatch(/door/);
    }
  });

  it("never puts a bulky piece beside a door or a pickup, and never covers a pickup at all", () => {
    const b = new Board(ROOM);
    expect(b.why(decorOf("cratepile", 9, 3, WALL_ROT.n))).toMatch(/beside a door/);
    expect(b.why(decorOf("urn", 6, 2))).toMatch(/beside a pickup/);            // the pickup is at (7,2)
    expect(b.why(decorOf("straw", 7, 2))).toMatch(/pickup/);                   // on it
    expect(b.why(decorOf("cage", 7, 2))).toMatch(/pickup/);
    expect(b.why(decorOf("straw", 7, 3))).toBeNull();                          // a flat piece next to a door is fine
  });

  it("never blocks a 1-wide corridor: a bulky piece is refused in it, a wall piece is not", () => {
    // the corridor is x 9-12 at z 3, walls to its north and south; (9,3) is beside the door, so the cells to try are 10 and 11
    const b = new Board(ROOM);
    expect(b.why(decorOf("cratepile", 11, 3, WALL_ROT.n))).toMatch(/blocks the way/);
    expect(b.why(decorOf("sarcophagus", 10, 3, WALL_ROT.s))).toMatch(/blocks the way/);
    expect(b.why(decorOf("urn", 11, 3))).toMatch(/blocks the way/);
    expect(b.why(decorOf("banner", 11, 3, WALL_ROT.n))).toBeNull();
    expect(b.why(decorOf("straw", 11, 3))).toBeNull();
    expect(b.why(decorOf("cage", 11, 3))).toBeNull();
  });

  it("refuses a bulky piece at a bend and accepts one in an open room", () => {
    const bend = grid("#####", "#...#", "###.#", "###.#", "#####");   // an L: (3,1) is the bend
    expect(new Board(bend).why(decorOf("cratepile", 3, 1, WALL_ROT.n))).toMatch(/blocks the way/);
    expect(new Board(ROOM).why(decorOf("cratepile", 2, 1, WALL_ROT.n))).toBeNull();
  });

  it("refuses a second bulky piece in a cell, but not in the next", () => {
    const g = dress(ROOM);
    expect(g.tryPlace("cratepile", 2, 1)).toBeNull();
    expect(g.tryPlace("bench", 2, 1)).toBeTruthy();
    expect(g.tryPlace("bench", 3, 1)).toBeNull();
  });

  it("wants a wall behind an edge or wall piece, and one piece to a wall side", () => {
    expect(new Board(ROOM).why(decorOf("cratepile", 4, 3, N))).toMatch(/no wall behind/);
    const g = dress(ROOM);
    expect(g.tryPlace("banner", 4, 1, { r: N })).toBeNull();
    expect(g.tryPlace("shackles", 4, 1, { r: N })).toMatch(/already dressed/);
    expect(g.tryPlace("shackles", 5, 1, { r: N + .6 })).toMatch(/squarely/);
  });

  it("wants a solid piece on an I cell, and nothing else there", () => {
    const g = grid("#####", "#.I.#", "#####");
    expect(new Board(g).why(decorOf("headstone", 2, 1))).toBeNull();
    expect(new Board(g).why(decorOf("headstone", 1, 1))).toMatch(/I cell/);
    expect(new Board(g).why(decorOf("straw", 2, 1))).toMatch(/wall or pillar/);
  });

  it("keeps a piece within a third of a cell of its cell's centre, and on the grid", () => {
    expect(new Board(ROOM).why(decorOf("straw", 3.4, 3))).toMatch(/centre/);
    expect(new Board(ROOM).why(decorOf("straw", -3, 3))).toBe("off the grid");
    expect(new Board(ROOM).why(decorOf("nonesuch", 3, 3))).toMatch(/no piece/);
  });

  it("throws from place() so authored dressing that breaks a rule is a bug the level's own tests catch", () => {
    expect(() => dress(ROOM).place("cratepile", 11, 3, { r: N })).toThrow(/blocks the way/);
    expect(() => dress(ROOM).place("straw", 3, 3)).not.toThrow();
  });

  it("picks a wall side for an edge piece from the grid, and refuses where there is no wall", () => {
    const g = dress(ROOM);
    g.place("bench", 1, 3);   // against the west wall
    expect(g.specs[0].r).toBeCloseTo(WALL_ROT.w);
    expect(dress(ROOM).tryPlace("bench", 4, 3)).toMatch(/no wall beside/);
  });

  it("places a glyph layer", () => {
    const g = dress(ROOM).layer(["", " s.b", "", ""], { s: "straw", b: "bench" });   // ' ' and '.' are not in the legend: skipped
    expect(g.specs.map((d) => [d.k, d.x, d.z])).toEqual([["straw", 1, 1], ["bench", 3, 1]]);
  });

  it("accepts nothing it later rejects: whatever a Decorator placed, validateDecor passes", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const g = dress(ROOM); g.clutter({ density: .9, seed });
      expect(validateDecor({ g: ROOM, decor: g.specs })).toEqual([]);
    }
  });

  it("finds a hand-made list's every fault", () => {
    const decor = [decorOf("straw", 8, 3), decorOf("cratepile", 9, 3, N), decorOf("cratepile", 2, 1, N), decorOf("banner", 2, 1, N), decorOf("urn", 5, 3)];
    const bad = validateDecor({ g: ROOM, decor });
    // a door cell; beside a door; fine; the wall an edge piece stands against is taken; fine
    expect(bad.map((p) => p.spec.k + ":" + decor.indexOf(p.spec))).toEqual(["straw:0", "cratepile:1", "banner:3"]);
  });
});

describe("clutter along walls", () => {
  const level = (i: number) => LEVELS[i].build();
  const themeOfLevel = (i: number): Theme => themeOf(LEVELS[i].sub)!;

  it("is deterministic: the same grid, theme, density and seed give the same pieces, and another seed another", () => {
    const run = (seed: number) => { const L = level(1); const d = new Decorator(L, "dungeon"); d.clutter({ density: .4, seed }); return JSON.stringify(d.specs); };
    expect(run(3)).toBe(run(3));
    expect(run(3)).not.toBe(run(4));
  });

  it("never touches Math.random", () => {
    const spy = vi.spyOn(Math, "random");
    try {
      for (let i = 1; i <= 7; i++) { const L = level(i); new Decorator(L, themeOfLevel(i)).clutter({ density: .4 }); }
      for (const t of THEMES) buildGallery(t);
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });

  it("dresses every real level with a hundred or so pieces, all legal, along walls only", () => {
    for (let i = 1; i <= 7; i++) {
      const L = level(i), d = new Decorator(L, themeOfLevel(i));
      const n = d.clutter({ density: .4, seed: 3 });
      expect(n, `level ${i}`).toBeGreaterThan(50);
      L.decor = d.specs;
      expect(validateDecor(L), `level ${i}`).toEqual([]);
      for (const s of d.specs) expect(d.wallSides(Math.floor(s.x + .5), Math.floor(s.z + .5)).length, `level ${i} ${s.k}`).toBeGreaterThan(0);
    }
  });

  it("keeps every level as walkable as it was — checked by an independent flood fill, not by the rules' own code — and off every door and pickup", () => {
    for (let i = 1; i <= 7; i++) {
      const L = level(i), d = new Decorator(L, themeOfLevel(i)); d.clutter({ density: .9, seed: 5 });
      const [spawn] = findAll(L.g, "P");
      const before = floodFill(L.g, spawn, true);
      const blocked = L.g.map((r) => [...r]);
      for (const s of d.specs) {
        const c = { x: Math.floor(s.x + .5), z: Math.floor(s.z + .5) }, ch = L.g[c.z][c.x];
        expect("+DSPXhAabocrKi".includes(ch) || /[0-9]/.test(ch), `level ${i}: ${s.k} at (${c.x},${c.z}) sits on '${ch}'`).toBe(false);
        if (PIECES[s.k].mode === "edge" || PIECES[s.k].mode === "free") blocked[c.z][c.x] = "#";
      }
      const after = floodFill(blocked, spawn, true);
      for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++)
        if (blocked[z][x] !== "#" || L.g[z][x] === "#") expect(after[z][x], `level ${i}: (${x},${z}) is cut off`).toBe(before[z][x]);
    }
  });

  it("uses the theme's vocabulary and nothing else", () => {
    for (let i = 1; i <= 7; i++) {
      const d = new Decorator(level(i), themeOfLevel(i)); d.clutter({ density: .5, seed: 2 });
      const allowed = new Set(VOCAB[themeOfLevel(i)].map((v) => v.k));
      for (const s of d.specs) expect(allowed.has(s.k), `level ${i}: ${s.k}`).toBe(true);
    }
  });

  it("respects density, kinds and where", () => {
    const L = level(1);
    const count = (o: object) => { const d = new Decorator(L, "dungeon"); d.clutter(o); return d.specs.length; };
    expect(count({ density: 0 })).toBe(0);
    expect(count({ density: .8 })).toBeGreaterThan(count({ density: .2 }));
    const d = new Decorator(L, "dungeon"); d.clutter({ density: .8, kinds: ["straw"] });
    expect(new Set(d.specs.map((s) => s.k))).toEqual(new Set(["straw"]));
    const w = new Decorator(L, "dungeon"); w.clutter({ density: .8, where: (x) => x < 12 });
    expect(w.specs.every((s) => s.x < 12.5)).toBe(true);
  });

  it("does not move the level: a dressed grid is the grid it was", () => {
    const before = JSON.stringify(level(2).g);
    const L = level(2); new Decorator(L, "church").clutter({ density: .5 });
    expect(JSON.stringify(L.g)).toBe(before);
  });
});

describe("the cost stays bounded", () => {
  it("merges each gallery hall into at most 16 meshes, and the clutter of each real level into at most 16", () => {
    for (const t of THEMES) expect(costOf(buildGallery(t).decor!).meshes, `${t} gallery`).toBeLessThanOrEqual(16);
    for (let i = 1; i <= 7; i++) {
      const L = LEVELS[i].build(); const d = new Decorator(L, themeOf(LEVELS[i].sub)!); d.clutter({ density: .4, seed: 3 });
      const c = costOf(d.specs);
      expect(c.meshes, `level ${i}`).toBeLessThanOrEqual(16);
      expect(c.triangles, `level ${i} triangles`).toBeLessThanOrEqual(24000);
      expect(c.castTriangles, `level ${i} caster triangles`).toBeLessThanOrEqual(3500);
    }
  });

  it("costs the same number of meshes for a hundred pieces as for ten of a kind", () => {
    const one = (n: number) => costOf(Array.from({ length: n }, (_, i) => ({ k: "straw", x: i, z: 0 }))).meshes;
    expect(one(200)).toBe(one(2));
  });
});

describe("the gallery", () => {
  it("shows every piece of every vocabulary, legally", () => {
    for (const t of THEMES) {
      const L = buildGallery(t);
      expect(validateDecor(L), t).toEqual([]);
      const shown = new Set(L.decor!.map((d) => d.k));
      for (const v of VOCAB[t]) expect(shown.has(v.k), `${t} gallery lacks ${v.k}`).toBe(true);
    }
  });
});

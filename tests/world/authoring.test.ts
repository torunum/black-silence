import { describe, expect, it } from "vitest";
import { LevelPlan, MARKER } from "../../src/world/authoring/Plan";
import { SET_PIECES } from "../../src/world/authoring/sets";
import { analyse } from "../../src/world/structure/analyse";
import { validateDecor } from "../../src/world/decor/place";
import { CHECKPOINTS } from "../../src/world/decor/checkpoint";
import { THEMES } from "../../src/world/decor/kit";
import { findAll } from "../../src/world/analysis";
import { buildWell } from "../support/sampleLevel";

/**
 * THE AUTHORING LAYER (deeper-levels plan, Task 2; `src/world/authoring/`). What a level written as rooms and corridors
 * becomes on the grid, counted by hand, and what the layer refuses. The small level it was shown on (`tests/support/sampleLevel.ts`) is held
 * to the structure analysis here; `tests/world/authoringLoad.test.ts` loads it into the real game.
 */

const rows = (lv: LevelPlan): string[] => lv.build().g.map((r) => r.join(""));

describe("rooms", () => {
  it("carves a rectangle of floor in solid rock, with its own height, and says where its cells are", () => {
    const lv = new LevelPlan(12, 8);
    const r = lv.room("a", { x: 2, z: 2, w: 4, h: 3, floor: 1.2 });
    expect(rows(lv)).toEqual([
      "############",
      "############",
      "##....######",
      "##....######",
      "##....######",
      "############",
      "############",
      "############",
    ]);
    expect(r.at(0, 0)).toEqual({ x: 2, z: 2 });
    expect(r.at(3, 2)).toEqual({ x: 5, z: 4 });
    expect([r.x0, r.x1, r.z0, r.z1, r.cx, r.cz]).toEqual([2, 5, 2, 4, 3, 3]);
    expect(r.contains(5, 4)).toBe(true);
    expect(r.contains(6, 4)).toBe(false);
    const L = lv.build();
    expect(L.hmap![3][3]).toBe(1.2);
    expect(L.hmap![0][0]).toBe(0);
  });

  it("gives no height map to a flat level, and no ceiling map unless a room asks", () => {
    const lv = new LevelPlan(10, 8);
    lv.room("a", { x: 2, z: 2, w: 4, h: 3 });
    const L = lv.build();
    expect(L.hmap).toBeUndefined();
    expect(L.cmap).toBeUndefined();
    expect(L.decor).toBeUndefined();   // no theme: no dressing
  });

  it("refuses rooms that overlap, rooms on the border and rooms off the grid, and rooms that are not rooms", () => {
    const lv = new LevelPlan(12, 8);
    lv.room("a", { x: 2, z: 2, w: 4, h: 3 });
    expect(() => lv.room("b", { x: 5, z: 3, w: 3, h: 3 })).toThrow(/overlaps room a/);
    expect(() => lv.room("c", { x: 0, z: 2, w: 3, h: 3 })).toThrow(/border/);
    expect(() => lv.room("d", { x: 9, z: 2, w: 3, h: 3 })).toThrow(/border|off the grid/);
    expect(() => lv.room("e", { x: 6, z: 2, w: 1, h: 3 })).toThrow(/not a room/);
  });

  it("raises a ceiling over a room's open cells and leaves a door, a pillar and a wall at the level's own", () => {
    const lv = new LevelPlan(14, 8);
    const tall = lv.room("tall", { x: 2, z: 2, w: 6, h: 4, ceil: 6 });
    const next = lv.room("next", { x: 10, z: 2, w: 2, h: 4 });
    lv.put("I", 4, 3);
    lv.corridor(tall, next, { door: "plain" });   // opens (8,3) and (9,3); the door is the first
    const L = lv.build();
    expect(L.cmap![3][3]).toBe(6);
    expect(L.cmap![3][4], "the pillar").toBe(0);
    expect(L.cmap![0][0], "the wall").toBe(0);
    expect(L.g[3][8], "the door").toBe("+");
    expect(L.cmap![3][8]).toBe(0);
  });
});

describe("corridors", () => {
  const two = (): { lv: LevelPlan; a: ReturnType<LevelPlan["room"]>; b: ReturnType<LevelPlan["room"]> } => {
    const lv = new LevelPlan(20, 12);
    return { lv, a: lv.room("a", { x: 2, z: 2, w: 3, h: 3 }), b: lv.room("b", { x: 12, z: 7, w: 3, h: 3 }) };
  };

  it("bends along x first by default: from (3,3) to (13,8), the 12 cells it opens in walking order", () => {
    const { lv, a, b } = two();
    const cells = lv.corridor(a, b);
    // a is x 2-4, b is x 12-14: along z=3 from x=5 to x=13 (9 cells), then down x=13 from z=4 to z=6 (3 cells), into b at z=7
    expect(cells).toHaveLength(12);
    expect(cells[0]).toEqual({ x: 5, z: 3 });
    expect(cells[8]).toEqual({ x: 13, z: 3 });
    expect(cells[11]).toEqual({ x: 13, z: 6 });
    expect(lv.build().g[5][13]).toBe(".");
  });

  it("bends the other way with `vh`: down x=3 first (4 cells), then along z=8 (8 cells)", () => {
    const { lv, a, b } = two();
    const cells = lv.corridor(a, b, { bend: "vh" });
    expect(cells).toHaveLength(12);
    expect(cells[0]).toEqual({ x: 3, z: 5 });
    expect(cells[3]).toEqual({ x: 3, z: 8 });
    expect(cells[11]).toEqual({ x: 11, z: 8 });
  });

  it("passes through the points asked for, and is as wide as asked", () => {
    const { lv, a, b } = two();
    lv.corridor(a, b, { via: [[8, 3], [8, 6]], width: 3 });
    const g = lv.build().g;
    for (const dz of [-1, 0, 1]) expect(g[3 + dz][8], `across z=${3 + dz} at x=8`).toBe(".");   // three wide where it runs down x=8: columns 7-9
    expect(g[6][7]).toBe(".");
    expect(g[6][9]).toBe(".");
    expect(g[6][6]).toBe("#");
  });

  it("grades a corridor between floors: 2.4 up over 5 cells is 0.4 a cell, never over a step of 1.2", () => {
    const lv = new LevelPlan(20, 8);
    const a = lv.room("a", { x: 1, z: 2, w: 3, h: 3 });
    const b = lv.room("b", { x: 9, z: 2, w: 3, h: 3, floor: 2.4 });
    const cells = lv.corridor(a, b);
    expect(cells).toHaveLength(5);
    const h = lv.build().hmap!;
    expect(cells.map((c) => h[c.z][c.x])).toEqual([0.4, 0.8, 1.2, 1.6, 2]);
    const steep = new LevelPlan(20, 8);
    const c = steep.room("a", { x: 1, z: 2, w: 3, h: 3 }), d = steep.room("b", { x: 7, z: 2, w: 3, h: 3, floor: 9 });
    expect(() => steep.corridor(c, d)).toThrow(/cannot climb/);
  });

  it("puts a door in the first cell it opens, never in a wide corridor, and never leaves a half-made corridor", () => {
    for (const [kind, ch] of [["plain", "+"], ["locked", "D"], ["secret", "S"]] as const) {
      const { lv, a, b } = two();
      const cells = lv.corridor(a, b, { door: kind });
      expect(lv.build().g[cells[0].z][cells[0].x]).toBe(ch);
    }
    const { lv, a, b } = two();
    expect(() => lv.corridor(a, b, { door: "plain", width: 2 })).toThrow(/one-wide/);
    expect(() => lv.corridor(a, { x: 30, z: 3 })).toThrow(/off the grid|border/);
    expect(lv.build().g[3][5], "the failed corridor left no cell behind").toBe("#");
  });
});

describe("stairs and ramps", () => {
  const strip = (): LevelPlan => {
    const lv = new LevelPlan(14, 7);
    lv.room("low", { x: 1, z: 2, w: 3, h: 3 });
    lv.room("high", { x: 8, z: 2, w: 3, h: 3, floor: 1.8 });
    lv.carve(4, 3, 7, 3, 0);   // a run of 4 cells between them
    return lv;
  };

  it("steps evenly between the floors either side, inferred: 4 cells from 0 to 1.8 is 0.36 a step", () => {
    const lv = strip();
    lv.stairs(4, 3, 7, 3);
    const h = lv.build().hmap!;
    expect([4, 5, 6, 7].map((x) => h[3][x])).toEqual([0.36, 0.72, 1.08, 1.44]);
  });

  it("runs the other way if the run does: from (7,3) back to (4,3), the first cell is the high end", () => {
    const lv = strip();
    lv.stairs(7, 3, 4, 3);
    const h = lv.build().hmap!;
    expect([7, 6, 5, 4].map((x) => h[3][x])).toEqual([1.44, 1.08, 0.72, 0.36]);
  });

  it("takes the heights named if there is no floor to infer them from, and steps a whole width together", () => {
    const lv = new LevelPlan(10, 8);
    lv.carve(2, 2, 5, 3, 0);   // a run 4 long and 2 wide, with rock at both ends
    lv.stairs(2, 2, 5, 3, { from: 0, to: 2 });
    const h = lv.build().hmap!;
    expect([2, 3, 4, 5].map((x) => h[2][x])).toEqual([0.4, 0.8, 1.2, 1.6]);
    expect([2, 3, 4, 5].map((x) => h[3][x])).toEqual([0.4, 0.8, 1.2, 1.6]);
    expect(() => new LevelPlan(10, 8).carve(2, 2, 5, 2, 0).stairs(2, 2, 5, 2)).toThrow(/no floor before/);
  });

  it("refuses a step over 0.6, and a ramp over 0.3", () => {
    const lv = strip();
    expect(() => lv.stairs(4, 3, 7, 3, { from: 0, to: 4 })).toThrow(/over 0\.6/);
    expect(() => lv.ramp(4, 3, 7, 3)).toThrow(/over 0\.3/);       // 1.8 over 4 cells is 0.36
    expect(() => lv.ramp(4, 3, 7, 3, { to: 1.2 })).not.toThrow();   // 0.24
  });

  it("will not grade rock", () => {
    const lv = strip();
    expect(() => lv.stairs(4, 3, 7, 3, { from: 0, to: 1 })).not.toThrow();
    expect(() => lv.stairs(4, 5, 7, 5, { from: 0, to: 1 })).toThrow(/not floor/);
  });
});

describe("doors", () => {
  it("must stand in a wall line: wall either side across, open ground either side along", () => {
    const lv = new LevelPlan(14, 8);
    lv.room("a", { x: 1, z: 2, w: 3, h: 3 }); lv.room("b", { x: 7, z: 2, w: 3, h: 3 });
    lv.carve(4, 3, 6, 3);
    lv.door(5, 3, "plain");
    expect(lv.build().g[3][5]).toBe("+");
    const bad = new LevelPlan(14, 8);
    bad.room("a", { x: 1, z: 2, w: 6, h: 4 });
    bad.door(3, 3, "locked");   // in the middle of a room
    expect(() => bad.build()).toThrow(/not in a wall line/);
  });

  it("takes the higher of the two floors when cut into a wall, so it can be stepped onto from either side, and refuses to join floors more than a step apart", () => {
    const make = (floor: number): LevelPlan => {
      const lv = new LevelPlan(14, 8);
      lv.room("low", { x: 1, z: 2, w: 3, h: 3 });
      lv.room("high", { x: 5, z: 2, w: 3, h: 3, floor });
      lv.door(4, 3, "secret");
      return lv;
    };
    const L = make(1).build();
    expect(L.g[3][4]).toBe("S");
    expect(L.hmap![3][4]).toBe(1);
    expect(() => make(1.8).build()).toThrow(/more than a step/);
    // and the analysis walks it: a pickup in the high room is a reward the secret opens
    const g = L.g.map((r) => [...r]);
    g[3][2] = "P"; g[3][6] = "h";
    expect(analyse({ g, hmap: L.hmap }).secretRewards).toEqual([1]);
  });
});

describe("what a glyph may be", () => {
  const room = (): LevelPlan => { const lv = new LevelPlan(14, 8); lv.room("a", { x: 1, z: 1, w: 10, h: 5 }); return lv; };

  it("places spawn, exit, key, enemies, pickups, props, lights and the plate by what they are", () => {
    const lv = room();
    lv.spawn([1, 1]).exit([10, 5]).key([5, 1]).plate([5, 4]).enemy("z", [3, 3], [4, 3]).pickup("h", [7, 1]).pickup("r", [8, 1]).prop("x", [2, 5]).prop("v", [3, 5]).light("i", [6, 1]).light("l", [9, 1]);
    const g = lv.build().g;
    expect([g[1][1], g[5][10], g[1][5], g[4][5], g[3][3], g[3][4], g[1][7], g[1][8], g[5][2], g[5][3], g[1][6], g[1][9]].join("")).toBe("PXKYzzhrxvil");
  });

  it("refuses an enemy that does not exist, armour spelled `A` (the Mancubus: KNOWN-11), the key as a pickup, a chair or pew that is an enemy (KNOWN-4)", () => {
    const lv = room();
    expect(() => lv.enemy("!", [2, 2])).toThrow(/ENEMY_DEFS/);
    expect(() => lv.pickup("A", [2, 2])).toThrow(/KNOWN-11/);
    expect(() => lv.pickup("K", [2, 2])).toThrow(/key\(\)/);
    expect(() => lv.pickup("z", [2, 2])).toThrow(/enemy glyph/);
    expect(() => lv.prop("C", [2, 2])).toThrow(/KNOWN-4/);
    expect(() => lv.prop("V", [2, 2])).toThrow(/KNOWN-4/);
    expect(() => lv.prop("h", [2, 2])).toThrow(/not a prop/);
  });

  it("refuses a second thing in a cell, a thing in rock, a thing off the grid, and a second spawn", () => {
    const lv = room();
    lv.enemy("z", [3, 3]);
    expect(() => lv.pickup("h", [3, 3])).toThrow(/already there/);
    expect(() => lv.pickup("h", [0, 0])).toThrow(/wall/);
    expect(() => lv.pickup("h", [40, 3])).toThrow(/off the grid/);
    lv.spawn([1, 1]);
    expect(() => lv.spawn([2, 1])).toThrow(/one spawn/);
  });

  it("rings a room with pillars and cuts a window in a wall", () => {
    const lv = new LevelPlan(14, 8);
    lv.pillars(lv.room("a", { x: 1, z: 1, w: 10, h: 5 }), 3);
    const g = lv.build().g;
    expect([g[2][2], g[2][5], g[2][8], g[4][2], g[4][5], g[4][8]].join("")).toBe("IIIIII");   // one inset from the walls, three apart, top and bottom
    expect(g.flat().filter((c) => c === "I")).toHaveLength(6);
    expect(() => lv.window(5, 3)).toThrow(/not in a wall/);
    lv.window(0, 3);
    expect(lv.build().g[3][0]).toBe("W");
  });
});

describe("dressing", () => {
  it("needs a theme, and every theme has its checkpoint marker, a wall piece the kit knows", () => {
    const lv = new LevelPlan(10, 8);
    expect(() => lv.checkpoint([2, 2])).toThrow(/needs a theme/);
    expect(() => lv.clutter()).toThrow(/needs a theme/);
    expect(Object.keys(MARKER).sort()).toEqual([...THEMES].sort());
    for (const t of THEMES) expect(MARKER[t] in CHECKPOINTS, t).toBe(true);
  });

  it("places the theme's marker last, whatever order it was asked in, against the wall it names", () => {
    const lv = new LevelPlan(14, 10, "church");
    const r = lv.room("nave", { x: 2, z: 2, w: 9, h: 6 });
    lv.spawn(r.at(1, 1)).exit(r.at(7, 4)).checkpoint(r.at(0, 3), { side: "w" }).piece("banner", r.at(3, 0), { side: "n" });
    const d = lv.build().decor!;
    expect(d.map((s) => s.k)).toEqual(["banner", "shrine"]);
    expect(d[1]).toMatchObject({ x: 2, z: 5 });
  });

  it("throws, at build, what the kit's own rules forbid: a marker on a spawn's cell", () => {
    const lv = new LevelPlan(14, 10, "church");
    const r = lv.room("nave", { x: 2, z: 2, w: 9, h: 6 });
    lv.spawn(r.at(0, 3)).checkpoint(r.at(0, 3), { side: "w" });
    expect(() => lv.build()).toThrow(/decor: shrine/);
  });

  it("names every set-piece, places something and breaks no rule, in a room that has the walls for it", () => {
    for (const name of Object.keys(SET_PIECES)) {
      const lv = new LevelPlan(30, 16, "dungeon");
      const r = lv.room("hall", { x: 3, z: 3, w: 22, h: 10 });
      lv.spawn(r.at(1, 5)).exit(r.at(20, 5)).set(name, r);
      const L = lv.build();
      expect(L.decor!.length, name).toBeGreaterThan(0);
      expect(validateDecor(L), name).toEqual([]);
    }
    expect(() => new LevelPlan(10, 8, "dungeon").set("moat", { x0: 1, x1: 2, z0: 1, z1: 2 } as never)).toThrow(/no set-piece called moat/);
  });

  it("throws when a set-piece fits nowhere: a chancel in a room with no wall of its own to stand on", () => {
    const lv = new LevelPlan(12, 10, "dungeon");
    const r = lv.room("closet", { x: 4, z: 4, w: 2, h: 2 });
    lv.spawn(r.at(0, 0)).exit(r.at(1, 1)).set("chancel", r);
    expect(() => lv.build()).toThrow(/fits nowhere/);
  });

  it("builds the same level twice, and a built level is a copy: changing it does not change the plan", () => {
    const lv = new LevelPlan(14, 10, "dungeon");
    const r = lv.room("a", { x: 2, z: 2, w: 9, h: 6, floor: 1 });
    lv.spawn(r.at(1, 1)).exit(r.at(7, 4)).clutter({ density: .4, seed: 2 });
    const one = lv.build(), two = lv.build();
    expect(two).toEqual(one);
    one.g[3][3] = "Z"; one.hmap![3][3] = 99;
    expect(lv.build()).toEqual(two);
  });
});

describe("check()", () => {
  it("returns the measured structure of a sound level, and throws naming every hard failure of an unsound one", () => {
    const good = new LevelPlan(14, 8);
    const r = good.room("a", { x: 1, z: 1, w: 12, h: 5 });
    good.spawn(r.at(1, 2)).exit(r.at(10, 2));
    expect(good.check().critical.length).toBe(9);
    const bad = new LevelPlan(14, 8);
    const q = bad.room("a", { x: 1, z: 1, w: 5, h: 5 });
    bad.room("island", { x: 8, z: 1, w: 4, h: 5 });
    bad.spawn(q.at(1, 2)).exit(q.at(3, 2)).enemy("z", [9, 2]);
    expect(() => bad.check()).toThrow(/unreachable: 'z' \(enemy\) stranded at \(9,2\)/);
  });
});

describe("the small level written with it: THE WELL (tests/support/sampleLevel.ts)", () => {
  const L = buildWell();
  const s = analyse(L);

  it("is a level the structure analysis passes with nothing to say", () => {
    expect(s.problems).toEqual([]);
    expect(validateDecor(L)).toEqual([]);
  });

  it("has what its header says: one spawn, one exit, one key and the locked door it opens, a secret with a reward, six rooms and a loop", () => {
    expect(findAll(L.g, "P")).toHaveLength(1);
    expect(findAll(L.g, "X")).toHaveLength(1);
    expect(findAll(L.g, "K")).toHaveLength(1);
    expect(findAll(L.g, "D")).toHaveLength(1);
    expect(findAll(L.g, "S")).toHaveLength(1);
    expect(s.secretRewards).toEqual([2]);
    expect(s.rooms).toBe(6);
    expect(s.loops).toBe(1);
    expect(s.critical.keyRequired).toBe(true);
    expect(s.critical.detour).toBeGreaterThanOrEqual(20);
    expect(s.exitSite).toBe("wall");
  });

  it("climbs: the steps from the hall to the gallery are 0.45 each, the gallery 1.8, the loft 2.4 and its ceiling 5", () => {
    expect([L.hmap![9][19], L.hmap![8][19], L.hmap![7][19]]).toEqual([0.45, 0.9, 1.35]);
    expect(L.hmap![4][20]).toBe(1.8);
    expect(L.hmap![5][33]).toBe(2.4);
    expect(L.cmap![5][33]).toBe(5);
    expect(L.cmap![4][26], "the door between the gallery and the loft").toBe(0);
  });

  it("has its shrine in the hall by the vault's door, and dresses nothing it was not asked to", () => {
    expect(L.decor!.filter((d) => d.k in CHECKPOINTS)).toHaveLength(1);
    expect(s.checkpoints).toHaveLength(1);
    expect(s.checkpoints[0].reachable).toBe(true);
    expect(s.checkpoints[0].forced).toBe(true);
    expect([s.critical.length, s.critical.detour]).toEqual([95, 52]);
  });
});

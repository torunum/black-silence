import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyse } from "../../src/world/structure/analyse";
import { cyclomatic, regionGraph } from "../../src/world/structure/regions";
import { STEP_UP, idx, terrainOf, walk } from "../../src/world/structure/walk";
import { verticality, AMMO_AMOUNT, HEALTH_AMOUNT, ARMOUR_AMOUNT, DAMAGE_PER_AMMO } from "../../src/world/structure/metrics";
import { WEAPON_STATS } from "../../src/weapons/definitions";
import type { DecorSpec } from "../../src/world/LevelBuilder";

/**
 * THE STRUCTURE ANALYSIS, AGAINST GRIDS SMALL ENOUGH TO COUNT BY HAND (deeper-levels plan, Task 2). Every number below was worked
 * out on paper from the drawn grid before the code was run; the comments say how. x across, z down, `#` wall.
 * `tests/world/structureLevels.test.ts` runs the real levels; this file is what makes a wrong measure fail.
 */

const grid = (rows: readonly string[]): string[][] => rows.map((r) => [...r]);
const codes = (rows: readonly string[], opts: { hmap?: number[][]; decor?: DecorSpec[] } = {}): string[] =>
  analyse({ g: grid(rows), ...opts }).problems.map((p) => p.code).sort();

/** Four 3x3 rooms at the corners of a 13x13 grid and the corridors you ask for. A (1..3, 1..3), B (9..11, 1..3), C (1..3, 9..11), D (9..11, 9..11). */
function ring(links: Array<"AB" | "CD" | "AC" | "BD">, extra?: (g: string[][]) => void): string[][] {
  const g: string[][] = Array.from({ length: 13 }, () => Array<string>(13).fill("#"));
  for (const [x0, z0] of [[1, 1], [9, 1], [1, 9], [9, 9]]) for (let z = z0; z < z0 + 3; z++) for (let x = x0; x < x0 + 3; x++) g[z][x] = ".";
  for (const l of links) {
    if (l === "AB") for (let x = 4; x <= 8; x++) g[2][x] = ".";
    if (l === "CD") for (let x = 4; x <= 8; x++) g[10][x] = ".";
    if (l === "AC") for (let z = 4; z <= 8; z++) g[z][2] = ".";
    if (l === "BD") for (let z = 4; z <= 8; z++) g[z][10] = ".";
  }
  g[1][1] = "P"; g[11][11] = "X";
  extra?.(g);
  return g;
}

describe("the step", () => {
  it("is the game's: Player.ts refuses a step of more than 1.2 and this reads that", () => {
    expect(STEP_UP).toBe(1.2);
    const src = readFileSync("src/player/Player.ts", "utf8");
    expect(src.replace(/\s/g, "")).toContain("floorHeightAt(nx,player.pz)-fh>1.2");
    expect(src.replace(/\s/g, "")).toContain("floorHeightAt(player.px,nz)-fh>1.2");
  });

  it("climbs 1.2 and not 1.3, and goes down any height: a drop is one way", () => {
    const rows = ["#####", "#P.X#", "#####"];
    const up = (h: number) => analyse({ g: grid(rows), hmap: [[0, 0, 0, 0, 0], [0, 0, 0, h, 0], [0, 0, 0, 0, 0]] }).problems.map((p) => p.code);
    expect(up(1.2)).toEqual([]);
    expect(up(1.3)).toContain("exit-unreachable");
    // the same drop the other way (the exit is lower than the spawn) is fine, however deep
    const down = analyse({ g: grid(rows), hmap: [[0, 0, 0, 0, 0], [0, 9, 9, 0, 0], [0, 0, 0, 0, 0]] });
    expect(down.problems).toEqual([]);
  });
});

describe("the way through, counted by hand", () => {
  //   x  0123456789 10
  //   z0 ###########
  //   z1 #P..D....X#     P(1,1), D(4,1), X(9,1)
  //   z2 ###.#######     (3,2)
  //   z3 ###K#######     K(3,3)
  //   z4 ###########
  const key = ["###########", "#P..D....X#", "###.#######", "###K#######", "###########"];

  it("takes the key on the way: 4 steps to the key at (3,3), 2 back, then the door and 6 more to the exit = 12", () => {
    const s = analyse({ g: grid(key) });
    expect(s.problems).toEqual([]);
    expect(s.critical.length).toBe(12);
    expect(s.critical.keyRequired).toBe(true);
    expect(s.critical.keyLeg).toBe(4);
    expect(s.critical.detour).toBe(4);   // with the key in hand it is (1,1) to (9,1): 8 steps; 12 - 8
    expect(s.critical.cells[4]).toEqual({ x: 3, z: 3 });
    expect(s.critical.cells[12]).toEqual({ x: 9, z: 1 });
  });

  it("does not ask for a key it does not need: with no door in the way the path is the plain walk", () => {
    const s = analyse({ g: grid(["#######", "#P.K.X#", "#######"]) });   // key on the way but no door: 4 steps
    expect(s.critical.length).toBe(4);
    expect(s.critical.keyRequired).toBe(false);
    expect(s.problems.map((p) => p.code)).toEqual(["key-no-door"]);   // a key that does nothing is KNOWN-1
  });

  it("detects a key behind its own door: a softlock, and no way out", () => {
    // D(4,1) needs the key, and the key is at (6,1), past the door
    const c = codes(["###########", "#P..D.K..X#", "###########"]);
    expect(c).toContain("key-behind-door");
    expect(c).toContain("exit-unreachable");
  });

  it("detects a drop into a pit with no way back: 3.0 down is allowed, 3.0 up is not", () => {
    //   z0 ##########    row 1 is the floor at 3.0; the cell under (3,1) is a pit at 0
    //   z1 #P..X#
    //   z2 ###.#
    const rows = ["#####", "#P.X#", "##.##"];
    const high = [[0, 0, 0, 0, 0], [0, 3, 3, 3, 0], [0, 0, 0, 0, 0]];
    const trapped = analyse({ g: grid(["#####", "#P.X#", "##.##"]), hmap: [...high.slice(0, 2), [0, 0, 0, 0, 0]] });
    expect(trapped.problems.map((p) => p.code)).toEqual(["softlock"]);
    expect(trapped.problems[0].message).toContain("(2,2)");
    // the same pit with a floor 1.0 under the corridor's is climbable out of: no softlock
    const stepped = analyse({ g: grid(rows), hmap: [[0, 0, 0, 0, 0], [0, 3, 3, 3, 0], [0, 0, 2, 0, 0]] });
    expect(stepped.problems).toEqual([]);
  });

  it("goes through every goal in order: a boss to kill first, then the exit cell, 19 steps and not the plain 15", () => {
    // a 20 x 20 grid, the corridor along z=16 from x=1 to 18 (the exit cell (16,16) is one of the five the game tries),
    // a side branch up x=3 to the boss Q at (3,14). P(1,16): to (3,16) 2, up 2 = 4, back down 2 = 6, east to (16,16) 13 = 19.
    const g = Array.from({ length: 20 }, () => Array<string>(20).fill("#"));
    for (let x = 1; x <= 18; x++) g[16][x] = ".";
    g[15][3] = "."; g[14][3] = "Q"; g[16][1] = "P";
    const s = analyse({ g });
    expect(s.exit).toMatchObject({ kind: "boss", x: 16, z: 16, boss: "Q" });
    expect(s.critical.length).toBe(19);
    g[14][3] = "#"; g[15][3] = "#"; g[16][10] = "Q";   // the boss on the way instead: nothing to detour, 15 steps from (1,16) to (16,16)
    expect(analyse({ g }).critical.length).toBe(15);
  });

  it("ends at the finale boss when there is no exit: 3 steps from (1,1) to G at (4,1)", () => {
    const s = analyse({ g: grid(["######", "#P..G#", "######"]) });
    expect(s.exit.kind).toBe("finale");
    expect(s.critical.length).toBe(3);
    expect(s.exitSite).toBe("n/a");
    expect(s.problems).toEqual([]);
  });

  it("reports a level with no exit, and one with two spawns", () => {
    expect(codes(["#####", "#P..#", "#####"])).toContain("no-exit");
    expect(codes(["######", "#P.PX#", "######"])).toContain("no-spawn");
  });

  it("calls a locked door with no key by its name", () => {
    expect(codes(["#######", "#P.D.X#", "#######"])).toEqual(["door-no-key", "exit-unreachable", "unreachable"]);
  });
});

describe("what must be reachable", () => {
  it("names an enemy walled off from the spawn: z at (6,1) in a chamber the walls close", () => {
    const c = analyse({ g: grid(["#########", "#P.X#.z.#", "#########"]) });
    expect(c.problems.map((p) => p.code)).toEqual(["unreachable"]);
    expect(c.problems[0].message).toContain("(6,1)");
  });

  it("names a pickup behind a locked door the level has no key for, and a prop, a plate, a torch", () => {
    expect(codes(["#########", "#P.X#.h.#", "#########"])).toEqual(["unreachable"]);
    expect(codes(["#########", "#P.X#.x.#", "#########"])).toEqual(["unreachable"]);
    expect(codes(["#########", "#P.X#.Y.#", "#########"])).toEqual(["unreachable"]);
    expect(codes(["#########", "#P.X#.i.#", "#########"])).toEqual(["unreachable"]);
  });

  it("finds an enemy behind a secret door reachable (secrets are allowed for reachability, not for the way through)", () => {
    expect(codes(["#########", "#P.XS.z.#", "#########"])).toEqual(["secret-no-reward"]);
  });

  it("names a checkpoint on ground no one reaches", () => {
    const c = analyse({ g: grid(["#########", "#P.X#...#", "#########"]), decor: [{ k: "candlestub", x: 6, z: 1 }] });
    expect(c.problems.map((p) => p.code)).toEqual(["unreachable"]);
    expect(c.checkpoints[0].reachable).toBe(false);
  });
});

describe("secrets sit behind secret doors", () => {
  it("accepts a door that is the only way into a room with a pickup in it: 3 pocket cells, 1 reward", () => {
    const s = analyse({ g: grid(["#########", "#P.XS.h.#", "#########"]) });
    expect(s.problems).toEqual([]);
    expect(s.secrets).toBe(1);
    expect(s.secretRewards).toEqual([1]);
  });

  it("refuses a secret door that opens onto nothing new (a shortcut round a loop)", () => {
    //  z1 #P.....X#   the ring: the bottom way has a secret door at (4,3), but the right-hand end is reached from the top anyway
    //  z2 #.#####.#
    //  z3 #...S...#
    const g = ["#########", "#P.....X#", "#.#####.#", "#...S...#", "#########"];
    expect(codes(g)).toEqual(["secret-door-empty"]);
  });

  it("refuses a secret room with nothing in it", () => {
    expect(codes(["#########", "#P.XS...#", "#########"])).toEqual(["secret-no-reward"]);
  });

  it("refuses a way through that needs a secret", () => {
    expect(codes(["#######", "#P.S.X#", "#######"])).toContain("needs-secret");
  });
});

describe("the exit door", () => {
  it("is sited when a wall stands within three cells on its floor, and not in the middle of a hall", () => {
    expect(analyse({ g: grid(["#######", "#P...X#", "#######"]) }).exitSite).toBe("wall");
    const hall: string[][] = Array.from({ length: 11 }, (_, z) => Array.from({ length: 11 }, (_, x): string => (z === 0 || x === 0 || z === 10 || x === 10 ? "#" : ".")));
    hall[1][1] = "P"; hall[5][5] = "X";   // the nearest wall is four cells away
    const s = analyse({ g: hall });
    expect(s.exitSite).toBe("freestanding");
    expect(s.problems.map((p) => p.code)).toContain("exit-door");
  });
});

describe("rooms, loops, branches and dead ends", () => {
  it("counts the cycles of a graph drawn by hand: a ring 1, a ring with a chord 2, a tree 0, two components 1+0, duplicates and self-loops nothing", () => {
    expect(cyclomatic(4, [[0, 1], [1, 2], [2, 3], [3, 0]]).loops).toBe(1);
    expect(cyclomatic(4, [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]]).loops).toBe(2);
    expect(cyclomatic(4, [[0, 1], [1, 2], [2, 3]]).loops).toBe(0);
    expect(cyclomatic(5, [[0, 1], [1, 2], [2, 0], [3, 4]])).toEqual({ loops: 1, components: 2 });
    expect(cyclomatic(3, [[0, 1], [1, 0], [1, 1], [1, 2]]).loops).toBe(0);
  });

  const graphOf = (g: string[][]) => regionGraph(terrainOf({ g }));

  it("finds four rooms and one loop in a ring of four rooms and four corridors (8 regions, 8 edges, 1 piece)", () => {
    const r = graphOf(ring(["AB", "CD", "AC", "BD"]));
    expect(r.regions.filter((x) => x.kind === "room")).toHaveLength(4);
    expect(r.regions.filter((x) => x.kind === "passage")).toHaveLength(4);
    expect([r.nodes, r.edges, r.components, r.loops]).toEqual([8, 8, 1, 1]);
  });

  it("finds no loop in the same rooms with one corridor taken out, and one dead end", () => {
    const s = analyse({ g: ring(["AB", "AC", "CD"]) });
    expect(s.rooms).toBe(4);
    expect(s.loops).toBe(0);
    expect(s.deadEnds).toBe(1);   // room B, at the end of the corridor from A: neither the start (A) nor the goal (D)
    expect(s.branches).toBe(0);
  });

  it("finds two loops when a second ring shares a room: two rings side by side", () => {
    // rings A-B-D-C and a further ring through two more rooms on the right, sharing the corridor BD: build by joining a fifth and sixth room
    const g = Array.from({ length: 13 }, () => Array<string>(21).fill("#"));
    const rooms = [[1, 1], [9, 1], [1, 9], [9, 9], [17, 1], [17, 9]];
    for (const [x0, z0] of rooms) for (let z = z0; z < z0 + 3; z++) for (let x = x0; x < x0 + 3; x++) g[z][x] = ".";
    for (let x = 4; x <= 8; x++) { g[2][x] = "."; g[10][x] = "."; }
    for (let x = 12; x <= 16; x++) { g[2][x] = "."; g[10][x] = "."; }
    for (let z = 4; z <= 8; z++) { g[z][2] = "."; g[z][10] = "."; g[z][18] = "."; }
    g[1][1] = "P"; g[11][19] = "X";
    const r = regionGraph(terrainOf({ g }));
    expect(r.regions.filter((x) => x.kind === "room")).toHaveLength(6);
    expect(r.loops).toBe(2);
  });

  it("counts a branch point where one passage meets three rooms: a stub off the corridor A-B down into a fifth room", () => {
    //   the corridor (4..8, 2) with a stub (6,3)-(6,4) down to room E (5..7, 5..7): one passage touching A, B and E
    const g = ring(["AB"], (gg) => { for (let z = 5; z <= 7; z++) for (let x = 5; x <= 7; x++) gg[z][x] = "."; gg[3][6] = "."; gg[4][6] = "."; });
    const s = analyse({ g });
    expect(s.rooms).toBe(5);        // A, B, E, and C and D standing apart
    expect(s.branches).toBe(1);     // the passage
    expect(s.deadEnds).toBe(2);     // B and E; A has the spawn
  });

  it("does not take a corridor that widens by one cell for a room, or a cell between pillars for a dead end", () => {
    const g = grid(["#########", "#P.....X#", "###.#####", "###.#####", "#########"]);
    const s = analyse({ g });
    expect(s.rooms).toBe(0);
    const pillared = grid(["#########", "#.......#", "#.I.I.P.#", "#.......#", "#.....X.#", "#########"]);
    const p = analyse({ g: pillared });
    expect(p.rooms).toBe(1);
    expect(p.deadEnds).toBe(0);
  });
});

describe("heights", () => {
  it("counts distinct floors and the boundaries between patches: 0 / 0.45 / 0.9 along a corridor is three heights, two transitions", () => {
    const t = terrainOf({ g: grid(["########", "#......#", "########"]), hmap: [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, .45, .9, .9, .9, 0], [0, 0, 0, 0, 0, 0, 0, 0]] });
    // the corridor's cells are (1..6, 1) at 0, 0, .45, .9, .9, .9: three patches, two boundaries
    expect(verticality(t)).toEqual({ heights: 3, transitions: 2 });
  });

  it("counts one height and no transition on flat ground", () => {
    expect(verticality(terrainOf({ g: grid(["#####", "#...#", "#####"]) }))).toEqual({ heights: 1, transitions: 0 });
  });
});

describe("the fights, worked out on paper", () => {
  //   x  0123456789012     three rooms 3x3, doors at (4,2) and (8,2)
  //   z1 #...#...#...#     R1 x1-3   R2 x5-7   R3 x9-11
  //   z2 #P.a+.z.+.zX#     wait: z2: (1)P (2). (3)a (4)+ (5). (6)z (7). (8)+ (9). (10)z (11)X
  //   z3 #...#h..#b..#     (5,3)h in R2, (9,3)b in R3
  const g = ["#############", "#...#...#...#", "#P.a+.z.+.zX#", "#...#h..#b..#", "#############"];
  const s = analyse({ g: grid(g) });

  it("finds the two fights and no more", () => {
    expect(s.problems).toEqual([]);
    expect(s.encounters).toHaveLength(2);
  });

  it("R2: one zombie (50 hp); the 60 bullets the player starts with (60 x 34 x 0.5 = 1020) and the box in R1 (18 x 34 x 0.5 = 306) before it = 1326", () => {
    const e = s.encounters[0];
    expect([e.x0, e.x1, e.enemies, e.hp, e.bossHp]).toEqual([5, 7, 1, 50, 0]);
    expect(e.supply).toBe(1326);
    expect(e.health).toBe(25);   // the health pack in R2 itself
    expect(e.armour).toBe(0);
    expect(e.ratio).toBeCloseTo(1326 / 50);
  });

  it("R3: the same, and the shells in R3 (6 x 72 x 0.5 = 216) count because they are inside it; the health in R2 is before it", () => {
    const e = s.encounters[1];
    expect([e.x0, e.x1, e.enemies, e.hp]).toEqual([9, 11, 1, 50]);
    expect(e.supply).toBe(1326 + 216);
    expect(e.health).toBe(25);
  });

  it("does not count a pickup that lies past the fight, and takes no fight that only a secret door leads to", () => {
    const behind = analyse({ g: grid(["#############", "#...#...#...#", "#P.a+.z.+.z.#", "#...#h..#b.X#", "#############"]) });
    expect(behind.encounters[0].supply).toBe(1326);   // the shells in R3 are after R2
    const secret = analyse({ g: grid(["#########", "#P.XS.hz.#", "#########"]) });
    expect(secret.problems).toEqual([]);
    expect(secret.encounters).toHaveLength(0);   // a fight behind a secret door is not on any way through
  });

  it("weighs bosses apart from the rank and file, by hit points", () => {
    const b = analyse({ g: grid(["#########", "#P..U..X#", "#########"]) });
    expect(b.encounters).toHaveLength(1);
    expect([b.encounters[0].hp, b.encounters[0].bossHp, b.encounters[0].bosses]).toEqual([0, 700, 1]);
  });
});

describe("checkpoints", () => {
  const key = ["###########", "#P..D....X#", "###.#######", "###K#######", "###########"];

  it("puts a marker on the critical path at its place along it: (3,1) is cell 2 of 12 steps = 2/12, and every way through passes it", () => {
    const s = analyse({ g: grid(key), decor: [{ k: "candlestub", x: 3, z: 1 }] });
    expect(s.checkpoints).toHaveLength(1);
    expect(s.checkpoints[0].fraction).toBeCloseTo(2 / 12);
    expect(s.checkpoints[0].forced).toBe(true);
  });

  it("calls a marker beside one of two equal ways unforced, and one on the player's own cell forced", () => {
    const at = (x: number, z: number) => analyse({ g: ring(["AB", "CD", "AC", "BD"]), decor: [{ k: "candlestub", x, z }] }).checkpoints[0].forced;
    expect(at(6, 2), "the corridor A-B: the way by C and D is as long").toBe(false);
    expect(at(1, 1), "the player starts there").toBe(true);
  });
});

describe("what a pickup is worth is what the game gives", () => {
  const src = readFileSync("src/player/Interact.ts", "utf8").replace(/\s/g, "");
  it("matches itemsTick: +18 bullets, +6 shells, +4 slugs, +3 crosses, +40 nails, +3 souls, +25 health, +50 armour", () => {
    for (const [k, n] of Object.entries(AMMO_AMOUNT)) expect(src, k).toContain(`S.ammo.${k}+=${n}`);
    expect(src).toContain(`S.hp=Math.min(100,S.hp+${HEALTH_AMOUNT})`);
    expect(src).toContain(`S.armor=Math.min(100,S.armor+${ARMOUR_AMOUNT})`);
  });
  it("prices ammunition by the first weapon that fires it, pellets and all", () => {
    expect(DAMAGE_PER_AMMO.bullets).toBe(WEAPON_STATS[0].dmg);
    expect(DAMAGE_PER_AMMO.shells).toBe(9 * 8);
    expect(DAMAGE_PER_AMMO.slugs).toBe(160);
  });
});

describe("the walk's own search", () => {
  it("is the same graph in both directions: a cell's distance is the fewest steps over every state", () => {
    const t = terrainOf({ g: grid(["#######", "#P...X#", "#######"]) });
    const w = walk(t, idx(t, 1, 1), { secrets: "none" });
    expect(w.dist[idx(t, 5, 1)]).toBe(4);
    expect(w.reached[idx(t, 6, 1)]).toBe(0);
  });
});

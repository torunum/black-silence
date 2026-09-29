import { describe, expect, it } from "vitest";
import { buildPrologue, ZONES } from "../../src/world/levels/prologue";
import { LEVELS } from "../../src/world/levels/index";
import { MONOLOGUE } from "../../src/content/monologue";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";
import type { BuiltLevel } from "../../src/world/LevelBuilder";

/**
 * THE REBUILT PROLOGUE — out of the grave, down through hell, up and out
 * (player feedback round 2, the prologue plan, Task 1;
 * `src/world/levels/prologue.ts`). The level's own promises, checked on the
 * built grid, height map and zone map — no game booted. What the loader
 * *does* with the zones is `tests/world/zones.test.ts`.
 */

const L = buildPrologue() as Required<Pick<BuiltLevel, "g" | "W" | "H" | "hmap" | "cmap" | "zones" | "decor">>;
const zoneId = (x: number, z: number) => L.zones.themes[L.zones.map[z][x]].id;
const floor = (x: number, z: number) => L.hmap[z][x] || 0;
const find = (ch: string) => {
  const out: Array<{ x: number; z: number }> = [];
  for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) if (L.g[z][x] === ch) out.push({ x, z });
  return out;
};
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
/** `src/player/Player.ts`: a grounded player cannot step onto ground more than 1.2 above the floor under them. */
const STEP_UP = 1.2;
const SOLID = new Set(["#", "I", "W"]);

/** Cells a player can walk to from `start`, with the game's step-up limit, never entering a cell `barred` says no to. */
function walk(start: { x: number; z: number }, barred: (x: number, z: number) => boolean = () => false): boolean[][] {
  const seen = L.g.map((r) => r.map(() => false));
  const stack = [start]; seen[start.z][start.x] = true;
  while (stack.length) {
    const { x, z } = stack.pop()!;
    for (const [dx, dz] of DIRS) {
      const nx = x + dx, nz = z + dz, ch = L.g[nz]?.[nx];
      if (ch === undefined || SOLID.has(ch) || seen[nz][nx] || barred(nx, nz)) continue;
      if (floor(nx, nz) - floor(x, z) > STEP_UP) continue;
      seen[nz][nx] = true; stack.push({ x: nx, z: nz });
    }
  }
  return seen;
}

describe("it starts in a grave", () => {
  const [p] = find("P");

  it("has one spawn, in the churchyard zone, which is open to the sky", () => {
    expect(find("P")).toHaveLength(1);
    expect(zoneId(p.x, p.z)).toBe("churchyard");
    expect(ZONES[L.zones.map[p.z][p.x]].sky).toBe(true);
  });

  it("puts the spawn beside an open grave: a sunken cell of the churchyard with a coffin in it", () => {
    const graves = DIRS.map(([dx, dz]) => ({ x: p.x + dx, z: p.z + dz }))
      .filter((c) => !SOLID.has(L.g[c.z][c.x]) && floor(c.x, c.z) <= floor(p.x, p.z) - .8);
    expect(graves, "a cell next to the spawn at least 0.8 below it").toHaveLength(1);
    const [grave] = graves;
    expect(zoneId(grave.x, grave.z)).toBe("churchyard");
    expect(L.decor.some((d) => d.k === "coffin" && d.x === grave.x && d.z === grave.z), "a coffin in the grave").toBe(true);
    expect(floor(p.x, p.z) - floor(grave.x, grave.z), "shallow enough to climb out of").toBeLessThanOrEqual(STEP_UP);
  });
});

describe("the only way out is down through hell", () => {
  const [p] = find("P");
  const [exit] = find("X");

  it("has one exit, in the climb zone, and the player can walk from the grave to it", () => {
    expect(find("X")).toHaveLength(1);
    expect(zoneId(exit.x, exit.z)).toBe("climb");
    expect(walk(p)[exit.z][exit.x]).toBe(true);
  });

  it("cannot reach the exit without crossing the hell zone", () => {
    const noHell = walk(p, (x, z) => zoneId(x, z) === "hell");
    expect(noHell[exit.z][exit.x]).toBe(false);
  });

  it("cannot reach hell without going down the crypt", () => {
    const noCrypt = walk(p, (x, z) => zoneId(x, z) === "crypt");
    for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++)
      if (zoneId(x, z) === "hell") expect(noCrypt[z][x], `hell cell ${x},${z}`).toBe(false);
  });

  it("really goes down and comes back up: the crypt descends, hell is lower, the exit is high again", () => {
    const hell: number[] = [];
    for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++)
      if (zoneId(x, z) === "hell" && !SOLID.has(L.g[z][x])) hell.push(floor(x, z));
    expect(Math.max(...hell), "hell (its stair mouths included) lies well below the grave").toBeLessThanOrEqual(floor(p.x, p.z) - 1.5);
    expect(Math.min(...hell), "the burning pit").toBe(0);
    expect(floor(exit.x, exit.z)).toBeGreaterThanOrEqual(floor(p.x, p.z));
  });

  it("never traps a player who falls into the pit", () => {
    // Every pit cell, both halves — the bridge cuts the pit in two, and a
    // first version of this map had steps out of the south half only.
    let pit = 0;
    for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) {
      if (zoneId(x, z) !== "hell" || SOLID.has(L.g[z][x]) || floor(x, z) !== 0) continue;
      pit++;
      expect(walk({ x, z })[exit.z][exit.x], `a fall into the pit at ${x},${z}`).toBe(true);
    }
    expect(pit).toBeGreaterThan(50);
  });

  it("leads to level 1 — the exit's level is 0, and endLevel loads S.level+1", () => {
    expect(LEVELS[0].build().g.flat().filter((c) => c === "X")).toHaveLength(1);
    expect(LEVELS[1].name).toBe("LEVEL 1 — THE GOTHIC DUNGEON");
  });
});

describe("the hell crossing is a first level", () => {
  const enemies = L.g.flatMap((row, z) => row.map((ch, x) => ({ ch, x, z }))).filter((c) => ENEMY_DEFS[c.ch]);

  it("places only the weakest melee enemies — zombies and crawlers — and only in hell", () => {
    expect(new Set(enemies.map((e) => e.ch))).toEqual(new Set(["z", "w"]));
    expect(enemies.length).toBeGreaterThanOrEqual(4);
    expect(enemies.length).toBeLessThanOrEqual(8);
    for (const e of enemies) {
      expect(zoneId(e.x, e.z)).toBe("hell");
      const d = ENEMY_DEFS[e.ch];
      expect(d.range || 0, `${e.ch} has no ranged attack`).toBe(0);
      expect(d.hp).toBeLessThanOrEqual(50);
    }
  });

  it("puts health and ammo in hell, reachable from the grave", () => {
    const seen = walk(find("P")[0]);
    for (const ch of ["h", "a"]) {
      const got = find(ch).filter((c) => zoneId(c.x, c.z) === "hell");
      expect(got.length, ch).toBeGreaterThanOrEqual(2);
      for (const c of got) expect(seen[c.z][c.x], `${ch} at ${c.x},${c.z}`).toBe(true);
    }
  });

  it("stands nothing breakable on raised ground — a shot finds a prop only between y=0 and its height", () => {
    for (const ch of "xTCFVOv") for (const c of find(ch)) expect(floor(c.x, c.z), `${ch} at ${c.x},${c.z}`).toBe(0);
  });
});

describe("zones and words", () => {
  it("gives every cell a zone, and the four zones their looks", () => {
    expect(L.zones.map).toHaveLength(L.H);
    for (const row of L.zones.map) {
      expect(row).toHaveLength(L.W);
      for (const i of row) expect(ZONES[i], `zone ${i}`).toBeDefined();
    }
    expect(ZONES.map((t) => t.id)).toEqual(["churchyard", "crypt", "hell", "climb"]);
    expect(ZONES.filter((t) => t.sky).map((t) => t.id)).toEqual(["churchyard"]);
    // hell keeps the reference prologue's own fog and light
    const h = ZONES[2], def = LEVELS[0];
    expect([h.hell, h.fog, h.fogD, h.amb, h.ambI]).toEqual([true, def.fog, def.fogD, def.amb, def.ambI]);
  });

  it("has ADEM say something on the way down, in hell and on the way out", () => {
    for (const t of ZONES.slice(1)) {
      expect(t.line, t.id).toBeDefined();
      expect(MONOLOGUE[t.line!]?.length, t.line).toBeGreaterThan(0);
    }
    expect(ZONES[0].line, "the churchyard has the level's own opening line, lvl0").toBeUndefined();
  });

  it("is the only level with zones, and the only one dressed by hand for its own scene", () => {
    // levels 1-4 carry a decor list since the levels-feel-full plan's Task 2 and 5-7 since its Task 3
    // (tests/world/levelDressing.test.ts and levelDressing567.test.ts hold them to it): none but the prologue has zones
    for (let i = 1; i < LEVELS.length; i++) {
      const b = LEVELS[i].build();
      expect(b.zones, LEVELS[i].name).toBeUndefined();
      expect(b.decor!.length, LEVELS[i].name).toBeGreaterThan(100);
    }
  });
});

describe("the prologue plan's Task 3: hell burns, the churchyard is inhabited", () => {
  const zoneOf = (x: number, z: number) => L.zones.themes[L.zones.map[z][x]];
  const decor = (k: string) => L.decor.filter((d) => d.k === k);

  it("bridges the pit with one stone deck per cell, not two laid on each other", () => {
    const deck = decor("bridge");
    expect(deck).toHaveLength(7);
    expect(new Set(deck.map((d) => `${d.x},${d.z}`)).size).toBe(7);
  });

  it("gives the first step of the climb the climb's stone, not hell's veined rock", () => {
    for (const x of [24, 25]) {
      expect(L.hmap[18][x]).toBeGreaterThan(2.1);   // the first step up out of hell
      expect(zoneOf(x, 18).id).toBe("climb");
    }
  });

  it("puts the churchyard on earth — its own ground and grave walls — with the dead in it", () => {
    const yard = ZONES.find((z) => z.id === "churchyard")!;
    expect([yard.ground, yard.side]).toEqual(["yardEarth", "graveEarth"]);
    expect(decor("mound").length).toBeGreaterThanOrEqual(10);
    expect(decor("hand").length).toBeGreaterThanOrEqual(4);
    expect(decor("grass").length).toBeGreaterThan(60);
    for (const d of [...decor("mound"), ...decor("hand"), ...decor("grass")]) expect(zoneOf(Math.floor(d.x), Math.floor(d.z)).id).toBe("churchyard");
  });

  it("lights the fire in hell alone: burning cells in the pit and five braziers on the banks", () => {
    const fire = [...decor("ember"), ...decor("bowl")];
    expect(decor("bowl")).toHaveLength(5);
    expect(decor("ember").length).toBeGreaterThan(40);
    for (const d of fire) expect(zoneOf(d.x, d.z).id).toBe("hell");
  });
});

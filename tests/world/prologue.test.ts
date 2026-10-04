import { describe, expect, it } from "vitest";
import { buildPrologue, ZONES } from "../../src/world/levels/prologue";
import { LEVELS } from "../../src/world/levels/index";
import { MONOLOGUE } from "../../src/content/monologue";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";
import type { BuiltLevel } from "../../src/world/LevelBuilder";
import { massBlocked, validateDecor } from "../../src/world/decor/place";
import { massCells } from "../../src/world/decor/masses";
import { PIECES } from "../../src/world/decor/registry";

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
    // hell wears its own stone and has its own fog and light (the 2026-10-04 rework: a deeper, thinner dark so the lava is the light),
    // no longer the reference prologue's values (LEVELS[0]: fog 0x180604 at .07, ambient 0x6e2a14 at .6)
    const h = ZONES[2], def = LEVELS[0];
    expect([h.hell, h.shell, h.lava]).toEqual([true, true, true]);
    expect([h.fog, h.fogD, h.amb, h.ambI]).toEqual([0x1c0804, .05, 0x5a2412, 1.7]);
    expect(h.fogD).toBeLessThan(def.fogD);
    expect([h.ground, h.side, h.wall, h.ceil, h.band]).toEqual(["scorch", "rock", "vault", "vault", "band"]);
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

describe("hell, reworked: the dressing breaks up the cavern, and none of it is in the way", () => {
  const zoneOf = (x: number, z: number) => L.zones.themes[L.zones.map[z][x]];
  const decor = (k: string) => L.decor.filter((d) => d.k === k);
  const HELL_KINDS = ["outcrop", "stalagmite", "basaltcol", "spikes", "shards", "skullpole", "stalactite", "pyre", "ribs", "lavafall"];

  it("has rock outcrops, fangs, columns, a pyre, stakes, ribs, spikes, shards, stalactites and two falls of lava, all in hell", () => {
    const want: Record<string, number> = { outcrop: 4, stalagmite: 2, basaltcol: 2, pyre: 1, skullpole: 6, ribs: 2, spikes: 5, shards: 10, stalactite: 15, lavafall: 2 };
    for (const [k, n] of Object.entries(want)) expect(decor(k).length, k).toBeGreaterThanOrEqual(n);
    for (const k of HELL_KINDS) for (const d of decor(k)) expect(zoneOf(Math.floor(d.x + .5), Math.floor(d.z + .5)).id, `${k} at ${d.x},${d.z}`).toBe("hell");
  });

  it("keeps every hell piece to the kit's own placement rules, and every mass leaves the spawn its way to everything it could reach", () => {
    // the rules of `decor/place.ts` run on hell's pieces alone: the prologue's older, hand-placed ones were built under their own
    const hell = { g: L.g, decor: L.decor.filter((d) => HELL_KINDS.includes(d.k) && d.k !== "lavafall") };
    expect(validateDecor(hell)).toEqual([]);
    expect(PIECES.lavafall.mode).toBe("cover");
  });

  it("cuts nobody off: with every mass a wall, the grave still walks to every pickup, enemy and the exit (an independent flood fill)", () => {
    const blocked = massBlocked(L.decor), key = (x: number, z: number) => z * 4096 + x;
    const free = walk(find("P")[0], (x, z) => blocked.has(key(x, z)));
    const open = walk(find("P")[0]);
    let checked = 0;
    for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++) {
      if (!"zwhaOX".includes(L.g[z][x])) continue;
      checked++;
      expect(open[z][x] && !free[z][x], `the masses cut off '${L.g[z][x]}' at ${x},${z}`).toBe(false);
    }
    expect(checked).toBeGreaterThan(12);
    expect(blocked.size, "there are masses to test").toBeGreaterThan(8);
  });

  it("keeps masses off every cell beside a pickup, a spawn or an exit, a brazier, and off the ways the enemies and the player come and go", () => {
    const cells = new Set<string>();
    for (const d of L.decor) if (PIECES[d.k]?.mass) for (const [x, z] of massCells(d)) cells.add(x + "," + z);
    expect(cells.size).toBeGreaterThan(8);
    const near = (x: number, z: number, r: number) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (cells.has(`${x + dx},${z + dz}`)) return true; return false; };
    for (const ch of "haXzw") for (const c of find(ch)) expect(near(c.x, c.z, 1), `a mass beside '${ch}' at ${c.x},${c.z}`).toBe(false);
    // the way from the bridge's west end to the crypt stair's foot (x 8-10, z 18-27), where the zombie at the stair and the crawlers out of the pit walk
    for (let z = 18; z <= 27; z++) for (let x = 8; x <= 10; x++) expect(cells.has(`${x},${z}`), `a mass at ${x},${z}`).toBe(false);
    // the zombie's own ground by the stair, and the climb's mouth on the east bank, and the steps out of the pit
    for (let z = 18; z <= 22; z++) for (let x = 3; x <= 7; x++) expect(cells.has(`${x},${z}`), `a mass at ${x},${z}`).toBe(false);
    for (let z = 18; z <= 23; z++) for (let x = 23; x <= 26; x++) expect(cells.has(`${x},${z}`), `a mass at ${x},${z}`).toBe(false);
    for (const x of [10, 12, 16, 18]) for (const z of [19, 20, 21, 22, 31, 32, 33, 34]) expect(cells.has(`${x},${z}`), `a mass at the pit's steps ${x},${z}`).toBe(false);
  });

  it("burns in a corner of the west bank, on open floor: the pyre", () => {
    expect(decor("pyre")).toHaveLength(1);
    for (const d of decor("pyre")) expect(L.g[Math.floor(d.z)][Math.floor(d.x)]).toBe(".");
  });
});

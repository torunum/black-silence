// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { LEVELS } from "../../src/world/levels/index";
import type { MassBox } from "../../src/world/WorldState";
import { CELL } from "../../src/world/Grid";
import { decorCell } from "../../src/world/density";

/**
 * DO THE ENEMIES GET STUCK ON THE NEW OBSTACLES? (levels-feel-full plan, Task 3.)
 *
 * Enemies have no pathfinding: an enemy that sees the player steps straight at them
 * (`moveEnemy` refuses a step whose x-part or z-part lands in a wall), and one that does not
 * walks to where it last saw them. Since Task 2 the dressing has solid masses (`world.masses`,
 * read through `solidAt`), which are walls that stand in rooms. This loads levels 1-7 for real,
 * puts the player at a few places, makes every enemy aware of them and runs the real
 * `enemyTick` for twelve simulated seconds, then reports every enemy that ended **pinned against
 * a mass**: not moving for the last four seconds, still well short of the player, with a mass
 * within a body's width of it — and only if the same enemy in the same scenario with the masses
 * taken away is not just as stuck (a wall, or another room, is not a mass's doing).
 *
 * The player stands still, so this is the harshest case: a real player keeps moving and an
 * enemy that lost sight of them behind a mass sees them again round it. Nothing here is a
 * change to the AI; when a mass pins an enemy the mass is what moves (`levels/dress*.ts`).
 *
 * `STUCK_REPORT=1 npx vitest run tests/enemies/stuckCheck.test.ts` prints the numbers.
 */

const DT = 1 / 30, SECONDS = 12, WINDOW = 4, PIN = .3, PLACES = 24;

type World = typeof import("../../src/world/WorldState").world;
let world: World;
let player: typeof import("../../src/player/PlayerState").player;
let loadLevel: (i: number) => void;
let enemyTick: (dt: number) => boolean;
let massMap: typeof import("../../src/world/decor/masses").massMap;
let S: typeof import("../../src/core/State").S;

/** A repeatable stream in place of `Math.random`: the level and the AI both draw from it. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  ({ world } = await import("../../src/world/WorldState"));
  ({ player } = await import("../../src/player/PlayerState"));
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ enemyTick } = await import("../../src/enemies/ai/Behaviors"));
  ({ massMap } = await import("../../src/world/decor/masses"));
  ({ S } = await import("../../src/core/State"));
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();   // boots the game: the textures and sprites `loadLevel` needs are drawn here
});

afterAll(() => { vi.restoreAllMocks(); });

/** Distance from a point to a mass box (0 inside). */
const toBox = (x: number, z: number, m: MassBox): number => Math.hypot(Math.max(m.x0 - x, 0, x - m.x1), Math.max(m.z0 - z, 0, z - m.z1));
/** The nearest mass to a point, and how far. */
function nearestMass(x: number, z: number): { m: MassBox; d: number } | null {
  let best: { m: MassBox; d: number } | null = null;
  const gx = Math.floor(x / CELL), gz = Math.floor(z / CELL);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++)
    for (const m of world.masses.get((gz + dz) * 4096 + gx + dx) || []) { const d = toBox(x, z, m); if (!best || d < best.d) best = { m, d }; }
  return best;
}

/**
 * Where to put the player: the spawn, the middle and the far end of the level, and cells spread evenly over the rest of
 * its floor (every Nth walkable cell in reading order), `PLACES` in all. Chosen from the grid, so it follows the level.
 */
function spots(i: number): Array<[number, number]> {
  const g = LEVELS[i].build().g;
  const floor: Array<[number, number]> = [];
  let spawn: [number, number] = [1, 1];
  g.forEach((row, z) => row.forEach((c, x) => { if (c === "P") spawn = [x, z]; if (c !== "#" && c !== "W" && c !== "I" && !"+DS".includes(c)) floor.push([x, z]); }));
  const nearest = (tx: number, tz: number): [number, number] => floor.reduce((b, c) => Math.hypot(c[0] - tx, c[1] - tz) < Math.hypot(b[0] - tx, b[1] - tz) ? c : b);
  const far = floor.reduce((b, c) => Math.hypot(c[0] - spawn[0], c[1] - spawn[1]) > Math.hypot(b[0] - spawn[0], b[1] - spawn[1]) ? c : b);
  const out: Array<[number, number]> = [spawn, nearest(g[0].length / 2, g.length / 2), far];
  const stride = Math.floor(floor.length / (PLACES - out.length));
  for (let k = Math.floor(stride / 2); out.length < PLACES && k < floor.length; k += stride) out.push(floor[k]);
  return out;
}

interface Outcome { enemies: number; pinned: number; pinnedByMass: number; detail: string[] }

/**
 * Loads a level, seeds the dice, puts the player at a cell, wakes and alerts every enemy, runs the tick, and
 * returns who ended pinned. `withMasses: false` clears `world.masses` after the load: the same level without them.
 */
function run(i: number, at: [number, number], withMasses: boolean, extra?: MassBox[]): { pos: Array<{ x: number; z: number; pinned: boolean; touch: boolean; key: string; mass: string; reached: boolean }> } {
  const rnd = seeded(1000 + i * 7 + at[0] * 3 + at[1]);
  const spy = vi.spyOn(Math, "random").mockImplementation(rnd);
  try {
    loadLevel(i);
    if (extra) {   // a mass placed by hand: the test's own, to prove the check can see one
      const decorMap = massMap([]);
      for (const m of extra) for (let gz = Math.floor(m.z0 / CELL); gz <= Math.floor((m.z1 - 1e-9) / CELL); gz++)
        for (let gx = Math.floor(m.x0 / CELL); gx <= Math.floor((m.x1 - 1e-9) / CELL); gx++) { const k = gz * 4096 + gx; (decorMap.get(k) || decorMap.set(k, []).get(k)!).push(m); }
      for (const [k, v] of world.masses) decorMap.set(k, [...(decorMap.get(k) || []), ...v]);
      world.masses = decorMap;
    }
    if (!withMasses) world.masses = new Map();
    player.px = (at[0] + .5) * CELL; player.pz = (at[1] + .5) * CELL;
    player.spawnGuard = 1e9;
    S.hp = 1e9;
    for (const e of world.enemies) { e.dormant = false; e.aware = true; e.alertX = player.px; e.alertZ = player.pz; e.slow = 1; }
    const history: Array<Array<[number, number]>> = world.enemies.map((e) => [[e.x, e.z]]);
    const steps = Math.round(SECONDS / DT), every = Math.round(.5 / DT);
    for (let s = 1; s <= steps; s++) {
      player.spawnGuard = 1e9; S.hp = 1e9;
      enemyTick(DT);
      if (s % every === 0) world.enemies.forEach((e, k) => history[k].push([e.x, e.z]));
    }
    const back = Math.round(WINDOW / .5);
    return {
      pos: world.enemies.map((e, k) => {
        const h = history[k], a = h[h.length - 1], b = h[h.length - 1 - back] || h[0];
        const short = Math.hypot(player.px - e.x, player.pz - e.z) > 3;
        const pinned = !e.dead && short && Math.hypot(a[0] - b[0], a[1] - b[1]) < PIN && (e.stun || 0) <= 0;
        const n = nearestMass(e.x, e.z);
        return { x: e.x, z: e.z, pinned, touch: !!n && n.d < e.r + .35, key: e.key, reached: Math.hypot(player.px - e.x, player.pz - e.z) < 2.5, mass: n ? `${Math.floor((n.m.x0 + n.m.x1) / 2 / CELL)},${Math.floor((n.m.z0 + n.m.z1) / 2 / CELL)}` : "-" };
      }),
    };
  } finally { spy.mockRestore(); }
}

/** Runs the scenario with the masses and without, and says who a mass pinned. */
function check(i: number, at: [number, number], extra?: MassBox[]): Outcome {
  const withM = run(i, at, true, extra), without = run(i, at, false);
  const kinds = new Map<string, string>();
  for (const d of LEVELS[i].build().decor || []) { const { x, z } = decorCell(d); kinds.set(`${x},${z}`, d.k); }
  const detail: string[] = [];
  let pinned = 0, byMass = 0;
  withM.pos.forEach((p, k) => {
    if (p.pinned) pinned++;
    if (p.pinned && p.touch && without.pos[k].reached) { byMass++; detail.push(`${p.key} at (${(p.x / CELL - .5).toFixed(1)},${(p.z / CELL - .5).toFixed(1)}) pinned on the ${kinds.get(p.mass) ?? "?"} at cell (${p.mass}), player at (${at[0]},${at[1]})`); }
  });
  return { enemies: withM.pos.length, pinned, pinnedByMass: byMass, detail };
}

describe("enemies on levels 1-7 with the masses in", () => {
  const rows: string[] = [];
  for (let i = 1; i <= 7; i++) {
    it(`level ${i}: no enemy ends pinned against a mass, from twenty-four places the player may stand`, () => {
      let enemies = 0, pinned = 0, byMass = 0, scenarios = 0, contact = 0;
      const detail: string[] = [];
      for (const at of spots(i)) {
        const o = check(i, at);
        enemies += o.enemies; pinned += o.pinned; byMass += o.pinnedByMass; scenarios++; detail.push(...o.detail);
      }
      loadLevel(i);
      contact = world.masses.size;
      rows.push(`| ${i} ${LEVELS[i].name.replace(/^LEVEL \d — /, "")} | ${world.masses.size ? "yes" : "-"} | ${scenarios} | ${enemies} | ${pinned} | ${byMass} |`);
      expect(detail, `level ${i}: enemies a mass pinned`).toEqual([]);
      expect(contact >= 0).toBe(true);
    }, 120000);
  }

  afterAll(() => {
    if (process.env.STUCK_REPORT) console.log(["| level | masses | scenarios | enemy-runs | pinned (any cause) | pinned by a mass |", "|---|---|---:|---:|---:|---:|", ...rows].join("\n"));
  });
});

describe("the check itself", () => {
  it("sees a mass that has been placed in an enemy's way: a wall of crates across the level 5 tunnel in front of its first enemy", () => {
    // level 5: enemies w(14,2) and t(11,3) in the main tunnel; the player at the spawn (2,2). A wall of mass across
    // the whole tunnel between them (x 6..7, z 0..6 cells) is one no straight-line walker can get round.
    const wall: MassBox = { x0: 7 * CELL, x1: 7.9 * CELL, z0: 1 * CELL, z1: 6 * CELL };
    const o = check(5, [2, 2], [wall]);
    expect(o.pinnedByMass, "enemies the planted wall pinned").toBeGreaterThan(0);
  }, 120000);

  it("does not blame a mass for a wall: the level 5 tunnel without any planted mass pins nobody on a mass", () => {
    const o = check(5, [2, 2]);
    expect(o.pinnedByMass).toBe(0);
  }, 120000);
});

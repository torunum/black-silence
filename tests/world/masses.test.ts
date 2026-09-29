// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import type * as PlayerModule from "../../src/player/Player";
import { CELL, EYE } from "../../src/world/Grid";
import type { DecorSpec } from "../../src/world/LevelBuilder";
import { PIECES } from "../../src/world/decor/registry";
import { massBox, massBoxes, massCells, massMap } from "../../src/world/decor/masses";
import { addPiece, type Parts } from "../../src/world/decor/parts";
import { WALL_ROT } from "../../src/world/decor/kit";

/**
 * SOLID MASSES (levels-feel-full plan, Task 2). Decisions the controller made and this file holds
 * to: a sarcophagus, a machine, a pile of crates, a fallen statue, a torture rack are things a
 * player must not walk through, and neither may the enemies, the shots or the line of sight;
 * small clutter stays walk-through; a mass is not a breakable prop.
 *
 * The mechanism is one rule in `solidAt` (`Collision.ts`): a point inside a mass's box is a wall.
 * `collides` (the player: eight samples round a 0.35 radius), every enemy's step, a projectile, a
 * hitscan ray and an enemy's `los` all ask `solidAt`, so this file checks the box (`massBox`), the
 * lookup (`massMap`, `world.masses`), and then what the real callers do with it: the player's own
 * `playerTick` walked into a mass in an open field, `los` across one, a shot's ray-march along one.
 *
 * Booted the way `tests/player/Player.test.ts` boots: DOM stubs, then dynamic imports.
 */
let Player: typeof PlayerModule;
let world: typeof import("../../src/world/WorldState").world;
let player: typeof import("../../src/player/PlayerState").player;
let keys: Record<string, boolean>;
let input: typeof import("../../src/player/Input").input;
let solidAt: typeof import("../../src/world/Collision").solidAt;
let collides: typeof import("../../src/world/Collision").collides;
let los: typeof import("../../src/enemies/ai/Perception").los;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  Player = await import("../../src/player/Player");
  ({ player } = await import("../../src/player/PlayerState"));
  ({ keys, input } = await import("../../src/player/Input"));
  ({ world } = await import("../../src/world/WorldState"));
  ({ solidAt, collides } = await import("../../src/world/Collision"));
  ({ los } = await import("../../src/enemies/ai/Perception"));
  const { S } = await import("../../src/core/State");
  const { game } = await import("../../src/core/Game");
  S.dead = false; S.won = false; game.inputLock = false;
  const { renderState } = await import("../../src/render/Renderer");
  renderState.lamp ??= new THREE.PointLight();
});

const N = WALL_ROT.n;
const spec = (k: string, x: number, z: number, r?: number, s?: number): DecorSpec => ({ k, x, z, ...(r === undefined ? {} : { r }), ...(s === undefined ? {} : { s }) });
const MASSES = Object.keys(PIECES).filter((k) => PIECES[k].mass);

describe("a mass's box", () => {
  it("is the piece's footprint, in world units, round its cell's centre", () => {
    // a crate pile against a north wall in cell (5,5): centre (11,11), footprint x -.92..+.85, z -.97..-.13
    const b = massBox(spec("cratepile", 5, 5, N))!;
    expect(b.x0).toBeCloseTo(11 - .92); expect(b.x1).toBeCloseTo(11 + .85);
    expect(b.z0).toBeCloseTo(11 - .97); expect(b.z1).toBeCloseTo(11 - .13);
  });

  it("turns with the piece: a quarter turn swaps the axes, and each wall puts a mass against its own wall", () => {
    const n = massBox(spec("cratepile", 5, 5, WALL_ROT.n))!, s = massBox(spec("cratepile", 5, 5, WALL_ROT.s))!;
    const e = massBox(spec("cratepile", 5, 5, WALL_ROT.e))!, w = massBox(spec("cratepile", 5, 5, WALL_ROT.w))!;
    expect(n.z1 - n.z0).toBeCloseTo(.84); expect(e.x1 - e.x0).toBeCloseTo(.84);
    expect(n.x1 - n.x0).toBeCloseTo(1.77); expect(e.z1 - e.z0).toBeCloseTo(1.77);
    expect(n.z0).toBeLessThan(11 - .9);   // the north side of the cell
    expect(s.z1).toBeGreaterThan(11 + .9);
    expect(e.x1).toBeGreaterThan(11 + .9);
    expect(w.x0).toBeLessThan(11 - .9);
  });

  it("scales with the piece's size, and a piece that is not a mass has none", () => {
    const one = massBox(spec("gravestone", 3, 3, 0))!, two = massBox(spec("gravestone", 3, 3, 0, 1.44))!;
    expect(two.x1 - two.x0).toBeCloseTo(2 * (one.x1 - one.x0));
    for (const k of ["straw", "banner", "cage", "candelabra", "niche", "rubble", "urn", "bench", "lectern"]) expect(massBox(spec(k, 3, 3, 0)), k).toBeNull();
  });

  it("belongs to exactly the pieces that are big enough to be in the way: the casters, the font, and the yard's stones and trees", () => {
    expect(MASSES.sort()).toEqual(["altar", "cratepile", "conveyor", "deadtree", "drum", "fallenstatue", "font", "gravecross", "gravestone",
      "machine", "maiden", "rack", "sapling", "sarcofree", "sarcophagus", "slab", "stocks", "tombfree"].sort());
  });

  it("stays inside its own cell at every yaw a rule allows (a wall side, or a quarter turn), so a flood fill may treat the cell as a wall", () => {
    for (const k of MASSES) for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      expect(massCells(spec(k, 7, 9, r)), `${k} at yaw ${r}`).toEqual([[7, 9]]);
    }
  });

  it("is the size of what you see: no invisible wall beyond the mesh, no mesh a player would walk into", () => {
    for (const k of MASSES) {
      const parts: Parts = new Map();
      addPiece(parts, { k, x: 0, z: 0, r: 0 });
      // the ground footprint of everything under knee height: a tree's limbs and a rack's rollers are above it, and the trunk and the legs are what is in the way
      const mesh = new THREE.Box3();
      for (const list of parts.values()) for (const g of list) {
        const p = g.getAttribute("position");
        for (let i = 0; i < p.count; i++) if (p.getY(i) < .5) mesh.expandByPoint(new THREE.Vector3(p.getX(i), 0, p.getZ(i)));
      }
      const b = massBox({ k, x: 0, z: 0, r: 0 })!, ox = CELL / 2, oz = CELL / 2;
      // world units -> the cell-centred frame the piece is built in
      const m = { x0: b.x0 - ox, x1: b.x1 - ox, z0: b.z0 - oz, z1: b.z1 - oz };
      const slack = .2;
      expect(m.x0, `${k} x0`).toBeGreaterThanOrEqual(mesh.min.x - ox - slack); expect(m.x1, `${k} x1`).toBeLessThanOrEqual(mesh.max.x - ox + slack);
      expect(m.z0, `${k} z0`).toBeGreaterThanOrEqual(mesh.min.z - oz - slack); expect(m.z1, `${k} z1`).toBeLessThanOrEqual(mesh.max.z - oz + slack);
      // and it covers at least 60% of the mesh's ground footprint each way (a drum or a tree is thin, a rack is not)
      const w = mesh.max.x - mesh.min.x, d = mesh.max.z - mesh.min.z;
      expect((m.x1 - m.x0) / w, `${k} covers its width`).toBeGreaterThan(.6);
      expect((m.z1 - m.z0) / d, `${k} covers its depth`).toBeGreaterThan(.6);
    }
  });
});

describe("the lookup", () => {
  it("lists a box under every cell it touches, and nothing for a level with no masses", () => {
    expect(massMap(undefined).size).toBe(0);
    expect(massMap([spec("straw", 3, 3), spec("banner", 4, 4, N)]).size).toBe(0);
    const map = massMap([spec("sarcofree", 6, 6, 0, 1.9)]);   // a sarcophagus blown up past its cell: it spills over its neighbours, so it is listed under each
    expect(map.size).toBeGreaterThan(1);
    for (const boxes of map.values()) expect(boxes).toHaveLength(1);
  });

  it("finds a box by its cell key, `gz * 4096 + gx`, which is the key `solidAt` asks", () => {
    const map = massMap([spec("sarcophagus", 6, 6, WALL_ROT.n)]);
    expect([...map.keys()]).toEqual([6 * 4096 + 6]);
    expect(massBoxes([spec("sarcophagus", 6, 6, WALL_ROT.n), spec("straw", 1, 1)])).toHaveLength(1);
  });
});

describe("what the world does with a mass", () => {
  /** An open field of `.`, 30 cells across, with the given decor's masses in its `world.masses`. */
  function field(specs: DecorSpec[]): void {
    world.grid = Array.from({ length: 30 }, () => Array.from({ length: 30 }, () => "."));
    world.heightMap = null; world.wallSegs = []; world.props = []; world.doors = {};
    world.exitPos = null; world.challenge = null; world.enemies = [];
    world.masses = massMap(specs);
    Object.assign(player, { vx: 0, vy: 0, vz: 0, pyy: EYE, grounded: true, bobT: 0, lastBobSin: 0, spawnGuard: 0 });
  }
  const SARC = spec("sarcofree", 6, 6, 0);   // free-standing in cell (6,6), centre (13,13): the box is x 11.14..14.86, z 12.54..13.46

  it("makes a point inside a mass solid, and the ground beside it not", () => {
    field([SARC]);
    const b = massBox(SARC)!, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    expect(solidAt(cx, cz)).toBe(true);
    expect(solidAt(b.x0 + .01, b.z0 + .01)).toBe(true);
    expect(solidAt(b.x0 - .05, cz)).toBe(false);
    expect(solidAt(b.x1 + .05, cz)).toBe(false);
    expect(solidAt(cx, b.z1 + .05)).toBe(false);
    field([]);
    expect(solidAt(cx, cz)).toBe(false);
  });

  it("stops the player: `playerTick` walked straight at a sarcophagus never gets in, and a lane beside it goes past", () => {
    field([SARC]);
    const b = massBox(SARC)!, zc = (b.z0 + b.z1) / 2, R = .35;
    const walkEast = (z: number): number => {
      Object.assign(player, { px: b.x0 - 5, pz: z, vx: 0, vz: 0 });
      input.yaw = -Math.PI / 2;   // facing +x
      keys.KeyW = true;
      try { for (let i = 0; i < 240; i++) Player.playerTick(1 / 60); } finally { keys.KeyW = false; }
      return player.px;
    };
    const blocked = walkEast(zc);
    expect(blocked, "the player moved").toBeGreaterThan(b.x0 - 5 + 2);
    expect(blocked + R, "and stopped at the box").toBeLessThanOrEqual(b.x0 + 1e-6);
    const beside = walkEast(b.z1 + R + .3);   // a lane clear of the box's south edge
    expect(beside, "the lane past it").toBeGreaterThan(b.x1 + 2);
    expect(collides(b.x0 - R - .01, zc)).toBe(false);
    expect(collides(b.x0 - R + .05, zc)).toBe(true);
  });

  it("stops the line of sight and the shot: an enemy behind a mass cannot see, and a ray-march along a shot ends on it", () => {
    field([SARC]);
    const b = massBox(SARC)!, zc = (b.z0 + b.z1) / 2;
    expect(los(b.x0 - 3, zc, b.x1 + 3, zc), "across the mass").toBe(false);
    expect(los(b.x0 - 3, b.z1 + 1.5, b.x1 + 3, b.z1 + 1.5), "past it").toBe(true);
    // what Hitscan does: step the ray by .1 until solidAt
    let hit = -1;
    for (let t = 0; t < 46; t += .1) if (solidAt(b.x0 - 3 + t, zc)) { hit = t; break; }
    expect(hit).toBeGreaterThan(2.8); expect(hit).toBeLessThan(3.2);
    field([]);
    expect(los(b.x0 - 3, zc, b.x1 + 3, zc), "with no mass").toBe(true);
  });

  it("does not stop a step past a piece that is not a mass: straw, a banner and a candelabrum are walked over", () => {
    field([spec("straw", 6, 6), spec("candelabra", 7, 6), spec("banner", 8, 6, N)]);
    expect(world.masses.size).toBe(0);
    Object.assign(player, { px: 12, pz: 13, vx: 0, vz: 0 });
    input.yaw = -Math.PI / 2; keys.KeyW = true;
    try { for (let i = 0; i < 120; i++) Player.playerTick(1 / 60); } finally { keys.KeyW = false; }
    expect(player.px).toBeGreaterThan(24);
  });
});

describe("what the loader gives the world", () => {
  it("builds `world.masses` from the level's decor: the dungeon has them, the prologue (dressed by hand, with none) has not, and a reload replaces them", async () => {
    (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
    (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
    await import("../../src/main");
    const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
    (newGame as HTMLElement).click();
    const { loadLevel } = await import("../../src/world/LevelLoader");
    const { LEVELS } = await import("../../src/world/levels/index");
    loadLevel(1);
    const boxes = new Set<unknown>([...world.masses.values()].flat());
    expect(boxes.size).toBe(massBoxes(LEVELS[1].build().decor!).length);
    expect(boxes.size).toBeGreaterThan(20);
    loadLevel(0);
    expect(world.masses.size, "the prologue has no masses").toBe(0);
    loadLevel(3);
    expect(world.masses.size).toBeGreaterThan(0);
  }, 30_000);
});

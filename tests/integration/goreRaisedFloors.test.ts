// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { world } from "../../src/world/WorldState";
import { player } from "../../src/player/PlayerState";
import { input } from "../../src/player/Input";
import { renderState } from "../../src/render/Renderer";
import { EYE } from "../../src/world/Grid";
import { floorHeightAt } from "../../src/world/Collision";
import { S } from "../../src/core/State";

/**
 * BLOOD, GIBS AND HEADS LAND ON THE FLOOR THEY FALL ON (the owner: "in most places the blood doesn't stay on the floor, there's no dismemberment, and
 * heads don't come off"). The gore code assumed the ground was y = 0: a pool sat at y .01, a gib or a blood drop stopped at y .07 / .02, a head spawned at
 * `e.h * .92` and bounced on `h.sz * .5`, a corpse sank to `e.h * .18` and a limb flew off from `e.h * .55`. On a raised floor (the churchyard at 4.2, level 1's
 * galleries at 1.2 and 2.4) all of it spawned or settled inside the floor and was never seen. This holds every one of those sites to the floor under it, on
 * a floor of 0, 1.2 and 4.2, and holds that a headshot kill and a limb hit still decapitate and sever on a raised floor exactly as on the ground.
 *
 * The arena is an open grid of 24 x 24 cells (48 units) whose `world.heightMap` is the test's own, laid over a booted game so that the real `killEnemy`, `damageEnemy`,
 * `hitscan`, `enemyTick`, `headTick`, `gibTick` and `partTick` run on it.
 */

type Foe = {
  key: string; x: number; z: number; h: number; w: number; fy: number; hp: number; dormant: boolean; dead: boolean; gone: boolean; deathKind: number;
  sever?: { lArm?: boolean; rArm?: boolean; legs?: boolean }; sp: THREE.Sprite; blob: THREE.Mesh; fly: boolean; deathT: number;
};
type Head = { y: number; x: number; z: number; vx: number; vz: number; sz: number; rest: boolean };

const N = 24, CELL_W = 2;
let hitscan: (dir: THREE.Vector3, dmg: number, wIdx: number) => void;
let loadLevel: (i: number) => void;
let gibTick: (dt: number) => void, resetGibs: () => void, spawnGibs: (x: number, y: number, z: number, n: number, pow: number, wood?: boolean) => void;
let partTick: (dt: number) => void, buildParticles: () => void, spawnP: (...a: number[]) => void;
let addPool: (x: number, z: number, s: number) => void, resetDecals: () => void, poolMat: THREE.Material, gibGeo: THREE.BufferGeometry;
let headTick: (dt: number) => void, spawnHead: (e: unknown, info: unknown) => void, headPool: { heads: Array<Record<string, unknown>> };
let enemyTick: (dt: number) => void, breakProp: (p: unknown) => void;
let projTick: (dt: number) => void, projectiles: { orbs: unknown[] };

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ hitscan } = await import("../../src/weapons/Hitscan"));
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ gibTick, resetGibs, spawnGibs, gibGeo } = await import("../../src/fx/Gibs"));
  ({ partTick, buildParticles, spawnP } = await import("../../src/fx/Particles") as never);
  ({ addPool, resetDecals, poolMat } = await import("../../src/fx/Decals"));
  ({ headTick, spawnHead } = await import("../../src/enemies/Death") as never);
  ({ headPool } = await import("../../src/fx/Heads"));
  ({ enemyTick } = await import("../../src/enemies/ai/Behaviors"));
  ({ breakProp } = await import("../../src/world/Props") as never);
  ({ projTick } = await import("../../src/fx/ProjectileTick"));
  ({ projectiles } = await import("../../src/fx/Projectiles") as never);
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

/** Loads level 1 and lays an open arena whose floor at (gx, gz) is `floorAt(gx, gz)` over it, with one zombie, alone, at the middle of it. */
function arena(floorAt: (gx: number, gz: number) => number): Foe {
  loadLevel(1);
  world.grid = Array.from({ length: N }, () => Array.from({ length: N }, () => "."));
  world.GW = N; world.GH = N;
  world.heightMap = Array.from({ length: N }, (_, gz) => Array.from({ length: N }, (_, gx) => floorAt(gx, gz)));
  world.ceilMap = null;
  world.masses.clear(); world.doors = {}; world.wallSegs = []; world.props = [];
  resetGibs(); resetDecals(); buildParticles(); headPool.heads.length = 0;
  S.beheads = 0;
  const foes = world.enemies as unknown as Foe[];
  const z = foes.find((e) => e.key === "z")!;
  for (const o of foes) if (o !== z) { o.dead = true; o.gone = true; }
  z.x = 25; z.z = 25; z.fy = floorHeightAt(z.x, z.z); z.dormant = false; z.hp = 50; z.dead = false; z.gone = false; z.sever = {}; z.deathKind = 0; z.deathT = 0;
  z.sp.visible = true;
  return z;
}
const flat = (fy: number) => () => fy;
const scene = () => renderState.scene as THREE.Scene;
const gibMeshes = () => scene().children.filter((o) => (o as THREE.Mesh).geometry === gibGeo) as THREE.Mesh[];
const poolMeshes = () => scene().children.filter((o) => (o as THREE.Mesh).material === poolMat) as THREE.Mesh[];
const sky = () => scene().children.filter((o) => o.type === "Points" && (o as THREE.Points).geometry.attributes.position.count === 1100).pop() as THREE.Points;   // the last one: arena() rebuilt the pool
const settle = (secs: number): void => {
  for (let i = 0; i < secs * 60; i++) { gibTick(1 / 60); headTick(1 / 60); partTick(1 / 60); }
};
/** Stands the player 4 units west of the zombie on its floor and fires at a point `up` of its height and `side` of its width from the centre. */
function shoot(e: Foe, up: number, side: number, dmg: number): void {
  player.px = e.x - 4; player.pz = e.z; player.pyy = EYE + e.fy;
  renderState.camera.position.set(player.px, player.pyy, player.pz);
  input.yaw = -Math.PI / 2;   // facing +x
  const target = new THREE.Vector3(e.x, e.fy + e.h * (.5 + up), e.z + side * e.w * .5);
  hitscan(target.sub(renderState.camera.position).normalize(), dmg, 0);
}

describe.each([0, 1.2, 4.2])("on a floor of %s", (fy) => {
  it("a blood pool sits just above the floor it is placed on", () => {
    arena(flat(fy));
    addPool(25, 25, 1);
    addPool(30, 22, .4);
    const pools = poolMeshes();
    expect(pools.length).toBe(2);
    for (const p of pools) {
      expect(p.position.y, "above the floor").toBeGreaterThan(fy + .005);
      expect(p.position.y, "and only just").toBeLessThan(fy + .02);
    }
  });

  it("gibs bounce and come to rest on the floor, and their blood pools sit on it", () => {
    arena(flat(fy));
    spawnGibs(25, fy + .8, 25, 14, 3);
    expect(gibMeshes().length).toBe(14);
    settle(8);
    for (const g of gibMeshes()) expect(g.position.y, "a gib at rest").toBeCloseTo(fy + .07, 5);
    for (const p of poolMeshes()) { expect(p.position.y).toBeGreaterThan(fy + .005); expect(p.position.y).toBeLessThan(fy + .02); }
  });

  it("blood particles hit the floor and leave a pool on it; a spark bounces off it", () => {
    arena(flat(fy));
    const realRandom = Math.random;
    Math.random = () => 0;   // every rnd() at its lower bound, and a settling drop's 14% roll for a pool is made
    try {
      spawnP(25, fy + .5, 25, 0, 0, 0, .5, .05, .02, 1, 1);   // a blood drop, at rest above the floor
      spawnP(26, fy + .3, 25, 0, -1, 0, 1, .8, .3, 2, 2);     // a spark, falling
      for (let i = 0; i < 30; i++) partTick(1 / 60);
    } finally { Math.random = realRandom; }
    const pools = poolMeshes();
    expect(pools.length, "the drop landed and left a pool").toBe(1);
    expect(pools[0].position.y).toBeGreaterThan(fy + .005);
    expect(pools[0].position.y).toBeLessThan(fy + .02);
    const pos = sky().geometry.attributes.position.array as Float32Array;
    expect(pos[3 + 1], "the spark bounced off the floor, not through it").toBeGreaterThanOrEqual(fy + .02 - 1e-4);
  });

  it("a head spawns at the shoulders of the body on the floor, lands and rests on that floor", () => {
    const z = arena(flat(fy));
    spawnHead(z, { dir: { x: 1, z: 0 } });
    const h = headPool.heads[0] as unknown as Head;
    expect(h.y, "it pops off at the neck").toBeCloseTo(fy + z.h * .92, 5);
    player.px = 1; player.pz = 1;
    settle(10);
    expect(h.rest, "it came to rest").toBe(true);
    expect(h.y, "on the floor").toBeCloseTo(fy + h.sz * .5, 5);
  });

  it("a headshot kill decapitates, the head comes off above the floor and rests on it", () => {
    const z = arena(flat(fy));
    shoot(z, .38, 0, 30);   // 30 x2 on 50 hp: dead, but not by 22 past it, which would be a gib
    expect(z.dead, "the shot kills").toBe(true);
    expect(z.deathKind, "and takes the head").toBe(2);
    expect(S.beheads, "DECAPITATED counted").toBe(1);
    expect(headPool.heads.length, "a head is thrown").toBe(1);
    const h = headPool.heads[0] as unknown as Head;
    expect(h.y, "from the neck of the body on this floor").toBeGreaterThan(fy + z.h * .8);
    for (const g of gibMeshes()) expect(g.position.y, "its gibs start above the floor").toBeGreaterThan(fy + z.h * .8);
    player.px = 1; player.pz = 1;
    settle(10);
    expect(h.rest).toBe(true);
    expect(h.y).toBeCloseTo(fy + h.sz * .5, 5);
    for (const g of gibMeshes()) expect(g.position.y).toBeCloseTo(fy + .07, 5);
  });

  it("a hit on an arm and a hit on the legs still sever, and the limbs fly from the body and land on the floor", () => {
    for (const [what, up, side, key] of [["an arm", 0, .8, "arm"], ["the legs", -.4, 0, "legs"]] as const) {
      const z = arena(flat(fy));
      z.hp = 100;
      shoot(z, up, side, 34);
      expect(z.dead, what).toBe(false);
      const s = z.sever!;
      expect(Boolean(key === "arm" ? s.lArm || s.rArm : s.legs), `${what} is torn off`).toBe(true);
      expect(gibMeshes().length, "the chunks are thrown").toBeGreaterThan(0);
      for (const g of gibMeshes()) expect(g.position.y, `${what}: they leave the body, not the floor below it`).toBeGreaterThan(fy + z.h * .2);
      settle(8);
      for (const g of gibMeshes()) expect(g.position.y, `${what}: and they land on the floor`).toBeCloseTo(fy + .07, 5);
    }
  });

  it("a corpse lies on the floor it died on, with its shadow", () => {
    const z = arena(flat(fy));
    shoot(z, 0, 0, 60);   // 60 on 50 hp: dead
    expect(z.dead).toBe(true);
    player.px = 1; player.pz = 1;
    for (let i = 0; i < 40; i++) enemyTick(1 / 60);
    expect(z.sp.position.y, "the body on the floor, not through it").toBeGreaterThanOrEqual(fy + z.h * .15);
    expect(z.blob.position.y, "and the shadow under it").toBeCloseTo(fy + .012, 5);
  });

  it("a hit enemy is stunned on its feet, not sunk into the floor", () => {
    const z = arena(flat(fy));
    shoot(z, 0, 0, 10);   // 10 on 50 hp: hurt, stunned, alive
    expect(z.dead).toBe(false);
    for (let i = 0; i < 3; i++) enemyTick(1 / 60);
    expect(z.sp.position.y, "the sprite stands on the floor").toBeGreaterThan(fy + z.h * .4);
    expect(z.blob.position.y, "and its shadow under it").toBeCloseTo(fy + .012, 5);
  });

  it("a thrown chunk of flesh splats on the floor under it, not on floor 0 far below", () => {
    arena(flat(fy));
    player.px = 1; player.pz = 1; player.pyy = EYE + fy;
    const m = new THREE.Mesh(gibGeo, new THREE.MeshBasicMaterial());
    m.position.set(25, fy + .5, 25); scene().add(m);
    projectiles.orbs.push({ m, vx: 0, vy: -2, vz: 0, life: 2.4, dmg: 14, flesh: true, spin: 1, col: 0 });
    for (let i = 0; i < 30; i++) projTick(1 / 60);   // half a second: it falls the half unit to the floor in well under that
    expect(projectiles.orbs.length, "it has landed").toBe(0);
    for (const p of poolMeshes()) { expect(p.position.y).toBeGreaterThan(fy + .005); expect(p.position.y).toBeLessThan(fy + .02); }
  });

  it("a broken crate throws its splinters up from the floor it stands on", () => {
    arena(flat(fy));
    const m = new THREE.Object3D();
    breakProp({ m, x: 25, z: 25, r: .4, hgt: 1, hp: 0, dead: false, explosive: false, kind: "crate" });
    expect(gibMeshes().length).toBeGreaterThan(0);
    for (const g of gibMeshes()) expect(g.position.y).toBeGreaterThan(fy + .4);
  });
});

describe("gore rolls onto another height", () => {
  // a plateau at 4.2 for gx < 12, the ground at 1.2 beyond (the cell edge is at x = 24)
  const step = (gx: number) => (gx < 12 ? 4.2 : 1.2);
  it("a head thrown off the plateau lands on the lower floor", () => {
    const z = arena((gx) => step(gx));
    z.x = 23.5; z.fy = 4.2;
    spawnHead(z, { dir: { x: 1, z: 0 } });
    const h = headPool.heads[0] as unknown as Head;
    h.vx = 3; h.vz = 0;
    player.px = 1; player.pz = 1;
    settle(10);
    expect(h.x, "it went over the edge").toBeGreaterThan(24 + CELL_W / 2);
    expect(h.y, "and rests on the lower floor").toBeCloseTo(1.2 + h.sz * .5, 5);
  });

  it("gibs thrown from the plateau come to rest on the floor under each of them", () => {
    arena((gx) => step(gx));
    spawnGibs(23.9, 5, 25, 30, 3.4);
    settle(10);
    const seen = new Set<number>();
    for (const g of gibMeshes()) {
      const floor = floorHeightAt(g.position.x, g.position.z);
      seen.add(floor);
      expect(g.position.y, "a gib at rest").toBeCloseTo(floor + .07, 5);
    }
    expect([...seen].sort(), "some on each floor").toEqual([1.2, 4.2]);
  });
});

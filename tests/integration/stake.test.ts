// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import type { world as World } from "../../src/world/WorldState";
import type { player as Player } from "../../src/player/PlayerState";
import type { S as GameS } from "../../src/core/State";
import type { loadLevel as LoadLevel, spawnEnemy as SpawnEnemy } from "../../src/world/LevelLoader";
import type { itemsTick as ItemsTick } from "../../src/player/Interact";
import type { renderState as RenderState } from "../../src/render/Renderer";
import type { solidAt as SolidAt, floorHeightAt as FloorHeightAt } from "../../src/world/Collision";
import type * as StakeMod from "../../src/weapons/Stake";
import type * as WeaponStateMod from "../../src/weapons/WeaponState";

/**
 * THE STAKE GUN (owner, 2026-10-20: "sonra kazık eklensin") — slot 9, key 0. Boots the real game and drives the real code: the
 * pickup in the cathedral's east vault gives the weapon and stakes; a shot puts a stake in the air (not a hitscan); it is driven
 * into the wall it reaches and stays there; it catches fire after a moment in flight; it strikes a body, harder burning, and goes
 * on through one it kills; a level change clears them all.
 */

let world: typeof World;
let player: typeof Player;
let S: typeof GameS;
let loadLevel: typeof LoadLevel;
let spawnEnemy: typeof SpawnEnemy;
let itemsTick: typeof ItemsTick;
let renderState: typeof RenderState;
let solidAt: typeof SolidAt, floorHeightAt: typeof FloorHeightAt;
let K: typeof StakeMod;
let WS: typeof WeaponStateMod;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = () => 1;
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  ({ world } = await import("../../src/world/WorldState"));
  ({ player } = await import("../../src/player/PlayerState"));
  ({ S } = await import("../../src/core/State"));
  ({ loadLevel, spawnEnemy } = await import("../../src/world/LevelLoader"));
  ({ itemsTick } = await import("../../src/player/Interact"));
  ({ renderState } = await import("../../src/render/Renderer"));
  ({ solidAt, floorHeightAt } = await import("../../src/world/Collision"));
  K = await import("../../src/weapons/Stake");
  WS = await import("../../src/weapons/WeaponState");
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  (newGame as HTMLElement).click();
});

afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

type Item = { kind: string; x: number; z: number; taken?: boolean };
type Foe = { dead: boolean; dormant: boolean; hp: number; x: number; z: number; w: number; h: number; fy: number; boss: boolean; kx: number; kz: number };

const CATHEDRAL = 7;

/** An empty stretch: the level with no enemies or props, the camera at the player's eye looking along -z. */
function clearField(): void {
  loadLevel(CATHEDRAL);
  (world.enemies as unknown[]).length = 0;
  (world.props as unknown[]).length = 0;
  renderState.camera.position.set(player.px, floorHeightAt(player.px, player.pz) + 1.4, player.pz);
}

/** A free, level line of `n` world units from the player along (dx,dz), if there is one. */
function freeLine(dx: number, dz: number, n: number): boolean {
  const f = floorHeightAt(player.px, player.pz);
  for (let i = 0.5; i <= n; i += 0.5) {
    const x = player.px + dx * i, z = player.pz + dz * i;
    if (solidAt(x, z) || floorHeightAt(x, z) !== f) return false;
  }
  return true;
}

/** Puts the player at the start of a free, level runway `n` units long somewhere on the level, and returns its direction. */
function runway(n: number): [number, number] {
  const g = world.grid as unknown as string[][];
  for (let z = 1; z < g.length - 1; z++) for (let x = 1; x < g[z].length - 1; x++) {
    player.px = x * 2 + 1; player.pz = z * 2 + 1;
    if (solidAt(player.px, player.pz)) continue;
    for (const [dx, dz] of [[1, 0], [0, 1], [-1, 0], [0, -1]] as const) if (freeLine(dx, dz, n)) {
      renderState.camera.position.set(player.px, floorHeightAt(player.px, player.pz) + 1.4, player.pz);
      return [dx, dz];
    }
  }
  throw new Error("no runway " + n + " long");
}

/** A zombie at (x,z) with `hp`, awake and not elite, its plate gone: something to strike. */
function body(x: number, z: number, hp: number): Foe {
  const e = spawnEnemy("z", x, z) as unknown as Foe & { maxhp: number; plate: number; elite?: boolean };
  e.hp = e.maxhp = hp; e.dormant = false; e.plate = 0;
  return e;
}
/** The stake's line through the middle of the body, below the head. */
function aimAt(e: Foe): void { renderState.camera.position.y = (e.fy || 0) + e.h * 0.5 + 0.08; }

function tick(seconds: number): void { for (let t = 0; t < seconds; t += 1 / 60) K.stakeTick(1 / 60); }

describe("the stake gun", () => {
  it("is the tenth slot, picked up in the cathedral with its stakes", () => {
    loadLevel(CATHEDRAL);
    const items = world.items as unknown as Item[];
    const gun = items.find((i) => i.kind === "w9")!, box = items.find((i) => i.kind === "stakes")!;
    expect(gun).toBeDefined();
    expect(box).toBeDefined();
    S.weapons[9] = false; S.ammo.stakes = 0; S.mag[9] = 0;
    player.px = gun.x; player.pz = gun.z; itemsTick(1 / 60);
    expect(S.weapons[9]).toBe(true);
    expect(S.mag[9] + S.ammo.stakes).toBe(7);   // one in the trough, six in the bundle that comes with it
    const had = S.ammo.stakes;
    player.px = box.x; player.pz = box.z; itemsTick(1 / 60);
    expect(S.ammo.stakes).toBe(had + 6);
  });

  it("a shot puts one stake in the air and empties the trough", () => {
    clearField();
    S.cur = 9; S.weapons[9] = true; S.mag[9] = 1;
    const shots = S.shots;
    WS.fire(WS.WEAPONS[9]);
    expect(K.stakesLive().flying).toBe(1);
    expect(S.mag[9]).toBe(0);
    expect(S.shots).toBe(shots + 1);
  });

  it("is driven into the wall it reaches, and stays there", () => {
    clearField();
    K.fireStake(new THREE.Vector3(0, 0, -1), 120);
    tick(K.LIFE - 0.1);
    expect(K.stakesLive()).toEqual({ flying: 0, stuck: 1 });
    tick(5);
    expect(K.stakesLive().stuck).toBe(1);
  });

  it("strikes a body in its way, harder once it has burnt for a while", () => {
    const strike = (cells: number): number => {
      clearField();
      const [dx, dz] = runway(cells + 1);
      const foe = body(player.px + dx * cells, player.pz + dz * cells, 10000);
      aimAt(foe);
      K.fireStake(new THREE.Vector3(dx, 0, dz), 100);
      tick(1);
      expect(K.stakesLive().flying).toBe(0);
      return 10000 - foe.hp;
    };
    const near = strike(2), far = strike(Math.ceil(K.SPEED * K.IGNITE) + 3);
    expect(near).toBe(100);
    expect(far).toBe(100 * K.BURN);
  });

  it("goes on through a body it kills", () => {
    clearField();
    const [dx, dz] = runway(5);
    const mk = (cells: number, hp: number): Foe => body(player.px + dx * cells, player.pz + dz * cells, hp);
    const weak = mk(2, 10), strong = mk(4, 10000);
    aimAt(weak);
    K.fireStake(new THREE.Vector3(dx, 0, dz), 100);
    tick(1);
    expect(weak.hp).toBeLessThanOrEqual(0);
    expect(strong.hp).toBe(10000 - 100 * K.THROUGH_KEEP);
  });

  it("a level change clears every stake, flying and driven in", () => {
    clearField();
    K.fireStake(new THREE.Vector3(0, 0, -1), 120);
    tick(K.LIFE);
    K.fireStake(new THREE.Vector3(0, 0, -1), 120);
    expect(K.stakesLive().flying + K.stakesLive().stuck).toBe(2);
    loadLevel(CATHEDRAL);
    expect(K.stakesLive()).toEqual({ flying: 0, stuck: 0 });
  });
});

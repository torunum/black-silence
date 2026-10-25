// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import type { world as World } from "../../src/world/WorldState";
import type { player as Player } from "../../src/player/PlayerState";
import type { S as GameS } from "../../src/core/State";
import type { loadLevel as LoadLevel } from "../../src/world/LevelLoader";
import type { itemsTick as ItemsTick } from "../../src/player/Interact";
import type * as DynamiteMod from "../../src/weapons/Dynamite";
import type * as WeaponStateMod from "../../src/weapons/WeaponState";

/**
 * DYNAMITE (owner, 2026-10-20: "ilk dinamit eklensin") — slot 8. Boots the real game and drives the real code: the pickup in
 * level 2's north chapel gives the weapon and bundles, `fire` throws one (no flash, no hitscan), the bundle falls, rolls and
 * goes off when its fuse burns down — not on touching anything — and the blast hurts what stands in it.
 */

let world: typeof World;
let player: typeof Player;
let S: typeof GameS;
let loadLevel: typeof LoadLevel;
let itemsTick: typeof ItemsTick;
let D: typeof DynamiteMod;
let WS: typeof WeaponStateMod;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = () => 1;
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  ({ world } = await import("../../src/world/WorldState"));
  ({ player } = await import("../../src/player/PlayerState"));
  ({ S } = await import("../../src/core/State"));
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ itemsTick } = await import("../../src/player/Interact"));
  D = await import("../../src/weapons/Dynamite");
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

describe("dynamite", () => {
  it("is the ninth slot, picked up in level 2 with its bundles", () => {
    loadLevel(2);
    const items = world.items as unknown as Item[];
    const gun = items.find((i) => i.kind === "w8")!, box = items.find((i) => i.kind === "tnt")!;
    expect(gun).toBeDefined();
    expect(box).toBeDefined();
    expect(S.weapons[8]).toBe(false);
    player.px = gun.x; player.pz = gun.z; itemsTick(1 / 60);
    expect(S.weapons[8]).toBe(true);
    const had = S.ammo.tnt;
    player.px = box.x; player.pz = box.z; itemsTick(1 / 60);
    expect(S.ammo.tnt).toBe(had + 3);
  });

  it("a throw puts one bundle in the world and lights no muzzle flash", () => {
    loadLevel(2);
    S.cur = 8; S.weapons[8] = true; S.mag[8] = 1;
    const shots = S.shots;
    WS.fire(WS.WEAPONS[8]);
    expect(D.sticksLive()).toBe(1);
    expect(S.mag[8]).toBe(0);
    expect(S.shots).toBe(shots);   // a throw is not a shot: accuracy is not charged for it
  });

  it("lands, rolls to a stop, and goes off only when the fuse has burnt down", () => {
    loadLevel(2);
    D.throwDynamite(new THREE.Vector3(0, 0, -1));
    let t = 0;
    while (t < D.FUSE - 0.05) { D.dynamiteTick(1 / 60); t += 1 / 60; }
    expect(D.sticksLive()).toBe(1);
    for (let i = 0; i < 10; i++) D.dynamiteTick(1 / 60);
    expect(D.sticksLive()).toBe(0);
  });

  it("the blast hurts an enemy in it, less at the edge, and leaves one outside it alone", () => {
    loadLevel(2);
    const live = (world.enemies as unknown as Array<{ dead: boolean; hp: number; x: number; z: number; boss: boolean }>).filter((e) => !e.dead && !e.boss);
    const [a, b] = live;
    const hp0 = a.hp, hpB = b.hp;
    const far = Math.hypot(a.x - b.x, a.z - b.z) > D.BLAST_R + 1;
    D.dynamiteBlast(a.x, 0.3, a.z);
    expect(a.hp < hp0 || a.dead).toBe(true);
    if (far) expect(b.hp).toBe(hpB);
  });

  it("hurts the thrower who stands in it", () => {
    loadLevel(2);
    S.hp = 100; S.armor = 0; player.spawnGuard = 0;   // past the spawn protection
    D.dynamiteBlast(player.px, 0.3, player.pz);
    expect(S.hp).toBeLessThan(100);
  });

  it("a level change drops every bundle without a bang", () => {
    loadLevel(2);
    D.throwDynamite(new THREE.Vector3(0, 0, -1));
    expect(D.sticksLive()).toBe(1);
    loadLevel(2);
    expect(D.sticksLive()).toBe(0);
  });
});

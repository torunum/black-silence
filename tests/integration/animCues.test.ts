// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { animCues } from "../../src/core/AnimCues";
import { S } from "../../src/core/State";
import { player } from "../../src/player/PlayerState";
import { world } from "../../src/world/WorldState";
import { input } from "../../src/player/Input";
import { weaponRuntime } from "../../src/weapons/WeaponRuntime";
import { WEAPON_STATS } from "../../src/weapons/definitions";

/**
 * The hands' cues are bumped where the events happen — player feedback
 * round 2, Task 4 (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md).
 *
 * src/core/AnimCues.ts holds counters that gameplay and input code bump and
 * only the viewmodel reads. This boots the real game (main.ts under jsdom,
 * NEW GAME) and drives the real damagePlayer, weaponTick, itemsTick and
 * Input.ts listeners, checking that each bumps its counter exactly when it
 * should — an audible hit but not a silent one, a dry click but not an
 * empty magazine with reserve to reload from, a weapon or ammo but not
 * health — and that the game's own outcome of each call is what it always
 * was. That the writes change nothing else is also what the three trace
 * fixtures say: they take hits, fire, reload and pick up, and they did not
 * move.
 */

type Api = {
  damagePlayer: (d: number, silent?: boolean) => void;
  weaponTick: (dt: number) => void;
  itemsTick: (dt: number) => void;
};
let api: Api;
const rafQueue: FrameRequestCallback[] = [];

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => { rafQueue.push(cb); return rafQueue.length; };
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  const { damagePlayer } = await import("../../src/player/Player");
  const { weaponTick } = await import("../../src/weapons/WeaponState");
  const { itemsTick } = await import("../../src/player/Interact");
  api = { damagePlayer, weaponTick, itemsTick };
});

afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

beforeEach(() => {
  player.spawnGuard = 0;
  S.hp = 100; S.armor = 0; S.dead = false;
});

describe("damagePlayer", () => {
  it("an audible hit bumps `hurt` once and records the damage taken after armour; the hit itself is unchanged", () => {
    const before = animCues.hurt;
    S.armor = 20;
    api.damagePlayer(15);
    expect(animCues.hurt).toBe(before + 1);
    expect(animCues.hurtAmt).toBeCloseTo(6, 12);        // 15 - min(20, 15*.6)
    expect(S.armor).toBeCloseTo(11, 12);
    expect(S.hp).toBeCloseTo(94, 12);
  });
  it("a silent hit (poison ticks every frame) and a hit during spawn protection bump nothing", () => {
    const before = animCues.hurt;
    api.damagePlayer(0.1, true);
    expect(S.hp).toBeCloseTo(99.9, 12);
    player.spawnGuard = 1;
    api.damagePlayer(20);
    expect(S.hp).toBeCloseTo(99.9, 12);
    expect(animCues.hurt).toBe(before);
  });
});

describe("weaponTick's dry click", () => {
  function pull(ammo: number): void {
    const w = S.cur;
    S.mag[w] = 0;
    const kind = WEAPON_STATS[w].ammo;
    (S.ammo as Record<string, number>)[kind] = ammo;
    weaponRuntime.wstate = "idle"; weaponRuntime.wtime = 0; weaponRuntime.wCool = 0;
    input.firing = true;
    try { api.weaponTick(0.016); } finally { input.firing = false; }
  }
  it("empty and no reserve: the click bumps `dryFire`, and the game's .3 s cooldown is what it was", () => {
    const before = animCues.dryFire;
    pull(0);
    expect(animCues.dryFire).toBe(before + 1);
    expect(weaponRuntime.wCool).toBeCloseTo(0.3, 12);
    expect(weaponRuntime.wstate).toBe("idle");
  });
  it("empty with reserve: the game reloads instead, and no dry-fire cue", () => {
    const before = animCues.dryFire;
    pull(10);
    expect(weaponRuntime.wstate).toBe("reload");
    expect(animCues.dryFire).toBe(before);
    weaponRuntime.wstate = "idle";
  });
});

describe("itemsTick's pickups", () => {
  function drop(kind: string): { taken?: boolean } {
    const it: { kind: string; x: number; z: number; bob: number; sp: THREE.Sprite; taken?: boolean } = { kind, x: player.px, z: player.pz, bob: 0, sp: new THREE.Sprite() };
    (world.items as unknown[]).push(it);
    api.itemsTick(0.016);
    return it;
  }
  it("ammo and a weapon bump `pickup`, once each; the pickup itself happens as it always did", () => {
    const before = animCues.pickup, shells = S.ammo.shells;
    expect(drop("shells").taken).toBe(true);
    expect(S.ammo.shells).toBe(shells + 6);
    expect(animCues.pickup).toBe(before + 1);
    expect(drop("w2").taken).toBe(true);
    expect(S.weapons[2]).toBe(true);
    expect(animCues.pickup).toBe(before + 2);
  });
  it("health, armour and the key are not a weapon or ammo: no nod", () => {
    const before = animCues.pickup;
    S.hp = 50;
    expect(drop("health").taken).toBe(true);
    expect(drop("armor").taken).toBe(true);
    expect(animCues.pickup).toBe(before);
  });
});

describe("Input.ts", () => {
  it("every key, mouse button, mouse movement and wheel bumps `input` — what cancels an idle fidget", () => {
    const before = animCues.input;
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyQ" }));
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyQ" }));
    document.dispatchEvent(new MouseEvent("mousemove", {}));
    window.dispatchEvent(new MouseEvent("mousedown", { button: 1 }));
    window.dispatchEvent(new MouseEvent("mouseup", { button: 1 }));
    window.dispatchEvent(new WheelEvent("wheel", { deltaY: 0 }));
    expect(animCues.input).toBe(before + 4);
  });
});

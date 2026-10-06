// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { floorHeightAt } from "../../src/world/Collision";
import { LEVELS } from "../../src/world/levels/index";

/**
 * A LEVEL WITH RAISED FLOORS STANDS ITS DRESSING ON THEM (deeper-levels plan, Task 3). `loadLevel` puts a torch, a candle, an item and a prop at a height
 * measured from floor 0, as the reference's levels (all one floor) needed. Level 1, rebuilt, has three tiers (2.4, 1.2 and 0), and a torch at 1.45 on a 2.4 floor
 * burns under it. `LevelPlan.build()` sets `BuiltLevel.lift` when a level has a height map, and `Decor.ts`'s `liftDressing` lifts everything the loader placed by the
 * floor under it. Level 3 (hand-written, a height map, no `lift`) keeps them where the reference put them (`tests/world/zones.test.ts` holds that).
 */

let loadLevel: (i: number) => void;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

describe("level 1's torches, items and props stand on the floor under them", () => {
  it("asks for it: the level carries `lift`, and a hand-written level with a height map does not", () => {
    expect(LEVELS[1].build().lift).toBe(true);
    expect(LEVELS[3].build().lift).toBeUndefined();
  });

  it("lifts every torch (its light, flame and post), item and prop by its floor, on all three tiers", () => {
    loadLevel(1);
    type Lifted = { x: number; z: number; sp: THREE.Object3D; L?: THREE.Object3D };
    const torches = world.torches as unknown as Lifted[], items = world.items as unknown as Array<Lifted & { y0?: number }>;
    const props = world.props as unknown as Array<{ x: number; z: number; m: THREE.Object3D; hgt: number }>;
    const floors = new Set<number>();
    for (const t of torches) {
      const fy = floorHeightAt(t.x, t.z);
      floors.add(fy);
      expect(t.L!.position.y, `torch at ${t.x / 2 | 0},${t.z / 2 | 0}`).toBeCloseTo(1.45 + fy, 6);
      expect(t.sp.position.y).toBeCloseTo(1.35 + fy, 6);
    }
    expect([...floors].some((f) => f >= 2.4) && [...floors].some((f) => f > 0 && f < 2.4) && floors.has(0), "torches on all three tiers").toBe(true);
    for (const p of (renderState.scene.children as THREE.Object3D[]).filter((c) => c.name === "torchPost")) expect(p.position.y).toBeCloseTo(.575 + floorHeightAt(p.position.x, p.position.z), 6);
    for (const it of items) expect(it.y0, `item at ${it.x / 2 | 0},${it.z / 2 | 0}`).toBeCloseTo(.5 + floorHeightAt(it.x, it.z), 6);
    expect(items.some((it) => floorHeightAt(it.x, it.z) >= 2.4), "items on the upper tier").toBe(true);
    for (const p of props) expect(p.m.position.y).toBeGreaterThanOrEqual(floorHeightAt(p.x, p.z));
  });
});

describe("a drop on a raised floor bobs over that floor", () => {
  it("`itemsTick` puts an item with no height of its own (an enemy's drop) at .5 over the floor it lies on, not over floor 0", async () => {
    loadLevel(1);
    const { itemsTick } = await import("../../src/player/Interact");
    const { dropAmmo } = await import("../../src/enemies/Death");
    const { player } = await import("../../src/player/PlayerState");
    // a spot on the upper gaol (2.4), well away from the player so nothing is picked up
    const spot = (world.items as unknown as Array<{ x: number; z: number }>).find((it) => floorHeightAt(it.x, it.z) >= 2.4 && Math.hypot(it.x - player.px, it.z - player.pz) > 6);
    expect(spot, "an item on the upper floor").toBeDefined();
    dropAmmo(spot!.x + .3, spot!.z);
    const drop = (world.items as unknown as Array<{ y0?: number; sp: THREE.Sprite }>).at(-1)!;
    expect(drop.y0, "a drop has no height of its own").toBeUndefined();
    itemsTick(.016);
    expect(Math.abs(drop.sp.position.y - (2.4 + .5))).toBeLessThan(.08);
  });
});

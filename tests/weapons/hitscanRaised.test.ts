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

/**
 * A SHOT AT AN ENEMY ON A RAISED FLOOR LANDS WHERE IT AIMS (deeper-levels plan, Task 3). `hitscan` (`src/weapons/Hitscan.ts`) finds the candidates
 * with the sprite's centre on the floor the enemy stands on (`e.h * .5 + e.fy`), but worked the hit's place on the body (head above 74% of the height, legs
 * under 26%, an arm beyond 45% of the width) from a centre at floor 0: so on any raised floor (level 3's galleries, level 1's whole upper gaol) the hit's height was
 * past the head and every shot was a headshot, twice the damage and never a limb. This holds the hit to the enemy's own body, on a floor of 0 and of 2.4.
 */

let hitscan: (dir: THREE.Vector3, dmg: number, wIdx: number) => void;
let loadLevel: (i: number) => void;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ hitscan } = await import("../../src/weapons/Hitscan"));
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

interface Foe { key: string; x: number; z: number; h: number; w: number; fy?: number; hp: number; dormant: boolean; dead: boolean; sever?: { lArm?: boolean; rArm?: boolean } }

/** Stands the player 4 units west of the enemy at the same floor and fires the pistol at a point `up` of the enemy's height and `side` of its width from its centre. */
function shoot(e: Foe, up: number, side: number): void {
  const fy = floorHeightAt(e.x, e.z);
  e.dormant = false;
  player.px = e.x - 4; player.pz = e.z; player.pyy = EYE + fy;
  renderState.camera.position.set(player.px, player.pyy, player.pz);
  input.yaw = -Math.PI / 2;   // facing +x: forward is (-sin yaw, -cos yaw)
  const target = new THREE.Vector3(e.x, fy + e.h * (.5 + up), e.z + side * e.w * .5);   // +z is the camera's right when facing +x? (right is (cos yaw, -sin yaw) = (0, 1))
  const dir = target.sub(renderState.camera.position).normalize();
  hitscan(dir, 34, 0);
}

describe("a shot at an enemy on the floor, and at one on a raised floor, lands on the same place of its body", () => {
  for (const [what, floorWanted] of [["ground", 0], ["a raised floor (2.4)", 2.4]] as const) {
    it(`on ${what}: the chest takes 34, the head 68, an arm beyond the middle takes 34 and is torn off`, () => {
      loadLevel(1);
      // a zombie on the floor wanted (the cell block's are on 2.4; the hall's are on 0), alone: the others are out of the way
      const z = (world.enemies as unknown as Foe[]).find((e) => e.key === "z" && floorHeightAt(e.x, e.z) === floorWanted);
      expect(z, `a zombie on floor ${floorWanted}`).toBeDefined();
      for (const o of world.enemies as unknown as Foe[]) if (o !== z) o.dead = true;
      const fresh = (): void => { z!.hp = 50; z!.sever = {}; z!.dead = false; };
      fresh(); shoot(z!, 0, 0);
      expect(z!.hp, "chest").toBe(16);
      fresh(); shoot(z!, .38, 0);
      expect(z!.hp, "head: twice the damage").toBeLessThanOrEqual(-18);
      fresh(); shoot(z!, 0, .8);
      expect(z!.hp, "an arm").toBe(16);
      expect(Boolean(z!.sever?.lArm || z!.sever?.rArm), "the arm is severed").toBe(true);
    });
  }
});

// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { world } from "../../src/world/WorldState";
import { player } from "../../src/player/PlayerState";
import { S } from "../../src/core/State";
import { CELL } from "../../src/world/Grid";
import { LEVELS, type LevelDef } from "../../src/world/levels/index";
import { analyse } from "../../src/world/structure/analyse";
import { measureLevel } from "../../src/world/density";
import { floorHeightAt } from "../../src/world/Collision";
import { checkpoint } from "../../src/world/CheckpointState";
import { buildWell } from "../support/sampleLevel";
import { buildCharnel } from "../support/proofLevel";

/**
 * A LEVEL WRITTEN WITH THE TOOLKIT IS A LEVEL THE GAME LOADS (deeper-levels plan, Task 2). The two levels the toolkit built
 * (`tests/support/sampleLevel.ts`, `proofLevel.ts`) are put into the level table as levels 8 and 9, loaded by the real
 * `loadLevel`, and held to what the structure analysis said of them: the enemies, pickups, doors and secrets the loader makes
 * are the ones counted, the player stands on the spawn, the checkpoint markers stand where the plan put them, and the height
 * map is the one the grid was given. The table is put back as it was.
 */

let loadLevel: (i: number) => void;
const base = LEVELS[1];
const def = (name: string, build: LevelDef["build"]): LevelDef => ({ ...base, name, build });

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
  LEVELS.push(def("THE WELL", buildWell), def("THE CHARNEL STAIR", buildCharnel));
});

afterAll(() => { LEVELS.length = 8; });

describe.each([[8, "the well", buildWell], [9, "the charnel stair", buildCharnel]] as const)("level %i, %s", (idx, _name, build) => {
  it("loads, and the game makes what the plan placed", () => {
    const L = build(), s = analyse(L), d = measureLevel(L);
    loadLevel(idx);
    expect(world.enemies.length, "enemies").toBe(s.enemies);
    expect(world.enemies.length).toBe(d.enemies);
    expect(world.items.length, "pickups").toBe(d.pickupsTotal);
    expect(world.props.length, "props").toBe(d.propsTotal);
    expect(S.enemiesTotal).toBe(s.enemies);
    expect(world.GW).toBe(L.W);
    expect(world.GH).toBe(L.H);
  });

  it("puts the player on the spawn, the exit pad where it was written, and the exit door in a wall", async () => {
    const L = build(), s = analyse(L);
    loadLevel(idx);
    expect([Math.floor(player.px / CELL), Math.floor(player.pz / CELL)]).toEqual([s.spawn!.x, s.spawn!.z]);
    expect(world.exitPos).toEqual({ x: (s.exit.x + .5) * CELL, z: (s.exit.z + .5) * CELL });
    const { doors } = await import("../../src/world/ExitDoor");
    expect(doors.exit, "an exit door was built").not.toBeNull();
    expect(doors.exit!.site.slab, "in a wall, not a slab of its own").toBe(false);
    expect(doors.exit!.site.k).toBeLessThanOrEqual(3);
  });

  it("builds the doors the plan cut: the locked one locked, the secret one secret, and counts the secrets", () => {
    const L = build(), s = analyse(L);
    loadLevel(idx);
    const ds = Object.values(world.doors) as Array<{ locked: boolean; secret: boolean }>;
    expect(ds.filter((x) => x.locked)).toHaveLength(s.lockedDoors);
    expect(ds.filter((x) => x.secret)).toHaveLength(s.secrets);
    expect(ds).toHaveLength(s.lockedDoors + s.secrets + s.plainDoors);
    expect(S.secretsTotal).toBe(s.secrets);
  });

  it("carries the height map it was given, and the player's floor is the spawn's", () => {
    const L = build(), s = analyse(L);
    loadLevel(idx);
    expect(world.heightMap).toEqual(L.hmap);
    expect(floorHeightAt(player.px, player.pz)).toBe(L.hmap![s.spawn!.z][s.spawn!.x] || 0);
    // every checkpoint the plan placed is a marker the game lit-on-pass knows
    expect(checkpoint.marks).toHaveLength(s.checkpoints.length);
    checkpoint.marks.forEach((m, i) => expect([Math.floor(m.x / CELL), Math.floor(m.z / CELL)]).toEqual([s.checkpoints[i].x, s.checkpoints[i].z]));
  });
});

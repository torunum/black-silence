// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { CELL } from "../../src/world/Grid";
import type { world as World } from "../../src/world/WorldState";
import type { player as Player } from "../../src/player/PlayerState";
import type { loadLevel as LoadLevel } from "../../src/world/LevelLoader";
import type * as InteractMod from "../../src/player/Interact";
import type * as ScriptMod from "../../src/world/script/ScriptRun";
import type * as LevelsMod from "../../src/world/levels/index";
import type { renderState as RS } from "../../src/render/Renderer";
import { MONASTERY_SCRIPT } from "../../src/world/levels/monasteryScript";

/**
 * THE ASH BELL MONASTERY's machinery, driven through the real game (owner, 2026-10-20): the gate that wants both seals, the service
 * door barred from the courtyard, the niches the bell opens, the lift chained until then, and the level's place after the prologue.
 */

let world: typeof World, player: typeof Player, loadLevel: typeof LoadLevel, I: typeof InteractMod, SR: typeof ScriptMod, L: typeof LevelsMod, renderState: typeof RS;
const IDX = 9;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = () => 1;
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  ({ world } = await import("../../src/world/WorldState"));
  ({ player } = await import("../../src/player/PlayerState"));
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ renderState } = await import("../../src/render/Renderer"));
  I = await import("../../src/player/Interact");
  SR = await import("../../src/world/script/ScriptRun");
  L = await import("../../src/world/levels/index");
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  (newGame as HTMLElement).click();
});
afterAll(() => { clearAllTimers(); clearScheduled(); });

/** Stands the player in cell (x, z), looking toward cell (tx, tz). */
function standAt(x: number, z: number, tx: number, tz: number): void {
  player.px = (x + 0.5) * CELL; player.pz = (z + 0.5) * CELL;
  const yaw = Math.atan2(-(tx - x), -(tz - z));
  renderState.camera.position.set(player.px, 2.8, player.pz);
  renderState.camera.rotation.order = "YXZ"; renderState.camera.rotation.set(0, yaw, 0);
  renderState.camera.updateMatrixWorld(true);
}
const door = (x: number, z: number) => world.doors[x + "," + z] as unknown as { open: boolean };

describe("the Ash Bell Monastery", () => {
  it("is played straight after the prologue, as LEVEL 1", () => {
    expect(L.nextLevel(0)).toBe(IDX);
    expect(L.nextLevel(IDX)).toBe(1);
    expect(L.titleOf(IDX)).toBe("LEVEL 1 — THE ASH BELL MONASTERY");
    expect(L.titleOf(1)).toBe("LEVEL 2 — THE GOTHIC DUNGEON");
    expect(L.PLAY_ORDER.length).toBe(L.LEVELS.length);
    expect(new Set(L.PLAY_ORDER).size).toBe(L.LEVELS.length);
  });

  it("the gate under the courtyard wants both seals, and opens with them", () => {
    loadLevel(IDX);
    const [gx, gz] = MONASTERY_SCRIPT.gates![0].at;
    standAt(gx, gz + 1, gx, gz); I.interact();
    expect(door(gx, gz).open).toBe(false);
    SR.takeSeal("seal_ash");
    I.interact();
    expect(door(gx, gz).open).toBe(false);
    SR.takeSeal("seal_bell");
    I.interact();
    expect(door(gx, gz).open).toBe(true);
  });

  it("the service door is barred from the courtyard and opens from the crematorium", () => {
    loadLevel(IDX);
    const [x, z] = MONASTERY_SCRIPT.oneWay![0].at;
    standAt(x + 1, z, x, z); I.interact();
    expect(door(x, z).open).toBe(false);
    standAt(x - 1, z, x, z); I.interact();
    expect(door(x, z).open).toBe(true);
  });

  it("the niches will not move before the bell; the lever rings it, opens them all and frees the lift", () => {
    loadLevel(IDX);
    const niches = MONASTERY_SCRIPT.niches!;
    const [nx, nz] = niches[0];
    standAt(nx, nz - 1, nx, nz); I.interact();
    expect(door(nx, nz).open).toBe(false);
    // the lift is chained: from its foot, nothing moves
    const foot = MONASTERY_SCRIPT.lift!.foot[0];
    standAt(foot[0], foot[1], foot[0], foot[1] - 1); I.interact();
    expect(SR.script.lift.moving).toBe(false);
    expect(SR.script.lift.h).toBe(MONASTERY_SCRIPT.lift!.high);
    // the lever, in the bell chamber
    const [lx, lz] = MONASTERY_SCRIPT.lever!;
    standAt(lx, lz, lx + 1, lz); I.interact();
    expect(SR.script.bell).toBe(true);
    for (const [x, z] of niches) expect(door(x, z).open).toBe(true);
    // now the lift answers its foot, and rides down
    standAt(foot[0], foot[1], foot[0], foot[1] - 1); I.interact();
    expect(SR.script.lift.moving).toBe(true);
    for (let i = 0; i < 400 && SR.script.lift.moving; i++) SR.scriptTick(1 / 60);
    expect(SR.script.lift.h).toBe(MONASTERY_SCRIPT.lift!.low);
    const [cx, cz] = MONASTERY_SCRIPT.lift!.cells[0];
    expect(world.heightMap![cz][cx]).toBe(MONASTERY_SCRIPT.lift!.low);
  });

  it("the seals lie in the level, one in each wing", () => {
    loadLevel(IDX);
    const kinds = (world.items as unknown as Array<{ kind: string }>).map((i) => i.kind);
    expect(kinds).toContain("seal_ash");
    expect(kinds).toContain("seal_bell");
  });
});

// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { currentRoom } from "../../src/audio/AudioEngine";
import { roomFor } from "../../src/audio/Room";
import { LEVELS } from "../../src/world/levels/index";

/**
 * A LEVEL LOAD PUTS THE GAME IN THAT LEVEL'S ROOM — player feedback round 2,
 * Task 2. `src/world/LevelLoader.ts`'s `loadLevel` calls
 * `setRoom(roomFor(Ldef))`; this drives the real game (NEW GAME, then
 * `loadLevel`) and reads back the room the live audio graph has built —
 * built, not merely asked for: once audio is running, a level load builds
 * the impulse response then and there, so the first shot of a level does
 * not pay for it. Same boot shape as `musicCancellationWiring.test.ts`.
 */

let loadLevel: (idx: number) => void;

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

afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

describe("loadLevel selects the level's room", () => {
  it("NEW GAME starts the prologue in hell", () => {
    expect(currentRoom()).toEqual({ wanted: "hell", built: "hell" });
  });

  it.each([1, 7, 5, 0])("level %i", (idx) => {
    loadLevel(idx);
    const want = roomFor(LEVELS[idx]);
    expect(currentRoom()).toEqual({ wanted: want, built: want });
  });
});

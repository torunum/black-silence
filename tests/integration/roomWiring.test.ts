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
  // The rebuilt prologue starts in its churchyard, under the sky: the
  // open-air room. It is zoned (src/world/Zones.ts) — its hell is the hell
  // room, and tests/world/zones.test.ts walks the player down there and
  // hears the room change.
  it("NEW GAME starts the prologue in its churchyard, in the open air", () => {
    expect(currentRoom()).toEqual({ wanted: "graveyard", built: "graveyard" });
  });

  it.each([1, 7, 5, 0])("level %i", (idx) => {
    loadLevel(idx);
    const want = idx === 0 ? "graveyard" : roomFor(LEVELS[idx]);
    expect(currentRoom()).toEqual({ wanted: want, built: want });
  });
});

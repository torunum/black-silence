// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { stopMusic, musicTick, musicLayer } from "../../src/audio/Music";
import type { Enemy } from "../../src/enemies/Enemy";

/**
 * Plan 1 Task 5's version of `timerCancellationWiring.test.ts`: the
 * integration property `tests/audio/music.test.ts` cannot see on its own —
 * that the real `loadLevel` (`src/world/LevelLoader.ts`) actually calls the
 * real `stopMusic()` (`src/audio/Music.ts`), which in turn cancels
 * `Ambient.ts`'s `bossPulse`. This is the gap the task-5 brief calls out
 * directly: `loadLevel` already called `clearAllTimers()`/`clearScheduled()`
 * before this task, but `clearAllTimers()` only tracks `setTimeout`
 * (`Timers.ts`'s `after()`) — `bossPulse` is the codebase's only
 * `setInterval`, and nothing cancelled it at level load. It survived only
 * because the four pre-existing `stopBossMusic()` call sites happened to
 * cover every *normal* path (death, the exit pad, the win screen, a boss
 * dying); a level load that is none of those — jumping levels mid-fight —
 * did not.
 *
 * `bossPulse` is a bare `setInterval`, never routed through `Timers.ts`'s
 * `after()`, so `installFakeClock()` (which only patches
 * `setTimeout`/`clearTimeout` — see its own doc comment) cannot observe it.
 * This file spies on the real `setInterval`/`clearInterval` instead;
 * `Ambient.ts`'s own doc comment states bossPulse is the only `setInterval`
 * in the codebase, so nothing else running during the test can produce a
 * false positive on either spy.
 *
 * The second `describe` block below proves the other real `stopMusic()`
 * call site this task added — `Player.ts`'s `damagePlayer`, on death —
 * the same way: drive the real, exported `damagePlayer` down the `S.hp<=0`
 * branch and check the real pulse actually stops. `LevelEnd.ts`'s
 * `showWin` is the third call site, added in the identical one-line shape
 * beside its own pre-existing `stopBossMusic()` call; it is not repeated
 * here since it is not distinguishable in kind from the death call site
 * this file already proves, and `tests/audio/music.test.ts`'s own
 * `stopMusic()` unit tests already cover what `stopMusic()` itself does.
 *
 * Same boot technique as `timerCancellationWiring.test.ts` and
 * `contextWiring.test.ts`, for the same reason their own doc comments give:
 * `src/main.ts` boots a level and registers listeners at import time, so it
 * can only run once per test file, and this file needs a second, direct
 * `loadLevel(...)` call the same shape `LevelEnd.ts`'s `endLevel` makes via
 * `loadLevel(S.level+1)` — a purpose-built boot avoids fighting
 * `wiring.test.ts`'s mocks for no benefit.
 */

let loadLevel: (idx: number) => void;
let startBossMusic: () => void;
let damagePlayer: (d: number, silent?: boolean) => void;
let S: { dead: boolean; won: boolean; hp: number; armor: number };
let player: { spawnGuard: number };
let world: { enemies: Array<Pick<Enemy, "boss" | "dead" | "dormant">> };

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  // jsdom implements neither, and startGame calls the first on the canvas.
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};

  // Dynamic, not top-of-file: src/world/LevelLoader.ts (and, transitively,
  // src/player/Player.ts, which the death describe block below needs)
  // import src/render/RenderCore.ts, which captures the WebGL canvas at its
  // own module scope the moment it is first evaluated — the same ordering
  // constraint timerCancellationWiring.test.ts's header explains. A static
  // top-of-file import would evaluate that before installDomStubs()/
  // loadGameHtml() above ever run.
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ startBossMusic } = await import("../../src/audio/Ambient"));
  ({ damagePlayer } = await import("../../src/player/Player"));
  ({ S } = await import("../../src/core/State"));
  ({ player } = await import("../../src/player/PlayerState"));
  ({ world } = await import("../../src/world/WorldState"));

  await import("../../src/main");

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  // NEW GAME's own startGame() already called audioInit(), so ctx() is
  // ready and startBossMusic() below will actually create an interval
  // rather than silently no-op'ing.
});

describe("loadLevel cancels a live boss-music pulse from the level it replaces", () => {
  /**
   * Defeated by dropping `stopMusic()` from `loadLevel` (this task's own
   * gap-closing change) — with that line gone, `clearIntervalSpy` is never
   * called and this assertion goes red. Also defeated by `stopMusic()`
   * existing but not calling through to `stopBossMusic()` (a "second
   * bespoke cleanup path" the brief explicitly warns against instead of
   * reusing the existing one).
   */
  it("clears the real setInterval bossPulse holds", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    try {
      startBossMusic();
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      const id = setIntervalSpy.mock.results[0]!.value;

      loadLevel(1); // the same call src/ui/LevelEnd.ts's endLevel makes to advance a level

      expect(clearIntervalSpy).toHaveBeenCalledWith(id);
    } finally {
      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
      stopMusic(); // belt-and-braces: nothing left ticking into whichever test runs next
    }
  });

  it("a level load with no pulse running is a harmless no-op — the control for the test above", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    try {
      expect(() => loadLevel(1)).not.toThrow();
    } finally {
      clearIntervalSpy.mockRestore();
      stopMusic();
    }
  });
});

describe("damagePlayer's death branch (Player.ts:89) stops the music", () => {
  /**
   * `Player.ts` already called `stopBossMusic()` directly before this task
   * (one of the four pre-existing call sites) — so a naive "did
   * clearInterval fire" assertion here would be satisfiable by that
   * pre-existing call alone, the exact "assertion satisfiable in a state
   * the game reaches anyway" trap the brief warns about. This test instead
   * drives `Music.ts`'s own state machine into "boss" first (via a real
   * `musicTick`, not a direct `startBossMusic()` call) and checks
   * `musicLayer()` flips back to "exploration" — a reset only `stopMusic()`
   * performs; `stopBossMusic()` alone never touches it. Defeated by
   * dropping the `stopMusic()` this task added beside `damagePlayer`'s
   * existing `stopBossMusic()` call — with that line gone, `musicLayer()`
   * stays "boss" and this assertion goes red (confirmed: see this task's
   * report).
   */
  it("resets Music.ts's own state, not just Ambient.ts's pulse", () => {
    try {
      world.enemies = [{ boss: true, dead: false, dormant: false }];
      musicTick(0.1, false);
      expect(musicLayer()).toBe("boss");

      S.dead = false; S.won = false; S.armor = 0; S.hp = 1; player.spawnGuard = 0;
      damagePlayer(1000, true); // silent=true skips the flashDmg/shake/screenBlood/bang/blip side effects; unrelated to the music assertion below

      expect(S.dead).toBe(true); // sanity: this test actually reached the S.hp<=0 branch
      expect(musicLayer()).toBe("exploration");
    } finally {
      stopMusic();
      world.enemies = [];
      S.dead = false; S.won = false; S.hp = 100; player.spawnGuard = 2;
    }
  });

  it("also clears the real setInterval bossPulse holds — the weaker, but still real, half of the same call", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    try {
      startBossMusic();
      S.dead = false; S.won = false; S.armor = 0; S.hp = 1; player.spawnGuard = 0;

      damagePlayer(1000, true);

      expect(clearIntervalSpy).toHaveBeenCalled();
    } finally {
      clearIntervalSpy.mockRestore();
      stopMusic();
      world.enemies = [];
      S.dead = false; S.won = false; S.hp = 100; player.spawnGuard = 2;
    }
  });
});

// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml, installFakeClock } from "../support/domStubs";
import { after } from "../../src/core/Timers";
import { schedule, tickScheduled } from "../../src/core/Time";

/**
 * Plan 0F Task 6 — the integration property `tests/core/timers.test.ts`
 * cannot see on its own: that `src/world/LevelLoader.ts`'s real `loadLevel`
 * actually calls `src/core/Timers.ts`'s `clearAllTimers()` (and
 * `src/core/Time.ts`'s `clearScheduled()`) on every level load, not just
 * that the two clear functions work in isolation. Task 5 shipped its own
 * `schedule`/`tickScheduled` mechanism with exactly this kind of gap —
 * proven correct standalone, never proven wired into the real call site —
 * and needed a follow-up commit (`tests/integration/schedulerWiring.test.ts`,
 * Task 5b) to close it. This file is that test for Task 6, written before
 * the gap has a chance to open.
 *
 * ## Why a sibling file, not an extension of an existing one
 *
 * Same reasoning `schedulerWiring.test.ts` and `contextWiring.test.ts` give:
 * `src/main.ts` boots a level and registers listeners at import time, so it
 * "can therefore run once per test file" (`gameplayTrace.ts`'s own header).
 * This file's own boot is real DOM, no mocked `Input`/`Overlay2D`/
 * `viewmodel/draw`, no `requestAnimationFrame` queue to drive — it never
 * needs a frame to run, only a second, direct `loadLevel(...)` call, the
 * same call `src/ui/LevelEnd.ts`'s `endLevel` makes via `loadLevel(S.level+1)`.
 * Reusing `wiring.test.ts`'s boot would mean fighting its mocks for no
 * benefit; a purpose-built one avoids that.
 *
 * ## The technique
 *
 * `installFakeClock()` (`tests/support/domStubs.ts`) replaces
 * `globalThis.setTimeout`/`clearTimeout` for the duration of each test.
 * `after` and `clearAllTimers` are imported directly from the real,
 * unmocked `src/core/Timers.ts` — nothing here calls `setTimeout` itself —
 * so a timer registered through `after` is driven entirely by whatever
 * `loadLevel` actually does with it, which is the whole point of testing
 * this wiring rather than `Timers.ts` alone.
 */

let loadLevel: (idx: number) => void;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  // jsdom implements neither, and startGame calls the first on the canvas.
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};

  // Dynamic, not top-of-file: src/world/LevelLoader.ts transitively imports
  // src/render/RenderCore.ts, which captures the WebGL canvas at its own
  // module scope the moment it is first evaluated — the same ordering
  // constraint contextWiring.test.ts's header explains for Overlay2D.ts's
  // fx2d context. A static top-of-file import would evaluate that before
  // installDomStubs()/loadGameHtml() above ever run.
  ({ loadLevel } = await import("../../src/world/LevelLoader"));

  await import("../../src/main");

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  // NEW GAME's loadLevel(0) call is what this file's own loadLevel(1) below
  // is a second instance of — establishing that the game is already
  // mid-level (not merely booted) before either test's own load.
});

describe("loadLevel cancels a pending Timers.after callback from the level it replaces", () => {
  /**
   * Defeated only by `loadLevel` never calling the real, module-scope
   * `clearAllTimers` (or calling something that isn't wired to the same
   * `live` set `after` registers into) — nothing else in this file ever
   * calls `setTimeout`/`clearTimeout`, so `fired` can only move off 0 if
   * the timer registered below is still alive when the fake clock is
   * advanced past its delay. Proven real: deleting the `clearAllTimers();`
   * line from `loadLevel` (`src/world/LevelLoader.ts`) turns this red —
   * `fired` becomes 1 instead of 0. See this task's report for the
   * confirmation run.
   */
  it("never fires once a level load has happened in between", () => {
    const clock = installFakeClock();
    try {
      let fired = 0;
      after(() => fired++, 100);

      loadLevel(1); // the same call src/ui/LevelEnd.ts's endLevel makes to advance a level

      clock.advance(10_000); // far past the 100ms delay — if it survived, this fires it
      expect(fired).toBe(0);
    } finally {
      clock.restore();
    }
  });

  it("still fires normally when no level load happens in between — the control for the test above", () => {
    const clock = installFakeClock();
    try {
      let fired = 0;
      after(() => fired++, 100);

      clock.advance(10_000);
      expect(fired).toBe(1);
    } finally {
      clock.restore();
    }
  });
});

describe("loadLevel also drops a pending Time.schedule callback (clearScheduled) — the other half of Step 3", () => {
  /**
   * `src/core/Timers.ts`'s wall-clock timers are only one of the two things
   * `loadLevel` must clear: `Time.schedule`'s scaled-time callbacks (Task
   * 5's four gameplay effects — a brute's slam, a boss's second barrel) are
   * driven by `tickScheduled`, not a clock at all, so this test proves the
   * property directly rather than through `installFakeClock`. Defeated by
   * `loadLevel` never calling the real `clearScheduled` — the callback
   * would still be pending afterward and `tickScheduled(1)` would fire it.
   */
  it("never fires a Time.schedule callback registered before a level load", () => {
    let fired = 0;
    schedule(() => fired++, 0.05);

    loadLevel(1);

    tickScheduled(1); // one giant scaled-time step — enough to fire anything still pending
    expect(fired).toBe(0);
  });
});

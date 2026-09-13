// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { schedule, clearScheduled } from "../../src/core/Time";
import { clearAllTimers } from "../../src/core/Timers";
import { screenShake } from "../../src/fx/ShakeState";
import { game } from "../../src/core/Game";
import { S } from "../../src/core/State";

/**
 * Plan 0F Task 5b — closing the integration gap Task 5's own report left
 * open. `src/core/Time.ts`'s `schedule`/`tickScheduled`/`clearScheduled`
 * (`tests/core/time.test.ts`) are proven correct as a standalone mechanism,
 * and `src/core/Loop.ts` is proven correct by reading, but nothing had ever
 * exercised the two wired together: that `Loop.ts`'s real `loop()` function
 * actually calls `tickScheduled` every frame, with the hit-stop-*scaled*
 * `dt` rather than the raw one, and only while the game is unpaused, alive,
 * and unwon. `tests/integration/combatTrace.test.ts` — the fixture the rest
 * of this plan leans on — was checked empirically (a temporary call-counter
 * instrumentation, per Task 5's own report) and calls `schedule()` **zero**
 * times during its whole run, so it provides no evidence about this change
 * either.
 *
 * ## Why a sibling file, not an extension of `wiring.test.ts`
 *
 * Same reasoning as `tests/integration/contextWiring.test.ts`'s header:
 * `src/main.ts` is a module singleton with side effects at import (it boots
 * a level, starts the render loop, registers listeners), so it "can
 * therefore run once per test file" — a second, purpose-built boot in its
 * own file is the established way to add an unrelated seam without either
 * fighting `wiring.test.ts`'s `Input`/`Overlay2D`/`viewmodel/draw` mocks
 * (irrelevant here — this file never looks at a draw call) or perturbing
 * its own sequential, real-clock-dependent `hitStop`/`spawnGuard` assertions
 * by interleaving many more frames into the same booted instance.
 *
 * ## The technique
 *
 * `Loop.ts`'s `loop` function is not exported — the only way to run it is
 * through the (mocked) `requestAnimationFrame` queue, exactly as
 * `wiring.test.ts` does. Frame timestamps are fed 5000ms apart once a
 * baseline is established (`primeClock`), which forces `loop`'s own
 * `Math.min(.05,(t-game.last)/1000)` dt cap to trigger deterministically —
 * the same trick `wiring.test.ts`'s `spawnGuard` test uses, and for the
 * same reason: it decouples the test from however much real wall-clock time
 * the test runner itself burns between calls, so every measured frame has
 * *exactly* `dt===.05` (mod hit-stop scaling) with no float noise. That
 * determinism is what makes exact frame-counting (test 2) and an exact
 * one-frame fire (test 3, `DELAY===0.05`) safe rather than flaky.
 *
 * `schedule`/`clearScheduled` are imported directly, unmocked, from the real
 * `src/core/Time.ts` — this file schedules through the same door the four
 * migrated gameplay call sites use, and never calls `tickScheduled` itself;
 * only `Loop.ts`'s real, running `loop()` may do that, which is the whole
 * point of an integration test here.
 */

const rafQueue: FrameRequestCallback[] = [];
const FRAME_JUMP_MS = 5000; // >> 50ms, so (t-last)/1000 always exceeds loop's own .05 cap
const CAPPED_DT = 0.05;

/** Runs the main loop once — the same mechanism tests/integration/wiring.test.ts uses. */
function runFrame(t: number): void {
  rafQueue[rafQueue.length - 1](t);
}

/**
 * Establishes a fresh `game.last` baseline and returns the timestamp used.
 * Call this *before* scheduling anything: this priming frame's own dt is
 * whatever real wall-clock time elapsed since the last recorded frame (or
 * since `Game.ts`'s module import, on the very first call) — indeterminate,
 * but harmless as long as nothing is pending yet for it to burn down.
 */
function primeClock(): number {
  const t0 = performance.now();
  runFrame(t0);
  return t0;
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  // jsdom implements neither, and startGame calls the first on the canvas.
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};

  await import("../../src/main");

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
});

/**
 * This file boots the real game on the **real** clock — unlike the trace
 * harness, it installs no fake `setTimeout` — and `startGame`'s `loadLevel`
 * arms real timers through `src/core/Timers.ts`'s `after()`, the longest of
 * them the 1400ms `after(()=>say("lvl"+idx,true),1400)` at the end of
 * `loadLevel`. Those outlive this file's tests, which finish in about 1.5s,
 * and whether they fire before or after Vitest tears the jsdom environment
 * down is a race against how long the rest of the suite keeps the worker
 * alive. Losing that race throws `missing element #lvltitle` out of `say`
 * with no test attached to it, which Vitest reports as an unhandled error.
 *
 * Found when Phase 3 Part D added `bossTrace.test.ts`: a 75-second test file
 * kept the pool alive long enough for this file's stray timer to land, and a
 * suite that had been green for five plans reported an error that had nothing
 * to do with the new file. Clearing them here makes it deterministic rather
 * than lucky.
 *
 * **Update, Phase 3 Part D's fix round:** the sibling list below was
 * originally hand-counted as four and was wrong in both directions — see
 * KNOWN-19, which now also gives the derivation rather than a fixed count.
 * `wiring.test.ts`, `gpuDisposeWiring.test.ts`, `positionalCallers.test.ts`,
 * `contextWiring.test.ts`, `musicCancellationWiring.test.ts` and
 * `timerCancellationWiring.test.ts` carried the same latent race and now
 * carry this same `afterAll` fix. `renderWidthBootWiring.test.ts` was on the
 * original list but never actually had the bug: it only imports
 * `src/main.ts` and never clicks a menu row or calls `loadLevel`, so
 * `startGame` — and every `after()` call it would otherwise arm — never
 * runs there.
 */
afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

beforeEach(() => {
  // Each test's own arrange step sets what it needs; this only resets the
  // shared observables so one test's side effects can't leak into the next.
  clearScheduled();
  screenShake.hitStop = 0;
  game.pianoOpen = false;
  S.dead = false;
  S.won = false;
});

describe("property 1 — Loop.ts drives Time.ts's scheduler at all", () => {
  /**
   * Defeated only by `Loop.ts` never calling `tickScheduled` (or calling it
   * on something other than the real, module-scope `pending` list
   * `schedule` pushes onto) — nothing else can move `fired` from 0 to 1
   * partway through a run of otherwise-identical frames, since this file
   * never calls `tickScheduled` itself and `schedule`'s only consumer is
   * that one call site.
   */
  it("fires a callback scheduled with a short delay after enough real frames run", () => {
    const t0 = primeClock();
    let fired = 0;
    schedule(() => { fired++; }, 0.12);

    // 0.12 / 0.05 needs 3 frames (0.12 -> 0.07 -> 0.02 -> <=0); verified in
    // isolation (node -e) rather than assumed, since float subtraction is
    // exactly what test 2 below has to be careful about too.
    runFrame(t0 + FRAME_JUMP_MS);
    expect(fired).toBe(0);
    runFrame(t0 + FRAME_JUMP_MS * 2);
    expect(fired).toBe(0);
    runFrame(t0 + FRAME_JUMP_MS * 3);
    expect(fired).toBe(1);
  });
});

describe("property 2 — Loop.ts passes tickScheduled the hit-stop-scaled dt, not the raw one", () => {
  /**
   * Defeated by a mutation that hands `tickScheduled` the pre-hit-stop dt
   * (a "raw delta" instead of the scaled one) — hit-stop's `*=.08` would
   * then never reach the scheduler, `hitStopFrames` would collapse to the
   * same value as `baselineFrames`, and the >=5x assertion below fails. It
   * is NOT satisfiable by a one-frame rounding accident: the true ratio is
   * 1/0.08=12.5x (measured directly: exactly 30 frames vs 3, a 10x gap —
   * see this task's report), and the assertion only demands 5x.
   */
  it("takes far more frames to fire while hit-stop is active than without it", () => {
    const DELAY = 0.12;
    const MAX_FRAMES = 200; // generous; the real numbers are 3 and 30

    const t0 = primeClock();
    let firedBaseline = 0;
    schedule(() => { firedBaseline++; }, DELAY);
    let baselineFrames = 0;
    let t = t0;
    while (firedBaseline === 0) {
      baselineFrames++;
      if (baselineFrames > MAX_FRAMES) throw new Error("baseline callback never fired within MAX_FRAMES");
      t += FRAME_JUMP_MS;
      runFrame(t);
    }

    clearScheduled();
    const t1 = primeClock();
    // Set far above what the ~30 frames measured below could burn down:
    // screenShake.hitStop itself decrements by the *unscaled* dt each frame
    // (Loop.ts: `screenShake.hitStop-=dt;dt*=.08`), so it must stay
    // positive for the whole measurement or the scaling would lapse
    // mid-count and understate the gap.
    screenShake.hitStop = 100;
    let firedHitStop = 0;
    schedule(() => { firedHitStop++; }, DELAY);
    let hitStopFrames = 0;
    let t2 = t1;
    while (firedHitStop === 0) {
      hitStopFrames++;
      if (hitStopFrames > MAX_FRAMES) throw new Error("hit-stop callback never fired within MAX_FRAMES");
      t2 += FRAME_JUMP_MS;
      runFrame(t2);
    }

    expect(baselineFrames).toBeGreaterThan(0);
    expect(hitStopFrames).toBeGreaterThanOrEqual(baselineFrames * 5);
  });
});

describe("property 3 — tickScheduled sits inside Loop.ts's !paused&&!S.dead&&!S.won guard", () => {
  // Exactly one capped frame's worth of scaled time (see CAPPED_DT) — small
  // on purpose, so "fires the moment the guard clears" (below) needs only
  // one more frame rather than a second multi-frame countdown.
  const DELAY = CAPPED_DT;
  // 40x DELAY worth of frames: comfortably enough that a schedule which
  // silently kept ticking during the guarded state would have fired many
  // times over, not squeaked by.
  const PAUSED_FRAMES = 40;

  /**
   * Defeated by moving `tickScheduled(dt)` outside the
   * `!paused&&!S.dead&&!S.won` block — then `fired` would reach 1 during
   * the very first paused frame (DELAY===CAPPED_DT, one frame is enough
   * unguarded), failing the `expect(fired).toBe(0)` line before the guard
   * is ever cleared. The trailing "fires once cleared" check guards the
   * opposite failure mode: a guard that is simply too broad (e.g. one that
   * never lets tickScheduled run at all) would also make `fired` stay 0
   * during the paused loop, but would then fail this second assertion
   * instead of passing vacuously.
   */
  function expectGuardBlocksFiring(setGuard: () => void, clearGuard: () => void): void {
    const t0 = primeClock();
    let fired = 0;
    schedule(() => { fired++; }, DELAY);
    setGuard();

    let t = t0;
    for (let i = 0; i < PAUSED_FRAMES; i++) {
      t += FRAME_JUMP_MS;
      runFrame(t);
    }
    expect(fired).toBe(0);

    clearGuard();
    t += FRAME_JUMP_MS;
    runFrame(t);
    expect(fired).toBe(1);
  }

  it("does not fire while game.pianoOpen is set, however many frames run — and fires the moment it's cleared", () => {
    expectGuardBlocksFiring(() => { game.pianoOpen = true; }, () => { game.pianoOpen = false; });
  });

  it("does not fire while S.dead is set, however many frames run — and fires the moment it's cleared", () => {
    expectGuardBlocksFiring(() => { S.dead = true; }, () => { S.dead = false; });
  });

  it("does not fire while S.won is set, however many frames run — and fires the moment it's cleared", () => {
    expectGuardBlocksFiring(() => { S.won = true; }, () => { S.won = false; });
  });
});

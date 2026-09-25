// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { S } from "../../src/core/State";
import { weaponRuntime } from "../../src/weapons/WeaponRuntime";
import { extension, kickElapsed, leanAmount } from "../../src/render/viewmodel/kick";

/**
 * The kick's strike lands on its hit — through the real game.
 *
 * Player feedback round 2, Task 3 (docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md)
 * redrew the kick with a wind-up, a strike and a recovery, and put the
 * strike's full extension on the moment the game resolves the kick's hit.
 * tests/behavior/viewmodelKick.test.ts proves that on a model of Loop.ts's
 * arithmetic; this proves it on the real thing: main.ts booted under jsdom,
 * NEW GAME clicked, the real doKick hook, the real Loop.ts frames, the real
 * scheduler. Two recorders only: src/core/Time.ts's schedule() wraps each
 * callback so the frame it actually runs on is known, and draw.ts's
 * drawViewmodel records the kickAnim each frame hands the viewmodel. Nothing
 * about the kick itself is replaced.
 *
 * At each frame rate: the frame on which the hit test runs must be the first
 * whose drawn leg is at full extension (and the view's lean at its peak), and
 * the hit must land exactly once.
 */

const rec = vi.hoisted(() => ({
  hooks: null as Record<string, (...a: never[]) => unknown> | null,
  frame: 0,
  /** Frames on which a schedule()d callback armed inside doKick ran. */
  kickHits: [] as number[],
  arming: false,
  /** kickAnim handed to drawViewmodel, per frame. */
  drawn: new Map<number, number>(),
}));

vi.mock("../../src/player/Input", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/player/Input")>();
  return {
    ...actual,
    setInputHooks: (h: Parameters<typeof actual.setInputHooks>[0]) => { rec.hooks = h as never; actual.setInputHooks(h); },
  };
});
vi.mock("../../src/core/Time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/core/Time")>();
  return {
    ...actual,
    schedule: (fn: () => void, delay: number) => {
      const mine = rec.arming;
      actual.schedule(() => { if (mine) rec.kickHits.push(rec.frame); fn(); }, delay);
    },
  };
});
vi.mock("../../src/render/viewmodel/draw", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/render/viewmodel/draw")>();
  return {
    ...actual,
    drawViewmodel: (...args: Parameters<typeof actual.drawViewmodel>) => {
      rec.drawn.set(rec.frame, args[2].kickAnim);
      actual.drawViewmodel(...args);
    },
  };
});

const rafQueue: FrameRequestCallback[] = [];
let clock = 0;

function frame(dtMs: number): void {
  clock += dtMs;
  rec.frame++;
  const due = rafQueue.splice(0, rafQueue.length);
  for (const cb of due) cb(clock);
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => { rafQueue.push(cb); return rafQueue.length; };
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  clock = performance.now();
  for (let i = 0; i < 3; i++) frame(16.7);
});

afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

const RATES: Array<[string, number]> = [["144 fps", 1000 / 144], ["60 fps", 1000 / 60], ["30 fps", 1000 / 30], ["20 fps", 50], ["17 ms", 17]];

describe("the drawn kick peaks on the frame the real doKick's hit lands", () => {
  for (const [label, dtMs] of RATES) {
    it(`${label}`, () => {
      S.kickCd = 0;   // the cooldown is not under test; each rate kicks afresh
      frame(dtMs);
      rec.kickHits.length = 0;
      rec.arming = true;
      rec.hooks!.doKick();
      rec.arming = false;
      expect(weaponRuntime.kickAnim).toBe(0.32);
      const first = rec.frame + 1;
      for (let i = 0; i < 60 && (weaponRuntime.kickAnim > 0 || rec.frame < first + 2); i++) frame(dtMs);

      expect(rec.kickHits.length, "the hit lands exactly once").toBe(1);
      const hit = rec.kickHits[0];
      const drawnAt = (f: number) => extension(kickElapsed(rec.drawn.get(f)!));
      expect(drawnAt(hit), "full extension on the hit frame").toBe(1);
      expect(leanAmount(kickElapsed(rec.drawn.get(hit)!))).toBe(1);
      for (let f = first; f < hit; f++) expect(drawnAt(f), `frame ${f - first} before the hit`).toBeLessThan(1);
      expect(hit).toBeGreaterThan(first);   // there is a wind-up: the hit is never on the kick's first frame
    });
  }
});

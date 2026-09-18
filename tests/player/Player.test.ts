// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import type * as PlayerModule from "../../src/player/Player";

/**
 * Pins `player.bobT`'s per-frame rate constants (`WALK_BOB_RATE`,
 * `SPRINT_BOB_RATE` — see Player.ts's own doc comment on them), which drive
 * both the footstep zero-crossing trigger and, via the same shared `bobT`,
 * the weapon viewmodel's bob phase (`src/render/viewmodel/draw.ts`, covered
 * separately by `tests/behavior/viewmodel.test.ts`'s bob-*amplitude* pin —
 * that file's reference-parity comparisons don't exercise this *rate* at
 * all, since every scenario there passes a fixed `bobT` rather than
 * accumulating it).
 *
 * Before player feedback round 1 task 3 (2026-09-17) changed sprint's rate
 * from `1.9` to match walk's `1.6`, no test in this repo named `bobT`'s
 * rate, `SPRINT_BOB_RATE`, or `WALK_BOB_RATE` — confirmed by a repo-wide
 * search across `tests/` before this file was added, not assumed. This
 * exists so the next tuning pass has something to update instead of
 * grepping Player.ts by hand, per this plan's brief: a test that pins a
 * tunable value must be rewritten when the value changes, which requires
 * one to exist first.
 *
 * `Player` is imported dynamically, after `installDomStubs()`/
 * `loadGameHtml()`, the same ordering (and for the same reason)
 * `tests/integration/contextWiring.test.ts`'s own `beforeAll` uses for this
 * exact module: `Player.ts` transitively imports `src/render/Overlay2D.ts`
 * (captures the real `#fx2d` 2D context at its own module top level the
 * first time it's evaluated) and `src/render/Renderer.ts` (builds the real
 * `THREE.WebGLRenderer`, which needs `installDomStubs()`'s `getContext`
 * stub — jsdom implements neither WebGL nor 2D canvas contexts on its own).
 * A static top-of-file import, or `loadGameHtml()` without
 * `installDomStubs()` first, throws before either element is ready.
 */
let Player: typeof PlayerModule;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  Player = await import("../../src/player/Player");
});

describe("player.bobT rate (footstep cadence, and — via the shared bobT — the weapon-viewmodel bob phase)", () => {
  it("pins WALK_BOB_RATE/SPRINT_BOB_RATE at their tuned values (player feedback round 1, task 3, 2026-09-17)", () => {
    expect(Player.WALK_BOB_RATE).toBe(1.6);
    expect(Player.SPRINT_BOB_RATE).toBe(1.6);
  });

  it("gives sprint no cadence bump beyond its own speed increase — sprint and walk now share one rate", () => {
    // Was 1.9 vs 1.6: sprint's footstep cadence used to be walk's speed
    // ratio (10.5/7 = 1.5x) TIMES an extra 1.1875x from this rate alone,
    // which is what the player heard as "far too much" footstep noise.
    // Sprinting still steps faster than walking post-fix — bobT scales
    // with actual speed, and sprint's own top speed is still 1.5x walk's —
    // just no longer with an added bump on top of that.
    expect(Player.SPRINT_BOB_RATE).toBe(Player.WALK_BOB_RATE);
  });
});

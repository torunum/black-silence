// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";

/** THE PAUSE (owner, 2026-10-20) — `src/ui/Pause.ts`: losing a held mouse lock in play pauses; regaining it resumes. */
let P: typeof import("../../src/ui/Pause");
let game: typeof import("../../src/core/Game").game;
let S: typeof import("../../src/core/State").S;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  P = await import("../../src/ui/Pause");
  ({ game } = await import("../../src/core/Game"));
  ({ S } = await import("../../src/core/State"));
});

describe("Esc in play pauses the game", () => {
  it("the page has the pause overlay, hidden", () => {
    expect(document.getElementById("pause")!.classList.contains("hidden")).toBe(true);
  });

  it("a lock held in play and then lost pauses; taking it back resumes", () => {
    game.started = true; S.dead = false; S.won = false;
    P.pointerLockChanged(true, false);
    expect(P.pauseOpen()).toBe(false);
    P.pointerLockChanged(false, false);
    expect(P.pauseOpen()).toBe(true);
    expect(document.getElementById("pause")!.classList.contains("hidden")).toBe(false);
    P.pointerLockChanged(true, false);
    expect(P.pauseOpen()).toBe(false);
    expect(document.getElementById("pause")!.classList.contains("hidden")).toBe(true);
  });

  it("never pauses on a lock it never held, on the menu, behind another overlay, or when dead", () => {
    P.pointerLockChanged(false, true); P.closePause();          // let go of the lock the last test took, behind an overlay
    game.started = true;
    P.pointerLockChanged(false, false);                       // never held
    expect(P.pauseOpen()).toBe(false);
    P.pointerLockChanged(true, false); P.pointerLockChanged(false, true);   // the level-end card took the mouse
    expect(P.pauseOpen()).toBe(false);
    S.dead = true; P.pointerLockChanged(true, false); P.pointerLockChanged(false, false);
    expect(P.pauseOpen()).toBe(false);
    S.dead = false; game.started = false; P.pointerLockChanged(true, false); P.pointerLockChanged(false, false);
    expect(P.pauseOpen()).toBe(false);
  });
});

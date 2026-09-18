// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { S } from "../../src/core/State";
import type * as WeaponStateModule from "../../src/weapons/WeaponState";
import type * as HudModule from "../../src/ui/Hud";

/**
 * Pins `KICK_CD` — the power-kick cooldown, in seconds — and proves
 * `src/ui/Hud.ts`'s fill bar reads the same constant `doKick`/`weaponTick`
 * count down, rather than a second copy of the number.
 *
 * Was `15` (nobody's chosen number) in `WeaponState.ts`'s `doKick`, repeated
 * as a bare `15` again in `Hud.ts`'s fill-bar divisor. The project owner
 * played the game and reported the kick's cooldown as too long, giving an
 * exact replacement: one second — player feedback round 1, task 2,
 * 2026-09-17. No existing test named `kickCd`'s numeric value or
 * `kickfill`'s width formula — confirmed by a repo-wide search before this
 * file was added — so this is new coverage, not a rewrite of a prior test;
 * `docs/known-issues.md`/this plan's report record that explicitly.
 *
 * `S`/`WeaponState`/`Hud` are read/imported after `installDomStubs()`/
 * `loadGameHtml()`, the same ordering `tests/integration/contextWiring.test.ts`
 * uses for `Player.ts`: `WeaponState.ts` transitively imports
 * `src/render/Renderer.ts` (a real `THREE.WebGLRenderer`, needs
 * `installDomStubs()`'s `getContext` stub) and `Hud.ts` reads real DOM
 * elements `loadGameHtml()` creates from `index.html`.
 */
let WeaponState: typeof WeaponStateModule;
let Hud: typeof HudModule;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  WeaponState = await import("../../src/weapons/WeaponState");
  Hud = await import("../../src/ui/Hud");
});

describe("KICK_CD (power-kick cooldown, seconds)", () => {
  it("is pinned at 1 (player feedback round 1, task 2, 2026-09-17 — was 15)", () => {
    expect(WeaponState.KICK_CD).toBe(1);
  });

  it("is the exact value Hud.ts's fill bar divides by — one constant, not two copies that could disagree", () => {
    S.kickCd = WeaponState.KICK_CD; // just kicked: bar should read fully empty (0% filled)
    Hud.hud();
    expect(document.getElementById("kickfill")!.style.width).toBe("0%");

    S.kickCd = 0; // ready: bar should read fully filled
    Hud.hud();
    expect(document.getElementById("kickfill")!.style.width).toBe("100%");
    expect(document.getElementById("kicklabel")!.textContent).toBe("KICK [RMB]");
    expect(document.getElementById("kickwrap")!.classList.contains("ready")).toBe(true);

    S.kickCd = WeaponState.KICK_CD / 2; // halfway through the (now one-second) cooldown
    Hud.hud();
    expect(document.getElementById("kickfill")!.style.width).toBe("50%");
    expect(document.getElementById("kicklabel")!.textContent).toBe("KICK 1s"); // Math.ceil(0.5) === 1
    expect(document.getElementById("kickwrap")!.classList.contains("ready")).toBe(false);
  });
});

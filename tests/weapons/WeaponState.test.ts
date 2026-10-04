// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { S } from "../../src/core/State";
import { game } from "../../src/core/Game";
import { renderState } from "../../src/render/Renderer";
import { weaponRuntime } from "../../src/weapons/WeaponRuntime";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import type * as WeaponStateModule from "../../src/weapons/WeaponState";
import type * as HudModule from "../../src/ui/Hud";

/**
 * Pins `KICK_CD` — the power-kick cooldown, in seconds — and, since the
 * kick meter left the screen (2026-10-05, the owner: "it's fast enough
 * anyway"), pins both halves of that change: **the cooldown is untouched**
 * and **nothing on the HUD shows it**.
 *
 * History: the cooldown was `15`; the project owner reported it as too long
 * and gave an exact replacement, one second (player feedback round 1,
 * task 2, 2026-09-17). Until the transitions plan this file proved that
 * `src/ui/Hud.ts`'s fill bar divided by the same constant `doKick` and
 * `weaponTick` use. The bar, its label and its `ready` class are gone, so
 * those assertions were rewritten into what is still true and still worth
 * pinning, not deleted:
 *
 * - `KICK_CD` is 1, and `doKick` arms exactly that, and `weaponTick` counts
 *   it down in one second of game time — so the cooldown was not quietly
 *   changed along with the meter;
 * - `hud()` paints no kick element and `index.html` no longer carries one,
 *   so a meter put back (markup, or a `hud()` that writes to one) is red.
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

  it("is what a kick arms, and one second of weaponTick spends it — the meter's removal did not touch it", () => {
    game.started = true; game.inputLock = false; game.pianoOpen = false; S.dead = false;
    S.kickCd = 0;
    // weaponTick fades the level's two flash lights; there is no level loaded here, so stand-ins.
    renderState.muzzleLight = { intensity: 0 } as never;
    renderState.boomLight = { intensity: 0 } as never;
    WeaponState.doKick();
    expect(S.kickCd, "a kick arms exactly KICK_CD").toBe(WeaponState.KICK_CD);
    expect(weaponRuntime.kickAnim).toBe(0.32);

    S.kickCd = 0.6;
    WeaponState.doKick();
    expect(S.kickCd, "a second kick inside the cooldown does nothing").toBe(0.6);

    S.kickCd = WeaponState.KICK_CD;
    for (let i = 0; i < 9; i++) WeaponState.weaponTick(0.1);
    expect(S.kickCd, "0.9 s in, the kick is still cooling").toBeGreaterThan(0);
    WeaponState.weaponTick(0.11);
    expect(S.kickCd, "past 1 s, it is ready").toBeLessThanOrEqual(0);
    clearAllTimers();
    clearScheduled();
  });
});

describe("the kick has no meter on screen", () => {
  const KICK_IDS = ["kickwrap", "kicklabel", "kickback", "kickfill"];

  it("index.html carries none of the meter's elements, and no style for them", () => {
    const html = readFileSync("index.html", "utf8");
    for (const id of KICK_IDS) {
      expect(html, `#${id} is in index.html`).not.toContain(id);
      expect(document.getElementById(id), `#${id} is in the loaded page`).toBeNull();
    }
    expect(html).not.toContain("KICK [RMB]");
  });

  it("hud() paints health, armour, ammo and the weapon's name, whatever the cooldown, and creates no kick element", () => {
    for (const cd of [0, WeaponState.KICK_CD / 2, WeaponState.KICK_CD]) {
      S.kickCd = cd;
      expect(() => Hud.hud()).not.toThrow();
      expect(document.querySelector("#hp .num")!.textContent).toBe(String(Math.max(0, Math.ceil(S.hp))));
      expect(document.getElementById("wname")!.textContent).toBeTruthy();
      expect(document.body.innerHTML, `hud() at kickCd=${cd} put a kick readout on the page`).not.toMatch(/KICK (\d+s|\[RMB\])/);
    }
  });
});

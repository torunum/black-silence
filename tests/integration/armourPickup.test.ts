// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { LEVELS } from "../../src/world/levels";
import { findAll } from "../../src/world/analysis";
import { CELL } from "../../src/world/Grid";
import type { world as World } from "../../src/world/WorldState";
import type { player as Player } from "../../src/player/PlayerState";
import type { S as GameS } from "../../src/core/State";
import type { loadLevel as LoadLevel } from "../../src/world/LevelLoader";
import type { itemsTick as ItemsTick } from "../../src/player/Interact";
import type { hud as Hud } from "../../src/ui/Hud";

/**
 * KNOWN-11's closing evidence: **`S.armor` can become non-zero through real
 * play.**
 *
 * That sentence was false for the entire life of this game, and the way the
 * suite recorded it is the reason this file exists.
 * `tests/integration/combatTrace.test.ts` seeds `S.armor = 50` in
 * `beforeAll` and says so at length — not as a convenience, but because
 * there was no other way to reach `damagePlayer`'s armour-absorb branch:
 * `loadLevel` dispatches `ENEMY_DEFS` before its item map, `A` is both the
 * Mancubus and the armour key, so every armour tile a level author ever
 * wrote spawned a 260 hp enemy and the pickup arm was unreachable dead
 * code. A seeded value proves the absorb branch works; it proves nothing
 * about whether a player can ever hold armour. Only this file does that,
 * and it does it **without seeding `S.armor` at any point** — every
 * assertion below starts from 0 and watches the real pickup path move it.
 *
 * ## What "real play" means here, precisely
 *
 * The real `loadLevel` builds the real level grid, and the real `itemsTick`
 * (`src/player/Interact.ts`) — the same function `src/core/Loop.ts` calls
 * every gameplay frame — runs the pickup. Nothing is constructed by hand:
 * the item under test is whatever `loadLevel` put in `world.items` from the
 * grid glyph the level author wrote.
 *
 * The one thing that *is* staged is the player's position, and it is staged
 * for the reason `tests/integration/bossTrace.test.ts`'s `afterLoad` hook
 * exists: `loadLevel` writes `player.px`/`player.pz` from the grid's `"P"`
 * cell, so a position assigned before it runs is overwritten, and walking
 * there instead would make this file a second scripted trace — one whose
 * route through a secret door would have to be re-tuned every time a level
 * changes. Standing the player on the tile is the smallest staging that
 * still exercises the whole real path from grid glyph to `S.armor`.
 *
 * ## Why every level, not just level 1
 *
 * Twenty tiles across seven levels were affected, and a test aimed at one
 * of them would pass while nineteen stayed broken. The loop below derives
 * the expected count per level from the built grid itself (`findAll(grid,
 * "r")`), so it cannot drift from what the levels actually place, and it
 * asserts the pickup end to end for **every** one of them.
 *
 * ## What this file deliberately does not cover
 *
 * `damagePlayer`'s absorb arithmetic. That stays `combatTrace`'s job, still
 * via its seeded `S.armor`, and that seeding is still the right call there:
 * level 1's single armour tile is behind a secret door in the alcove that
 * trace's script never opens (its own header says so), so removing the seed
 * would silently drop the absorb branch's only coverage. What has changed
 * is the *reason* for the seed — reach, not impossibility — and
 * `combatTrace`'s header now says that.
 */

let world: typeof World;
let player: typeof Player;
let S: typeof GameS;
let loadLevel: typeof LoadLevel;
let itemsTick: typeof ItemsTick;
let hud: typeof Hud;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = () => 1;
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};

  // Dynamic imports, after the DOM stubs: several of these modules capture
  // `document.getElementById(...)` at module scope the moment they are first
  // evaluated. Same ordering hazard `tests/integration/positionalCallers.test.ts`
  // documents.
  ({ world } = await import("../../src/world/WorldState"));
  ({ player } = await import("../../src/player/PlayerState"));
  ({ S } = await import("../../src/core/State"));
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ itemsTick } = await import("../../src/player/Interact"));
  ({ hud } = await import("../../src/ui/Hud"));

  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file boots the game through it");
  (newGame as HTMLElement).click();
});

// KNOWN-19: the boot above arms loadLevel's real 1400ms timer on the real
// clock, with nothing in this file to absorb it.
afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

/** How many armour tiles each level's built grid actually holds, derived, never counted by hand. */
const EXPECTED = LEVELS.map((def) => ({ name: def.name, armour: findAll(def.build().g, "r").length }));

describe("armour exists: a level's own grid puts armour on the floor and the player can take it (KNOWN-11)", () => {
  it("the fixture this file is built on is not vacuous — some level authors armour", () => {
    // Without this, a regression that deleted every `r` from every grid
    // would turn each level's case below into a pass over an empty list.
    expect(EXPECTED.reduce((n, l) => n + l.armour, 0)).toBe(20);
  });

  it.each(EXPECTED.map((l, i) => [l.name, i, l.armour] as const))(
    "%s: loadLevel puts %#-indexed level's armour tiles in world.items as pickups",
    (_name, idx, expected) => {
      loadLevel(idx);
      const armour = (world.items as unknown as Array<{ kind: string }>).filter((it) => it.kind === "armor");
      expect(armour.length).toBe(expected);
    },
  );

  it("standing on one raises S.armor from 0 to 50, in every level that has one", () => {
    // `S.armor` is never written by this file. It starts at 0 because
    // `src/core/State.ts` initialises it there and — as the whole of
    // KNOWN-11 established — nothing in real play had ever changed it.
    expect(S.armor).toBe(0);

    let taken = 0;
    for (let idx = 0; idx < LEVELS.length; idx++) {
      loadLevel(idx);
      const items = world.items as unknown as Array<{ kind: string; x: number; z: number; taken?: boolean }>;
      for (const it of items.filter((i) => i.kind === "armor")) {
        const before = S.armor;
        player.px = it.x;
        player.pz = it.z;
        itemsTick(1 / 60);
        expect(it.taken, `the armour at (${it.x},${it.z}) in ${LEVELS[idx].name} was not picked up`).toBe(true);
        expect(S.armor - before).toBe(50);
        taken++;
        // Back to 0 so each tile is measured as its own 0 -> 50, and so the
        // `Math.min(100, ...)` cap in Interact.ts never masks a later one.
        S.armor = 0;
      }
    }
    expect(taken, "no armour was picked up anywhere — this assertion would otherwise be vacuous").toBe(20);
  });

  it("the HUD's armour slot, which could only ever read 0, now reads what the player picked up", () => {
    loadLevel(1);
    const items = world.items as unknown as Array<{ kind: string; x: number; z: number }>;
    const armour = items.find((i) => i.kind === "armor");
    expect(armour, "level 1's secret alcove has no armour item").toBeDefined();

    S.armor = 0;
    hud();
    expect(document.querySelector("#ar .num")?.textContent).toBe("0");

    player.px = (armour as { x: number }).x;
    player.pz = (armour as { z: number }).z;
    itemsTick(1 / 60);
    hud();
    expect(document.querySelector("#ar .num")?.textContent).toBe("50");
  });

  it("level 1's armour is the reward cache in the secret alcove, where the author wrote it", () => {
    // `src/world/levels/level1.ts`: `put1(g,40,25,"r")`, commented "armor",
    // behind the secret door at `g[23][40]`. This pins the *place*, not just
    // the count — an armour item that spawned somewhere else would satisfy
    // every other assertion in this file.
    loadLevel(1);
    const items = world.items as unknown as Array<{ kind: string; x: number; z: number }>;
    const armour = items.filter((i) => i.kind === "armor");
    expect(armour.map((a) => [a.x, a.z])).toEqual([[(40 + 0.5) * CELL, (25 + 0.5) * CELL]]);
  });

  it("and no enemy stands in the alcove any more", () => {
    loadLevel(1);
    const enemies = world.enemies as unknown as Array<{ key: string; x: number; z: number }>;
    expect(enemies.some((e) => e.key === "A")).toBe(false);
    const inAlcove = enemies.filter((e) => e.x > 37 * CELL && e.z > 23 * CELL);
    expect(inAlcove.map((e) => e.key)).toEqual([]);
  });
});

/**
 * ============ Two behaviours KNOWN-11 made reachable — DO NOT "FIX" ========
 *
 * Turning `S.armor` on surfaced two things that were structurally impossible
 * to observe before this task, because `S.armor` could never leave 0.
 * `reference/sonsurum.html` has both, byte-identical, so they are faithful
 * port behaviour and not drift — pinned here on purpose, exactly the way
 * `tests/enemies/deadDefFields.test.ts` (KNOWN-15) pins its ten fields: a
 * green run means the surprising behaviour is still exactly as surprising as
 * it was when found. **Do not add an at-cap guard to the armour case, and do
 * not make `loadLevel` reset `S.armor`, to make either test below pass in a
 * "better" way — that is a balance decision for a human at the game, not a
 * side effect of a test going red.** See KNOWN-11's closing note in
 * `docs/known-issues.md` for both.
 */
describe("KNOWN-11's two adjacent, newly-reachable behaviours (pinned, not fixed)", () => {
  it("armour at 100 still consumes the pickup and shows +50 ARMOR for nothing", () => {
    // src/player/Interact.ts's "armor" case in itemsTick has no at-cap guard
    // where "health" has one one line above
    // (`if(S.hp>=100){ok=false;break;}`) — so unlike a medkit at full health,
    // an armour pickup at S.armor===100 is still taken off the floor and
    // still shows its toast, for a +50 that goes nowhere.
    // Mutation that would catch a "fix": adding
    // `if(S.armor>=100){ok=false;break;}` to that case turns `taken` false
    // and this test red.
    loadLevel(1);
    const items = world.items as unknown as Array<{ kind: string; x: number; z: number; taken?: boolean }>;
    const armour = items.find((i) => i.kind === "armor");
    expect(armour, "level 1's secret alcove has no armour item").toBeDefined();

    S.armor = 100;
    document.getElementById("msg")!.textContent = "";
    player.px = (armour as { x: number }).x;
    player.pz = (armour as { z: number }).z;
    itemsTick(1 / 60);

    expect(armour!.taken, "a full-armour player should still pick the item up, faithfully wastefully").toBe(true);
    expect(S.armor).toBe(100);
    expect(document.getElementById("msg")!.textContent).toBe("+50 ARMOR");
  });

  it("armour carries across loadLevel, unlike hp and key", () => {
    // src/world/LevelLoader.ts's loadLevel resets S.dead, S.won, S.hp and
    // S.key every time it runs, but never S.armor — so armour is the one
    // defensive resource that survives a level transition while health
    // refills to 100. Consistent with how ammo and weapons already carry;
    // never observable before this task because S.armor could not become
    // nonzero in the first place.
    // Mutation that would catch a "fix": adding `S.armor=0;` beside
    // loadLevel's `S.hp=100;` line turns the final assertion here red.
    loadLevel(0);
    S.hp = 47;
    S.key = true;
    S.armor = 73;

    loadLevel(1);

    expect(S.hp).toBe(100);
    expect(S.key).toBe(false);
    expect(S.armor).toBe(73);

    S.armor = 0; // leave clean for later tests in this file
  });
});

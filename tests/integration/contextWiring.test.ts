// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml, installFakeClock } from "../support/domStubs";
import { world } from "../../src/world/WorldState";
import { player } from "../../src/player/PlayerState";
import { game } from "../../src/core/Game";
import { S } from "../../src/core/State";

/**
 * `src/core/Context.ts`'s three remaining entries, as of Plan 0E Task 12
 * review finding I1 — `endLevel`, `openPiano`, `showWin`.
 *
 * Every call site uses `ctx.X?.()` (optional call), so a wrong or missing
 * registration doesn't throw — it silently no-ops. The whole 364-test suite
 * stayed green under two independent sabotages the reviewer ran directly
 * against `src/legacy.js:79`'s registration line: `endLevel=showWin` (one
 * wrong target) and a 3-way rotation of all three registrations. Neither
 * `tests/integration/wiring.test.ts` nor anything else names `endLevel`,
 * `openPiano`, `showWin` or `Context` at all.
 *
 * Update, Plan 0F Task 1 (b): `wakeBoss` is one of them again. Plan 0E Task
 * 10 retired it to a direct `Damage.ts -> Boss.ts` import on the strength of
 * a `madge --circular src/` run that — it turned out — was scanning only
 * `src/legacy.js`, because madge's default extension list excludes `.ts`.
 * With `--extensions ts,js` the real graph shows that import closes a
 * four-file cycle: `Damage.ts -> Boss.ts -> ai/Attacks.ts -> world/Props.ts
 * -> Damage.ts`. The locator entry is restored, registered by `Boss.ts` at
 * its own module scope, and the `wakeBoss` block below pins it.
 *
 * Update, Plan 0F Task 1: `openPiano` is no longer one of them. It moved,
 * with the rest of the playable piano, to `src/ui/Piano.ts`, and
 * `src/player/Interact.ts` now imports it directly instead of reaching it
 * through `ctx.openPiano?.()` — `madge --circular src/` confirmed that
 * direct import adds no cycle. `Context.ts` now holds only `endLevel` and
 * `showWin`. The seam the `openPiano` describe block below covers still
 * exists — the piano-proximity branch should still open the piano — only
 * the mechanism changed, so that block now asserts the direct call instead
 * of a locator registration; it no longer touches `ctx` at all.
 *
 * Update, Plan 0F Task 2: `endLevel` and `showWin` are gone too, the same
 * way `openPiano` left — both moved to `src/ui/LevelEnd.ts`, and
 * `src/player/Player.ts`/`src/enemies/Death.ts` now import them directly
 * instead of reaching them through `ctx.endLevel?.()`/`ctx.showWin?.()`.
 * Each retirement was confirmed clean one at a time against
 * `madge --circular --extensions ts,js src/`, so a cycle would have been
 * attributable to whichever one caused it (neither did). `Context.ts` now
 * holds exactly one entry, `wakeBoss` — a genuine cycle-break, not a bridge
 * to code that had not moved yet, so it has no seam here to convert; its
 * own describe block below is unchanged. The `endLevel`/`showWin` describe
 * blocks below now assert the direct call the same way the `openPiano`
 * block already did — neither touches `ctx` any more either.
 *
 * This is a sibling of `wiring.test.ts`, not an extension of it, for one
 * concrete reason: `src/legacy.js` is a module singleton with side effects
 * at import (it builds a renderer, boots a level, registers listeners) and
 * — per `gameplayTrace.ts`'s own header — "can therefore run once per test
 * file." `wiring.test.ts`'s existing boot drives the render loop through a
 * mocked `requestAnimationFrame` queue, with `Input.ts`/`Overlay2D.ts`/
 * `viewmodel/draw.ts` swapped for recorders — machinery this file has no
 * use for, since none of the three entries under test are reached from the
 * frame loop's overlay/viewmodel path. Reusing that boot would mean either
 * fighting its mocks or adding unrelated ones just to keep the file
 * importable; a second, purpose-built boot (real DOM, no rAF queue, no
 * mocked modules) is simpler and does not risk perturbing the sequential,
 * real-clock-dependent assertions `wiring.test.ts` already makes (its
 * `spawnGuard`/`hitStop` tests need `performance.now()` timestamps fed in a
 * precise order; this file installs a *fake* clock for one of its three
 * tests, which would be an easy way to break that if the two shared a
 * process-global module registry).
 *
 * ## The technique
 *
 * Each of the three target functions (`endLevel`, `openPiano`, `showWin`)
 * has a distinct, real DOM/state side effect nothing else in this file's
 * three tests produces: `endLevel` unhides `#levelend`, `openPiano` flips
 * `#piano`'s inline `display` to `"flex"` (and sets `game.pianoOpen`),
 * `showWin` unhides `#win`. Each test drives the real call site — not a
 * copy of it — with the game genuinely in the state that reaches it
 * (player standing on the exit pad with no boss alive for `endLevel`,
 * player within `interact()`'s piano radius for `openPiano`), then checks
 * the FULL three-way shape below rather than a single flag. That is what
 * makes a wrong-target registration fail here and not just a missing one:
 * `endLevel` mistakenly bound to `showWin` still flips something visible —
 * just the wrong something — and `toEqual`ing the full shape catches that,
 * where checking only `S.won` (true after either) or only "is #levelend
 * still hidden" (false after either the rotation's openPiano-swap wiring
 * *or* a correct run reaching a later frame) would not.
 *
 * `showWin` only fires from `bossDeath`'s `key==="G"` branch (THE LIVING
 * HEART, level 7, 3000 hp), inside a `setTimeout`. Playing a boss fight to
 * death in a test is disproportionate to what's being pinned here — the
 * registration, not the fight — so that test calls the real, exported
 * `bossDeath` directly with a minimal synthetic boss enemy (the same
 * technique `src/player/Player.ts`'s and `src/enemies/Death.ts`'s own local
 * `TickEnemy`/`DeathEnemy` cast interfaces already use for "the few fields
 * this code path actually reads") and drains a fake clock instead of
 * waiting 2.8 real seconds. This still exercises the real
 * `setTimeout(()=>showWin(),2800)` line, not a stand-in for it.
 */

/** The three DOM/state flags each target function's real body flips, and nothing else in this file does. */
function overlayState(): { levelendVisible: boolean; winVisible: boolean; pianoVisible: boolean } {
  return {
    levelendVisible: !document.getElementById("levelend")!.classList.contains("hidden"),
    winVisible: !document.getElementById("win")!.classList.contains("hidden"),
    pianoVisible: (document.getElementById("piano") as HTMLElement).style.display === "flex",
  };
}

let playerTick: (dt: number) => void;
let interact: () => void;
let bossDeath: (e: unknown) => void;
let damageEnemy: (e: unknown, dmg: number, info?: unknown) => void;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  // jsdom implements neither of these, and startGame/endLevel/openPiano/
  // showWin/bossDeath all reach one or the other on this path.
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};

  // No requestAnimationFrame override — installDomStubs' default (a no-op
  // that never invokes its callback) is exactly right here: this file never
  // drives the render loop, so `loop()` must never actually run on its own.

  // Dynamic, not top-of-file, imports: src/render/Overlay2D.ts (imported
  // transitively by Player.ts/Death.ts) captures `document.getElementById
  // ("fx2d").getContext("2d")` at its own module scope the moment it is
  // first evaluated. A static top-of-file `import` would evaluate that
  // before installDomStubs()/loadGameHtml() above ever run, crashing on a
  // null element / missing getContext. Importing after both — the same
  // ordering legacy.js's own dynamic import already relies on — is what
  // makes this safe.
  ({ playerTick } = await import("../../src/player/Player"));
  ({ interact } = await import("../../src/player/Interact"));
  ({ bossDeath } = await import("../../src/enemies/Death"));
  ({ damageEnemy } = await import("../../src/enemies/Damage"));

  await import("../../src/main");

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  // The prologue (level 0) loads with zero enemies (see wiring.test.ts and
  // combatTrace.test.ts's own headers) — confirmed again here rather than
  // assumed, since the endLevel test below depends on "no boss alive"
  // being trivially true.
  if ((world.enemies as unknown[] | null)?.length) {
    throw new Error("the prologue is expected to load with zero enemies — this file's endLevel setup assumes that");
  }
});

beforeEach(() => {
  // Each test's own arrange step puts the game in the specific state that
  // reaches its target; this only resets the three shared observables so
  // one test's side effects can't leak into the next test's assertion.
  document.getElementById("levelend")!.classList.add("hidden");
  document.getElementById("win")!.classList.add("hidden");
  (document.getElementById("piano") as HTMLElement).style.display = "";
  game.pianoOpen = false;
  S.won = false;
});

describe("endLevel (src/ui/LevelEnd.ts, imported directly by src/player/Player.ts) — the exit-pad branch", () => {
  it("unhides #levelend (not #win, not the piano) when the player stands on the exit pad with no boss alive", () => {
    expect(world.exitPos, "prologue's LevelLoader should have set an exit pad").not.toBeNull();
    const exit = world.exitPos as unknown as { x: number; z: number };
    player.px = exit.x;
    player.pz = exit.z;

    playerTick(1 / 60);

    expect(overlayState()).toEqual({ levelendVisible: true, winVisible: false, pianoVisible: false });
    // A secondary, independent reader of "endLevel ran" — not the
    // discriminating check on its own (showWin also sets S.won), but real
    // corroboration alongside the DOM shape above.
    expect(S.won).toBe(true);
  });
});

describe("openPiano (src/ui/Piano.ts, imported directly by src/player/Interact.ts) — the piano-proximity branch", () => {
  it("flips #piano to display:flex (not #levelend, not #win) when the player is within range of world.pianoPos", () => {
    // The prologue has no piano tile; placing world.pianoPos at the
    // player's own current position is the same "seed the state the code
    // reads" technique wiring.test.ts uses for hitStop/spawnGuard — it
    // doesn't matter *where* the piano is, only that interact()'s distance
    // check (`<1.9`) reads true.
    world.pianoPos = { x: player.px, z: player.pz };

    interact();

    expect(overlayState()).toEqual({ levelendVisible: false, winVisible: false, pianoVisible: true });
    // Second independent reader of the same event, written by the real
    // openPiano() body alongside the DOM flag above.
    expect(game.pianoOpen).toBe(true);
  });
});

describe("showWin (src/ui/LevelEnd.ts, imported directly by src/enemies/Death.ts) — bossDeath, key===\"G\"", () => {
  it("unhides #win (not #levelend, not the piano) 2.8s after a THE LIVING HEART kill", () => {
    const clock = installFakeClock();
    try {
      // The minimal shape bossDeath's body actually reads for a
      // key==="G" kill: x/z/h feed spawnGibs/addPool, key selects the
      // achievement/message/setTimeout branch. No boss fight, no world
      // enemy — this calls the real, exported bossDeath directly.
      const heart = { x: 5, z: 5, h: 2.8, key: "G", stone: false };
      bossDeath(heart);

      // Not yet — proves the assertion below is gated by the timer firing,
      // not by some leftover state from an earlier test.
      expect(overlayState().winVisible).toBe(false);

      clock.advance(2800);

      expect(overlayState()).toEqual({ levelendVisible: false, winVisible: true, pianoVisible: false });
      expect(S.won).toBe(true);
    } finally {
      clock.restore();
    }
  });
});

describe("ctx.wakeBoss — src/enemies/Damage.ts's damageEnemy, dormant-boss branch", () => {
  it("wakes a dormant boss and starts the cinematic, without touching the three overlays", () => {
    // A minimal synthetic boss: the fields damageEnemy reads on its way to
    // the wakeBoss branch, plus the ones wakeBoss itself reads. Same
    // technique the showWin test above uses, and the same one Player.ts and
    // Death.ts's own local cast interfaces already use.
    const mat = { color: { setHex: () => {} } };
    const boss = {
      boss: true, dormant: true, dead: false,
      hp: 3000, maxhp: 3000, plate: 0, pain: 200, stun: 0, slow: 1,
      kx: 0, kz: 0, x: 4, z: 4, h: 2, key: "G",
      name: "THE LIVING HEART", title: "WHAT THE PARISH WAS BUILT AROUND",
      sp: { material: mat }, blob: { material: mat },
    };

    const before = overlayState();
    world.cine = null;

    damageEnemy(boss, 1, {});

    // The registration's own observable: wakeBoss is the ONLY thing that
    // clears `dormant` and opens `world.cine`. An unregistered entry makes
    // `ctx.wakeBoss?.(e)` a silent no-op and both stay as they were.
    expect(boss.dormant, "wakeBoss should have cleared dormant").toBe(false);
    expect(world.cine, "wakeBoss should have opened the boss cinematic").not.toBeNull();
    expect((world.cine as unknown as { e: unknown }).e).toBe(boss);

    // ...and the full three-way shape, so a wrong-target registration —
    // ctx.wakeBoss bound to endLevel or showWin — fails here too rather
    // than merely leaving dormant set.
    expect(overlayState()).toEqual(before);
  });
});

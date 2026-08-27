// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "./support/domStubs";

describe("legacy.js boot", () => {
  beforeAll(() => {
    installDomStubs();
    loadGameHtml();
  });

  it("imports without throwing", async () => {
    await expect(import("../src/legacy.js")).resolves.toBeDefined();
  });

  it("finds every element lookup legacy.js performs against index.html", () => {
    // Derived from the source itself, rather than a hand-written id list, so
    // this assertion grows automatically as later phases move more
    // DOM-touching code into legacy.js instead of drifting out of sync with
    // what the game actually reads. Matches literal-string arguments to
    // getElementById(...) and querySelector(...) only — deliberately not
    // querySelectorAll (legacy.js doesn't use it).
    //
    // One call is NOT covered by this scan and that's intentional, not an
    // oversight: `document.getElementById(s)` inside the menu-nav
    // `["intro","chapsel","settings"].forEach(s=>...)` takes a loop
    // variable, not a string literal, so the regex below can't see it. All
    // three ids it can resolve to ("intro", "chapsel", "settings") are
    // independently covered by other, literal lookups elsewhere in the file
    // (see the showScreen-adjacent classList.add("hidden") calls), so
    // coverage isn't actually lost — just not derived mechanically for that
    // one call site.
    const src = readFileSync("src/legacy.js", "utf8");
    const calls = [...src.matchAll(/\.(getElementById|querySelector)\("([^"]+)"\)/g)];

    // A regression in the regex itself (e.g. legacy.js source changes shape)
    // should fail loudly rather than silently asserting nothing. The floor
    // was 30 (31 actual) through Plan 0E and Plan 0F Task 1. Plan 0F Task 2
    // moved `hud`'s eleven HUD/boss-bar lookups and `endLevel`/`showWin`'s
    // nine (`gradeOf`/`statsHtml` add none) out of legacy.js into
    // `src/ui/Hud.ts`/`src/ui/LevelEnd.ts` — a real reduction, not a regex
    // regression, down to 11 — so the floor comes down with it. legacy.js is
    // headed to zero of these by Plan 0F Task 4's own stated goal (emptying
    // the file), so a later task will need to lower this again, and
    // eventually retire the assertion once nothing is left to scan.
    expect(calls.length).toBeGreaterThan(5);

    for (const [, method, selector] of calls) {
      const found =
        method === "getElementById"
          ? document.getElementById(selector)
          : document.querySelector(selector);
      expect(found, `${method}("${selector}") in legacy.js found nothing in index.html`).not.toBeNull();
    }
  });
});

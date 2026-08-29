// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "./support/domStubs";

const SRC_DIR = join(__dirname, "..", "src");

/** Every .ts/.js file under src/, recursively. */
function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...srcFiles(p));
    else if (/\.(ts|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}

describe("main.ts boot", () => {
  beforeAll(() => {
    installDomStubs();
    loadGameHtml();
  });

  it("imports without throwing", async () => {
    await expect(import("../src/main")).resolves.toBeDefined();
  });

  it("finds every element lookup the port performs against index.html", () => {
    // Derived from the source itself rather than a hand-written id list, so
    // this assertion tracks what the game actually reads instead of drifting
    // out of sync with it. Matches literal-string arguments to
    // getElementById(...) and querySelector(...) only.
    //
    // This scans **all of src/**, not just legacy.js. It used to scan only
    // legacy.js, which was right when legacy.js was the only file touching
    // the DOM — but every plan since 0C has moved DOM-touching code out into
    // modules, and each move silently shrank what this test covered. Plan 0F
    // Task 2 made that concrete: moving `hud`, `endLevel` and `showWin` out
    // took legacy.js from 31 literal lookups to 11, and the twenty that left
    // became unchecked. By Task 4, when legacy.js is deleted outright, a
    // legacy.js-only scan would have protected nothing at all while still
    // reporting green. Same failure mode, same fix, as
    // tests/content/achievements.test.ts's call-site scan in Plan 0E Task 5.
    //
    // One call is NOT covered and that's intentional, not an oversight:
    // `el(s)` inside the menu-nav `["intro","chapsel","settings"].forEach(s=>...)`
    // (`src/ui/Menus.ts`'s `showScreen`) takes a loop variable, not a string
    // literal, so the regex can't see it. All three ids it can resolve to
    // are independently covered by other literal lookups.
    //
    // Plan 0F Task 10 (`strict: true`) replaced most literal
    // `document.getElementById("x")`/`document.querySelector("x")` calls
    // with `el("x")`/`q("x")` — `src/ui/dom.ts`'s null-throwing wrappers —
    // so this scan matches both call shapes: the bare DOM methods (still
    // used at a few sites that immediately cast the result, e.g.
    // `document.getElementById("game") as HTMLCanvasElement`) and el()/q().
    // Recognizing only one shape would silently shrink coverage exactly
    // the way scanning only legacy.js once did.
    const calls: Array<{ file: string; method: string; selector: string }> = [];
    for (const file of srcFiles(SRC_DIR)) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/\.(getElementById|querySelector)\("([^"]+)"\)/g)) {
        calls.push({ file, method: m[1], selector: m[2] });
      }
      for (const m of src.matchAll(/\b(el|q)\("([^"]+)"\)/g)) {
        calls.push({ file, method: m[1] === "el" ? "getElementById" : "querySelector", selector: m[2] });
      }
    }

    // Anti-vacuity floor: a regression in the regex, or a scan that stops
    // finding files, must fail loudly rather than silently asserting nothing.
    // Unlike the old legacy.js-only floor this one does NOT need lowering as
    // the port progresses — moving a lookup between two files under src/
    // leaves the total unchanged, which is the whole point of widening the
    // scan.
    expect(calls.length).toBeGreaterThan(30);

    for (const { file, method, selector } of calls) {
      const found =
        method === "getElementById"
          ? document.getElementById(selector)
          : document.querySelector(selector);
      expect(found, `${method}("${selector}") in ${file} found nothing in index.html`).not.toBeNull();
    }
  });
});

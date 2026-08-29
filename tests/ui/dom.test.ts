// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { el, q } from "../../src/ui/dom";

/**
 * `src/ui/dom.ts`'s throw-on-missing branch.
 *
 * Plan 0F Task 10 replaced most bare `document.getElementById("x")` calls with
 * `el("x")` so `strictNullChecks` had a non-nullable result to work with. That
 * swapped one crash for another: a missing element now throws a named `Error`
 * instead of the call site failing later with "Cannot read property of null".
 *
 * The Task 12 review found that branch untested — deleting the null check
 * entirely left all 391 tests green and `tsc` clean, because
 * `tests/smoke.test.ts` separately proves every literal id in use exists in
 * `index.html`, which makes the throw unreachable from any other test. That is
 * a good property of the codebase and a bad one for coverage: the diagnostic
 * these helpers exist to provide was the one thing nothing checked.
 *
 * These tests call the helpers directly with ids that are deliberately absent,
 * which is the only way to reach the branch.
 */

describe("src/ui/dom.ts", () => {
  it("el() returns the element when it exists", () => {
    document.body.innerHTML = `<div id="present"></div>`;
    expect(el("present").id).toBe("present");
  });

  it("el() throws naming the id when it does not", () => {
    document.body.innerHTML = "";
    expect(() => el("definitely-not-in-index-html")).toThrow(/definitely-not-in-index-html/);
  });

  it("q() returns the element when the selector matches", () => {
    document.body.innerHTML = `<div class="hit"><span>x</span></div>`;
    expect(q(".hit span").textContent).toBe("x");
  });

  it("q() throws naming the selector when it matches nothing", () => {
    document.body.innerHTML = "";
    expect(() => q(".no-such-selector")).toThrow(/\.no-such-selector/);
  });
});

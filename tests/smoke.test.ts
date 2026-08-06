// @vitest-environment jsdom
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

  it("finds every element id it looks up", () => {
    // The game reads these by id at module scope or during boot. A missing id
    // is a null dereference at runtime, which no other test would catch.
    for (const id of ["game", "fx2d", "msg", "hud", "hp", "ar", "am", "wname", "cross"]) {
      expect(document.getElementById(id), `#${id} missing from index.html`).not.toBeNull();
    }
  });
});

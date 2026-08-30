// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { save } from "../../src/save/SaveGame";

/**
 * `RENDER_WIDTHS`'s shape, and `sizeRender`'s default — the plain,
 * boot-order-independent half of Phase 1 Task 2. The boot-order trap itself
 * (a stored width actually reaching the renderer before the first frame) has
 * its own file, `tests/integration/renderWidthBootWiring.test.ts`, for the
 * same reason `schedulerWiring.test.ts`/`gpuDisposeWiring.test.ts`/
 * `timerCancellationWiring.test.ts` are their own files rather than folded
 * into a module test: `src/main.ts` (and, transitively, `RenderCore.ts`)
 * boots and captures its WebGL canvas once, at import time, and Vitest only
 * evaluates a module once per test file — a second scenario needing its own
 * fresh boot has to live in its own file. The resolution-slider *wiring*
 * test (does moving `#resSlider` set a width, not an index, and call through
 * `sizeRender`?) is `tests/ui/Menus.test.ts`, alongside the volume slider it
 * shares an `initMenus` with.
 */

let RENDER_WIDTHS: readonly number[];

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  // Dynamic, not top-of-file: RenderCore.ts captures the WebGL canvas (via
  // `document.getElementById("game")`) at its own module scope the moment
  // it is first evaluated. A static top-of-file import would evaluate that
  // before installDomStubs()/loadGameHtml() above ever ran, and
  // `document.getElementById("game")` would still be null.
  ({ RENDER_WIDTHS } = await import("../../src/render/RenderCore"));
});

describe("render widths", () => {
  it("includes the reference's 400 and keeps it the default", () => {
    expect(RENDER_WIDTHS).toContain(400);
    expect(save.renderWidth).toBe(400);
  });

  it("is sorted ascending and has no duplicates", () => {
    const a = [...RENDER_WIDTHS];
    expect(a).toEqual([...new Set(a)].sort((x, y) => x - y));
  });
});

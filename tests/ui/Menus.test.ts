// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { save } from "../../src/save/SaveGame";
import { renderState } from "../../src/render/Renderer";
import { audioInit, getMasterVolume, masterBus } from "../../src/audio/AudioEngine";

/**
 * `initMenus`'s two settings IIFEs — added/changed by Phase 1 Task 2 — and
 * specifically the property module tests of `RenderCore.ts`/`AudioEngine.ts`
 * alone cannot see: that `initMenus` actually reads `save` at registration
 * time and, for the resolution row, calls through `sizeRender` rather than a
 * parallel resize path.
 *
 * `RENDER_WIDTHS`'s own shape and default are `tests/render/resolution.test.ts`;
 * the boot-order trap (does a *stored* width reach the renderer before the
 * first real frame, given `RenderCore.ts`'s module-scope `sizeRender()` call
 * runs before `main.ts`'s `loadSave()`?) is
 * `tests/integration/renderWidthBootWiring.test.ts`. This file only tests
 * `initMenus` itself: given whatever `save` already holds when it runs, does
 * it paint correctly and wire the listener correctly?
 */

let initMenus: (startGame: (idx: number) => void) => void;
let RENDER_WIDTHS: readonly number[];

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  // Dynamic, not top-of-file: src/ui/Menus.ts imports src/render/RenderCore.ts
  // (for sizeRender/RENDER_WIDTHS), which captures the WebGL canvas at its
  // own module scope the moment it is first evaluated — same constraint as
  // resolution.test.ts and renderWidthBootWiring.test.ts.
  ({ initMenus } = await import("../../src/ui/Menus"));
  ({ RENDER_WIDTHS } = await import("../../src/render/RenderCore"));
});

beforeEach(() => {
  // Fresh DOM (and therefore fresh #resSlider/#volSlider elements with no
  // listeners registered yet) for every test — initMenus wires listeners
  // once per call, onto whatever elements exist at that moment.
  loadGameHtml();
  localStorage.clear();
  save.maxLevel = 0;
  save.masterVolume = 0.5;
  save.renderWidth = 400;
});

function fireInput(el: HTMLInputElement, value: string): void {
  el.value = value;
  el.dispatchEvent(new Event("input"));
}

describe("initMenus — resolution slider", () => {
  it("paints the slider and label from the already-loaded save.renderWidth at registration time", () => {
    save.renderWidth = 640;
    initMenus(() => {});
    const sl = document.getElementById("resSlider") as HTMLInputElement;
    expect(sl.value).toBe(String(RENDER_WIDTHS.indexOf(640)));
    expect(document.getElementById("resVal")!.textContent).toBe("640");
  });

  it("moving the slider sets save.renderWidth to a width, not the raw slider index, and calls through sizeRender", () => {
    initMenus(() => {});
    const sl = document.getElementById("resSlider") as HTMLInputElement;
    const idx = 3; // RENDER_WIDTHS[3] === 640, distinct from the index itself
    expect(RENDER_WIDTHS[idx]).toBe(640);

    fireInput(sl, String(idx));

    // The core assertion this test exists for: a width, not an index. A
    // listener that wrote `sl.value` straight into save.renderWidth would
    // leave this at 3, not 640 — see this task's report for the mutation
    // that proved it.
    expect(save.renderWidth).toBe(640);
    expect(save.renderWidth).not.toBe(idx);

    // Proves the write actually went through sizeRender (the one function
    // that owns resize behavior), not a parallel path: the live renderer
    // size changed too.
    expect(renderState.renderer.getSize(new THREE.Vector2()).width).toBe(640);
    expect(document.getElementById("resVal")!.textContent).toBe("640");
  });

  it("flushes the new width to storage on input", () => {
    initMenus(() => {});
    const sl = document.getElementById("resSlider") as HTMLInputElement;
    fireInput(sl, "0"); // RENDER_WIDTHS[0] === 320
    const stored = JSON.parse(localStorage.getItem("blacksilence.save")!);
    expect(stored.renderWidth).toBe(320);
  });
});

describe("initMenus — master volume", () => {
  it("applies an already-loaded save.masterVolume — not just leaving it stored — so it reaches the gain node", () => {
    // Simulates loadSave() having already populated `save` (main.ts runs
    // loadSave() before initMenus(), see main.ts) with a non-default value.
    save.masterVolume = 0.8;
    initMenus(() => {});

    // AudioEngine's own state, not just `save` — this is the bridge THE TRAP
    // section of this task's brief asks about: without it, getMasterVolume()
    // would still report AudioEngine's module-scope default (0.5) no matter
    // how long loadSave() ran first, because nothing else ever reads
    // save.masterVolume into masterVol.
    expect(getMasterVolume()).toBe(0.8);

    // And once the audio graph actually exists (audioInit() runs from
    // startGame, not at boot), it is built from the now-correct value.
    audioInit();
    expect(masterBus().gain.value).toBe(0.8);
  });

  it("moving the volume slider still persists (Task 1's gap this task closes)", () => {
    initMenus(() => {});
    const sl = document.getElementById("volSlider") as HTMLInputElement;
    fireInput(sl, "25");
    expect(save.masterVolume).toBe(0.25);
    const stored = JSON.parse(localStorage.getItem("blacksilence.save")!);
    expect(stored.masterVolume).toBe(0.25);
  });
});

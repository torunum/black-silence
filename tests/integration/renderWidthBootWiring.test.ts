// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { SAVE_VERSION } from "../../src/save/persist";

const KEY = "blacksilence.save";

/**
 * Plan 0F/Phase 1 Task 2's own version of the wiring gap
 * `schedulerWiring.test.ts`/`gpuDisposeWiring.test.ts`/
 * `timerCancellationWiring.test.ts` each closed for an earlier task: a
 * property no module test can see because it depends on **evaluation
 * order** across the real, unmocked boot sequence.
 *
 * THE TRAP (see this task's brief and report): `RenderCore.ts` ends with a
 * module-scope `addEventListener("resize",sizeRender);sizeRender();`.
 * `RenderCore.ts` is in `main.ts`'s transitive import graph, so that call
 * runs *before* `main.ts`'s own top-level `loadSave()` — always, no matter
 * what `sizeRender` itself reads. A `sizeRender` that reads
 * `save.renderWidth` is therefore not enough on its own: the first call
 * (the one that actually decides what the player sees before their first
 * interaction) always sees `save.renderWidth`'s *module-load default*
 * (400), because the load that would have overwritten it hasn't run yet.
 *
 * `tests/render/resolution.test.ts` proves `sizeRender` reads
 * `save.renderWidth` and that 400 is the default; neither of those alone
 * proves a *stored, non-default* width actually reaches the renderer before
 * the first frame, which is the failure this file exists to catch — a fix
 * that reads the right field but runs at the wrong time still leaves this
 * red.
 *
 * ## Why a sibling file, not an addition to resolution.test.ts
 *
 * `src/main.ts` boots — and, transitively, `RenderCore.ts` captures its
 * WebGL canvas — once, at import time, and Vitest evaluates a module once
 * per test file. This file needs `localStorage` populated with a
 * non-default width *before* that one-time boot happens; a second scenario
 * in the same file (like resolution.test.ts's default-width checks) would
 * either run after this file's boot already consumed the fresh module
 * state, or force this file's boot to run first and leave the other
 * describe block's "400 is still the default" assumption sharing a `save`
 * already mutated to 640. Two boots need two files.
 */
beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  // Simulates a returning player who previously chose 640 in Settings —
  // written in persist.ts's own on-disk shape, not by importing `save` and
  // assigning to it, so this file proves the real load path end to end
  // rather than pre-seeding in-memory state that boot happens to already hold.
  localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, renderWidth: 640 }));

  // Dynamic, not top-of-file, for the same reason resolution.test.ts's
  // header explains: RenderCore.ts (imported transitively by main.ts)
  // captures the WebGL canvas at its own module scope the instant it is
  // first evaluated, which must happen after installDomStubs()/
  // loadGameHtml() above and after the localStorage.setItem above.
  await import("../../src/main");
});

describe("boot order — a stored renderWidth must be applied before the first frame", () => {
  it("sizes the renderer at the stored width (640), not RenderCore's module-scope default (400)", () => {
    const size = renderState.renderer.getSize(new THREE.Vector2());
    expect(size.width).toBe(640);
    expect(size.width).not.toBe(400);
  });
});

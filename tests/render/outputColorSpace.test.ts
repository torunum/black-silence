// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { readModuleSource } from "../support/readModuleSource";
import { renderState } from "../../src/render/Renderer";

/**
 * The sRGB output setting, pinned on the renderer that actually exists —
 * the other half of `docs/known-issues.md` KNOWN-14's tripwire.
 *
 * The line this replaces was `if (THREE.sRGBEncoding !== undefined)
 * renderState.renderer.outputEncoding = THREE.sRGBEncoding;`. It was written
 * as a guard so an upgrade would be *noticed*, and it failed at exactly
 * that: on any three newer than r151 the guard is false, the assignment
 * never runs, sRGB output silently switches off, and every test in this
 * repository stays green because none of them samples a pixel.
 *
 * KNOWN-14's own warning is that the same mistake is just as available in
 * the other direction — an unconditional assignment that a future three
 * quietly ignores, or that some later refactor drops, is equally invisible.
 * `tsc --noEmit` catches the property being renamed or removed. It does not
 * catch the assignment being deleted, reordered behind the renderer's
 * construction, or wrapped in a condition again. This file does.
 *
 * Two assertions, deliberately at two different levels:
 *
 * 1. **The value on the live renderer, after a real boot.** This is the one
 *    that matters: it survives any refactor that keeps the behaviour, and
 *    fails for any that loses it, wherever the assignment ends up living.
 * 2. **That the assignment is unconditional in the source.** Narrow and
 *    textual on purpose. Assertion 1 alone would still pass if someone
 *    re-introduced a `!== undefined` guard around a constant that happens to
 *    be defined today — which is precisely the shape that produced KNOWN-14,
 *    and which would go quiet again at the next rename.
 */

beforeAll(() => {
  installDomStubs();
  loadGameHtml();
});

describe("renderer output colour space", () => {
  it("is sRGB on the live renderer after boot", async () => {
    await import("../../src/render/RenderCore");
    expect(renderState.renderer.outputColorSpace).toBe(THREE.SRGBColorSpace);
    // Guard the guard: SRGBColorSpace is a real, distinct value and not
    // `undefined` matching `undefined`, which is how the old line passed for
    // three years while doing nothing on modern three.
    expect(THREE.SRGBColorSpace).toBeTruthy();
    expect(renderState.renderer.outputColorSpace).not.toBe(undefined);
  });

  it("is assigned unconditionally in RenderCore.ts, with no guard of any kind", () => {
    const src = readModuleSource("src/render/RenderCore.ts")
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("//") && !l.trimStart().startsWith("*"))
      .join("\n");

    const assignments = src.split("\n").filter((l) => l.includes("outputColorSpace"));
    expect(assignments).toHaveLength(1);
    expect(assignments[0].trim()).toBe("renderState.renderer.outputColorSpace = THREE.SRGBColorSpace;");

    // The old spelling must not come back, in either half.
    expect(src).not.toContain("outputEncoding");
    expect(src).not.toContain("sRGBEncoding");
  });
});

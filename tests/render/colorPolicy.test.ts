import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { readModuleSource } from "../support/readModuleSource";

/**
 * COLOUR POLICY — the Phase 2B upgrade's single most consequential line, and
 * the measurement that turns `docs/known-issues.md` KNOWN-14's central claim
 * from an assertion into a number.
 *
 * ## What this file pins
 *
 * 1. `THREE.ColorManagement.enabled` is **false**, and it is false *before*
 *    the modules that build coloured materials at module scope run. That
 *    ordering is the whole reason `src/render/ColorPolicy.ts` is a module
 *    imported for side effect instead of a line inside `RenderCore.ts`: the
 *    flag is read by `Color.setHex` at construction time, so a module that
 *    built its materials first would keep colour-managed values while the
 *    rest of the game did not — a silent half-and-half nothing else here
 *    could see.
 *
 * 2. The reason the three committed trace fixtures did **not** move across
 *    the r128 -> r186 upgrade: `digestScene` (`tests/integration/
 *    gameplayTrace.ts`) records each material colour as
 *    `m.color.getHex().toString(16)`, and `getHex()` re-encodes from the
 *    working colour space back to sRGB. `setHex` -> `getHex` is therefore
 *    an exact round trip *whichever way the flag is set*, so the digest is
 *    structurally blind to this flag. Measured here rather than argued.
 *
 * ## Why (2) is worth a test rather than a comment
 *
 * KNOWN-14 has deferred this upgrade twice on the grounds that "a colour
 * management change is invisible to every test in this repository". Phase 3
 * Part B then added material colour to the scene digest, which made that
 * claim look stale — the fixtures now carry a `:c=` segment per material.
 * They still did not move. Without this test the next reader has no way to
 * tell whether that means "colour management changed nothing" (false) or
 * "the digest cannot see colour management" (true, and the thing that has to
 * stay written down). The counterfactual was also run for real: flipping
 * `ColorPolicy.ts` to `enabled = true` and re-running all three trace files
 * left all 20 trace tests green and all three fixtures byte-identical.
 *
 * **Consequence, stated plainly:** the fixtures being green is not evidence
 * that the upgraded game looks like the original. It is evidence that the
 * game's *structure* — object count, type, position, visibility, sprite
 * frame, and the sRGB hex of every material colour — is unchanged. Rendered
 * brightness, light falloff and the tone-mapped result are outside what any
 * test in this repository can reach; see the honest list in
 * `.superpowers/sdd/2026-09-14-phase2b-threejs-evaluated/task-1-report.md`.
 */

/** three's own sRGB -> linear transfer, transcribed from ColorManagement. */
function srgbToLinear(c: number): number {
  return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
}

function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...srcFiles(p));
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

/**
 * Every 6-digit hex literal the game authors, derived from `src/` at run
 * time rather than hand-copied — the same discipline
 * `tests/enemies/deadDefFields.test.ts` uses, and for the same reason: a
 * hand-written list of this project's colours has been wrong before.
 */
function authoredColours(): number[] {
  const seen = new Set<number>();
  for (const f of srcFiles("src")) {
    for (const m of readModuleSource(f).matchAll(/0x[0-9a-fA-F]{6}\b/g)) {
      seen.add(Number(m[0]));
    }
  }
  return [...seen].sort((a, b) => a - b);
}

describe("colour policy", () => {
  it("has ColorManagement off by the time a module-scope material is built", async () => {
    const { poolMat, splatMat, holeMat, scorchMat } = await import("../../src/fx/Decals");

    expect(THREE.ColorManagement.enabled).toBe(false);

    // poolMat is `new THREE.MeshBasicMaterial({ color: 0x4a0d06 })` at
    // module scope in src/fx/Decals.ts. Its raw channel is the assertion
    // that matters: `getHex()` would read 0x4a0d06 back either way (that is
    // the point of the second test below), so only the stored value can
    // tell the two configurations apart.
    expect(poolMat.color.r).toBe(0x4a / 255);
    expect(poolMat.color.g).toBe(0x0d / 255);
    expect(poolMat.color.b).toBe(0x06 / 255);

    // Guard the guard: the colour-managed value is genuinely different, so
    // the assertion above cannot pass by coincidence.
    expect(srgbToLinear(0x4a / 255)).not.toBe(0x4a / 255);

    // The other three module-scope materials in the same file, so a partial
    // regression (one material built before the flag was set) is caught.
    for (const [mat, hex] of [[splatMat, 0x5a1008], [holeMat, 0x0c0d10], [scorchMat, 0x0a0a0a]] as const) {
      expect(mat.color.r).toBe(((hex >> 16) & 255) / 255);
      expect(mat.color.g).toBe(((hex >> 8) & 255) / 255);
      expect(mat.color.b).toBe((hex & 255) / 255);
    }
  });

  it("every module that builds a coloured material at module scope imports ColorPolicy", () => {
    // Derived, not listed: find the files whose module-scope body (a line
    // with no leading whitespace, so not inside a function) constructs a
    // THREE material or Color carrying a colour, and require the side-effect
    // import on each. A new such module added without the import would be a
    // silent half-colour-managed game.
    const offenders: string[] = [];
    let checked = 0;
    for (const f of srcFiles("src")) {
      const src = readModuleSource(f);
      const buildsColourAtModuleScope = src
        .split("\n")
        .some((l) => /^(?:export\s+)?const\s.*new THREE\.(?:\w*Material|Color)\b/.test(l) && /color\s*:|new THREE\.Color/.test(l));
      if (!buildsColourAtModuleScope) continue;
      checked++;
      if (!/import ["'][^"']*render\/ColorPolicy["']/.test(src)) offenders.push(f);
    }
    // Guard: if the scan stops finding anything, it is broken, not clean.
    expect(checked).toBeGreaterThanOrEqual(3);
    expect(offenders).toEqual([]);
  });

  it("the scene digest's :c= segment cannot see ColorManagement at all — KNOWN-14, measured", () => {
    const colours = authoredColours();
    // Guard: the derivation really found this game's palette.
    expect(colours.length).toBeGreaterThan(50);

    // `digestScene`'s exact expression, run against every authored colour
    // with the flag in both positions. If either column ever stops being an
    // identity, the fixtures gain the ability to see a colour-space change
    // and KNOWN-14's reasoning has to be revisited.
    const digestOf = (hex: number): string => {
      const c = new THREE.Color();
      c.setHex(hex);
      return c.getHex().toString(16).padStart(6, "0");
    };
    const expected = colours.map((h) => h.toString(16).padStart(6, "0"));

    expect(THREE.ColorManagement.enabled).toBe(false);
    expect(colours.map(digestOf)).toEqual(expected);

    THREE.ColorManagement.enabled = true;
    try {
      expect(colours.map(digestOf)).toEqual(expected);
    } finally {
      THREE.ColorManagement.enabled = false;
    }
    expect(THREE.ColorManagement.enabled).toBe(false);
  });
});

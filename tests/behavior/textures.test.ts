// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { evalReference, REF, refSource } from "../support/reference";
import { installDomStubs } from "../support/domStubs";
import { recordingCanvas, type DrawCall } from "../support/recordingCanvas";
import { seedRandom } from "../support/seededRandom";
import { buildTextures as moduleBuildTextures } from "../../src/render/ProcTextures";
import { texFromPx as moduleTexFromPx } from "../../src/enemies/SpriteBaker";
import { buildItemTex as moduleBuildItemTex } from "../../src/render/ItemTextures";
import { PXDEF } from "../../src/enemies/pixels";

/**
 * The behavioral oracle (see docs/known-issues.md KNOWN-5 and
 * .superpowers/sdd/2026-08-09-phase0c-oracle-and-fx/task-1-brief.md).
 *
 * tests/fidelity.test.ts proves extraction fidelity by comparing *source
 * text* against the reference — that only works while code moves verbatim.
 * This file proves the same fidelity a different way: run the reference's
 * drawing code and the ported module's drawing code side by side against a
 * recording 2D context (tests/support/recordingCanvas.ts) and assert the
 * ordered call logs are identical. A log comparison survives renames,
 * reformatting, and (later plans') state refactors, because it only cares
 * what got *drawn*, not how the code that drew it is shaped.
 *
 * All three generators here call Math.random() (directly, or via
 * src/utils/math.ts's rnd/pick) — noiseFill alone calls it hundreds of
 * times per texture — so both sides are run under the same seedRandom seed,
 * consuming an identical pseudo-random sequence in an identical order. The
 * reference side executes in a vm sandbox (tests/support/reference.ts's
 * evalReference) with its own separate realm intrinsics; Math is passed in
 * as an explicit global specifically so the seeded Math.random installed on
 * *this* realm is the one the sandboxed code actually calls — an uninjected
 * sandbox gets its own independent Math and would silently ignore the seed.
 */

installDomStubs();

/** Points HTMLCanvasElement.prototype.getContext("2d") at a fresh recording context for the duration of `run`, restoring the previous getContext afterward. Every canvas created during `run` shares the same call log, in creation order — buildTextures/buildItemTex each create many canvases (one per texture), and the log is their concatenation, exactly like a single recording session across the whole build. */
function recordCanvasCalls(seed: number, run: () => void): DrawCall[] {
  const { ctx, calls } = recordingCanvas();
  const previousGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = ((kind: string) =>
    kind === "2d" ? ctx : null) as typeof HTMLCanvasElement.prototype.getContext;
  const restoreRandom = seedRandom(seed);
  try {
    run();
  } finally {
    restoreRandom();
    HTMLCanvasElement.prototype.getContext = previousGetContext;
  }
  return calls;
}

describe("buildTextures behavioral parity with reference", () => {
  it("draws a non-trivially long, identical ordered sequence of canvas calls as the reference", () => {
    const refModule = evalReference<{ buildTextures: () => void }>(
      [refSource(REF.mathHelpers), refSource(REF.procTextures)],
      "({buildTextures})",
      { document, THREE, Math },
    );

    const referenceCalls = recordCanvasCalls(1, () => refModule.buildTextures());
    const moduleCalls = recordCanvasCalls(1, () => moduleBuildTextures());

    // A recorder that can pass on an empty log proves nothing (see the
    // brief's "a recorder that cannot fail is worse than no test").
    expect(referenceCalls.length).toBeGreaterThan(2000);
    expect(moduleCalls).toEqual(referenceCalls);
  });
});

describe("texFromPx behavioral parity with reference (one representative sprite)", () => {
  it("draws an identical ordered sequence of canvas calls as the reference, across plain, mirrored and dismembered variants", () => {
    const refModule = evalReference<{
      texFromPx: (px: string[], pal: Record<string, string>, opts?: unknown) => unknown;
    }>([refSource(REF.texFromPx)], "({texFromPx})", { document, THREE, Math });

    // "z" (ROTTING GHOUL): head:8, a representative dismemberable grunt —
    // exercises the bevel-edge logic and (with masks+stumps below) the
    // wet-stump-at-torn-edge logic, which a plain no-opts call never
    // reaches.
    const { px, pal, head } = PXDEF.z;
    const w = px[0].length;
    const headMask = [[0, 0, w, head ?? 0]];

    const run = (fn: typeof moduleTexFromPx) => {
      fn(px, pal);
      fn(px, pal, { mirror: true });
      fn(px, pal, { masks: headMask, stumps: true });
      fn(px, pal, { masks: headMask, stumps: true, mirror: true });
    };

    const referenceCalls = recordCanvasCalls(2, () => run(refModule.texFromPx as typeof moduleTexFromPx));
    const moduleCalls = recordCanvasCalls(2, () => run(moduleTexFromPx));

    expect(referenceCalls.length).toBeGreaterThan(50);
    expect(moduleCalls).toEqual(referenceCalls);
  });
});

describe("buildItemTex behavioral parity with reference", () => {
  it("draws an identical ordered sequence of canvas calls as the reference", () => {
    const refModule = evalReference<{ buildItemTex: () => void }>(
      [refSource(REF.texFromPx), refSource(REF.itemTex)],
      "({buildItemTex})",
      { document, THREE, Math },
    );

    const referenceCalls = recordCanvasCalls(3, () => refModule.buildItemTex());
    const moduleCalls = recordCanvasCalls(3, () => moduleBuildItemTex());

    expect(referenceCalls.length).toBeGreaterThan(50);
    expect(moduleCalls).toEqual(referenceCalls);
  });
});

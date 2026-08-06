import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

const REFERENCE_PATH = join(__dirname, "..", "..", "reference", "sonsurum.html");

let cachedLines: string[] | undefined;

function referenceLines(): string[] {
  if (!cachedLines) cachedLines = readFileSync(REFERENCE_PATH, "utf8").split(/\r\n|\n/);
  return cachedLines;
}

/**
 * Registry of stable 1-indexed, inclusive line ranges into
 * reference/sonsurum.html. Safe to hardcode: the reference is frozen (see
 * the Phase 0 Global Constraints — it is never edited), so these numbers
 * do not drift underneath us.
 *
 * When a future plan carves more code out of legacy.js, add its reference
 * range here rather than inlining line numbers in a test — that keeps
 * tests/fidelity.test.ts as the single place that grows.
 */
export const REF = {
  /** emptyGrid, link, put, putAbs, blankGrid, carve, hall, aperture, pillarsRing, roomXZ. */
  levelBuilder: [229, 273],
  /** put1, declared just after buildLevel1 rather than inside the BUILDER-BEGIN/END block. */
  put1: [375, 375],
  buildPrologue: [275, 313],
  buildLevel1: [314, 374],
  buildLevel2: [376, 434],
  buildLevel3: [437, 518],
  buildLevel4: [520, 578],
  buildLevel5: [579, 639],
  buildLevel6: [640, 700],
  buildLevel7: [701, 758],
  /** The LEVELS metadata table. */
  levels: [759, 776],
  /** const M={...} — ADEM's monologue lines. */
  monologue: [781, 885],
  /** const WEAPONS=[...] — 8 slots, stats plus snd closures. */
  weapons: [1919, 1944],
  /** const EDEF={...} — the enemy roster. */
  enemyDefs: [2678, 2716],
  /** const rnd=..., clamp=..., pick=... — needed alongside procTextures below, which calls rnd/pick. */
  mathHelpers: [214, 216],
  /** makeTex, noiseFill, const TEX={}, and buildTextures — the procedural texture generator. */
  procTextures: [917, 1084],
} as const satisfies Record<string, readonly [number, number]>;

/** Reference source text for a [start, end] 1-indexed inclusive line range. */
export function refSource(range: readonly [number, number]): string {
  const [start, end] = range;
  return referenceLines()
    .slice(start - 1, end)
    .join("\n");
}

/**
 * Evaluates one or more self-contained reference source chunks (function
 * declarations, or const object/array literals, with no DOM or THREE
 * dependency) together in a fresh sandbox, then returns the value of
 * `expr` evaluated in that same sandbox.
 *
 * Deliberately never imports src/legacy.js itself: legacy.js reaches into
 * `document` and `THREE` at module scope (e.g. building the WebGL
 * renderer) and cannot be loaded outside a browser. Extracting the pure
 * chunks by line range and evaluating them in isolation is the only way
 * to get real reference *values* into a Node test process.
 *
 * `globals` seeds the sandbox's global object before `chunks` runs — the
 * one legitimate reason a chunk needs it is a dependency this function's
 * own doc comment disclaims (DOM or THREE), e.g. the texture generator's
 * `document.createElement("canvas")` and `new THREE.CanvasTexture(...)`.
 * Objects passed this way are the caller's real objects/classes, not
 * cross-realm copies, so `instanceof` and prototype methods behave exactly
 * as they do outside the sandbox.
 */
export function evalReference<T>(
  chunks: readonly string[],
  expr: string,
  globals: Record<string, unknown> = {},
): T {
  const code = `${chunks.join("\n")}\n(${expr});`;
  return runInNewContext(code, { ...globals }, { filename: "reference/sonsurum.html (sandbox)" }) as T;
}

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
  /** texFromPx — bakes a PXDEF creature's rows into a canvas texture, including the dismemberment mask/stump logic. */
  texFromPx: [1089, 1125],
  /** PXDEF — 361 lines of ASCII sprite data for all 31 creatures (grunts, demons, bosses and their alternate forms). */
  pxdef: [1126, 1486],
  /** const PX={} and buildSprites — bakes every PXDEF entry's walk pair, dismemberment frames, attack pose and death frames. */
  buildSprites: [1487, 1516],
  /** pickupTex, const ITEMTEX={}, and buildItemTex — the pickup/prop art: health, every ammo type, armor, the key, weapon pickups, torch (2-frame) and candle. */
  itemTex: [1517, 1531],
  /**
   * `let AC=null,masterG=null,echoG=null,bossPulse=null,masterVol=.5;` — the
   * audio engine's live state. Task 5 (see src/audio/AudioEngine.ts) turns
   * this into private module state behind accessor functions, because bare
   * exported `let` bindings can't cross an ES module boundary the way a
   * global `var` could — so this range is NOT compared byte-for-byte
   * anywhere. What fidelity.test.ts does pin from it is the one fact that
   * would be a real behavior change if it drifted: the default `masterVol`
   * of 0.5 that AudioEngine's getMasterVolume() must still return before
   * audioInit()/setMasterVolume() ever run.
   */
  audioState: [1649, 1649],
  /** audioInit — builds the echo/delay feedback loop, the ambience lowpass, and starts the four detuned drone oscillators (with LFOs modulating their gain) that are the game's ambient bed. */
  audioInit: [1650, 1664],
  /** blip — the general-purpose tone/sweep effect used by nearly every gunshot, UI beep and monster cue. */
  blip: [1665, 1679],
  /** bang — filtered-noise transient used for footsteps, impacts and static. */
  bang: [1680, 1690],
  /** click — a bang() preset for UI clicks. References neither AC, masterG nor echoG directly, so it carries over untouched by Task 5's accessor rewrite. */
  click: [1691, 1691],
  /** boom — the one clean explosion sound: a sub thud (sine drop) plus a soft lowpassed noise tail. */
  boom: [1693, 1709],
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

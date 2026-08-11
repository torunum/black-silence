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
  /**
   * buildParticles/spawnP/blood/sparks/smoke3d/fireP/holyP/toxicP/emberP/
   * partTick, then the pools/wallDecals/gibs state, materials, POOLMAX/
   * WDMAX/GIBMAX, and addPool/poolTick/addWallDecal/spawnGibs/gibTick — the
   * PARTICLES / DECALS / GIBS section (see src/fx/Particles.ts, Decals.ts,
   * Gibs.ts). `heads` is declared on the same `let` line (1596) but its
   * logic lives elsewhere and is not part of this range's behavior.
   */
  particlesDecalsGibs: [1548, 1644],
  /** woodP — the stray particle helper filed under the reference's "AMBIENT AUDIO + MISSING PARTICLE HELPER" banner, far from the rest of PARTICLES/DECALS/GIBS. Ambient audio itself (ambience/vitalsAudio, same banner) is a later plan's concern. */
  woodP: [2650, 2652],
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
  /** noiseBuf — a random-sample AudioBuffer generator, the raw material every guttural voice/door filters into shape. No `if(!AC)return;` guard of its own; only ever called from functions that have already checked AC. */
  noiseBuf: [1713, 1717],
  /** growl — low throaty roar: detuned rumble oscillators, a breathy noise layer through a moving bandpass "throat", and a vocal-cord tremolo LFO. */
  growl: [1719, 1743],
  /** gurgle — wet bubbling viscera: lowpassed noise plus a wobbling sawtooth pitch. */
  gurgle: [1745, 1757],
  /** pain — short rising-then-falling throaty yelp: a bandpassed sawtooth plus a highpassed noise burst. */
  pain: [1759, 1773],
  /** deathCry — a growl collapsing into a gurgle 180ms later. */
  deathCry: [1775, 1778],
  /** snarl — per-enemy-archetype sighting cue, dispatching to growl/blip/bang by kind. */
  snarl: [1780, 1792],
  /** wetDoor — tearing membrane/squelch (lowpassed noise sweep) plus a low organic bandpassed groan, then a gurgle 260ms later. */
  wetDoor: [1794, 1811],
  /** stoneDoor — deep grind (bandpassed noise sweep) plus a low square-wave thud. */
  stoneDoor: [1813, 1826],
  /** bellToll — three detuned sine partials with staggered decay. */
  bellToll: [1827, 1828],
  /** organChord — four sustained square-wave partials. */
  organChord: [1829, 1830],
  /** pianoNote — a MIDI-to-frequency triangle+sine partial stack with a 1.4s decay. */
  pianoNote: [1831, 1839],
  /** startBossMusic — the setInterval-driven boss pulse; guards on `bossPulse` so a second call doesn't stack a second interval. */
  startBossMusic: [1840, 1846],
  /** stopBossMusic — clears and nulls bossPulse. */
  stopBossMusic: [1847, 1847],
  /**
   * The fx2d overlay canvas + FW/FH/VW/VH + sizeFx, the casing/puff/
   * blood-hit arrays, ejectCasing and screenBlood — src/render/Overlay2D.ts.
   */
  overlay2d: [2198, 2212],
  /**
   * SKIN/SLEEVE/BOOT/DARK/MID/LIT/RUST/WOOD/GLOW/HOLY, the VM palette,
   * vRect/vFlat/vGrad/vBarrel/vTube/vWood/vScrew/vHole/vTrigger, and MUZ —
   * src/render/viewmodel/kit.ts.
   */
  viewmodelKit: [2213, 2263],
  /**
   * pxCanvas, GP, WPX, wcv and buildWeaponSprites (including every weapon's
   * inline pistolIdle/sgIdle/... row-array literals) —
   * src/render/viewmodel/sprites.ts and its pixels/weapons0.ts, weapons1.ts.
   */
  viewmodelSprites: [2264, 2509],
  /**
   * buildWeaponSprites alone, without pxCanvas/GP/WPX/wcv above it — lets a
   * caller override pxCanvas (e.g. to the identity function, so reg()'s
   * frames.map(f=>pxCanvas(f,GP)) hands back raw row arrays instead of a
   * baked, JSON-opaque canvas) via evalReference's globals. Injecting a
   * pxCanvas global against REF.viewmodelSprites instead would not work:
   * that chunk's own `function pxCanvas(...)` declaration would win once
   * evaluated (a chunk's top-level function declarations bind on the
   * sandbox's global object the same way a script's would, overwriting
   * whatever the caller injected under the same name) — see
   * tests/behavior/viewmodel.test.ts's referenceWeaponFrames.
   */
  viewmodelBuildWeaponSprites: [2310, 2509],
  /**
   * frameFor, fxTick, drawKickBoot and drawViewmodel — frameFor/
   * drawKickBoot/drawViewmodel live in src/render/viewmodel/draw.ts; fxTick
   * lives in src/render/Overlay2D.ts (see REF.overlay2d's doc comment for
   * why fxTick moved apart from the draw functions it calls).
   */
  viewmodelDraw: [2510, 2646],
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

// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import * as Builder from "../src/world/LevelBuilder";
import { LEVELS } from "../src/world/levels";
import { ENEMY_DEFS } from "../src/enemies/EnemyDefs";
import { WEAPON_STATS } from "../src/weapons/definitions";
import { MONOLOGUE } from "../src/content/monologue";
import { TEX, buildTextures } from "../src/render/ProcTextures";
import { PXDEF } from "../src/enemies/pixels";
import { PX, buildSprites } from "../src/enemies/SpriteBaker";
import { ITEMTEX, buildItemTex } from "../src/render/ItemTextures";
import { getMasterVolume } from "../src/audio/AudioEngine";
import { WEAPON_ART } from "../src/render/viewmodel/arts";
import { MATERIALS } from "../src/render/viewmodel/palette";
import { loadGameHtml } from "./support/domStubs";
import type * as ViewmodelKit from "../src/render/viewmodel/kit";
import { evalReference, REF, refSource } from "./support/reference";
import { installDomStubs } from "./support/domStubs";
import { normalizeTsSource } from "./support/normalizeTsSource";
import { readModuleSource } from "./support/readModuleSource";
import { assertNoDanglingQuote } from "./support/assertNoDanglingQuote";

/**
 * The fidelity oracle. reference/sonsurum.html is a frozen golden master —
 * see the Phase 0 Global Constraints, "reference/sonsurum.html is never
 * edited" — but until this file, nothing in the suite actually consulted
 * it. Every "this was extracted verbatim" claim on this branch was proved
 * by a throwaway script and then discarded.
 *
 * This test parses the reference, evaluates the relevant source blocks out
 * of it (see tests/support/reference.ts), and deep-compares them against
 * what the modules now export. To extend it as later plans carve more code
 * out: add the new range to REF in tests/support/reference.ts, then add a
 * describe block here following the pattern of the ones below.
 */

const LEVEL_BUILDER_CHUNKS = [refSource(REF.levelBuilder), refSource(REF.put1)];

describe("LevelBuilder vs. reference (fixture comparison)", () => {
  const ref = evalReference<typeof Builder>(
    LEVEL_BUILDER_CHUNKS,
    "({emptyGrid,link,put,putAbs,blankGrid,carve,hall,aperture,pillarsRing,roomXZ,put1})",
  );

  it("emptyGrid/link/put/putAbs agree on a room-lattice fixture", () => {
    const run = (fns: typeof ref) => {
      const L = fns.emptyGrid(3, 2, 5, 4);
      fns.link(L, [0, 0], [1, 0], "door");
      fns.link(L, [1, 0], [2, 0], "locked");
      fns.link(L, [0, 0], [0, 1], "secret");
      fns.link(L, [1, 0], [1, 1], "open");
      fns.put(L, 0, 0, 2, 1, "K");
      fns.putAbs(L, 4, 4, "z");
      return L.g;
    };
    expect(run(Builder)).toEqual(run(ref));
  });

  it("blankGrid/carve/hall/aperture/pillarsRing/put1 agree on a free-form fixture", () => {
    const run = (fns: typeof ref) => {
      const { g } = fns.blankGrid(14, 10);
      fns.carve(g, 1, 1, 6, 6);
      fns.hall(g, 6, 3, 12, 8, 1);
      fns.aperture(g, 3, 1);
      fns.pillarsRing(g, 1, 1, 6, 6, 2);
      fns.put1(g, 2, 2, "x");
      return g;
    };
    expect(run(Builder)).toEqual(run(ref));
  });

  it("roomXZ agrees on a room-offset fixture", () => {
    const layout = { rw: 5, rh: 4 } as Builder.RoomLayout;
    expect(Builder.roomXZ(layout, 1, 1, 2, 3)).toEqual(ref.roomXZ(layout, 1, 1, 2, 3));
  });
});

interface RefLevelDef {
  name: string;
  build: () => { g: string[][]; W: number; H: number; hmap?: number[][]; segs?: unknown[] };
  fog: number;
  fogD: number;
  amb: number;
  ambI: number;
  floor: string;
  sub: string;
  hell?: boolean;
  dungeon?: boolean;
  flesh?: boolean;
}

const LEVEL_CHUNKS = [
  refSource(REF.levelBuilder),
  refSource(REF.put1),
  refSource(REF.buildPrologue),
  refSource(REF.buildLevel1),
  refSource(REF.buildLevel2),
  refSource(REF.buildLevel3),
  refSource(REF.buildLevel4),
  refSource(REF.buildLevel5),
  refSource(REF.buildLevel6),
  refSource(REF.buildLevel7),
  refSource(REF.levels),
];
const refLevels = evalReference<RefLevelDef[]>(LEVEL_CHUNKS, "LEVELS");

/**
 * Level 2's deliberate divergence from the frozen master (player feedback
 * round 1, task 1). The reference spells this level's church furniture `V`,
 * which `ENEMY_DEFS` also claims as THE FACTORY FOREMAN, so all eight tiles
 * spawned a 2600 hp boss — KNOWN-4, reported by the project owner after
 * playing. The port now spells them `v`, a prop-only pew.
 *
 * This is kept as a *diff*, not as a hole: the grid comparison below is still
 * total, and the reference side is still the authority everywhere else. Only
 * these eight cells may differ, only in this direction, and only in level 2.
 * Adding a ninth divergence — or letting one of these drift back to `V`, or
 * appear in another level — fails the same assertion.
 */
const LEVEL2_PEW_CELLS: ReadonlyArray<readonly [number, number]> = [
  [21, 4],   // (2,0) chapel
  [5, 8],    // (0,1) side aisle
  [12, 8], [20, 8], [12, 10], [20, 10], [12, 13], [20, 13],  // the six nave pews
];

/**
 * The second deliberate divergence (player feedback round 2, KNOWN-11), the
 * same shape as the pews one table over: the reference spells the armour
 * pickup `A`, which `ENEMY_DEFS` also claims as the Mancubus, so every one
 * of these cells spawned a 260 hp enemy and `loadLevel`'s `A:"armor"` entry
 * was unreachable dead code. The port spells them `r`.
 *
 * **All twenty**, in every level, not only the five the project is keeping —
 * levels 5-7 are parked to `episode2` but still build and are still tested,
 * and a half-fix would leave eleven armed behind a doc row claiming the bug
 * is closed. Cells are listed rather than counted so that a tile drifting
 * back to `A`, moving, or appearing in a new place fails this assertion;
 * they were derived by *building* every level and scanning the grid, never
 * by reading the `put()` calls as source text (the undercounting trap
 * `tests/world/rosterReach.test.ts`'s `PLACED` comment documents).
 */
const ARMOUR_CELLS: Readonly<Record<string, ReadonlyArray<readonly [number, number]>>> = {
  "LEVEL 1 — THE GOTHIC DUNGEON": [[40, 25]],
  "LEVEL 2 — THE ABANDONED CHURCH": [[28, 9], [4, 23]],
  "LEVEL 3 — THE NECROPOLIS": [[30, 20], [4, 21], [20, 21]],
  "LEVEL 4 — THE GRAVEYARD": [[30, 20], [4, 21], [20, 21]],
  "LEVEL 5 — THE SEWERS": [[6, 20], [30, 20], [20, 21]],
  "LEVEL 6 — THE FACTORY": [[26, 2], [6, 20], [19, 20], [30, 22]],
  "LEVEL 7 — THE WOMB": [[26, 2], [6, 20], [26, 20], [20, 21]],
};

/** Every cell where two grids disagree, as `x,z ref->ours` strings. */
function gridDiff(ours: string[][], ref: string[][]): string[] {
  const out: string[] = [];
  for (let z = 0; z < Math.max(ours.length, ref.length); z++) {
    const a = ours[z] ?? [], b = ref[z] ?? [];
    for (let x = 0; x < Math.max(a.length, b.length); x++) {
      if (a[x] !== b[x]) out.push(`${x},${z} ${b[x]}->${a[x]}`);
    }
  }
  return out.sort();
}

describe("LEVELS vs. reference", () => {
  it("declares the same eight levels, in order, with identical metadata", () => {
    const meta = (defs: ReadonlyArray<{ build: unknown }>) =>
      defs.map(({ build, ...rest }) => rest);
    expect(meta(LEVELS)).toEqual(meta(refLevels));
  });

  it.each(LEVELS.map((def, i) => [def.name, def, refLevels[i]] as const))(
    "%s builds the reference grid, cell for cell, apart from level 2's eight pews and the twenty armour tiles",
    (name, def, refDef) => {
      const built = def.build();
      const refBuilt = refDef.build();
      const pews = name === "LEVEL 2 — THE ABANDONED CHURCH"
        ? LEVEL2_PEW_CELLS.map(([x, z]) => `${x},${z} V->v`)
        : [];
      const armour = (ARMOUR_CELLS[name] ?? []).map(([x, z]) => `${x},${z} A->r`);
      const expected = [...pews, ...armour].sort();
      expect(gridDiff(built.g, refBuilt.g)).toEqual(expected);
      expect(built.hmap).toEqual(refBuilt.hmap);
      expect(built.segs).toEqual(refBuilt.segs);
    },
  );
});

describe("ENEMY_DEFS vs. reference", () => {
  const refEdef = evalReference<typeof ENEMY_DEFS>([refSource(REF.enemyDefs)], "EDEF");

  it("has the identical key set", () => {
    expect(Object.keys(ENEMY_DEFS).sort()).toEqual(Object.keys(refEdef).sort());
  });

  it("matches every field of every entry", () => {
    expect(ENEMY_DEFS).toEqual(refEdef);
  });
});

describe("WEAPON_STATS vs. reference", () => {
  interface RefWeapon extends Record<string, unknown> {
    snd: () => void;
  }
  const refWeapons = evalReference<RefWeapon[]>([refSource(REF.weapons)], "WEAPONS");

  it("matches every field except snd, slot for slot, in order", () => {
    const stripped = refWeapons.map(({ snd, ...rest }) => rest);
    expect(WEAPON_STATS).toEqual(stripped);
  });
});

describe("MONOLOGUE vs. reference", () => {
  const refM = evalReference<typeof MONOLOGUE>([refSource(REF.monologue)], "M");

  it("has the identical key set", () => {
    expect(Object.keys(MONOLOGUE).sort()).toEqual(Object.keys(refM).sort());
  });

  it("matches every line of every key", () => {
    expect(MONOLOGUE).toEqual(refM);
  });
});

/**
 * Extracts the body of a top-level `function name(...){ ... }` declaration
 * — the text strictly between its opening and closing braces — by
 * balanced-brace scanning forward from the first `{` after the signature.
 * A naive counter is adequate here: every brace in this source is either a
 * block delimiter or part of a `${...}` template placeholder, and template
 * placeholders are always brace-balanced too, so nothing throws the count
 * off.
 *
 * That counter is still blind to string literals in general, though: a `}`
 * sitting inside a string (not a balanced `${...}` pair) would make it stop
 * early, on both sides of a comparison at the same point, so a real diff
 * could silently read as a pass. See assertNoDanglingQuote's doc comment
 * for why the guard against that is a quote-parity check on the extracted
 * text rather than a brace recount, and why a recount could never work.
 */
function extractFunctionBody(source: string, name: string): string {
  const sigIdx = source.indexOf(`function ${name}(`);
  if (sigIdx === -1) throw new Error(`extractFunctionBody: "function ${name}(" not found`);
  const braceIdx = source.indexOf("{", sigIdx);
  let depth = 0;
  let i = braceIdx;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error(`extractFunctionBody: unbalanced braces in "${name}"`);
  const body = source.slice(braceIdx + 1, i);
  assertNoDanglingQuote(body, `extractFunctionBody("${name}")`);
  return body;
}

interface RefProcTextures {
  TEX: Record<string, THREE.CanvasTexture>;
  buildTextures: () => void;
}

describe("ProcTextures (buildTextures) vs. reference", () => {
  // The texture generator draws to a real <canvas> and constructs real
  // THREE.CanvasTexture instances, so — unlike every other block in this
  // file — its reference chunk needs document and THREE seeded into the vm
  // sandbox (see evalReference's `globals` param). It also calls rnd/pick,
  // declared elsewhere in the reference, so mathHelpers rides along.
  let refModule: RefProcTextures;

  beforeAll(() => {
    installDomStubs();
    refModule = evalReference<RefProcTextures>(
      [refSource(REF.mathHelpers), refSource(REF.procTextures)],
      "({TEX, buildTextures})",
      { document, THREE },
    );
    refModule.buildTextures();
    buildTextures();
  });

  it("produces the identical TEX key set as the reference", () => {
    // Pixel content can't be compared under domStubs' no-op 2D context (see
    // tests/support/domStubs.ts), so this is the closest thing to a value
    // comparison available: same keys, built by the same calls.
    expect(Object.keys(TEX).sort()).toEqual(Object.keys(refModule.TEX).sort());
  });

  it("every texture keeps the reference's filter and wrap settings", () => {
    for (const key of Object.keys(TEX)) {
      const ours = TEX[key];
      const ref = refModule.TEX[key];
      expect(ref, `reference TEX.${key} missing`).toBeDefined();
      expect(ours.magFilter, `${key} magFilter`).toBe(ref.magFilter);
      expect(ours.minFilter, `${key} minFilter`).toBe(ref.minFilter);
      expect(ours.wrapS, `${key} wrapS`).toBe(ref.wrapS);
      expect(ours.wrapT, `${key} wrapT`).toBe(ref.wrapT);
    }
  });

  // buildTextures' former byte-identity test (Plan 0B) is retired: it's
  // superseded by tests/behavior/textures.test.ts's ordered draw-call-log
  // comparison, which proves the same fidelity (every drawing call,
  // argument and colour) without requiring source text to stay verbatim —
  // see docs/known-issues.md KNOWN-5.
});

describe("PXDEF vs. reference", () => {
  // Pure data literal — no document/THREE dependency, so this evaluates
  // standalone. This is the single largest body of art in the project (361
  // lines of ASCII sprite rows and hex palettes for 31 creatures); this is
  // the oracle entry that proves it survived the three-way file split intact.
  const refPxdef = evalReference<typeof PXDEF>([refSource(REF.pxdef)], "PXDEF");

  it("has the identical key set, in the identical order", () => {
    // Order isn't behaviorally significant (buildSprites iterates
    // `for...in`), but the brief for this extraction promised it would be
    // preserved, so pin it rather than silently sorting it away.
    expect(Object.keys(PXDEF)).toEqual(Object.keys(refPxdef));
  });

  it("matches every row, every palette entry, and every atk/die frame of every creature", () => {
    expect(PXDEF).toEqual(refPxdef);
  });
});

interface RefSpriteBaker {
  PX: Record<string, Record<string, THREE.CanvasTexture | number | null | undefined>>;
  buildSprites: () => void;
}

describe("SpriteBaker (texFromPx/buildSprites) vs. reference", () => {
  // texFromPx draws to a real <canvas> and constructs real
  // THREE.CanvasTexture instances, so — like ProcTextures above — its
  // reference chunk needs document and THREE seeded into the vm sandbox.
  // PXDEF rides along because buildSprites iterates it by closure.
  let refModule: RefSpriteBaker;

  beforeAll(() => {
    installDomStubs();
    refModule = evalReference<RefSpriteBaker>(
      [refSource(REF.texFromPx), refSource(REF.pxdef), refSource(REF.buildSprites)],
      "({PX, buildSprites})",
      { document, THREE },
    );
    refModule.buildSprites();
    buildSprites();
  });

  it("produces the identical PX key set as the reference", () => {
    expect(Object.keys(PX).sort()).toEqual(Object.keys(refModule.PX).sort());
  });

  it("bakes noHead as null/non-null in agreement with the reference, for every creature", () => {
    for (const key of Object.keys(PX)) {
      const ours = PX[key] as unknown as Record<string, unknown>;
      const ref = refModule.PX[key];
      expect(ours.noHead === null, `${key}.noHead nullness`).toBe(ref.noHead === null);
    }
  });

  it("computes the identical dismemberment regions (W, H, head, armTop, armBot) for every creature", () => {
    for (const key of Object.keys(PX)) {
      const ours = (PX[key] as unknown as Record<string, unknown>).regions;
      const ref = refModule.PX[key].regions;
      expect(ours, key).toEqual(ref);
    }
  });

  it("every baked frame agrees with the reference on presence and keeps its filter settings", () => {
    const frames = [
      "a", "b", "hl", "hlb",
      "noHead", "noHeadB", "noLArm", "noLArmB", "noRArm", "noRArmB", "noLegs", "noLegsB",
      "gibbed", "gibbedB", "atk", "die1", "die2",
    ];
    for (const key of Object.keys(PX)) {
      const oursSprite = PX[key] as unknown as Record<string, THREE.CanvasTexture | null>;
      const refSprite = refModule.PX[key] as unknown as Record<string, THREE.CanvasTexture | null>;
      for (const f of frames) {
        const ours = oursSprite[f];
        const ref = refSprite[f];
        if (ours == null) {
          expect(ref, `${key}.${f} should be null to match ours`).toBeNull();
          continue;
        }
        expect(ref, `reference ${key}.${f} missing`).toBeDefined();
        expect(ours.magFilter, `${key}.${f} magFilter`).toBe(ref!.magFilter);
        expect(ours.minFilter, `${key}.${f} minFilter`).toBe(ref!.minFilter);
      }
    }
  });

  // texFromPx's former byte-identity test (Plan 0B) is retired: it's
  // superseded by tests/behavior/textures.test.ts's texFromPx draw-call-log
  // comparison (plain, mirrored and dismembered/stumped variants on a
  // representative sprite), which proves the same fidelity without
  // requiring source text to stay verbatim — see docs/known-issues.md
  // KNOWN-5.
  //
  // buildSprites itself has no behavior-test coverage — its dismemberment
  // region math (armTop, armBot, the mask rectangles) is arithmetic that
  // decides *what* to pass to texFromPx, not a draw call itself, so a
  // texFromPx-level recorder can't see it — so its body-identity comparison
  // stays. It is code, not data: this port's convention is to annotate
  // every extracted function's signature and, where JS's lenient call arity
  // forces it (buildSprites' local mk/mkM closures), its inline parameter
  // lists too. Byte-identity is incoherent for annotated code — see
  // normalizeTsSource's doc comment — so this compares *normalized* source:
  // strip the TS-only syntax the port adds, then require the remainder to
  // match the reference exactly. PXDEF above stays strictly byte-identical
  // because it is pure data that no annotation ever touches.
  it("buildSprites' body is identical to the reference once TS-only syntax is stripped — the dismemberment mask arithmetic (armTop, armBot, region rectangles) untouched", () => {
    const moduleSource = readModuleSource("src/enemies/SpriteBaker.ts");
    const refChunk = refSource(REF.buildSprites);
    expect(normalizeTsSource(extractFunctionBody(moduleSource, "buildSprites"))).toBe(
      normalizeTsSource(extractFunctionBody(refChunk, "buildSprites")),
    );
  });
});

interface RefItemTextures {
  ITEMTEX: Record<string, THREE.CanvasTexture | THREE.CanvasTexture[]>;
  buildItemTex: () => void;
}

describe("ItemTextures (pickupTex/buildItemTex) vs. reference", () => {
  // Draws to a real <canvas> and constructs real THREE.CanvasTexture
  // instances, like ProcTextures/SpriteBaker above, so the sandbox needs
  // document and THREE. texFromPx rides along by closure because
  // pickupTex/buildItemTex call it.
  let refModule: RefItemTextures;

  beforeAll(() => {
    installDomStubs();
    refModule = evalReference<RefItemTextures>(
      [refSource(REF.texFromPx), refSource(REF.itemTex)],
      "({ITEMTEX, buildItemTex})",
      { document, THREE },
    );
    refModule.buildItemTex();
    buildItemTex();
  });

  it("produces the identical ITEMTEX key set as the reference", () => {
    expect(Object.keys(ITEMTEX).sort()).toEqual(Object.keys(refModule.ITEMTEX).sort());
  });

  it("keeps ITEMTEX.torch a two-frame array and every other entry a single texture, matching the reference", () => {
    for (const key of Object.keys(ITEMTEX)) {
      const ours = ITEMTEX[key];
      const ref = refModule.ITEMTEX[key];
      expect(ref, `reference ITEMTEX.${key} missing`).toBeDefined();
      expect(Array.isArray(ours), `${key} array-ness`).toBe(Array.isArray(ref));
      if (Array.isArray(ours) && Array.isArray(ref)) {
        expect(ours.length, `${key} frame count`).toBe(ref.length);
      }
    }
  });

  it("every texture keeps the reference's filter settings", () => {
    const check = (ours: THREE.CanvasTexture, ref: THREE.CanvasTexture, label: string) => {
      expect(ours.magFilter, `${label} magFilter`).toBe(ref.magFilter);
      expect(ours.minFilter, `${label} minFilter`).toBe(ref.minFilter);
    };
    for (const key of Object.keys(ITEMTEX)) {
      const ours = ITEMTEX[key];
      const ref = refModule.ITEMTEX[key];
      if (Array.isArray(ours) && Array.isArray(ref)) {
        ours.forEach((t, i) => check(t, ref[i] as THREE.CanvasTexture, `${key}[${i}]`));
      } else if (!Array.isArray(ours) && !Array.isArray(ref)) {
        check(ours as THREE.CanvasTexture, ref as THREE.CanvasTexture, key);
      }
    }
  });

  // buildItemTex's and pickupTex's former byte-identity tests (Plan 0B) are
  // retired: superseded by tests/behavior/textures.test.ts's buildItemTex
  // draw-call-log comparison, which exercises every pickupTex call site (one
  // per item) and proves the same fidelity — every pixel row and hex colour
  // — without requiring source text to stay verbatim. pickupTex has no logic
  // beyond forwarding its args to texFromPx, so exercising every call site is
  // full coverage of it, not partial. See docs/known-issues.md KNOWN-5.
});

/**
 * Reverses the two mechanical substitutions this branch makes to bodies
 * this file still compares byte-for-byte: Task 5's — the reference's bare
 * AC/masterG/echoG reads become calls to AudioEngine's
 * ctx()/masterBus()/echoBus() accessors (src/audio/Sfx.ts's doc comment
 * explains why — bare module bindings can't cross a module boundary the
 * way legacy.js's global `let`s could) — and Task 6's — a bare
 * `setTimeout(fn,ms)` becomes `after(fn,ms)`, src/core/Timers.ts's tracked
 * wrapper, so a level load can cancel it (KNOWN-3). Both are lossless,
 * one-to-one textual substitutions — every occurrence of one becomes
 * exactly the other, same arguments, same order — so reversing them should
 * reproduce the reference body exactly. If it doesn't, that's a genuine
 * fidelity break, not a false positive from either transform.
 */
function denormalizeAudioAccessors(src: string): string {
  return src
    .replace(/\bctx\(\)/g, "AC")
    .replace(/\bmasterBus\(\)/g, "masterG")
    .replace(/\bechoBus\(\)/g, "echoG")
    .replace(/\bafter\(/g, "setTimeout(");
}

describe("AudioEngine/Sfx vs reference", () => {
  // AC, masterG, echoG and masterVol are bare globals in the reference;
  // Task 5 (src/audio/AudioEngine.ts) turns them into private module state
  // behind accessor functions, because bare exported `let`s can't cross an
  // ES module boundary the way legacy.js's globals could — see
  // REF.audioState's comment in tests/support/reference.ts. That range is
  // therefore never compared byte-for-byte. The one part of it that's still
  // a real fidelity claim — the default volume — is pinned here by parsing
  // it straight out of the reference rather than hardcoding 0.5 on both
  // sides.
  it("pins the reference's default masterVol as AudioEngine's default getMasterVolume()", () => {
    const stateLine = refSource(REF.audioState);
    const match = /masterVol=(\.\d+|\d+(?:\.\d+)?)/.exec(stateLine);
    if (!match) throw new Error("couldn't find masterVol=... in the reference's audio state line");
    expect(getMasterVolume()).toBe(Number(match[1]));
  });

  // audioInit's, blip's, bang's and boom's former byte-identity tests
  // (Plan 0B) are retired: superseded by tests/behavior/audio.test.ts's
  // recorded-WebAudio-graph comparisons (node creation, connect edges,
  // parameter assignments and scheduled automation), which prove the same
  // fidelity — every frequency, gain, filter setting and connection —
  // without requiring source text to stay verbatim. See
  // docs/known-issues.md KNOWN-5.
  //
  // click has no behavior-test coverage of its own (it isn't in the list
  // tests/behavior/audio.test.ts exercises), so its body-identity
  // comparison stays.
  it("click's body is byte-identical to the reference — it only calls bang() and touches no engine state of its own", () => {
    const moduleSource = readModuleSource("src/audio/Sfx.ts");
    const refChunk = refSource(REF.click);
    expect(extractFunctionBody(moduleSource, "click")).toBe(extractFunctionBody(refChunk, "click"));
  });
});

/**
 * pianoNote's one array-destructuring parameter — the three
 * [frequency, waveform, gain] partials — needs an inline tuple type
 * annotation to type-check, for the same reason AudioEngine's audioInit
 * once needed one for its four-oscillator drone bed (that body-identity
 * test is retired now — see the "AudioEngine/Sfx vs reference" describe
 * block above): TypeScript otherwise infers the outer array literal's
 * element type as (string | number)[], which won't flow into pianoNote's
 * OscillatorType-/number-typed assignments. Kept as its own narrow strip,
 * local to this one oracle entry.
 */
function stripPianoParamAnnotation(src: string): string {
  // Plan 0F Task 10 moved this annotation from the callback parameter onto
  // the array literal. `strictFunctionTypes` checks an explicitly-annotated
  // callback parameter *contravariantly* against forEach's own inferred
  // (string|number)[] parameter and rejects the tuple; annotating the array
  // instead lets the callback's type come from plain contextual inference,
  // which needs no such check. Both forms are exact-string replacements
  // targeting this one known body — not regexes — so `normalizeTsSource`'s
  // warning about `as` casts (a regex cannot tell code from string content)
  // does not apply here.
  return src
    .replace(
      '([[f,"triangle",.12],[f*2,"sine",.04],[f*.5,"sine",.03]] as [number,OscillatorType,number][])',
      '[[f,"triangle",.12],[f*2,"sine",.04],[f*.5,"sine",.03]]',
    )
    .replace("([fr,t,v]:[number,OscillatorType,number])", "([fr,t,v])");
}

describe("Voice/Ambient vs reference", () => {
  // Same accessor rewiring as AudioEngine/Sfx above: the reference's bare
  // AC/masterG/echoG become ctx()/masterBus()/echoBus() calls, reversed here
  // before comparison.
  it("noiseBuf's body matches the reference exactly once accessor calls are reversed — this generator has no ctx() guard of its own in the reference either; only called from functions that already checked", () => {
    const moduleSource = readModuleSource("src/audio/Voice.ts");
    const refChunk = refSource(REF.noiseBuf);
    expect(denormalizeAudioAccessors(extractFunctionBody(moduleSource, "noiseBuf"))).toBe(
      extractFunctionBody(refChunk, "noiseBuf"),
    );
  });

  // growl's and snarl's former byte-identity tests (Plan 0B) are retired:
  // superseded by tests/behavior/audio.test.ts's recorded-WebAudio-graph
  // comparisons (growl's rumble/throat/tremolo graph directly, snarl's
  // per-archetype dispatch — including the Math.random-seeded generic-ghoul
  // fallback — through the growl/blip/bang calls it makes), which prove the
  // same fidelity without requiring source text to stay verbatim. See
  // docs/known-issues.md KNOWN-5.
  //
  // gurgle, pain, deathCry, wetDoor, stoneDoor, bellToll, organChord,
  // pianoNote, startBossMusic, stopBossMusic and noiseBuf below have no
  // behavior-test coverage of their own, so their body-identity comparisons
  // stay — removing them would leave those functions with no fidelity
  // coverage at all.
  it("gurgle's body matches the reference exactly once accessor calls are reversed", () => {
    const moduleSource = readModuleSource("src/audio/Voice.ts");
    const refChunk = refSource(REF.gurgle);
    expect(denormalizeAudioAccessors(extractFunctionBody(moduleSource, "gurgle"))).toBe(
      extractFunctionBody(refChunk, "gurgle"),
    );
  });

  it("pain's body matches the reference exactly once accessor calls are reversed", () => {
    const moduleSource = readModuleSource("src/audio/Voice.ts");
    const refChunk = refSource(REF.pain);
    expect(denormalizeAudioAccessors(extractFunctionBody(moduleSource, "pain"))).toBe(
      extractFunctionBody(refChunk, "pain"),
    );
  });

  it("deathCry's body matches the reference exactly once accessor calls and the after()/setTimeout() timer wrapper are reversed — it only calls growl()/gurgle() otherwise, no engine state of its own", () => {
    const moduleSource = readModuleSource("src/audio/Voice.ts");
    const refChunk = refSource(REF.deathCry);
    expect(denormalizeAudioAccessors(extractFunctionBody(moduleSource, "deathCry"))).toBe(
      extractFunctionBody(refChunk, "deathCry"),
    );
  });

  it("wetDoor's body matches the reference exactly once accessor calls and the after()/setTimeout() timer wrapper are reversed", () => {
    const moduleSource = readModuleSource("src/audio/Ambient.ts");
    const refChunk = refSource(REF.wetDoor);
    expect(denormalizeAudioAccessors(extractFunctionBody(moduleSource, "wetDoor"))).toBe(
      extractFunctionBody(refChunk, "wetDoor"),
    );
  });

  it("stoneDoor's body matches the reference exactly once accessor calls are reversed", () => {
    const moduleSource = readModuleSource("src/audio/Ambient.ts");
    const refChunk = refSource(REF.stoneDoor);
    expect(denormalizeAudioAccessors(extractFunctionBody(moduleSource, "stoneDoor"))).toBe(
      extractFunctionBody(refChunk, "stoneDoor"),
    );
  });

  it("bellToll's body matches the reference exactly once accessor calls are reversed", () => {
    const moduleSource = readModuleSource("src/audio/Ambient.ts");
    const refChunk = refSource(REF.bellToll);
    expect(denormalizeAudioAccessors(extractFunctionBody(moduleSource, "bellToll"))).toBe(
      extractFunctionBody(refChunk, "bellToll"),
    );
  });

  it("organChord's body matches the reference exactly once accessor calls are reversed", () => {
    const moduleSource = readModuleSource("src/audio/Ambient.ts");
    const refChunk = refSource(REF.organChord);
    expect(denormalizeAudioAccessors(extractFunctionBody(moduleSource, "organChord"))).toBe(
      extractFunctionBody(refChunk, "organChord"),
    );
  });

  it("pianoNote's body matches the reference exactly once its required type annotation is stripped and accessor calls are reversed", () => {
    const moduleSource = readModuleSource("src/audio/Ambient.ts");
    const refChunk = refSource(REF.pianoNote);
    expect(
      denormalizeAudioAccessors(stripPianoParamAnnotation(extractFunctionBody(moduleSource, "pianoNote"))),
    ).toBe(extractFunctionBody(refChunk, "pianoNote"));
  });

  it("startBossMusic's body matches the reference exactly once accessor calls are reversed, including the bossPulse guard that stops a second call from stacking a second interval", () => {
    const moduleSource = readModuleSource("src/audio/Ambient.ts");
    const refChunk = refSource(REF.startBossMusic);
    expect(denormalizeAudioAccessors(extractFunctionBody(moduleSource, "startBossMusic"))).toBe(
      extractFunctionBody(refChunk, "startBossMusic"),
    );
  });

  // stopBossMusic has no AC/masterG/echoG reference at all — it only touches
  // bossPulse — so unlike startBossMusic above it compares byte-identical
  // rather than through denormalizeAudioAccessors. bossPulse itself is the
  // one genuine departure from verbatim in this whole module: the reference
  // declares it as a bare global alongside AC/masterG/echoG/masterVol
  // (REF.audioState, see the comment there), sharing that pattern's
  // inability to cross an ES module boundary as a live exported `let`.
  // Ambient.ts (src/audio/Ambient.ts) instead declares it as private module
  // state with the same `ReturnType<typeof setInterval> | null` shape, read
  // and written only by startBossMusic/stopBossMusic exactly as in the
  // reference. There is no separate byte-comparison possible for a bare
  // `let` declaration, so this comment is the oracle entry for that one
  // substitution — the behavioral guarantee it actually matters for (no
  // double-stacking on repeated startBossMusic calls) is what
  // tests/audio/Voice.test.ts's "boss music" describe block pins.
  it("stopBossMusic's body is byte-identical to the reference", () => {
    const moduleSource = readModuleSource("src/audio/Ambient.ts");
    const refChunk = refSource(REF.stopBossMusic);
    expect(extractFunctionBody(moduleSource, "stopBossMusic")).toBe(
      extractFunctionBody(refChunk, "stopBossMusic"),
    );
  });
});

/** Every .ts/.js file under `dir`, recursively. */
function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? listSourceFiles(p) : /\.(ts|js)$/.test(e.name) ? [p] : [];
  });
}

describe("weapon viewmodel art vs. reference — a deliberate divergence", () => {
  // This block used to prove src/render/viewmodel/pixels/{weapons0,weapons1}.ts
  // and the GP palette were the reference's weapon art, row for row. Player
  // feedback round 2 replaced that art on purpose: the project owner played
  // the game and said to fix the weapon designs, and laid side by side the
  // baked grids did not read as weapons. See
  // docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md, Task 1.
  // The weapons are now drawn per frame from a pose (src/render/viewmodel/
  // weapons/*.ts), so the pixel data files, pxCanvas, GP and
  // buildWeaponSprites were deleted — nothing read them any more. What this
  // block pins now: the baseline really was the reference's baked art, the
  // replacement is total (no reference row survives in src/), and the new
  // art keeps the reference's eight slots in the same order.
  const refWPX: Record<number, { idle: string[][]; fire: string[][]; reload: string[][] }> = {};
  evalReference(
    [refSource(REF.viewmodelBuildWeaponSprites)],
    "buildWeaponSprites()",
    { WPX: refWPX, GP: {}, pxCanvas: (rows: string[]) => rows },
  );
  const refWeaponPixels = Object.keys(refWPX).map(Number).sort((a, b) => a - b).map((k) => refWPX[k]);

  it("the baseline: the reference bakes 8 weapon slots, each with idle, fire and reload frames", () => {
    expect(refWeaponPixels.length).toBe(8);
    for (const set of refWeaponPixels) {
      expect(set.idle.length).toBeGreaterThan(0);
      expect(set.fire.length).toBeGreaterThan(0);
      expect(set.reload.length).toBeGreaterThan(0);
    }
  });

  it("no row of the reference's weapon pixel art survives anywhere in src/ — the replacement is total", () => {
    const srcText = listSourceFiles("src").map((f) => readFileSync(f, "utf8")).join("\n");
    // Rows distinctive enough to mean something: at least 12 non-space characters.
    const rows = new Set(refWeaponPixels.flatMap((set) => [...set.idle, ...set.fire, ...set.reload].flat())
      .filter((row) => row.replace(/ /g, "").length >= 12));
    expect(rows.size).toBeGreaterThan(50);
    const survivors = [...rows].filter((row) => srcText.includes(row));
    expect(survivors).toEqual([]);
  });

  it("the new art keeps the reference's eight slots, in slot order, each named after its weapon", () => {
    expect(WEAPON_ART.map((a) => a.name)).toEqual(WEAPON_STATS.map((w) => w.name));
  });

  it("the new palette (replacing GP) is hard-toned: every ramp is 1-8 opaque #rrggbb tones, and every material*8+tone index fits a byte", () => {
    const ids = Object.keys(MATERIALS).map(Number);
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) {
      expect(id * 8 + 7).toBeLessThan(256);
      const ramp = MATERIALS[id].ramp;
      expect(ramp.length).toBeGreaterThanOrEqual(1);
      expect(ramp.length).toBeLessThanOrEqual(8);
      for (const hex of ramp) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("viewmodel kit (SKIN/SLEEVE/.../HOLY, VM, MUZ) vs. reference", () => {
  // src/render/viewmodel/kit.ts — SKIN, DARK, MID, LIT, RUST, WOOD, GLOW and
  // HOLY are unused by the current game (dead code in the reference too,
  // preserved verbatim rather than pruned); SLEEVE and BOOT feed
  // drawKickBoot's vGrad calls, already covered behaviorally by
  // tests/behavior/viewmodel.test.ts's drawKickBoot suite. This is the data
  // fidelity claim for all ten, plus VM and MUZ, independent of whether
  // anything currently calls the functions that read them.
  //
  // kit.ts imports src/render/Overlay2D.ts's getFx(), and Overlay2D.ts
  // grabs the real fx2d 2D context eagerly at its own module top level (see
  // tests/behavior/viewmodel.test.ts's doc comment) — so, like that file,
  // kit.ts is imported dynamically here, after loadGameHtml()/
  // installDomStubs() make `#fx2d` and a working (stub) getContext exist,
  // rather than statically at this file's top (which would resolve before
  // either ran).
  interface RefKitConstants {
    SKIN: string; SLEEVE: string; BOOT: string; DARK: string; MID: string;
    LIT: string; RUST: string; WOOD: string; GLOW: string; HOLY: string;
    VM: Record<string, string>;
    MUZ: Array<{ y: number; r: number }>;
  }
  const ref = evalReference<RefKitConstants>(
    [refSource(REF.viewmodelKit)],
    "({SKIN,SLEEVE,BOOT,DARK,MID,LIT,RUST,WOOD,GLOW,HOLY,VM,MUZ})",
  );
  let Kit: typeof ViewmodelKit;

  beforeAll(async () => {
    installDomStubs();
    loadGameHtml();
    Kit = await import("../src/render/viewmodel/kit");
  });

  it("matches SKIN/SLEEVE/BOOT/DARK/MID/LIT/RUST/WOOD/GLOW/HOLY", () => {
    const ours = { SKIN: Kit.SKIN, SLEEVE: Kit.SLEEVE, BOOT: Kit.BOOT, DARK: Kit.DARK, MID: Kit.MID,
      LIT: Kit.LIT, RUST: Kit.RUST, WOOD: Kit.WOOD, GLOW: Kit.GLOW, HOLY: Kit.HOLY };
    const refs = { SKIN: ref.SKIN, SLEEVE: ref.SLEEVE, BOOT: ref.BOOT, DARK: ref.DARK, MID: ref.MID,
      LIT: ref.LIT, RUST: ref.RUST, WOOD: ref.WOOD, GLOW: ref.GLOW, HOLY: ref.HOLY };
    expect(ours).toEqual(refs);
  });

  it("matches the VM palette", () => {
    expect(Kit.VM).toEqual(ref.VM);
  });

  it("matches MUZ, the per-weapon muzzle-flash alignment table, slot for slot", () => {
    expect(Kit.MUZ).toEqual(ref.MUZ);
  });
});

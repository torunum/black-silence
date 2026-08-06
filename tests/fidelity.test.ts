// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
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
import { evalReference, REF, refSource } from "./support/reference";
import { installDomStubs } from "./support/domStubs";
import { normalizeTsSource } from "./support/normalizeTsSource";
import { readModuleSource } from "./support/readModuleSource";

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

describe("LEVELS vs. reference", () => {
  it("declares the same eight levels, in order, with identical metadata", () => {
    const meta = (defs: ReadonlyArray<{ build: unknown }>) =>
      defs.map(({ build, ...rest }) => rest);
    expect(meta(LEVELS)).toEqual(meta(refLevels));
  });

  it.each(LEVELS.map((def, i) => [def.name, def, refLevels[i]] as const))(
    "%s builds the identical grid (plus hmap/segs where present)",
    (_name, def, refDef) => {
      const built = def.build();
      const refBuilt = refDef.build();
      expect(built.g).toEqual(refBuilt.g);
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
  return source.slice(braceIdx + 1, i);
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

  it("buildTextures' body is byte-identical to the reference — no drawing call, colour or literal changed", () => {
    const moduleSource = readModuleSource("src/render/ProcTextures.ts");
    const refChunk = refSource(REF.procTextures);
    expect(extractFunctionBody(moduleSource, "buildTextures")).toBe(
      extractFunctionBody(refChunk, "buildTextures"),
    );
  });
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

  // texFromPx and buildSprites are code, not data: this port's convention is
  // to annotate every extracted function's signature and, where JS's lenient
  // call arity forces it (buildSprites' local mk/mkM closures), its inline
  // parameter lists too. Byte-identity is incoherent for annotated code —
  // see normalizeTsSource's doc comment — so these two compare *normalized*
  // source: strip the TS-only syntax the port adds, then require the
  // remainder to match the reference exactly. PXDEF above stays strictly
  // byte-identical because it is pure data that no annotation ever touches.
  it("texFromPx's body is identical to the reference once TS-only syntax is stripped", () => {
    const moduleSource = readModuleSource("src/enemies/SpriteBaker.ts");
    const refChunk = refSource(REF.texFromPx);
    expect(normalizeTsSource(extractFunctionBody(moduleSource, "texFromPx"))).toBe(
      normalizeTsSource(extractFunctionBody(refChunk, "texFromPx")),
    );
  });

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

  // pickupTex's and buildItemTex's bodies contain no TS-only syntax — the
  // pixel rows and hex palettes are literal call arguments, not annotated
  // declarations — so unlike SpriteBaker's texFromPx/buildSprites above,
  // these compare byte-identical rather than through normalizeTsSource (see
  // normalizeTsSource's doc comment on why byte-identity is the right bar
  // for unannotated bodies and incoherent for annotated ones). This is also
  // the assertion that actually proves fidelity for this module: under
  // domStubs' no-op 2D context (see tests/support/domStubs.ts) no rendered
  // pixel or colour ever reaches a texture object, so a byte-identical
  // source comparison is the only thing in this suite that would catch a
  // wrong pixel row or a transposed hex colour.
  it("buildItemTex's body is byte-identical to the reference — every pixel row and hex colour untouched", () => {
    const moduleSource = readModuleSource("src/render/ItemTextures.ts");
    const refChunk = refSource(REF.itemTex);
    expect(extractFunctionBody(moduleSource, "buildItemTex")).toBe(
      extractFunctionBody(refChunk, "buildItemTex"),
    );
  });

  it("pickupTex's body is byte-identical to the reference", () => {
    const moduleSource = readModuleSource("src/render/ItemTextures.ts");
    const refChunk = refSource(REF.itemTex);
    expect(extractFunctionBody(moduleSource, "pickupTex")).toBe(
      extractFunctionBody(refChunk, "pickupTex"),
    );
  });
});

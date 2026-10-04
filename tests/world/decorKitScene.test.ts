// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { LEVELS, type LevelDef } from "../../src/world/levels/index";
import { TEX } from "../../src/render/ProcTextures";
import { BANDTEX } from "../../src/render/BandTextures";
import { DRESSTEX } from "../../src/render/DressTextures";
import { THEMES } from "../../src/world/decor/kit";
import { themeOf } from "../../src/world/decor/registry";
import { Decorator } from "../../src/world/decor/place";
import { galleryDef } from "../../src/world/decor/gallery";

/**
 * THE KIT ON SCREEN (levels-feel-full plan, Task 1): what `loadLevel` builds
 * from a level's decor list — a handful of merged meshes however many pieces,
 * the masses casting and the clutter not, every surface one of the game's own
 * texture registries — and that the prologue, which is dressed by hand, is
 * built exactly as it was. Booted the way `tests/render/shadows.test.ts`
 * boots: NEW GAME through `main.ts`, then `loadLevel(n)` directly. The
 * dressed levels here are the real level grids with `Decorator.clutter` laid
 * over them in the test (levels 1-4 are dressed by their own builders since Task 2; 5-7 wait for Task 3).
 */

let loadLevel: (idx: number) => void;
const kids = (name: string) => (renderState.scene.children as THREE.Object3D[]).filter((o) => o.name === name) as THREE.Mesh[];
const decorMeshes = () => ["decor", "decorClutter", "decorGrass"].flatMap(kids);

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
});
afterAll(() => { LEVELS.length = 8; });

/** Level `i` of the game with the theme's clutter laid along its walls, in the slot the loader will be asked for. */
function dressed(i: number, density = .4): LevelDef {
  return { ...LEVELS[i], build: () => { const L = LEVELS[i].build(); const d = new Decorator(L, themeOf(LEVELS[i].sub)!); d.clutter({ density, seed: 3 }); L.decor = d.specs; return L; } };
}
const mapsOf = (m: THREE.Mesh) => (Array.isArray(m.material) ? m.material : [m.material]).map((x) => (x as THREE.MeshLambertMaterial).map);

describe("what the loader builds from a decor list", () => {
  it("merges a dressed level into a handful of meshes: a hundred and more pieces add at most 28 scene children", () => {
    for (let i = 1; i <= 7; i++) {
      LEVELS.length = 8;
      // the level as the game builds it, with its decor list stripped (levels 1-4 are dressed by their builders now)
      LEVELS[8] = { ...LEVELS[i], build: () => { const L = LEVELS[i].build(); L.decor = undefined; return L; } }; loadLevel(8);
      const bare = renderState.scene.children.length;
      expect(decorMeshes(), `level ${i} undressed`).toHaveLength(0);
      LEVELS[8] = dressed(i); loadLevel(8);
      const added = renderState.scene.children.length - bare;
      expect(decorMeshes().length, `level ${i}`).toBeGreaterThan(3);
      expect(added, `level ${i} gained ${added} scene children`).toBeLessThanOrEqual(28);
      if (i <= 4) {   // the real level: its own hand dressing, merged the same way
        LEVELS[8] = LEVELS[i]; loadLevel(8);
        expect(renderState.scene.children.length - bare, `level ${i} as built`).toBeLessThanOrEqual(28);
        expect(decorMeshes().length, `level ${i} as built`).toBeGreaterThan(3);
      }
    }
  });

  it("lets the masses cast a shadow and the small clutter not, and every piece of decor receive one", () => {
    for (const i of [2, 3, 6]) {   // the levels whose vocabularies have casters: a sarcophagus, a machine
      LEVELS[8] = dressed(i, .9); loadLevel(8);
      const casters = kids("decor"), clutter = kids("decorClutter");
      expect(clutter.length, `level ${i} clutter`).toBeGreaterThan(0);
      for (const m of casters) expect(m.castShadow, `level ${i} decor casts`).toBe(true);
      for (const m of clutter) expect(m.castShadow, `level ${i} clutter must not cast`).toBe(false);
      for (const m of decorMeshes()) expect(m.receiveShadow, "decor receives").toBe(true);
    }
    LEVELS[8] = dressed(6, .9); loadLevel(8);
    expect(kids("decor").length, "the factory has machines and crate piles: casters").toBeGreaterThan(0);
  });

  it("dresses each gallery hall in TEX, DRESSTEX and BANDTEX surfaces and nothing else", () => {
    const known = new Set<THREE.Texture | null>([...Object.values(TEX), ...Object.values(DRESSTEX), ...Object.values(BANDTEX), null]);
    const used = new Set<THREE.Texture | null | undefined>();
    for (const t of THEMES) {
      LEVELS[8] = galleryDef(t); loadLevel(8);
      for (const m of decorMeshes()) for (const map of mapsOf(m)) { expect(known.has(map ?? null), `${t}: an unknown texture`).toBe(true); used.add(map); }
    }
    for (const k of ["straw", "rust", "sludge", "banner"] as const) expect(used.has(DRESSTEX[k]), `nothing wears DRESSTEX.${k}`).toBe(true);
  });

  it("is visual only: a dressed level has the enemies, props, items and torches its bare one has, on the same grid", () => {
    for (const i of [1, 4, 7]) {
      LEVELS.length = 8; loadLevel(i);
      const bare = [world.enemies.length, world.props.length, world.items.length, world.torches.length, world.GW, world.GH];
      LEVELS[8] = dressed(i); loadLevel(8);
      expect(decorMeshes().length).toBeGreaterThan(0);
      expect([world.enemies.length, world.props.length, world.items.length, world.torches.length, world.GW, world.GH], `level ${i}`).toEqual(bare);
    }
  });

  it("leaves the prologue exactly as it was: its meshes are `decor` and `decorGrass`, no clutter mesh", () => {
    LEVELS.length = 8; loadLevel(0);
    expect(kids("decorClutter")).toHaveLength(0);
    expect(kids("decorGrass")).toHaveLength(1);
    expect(kids("decor").length).toBeGreaterThan(3);
    for (const m of kids("decor")) expect(m.castShadow).toBe(true);
  });
});

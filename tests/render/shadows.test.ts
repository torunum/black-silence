// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { LEVELS } from "../../src/world/levels/index";
import { save } from "../../src/save/SaveGame";
import { SHADOW_MAP_SIZE, SHADOW_POLICY, applyShadowSetting, initShadowMap } from "../../src/render/Shadows";

/**
 * Phase 2B — shadowed lighting. The player's lamp is the game's one
 * shadow-casting light; `src/render/Shadows.ts` holds the decision, the
 * reasoning for every light that was rejected, and the per-mesh cast/receive
 * policy this file checks.
 *
 * Booted the way `tests/world/geometry.test.ts` boots: NEW GAME through
 * `src/main.ts`'s real menu wiring puts the prologue live, then `loadLevel(n)`
 * switches levels directly. The dynamic imports in `beforeAll` are required
 * for the same reason that file names — `RenderCore.ts` captures the WebGL
 * canvas at its own module scope the first time it is evaluated.
 *
 * ## What this file establishes, and what it does not
 *
 * Stated plainly, because it matters more here than in most of the suite and
 * because `tests/enemies/walkFrames.test.ts` set the precedent of saying so.
 *
 * **It establishes** that the flags and settings the decision depends on are
 * actually set on the actually-built scene: that the shadow map defaults off
 * (review round 1 flipped it from the phase's original on, once the cost was
 * actually measured — see below) and the toggle in `SETTINGS` moves it both
 * ways, that the type is `BasicShadowMap` and not the smoother default, that
 * the map is 256, that **exactly one** light in a live level is configured to
 * cast whenever shadows are on — the cost invariant, and the one assertion
 * here with real teeth, since a future task that turns on the torches
 * reddens it immediately — and that every named piece of level geometry has
 * a deliberate policy rather than an accidental default.
 *
 * **It does not establish that anything looks right.** No test in this
 * project samples a pixel. A shadow that is inverted, acne-ridden, offset by
 * a metre, or so dark the level is unreadable sets exactly the same flags as
 * a good one and passes every case below. `shadow.bias` and
 * `shadow.normalBias` in particular are pure look values: this file asserts
 * that *some* bias is configured, never that it is the right one. The
 * evidence for the look is the matched before/after frames in
 * `.superpowers/sdd/2026-09-21-phase2b-shadows/task-1-report.md`, taken in a
 * real browser at a fixed camera, and that evidence is a screenshot a human
 * read — not something this suite can re-run.
 *
 * **It cannot establish anything at all about cost.** `requestAnimationFrame`
 * does not run sustained in this project's browser pane, so there is no frame
 * rate to measure anywhere in this environment. The six extra depth passes a
 * frame are a number derived from three's source (`PointLightShadow` has six
 * viewports), not a measurement. That question is handed to the player, which
 * is what the SHADOWS setting in the settings screen is for.
 */

let loadLevel: (idx: number) => void;

/** Names present on the top-level children of a freshly-loaded level. */
function namedChildren(): string[] {
  return (renderState.scene.children as THREE.Object3D[])
    .map((o) => o.name).filter((n) => n !== "");
}

function childNamed(name: string): THREE.Object3D {
  const hit = (renderState.scene.children as THREE.Object3D[]).find((o) => o.name === name);
  if (!hit) throw new Error(`no scene child named "${name}" in the level under test`);
  return hit;
}

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

describe("the renderer's shadow settings", () => {
  it("has the shadow map disabled after boot — the default flipped in review round 1", () => {
    // `save.shadows` defaults to `false` as of review round 1 of this task:
    // the reviewer measured +12 draw calls and +16,608 triangles on level 1
    // (`renderer.info`, `autoReset = false`, read after the shadow pass —
    // about 6.8x the beauty pass's own triangle load) against a shadow that
    // the same review's own six-panel board measured as a black difference
    // panel at the shipped camera angles. Measured cost beside measured zero
    // benefit moved the default off; the toggle in SETTINGS stays on.
    //
    // This boot assertion alone is a weak mutation catch now that `false` is
    // also what a *wrong*, hardcoded-false writer would produce — hardcoding
    // `applyShadowSetting`'s assignment to a constant is caught instead by
    // "the SHADOWS setting > turns the shadow map off and back on" below,
    // which flips `save.shadows` both directions post-boot and asserts the
    // renderer follows it. This case only pins the shipped default itself.
    expect(renderState.renderer.shadowMap.enabled).toBe(false);
  });

  it("initShadowMap turns the map on from the save and pins the type", () => {
    // MUTATION TARGET 1b of 3, and the reason it is separate. `initShadowMap`
    // is the *other* writer of `shadowMap.enabled`: `RenderCore.ts`'s module
    // body calls it at construction, before `loadSave()` has run. Hardcoding
    // it to `false` was measured to leave every case in this file green,
    // because `main.ts`'s later `applyShadowSetting()` overwrites it — so the
    // boot assertion above cannot see this writer at all, and a mutation that
    // only reddens through one of two writers is not a covered writer. Driven
    // directly against a stub renderer for that reason.
    const fake = { shadowMap: { enabled: false, type: -1 } } as unknown as THREE.WebGLRenderer;
    const before = save.shadows;
    try {
      save.shadows = true;
      initShadowMap(fake);
      expect(fake.shadowMap.enabled).toBe(true);
      expect(fake.shadowMap.type).toBe(THREE.BasicShadowMap);
      save.shadows = false;
      initShadowMap(fake);
      expect(fake.shadowMap.enabled).toBe(false);
    } finally {
      save.shadows = before;
    }
  });

  it("uses BasicShadowMap, not the filtered default, because nothing else on screen is soft", () => {
    // The game renders a few hundred pixels wide with NearestFilter on every
    // texture and `antialias: false`. PCFShadowMap — three's default — blends
    // four bilinear depth taps, so its edge would be the only soft edge in the
    // frame and would read as a blur rather than as a shadow. Pinned because
    // it is a look decision that a later "use the defaults" tidy-up would
    // silently undo.
    expect(renderState.renderer.shadowMap.type).toBe(THREE.BasicShadowMap);
    expect(THREE.BasicShadowMap).not.toBe(THREE.PCFShadowMap);
  });

  it("sizes the lamp's shadow map at 256, a deliberately coarse staircase", () => {
    expect(SHADOW_MAP_SIZE).toBe(256);
    expect(renderState.lamp.shadow.mapSize.x).toBe(SHADOW_MAP_SIZE);
    expect(renderState.lamp.shadow.mapSize.y).toBe(SHADOW_MAP_SIZE);
  });

  it("leaves the lamp's shadow frustum to three, which derives it from the light's own distance", () => {
    // `PointLightShadow.updateMatrices` assigns `light.distance` to
    // `camera.far` every frame. Setting `far` here by hand would be dead code
    // that looks load-bearing; asserting the light's distance is what actually
    // determines the frustum, and a retune of the lamp's reach silently
    // retunes the shadow's sharpness with it.
    expect(renderState.lamp.distance).toBe(9);
  });

  it("configures a bias for the lamp — a value this suite cannot judge, only notice the absence of", () => {
    expect(renderState.lamp.shadow.bias).not.toBe(0);
    expect(renderState.lamp.shadow.normalBias).toBeGreaterThan(0);
  });
});

describe("which lights cast", () => {
  it("has exactly one shadow-casting light in a live level, and it is the player's lamp", () => {
    // The cost invariant. Each extra shadow-casting PointLight is six more
    // depth passes a frame (`PointLightShadow._viewports` has six entries),
    // and level 3 holds 21 positional lights. A future task that gives the
    // torches shadows reddens this case before it ever reaches a player.
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const casters = (renderState.scene.children as THREE.Object3D[])
        .filter((o) => (o as THREE.Light).isLight && o.castShadow);
      expect(casters, `level ${i} shadow-casting lights`).toHaveLength(1);
      expect(casters[0]).toBe(renderState.lamp);
    }
  });

  it("leaves the muzzle and explosion flashes non-casting, because a zero-intensity caster still costs six passes", () => {
    loadLevel(1);
    // `WebGLShadowMap.render` has no intensity check — verified in three's
    // source, not assumed — so `castShadow` on a light that is dark 99% of the
    // time buys a two-frame strobe for a permanent cost.
    expect(renderState.muzzleLight.intensity).toBe(0);
    expect(renderState.muzzleLight.castShadow).toBe(false);
    expect(renderState.boomLight.castShadow).toBe(false);
    expect(renderState.lampCore.castShadow).toBe(false);
  });
});

describe("who casts and who receives", () => {
  it("makes the level's solid geometry cast and receive", () => {
    // MUTATION TARGET 2 of 3: set any of these rules' `cast` to false in
    // `SHADOW_POLICY` (src/render/Shadows.ts) and this case goes red.
    // Level 3 is the one level that builds every caster shape at once:
    // instanced walls and pillars, a height map (platforms), doors and props.
    loadLevel(3);
    for (const name of ["wall", "pillar", "platform", "door", "prop"]) {
      const o = childNamed(name);
      expect(o.castShadow, `${name}.castShadow`).toBe(true);
      expect(o.receiveShadow, `${name}.receiveShadow`).toBe(true);
    }
  });

  it("casts from every instance of an InstancedMesh, not just its origin", () => {
    // `MeshDistanceMaterial`'s vertex shader goes through `project_vertex`,
    // which applies `instanceMatrix` under `USE_INSTANCING` — checked in
    // three's own source rather than assumed, because a depth pass that
    // ignored the instance matrix would stack every wall's shadow at the
    // world origin and still set exactly the flags this file asserts.
    loadLevel(1);
    const wall = childNamed("wall") as THREE.InstancedMesh;
    expect(wall.isInstancedMesh).toBe(true);
    expect(wall.count).toBeGreaterThan(1);
    expect(wall.castShadow).toBe(true);
  });

  it("sets the flags through a prop's whole subtree, since a flag on a Group reaches no renderable", () => {
    // `spawnProp` builds tables, chairs and pews as a `THREE.Group`.
    // `WebGLShadowMap` only descends into `isMesh`/`isLine`/`isPoints`, so a
    // Group that casts and children that do not casts nothing at all.
    loadLevel(2);
    const groups = (renderState.scene.children as THREE.Object3D[])
      .filter((o) => o.name === "prop" && (o as THREE.Group).isGroup);
    expect(groups.length, "level 2 builds Group-shaped props (tables/chairs/pews)").toBeGreaterThan(0);
    for (const g of groups) for (const child of g.children) {
      expect(child.castShadow, "a prop Group's child mesh").toBe(true);
      expect(child.receiveShadow, "a prop Group's child mesh").toBe(true);
    }
  });

  it("makes the floor and every ceiling shape receive without casting", () => {
    // MUTATION TARGET 3 of 3: set `floor.receive` (or either ceiling rule's)
    // to false in `SHADOW_POLICY` and this case goes red.
    //
    // Neither casts. There is nothing below the floor, and a single one-sided
    // level-wide plane in the depth pass — rendered back-face, since three
    // flips FrontSide to BackSide for shadows — is a good way to put the whole
    // scene in shadow. The ceiling starts at WALLH=3.4 and the lamp sits at
    // about 1.4, so ceiling geometry could only throw a shadow upward.
    loadLevel(1);
    for (const name of ["floor", "ceiling"]) {
      const o = childNamed(name);
      expect(o.receiveShadow, `${name}.receiveShadow`).toBe(true);
      expect(o.castShadow, `${name}.castShadow`).toBe(false);
    }
    // Level 3 is the only level that opts into a per-cell ceiling map today,
    // so it is the only place the other two ceiling shapes exist at all.
    loadLevel(3);
    for (const name of ["ceilingCells", "ceilingRisers"]) {
      const o = childNamed(name);
      expect(o.receiveShadow, `${name}.receiveShadow`).toBe(true);
      expect(o.castShadow, `${name}.castShadow`).toBe(false);
    }
  });

  it("leaves the torch post receiving but not casting — it is thinner than a shadow texel", () => {
    loadLevel(1);
    const post = childNamed("torchPost");
    expect(post.receiveShadow).toBe(true);
    expect(post.castShadow).toBe(false);
  });
});

describe("enemies, and the blob that stands in for their shadow", () => {
  it("keeps enemy bodies as Sprites, which three's shadow pass excludes structurally", () => {
    // This is the premise the whole enemy decision rests on, so it is pinned
    // rather than left in a comment. `WebGLShadowMap`'s `renderObject` only
    // descends into an object when `object.isMesh || object.isLine ||
    // object.isPoints`. A `Sprite` is none of the three, so `castShadow = true`
    // on one is a silent no-op — and a future reader who "fixes" the flag
    // would get no shadow and no error. If three ever makes Sprite a Mesh,
    // this case goes red and the decision gets re-made.
    loadLevel(1);
    expect(world.enemies.length).toBeGreaterThan(0);
    for (const e of world.enemies) {
      expect((e.sp as unknown as { isSprite?: boolean }).isSprite).toBe(true);
      expect((e.sp as unknown as { isMesh?: boolean }).isMesh).toBeFalsy();
      expect(e.sp.castShadow).toBe(false);
    }
  });

  it("keeps every enemy's fake ground blob, and keeps it out of the depth pass", () => {
    // The blob survives real shadows, and the reasoning is the opposite of
    // the obvious one: once the pillar beside a ghoul throws a hard shadow,
    // a ghoul with no ground contact stops reading as something standing in
    // the room. It stays non-casting because it is a flat plane lying at
    // y=0.012 on the floor it would be shadowing.
    loadLevel(1);
    for (const e of world.enemies) {
      expect(e.blob.parent, "an enemy's blob is still in the scene").toBe(renderState.scene);
      expect(e.blob.castShadow).toBe(false);
    }
  });
});

describe("the policy is total", () => {
  it("has a deliberate rule for every named scene child every level builds", () => {
    // The real guard in this file. Dispatch is on `name`, assigned at each
    // mesh's build site, so a future task that adds a new kind of level
    // geometry and forgets to decide its shadow behaviour fails here instead
    // of shipping a mesh that silently does not cast.
    const seen = new Set<string>();
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      for (const name of namedChildren()) seen.add(name);
    }
    expect(seen.size).toBeGreaterThan(5);
    const unruled = [...seen].filter((n) => SHADOW_POLICY[n] === undefined).sort();
    expect(unruled, "named scene children with no entry in SHADOW_POLICY").toEqual([]);
  });

  it("has no rule that no level reaches, except the angled wall segments no level places", () => {
    // The other direction, so a rule for geometry that stopped being built
    // does not quietly rot. `wallSeg` is the one standing exception and it is
    // named rather than skipped: `LevelBuilder`'s `segs` array is empty on all
    // eight levels today — measured by building them, not by reading source —
    // so `loadLevel`'s angled-wall branch never runs. The rule exists because
    // the branch does. When Phase 4 places the first angled wall, this case
    // goes red and whoever does it removes the exception, which is the point.
    const seen = new Set<string>();
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      for (const name of namedChildren()) seen.add(name);
    }
    const unreached = Object.keys(SHADOW_POLICY).filter((n) => !seen.has(n)).sort();
    expect(unreached).toEqual(["wallSeg"]);
  });
});

describe("the SHADOWS setting", () => {
  it("turns the shadow map off and back on without a level reload", () => {
    // The hand-off. The cost of the lamp casting cannot be measured anywhere
    // in this project's environment, so the judgement belongs to the player —
    // and the player cannot edit `Shadows.ts`. `src/ui/Menus.ts` wires
    // `#shadowSlider` to this same function.
    loadLevel(1);
    const before = save.shadows;
    try {
      save.shadows = false;
      applyShadowSetting();
      expect(renderState.renderer.shadowMap.enabled).toBe(false);
      save.shadows = true;
      applyShadowSetting();
      expect(renderState.renderer.shadowMap.enabled).toBe(true);
    } finally {
      save.shadows = before;
      applyShadowSetting();
    }
  });

  it("marks existing materials for recompilation, or the toggle would do nothing until the next level", () => {
    // `WebGLPrograms.getParameters` folds `shadowMap.enabled` into the program
    // cache key, but three does not invalidate already-compiled materials when
    // the flag changes. Without the sweep in `applyShadowSetting`, flipping
    // the setting mid-level leaves every material running the shader it was
    // built with — the control would appear dead, which is worse than absent.
    loadLevel(1);
    const floorMat = (childNamed("floor") as THREE.Mesh).material as THREE.Material;
    const v = floorMat.version;
    const before = save.shadows;
    try {
      save.shadows = !before;
      applyShadowSetting();
      expect(floorMat.version).toBeGreaterThan(v);
    } finally {
      save.shadows = before;
      applyShadowSetting();
    }
  });
});

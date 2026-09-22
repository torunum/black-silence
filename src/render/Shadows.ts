import * as THREE from "three";
import { renderState } from "./Renderer";
import { save } from "../save/SaveGame";

/**
 * SHADOWS — one shadow-casting light, a hard-edged shadow map sized for a
 * 400-pixel-wide framebuffer, and the per-mesh cast/receive policy for the
 * whole game, in one place.
 *
 * This file exists rather than a dozen flag assignments scattered through
 * `src/world/LevelLoader.ts` for two reasons. The mechanical one is that
 * `LevelLoader.ts` was at 384 of the 400-line gate before this task, and
 * this task's own additions to it — `configureLampShadow`/
 * `applyShadowFlags` calls plus ten `name` assignments — left it at
 * **398 of 400**. Two lines of headroom, not a hundred: the next task that
 * touches `LevelLoader.ts` should plan on extracting before adding, the way
 * this task extracted the shadow policy, rather than assuming there is room
 * to grow it in place. The real reason for this file, independent of the
 * line count, is that "which objects cast" is a single decision with a
 * single rationale, and reading it should not mean reading a level loader.
 *
 * ## Why exactly one light casts
 *
 * A `PointLight` shadow in three.js is a cube map, and three renders it as
 * six separate depth passes into a 4x2 atlas — `PointLightShadow`'s
 * `_viewports` array has six entries, and `WebGLShadowMap.render` loops
 * `shadow.getViewportCount()` times per light per frame. There is **no
 * intensity check** in that loop: a light with `intensity: 0` and
 * `castShadow: true` costs the full six passes anyway.
 *
 * Measured against the real level grids (every level built, not scanned as
 * source text), the game has between 9 and 21 positional lights per level:
 *
 * ```
 * 0 PROLOGUE     torch 4  window 0  exit 1   ->  9 positional lights
 * 1 DUNGEON      torch 6  window 6  exit 1   -> 17
 * 2 CHURCH       torch 8  window 8  exit 0   -> 20
 * 3 NECROPOLIS   torch 9  window 8  exit 0   -> 21
 * 4 GRAVEYARD    torch 10 window 4  exit 0   -> 18
 * 5 SEWERS       torch 8  window 4  exit 0   -> 16
 * 6 FACTORY      torch 8  window 5  exit 0   -> 17
 * 7 WOMB         torch 8  window 5  exit 0   -> 17
 * ```
 *
 * (Plus the four that always exist: `lamp`, `lampCore`, `muzzleLight`,
 * `boomLight`. `AmbientLight` is not positional and cannot cast at all.)
 *
 * So the ceiling on "just turn shadows on" is 21 lights x 6 = 126 depth
 * passes a frame, on top of the beauty pass. That is not a tuning problem.
 *
 * **`renderState.lamp` is the one that casts.** It is the only light that
 * exists in every level, is always within a couple of metres of the
 * camera, and therefore always owns the shadow the player is actually
 * looking at. Being exactly one, the cost is a constant six passes a frame
 * in every level rather than a number that changes with how many torches
 * an author happened to place. `Player.ts` puts it at `player.pyy + 0.4`,
 * which is 0.4 above the camera — enough offset that a shadow falls away
 * and downward into view instead of hiding exactly behind its caster, the
 * way a light sitting *at* the eye would.
 *
 * Every other light, and why not:
 *
 * - **`lampCore`** — same position as `lamp`, `distance: 4.5`. Its shadow
 *   would be geometrically near-identical to the lamp's, from an origin
 *   0.2 below it: two hard edges a texel or two apart, which reads as
 *   ringing rather than as a second shadow. Six passes for an artifact.
 * - **`muzzleLight` / `boomLight`** — `intensity: 0` except during a flash.
 *   Per the loop above, that costs six passes a frame forever for a light
 *   that is dark almost all of the time, and what it would buy is a shadow
 *   that appears and vanishes within two frames of every shot — a strobe.
 * - **torches** (`i` tiles, 4-10 per level) — the tempting second, because
 *   they are static and a static shadow can be baked once:
 *   `WebGLShadowMap.render` skips any shadow whose `autoUpdate` is false
 *   and `needsUpdate` is false. Four reasons it is still no. (1) The bake
 *   is not free, it is just moved: 10 torches is 60 depth passes on the
 *   level-load frame, which is already the worst frame in the game.
 *   (2) Each shadow-casting point light adds one entry to
 *   `uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ]` in
 *   *every* lit material's fragment shader, and WebGL2 only guarantees 16
 *   fragment texture units. **Corrected after a live test, round 1 of
 *   review**: the cliff is real but sits at 17 casters, not at 10 — tested
 *   live in this browser, `MAX_TEXTURE_IMAGE_UNITS` is 16 here, 11 casters
 *   is clean, 14 is clean (level 1's 13 torch/window/exit lights plus the
 *   lamp — that is this game's single busiest level if every one of its
 *   decorative lights cast), and 17 is where
 *   `THREE.WebGLProgram: Shader Error` /
 *   `FRAGMENT shader texture image units count exceeds
 *   MAX_TEXTURE_IMAGE_UNITS(16)` actually fires. Level 4's ten torches, the
 *   most of any level, plus its four window lights plus the lamp is 15 —
 *   in the untested gap between the confirmed-clean 14 and the
 *   confirmed-broken 17, not a confirmed break. Re-deriving every level's
 *   torch+window+exit count from `Shadows.ts`'s own header table and
 *   adding the lamp: level 2 (8+8+0+1=17) and level 3 (9+8+0+1=18) are the
 *   two that actually reach or cross the line; every other level (6, 14,
 *   13, 15, 13, 14, 14 for 0/1/4/5/6/7) sits at or below the tested-clean
 *   boundary or, for level 4 alone, in the untested gap. And at 17 casters
 *   the reviewer's frame still rendered — 215,916 of 216,800 pixels
 *   non-black — so "a black screen, not a slow frame" overstates a real
 *   but survivable shader-compile error, not a wall that hides all output.
 *   (3) Memory: at
 *   `mapSize 256` a point shadow's render target is 1024x512 (the 4x2
 *   atlas), so eleven of them is ~23 MB of RGBA per level. (4) A bake is
 *   only sound if no caster moves, and doors do — `doorTick` animates a
 *   wall-height mesh — so a baked torch map goes stale exactly when the
 *   player opens a door beside a torch.
 * - **window lights** (lit `W` cells, 0-8 per level) — the same sampler and
 *   memory budget, and geometrically the worst buy in the set: the light
 *   sits 1.7 units in front of the wall at `WALLH*0.6`, facing into the
 *   room, so most of what it would shadow is the wall it came from.
 * - **the exit-pad light** (`X` tiles) — measured, only the prologue and
 *   level 1 place an `X` at all. It is a floor glow one unit up; a shadow
 *   from it would rake the whole room from a light the player is walking
 *   *towards*.
 * - **the challenge-plate light** (`Y` tiles) — **no level places a `Y`**,
 *   measured across all eight built grids, so this light never exists in
 *   the shipped game.
 * - **the boss-death pad** (`src/enemies/Death.ts`) — a reward glow that
 *   appears for a few seconds in a room the player has finished.
 * - **`AmbientLight`** — has no `shadow` at all. Not a candidate.
 *
 * ## Why `BasicShadowMap` and 256
 *
 * The default is `PCFShadowMap`: four bilinear-filtered depth taps blended
 * together, i.e. a soft, anti-aliased shadow edge. This game runs its
 * framebuffer at 400x225 by default, upscales it with CSS, uses
 * `NearestFilter` on every texture it builds, and constructs its renderer
 * with `antialias: false`. Every edge on screen is a hard pixel staircase.
 * A PCF edge would be the only smooth thing in the frame, and next to a
 * nearest-sampled wall texture it does not read as a soft shadow, it reads
 * as a blur — as though that one part of the picture were out of focus.
 * `BasicShadowMap` is a single unfiltered depth comparison, so the edge
 * stairsteps at the shadow map's own resolution, which is the same visual
 * language as everything else.
 *
 * 256 is chosen to make that staircase deliberate rather than incidental.
 * The camera is 78 degrees across 400 pixels, about 5 framebuffer pixels
 * per degree; a 256-texel cube face across 90 degrees is about 2.8 texels
 * per degree, so a shadow edge steps in chunks roughly twice the size of a
 * framebuffer pixel. It is visibly blocky, at the same scale as the
 * texture art. The number worth knowing alongside it: the actual render
 * target is 1024x512, because `PointLightShadow`'s frame extents are 4x2.
 *
 * `shadow.camera.far` is deliberately not set here — `PointLightShadow`'s
 * `updateMatrices` assigns `light.distance` to it every frame, so the lamp's
 * shadow frustum is already exactly its own 9-unit reach, which is what
 * keeps 256 texels sharp rather than spreading them over a 500-unit default.
 */

/** One side of the lamp's shadow cube face, in texels. See the header. */
export const SHADOW_MAP_SIZE = 256;

interface ShadowRule { readonly cast: boolean; readonly receive: boolean }

/**
 * The per-mesh policy, keyed by the `name` the builders assign. A scene
 * child whose name is not in this table is left at three's defaults
 * (`castShadow` and `receiveShadow` both false), which is correct for
 * everything that is unlit, flat, or not a `Mesh`:
 *
 * - **`THREE.Sprite`** — every enemy body, every item, every torch flame.
 *   Three excludes sprites from the shadow pass *structurally*:
 *   `WebGLShadowMap`'s `renderObject` only descends into an object when
 *   `object.isMesh || object.isLine || object.isPoints`, and a `Sprite` is
 *   none of those. Setting `castShadow = true` on one is a silent no-op,
 *   which is why `tests/render/shadows.test.ts` pins the fact rather than
 *   leaving a future reader to "fix" it. `SpriteMaterial`'s shader has no
 *   `shadowmap` chunk either, so sprites do not receive one.
 * - **`MeshBasicMaterial`** — the exit pad, the challenge plate, the window
 *   glass and its light cone, every decal, the reaper bolt and the cross.
 *   `meshbasic.glsl.js` includes no `shadowmap` chunk, so `receiveShadow`
 *   on a Basic material is a no-op too, not a cheap win being left on the
 *   table.
 * - **the enemy blob** (`addBlob`, `src/render/RenderCore.ts`) — see below.
 * - **gibs, particles, heads** — flying debris a few centimetres across.
 *   At 256 texels over 9 units a gib is sub-texel past two metres, so its
 *   shadow would be a crawling speckle, and there are dozens in flight
 *   after an explosion.
 *
 * ## The enemy blob keeps its job
 *
 * Every enemy carries a `blob`: a 32x32 radial-gradient plane lying at
 * y=0.012 under it, standing in for a shadow the sprite cannot cast. The
 * question this task had to answer is whether real shadows make it
 * redundant. They do the opposite. Once the pillar beside a ghoul throws a
 * hard black shadow across the floor, a ghoul with no ground contact at all
 * stops reading as a thing standing in the room and starts reading as a
 * decal hung in the air — the real shadows raise the bar the fake one is
 * there to clear. So the blob stays, and stays `castShadow: false`: it is a
 * flat plane at floor level, and putting it in the depth pass would smear a
 * shadow across the floor it is lying on.
 *
 * The honest cost of keeping it, stated because a flag cannot fix it: the
 * blob is centred under the enemy and does not move with the light, while
 * the pillar's shadow swings as the player circles it. Walk around an enemy
 * standing next to a pillar and one shadow rotates and the other does not.
 * That is not tunable — it is what a sprite costs — and it only goes away
 * when enemies get real geometry, which belongs with the Phase 3 roster
 * work, not here.
 */
export const SHADOW_POLICY: Readonly<Record<string, ShadowRule>> = {
  /* Casters. Everything a player can walk around and be occluded by. All
     three instanced groups included: `project_vertex.glsl.js` applies
     `instanceMatrix` under `USE_INSTANCING`, and `MeshDistanceMaterial`'s
     vertex shader goes through that same chunk, so an `InstancedMesh`
     casts per instance with no special handling. Checked in three's source
     rather than assumed, because a silently un-instanced depth pass would
     have put every wall's shadow at the origin. */
  wall: { cast: true, receive: true },
  pillar: { cast: true, receive: true },
  platform: { cast: true, receive: true },
  wallSeg: { cast: true, receive: true },
  /* Doors are the one caster that moves. They are also the reason the
     lamp's shadow map can never be baked — but the lamp re-renders every
     frame regardless, since the lamp itself moves, so a moving door costs
     nothing extra here. */
  door: { cast: true, receive: true },
  /* Props: crates, tables, chairs, shelves, pews, barrels, the piano. A
     barrel's shadow on the floor is the second clearest read in the game
     after a pillar's. `applyShadowFlags` sets these through the whole
     subtree, because `T`/`C`/`V`/`v` build a `Group` of meshes and a flag
     on a `Group` does nothing — the shadow pass tests `isMesh`. */
  prop: { cast: true, receive: true },

  /* Receivers only. */
  /* The floor is the surface every shadow in the game lands on. It does not
     cast: there is nothing below it, and a single one-sided plane spanning
     the whole level in the depth pass — rendered back-face, since three
     flips `FrontSide` to `BackSide` for shadows — is a good way to put the
     entire scene in shadow. */
  floor: { cast: false, receive: true },
  /* The three ceiling shapes `src/world/Ceiling.ts` can build: one plane on
     levels that never opted in, and the per-cell instanced pair on levels
     that did. All three receive and none cast — the lamp is at 1.4 and the
     ceiling starts at WALLH=3.4, so ceiling geometry can only throw a
     shadow upward, onto nothing.

     Worth knowing for the plane: `Ceiling.ts`'s header argues the single
     four-vertex plane is provably ambient-only under the lamp, which was
     true when it was written against r128's per-vertex `MeshLambertMaterial`.
     three 0.164.1 shades Lambert per *fragment* (`meshlambert.glsl.js`
     includes `lights_lambert_fragment` and `lights_fragment_begin` in the
     fragment shader), so the plane does now take lamp light near the
     player, and `receiveShadow` on it is real rather than theoretical. */
  ceiling: { cast: false, receive: true },
  ceilingCells: { cast: false, receive: true },
  ceilingRisers: { cast: false, receive: true },
  /* The torch post: a 0.06-0.09 radius cylinder. It receives, but it does
     not cast — at 256 texels a 12cm-wide object is below one texel past
     about two metres, so its shadow would not be a pole, it would be a
     dashed line that crawls as the player walks. Deliberate, not an
     oversight. */
  torchPost: { cast: false, receive: true },
};

/**
 * Sets `shadowMap.enabled` from the persisted setting and pins the type.
 * Called once from `RenderCore.ts`'s module body, immediately after the
 * renderer is constructed.
 *
 * It reads `save.shadows` at *module-load default*, never a stored value,
 * for exactly the reason `sizeRender()` does — `RenderCore.ts` evaluates
 * before `main.ts`'s `loadSave()` can have run. `main.ts` calls
 * `applyShadowSetting()` right after `loadSave()` to apply what was
 * actually loaded, the same second-call pattern the resolution setting uses.
 */
export function initShadowMap(renderer: THREE.WebGLRenderer): void {
  renderer.shadowMap.enabled = save.shadows;
  renderer.shadowMap.type = THREE.BasicShadowMap;
}

/**
 * Makes the player's lamp the one shadow caster. Called by `loadLevel`
 * right after it builds the lamp, because the lamp is rebuilt with the
 * scene on every level load.
 *
 * `bias` and `normalBias` are both needed and do different jobs.
 * `normalBias` pushes the shadow lookup along the surface normal before it
 * is compared, which is what keeps a large flat floor lit by a light 1.4
 * units above it from self-shadowing into moire; `bias` is the constant
 * depth offset that covers the rest. Both are small and negative/positive
 * respectively by the usual convention, and both were settled by looking at
 * the game, not by arithmetic — see the task report's before/after frames.
 */
export function configureLampShadow(lamp: THREE.PointLight): void {
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  lamp.shadow.bias = -0.004;
  lamp.shadow.normalBias = 0.04;
}

/**
 * Applies `SHADOW_POLICY` to a freshly-built scene. Called once at the end
 * of `loadLevel`, after every builder has added its children.
 *
 * Dispatch is on the child's `name`, assigned at the point each mesh is
 * built, rather than on its material or geometry type. That is the whole
 * reason `tests/render/shadows.test.ts` can assert the policy is *total* —
 * a future task that adds a new kind of level geometry and forgets to
 * decide its shadow behaviour gets a named test failure instead of a mesh
 * that silently does not cast.
 */
export function applyShadowFlags(root: THREE.Object3D): void {
  for (const child of root.children) {
    const rule = SHADOW_POLICY[child.name];
    if (rule === undefined) continue;
    // Whole subtree: `spawnProp` builds tables, chairs and pews as a
    // `Group`, and a flag on the Group itself reaches no renderable.
    child.traverse((o) => { o.castShadow = rule.cast; o.receiveShadow = rule.receive; });
  }
}

/**
 * Re-applies `save.shadows` to a renderer that is already running, and to a
 * scene whose materials have already compiled. Called from `main.ts` right
 * after `loadSave()`, and from the settings toggle.
 *
 * The `needsUpdate` sweep is not optional. `WebGLPrograms.getParameters`
 * folds `renderer.shadowMap.enabled` into the program cache key, but three
 * does not invalidate already-compiled materials when the flag changes —
 * so without this, flipping the setting mid-level leaves every existing
 * material running the shader it was compiled with and the toggle appears
 * to do nothing until the next level load.
 */
export function applyShadowSetting(): void {
  if (!renderState.renderer) return;
  renderState.renderer.shadowMap.enabled = save.shadows;
  if (!renderState.scene) return;
  renderState.scene.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    if (!m) return;
    for (const one of Array.isArray(m) ? m : [m]) one.needsUpdate = true;
  });
}

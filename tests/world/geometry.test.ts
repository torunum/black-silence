// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { LEVELS } from "../../src/world/levels/index";

/**
 * Phase 2 Part A Task 3 — instancing the level's wall/pillar/platform
 * geometry (`src/world/LevelLoader.ts`). Modelled on
 * `tests/integration/gpuDisposeWiring.test.ts` for booting far enough to
 * inspect a loaded level: NEW GAME through `src/main.ts`'s real menu wiring
 * puts the prologue live, then `loadLevel(n)` switches levels directly.
 *
 * ## What actually changed, and what didn't
 *
 * `#`/`W` walls (one shared `wallGeo`+`matWall`) and `I` pillars (one shared
 * `pilGeo`+`matPil`) each collapse into a single `InstancedMesh`; height-map
 * platforms (previously a fresh `BoxGeometry` *per cell*, since height
 * varies) collapse into a single `InstancedMesh` on one shared unit-box
 * geometry, scaled per instance. Measured at load:
 *
 *   prologue (level 0): scene.children.length  237 -> 33
 *   level 1:             scene.children.length  295 -> 93
 *
 * (204 and 202 wall/pillar cells respectively, each a `Mesh` before, now 2
 * `InstancedMesh` objects per level — see this task's report for the
 * frame-by-frame trace confirmation that only `scene.count`/`scene.digest`
 * moved, camera and hud did not.)
 *
 * Doors/secrets (`+`/`D`/`S`) deliberately did NOT move: `doorTick`/
 * `interact` (`src/player/Interact.ts`) animate one specific mesh per door,
 * which an `InstancedMesh` has no per-instance object to hand them, and
 * doors don't even share one material the way walls do (locked/flesh/plain
 * textures, vs. secrets sharing `matWall`). The floor and ceiling were
 * already one `Mesh` each — nothing to merge, untouched. `world.grid` and
 * `world.wallSegs` — what `src/world/Collision.ts` actually reads — are
 * asserted unchanged below; the merge only changes what gets added to
 * `renderState.scene`.
 */

let loadLevel: (idx: number) => void;
let doorTick: (dt: number) => void;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  // jsdom implements neither, and startGame calls the first on the canvas.
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};

  // Dynamic, not top-of-file: src/world/LevelLoader.ts transitively imports
  // src/render/RenderCore.ts, which captures the WebGL canvas at its own
  // module scope the moment it is first evaluated (see
  // gpuDisposeWiring.test.ts's own header for the same constraint).
  // src/player/Interact.ts has the same eager-capture constraint through
  // src/ui/HudMessages.ts's `const msgEl = el("msg")` (that file's own doc
  // comment names it) — #msg only exists after loadGameHtml() above runs.
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ doorTick } = await import("../../src/player/Interact"));

  await import("../../src/main");

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  // NEW GAME's loadLevel(0) call puts us in the prologue before any of this
  // file's own loadLevel(...) calls below.
});

describe("the level's wall/pillar/platform geometry is instanced, not one Mesh per cell", () => {
  /**
   * 33 is the prologue's measured post-merge count (was 237). The ceiling
   * is set well above that — not to pin an exact number, which the FX
   * accumulating during play would eventually violate anyway, but to fail
   * if a future change silently un-merges the level back toward
   * per-cell Mesh objects. Proven red: reverting `src/world/LevelLoader.ts`'s
   * wall loop to `new THREE.Mesh(wallGeo,matWall)` per cell (this task's
   * pre-image) pushes the prologue's load-time count back to 237, which
   * fails this ceiling — see this task's report.
   */
  const PROLOGUE_CHILD_CEILING = 80;

  it("builds the prologue's walls/pillars as InstancedMesh objects, not hundreds of Mesh children", () => {
    const scene = renderState.scene as THREE.Scene;
    expect(scene.children.length).toBeLessThan(PROLOGUE_CHILD_CEILING);
    const instanced = scene.children.filter((c) => (c as THREE.InstancedMesh).isInstancedMesh);
    expect(instanced.length).toBeGreaterThanOrEqual(1);
    // Confirms it's actually collapsing many cells, not just technically an
    // InstancedMesh of count 1 — a mutation this precise (see the report).
    expect(instanced.some((m) => (m as THREE.InstancedMesh).count > 50)).toBe(true);
  });

  it("builds level 1's height-map-free walls/pillars the same way", () => {
    loadLevel(1);
    const scene = renderState.scene as THREE.Scene;
    // Level 1's measured post-merge count is 93 (was 295); no headroom
    // maths beyond the prologue's — same shape, different level.
    expect(scene.children.length).toBeLessThan(150);
    expect(scene.children.some((c) => (c as THREE.InstancedMesh).isInstancedMesh)).toBe(true);
  });

  it("instances height-map platforms too, on a level that actually has them", () => {
    // Levels 0 and 1 have no elevated cells (world.heightMap's own values
    // are all <=0 even where the map exists), so the platform branch's
    // `if(platMats.length)` never fires for either — level 3 does have
    // real platforms and is what actually exercises that code path.
    loadLevel(3);
    const scene = renderState.scene as THREE.Scene;
    const instanced = scene.children.filter((c) => (c as THREE.InstancedMesh).isInstancedMesh);
    // walls, pillars, platforms — three distinct InstancedMesh groups.
    expect(instanced.length).toBeGreaterThanOrEqual(3);
  });
});

describe("collision data is untouched — the merge changes rendering, not the map", () => {
  /**
   * `src/world/Collision.ts` reads `world.grid` and `world.wallSegs`, never
   * the scene graph — this is the assertion that actually proves the
   * player can still walk exactly where they could before, and is worth
   * more than any scene-count check (a scene-count check passes even if
   * the map is broken). Compared against the level definition's own
   * `build()` output rather than a hardcoded map, so it stays correct if a
   * level's layout ever changes.
   *
   * Only wall-relevant characters are compared: `loadLevel`'s entity loop
   * (unrelated to this task) zeroes every non-wall cell to "." after
   * spawning whatever was there, so `world.grid` and a fresh `build()` call
   * intentionally differ on entity cells.
   */
  const WALL_CHARS = new Set(["#", "W", "I", "+", "D", "S"]);

  it("world.grid's wall layout matches the level definition's own build() output, cell for cell", () => {
    loadLevel(1);
    const built = LEVELS[1].build();
    expect(world.GW).toBe(built.W);
    expect(world.GH).toBe(built.H);
    let mismatches = 0;
    for (let z = 0; z < built.H; z++) {
      for (let x = 0; x < built.W; x++) {
        if (WALL_CHARS.has(built.g[z][x]) && built.g[z][x] !== world.grid[z][x]) mismatches++;
      }
    }
    expect(mismatches).toBe(0);
  });

  it("world.wallSegs deep-equals the level definition's own segs", () => {
    const built = LEVELS[1].build();
    expect(world.wallSegs).toEqual(built.segs || []);
  });
});

describe("doors stay individual meshes — instancing must not swallow them", () => {
  it("world.doors holds a distinct mesh object per door, not shared/aliased instances", () => {
    loadLevel(1);
    const doors = Object.values(world.doors) as Array<{ mesh: THREE.Object3D }>;
    expect(doors.length).toBeGreaterThan(0); // level 1 has doors — this test is void without one
    const distinctMeshes = new Set(doors.map((d) => d.mesh));
    expect(distinctMeshes.size).toBe(doors.length);
    // None of them collapsed into an InstancedMesh — every door mesh is a
    // plain Mesh with its own identity `doorTick`/`interact` can target.
    for (const d of doors) expect((d.mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh).toBeFalsy();
  });

  it("opening one door moves only that door's mesh, proving each has an independent transform", () => {
    loadLevel(1);
    const doors = Object.entries(world.doors) as Array<[string, { mesh: THREE.Object3D; open: boolean }]>;
    expect(doors.length).toBeGreaterThanOrEqual(2); // need a second door as a control
    const [, target] = doors[0];
    const [, control] = doors[1];
    const targetY0 = target.mesh.position.y, controlY0 = control.mesh.position.y;

    target.open = true; // what interact() sets on the door the player faces
    doorTick(1); // what src/core/Loop.ts calls every gameplay frame

    expect(target.mesh.position.y).toBeLessThan(targetY0); // src/player/Interact.ts's doorTick lowers an open door
    expect(control.mesh.position.y).toBe(controlY0); // untouched — proves per-door independence
  });
});

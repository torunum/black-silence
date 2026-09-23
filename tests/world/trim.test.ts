// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { CELL, WALLH } from "../../src/world/Grid";
import { ceilHeightAtCell, solidAt } from "../../src/world/Collision";
import { LEVELS } from "../../src/world/levels/index";
import { SHADOW_POLICY } from "../../src/render/Shadows";

/**
 * Phase 2 Part B — gothic trim (`src/world/Trim.ts`): pillar bases and
 * capitals, and a plinth and a cornice on every wall face that can be seen.
 *
 * ## What this file establishes, and what it does not
 *
 * It establishes **where** the trim is: that every pillar got both pieces,
 * that every course sits on a face that looks onto an open cell and every
 * such face got one, that each course takes its heights from the cell it
 * faces (a platform's top, a raised vault's ceiling), that secret doors
 * carry theirs and plain doors carry none, that the whole thing is a
 * constant handful of scene children, and that collision — `world.grid`,
 * `world.wallSegs`, and every `solidAt` answer on a fine lattice — is
 * exactly what it was.
 *
 * The expected faces are re-derived here from `world.grid` with this file's
 * own definition of "open", never read back out of `Trim.ts`, so a wrong
 * rule in the module cannot agree with itself.
 *
 * It does **not** establish that the trim looks right. No test here samples
 * a pixel. The proportions (`Trim.ts`'s header derives them from the 400 x
 * 225 framebuffer and 78-degree field of view) and the verdict on whether
 * trim improves or muddies the picture come from matched before/after
 * frames taken in a real browser; see
 * `.superpowers/sdd/2026-09-23-phase2b-gothic-trim/task-1-report.md`.
 *
 * Booted the way `tests/world/geometry.test.ts` boots: NEW GAME through
 * `src/main.ts`'s real menu wiring, then `loadLevel(n)`, with the same
 * dynamic-import constraint.
 */

let loadLevel: (idx: number) => void;
let doorTick: (dt: number) => void;
let buildTrim: (scene: THREE.Scene, wallTex: THREE.Texture) => void;
let TEX: Record<string, THREE.Texture>;

/** This file's own notion of a cell a face can be seen from: in the map and not a full-cell block. */
const BLOCKS = new Set(["#", "W", "+", "D", "S"]);
function open(x: number, z: number): boolean {
  const row = world.grid[z];
  const ch = row && row[x];
  return ch !== undefined && !BLOCKS.has(ch);
}
function platformTop(x: number, z: number): number {
  const h = (world.heightMap && world.heightMap[z] && world.heightMap[z][x]) || 0;
  return h > 0 ? h : 0;
}
const DIRS: Array<[number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function child(name: string): THREE.InstancedMesh | undefined {
  return (renderState.scene.children as THREE.Object3D[]).find((c) => c.name === name) as THREE.InstancedMesh | undefined;
}

interface Placed { pos: THREE.Vector3; up: THREE.Vector3; out: THREE.Vector3 }
function placed(m: THREE.InstancedMesh, parent?: THREE.Matrix4): Placed[] {
  const res: Placed[] = [];
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < m.count; i++) {
    m.getMatrixAt(i, mtx);
    if (parent) mtx.premultiply(parent);
    const pos = new THREE.Vector3().setFromMatrixPosition(mtx);
    const up = new THREE.Vector3().setFromMatrixColumn(mtx, 1).normalize();
    const out = new THREE.Vector3().setFromMatrixColumn(mtx, 2).normalize();
    res.push({ pos, up, out });
  }
  return res;
}

/** The wall cell a course belongs to and the cell it looks onto, read back off its transform. */
function faceOf(p: Placed): { wx: number; wz: number; nx: number; nz: number; dx: number; dz: number } {
  const dx = Math.round(p.out.x), dz = Math.round(p.out.z);
  const wx = Math.floor((p.pos.x - dx * .5) / CELL), wz = Math.floor((p.pos.z - dz * .5) / CELL);
  return { wx, wz, nx: wx + dx, nz: wz + dz, dx, dz };
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};

  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ doorTick } = await import("../../src/player/Interact"));
  ({ buildTrim } = await import("../../src/world/Trim"));
  ({ TEX } = await import("../../src/render/ProcTextures"));
  await import("../../src/main");

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
});

// KNOWN-19: loadLevel arms real-clock timers; cancel them before teardown.
afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

describe("every pillar reads as a column", () => {
  it("every pillar has a base at its foot and a capital at its head", () => {
    // MUTATION TARGET: drop the pillar trim from `buildTrim` (or either of
    // `pierMatrices`' two transforms) and this case goes red.
    let levelsWithPillars = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const cells: Array<[number, number]> = [];
      for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) if (world.grid[z][x] === "I") cells.push([x, z]);
      const trim = child("pillarTrim");
      if (!cells.length) { expect(trim, `level ${i} has no pillars, so no pillar trim`).toBeUndefined(); continue; }
      levelsWithPillars++;
      expect(trim, `level ${i} pillarTrim`).toBeDefined();
      const got = placed(trim!);
      expect(got.length, `level ${i}: two pieces per pillar`).toBe(2 * cells.length);
      for (const [x, z] of cells) {
        const wx = (x + .5) * CELL, wz = (z + .5) * CELL;
        const at = (y: number) => got.filter((p) => Math.abs(p.pos.x - wx) < 1e-6 && Math.abs(p.pos.z - wz) < 1e-6 && Math.abs(p.pos.y - y) < 1e-6);
        const base = at(0), cap = at(WALLH);
        expect(base.length, `level ${i} pillar (${x},${z}) base`).toBe(1);
        expect(cap.length, `level ${i} pillar (${x},${z}) capital`).toBe(1);
        expect(base[0].up.y, "the base stands upright").toBeCloseTo(1, 6);
        expect(cap[0].up.y, "the capital is the base turned upside down").toBeCloseTo(-1, 6);
      }
    }
    expect(levelsWithPillars, "the case is void without a level that has pillars").toBeGreaterThan(3);
  });
});

describe("wall courses go on the faces that can be seen, and only those", () => {
  it("puts a plinth and a cornice on every wall face with an open neighbour, and on no other face", () => {
    // MUTATION TARGET: widen `Trim.ts`'s exposure rule to any face at all
    // (or to faces against doors), and the "no walkable neighbour" check
    // below goes red on the first such instance.
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const course = child("wallCourse");
      expect(course, `level ${i} wallCourse`).toBeDefined();
      const got = placed(course!);
      const seen = new Map<string, { plinth: number; cornice: number }>();
      for (const p of got) {
        const f = faceOf(p);
        const wallCh = world.grid[f.wz]?.[f.wx];
        expect(["#", "W"], `level ${i}: a course at (${p.pos.x},${p.pos.z}) belongs to a wall cell`).toContain(wallCh);
        expect(open(f.nx, f.nz), `level ${i}: course on wall (${f.wx},${f.wz}) facing (${f.dx},${f.dz}) has no walkable neighbour`).toBe(true);
        const key = `${f.wx},${f.wz},${f.dx},${f.dz}`;
        const tally = seen.get(key) || { plinth: 0, cornice: 0 };
        if (p.up.y > 0) {
          tally.plinth++;
          expect(p.pos.y, `level ${i} ${key}: plinth stands on the facing cell's floor`).toBeCloseTo(platformTop(f.nx, f.nz), 6);
        } else {
          tally.cornice++;
          expect(p.pos.y, `level ${i} ${key}: cornice hangs from the facing cell's ceiling`).toBeCloseTo(ceilHeightAtCell(f.nx, f.nz), 6);
        }
        seen.set(key, tally);
      }
      // Completeness, from this file's own derivation of the exposed faces.
      let expected = 0;
      for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
        if (world.grid[z][x] !== "#" && world.grid[z][x] !== "W") continue;
        for (const [dx, dz] of DIRS) {
          if (!open(x + dx, z + dz)) continue;
          const room = ceilHeightAtCell(x + dx, z + dz) - platformTop(x + dx, z + dz);
          const key = `${x},${z},${dx},${dz}`;
          if (room < 1.2) { expect(seen.has(key), `level ${i} ${key}: too little wall for two courses`).toBe(false); continue; }
          if (room < 1.4) continue;   // the threshold is a look value; only pin the clear cases either side of it
          expected++;
          expect(seen.get(key), `level ${i} ${key}: an exposed face got no course`).toEqual({ plinth: 1, cornice: 1 });
        }
      }
      expect(expected, `level ${i}: the case is void without exposed faces`).toBeGreaterThan(50);
    }
  });

  it("hangs each cornice under the vault it faces on the level that raises its ceiling", () => {
    // Level 3 is the one level with a ceiling map. A cornice left at WALLH
    // there would be a line halfway up the wall with the real cornice line
    // (where the riser meets the vault) bare.
    loadLevel(3);
    expect(world.ceilMap).not.toBeNull();
    const cornices = placed(child("wallCourse")!).filter((p) => p.up.y < 0);
    const raised = cornices.filter((p) => { const f = faceOf(p); return ceilHeightAtCell(f.nx, f.nz) > WALLH; });
    expect(raised.length, "level 3 has wall faces under a raised vault").toBeGreaterThan(20);
    for (const p of raised) expect(p.pos.y).toBeGreaterThan(WALLH + 1);
  });

  it("stands each plinth on the platform it is beside, not inside it", () => {
    loadLevel(3);
    const plinths = placed(child("wallCourse")!).filter((p) => p.up.y > 0);
    const onPlatforms = plinths.filter((p) => { const f = faceOf(p); return platformTop(f.nx, f.nz) > 0; });
    expect(onPlatforms.length, "level 3 has wall faces beside platforms").toBeGreaterThan(20);
    for (const p of onPlatforms) expect(p.pos.y).toBeGreaterThan(0);
  });
});

describe("doors", () => {
  it("leaves plain and locked doors bare", () => {
    loadLevel(1);
    const plain = Object.values(world.doors).filter((d) => !d.secret);
    expect(plain.length).toBeGreaterThan(0);
    for (const d of plain) expect((d.mesh as THREE.Object3D).children).toEqual([]);
  });

  it("gives each secret door the course its neighbours have, riding down with the door", () => {
    // A secret door is drawn with the wall's own material and geometry. A
    // course that ran along the wall and stopped for one cell would mark
    // every secret in the game.
    let secrets = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      for (const [key, d] of Object.entries(world.doors)) {
        if (!d.secret) continue;
        secrets++;
        const mesh = d.mesh as THREE.Mesh;
        const [x, z] = key.split(",").map(Number);
        const faces = DIRS.filter(([dx, dz]) => open(x + dx, z + dz)).length;
        const sc = mesh.children.find((c) => c.name === "secretCourse") as THREE.InstancedMesh | undefined;
        expect(sc, `level ${i} secret door ${key}`).toBeDefined();
        expect(sc!.count, `level ${i} secret door ${key}: a plinth and a cornice per open face`).toBe(2 * faces);
        mesh.updateMatrixWorld(true);
        const before = placed(sc!, mesh.matrixWorld);
        for (const p of before) {
          const f = faceOf(p);
          expect([f.wx, f.wz], "the course belongs to this door's cell").toEqual([x, z]);
          const want = p.up.y > 0 ? platformTop(f.nx, f.nz) : ceilHeightAtCell(f.nx, f.nz);
          expect(p.pos.y, "at the same heights as the walls either side while shut").toBeCloseTo(want, 6);
        }
        d.open = true;
        doorTick(0.5);
        mesh.updateMatrixWorld(true);
        const after = placed(sc!, mesh.matrixWorld);
        for (let k = 0; k < after.length; k++) expect(after[k].pos.y).toBeCloseTo(before[k].pos.y - 1.3, 6);
      }
    }
    expect(secrets, "the case is void without a secret door").toBeGreaterThan(3);
  });
});

describe("trim is instanced", () => {
  it("adds at most two scene children per level, however many pillars and faces it decorates", () => {
    // The Phase 2 Part A property. A mesh per face would put hundreds of
    // children back (level 2 alone has over three hundred exposed faces).
    const perLevel: Array<{ children: number; instances: number }> = [];
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const kids = (renderState.scene.children as THREE.Object3D[]).filter((c) => c.name === "wallCourse" || c.name === "pillarTrim");
      for (const k of kids) expect((k as THREE.InstancedMesh).isInstancedMesh).toBe(true);
      perLevel.push({ children: kids.length, instances: kids.reduce((n, k) => n + (k as THREE.InstancedMesh).count, 0) });
    }
    for (const l of perLevel) expect(l.children).toBeLessThanOrEqual(2);
    const counts = perLevel.map((l) => l.instances);
    // The instance totals vary by several hundred across the levels while
    // the child count does not move — the whole point.
    expect(Math.max(...counts) - Math.min(...counts)).toBeGreaterThan(200);
  });
});

describe("collision is untouched — trim is visual", () => {
  /** Everything `src/world/Collision.ts` reads, plus its answers on a quarter-unit lattice. */
  function snapshot(): string {
    const solid: number[] = [];
    for (let z = .125; z < world.GH * CELL; z += .25) for (let x = .125; x < world.GW * CELL; x += .25) solid.push(solidAt(x, z) ? 1 : 0);
    return JSON.stringify({ grid: world.grid, segs: world.wallSegs, h: world.heightMap, c: world.ceilMap, solid: solid.join("") });
  }

  it("leaves world.grid and world.wallSegs as the level built them", () => {
    // MUTATION TARGET: have `buildTrim` write a cell of `world.grid` or push
    // onto `world.wallSegs`, and this case goes red. Compared against each
    // level's own `build()`, so a write made *during* `loadLevel` is caught
    // too, not only one made by a second call.
    const WALLS = new Set(["#", "W", "I", "+", "D", "S"]);
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const built = LEVELS[i].build();
      for (let z = 0; z < built.H; z++) for (let x = 0; x < built.W; x++) {
        const want = WALLS.has(built.g[z][x]) ? built.g[z][x] : ".";
        expect(world.grid[z][x], `level ${i} cell (${x},${z})`).toBe(want);
      }
      expect(world.wallSegs).toEqual(built.segs || []);
    }
  });

  it("answers every solidAt query the same with or without it", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const before = snapshot();
      buildTrim(new THREE.Scene(), TEX.churchWall);
      expect(snapshot(), `level ${i}`).toBe(before);
    }
  });
});

describe("shadows", () => {
  it("gives trim the cast/receive policy of what it decorates", () => {
    expect(SHADOW_POLICY.wallCourse).toEqual(SHADOW_POLICY.wall);
    expect(SHADOW_POLICY.pillarTrim).toEqual(SHADOW_POLICY.pillar);
    loadLevel(1);
    for (const [trim, host] of [["wallCourse", "wall"], ["pillarTrim", "pillar"]]) {
      expect(child(trim)!.castShadow, trim).toBe(child(host)!.castShadow);
      expect(child(trim)!.receiveShadow, trim).toBe(child(host)!.receiveShadow);
    }
    const secret = Object.values(world.doors).find((d) => d.secret)!;
    const mesh = secret.mesh as THREE.Mesh;
    const sc = mesh.children.find((c) => c.name === "secretCourse")!;
    expect(sc.castShadow).toBe(mesh.castShadow);
    expect(sc.receiveShadow).toBe(mesh.receiveShadow);
  });
});

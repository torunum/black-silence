// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { CELL, EYE, WALLH } from "../../src/world/Grid";
import { solidAt } from "../../src/world/Collision";
import { LEVELS } from "../../src/world/levels/index";
import { SHADOW_POLICY } from "../../src/render/Shadows";
import { BANDTEX } from "../../src/render/BandTextures";

/**
 * Pointed arches over doorways (`src/world/Arches.ts`).
 *
 * Establishes **which** doors carry an arch (plain and locked ones with a
 * real wall either side, never a secret), that a closed door hides it — every
 * vertex inside the door's box and the two faces a measured distance off the
 * box's own, so nothing is coplanar — that its faces wind the way their
 * normals point (a wrong winding culls the face and the arch simply is not
 * there), that it is one scene child a level, and that collision is exactly
 * what it was.
 *
 * The expected doors are re-derived here from `world.grid` with this file's
 * own rule, never read back out of `Arches.ts`.
 *
 * It does not establish that the arch looks right. The frames that do are in
 * `.superpowers/sdd/2026-09-24-trim-finished/task-3-report.md`.
 */

let loadLevel: (idx: number) => void;
let doorTick: (dt: number) => void;
let buildArches: (scene: THREE.Scene, bandTex: THREE.Texture) => void;
let A: typeof import("../../src/world/Arches");

const BLOCKS = new Set(["#", "W", "+", "D", "S"]);
function at(x: number, z: number): string | undefined { return world.grid[z]?.[x]; }
function open(x: number, z: number): boolean { const c = at(x, z); return c !== undefined && !BLOCKS.has(c); }
function wall(x: number, z: number): boolean { const c = at(x, z); return c === "#" || c === "W"; }

/** This file's own rule: which cells should carry an arch, and which way the passage runs. */
function expectedArches(): Map<string, "x" | "z"> {
  const out = new Map<string, "x" | "z">();
  for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
    const c = at(x, z);
    if (c !== "+" && c !== "D") continue;
    if (wall(x - 1, z) && wall(x + 1, z) && (open(x, z - 1) || open(x, z + 1))) out.set(x + "," + z, "z");
    else if (wall(x, z - 1) && wall(x, z + 1) && (open(x - 1, z) || open(x + 1, z))) out.set(x + "," + z, "x");
  }
  return out;
}

function arches(): THREE.InstancedMesh | undefined {
  return (renderState.scene.children as THREE.Object3D[]).find((c) => c.name === "doorArch") as THREE.InstancedMesh | undefined;
}

/** Every instance's triangles in world space, with the stored normals carried through. */
function worldTriangles(m: THREE.InstancedMesh, i: number): Array<{ p: THREE.Vector3[]; n: THREE.Vector3[] }> {
  const mtx = new THREE.Matrix4(); m.getMatrixAt(i, mtx);
  const nm = new THREE.Matrix3().getNormalMatrix(mtx);
  const pos = m.geometry.getAttribute("position"), nrm = m.geometry.getAttribute("normal");
  const tris = [];
  for (let k = 0; k < pos.count; k += 3) {
    const p = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(pos, k + j).applyMatrix4(mtx));
    const n = [0, 1, 2].map((j) => new THREE.Vector3().fromBufferAttribute(nrm, k + j).applyMatrix3(nm).normalize());
    tris.push({ p, n });
  }
  return tris;
}

function cellOf(m: THREE.InstancedMesh, i: number): { x: number; z: number; axis: "x" | "z" } {
  const mtx = new THREE.Matrix4(); m.getMatrixAt(i, mtx);
  const p = new THREE.Vector3().setFromMatrixPosition(mtx);
  const localZ = new THREE.Vector3().setFromMatrixColumn(mtx, 2);
  return { x: Math.floor(p.x / CELL), z: Math.floor(p.z / CELL), axis: Math.abs(localZ.z) > .5 ? "z" : "x" };
}

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ doorTick } = await import("../../src/player/Interact"));
  A = await import("../../src/world/Arches");
  ({ buildArches } = A);
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

describe("which doorways get an arch", () => {
  it("every plain and locked door with a wall either side gets one, turned along its passage, and nothing else does", () => {
    // MUTATION TARGET: let `archAxis` accept `S`, or drop the jamb check,
    // and this goes red on the first secret or free-standing door.
    let total = 0, secrets = 0, skipped = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const want = expectedArches();
      const m = arches();
      if (!want.size) { expect(m, `level ${i} has no archable door, so no arch`).toBeUndefined(); continue; }
      expect(m, `level ${i} doorArch`).toBeDefined();
      const got = new Map<string, "x" | "z">();
      for (let k = 0; k < m!.count; k++) { const c = cellOf(m!, k); got.set(c.x + "," + c.z, c.axis); }
      expect(got.size, `level ${i}: one arch per door`).toBe(m!.count);
      expect([...got].sort(), `level ${i}`).toEqual([...want].sort());
      for (const [key, d] of Object.entries(world.doors)) {
        if (d.secret) { secrets++; expect(got.has(key), `level ${i}: secret door ${key} carries an arch`).toBe(false); }
        else if (!want.has(key)) skipped++;
      }
      total += want.size;
    }
    expect(total, "the case is void without arches").toBeGreaterThan(50);
    expect(secrets, "the case is void without secret doors").toBeGreaterThan(3);
    expect(skipped, "level 1's free-standing and walled-in doors are meant to be skipped").toBeGreaterThan(1);
  });
});

describe("a closed door hides it", () => {
  it("lies wholly inside its door's box, its faces a clear inset off the box's own", () => {
    // MUTATION TARGET: set `ARCH_INSET` to 0 (coplanar with the door's
    // faces — the flicker Phase 2B measured) or let the arch reach past
    // the cell, and this goes red.
    loadLevel(2);
    const m = arches()!;
    let verts = 0;
    for (let k = 0; k < m.count; k++) {
      const c = cellOf(m, k);
      const x0 = c.x * CELL, z0 = c.z * CELL;
      for (const t of worldTriangles(m, k)) for (const p of t.p) {
        verts++;
        const across = c.axis === "z" ? p.x - x0 : p.z - z0, along = c.axis === "z" ? p.z - z0 : p.x - x0;
        expect(across).toBeGreaterThanOrEqual(-1e-6); expect(across).toBeLessThanOrEqual(CELL + 1e-6);
        expect(p.y).toBeGreaterThanOrEqual(A.ARCH_SPRING - 1e-6); expect(p.y).toBeLessThanOrEqual(WALLH + 1e-6);
        expect(Math.min(along, CELL - along), "inset from the door's passage faces").toBeGreaterThanOrEqual(.03);
      }
    }
    expect(verts).toBeGreaterThan(1000);
  });

  it("stays where it is while the door sinks past it", () => {
    loadLevel(2);
    const m = arches()!;
    const before = [...m.instanceMatrix.array];
    for (const d of Object.values(world.doors)) { d.open = true; if (!d.secret) expect((d.mesh as THREE.Object3D).children).toEqual([]); }
    doorTick(0.5);
    expect([...m.instanceMatrix.array]).toEqual(before);
    expect(m.parent).toBe(renderState.scene);
  });
});

describe("the shape", () => {
  it("winds every face the way its normal points, so none is culled", () => {
    // MUTATION TARGET: swap two vertices of a spandrel or soffit quad.
    const g = A.archGeometry();
    const pos = g.getAttribute("position"), nrm = g.getAttribute("normal");
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    let spandrel = 0, soffit = 0;
    for (let k = 0; k < pos.count; k += 3) {
      a.fromBufferAttribute(pos, k); b.fromBufferAttribute(pos, k + 1); c.fromBufferAttribute(pos, k + 2);
      const geo = b.clone().sub(a).cross(c.clone().sub(a));
      if (geo.length() < 1e-9) continue;
      for (let j = 0; j < 3; j++) expect(geo.dot(n.fromBufferAttribute(nrm, k + j)), `triangle ${k / 3} vertex ${j}`).toBeGreaterThan(0);
      if (Math.abs(n.z) > .99) spandrel++; else { soffit++; expect(n.y, "the soffit faces down into the opening").toBeLessThanOrEqual(1e-9); }
    }
    expect(spandrel).toBe(4 * 2 * A.ARCH_SEGS);
    expect(soffit).toBe(2 * 2 * A.ARCH_SEGS);
    g.dispose();
  });

  it("is pointed, crowned at the cornice's foot, and springs clear above the eye", () => {
    // Semicircle rise over a 2-unit span is 1; a pointed arch rises more.
    expect(A.ARCH_APEX - A.ARCH_SPRING).toBeGreaterThan(CELL / 2 + .25);
    expect(A.ARCH_APEX).toBeCloseTo(WALLH - .34, 9);
    expect(A.ARCH_SPRING).toBeGreaterThan(EYE + .5);
    // The two arcs' tangents at the apex: at least 15 degrees off level, or it reads round.
    const cx = CELL / 2 - A.ARCH_R;
    expect(Math.atan2(-cx, A.ARCH_APEX - A.ARCH_SPRING) * 180 / Math.PI).toBeGreaterThan(15);
  });
});

describe("one scene child a level", () => {
  it("is a single InstancedMesh however many doors the level has", () => {
    let most = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const kids = (renderState.scene.children as THREE.Object3D[]).filter((c) => c.name === "doorArch");
      expect(kids.length, `level ${i}`).toBeLessThanOrEqual(1);
      if (kids.length) { expect((kids[0] as THREE.InstancedMesh).isInstancedMesh).toBe(true); most = Math.max(most, (kids[0] as THREE.InstancedMesh).count); }
    }
    expect(most, "a level with many arches still makes one child").toBeGreaterThan(8);
  });

  it("wears the level's trim band, flesh level included, and takes the wall's shadow rule", () => {
    expect(SHADOW_POLICY.doorArch).toEqual(SHADOW_POLICY.wall);
    for (const [i, theme] of [[1, "dungeon"], [2, "church"], [7, "flesh"]] as const) {
      loadLevel(i);
      const m = arches()!;
      expect((m.material as THREE.MeshLambertMaterial).map, `level ${i}`).toBe(BANDTEX[theme]);
      expect(m.castShadow).toBe(true); expect(m.receiveShadow).toBe(true);
    }
  });
});

describe("collision is untouched — the arch is visual", () => {
  it("leaves every arched doorway solid shut and walkable open, all the way across and through", () => {
    // MUTATION TARGET: have `buildArches` mark an arched door cell solid in
    // `world.grid`, or delete its door record — an open doorway then stops
    // the player under the arch. (The next test cannot see a write that
    // `loadLevel`'s own call already made; this one reads the outcome.)
    let cells = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      const m = arches();
      if (!m) continue;
      for (let k = 0; k < m.count; k++) {
        const c = cellOf(m, k), d = world.doors[c.x + "," + c.z];
        expect(d, `level ${i}: door record at ${c.x},${c.z}`).toBeDefined();
        for (const open of [false, true]) {
          d.open = open;
          for (let u = .05; u < CELL; u += .3) for (let v = .05; v < CELL; v += .3) {
            expect(solidAt(c.x * CELL + u, c.z * CELL + v), `level ${i}: ${c.x},${c.z} open=${open} at +${u.toFixed(2)},+${v.toFixed(2)}`).toBe(!open);
          }
        }
        cells++;
      }
    }
    expect(cells, "the case is void without arched doors").toBeGreaterThan(50);
  });

  it("answers every solidAt query the same after another build, and writes no cell", () => {
    // MUTATION TARGET: have `buildArches` push a wall segment or touch any
    // cell it has not already touched. A write it makes identically every
    // call is caught by the test above, not this one.
    for (let i = 0; i < LEVELS.length; i++) {
      loadLevel(i);
      for (const d of Object.values(world.doors)) d.open = true;   // an open doorway is where it could bite
      const snap = () => {
        const s: number[] = [];
        for (let z = .125; z < world.GH * CELL; z += .25) for (let x = .125; x < world.GW * CELL; x += .25) s.push(solidAt(x, z) ? 1 : 0);
        return JSON.stringify({ g: world.grid, w: world.wallSegs, s: s.join("") });
      };
      const before = snap();
      buildArches(new THREE.Scene(), BANDTEX.church!);
      expect(snap(), `level ${i}`).toBe(before);
    }
  });
});

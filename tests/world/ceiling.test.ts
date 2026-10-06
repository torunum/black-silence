// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { CELL, WALLH } from "../../src/world/Grid";
import { ceilHeightAtCell } from "../../src/world/Collision";
import { LEVELS } from "../../src/world/levels/index";
import { themeTex } from "../../src/world/ZoneLook";

/**
 * Phase 2 Part B Task 1 — the ceiling can vary per cell, opt-in per level
 * (`BuiltLevel.cmap` -> `world.ceilMap` -> `src/world/Ceiling.ts`).
 *
 * The structural half of the evidence. What it is guarding, in order of how
 * badly each would fail:
 *
 * 1. **Levels that did not opt in are unchanged.** Every level but 3 is in
 *    that branch today and all three committed trace fixtures record one of
 *    them, so this is what says the fixtures had no business moving.
 * 2. **The geometry follows the map, cell for cell.** A builder that read
 *    `WALLH` and ignored `world.ceilMap` would still produce a plausible
 *    instanced ceiling, and nothing else in the suite would mind.
 * 3. **Every height transition is closed by a riser.** This is the one that
 *    is invisible to everything else: an unclosed transition is a hole in
 *    the roof with the scene background showing through, and it passes any
 *    assertion aimed at the ceiling quads themselves. Counting the strips
 *    is the cheap half; Step 6's screenshots are the other half, and
 *    neither substitutes for the other.
 *
 * Booted the way `tests/world/geometry.test.ts` boots — NEW GAME through
 * `src/main.ts`'s real menu wiring, then `loadLevel(n)` — including its
 * dynamic-import constraint (`src/render/RenderCore.ts` captures the canvas
 * at module scope).
 */

let loadLevel: (idx: number) => void;

/** The InstancedMesh/Mesh `src/world/Ceiling.ts` tags with this name, if any. */
function named(name: string): THREE.Object3D[] {
  return (renderState.scene as THREE.Scene).children.filter((c) => c.name === name);
}

/** Per-instance translation+scale, read back out of an InstancedMesh. */
function instances(m: THREE.InstancedMesh): Array<{ pos: THREE.Vector3; scale: THREE.Vector3; quat: THREE.Quaternion }> {
  const out: Array<{ pos: THREE.Vector3; scale: THREE.Vector3; quat: THREE.Quaternion }> = [];
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < m.count; i++) {
    m.getMatrixAt(i, mtx);
    const pos = new THREE.Vector3(), scale = new THREE.Vector3(), quat = new THREE.Quaternion();
    mtx.decompose(pos, quat, scale);
    out.push({ pos, scale, quat });
  }
  return out;
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

// KNOWN-19: this file's loadLevel calls run on the real clock and arm
// loadLevel's own setTimeout timers past teardown. Same fix as the seven
// files Phase 3 Part D corrected.
afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

describe("a level with no ceiling map builds the single flat plane it always built", () => {
  it("level 4 gets exactly one ceiling child, a PlaneGeometry Mesh at y=WALLH", () => {
    // (it was level 1 until that level was rebuilt with tiers, which have ceilings of their own: it opts in now)
    loadLevel(4);
    expect(LEVELS[4].build().cmap).toBeUndefined(); // the premise: level 4 never opted in
    expect(world.ceilMap).toBeNull();

    const ceil = named("ceiling");
    expect(ceil.length).toBe(1);
    const cm = ceil[0] as THREE.Mesh;
    expect((cm.geometry as THREE.BufferGeometry).type).toBe("PlaneGeometry");
    expect(cm.position.y).toBe(WALLH);
    expect((cm as unknown as { isInstancedMesh?: boolean }).isInstancedMesh).toBeFalsy();
    // and none of the varying-ceiling geometry exists at all — the whole
    // point of "byte-for-byte unchanged in scene graph" is that opting out
    // costs a level nothing, not even an empty InstancedMesh.
    expect(named("ceilingCells").length).toBe(0);
    expect(named("ceilingRisers").length).toBe(0);
  });

  it("level 2 — the boss trace fixture's level — is in that branch too", () => {
    // Was "the prologue is in that branch too". The rebuilt prologue (the
    // prologue plan, Task 1) opts in with a ceiling map and zones — see the
    // next describe — so the unchanged-branch guard moved to the other trace
    // level that never opted in.
    loadLevel(2);
    expect(world.ceilMap).toBeNull();
    expect(named("ceiling").length).toBe(1);
    expect(named("ceilingCells").length).toBe(0);
  });
});

describe("the zoned prologue builds a ceiling per zone look, and none over the sky", () => {
  it("no quad over a sky cell, a quad at its mapped height over every other cell, each in its zone's texture", async () => {
    loadLevel(0);
    expect(world.zones).not.toBeNull();
    expect(named("ceiling").length).toBe(0);
    const zs = world.zones!;
    const skyCells = new Set<string>(), want = new Map<string, number>();
    for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
      if (zs.themes[zs.map[z][x]].sky) skyCells.add(x + "," + z); else want.set(x + "," + z, ceilHeightAtCell(x, z));
    }
    expect(skyCells.size, "the churchyard is open to the sky").toBeGreaterThan(200);
    const seen = new Set<string>();
    for (const m of named("ceilingCells") as THREE.InstancedMesh[]) {
      const map = (m.material as THREE.MeshLambertMaterial).map!;
      for (const { pos } of instances(m)) {
        const gx = Math.round(pos.x / CELL - 0.5), gz = Math.round(pos.z / CELL - 0.5), key = gx + "," + gz;
        expect(skyCells.has(key), `a ceiling quad over the sky at ${key}`).toBe(false);
        expect(pos.y).toBeCloseTo(want.get(key)!, 6);
        const t = zs.themes[zs.map[gz][gx]];
        const src = themeTex(t).ceil;   // the zone names its own where the theme's would be wrong: hell's vault, not the reference's hellCeil
        expect(map.image, `the ceiling at ${key} wears its zone's texture`).toBe(src.image);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(want.size);
  });
});

describe("a riser wears the wall of the zone of the lower cell of its pair", () => {
  it("every riser on the zoned prologue, edge by edge — against a wall, the wall's own zone (Ceiling.ts's keyAt(x+dx, z+dz))", async () => {
    loadLevel(0);
    const zs = world.zones!;
    const wallOf = (x: number, z: number) => themeTex(zs.themes[zs.map[z][x]]).wall;   // hell names the vault's stone for the riser between two ceilings
    let n = 0, differ = 0;
    const normal = new THREE.Vector3();
    for (const m of named("ceilingRisers") as THREE.InstancedMesh[]) {
      const map = (m.material as THREE.MeshLambertMaterial).map!;
      for (const { pos, quat } of instances(m)) {
        // the strip stands on the edge between the higher cell and the lower one, facing from the first to the second
        normal.set(0, 0, 1).applyQuaternion(quat);
        const dx = Math.round(normal.x), dz = Math.round(normal.z);
        const hx = Math.round((pos.x - dx * CELL / 2) / CELL - 0.5), hz = Math.round((pos.z - dz * CELL / 2) / CELL - 0.5);
        const lx = hx + dx, lz = hz + dz;
        expect(ceilHeightAtCell(lx, lz), `riser at ${hx},${hz}->${lx},${lz}: the lower cell is lower`).toBeLessThan(ceilHeightAtCell(hx, hz));
        // a shell zone's walls carry on up to the ceiling themselves (HellShell.ts): no riser stands where one would stand beside them
        expect(zs.themes[zs.map[lz][lx]].shell && "#W".includes(world.grid[lz][lx]), `a riser against hell's wall at ${lx},${lz}`).toBeFalsy();
        expect(map.image, `the riser between ${hx},${hz} (high) and ${lx},${lz} (low) wears the LOWER cell's wall`).toBe(wallOf(lx, lz).image);
        n++;
        if (wallOf(lx, lz).image !== wallOf(hx, hz).image) differ++;
      }
    }
    expect(n).toBeGreaterThan(20);
    // the premise: some edges do pair two different walls, or the rule could not be told from its opposite
    expect(differ).toBeGreaterThan(0);
  });
});

describe("a level with a ceiling map builds geometry matching the map, cell for cell", () => {
  it("level 3 replaces the plane with one instanced quad per cell, each at its mapped height", () => {
    loadLevel(3);
    expect(world.ceilMap).not.toBeNull();
    expect(named("ceiling").length).toBe(0); // the flat plane is gone

    const cells = named("ceilingCells");
    expect(cells.length).toBe(1); // instanced, not a Mesh per cell
    const mesh = cells[0] as THREE.InstancedMesh;
    expect(mesh.isInstancedMesh).toBe(true);
    expect(mesh.count).toBe(world.GW * world.GH);

    let mismatches = 0, raised = 0;
    for (const { pos } of instances(mesh)) {
      const gx = Math.round(pos.x / CELL - 0.5), gz = Math.round(pos.z / CELL - 0.5);
      const want = ceilHeightAtCell(gx, gz);
      if (Math.abs(pos.y - want) > 1e-6) mismatches++;
      if (want > WALLH) raised++;
    }
    expect(mismatches).toBe(0);
    // Without this the test passes on a level whose map is entirely default,
    // which would make every assertion above a statement about WALLH.
    expect(raised).toBeGreaterThan(50);
  });

  it("the authored vault really is three tiers above the default, not one flat raise", () => {
    loadLevel(3);
    const heights = new Set<number>();
    for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) heights.add(ceilHeightAtCell(x, z));
    expect(heights.has(WALLH)).toBe(true);      // the corridors outside the tomb
    expect(heights.size).toBeGreaterThanOrEqual(4); // WALLH + the three authored tiers
    // The crown, directly over the sovereign's cell — an authored number, so
    // that a level3.ts edit which silently flattens the vault is visible here.
    expect(ceilHeightAtCell(16, 11)).toBeCloseTo(8.6, 6);
    // A solid cell inside the same region deliberately keeps the wall height:
    // (16,12) is the tomb's centre pillar, and raising its ceiling would open
    // a gap above a WALLH-tall pillar.
    expect(ceilHeightAtCell(16, 12)).toBe(WALLH);
  });
});

describe("the riser strips close every height transition", () => {
  /**
   * Derived from `world.ceilMap` at run time, never from a written-down
   * count: this project has had three separate documented counts turn out
   * wrong, and a hardcoded number here would only ever be re-derived from
   * the implementation it is supposed to check.
   */
  function expectedRisers(): Array<{ x: number; y: number; z: number; h: number }> {
    const out: Array<{ x: number; y: number; z: number; h: number }> = [];
    for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
      const h = ceilHeightAtCell(x, z);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nh = ceilHeightAtCell(x + dx, z + dz);
        if (nh >= h) continue;
        out.push({ x: (x + 0.5) * CELL + dx * CELL / 2, y: (nh + h) / 2, z: (z + 0.5) * CELL + dz * CELL / 2, h: h - nh });
      }
    }
    return out;
  }

  it("level 3 has one strip per differing edge, spanning exactly the gap", () => {
    loadLevel(3);
    const want = expectedRisers();
    expect(want.length).toBeGreaterThan(0); // vacuous otherwise — level 3 must actually step

    const risers = named("ceilingRisers");
    expect(risers.length).toBe(1);
    const mesh = risers[0] as THREE.InstancedMesh;
    expect(mesh.isInstancedMesh).toBe(true);
    // One strip per edge, and not two: a pair of coincident strips on the
    // same edge would z-fight, so the count matching exactly is the assertion.
    expect(mesh.count).toBe(want.length);

    const got = instances(mesh).map(({ pos, scale }) =>
      `${pos.x.toFixed(4)},${pos.y.toFixed(4)},${pos.z.toFixed(4)}|${scale.y.toFixed(4)}`);
    const missing = want
      .map((w) => `${w.x.toFixed(4)},${w.y.toFixed(4)},${w.z.toFixed(4)}|${w.h.toFixed(4)}`)
      .filter((k) => !got.includes(k));
    expect(missing).toEqual([]);
  });

  it("each strip is as wide as a cell and faces along the edge it closes", () => {
    loadLevel(3);
    const mesh = named("ceilingRisers")[0] as THREE.InstancedMesh;
    const normal = new THREE.Vector3();
    for (const { scale, quat } of instances(mesh)) {
      expect(scale.x).toBeCloseTo(CELL, 6); // spans the whole shared edge
      expect(scale.y).toBeGreaterThan(0);   // a zero-height strip closes nothing
      normal.set(0, 0, 1).applyQuaternion(quat);
      expect(Math.abs(normal.y)).toBeLessThan(1e-6); // vertical strip, horizontal normal
      // The normal points at the cell centre on one side of the edge, so it
      // is axis-aligned: exactly one horizontal component is +/-1.
      expect(Math.abs(Math.abs(normal.x) + Math.abs(normal.z) - 1)).toBeLessThan(1e-6);
    }
    expect(((mesh.material as THREE.MeshLambertMaterial).side)).toBe(THREE.DoubleSide);
  });

  it("a level without a ceiling map has no risers to build", () => {
    loadLevel(4);
    expect(named("ceilingRisers").length).toBe(0);
  });
});

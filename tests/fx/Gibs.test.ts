import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { setScene } from "../../src/render/SceneRef";
import { fakeScene } from "../support/fakeScene";
import { buildParticles } from "../../src/fx/Particles";
import { resetDecals } from "../../src/fx/Decals";
import {
  gibGeo, gibMatsFlesh, gibMatsWood, gibTick, resetGibs, spawnGibChunk, spawnGibs,
} from "../../src/fx/Gibs";

/**
 * Unit coverage for src/fx/Gibs.ts. Like Decals.ts, spawnGibs/spawnGibChunk
 * construct fixed-shape THREE objects (gibGeo, a .13 box) — this proves the
 * same fixed-parameter facts a behavior-recorder comparison would, using the
 * fakeScene capture technique instead, because there is no reference-side
 * scene to record against without reimplementing the reference's own `scene`
 * global. See the task report's coverage map.
 */

function setUpScene() {
  const { scene, added } = fakeScene();
  setScene(scene);
  return added;
}

describe("spawnGibs", () => {
  it("creates n flesh gib meshes using gibGeo and one of gibMatsFlesh", () => {
    resetGibs();
    const added = setUpScene();
    buildParticles(); // spawnGibs(...,false) also calls blood(), which needs the particle pool built

    spawnGibs(1, 2, 3, 5, 2, false);

    // Filter rather than index, so the Points object buildParticles() added
    // to the same fake scene (and any future incidental adds) can't shift
    // which entries are the gib meshes.
    const gibMeshes = added.filter((o) => (o as THREE.Mesh).geometry === gibGeo) as THREE.Mesh[];
    expect(gibMeshes).toHaveLength(5);
    for (const m of gibMeshes) {
      expect(m.geometry).toBe(gibGeo);
      expect(gibMatsFlesh).toContain(m.material);
      expect(m.position.x).toBe(1);
      expect(m.position.y).toBe(2);
      expect(m.position.z).toBe(3);
      expect(m.scale.x).toBeGreaterThanOrEqual(0.6);
      expect(m.scale.x).toBeLessThan(1.7);
    }
  });

  it("creates wood gib meshes using gibMatsWood when wood=true, and spawns no blood", () => {
    resetGibs();
    const added = setUpScene();

    spawnGibs(0, 0, 0, 4, 2, true);

    expect(added).toHaveLength(4); // no addPool from blood-settling, since wood gibs spawn no blood
    for (const m of added as THREE.Mesh[]) {
      expect(m.geometry).toBe(gibGeo);
      expect(gibMatsWood).toContain(m.material);
    }
  });

  it("also spawns blood (min(40, n*3) particles) unless wood=true", () => {
    resetGibs();
    resetDecals();
    const gibsAdded = setUpScene();
    buildParticles(); // rebinds the same fake scene's `add` log to also capture the Points object
    const points = gibsAdded.find((o) => (o as THREE.Points).isPoints) as unknown as {
      geometry: { attributes: { color: { array: Float32Array } } };
    };

    spawnGibs(0, 0, 0, 3, 2, false); // n=3 -> min(40, 9) = 9 blood particles, r in [.35,.62]

    const colArr = points.geometry.attributes.color.array;
    for (let i = 0; i < 9; i++) {
      expect(colArr[i * 3]).toBeGreaterThanOrEqual(0.35);
      expect(colArr[i * 3]).toBeLessThanOrEqual(0.62);
    }
    expect(colArr[9 * 3]).toBe(0); // exactly 9, not 10
  });

  it("recycles the oldest gib mesh once GIBMAX (110) is reached", () => {
    resetGibs();
    const added = setUpScene();

    spawnGibs(0, 0, 0, 115, 1, true); // wood=true: no blood, no extra addPool noise

    expect(added).toHaveLength(110);
  });
});

describe("gibTick", () => {
  it("applies gravity, moves the mesh, and settles it onto the floor once vertical speed decays", () => {
    resetGibs();
    const added = setUpScene();
    spawnGibs(0, 0.5, 0, 1, 0, true); // pow=0: g.vx=g.vy=g.vz start at 0
    const m = added[0] as THREE.Mesh;

    // Run enough ticks for the gib to fall, bounce (or not) and settle.
    for (let i = 0; i < 200; i++) gibTick(1 / 60);

    expect(m.position.y).toBeCloseTo(0.07); // the floor clamp
  });
});

describe("spawnGibChunk", () => {
  it("throws one oversized (scale 2.2) flesh chunk biased toward the given direction", () => {
    resetGibs();
    const added = setUpScene();

    spawnGibChunk(5, 6, 7, 1, 0); // straight +x direction

    expect(added).toHaveLength(1);
    const m = added[0] as THREE.Mesh;
    expect(m.geometry).toBe(gibGeo);
    expect(m.material).toBe(gibMatsFlesh[0]);
    expect(m.position.x).toBe(5);
    expect(m.position.y).toBe(6);
    expect(m.position.z).toBe(7);
    expect(m.scale.x).toBeCloseTo(2.2);
  });
});

describe("resetGibs", () => {
  it("clears the gibs bookkeeping so a full pool creates fresh meshes again", () => {
    resetGibs();
    const added = setUpScene();

    spawnGibs(0, 0, 0, 110, 1, true); // fills GIBMAX
    expect(added).toHaveLength(110);

    resetGibs();
    spawnGibs(0, 0, 0, 1, 1, true); // gibs[] is empty again -> a brand new mesh
    expect(added).toHaveLength(111);
  });
});

import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { setScene } from "../../src/render/SceneRef";
import { fakeScene } from "../support/fakeScene";
import {
  addPool, addWallDecal, holeMat, poolMat, poolTick, resetDecals, scorchMat, splatMat,
} from "../../src/fx/Decals";

/**
 * Unit coverage for src/fx/Decals.ts. addPool/addWallDecal both construct
 * fixed-shape THREE objects (a 1-radius 8-segment circle; a 1x1 plane) —
 * candidates for the tests/behavior recorder in principle, but the
 * reference's own scene/pool state is impossible to observe without the
 * same "capture what got added" technique used here, so a direct
 * fakeScene-based test proves the same thing with far less machinery. See
 * the task report's coverage map.
 */

describe("addPool", () => {
  it("creates a circle mesh using poolMat, flattened onto the floor, scaled by .3x with the full size as its grow target", () => {
    resetDecals();
    const { scene, added } = fakeScene();
    setScene(scene);

    addPool(3, 4, 1);

    expect(added).toHaveLength(1);
    const m = added[0] as THREE.Mesh;
    expect(m.material).toBe(poolMat);
    expect((m.geometry as THREE.CircleGeometry).parameters).toEqual({
      radius: 1, segments: 8, thetaStart: 0, thetaLength: Math.PI * 2,
    });
    expect(m.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(m.position.x).toBe(3);
    expect(m.position.z).toBe(4);
    expect(m.position.y).toBeGreaterThanOrEqual(0.01);
    expect(m.position.y).toBeLessThan(0.01 + 0.004);
    expect(m.scale.x).toBeCloseTo(0.3); // s(=1) * .3
    expect(m.scale.y).toBeCloseTo(0.3);
    expect(m.userData.target).toBe(1); // the un-shrunk size poolTick grows toward
  });

  it("recycles the oldest pool mesh once POOLMAX (150) is reached, instead of allocating a new one", () => {
    resetDecals();
    const { scene, added } = fakeScene();
    setScene(scene);

    for (let i = 0; i < 155; i++) addPool(i, i, 0.5);

    expect(added).toHaveLength(150);
  });
});

describe("poolTick", () => {
  it("grows a pool mesh's scale toward its target size over time, and never past it", () => {
    resetDecals();
    const { scene, added } = fakeScene();
    setScene(scene);

    addPool(0, 0, 1); // scale starts at .3, target is 1
    const m = added[0] as THREE.Mesh;
    expect(m.scale.x).toBeCloseTo(0.3);

    poolTick(0.1); // + dt*1.4 = .14
    expect(m.scale.x).toBeCloseTo(0.44);
    expect(m.scale.y).toBe(m.scale.x);

    for (let i = 0; i < 50; i++) poolTick(1); // plenty of time to hit the cap
    expect(m.scale.x).toBeCloseTo(1);
  });
});

describe("addWallDecal", () => {
  it("creates a plane mesh with the given material, offset from the wall along its normal", () => {
    resetDecals();
    const { scene, added } = fakeScene();
    setScene(scene);

    addWallDecal(1, 2, 3, 1, 0, 0.4, splatMat);

    expect(added).toHaveLength(1);
    const m = added[0] as THREE.Mesh;
    expect(m.material).toBe(splatMat);
    expect((m.geometry as THREE.PlaneGeometry).parameters).toEqual({
      width: 1, height: 1, widthSegments: 1, heightSegments: 1,
    });
    expect(m.position.x).toBeCloseTo(1 + 1 * 0.012);
    expect(m.position.y).toBe(2);
    expect(m.position.z).toBeCloseTo(3);
    expect(m.scale.x).toBe(0.4); // s exactly; only scale.y carries the rnd(.7,1.3) jitter
  });

  it("recycles the oldest wall decal mesh and re-materials it once WDMAX (200) is reached", () => {
    resetDecals();
    const { scene, added } = fakeScene();
    setScene(scene);

    for (let i = 0; i < 205; i++) addWallDecal(i, 0, 0, 1, 0, 0.2, i % 2 === 0 ? splatMat : holeMat);

    expect(added).toHaveLength(200);
  });
});

describe("resetDecals", () => {
  it("clears the pool/wallDecal bookkeeping so a full pool creates fresh meshes again", () => {
    resetDecals();
    const { scene, added } = fakeScene();
    setScene(scene);

    for (let i = 0; i < 150; i++) addPool(i, i, 0.5); // fills POOLMAX
    expect(added).toHaveLength(150);

    resetDecals();
    addPool(0, 0, 0.5); // pools[] is empty again -> a brand new mesh, not a recycled one
    expect(added).toHaveLength(151);
  });
});

describe("shared materials (art — colours and opacities must match the reference exactly)", () => {
  it("poolMat/splatMat/holeMat/scorchMat match the reference's colours and opacities", () => {
    expect(poolMat.color.getHex()).toBe(0x4a0d06);
    expect(poolMat.opacity).toBeCloseTo(0.85);
    expect(splatMat.color.getHex()).toBe(0x5a1008);
    expect(splatMat.opacity).toBeCloseTo(0.8);
    expect(holeMat.color.getHex()).toBe(0x0c0d10);
    expect(holeMat.opacity).toBeCloseTo(0.9);
    expect(scorchMat.color.getHex()).toBe(0x0a0a0a);
    expect(scorchMat.opacity).toBeCloseTo(0.85);
    for (const mat of [poolMat, splatMat, holeMat, scorchMat]) {
      expect(mat.transparent).toBe(true);
      expect(mat.depthWrite).toBe(false);
    }
  });
});

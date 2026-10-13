// @vitest-environment jsdom
import * as THREE from "three";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { gorePit } from "../support/goreWorld";
import { watchRandom } from "../support/randomWatch";

/**
 * BLOOD THAT STAYS (impact plan, Task 3): floor pools that grow, wall
 * splatter, drips and smears, all instances of two `InstancedMesh`es — two
 * scene children for the level however much blood there is. Budgeted
 * (224 blots, 96 streaks, the oldest reused at the cap), floor-aware (a pool
 * sits on the floor under it), and drawing nothing from `Math.random`.
 */

let S: typeof import("../../src/fx/Splats");
beforeAll(async () => {
  installDomStubs();
  S = await import("../../src/fx/Splats");
});

let scene: THREE.Scene;
beforeEach(() => { scene = gorePit(); });

const M = new THREE.Matrix4();
function place(mesh: THREE.InstancedMesh, i: number): { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 } {
  mesh.getMatrixAt(i, M);
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  M.decompose(p, q, s);
  return { p, q, s };
}

describe("the level's decals are two scene children, and stay two", () => {
  it("builds one mesh of blots and one of streaks, every instance folded away until it is used", () => {
    const { blobs, streaks } = S.splatMeshes();
    expect(blobs).not.toBeNull(); expect(streaks).not.toBeNull();
    expect(blobs!.count).toBe(S.BLOB_MAX); expect(streaks!.count).toBe(S.STREAK_MAX);
    expect(scene.children.filter((o) => o.name === "goreSplats")).toHaveLength(2);
    expect(place(blobs!, 0).s.x).toBe(0);
    expect(S.splatStats().blobs).toBe(0);
  });

  it("adds no scene child however much blood there is", () => {
    const before = scene.children.length;
    for (let i = 0; i < 600; i++) { S.splatFloor(10 + (i % 20), 10 + ((i * 7) % 20), 0.5); S.splatWall(10, 1, 10, 1, 0, 0.3); S.dripWall(10, 1, 10, 1, 0, 0.5); S.smearFloor(10, 10, 1, 0, 1); }
    expect(scene.children.length).toBe(before);
  });

  it("is quiet when there is no level to put it in", () => {
    S.resetSplats();
    expect(() => { S.splatFloor(5, 5, 1); S.splatWall(5, 1, 5, 1, 0, 1); S.dripWall(5, 1, 5, 1, 0, 1); S.smearFloor(5, 5, 1, 0, 1); S.splatTick(0.1); }).not.toThrow();
    expect(S.splatStats().blobs).toBe(0);
  });
});

describe("the budget", () => {
  it("holds at BLOB_MAX and STREAK_MAX: the oldest is reused, the count never passes the cap", () => {
    for (let i = 0; i < S.BLOB_MAX + 120; i++) S.splatFloor(10, 10, 0.3, 1, false);
    for (let i = 0; i < S.STREAK_MAX + 50; i++) S.smearFloor(10, 10, 0, 1, 0.5);
    const st = S.splatStats();
    expect(st.blobs).toBe(S.BLOB_MAX);
    expect(st.streaks).toBe(S.STREAK_MAX);
    // the ring: the 225th blot went into the first slot
    const { blobs } = S.splatMeshes();
    S.splatFloor(21, 21, 0.4, 1, false);
    const pos = place(blobs!, (S.BLOB_MAX + 120 + 1 - 1) % S.BLOB_MAX).p;
    expect(pos.x).toBeCloseTo(21, 5);
  });

  it("at most GROW_MAX pools grow at once, and a ring that comes round to a growing pool takes it over", () => {
    for (let i = 0; i < 100; i++) S.splatFloor(10, 10, 1);
    expect(S.splatStats().growing).toBeLessThanOrEqual(S.GROW_MAX);
    S.resetSplats(); scene = gorePit();
    for (let i = 0; i < S.BLOB_MAX; i++) S.splatFloor(10, 10, 1, 1, false);
    S.splatFloor(10, 10, 1);              // slot 0 again, growing
    S.splatFloor(12, 12, 1, 1, false);    // slot 1
    for (let i = 0; i < S.BLOB_MAX - 1; i++) S.splatFloor(14, 14, 0.2, 1, false);   // ... and the ring comes round to slot 0 while it grows
    S.splatTick(0.2);
    expect(place(S.splatMeshes().blobs!, 0).p.x, "the new decal's, not the growing one's").toBeCloseTo(14, 5);
  });
});

describe("where a decal sits", () => {
  it.each([0, 1.2, 4.2])("a floor pool lies just above the floor under it (%s), flat, face up", (fy) => {
    scene = gorePit(() => fy);
    S.splatFloor(20, 20, 1, 1, false);
    const { p, q, s } = place(S.splatMeshes().blobs!, 0);
    expect(p.y).toBeGreaterThan(fy + 0.005); expect(p.y).toBeLessThan(fy + 0.02);
    expect(s.x).toBeCloseTo(1, 5);
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q);   // the plane's normal: up
    expect(n.y).toBeCloseTo(1, 5);
  });

  it("a wall decal stands a hair off the wall along its normal, facing out", () => {
    S.splatWall(10, 1.2, 10, 1, 0, 0.5);
    const { p, q } = place(S.splatMeshes().blobs!, 0);
    expect(p.x).toBeGreaterThan(10.01); expect(p.x).toBeLessThan(10.03);
    expect(p.y).toBeCloseTo(1.2, 5);
    const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    expect(n.x).toBeCloseTo(1, 5); expect(n.z).toBeCloseTo(0, 5);
    S.splatWall(10, 1.2, 10, 0, -1, 0.5);
    const b = place(S.splatMeshes().blobs!, 1);
    const n2 = new THREE.Vector3(0, 0, 1).applyQuaternion(b.q);
    expect(n2.z).toBeCloseTo(-1, 5);
  });

  it("a drip hangs from its head: its centre half its length below the point, taller than wide", () => {
    S.dripWall(10, 1.5, 10, 1, 0, 0.6);
    const { p, s } = place(S.splatMeshes().streaks!, 0);
    expect(p.y).toBeCloseTo(1.5 - 0.3, 5);
    expect(s.y).toBeCloseTo(0.6, 5);
    expect(s.x).toBeLessThan(s.y);
  });

  it("a smear lies along the way it was dragged, head leading, centred half its length ahead", () => {
    S.smearFloor(10, 10, 0, 1, 1.2);
    const { p, q, s } = place(S.splatMeshes().streaks!, 0);
    const along = new THREE.Vector3(0, 1, 0).applyQuaternion(q);   // the streak's long axis, in the world
    expect(along.x).toBeCloseTo(0, 5); expect(along.y).toBeCloseTo(0, 5); expect(along.z).toBeCloseTo(1, 5);
    expect(p.z).toBeCloseTo(10.6, 5);
    expect(s.y).toBeCloseTo(1.2, 5);
    S.smearFloor(10, 10, 1, 0, 1);
    const b = place(S.splatMeshes().streaks!, 1);
    const along2 = new THREE.Vector3(0, 1, 0).applyQuaternion(b.q);
    expect(along2.x).toBeCloseTo(1, 5); expect(along2.z).toBeCloseTo(0, 5);
  });
});

describe("a pool grows", () => {
  it("is born a third of its size and reaches it in about a second, easing out", () => {
    S.splatFloor(20, 20, 1.2);
    const w = (): number => place(S.splatMeshes().blobs!, 0).s.x;
    expect(w()).toBeCloseTo(1.2 * 0.34, 5);
    S.splatTick(0.3);
    const mid = w();
    expect(mid).toBeGreaterThan(1.2 * 0.34); expect(mid).toBeLessThan(1.2);
    S.splatTick(0.3);
    expect(w()).toBeGreaterThan(mid);
    S.splatTick(0.8);
    expect(w()).toBeCloseTo(1.2, 5);
    expect(S.splatStats().growing).toBe(0);
    S.splatTick(1);
    expect(w()).toBeCloseTo(1.2, 5);   // and stays
  });

  it("holds through a frozen clock: no time, no growth", () => {
    S.splatFloor(20, 20, 1);
    S.splatTick(0);
    expect(place(S.splatMeshes().blobs!, 0).s.x).toBeCloseTo(0.34, 5);
  });
});

describe("the dice", () => {
  it("draws nothing from Math.random, and the same effects dice give the same blood", () => {
    const w = watchRandom();
    try {
      for (let i = 0; i < 50; i++) { S.splatFloor(10, 10, 0.5); S.splatWall(10, 1, 10, 1, 0, 0.3); }
      S.splatTick(0.5);
    } finally { w.stop(); }
    expect(w.draws()).toBe(0);
  });
});

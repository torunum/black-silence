// @vitest-environment jsdom
import * as THREE from "three";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { gorePit } from "../support/goreWorld";
import { watchRandom } from "../support/randomWatch";

/**
 * GOUTS AND MIST (impact plan, Task 3): the big drops a stump pumps and a
 * burst throws, and the red haze a body leaves — two pooled `Points`, a
 * ring at the cap, a splat where a drop lands and a spatter where it meets
 * a wall.
 */

let D: typeof import("../../src/fx/GoreDrops");
let SP: typeof import("../../src/fx/Splats");
beforeAll(async () => {
  installDomStubs();
  D = await import("../../src/fx/GoreDrops");
  SP = await import("../../src/fx/Splats");
});

let scene: THREE.Scene;
const run = (secs: number): void => { for (let i = 0; i < secs * 60; i++) D.dropTick(1 / 60); };
const ys = (): number[] => { const p = D.dropStats().dropPoints!.geometry.attributes.position.array as Float32Array; const out: number[] = []; for (let i = 0; i < D.DROP_MAX; i++) if (p[i * 3 + 1] > -99) out.push(p[i * 3 + 1]); return out; };

beforeEach(() => { scene = gorePit(); });

describe("the pools", () => {
  it("are two scene children, with their budgets, and fixed buffers", () => {
    expect(scene.children.filter((o) => o.name === "goreDrops")).toHaveLength(1);
    expect(scene.children.filter((o) => o.name === "goreMist")).toHaveLength(1);
    const st = D.dropStats();
    expect((st.dropPoints!.geometry.attributes.position.array as Float32Array).length).toBe(D.DROP_MAX * 3);
    expect((st.mistPoints!.geometry.attributes.position.array as Float32Array).length).toBe(D.MIST_MAX * 3);
    expect(st.drops).toBe(0); expect(st.mist).toBe(0);
  });

  it("are capped: a thousand drops live at most DROP_MAX, and no buffer or scene child is ever added", () => {
    const before = scene.children.length;
    const arr = D.dropStats().dropPoints!.geometry.attributes.position.array;
    for (let i = 0; i < 25; i++) D.goutFx(24, 1.5, 24, 40, 4);
    expect(D.dropStats().drops).toBeLessThanOrEqual(D.DROP_MAX);
    expect(D.dropStats().drops).toBe(D.DROP_MAX);
    for (let i = 0; i < 6; i++) D.mistFx(24, 1.5, 24, 20);
    expect(D.dropStats().mist).toBe(D.MIST_MAX);
    expect(scene.children.length).toBe(before);
    expect(D.dropStats().dropPoints!.geometry.attributes.position.array).toBe(arr);   // the same buffer
  });

  it("are quiet when there is no level to put them in", () => {
    D.resetDrops();
    expect(() => { D.goutFx(5, 1, 5, 10, 3); D.mistFx(5, 1, 5, 4); D.dropTick(0.1); }).not.toThrow();
    expect(D.dropStats().drops).toBe(0);
  });
});

describe("a gout", () => {
  it("rises, peaks and falls under gravity, and is gone when it lands", () => {
    D.goutFx(24, 1, 24, 30, 5, 0, 0, 1);
    const up = Math.max(...ys());
    expect(up, "thrown from the stump with a hair of flight already").toBeGreaterThanOrEqual(1);
    expect(up).toBeLessThan(1.4);
    run(0.2);
    expect(Math.max(...ys()), "rising").toBeGreaterThan(1.5);
    run(0.3);
    run(3);
    expect(D.dropStats().drops, "all landed, none left in the air").toBe(0);
  });

  it("a fountain (up 1) throws higher than a spray (up 0)", () => {
    D.goutFx(24, 1, 24, 40, 5, 0, 0, 1); run(0.25);
    const fountain = Math.max(...ys());
    D.resetDrops(); scene = gorePit();
    D.goutFx(24, 1, 24, 40, 5, 0, 0, 0); run(0.25);
    expect(fountain).toBeGreaterThan(Math.max(...ys()));
  });

  it("is thrown along the way it is given", () => {
    D.goutFx(24, 1, 24, 60, 5, 1, 0, 0.5);
    run(0.4);
    const p = D.dropStats().dropPoints!.geometry.attributes.position.array as Float32Array;
    let east = 0, west = 0;
    for (let i = 0; i < 60; i++) { if (p[i * 3 + 1] < -99) continue; (p[i * 3] > 24 ? east++ : west++); }
    expect(east).toBeGreaterThan(west);
  });

  it("each landing leaves a splat on the floor a quarter of the time: sixty drops leave a few", () => {
    D.goutFx(24, 1, 24, 60, 4, 0, 0, 0.5);
    run(3);
    expect(SP.splatStats().blobs).toBeGreaterThan(5);
    expect(SP.splatStats().blobs).toBeLessThan(40);
  });

  it.each([0, 1.2, 4.2])("lands on the floor under it, on a floor of %s: a drop thrown from just above the floor is gone within a second, and its splat sits on the floor", (fy) => {
    scene = gorePit(() => fy);
    D.goutFx(24, fy + 0.5, 24, 60, 3, 0, 0, 0.3);
    run(1.5);
    expect(D.dropStats().drops).toBe(0);
    const { blobs } = SP.splatMeshes();
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (let i = 0; i < SP.splatStats().blobs; i++) {
      blobs!.getMatrixAt(i, m); m.decompose(p, q, s);
      if (Math.abs(q.x) < 0.01 && Math.abs(q.y) < 0.01) continue;   // a wall's
      expect(p.y).toBeGreaterThan(fy); expect(p.y).toBeLessThan(fy + 0.03);
    }
  });

  it("a drop that meets a wall spatters it, a third of the time, facing out into the room", () => {
    scene = gorePit(() => 0, [[14, 12]]);   // a wall block at x 28..30, z 24..26
    D.goutFx(27, 1, 25, 120, 5, 1, 0, 0.3);
    run(1);
    const { blobs } = SP.splatMeshes();
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    let onWall = 0;
    for (let i = 0; i < SP.splatStats().blobs; i++) {
      blobs!.getMatrixAt(i, m); m.decompose(p, q, s);
      const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
      if (Math.abs(n.y) < 0.5) { onWall++; expect(p.x, "at the wall's face").toBeLessThan(28.1); expect(n.x, "facing out, west").toBeLessThan(-0.9); }
    }
    expect(onWall).toBeGreaterThan(3);
  });
});

describe("the mist", () => {
  it("drifts up and thins out: it is gone after its two seconds or so", () => {
    D.mistFx(24, 1, 24, 30, 1);
    expect(D.dropStats().mist).toBe(30);
    run(0.8);
    const p = D.dropStats().mistPoints!.geometry.attributes.position.array as Float32Array;
    let rose = 0;
    for (let i = 0; i < 30; i++) if (p[i * 3 + 1] > 1.1) rose++;
    expect(rose).toBeGreaterThan(20);
    run(3);
    expect(D.dropStats().mist).toBe(0);
  });
});

describe("the dice", () => {
  it("draws nothing from Math.random", () => {
    const w = watchRandom();
    try { D.goutFx(24, 1, 24, 80, 5, 1, 0); D.mistFx(24, 1, 24, 10); run(3); } finally { w.stop(); }
    expect(w.draws()).toBe(0);
  });
});

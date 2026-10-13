// @vitest-environment jsdom
import * as THREE from "three";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { gorePit } from "../support/goreWorld";
import { watchRandom } from "../support/randomWatch";

/**
 * MEAT, BONE AND ORGANS (impact plan, Task 3): the chunks a body bursts into,
 * one `InstancedMesh` of `CHUNK_MAX`, thrown, tumbling, bouncing and coming to
 * rest on the floor under them, where they stay until the ring comes round.
 */

let C: typeof import("../../src/fx/GoreChunks");
let SP: typeof import("../../src/fx/Splats");
beforeAll(async () => {
  installDomStubs();
  C = await import("../../src/fx/GoreChunks");
  SP = await import("../../src/fx/Splats");
});

let scene: THREE.Scene;
const settle = (secs: number): void => { for (let i = 0; i < secs * 60; i++) C.chunkTick(1 / 60); };
const colourOf = (i: number): THREE.Color => { const c = new THREE.Color(); C.chunkStats().mesh!.getColorAt(i, c); return c; };

beforeEach(() => { scene = gorePit(); });

describe("the pool", () => {
  it("is one scene child of CHUNK_MAX boxes, none of them there until thrown", () => {
    const st = C.chunkStats();
    expect(st.mesh).not.toBeNull();
    expect(scene.children.filter((o) => o.name === "goreChunks")).toHaveLength(1);
    expect(st.mesh!.count).toBe(C.CHUNK_MAX);
    expect(st.used).toBe(0);
  });

  it("is capped: the 161st chunk takes the first one's slot, and nothing is added to the scene", () => {
    const before = scene.children.length;
    C.burstChunks(20, 1, 20, C.CHUNK_MAX, 4);
    expect(C.chunkStats().used).toBe(C.CHUNK_MAX);
    C.burstChunks(30, 1, 30, 30, 4);
    expect(C.chunkStats().used).toBe(C.CHUNK_MAX);
    expect(C.chunkAt(0).x).toBeGreaterThan(28);        // slot 0 is one of the new thirty
    expect(scene.children.length).toBe(before);
  });

  it("is quiet when there is no level to put it in", () => {
    C.resetChunks();
    expect(() => { C.burstChunks(5, 1, 5, 10, 3); C.chunkTick(0.1); }).not.toThrow();
    expect(C.chunkStats().used).toBe(0);
  });
});

describe("what a burst throws", () => {
  it("is meat, organs, bone and sinew in the shares asked for, each its own colour and shape", () => {
    C.burstChunks(20, 1, 20, 100, 4, 0, 0, [1, 1, 1, 1]);
    const kinds = { meat: 0, organ: 0, bone: 0, sinew: 0 };
    for (let i = 0; i < 100; i++) {
      const c = colourOf(i), a = C.chunkAt(i);
      if (c.r > 0.55 && c.g > 0.5) kinds.bone++;                       // pale
      else if (c.b > 0.1) kinds.organ++;                               // purple and pink have blue in them
      else if (c.g > 0.06) kinds.sinew++;                              // brown-red, a little green
      else kinds.meat++;
      expect(a.sy).toBeGreaterThan(0);
    }
    for (const [k, n] of Object.entries(kinds)) expect(n, k).toBeGreaterThan(8);
  });

  it("a mix of nothing but bone throws nothing but pale, long, thin pieces", () => {
    C.burstChunks(20, 1, 20, 30, 4, 0, 0, [0, 0, 1, 0]);
    for (let i = 0; i < 30; i++) { const c = colourOf(i); expect(c.r).toBeGreaterThan(0.55); expect(c.g).toBeGreaterThan(0.5); }
  });

  it("flies the way a shot was going: a burst thrown along +x ends further east than west of where it started", () => {
    C.burstChunks(24, 1, 24, 60, 5, 1, 0);
    settle(4);
    let east = 0, west = 0;
    for (let i = 0; i < 60; i++) (C.chunkAt(i).x > 24 ? east++ : west++);
    expect(east).toBeGreaterThan(west * 1.5);
  });
});

describe("the flight", () => {
  it.each([0, 1.2, 4.2])("chunks bounce and come to rest on the floor under them, on a floor of %s", (fy) => {
    scene = gorePit(() => fy);
    C.burstChunks(24, fy + 1, 24, 40, 4);
    expect(C.chunkStats().flying).toBe(40);
    settle(6);
    const st = C.chunkStats();
    expect(st.flying, "all at rest").toBe(0);
    expect(st.resting).toBe(40);
    for (let i = 0; i < 40; i++) {
      const a = C.chunkAt(i);
      expect(a.y, "at rest on the floor, not through it").toBeGreaterThanOrEqual(fy);
      expect(a.y, "and not floating over it").toBeLessThan(fy + 0.2);
      expect(a.state).toBe(2);
    }
  });

  it("rolls onto another height: a burst thrown off a plateau comes to rest on the lower floor", () => {
    scene = gorePit((gx) => (gx < 12 ? 4.2 : 1.2));
    C.burstChunks(23.5, 5, 24, 60, 4, 1, 0);
    settle(8);
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const a = C.chunkAt(i);
      const floor = a.x < 24 ? 4.2 : 1.2;
      seen.add(floor);
      expect(a.y).toBeGreaterThanOrEqual(floor);
      expect(a.y).toBeLessThan(floor + 0.2);
    }
    expect(seen.size, "some on each floor").toBe(2);
  });

  it("is turned back by a wall", () => {
    scene = gorePit(() => 0, Array.from({ length: 20 }, (_, i) => [14, 2 + i] as [number, number]));   // a long wall at x 28..30, z 4..44
    C.burstChunks(26, 1, 25, 40, 7, 1, 0);
    settle(6);
    for (let i = 0; i < 40; i++) expect(C.chunkAt(i).x, "none through the wall").toBeLessThan(28.05);
  });

  it("a chunk's first landing leaves a small splat on the floor, a few of them do", () => {
    C.burstChunks(24, 1, 24, 80, 4);
    settle(4);
    expect(SP.splatStats().blobs).toBeGreaterThan(8);
  });

  it("a chunk at rest costs nothing per frame: its matrix is not rewritten, and a pool of them at rest asks for no update", () => {
    C.burstChunks(24, 1, 24, 30, 3);
    settle(6);
    const mesh = C.chunkStats().mesh!;
    const version = mesh.instanceMatrix.version;   // bumped whenever the matrices are marked for upload
    C.chunkTick(1 / 60);
    expect(mesh.instanceMatrix.version, "nothing asked to be re-uploaded").toBe(version);
  });
});

describe("the dice", () => {
  it("draws nothing from Math.random", () => {
    const w = watchRandom();
    try { C.burstChunks(24, 1, 24, 80, 5, 1, 0); settle(3); } finally { w.stop(); }
    expect(w.draws()).toBe(0);
  });
});

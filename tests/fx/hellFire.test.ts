import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { buildFire, fireTick, firePool, FLAMES, EMBERS, type Emitter } from "../../src/fx/HellFire";

/**
 * HELL'S FIRE (`src/fx/HellFire.ts`, the prologue plan's Task 3): a pooled,
 * fixed-budget particle fire that allocates nothing per frame and draws
 * nothing from `Math.random`.
 */

const PIT: Emitter[] = [0, 1, 2, 3].map((i) => ({ x: 23 + i * 2, y: 0, z: 45, spread: 1.8, brazier: false }));
const BOWL: Emitter = { x: 21, y: 3.22, z: 51, spread: .45, brazier: true };

function scene(): { s: THREE.Scene; glow: THREE.PointLight } {
  const s = new THREE.Scene();
  const glow = new THREE.PointLight(0xff5a1e, 1.6, 12, 1.4);
  glow.position.set(28, .8, 45); s.add(glow);
  buildFire(s, [...PIT, BOWL], [glow]);
  return { s, glow };
}
const buffers = () => {
  const p = firePool();
  return [p.flames!, p.embers!].map((pt) => [pt.geometry.attributes.position.array, pt.geometry.attributes.color.array]);
};

describe("the pool", () => {
  it("is two Points of a fixed size, and fireTick allocates nothing — the same buffers, the same lengths, forever", () => {
    const { s } = scene();
    const kids = s.children.length;
    const before = buffers();
    expect(before[0][0].length).toBe(FLAMES * 3);
    expect(before[1][0].length).toBe(EMBERS * 3);
    for (let i = 0; i < 60 * 30; i++) fireTick(1 / 60);
    const after = buffers();
    for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) expect(after[k][j]).toBe(before[k][j]);
    expect(s.children.length).toBe(kids);
    expect(FLAMES + EMBERS).toBeLessThanOrEqual(400);
  });

  it("keeps every particle near a source: flames within a cell and 1.5 m above it, embers within 7 m above", () => {
    scene();
    for (let i = 0; i < 400; i++) fireTick(1 / 60);
    const [flames, embers] = buffers().map((b) => b[0]);
    const src = [...PIT, BOWL];
    for (let i = 0; i < FLAMES; i++) {
      const x = flames[i * 3], y = flames[i * 3 + 1], z = flames[i * 3 + 2];
      const near = src.some((e) => Math.abs(x - e.x) <= e.spread / 2 + .2 && Math.abs(z - e.z) <= e.spread / 2 + .2 && y >= e.y && y <= e.y + 1.5);
      expect(near, `flame ${i} at ${x},${y},${z}`).toBe(true);
    }
    for (let i = 0; i < EMBERS; i++) {
      const y = embers[i * 3 + 1];
      expect(src.some((e) => y >= e.y && y <= e.y + 7)).toBe(true);
    }
  });

  it("burns without drawing from Math.random, and the same way every time", () => {
    // (building it constructs three.js objects, whose UUIDs draw — the trace harness keeps those out of the seeded stream)
    scene();
    const spy = vi.spyOn(Math, "random");
    let a: number[];
    try {
      for (let i = 0; i < 300; i++) fireTick(1 / 60);
      a = Array.from(buffers()[0][0]);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
    scene();
    for (let i = 0; i < 300; i++) fireTick(1 / 60);
    expect(Array.from(buffers()[0][0])).toEqual(a);
  });

  it("uses the braziers as well as the pit", () => {
    scene();
    fireTick(.3);
    const flames = buffers()[0][0];
    let bowl = 0;
    for (let i = 0; i < FLAMES; i++) if (Math.abs(flames[i * 3] - BOWL.x) < .4 && flames[i * 3 + 1] > 3) bowl++;
    expect(bowl).toBeGreaterThan(FLAMES * .06);
    expect(bowl).toBeLessThan(FLAMES * .3);
  });
});

describe("the heat flicker", () => {
  it("swells and gutters the pit's glow — intensity only; its colour and position, which the traces record, never move", () => {
    const { glow } = scene();
    const seen = new Set<number>();
    for (let i = 0; i < 120; i++) { fireTick(1 / 60); seen.add(+glow.intensity.toFixed(3)); }
    expect(seen.size).toBeGreaterThan(50);
    expect(Math.min(...seen)).toBeGreaterThan(1.6 * .6);
    expect(Math.max(...seen)).toBeLessThan(1.6 * 1.4);
    expect(glow.color.getHex()).toBe(0xff5a1e);
    expect(glow.position.toArray()).toEqual([28, .8, 45]);
  });
});

describe("a level with no fire", () => {
  it("builds nothing, and drops the last level's pool so fireTick touches nothing", () => {
    scene();
    const s = new THREE.Scene();
    buildFire(s, [], []);
    expect(s.children).toHaveLength(0);
    expect(firePool().flames).toBeNull();
    expect(() => fireTick(1 / 60)).not.toThrow();
  });
});

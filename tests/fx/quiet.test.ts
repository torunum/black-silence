import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { quietly } from "../../src/fx/Quiet";

/**
 * `quietly` (impact plan, Task 3): presentation builds things at odd moments,
 * and three.js draws four numbers from `Math.random()` for every uuid it
 * gives them. Whatever is made inside `quietly` must leave the game's stream
 * exactly where it was.
 */

function countDraws(fn: () => void): number {
  const real = Math.random;
  let n = 0;
  Math.random = (): number => { n++; return real(); };
  try { fn(); } finally { Math.random = real; }
  return n;
}

describe("quietly", () => {
  it("building three.js objects outside it does draw (this is why it exists)", () => {
    expect(countDraws(() => { new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial()); })).toBeGreaterThan(0);
  });

  it("inside it, a mesh, a geometry, a material, a sprite and a texture draw nothing from the game's stream, uuids included", () => {
    const draws = countDraws(() => {
      quietly(() => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture() }));
        const g = new THREE.Group(); g.add(m, s);
        return g;
      });
    });
    expect(draws).toBe(0);
  });

  it("returns what was made, and hands the stream back: the next draw is the game's own", () => {
    const real = Math.random;
    const got = quietly(() => ({ a: 1 }));
    expect(got).toEqual({ a: 1 });
    expect(Math.random).toBe(real);
  });

  it("puts the stream back even if the maker throws", () => {
    const real = Math.random;
    expect(() => quietly(() => { throw new Error("boom"); })).toThrow("boom");
    expect(Math.random).toBe(real);
  });

  it("and a seeded stream is not shifted by it: the draws after are the same with and without", () => {
    const seq = (withMaking: boolean): number[] => {
      const real = Math.random;
      let s = 12345;
      Math.random = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      try {
        const a = Math.random();
        if (withMaking) quietly(() => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
        return [a, Math.random(), Math.random()];
      } finally { Math.random = real; }
    };
    expect(seq(true)).toEqual(seq(false));
  });
});

import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { setScene } from "../../src/render/SceneRef";
import { fakeScene } from "../support/fakeScene";
import { buildParticles } from "../../src/fx/Particles";
import { resetDecals } from "../../src/fx/Decals";
import {
  gibGeo, gibMatsFlesh, gibMatsWood, gibTick, resetGibs, spawnGibChunk, spawnGibs, woodGeo,
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

/**
 * Pins Math.random() to a fixed value for the duration of fn, then restores
 * it. rnd(a,b) = a + Math.random()*(b-a) (src/utils/math.ts): pinning to 0
 * collapses every rnd() call inside fn to its lower bound a; pinning to 1
 * collapses it to its upper bound b. Generalizes
 * tests/fx/Particles.test.ts's withRandomPinnedToZero (which only pins to 0,
 * enough for a single-sided boundary check) to both ends of the range,
 * because proving a change to EITHER bound of a gib rnd() call fails a test
 * requires observing both ends independently.
 */
function withRandomPinnedTo<T>(value: number, fn: () => T): T {
  const original = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
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
      expect(m.geometry, "a crate's splinters are still the reference's .13 box").toBe(woodGeo);
      expect(m.geometry).not.toBe(gibGeo);
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

describe("spawnGibs velocity and spin bounds (rnd(-1,1), rnd(.5,1.4), rnd(2,9))", () => {
  /**
   * gibs[] is private module state (see Gibs.ts's doc comment — "the module
   * owns the state"), so vx/vy/vz/spin are only observable through gibTick's
   * effect on the mesh they're attached to. One gibTick(dt) call from y=10
   * (well above the .07 floor-clamp, so the bounce/settle branch never
   * fires) turns each velocity/spin into a single, isolatable position or
   * rotation delta:
   *   position.x/z += vx/vz * dt        (no other term mixed in)
   *   position.y    += (vy - 16*dt)*dt  (gibTick applies gravity to vy
   *                                       before using it, so the known
   *                                       -16*dt gravity term is included
   *                                       here, not something under test)
   *   rotation.x    += spin * dt        (no other term mixed in)
   * pow=1 makes vx/vy/vz's multiplier the identity, so the observed deltas
   * equal rnd(...)'s own output directly. wood=true skips blood() (unrelated
   * to vx/vy/vz/spin, and would otherwise require buildParticles() setup).
   */
  const dt = 0.1;

  it("takes the lower bound of every rnd() range when Math.random()=0", () => {
    resetGibs();
    const added = setUpScene();
    withRandomPinnedTo(0, () => spawnGibs(0, 10, 0, 1, 1, true));
    const m = added[0] as THREE.Mesh;

    gibTick(dt);

    expect(m.position.x).toBeCloseTo(-1 * dt); // vx = rnd(-1,1)*1 -> -1
    expect(m.position.z).toBeCloseTo(-1 * dt); // vz = rnd(-1,1)*1 -> -1
    expect(m.position.y).toBeCloseTo(10 + (0.5 - 16 * dt) * dt); // vy = rnd(.5,1.4)*1 -> .5
    expect(m.rotation.x).toBeCloseTo(2 * dt); // spin = rnd(2,9) -> 2
  });

  it("takes the upper bound of every rnd() range when Math.random()=1", () => {
    resetGibs();
    const added = setUpScene();
    withRandomPinnedTo(1, () => spawnGibs(0, 10, 0, 1, 1, true));
    const m = added[0] as THREE.Mesh;

    gibTick(dt);

    expect(m.position.x).toBeCloseTo(1 * dt); // vx = rnd(-1,1)*1 -> 1
    expect(m.position.z).toBeCloseTo(1 * dt); // vz = rnd(-1,1)*1 -> 1
    expect(m.position.y).toBeCloseTo(10 + (1.4 - 16 * dt) * dt); // vy = rnd(.5,1.4)*1 -> 1.4
    expect(m.rotation.x).toBeCloseTo(9 * dt); // spin = rnd(2,9) -> 9
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

describe("spawnGibChunk velocity and spin bounds (rnd(-2,2), rnd(3,5), rnd(6,12))", () => {
  // Same technique as the spawnGibs bounds tests above: read vx/vy/vz/spin
  // back out through one gibTick(dt) from y=10. dirx=dirz=1 keeps every
  // rnd() term's contribution distinguishable from the dir*5 bias term (no
  // term collapses to 0 at either pinned bound).
  const dt = 0.1;

  it("takes the lower bound of every rnd() range when Math.random()=0", () => {
    resetGibs();
    const added = setUpScene();
    withRandomPinnedTo(0, () => spawnGibChunk(0, 10, 0, 1, 1));
    const m = added[0] as THREE.Mesh;

    gibTick(dt);

    expect(m.position.x).toBeCloseTo((1 * 5 + -2) * dt); // vx = dirx*5+rnd(-2,2) -> 5-2=3
    expect(m.position.z).toBeCloseTo((1 * 5 + -2) * dt); // vz = dirz*5+rnd(-2,2) -> 3
    expect(m.position.y).toBeCloseTo(10 + (3 - 16 * dt) * dt); // vy = rnd(3,5) -> 3
    expect(m.rotation.x).toBeCloseTo(6 * dt); // spin = rnd(6,12) -> 6
  });

  it("takes the upper bound of every rnd() range when Math.random()=1", () => {
    resetGibs();
    const added = setUpScene();
    withRandomPinnedTo(1, () => spawnGibChunk(0, 10, 0, 1, 1));
    const m = added[0] as THREE.Mesh;

    gibTick(dt);

    expect(m.position.x).toBeCloseTo((1 * 5 + 2) * dt); // vx -> 5+2=7
    expect(m.position.z).toBeCloseTo((1 * 5 + 2) * dt); // vz -> 7
    expect(m.position.y).toBeCloseTo(10 + (5 - 16 * dt) * dt); // vy = rnd(3,5) -> 5
    expect(m.rotation.x).toBeCloseTo(12 * dt); // spin = rnd(6,12) -> 12
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

/**
 * HOW A FLESH GIB LOOKS (enemies plan, Task 1). The reference's cube gibs read
 * near the camera as large pale-grey squares. A flesh gib is now a faceted lump
 * of meat, organ or bone with hard creases and a bloody underside; its count, its
 * size, its throw and its three-way pick are the reference's, draw for draw.
 */
describe("a flesh gib is meat, organ or bone, not a pale cube", () => {
  it("its shape is a lump, not a box: faceted, lopsided and about the size of the .13 box it replaces", () => {
    const p = gibGeo.getAttribute("position");
    expect(gibGeo.type).toBe("IcosahedronGeometry");
    gibGeo.computeBoundingBox();
    const b = gibGeo.boundingBox!, size = new THREE.Vector3(); b.getSize(size);
    for (const s of [size.x, size.y, size.z]) { expect(s).toBeGreaterThan(0.1); expect(s).toBeLessThan(0.2); }
    const radii = new Set<number>();
    for (let i = 0; i < p.count; i++) radii.add(Math.round(Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) * 1e4));
    expect(radii.size, "every point pushed its own way: a lump, not a sphere").toBeGreaterThan(10);
  });

  it("its tones are hard: four flat steps a face, the underside smeared red, and none of it from Math.random", () => {
    const c = gibGeo.getAttribute("color");
    const tones = new Set<number>(), wet = [0, 0];
    for (let t = 0; t < c.count; t += 3) {
      expect(c.getX(t), "one flat tone over a face").toBe(c.getX(t + 1));
      tones.add(Math.round(c.getX(t) * 100));
      wet[c.getY(t) < c.getX(t) * 0.9 ? 1 : 0]++;
    }
    expect([...tones].sort((a, b) => a - b)).toEqual([50, 70, 88, 100]);
    expect(wet[1], "a smeared underside").toBeGreaterThan(5);
    expect(wet[0], "and a clean top").toBeGreaterThan(5);
  });

  it("the three materials are meat, organ and bone: the bone yellowed ivory (not the old grey) and the meat redder than the old brown", () => {
    const hex = gibMatsFlesh.map((m) => m.color.getHex());
    const [r0, g0, b0] = [hex[0] >> 16, (hex[0] >> 8) & 255, hex[0] & 255];
    expect(r0).toBeGreaterThan(g0 * 3); expect(r0).toBeGreaterThan(b0 * 3);   // meat is red
    expect(hex[1] & 255, "organ has blue in it (purple-pink)").toBeGreaterThan((hex[1] >> 8) & 255);
    const [r2, g2, b2] = [hex[2] >> 16, (hex[2] >> 8) & 255, hex[2] & 255];
    expect(r2 - b2, "bone is warm, not grey").toBeGreaterThan(40);
    expect(hex).not.toContain(0x9a948a);
    for (const m of gibMatsFlesh) expect(m.vertexColors, "the lump's tones multiply the material's colour").toBe(true);
    void g2;
  });

  it("the pick is still the reference's: Math.random()*3 | 0, one draw a gib, so every fixture's stream is where it was", () => {
    resetGibs();
    setUpScene(); buildParticles();
    const real = Math.random;
    let draws = 0;
    Math.random = () => { if (!new Error().stack?.includes("generateUUID")) draws++; return 0.99; };
    let added: unknown[];
    try { added = setUpScene(); spawnGibs(0, 0, 0, 3, 1, true); } finally { Math.random = real; }
    // wood: 3 gibs x (pick + rnd x 4 + scale rnd) draws; the look took none
    expect(draws).toBe(3 * (1 + 3 + 1 + 1));
    expect((added as THREE.Mesh[]).every((m) => m.material === gibMatsWood[2])).toBe(true);
  });
});

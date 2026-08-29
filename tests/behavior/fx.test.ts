import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { evalReference, REF, refSource } from "../support/reference";
import { recordingScene, snapshotObject3D, type Object3DSnapshot } from "../support/recordingScene";
import { seedRandom } from "../support/seededRandom";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
import { fakeScene } from "../support/fakeScene";
import { setScene } from "../../src/render/SceneRef";
import {
  buildParticles as moduleBuildParticles, partTick as modulePartTick,
  woodP as moduleWoodP,
} from "../../src/fx/Particles";
import {
  addPool as moduleAddPool, addWallDecal as moduleAddWallDecal,
  holeMat as moduleHoleMat, splatMat as moduleSplatMat,
} from "../../src/fx/Decals";
import { spawnGibs as moduleSpawnGibs } from "../../src/fx/Gibs";

/**
 * The FX half of the behavioral oracle (see tests/behavior/textures.test.ts's
 * doc comment for the overall rationale). Scoped deliberately narrower than
 * that file: PARTICLES/DECALS/GIBS (src/fx/Particles.ts, Decals.ts, Gibs.ts)
 * draws nothing to a canvas — every art fact here is a THREE object
 * constructed with fixed geometry/material parameters (buildParticles'
 * one-time Points/BufferGeometry; addPool/addWallDecal/spawnGibs' pooled
 * meshes) or a live position/scale/rotation transform on one. This file
 * compares exactly that: run the reference's functions and the module's
 * functions through an identical, seeded script against a recording `scene`
 * (tests/support/recordingScene.ts captures every `scene.add()` argument, in
 * order), then snapshot each added object's construction-time facts and
 * current transform and compare the two ordered snapshot arrays.
 *
 * What this file does NOT cover — see tests/fx/Particles.test.ts,
 * Decals.test.ts and Gibs.test.ts instead: spawnP/blood/sparks/smoke3d/
 * fireP/holyP/toxicP/emberP/woodP's velocity and colour formulas, partTick's
 * per-frame integration and retirement, poolTick's grow animation, and
 * gibTick's fall/bounce/settle physics. None of those construct a THREE
 * object or draw to a canvas — they are pure math over a typed-array buffer
 * or over a mesh's existing position/velocity fields, which a construction
 * snapshot can't see and a canvas recorder doesn't apply to. Direct unit
 * tests are the right (and only) oracle for that half of this module, per
 * the task brief's own framing.
 *
 * scene is a bare global in the reference (declared in the THREE CORE
 * section, not this range) exactly like AC/masterG/echoG are for the audio
 * chunks in tests/behavior/audio.test.ts — injected the same way, as an
 * explicit `globals` entry. It has to be the *final* object up front:
 * evalReference only returns the evaluated expression's value, not the vm
 * context itself, so there is no way to reach back in and swap `scene`
 * after the fact — build the recording scene before calling evalReference,
 * not after.
 *
 * pools/wallDecals/gibs are bare `let`s too, reset to `[]` by legacy.js's
 * loadLevel() — which lives in the WORLD STATE / LEVEL LOADER section, a
 * later plan's territory, not part of REF.particlesDecalsGibs. FX_EXPR's
 * IIFE reproduces that one reset line so addPool/addWallDecal/spawnGibs
 * have an initialized pool to push into, the same way this file's module
 * side gets it via src/fx/Decals.ts's resetDecals()/Gibs.ts's resetGibs()
 * (called directly, not through legacy.js).
 */

const FX_CHUNKS = [refSource(REF.mathHelpers), refSource(REF.particlesDecalsGibs)];
const FX_EXPR =
  "(() => { pools=[]; wallDecals=[]; gibs=[]; " +
  "return {buildParticles, addPool, addWallDecal, spawnGibs, splatMat, holeMat}; })()";

interface RefFxFns {
  buildParticles: () => void;
  addPool: (x: number, z: number, s: number) => void;
  addWallDecal: (x: number, y: number, z: number, nx: number, nz: number, s: number, mat: THREE.Material) => void;
  spawnGibs: (x: number, y: number, z: number, n: number, pow: number, wood?: boolean) => void;
  splatMat: THREE.Material;
  holeMat: THREE.Material;
}

/** Seeds Math.random, runs `run`, then always restores — mirrors tests/behavior/textures.test.ts's recordCanvasCalls and audio.test.ts's withReferenceAudioSession/withModuleAudioSession. */
function withSeed(seed: number, run: () => void): void {
  const restore = seedRandom(seed);
  try {
    run();
  } finally {
    restore();
  }
}

/**
 * The shared script: build the particle pool, then drive addPool/
 * addWallDecal/spawnGibs well past their pool caps (POOLMAX=150, WDMAX=200,
 * GIBMAX=110) so both the "construct a new mesh" and "recycle the oldest"
 * branches run, across a mix of flesh and wood gibs. Identical calls, same
 * order, on whichever `fns`/`mats` pair is passed in — reference or module.
 */
function runScript(fns: {
  buildParticles: () => void;
  addPool: (x: number, z: number, s: number) => void;
  addWallDecal: (x: number, y: number, z: number, nx: number, nz: number, s: number, mat: THREE.Material) => void;
  spawnGibs: (x: number, y: number, z: number, n: number, pow: number, wood?: boolean) => void;
}, mats: { splatMat: THREE.Material; holeMat: THREE.Material }): void {
  fns.buildParticles();
  for (let i = 0; i < 155; i++) fns.addPool(i * 0.1, i * 0.2, 0.5 + (i % 3) * 0.1);
  for (let i = 0; i < 205; i++) {
    fns.addWallDecal(i * 0.1, 1, i * 0.2, 1, 0, 0.3, i % 2 === 0 ? mats.splatMat : mats.holeMat);
  }
  for (let i = 0; i < 115; i++) fns.spawnGibs(i * 0.1, 0.5, i * 0.2, 1, 2, i % 3 === 0);
}

describe("PARTICLES/DECALS/GIBS behavioral parity with reference", () => {
  it("constructs and recycles the same ordered sequence of Three objects (buildParticles, addPool, addWallDecal, spawnGibs) as the reference", () => {
    const { scene: refScene, added: refAdded } = recordingScene();
    const refFns = evalReference<RefFxFns>(FX_CHUNKS, FX_EXPR, { THREE, Math, scene: refScene });
    withSeed(11, () => {
      runScript(refFns, { splatMat: refFns.splatMat, holeMat: refFns.holeMat });
    });

    const { scene: modScene, added: modAdded } = recordingScene();
    withSeed(11, () => {
      setScene(modScene);
      runScript(
        { buildParticles: moduleBuildParticles, addPool: moduleAddPool, addWallDecal: moduleAddWallDecal, spawnGibs: moduleSpawnGibs },
        { splatMat: moduleSplatMat, holeMat: moduleHoleMat },
      );
    });

    const refSnapshots: Object3DSnapshot[] = refAdded.map((o) => snapshotObject3D(o as unknown as Parameters<typeof snapshotObject3D>[0]));
    const modSnapshots: Object3DSnapshot[] = modAdded.map((o) => snapshotObject3D(o as unknown as Parameters<typeof snapshotObject3D>[0]));

    // A recorder that can pass on an empty (or trivially short) log proves
    // nothing (see tests/behavior/textures.test.ts's identical caveat).
    // Expected: 1 (Points) + 150 (addPool caps at POOLMAX) + 200 (addWallDecal
    // caps at WDMAX) + 110 (spawnGibs caps at GIBMAX, 1 gib/call over 115 calls) = 461.
    expect(refSnapshots.length).toBeGreaterThan(300);
    expectCallLogEqual(modSnapshots, refSnapshots, "PARTICLES/DECALS/GIBS scene.add() snapshot log");
  });
});

/**
 * woodP was the third instance of KNOWN-9. It lives in its own reference
 * range (REF.woodP — the reference files it under a different banner,
 * nowhere near the rest of the FX section), and that range was the one
 * entry in tests/support/reference.ts that no test consumed: scaffolding
 * for a comparison never written, the same signal that preceded KNOWN-6.
 * Its unit test in tests/fx/Particles.test.ts pinned only the particle
 * count and the red colour channel, so its three velocity ranges, its
 * green/blue channels, its life and its `kind` argument were all free to
 * drift.
 *
 * The comparison below reaches them all without a single extra export:
 * spawn into both pools under one seed, then integrate both with partTick.
 * Velocity becomes visible as displacement in the position buffer, life and
 * kind as *when and how* partTick moves and retires each particle, and the
 * colour triple is in the colour buffer directly.
 */
const WOODP_CHUNKS = [refSource(REF.mathHelpers), refSource(REF.particlesDecalsGibs), refSource(REF.woodP)];
const WOODP_EXPR = "(() => { pools=[]; wallDecals=[]; gibs=[]; return {buildParticles, woodP, partTick}; })()";

interface RefParticleFns {
  buildParticles: () => void;
  woodP: (x: number, y: number, z: number, n: number) => void;
  partTick: (dt: number) => void;
}

/** The live position/colour Float32Arrays of the THREE.Points buildParticles() just added to a fake scene. */
function poolBuffers(added: THREE.Object3D[]): { pos: Float32Array; col: Float32Array } {
  const points = added[0] as unknown as {
    geometry: { attributes: { position: { array: Float32Array }; color: { array: Float32Array } } };
  };
  return { pos: points.geometry.attributes.position.array, col: points.geometry.attributes.color.array };
}

describe("woodP behavioral parity with reference", () => {
  const SPAWNED = 12, DT = 1 / 60, SLOTS = SPAWNED * 3;
  /**
   * 90 frames is 1.5 seconds, chosen so the run outlives both things that
   * make `life` and `kind` observable at all. woodP's lives are rnd(.4,.9),
   * so every particle expires inside the window and the exact frame it does
   * freezes its x/z in the buffer; and a particle launched from y=1.5 at
   * rnd(.6,3.4) upward under 14/s² reaches the ground around 0.6-0.9s,
   * which is where kind finally matters (kind 1 dies on contact and rolls a
   * pool, anything else bounces). A shorter run compares twelve particles
   * still in mid-air, where neither literal has had any effect yet — the
   * first version of this test used 20 frames and let `life` .4→.5 and
   * `kind` 2→1 both pass.
   */
  const CHECKPOINTS = [1, 10, 30, 55, 90];

  it("spawns and integrates an identical particle pool to the reference — through launch, ground contact and expiry", () => {
    const snapshotsFor = (fns: RefParticleFns, added: THREE.Object3D[]) => {
      const out: Array<{ frame: number; pos: number[]; col: number[] }> = [];
      fns.buildParticles();
      fns.woodP(3, 1.5, -2, SPAWNED);
      let done = 0;
      for (const upTo of CHECKPOINTS) {
        for (; done < upTo; done++) fns.partTick(DT);
        const { pos, col } = poolBuffers(added);
        out.push({ frame: upTo, pos: [...pos.slice(0, SLOTS)], col: [...col.slice(0, SLOTS)] });
      }
      return out;
    };

    // Evaluated OUTSIDE the seeded block, deliberately. Evaluating the
    // reference chunk constructs its materials and geometries, and every
    // THREE object generates a UUID from Math.random — so seeding first
    // would spend the reference side's seeded sequence on UUIDs that the
    // module side (whose materials were built at import time) never draws,
    // and the two runs would diverge on the very first particle.
    const { scene: refScene, added: refAdded } = fakeScene();
    const refFns = evalReference<RefParticleFns>(WOODP_CHUNKS, WOODP_EXPR, { THREE, Math, scene: refScene });
    let refSnapshots!: ReturnType<typeof snapshotsFor>;
    withSeed(77, () => { refSnapshots = snapshotsFor(refFns, refAdded); });

    const { scene: modScene, added: modAdded } = fakeScene();
    setScene(modScene);
    let modSnapshots!: ReturnType<typeof snapshotsFor>;
    withSeed(77, () => {
      modSnapshots = snapshotsFor(
        { buildParticles: moduleBuildParticles, woodP: moduleWoodP, partTick: modulePartTick },
        modAdded,
      );
    });

    // A pool of zeroes compares equal to a pool of zeroes, and a run where
    // every particle already died compares equal too (every y is -100), so
    // check the spawn wrote colour and that the particles were still moving
    // at the first checkpoint before trusting the equalities below.
    expect(refSnapshots[0].col.some((v) => v !== 0)).toBe(true);
    expect(refSnapshots[0].pos).not.toEqual(refSnapshots[2].pos);

    for (let i = 0; i < CHECKPOINTS.length; i++) {
      expect({ ...modSnapshots[i], frame: CHECKPOINTS[i] }).toEqual({ ...refSnapshots[i], frame: CHECKPOINTS[i] });
    }
  });
});

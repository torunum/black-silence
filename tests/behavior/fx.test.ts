import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { evalReference, REF, refSource } from "../support/reference";
import { recordingScene, snapshotObject3D, type Object3DSnapshot } from "../support/recordingScene";
import { seedRandom } from "../support/seededRandom";
import { expectCallLogEqual } from "../support/expectCallLogEqual";
import { setScene } from "../../src/render/SceneRef";
import { buildParticles as moduleBuildParticles } from "../../src/fx/Particles";
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

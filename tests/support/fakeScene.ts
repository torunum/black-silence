import type * as THREE from "three";

/**
 * A minimal THREE.Scene stand-in for the FX modules (src/fx/Particles.ts,
 * Decals.ts, Gibs.ts), which reach `scene` through src/render/SceneRef.ts's
 * getScene()/setScene() accessors rather than importing a real one.
 *
 * `add` is the only method any of those modules calls on `scene`, so that's
 * the only one stubbed. Every object passed to it is kept, in order, so a
 * test can grab the real THREE.Mesh/THREE.Points instance a spawner just
 * built and inspect its geometry/material/position/scale directly — exactly
 * the "stubbed renderer" tests/behavior's Task 2 brief describes, and the
 * same technique tests/support/domStubs.ts and recordingCanvas.ts use for
 * canvas/WebGL: real objects, a fake sink for the one method that would
 * otherwise touch a live renderer.
 */
export function fakeScene(): { scene: THREE.Scene; added: THREE.Object3D[] } {
  const added: THREE.Object3D[] = [];
  const scene = { add: (o: THREE.Object3D) => { added.push(o); } } as unknown as THREE.Scene;
  return { scene, added };
}

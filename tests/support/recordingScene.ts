import type * as THREE from "three";
import { fakeScene } from "./fakeScene";

/**
 * The behavior-recorder counterpart to tests/support/fakeScene.ts: same
 * capture mechanism (a `scene.add` stand-in that just remembers what got
 * added, in order), re-exported under this name for
 * tests/behavior/fx.test.ts, plus a JSON-safe snapshot serializer so a
 * reference-run object and a module-run object — two different live THREE
 * instances that can never be `===` to each other — can be compared
 * structurally the same way tests/support/recordingCanvas.ts's DrawCall log
 * lets two different draw sessions be compared.
 *
 * Deliberately snapshots geometry/material/transform (the "was this
 * constructed with the right fixed parameters" facts) rather than trying to
 * log every individual method call the way recordingCanvas.ts does — there
 * is no equivalent of "every draw call" for a handful of THREE object
 * constructions and position/scale/rotation assignments; reading the
 * resulting object's own state after the fact is the direct, honest way to
 * check it.
 */
export const recordingScene = fakeScene;

export interface Object3DSnapshot {
  type: string;
  geometry: { type: string; parameters: Record<string, unknown> | null } | null;
  material: {
    type: string;
    color?: number;
    opacity?: number;
    transparent?: boolean;
    depthWrite?: boolean;
    vertexColors?: boolean;
    size?: number;
    sizeAttenuation?: boolean;
  } | null;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  frustumCulled: boolean;
}

function materialSnapshot(mat: THREE.Material | null | undefined): Object3DSnapshot["material"] {
  if (!mat) return null;
  const m = mat as unknown as {
    type: string; color?: { getHex(): number }; opacity: number; transparent: boolean;
    depthWrite: boolean; vertexColors?: boolean; size?: number; sizeAttenuation?: boolean;
  };
  return {
    type: m.type,
    color: m.color ? m.color.getHex() : undefined,
    opacity: m.opacity,
    transparent: m.transparent,
    depthWrite: m.depthWrite,
    vertexColors: m.vertexColors,
    size: m.size,
    sizeAttenuation: m.sizeAttenuation,
  };
}

function geometrySnapshot(geo: THREE.BufferGeometry | null | undefined): Object3DSnapshot["geometry"] {
  if (!geo) return null;
  const g = geo as unknown as { type: string; parameters?: Record<string, unknown> };
  return { type: g.type, parameters: g.parameters ?? null };
}

/**
 * A JSON-safe snapshot of an Object3D's construction-time facts (geometry
 * type/parameters, material type/colour/opacity/flags) and current
 * transform. `object3DType` accepts the loose object shape both the
 * sandboxed reference's and the module's real THREE instances share.
 */
export function snapshotObject3D(o: {
  type: string;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  frustumCulled?: boolean;
}): Object3DSnapshot {
  return {
    type: o.type,
    geometry: geometrySnapshot(o.geometry),
    material: materialSnapshot(o.material),
    position: { x: o.position.x, y: o.position.y, z: o.position.z },
    rotation: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
    scale: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
    frustumCulled: !!o.frustumCulled,
  };
}

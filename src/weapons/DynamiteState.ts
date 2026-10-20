import type * as THREE from "three";
import { renderState } from "../render/Renderer";

/**
 * The thrown bundles in the world (`./Dynamite.ts` moves them and sets them off). Apart from it so `loadLevel` can drop them
 * without importing the blast's damage path, which reaches back to the level loader through the player's death.
 */
export interface Stick { m: THREE.Object3D; x: number; y: number; z: number; vx: number; vy: number; vz: number; fuse: number; spin: number }
export const sticks: Stick[] = [];

/** How many bundles are in flight or on the floor, fuses burning (for tests). */
export function sticksLive(): number { return sticks.length; }
/** Drops every bundle without a bang (a level change, a restart). */
export function resetDynamite(): void {
  for (const s of sticks) renderState.scene?.remove(s.m);
  sticks.length = 0;
}

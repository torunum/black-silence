import type * as THREE from "three";
import { renderState } from "../render/Renderer";

/**
 * The stakes in the world (`./Stake.ts` flies them and drives them in). Apart from it, as `./DynamiteState.ts` is from the dynamite,
 * so `loadLevel` can clear them without importing the damage path.
 *
 * `flying` are in the air: `x,y,z` is the iron point, `t` the seconds since the shot, `dmg` what the next body takes, `through`
 * how many bodies it has gone through, `hit` the bodies it has already struck (a stake does not strike one twice). `stuck` are the
 * ones driven into a wall, a floor or a beam, and stay there — the oldest pulled out once there are `STUCK_MAX`.
 */
export interface FlyingStake {
  m: THREE.Object3D; x: number; y: number; z: number; vx: number; vy: number; vz: number;
  t: number; dmg: number; through: number; burning: boolean; hit: Set<unknown>;
}
export const flying: FlyingStake[] = [];
export const stuck: THREE.Object3D[] = [];
export const STUCK_MAX = 40;

/** How many stakes are in the air, and how many are driven in (for tests). */
export function stakesLive(): { flying: number; stuck: number } { return { flying: flying.length, stuck: stuck.length }; }
/** Drops every stake, flying and driven in (a level change, a restart). */
export function resetStakes(): void {
  for (const s of flying) renderState.scene?.remove(s.m);
  for (const m of stuck) renderState.scene?.remove(m);
  flying.length = 0; stuck.length = 0;
}

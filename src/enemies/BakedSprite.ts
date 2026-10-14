import type * as THREE from "three";
import type { RigSet } from "./rig/bake";

/**
 * What `PX[key]` holds for one creature: its frames as textures, under the
 * role names the game's code and the trace fixtures know (`a`, `b`, `atk`,
 * `die1`, `die2`, `hl`, `noHead`, ...). Moved out of `SpriteBaker.ts` so the
 * rig's sprite builder (`src/enemies/rig/sprite.ts`) can return one without
 * importing the module that imports it.
 *
 * A creature baked from a PXDEF grid (the legacy art, `src/enemies/pixels/`)
 * has the roles below and `rig` undefined. A creature with a rig
 * (`src/enemies/rig/`) has the same roles — so everything that names a frame
 * keeps working — and `rig`, from which the walk cycle, the idle, the
 * attack, pain and death frames and every dismembered variant are had; its
 * `walk0`..`die4` slots name the eager ones for the trace digest.
 */
export interface BakedSprite {
  a: THREE.CanvasTexture;
  b: THREE.CanvasTexture;
  hl: THREE.CanvasTexture;
  hlb: THREE.CanvasTexture;
  head: number;
  noHead: THREE.CanvasTexture | null;
  noHeadB: THREE.CanvasTexture | null;
  noLArm: THREE.CanvasTexture;
  noLArmB: THREE.CanvasTexture;
  noRArm: THREE.CanvasTexture;
  noRArmB: THREE.CanvasTexture;
  noLegs: THREE.CanvasTexture;
  noLegsB: THREE.CanvasTexture;
  gibbed: THREE.CanvasTexture;
  gibbedB: THREE.CanvasTexture;
  atk: THREE.CanvasTexture | null;
  die1: THREE.CanvasTexture | null;
  die2: THREE.CanvasTexture | null;
  regions: { W: number; H: number; head: number; armTop: number; armBot: number };
  /** Only a creature with a rig: its frames, baked on first use. */
  rig?: RigSet;
}

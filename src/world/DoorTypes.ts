import type * as THREE from "three";
import type { DoorKind } from "../audio/sounds/doors";

/** The great doors' types (`./DoorKit.ts` builds them; `./WellKit.ts` builds the well and the rope to the same shape). */
export type DoorStyle = "crypt" | "iron" | "church" | "tomb" | "cemetery" | "sluice" | "freight" | "sphincter" | "well" | "rope" | "gate" | "ladder" | "hatch";
export type OpenMove = "swing" | "slide" | "roll" | "iris" | "sink";

export interface StyleSpec {
  /** Clear opening, world units. */
  w: number; h: number;
  /** Height of a pointed arch above the leaves (0 = square head). */
  rise: number;
  move: OpenMove;
  /** The colour of the way on. */
  glow: number;
  /** The sound the door makes opening (`src/audio/sounds/doors.ts`). */
  sound: DoorKind;
  /** What the player calls it, for the hint. */
  name: string;
}

export interface Leaf { node: THREE.Object3D; side: -1 | 0 | 1; home: THREE.Vector3 }

/** A built door, in its own frame, ready to be placed and posed. */
export interface Rig {
  style: DoorStyle;
  spec: StyleSpec;
  group: THREE.Group;
  glow: THREE.Group;
  leaves: Leaf[];
  /** Spun with the opening (the sluice's wheel). */
  wheel: THREE.Object3D | null;
  /** The light in the crack, shown only while the door is nearly shut. */
  seam: THREE.Object3D[];
  /** 0 shut .. 1 open. */
  open: number;
}


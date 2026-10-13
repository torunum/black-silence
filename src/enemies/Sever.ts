import type * as THREE from "three";
import { PX } from "./SpriteBaker";
import { smearFloor } from "../fx/Splats";
import { bloodFx } from "../fx/ImpactFx";
import { crawlArt, legRows } from "../fx/GoreTex";

/**
 * WHAT A MONSTER LOOKS LIKE WHEN PARTS OF IT ARE GONE (impact plan, Task 3).
 * `damageEnemy`'s `refreshSeverSprite` swaps in the dismembered frame, and
 * until this module the walk cycle swapped the whole sprite straight back
 * in at its next step (`PX[key].a`/`.b`): an armless monster that walked
 * had its arm again a fifth of a second later. The walk cycle now steps
 * between the two frames of what the monster is: whole, headless, armless
 * or without its legs.
 */

type Walker = { key: string; deathKind: number; severKey?: "noLegs" | "noLArm" | "noRArm" | "gibbed"; sever?: { lArm?: boolean; rArm?: boolean; legs?: boolean } };

/** The two frames a walking monster alternates between. */
export function walkSet(e: Walker): [THREE.CanvasTexture, THREE.CanvasTexture] {
  const P = PX[e.key];
  if (e.sever && e.sever.legs) {
    // legless: the crawler's own sprite, with an arm or the head missing as well if they are
    const c = crawlArt(e.key, !!e.sever.lArm, !!e.sever.rArm, e.deathKind === 2);
    if (c) return [c.tex, c.texB];
  }
  if (e.deathKind === 2) return [P.hl, P.hlb];
  switch (e.severKey) {
    case "noLegs": return [P.noLegs, P.noLegsB];
    case "noLArm": return [P.noLArm, P.noLArmB];
    case "noRArm": return [P.noRArm, P.noRArmB];
    case "gibbed": return [P.gibbed, P.gibbedB];
    default: return [P.a, P.b];
  }
}

/**
 * How much shorter a monster is without its legs (the rows above them over all its rows): the crawler's sprite and its
 * hitbox are this fraction of the monster's height. So a shot at a crawler's head is a shot at its head, and not at the
 * air above it. 1 for a monster `crawlArt` has no art for.
 */
export function crawlFactor(key: string): number {
  const P = PX[key];
  return P ? (P.regions.H - legRows(P.regions.H)) / P.regions.H : 1;
}

let crawlN = 0;
/**
 * A monster without its legs hauls itself along: every 32nd frame of a crawler (counted over all of them) it leaves a smear of
 * blood behind it, toward (`bx`,`bz`), and a drop or two. Counted in frames, not by the walk cycle, which a monster only
 * runs once it has attacked.
 */
export function crawlFx(e: { x: number; z: number; fy?: number }, bx: number, bz: number): void {
  if ((++crawlN & 31) !== 0) return;
  smearFloor(e.x, e.z, bx, bz, 0.8);
  bloodFx(e.x, (e.fy || 0) + 0.3, e.z, 2, 0.6);
}

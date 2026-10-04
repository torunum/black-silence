import * as THREE from "three";
import { track } from "../../render/DisposeRegistry";
import { CELL } from "../Grid";
import { ceilHeightAt, floorHeightAt } from "../Collision";
import type { DecorSpec } from "../LevelBuilder";
import { PIECES } from "./registry";

/**
 * THE LIGHT-BEARING PIECES (levels-feel-full plan, Task 3). Dressing adds no light
 * of its own, so a room the level's torches do not reach stays black however much is
 * in it. A piece whose registry entry has a `light` (a sewer lantern, a factory work
 * lamp and furnace, a womb's glowing bulb, a graveyard's crook lantern) is given one
 * real point light here, at the spot the entry names in the piece's own frame,
 * turned by the spec's yaw and stood on its floor (or, for a hung one, hung from
 * its ceiling).
 *
 * A point light is a per-fragment cost on every lit surface in the scene, not a
 * per-object one, so the number of them is a budget: no level may hold more than
 * `LIGHT_BUDGET` (`tests/world/lightBudget.test.ts` counts them on every level as the
 * loader builds it), the most any level had before this task. A piece that reads as
 * a light without being one uses an unlit material and costs nothing.
 */

/** The most point lights any level's scene may hold, the player's four included: level 3's count, the highest there was. */
export const LIGHT_BUDGET = 21;

/** Colour, strength and reach of the light a torch has; a lamp piece follows the same falloff. */
const DECAY = 1.8;

export interface Lamp { spec: DecorSpec; x: number; y: number; z: number; color: number; intensity: number; range: number }

/** Where each light-bearing spec's light goes, in world units. Reads the level's floor and ceiling heights (`world`), so call it with the level loaded. */
export function lampsOf(specs: readonly DecorSpec[] | undefined): Lamp[] {
  const out: Lamp[] = [];
  for (const d of specs || []) {
    const light = PIECES[d.k]?.light;
    if (!light) continue;
    const wx = (d.x + .5) * CELL, wz = (d.z + .5) * CELL, r = d.r || 0, [ax, ay, az] = light.at;
    const k = PIECES[d.k].fixed ? 1 : d.s || PIECES[d.k].scale || 1;
    const lx = (ax * Math.cos(r) + az * Math.sin(r)) * k, lz = (-ax * Math.sin(r) + az * Math.cos(r)) * k;
    const y = light.hung ? ceilHeightAt(wx, wz) - ay : floorHeightAt(wx, wz) + ay * k;
    out.push({ spec: d, x: wx + lx, y, z: wz + lz, color: light.color, intensity: light.intensity, range: light.range });
  }
  return out;
}

/** Adds one point light to the scene for each light-bearing piece in the list; returns them. */
export function addLamps(scene: THREE.Scene, specs: readonly DecorSpec[]): THREE.PointLight[] {
  return lampsOf(specs).map((l) => {
    const pl = track(new THREE.PointLight(l.color, l.intensity, l.range, DECAY));
    pl.name = "decorLamp"; pl.position.set(l.x, l.y, l.z); scene.add(pl);
    return pl;
  });
}

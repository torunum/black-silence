import * as THREE from "three";
import { TEX } from "../render/ProcTextures";
import { track } from "../render/DisposeRegistry";
import { CELL, WALLH } from "./Grid";
import { floorHeightAt, solidAt } from "./Collision";
import { world } from "./WorldState";
import { player } from "../player/PlayerState";
import { buildRig, pose, setLit, slab, styleFor, type DoorStyle, type Rig } from "./DoorKit";
import { ANY, BEHIND, ENTRANCE_REACH, EXIT_CELLS, EXIT_REACH, siteDoorIn, type Site } from "./DoorSite";

/**
 * WHERE THE DOORS GO — the transitions plan
 * (`docs/superpowers/plans/2026-10-05-transitions.md`). A level ends at a great
 * door (`DoorKit.ts`) and the next begins at another; this file finds the wall
 * for each, builds the door in it, and keeps the one thing a door needs
 * between frames: its place, so that `Transition.ts` can walk the camera
 * through it.
 *
 * ## The exit
 *
 * `X` in a level's grid, or — for the five levels whose boss opens the way
 * (`Death.ts`'s `openExit`) — the first open cell of `EXIT_CELLS`, which the
 * game has always used. Neither is against a wall in general: level 1's `X`
 * stood three cells from anything, and the nave's `(16,16)` two cells from the
 * south wall. So the door stands in the nearest wall within `EXIT_REACH` cells
 * (`siteDoor`), and the exit *cell* stays where it always was (`world.exitPos`
 * is unchanged: the grid, the boss rule and every test of reachability read
 * it). Only the place the player must walk to — the cell in front of the door,
 * at most two cells on — is new. Moving the door and not the cell argues
 * itself: nothing about where the exit *is* can change what is reachable,
 * since the standing cell is on the way to the wall from the exit cell, in
 * the same room — and on the same floor: a wall standing on a ledge more than `LEDGE` off the exit
 * cell's floor is no wall to stand at. That is level 3's: its nave exit `(16,16)` is on the pit's 0.6
 * step, and the wall two cells south stands behind the south gallery, 2.3 up and not to be climbed
 * to. Its door is the freestanding kind below, built at the exit cell's own south edge, against the
 * gallery's face, so the exit cell is where the player stands as before.
 *
 * Level 1's `X` has no wall to find at all: its hall ends at the
 * edge of the grid, three cells on, with nothing built there (the hall was
 * always open to the dark at its south end). Level data is held cell for cell
 * to the reference (`tests/fidelity.test.ts`), so the grid is not touched; the
 * door brings a wall of its own (`site.slab`) across the hall's whole open end
 * (`slabSpan`), and stands in that. Those two, level 1's and level 3's, are the only
 * exits that bring a wall (pinned by `tests/world/exitDoor.test.ts`).
 *
 * A level whose exit a boss opens gets its door at load, **sealed**: dark,
 * the glow hidden, no light. `openExit` unseals it — the glow comes up and
 * the light with it — which reads as the boss's death opening the way, where
 * a door appearing from nothing would read as a bug.
 *
 * ## The entrance
 *
 * Every level but the prologue (which has its grave) has a door at the `P`
 * spawn: the nearest wall to `P`, behind the player's start if there is a
 * choice (the player starts facing south). It is shut and dark, and
 * `Transition.ts` opens it at arrival and shuts it behind the player.
 *
 * No `Math.random`; the only light is the exit's one point light, the same
 * one the glowing pad had, so the level's light budget does not move.
 */

export { EXIT_CELLS, EXIT_BOSSES, EXIT_REACH, ENTRANCE_REACH, type Site } from "./DoorSite";

/** The floor under a cell's centre. */
const floorOf = (cx: number, cz: number): number => floorHeightAt((cx + .5) * CELL, (cz + .5) * CELL);

/**
 * The nearest `#` wall in four directions from a cell, within `reach` cells; ties go to the earlier of `order`.
 * With `edge`, the grid's own edge counts as a wall (a `slab` site) — for the one exit that stands against it.
 * The rule itself is `DoorSite.ts`'s, which the level-structure validation asks of a level that was never loaded.
 */
export function siteDoor(cx: number, cz: number, reach: number, order: ReadonlyArray<readonly [number, number]>, edge = false): Site | null {
  return siteDoorIn(world.grid, floorOf, cx, cz, reach, order, edge);
}

/** How wide the grid's open edge is either side of a slab site's cell: the wall a door brings fills all of it. */
function slabSpan(site: Site): { width: number; centre: number } {
  const px = site.dz !== 0 ? 1 : 0, pz = site.dx !== 0 ? 1 : 0;   // the axis along the edge
  const open = (k: number): boolean => {
    const x = site.sx + px * k, z = site.sz + pz * k, ch = world.grid[z]?.[x];
    return ch !== undefined && !"#IW".includes(ch) && world.grid[z + site.dz]?.[x + site.dx] === undefined;
  };
  let lo = 0, hi = 0;
  while (open(lo - 1)) lo--;
  while (open(hi + 1)) hi++;
  return { width: (hi - lo + 1) * CELL, centre: (lo + hi) / 2 * CELL };
}

/** A door in the world: where its wall face is, which way it faces, and its light. */
export interface PlacedDoor {
  rig: Rig;
  site: Site;
  /** The cell the site was searched from: the exit cell, or the spawn's. */
  from: { cx: number; cz: number };
  /** The middle of the door on its wall face, world units. */
  x: number; z: number;
  /** The floor in front of it. */
  y: number;
  /** The unit vector from the door out into the room. */
  nx: number; nz: number;
  light: THREE.PointLight | null;
  lit: boolean;
}

export const doors = { exit: null as PlacedDoor | null, entrance: null as PlacedDoor | null };

function place(style: DoorStyle, name: string, site: Site, from: { cx: number; cz: number }, scene: THREE.Scene): PlacedDoor {
  const rig = buildRig(style, name);
  const cx = (site.sx + .5) * CELL, cz = (site.sz + .5) * CELL;
  const x = cx + site.dx * CELL / 2, z = cz + site.dz * CELL / 2, y = floorHeightAt(cx, cz);
  const nx = -site.dx, nz = -site.dz, turn = Math.atan2(nx, nz);
  if (site.slab) {   // at the grid's edge: a wall of its own, across the whole open end, to stand in
    const { width, centre } = slabSpan(site);
    // along the edge, in the door's own frame (its +x runs (cos turn, -sin turn) in the world)
    const along = centre * ((site.dz !== 0 ? 1 : 0) * Math.cos(turn) - (site.dx !== 0 ? 1 : 0) * Math.sin(turn));
    rig.group.add(slab(width, WALLH, .3, track(new THREE.MeshLambertMaterial({ map: TEX.dungeonWall })), along, WALLH / 2, -.16));
  }
  for (const g of [rig.group, rig.glow]) { g.position.set(x, y, z); g.rotation.y = turn; scene.add(g); }
  setLit(rig, false);
  pose(rig, 0);
  return { rig, site, from, x, z, y, nx, nz, light: null, lit: false };
}

/** The exit cell `openExit` takes: the first of `EXIT_CELLS` that is open ground. */
export function exitCell(): readonly [number, number] {
  for (const c of EXIT_CELLS) if (!solidAt((c[0] + .5) * CELL, (c[1] + .5) * CELL)) return c;
  return EXIT_CELLS[0];
}

function exitSite(cx: number, cz: number): Site {
  return siteDoor(cx, cz, EXIT_REACH, ANY, true) ?? { sx: cx, sz: cz, dx: 0, dz: 1, k: 1, slab: true };
}

/** Lights the exit: the glow comes up, with the one point light the pad had. */
function lightExit(d: PlacedDoor, scene: THREE.Scene): void {
  setLit(d.rig, true);
  d.lit = true;
  if (d.light) return;
  // decay:1 explicit — restores r128's PointLight default (r186 moved it to 2); the pad's light was tuned against it. See KNOWN-14.
  const gl = track(new THREE.PointLight(d.rig.spec.glow, 1.3, 8, 1));
  gl.position.set(d.x + d.nx * .9, d.y + d.rig.spec.h * .5, d.z + d.nz * .9);
  scene.add(gl);
  d.light = gl;
}

/**
 * Builds the level's doors, once the grid has been scanned: the exit (lit if
 * `world.exitPos` is set, sealed if only a boss will open it) and, unless the
 * level opens in a grave, the entrance at the spawn. `def` is the level's
 * `LevelDef`, whose `sub` picks the door; `scene` is the level's.
 */
export function buildLevelDoors(scene: THREE.Scene, def: { sub?: string; hell?: boolean; flesh?: boolean }, hasBossExit: boolean, hasEntrance: boolean): void {
  doors.exit = doors.entrance = null;
  const style = styleFor(def);
  const ex = world.exitPos as { x: number; z: number } | null;
  if (ex) {
    const cx = ex.x / CELL | 0, cz = ex.z / CELL | 0;
    doors.exit = place(style, "exitDoor", exitSite(cx, cz), { cx, cz }, scene);
    lightExit(doors.exit, scene);
  } else if (hasBossExit) {
    const [cx, cz] = exitCell();
    doors.exit = place(style, "exitDoor", exitSite(cx, cz), { cx, cz }, scene);
  }
  if (hasEntrance) {
    const cx = player.px / CELL | 0, cz = player.pz / CELL | 0, s = siteDoor(cx, cz, ENTRANCE_REACH, BEHIND);
    if (s) doors.entrance = place(style, "entranceDoor", s, { cx, cz }, scene);
  }
}

/**
 * `openExit`'s part: the exit door's sealed glow comes up. A level whose door
 * was not built at load (a test calling `openExit` on a bare level) gets it
 * built now, from the same cell.
 */
export function unsealExit(scene: THREE.Scene, def: { sub?: string; hell?: boolean; flesh?: boolean }): void {
  if (!doors.exit) {
    const [cx, cz] = exitCell();
    doors.exit = place(styleFor(def), "exitDoor", exitSite(cx, cz), { cx, cz }, scene);
  }
  lightExit(doors.exit, scene);
}

/** The player's place against a door: how far out from it along its normal, how far across, and how squarely they face it (1 = straight on). */
export function against(d: PlacedDoor, px: number, pz: number, yaw: number): { out: number; across: number; facing: number } {
  const rx = px - d.x, rz = pz - d.z;
  const out = rx * d.nx + rz * d.nz, across = rx * d.nz - rz * d.nx;
  const len = Math.hypot(rx, rz) || 1;
  return { out, across, facing: (-Math.sin(yaw) * -rx + -Math.cos(yaw) * -rz) / len };
}

/**
 * Does a door claim this cell from a piece of dressing of this `mode`? The pieces are placed by the level's
 * author and `place.ts` knows only the `X` in the grid, so a runtime exit (the boss's) and the entrance were
 * never kept clear: a banner hung on the very wall the door stands in, a candelabrum at the exit cell. The door's
 * cell in front of it takes no wall piece and no bulky one, and the exit cell itself no bulky one (`Decor.ts`
 * drops them as it dresses; the level's own list is untouched, so every test of the author's placement stands).
 */
export function doorClaims(cx: number, cz: number, mode: string): boolean {
  const bulky = mode === "edge" || mode === "free" || mode === "solid";
  for (const d of [doors.exit, doors.entrance]) {
    if (!d) continue;
    if (cx === d.site.sx && cz === d.site.sz && (bulky || mode === "wall")) return true;
    if (cx === d.from.cx && cz === d.from.cz && bulky) return true;
  }
  return false;
}

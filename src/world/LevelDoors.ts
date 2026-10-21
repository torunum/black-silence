import * as THREE from "three";
import { TEX } from "../render/ProcTextures";
import { DOORTEX } from "../render/DoorTextures";
import { track } from "../render/DisposeRegistry";
import { quietly } from "../fx/Quiet";
import { CELL, WALLH } from "./Grid";
import { world } from "./WorldState";
import { ARCH_APEX, ARCH_R, ARCH_SPRING, archAxis } from "./Arches";

/**
 * THE DOORS INSIDE A LEVEL (owner, 2026-10-21: "kapıları yeniden yapabilirsin, bölümlerin daha iyi olması geliştirilmesi gerekiyor").
 * The reference's door was a box the size of the whole cell with a plank texture on it, sunk into the floor when opened — and built at
 * the grid's own height, so on a raised floor (the monastery stands at 1.2 and higher) it stood with its foot in the floor and a gap
 * over its head. Now a plain or locked door is a pair of gothic leaves under the doorway's pointed arch (`./Arches.ts`): each leaf
 * half the opening, its top cut to the arch's curve, hung on the jamb, with an iron ring either face. Opened, the two leaves swing away
 * from whoever opened them and come to rest against the passage's walls.
 *
 *  - plain (`+`): worn oak with strap hinges (`DOORTEX.oak`);
 *  - locked (`D`): black riveted iron with the red lock plate (`DOORTEX.ironLeaf`) — the red key's door;
 *  - the flesh level's: the flesh door's skin (`TEX.fleshDoor`) on the same leaves.
 *
 * A door stands on its own cell's floor and reaches its own cell's ceiling: the leaves are scaled with the arch to the height between,
 * up to the arch's own (`WALLH`); a taller cell gets a lintel of wall over the arch. Secret doors (`S`) keep the sinking block: drawn as
 * wall, on purpose (`./Trim.ts`). Collision is the grid's, unchanged: a door's cell is solid until it is opened.
 *
 * Built `quietly` (`../fx/Quiet.ts`): a door takes nothing from the game's dice.
 */

/** How long the leaves take to swing open, seconds, and how far they turn (just past a right angle, against the walls). */
export const SWING_T = 0.7, SWING = 1.62;
const HALF = CELL / 2, T = 0.09, GAP = 0.025;

export interface DoorLeaf { node: THREE.Object3D; side: 1 | -1 }
/** What `world.doors` holds for a swinging door, beside the old record's `open`/`locked`/`flesh`. */
export interface SwingDoor { mesh: THREE.Object3D; leaves: DoorLeaf[]; k: number; dir: number; axis: "x" | "z"; open: boolean }

/** One leaf's outline in its hinge's frame: from the hinge (x = 0) to the doorway's middle (x = -w for the right leaf, `side` 1; +w for the left), up to the arch's curve. */
function leafShape(side: 1 | -1): THREE.Shape {
  const sh = new THREE.Shape(), w = HALF - GAP, cx = HALF - ARCH_R, top = Math.acos(-cx / ARCH_R);
  sh.moveTo(0, 0); sh.lineTo(-side * w, 0); sh.lineTo(-side * w, ARCH_APEX - GAP);
  for (let i = 7; i >= 0; i--) {   // the arc, from the apex down to the springer at the jamb
    const t = top * i / 8, x = cx + ARCH_R * Math.cos(t), y = ARCH_SPRING + ARCH_R * Math.sin(t) - GAP;
    sh.lineTo(side * (x - HALF), y);
  }
  sh.lineTo(0, ARCH_SPRING - GAP); sh.lineTo(0, 0);
  return sh;
}

const leafGeo: Partial<Record<1 | -1, THREE.ExtrudeGeometry>> = {};
/** A leaf's solid, `T` thick and centred on its plane, its texture once across (hinge at the texture's right edge) and once up the arch's height. */
function leafGeometry(side: 1 | -1): THREE.ExtrudeGeometry {
  const have = leafGeo[side];
  if (have) return have;
  const g = new THREE.ExtrudeGeometry(leafShape(side), { depth: T, bevelEnabled: false });
  g.translate(0, 0, -T / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 1 + side * p.getX(i) / HALF, p.getY(i) / ARCH_APEX);
  return (leafGeo[side] = track(g));
}

const mats: Partial<Record<"plain" | "locked" | "flesh", THREE.Material>> = {};
function leafMat(kind: "plain" | "locked" | "flesh"): THREE.Material {
  const map = kind === "locked" ? DOORTEX.ironLeaf : kind === "flesh" ? TEX.fleshDoor : DOORTEX.oak;
  return mats[kind] ??= track(new THREE.MeshLambertMaterial({ map: map as THREE.Texture | undefined }));
}
let ironMat: THREE.Material | null = null;
let ringGeo: THREE.TorusGeometry | null = null;

/** Forgets the shared geometry and materials (`loadLevel` disposes everything tracked between levels). */
export function resetLevelDoors(): void { delete leafGeo[1]; delete leafGeo[-1]; ringGeo = null; ironMat = null; for (const k of Object.keys(mats)) delete mats[k as keyof typeof mats]; }

/**
 * Builds the door in cell (x, z) and adds it to `scene`, or returns null where the cell has no arch to hang leaves under (a door
 * free in a room, or open on three sides) — such a door keeps the old block. `floor` and `ceil` are the cell's; `wall` is its wall's
 * material, for the lintel over a tall doorway.
 */
export function buildLevelDoor(scene: THREE.Scene, x: number, z: number, kind: "plain" | "locked" | "flesh", floor: number, ceil: number, wall: THREE.Material): SwingDoor | null {
  const axis = archAxis(x, z);
  if (!axis) return null;
  return quietly(() => {
    const root = new THREE.Group(); root.name = "door";   // the door's shadow rule, for the whole subtree (`src/render/Shadows.ts`)
    root.position.set((x + .5) * CELL, floor, (z + .5) * CELL);
    root.rotation.y = axis === "x" ? Math.PI / 2 : 0;   // local z along the passage, as the arch's frame
    const sy = Math.min(1, (ceil - floor) / WALLH);
    const leaves: DoorLeaf[] = [];
    ironMat ??= track(new THREE.MeshLambertMaterial({ color: 0x1e1c1a }));
    ringGeo ??= track(new THREE.TorusGeometry(.07, .015, 5, 12));
    for (const side of [1, -1] as const) {
      const hinge = new THREE.Group(); hinge.position.set(side * (HALF - .01), 0, 0); hinge.scale.set(1, sy, 1);
      const leaf = new THREE.Mesh(leafGeometry(side), leafMat(kind)); leaf.name = "door"; hinge.add(leaf);
      for (const f of [-1, 1]) {   // a ring either face, by the meeting edge, at hand height
        const r = new THREE.Mesh(ringGeo, ironMat); r.name = "door"; r.position.set(-side * (HALF - .2), 1.05 / sy, f * (T / 2 + .012)); hinge.add(r);
      }
      root.add(hinge); leaves.push({ node: hinge, side });
    }
    if (ceil - floor > WALLH + .05) {   // a doorway into a tall hall: wall over the arch, up to the ceiling
      const h = ceil - floor - WALLH, m = new THREE.Mesh(track(new THREE.BoxGeometry(CELL, h, CELL - .08)), wall);
      m.position.set(0, WALLH + h / 2, 0); m.name = "wall"; root.add(m);
    }
    scene.add(root);
    return { mesh: root, leaves, k: 0, dir: 1, axis, open: false };
  });
}

/** Which way a door opened by someone standing at (px, pz) swings: away from them, along its passage (+1 toward +z/+x). */
export function swingAway(d: SwingDoor, px: number, pz: number): number {
  const along = d.axis === "z" ? pz - d.mesh.position.z : px - d.mesh.position.x;
  return along < 0 ? 1 : -1;
}

/** Sets the leaves at `d.k` (0 shut .. 1 open), eased, turned the way `d.dir` says. */
export function poseLevelDoor(d: SwingDoor): void {
  const e = d.k * d.k * (3 - 2 * d.k);
  // a leaf runs from its hinge toward the middle, -x for the right leaf and +x for the left, so the same turn swings them opposite
  // ways: each turns by its side. (For an x passage the frame is turned a quarter, and its local +z is world +x: `dir` means the same
  // thing along either.)
  for (const l of d.leaves) l.node.rotation.y = l.side * d.dir * e * SWING;
}

/** Every frame: an opened door's leaves swing on to rest. */
export function swingTick(d: SwingDoor, dt: number): void {
  if (!d.open || d.k >= 1) return;
  d.k = Math.min(1, d.k + dt / SWING_T);
  poseLevelDoor(d);
}

/** Is this `world.doors` record a swinging door? */
export function isSwing<D>(d: D): d is D & SwingDoor { return !!d && Array.isArray((d as unknown as SwingDoor).leaves); }

/** A count, for the tests: the doors of the loaded level that swing. */
export function swingingDoors(): number { return Object.values(world.doors).filter(isSwing).length; }

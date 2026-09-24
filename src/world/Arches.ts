import * as THREE from "three";
import { CELL, WALLH } from "./Grid";
import { world } from "./WorldState";
import { COURSE_H, isOpenCell } from "./Trim";
import { track } from "../render/DisposeRegistry";

/**
 * POINTED ARCHES over the plain and locked doorways — the last piece of the
 * gothic trim. Procedural, one hand-built geometry, instanced: one scene
 * child per level however many doors it has.
 *
 * ## What a doorway is here, and so what an arch can be
 *
 * A door cell (`+`, `D`, `S`) is a full-height box filling the whole cell,
 * `CELL` x `WALLH` x `CELL` (2 x 3.4 x 2), and opening it sinks that box into
 * the floor: `doorTick` lowers it at 2.6 units a second until its centre is
 * at `-WALLH/2 + .1`, so its top ends 0.06-0.1 above the floor (the last step
 * overshoots by up to one frame's travel). There is no wall above a door —
 * the opening is the whole cell, floor to ceiling. So the arch cannot sit on
 * a wall over the opening. It is a **head**: stone filling the top of the
 * door cell's own opening, between a pointed curve and `WALLH`, running the
 * cell's full depth so walking through shows a soffit overhead rather than
 * a cut-out. The closed door, being the whole cell, contains it; the sinking
 * door reveals it top first.
 *
 * ## The shape, against the cell
 *
 * Two circular arcs of radius `ARCH_R` = 1.5 (three quarters of the 2-unit
 * span — a "drop" pointed arch), each centred on the springline half a unit
 * inside the far jamb, meeting at an apex. Rise = sqrt(2 * 1.5 * 1 - 1) =
 * sqrt(2) = 1.41 above the springline. (A rise of one unit on a two-unit
 * span would be a semicircle, not a point.) Where it sits:
 *
 * - **Apex at `WALLH - COURSE_H` = 3.06** — the foot of the cornice either
 *   side. So the crown above the point is the cornice's own 0.34, in the
 *   same band texture: the cornice line carries across the doorway as the
 *   arch's crown instead of stopping at a gap, and the head is one piece of
 *   stone across the opening rather than two corner wedges meeting at a
 *   point on the ceiling. That holds where the room a doorway opens on has
 *   the default ceiling, which is every arched door but five on level 3:
 *   there one side opens under a 5.2 vault, that side's cornice runs at 5.2
 *   on the riser above the jambs (`Trim.ts` hangs it from the facing cell's
 *   ceiling), and the crown on that face meets bare wall instead.
 * - **Springline at 3.06 - 1.41 = 1.65**, just under half of `WALLH`. The
 *   player's eye is at 1.0 (`EYE`), so the jambs run clear 0.65 above it.
 * - **The point** closes at about 141 degrees (each arc's tangent is 19.5
 *   degrees off horizontal at the apex). A springline at two-thirds of
 *   `WALLH` (2.27) cannot be pointed under this crown at all: it leaves 0.79
 *   of rise, less than the semicircle's 1. Even run up to `WALLH` itself
 *   (rise 1.13, r = 1.14) it closes at ~166 degrees and reads as round.
 *
 * ## Hidden by the closed door — the inset
 *
 * The two faces (the spandrels) stand `ARCH_INSET` = 0.04 inside the door
 * box's two passage faces; everything else is inside the box by
 * construction (x within the jambs, y within [springline, `WALLH`]). No arch
 * face is coplanar with a door face, so a closed door covers it by depth
 * test alone and nothing depends on draw order — Phase 2B's trim review
 * measured a draw-order-dependent flicker at exactly coplanar faces. 0.04 is
 * several times the depth resolution at any distance these fogged levels
 * show: with `near` 0.05 and a 24-bit buffer, depth steps are about
 * d^2 * 1.2e-6 (0.0005 at 20 units, 0.01 at the 90-unit far plane), and even
 * a 16-bit buffer resolves it to ~11 units. Opened, the spandrel sits 0.04
 * behind the line of the wall faces either side: about a pixel of reveal at
 * room distance, which reads as the arch set into the wall.
 *
 * ## Which doors
 *
 * - **Plain and locked (`+`, `D`)**, when the cells either side across the
 *   span (the jambs) are both real walls (`#` or `W`) and at least one cell
 *   along the passage is open. A door standing free in a room, or open on
 *   three sides, has nothing to spring from and gets none; a door walled in
 *   on all four sides is never seen and gets none.
 * - **Never secret doors (`S`).** A secret door is drawn as wall on
 *   purpose; an arch in it is a sign reading "secret here" — the same
 *   reason `Trim.ts` gives each secret door the courses its neighbours have.
 * - **Flesh doors get the same arch, in the theme's band.** The arch is trim,
 *   so it wears what the courses wear (`src/render/BandTextures.ts`): on the
 *   flesh level that is the pale bone band framing every red wall, and a
 *   bone arch over a flesh door is the relationship the courses already
 *   draw, where a flesh-textured arch would vanish into the wall around it.
 *
 * ## What it must never touch
 *
 * It reads `world.grid` and writes scene children only. Collision
 * (`Collision.ts`) reads the grid and never the scene, so the arch changes
 * nowhere anything can walk or shoot: the hitscan march is 2-D, and a
 * projectile ends at `ceilHeightAt`, not at the arch, so a shot through the
 * top corner of a doorway passes through the stone for the frame or two it
 * spends in the cell. Hitscan already passes through the ceiling the same
 * way; the arch joins it.
 */

/** Radius of each of the two arcs. Three quarters of the span: a drop pointed arch. */
export const ARCH_R = .75 * CELL;
/** The apex: level with the foot of the cornice either side, so the crown is the cornice's own height. */
export const ARCH_APEX = WALLH - COURSE_H;
/** How far the arch's two faces stand inside the door box's passage faces. Never zero: coplanar faces flicker. */
export const ARCH_INSET = .04;
/** Segments per arc. At ~35 pixels a unit (four units away) eight keep every facet under three pixels. */
export const ARCH_SEGS = 8;
/** Real walls a door must have either side to spring an arch from. */
export const JAMB_CELLS = "#W";

const HALF = CELL / 2;
/** Height of the springline: the apex less the rise of an arc of radius `ARCH_R` over half the span. */
export const ARCH_SPRING = ARCH_APEX - Math.sqrt(ARCH_R * ARCH_R - (ARCH_R - HALF) * (ARCH_R - HALF));

function isJamb(x: number, z: number): boolean {
  const row = world.grid[z];
  const ch = row && row[x];
  return ch !== undefined && JAMB_CELLS.indexOf(ch) >= 0;
}

/**
 * The direction a door's passage runs, `"z"` or `"x"`, or `null` if it gets
 * no arch: a secret door, a door without a real wall on both sides across
 * its span, or one with nothing open along its passage.
 */
export function archAxis(x: number, z: number): "x" | "z" | null {
  const ch = world.grid[z] && world.grid[z][x];
  if (ch !== "+" && ch !== "D") return null;
  if (isJamb(x - 1, z) && isJamb(x + 1, z) && (isOpenCell(x, z - 1) || isOpenCell(x, z + 1))) return "z";
  if (isJamb(x, z - 1) && isJamb(x, z + 1) && (isOpenCell(x - 1, z) || isOpenCell(x + 1, z))) return "x";
  return null;
}

/** The right-hand arc, springer to apex, as (x, y, unit normal toward the opening) — the left is its mirror. */
function arc(): Array<{ x: number; y: number; nx: number; ny: number }> {
  const cx = HALF - ARCH_R, top = Math.acos(-cx / ARCH_R);
  const out = [];
  for (let i = 0; i <= ARCH_SEGS; i++) {
    const t = top * i / ARCH_SEGS, c = Math.cos(t), s = Math.sin(t);
    out.push(i === ARCH_SEGS
      ? { x: 0, y: ARCH_APEX, nx: -c, ny: -s }   // exact, so the two arcs meet
      : { x: cx + ARCH_R * c, y: ARCH_SPRING + ARCH_R * s, nx: -c, ny: -s });
  }
  return out;
}

/**
 * One arch in the door cell's own frame: centred on the cell, standing on
 * y = 0, the passage along local z and the span along local x. Two spandrel
 * faces (local -z and +z, each `ARCH_INSET` inside the cell) and the soffit
 * between them. No top (it is against `WALLH`) and no ends (they are against
 * the jambs). UVs at the wall's texel density, as the courses are, with the
 * soffit's measured along the curve from the apex so the band's joints fall
 * on the apex and symmetrically either side of it.
 */
export function archGeometry(): THREE.BufferGeometry {
  const D = HALF - ARCH_INSET;
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [];
  const vert = (p: number[], n: number[], t: number[]) => { pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]); uv.push(t[0], t[1]); };
  const face = (q: number[][], n: number[], uvOf: (p: number[]) => number[]) => {
    for (const i of [0, 1, 2, 0, 2, 3]) vert(q[i], n, uvOf(q[i]));
  };
  const flat = (p: number[]) => [p[0] / CELL + .5, p[1] / WALLH];
  const R = arc();
  let s = 0;
  const along: number[] = [0];   // arc length from the apex, per point, right side
  for (let i = R.length - 1; i > 0; i--) { s += Math.hypot(R[i].x - R[i - 1].x, R[i].y - R[i - 1].y); along.unshift(s); }
  for (const side of [1, -1]) {
    for (let i = 0; i < ARCH_SEGS; i++) {
      const a = R[i], b = R[i + 1];
      const ax = side * a.x, bx = side * b.x;
      // Spandrels: the strip between the curve and WALLH, on both faces.
      // Wound so each face's front is the side its normal names.
      const front = [[ax, a.y, -D], [bx, b.y, -D], [bx, WALLH, -D], [ax, WALLH, -D]];
      const back = [[ax, a.y, D], [ax, WALLH, D], [bx, WALLH, D], [bx, b.y, D]];
      face(side > 0 ? front : [front[0], front[3], front[2], front[1]], [0, 0, -1], flat);
      face(side > 0 ? back : [back[0], back[3], back[2], back[1]], [0, 0, 1], flat);
      // Soffit: the curve carried through the cell's depth, smooth-shaded.
      const na = [side * a.nx, a.ny, 0], nb = [side * b.nx, b.ny, 0];
      const ua = side * along[i] / CELL, ub = side * along[i + 1] / CELL;
      const quad = [
        { p: [ax, a.y, -D], n: na, t: [ua, 0] }, { p: [ax, a.y, D], n: na, t: [ua, CELL / WALLH] },
        { p: [bx, b.y, D], n: nb, t: [ub, CELL / WALLH] }, { p: [bx, b.y, -D], n: nb, t: [ub, 0] },
      ];
      const order = side > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      for (const k of order) vert(quad[k].p, quad[k].n, quad[k].t);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** The arch's transform for a door cell: at the cell's centre, turned a quarter so local z runs along an x passage. */
export function archMatrix(x: number, z: number, axis: "x" | "z"): THREE.Matrix4 {
  const at = new THREE.Vector3((x + .5) * CELL, 0, (z + .5) * CELL);
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), axis === "x" ? Math.PI / 2 : 0);
  return new THREE.Matrix4().compose(at, turn, new THREE.Vector3(1, 1, 1));
}

/**
 * Adds the level's door arches to `scene` as one `InstancedMesh` named
 * `doorArch`, or nothing if no door qualifies. A scene child, not a child of
 * the door: the arch stays put while the door sinks past it. `bandTex` is
 * the level's trim band, the one the courses wear. Called once by
 * `loadLevel`, right after `buildTrim`, before `applyShadowFlags`.
 */
export function buildArches(scene: THREE.Scene, bandTex: THREE.Texture): void {
  const mats: THREE.Matrix4[] = [];
  for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
    const axis = archAxis(x, z);
    if (axis) mats.push(archMatrix(x, z, axis));
  }
  if (!mats.length) return;
  const mesh = new THREE.InstancedMesh(track(archGeometry()), track(new THREE.MeshLambertMaterial({ map: bandTex })), mats.length);
  mats.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true; mesh.name = "doorArch";
  scene.add(mesh);
}

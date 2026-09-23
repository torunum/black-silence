import * as THREE from "three";
import { CELL, WALLH } from "./Grid";
import { world } from "./WorldState";
import { ceilHeightAtCell } from "./Collision";
import { TEX } from "../render/ProcTextures";
import { track } from "../render/DisposeRegistry";

/**
 * GOTHIC TRIM — pillar bases and capitals, and the two wall courses (a
 * plinth where a wall meets the floor, a cornice where it meets the
 * ceiling). Phase 2 Part B's last item. Procedural, per the asset policy:
 * two hand-built geometries and the level's own wall and pillar textures.
 *
 * Its own module for the reason `Ceiling.ts` and `render/Shadows.ts` are:
 * `LevelLoader.ts` was at 398 of the 400-line gate, and this is one
 * decision that reads `world` and writes nothing but scene children. The
 * loader's whole hook is one import and one call.
 *
 * ## Proportions, chosen for the renderer this game actually has
 *
 * The framebuffer is 400 pixels wide by default (320 at the lowest setting),
 * about 225 tall, with a 78-degree *vertical* field of view, `NearestFilter`
 * on every texture and `antialias: false`. So one world unit at distance `d`
 * covers `(225/2) / tan(39deg) / d`, about **139/d pixels**. Anything that
 * covers fewer than about two pixels does not read as a moulding: it
 * flickers in and out as the camera moves, because with no antialiasing a
 * sub-pixel sliver is either sampled or not. The target was "at least two
 * pixels at ten units" at the 320 setting as well as 400 — past about ten
 * units these levels are dark enough that the matched before/after frames
 * showed almost nothing of the walls at all, trim or no trim.
 *
 * - **Wall course**: 0.34 tall overall — a 0.20 vertical face and a 0.14
 *   chamfer back to the wall — standing 0.16 proud. At 10 units the face is
 *   ~2.8 px (2.2 at the 320 setting) and the whole course ~4.7 px; at a
 *   typical 5-unit room distance they are ~5.6 and ~9.5. A single square
 *   0.1-unit band, the "delicate" version, would be 1.4 px at 10 units and
 *   would shimmer. The chamfer is not decoration: its normal points out *and*
 *   up (the cornice's, rotated, out and down), so it takes the player's lamp
 *   at a different angle from the wall face above it, and that one lighting
 *   step is what makes the course read as a line at all. The front face
 *   shares the wall's normal and, by itself, would shade identically.
 * - **Pillar base and capital**: one shape used twice — a 0.18-tall
 *   octagonal block of radius 0.80, then a 0.26-tall chamfer that closes to
 *   radius 0.40, *inside* the shaft (0.55 at the foot, 0.46 at the head), so
 *   the seam where it meets the shaft is buried rather than drawn. The base
 *   steps out 0.25 from the shaft on every side, ~3.5 px at 10 units. The
 *   capital is the same geometry rotated half a turn about X — a rotation,
 *   not a mirror, so its winding and face culling stay right — and eight
 *   segments with three's default `thetaStart`, so its facets line up with
 *   the shaft's exactly (a half-turn maps the octagon's angles onto
 *   themselves).
 *
 * Both reuse the textures the thing they decorate already has, remapped to
 * the **same texel density** as the wall and shaft (64 texels per WALLH):
 * a default box or cylinder UV would squash all 64 rows of a texture into a
 * 0.2-unit band, ~300 texels per unit, and under `NearestFilter` that is
 * noise that crawls every frame. Nothing here draws from `Math.random`.
 *
 * ## Where it goes
 *
 * A wall face gets a course when the cell across it is **open** — anything
 * that is not a full-cell block (`#`, `W`, or one of the three door kinds).
 * That includes pillar cells: an `I` is solid to collision but only its
 * middle is occupied, so the wall behind it is in plain view. A face against
 * another wall, a door, or the edge of the map gets nothing — it is never
 * seen. Where the cell *along* a face is also open (an outside corner), the
 * course runs on by its own depth so the corner is closed instead of
 * notched.
 *
 * Each course takes its heights from the open cell it faces, not from the
 * wall: the plinth stands on that cell's floor (the top of its height-map
 * platform if it has one, so it is not buried inside the platform) and the
 * cornice hangs from **that cell's ceiling**. On a level that opted into
 * `world.ceilMap` (level 3 today) the ceiling over a raised vault is not at
 * `WALLH`; the wall below it stays `WALLH` tall and `Ceiling.ts`'s riser
 * carries the same plane up to the vault. A cornice at `WALLH` there would
 * be a string course halfway up a wall with the real cornice line missing;
 * at the vault's own height it sits in the corner where riser meets ceiling,
 * which is the one place a cornice belongs. Where floor and ceiling of the
 * facing cell are too close for two courses and some bare wall between
 * them (the prologue's 2.94-high galleries under a 3.4 ceiling) the face
 * gets neither.
 *
 * ## Doors
 *
 * - **Plain and locked doors (`+`, `D`)** get no trim. They sink into the
 *   floor, so a plinth across one would be left standing across the
 *   doorway. The wall courses either side stop square at the door's edge,
 *   which reads as a door frame; the jambs (the faces of the walls *inside*
 *   the doorway) get nothing, because a closed door fills that space and a
 *   course there would be coplanar with the door's own faces.
 * - **Secret doors (`S`)** are the hard case. They are deliberately
 *   indistinguishable from wall — `matWall`, `wallGeo` — so a course that
 *   ran along the wall and stopped for a cell would point straight at every
 *   secret in the game. So a secret door gets the same course as the walls
 *   either side of it, built as a child of the door's own mesh: it is flush
 *   with its neighbours while the door is shut and sinks with it when it
 *   opens. It is one small `InstancedMesh` per secret door — every level
 *   has one secret door or none — and because it is a *child* of the door
 *   rather than a scene child, `applyShadowFlags` gives it the door's policy
 *   through the subtree walk and the scene-child count does not see it.
 *
 * ## What it must never touch
 *
 * `world.grid`, `world.wallSegs`, `world.heightMap`, `world.ceilMap`: all
 * read-only here. Collision (`Collision.ts`) reads the grid and never the
 * scene, so trim cannot change where anything can walk — pinned by
 * `tests/world/trim.test.ts`. Angled `wallSegs` get no trim: no level
 * places one, and a segment of arbitrary length and angle is a different
 * geometry problem.
 *
 * Not in this module, on purpose: pointed arches over doorways. A door
 * sinks, so an arch cannot hang off it; it has to sit on the wall above the
 * opening, which is its own placement question — the next step after this.
 */

/** Total height of a plinth or cornice, its vertical face, and how far it stands out from the wall. */
export const COURSE_H = .34, COURSE_FACE = .20, COURSE_D = .16;
/** Pillar base/capital: outer radius, the block's height, the chamfer's height, and where the chamfer ends (inside the shaft). */
export const PIER_R = .80, PIER_BLOCK_H = .18, PIER_CHAMFER_H = .26, PIER_INNER_R = .40;
/** Least bare wall left between plinth and cornice before a face is judged too short for either. */
export const MIN_BARE = .6;
/** Cells that fill themselves edge to edge. A face against one of these is never seen. */
export const BLOCK_CELLS = "#W+DS";

/** One wall face: the solid cell it belongs to and the unit direction it faces. */
export interface TrimFace { x: number; z: number; dx: number; dz: number }

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const Y_AXIS = new THREE.Vector3(0, 1, 0), X_AXIS = new THREE.Vector3(1, 0, 0), Z_AXIS = new THREE.Vector3(0, 0, 1);

/** In the map, and not a full-cell block — the face across from it can be seen. */
export function isOpenCell(x: number, z: number): boolean {
  const row = world.grid[z];
  const ch = row && row[x];
  return ch !== undefined && BLOCK_CELLS.indexOf(ch) < 0;
}

/** What the eye sees as the floor of a cell: the top of its platform if it has one, otherwise 0. */
function visualFloor(x: number, z: number): number {
  const h = (world.heightMap && world.heightMap[z] && world.heightMap[z][x]) || 0;
  return h > 0 ? h : 0;   // `loadLevel` only builds a platform where h > 0
}

/** Every face of every cell whose character is in `cells` that looks onto an open cell. */
export function exposedFaces(cells: string): TrimFace[] {
  const out: TrimFace[] = [];
  for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
    if (cells.indexOf(world.grid[z][x]) < 0) continue;
    for (const [dx, dz] of DIRS) if (isOpenCell(x + dx, z + dz)) out.push({ x, z, dx, dz });
  }
  return out;
}

/** The plinth and cornice transforms for one face, or none if the facing cell is too short for them. */
export function courseMatrices(f: TrimFace): THREE.Matrix4[] {
  const nx = f.x + f.dx, nz = f.z + f.dz;
  const floor = visualFloor(nx, nz), ceil = ceilHeightAtCell(nx, nz);
  if (ceil - floor < 2 * COURSE_H + MIN_BARE) return [];
  // Local +X runs along the face: (dz, -dx) keeps the basis right-handed with +Z = the face normal.
  const tx = f.dz, tz = -f.dx;
  const ePos = isOpenCell(f.x + tx, f.z + tz) ? COURSE_D : 0, eNeg = isOpenCell(f.x - tx, f.z - tz) ? COURSE_D : 0;
  const shift = (ePos - eNeg) / 2;
  const cx = (f.x + .5) * CELL + f.dx * CELL / 2 + tx * shift, cz = (f.z + .5) * CELL + f.dz * CELL / 2 + tz * shift;
  const yaw = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, Math.atan2(f.dx, f.dz));
  const hang = yaw.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, Math.PI));
  const s = new THREE.Vector3((CELL + ePos + eNeg) / CELL, 1, 1);
  return [
    new THREE.Matrix4().compose(new THREE.Vector3(cx, floor, cz), yaw, s),
    new THREE.Matrix4().compose(new THREE.Vector3(cx, ceil, cz), hang, s),
  ];
}

/** Base at the foot of the shaft, capital (the same shape, half a turn about X) at its head. */
export function pierMatrices(x: number, z: number): THREE.Matrix4[] {
  const wx = (x + .5) * CELL, wz = (z + .5) * CELL;
  return [
    new THREE.Matrix4().setPosition(wx, 0, wz),
    new THREE.Matrix4().compose(new THREE.Vector3(wx, WALLH, wz),
      new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.PI), new THREE.Vector3(1, 1, 1)),
  ];
}

/**
 * The course's cross-section, extruded one `CELL` along local X, standing on
 * y=0 against the plane z=0 and projecting toward +z. Only the faces that
 * can be seen are built: the front, the chamfer and the two end caps (the
 * bottom sits on the floor, or for the cornice against the ceiling; the back
 * is against the wall). UVs are at wall texel density — see the header.
 */
function courseGeometry(): THREE.BufferGeometry {
  const L = CELL / 2, H = COURSE_H, F = COURSE_FACE, D = COURSE_D;
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [];
  const tri = (p: number[][], n: number[], uvOf: (q: number[]) => number[]) => {
    for (const q of p) { pos.push(q[0], q[1], q[2]); nrm.push(n[0], n[1], n[2]); uv.push(...uvOf(q)); }
  };
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], uvOf: (q: number[]) => number[]) => {
    tri([a, b, c], n, uvOf); tri([a, c, d], n, uvOf);
  };
  const along = (q: number[]) => [q[0] / CELL + .5, q[1] / WALLH];
  const across = (q: number[]) => [q[2] / CELL, q[1] / WALLH];
  quad([-L, 0, D], [L, 0, D], [L, F, D], [-L, F, D], [0, 0, 1], along);
  const sl = Math.hypot(H - F, D);
  quad([-L, F, D], [L, F, D], [L, H, 0], [-L, H, 0], [0, D / sl, (H - F) / sl], along);
  const cap = [[0, 0], [D, 0], [D, F], [0, H]];   // (z, y), counter-clockwise seen from -X
  const at = (x: number, i: number) => [x, cap[i][1], cap[i][0]];
  quad(at(-L, 0), at(-L, 1), at(-L, 2), at(-L, 3), [-1, 0, 0], across);
  quad(at(L, 0), at(L, 3), at(L, 2), at(L, 1), [1, 0, 0], across);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** The pillar base: an octagonal block and a chamfer, merged, open-ended (both ends are buried). */
function pierGeometry(): THREE.BufferGeometry {
  const parts: Array<[THREE.BufferGeometry, number, number]> = [
    [new THREE.CylinderGeometry(PIER_R, PIER_R, PIER_BLOCK_H, 8, 1, true), 0, PIER_BLOCK_H],
    [new THREE.CylinderGeometry(PIER_INNER_R, PIER_R, PIER_CHAMFER_H, 8, 1, true), PIER_BLOCK_H, PIER_CHAMFER_H],
  ];
  const pos: number[] = [], nrm: number[] = [], uv: number[] = [];
  for (const [geo, y0, h] of parts) {
    const flat = geo.toNonIndexed();geo.dispose();
    flat.translate(0, y0 + h / 2, 0);
    const p = flat.getAttribute("position"), n = flat.getAttribute("normal"), t = flat.getAttribute("uv");
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i)); nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      uv.push(t.getX(i), (y0 + t.getY(i) * h) / WALLH);   // the shaft's texel density, continuous up the stack
    }
    flat.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], name: string): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((mtx, i) => m.setMatrixAt(i, mtx));
  m.instanceMatrix.needsUpdate = true; m.name = name;
  return m;
}

/**
 * Adds the level's trim to `scene`: at most two scene children however many
 * pillars and faces the level has (`wallCourse`, `pillarTrim`), plus one
 * `secretCourse` child on each secret door's own mesh. Called once by
 * `loadLevel`, after the walls, doors and ceiling exist and before
 * `applyShadowFlags` walks the scene.
 */
export function buildTrim(scene: THREE.Scene, wallTex: THREE.Texture): void {
  const courseGeo = track(courseGeometry());
  const courseMat = track(new THREE.MeshLambertMaterial({ map: wallTex }));
  const courses = exposedFaces("#W").flatMap(courseMatrices);
  if (courses.length) scene.add(instanced(courseGeo, courseMat, courses, "wallCourse"));
  const piers: THREE.Matrix4[] = [];
  for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++)
    if (world.grid[z][x] === "I") piers.push(...pierMatrices(x, z));
  if (piers.length) {
    const pierMat = track(new THREE.MeshLambertMaterial({ map: TEX.pillar }));
    scene.add(instanced(track(pierGeometry()), pierMat, piers, "pillarTrim"));
  }
  const bySecret = new Map<string, THREE.Matrix4[]>();
  for (const f of exposedFaces("S")) {
    const key = f.x + "," + f.z;
    bySecret.set(key, [...(bySecret.get(key) || []), ...courseMatrices(f)]);
  }
  for (const [key, mats] of bySecret) {
    const door = world.doors[key] as { mesh?: THREE.Object3D } | undefined;
    if (!door || !door.mesh || !mats.length) continue;
    // Into the door's own frame, so the course rides down with it.
    const toLocal = new THREE.Matrix4().makeTranslation(-door.mesh.position.x, -door.mesh.position.y, -door.mesh.position.z);
    door.mesh.add(instanced(courseGeo, courseMat, mats.map((m) => toLocal.clone().multiply(m)), "secretCourse"));
  }
}

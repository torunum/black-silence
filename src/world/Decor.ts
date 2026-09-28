import * as THREE from "three";
import { TEX } from "../render/ProcTextures";
import { grain } from "../render/BandTextures";
import { track } from "../render/DisposeRegistry";
import { CELL, WALLH } from "./Grid";
import { world } from "./WorldState";
import { floorHeightAt, ceilHeightAt } from "./Collision";
import type { BuiltLevel, DecorSpec } from "./LevelBuilder";

/**
 * SET DRESSING — headstones, a dead tree, a mausoleum roof, coffins, bones,
 * chains, brazier bowls, a burning pit's glow, a moon and stars. Added for
 * the rebuilt prologue (prologue plan, Task 1) after the owner said "the
 * levels feel very empty"; any level may list `BuiltLevel.decor`, and today
 * only the prologue does.
 *
 * **Nothing here is gameplay.** Decor never collides, never takes a shot and
 * is never read back: where a piece should block the player (a headstone,
 * the tree) the level puts a solid cell under it (`I`, which on a raised
 * floor is buried out of sight — see `prologue.ts`). Built from boxes and
 * cylinders, merged into **one mesh per material** (`decor`), so a level's
 * whole dressing costs a handful of scene children and draw calls however
 * many pieces it lists. Every "random" angle comes from the spec or from
 * `grain` (`BandTextures.ts`'s integer hash): nothing here calls
 * `Math.random`, so it cannot move the seeded stream the traces record.
 *
 * **Raised ground.** `loadLevel` places torches, candles and items at fixed
 * heights above y=0 — the reference only ever put them on the base floor. On
 * a zoned level (the prologue's churchyard stands 4.2 above its hell) they
 * are lifted here onto the floor under them; items keep that height as they
 * bob (`Interact.ts`'s `itemsTick` reads `y0`) and a torch's embers rise
 * from its own flame (`y`). Breakable props are not lifted, because a shot
 * finds them between y=0 and their height (`Hitscan.ts`): a level must not
 * put one on raised ground, and `tests/world/prologue.test.ts` says so for
 * the prologue. Unzoned levels are not touched, so level 3's torches on its
 * raised tomb stay where the reference put them.
 */

type Parts = Map<string, THREE.BufferGeometry[]>;

function makeMat(name: string): THREE.Material {
  const MATS: Record<string, () => THREE.Material> = {
  stone: () => new THREE.MeshLambertMaterial({ map: TEX.churchWall, color: 0xa4a6ae }),
  wood: () => new THREE.MeshLambertMaterial({ map: TEX.wood }),
  bark: () => new THREE.MeshLambertMaterial({ map: TEX.wood, color: 0x6e6258 }),
  bone: () => new THREE.MeshLambertMaterial({ color: 0xc9bea2 }),
  iron: () => new THREE.MeshLambertMaterial({ color: 0x34302c }),
  ember: () => new THREE.MeshBasicMaterial({ map: TEX.hellWall, color: 0xffa060, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false }),
    slab: () => new THREE.MeshLambertMaterial({ map: TEX.stair, color: 0x8c7c76 }),
  };
  return MATS[name]();
}

function put(parts: Parts, mat: string, g: THREE.BufferGeometry, m: THREE.Matrix4): void {
  const flat = g.index ? g.toNonIndexed() : g;
  if (flat !== g) g.dispose();
  flat.applyMatrix4(m);
  const list = parts.get(mat);
  if (list) list.push(flat); else parts.set(mat, [flat]);
}

/** Local transform: a position and an XYZ rotation. */
function loc(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
}

/** One decor piece's builder: its parts, in its own frame (y=0 on its floor, +z its front). */
type Piece = (box: (mat: string, w: number, h: number, d: number, m: THREE.Matrix4) => void,
  cyl: (mat: string, r0: number, r1: number, h: number, m: THREE.Matrix4, seg?: number) => void, d: DecorSpec, top: number) => void;

const PIECES: Record<string, Piece> = {
  headstone: (box, _c, d) => {
    const lean = d.h || 0;
    box("stone", .72, .92, .15, loc(0, .46, 0, lean));
    box("stone", .5, .16, .15, loc(0, .98 * Math.cos(lean), .98 * Math.sin(lean), lean));
    box("stone", .9, .08, .3, loc(0, .04, 0));
  },
  cross: (box, _c, d) => {
    const lean = d.h || 0;
    box("stone", .13, 1.3, .13, loc(0, .65, 0, 0, 0, lean));
    box("stone", .62, .12, .12, loc(-.93 * Math.sin(lean), .93 * Math.cos(lean), 0, 0, 0, lean));
  },
  tomb: (box) => {
    box("stone", 1.0, .52, 1.7, loc(0, .26, 0));
    box("stone", 1.14, .1, 1.86, loc(0, .57, 0));
  },
  tree: (_b, cyl, d) => {
    cyl("bark", .13, .27, 3.0, loc(0, 1.5, 0));
    // five limbs and a twig off each, angles from the spec's cell by the integer hash
    for (let i = 0; i < 5; i++) {
      const yaw = i * 1.26 + grain(i, d.x * 31 + d.z, 7) * .8, pitch = .55 + grain(i, 3, 11) * .6;
      const len = 1.1 + grain(i, 5, 13) * .8, y0 = 1.5 + i * .3, r = .07 - i * .006;
      const dir = new THREE.Vector3(Math.sin(pitch) * Math.cos(yaw), Math.cos(pitch), Math.sin(pitch) * Math.sin(yaw));
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      const mid = dir.clone().multiplyScalar(len / 2).add(new THREE.Vector3(0, y0, 0));
      cyl("bark", r * .55, r, len, new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)), 5);
      const tip = dir.clone().multiplyScalar(len).add(new THREE.Vector3(0, y0, 0));
      const dir2 = new THREE.Vector3(dir.x * .5 + Math.cos(yaw + 1.3) * .6, .7, dir.z * .5 + Math.sin(yaw + 1.3) * .6).normalize();
      const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir2);
      cyl("bark", .012, r * .5, .7, new THREE.Matrix4().compose(dir2.clone().multiplyScalar(.35).add(tip), q2, new THREE.Vector3(1, 1, 1)), 4);
    }
  },
  coffin: (box) => {
    box("wood", .62, .06, 1.8, loc(0, .03, 0));
    box("wood", .06, .34, 1.8, loc(.28, .17, 0)); box("wood", .06, .34, 1.8, loc(-.28, .17, 0));
    box("wood", .62, .34, .06, loc(0, .17, .87)); box("wood", .62, .34, .06, loc(0, .17, -.87));
  },
  lid: (box) => {
    box("wood", .64, .06, 1.2, loc(0, .2, -.3, -.3));   // the lid, split, the long half tipped on the spoil
    box("wood", .64, .06, .66, loc(.08, .04, .72, .06, .3));
    box("wood", .3, .06, .7, loc(.5, .03, .2, 0, .5));   // a split plank on the ground
  },
  bones: (box) => {
    box("bone", .2, .17, .22, loc(0, .085, 0, 0, .4));
    box("bone", .14, .05, .12, loc(.02, .025, .14, 0, .4));
    box("bone", .06, .06, .48, loc(.32, .03, .1, 0, .7));
    box("bone", .06, .06, .42, loc(-.28, .03, -.18, 0, -1.2));
    for (let i = 0; i < 3; i++) box("bone", .34, .03, .03, loc(.02, .02, -.32 - i * .08, 0, .2 + i * .1));
  },
  chain: (box, _c, d, top) => {
    const n = Math.max(2, Math.floor((d.h || 2) / .17));
    for (let i = 0; i < n; i++) box("iron", i % 2 ? .1 : .025, .16, i % 2 ? .025 : .1, loc(0, top - .08 - i * .17, 0));
    box("iron", .04, .22, .04, loc(0, top - .08 - n * .17, 0));
    box("iron", .16, .04, .04, loc(.06, top - .2 - n * .17, 0, 0, 0, .5));
  },
  bowl: (_b, cyl) => {
    cyl("iron", .4, .22, .24, loc(0, 1.04, 0), 8);
    cyl("iron", .1, .1, .06, loc(0, .9, 0), 6);
  },
  ember: (box) => { box("ember", CELL, .02, CELL, loc(0, .03, 0)); },
  bridge: (box) => {   // a deck of dressed stone and a kerb down each side; runs along x
    box("slab", CELL, .08, CELL - .5, loc(0, .04, 0));
    box("slab", CELL, .32, .22, loc(0, .16, CELL / 2 - .11)); box("slab", CELL, .32, .22, loc(0, .16, -CELL / 2 + .11));
  },
  roof: (box, _c, d) => {
    // a gable over the mausoleum: w along x, depth along z, pitched about z, ridge 1.7 up
    const w = d.s || 8, dep = d.h || 8, rise = 1.7, half = w / 2 + .3, slope = Math.hypot(half, rise), ang = Math.atan2(rise, half);
    box("stone", slope, .22, dep + .6, loc(-half / 2, WALLH + rise / 2, 0, 0, 0, ang));
    box("stone", slope, .22, dep + .6, loc(half / 2, WALLH + rise / 2, 0, 0, 0, -ang));
    for (const zf of [dep / 2 + .1, -dep / 2 - .1]) {
      for (let i = 0; i < 6; i++) {   // the gable end, stepped in six courses
        const f = (i + .5) / 6;
        box("stone", 2 * half * (1 - f), rise / 6, .3, loc(0, WALLH + rise * i / 6 + rise / 12, zf));
      }
    }
    box("stone", .16, 1.1, .16, loc(0, WALLH + rise + .5, dep / 2 + .1));
    box("stone", .7, .14, .14, loc(0, WALLH + rise + .7, dep / 2 + .1));
  },
};

/** The raw floats of a list of non-indexed geometries, concatenated into one. */
function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "uv"]) {
    const size = name === "uv" ? 2 : 3, total = list.reduce((n, g) => n + g.getAttribute(name).count * size, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const g of list) { const a = g.getAttribute(name).array as Float32Array; arr.set(a, o); o += a.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  for (const g of list) g.dispose();
  return out;
}

function buildPieces(scene: THREE.Scene, specs: DecorSpec[]): void {
  const parts: Parts = new Map();
  for (const d of specs) {
    if (d.k === "light") {   // a fire's glow with no flame of its own — the burning pit's
      const wx = (d.x + .5) * CELL, wz = (d.z + .5) * CELL;
      const l = track(new THREE.PointLight(0xff5a1e, d.s || 1.5, d.h || 12, 1.4));
      l.name = "decorLight"; l.position.set(wx, floorHeightAt(wx, wz) + .8, wz); scene.add(l);
      continue;
    }
    const piece = PIECES[d.k];
    if (!piece) throw new Error("decor: no piece called " + d.k);
    const wx = (d.x + .5) * CELL, wz = (d.z + .5) * CELL, fy = floorHeightAt(wx, wz);
    const base = new THREE.Matrix4().compose(new THREE.Vector3(wx, fy, wz),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), d.r || 0),
      new THREE.Vector3(1, 1, 1).multiplyScalar(d.k === "roof" || d.k === "chain" ? 1 : d.s || 1));
    const top = ceilHeightAt(wx, wz) - fy;
    piece((mat, w, h, dd, m) => put(parts, mat, new THREE.BoxGeometry(w, h, dd), base.clone().multiply(m)),
      (mat, r0, r1, h, m, seg = 6) => put(parts, mat, new THREE.CylinderGeometry(r0, r1, h, seg), base.clone().multiply(m)), d, top);
  }
  for (const [mat, list] of parts) {
    const mesh = new THREE.Mesh(track(merge(list)), track(makeMat(mat)));
    mesh.name = "decor"; scene.add(mesh);
  }
}

/** A moon and a field of stars over a zone left open to the sky. Drawn past the fog, which would otherwise eat them. */
function buildSky(scene: THREE.Scene): void {
  const zs = world.zones;
  if (!zs || !zs.themes.some((t) => t.sky)) return;
  const moon = new THREE.Mesh(track(new THREE.CircleGeometry(3.4, 24)),
    track(new THREE.MeshBasicMaterial({ color: 0xd9dde6, fog: false })));
  moon.name = "moon"; moon.position.set(56, 40, 74); moon.lookAt(20, 0, 10); scene.add(moon);
  const halo = new THREE.Mesh(track(new THREE.CircleGeometry(7.5, 24)),
    track(new THREE.MeshBasicMaterial({ color: 0x6a7896, fog: false, transparent: true, opacity: .16, depthWrite: false })));
  halo.name = "moon"; halo.position.set(56.3, 40.2, 74.3); halo.lookAt(20, 0, 10); scene.add(halo);
  const pos: number[] = [];
  for (let i = 0; i < 180; i++) {
    const yaw = grain(i, 1, 21) * Math.PI * 2, el = .22 + grain(i, 2, 21) * 1.2, r = 58;
    pos.push(22 + Math.cos(yaw) * Math.cos(el) * r, Math.sin(el) * r, 14 + Math.sin(yaw) * Math.cos(el) * r);
  }
  const g = track(new THREE.BufferGeometry());
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, track(new THREE.PointsMaterial({ color: 0x9ea8c4, size: 1.6, sizeAttenuation: false, fog: false })));
  stars.name = "stars"; scene.add(stars);
}

interface Lifted { x: number; z: number; sp: THREE.Object3D; L?: THREE.Object3D; y?: number; y0?: number }

/** Torches, candles and items onto the raised floor under them — zoned levels only (see the header). */
function liftDressing(scene: THREE.Scene): void {
  if (!world.zones) return;
  for (const tc of world.torches as unknown as Lifted[]) {
    const fy = floorHeightAt(tc.x, tc.z);
    if (fy <= 0) continue;
    tc.sp.position.y += fy; tc.L!.position.y += fy; tc.y = fy;
    for (const c of scene.children)
      if (c.name === "torchPost" && c.position.x === tc.x && c.position.z === tc.z) c.position.y += fy;
  }
  for (const c of world.candles as unknown as Lifted[]) c.sp.position.y += floorHeightAt(c.x, c.z);
  for (const it of world.items as unknown as Lifted[]) {
    it.y0 = .5 + floorHeightAt(it.x, it.z); it.sp.position.y = it.y0;
  }
}

/** Called once by `loadLevel`, after every grid cell has been built. */
export function dressLevel(scene: THREE.Scene, L: BuiltLevel): void {
  if (L.decor && L.decor.length) buildPieces(scene, L.decor);
  buildSky(scene);
  liftDressing(scene);
}

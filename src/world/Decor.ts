import * as THREE from "three";
import { buildFire, type Emitter } from "../fx/HellFire";
import { buildLavafall } from "../fx/Lava";
import { grain } from "../render/BandTextures";
import { track } from "../render/DisposeRegistry";
import { CELL } from "./Grid";
import { world } from "./WorldState";
import { floorHeightAt } from "./Collision";
import type { BuiltLevel, DecorSpec } from "./LevelBuilder";
import { makeMat } from "./decor/kit";
import { addPiece, merge, partClass, partMaterial, type Parts } from "./decor/parts";
import { addLamps } from "./decor/lamps";

/**
 * SET DRESSING — the scene-building half. What a piece looks like is the
 * kit in `src/world/decor/` (`registry.ts` lists every piece and each
 * theme's vocabulary, `place.ts` is how a level's builder places them and
 * what it may not do); this file turns a level's `decor` list into meshes,
 * a moon and stars over an open-sky zone, and the lift of torches, candles
 * and items onto raised ground. Added for the rebuilt prologue (prologue
 * plan, Task 1) after the owner said "the levels feel very empty"; any level
 * may list `BuiltLevel.decor`, and after the levels-feel-full plan's Task 1
 * every theme has a kit to do it with.
 *
 * **Nothing here is gameplay** (this file only draws the list; the solid masses among it —
 * `src/world/decor/masses.ts` — are built into `world.masses` by `loadLevel`, and `solidAt` reads them). Small decor never collides, never takes a shot and
 * is never read back: where a piece should block the player (a headstone,
 * the tree) the level puts a solid cell under it (`I`, which on a raised
 * floor is buried out of sight — see `prologue.ts`). Built from boxes,
 * cylinders and low-poly spheres, merged into **one mesh per material and
 * shadow class** — `decor` (casts the lamp's shadow), `decorClutter` (does
 * not: small things narrower than a shadow texel) and `decorGrass` (25,000
 * triangles of blades; does not) — so a level's whole dressing costs a
 * handful of scene children and draw calls however many pieces it lists.
 * Every "random" angle comes from the spec or from `grain`
 * (`BandTextures.ts`'s integer hash): nothing here calls `Math.random`, so
 * it cannot move the seeded stream the traces record.
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

const MESH_NAME = { decor: "decor", clutter: "decorClutter", grass: "decorGrass" } as const;

function buildPieces(scene: THREE.Scene, specs: DecorSpec[]): void {
  const parts: Parts = new Map();
  const emitters: Emitter[] = [], lights: THREE.PointLight[] = [];
  for (const d of specs) {
    if (d.k === "light") {   // a fire's glow with no flame of its own — the burning pit's
      const wx = (d.x + .5) * CELL, wz = (d.z + .5) * CELL;
      const l = track(new THREE.PointLight(0xff5a1e, d.s || 1.5, d.h || 12, 1.4));
      l.name = "decorLight"; l.position.set(wx, floorHeightAt(wx, wz) + (d.r !== undefined ? d.r : .8), wz); scene.add(l);
      lights.push(l);
      continue;
    }
    if (d.k === "lavafall") { buildLavafall(scene, d); continue; }   // a moving plane of the lake's own lava (src/fx/Lava.ts), not merged geometry
    if (d.k === "ember" || d.k === "bowl" || d.k === "pyre") {   // a burning floor, a brazier or a pyre: where the fire's particles rise from
      const wx = (d.x + .5) * CELL, wz = (d.z + .5) * CELL, fy = floorHeightAt(wx, wz);
      emitters.push(d.k === "ember" ? { x: wx, y: fy, z: wz, spread: CELL * .9, brazier: false }
        : { x: wx, y: fy + (d.k === "pyre" ? .7 : 1.12), z: wz, spread: d.k === "pyre" ? .6 : .45, brazier: true });
    }
    addPiece(parts, d);
  }
  for (const [k, list] of parts) {
    const mesh = new THREE.Mesh(track(merge(list)), track(makeMat(partMaterial(k))));
    // the grass is its own mesh: 25,000 triangles of 2.5 cm blades, which must not be in the lamp's cube shadow (`Shadows.ts`, `decorGrass`)
    mesh.name = MESH_NAME[partClass(k)]; scene.add(mesh);
  }
  addLamps(scene, specs);   // the kit's light-bearing pieces (src/world/decor/lamps.ts): one real point light each, budgeted per level
  buildFire(scene, emitters, lights);   // src/fx/HellFire.ts — nothing on a level with no fire
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
  else buildFire(scene, [], []);   // no fire here: drop the last level's pool
  buildSky(scene);
  liftDressing(scene);
}

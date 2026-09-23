import * as THREE from "three";
import { rnd } from "../utils/math";
import { TEX } from "../render/ProcTextures";
import { renderState } from "../render/Renderer";
import { addBlob } from "../render/RenderCore";
import { track } from "../render/DisposeRegistry";
import { world } from "./WorldState";

/**
 * `spawnProp` — builds one piece of level furniture (a crate, table, chair,
 * pew, or explosive barrel) and adds it to `world.props`. Called only from
 * `loadLevel`'s per-cell dispatch in `src/world/LevelLoader.ts`.
 *
 * Extracted verbatim from `LevelLoader.ts` by Task 1 of the 2026-09-24 plan
 * (`docs/superpowers/plans/2026-09-24-trim-finished.md`), which was at 399
 * of the 400-line gate and needed headroom for that plan's other two tasks
 * (a themed trim band, then pointed arches over doorways). A pure move: no
 * behaviour change, same body, same call site's import instead of a local
 * definition.
 *
 * A new file beside `src/world/Props.ts`, rather than folded into it:
 * `Props.ts` holds `breakProp`/`explodeBarrel`, which run during *play*
 * when a prop takes lethal damage. `spawnProp` runs once, at level *build*,
 * and the two never call each other — this file never calls
 * `breakProp`/`explodeBarrel`, and neither of those calls back here. That
 * build-time/play-time line is the same one `LevelLoader.ts`'s own header
 * already draws between the loader and `Props.ts`; folding `spawnProp` into
 * `Props.ts` would blend it back for no reason — `Props.ts` is nowhere near
 * the line gate, so there is no size pressure pushing the two together.
 * `Ceiling.ts`, `Trim.ts` and `render/Shadows.ts` are the precedent for a
 * module carved out of the loader purely for size, with a single owner and
 * a single call site; this one keeps the same shape.
 *
 * Both files still only share `world.props` as data, never a call, so
 * nothing here changes the import graph's shape versus before the split —
 * `PropSpawn.ts` imports what `spawnProp` always needed (`TEX`, `addBlob`,
 * both newly imported here since `Props.ts` never needed them), and
 * `LevelLoader.ts` imports `spawnProp` from here instead of defining it.
 */
export function spawnProp(ch: string, wx: number, wz: number): void {
  let m: THREE.Object3D,r,hgt,hp,explosive=false,kind=ch;
  const wood=track(new THREE.MeshLambertMaterial({map:TEX.wood}));
  if(ch==="x"){m=new THREE.Mesh(track(new THREE.BoxGeometry(.85,.85,.85)),wood);
    m.position.set(wx,.43,wz);r=.55;hgt=.9;hp=22;}
  else if(ch==="T"){m=new THREE.Group();
    const top=new THREE.Mesh(track(new THREE.BoxGeometry(1.3,.1,.8)),wood);top.position.y=.58;m.add(top);
    for(const[lx,lz]of[[-.5,-.3],[.5,-.3],[-.5,.3],[.5,.3]]){
      const leg=new THREE.Mesh(track(new THREE.BoxGeometry(.1,.58,.1)),wood);
      leg.position.set(lx,.29,lz);m.add(leg);}
    m.position.set(wx,0,wz);r=.62;hgt=.7;hp=26;}
  else if(ch==="C"){m=new THREE.Group();
    const seat=new THREE.Mesh(track(new THREE.BoxGeometry(.5,.08,.5)),wood);seat.position.y=.4;m.add(seat);
    const back=new THREE.Mesh(track(new THREE.BoxGeometry(.5,.55,.07)),wood);back.position.set(0,.68,-.22);m.add(back);
    for(const[lx,lz]of[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]){
      const leg=new THREE.Mesh(track(new THREE.BoxGeometry(.07,.4,.07)),wood);
      leg.position.set(lx,.2,lz);m.add(leg);}
    m.position.set(wx,0,wz);m.rotation.y=rnd(0,6);r=.4;hgt=.9;hp=10;}
  else if(ch==="F"){m=new THREE.Mesh(track(new THREE.BoxGeometry(1.1,1.7,.4)),wood);
    m.position.set(wx,.85,wz);r=.6;hgt=1.7;hp=28;}
  // `V` and `v` build the same pew. `V` is also THE FACTORY FOREMAN in
  // `ENEMY_DEFS`, and `loadLevel` checks the enemy table first, so a `V` in a
  // grid never reaches this branch — that is KNOWN-4, and the mechanism is
  // deliberately left alone here (see the dispatch in `LevelLoader.ts`). `v`
  // is the unambiguous spelling: it is in no other table, so a level that
  // wants furniture can ask for furniture. `V` is kept because deleting it
  // would change what `spawnProp("V",…)` does for any future caller that
  // reaches it directly, which is not this task's decision to make.
  else if(ch==="V"||ch==="v"){m=new THREE.Group();
    const seat=new THREE.Mesh(track(new THREE.BoxGeometry(1.6,.09,.45)),wood);seat.position.y=.42;m.add(seat);
    const back=new THREE.Mesh(track(new THREE.BoxGeometry(1.6,.5,.08)),wood);back.position.set(0,.7,-.2);m.add(back);
    const l1=new THREE.Mesh(track(new THREE.BoxGeometry(.1,.42,.42)),wood);l1.position.set(-.7,.21,0);m.add(l1);
    const l2=new THREE.Mesh(track(new THREE.BoxGeometry(.1,.42,.42)),wood);l2.position.set(.7,.21,0);m.add(l2);
    m.position.set(wx,0,wz);r=.75;hgt=.95;hp=18;}
  else{m=new THREE.Mesh(track(new THREE.CylinderGeometry(.42,.42,1.05,8)),
    track(new THREE.MeshLambertMaterial({map:TEX.barrel})));
    m.position.set(wx,.525,wz);r=.48;hgt=1.1;hp=24;explosive=true;addBlob(wx,wz,1.1);}
  // `applyShadowFlags` (src/render/Shadows.ts) dispatches on this name and
  // walks the subtree — a flag on the `Group` branches above reaches nothing.
  m.name="prop";
  (renderState.scene as THREE.Scene).add(m);
  (world.props as Record<string, unknown>[]).push({m,x:wx,z:wz,r,hgt,hp,dead:false,explosive,kind,fuse:-1});}

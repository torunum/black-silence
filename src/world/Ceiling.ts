import * as THREE from "three";
import { CELL, WALLH } from "./Grid";
import { world } from "./WorldState";
import { ceilHeightAtCell } from "./Collision";
import { track } from "../render/DisposeRegistry";

/**
 * The level's ceiling geometry — one function, two shapes.
 *
 * Extracted from `src/world/LevelLoader.ts`, which was 352 lines against the
 * 400-line gate before this task and could not absorb the varying-height
 * branch. The extraction is along a real seam rather than a convenient one:
 * everything here reads `world.GW`/`world.GH`/`world.ceilMap` and writes
 * nothing but scene children, and nothing in `LevelLoader.ts` looks at the
 * ceiling again afterwards.
 *
 * ## The two shapes
 *
 * **No `world.ceilMap`** — the level never opted in, and it gets back
 * *exactly* the single `PlaneGeometry` at `y=WALLH` it has always had: same
 * one child, same geometry type, same texture clone with `repeat(GW,GH)`,
 * added at the same point in `loadLevel`'s sequence. Every level except 3
 * is in this branch today, which is what keeps the three committed trace
 * fixtures byte-identical.
 *
 * **With a `ceilMap`** — the plane is replaced by two `InstancedMesh`es, not
 * by a `Mesh` per cell. Phase 2 Part A collapsed 202 per-cell wall/pillar/
 * platform objects into three `InstancedMesh`es (prologue 237 -> 33 scene
 * children, level 1 295 -> 93), and a ceiling quad per cell would have put
 * `GW*GH` of them straight back — 825 on level 3 alone, more than the whole
 * pre-instancing level.
 *
 * - `ceilingCells` — one shared `PlaneGeometry(CELL,CELL)`, baked
 *   `rotateX(PI/2)` so it faces down exactly as the single plane does, with
 *   one translation-only instance per cell. The texture is cloned with
 *   `repeat(1,1)` instead of `repeat(GW,GH)`: the big plane tiles the
 *   texture once per cell across its whole span, and a per-cell quad with
 *   the default repeat shows that same one tile, so the two branches look
 *   identical where the heights are.
 * - `ceilingRisers` — the part that makes it read as a room. Where two
 *   adjacent cells differ, the vertical gap between them is a **hole in the
 *   roof** with the scene background showing through, and a green suite
 *   cannot tell you that. One shared unit `PlaneGeometry(1,1)` instanced per
 *   transition, scaled to (CELL, the height difference, 1) and yawed to face
 *   along the edge normal. Each edge is emitted once, by the higher of the
 *   two cells, so a shared edge never gets two coincident strips z-fighting.
 *   `DoubleSide`, because the strip is looked at from the low side (as the
 *   wall above an arcade) and from the high side (as the drop at the vault's
 *   rim) in the same room.
 *
 * ## Why solid cells keep the default height, and why that is the author's job
 *
 * A wall, pillar or door is `WALLH` tall — this task does not change that
 * (see `ceilHeightAtCell`'s comment for why `WALLH` must stay a wall
 * height). So a level that raised the ceiling *over* a wall cell would open
 * a gap between the top of that wall and its own ceiling. Authors therefore
 * leave solid cells at the default, and the riser between such a cell and
 * its raised neighbour becomes the clerestory wall above the arcade —
 * exactly the Doom "upper texture" arrangement, which is why the risers are
 * drawn with the level's own wall texture rather than the ceiling's.
 *
 * This is left to the author rather than enforced here on purpose: Step 5's
 * geometry test asserts the built geometry matches the map *cell for cell*,
 * and a builder that quietly overrode cells would make that assertion a
 * statement about the override instead of about the map.
 */
export function buildCeiling(scene: THREE.Scene, baseTex: THREE.Texture, wallTex: THREE.Texture): void {
  const GW=world.GW,GH=world.GH;
  if(!world.ceilMap){
    const ceilTex=track(baseTex.clone());ceilTex.needsUpdate=true;ceilTex.repeat.set(GW,GH);
    ceilTex.wrapS=ceilTex.wrapT=THREE.RepeatWrapping;
    ceilTex.magFilter=THREE.NearestFilter;ceilTex.minFilter=THREE.NearestFilter;
    const cm=new THREE.Mesh(track(new THREE.PlaneGeometry(GW*CELL,GH*CELL)),
      track(new THREE.MeshLambertMaterial({map:ceilTex})));
    cm.rotation.x=Math.PI/2;cm.position.set(GW*CELL/2,WALLH,GH*CELL/2);
    cm.name="ceiling";scene.add(cm);
    return;}
  const ceilTex=track(baseTex.clone());ceilTex.needsUpdate=true;
  ceilTex.wrapS=ceilTex.wrapT=THREE.RepeatWrapping;
  ceilTex.magFilter=THREE.NearestFilter;ceilTex.minFilter=THREE.NearestFilter;
  const cellMats:THREE.Matrix4[]=[],riserMats:THREE.Matrix4[]=[];
  for(let z=0;z<GH;z++)for(let x=0;x<GW;x++){
    const h=ceilHeightAtCell(x,z),wx=(x+.5)*CELL,wz=(z+.5)*CELL;
    cellMats.push(new THREE.Matrix4().setPosition(wx,h,wz));
    for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nh=ceilHeightAtCell(x+dx,z+dz);
      if(nh>=h)continue;   // the lower cell of the pair emits nothing — one strip per edge
      riserMats.push(new THREE.Matrix4().compose(
        new THREE.Vector3(wx+dx*CELL/2,(nh+h)/2,wz+dz*CELL/2),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0,Math.atan2(dx,dz),0)),
        new THREE.Vector3(CELL,h-nh,1)));}}
  const cellGeo=track(new THREE.PlaneGeometry(CELL,CELL));cellGeo.rotateX(Math.PI/2);
  const cellMesh=new THREE.InstancedMesh(cellGeo,
    track(new THREE.MeshLambertMaterial({map:ceilTex})),cellMats.length);
  cellMats.forEach((mtx,i)=>cellMesh.setMatrixAt(i,mtx));
  cellMesh.instanceMatrix.needsUpdate=true;cellMesh.name="ceilingCells";scene.add(cellMesh);
  if(riserMats.length){
    const riserMesh=new THREE.InstancedMesh(track(new THREE.PlaneGeometry(1,1)),
      track(new THREE.MeshLambertMaterial({map:wallTex,side:THREE.DoubleSide})),riserMats.length);
    riserMats.forEach((mtx,i)=>riserMesh.setMatrixAt(i,mtx));
    riserMesh.instanceMatrix.needsUpdate=true;riserMesh.name="ceilingRisers";scene.add(riserMesh);}}

import * as THREE from "three";
import { rnd, pick } from "../utils/math";
import { at } from "../audio/AudioEngine";
import { bang, boom } from "../audio/Sfx";
import { woodP, fireP, smoke3d, sparks } from "../fx/Particles";
import { spawnGibs } from "../fx/Gibs";
import { scorchMat } from "../fx/Decals";
import { track } from "../render/DisposeRegistry";
import { shake, screenShake } from "../fx/ShakeState";
import { addSprite } from "../render/RenderCore";
import { renderState } from "../render/Renderer";
import { ITEMTEX } from "../render/ItemTextures";
import { ACHIEVEMENTS } from "../content/achievements";
import { ach } from "../ui/Toasts";
import { player } from "../player/PlayerState";
import { S } from "../core/State";
import { alertSound } from "../enemies/ai/Perception";
import { damageEnemy } from "../enemies/Damage";
import { damagePlayer } from "../player/Player";
import { world } from "./WorldState";

/**
 * Prop destruction — breaking furniture and exploding barrels, run during
 * play whenever a prop takes lethal damage. Moved verbatim from
 * `src/legacy.js`'s "WORLD STATE + LEVEL LOADER" section (formerly lines
 * 367-393; `reference/sonsurum.html` lines 2823-2848).
 *
 * Split from `src/world/LevelLoader.ts` (which builds `world.props` in the
 * first place) because the two only share the `props` list as data, never
 * a call: `loadLevel`/`spawnProp` never call `breakProp`/`explodeBarrel`,
 * and neither of these two calls back into the loader. Two files matches
 * how they run (build-time vs. play-time) and keeps both well under the
 * 400-line gate.
 *
 * `explodeBarrel` calls `damagePlayer` (`src/player/Player.ts`, Task 7) and
 * `damageEnemy` (`src/enemies/Damage.ts`, Task 9) directly. Both used to go
 * through `ctx` (`src/core/Context.ts`); Task 10's Step 6 retired both
 * entries once `madge --circular src/` confirmed a direct import from this
 * file closes no cycle. `breakProp` calls nothing outside this file and
 * modules that have already moved.
 */

/**
 * Exported so Task 6's `WeaponState.ts` (`doKick`) and `Hitscan.ts`
 * (`hitscan`, `crossExplode`) can cast `world.props` to a shape that
 * satisfies `breakProp`/`explodeBarrel`'s parameter, instead of each
 * defining its own ad hoc prop shape — the same "import it, don't
 * redefine it" call `src/world/Collision.ts`'s `Seg`/`CollProp` made.
 */
export interface Prop {
  m: THREE.Object3D;
  x: number;
  z: number;
  r: number;
  hgt: number;
  hp: number;
  dead: boolean;
  explosive: boolean;
  kind: string;
  fuse?: number;
}

interface DamageableEnemy {
  x: number;
  z: number;
  dead?: boolean;
  kx: number;
  kz: number;
}

export function breakProp(p: Prop): void {
  if(p.dead)return;p.dead=true;renderState.scene.remove(p.m);S.propsBroken++;
  woodP(p.x,.5,p.z,12);spawnGibs(p.x,.55,p.z,6,3.4,true);
  at(p.x,.5,p.z,()=>{bang(.12,.32,1200);bang(.08,.2,500);});
  if(Math.random()<.2){
    const k=pick(["health","bullets","shells"]);
    world.items.push({kind:k,x:p.x,z:p.z,sp:addSprite(ITEMTEX[k] as THREE.CanvasTexture,p.x,p.z,.55,.55,.5),bob:0});}
  if(S.propsBroken===15)ach(ACHIEVEMENTS.redec,S.ach);}

export function explodeBarrel(b: Prop): void {
  if(b.dead)return;b.dead=true;renderState.scene.remove(b.m);S.propsBroken++;
  shake(.7);screenShake.hitStop=Math.max(screenShake.hitStop,.05);
  renderState.boomLight.position.set(b.x,1.2,b.z);renderState.boomLight.intensity=4;renderState.boomLight.color.setHex(0xff7830);
  fireP(b.x,.8,b.z,40);smoke3d(b.x,1,b.z,22);sparks(b.x,.8,b.z,18);
  spawnGibs(b.x,.8,b.z,6,5,true);
  const sc=new THREE.Mesh(track(new THREE.CircleGeometry(1.5,10)),scorchMat);
  sc.rotation.x=-Math.PI/2;sc.position.set(b.x,.015,b.z);renderState.scene.add(sc);
  at(b.x,1.2,b.z,()=>boom(1.1));
  const pd=Math.hypot(player.px-b.x,player.pz-b.z);
  if(pd<5)damagePlayer(60*(1-pd/5));
  for(const e of world.enemies as unknown as DamageableEnemy[]){if(e.dead)continue;
    const dd=Math.hypot(e.x-b.x,e.z-b.z);
    if(dd<5){const f=Math.max(dd,.2);
      e.kx+=(e.x-b.x)/f*9;e.kz+=(e.z-b.z)/f*9;
      damageEnemy(e,70*(1-dd/5),{explosive:true,dir:{x:(e.x-b.x)/f,z:(e.z-b.z)/f}});}}
  for(const o of world.props as unknown as Prop[]){if(!o.dead&&o!==b&&Math.hypot(o.x-b.x,o.z-b.z)<4){
    if(o.explosive&&o.fuse!<0)o.fuse=rnd(.15,.4);else breakProp(o);}}
  alertSound(b.x,b.z,22);}

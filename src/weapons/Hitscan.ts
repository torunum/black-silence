import type * as THREE from "three";
import { renderState } from "../render/Renderer";
import { world } from "../world/WorldState";
import { clamp, rnd } from "../utils/math";
import { solidAt, segBlocked, wallNormal } from "../world/Collision";
import { WALLH } from "../world/Grid";
import { WEAPON_STATS } from "./definitions";
import { weaponRuntime } from "./WeaponRuntime";
import { PX } from "../enemies/SpriteBaker";
import { input } from "../player/Input";
import { sparks, blood, holyP, smoke3d } from "../fx/Particles";
import { spawnGibs } from "../fx/Gibs";
import { splatMat, holeMat, addWallDecal } from "../fx/Decals";
import { at } from "../audio/AudioEngine";
import { bang, boom } from "../audio/Sfx";
import { flashHoly } from "../ui/HudMessages";
import { screenShake, shake } from "../fx/ShakeState";
import { breakProp, explodeBarrel, type Prop } from "../world/Props";
import { alertSound } from "../enemies/ai/Perception";
import { damageEnemy } from "../enemies/Damage";
import type { Enemy } from "../enemies/Enemy";

/**
 * Hitscan resolution and the holy-cross explosion — the two queries that
 * used to share legacy.js's "HITSCAN" section with `solidAt`/`distToSeg`/
 * etc. (`src/world/Collision.ts`, Task 3). They stayed behind then because
 * both call `WEAPONS`-section functions (`explodeBarrel`, `breakProp`,
 * `WEAPONS[...]`); moving them out now, into their own module that imports
 * `Collision.ts` instead of sharing a file with it, is what breaks the
 * `WEAPONS <-> COLLISION` cycle.
 *
 * Moved verbatim from `src/legacy.js` (formerly lines 221-284 for
 * `hitscan`, 285-298 for `crossExplode`; `reference/sonsurum.html` lines
 * 2119-2196). `orbGeo`, declared just above `hitscan` in the old section,
 * does NOT move here — it is `fireOrb`'s (ENEMY AI, Task 10), not
 * hitscan's; hitscan never reads it.
 *
 * `damageEnemy` (three sites: `hitscan` x1, `crossExplode` x1 — plus the
 * one in `WeaponState.ts`'s `doKick`) used to go through `src/core/
 * Context.ts`'s `ctx.damageEnemy` entry; Task 10's Step 6 retired that entry
 * once `madge --circular src/` confirmed a direct import from all three
 * call sites closes no cycle, so this file now imports `damageEnemy` from
 * `src/enemies/Damage.ts` directly, the same way `alertSound` (one site, in
 * `crossExplode`) always has been — Task 5 already turned it into a
 * standalone leaf module, so it never needed the locator.
 *
 * `hitscan` reads `WEAPONS[wIdx].pierce` in the original, but this module
 * imports `WEAPON_STATS` (`src/weapons/definitions.ts`) and reads
 * `WEAPON_STATS[wIdx].pierce` instead — a deliberate substitution, not a
 * drift risk: `WeaponState.ts`'s `WEAPONS` is exactly `{...WEAPON_STATS[i],
 * snd: WEAPON_SOUNDS[i]}`, so `.pierce` is untouched by that merge and the
 * two arrays agree on it, always, for every slot. The substitution exists
 * because the real `WEAPONS` cannot come from here: `fire` (in
 * `WeaponState.ts`) already calls `hitscan` (here), so `WeaponState.ts`
 * importing `WEAPONS` back from this file would be a two-file cycle. See
 * `WeaponState.ts`'s own header for the full reasoning.
 *
 * No local `Seg` shape: `hitscan` only reads `world.wallSegs.length` (a
 * plain array property, needs no cast) and delegates the real segment math
 * to `segBlocked`, which already owns `Collision.ts`'s `Seg`. `Prop` is
 * imported from `src/world/Props.ts` rather than redefined here, for the
 * same reason `Collision.ts`'s `Seg`/`CollProp` are meant to be reused, not
 * duplicated — both `hitscan` and `crossExplode` call `breakProp`/
 * `explodeBarrel` with the exact object they cast out of `world.props`, so
 * the cast target has to satisfy that function's real parameter type.
 *
 * `cands` (the per-shot candidate list `hitscan` sorts by hit distance) is a
 * discriminated union, `HitCandidate`, rather than two parallel arrays —
 * `hitscan` already sorts enemy and prop hits together by `t`, so one typed
 * array mirrors that.
 */

/** What hitscan's candidate pass and crossExplode's blast loop read off a `world.enemies` element. */
type HitscanEnemy = Pick<
  Enemy,
  "dead" | "dormant" | "x" | "z" | "h" | "w" | "fly" | "flyH" | "fy" | "kx" | "kz" | "key" | "plate"
>;

/** hitscan's per-shot candidate list, sorted by hit distance before resolution. */
type HitCandidate =
  | { kind: "e"; t: number; e: HitscanEnemy; cy: number }
  | { kind: "p"; t: number; p: Prop };

export function hitscan(dir: THREE.Vector3,dmg: number,wIdx: number){
  const o=renderState.camera.position;
  const cands: HitCandidate[]=[];
  const enemies: readonly HitscanEnemy[] = world.enemies;   // checked widening, not a cast
  enemies.forEach(e=>{if(e.dead||e.dormant)return;
    const ecy=e.fly?(e.flyH||1.5):e.h*.5+(e.fy||0);   // sprite center height
    const ex=e.x-o.x,ez=e.z-o.z,ey=ecy-o.y;
    const t=ex*dir.x+ez*dir.z+ey*dir.y;if(t<0)return;
    const cx=o.x+dir.x*t,cz=o.z+dir.z*t,cy=o.y+dir.y*t;
    const dd=Math.hypot(cx-e.x,cz-e.z);
    if(dd<e.w*.45+.1&&cy>ecy-e.h*.55&&cy<ecy+e.h*.55)cands.push({kind:"e",t,e,cy});});
  (world.props as unknown as Prop[]).forEach(p=>{if(p.dead)return;
    const ex=p.x-o.x,ez=p.z-o.z;
    const t=ex*dir.x+ez*dir.z;if(t<0)return;
    const cx=o.x+dir.x*t,cz=o.z+dir.z*t,cy=o.y+dir.y*t;
    if(Math.hypot(cx-p.x,cz-p.z)<p.r+.08&&cy>0&&cy<p.hgt)cands.push({kind:"p",t,p});});
  let wallT=1e9,wx=0,wz=0,wy=0;
  for(let t=0;t<46;t+=.1){
    const sx=o.x+dir.x*t,sz=o.z+dir.z*t;
    if(solidAt(sx,sz)||(world.wallSegs.length&&segBlocked(sx,sz,.12))){wallT=t;wx=sx;wz=sz;wy=o.y+dir.y*t;break;}}
  cands.sort((a,b)=>a.t-b.t);
  const pierce=WEAPON_STATS[wIdx]&&WEAPON_STATS[wIdx].pierce||1;
  let used=0;
  for(const c of cands){
    if(c.t>wallT)break;
    if(c.kind==="p"){
      weaponRuntime.volleyHit=true;
      if(c.p.explosive){c.p.hp-=dmg;
        sparks(o.x+dir.x*c.t,o.y+dir.y*c.t,o.z+dir.z*c.t,5);
        if(c.p.hp<=0)explodeBarrel(c.p);}
      else{c.p.hp-=dmg;
        spawnGibs(o.x+dir.x*c.t,o.y+dir.y*c.t,o.z+dir.z*c.t,1,2,true);
        at(o.x+dir.x*c.t,o.y+dir.y*c.t,o.z+dir.z*c.t,()=>bang(.04,.12,1500,300));
        if(c.p.hp<=0)breakProp(c.p);}
      used++;if(used>=pierce)return;continue;}
    const e=c.e;
    weaponRuntime.volleyHit=true;
    const reg=PX[e.key].regions||{H:e.h,head:0};
    // vertical fraction up the sprite (0 feet .. 1 head)
    const ecy0=e.fly?(e.flyH||1.5):e.h*.5;
    const frac=clamp((c.cy-(ecy0-e.h*.5))/e.h,0,1);
    // horizontal: project hit point onto camera-right axis, normalized to half-width
    const rightX=Math.cos(input.yaw),rightZ=-Math.sin(input.yaw);
    const hxp=o.x+dir.x*c.t,hzp=o.z+dir.z*c.t;
    const lateral=((hxp-e.x)*rightX+(hzp-e.z)*rightZ)/(e.w*.5); // -1..1
    const head=frac>0.74&&PX[e.key].head>0;
    const leg=frac<0.26;
    const arm=!head&&!leg&&Math.abs(lateral)>0.45;
    const armSide=lateral<0?"L":"R"; // screen-space side
    const hx=hxp,hy=o.y+dir.y*c.t,hz=hzp;
    if(e.plate>0){sparks(hx,hy,hz,6);}
    else blood(hx,hy,hz,head?10:5,head?2.6:1.8);
    for(let t2=c.t;t2<c.t+6;t2+=.2){
      const sx=o.x+dir.x*t2,sz=o.z+dir.z*t2;
      if(solidAt(sx,sz)){const n=wallNormal(sx,sz,dir);
        if(Math.random()<.5&&e.plate<=0)
          addWallDecal(sx-dir.x*.06,clamp(hy+rnd(-.3,.3),.2,WALLH-.2),sz-dir.z*.06,n.x,n.z,rnd(.2,.45),splatMat);
        break;}}
    damageEnemy(e,dmg*(head?2:1),{head,leg,arm,armSide,lateral,wIdx,dir:{x:dir.x,z:dir.z},dist:c.t,hx,hy,hz});
    used++;if(used>=pierce)return;}
  if(wallT<45){
    const n=wallNormal(wx,wz,dir);
    sparks(wx-dir.x*.05,clamp(wy,.1,WALLH-.1),wz-dir.z*.05,4);
    addWallDecal(wx,clamp(wy,.15,WALLH-.15),wz,n.x,n.z,.08,holeMat);
    if(Math.random()<.3)at(wx,clamp(wy,.1,WALLH-.1),wz,()=>bang(.03,.08,4000,800));}}
export function crossExplode(x: number,y: number,z: number){
  flashHoly(.35);shake(.35);screenShake.hitStop=Math.max(screenShake.hitStop,.04);
  renderState.boomLight.position.set(x,y,z);renderState.boomLight.intensity=4;renderState.boomLight.color.setHex(0xfff0b0);
  holyP(x,y,z,40);smoke3d(x,y,z,10);
  at(x,y,z,()=>boom(.7));
  const blastTargets: readonly HitscanEnemy[] = world.enemies;   // checked widening, not a cast
  for(const e of blastTargets){if(e.dead)continue;
    const d=Math.hypot(e.x-x,e.z-z);
    if(d<3.4){
      const dd=60*(1-d/3.4)+20;
      e.kx+=(e.x-x)/Math.max(.2,d)*6;e.kz+=(e.z-z)/Math.max(.2,d)*6;
      damageEnemy(e,dd,{explosive:true,dir:{x:(e.x-x)/Math.max(.2,d),z:(e.z-z)/Math.max(.2,d)}});}}
  for(const p of world.props as unknown as Prop[]){if(p.dead)continue;
    if(Math.hypot(p.x-x,p.z-z)<3){p.explosive?explodeBarrel(p):breakProp(p);}}
  alertSound(x,z,20);}

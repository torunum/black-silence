import * as THREE from "three";
import { clamp, rnd } from "../../utils/math";
import { player } from "../../player/PlayerState";
import { damagePlayer } from "../../player/Player";
import { PX } from "../SpriteBaker";
import { at } from "../../audio/AudioEngine";
import { blip, bang } from "../../audio/Sfx";
import { growl, snarl } from "../../audio/Voice";
import { say } from "../../ui/Subtitles";
import { ach } from "../../ui/Toasts";
import { showMsg } from "../../ui/HudMessages";
import { ACHIEVEMENTS } from "../../content/achievements";
import { S } from "../../core/State";
import { shake } from "../../fx/ShakeState";
import { blood, smoke3d } from "../../fx/Particles";
import { addWallDecal, splatMat } from "../../fx/Decals";
import { solidAt, wallNormal, floorHeightAt } from "../../world/Collision";
import { EYE } from "../../world/Grid";
import { world } from "../../world/WorldState";
import { los } from "./Perception";
import { moveEnemy } from "./Locomotion";
import { fireOrb, throwFlesh } from "./Attacks";
import { wakeBoss, roarFor, priestThink } from "../Boss";
import { damageEnemy } from "../Damage";
import { dropAmmo } from "../Death";
import { schedule } from "../../core/Time";

/**
 * Behaviors — the per-frame enemy brain: state-machine housekeeping (dead/
 * dormant/hurt/flung/stunned), line-of-sight acquisition, the per-archetype
 * attack menu (ranged orbs, screamer wake-call, lost-soul charge, flesh
 * fling, brute slam, dog lunge, dodge-strafe), movement toward the player or
 * the last known alert position, and the walk/attack sprite animation and
 * lunge pose. Moved verbatim from `src/legacy.js` (formerly lines 121-300,
 * Task 10's second commit; `reference/sonsurum.html`'s equivalent section).
 * The "ENEMY AI" banner immediately above it (formerly lines 118-120) had
 * nothing else under it once `enemyTick` moved, so it is deleted with this
 * change, consistent with Tasks 6-9.
 *
 * `enemyTick` is the top of the AI DAG (`docs/superpowers/plans/
 * 2026-08-15-phase0e-systems.md`'s Task 10 section, and this task's own
 * brief, Step 1): it is the only function in the section that calls into
 * every other AI module — `los` (`ai/Perception.ts`), `moveEnemy`
 * (`ai/Locomotion.ts`), `fireOrb`/`throwFlesh` (`ai/Attacks.ts`), and
 * `wakeBoss`/`roarFor`/`priestThink` (`enemies/Boss.ts`) — plus
 * `damageEnemy` (`enemies/Damage.ts`), `damagePlayer` (`player/Player.ts`)
 * and `dropAmmo` (`enemies/Death.ts`). None of those six modules call back
 * into this one (confirmed with `madge --circular src/`), so every edge
 * here is a direct import; this task's brief was explicit that it adds
 * zero new `src/core/Context.ts` entries, and it doesn't — `wakeBoss` and
 * `damageEnemy` were reached directly here from the start, while
 * `enemies/Damage.ts` and `world/Props.ts` still called them through
 * `ctx.wakeBoss?.()`/`ctx.damageEnemy?.()` from the other side of those same
 * functions. Step 6 of the brief later tested and retired both `Context`
 * entries once this file's split made the direction one-way — see
 * `Context.ts`'s own doc comment for the result.
 *
 * `world.enemies` is loosely typed (`Array<Record<string, unknown>>`, see
 * `src/world/WorldState.ts`'s own doc comment), so both the outer tick loop
 * and the inner alert-radius loop (the screamer's wake-the-dead branch) cast
 * through the same local `Enemy` interface below, the same convention
 * `src/enemies/Death.ts`/`src/weapons/Hitscan.ts`/`src/world/Props.ts`
 * established for this exact array — just with more fields than those
 * files needed, because this is the function that reads and writes nearly
 * all of them. `sp`/`blob` reuse `src/render/RenderCore.ts`'s own return
 * types (`THREE.Sprite`, `THREE.Mesh<THREE.BufferGeometry,
 * THREE.MeshBasicMaterial>`), the same pairing `src/enemies/Death.ts`'s
 * `Head` interface and `src/enemies/ai/Attacks.ts`'s `Ring`/`Strike`
 * interfaces use for the same two constructors (`addSprite`/`addBlob`).
 * Every function this file calls with an `Enemy`-typed argument
 * (`moveEnemy`, `fireOrb`, `throwFlesh`, `damageEnemy`, `wakeBoss`,
 * `priestThink`) takes an `unknown` enemy parameter itself and casts at the
 * point of use, the same convention `src/enemies/Damage.ts`/`Death.ts`/
 * `Boss.ts` established for that dynamic, not-yet-settled object — `Enemy`
 * is assignable to `unknown` with no cast needed at any of these call sites.
 */

interface Enemy {
  gone?: boolean;
  dead?: boolean;
  deathT: number;
  deathKind?: number;
  deathDir: number;
  severKey?: boolean;
  sp: THREE.Sprite;
  blob: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  x: number;
  z: number;
  h: number;
  w: number;
  key: string;
  kx: number;
  kz: number;
  dropped?: boolean;
  boss?: boolean;
  dormant?: boolean;
  priest?: boolean;
  fy?: number;
  hurt: number;
  elite?: boolean;
  flung: number;
  flungT: number;
  stun: number;
  hp: number;
  maxhp: number;
  speed: number;
  slow: number;
  cool: number;
  dodgeT: number;
  lungeT: number;
  slamT: number;
  screamT: number;
  flingCD: number;
  aware?: boolean;
  alertX: number;
  alertZ: number;
  charge?: boolean;
  charging: number;
  cdx: number;
  cdz: number;
  chT: number;
  mel: number;
  scream?: boolean;
  range?: number;
  stone?: boolean;
  twin?: boolean;
  orb?: string;
  burst?: boolean;
  toxic?: boolean;
  charger?: boolean;
  fling?: boolean;
  slam?: boolean;
  lunge?: boolean;
  dodge?: boolean;
  strafe: number;
  strafeDir: number;
  flank: number;
  frenzy: number;
  atkAnim: number;
  animT: number;
  frame: number;
  wasAtk?: boolean;
  fly?: boolean;
  flyH?: number;
}

export function enemyTick(dt: number){
  let anyAware=false;
  for(const e of world.enemies as unknown as Enemy[]){
    if(e.gone)continue;
    /* during a boss cinematic, nothing moves or attacks — just hold position */
    if(world.cine&&!e.dead){
      const cy=e.fly?(e.flyH||1.5):e.h/2;
      e.sp.position.set(e.x,cy,e.z);e.blob.position.set(e.x,.012,e.z);
      e.cool=Math.max(e.cool||0,.4);
      continue;}
    if(e.dead){
      e.deathT+=dt;
      const t=clamp(e.deathT/.45,0,1);
      /* two-stage collapse frames (redesigned enemies) */
      const P=PX[e.key];
      if(P.die1&&e.deathKind!==2&&!e.severKey){
        const want=e.deathT<.22?P.die1:P.die2;
        if(want&&e.sp.material.map!==want){e.sp.material.map=want;e.sp.material.needsUpdate=true;}
        e.sp.material.rotation=e.deathDir*t*Math.PI/6;   // gentler tilt, frames do the work
      }else{
        e.sp.material.rotation=e.deathDir*t*Math.PI/2;}
      e.sp.position.y=e.h/2*(1-t)+e.h*.18*t;
      e.kx*=Math.exp(-4*dt);e.kz*=Math.exp(-4*dt);
      const nx=e.x+e.kx*dt,nz=e.z+e.kz*dt;
      if(!solidAt(nx,e.z))e.x=nx;if(!solidAt(e.x,nz))e.z=nz;
      e.sp.position.x=e.x;e.sp.position.z=e.z;
      e.blob.position.set(e.x,.012,e.z);
      if(e.deathKind===2&&e.deathT<.4&&Math.random()<.5)
        blood(e.x,e.h*.8*(1-t)+.3,e.z,2,2);
      if(!e.dropped&&e.deathT>.5){e.dropped=true;
        if(!e.boss&&Math.random()<.3)dropAmmo(e.x,e.z);}
      continue;}
    if(e.dormant){
      const dx0=player.px-e.x,dz0=player.pz-e.z,d0=Math.hypot(dx0,dz0);
      if(d0<(e.priest?13:9)&&los(e.x,e.z,player.px,player.pz))wakeBoss(e);
      e.sp.position.set(e.x,e.h/2+(e.fy||0),e.z);e.blob.position.set(e.x,(e.fy||0)+.012,e.z);
      continue;}
    if(e.hurt>0){e.hurt-=dt;
      if(e.hurt<=0)e.sp.material.color.setHex(e.elite?0xd8c878:0xffffff);}
    /* kicked airborne flight */
    if(e.flung>0){
      e.flung-=dt;e.flungT+=dt;
      const nx=e.x+e.kx*dt,nz=e.z+e.kz*dt;
      if(solidAt(nx,nz)){
        e.flung=0;e.stun=1.2;
        damageEnemy(e,40,{wIdx:-2});
        const d=new THREE.Vector3(e.kx,0,e.kz).normalize();
        const n=wallNormal(nx,nz,d);
        addWallDecal(nx-d.x*.2,rnd(.8,1.6),nz-d.z*.2,n.x,n.z,rnd(.5,.8),splatMat);
        blood(e.x,1,e.z,14,2.5);
        at(nx,e.h*.6+(e.fy||0),nz,()=>bang(.18,.5,600));shake(.2);
        say(Math.random()<.5?"kicksplat":"wallkill",true);
        ach(ACHIEVEMENTS.punt,S.ach);
        e.kx=0;e.kz=0;
      }else{e.x=nx;e.z=nz;}
      e.sp.position.set(e.x,e.h/2+(e.fy||0)+Math.sin(Math.min(1,e.flungT/.9)*Math.PI)*1.1,e.z);
      e.blob.position.set(e.x,.012,e.z);
      continue;}
    if(Math.abs(e.kx)+Math.abs(e.kz)>.05){
      const nx=e.x+e.kx*dt,nz=e.z+e.kz*dt;
      if(!solidAt(nx,e.z))e.x=nx;if(!solidAt(e.x,nz))e.z=nz;
      e.kx*=Math.exp(-6*dt);e.kz*=Math.exp(-6*dt);}
    const dx=player.px-e.x,dz=player.pz-e.z,dist=Math.hypot(dx,dz);
    if(dist>30){e.sp.position.set(e.x,e.h/2+(e.fy||0),e.z);e.blob.position.set(e.x,(e.fy||0)+.012,e.z);continue;}
    if(e.stun>0){e.stun-=dt;
      e.sp.position.set(e.x+rnd(-.03,.03),e.h/2,e.z+rnd(-.03,.03));
      e.blob.position.set(e.x,.012,e.z);continue;}
    const seen=los(e.x,e.z,player.px,player.pz)&&dist<22;
    e.cool-=dt;e.dodgeT-=dt;e.lungeT-=dt;e.slamT-=dt;e.screamT-=dt;e.flingCD-=dt;
    const injured=e.hp<e.maxhp*.35;
    let spd=e.speed*e.slow*(injured&&!e.boss?1.45:1);
    let moving=false;
    if(seen){
      anyAware=anyAware||dist<16;
      if(!e.aware){e.aware=true;
        say(e.elite?"see_elite":"see_"+e.key);at(e.x,e.h*.6+(e.fy||0),e.z,()=>snarl(e.key));}
      e.alertX=player.px;e.alertZ=player.pz;
      /* ===== BOSS BRAINS ===== */
      if(e.priest){priestThink(e,dt,dist,dx,dz);continue;}
      if(e.key==="E"&&e.charge){
        if(e.charging>0){
          e.charging-=dt;
          if(!moveEnemy(e,e.cdx,e.cdz,13,dt)){e.charging=0;e.stun=1;at(e.x,e.h*.6+(e.fy||0),e.z,()=>bang(.2,.5,400));shake(.25);}
          if(dist<1.6&&e.cool<=0&&Math.abs((e.fy||0)-(player.pyy-EYE))<1.3){e.cool=1.2;e.atkAnim=.22;damagePlayer(e.mel);}
          e.sp.position.set(e.x,e.h/2+(e.fy||0),e.z);e.blob.position.set(e.x,(e.fy||0)+.012,e.z);
          continue;}
        e.chT-=dt;
        if(e.chT<=0&&dist>4&&dist<14&&e.hp<e.maxhp*.7){
          e.chT=rnd(5,7);e.charging=.9;
          e.cdx=dx/dist;e.cdz=dz/dist;
          roarFor(e);shake(.15);}}
      /* screamer */
      if(e.scream&&e.screamT<=0&&dist<14){
        e.screamT=9;e.stun=1.1;
        at(e.x,e.h*.6+(e.fy||0),e.z,()=>{growl(180,.9,.4,true);blip(500,.7,"sawtooth",.1,180,true);});
        for(const o of world.enemies as unknown as Enemy[]){if(o.dead||o.dormant||o===e)continue;
          if(Math.hypot(o.x-e.x,o.z-e.z)<16){o.alertX=player.px;o.alertZ=player.pz;o.slow=1;
            o.frenzy=5;}}
        showMsg("THE SCREAMER CALLS THE DEAD");
        continue;}
      /* ranged */
      if(e.range&&dist<e.range&&e.cool<=0&&dist>3){
        e.cool=e.stone?2.6:e.orb==="manc"?2.8:e.burst?2.6:2.3;
        if(e.stone){fireOrb(e,-.14);fireOrb(e,0);fireOrb(e,.14);}
        else if(e.twin){fireOrb(e,-.1);schedule(()=>{if(!e.dead)fireOrb(e,.1);},0.220);} // mancubus
        else if(e.orb==="centaur"){ // Slaughtaur: two quick blue bolts
          fireOrb(e,-.05);schedule(()=>{if(!e.dead)fireOrb(e,.05);},0.180);}
        else if(e.burst){ // Afrit: spread of fireballs
          fireOrb(e,-.12);fireOrb(e,0);fireOrb(e,.12);}
        else fireOrb(e,rnd(-.04,.04),e.toxic);}
      /* lost soul charge — telegraph then dash */
      if(e.charger&&dist>2.5&&dist<13&&e.lungeT<=0){
        e.lungeT=2.4;e.kx=dx/dist*16;e.kz=dz/dist*16;e.stun=0;
        at(e.x,e.h*.6+(e.fy||0),e.z,()=>blip(700,.3,"sawtooth",.12,1400));shake(.08);}
      /* flesh fling — tears a chunk from its own body and throws it */
      if(e.fling&&dist>3&&dist<12&&e.flingCD<=0&&Math.random()<.7){
        e.flingCD=rnd(3.5,6);e.stun=.25;
        throwFlesh(e);}
      /* brute slam */
      if(e.slam&&dist<2.9&&e.slamT<=0){
        e.slamT=4;e.stun=.5;
        schedule(()=>{if(e.dead)return;
          shake(.35);at(e.x,e.h*.6+(e.fy||0),e.z,()=>bang(.3,.6,300));smoke3d(e.x,.3,e.z,10);
          if(Math.hypot(player.px-e.x,player.pz-e.z)<3.1){damagePlayer(24);
            player.vx+=(player.px-e.x)*3;player.vz+=(player.pz-e.z)*3;}},0.480);
        at(e.x,e.h*.6+(e.fy||0),e.z,()=>blip(80,.4,"sawtooth",.14,40));}
      /* dog lunge */
      if(e.lunge&&dist>2&&dist<4.5&&e.lungeT<=0){
        e.lungeT=2.6;e.kx=dx/dist*9;e.kz=dz/dist*9;
        at(e.x,e.h*.6+(e.fy||0),e.z,()=>blip(500,.2,"sawtooth",.1,260));}
      /* dodge */
      if(e.dodge&&!injured&&e.dodgeT<=0&&dist<13&&Math.random()<.5){
        e.dodgeT=rnd(1.1,2.4);e.strafe=.32;e.strafeDir=Math.random()<.5?1:-1;}
      let mx,mz;
      if(e.strafe>0){e.strafe-=dt;
        mx=-dz/dist*e.strafeDir;mz=dx/dist*e.strafeDir;}
      else if(e.range&&dist<4&&!e.boss){mx=-dx/dist;mz=-dz/dist;}
      else{
        const fl=dist>8?e.flank:e.flank*.25;
        const a=Math.atan2(dx,dz)+fl;
        mx=Math.sin(a);mz=Math.cos(a);}
      if(e.frenzy>0){e.frenzy-=dt;spd*=1.3;}
      if(dist>1.15){moving=moveEnemy(e,mx,mz,spd,dt);
        if(!moving){moving=moveEnemy(e,dx/dist,dz/dist,spd*.7,dt);
          if(Math.random()<.05)e.flank*=-1;}}
      if(dist<1.55&&e.cool<=0&&Math.abs((e.fy||0)-(player.pyy-EYE))<1.3){e.cool=1.0;e.atkAnim=.22;damagePlayer(e.mel);
        at(e.x,e.h*.6+(e.fy||0),e.z,()=>blip(140,.12,"sawtooth",.1,60));}
    }else if(e.alertX>=0){
      const ax=e.alertX-e.x,az=e.alertZ-e.z,ad=Math.hypot(ax,az);
      if(ad>1){moving=moveEnemy(e,ax/ad,az/ad,spd*.7,dt);}
      else e.alertX=-1;}
    /* walk animation */
    if(moving&&e.atkAnim<=0){e.animT+=dt;
      if(e.animT>.22){e.animT=0;e.frame=1-e.frame;
        const set=e.deathKind===2?[PX[e.key].hl,PX[e.key].hlb]:[PX[e.key].a,PX[e.key].b];
        e.sp.material.map=set[e.frame];e.sp.material.needsUpdate=true;}}
    /* attack pose: swap to the dedicated attack frame while striking */
    if(e.atkAnim>0&&PX[e.key].atk&&!e.severKey&&e.deathKind!==2){
      if(e.sp.material.map!==PX[e.key].atk){
        e.sp.material.map=PX[e.key].atk;e.sp.material.needsUpdate=true;e.wasAtk=true;}
    }else if(e.wasAtk){ // attack finished -> back to normal stance
      e.wasAtk=false;
      const set=e.deathKind===2?[PX[e.key].hl,PX[e.key].hlb]:[PX[e.key].a,PX[e.key].b];
      e.sp.material.map=set[e.frame];e.sp.material.needsUpdate=true;}
    /* attack lunge: brief grow + lean toward player */
    let lunge=0;
    if(e.atkAnim>0){e.atkAnim-=dt;lunge=Math.sin(clamp(e.atkAnim/.22,0,1)*Math.PI);}
    const sScale=1+lunge*0.22;
    e.sp.scale.set(e.w*sScale,e.h*sScale,1);
    const ldx=dist>0.01?(player.px-e.x)/dist:0,ldz=dist>0.01?(player.pz-e.z)/dist:0;
    const lx=e.x+ldx*lunge*0.35, lz=e.z+ldz*lunge*0.35;
    if(e.fly){
      const hov=(e.flyH||1.5)+Math.sin(performance.now()/420+e.x)*.18;
      e.sp.position.set(lx,hov,lz);
      e.blob.position.set(e.x,.012,e.z);e.blob.material.opacity=.3;
    }else{
      e.fy=floorHeightAt(e.x,e.z);
      e.sp.position.set(lx,e.h/2+(e.fy||0)+Math.sin(performance.now()/300+e.x)*.03,lz);
      e.blob.position.set(e.x,(e.fy||0)+.012,e.z);}}
  return anyAware;}

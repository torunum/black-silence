import * as THREE from "three";
import { rnd } from "../../utils/math";
import { player } from "../../player/PlayerState";
import { damagePlayer } from "../../player/Player";
import { projectiles } from "../../fx/Projectiles";
import { renderState } from "../../render/Renderer";
import { blip, bang } from "../../audio/Sfx";
import { gurgle, growl } from "../../audio/Voice";
import { gibGeo, gibMatsFlesh, spawnGibs } from "../../fx/Gibs";
import { blood, smoke3d, sparks, toxicP } from "../../fx/Particles";
import { shake } from "../../fx/ShakeState";
import { solidAt } from "../../world/Collision";
import { EYE, WALLH } from "../../world/Grid";
import { explodeBarrel, breakProp, type Prop } from "../../world/Props";
import { world } from "../../world/WorldState";
import { track } from "../../render/DisposeRegistry";

/**
 * Attacks — every ranged/area attack the AI section throws at the player:
 * orbs, the flesh-fling, the priest's expanding rings and falling debris
 * strikes, and the poison-zone damage-over-time tick. Moved verbatim from
 * `src/legacy.js` (formerly lines 174-217 for `fireOrb`/`throwFlesh`, and
 * 456-507 for `spawnRing` through `poisonTick`, Task 10;
 * `reference/sonsurum.html`'s equivalent sections).
 *
 * `orbGeo` (formerly `legacy.js:96`, under a now-orphaned `HITSCAN` banner
 * left over from Task 6) and `ringMatBase` (formerly `legacy.js:455`) move
 * here unexported: each has exactly one user, `fireOrb`/`spawnRing`
 * respectively, confirmed by grep before this move.
 *
 * A true leaf with respect to the AI DAG: `fireOrb`/`throwFlesh`/`spawnRing`/
 * `spawnStrike` call nothing else in this task, and `ringTick`/`strikeTick`/
 * `poisonTick` call only already-migrated modules — `damagePlayer`
 * (`src/player/Player.ts`, Task 7) and `explodeBarrel`/`breakProp`
 * (`src/world/Props.ts`, Task 5). `Behaviors.ts` and `Boss.ts` both call
 * into this file; nothing here calls back into either.
 *
 * `world.rings`/`world.strikes`/`world.poisonZones` are still untyped
 * (`Array<Record<string, unknown>>`, see `src/world/WorldState.ts`'s own
 * doc comment deferring that work), so `ringTick`/`strikeTick`/`poisonTick`
 * cast their loop elements through minimal local interfaces — the same
 * convention `src/world/Props.ts`/`src/enemies/Death.ts` established.
 * `world.props`'s elements reuse `Props.ts`'s exported `Prop` instead of a
 * third ad hoc prop shape, matching `src/enemies/ai/Locomotion.ts`. The
 * enemy parameter (`e`) `fireOrb`/`throwFlesh` take is typed `unknown` and
 * cast at the point of use to the local `AttackEnemy` shape below, the same
 * convention `src/enemies/Damage.ts`/`Death.ts` established for that dynamic,
 * not-yet-settled object — both functions are called with differently-shaped
 * casts from `Behaviors.ts`'s `Enemy` and `Boss.ts`'s own local interface.
 */

interface Ring { m: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; x: number; z: number; r: number; hitDone: boolean; }
interface Strike { x: number; z: number; t: number; warn: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; }
interface PoisonZone { x: number; z: number; r: number; t: number; }

/** world.enemies elements, cast for fireOrb/throwFlesh's ranged-attack spawns. */
interface AttackEnemy {
  x: number;
  z: number;
  h: number;
  hp: number;
  atkAnim: number;
  orb?: string;
  stone?: boolean;
  fly?: boolean;
  flyH?: number;
  fy?: number;
}

const orbGeo=new THREE.SphereGeometry(.16,6,6);

export function fireOrb(enemy: unknown,spreadA: number,tox?: boolean){
  const e=enemy as AttackEnemy;
  e.atkAnim=.22;
  const dx=player.px-e.x,dz=player.pz-e.z,dist=Math.hypot(dx,dz);
  const a=Math.atan2(dx,dz)+spreadA;
  const ot=e.orb;
  let col=0x9a4ae0,dmg=15,spd=9.5;
  if(tox){col=0x6ad04a;dmg=12;}
  else if(e.stone){col=0x9a9aa2;}
  else if(ot==="caco"){col=0x5a8a3a;dmg=16;spd=10;}      // green plasma
  else if(ot==="manc"){col=0xff8020;dmg=18;spd=8;}       // orange fireball
  else if(ot==="cult"){col=0xc83a20;dmg=11;spd=11;}      // red bolt
  else if(ot==="centaur"){col=0x4a7aff;dmg=14;spd=11;}   // Slaughtaur blue shield-fire
  else if(ot==="afrit"){col=0xff7020;dmg=13;spd=10;}     // Afrit fireball
  else if(ot==="reiver"){col=0x9fd048;dmg=15;spd=12;}    // Reiver green bolt
  else if(ot==="garg"){col=0x5ab0e0;dmg=14;spd=11;}      // Gargoyle blue energy (Cheogh)
  const mat=track(new THREE.MeshBasicMaterial({color:col}));
  const oy=e.fly?(e.flyH||1.5):e.h*.6+(e.fy||0);
  const m=new THREE.Mesh(orbGeo,mat);m.position.set(e.x,oy,e.z);
  if(ot==="manc")m.scale.setScalar(1.6);
  projectiles.orbs.push({m,vx:Math.sin(a)*spd,vz:Math.cos(a)*spd,
    vy:((player.pyy-.2)-oy)/(dist/spd),dmg,life:3.2,tox,col});
  renderState.scene.add(m);
  blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90);}
export function throwFlesh(enemy: unknown){
  const e=enemy as AttackEnemy;
  const dx=player.px-e.x,dz=player.pz-e.z,dist=Math.hypot(dx,dz);
  const a=Math.atan2(dx,dz)+rnd(-.05,.05);
  const oy=e.fly?(e.flyH||1.5):e.h*.55+(e.fy||0);
  const m=new THREE.Mesh(gibGeo,track(gibMatsFlesh[0].clone()));
  m.position.set(e.x,oy,e.z);m.scale.setScalar(1.9);
  const spd=10;
  projectiles.orbs.push({m,vx:Math.sin(a)*spd,vz:Math.cos(a)*spd,
    vy:((player.pyy-.2)-oy)/(dist/spd)+1.0,dmg:14,life:2.4,flesh:true,spin:rnd(6,12),col:0x8c1e10});
  renderState.scene.add(m);
  blood(e.x,oy,e.z,6,1.6);    // it rips the chunk out of its own body
  e.hp-=3;                    // Blood-style self-mutilation
  gurgle(.22,.32);growl(150,.22,.22);}
/* expanding shockwave ring — jump to dodge */
const ringMatBase=new THREE.MeshBasicMaterial({color:0x9a4ae0,transparent:true,opacity:.6,side:THREE.DoubleSide});
export function spawnRing(x: number,z: number){
  const m=new THREE.Mesh(track(new THREE.RingGeometry(.1,.45,28)),track(ringMatBase.clone()));
  m.rotation.x=-Math.PI/2;m.position.set(x,.06,z);renderState.scene.add(m);
  world.rings.push({m,x,z,r:.3,hitDone:false});
  bang(.3,.5,250);blip(60,.5,"sawtooth",.16,30,true);shake(.2);}
export function ringTick(dt: number){
  for(let i=world.rings.length-1;i>=0;i--){const r=world.rings[i] as unknown as Ring;
    r.r+=6.5*dt;
    r.m.scale.set(r.r/.3,r.r/.3,1);
    r.m.material.opacity=Math.max(0,.6-r.r*.055);
    const pd=Math.hypot(player.px-r.x,player.pz-r.z);
    if(!r.hitDone&&Math.abs(pd-r.r)<.5&&player.pyy<EYE+.18){
      r.hitDone=true;damagePlayer(20);player.vx+=(player.px-r.x)/Math.max(pd,.2)*5;player.vz+=(player.pz-r.z)/Math.max(pd,.2)*5;}
    for(const p of world.props as unknown as Prop[]){if(p.dead)continue;
      if(Math.abs(Math.hypot(p.x-r.x,p.z-r.z)-r.r)<.5)
        p.explosive?explodeBarrel(p):breakProp(p);}
    if(r.r>9){renderState.scene.remove(r.m);world.rings.splice(i,1);}}}
/* falling debris strikes (priest P3) */
export function spawnStrike(){
  for(let tries=0;tries<16;tries++){
    const a=rnd(0,6.28),d=rnd(1,5.5);
    const x=player.px+Math.sin(a)*d,z=player.pz+Math.cos(a)*d;
    if(solidAt(x,z))continue;
    const warn=new THREE.Mesh(track(new THREE.CircleGeometry(1,10)),
      track(new THREE.MeshBasicMaterial({color:0x150a1e,transparent:true,opacity:.7})));
    warn.rotation.x=-Math.PI/2;warn.position.set(x,.025,z);renderState.scene.add(warn);
    world.strikes.push({x,z,t:.85,warn});
    blip(1200,.4,"sine",.05,300);
    return;}}
export function strikeTick(dt: number){
  for(let i=world.strikes.length-1;i>=0;i--){const s=world.strikes[i] as unknown as Strike;
    s.t-=dt;
    s.warn.material.opacity=.4+Math.sin(performance.now()*.02)*.3;
    if(s.t<=0){
      renderState.scene.remove(s.warn);
      spawnGibs(s.x,WALLH-.4,s.z,5,3,true);
      smoke3d(s.x,1.4,s.z,10);sparks(s.x,1,s.z,6);
      bang(.25,.5,400);shake(.18);
      if(Math.hypot(player.px-s.x,player.pz-s.z)<1.3)damagePlayer(18);
      for(const p of world.props as unknown as Prop[]){if(!p.dead&&Math.hypot(p.x-s.x,p.z-s.z)<1.3)
        p.explosive?explodeBarrel(p):breakProp(p);}
      world.strikes.splice(i,1);}}}
export function poisonTick(dt: number){
  for(let i=world.poisonZones.length-1;i>=0;i--){const zn=world.poisonZones[i] as unknown as PoisonZone;
    zn.t-=dt;
    if(Math.random()<.5)toxicP(zn.x+rnd(-zn.r,zn.r)*.7,.2,zn.z+rnd(-zn.r,zn.r)*.7,1);
    if(Math.hypot(player.px-zn.x,player.pz-zn.z)<zn.r){damagePlayer(6*dt,true);}
    if(zn.t<=0)world.poisonZones.splice(i,1);}}

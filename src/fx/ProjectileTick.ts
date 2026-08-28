import type * as THREE from "three";
import { rnd } from "../utils/math";
import { gurgle } from "../audio/Voice";
import { spawnP, blood, smoke3d } from "./Particles";
import { addPool } from "./Decals";
import { renderState } from "../render/Renderer";
import { player } from "../player/PlayerState";
import { damagePlayer } from "../player/Player";
import { S } from "../core/State";
import { WALLH } from "../world/Grid";
import { solidAt } from "../world/Collision";
import { crossExplode } from "../weapons/Hitscan";
import { weaponRuntime } from "../weapons/WeaponRuntime";
import { world } from "../world/WorldState";
import { type Prop } from "../world/Props";
import { projectiles } from "./Projectiles";

/**
 * `src/fx/Projectiles.ts` (Plan 0D) is the *state* — the live `nails`/`orbs`
 * arrays. This file is the *logic* that steps them each frame: flight,
 * collision against walls/props/enemies/the player, and the explosion/gib
 * cleanup on impact. The two are deliberately not merged, the same split
 * Task 6 made for `WeaponState.ts`/`WeaponRuntime.ts`.
 *
 * Moved verbatim from `src/legacy.js`'s "PROJECTILES" section (formerly
 * lines 692-734; `reference/sonsurum.html`'s equivalent section).
 *
 * `projTick` calls `damagePlayer` at `legacy.js:726` (now below). Task 7
 * (commit b14892c) already turned `damagePlayer` into a real export of
 * `src/player/Player.ts`, so this file imports it directly instead of
 * going through `src/core/Context.ts`'s locator — nothing imports this
 * module, so the edge is one-way and adds no cycle. Every other call
 * `projTick` makes already resolves to a module (`crossExplode`, `solidAt`,
 * `spawnP`/`smoke3d`/`blood`, `addPool`, `gurgle`, `rnd`) or a state object
 * (`projectiles`, `world`, `player`, `S`, `weaponRuntime`, `renderState`,
 * `WALLH`), so this file needs no `ctx` locator at all — it neither calls
 * `ctx()` (AudioEngine) nor reaches through `Context.ts`.
 */

/** projectiles.nails elements, cast for the nail/reap/cross flight loop. */
interface Nail {
  m: THREE.Object3D;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  reap?: boolean;
  spin?: number;
}

/** projectiles.orbs elements, cast for the enemy-orb flight loop. */
interface Orb {
  m: THREE.Object3D;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  flesh?: boolean;
  spin?: number;
  col?: number;
  dmg: number;
}

/** world.enemies elements, cast for the nail-vs-enemy hit check. */
interface Enemy {
  dead?: boolean;
  dormant?: boolean;
  x: number;
  z: number;
  w: number;
  h: number;
}

export function projTick(dt: number){
  const nails=projectiles.nails as unknown as Nail[];
  for(let i=nails.length-1;i>=0;i--){const n=nails[i];
    n.life-=dt;
    if(!n.reap)n.vy-=5*dt;        // reap flies straight; crosses arc
    n.m.position.x+=n.vx*dt;n.m.position.y+=n.vy*dt;n.m.position.z+=n.vz*dt;
    if(n.spin)n.m.rotation.z+=n.spin*dt;
    const mx=n.m.position.x,my=n.m.position.y,mz=n.m.position.z;
    if(n.reap){ // visual tracer only — damage already applied by hitscan
      if(Math.random()<.6)spawnP(mx,my,mz,0,0,0,.5,.9,.35,.2,3);
      if(n.life<=0||my<0.05||my>WALLH||solidAt(mx,mz)){
        smoke3d(mx,Math.max(my,.3),mz,4);renderState.scene.remove(n.m);nails.splice(i,1);}
      continue;}
    let boom=n.life<=0||my<0.05||my>WALLH||solidAt(mx,mz);
    if(!boom)for(const p of world.props as unknown as Prop[]){if(p.dead)continue;
      if(Math.hypot(mx-p.x,mz-p.z)<p.r+.1&&my<p.hgt){boom=true;break;}}
    if(!boom)for(const e of world.enemies as unknown as Enemy[]){if(e.dead||e.dormant)continue;
      if(Math.hypot(mx-e.x,mz-e.z)<e.w*.5&&my>0&&my<e.h*1.05){
        weaponRuntime.volleyHit=true;S.hitsLanded++;boom=true;break;}}
    if(boom){crossExplode(mx,Math.max(my,.3),mz);
      renderState.scene.remove(n.m);nails.splice(i,1);}}
  const orbs=projectiles.orbs as unknown as Orb[];
  for(let i=orbs.length-1;i>=0;i--){const o=orbs[i];
    o.life-=dt;
    if(o.flesh){o.vy-=11*dt;o.m.rotation.x+=o.spin*dt;o.m.rotation.z+=o.spin*.7*dt;}
    o.m.position.x+=o.vx*dt;o.m.position.y+=o.vy*dt;o.m.position.z+=o.vz*dt;
    if(o.flesh){
      if(Math.random()<.7)blood(o.m.position.x,o.m.position.y,o.m.position.z,1,.6);
    }else if(Math.random()<.4){
      const c=o.col||0x9a4ae0,r2=(c>>16&255)/255,g2=(c>>8&255)/255,b2=(c&255)/255;
      spawnP(o.m.position.x,o.m.position.y,o.m.position.z,0,0,0,r2,g2,b2,.25,3);}
    let dead=o.life<=0||solidAt(o.m.position.x,o.m.position.z)||(o.flesh&&o.m.position.y<.1);
    const hit=Math.hypot(o.m.position.x-player.px,o.m.position.z-player.pz)<.55&&
       Math.abs(o.m.position.y-(player.pyy-.3))<1;
    if(!dead&&hit){damagePlayer(o.dmg);
      if(o.flesh){blood(player.px,player.pyy-.2,player.pz,10,1.5);gurgle(.2,.35);}
      dead=true;}
    if(dead){
      if(o.flesh){blood(o.m.position.x,Math.max(.1,o.m.position.y),o.m.position.z,8,1.4);
        addPool(o.m.position.x,o.m.position.z,rnd(.2,.4));gurgle(.16,.25);}
      renderState.scene.remove(o.m);orbs.splice(i,1);}}}

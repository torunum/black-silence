import * as THREE from "three";
import { rnd } from "../utils/math";
import { WEAPON_STATS } from "./definitions";
import { weaponRuntime } from "./WeaponRuntime";
import { bang, blip, click } from "../audio/Sfx";
import { growl } from "../audio/Voice";
import { renderState } from "../render/Renderer";
import { blood, smoke3d } from "../fx/Particles";
import { screenShake, shake } from "../fx/ShakeState";
import { projectiles } from "../fx/Projectiles";
import { ejectCasing } from "../render/Overlay2D";
import { say } from "../ui/Subtitles";
import { game } from "../core/Game";
import { player } from "../player/PlayerState";
import { S } from "../core/State";
import { world } from "../world/WorldState";
import { input } from "../player/Input";
import { breakProp, explodeBarrel, type Prop } from "../world/Props";
import { alertSound } from "../enemies/ai/Perception";
import { damageEnemy } from "../enemies/Damage";
import { hitscan } from "./Hitscan";

/**
 * The weapon FSM's *behavior* — the functions that read input and time and
 * drive `WeaponRuntime.ts`'s live values (`wstate`, `wtime`, `wCool`,
 * `pending`, `reloadFlags`, `volleyHit`, `kickAmt`/`kickRot`, `muzzle`,
 * `zoomLerp`, `kickAnim`, `recoilPitch`) forward. `WeaponRuntime.ts` is the
 * values this module mutates; `src/weapons/definitions.ts` is the
 * per-weapon constants it reads. Despite sitting next to a file that
 * literally holds "the state", this is the correct name: the governing
 * spec, `docs/superpowers/specs/2026-08-05-phase0-modular-port-design.md`
 * line 162, assigns "the equip/idle/fire/reload FSM" to this exact
 * filename, and `WeaponRuntime.ts` is the newer file.
 *
 * Moved verbatim from `src/legacy.js`'s "WEAPONS" section — `requestSwitch`
 * `startReload` `weaponTick` `fire` `doKick`, formerly lines 92-303 —
 * `reference/sonsurum.html` lines 1918-2196 for the section as a whole.
 * `hitscan`/`crossExplode` shared that section but move to `./Hitscan.ts`
 * instead: they call `WEAPONS`-section functions, and moving them out is
 * what breaks the `WEAPONS <-> COLLISION` cycle (Collision.ts's own header
 * has the other half of that story).
 *
 * `WEAPON_SOUNDS` and `WEAPONS` (`WEAPON_STATS` merged with each weapon's
 * sound closure) move here too, with `EQUIP_T`/`UNEQUIP_T` (formerly
 * legacy.js lines 80-91, immediately above the seven functions), even
 * though none of the five named exports below is one of them. They cannot
 * stay behind in legacy.js: `startReload`/`weaponTick` both read
 * `WEAPONS[S.cur]`, and `weaponTick` passes that object into `fire`, which
 * calls its `.snd()` — the sound closure, not just a stat, so `Hitscan.ts`'s
 * `WEAPON_STATS`-only trick (below) does not cover this need. Importing
 * `WEAPONS` back from legacy.js would be a real cycle (legacy.js already
 * imports this file for the five functions), and `Context` is for reaching
 * a not-yet-moved *function call* (see its own header), not a shared data
 * table — so this module owns them and legacy.js's three remaining readers
 * (`itemsTick`, `hud`, `loop`) import them back, the same way legacy.js
 * already imports `CELL`/`WALLH` from `src/world/Grid.ts` rather than
 * declaring them itself.
 *
 * `Hitscan.ts` also needs `WEAPONS[wIdx].pierce`, but cannot import the
 * merged `WEAPONS` from here without creating a second cycle the other way
 * (`fire` calls `hitscan`, so this file already imports `Hitscan.ts`).
 * See `Hitscan.ts`'s own header for how it reads `pierce` instead.
 *
 * `doKick`'s `setTimeout(...,110)` moves verbatim, bug and all: the
 * scheduled hit test ignores hit-stop and pause, and survives level
 * unload. `docs/known-issues.md` KNOWN-3 already tracks it; the fix
 * (`Time.schedule()`) is Plan 0F's hardening step, not this port's — Phase
 * 0 is a mechanical move with no behavior change.
 */

const WEAPON_SOUNDS = [
  () => { bang(.13,.42,2400); blip(180,.08,"square",.1,60,true); },
  () => { bang(.24,.65,1400); bang(.1,.3,500); },
  () => { bang(.07,.34,2600); blip(140,.05,"square",.06,70); },
  () => { bang(.055,.26,3000); },
  () => { bang(.3,.6,1900); blip(90,.3,"sawtooth",.12,40,true); },
  () => { blip(520,.3,"sine",.12,780,true); bang(.1,.2,800); },
  () => { bang(.04,.22,3200); blip(260,.04,"square",.05,120); },
  () => { blip(70,.5,"sawtooth",.16,360,true); bang(.28,.45,500); growl(90,.4,.3,true); },
];
export const WEAPONS = WEAPON_STATS.map((w, i) => ({ ...w, snd: WEAPON_SOUNDS[i] }));
export const EQUIP_T=.24,UNEQUIP_T=.16;

/** Enemies world.enemies elements are cast to for doKick's melee sweep. */
interface KickEnemy {
  dead?: boolean;
  x: number;
  z: number;
  h: number;
  boss?: boolean;
  maxhp: number;
  kx: number;
  kz: number;
  stun: number;
  flung?: number;
  flungT?: number;
}

export function requestSwitch(i){
  if(!game.started||!S.weapons[i]||i===S.cur||weaponRuntime.pending===i)return;
  weaponRuntime.pending=i;input.zoomOn=false;
  if(weaponRuntime.wstate!=="unequip"){weaponRuntime.wstate="unequip";weaponRuntime.wtime=0;click(.12);}}
export function startReload(){
  if(!game.started||S.dead||game.inputLock)return;
  const w=WEAPONS[S.cur];
  if(weaponRuntime.wstate!=="idle"&&weaponRuntime.wstate!=="fire")return;
  if(S.mag[S.cur]>=w.magSize||S.ammo[w.ammo]<=0)return;
  weaponRuntime.wstate="reload";weaponRuntime.wtime=0;weaponRuntime.reloadFlags={};}
export function weaponTick(dt){
  weaponRuntime.wtime+=dt;weaponRuntime.wCool-=dt;
  const w=WEAPONS[S.cur];
  if(weaponRuntime.wstate==="unequip"&&weaponRuntime.wtime>=UNEQUIP_T){
    if(weaponRuntime.pending>=0){S.cur=weaponRuntime.pending;weaponRuntime.pending=-1;}
    weaponRuntime.wstate="equip";weaponRuntime.wtime=0;click(.16);}
  else if(weaponRuntime.wstate==="equip"&&weaponRuntime.wtime>=EQUIP_T){weaponRuntime.wstate="idle";weaponRuntime.wtime=0;}
  else if(weaponRuntime.wstate==="fire"&&weaponRuntime.wtime>=Math.min(.35,w.rate)){weaponRuntime.wstate="idle";weaponRuntime.wtime=0;}
  else if(weaponRuntime.wstate==="reload"){
    const rt=weaponRuntime.wtime/w.reload;
    if(rt>.18&&!weaponRuntime.reloadFlags.a){weaponRuntime.reloadFlags.a=1;click(.16);
      if(S.cur===0)for(let i=0;i<6;i++)ejectCasing(1);
      if(S.cur===1){ejectCasing(2);ejectCasing(2);}
      if(S.cur===4)ejectCasing(3);}
    if(rt>.62&&!weaponRuntime.reloadFlags.b){weaponRuntime.reloadFlags.b=1;click(.14);}
    if(rt>=1){
      const need=w.magSize-S.mag[S.cur];
      const take=Math.min(need,S.ammo[w.ammo]);
      S.ammo[w.ammo]-=take;S.mag[S.cur]+=take;
      weaponRuntime.wstate="idle";weaponRuntime.wtime=0;click(.2);}
    if(input.firing&&S.mag[S.cur]>0){weaponRuntime.wstate="idle";weaponRuntime.wtime=0;}}
  if(input.firing&&(weaponRuntime.wstate==="idle"||weaponRuntime.wstate==="fire")&&weaponRuntime.wCool<=0&&!S.dead&&game.started&&!game.inputLock){
    if(S.mag[S.cur]<=0){
      if(S.ammo[w.ammo]>0)startReload();
      else{click(.1);weaponRuntime.wCool=.3;}}        // dry click, not a beep
    else fire(w);}
  if(weaponRuntime.wstate==="idle"&&S.mag[S.cur]===0&&S.ammo[w.ammo]>0&&weaponRuntime.wtime>.4)startReload();
  weaponRuntime.kickAmt*=Math.exp(-10*dt);weaponRuntime.kickRot*=Math.exp(-9*dt);
  weaponRuntime.muzzle=Math.max(0,weaponRuntime.muzzle-dt*9);
  renderState.muzzleLight.intensity*=Math.exp(-16*dt);
  renderState.boomLight.intensity*=Math.exp(-7*dt);
  input.swayX=input.swayX*Math.exp(-7*dt);input.swayY=input.swayY*Math.exp(-7*dt);
  /* sniper zoom */
  const zt=(S.cur===4&&input.zoomOn)?1:0;
  weaponRuntime.zoomLerp+=(zt-weaponRuntime.zoomLerp)*Math.min(1,dt*9);
  renderState.camera.fov=78-46*weaponRuntime.zoomLerp;renderState.camera.updateProjectionMatrix();
  /* kick cooldown */
  if(S.kickCd>0){S.kickCd-=dt;
    if(S.kickCd<=0){say("kickready");click(.12);}}
  weaponRuntime.kickAnim=Math.max(0,weaponRuntime.kickAnim-dt);}
export function fire(w){
  S.mag[S.cur]--;weaponRuntime.wCool=w.rate;weaponRuntime.wstate="fire";weaponRuntime.wtime=0;
  S.shots++;
  weaponRuntime.kickAmt=w.kick;weaponRuntime.kickRot=(Math.random()-.5)*w.kick*.25;
  shake(w.trauma);weaponRuntime.muzzle=.4+(S.cur===1?.15:0)+(S.cur===4?.2:0);
  renderState.muzzleLight.position.copy(renderState.camera.position);
  renderState.muzzleLight.intensity=2.6+(S.cur===1?1.4:0)+(S.cur===5?1.6:0);
  renderState.muzzleLight.color.setHex(S.cur===5?0xfff0b0:0xffc878);
  w.snd();
  if(S.cur===2||S.cur===3)ejectCasing(0);
  if(S.cur===1)setTimeout(()=>{ejectCasing(2);click(.12);},300); // pump
  weaponRuntime.recoilPitch+=(S.cur===1?.04:S.cur===4?.05:S.cur===0?.022:S.cur===5?.03:.006);
  alertSound(player.px,player.pz,18);
  const dir=new THREE.Vector3();renderState.camera.getWorldDirection(dir);
  weaponRuntime.volleyHit=false;
  for(let i=0;i<w.pellets;i++){
    const d=dir.clone();
    d.x+=(Math.random()-.5)*w.spread*2;d.y+=(Math.random()-.5)*w.spread*2;d.z+=(Math.random()-.5)*w.spread*2;
    d.normalize();
    if(w.kind==="hit")hitscan(d,w.dmg,S.cur);
    else if(w.kind==="reap"){
      hitscan(d,w.dmg,S.cur);
      // green energy bolt + glow tracer
      const grp=new THREE.Group();
      const core=new THREE.Mesh(new THREE.SphereGeometry(.22,8,8),reapCoreMat);
      const tail=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.7),reapTailMat);
      tail.position.z=-.35;grp.add(core);grp.add(tail);
      grp.position.copy(renderState.camera.position);
      projectiles.nails.push({m:grp,vx:d.x*30,vy:d.y*30,vz:d.z*30,dmg:0,life:1.2,reap:true,spin:0});
      renderState.scene.add(grp);
      renderState.muzzleLight.color.setHex(0x7fe05a);renderState.muzzleLight.intensity=2.4;}
    else if(w.kind==="cross"){
      const grp=new THREE.Group();
      const m1=new THREE.Mesh(new THREE.BoxGeometry(.09,.5,.09),crossMat);
      const m2=new THREE.Mesh(new THREE.BoxGeometry(.3,.09,.09),crossMat);
      m2.position.y=.1;grp.add(m1);grp.add(m2);
      grp.position.copy(renderState.camera.position);grp.position.y-=.1;
      projectiles.nails.push({m:grp,vx:d.x*22,vy:d.y*22,vz:d.z*22,dmg:w.dmg,life:3,cross:true,
        spin:rnd(4,7)});
      renderState.scene.add(grp);}}
  if(weaponRuntime.volleyHit)S.hitsLanded++;
  const mp=renderState.camera.position.clone().add(dir.clone().multiplyScalar(.5));
  smoke3d(mp.x,mp.y-.1,mp.z,S.cur===1?6:2);}
const crossMat=new THREE.MeshBasicMaterial({color:0xe8d88a});
const reapCoreMat=new THREE.MeshBasicMaterial({color:0xaff060});
const reapTailMat=new THREE.MeshBasicMaterial({color:0x4fa030,transparent:true,opacity:.7});

/* ---------- POWER KICK ---------- */
export function doKick(){
  if(!game.started||S.dead||game.inputLock||S.kickCd>0||game.pianoOpen)return;
  S.kickCd=15;weaponRuntime.kickAnim=.32;
  shake(.3);bang(.15,.5,900);
  setTimeout(()=>{
    const dir=new THREE.Vector3();renderState.camera.getWorldDirection(dir);
    let hitAny=false;
    for(const e of world.enemies as unknown as KickEnemy[]){if(e.dead)continue;
      const dx=e.x-player.px,dz=e.z-player.pz,d=Math.hypot(dx,dz);
      if(d>2.5)continue;
      const dot=(dx*dir.x+dz*dir.z)/d;
      if(dot<.55)continue;
      hitAny=true;
      const kb=e.boss?3:16;
      e.kx+=dx/d*kb;e.kz+=dz/d*kb;
      e.stun=Math.max(e.stun,e.boss?.25:.9);
      if(!e.boss&&e.maxhp<=60){e.flung=.9;e.flungT=0;}
      blood(e.x,e.h*.6,e.z,4,2);
      damageEnemy(e,15,{dir:{x:dx/d,z:dz/d},wIdx:-1});}
    for(const p of world.props as unknown as Prop[]){if(p.dead)continue;
      const dx=p.x-player.px,dz=p.z-player.pz,d=Math.hypot(dx,dz);
      if(d>2.6)continue;
      const dot=(dx*dir.x+dz*dir.z)/Math.max(.001,d);
      if(dot<.5)continue;
      hitAny=true;
      if(p.explosive)explodeBarrel(p);else breakProp(p);}
    if(hitAny){bang(.12,.4,500);shake(.15);screenShake.hitStop=Math.max(screenShake.hitStop,.03);}
  },110);}

import type * as THREE from "three";
import { pick, rnd } from "../utils/math";
import { MONOLOGUE as M } from "../content/monologue";
import { ctx } from "../audio/AudioEngine";
import { bang, blip } from "../audio/Sfx";
import { stopBossMusic } from "../audio/Ambient";
import { stopMusic } from "../audio/Music";
import { flashDmg, showMsg } from "../ui/HudMessages";
import { say } from "../ui/Subtitles";
import { ach } from "../ui/Toasts";
import { endLevel } from "../ui/LevelEnd";
import { screenBlood } from "../render/Overlay2D";
import { addSprite } from "../render/RenderCore";
import { renderState } from "../render/Renderer";
import { el } from "../ui/dom";
import { ITEMTEX } from "../render/ItemTextures";
import { ACHIEVEMENTS } from "../content/achievements";
import { keys, input } from "./Input";
import { player } from "./PlayerState";
import { game } from "../core/Game";
import { S } from "../core/State";
import { EYE } from "../world/Grid";
import { solidAt, collides, floorHeightAt } from "../world/Collision";
import { spawnEnemy } from "../world/LevelLoader";
import { alertSound } from "../enemies/ai/Perception";
import { smoke3d } from "../fx/Particles";
import { screenShake, shake } from "../fx/ShakeState";
import { weaponRuntime } from "../weapons/WeaponRuntime";
import { world } from "../world/WorldState";
import type { Enemy } from "../enemies/Enemy";

/**
 * Player movement, damage and death — the per-frame integrator and the two
 * functions it calls that touch nothing outside this file. Moved verbatim
 * from `src/legacy.js`'s "PLAYER" section (formerly lines 728-821;
 * `reference/sonsurum.html`'s equivalent section).
 *
 * `playerTick` calls `endLevel` (the level-exit pad, `else endLevel();`
 * below), a direct import from `src/ui/LevelEnd.ts` as of Plan 0F Task 2.
 * Before that, `endLevel` stayed in `legacy.js` and this file reached it
 * through `src/core/Context.ts`'s locator instead, imported under a rename
 * here to avoid a clash with `AudioEngine.ts`'s own `ctx` (still imported
 * above, still called once in `footstep`, below). `damagePlayer` made the
 * same locator-to-direct-import transition earlier, in Task 10's Step 6,
 * once `madge --circular src/` confirmed a direct import from its callers
 * (`Props.ts`, `Boss.ts`, `ai/Behaviors.ts`) closes no cycle — `endLevel`'s
 * own retirement followed the same check (`madge`'s output is in
 * `Context.ts`'s doc comment). `Context.ts` now holds only `wakeBoss`, a
 * genuine cycle-break rather than a bridge to code that had not moved yet;
 * see its own doc comment.
 *
 * `world.exitPos`/`world.challenge` are typed loosely
 * (`src/world/WorldState.ts`'s own doc comment explains why); the local
 * interfaces below describe just the fields this file reads or writes,
 * matching the cast convention `src/world/Props.ts` and
 * `src/weapons/WeaponState.ts` already established for those two.
 * `world.enemies` is `Enemy[]` (Phase 3 Part A, KNOWN-13); `TickEnemy` below
 * is a `Pick<Enemy, …>` checked widening of it, not a cast.
 */

/** world.exitPos's actual shape, set by LevelLoader.ts for the "X" tile. */
interface ExitPos {
  x: number;
  z: number;
}

/** world.challenge's actual shape, set by LevelLoader.ts for the "Y" tile. */
interface ChallengeState {
  x: number;
  z: number;
  state: number;
  plate: { material: { color: THREE.Color } };
  light: { color: THREE.Color };
}

/** What playerTick's boss/summoned checks read off a `world.enemies` element. */
type TickEnemy = Pick<Enemy, "boss" | "summoned" | "dead">;

function damagePlayer(d: number, silent?: boolean): void {
  if(S.dead||S.won)return;
  if(player.spawnGuard>0)return;   // can't be hurt during spawn protection
  let dmg=d;
  if(S.armor>0){const ab=Math.min(S.armor,dmg*.6);S.armor-=ab;dmg-=ab;}
  S.hp-=dmg;
  if(!silent){flashDmg(.45);shake(.3);screenBlood();
    bang(.1,.3,700);blip(90,.2,"sawtooth",.12,40);}
  if(S.hp<35&&Math.random()<.3)say("lowhp");
  if(S.hp<=0){S.hp=0;S.dead=true;
    stopBossMusic();stopMusic();
    document.exitPointerLock();
    el("deadquip").textContent='ADEM: “'+pick(M.dead)+'”';
    el("dead").classList.remove("hidden");}}

function accelerate(wx_: number, wz_: number, maxs: number, acc: number, dt: number): void {
  const cur=player.vx*wx_+player.vz*wz_,add=maxs-cur;if(add<=0)return;
  let a=acc*maxs*dt;if(a>add)a=add;player.vx+=wx_*a;player.vz+=wz_*a;}
function footstep(sprinting: boolean): void {
  if(!ctx())return;
  const marble=S.level===1;
  bang(.05,sprinting?.09:.06,marble?2400:700,marble?600:0);
  if(marble)blip(rnd(800,1000),.05,"sine",.02);}
function playerTick(dt: number): void {
  if(S.dead||S.won||game.inputLock)return;
  if(player.spawnGuard>0)player.spawnGuard-=dt;
  let f=0,s2=0;
  if(keys.KeyW)f++;if(keys.KeyS)f--;if(keys.KeyD)s2++;if(keys.KeyA)s2--;
  const sin=Math.sin(input.yaw),cos=Math.cos(input.yaw);
  let wx_=-sin*f+cos*s2,wz_=-cos*f-sin*s2;
  const l=Math.hypot(wx_,wz_);if(l>0){wx_/=l;wz_/=l;}
  const sprint=keys.ShiftLeft||keys.ShiftRight;
  const fh=floorHeightAt(player.px,player.pz);          // ground height under the player
  const standY=EYE+fh;
  if(player.grounded){
    const fr=Math.exp(-8*dt);player.vx*=fr;player.vz*=fr;
    accelerate(wx_,wz_,sprint?10.5:7,9,dt);
    if(keys.Space){player.vy=7.4;player.grounded=false;blip(140,.06,"sine",.04,90);}
  }else accelerate(wx_,wz_,1.4,70,dt);
  player.vy-=20*dt;player.pyy+=player.vy*dt;
  if(player.pyy<=standY){if(!player.grounded){footstep(true);shake(.04);}player.pyy=standY;player.vy=0;player.grounded=true;}
  let nx=player.px+player.vx*dt;
  if(!collides(nx,player.pz)&&!(player.grounded&&floorHeightAt(nx,player.pz)-fh>1.2)){player.px=nx;}else player.vx=0;
  let nz=player.pz+player.vz*dt;
  if(!collides(player.px,nz)&&!(player.grounded&&floorHeightAt(player.px,nz)-fh>1.2)){player.pz=nz;}else player.vz=0;
  // if we walked onto higher ground, snap up; onto lower ground, start falling
  const nfh=floorHeightAt(player.px,player.pz),nStand=EYE+nfh;
  if(player.grounded){
    if(nStand>player.pyy+0.02){player.pyy=nStand;}        // step up
    else if(nStand<player.pyy-0.02){player.grounded=false;} // walked off a ledge -> fall
  }
  const spd=Math.hypot(player.vx,player.vz);
  player.bobT+=spd*dt*(sprint?1.9:1.6);
  const bobSin=Math.sin(player.bobT*4);
  if(player.grounded&&spd>1&&player.lastBobSin<=0&&bobSin>0)footstep(sprint);
  player.lastBobSin=bobSin;
  screenShake.trauma=Math.max(0,screenShake.trauma-dt*1.6);
  const sh=screenShake.trauma*screenShake.trauma,t=performance.now();
  const shx=sh*.06*Math.sin(t*.061),shy=sh*.05*Math.sin(t*.083),shr=sh*.05*Math.sin(t*.047);
  weaponRuntime.recoilPitch*=Math.exp(-8*dt);
  renderState.camera.position.set(player.px+shx,player.pyy+(player.grounded?bobSin*.025*Math.min(1,spd/7):0)+shy,player.pz);
  renderState.camera.rotation.order="YXZ";
  renderState.camera.rotation.y=input.yaw;renderState.camera.rotation.x=input.pitch+weaponRuntime.recoilPitch;renderState.camera.rotation.z=shr;
  renderState.lamp.position.set(player.px,player.pyy+.4,player.pz);
  if(renderState.lampCore)renderState.lampCore.position.set(player.px,player.pyy+.2,player.pz);
  /* exit pad (level 1) */
  if(world.exitPos&&Math.hypot(player.px-(world.exitPos as unknown as ExitPos).x,player.pz-(world.exitPos as unknown as ExitPos).z)<1.2){
    const enemies: readonly TickEnemy[] = world.enemies;   // checked widening, not a cast
    const bossLeft=enemies.some(e=>e.boss&&!e.dead);
    if(bossLeft)showMsg("SOMETHING STILL BREATHES HERE",1.5);
    else endLevel();}
  /* challenge plate */
  if(world.challenge&&(world.challenge as unknown as ChallengeState).state===0&&Math.hypot(player.px-(world.challenge as unknown as ChallengeState).x,player.pz-(world.challenge as unknown as ChallengeState).z)<1){
    (world.challenge as unknown as ChallengeState).state=1;say("challenge",true);
    showMsg("THE PLATE HUMS — THEY ARE COMING",3);
    blip(70,1,"sawtooth",.15,40,true);
    (world.challenge as unknown as ChallengeState).plate.material.color.setHex(0xc83a20);
    (world.challenge as unknown as ChallengeState).light.color.setHex(0xc83a20);
    for(let n=0;n<5;n++){
      const a=n/5*6.28,d=rnd(3,5);
      const sxp=(world.challenge as unknown as ChallengeState).x+Math.sin(a)*d,szp=(world.challenge as unknown as ChallengeState).z+Math.cos(a)*d;
      if(!solidAt(sxp,szp)){
        const ne=spawnEnemy(n<3?"f":"z",sxp,szp,true);
        ne.aware=true;ne.alertX=player.px;ne.alertZ=player.pz;
        smoke3d(sxp,.6,szp,8);}}
    alertSound(player.px,player.pz,30);}
  if(world.challenge&&(world.challenge as unknown as ChallengeState).state===1){
    const enemies: readonly TickEnemy[] = world.enemies;   // checked widening, not a cast
    if(!enemies.some(e=>e.summoned&&!e.dead)){
      (world.challenge as unknown as ChallengeState).state=2;say("challenge_done",true);
      ach(ACHIEVEMENTS.gauntlet,S.ach);
      (world.challenge as unknown as ChallengeState).plate.material.color.setHex(0x4ab86a);
      (world.challenge as unknown as ChallengeState).light.color.setHex(0x4ab86a);
      ["armor","crosses","bullets"].forEach((k,i)=>{
        world.items.push({kind:k,x:(world.challenge as unknown as ChallengeState).x+(i-1)*.8,z:(world.challenge as unknown as ChallengeState).z,
          sp:addSprite(ITEMTEX[k] as THREE.CanvasTexture,(world.challenge as unknown as ChallengeState).x+(i-1)*.8,(world.challenge as unknown as ChallengeState).z,.55,.55,.5),bob:i});});
      blip(523,.3,"sine",.1,1046,true);}}}

export { damagePlayer, accelerate, footstep, playerTick };

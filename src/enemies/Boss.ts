import { rnd } from "../utils/math";
import { after } from "../core/Timers";
import { player } from "../player/PlayerState";
import { damagePlayer } from "../player/Player";
import { input } from "../player/Input";
import { game } from "../core/Game";
import { ENEMY_DEFS as EDEF } from "./EnemyDefs";
import { PX } from "./SpriteBaker";
import { blip, bang } from "../audio/Sfx";
import { growl } from "../audio/Voice";
import { organChord, startBossMusic } from "../audio/Ambient";
import { say } from "../ui/Subtitles";
import { showMsg, flashHoly } from "../ui/HudMessages";
import { shake, screenShake } from "../fx/ShakeState";
import { smoke3d, fireP, blood } from "../fx/Particles";
import { solidAt } from "../world/Collision";
import { spawnEnemy } from "../world/LevelLoader";
import { EYE } from "../world/Grid";
import { world } from "../world/WorldState";
import { los } from "./ai/Perception";
import { moveEnemy } from "./ai/Locomotion";
import { fireOrb, spawnRing, spawnStrike } from "./ai/Attacks";
import { ctx } from "../core/Context";

/**
 * Boss — the three bosses' brains: waking, the wake-up cinematic, the
 * priest's teleport and its three-phase think loop. Moved verbatim from
 * `src/legacy.js` (formerly lines 121-155 for `wakeBoss`/`roarFor`/
 * `cineTick`, and 210-217/398-453 for `priestTeleport`/`priestThink`, Task
 * 10; `reference/sonsurum.html`'s equivalent sections).
 *
 * This is the DAG's other AI leaf-of-leaves besides `Perception.ts`: its
 * calls all reach modules that had already moved by the time this file was
 * written — `los` (`ai/Perception.ts`), `moveEnemy` (`ai/Locomotion.ts`),
 * `fireOrb`/`spawnRing`/`spawnStrike` (`ai/Attacks.ts`), and `damagePlayer`
 * (`src/player/Player.ts`, Task 7) — plus `spawnEnemy`
 * (`src/world/LevelLoader.ts`, Task 5) for the priest's summons. Nothing in
 * this file calls `enemyTick` or anything else in `src/enemies/ai/
 * Behaviors.ts`, which is exactly what keeps `Behaviors -> Boss` a one-way
 * edge instead of the cycle the plan's first file split would have made
 * (`docs/superpowers/plans/2026-08-15-phase0e-systems.md`'s Task 10
 * correction, and this task's own brief, Step 1).
 *
 * `wakeBoss` registers itself into `src/core/Context.ts`'s locator at this
 * module's scope, just below its definition, because `src/enemies/Damage.ts`
 * cannot import it: that edge closes a four-file cycle
 * (`Damage.ts -> Boss.ts -> ai/Attacks.ts -> world/Props.ts -> Damage.ts`).
 * Plan 0E Task 10 retired the entry after a `madge --circular src/` run that
 * was silently scanning only `src/legacy.js` — madge's default extensions
 * exclude `.ts` — and Plan 0F Task 1 restored it once the gate was fixed.
 * See `Damage.ts`'s doc comment for the full account.
 *
 * The enemy parameters these five functions take are left untyped, the
 * same convention `src/enemies/Damage.ts`/`Death.ts` established for that
 * dynamic, not-yet-settled object (see `src/world/WorldState.ts`'s own doc
 * comment). `cineTick` is the one exception: `world.cine` needs a cast to
 * do arithmetic on its fields, so it is read once into a locally typed
 * `cine` alias right after the existing null guard — the same object,
 * just typed — and every read in the function goes through that alias;
 * the final `world.cine=null;` still writes the real field directly, since
 * `cine` is a `const` and cannot be reassigned.
 *
 * `style.opacity` takes strings here where the reference assigns numbers,
 * the same adjustment `src/ui/HudMessages.ts`, `src/ui/Toasts.ts` and
 * `src/world/LevelLoader.ts` made — `CSSStyleDeclaration` stringifies both
 * to the same value.
 */

interface Cine { t: number; dur: number; e: { x: number; z: number; h: number; key: string }; }

export function wakeBoss(e){
  if(!e.dormant)return;
  e.dormant=false;
  world.cine={t:0,dur:2.7,e};
  game.inputLock=true;input.firing=false;
  document.getElementById("barTop").style.height="11%";
  document.getElementById("barBot").style.height="11%";
  const bt=document.getElementById("bossTitle");
  bt.children[0].textContent=e.name;bt.children[1].textContent=e.title||EDEF[e.key].title;
  bt.style.opacity="1";
  blip(40,1.6,"sawtooth",.2,30,true);bang(.5,.4,300);
  if(e.priest)organChord();
  after(()=>roarFor(e),500);}

ctx.wakeBoss=wakeBoss;

export function roarFor(e){growl(rnd(42,60),1.0,.6,true);after(()=>growl(rnd(50,70),.6,.4,true),200);}

export function cineTick(dt){
  if(!world.cine)return;
  const cine=world.cine as unknown as Cine;
  cine.t+=dt;
  const b=cine.e;
  const target=Math.atan2(-(b.x-player.px),-(b.z-player.pz));
  let diff=((target-input.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
  input.yaw=input.yaw+diff*Math.min(1,dt*4);
  const want=Math.atan2(b.h*.7-player.pyy,Math.hypot(b.x-player.px,b.z-player.pz));
  input.pitch=input.pitch+(want-input.pitch)*Math.min(1,dt*4);
  if(cine.t>=cine.dur){
    document.getElementById("barTop").style.height="0";
    document.getElementById("barBot").style.height="0";
    document.getElementById("bossTitle").style.opacity="0";
    game.inputLock=false;
    say("boss_"+cine.e.key,true);
    startBossMusic();
    world.cine=null;}}

export function priestTeleport(e,far){
  smoke3d(e.x,1.2,e.z,16);blip(700,.25,"sine",.1,140,true);
  for(let tries=0;tries<24;tries++){
    const a=rnd(0,6.28),d=far?rnd(7,11):rnd(4,7);
    const nx=player.px+Math.sin(a)*d,nz=player.pz+Math.cos(a)*d;
    if(!solidAt(nx,nz)&&los(nx,nz,player.px,player.pz)){e.x=nx;e.z=nz;break;}}
  smoke3d(e.x,1.2,e.z,16);fireP(e.x,1,e.z,6);
  blip(140,.25,"sine",.12,700,true);}

export function priestThink(e,dt,dist,dx,dz){
  /* phase transitions */
  if(e.phase===1&&e.hp<e.maxhp*.66){e.phase=2;
    say("boss_"+e.key+"2",true);roarFor(e);shake(.3);screenShake.hitStop=Math.max(screenShake.hitStop,.06);
    priestTeleport(e,true);}
  if(e.phase===2&&e.hp<e.maxhp*.33){e.phase=3;
    say("boss_"+e.key+"3",true);roarFor(e);roarFor(e);shake(.5);screenShake.hitStop=Math.max(screenShake.hitStop,.1);
    flashHoly(.25);
    e.formKey=e.key+"2";
    e.sp.material.map=PX[e.formKey].a;e.sp.material.needsUpdate=true;
    e.w*=1.35;e.h*=1.15;e.sp.scale.set(e.w,e.h,1);
    e.speed=e.sovereign?3.8:3.5;e.mel=e.sovereign?40:34;organChord();}
  e.tpT-=dt;e.atkT-=dt;e.sumT-=dt;e.ringT-=dt;e.debT-=dt;
  let moving=false;
  if(e.phase===1){
    if(e.tpT<=0&&dist>7){e.tpT=6;priestTeleport(e,false);}
    if(e.atkT<=0){e.atkT=3.4;fireOrb(e,rnd(-.03,.03));}
    if(dist>1.6){moving=moveEnemy(e,dx/dist,dz/dist,e.speed,dt);}
    if(dist<1.8&&e.cool<=0&&Math.abs((e.fy||0)-(player.pyy-EYE))<1.3){e.cool=1.1;e.atkAnim=.22;damagePlayer(e.mel);}
  }else if(e.phase===2){
    if(dist<5&&e.tpT<=0){e.tpT=2.6;priestTeleport(e,true);}
    if(e.atkT<=0){e.atkT=2.8;
      for(let i=-2;i<=2;i++)fireOrb(e,i*.13);}
    if(e.sumT<=0){e.sumT=8;
      const alive=world.enemies.filter(o=>o.summoned&&!o.dead).length;
      if(alive<5){
        for(let n=0;n<2;n++){
          for(let tries=0;tries<20;tries++){
            const a=rnd(0,6.28),d=rnd(3,6);
            const nx=player.px+Math.sin(a)*d,nz=player.pz+Math.cos(a)*d;
            if(!solidAt(nx,nz)){
              const ne=spawnEnemy(Math.random()<.6?"z":"f",nx,nz,true);
              ne.aware=true;ne.alertX=player.px;ne.alertZ=player.pz;
              smoke3d(nx,.6,nz,10);blood(nx,.3,nz,6,1.5);
              break;}}}
        blip(180,.6,"sawtooth",.12,60,true);
        showMsg("THE PRIEST CALLS HIS FLOCK");}}
  }else{
    if(e.ringT<=0){e.ringT=4.5;spawnRing(e.x,e.z);}
    if(e.debT<=0){e.debT=3;spawnStrike();}
    if(e.atkT<=0){e.atkT=3.6;for(let i=-1;i<=1;i++)fireOrb(e,i*.15);}
    if(e.sumT<=0){e.sumT=12;
      const alive=world.enemies.filter(o=>o.summoned&&!o.dead).length;
      if(alive<3){const a=rnd(0,6.28);
        const nx=player.px+Math.sin(a)*4,nz=player.pz+Math.cos(a)*4;
        if(!solidAt(nx,nz)){const ne=spawnEnemy("f",nx,nz,true);
          ne.aware=true;smoke3d(nx,.6,nz,10);}}}
    if(dist>1.7){moving=moveEnemy(e,dx/dist,dz/dist,e.speed,dt);}
    if(dist<2&&e.cool<=0&&Math.abs((e.fy||0)-(player.pyy-EYE))<1.3){e.cool=.95;e.atkAnim=.22;damagePlayer(e.mel);}}
  if(moving){e.animT+=dt;
    if(e.animT>.25){e.animT=0;e.frame=1-e.frame;
      const bk=e.key,fk=e.formKey||(e.key+"2");
      const set=e.phase===3?[PX[fk].a,PX[fk].b]:[PX[bk].a,PX[bk].b];
      e.sp.material.map=set[e.frame];e.sp.material.needsUpdate=true;}}
  e.sp.position.set(e.x,e.h/2+(e.fy||0)+Math.sin(performance.now()/280)*.05,e.z);
  e.blob.position.set(e.x,.012,e.z);}

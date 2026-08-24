import * as THREE from "three";
import { clamp, pick, rnd } from "./utils/math";
import { MONOLOGUE as M } from "./content/monologue";
import { LEVELS } from "./world/levels/index";
import { ENEMY_DEFS as EDEF } from "./enemies/EnemyDefs";
import { TEX, buildTextures } from "./render/ProcTextures";
import { PX, buildSprites } from "./enemies/SpriteBaker";
import { ITEMTEX, buildItemTex } from "./render/ItemTextures";
import { audioInit, ctx, getMasterVolume, setMasterVolume } from "./audio/AudioEngine";
import { bang, blip, boom, click } from "./audio/Sfx";
import { deathCry, growl, gurgle, pain, snarl } from "./audio/Voice";
import { bellToll, organChord, pianoNote, startBossMusic, stopBossMusic, stoneDoor, wetDoor } from "./audio/Ambient";
import { setScene } from "./render/SceneRef";
import { renderState } from "./render/Renderer";
import { buildParticles, spawnP, blood, sparks, smoke3d, fireP, holyP, toxicP, emberP, woodP, partTick } from "./fx/Particles";
import { splatMat, holeMat, scorchMat, addPool, poolTick, addWallDecal, resetDecals } from "./fx/Decals";
import { gibGeo, gibMatsFlesh, spawnGibs, gibTick, resetGibs, spawnGibChunk } from "./fx/Gibs";
import { screenShake, shake } from "./fx/ShakeState";
import { headPool } from "./fx/Heads";
import { projectiles } from "./fx/Projectiles";
import { projTick } from "./fx/ProjectileTick";
import { save } from "./save/SaveGame";
import { pianoState } from "./ui/PianoState";
import { ambienceState } from "./world/AmbienceState";
import { world } from "./world/WorldState";
import { ejectCasing, screenBlood, fxTick } from "./render/Overlay2D";
import { addSprite, addBlob } from "./render/RenderCore";
import { buildWeaponSprites } from "./render/viewmodel/sprites";
import { drawKickBoot, drawViewmodel } from "./render/viewmodel/draw";
import { ACHIEVEMENTS } from "./content/achievements";
import { say, tickSubtitles } from "./ui/Subtitles";
import { ach } from "./ui/Toasts";
import { showMsg, tickMessage, flashDmg, flashHoly } from "./ui/HudMessages";
import { keys, setInputHooks, overlayOpen, input } from "./player/Input";
import { game } from "./core/Game";
import { weaponRuntime } from "./weapons/WeaponRuntime";
import { player } from "./player/PlayerState";
import { damagePlayer, accelerate, footstep, playerTick } from "./player/Player";
import { interact, itemsTick, doorTick, propTick, torchTick } from "./player/Interact";
import { S } from "./core/State";
import { CELL, WALLH, EYE } from "./world/Grid";
import { solidAt, segBlocked, segsCrossRay, floorHeightAt, wallNormal, collides } from "./world/Collision";
import { loadLevel, spawnEnemy, spawnProp } from "./world/LevelLoader";
import { breakProp, explodeBarrel } from "./world/Props";
import { alertSound } from "./enemies/ai/Perception";
import { damageEnemy } from "./enemies/Damage";
import { dropAmmo, headTick } from "./enemies/Death";
import { requestSwitch, startReload, weaponTick, doKick, WEAPONS, EQUIP_T, UNEQUIP_T } from "./weapons/WeaponState";
import { crossExplode } from "./weapons/Hitscan";
// Renamed on import: `ctx` is already bound above to AudioEngine's audio-context
// accessor (`ctx()`, two call sites now that footstep's third moved to
// Player.ts with Task 7). This is Context.ts's service locator — see its
// own doc comment — registered below for endLevel, openPiano, wakeBoss and
// showWin, the entries this file still owns; damagePlayer and damageEnemy
// each register themselves from Player.ts/Damage.ts instead.
import { ctx as svcCtx } from "./core/Context";

/* ============================================================
   THE BLACK SILENCE — The Hollow Parish (v3 gothic overhaul)
   2 levels · 9 enemy types + elites · 3 bosses · 6 weapons ·
   power kick · destructibles · playable piano · monologues
   ============================================================ */

/* damagePlayer moved to src/player/Player.ts (Task 7) and damageEnemy moved
   to src/enemies/Damage.ts (Task 9); each registers itself into this
   locator at its own module scope — no call site here changed. endLevel is
   a new entry: playerTick (moved to Player.ts by Task 7) reaches it
   through this locator because endLevel itself belongs to Plan 0F, not
   this plan, and stays here for now. openPiano is Task 8's new entry:
   interact (moved to src/player/Interact.ts) reaches it through this
   locator because openPiano itself belongs to Plan 0F's playable piano,
   not this plan, and stays here for now too. wakeBoss and showWin are
   Task 9's two new entries, registered the other way around from the
   three above: wakeBoss and showWin themselves still live here (wakeBoss
   is boss-brain code that moves in Task 10; showWin belongs to Plan 0F's
   win screen), and damageEnemy (now in Damage.ts) and bossDeath (now in
   Death.ts) reach them through this locator instead. Function
   declarations hoist, so this can sit at module scope ahead of any of
   their definitions. */
svcCtx.endLevel=endLevel;svcCtx.openPiano=openPiano;svcCtx.wakeBoss=wakeBoss;svcCtx.showWin=showWin;

/* Input lives in src/player/Input.ts; its listeners are already registered
   (at that module's scope, as in the reference). This hands it the gameplay
   callbacks and state reads it cannot import back from here, at module
   scope so it is done before any event can be delivered. */
setInputHooks({
  isPianoOpen:()=>game.pianoOpen, isStarted:()=>game.started, isInputLocked:()=>game.inputLock,
  zoomLerp:()=>weaponRuntime.zoomLerp, canvas:()=>renderState.renderer.domElement,
  currentWeapon:()=>S.cur, ownsWeapon:i=>!!S.weapons[i],
  pianoKeyDown:code=>pianoKeyDown(code), closePiano:()=>closePiano(),
  interact:()=>interact(), startReload:()=>startReload(),
  requestSwitch:i=>requestSwitch(i), doKick:()=>doKick(),
});

/* ---------- HITSCAN ---------- */
const orbGeo=new THREE.SphereGeometry(.16,6,6);
/* ============================================================
   AMBIENT AUDIO + MISSING PARTICLE HELPER
   (the "missing particle helper", woodP, now lives in src/fx/Particles.ts)
   ============================================================ */
function ambience(dt){
  if(!ctx())return;ambienceState.ambT-=dt;if(ambienceState.ambT>0)return;
  ambienceState.ambT=rnd(8,18);
  const r=Math.random();
  if(r<.28)blip(rnd(480,720),1.4,"sine",.022,rnd(140,200),true);      // distant scream
  else if(r<.5)for(let i=0;i<3;i++)setTimeout(()=>bang(.08,.05,400),i*rnd(120,260)); // machinery
  else if(r<.72){bang(.3,.03,6000,1800);setTimeout(()=>bang(.15,.025,6000,1800),200);} // static
  else blip(rnd(1200,2200),.08,"sine",.03,undefined,true);            // drip
}
function vitalsAudio(dt){
  if(!ctx()||S.dead)return;
  if(S.hp<35){ambienceState.heartT-=dt;
    if(ambienceState.heartT<=0){ambienceState.heartT=S.hp<15?.55:.85;
      blip(52,.1,"sine",.22,40);setTimeout(()=>blip(48,.12,"sine",.18,36),130);}}
  if(S.hp<50){ambienceState.breathT-=dt;
    if(ambienceState.breathT<=0){ambienceState.breathT=rnd(2.2,3);bang(.5,.04,900,300);}}}

/* ============================================================
   DAMAGE / DEATH
   ============================================================ */
function wakeBoss(e){
  if(!e.dormant)return;
  e.dormant=false;
  world.cine={t:0,dur:2.7,e};
  game.inputLock=true;input.firing=false;
  document.getElementById("barTop").style.height="11%";
  document.getElementById("barBot").style.height="11%";
  const bt=document.getElementById("bossTitle");
  bt.children[0].textContent=e.name;bt.children[1].textContent=e.title||EDEF[e.key].title;
  bt.style.opacity=1;
  blip(40,1.6,"sawtooth",.2,30,true);bang(.5,.4,300);
  if(e.priest)organChord();
  setTimeout(()=>roarFor(e),500);}
function roarFor(e){growl(rnd(42,60),1.0,.6,true);setTimeout(()=>growl(rnd(50,70),.6,.4,true),200);}
function cineTick(dt){
  if(!world.cine)return;
  world.cine.t+=dt;
  const b=world.cine.e;
  const target=Math.atan2(-(b.x-player.px),-(b.z-player.pz));
  let diff=((target-input.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
  input.yaw=input.yaw+diff*Math.min(1,dt*4);
  const want=Math.atan2(b.h*.7-player.pyy,Math.hypot(b.x-player.px,b.z-player.pz));
  input.pitch=input.pitch+(want-input.pitch)*Math.min(1,dt*4);
  if(world.cine.t>=world.cine.dur){
    document.getElementById("barTop").style.height="0";
    document.getElementById("barBot").style.height="0";
    document.getElementById("bossTitle").style.opacity=0;
    game.inputLock=false;
    say("boss_"+world.cine.e.key,true);
    startBossMusic();
    world.cine=null;}}

/* ============================================================
   ENEMY AI
   ============================================================ */
function los(x1,z1,x2,z2){
  const d=Math.hypot(x2-x1,z2-z1),steps=d/.3|0;
  for(let i=1;i<steps;i++){const t=i/steps;
    if(solidAt(x1+(x2-x1)*t,z1+(z2-z1)*t))return false;}
  if(world.wallSegs.length&&segsCrossRay(x1,z1,x2,z2))return false;
  return true;}
function moveEnemy(e,sx,sz,spd,dt){
  const smash=e.boss||e.key==="B";
  const nx=e.x+sx*spd*dt,nz=e.z+sz*spd*dt,rr=e.r;
  for(const p of world.props){if(p.dead||p.kind==="piano")continue;
    if(Math.hypot(nx-p.x,nz-p.z)<rr+p.r){
      if(smash){p.explosive?explodeBarrel(p):breakProp(p);}
      else return false;}}
  const bx=[[rr,0],[-rr,0],[0,rr],[0,-rr]].some(([ox,oz])=>solidAt(nx+ox,e.z+oz));
  if(!bx)e.x=nx;else return false;
  const bz=[[rr,0],[-rr,0],[0,rr],[0,-rr]].some(([ox,oz])=>solidAt(e.x+ox,nz+oz));
  if(!bz)e.z=nz;else return false;
  return true;}
function fireOrb(e,spreadA,tox){
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
  const mat=new THREE.MeshBasicMaterial({color:col});
  const oy=e.fly?(e.flyH||1.5):e.h*.6+(e.fy||0);
  const m=new THREE.Mesh(orbGeo,mat);m.position.set(e.x,oy,e.z);
  if(ot==="manc")m.scale.setScalar(1.6);
  projectiles.orbs.push({m,vx:Math.sin(a)*spd,vz:Math.cos(a)*spd,
    vy:((player.pyy-.2)-oy)/(dist/spd),dmg,life:3.2,tox,col});
  renderState.scene.add(m);
  blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90);}
function throwFlesh(e){
  const dx=player.px-e.x,dz=player.pz-e.z,dist=Math.hypot(dx,dz);
  const a=Math.atan2(dx,dz)+rnd(-.05,.05);
  const oy=e.fly?(e.flyH||1.5):e.h*.55+(e.fy||0);
  const m=new THREE.Mesh(gibGeo,gibMatsFlesh[0].clone());
  m.position.set(e.x,oy,e.z);m.scale.setScalar(1.9);
  const spd=10;
  projectiles.orbs.push({m,vx:Math.sin(a)*spd,vz:Math.cos(a)*spd,
    vy:((player.pyy-.2)-oy)/(dist/spd)+1.0,dmg:14,life:2.4,flesh:true,spin:rnd(6,12),col:0x8c1e10});
  renderState.scene.add(m);
  blood(e.x,oy,e.z,6,1.6);    // it rips the chunk out of its own body
  e.hp-=3;                    // Blood-style self-mutilation
  gurgle(.22,.32);growl(150,.22,.22);}
function priestTeleport(e,far){
  smoke3d(e.x,1.2,e.z,16);blip(700,.25,"sine",.1,140,true);
  for(let tries=0;tries<24;tries++){
    const a=rnd(0,6.28),d=far?rnd(7,11):rnd(4,7);
    const nx=player.px+Math.sin(a)*d,nz=player.pz+Math.cos(a)*d;
    if(!solidAt(nx,nz)&&los(nx,nz,player.px,player.pz)){e.x=nx;e.z=nz;break;}}
  smoke3d(e.x,1.2,e.z,16);fireP(e.x,1,e.z,6);
  blip(140,.25,"sine",.12,700,true);}
function enemyTick(dt){
  let anyAware=false;
  for(const e of world.enemies){
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
        bang(.18,.5,600);shake(.2);
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
        say(e.elite?"see_elite":"see_"+e.key);snarl(e.key);}
      e.alertX=player.px;e.alertZ=player.pz;
      /* ===== BOSS BRAINS ===== */
      if(e.priest){priestThink(e,dt,dist,dx,dz);continue;}
      if(e.key==="E"&&e.charge){
        if(e.charging>0){
          e.charging-=dt;
          if(!moveEnemy(e,e.cdx,e.cdz,13,dt)){e.charging=0;e.stun=1;bang(.2,.5,400);shake(.25);}
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
        growl(180,.9,.4,true);blip(500,.7,"sawtooth",.1,180,true);
        for(const o of world.enemies){if(o.dead||o.dormant||o===e)continue;
          if(Math.hypot(o.x-e.x,o.z-e.z)<16){o.alertX=player.px;o.alertZ=player.pz;o.slow=1;
            o.frenzy=5;}}
        showMsg("THE SCREAMER CALLS THE DEAD");
        continue;}
      /* ranged */
      if(e.range&&dist<e.range&&e.cool<=0&&dist>3){
        e.cool=e.stone?2.6:e.orb==="manc"?2.8:e.burst?2.6:2.3;
        if(e.stone){fireOrb(e,-.14);fireOrb(e,0);fireOrb(e,.14);}
        else if(e.twin){fireOrb(e,-.1);setTimeout(()=>{if(!e.dead)fireOrb(e,.1);},220);} // mancubus
        else if(e.orb==="centaur"){ // Slaughtaur: two quick blue bolts
          fireOrb(e,-.05);setTimeout(()=>{if(!e.dead)fireOrb(e,.05);},180);}
        else if(e.burst){ // Afrit: spread of fireballs
          fireOrb(e,-.12);fireOrb(e,0);fireOrb(e,.12);}
        else fireOrb(e,rnd(-.04,.04),e.toxic);}
      /* lost soul charge — telegraph then dash */
      if(e.charger&&dist>2.5&&dist<13&&e.lungeT<=0){
        e.lungeT=2.4;e.kx=dx/dist*16;e.kz=dz/dist*16;e.stun=0;
        blip(700,.3,"sawtooth",.12,1400);shake(.08);}
      /* flesh fling — tears a chunk from its own body and throws it */
      if(e.fling&&dist>3&&dist<12&&e.flingCD<=0&&Math.random()<.7){
        e.flingCD=rnd(3.5,6);e.stun=.25;
        throwFlesh(e);}
      /* brute slam */
      if(e.slam&&dist<2.9&&e.slamT<=0){
        e.slamT=4;e.stun=.5;
        setTimeout(()=>{if(e.dead)return;
          shake(.35);bang(.3,.6,300);smoke3d(e.x,.3,e.z,10);
          if(Math.hypot(player.px-e.x,player.pz-e.z)<3.1){damagePlayer(24);
            player.vx+=(player.px-e.x)*3;player.vz+=(player.pz-e.z)*3;}},480);
        blip(80,.4,"sawtooth",.14,40);}
      /* dog lunge */
      if(e.lunge&&dist>2&&dist<4.5&&e.lungeT<=0){
        e.lungeT=2.6;e.kx=dx/dist*9;e.kz=dz/dist*9;
        blip(500,.2,"sawtooth",.1,260);}
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
        blip(140,.12,"sawtooth",.1,60);}
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
function priestThink(e,dt,dist,dx,dz){
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
/* expanding shockwave ring — jump to dodge */
const ringMatBase=new THREE.MeshBasicMaterial({color:0x9a4ae0,transparent:true,opacity:.6,side:THREE.DoubleSide});
function spawnRing(x,z){
  const m=new THREE.Mesh(new THREE.RingGeometry(.1,.45,28),ringMatBase.clone());
  m.rotation.x=-Math.PI/2;m.position.set(x,.06,z);renderState.scene.add(m);
  world.rings.push({m,x,z,r:.3,hitDone:false});
  bang(.3,.5,250);blip(60,.5,"sawtooth",.16,30,true);shake(.2);}
function ringTick(dt){
  for(let i=world.rings.length-1;i>=0;i--){const r=world.rings[i];
    r.r+=6.5*dt;
    r.m.scale.set(r.r/.3,r.r/.3,1);
    r.m.material.opacity=Math.max(0,.6-r.r*.055);
    const pd=Math.hypot(player.px-r.x,player.pz-r.z);
    if(!r.hitDone&&Math.abs(pd-r.r)<.5&&player.pyy<EYE+.18){
      r.hitDone=true;damagePlayer(20);player.vx+=(player.px-r.x)/Math.max(pd,.2)*5;player.vz+=(player.pz-r.z)/Math.max(pd,.2)*5;}
    for(const p of world.props){if(p.dead)continue;
      if(Math.abs(Math.hypot(p.x-r.x,p.z-r.z)-r.r)<.5)
        p.explosive?explodeBarrel(p):breakProp(p);}
    if(r.r>9){renderState.scene.remove(r.m);world.rings.splice(i,1);}}}
/* falling debris strikes (priest P3) */
function spawnStrike(){
  for(let tries=0;tries<16;tries++){
    const a=rnd(0,6.28),d=rnd(1,5.5);
    const x=player.px+Math.sin(a)*d,z=player.pz+Math.cos(a)*d;
    if(solidAt(x,z))continue;
    const warn=new THREE.Mesh(new THREE.CircleGeometry(1,10),
      new THREE.MeshBasicMaterial({color:0x150a1e,transparent:true,opacity:.7}));
    warn.rotation.x=-Math.PI/2;warn.position.set(x,.025,z);renderState.scene.add(warn);
    world.strikes.push({x,z,t:.85,warn});
    blip(1200,.4,"sine",.05,300);
    return;}}
function strikeTick(dt){
  for(let i=world.strikes.length-1;i>=0;i--){const s=world.strikes[i];
    s.t-=dt;
    s.warn.material.opacity=.4+Math.sin(performance.now()*.02)*.3;
    if(s.t<=0){
      renderState.scene.remove(s.warn);
      spawnGibs(s.x,WALLH-.4,s.z,5,3,true);
      smoke3d(s.x,1.4,s.z,10);sparks(s.x,1,s.z,6);
      bang(.25,.5,400);shake(.18);
      if(Math.hypot(player.px-s.x,player.pz-s.z)<1.3)damagePlayer(18);
      for(const p of world.props){if(!p.dead&&Math.hypot(p.x-s.x,p.z-s.z)<1.3)
        p.explosive?explodeBarrel(p):breakProp(p);}
      world.strikes.splice(i,1);}}}
function poisonTick(dt){
  for(let i=world.poisonZones.length-1;i>=0;i--){const zn=world.poisonZones[i];
    zn.t-=dt;
    if(Math.random()<.5)toxicP(zn.x+rnd(-zn.r,zn.r)*.7,.2,zn.z+rnd(-zn.r,zn.r)*.7,1);
    if(Math.hypot(player.px-zn.x,player.pz-zn.z)<zn.r){damagePlayer(6*dt,true);}
    if(zn.t<=0)world.poisonZones.splice(i,1);}}

/* ============================================================
   RANDOM EVENTS
   ============================================================ */
function eventTick(dt){
  if(ambienceState.darkT>0){ambienceState.darkT-=dt;
    if(ambienceState.darkT<=0){renderState.ambLight.intensity=ambienceState.savedAmb;
      for(const tc of world.torches)tc.L.visible=true;
      showMsg("THE LIGHT RETURNS");}}
  world.eventT-=dt;if(world.eventT>0)return;
  world.eventT=rnd(55,100);
  const r=Math.random();
  if(r<.45){ /* blackout */
    ambienceState.savedAmb=renderState.ambLight.intensity;renderState.ambLight.intensity=.12;
    for(const tc of world.torches)tc.L.visible=false;
    ambienceState.darkT=8;say("event_dark",true);
    blip(50,2,"sine",.1,30,true);bang(.4,.1,300);
  }else if(r<.8&&S.level===1){ /* the bells */
    bellToll();say("event_bell",true);
    for(const e of world.enemies){if(!e.dead&&!e.dormant)e.frenzy=7;}
    showMsg("THE BELLS ARE RINGING",3);
  }else{ /* whispers */
    for(let i=0;i<3;i++)setTimeout(()=>blip(rnd(300,500),.7,"sine",.025,rnd(120,200),true),i*600);}}

/* ============================================================
   PLAYABLE PIANO
   ============================================================ */
const WHITE=[[60,"A"],[62,"S"],[64,"D"],[65,"F"],[67,"G"],[69,"H"],[71,"J"],[72,"K"],[74,"L"],[76,";"]];
const BLACK=[[61,"W",0],[63,"E",1],[66,"T",3],[68,"Y",4],[70,"U",5],[73,"O",7],[75,"P",8]];
const KEYMAP={KeyA:60,KeyS:62,KeyD:64,KeyF:65,KeyG:67,KeyH:69,KeyJ:71,KeyK:72,KeyL:74,Semicolon:76,
  KeyW:61,KeyE:63,KeyT:66,KeyY:68,KeyU:70,KeyO:73,KeyP:75};
function buildPiano(){
  const wrap=document.getElementById("pkeys");
  WHITE.forEach(([midi,label])=>{
    const k=document.createElement("div");k.className="wk";
    k.innerHTML="<span>"+label+"</span>";
    k.addEventListener("mousedown",()=>pressKey(midi));
    wrap.appendChild(k);pianoState.keyEls[midi]=k;});
  BLACK.forEach(([midi,label,after])=>{
    const k=document.createElement("div");k.className="bk";
    k.style.left=(after*43+43-13)+"px";
    k.innerHTML="<span>"+label+"</span>";
    k.addEventListener("mousedown",ev=>{ev.stopPropagation();pressKey(midi);});
    wrap.appendChild(k);pianoState.keyEls[midi]=k;});}
function pressKey(midi){
  pianoNote(midi);
  S.pianoNotes++;
  const el=pianoState.keyEls[midi];
  if(el){el.classList.add("on");setTimeout(()=>el.classList.remove("on"),140);}
  pianoState.noteHist.push(midi);if(pianoState.noteHist.length>8)pianoState.noteHist.shift();
  if(S.pianoNotes===12)ach(ACHIEVEMENTS.pianist,S.ach);
  /* E D C D E E E — recital */
  const want=[64,62,60,62,64,64,64];
  if(pianoState.noteHist.length>=7&&want.every((m,i)=>pianoState.noteHist[pianoState.noteHist.length-7+i]===m)){
    pianoState.noteHist=[];
    ach(ACHIEVEMENTS.recital,S.ach);
    say("piano_played",true);organChord();
    if(world.pianoPos)world.items.push({kind:"crosses",x:world.pianoPos.x+1.4,z:world.pianoPos.z,
      sp:addSprite(ITEMTEX.crosses,world.pianoPos.x+1.4,world.pianoPos.z,.55,.55,.5),bob:0});}}
function pianoKeyDown(code){const m=KEYMAP[code];if(m)pressKey(m);}
function openPiano(){
  game.pianoOpen=true;input.firing=false;
  document.getElementById("piano").style.display="flex";
  document.exitPointerLock();
  say("piano",true);}
function closePiano(){
  game.pianoOpen=false;
  document.getElementById("piano").style.display="none";
  renderState.renderer.domElement.requestPointerLock();}

/* ============================================================
   LEVEL END + WIN + HUD
   ============================================================ */
function gradeOf(){
  const acc=S.shots>0?S.hitsLanded/S.shots:0;
  const score=(S.enemiesTotal?S.kills/S.enemiesTotal:1)*40+
    (S.secretsTotal?S.secrets/S.secretsTotal:1)*25+Math.min(1,acc)*25+
    Math.min(1,S.propsBroken/10)*10;
  if(acc>=.7)ach(ACHIEVEMENTS.deadeye,S.ach);
  return score>=85?"S":score>=70?"A":score>=55?"B":score>=40?"C":"D";}
function statsHtml(){
  const t=((performance.now()-S.levelT0)/1000)|0;
  const acc=S.shots>0?Math.round(100*S.hitsLanded/S.shots):0;
  return `KILLS <b>${S.kills} / ${S.enemiesTotal}</b> · GIBBED <b>${S.gibs}</b><br>`+
    `SECRETS <b>${S.secrets} / ${S.secretsTotal}</b> · OBJECTS BROKEN <b>${S.propsBroken}</b><br>`+
    `ACCURACY <b>${acc}%</b> · TIME <b>${(t/60|0)}:${String(t%60).padStart(2,"0")}</b>`;}
function endLevel(){
  if(S.won)return;S.won=true;
  save.maxLevel=Math.max(save.maxLevel,Math.min(S.level+1,LEVELS.length-1));
  stopBossMusic();document.exitPointerLock();
  document.getElementById("legrade").textContent=gradeOf();
  document.getElementById("lestats").innerHTML=statsHtml();
  const nextName=LEVELS[S.level+1]?LEVELS[S.level+1].name.replace(/^LEVEL \d+ — /,""):"";
  document.getElementById("lebtn").textContent="[ DESCEND TO "+nextName+" ]";
  document.getElementById("levelend").classList.remove("hidden");}
document.getElementById("lebtn").addEventListener("click",()=>{
  document.getElementById("levelend").classList.add("hidden");
  S.won=false;
  loadLevel(S.level+1);
  renderState.renderer.domElement.requestPointerLock();});
function showWin(){
  if(S.dead)return;S.won=true;
  stopBossMusic();document.exitPointerLock();
  document.getElementById("wingrade").textContent=gradeOf();
  document.getElementById("winstats").innerHTML=statsHtml()+
    `<br>ACHIEVEMENTS <b>${Object.keys(S.ach).length}</b> · TOTAL KILLS <b>${S.totKills}</b>`;
  document.getElementById("win").classList.remove("hidden");}
function hud(){
  document.querySelector("#hp .num").textContent=Math.max(0,Math.ceil(S.hp));
  document.querySelector("#ar .num").textContent=Math.ceil(S.armor);
  const w=WEAPONS[S.cur];
  document.querySelector("#am .num").innerHTML=
    S.mag[S.cur]+'<span class="sub2"> | '+S.ammo[w.ammo]+"</span>";
  document.getElementById("wname").textContent=
    w.name+(weaponRuntime.wstate==="reload"?" — RELOADING":"");
  document.getElementById("keys").textContent=S.key?"■ RED KEY":"";
  const kw=document.getElementById("kickwrap");
  document.getElementById("kickfill").style.width=(100*(1-S.kickCd/15))+"%";
  document.getElementById("kicklabel").textContent=
    S.kickCd>0?("KICK "+Math.ceil(S.kickCd)+"s"):"KICK [RMB]";
  kw.classList.toggle("ready",S.kickCd<=0);
  const boss=world.enemies&&world.enemies.find(e=>e.boss&&!e.dead&&!e.dormant);
  const bb=document.getElementById("bossbar");
  if(boss&&!world.cine){bb.style.display="block";
    document.getElementById("bossname").textContent=
      boss.name+(boss.priest?" — PHASE "+boss.phase:"");
    document.getElementById("bossfill").style.width=(100*boss.hp/boss.maxhp)+"%";}
  else bb.style.display="none";}

/* ============================================================
   IDLE QUIPS + SUBTITLE TIMER
   ============================================================ */
function chatterTick(dt,anyAware){
  tickSubtitles(dt);
  if(anyAware){world.idleT=rnd(26,40);return;}
  world.idleT-=dt;
  if(world.idleT<=0){world.idleT=rnd(26,40);say("idle");}}

/* ============================================================
   MAIN LOOP + BOOT
   ============================================================ */
function startGame(idx){
  if(game.started)return;
  document.getElementById("intro").classList.add("hidden");
  document.getElementById("chapsel").classList.add("hidden");
  document.getElementById("settings").classList.add("hidden");
  game.started=true;
  audioInit();
  buildTextures();buildSprites();buildItemTex();buildWeaponSprites();buildPiano();
  loadLevel(idx||0);
  S.t0=performance.now();
  renderState.renderer.domElement.requestPointerLock();}
/* ---- menu navigation ---- */
function showScreen(id){
  ["intro","chapsel","settings"].forEach(s=>
    document.getElementById(s).classList.toggle("hidden",s!==id));}
document.getElementById("mNew").addEventListener("click",()=>{save.maxLevel=0;startGame(0);});
document.getElementById("mSettings").addEventListener("click",()=>showScreen("settings"));
document.getElementById("setBack").addEventListener("click",()=>showScreen("intro"));
document.getElementById("chapBack").addEventListener("click",()=>showScreen("intro"));
document.getElementById("mChapter").addEventListener("click",()=>{
  const list=document.getElementById("chaplist");
  list.innerHTML="";
  LEVELS.forEach((lv,i)=>{
    const unlocked=i<=save.maxLevel;
    const row=document.createElement("div");
    const label=lv.name.replace(/^(LEVEL \d+|PROLOGUE)\s*—\s*/,"");
    const tag=i===0?"PROLOGUE":"CH "+i;
    row.className="mbtn"+(unlocked?"":" locked");
    row.textContent=unlocked?("[ "+tag+" · "+label+" ]"):("[ "+tag+" · LOCKED ]");
    if(unlocked)row.addEventListener("click",()=>startGame(i));
    list.appendChild(row);});
  showScreen("chapsel");});
/* ---- settings: master volume ---- */
(function(){
  const sl=document.getElementById("volSlider"),vv=document.getElementById("volVal");
  sl.value=Math.round(getMasterVolume()*100);vv.textContent=sl.value;
  sl.addEventListener("input",()=>{
    setMasterVolume(sl.value/100);vv.textContent=sl.value;});
})();

function loop(t){
  requestAnimationFrame(loop);
  let dt=Math.min(.05,(t-game.last)/1000);game.last=t;
  if(!game.started){return;}
  if(screenShake.hitStop>0){screenShake.hitStop-=dt;dt*=.08;}
  const paused=game.pianoOpen||overlayOpen()&&!game.pianoOpen;
  let anyAware=false;
  if(!paused&&!S.dead&&!S.won){
    cineTick(dt);
    playerTick(dt);weaponTick(dt);
    anyAware=enemyTick(dt)||false;
    projTick(dt);ringTick(dt);strikeTick(dt);poisonTick(dt);
    itemsTick(dt);doorTick(dt);propTick(dt);
    eventTick(dt);ambience(dt);vitalsAudio(dt);
    chatterTick(dt,anyAware);
    tickMessage(dt);}
  if(renderState.scene){
    partTick(dt);gibTick(dt);poolTick(dt);headTick(dt);torchTick(dt,t);
    fxTick(dt,t,weaponRuntime.zoomLerp,
      ()=>drawKickBoot(weaponRuntime.kickAnim),
      (fdt,ft)=>drawViewmodel(fdt,ft,{
        started:game.started,dead:S.dead,pianoOpen:game.pianoOpen,zoomLerp:weaponRuntime.zoomLerp,cur:S.cur,vx:player.vx,vz:player.vz,
        sprintKey:!!(keys.ShiftLeft||keys.ShiftRight),bobT:player.bobT,wstate:weaponRuntime.wstate,wtime:weaponRuntime.wtime,
        equipT:EQUIP_T,unequipT:UNEQUIP_T,kickAmt:weaponRuntime.kickAmt,kickRot:weaponRuntime.kickRot,swayX:input.swayX,swayY:input.swayY,muzzle:weaponRuntime.muzzle,
      },WEAPONS));
    hud();
    renderState.renderer.render(renderState.scene,renderState.camera);}}
requestAnimationFrame(loop);

import * as THREE from "three";
import { clamp, pick, rnd } from "./utils/math";
import { MONOLOGUE as M } from "./content/monologue";
import { LEVELS } from "./world/levels/index";
import { WEAPON_STATS } from "./weapons/definitions";
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
import { screenShake } from "./fx/ShakeState";
import { headPool } from "./fx/Heads";
import { projectiles } from "./fx/Projectiles";
import { save } from "./save/SaveGame";
import { pianoState } from "./ui/PianoState";
import { ambienceState } from "./world/AmbienceState";
import { world } from "./world/WorldState";
import { ejectCasing, screenBlood, fxTick } from "./render/Overlay2D";
import { buildWeaponSprites } from "./render/viewmodel/sprites";
import { drawKickBoot, drawViewmodel } from "./render/viewmodel/draw";
import { ACHIEVEMENTS } from "./content/achievements";
import { say, tickSubtitles } from "./ui/Subtitles";
import { ach } from "./ui/Toasts";
import { showMsg, tickMessage, flashDmg, flashHoly } from "./ui/HudMessages";
import { keys, setInputHooks, overlayOpen, getYaw, setYaw, getPitch, setPitch,
  getSwayX, setSwayX, getSwayY, setSwayY, isFiring, setFiring, isZoomOn, setZoomOn } from "./player/Input";
import { game } from "./core/Game";
import { weaponRuntime } from "./weapons/WeaponRuntime";

/* ============================================================
   THE BLACK SILENCE — The Hollow Parish (v3 gothic overhaul)
   2 levels · 9 enemy types + elites · 3 bosses · 6 weapons ·
   power kick · destructibles · playable piano · monologues
   ============================================================ */
const CELL=2, WALLH=3.4, EYE=1.0;

/* ============================================================
   GLOBAL STATE
   ============================================================ */
const S={hp:100,armor:0,key:false,dead:false,won:false,level:0,
  kills:0,gibs:0,secrets:0,secretsTotal:0,shots:0,hitsLanded:0,propsBroken:0,
  totKills:0,totGibs:0,totSecrets:0,t0:0,levelT0:0,
  ammo:{bullets:60,shells:0,slugs:0,crosses:0,nails:0,souls:0},
  mag:[6,0,0,0,0,0,0,0],weapons:[true,false,false,false,false,false,false,false],cur:0,
  kickCd:0,pianoNotes:0,ach:{}};


/* ============================================================
   THREE CORE
   ============================================================ */
renderState.camera=new THREE.PerspectiveCamera(78,4/3,.05,90);
renderState.renderer=new THREE.WebGLRenderer({canvas:document.getElementById("game"),antialias:false});
renderState.renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderState.renderer.toneMappingExposure=1.15;
if(THREE.sRGBEncoding!==undefined)renderState.renderer.outputEncoding=THREE.sRGBEncoding;
function sizeRender(){const a=innerWidth/innerHeight,w=400,h=Math.round(w/a);
  renderState.renderer.setSize(w,h,false);renderState.camera.aspect=a;renderState.camera.updateProjectionMatrix();
  const c=renderState.renderer.domElement;c.style.width="100%";c.style.height="100%";}
addEventListener("resize",sizeRender);sizeRender();
function shake(a){screenShake.trauma=Math.min(1,screenShake.trauma+a);}

const blobTexC=document.createElement("canvas");blobTexC.width=blobTexC.height=32;
{const g=blobTexC.getContext("2d");const gr=g.createRadialGradient(16,16,2,16,16,16);
 gr.addColorStop(0,"rgba(0,0,0,.55)");gr.addColorStop(1,"rgba(0,0,0,0)");
 g.fillStyle=gr;g.fillRect(0,0,32,32);}
const blobTex=new THREE.CanvasTexture(blobTexC);
function addSprite(tex,wx,wz,sw,sh,y){
  const m=new THREE.SpriteMaterial({map:tex,transparent:true});
  const sp=new THREE.Sprite(m);sp.scale.set(sw,sh,1);
  sp.position.set(wx,y!==undefined?y:sh/2,wz);renderState.scene.add(sp);return sp;}
function addBlob(wx,wz,s){const m=new THREE.Mesh(new THREE.PlaneGeometry(s,s),
  new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(wx,.012,wz);renderState.scene.add(m);return m;}

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

/* ============================================================
   WEAPONS — 8 slots, state machine, interruptible reloads
   Stats live in src/weapons/definitions.ts as WEAPON_STATS; the sound
   closures stay here until Plan 0B extracts the audio layer.
   ============================================================ */
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
const WEAPONS = WEAPON_STATS.map((w, i) => ({ ...w, snd: WEAPON_SOUNDS[i] }));
const EQUIP_T=.24,UNEQUIP_T=.16;
function requestSwitch(i){
  if(!game.started||!S.weapons[i]||i===S.cur||weaponRuntime.pending===i)return;
  weaponRuntime.pending=i;setZoomOn(false);
  if(weaponRuntime.wstate!=="unequip"){weaponRuntime.wstate="unequip";weaponRuntime.wtime=0;click(.12);}}
function startReload(){
  if(!game.started||S.dead||game.inputLock)return;
  const w=WEAPONS[S.cur];
  if(weaponRuntime.wstate!=="idle"&&weaponRuntime.wstate!=="fire")return;
  if(S.mag[S.cur]>=w.magSize||S.ammo[w.ammo]<=0)return;
  weaponRuntime.wstate="reload";weaponRuntime.wtime=0;weaponRuntime.reloadFlags={};}
function weaponTick(dt){
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
    if(isFiring()&&S.mag[S.cur]>0){weaponRuntime.wstate="idle";weaponRuntime.wtime=0;}}
  if(isFiring()&&(weaponRuntime.wstate==="idle"||weaponRuntime.wstate==="fire")&&weaponRuntime.wCool<=0&&!S.dead&&game.started&&!game.inputLock){
    if(S.mag[S.cur]<=0){
      if(S.ammo[w.ammo]>0)startReload();
      else{click(.1);weaponRuntime.wCool=.3;}}        // dry click, not a beep
    else fire(w);}
  if(weaponRuntime.wstate==="idle"&&S.mag[S.cur]===0&&S.ammo[w.ammo]>0&&weaponRuntime.wtime>.4)startReload();
  weaponRuntime.kickAmt*=Math.exp(-10*dt);weaponRuntime.kickRot*=Math.exp(-9*dt);
  weaponRuntime.muzzle=Math.max(0,weaponRuntime.muzzle-dt*9);
  renderState.muzzleLight.intensity*=Math.exp(-16*dt);
  renderState.boomLight.intensity*=Math.exp(-7*dt);
  setSwayX(getSwayX()*Math.exp(-7*dt));setSwayY(getSwayY()*Math.exp(-7*dt));
  /* sniper zoom */
  const zt=(S.cur===4&&isZoomOn())?1:0;
  weaponRuntime.zoomLerp+=(zt-weaponRuntime.zoomLerp)*Math.min(1,dt*9);
  renderState.camera.fov=78-46*weaponRuntime.zoomLerp;renderState.camera.updateProjectionMatrix();
  /* kick cooldown */
  if(S.kickCd>0){S.kickCd-=dt;
    if(S.kickCd<=0){say("kickready");click(.12);}}
  weaponRuntime.kickAnim=Math.max(0,weaponRuntime.kickAnim-dt);}
function fire(w){
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
  alertSound(px,pz,18);
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
function doKick(){
  if(!game.started||S.dead||game.inputLock||S.kickCd>0||game.pianoOpen)return;
  S.kickCd=15;weaponRuntime.kickAnim=.32;
  shake(.3);bang(.15,.5,900);
  setTimeout(()=>{
    const dir=new THREE.Vector3();renderState.camera.getWorldDirection(dir);
    let hitAny=false;
    for(const e of world.enemies){if(e.dead)continue;
      const dx=e.x-px,dz=e.z-pz,d=Math.hypot(dx,dz);
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
    for(const p of world.props){if(p.dead)continue;
      const dx=p.x-px,dz=p.z-pz,d=Math.hypot(dx,dz);
      if(d>2.6)continue;
      const dot=(dx*dir.x+dz*dir.z)/Math.max(.001,d);
      if(dot<.5)continue;
      hitAny=true;
      if(p.explosive)explodeBarrel(p);else breakProp(p);}
    if(hitAny){bang(.12,.4,500);shake(.15);screenShake.hitStop=Math.max(screenShake.hitStop,.03);}
  },110);}

/* ---------- HITSCAN ---------- */
const orbGeo=new THREE.SphereGeometry(.16,6,6);
function solidAt(wx,wz){
  const gx=wx/CELL|0,gz=wz/CELL|0;
  const row=world.grid[gz];if(!row)return true;
  const ch=row[gx];if(ch===undefined)return true;
  if(ch==="#"||ch==="I"||ch==="W")return true;
  if(ch==="+"||ch==="D"||ch==="S"){const d=world.doors[gx+","+gz];return d&&!d.open;}
  return false;}
/* ===== arbitrary (non-orthogonal) wall segments — the Doom/Blood look =====
   Each seg: {x1,z1,x2,z2}. Rendered as angled wall meshes; collided against
   with a point-to-segment distance test; line-of-sight blocked by crossing. */
function distToSeg(px_,pz_,s){
  const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz;
  let t=L2?((px_-s.x1)*dx+(pz_-s.z1)*dz)/L2:0;t=Math.max(0,Math.min(1,t));
  const cx=s.x1+t*dx,cz=s.z1+t*dz;
  return Math.hypot(px_-cx,pz_-cz);}
function segBlocked(x,z,rad){
  for(const s of world.wallSegs)if(distToSeg(x,z,s)<rad)return true;
  return false;}
function segsCrossRay(ax,az,bx,bz){ // does player->target ray cross any wall segment?
  for(const s of world.wallSegs){
    const d1x=bx-ax,d1z=bz-az,d2x=s.x2-s.x1,d2z=s.z2-s.z1;
    const den=d1x*d2z-d1z*d2x;if(Math.abs(den)<1e-6)continue;
    const t=((s.x1-ax)*d2z-(s.z1-az)*d2x)/den;
    const u=((s.x1-ax)*d1z-(s.z1-az)*d1x)/den;
    if(t>=0&&t<=1&&u>=0&&u<=1)return true;}
  return false;}
/* per-cell floor height (0 = base). Lets us build raised galleries,
   balconies and sunken courtyards you can look/shoot down into. */
function floorHeightAt(wx,wz){
  if(!world.heightMap)return 0;
  const gx=wx/CELL|0,gz=wz/CELL|0;
  const row=world.heightMap[gz];if(!row)return 0;
  return row[gx]||0;}
function wallNormal(x,z,dir){
  if(!solidAt(x-dir.x*.13,z))return{x:-Math.sign(dir.x),z:0};
  if(!solidAt(x,z-dir.z*.13))return{x:0,z:-Math.sign(dir.z)};
  return{x:-dir.x,z:-dir.z};}
function hitscan(dir,dmg,wIdx){
  const o=renderState.camera.position;
  const cands=[];
  world.enemies.forEach(e=>{if(e.dead||e.dormant)return;
    const ecy=e.fly?(e.flyH||1.5):e.h*.5+(e.fy||0);   // sprite center height
    const ex=e.x-o.x,ez=e.z-o.z,ey=ecy-o.y;
    const t=ex*dir.x+ez*dir.z+ey*dir.y;if(t<0)return;
    const cx=o.x+dir.x*t,cz=o.z+dir.z*t,cy=o.y+dir.y*t;
    const dd=Math.hypot(cx-e.x,cz-e.z);
    if(dd<e.w*.45+.1&&cy>ecy-e.h*.55&&cy<ecy+e.h*.55)cands.push({kind:"e",t,e,cy});});
  world.props.forEach(p=>{if(p.dead)return;
    const ex=p.x-o.x,ez=p.z-o.z;
    const t=ex*dir.x+ez*dir.z;if(t<0)return;
    const cx=o.x+dir.x*t,cz=o.z+dir.z*t,cy=o.y+dir.y*t;
    if(Math.hypot(cx-p.x,cz-p.z)<p.r+.08&&cy>0&&cy<p.hgt)cands.push({kind:"p",t,p});});
  let wallT=1e9,wx=0,wz=0,wy=0;
  for(let t=0;t<46;t+=.1){
    const sx=o.x+dir.x*t,sz=o.z+dir.z*t;
    if(solidAt(sx,sz)||(world.wallSegs.length&&segBlocked(sx,sz,.12))){wallT=t;wx=sx;wz=sz;wy=o.y+dir.y*t;break;}}
  cands.sort((a,b)=>a.t-b.t);
  const pierce=WEAPONS[wIdx]&&WEAPONS[wIdx].pierce||1;
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
        bang(.04,.12,1500,300);
        if(c.p.hp<=0)breakProp(c.p);}
      used++;if(used>=pierce)return;continue;}
    const e=c.e;
    weaponRuntime.volleyHit=true;
    const reg=PX[e.key].regions||{H:e.h,head:0};
    // vertical fraction up the sprite (0 feet .. 1 head)
    const ecy0=e.fly?(e.flyH||1.5):e.h*.5;
    const frac=clamp((c.cy-(ecy0-e.h*.5))/e.h,0,1);
    // horizontal: project hit point onto camera-right axis, normalized to half-width
    const rightX=Math.cos(getYaw()),rightZ=-Math.sin(getYaw());
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
    if(Math.random()<.3)bang(.03,.08,4000,800);}}
function crossExplode(x,y,z){
  flashHoly(.35);shake(.35);screenShake.hitStop=Math.max(screenShake.hitStop,.04);
  renderState.boomLight.position.set(x,y,z);renderState.boomLight.intensity=4;renderState.boomLight.color.setHex(0xfff0b0);
  holyP(x,y,z,40);smoke3d(x,y,z,10);
  boom(.7);
  for(const e of world.enemies){if(e.dead)continue;
    const d=Math.hypot(e.x-x,e.z-z);
    if(d<3.4){
      const dd=60*(1-d/3.4)+20;
      e.kx+=(e.x-x)/Math.max(.2,d)*6;e.kz+=(e.z-z)/Math.max(.2,d)*6;
      damageEnemy(e,dd,{explosive:true,dir:{x:(e.x-x)/Math.max(.2,d),z:(e.z-z)/Math.max(.2,d)}});}}
  for(const p of world.props){if(p.dead)continue;
    if(Math.hypot(p.x-x,p.z-z)<3){p.explosive?explodeBarrel(p):breakProp(p);}}
  alertSound(x,z,20);}

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
   WORLD STATE + LEVEL LOADER
   ============================================================ */
let px=3,pz=3,vx=0,vy=0,vz=0,pyy=EYE,grounded=true,bobT=0,lastBobSin=0,spawnGuard=0;
const R=.35;
function spawnEnemy(ch,wx,wz,summoned){
  const d=EDEF[ch];
  const elite=!d.boss&&!summoned&&Math.random()<.11;
  const SZ=1.18;                       // overall sprite presence bump
  const mul=elite?2:1;
  const ew=d.w*(elite?1.15:1)*SZ, eh=d.h*(elite?1.15:1)*SZ;
  const e={key:ch,name:d.name,x:wx,z:wz,hp:d.hp*mul,maxhp:d.hp*mul,
    speed:d.sp*(elite?1.15:1),mel:d.mel,w:ew,h:eh,
    pain:d.pain,kbRes:d.kbRes||0,boss:!!d.boss,priest:!!d.priest,stone:!!d.stone,
    charge:!!d.charge,slam:!!d.slam,lunge:!!d.lunge,dodge:!!d.dodge,
    scream:!!d.scream,toxic:!!d.toxic,range:d.range||0,plate:d.plate||0,
    sp:addSprite(PX[ch].a,wx,wz,ew,eh),
    blob:addBlob(wx,wz,ew*1.25),elite,summoned:!!summoned,
    cool:0,hurt:0,stun:0,kx:0,kz:0,flung:0,flungT:0,
    dead:false,gone:false,deathT:0,deathKind:0,deathDir:1,dropped:false,
    dodgeT:rnd(.6,2),strafe:0,strafeDir:1,flank:(Math.random()<.5?1:-1)*rnd(.3,.6),
    alertX:-1,alertZ:-1,aware:false,slow:1,animT:0,frame:0,r:d.boss?.8:.45,
    screamT:0,lungeT:rnd(1,2),slamT:rnd(2,4),flingCD:rnd(3,6),
    fy:floorHeightAt(wx,wz),
    dormant:!!d.boss,phase:1,tpT:5,atkT:2.5,sumT:6,ringT:4,debT:3,chT:5,charging:0,cdx:0,cdz:0};
  if(elite)e.sp.material.color.setHex(0xd8c878);
  world.enemies.push(e);
  if(!summoned)S.killsTotal=(S.killsTotal||0)+1;
  if(d.boss)world.bossRef=world.bossRef||e;
  return e;}
function spawnProp(ch,wx,wz){
  let m,r,hgt,hp,explosive=false,kind=ch;
  const wood=new THREE.MeshLambertMaterial({map:TEX.wood});
  if(ch==="x"){m=new THREE.Mesh(new THREE.BoxGeometry(.85,.85,.85),wood);
    m.position.set(wx,.43,wz);r=.55;hgt=.9;hp=22;}
  else if(ch==="T"){m=new THREE.Group();
    const top=new THREE.Mesh(new THREE.BoxGeometry(1.3,.1,.8),wood);top.position.y=.58;m.add(top);
    for(const[lx,lz]of[[-.5,-.3],[.5,-.3],[-.5,.3],[.5,.3]]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.1,.58,.1),wood);
      leg.position.set(lx,.29,lz);m.add(leg);}
    m.position.set(wx,0,wz);r=.62;hgt=.7;hp=26;}
  else if(ch==="C"){m=new THREE.Group();
    const seat=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.5),wood);seat.position.y=.4;m.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(.5,.55,.07),wood);back.position.set(0,.68,-.22);m.add(back);
    for(const[lx,lz]of[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.07,.4,.07),wood);
      leg.position.set(lx,.2,lz);m.add(leg);}
    m.position.set(wx,0,wz);m.rotation.y=rnd(0,6);r=.4;hgt=.9;hp=10;}
  else if(ch==="F"){m=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.7,.4),wood);
    m.position.set(wx,.85,wz);r=.6;hgt=1.7;hp=28;}
  else if(ch==="V"){m=new THREE.Group();
    const seat=new THREE.Mesh(new THREE.BoxGeometry(1.6,.09,.45),wood);seat.position.y=.42;m.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(1.6,.5,.08),wood);back.position.set(0,.7,-.2);m.add(back);
    const l1=new THREE.Mesh(new THREE.BoxGeometry(.1,.42,.42),wood);l1.position.set(-.7,.21,0);m.add(l1);
    const l2=new THREE.Mesh(new THREE.BoxGeometry(.1,.42,.42),wood);l2.position.set(.7,.21,0);m.add(l2);
    m.position.set(wx,0,wz);r=.75;hgt=.95;hp=18;}
  else{m=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,1.05,8),
    new THREE.MeshLambertMaterial({map:TEX.barrel}));
    m.position.set(wx,.525,wz);r=.48;hgt=1.1;hp=24;explosive=true;addBlob(wx,wz,1.1);}
  renderState.scene.add(m);
  world.props.push({m,x:wx,z:wz,r,hgt,hp,dead:false,explosive,kind,fuse:-1});}
function breakProp(p){
  if(p.dead)return;p.dead=true;renderState.scene.remove(p.m);S.propsBroken++;
  woodP(p.x,.5,p.z,12);spawnGibs(p.x,.55,p.z,6,3.4,true);
  bang(.12,.32,1200);bang(.08,.2,500);
  if(Math.random()<.2){
    const k=pick(["health","bullets","shells"]);
    world.items.push({kind:k,x:p.x,z:p.z,sp:addSprite(ITEMTEX[k],p.x,p.z,.55,.55,.5),bob:0});}
  if(S.propsBroken===15)ach(ACHIEVEMENTS.redec,S.ach);}
function explodeBarrel(b){
  if(b.dead)return;b.dead=true;renderState.scene.remove(b.m);S.propsBroken++;
  shake(.7);screenShake.hitStop=Math.max(screenShake.hitStop,.05);
  renderState.boomLight.position.set(b.x,1.2,b.z);renderState.boomLight.intensity=4;renderState.boomLight.color.setHex(0xff7830);
  fireP(b.x,.8,b.z,40);smoke3d(b.x,1,b.z,22);sparks(b.x,.8,b.z,18);
  spawnGibs(b.x,.8,b.z,6,5,true);
  const sc=new THREE.Mesh(new THREE.CircleGeometry(1.5,10),scorchMat);
  sc.rotation.x=-Math.PI/2;sc.position.set(b.x,.015,b.z);renderState.scene.add(sc);
  boom(1.1);
  const pd=Math.hypot(px-b.x,pz-b.z);
  if(pd<5)damagePlayer(60*(1-pd/5));
  for(const e of world.enemies){if(e.dead)continue;
    const dd=Math.hypot(e.x-b.x,e.z-b.z);
    if(dd<5){const f=Math.max(dd,.2);
      e.kx+=(e.x-b.x)/f*9;e.kz+=(e.z-b.z)/f*9;
      damageEnemy(e,70*(1-dd/5),{explosive:true,dir:{x:(e.x-b.x)/f,z:(e.z-b.z)/f}});}}
  for(const o of world.props){if(!o.dead&&o!==b&&Math.hypot(o.x-b.x,o.z-b.z)<4){
    if(o.explosive&&o.fuse<0)o.fuse=rnd(.15,.4);else breakProp(o);}}
  alertSound(b.x,b.z,22);}
function alertSound(x,z,radius){
  for(const e of world.enemies){if(e.dead||e.dormant)continue;
    if(Math.hypot(e.x-x,e.z-z)<radius){e.alertX=x;e.alertZ=z;}}}

function loadLevel(idx){
  S.level=idx;
  const Ldef=LEVELS[idx],L=Ldef.build();
  world.grid=L.g;world.GW=L.W;world.GH=L.H;
  world.heightMap=L.hmap||null;
  world.wallSegs=L.segs||[];
  renderState.scene=new THREE.Scene();
  setScene(renderState.scene);
  renderState.scene.background=new THREE.Color(Ldef.fog);
  renderState.scene.fog=new THREE.FogExp2(Ldef.fog,Ldef.fogD*1.5);
  renderState.ambLight=new THREE.AmbientLight(Ldef.amb,Ldef.ambI*0.42);renderState.scene.add(renderState.ambLight);
  renderState.lamp=new THREE.PointLight(0xffb060,1.7,9,1.6);renderState.scene.add(renderState.lamp);
  // a tighter hot core so the player is always in a warm pool that falls off to black
  renderState.lampCore=new THREE.PointLight(0xffd890,1.1,4.5,2);renderState.scene.add(renderState.lampCore);
  renderState.muzzleLight=new THREE.PointLight(0xffc878,0,14,1.4);renderState.scene.add(renderState.muzzleLight);
  renderState.boomLight=new THREE.PointLight(0xff7830,0,20,1.4);renderState.scene.add(renderState.boomLight);
  buildParticles();
  resetDecals();resetGibs();
  world.doors={};world.enemies=[];world.props=[];world.items=[];world.torches=[];world.candles=[];
  world.poisonZones=[];world.rings=[];world.strikes=[];projectiles.nails=[];projectiles.orbs=[];headPool.heads=[];
  world.exitPos=null;world.pianoPos=null;world.challenge=null;world.bossRef=null;world.cine=null;
  S.dead=false;S.won=false;S.hp=100;
  world.eventT=rnd(55,100);world.idleT=rnd(26,40);
  spawnGuard=2.0;   // brief invulnerability on entry
  S.kills=0;S.gibs=0;S.secrets=0;S.secretsTotal=0;S.shots=0;S.hitsLanded=0;
  S.propsBroken=0;S.killsTotal=0;S.key=false;S.levelT0=performance.now();
  const flesh=Ldef.flesh,hell=Ldef.hell,dungeon=Ldef.dungeon;
  const wallTex=hell?TEX.hellWall:flesh?TEX.fleshWall:(dungeon?TEX.dungeonWall:TEX.churchWall);
  const matWall=new THREE.MeshLambertMaterial({map:wallTex});
  const matWin=new THREE.MeshBasicMaterial({map:TEX.window});
  const wallGeo=new THREE.BoxGeometry(CELL,WALLH,CELL);
  const pilGeo=new THREE.CylinderGeometry(.46,.55,WALLH,8);
  const matPil=new THREE.MeshLambertMaterial({map:TEX.pillar});
  for(let z=0;z<world.GH;z++)for(let x=0;x<world.GW;x++){
    const ch=world.grid[z][x],wx=(x+.5)*CELL,wz=(z+.5)*CELL;
    if(ch==="#"||ch==="W"){
      let dx0=0,dz0=0,open=false;
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const r=world.grid[z+dz];
        if(r&&r[x+dx]&&"#W".indexOf(r[x+dx])<0){open=true;dx0=dx;dz0=dz;break;}}
      if(!open)continue;
      const m=new THREE.Mesh(wallGeo,matWall);m.position.set(wx,WALLH/2,wz);renderState.scene.add(m);
      if(ch==="W"){
        const gm=new THREE.Mesh(new THREE.PlaneGeometry(1.6,2.6),matWin);
        gm.position.set(wx+dx0*(CELL/2+.02),WALLH*.56,wz+dz0*(CELL/2+.02));
        gm.lookAt(wx+dx0*4,WALLH*.56,wz+dz0*4);renderState.scene.add(gm);
        const col=pick([0x5a3a8e,0x3a5a9e,0x9e3a3a]);
        const wl=new THREE.PointLight(col,1.1,9,1.5);
        wl.position.set(wx+dx0*1.7,WALLH*.6,wz+dz0*1.7);renderState.scene.add(wl);
        const cone=new THREE.Mesh(new THREE.ConeGeometry(1.2,WALLH-.6,8,1,true),
          new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.05,
            side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
        cone.position.set(wx+dx0*1.7,(WALLH-.6)/2,wz+dz0*1.7);renderState.scene.add(cone);}}
    else if(ch==="I"){
      const m=new THREE.Mesh(pilGeo,matPil);m.position.set(wx,WALLH/2,wz);renderState.scene.add(m);}
    else if(ch==="+"||ch==="D"||ch==="S"){
      let mat;if(ch==="S"){mat=matWall;S.secretsTotal++;}
      else mat=new THREE.MeshLambertMaterial({map:ch==="D"?TEX.doorLocked:(flesh?TEX.fleshDoor:TEX.door)});
      const m=new THREE.Mesh(wallGeo,mat);m.position.set(wx,WALLH/2,wz);renderState.scene.add(m);
      world.doors[x+","+z]={mesh:m,open:false,locked:ch==="D",secret:ch==="S",flesh:flesh&&ch!=="D"};}}
  const floorTex=(hell?TEX.hellFloor:flesh?TEX.fleshFloor:(dungeon?TEX.dungeonFloor:TEX.churchFloor)).clone();
  floorTex.needsUpdate=true;floorTex.repeat.set(world.GW,world.GH);
  floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;
  floorTex.magFilter=THREE.NearestFilter;floorTex.minFilter=THREE.NearestFilter;
  const fm=new THREE.Mesh(new THREE.PlaneGeometry(world.GW*CELL,world.GH*CELL),
    new THREE.MeshLambertMaterial({map:floorTex}));
  fm.rotation.x=-Math.PI/2;fm.position.set(world.GW*CELL/2,0,world.GH*CELL/2);renderState.scene.add(fm);
  const ceilTex=(hell?TEX.hellCeil:flesh?TEX.fleshCeil:TEX.ceil).clone();ceilTex.needsUpdate=true;ceilTex.repeat.set(world.GW,world.GH);
  ceilTex.wrapS=ceilTex.wrapT=THREE.RepeatWrapping;
  ceilTex.magFilter=THREE.NearestFilter;ceilTex.minFilter=THREE.NearestFilter;
  const cm=new THREE.Mesh(new THREE.PlaneGeometry(world.GW*CELL,world.GH*CELL),
    new THREE.MeshLambertMaterial({map:ceilTex}));
  cm.rotation.x=Math.PI/2;cm.position.set(world.GW*CELL/2,WALLH,world.GH*CELL/2);renderState.scene.add(cm);
  /* raised floor platforms (verticality) — a textured block per elevated cell */
  if(world.heightMap){
    const platTexTop=(hell?TEX.hellFloor:flesh?TEX.fleshFloor:(dungeon?TEX.dungeonFloor:TEX.churchFloor));
    const platTexSide=hell?TEX.stair:flesh?TEX.fleshWall:TEX.stair;
    const topMat=new THREE.MeshLambertMaterial({map:platTexTop});
    const sideMat=new THREE.MeshLambertMaterial({map:platTexSide});
    const pmats=[sideMat,sideMat,topMat,sideMat,sideMat,sideMat]; // box face order: +x,-x,+y,-y,+z,-z
    for(let z=0;z<world.GH;z++)for(let x=0;x<world.GW;x++){
      const hgt=world.heightMap[z]&&world.heightMap[z][x]||0;
      if(hgt<=0)continue;
      const wx=(x+.5)*CELL,wz=(z+.5)*CELL;
      const bg=new THREE.BoxGeometry(CELL,hgt,CELL);
      const bm=new THREE.Mesh(bg,pmats);
      bm.position.set(wx,hgt/2,wz);renderState.scene.add(bm);}}
  /* angled wall meshes from arbitrary segments — non-orthogonal Doom/Blood walls */
  if(world.wallSegs.length){
    const segMat=new THREE.MeshLambertMaterial({map:wallTex});
    for(const s of world.wallSegs){
      const len=Math.hypot(s.x2-s.x1,s.z2-s.z1);if(len<.01)continue;
      const geo=new THREE.BoxGeometry(len,WALLH,0.18);
      const m=new THREE.Mesh(geo,segMat);
      m.position.set((s.x1+s.x2)/2,WALLH/2,(s.z1+s.z2)/2);
      m.rotation.y=-Math.atan2(s.z2-s.z1,s.x2-s.x1);
      renderState.scene.add(m);}}
  for(let z=0;z<world.GH;z++)for(let x=0;x<world.GW;x++){
    const ch=world.grid[z][x];
    if(".#WI+DS".includes(ch))continue;
    const wx=(x+.5)*CELL,wz=(z+.5)*CELL;
    if(ch==="P"){px=wx;pz=wz;}
    else if(ch==="X"){world.exitPos={x:wx,z:wz};
      const ph=floorHeightAt(wx,wz);
      const pad=new THREE.Mesh(new THREE.BoxGeometry(CELL*1.3,.06,CELL*1.3),
        new THREE.MeshBasicMaterial({color:0x4a6b8a}));
      pad.position.set(wx,ph+.04,wz);renderState.scene.add(pad);
      const gl=new THREE.PointLight(0x4a6b8a,.9,6);gl.position.set(wx,ph+1,wz);renderState.scene.add(gl);}
    else if(ch==="i"){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,1.15,6),
        new THREE.MeshLambertMaterial({color:0x1a160f}));
      pole.position.set(wx,.575,wz);renderState.scene.add(pole);
      const fl=addSprite(ITEMTEX.torch[0],wx,wz,.45,.6,1.35);
      const Lt=new THREE.PointLight(0xff9838,1.6,10,1.8);
      Lt.position.set(wx,1.45,wz);renderState.scene.add(Lt);
      world.torches.push({L:Lt,sp:fl,x:wx,z:wz,seed:Math.random()*99,fr:0});}
    else if(ch==="l"){
      const c2=addSprite(ITEMTEX.candle,wx,wz,.25,.3,.18);
      world.candles.push({sp:c2,x:wx,z:wz,seed:Math.random()*99});}
    else if(ch==="p"){world.pianoPos={x:wx,z:wz};
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.0,.95),
        new THREE.MeshLambertMaterial({color:0x14100a}));
      body.position.set(wx,.5,wz);renderState.scene.add(body);
      const kb=new THREE.Mesh(new THREE.BoxGeometry(1.35,.06,.3),
        new THREE.MeshLambertMaterial({color:0xcfc8b8}));
      kb.position.set(wx,1.02,wz+.42);renderState.scene.add(kb);
      world.props.push({m:body,x:wx,z:wz,r:.95,hgt:1.2,hp:1e9,dead:false,explosive:false,kind:"piano"});}
    else if(ch==="Y"){world.challenge={x:wx,z:wz,state:0,spawned:[]};
      const plate=new THREE.Mesh(new THREE.CircleGeometry(.9,10),
        new THREE.MeshBasicMaterial({color:0x6a4ab8,transparent:true,opacity:.5}));
      plate.rotation.x=-Math.PI/2;plate.position.set(wx,.02,wz);renderState.scene.add(plate);
      const gl=new THREE.PointLight(0x6a4ab8,.7,5);gl.position.set(wx,.8,wz);renderState.scene.add(gl);
      world.challenge.plate=plate;world.challenge.light=gl;}
    else if(EDEF[ch])spawnEnemy(ch,wx,wz);
    else if("xTCFVO".includes(ch))spawnProp(ch,wx,wz);
    else{
      const map2={h:"health",A:"armor",a:"bullets",b:"shells",o:"slugs",c:"crosses",K:"key",
        "2":"w1","3":"w2","4":"w3","5":"w4","6":"w5","7":"w6","8":"w7","9":"nails","0":"souls"};
      const k=map2[ch];if(!k)continue;
      const tex=k[0]==="w"?ITEMTEX.gun:ITEMTEX[k];
      world.items.push({kind:k,x:wx,z:wz,sp:addSprite(tex,wx,wz,.55,.55,.5),bob:Math.random()*6});}
    world.grid[z][x]=".";}
  vx=vy=vz=0;pyy=EYE+floorHeightAt(px,pz);setYaw(Math.PI);setPitch(0);grounded=true;
  const lt=document.getElementById("lvltitle");
  lt.textContent=Ldef.name;lt.style.opacity=1;
  setTimeout(()=>lt.style.opacity=0,5000);
  showMsg(Ldef.name,3.4);
  setTimeout(()=>say("lvl"+idx,true),1400);}

/* ============================================================
   DAMAGE / DEATH
   ============================================================ */
function damageEnemy(e,dmg,info){
  info=info||{};
  if(e.dead)return;
  /* Hexen Centaur/Slaughtaur shield — blocks most frontal fire */
  if(e.shield&&!info.explosive&&info.dir){
    // facing roughly toward the shot source = blocked
    const toP=Math.atan2(px-e.x,pz-e.z);
    const shotDir=Math.atan2(-info.dir.x,-info.dir.z);
    let d=Math.abs(((toP-shotDir+Math.PI)%(2*Math.PI))-Math.PI);
    if(d<1.0){dmg*=0.25;bang(.04,.3,3000,800);sparks(info.hx||e.x,info.hy||e.h*.6,info.hz||e.z,4);}
  }
  if(e.plate>0&&!info.explosive){
    e.plate-=dmg;
    bang(.05,.32,2800,700);
    e.stun=Math.max(e.stun,.08);
    if(e.plate<=0){
      spawnGibs(e.x,e.h*.7,e.z,4,3.4,true);
      bang(.15,.35,900);showMsg("ARMOR SHATTERED");
      e.sp.material.color.setHex(0x8a9650);}
    return;}
  e.hp-=dmg;
  e.hurt=.12;e.sp.material.color.setHex(0xff8866);
  pain(clamp(e.pain*.35,70,360),.08+Math.random()*.04);
  const res=1-(e.kbRes||0);
  const kb=(info.explosive?7:(info.wIdx===1?5:info.wIdx===0?2.4:info.wIdx===4?6:info.wIdx===-1?0:1.1))*res;
  if(info.dir){e.kx+=info.dir.x*kb;e.kz+=info.dir.z*kb;}
  e.stun=Math.max(e.stun,(info.explosive?.5:(info.wIdx===1?.35:info.wIdx===4?.45:info.wIdx===0?.2:.08))*res+.02);
  if(info.leg&&!e.boss)e.slow=Math.min(e.slow,.6);
  if(e.boss&&e.dormant)wakeBoss(e);
  /* DISMEMBERMENT while still alive — big hits to a limb tear it off */
  if(!e.boss&&e.plate<=0&&PX[e.key].regions&&e.hp>0){
    e.sever=e.sever||{};
    const heavy=info.wIdx===1||info.wIdx===4||info.wIdx===0||info.explosive; // shotgun/sniper/pistol/boom
    const big=dmg>=22;
    if(info.arm&&big&&(heavy||Math.random()<.5)){
      const side=info.armSide;
      if(side==="L"&&!e.sever.lArm){e.sever.lArm=true;severLimb(e,"arm",info);}
      else if(side==="R"&&!e.sever.rArm){e.sever.rArm=true;severLimb(e,"arm",info);}}
    else if(info.leg&&big&&(heavy||Math.random()<.45)&&!e.sever.legs){
      e.sever.legs=true;severLimb(e,"legs",info);}
    refreshSeverSprite(e);}
  if(e.hp<=0)killEnemy(e,dmg,info);}
/* pick the right dismembered texture for the enemy's current sever state */
function refreshSeverSprite(e){
  const P=PX[e.key],s=e.sever||{};
  let key=null;
  if(s.legs)key="noLegs";
  if(s.lArm)key="noLArm";
  if(s.rArm)key="noRArm";
  if(s.lArm&&s.rArm)key="gibbed";
  if(!key)return;
  e.severKey=key;
  e.sp.material.map=P[key]||P.a;e.sp.material.needsUpdate=true;}
/* spawn a flying chunk for a torn-off limb + a wet sound */
function severLimb(e,type,info){
  const y=type==="legs"?e.h*.25:e.h*.55;
  const n=type==="legs"?5:4;
  spawnGibs(e.x,y,e.z,n,3.2);
  blood(e.x,y,e.z,12,2.2);
  addPool(e.x,e.z,rnd(.3,.5));
  gurgle(.25,.4);
  if(info&&info.dir){ // throw a big chunk in the shot direction
    spawnGibChunk(e.x,y,e.z,info.dir.x,info.dir.z);}
  showMsg(type==="legs"?"LEGS BLOWN OFF":"LIMB SEVERED");}
function killEnemy(e,finalDmg,info){
  e.dead=true;
  if(!e.summoned)S.kills++;
  S.totKills++;
  e.blob.scale.setScalar(1.6);
  /* Afrit death explosion */
  if(e.key==="q"){
    fireP(e.x,e.fy?e.fy+1:1,e.z,26);sparks(e.x,1,e.z,16);boom(.8);
    renderState.boomLight.position.set(e.x,1.2,e.z);renderState.boomLight.intensity=3.5;renderState.boomLight.color.setHex(0xff7830);
    const pd=Math.hypot(px-e.x,pz-e.z);
    if(pd<3.5&&Math.abs((e.fy||0)-(pyy-EYE))<2)damagePlayer(28*(1-pd/3.5));
    for(const o of world.enemies){if(o.dead||o===e)continue;
      if(Math.hypot(o.x-e.x,o.z-e.z)<3)o.hp-=30;}}
  if(info.wIdx===-1){S.kickK=(S.kickK||0)+1;
    if(S.kickK===3)ach(ACHIEVEMENTS.boot,S.ach);}
  if(S.totKills===1)ach(ACHIEVEMENTS.first,S.ach);
  if(S.totKills===60)ach(ACHIEVEMENTS.sixty,S.ach);
  alertSound(e.x,e.z,10);
  if(e.toxic){world.poisonZones.push({x:e.x,z:e.z,r:1.8,t:4.5});}
  if(e.boss){bossDeath(e);return;}
  const overkill=info.explosive||(-e.hp>22)||(info.wIdx===1&&info.dist<4.5);
  if(overkill){
    S.gibs++;S.totGibs++;
    e.gone=true;renderState.scene.remove(e.sp);renderState.scene.remove(e.blob);
    spawnGibs(e.x,e.h*.6,e.z,12,4.5);
    addPool(e.x,e.z,rnd(.8,1.2));
    shake(.22);screenShake.hitStop=Math.max(screenShake.hitStop,.045);
    bang(.2,.45,800);gurgle(.45,.5);
    if(Math.random()<.4)say("gib");
    if(S.totGibs===10)ach(ACHIEVEMENTS.organ,S.ach);
    if(Math.random()<.35)dropAmmo(e.x,e.z);
    return;}
  deathCry(clamp(e.pain*.3,42,200));
  e.deathT=0;
  if(info.head&&PX[e.key].head>0){
    e.deathKind=2;
    e.sp.material.map=(PX[e.key].noHead)||PX[e.key].hl;e.sp.material.needsUpdate=true;
    blood(e.x,e.h,e.z,22,2.8);
    spawnGibs(e.x,e.h,e.z,3,3.2);
    spawnHead(e,info);            // <-- the head pops off and can be kicked
    gurgle(.32,.45);shake(.16);
    showMsg("DECAPITATED");
    if(!S.beheads)S.beheads=0;
    if(++S.beheads===5)ach(ACHIEVEMENTS.behead,S.ach);
  } else e.deathKind=1;
  e.deathDir=Math.random()<.7?1:-1;
  if(info.dir){e.kx+=info.dir.x*2.5;e.kz+=info.dir.z*2.5;}
  addPool(e.x,e.z,rnd(.6,1));}
/* a severed head: a small sprite that arcs off the body, lands, and can be kicked */
function spawnHead(e,info){
  const tex=PX[e.key].a;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
  const sz=Math.max(.34,e.w*.34);
  sp.scale.set(sz,sz,1);
  sp.position.set(e.x,e.h*.92,e.z);
  renderState.scene.add(sp);
  const dx=info&&info.dir?info.dir.x:rnd(-1,1),dz=info&&info.dir?info.dir.z:rnd(-1,1);
  headPool.heads.push({sp,x:e.x,y:e.h*.92,z:e.z,
    vx:dx*rnd(2,4)+rnd(-1,1),vy:rnd(3.5,5.5),vz:dz*rnd(2,4)+rnd(-1,1),
    spin:rnd(-8,8),rest:false,life:30,sz});}
function headTick(dt){
  for(let i=headPool.heads.length-1;i>=0;i--){const h=headPool.heads[i];
    h.life-=dt;
    if(!h.rest){
      h.vy-=15*dt;
      h.x+=h.vx*dt;h.y+=h.vy*dt;h.z+=h.vz*dt;
      h.sp.material.rotation+=h.spin*dt;
      if(solidAt(h.x,h.z)){h.vx*=-.4;h.vz*=-.4;h.x-=h.vx*dt;h.z-=h.vz*dt;}
      if(h.y<=h.sz*.5){h.y=h.sz*.5;
        if(Math.abs(h.vy)>1.3){h.vy*=-.42;h.vx*=.6;h.vz*=.6;h.spin*=.6;
          if(Math.random()<.6)blood(h.x,h.y,h.z,3,1.2);
          if(Math.random()<.5)addPool(h.x,h.z,rnd(.2,.35));
          gurgle(.1,.18);}
        else{h.vy=0;h.vx*=.7;h.vz*=.7;h.spin*=.7;
          if(Math.abs(h.vx)<.2&&Math.abs(h.vz)<.2){h.rest=true;h.spin=0;}}}}
    // player kick: walk into it (or kick action) to punt it
    const pd=Math.hypot(h.x-px,h.z-pz);
    if(pd<.7){
      const a=Math.atan2(h.x-px,h.z-pz);
      const force=weaponRuntime.kickAnim>0?9:3.4;
      h.vx=Math.sin(a)*force;h.vz=Math.cos(a)*force;h.vy=weaponRuntime.kickAnim>0?5:2.2;
      h.spin=rnd(-12,12);h.rest=false;
      if(weaponRuntime.kickAnim>0){bang(.08,.3,500);blood(h.x,h.y,h.z,4,1.4);}}
    h.sp.position.set(h.x,h.y,h.z);
    if(h.life<=0){renderState.scene.remove(h.sp);headPool.heads.splice(i,1);}}}
function dropAmmo(x,z){
  const k=pick(["bullets","shells","bullets"]);
  world.items.push({kind:k,x,z,sp:addSprite(ITEMTEX[k],x,z,.55,.55,.5),bob:0});}
function bossDeath(e){
  stopBossMusic();
  shake(.7);screenShake.hitStop=Math.max(screenShake.hitStop,.12);
  bang(.6,.7,400);blip(50,1.4,"sawtooth",.2,28,true);
  spawnGibs(e.x,e.h*.6,e.z,10,5,e.stone);
  addPool(e.x,e.z,1.8);
  e.deathKind=1;e.deathT=0;e.deathDir=Math.random()<.5?1:-1;
  say("boss_dead",true);
  if(e.key==="E"){ach(ACHIEVEMENTS.exec,S.ach);
    showMsg("THE EXECUTIONER FALLS — TAKE THE KEY",4);}
  if(e.key==="U"){ach(ACHIEVEMENTS.guard,S.ach);
    showMsg("THE GUARDIAN CRUMBLES",3.5);}
  if(e.key==="Q"){ach(ACHIEVEMENTS.priest,S.ach);
    showMsg("THE PRIEST IS SILENCED — A STAIR OPENS DOWNWARD",4.5);
    openExit();}
  if(e.key==="Z"){ach(ACHIEVEMENTS.sovereign,S.ach);
    showMsg("THE SOVEREIGN IS UNMADE — A WAY OPENS",4.5);
    openExit();}
  if(e.key==="N"){ach(ACHIEVEMENTS.digger,S.ach);
    showMsg("THE GRAVEDIGGER LIES STILL — A DRAIN YAWNS OPEN",4.5);
    openExit();}
  if(e.key==="H"){ach(ACHIEVEMENTS.leviathan,S.ach);
    showMsg("THE LEVIATHAN COMES APART — A SERVICE LIFT GRINDS OPEN",4.5);
    openExit();}
  if(e.key==="V"){ach(ACHIEVEMENTS.foreman,S.ach);
    showMsg("THE FOREMAN GOES DARK — A WET TUNNEL OPENS BELOW",4.5);
    openExit();}
  if(e.key==="G"){ach(ACHIEVEMENTS.heart,S.ach);
    showMsg("THE HEART STOPS — AND SO DOES EVERYTHING",4.5);
    setTimeout(()=>showWin(),2800);}}
function openExit(){
  if(world.exitPos)return;
  // place exit on a guaranteed-open tile in the south processional area
  const cands=[[16,16],[16,15],[15,16],[17,16],[16,17]];
  let gx=16,gz=16;
  for(const[cx,cz] of cands){
    const wx=(cx+.5)*CELL,wz=(cz+.5)*CELL;
    if(!solidAt(wx,wz)){gx=cx;gz=cz;break;}}
  world.exitPos={x:(gx+.5)*CELL,z:(gz+.5)*CELL};
  const pad=new THREE.Mesh(new THREE.BoxGeometry(CELL*1.3,.06,CELL*1.3),
    new THREE.MeshBasicMaterial({color:0x4a6b8a}));
  pad.position.set(world.exitPos.x,.03,world.exitPos.z);renderState.scene.add(pad);
  const gl=new THREE.PointLight(0x4a6b8a,1.1,8);gl.position.set(world.exitPos.x,1,world.exitPos.z);renderState.scene.add(gl);
  blip(120,.7,"sine",.09,90,true);growl(70,.4,.2,true);}
function wakeBoss(e){
  if(!e.dormant)return;
  e.dormant=false;
  world.cine={t:0,dur:2.7,e};
  game.inputLock=true;setFiring(false);
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
  const target=Math.atan2(-(b.x-px),-(b.z-pz));
  let diff=((target-getYaw()+Math.PI*3)%(Math.PI*2))-Math.PI;
  setYaw(getYaw()+diff*Math.min(1,dt*4));
  const want=Math.atan2(b.h*.7-pyy,Math.hypot(b.x-px,b.z-pz));
  setPitch(getPitch()+(want-getPitch())*Math.min(1,dt*4));
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
  const dx=px-e.x,dz=pz-e.z,dist=Math.hypot(dx,dz);
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
    vy:((pyy-.2)-oy)/(dist/spd),dmg,life:3.2,tox,col});
  renderState.scene.add(m);
  blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90);}
function throwFlesh(e){
  const dx=px-e.x,dz=pz-e.z,dist=Math.hypot(dx,dz);
  const a=Math.atan2(dx,dz)+rnd(-.05,.05);
  const oy=e.fly?(e.flyH||1.5):e.h*.55+(e.fy||0);
  const m=new THREE.Mesh(gibGeo,gibMatsFlesh[0].clone());
  m.position.set(e.x,oy,e.z);m.scale.setScalar(1.9);
  const spd=10;
  projectiles.orbs.push({m,vx:Math.sin(a)*spd,vz:Math.cos(a)*spd,
    vy:((pyy-.2)-oy)/(dist/spd)+1.0,dmg:14,life:2.4,flesh:true,spin:rnd(6,12),col:0x8c1e10});
  renderState.scene.add(m);
  blood(e.x,oy,e.z,6,1.6);    // it rips the chunk out of its own body
  e.hp-=3;                    // Blood-style self-mutilation
  gurgle(.22,.32);growl(150,.22,.22);}
function priestTeleport(e,far){
  smoke3d(e.x,1.2,e.z,16);blip(700,.25,"sine",.1,140,true);
  for(let tries=0;tries<24;tries++){
    const a=rnd(0,6.28),d=far?rnd(7,11):rnd(4,7);
    const nx=px+Math.sin(a)*d,nz=pz+Math.cos(a)*d;
    if(!solidAt(nx,nz)&&los(nx,nz,px,pz)){e.x=nx;e.z=nz;break;}}
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
      const dx0=px-e.x,dz0=pz-e.z,d0=Math.hypot(dx0,dz0);
      if(d0<(e.priest?13:9)&&los(e.x,e.z,px,pz))wakeBoss(e);
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
    const dx=px-e.x,dz=pz-e.z,dist=Math.hypot(dx,dz);
    if(dist>30){e.sp.position.set(e.x,e.h/2+(e.fy||0),e.z);e.blob.position.set(e.x,(e.fy||0)+.012,e.z);continue;}
    if(e.stun>0){e.stun-=dt;
      e.sp.position.set(e.x+rnd(-.03,.03),e.h/2,e.z+rnd(-.03,.03));
      e.blob.position.set(e.x,.012,e.z);continue;}
    const seen=los(e.x,e.z,px,pz)&&dist<22;
    e.cool-=dt;e.dodgeT-=dt;e.lungeT-=dt;e.slamT-=dt;e.screamT-=dt;e.flingCD-=dt;
    const injured=e.hp<e.maxhp*.35;
    let spd=e.speed*e.slow*(injured&&!e.boss?1.45:1);
    let moving=false;
    if(seen){
      anyAware=anyAware||dist<16;
      if(!e.aware){e.aware=true;
        say(e.elite?"see_elite":"see_"+e.key);snarl(e.key);}
      e.alertX=px;e.alertZ=pz;
      /* ===== BOSS BRAINS ===== */
      if(e.priest){priestThink(e,dt,dist,dx,dz);continue;}
      if(e.key==="E"&&e.charge){
        if(e.charging>0){
          e.charging-=dt;
          if(!moveEnemy(e,e.cdx,e.cdz,13,dt)){e.charging=0;e.stun=1;bang(.2,.5,400);shake(.25);}
          if(dist<1.6&&e.cool<=0&&Math.abs((e.fy||0)-(pyy-EYE))<1.3){e.cool=1.2;e.atkAnim=.22;damagePlayer(e.mel);}
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
          if(Math.hypot(o.x-e.x,o.z-e.z)<16){o.alertX=px;o.alertZ=pz;o.slow=1;
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
          if(Math.hypot(px-e.x,pz-e.z)<3.1){damagePlayer(24);
            vx+=(px-e.x)*3;vz+=(pz-e.z)*3;}},480);
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
      if(dist<1.55&&e.cool<=0&&Math.abs((e.fy||0)-(pyy-EYE))<1.3){e.cool=1.0;e.atkAnim=.22;damagePlayer(e.mel);
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
    const ldx=dist>0.01?(px-e.x)/dist:0,ldz=dist>0.01?(pz-e.z)/dist:0;
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
    if(dist<1.8&&e.cool<=0&&Math.abs((e.fy||0)-(pyy-EYE))<1.3){e.cool=1.1;e.atkAnim=.22;damagePlayer(e.mel);}
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
            const nx=px+Math.sin(a)*d,nz=pz+Math.cos(a)*d;
            if(!solidAt(nx,nz)){
              const ne=spawnEnemy(Math.random()<.6?"z":"f",nx,nz,true);
              ne.aware=true;ne.alertX=px;ne.alertZ=pz;
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
        const nx=px+Math.sin(a)*4,nz=pz+Math.cos(a)*4;
        if(!solidAt(nx,nz)){const ne=spawnEnemy("f",nx,nz,true);
          ne.aware=true;smoke3d(nx,.6,nz,10);}}}
    if(dist>1.7){moving=moveEnemy(e,dx/dist,dz/dist,e.speed,dt);}
    if(dist<2&&e.cool<=0&&Math.abs((e.fy||0)-(pyy-EYE))<1.3){e.cool=.95;e.atkAnim=.22;damagePlayer(e.mel);}}
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
    const pd=Math.hypot(px-r.x,pz-r.z);
    if(!r.hitDone&&Math.abs(pd-r.r)<.5&&pyy<EYE+.18){
      r.hitDone=true;damagePlayer(20);vx+=(px-r.x)/Math.max(pd,.2)*5;vz+=(pz-r.z)/Math.max(pd,.2)*5;}
    for(const p of world.props){if(p.dead)continue;
      if(Math.abs(Math.hypot(p.x-r.x,p.z-r.z)-r.r)<.5)
        p.explosive?explodeBarrel(p):breakProp(p);}
    if(r.r>9){renderState.scene.remove(r.m);world.rings.splice(i,1);}}}
/* falling debris strikes (priest P3) */
function spawnStrike(){
  for(let tries=0;tries<16;tries++){
    const a=rnd(0,6.28),d=rnd(1,5.5);
    const x=px+Math.sin(a)*d,z=pz+Math.cos(a)*d;
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
      if(Math.hypot(px-s.x,pz-s.z)<1.3)damagePlayer(18);
      for(const p of world.props){if(!p.dead&&Math.hypot(p.x-s.x,p.z-s.z)<1.3)
        p.explosive?explodeBarrel(p):breakProp(p);}
      world.strikes.splice(i,1);}}}
function poisonTick(dt){
  for(let i=world.poisonZones.length-1;i>=0;i--){const zn=world.poisonZones[i];
    zn.t-=dt;
    if(Math.random()<.5)toxicP(zn.x+rnd(-zn.r,zn.r)*.7,.2,zn.z+rnd(-zn.r,zn.r)*.7,1);
    if(Math.hypot(px-zn.x,pz-zn.z)<zn.r){damagePlayer(6*dt,true);}
    if(zn.t<=0)world.poisonZones.splice(i,1);}}

/* ============================================================
   PROJECTILES (player crosses + enemy orbs)
   ============================================================ */
function projTick(dt){
  for(let i=projectiles.nails.length-1;i>=0;i--){const n=projectiles.nails[i];
    n.life-=dt;
    if(!n.reap)n.vy-=5*dt;        // reap flies straight; crosses arc
    n.m.position.x+=n.vx*dt;n.m.position.y+=n.vy*dt;n.m.position.z+=n.vz*dt;
    if(n.spin)n.m.rotation.z+=n.spin*dt;
    const mx=n.m.position.x,my=n.m.position.y,mz=n.m.position.z;
    if(n.reap){ // visual tracer only — damage already applied by hitscan
      if(Math.random()<.6)spawnP(mx,my,mz,0,0,0,.5,.9,.35,.2,3);
      if(n.life<=0||my<0.05||my>WALLH||solidAt(mx,mz)){
        smoke3d(mx,Math.max(my,.3),mz,4);renderState.scene.remove(n.m);projectiles.nails.splice(i,1);}
      continue;}
    let boom=n.life<=0||my<0.05||my>WALLH||solidAt(mx,mz);
    if(!boom)for(const p of world.props){if(p.dead)continue;
      if(Math.hypot(mx-p.x,mz-p.z)<p.r+.1&&my<p.hgt){boom=true;break;}}
    if(!boom)for(const e of world.enemies){if(e.dead||e.dormant)continue;
      if(Math.hypot(mx-e.x,mz-e.z)<e.w*.5&&my>0&&my<e.h*1.05){
        weaponRuntime.volleyHit=true;S.hitsLanded++;boom=true;break;}}
    if(boom){crossExplode(mx,Math.max(my,.3),mz);
      renderState.scene.remove(n.m);projectiles.nails.splice(i,1);}}
  for(let i=projectiles.orbs.length-1;i>=0;i--){const o=projectiles.orbs[i];
    o.life-=dt;
    if(o.flesh){o.vy-=11*dt;o.m.rotation.x+=o.spin*dt;o.m.rotation.z+=o.spin*.7*dt;}
    o.m.position.x+=o.vx*dt;o.m.position.y+=o.vy*dt;o.m.position.z+=o.vz*dt;
    if(o.flesh){
      if(Math.random()<.7)blood(o.m.position.x,o.m.position.y,o.m.position.z,1,.6);
    }else if(Math.random()<.4){
      const c=o.col||0x9a4ae0,r2=(c>>16&255)/255,g2=(c>>8&255)/255,b2=(c&255)/255;
      spawnP(o.m.position.x,o.m.position.y,o.m.position.z,0,0,0,r2,g2,b2,.25,3);}
    let dead=o.life<=0||solidAt(o.m.position.x,o.m.position.z)||(o.flesh&&o.m.position.y<.1);
    const hit=Math.hypot(o.m.position.x-px,o.m.position.z-pz)<.55&&
       Math.abs(o.m.position.y-(pyy-.3))<1;
    if(!dead&&hit){damagePlayer(o.dmg);
      if(o.flesh){blood(px,pyy-.2,pz,10,1.5);gurgle(.2,.35);}
      dead=true;}
    if(dead){
      if(o.flesh){blood(o.m.position.x,Math.max(.1,o.m.position.y),o.m.position.z,8,1.4);
        addPool(o.m.position.x,o.m.position.z,rnd(.2,.4));gurgle(.16,.25);}
      renderState.scene.remove(o.m);projectiles.orbs.splice(i,1);}}}

/* ============================================================
   PLAYER
   ============================================================ */
function damagePlayer(d,silent){
  if(S.dead||S.won)return;
  if(spawnGuard>0)return;   // can't be hurt during spawn protection
  let dmg=d;
  if(S.armor>0){const ab=Math.min(S.armor,dmg*.6);S.armor-=ab;dmg-=ab;}
  S.hp-=dmg;
  if(!silent){flashDmg(.45);shake(.3);screenBlood();
    bang(.1,.3,700);blip(90,.2,"sawtooth",.12,40);}
  if(S.hp<35&&Math.random()<.3)say("lowhp");
  if(S.hp<=0){S.hp=0;S.dead=true;
    stopBossMusic();
    document.exitPointerLock();
    document.getElementById("deadquip").textContent='ADEM: “'+pick(M.dead)+'”';
    document.getElementById("dead").classList.remove("hidden");}}
function accelerate(wx_,wz_,maxs,acc,dt){
  const cur=vx*wx_+vz*wz_,add=maxs-cur;if(add<=0)return;
  let a=acc*maxs*dt;if(a>add)a=add;vx+=wx_*a;vz+=wz_*a;}
function collides(x,z){
  for(const[ox,oz]of[[R,R],[R,-R],[-R,R],[-R,-R],[R,0],[-R,0],[0,R],[0,-R]])
    if(solidAt(x+ox,z+oz))return true;
  if(world.wallSegs.length&&segBlocked(x,z,R+.05))return true;
  for(const p of world.props){if(p.dead)continue;
    if(Math.hypot(x-p.x,z-p.z)<p.r+R)return true;}
  return false;}
function footstep(sprinting){
  if(!ctx())return;
  const marble=S.level===1;
  bang(.05,sprinting?.09:.06,marble?2400:700,marble?600:0);
  if(marble)blip(rnd(800,1000),.05,"sine",.02);}
function playerTick(dt){
  if(S.dead||S.won||game.inputLock)return;
  if(spawnGuard>0)spawnGuard-=dt;
  let f=0,s2=0;
  if(keys.KeyW)f++;if(keys.KeyS)f--;if(keys.KeyD)s2++;if(keys.KeyA)s2--;
  const sin=Math.sin(getYaw()),cos=Math.cos(getYaw());
  let wx_=-sin*f+cos*s2,wz_=-cos*f-sin*s2;
  const l=Math.hypot(wx_,wz_);if(l>0){wx_/=l;wz_/=l;}
  const sprint=keys.ShiftLeft||keys.ShiftRight;
  const fh=floorHeightAt(px,pz);          // ground height under the player
  const standY=EYE+fh;
  if(grounded){
    const fr=Math.exp(-8*dt);vx*=fr;vz*=fr;
    accelerate(wx_,wz_,sprint?10.5:7,9,dt);
    if(keys.Space){vy=7.4;grounded=false;blip(140,.06,"sine",.04,90);}
  }else accelerate(wx_,wz_,1.4,70,dt);
  vy-=20*dt;pyy+=vy*dt;
  if(pyy<=standY){if(!grounded){footstep(true);shake(.04);}pyy=standY;vy=0;grounded=true;}
  let nx=px+vx*dt;
  if(!collides(nx,pz)&&!(grounded&&floorHeightAt(nx,pz)-fh>1.2)){px=nx;}else vx=0;
  let nz=pz+vz*dt;
  if(!collides(px,nz)&&!(grounded&&floorHeightAt(px,nz)-fh>1.2)){pz=nz;}else vz=0;
  // if we walked onto higher ground, snap up; onto lower ground, start falling
  const nfh=floorHeightAt(px,pz),nStand=EYE+nfh;
  if(grounded){
    if(nStand>pyy+0.02){pyy=nStand;}        // step up
    else if(nStand<pyy-0.02){grounded=false;} // walked off a ledge -> fall
  }
  const spd=Math.hypot(vx,vz);
  bobT+=spd*dt*(sprint?1.9:1.6);
  const bobSin=Math.sin(bobT*4);
  if(grounded&&spd>1&&lastBobSin<=0&&bobSin>0)footstep(sprint);
  lastBobSin=bobSin;
  screenShake.trauma=Math.max(0,screenShake.trauma-dt*1.6);
  const sh=screenShake.trauma*screenShake.trauma,t=performance.now();
  const shx=sh*.06*Math.sin(t*.061),shy=sh*.05*Math.sin(t*.083),shr=sh*.05*Math.sin(t*.047);
  weaponRuntime.recoilPitch*=Math.exp(-8*dt);
  renderState.camera.position.set(px+shx,pyy+(grounded?bobSin*.025*Math.min(1,spd/7):0)+shy,pz);
  renderState.camera.rotation.order="YXZ";
  renderState.camera.rotation.y=getYaw();renderState.camera.rotation.x=getPitch()+weaponRuntime.recoilPitch;renderState.camera.rotation.z=shr;
  renderState.lamp.position.set(px,pyy+.4,pz);
  if(renderState.lampCore)renderState.lampCore.position.set(px,pyy+.2,pz);
  /* exit pad (level 1) */
  if(world.exitPos&&Math.hypot(px-world.exitPos.x,pz-world.exitPos.z)<1.2){
    const bossLeft=world.enemies.some(e=>e.boss&&!e.dead);
    if(bossLeft)showMsg("SOMETHING STILL BREATHES HERE",1.5);
    else endLevel();}
  /* challenge plate */
  if(world.challenge&&world.challenge.state===0&&Math.hypot(px-world.challenge.x,pz-world.challenge.z)<1){
    world.challenge.state=1;say("challenge",true);
    showMsg("THE PLATE HUMS — THEY ARE COMING",3);
    blip(70,1,"sawtooth",.15,40,true);
    world.challenge.plate.material.color.setHex(0xc83a20);
    world.challenge.light.color.setHex(0xc83a20);
    for(let n=0;n<5;n++){
      const a=n/5*6.28,d=rnd(3,5);
      const sxp=world.challenge.x+Math.sin(a)*d,szp=world.challenge.z+Math.cos(a)*d;
      if(!solidAt(sxp,szp)){
        const ne=spawnEnemy(n<3?"f":"z",sxp,szp,true);
        ne.aware=true;ne.alertX=px;ne.alertZ=pz;
        smoke3d(sxp,.6,szp,8);}}
    alertSound(px,pz,30);}
  if(world.challenge&&world.challenge.state===1){
    if(!world.enemies.some(e=>e.summoned&&!e.dead)){
      world.challenge.state=2;say("challenge_done",true);
      ach(ACHIEVEMENTS.gauntlet,S.ach);
      world.challenge.plate.material.color.setHex(0x4ab86a);
      world.challenge.light.color.setHex(0x4ab86a);
      ["armor","crosses","bullets"].forEach((k,i)=>{
        world.items.push({kind:k,x:world.challenge.x+(i-1)*.8,z:world.challenge.z,
          sp:addSprite(ITEMTEX[k],world.challenge.x+(i-1)*.8,world.challenge.z,.55,.55,.5),bob:i});});
      blip(523,.3,"sine",.1,1046,true);}}}

/* ============================================================
   INTERACTION + PICKUPS
   ============================================================ */
const WNAMES={w1:"SAWED-OFF SHOTGUN",w2:"COMBAT RIFLE",w3:"TOMMY GUN",w4:"BMG SNIPER",w5:"HOLY CROSS LAUNCHER",w6:"NAIL CANNON",w7:"SOUL REAPER"};
function interact(){
  if(!game.started||game.inputLock)return;
  if(world.pianoPos&&Math.hypot(px-world.pianoPos.x,pz-world.pianoPos.z)<1.9){openPiano();return;}
  const dir=new THREE.Vector3();renderState.camera.getWorldDirection(dir);
  for(let t=.4;t<2.6;t+=.2){
    const wx_=px+dir.x*t,wz_=pz+dir.z*t;
    const gx=wx_/CELL|0,gz=wz_/CELL|0,d=world.doors[gx+","+gz];
    if(d&&!d.open){
      if(d.locked&&!S.key){showMsg("IT WANTS THE RED KEY",2.2);
        say("locked");growl(80,.3,.25,true);return;}
      d.open=true;
      if(d.flesh)wetDoor();else stoneDoor();
      alertSound(wx_,wz_,8);
      if(d.secret){S.secrets++;S.totSecrets++;say("secret",true);
        showMsg("SECRET FOUND — "+S.secrets+"/"+S.secretsTotal,3);
        if(S.totSecrets===2)ach(ACHIEVEMENTS.curious,S.ach);}
      else if(d.locked)showMsg("THE GATE ACCEPTS THE KEY",2.4);
      return;}
    if(solidAt(wx_,wz_))return;}}
function itemsTick(dt){
  for(const it of world.items){
    if(it.taken)continue;
    it.bob+=dt*2.4;it.sp.position.y=.5+Math.sin(it.bob)*.07;
    if(Math.hypot(px-it.x,pz-it.z)<.95){
      let ok=true;
      switch(it.kind){
        case "health":if(S.hp>=100){ok=false;break;}S.hp=Math.min(100,S.hp+25);showMsg("+25 HEALTH");break;
        case "armor":S.armor=Math.min(100,S.armor+50);showMsg("+50 ARMOR");break;
        case "bullets":S.ammo.bullets+=18;showMsg("+18 BULLETS");break;
        case "shells":S.ammo.shells+=6;showMsg("+6 SHELLS");break;
        case "slugs":S.ammo.slugs+=4;showMsg("+4 SLUGS");break;
        case "crosses":S.ammo.crosses+=3;showMsg("+3 BLESSED CROSSES");break;
        case "nails":S.ammo.nails+=40;showMsg("+40 NAILS");break;
        case "souls":S.ammo.souls+=3;showMsg("+3 SOULS");break;
        case "key":S.key=true;say("key",true);showMsg("RED KEY — IT IS WARM",3);break;
        default:{
          const wi=+it.kind[1];
          S.weapons[wi]=true;
          const w=WEAPONS[wi];
          const fill=Math.min(w.magSize,4);
          S.mag[wi]=Math.max(S.mag[wi],fill);
          S.ammo[w.ammo]+=w.magSize;
          requestSwitch(wi);
          showMsg(WNAMES[it.kind]+" ACQUIRED",2.6);
          if(it.kind==="w1")say("w2",true);
          if(it.kind==="w4")say("w5",true);
          if(it.kind==="w5")say("w6",true);}}
      if(ok){it.taken=true;renderState.scene.remove(it.sp);blip(330,.14,"sine",.1,210,true);gurgle(.12,.12);}}}
  /* free SMG after enough kills if not yet found */
  if(!S.weapons[3]&&S.totKills>=8){S.weapons[3]=true;S.mag[3]=36;
    showMsg("SCRAP SMG ASSEMBLED FROM THE DEAD",3);blip(330,.12,"square",.08);}}
function doorTick(dt){for(const k in world.doors){const d=world.doors[k];
  if(d.open&&d.mesh.position.y>-WALLH/2+.1)d.mesh.position.y-=dt*2.6;}}
function propTick(dt){for(const p of world.props){
  if(p.dead||p.fuse<0)continue;
  p.fuse-=dt;if(p.fuse<=0)explodeBarrel(p);}}
function torchTick(dt,t){
  for(const tc of world.torches){
    const n=Math.sin(t*.011+tc.seed*7)*Math.sin(t*.017+tc.seed*3);
    tc.L.intensity=1.6+n*.45+Math.random()*.18;
    if(Math.random()<.06){tc.fr=1-tc.fr;
      tc.sp.material.map=ITEMTEX.torch[tc.fr];tc.sp.material.needsUpdate=true;}
    if(Math.random()<.04)emberP(tc.x+rnd(-.1,.1),1.4,tc.z+rnd(-.1,.1));}
  for(const c of world.candles){
    c.sp.material.opacity=.8+Math.sin(t*.02+c.seed*9)*.2;}}

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
  game.pianoOpen=true;setFiring(false);
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
  const score=(S.killsTotal?S.kills/S.killsTotal:1)*40+
    (S.secretsTotal?S.secrets/S.secretsTotal:1)*25+Math.min(1,acc)*25+
    Math.min(1,S.propsBroken/10)*10;
  if(acc>=.7)ach(ACHIEVEMENTS.deadeye,S.ach);
  return score>=85?"S":score>=70?"A":score>=55?"B":score>=40?"C":"D";}
function statsHtml(){
  const t=((performance.now()-S.levelT0)/1000)|0;
  const acc=S.shots>0?Math.round(100*S.hitsLanded/S.shots):0;
  return `KILLS <b>${S.kills} / ${S.killsTotal}</b> · GIBBED <b>${S.gibs}</b><br>`+
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
        started:game.started,dead:S.dead,pianoOpen:game.pianoOpen,zoomLerp:weaponRuntime.zoomLerp,cur:S.cur,vx,vz,
        sprintKey:!!(keys.ShiftLeft||keys.ShiftRight),bobT,wstate:weaponRuntime.wstate,wtime:weaponRuntime.wtime,
        equipT:EQUIP_T,unequipT:UNEQUIP_T,kickAmt:weaponRuntime.kickAmt,kickRot:weaponRuntime.kickRot,swayX:getSwayX(),swayY:getSwayY(),muzzle:weaponRuntime.muzzle,
      },WEAPONS));
    hud();
    renderState.renderer.render(renderState.scene,renderState.camera);}}
requestAnimationFrame(loop);

import * as THREE from "three";
import { pick, rnd } from "../utils/math";
import { LEVELS } from "./levels/index";
import { ENEMY_DEFS as EDEF } from "../enemies/EnemyDefs";
import { TEX } from "../render/ProcTextures";
import { bandFor } from "../render/BandTextures";
import { PX } from "../enemies/SpriteBaker";
import { ITEMTEX } from "../render/ItemTextures";
import { setScene } from "../render/SceneRef";
import { renderState } from "../render/Renderer";
import { addSprite, addBlob } from "../render/RenderCore";
import { applyShadowFlags, configureLampShadow } from "../render/Shadows";
import { buildParticles } from "../fx/Particles";
import { resetDecals } from "../fx/Decals";
import { resetGibs } from "../fx/Gibs";
import { headPool } from "../fx/Heads";
import { projectiles } from "../fx/Projectiles";
import { showMsg } from "../ui/HudMessages";
import { say } from "../ui/Subtitles";
import { input } from "../player/Input";
import { player } from "../player/PlayerState";
import { S } from "../core/State";
import { CELL, WALLH, EYE } from "./Grid";
import { floorHeightAt } from "./Collision";
import { buildCeiling } from "./Ceiling";
import { buildTrim } from "./Trim";
import { buildArches } from "./Arches";
import { spawnProp } from "./PropSpawn";
import { world } from "./WorldState";
import type { WallSeg } from "./LevelBuilder";
import { after, clearAllTimers } from "../core/Timers";
import { clearScheduled } from "../core/Time";
import { stopMusic } from "../audio/Music";
import { track, disposeAll } from "../render/DisposeRegistry";
import type { Enemy } from "../enemies/Enemy";

/**
 * The level loader and its enemy spawner — `loadLevel` builds a level from
 * its grid, `spawnEnemy` populates it with enemies. Prop spawning
 * (`spawnProp`, called from `loadLevel`'s dispatch below) lives in
 * `src/world/PropSpawn.ts` as of Task 1 of the 2026-09-24 plan — see that
 * file's header for why it is a third file rather than folded into
 * `Props.ts`. Moved verbatim from `src/legacy.js`'s "WORLD STATE + LEVEL
 * LOADER" section (formerly lines 311-366 and 398-544; `reference/
 * sonsurum.html` lines 2767-2822 and 2849-2946).
 *
 * Split from `src/world/Props.ts` (which holds `breakProp`/`explodeBarrel`,
 * run during play when a prop takes lethal damage) because the two only
 * share the `world.props` list as data, never a call: this file never calls
 * `breakProp`/`explodeBarrel`, and neither of those calls back into this
 * file. Two files matches how they run (build-time vs. play-time) and keeps
 * both well under the 400-line gate.
 *
 * `alertSound` (formerly grouped with this section) moved early into
 * `src/enemies/ai/Perception.ts`, ahead of Task 10's schedule, because
 * `explodeBarrel` (`src/world/Props.ts`) needs it and neither function
 * needed here calls it. See that file's doc comment.
 *
 * `loadLevel` calls `clearAllTimers()` (`src/core/Timers.ts`),
 * `clearScheduled()` (`src/core/Time.ts`), `disposeAll()`
 * (`src/render/DisposeRegistry.ts`, Plan 0F Task 7) and `stopMusic()`
 * (`src/audio/Music.ts`, Plan 1 Task 5) as its very first lines,
 * before any new state is built (Plan 0F Task 6, KNOWN-3). `stopMusic()`
 * closes a gap the other three don't: `clearAllTimers()` only tracks
 * `setTimeout` (`Timers.ts`'s `after()`), and `Ambient.ts`'s boss-music
 * pulse is the codebase's only `setInterval` — nothing cancelled it here
 * before Task 5, and it survived only because the game's four pre-existing
 * `stopBossMusic()` call sites (death, the exit pad, the win screen, a boss
 * dying) happened to cover every *normal* path. A level load that isn't one
 * of those — jumping levels mid-fight — did not. The scene is
 * replaced wholesale here, so anything still pending from the level being
 * left behind — an audio tail, a UI fade, a scheduled boss attack, a wall's
 * geometry — must not fire into, or leak past, the level that is about to
 * exist. `disposeAll()` specifically must run before `renderState.scene` is
 * reassigned and before `buildParticles()` re-creates its geometry a few
 * lines down: both happen inside this same function, so disposing *after*
 * either would free the resources this very call just made, not the
 * previous level's. `LevelLoader.ts`'s own two timers (`lt`'s title fade,
 * the level-name `say(...)`) are registered *after* this point, so they
 * survive their own load, which is what makes the entry banner and
 * subtitle work at all.
 *
 * `loadLevel` calls `setScene(renderState.scene)` to mirror the new scene
 * for the FX modules (`src/fx/Particles.ts`, `Decals.ts`, `Gibs.ts`), which
 * still read it through `getScene()`. Plan 0E Task 12 checked all five call
 * sites (two in `Decals.ts`, two in `Gibs.ts`, one in `Particles.ts`) and
 * found the mirror still live, so it stays rather than being retired.
 * Having those three modules take the scene as a parameter instead is a
 * real future option, but it means editing them, which is out of Task 12's
 * scope — see `src/render/SceneRef.ts`'s doc comment.
 *
 * `lt.style.opacity` takes strings here where the reference assigns
 * numbers, the same adjustment `src/ui/HudMessages.ts` and
 * `src/ui/Toasts.ts` made — `CSSStyleDeclaration` stringifies both to the
 * same value.
 *
 * `world.wallSegs` is typed loosely (`Record<string, unknown>[]`) in
 * WorldState.ts, per `src/world/Collision.ts`'s doc comment, which left
 * settling its real element shape to this task. This module writes it
 * (from `LevelBuilder.ts`'s own `WallSeg[]`) and reads it back in the same
 * function, so both sides cast through that same `WallSeg` shape rather
 * than changing WorldState.ts's declared field type, which other Plan 0E
 * tasks (Collision.ts, and later ones) also read.
 *
 * Phase 2 Part A Task 3 collapsed the per-cell wall/pillar/platform `Mesh`
 * objects below into three `InstancedMesh`es (one per shared geometry+
 * material group: `wallGeo`+`matWall`, `pilGeo`+`matPil`, and a unit box
 * with `pmats` for the height-map platforms), cutting the prologue's scene
 * from 237 to 33 children at load (level 1: 295 to 93) — see
 * `.superpowers/sdd/2026-08-31-phase2a-verifiable-world/task-3-report.md`.
 * Doors/secrets (`+`/`D`/`S`) and the angled `wallSegs` meshes deliberately
 * stayed individual `Mesh` objects: doors because `doorTick`/`interact`
 * animate one specific mesh per door (an `InstancedMesh` has no
 * per-instance object to hand them, and doors don't share one material the
 * way walls do), `wallSegs` because it was outside this task's measured
 * scope (each segment has a distinct length, and it wasn't in the brief's
 * instanceable list). `world.grid`/`world.wallSegs` — what
 * `src/world/Collision.ts` actually reads — are untouched by this change;
 * only what gets added to `renderState.scene` differs.
 *
 * Phase 2 Part B Task 1 moved the ceiling to `src/world/Ceiling.ts` — see
 * that file's own header for the two shapes and the lighting rule that
 * comes with opting a level into `BuiltLevel.cmap`. Nothing here reads the
 * ceiling back; `buildCeiling` is called once, below, and owns it entirely.
 *
 * Task 1 of the 2026-09-24 plan moved `spawnProp` out to
 * `src/world/PropSpawn.ts`, the same way: nothing here reads a prop back
 * either, `spawnProp` is called from the dispatch below and owns the rest
 * entirely, and the move freed the headroom that plan's other two tasks
 * (a themed trim band, then pointed arches) needed.
 */

export function spawnEnemy(ch: string, wx: number, wz: number, summoned?: boolean): Enemy {
  const d=EDEF[ch];
  const elite=!d.boss&&!summoned&&Math.random()<.11;
  const SZ=1.18;                       // overall sprite presence bump
  const mul=elite?2:1;
  const ew=d.w*(elite?1.15:1)*SZ, eh=d.h*(elite?1.15:1)*SZ;
  const e: Enemy={key:ch,name:d.name,x:wx,z:wz,hp:d.hp*mul,maxhp:d.hp*mul,
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
  if(elite)(e.sp.material as THREE.SpriteMaterial).color.setHex(0xd8c878);
  // `world.enemies` and `world.bossRef` are `Enemy`-typed as of Phase 3 Part A
  // Task 3, so the object goes in as itself — no cast, and no separate `rec`
  // alias that used to exist only to satisfy `Record<string, unknown>`.
  world.enemies.push(e);
  if(!summoned)S.enemiesTotal=(S.enemiesTotal||0)+1;
  if(d.boss)world.bossRef=world.bossRef||e;
  return e;}

export function loadLevel(idx: number): void {
  clearAllTimers();clearScheduled();disposeAll();stopMusic();
  S.level=idx;
  const Ldef=LEVELS[idx],L=Ldef.build();
  world.grid=L.g;world.GW=L.W;world.GH=L.H;
  world.heightMap=L.hmap||null;
  world.ceilMap=L.cmap||null;
  world.wallSegs=(L.segs||[]) as unknown as Record<string, unknown>[];
  renderState.scene=new THREE.Scene();
  setScene(renderState.scene);
  renderState.scene.background=new THREE.Color(Ldef.fog);
  renderState.scene.fog=new THREE.FogExp2(Ldef.fog,Ldef.fogD*1.5);
  renderState.ambLight=track(new THREE.AmbientLight(Ldef.amb,Ldef.ambI*0.42));renderState.scene.add(renderState.ambLight);
  renderState.lamp=track(new THREE.PointLight(0xffb060,1.7,9,1.6));renderState.scene.add(renderState.lamp);
  configureLampShadow(renderState.lamp);   // the game's one shadow caster — src/render/Shadows.ts
  // a tighter hot core so the player is always in a warm pool that falls off to black
  renderState.lampCore=track(new THREE.PointLight(0xffd890,1.1,4.5,2));renderState.scene.add(renderState.lampCore);
  renderState.muzzleLight=track(new THREE.PointLight(0xffc878,0,14,1.4));renderState.scene.add(renderState.muzzleLight);
  renderState.boomLight=track(new THREE.PointLight(0xff7830,0,20,1.4));renderState.scene.add(renderState.boomLight);
  buildParticles();
  resetDecals();resetGibs();
  world.doors={};world.enemies=[];world.props=[];world.items=[];world.torches=[];world.candles=[];
  world.poisonZones=[];world.rings=[];world.strikes=[];projectiles.nails=[];projectiles.orbs=[];headPool.heads=[];
  world.exitPos=null;world.pianoPos=null;world.challenge=null;world.bossRef=null;world.cine=null;
  S.dead=false;S.won=false;S.hp=100;
  world.eventT=rnd(55,100);world.idleT=rnd(26,40);
  player.spawnGuard=2.0;   // brief invulnerability on entry
  S.kills=0;S.gibs=0;S.secrets=0;S.secretsTotal=0;S.shots=0;S.hitsLanded=0;
  S.propsBroken=0;S.enemiesTotal=0;S.key=false;S.levelT0=performance.now();
  const flesh=Ldef.flesh,hell=Ldef.hell,dungeon=Ldef.dungeon;
  const wallTex=hell?TEX.hellWall:flesh?TEX.fleshWall:(dungeon?TEX.dungeonWall:TEX.churchWall);
  const matWall=track(new THREE.MeshLambertMaterial({map:wallTex}));
  const matWin=track(new THREE.MeshBasicMaterial({map:TEX.window}));
  const wallGeo=track(new THREE.BoxGeometry(CELL,WALLH,CELL));
  const pilGeo=track(new THREE.CylinderGeometry(.46,.55,WALLH,8));
  const matPil=track(new THREE.MeshLambertMaterial({map:TEX.pillar}));
  // Plain walls (#/W) and pillars (I) share one geometry and one material
  // each across the whole level — only their transforms differ — so they
  // are the clean InstancedMesh targets (Task 3). Collect each cell's
  // transform here and build the two InstancedMeshes once the scan is
  // done, rather than adding a Mesh per cell as before.
  //
  // Doors/secrets (+/D/S) stay individual Mesh objects: `doorTick`/
  // `interact` (src/player/Interact.ts) animate the *specific* mesh stored
  // in `world.doors[x+","+z]`, which an InstancedMesh has no per-instance
  // object to hand them, and doors don't even share one material the way
  // walls do (locked/flesh/plain textures, vs. secrets sharing `matWall`).
  const wallMats:THREE.Matrix4[]=[],pilMats:THREE.Matrix4[]=[];
  for(let z=0;z<world.GH;z++)for(let x=0;x<world.GW;x++){
    const ch=world.grid[z][x],wx=(x+.5)*CELL,wz=(z+.5)*CELL;
    if(ch==="#"||ch==="W"){
      let dx0=0,dz0=0,open=false;
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const r=world.grid[z+dz];
        if(r&&r[x+dx]&&"#W".indexOf(r[x+dx])<0){open=true;dx0=dx;dz0=dz;break;}}
      if(!open)continue;
      wallMats.push(new THREE.Matrix4().setPosition(wx,WALLH/2,wz));
      if(ch==="W"){
        const gm=new THREE.Mesh(track(new THREE.PlaneGeometry(1.6,2.6)),matWin);
        gm.position.set(wx+dx0*(CELL/2+.02),WALLH*.56,wz+dz0*(CELL/2+.02));
        gm.lookAt(wx+dx0*4,WALLH*.56,wz+dz0*4);renderState.scene.add(gm);
        const col=pick([0x5a3a8e,0x3a5a9e,0x9e3a3a]);
        const wl=track(new THREE.PointLight(col,1.1,9,1.5));
        wl.position.set(wx+dx0*1.7,WALLH*.6,wz+dz0*1.7);renderState.scene.add(wl);
        const cone=new THREE.Mesh(track(new THREE.ConeGeometry(1.2,WALLH-.6,8,1,true)),
          track(new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.05,
            side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending})));
        cone.position.set(wx+dx0*1.7,(WALLH-.6)/2,wz+dz0*1.7);renderState.scene.add(cone);}}
    else if(ch==="I"){
      pilMats.push(new THREE.Matrix4().setPosition(wx,WALLH/2,wz));}
    else if(ch==="+"||ch==="D"||ch==="S"){
      let mat;if(ch==="S"){mat=matWall;S.secretsTotal++;}
      else mat=track(new THREE.MeshLambertMaterial({map:ch==="D"?TEX.doorLocked:(flesh?TEX.fleshDoor:TEX.door)}));
      const m=new THREE.Mesh(wallGeo,mat);m.name="door";m.position.set(wx,WALLH/2,wz);renderState.scene.add(m);
      world.doors[x+","+z]={mesh:m,open:false,locked:ch==="D",secret:ch==="S",flesh:flesh&&ch!=="D"};}}
  if(wallMats.length){
    const wallMesh=new THREE.InstancedMesh(wallGeo,matWall,wallMats.length);
    wallMats.forEach((mtx,i)=>wallMesh.setMatrixAt(i,mtx));
    wallMesh.name="wall";
    wallMesh.instanceMatrix.needsUpdate=true;renderState.scene.add(wallMesh);}
  if(pilMats.length){
    const pilMesh=new THREE.InstancedMesh(pilGeo,matPil,pilMats.length);
    pilMats.forEach((mtx,i)=>pilMesh.setMatrixAt(i,mtx));
    pilMesh.name="pillar";
    pilMesh.instanceMatrix.needsUpdate=true;renderState.scene.add(pilMesh);}
  const floorTex=track((hell?TEX.hellFloor:flesh?TEX.fleshFloor:(dungeon?TEX.dungeonFloor:TEX.churchFloor)).clone());
  floorTex.needsUpdate=true;floorTex.repeat.set(world.GW,world.GH);
  floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;
  floorTex.magFilter=THREE.NearestFilter;floorTex.minFilter=THREE.NearestFilter;
  const fm=new THREE.Mesh(track(new THREE.PlaneGeometry(world.GW*CELL,world.GH*CELL)),
    track(new THREE.MeshLambertMaterial({map:floorTex})));
  fm.name="floor";
  fm.rotation.x=-Math.PI/2;fm.position.set(world.GW*CELL/2,0,world.GH*CELL/2);renderState.scene.add(fm);
  buildCeiling(renderState.scene as THREE.Scene,(hell?TEX.hellCeil:flesh?TEX.fleshCeil:TEX.ceil),wallTex);const band=bandFor(Ldef);buildTrim(renderState.scene as THREE.Scene,band);buildArches(renderState.scene as THREE.Scene,band);
  /* raised floor platforms (verticality) — a textured block per elevated cell.
     Each cell's box used to get its own BoxGeometry sized to that cell's
     height, so nothing was shared. Instanced here as one unit box (shared
     `pmats` face materials, same 6-group layout as before) scaled per
     instance to (CELL,hgt,CELL) — three.js's InstancedMesh normal-matrix
     handling (node_modules/three/src/renderers/shaders/ShaderChunk/
     defaultnormal_vertex.glsl.js) accounts for exactly this non-uniform
     per-instance scale, so lighting on the tall faces is unaffected. */
  if(world.heightMap){
    const platTexTop=(hell?TEX.hellFloor:flesh?TEX.fleshFloor:(dungeon?TEX.dungeonFloor:TEX.churchFloor));
    const platTexSide=hell?TEX.stair:flesh?TEX.fleshWall:TEX.stair;
    const topMat=track(new THREE.MeshLambertMaterial({map:platTexTop}));
    const sideMat=track(new THREE.MeshLambertMaterial({map:platTexSide}));
    const pmats=[sideMat,sideMat,topMat,sideMat,sideMat,sideMat]; // box face order: +x,-x,+y,-y,+z,-z
    const platMats:THREE.Matrix4[]=[];
    for(let z=0;z<world.GH;z++)for(let x=0;x<world.GW;x++){
      const hgt=world.heightMap[z]&&world.heightMap[z][x]||0;
      if(hgt<=0)continue;
      const wx=(x+.5)*CELL,wz=(z+.5)*CELL;
      platMats.push(new THREE.Matrix4().compose(
        new THREE.Vector3(wx,hgt/2,wz),new THREE.Quaternion(),new THREE.Vector3(CELL,hgt,CELL)));}
    if(platMats.length){
      const platGeo=track(new THREE.BoxGeometry(1,1,1));
      const platMesh=new THREE.InstancedMesh(platGeo,pmats,platMats.length);
      platMats.forEach((mtx,i)=>platMesh.setMatrixAt(i,mtx));
      platMesh.name="platform";
      platMesh.instanceMatrix.needsUpdate=true;renderState.scene.add(platMesh);}}
  /* angled wall meshes from arbitrary segments — non-orthogonal Doom/Blood walls */
  if(world.wallSegs.length){
    const segMat=track(new THREE.MeshLambertMaterial({map:wallTex}));
    for(const s of world.wallSegs as unknown as WallSeg[]){
      const len=Math.hypot(s.x2-s.x1,s.z2-s.z1);if(len<.01)continue;
      const geo=track(new THREE.BoxGeometry(len,WALLH,0.18));
      const m=new THREE.Mesh(geo,segMat);m.name="wallSeg";
      m.position.set((s.x1+s.x2)/2,WALLH/2,(s.z1+s.z2)/2);
      m.rotation.y=-Math.atan2(s.z2-s.z1,s.x2-s.x1);
      renderState.scene.add(m);}}
  for(let z=0;z<world.GH;z++)for(let x=0;x<world.GW;x++){
    const ch=world.grid[z][x];
    if(".#WI+DS".includes(ch))continue;
    const wx=(x+.5)*CELL,wz=(z+.5)*CELL;
    if(ch==="P"){player.px=wx;player.pz=wz;}
    else if(ch==="X"){world.exitPos={x:wx,z:wz};
      const ph=floorHeightAt(wx,wz);
      const pad=new THREE.Mesh(track(new THREE.BoxGeometry(CELL*1.3,.06,CELL*1.3)),
        track(new THREE.MeshBasicMaterial({color:0x4a6b8a})));
      pad.position.set(wx,ph+.04,wz);renderState.scene.add(pad);
      // decay:1 explicit — restores r128's PointLight default (r186 moved it to
      // 2); reference/sonsurum.html:2909 omits it the same way. See KNOWN-14.
      const gl=track(new THREE.PointLight(0x4a6b8a,.9,6,1));gl.position.set(wx,ph+1,wz);renderState.scene.add(gl);}
    else if(ch==="i"){
      const pole=new THREE.Mesh(track(new THREE.CylinderGeometry(.06,.09,1.15,6)),
        track(new THREE.MeshLambertMaterial({color:0x1a160f})));
      pole.name="torchPost";pole.position.set(wx,.575,wz);renderState.scene.add(pole);
      const fl=addSprite((ITEMTEX.torch as THREE.CanvasTexture[])[0],wx,wz,.45,.6,1.35);
      const Lt=track(new THREE.PointLight(0xff9838,1.6,10,1.8));
      Lt.position.set(wx,1.45,wz);renderState.scene.add(Lt);
      world.torches.push({L:Lt,sp:fl,x:wx,z:wz,seed:Math.random()*99,fr:0});}
    else if(ch==="l"){
      const c2=addSprite(ITEMTEX.candle as THREE.CanvasTexture,wx,wz,.25,.3,.18);
      world.candles.push({sp:c2,x:wx,z:wz,seed:Math.random()*99});}
    else if(ch==="p"){world.pianoPos={x:wx,z:wz};
      const body=new THREE.Mesh(track(new THREE.BoxGeometry(1.7,1.0,.95)),
        track(new THREE.MeshLambertMaterial({color:0x14100a})));
      body.name="prop";body.position.set(wx,.5,wz);renderState.scene.add(body);
      const kb=new THREE.Mesh(track(new THREE.BoxGeometry(1.35,.06,.3)),
        track(new THREE.MeshLambertMaterial({color:0xcfc8b8})));
      kb.name="prop";kb.position.set(wx,1.02,wz+.42);renderState.scene.add(kb);
      world.props.push({m:body,x:wx,z:wz,r:.95,hgt:1.2,hp:1e9,dead:false,explosive:false,kind:"piano"});}
    else if(ch==="Y"){world.challenge={x:wx,z:wz,state:0,spawned:[]};
      const plate=new THREE.Mesh(track(new THREE.CircleGeometry(.9,10)),
        track(new THREE.MeshBasicMaterial({color:0x6a4ab8,transparent:true,opacity:.5})));
      plate.rotation.x=-Math.PI/2;plate.position.set(wx,.02,wz);renderState.scene.add(plate);
      // decay:1 explicit — same restoration, reference/sonsurum.html:2933.
      const gl=track(new THREE.PointLight(0x6a4ab8,.7,5,1));gl.position.set(wx,.8,wz);renderState.scene.add(gl);
      (world.challenge as Record<string, unknown>).plate=plate;(world.challenge as Record<string, unknown>).light=gl;}
    else if(EDEF[ch])spawnEnemy(ch,wx,wz);
    // KNOWN-4 lives on this line and the one above it: `C` and `V` are in both
    // `EDEF` and this set, so they always spawn the enemy. The order is NOT
    // changed here — `C` is an intentional Cacodemon in levels 6 and 7, so
    // flipping the two arms would trade one collision for the other. `v` is
    // added instead: a prop-only pew, claimed by no enemy def.
    else if("xTCFVOv".includes(ch))spawnProp(ch,wx,wz);
    else{
      // KNOWN-11 — the item-table half of KNOWN-4's collision. `A` is in
      // this map *and* in `EDEF` (the Mancubus); the enemy arm above wins,
      // so `A:"armor"` was dead code and `S.armor` was structurally 0 for
      // the whole game. Fixed the pew way, not by reordering: `r` is the
      // unambiguous armour spelling, claimed by this map and by none of
      // `EDEF`, the prop string, the skip string or the P/X/i/l/p/Y arms.
      // All twenty `A` tiles in all seven levels are now `r`, so no grid
      // places `A` — pinned by tests/world/levels.test.ts, with the
      // Mancubus recorded UNREACHABLE in tests/world/rosterReach.test.ts.
      // `A:"armor"` is kept, still unreachable, for the reason `spawnProp`
      // kept `V`: the overlap itself is deliberately still open. Residual:
      // `R` is the REIVER, so `r`/`R` is a live case-pair like `v`/`V` —
      // every glyph free in all five tables has such a twin. See
      // docs/known-issues.md KNOWN-11 for the full glyph derivation.
      const map2:Record<string,string>={h:"health",A:"armor",r:"armor",a:"bullets",b:"shells",o:"slugs",c:"crosses",K:"key",
        "2":"w1","3":"w2","4":"w3","5":"w4","6":"w5","7":"w6","8":"w7","9":"nails","0":"souls"};
      const k=map2[ch];if(!k)continue;
      const tex=(k[0]==="w"?ITEMTEX.gun:ITEMTEX[k]) as THREE.CanvasTexture;
      world.items.push({kind:k,x:wx,z:wz,sp:addSprite(tex,wx,wz,.55,.55,.5),bob:Math.random()*6});}
    world.grid[z][x]=".";}
  // Every builder has added its children by here, so one pass applies the
  // whole cast/receive policy. At the end rather than per-site because the
  // policy is one decision living in one file (src/render/Shadows.ts); a
  // scene child whose name is not in `SHADOW_POLICY` keeps three's defaults.
  applyShadowFlags(renderState.scene);
  player.vx=player.vy=player.vz=0;player.pyy=EYE+floorHeightAt(player.px,player.pz);input.yaw=Math.PI;input.pitch=0;player.grounded=true;
  const lt=document.getElementById("lvltitle") as HTMLElement;
  lt.textContent=Ldef.name;lt.style.opacity="1";
  after(()=>lt.style.opacity="0",5000);
  showMsg(Ldef.name,3.4);
  after(()=>say("lvl"+idx,true),1400);}

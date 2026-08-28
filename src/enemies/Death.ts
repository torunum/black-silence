import * as THREE from "three";
import { clamp, pick, rnd } from "../utils/math";
import { PX } from "./SpriteBaker";
import { alertSound } from "./ai/Perception";
import { S } from "../core/State";
import { showWin } from "../ui/LevelEnd";
import { after } from "../core/Timers";
import { renderState } from "../render/Renderer";
import { addSprite } from "../render/RenderCore";
import { ITEMTEX } from "../render/ItemTextures";
import { fireP, sparks, blood } from "../fx/Particles";
import { spawnGibs } from "../fx/Gibs";
import { addPool } from "../fx/Decals";
import { screenShake, shake } from "../fx/ShakeState";
import { headPool } from "../fx/Heads";
import { bang, blip, boom } from "../audio/Sfx";
import { deathCry, growl, gurgle } from "../audio/Voice";
import { stopBossMusic } from "../audio/Ambient";
import { say } from "../ui/Subtitles";
import { ach } from "../ui/Toasts";
import { showMsg } from "../ui/HudMessages";
import { ACHIEVEMENTS } from "../content/achievements";
import { player } from "../player/PlayerState";
import { damagePlayer } from "../player/Player";
import { weaponRuntime } from "../weapons/WeaponRuntime";
import { EYE, CELL } from "../world/Grid";
import { solidAt } from "../world/Collision";
import { world } from "../world/WorldState";
import { track } from "../render/DisposeRegistry";

/**
 * Enemy death — kill resolution (gib/decapitate/plain), severed heads,
 * ammo drops, boss death and the level exit a boss unlocks. Moved verbatim
 * from `src/legacy.js`'s "DAMAGE / DEATH" section (formerly lines 178-309:
 * `killEnemy` 178-225, `spawnHead` 226-237 (the leading comment at old 226
 * belongs to `spawnHead`, not the end of `killEnemy` — another of the
 * off-by-one trailing comments the plan's line ranges warn about),
 * `headTick` 238-262, `dropAmmo` 263-265, `bossDeath` 266-295, `openExit`
 * 296-309; `reference/sonsurum.html` lines 3025-3156).
 *
 * `dropAmmo` moved here instead of `src/enemies/Damage.ts`, where both the
 * plan and the first version of this task's brief originally put it. That
 * split was circular: `damageEnemy` (`Damage.ts`) calls `killEnemy` (here),
 * and `killEnemy` calls `dropAmmo` — two files importing each other, which
 * `madge --circular` (a hard gate in `npm test`) forbids. Moving `dropAmmo`
 * here instead leaves `Damage.ts -> Death.ts` (`damageEnemy -> killEnemy`)
 * as the only cross-file edge, and it is the better grouping on merit
 * anyway: `dropAmmo` is a death drop, and its only other caller
 * (`legacy.js`'s AI section, formerly line 437) is itself inside a death
 * branch.
 *
 * `killEnemy`'s Afrit death-explosion calls `damagePlayer`
 * (`legacy.js`, formerly line 189). Task 7 made it a real export of
 * `src/player/Player.ts`, so this is a direct one-way import — nothing in
 * `Player.ts`'s import graph reaches this file (confirmed with
 * `madge --circular src/`).
 *
 * `bossDeath` calls `showWin` through `src/core/Timers.ts`'s
 * `after(()=>showWin(),2800)`, a direct import from `src/ui/LevelEnd.ts` as
 * of Plan 0F Task 2. Routing it through `after` (Task 6) is a deliberate
 * behavior change, not just a mechanical swap: `loadLevel`'s
 * `clearAllTimers()` now cancels this 2.8s win-screen delay if a level load
 * happens inside that window, where a bare `setTimeout` would have shown
 * the win screen over a level the player already moved on from. That is
 * the exact bug class this task exists to kill, and a win and a level load
 * can't both be honoured, so suppressing the stale win screen is correct.
 * Before this, `showWin` stayed in `legacy.js` and this call routed through
 * `src/core/Context.ts`'s locator instead, registered the other way around
 * from `endLevel`/`damagePlayer`: `showWin` itself lived in `legacy.js`,
 * and this file (`Death.ts`) reached it through the locator. `Context.ts`
 * now holds only `wakeBoss`, a genuine cycle-break rather than a bridge to
 * code that had not moved yet; see its own doc comment.
 *
 * `world.enemies` and `headPool.heads` are both loosely typed
 * (`Array<Record<string, unknown>>`, see those modules' own doc comments),
 * so `killEnemy`'s blast-radius loop and `headTick`'s per-head loop cast
 * through minimal local interfaces, the same convention `Props.ts`/
 * `Hitscan.ts` established for `world.enemies`/`world.props`.
 *
 * `killEnemy`/`spawnHead`/`bossDeath`'s own `e` parameter is typed `unknown`
 * and cast at the point of use to the local `KillEnemy` shape below, the
 * same convention `src/enemies/Damage.ts` established: `killEnemy`'s only
 * caller is `damageEnemy`, which casts its own loosely-typed enemy the same
 * way. `DamageInfo` — the hit-info bag `killEnemy`/`spawnHead` both read —
 * is declared here (not in `Damage.ts`, its other consumer) and exported,
 * because `Damage.ts` already imports `killEnemy` from this file; declaring
 * it there instead and importing it back would close
 * `Damage.ts -> Death.ts -> Damage.ts`, the exact two-file cycle this file's
 * own header explains `dropAmmo` moved here to avoid.
 */

/** world.enemies elements, cast for killEnemy's Afrit blast-radius loop. */
interface DeathEnemy {
  dead?: boolean;
  x: number;
  z: number;
  hp: number;
}

/** The weapon/explosion hit-info bag passed through damageEnemy -> killEnemy -> spawnHead. */
export interface DamageInfo {
  wIdx?: number;
  head?: boolean;
  leg?: boolean;
  arm?: boolean;
  armSide?: string;
  lateral?: number;
  dir?: { x: number; z: number };
  dist?: number;
  hx?: number;
  hy?: number;
  hz?: number;
  explosive?: boolean;
}

/** world.enemies elements, cast for killEnemy/spawnHead/bossDeath's kill resolution. */
interface KillEnemy {
  dead?: boolean;
  summoned?: boolean;
  blob: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  sp: THREE.Sprite;
  key: string;
  x: number;
  z: number;
  fy?: number;
  toxic?: boolean;
  boss?: boolean;
  hp: number;
  gone?: boolean;
  h: number;
  w: number;
  pain: number;
  deathT: number;
  deathKind?: number;
  deathDir: number;
  kx: number;
  kz: number;
  stone?: boolean;
}

/**
 * world.exitPos's actual shape, set by LevelLoader.ts for the "X" tile —
 * same convention as src/player/Player.ts's own local ExitPos interface,
 * used here for openExit's own writes/reads of the same loosely-typed field.
 */
interface ExitPos {
  x: number;
  z: number;
}

/** headPool.heads elements, cast for headTick's per-head physics loop. */
interface Head {
  sp: THREE.Sprite;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  rest: boolean;
  life: number;
  sz: number;
}

export function killEnemy(enemy: unknown, finalDmg: number, info: DamageInfo) {
  const e=enemy as KillEnemy;
  e.dead=true;
  if(!e.summoned)S.kills++;
  S.totKills++;
  e.blob.scale.setScalar(1.6);
  /* Afrit death explosion */
  if(e.key==="q"){
    fireP(e.x,e.fy?e.fy+1:1,e.z,26);sparks(e.x,1,e.z,16);boom(.8);
    renderState.boomLight.position.set(e.x,1.2,e.z);renderState.boomLight.intensity=3.5;renderState.boomLight.color.setHex(0xff7830);
    const pd=Math.hypot(player.px-e.x,player.pz-e.z);
    if(pd<3.5&&Math.abs((e.fy||0)-(player.pyy-EYE))<2)damagePlayer(28*(1-pd/3.5));
    for(const o of world.enemies as unknown as DeathEnemy[]){if(o.dead||o===e)continue;
      if(Math.hypot(o.x-e.x,o.z-e.z)<3)o.hp-=30;}}
  if(info.wIdx===-1){S.kickK=(S.kickK||0)+1;
    if(S.kickK===3)ach(ACHIEVEMENTS.boot,S.ach);}
  if(S.totKills===1)ach(ACHIEVEMENTS.first,S.ach);
  if(S.totKills===60)ach(ACHIEVEMENTS.sixty,S.ach);
  alertSound(e.x,e.z,10);
  if(e.toxic){world.poisonZones.push({x:e.x,z:e.z,r:1.8,t:4.5});}
  if(e.boss){bossDeath(e);return;}
  const overkill=info.explosive||(-e.hp>22)||(info.wIdx===1&&typeof info.dist==="number"&&info.dist<4.5);
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
export function spawnHead(e: KillEnemy, info: DamageInfo) {
  const tex=PX[e.key].a;
  const sp=new THREE.Sprite(track(new THREE.SpriteMaterial({map:tex,transparent:true})));
  const sz=Math.max(.34,e.w*.34);
  sp.scale.set(sz,sz,1);
  sp.position.set(e.x,e.h*.92,e.z);
  renderState.scene.add(sp);
  const dx=info&&info.dir?info.dir.x:rnd(-1,1),dz=info&&info.dir?info.dir.z:rnd(-1,1);
  headPool.heads.push({sp,x:e.x,y:e.h*.92,z:e.z,
    vx:dx*rnd(2,4)+rnd(-1,1),vy:rnd(3.5,5.5),vz:dz*rnd(2,4)+rnd(-1,1),
    spin:rnd(-8,8),rest:false,life:30,sz});}

export function headTick(dt: number) {
  for(let i=headPool.heads.length-1;i>=0;i--){const h=headPool.heads[i] as unknown as Head;
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
    const pd=Math.hypot(h.x-player.px,h.z-player.pz);
    if(pd<.7){
      const a=Math.atan2(h.x-player.px,h.z-player.pz);
      const force=weaponRuntime.kickAnim>0?9:3.4;
      h.vx=Math.sin(a)*force;h.vz=Math.cos(a)*force;h.vy=weaponRuntime.kickAnim>0?5:2.2;
      h.spin=rnd(-12,12);h.rest=false;
      if(weaponRuntime.kickAnim>0){bang(.08,.3,500);blood(h.x,h.y,h.z,4,1.4);}}
    h.sp.position.set(h.x,h.y,h.z);
    if(h.life<=0){renderState.scene.remove(h.sp);headPool.heads.splice(i,1);}}}

export function dropAmmo(x: number, z: number) {
  const k=pick(["bullets","shells","bullets"]);
  world.items.push({kind:k,x,z,sp:addSprite(ITEMTEX[k] as THREE.CanvasTexture,x,z,.55,.55,.5),bob:0});}

export function bossDeath(e: KillEnemy) {
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
    after(()=>showWin(),2800);}}

export function openExit() {
  if(world.exitPos)return;
  // place exit on a guaranteed-open tile in the south processional area
  const cands=[[16,16],[16,15],[15,16],[17,16],[16,17]];
  let gx=16,gz=16;
  for(const[cx,cz] of cands){
    const wx=(cx+.5)*CELL,wz=(cz+.5)*CELL;
    if(!solidAt(wx,wz)){gx=cx;gz=cz;break;}}
  world.exitPos={x:(gx+.5)*CELL,z:(gz+.5)*CELL};
  const pad=new THREE.Mesh(track(new THREE.BoxGeometry(CELL*1.3,.06,CELL*1.3)),
    track(new THREE.MeshBasicMaterial({color:0x4a6b8a})));
  pad.position.set((world.exitPos as unknown as ExitPos).x,.03,(world.exitPos as unknown as ExitPos).z);renderState.scene.add(pad);
  const gl=track(new THREE.PointLight(0x4a6b8a,1.1,8));gl.position.set((world.exitPos as unknown as ExitPos).x,1,(world.exitPos as unknown as ExitPos).z);renderState.scene.add(gl);
  blip(120,.7,"sine",.09,90,true);growl(70,.4,.2,true);}

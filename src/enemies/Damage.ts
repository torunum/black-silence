import { clamp, rnd } from "../utils/math";
import { PX } from "./SpriteBaker";
import { bang } from "../audio/Sfx";
import { pain, gurgle } from "../audio/Voice";
import { showMsg } from "../ui/HudMessages";
import { sparks, blood } from "../fx/Particles";
import { spawnGibs, spawnGibChunk } from "../fx/Gibs";
import { addPool } from "../fx/Decals";
import { player } from "../player/PlayerState";
import { killEnemy } from "./Death";
import { wakeBoss } from "./Boss";

/**
 * Enemy damage — hit resolution, dismemberment and the sprite/knockback
 * fallout of taking a hit, but not death itself (`src/enemies/Death.ts`).
 * Moved verbatim from `src/legacy.js`'s "DAMAGE / DEATH" section (formerly
 * lines 114-177: `damageEnemy` 114-155, `refreshSeverSprite` 156-166,
 * `severLimb` 167-177 — the trailing comments at old 156/167 actually lead
 * the *next* function, not the one above them, exactly the kind of
 * off-by-one the plan's line ranges warn about; `reference/sonsurum.html`
 * lines 2954-3024).
 *
 * `dropAmmo` was originally slated for this file too (both the plan and the
 * first version of this task's brief said so), but that split is circular:
 * `damageEnemy` calls `killEnemy` (`Death.ts`), and `killEnemy` calls
 * `dropAmmo` — two files importing each other, which `madge --circular`
 * (a hard gate in `npm test`) forbids. `dropAmmo` moved to `Death.ts`
 * instead, which leaves `damageEnemy -> killEnemy` as the only cross-file
 * edge and needs no locator: nothing in `Death.ts` calls back here.
 *
 * `damageEnemy` calls `wakeBoss` (`src/enemies/Boss.ts`, Task 10) directly —
 * `if(e.boss&&e.dormant)wakeBoss(e);`. Before Task 10's AI extraction this
 * routed through `src/core/Context.ts`'s locator, on the reasoning (stated
 * in the Task 9 brief, treating the AI section as one monolith) that a
 * direct import would close a cycle against the AI's own calls into
 * `damageEnemy`/`damagePlayer`. Splitting the AI section into
 * `ai/Behaviors.ts`/`ai/Locomotion.ts`/`ai/Attacks.ts`/`Boss.ts` changed the
 * answer: `Boss.ts` never calls `damageEnemy` (that call lives in
 * `ai/Behaviors.ts`'s `enemyTick`), so `Damage.ts -> Boss.ts` is one-way.
 * `madge --circular src/` confirmed it stays a DAG (Task 10's Step 6); the
 * `wakeBoss` entry was removed from `Context.ts` accordingly.
 *
 * `damageEnemy` used to register itself into `src/core/Context.ts`'s
 * locator at module scope below, the way `Player.ts` still registers
 * `endLevel`, and `src/world/Props.ts`/`src/weapons/Hitscan.ts`/
 * `src/weapons/WeaponState.ts` called it via `ctx.damageEnemy?.(...)`. Task
 * 10's Step 6 retired that entry once `madge --circular src/` confirmed a
 * direct import from those three callers closes no cycle, so this file no
 * longer imports the locator at all — `damageEnemy` is a plain export now.
 */

export function damageEnemy(e, dmg, info) {
  info=info||{};
  if(e.dead)return;
  /* Hexen Centaur/Slaughtaur shield — blocks most frontal fire */
  if(e.shield&&!info.explosive&&info.dir){
    // facing roughly toward the shot source = blocked
    const toP=Math.atan2(player.px-e.x,player.pz-e.z);
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
export function refreshSeverSprite(e) {
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
export function severLimb(e, type, info) {
  const y=type==="legs"?e.h*.25:e.h*.55;
  const n=type==="legs"?5:4;
  spawnGibs(e.x,y,e.z,n,3.2);
  blood(e.x,y,e.z,12,2.2);
  addPool(e.x,e.z,rnd(.3,.5));
  gurgle(.25,.4);
  if(info&&info.dir){ // throw a big chunk in the shot direction
    spawnGibChunk(e.x,y,e.z,info.dir.x,info.dir.z);}
  showMsg(type==="legs"?"LEGS BLOWN OFF":"LIMB SEVERED");}

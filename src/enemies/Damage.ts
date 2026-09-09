import { clamp, rnd } from "../utils/math";
import { PX } from "./SpriteBaker";
import { at } from "../audio/AudioEngine";
import { bang } from "../audio/Sfx";
import { pain, gurgle } from "../audio/Voice";
import { showMsg } from "../ui/HudMessages";
import { sparks, blood } from "../fx/Particles";
import { spawnGibs, spawnGibChunk } from "../fx/Gibs";
import { addPool } from "../fx/Decals";
import { player } from "../player/PlayerState";
import { killEnemy, type DamageInfo } from "./Death";
import { ctx } from "../core/Context";
import type { Enemy } from "./Enemy";

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
 * `damageEnemy` reaches `wakeBoss` (`src/enemies/Boss.ts`) through
 * `src/core/Context.ts`'s locator — `if(e.boss&&e.dormant)ctx.wakeBoss?.(e);`
 * — and that indirection is load-bearing. A direct import closes a real
 * four-file cycle:
 *
 *     Damage.ts -> Boss.ts -> ai/Attacks.ts -> world/Props.ts -> Damage.ts
 *
 * Plan 0E Task 10 briefly retired this entry, on the reasoning that
 * `Boss.ts` never calls `damageEnemy` itself (true — that call lives in
 * `ai/Behaviors.ts`'s `enemyTick`) and that `madge --circular src/` had
 * confirmed a DAG. The first half was right and the second was worthless:
 * madge's default extension list excludes `.ts`, so that command scanned
 * only `src/legacy.js` and reported success without ever seeing this graph.
 * The cycle is transitive, which is exactly the kind a person checking one
 * edge by eye will miss and a working `madge` catches instantly.
 *
 * Plan 0F Task 1 fixed the gate (`--extensions ts,js` in package.json's
 * test script) and restored this entry. `tests/integration/contextWiring.test.ts`
 * now pins the registration, verified against two sabotages: removing it,
 * and pointing it at `roarFor`.
 *
 * `damageEnemy` itself used to be a locator entry too, registered from this
 * file's module scope, with `src/world/Props.ts`/`src/weapons/Hitscan.ts`/
 * `src/weapons/WeaponState.ts` calling it via `ctx.damageEnemy?.(...)`. Plan
 * 0E Task 10's Step 6 retired it in favour of direct imports from those
 * three. That retirement was justified by the same broken `madge` run as the
 * `wakeBoss` one above, so its evidence was worthless at the time — but
 * unlike `wakeBoss` it happens to have been correct, and the working gate
 * (`--extensions ts,js`) confirms those three edges close no cycle.
 * `damageEnemy` is a plain export. This file still imports the locator, for
 * `wakeBoss` and nothing else.
 *
 * `damageEnemy`/`refreshSeverSprite`/`severLimb`'s own `e` parameter is
 * loosely typed too: `damageEnemy` is called from four different files
 * (`ai/Behaviors.ts`, `weapons/Hitscan.ts`, `weapons/WeaponState.ts`,
 * `world/Props.ts`), each casting `world.enemies` elements through its own
 * minimal local interface, so its real shape varies by caller. It takes
 * `unknown` and casts once, at the top, to the local `DamageEnemy` shape
 * below — the same convention `src/enemies/Death.ts`/`Boss.ts` follow —
 * rather than forcing every caller's minimal interface to grow fields it
 * never otherwise reads. `refreshSeverSprite`/`severLimb` are only ever
 * called from here with that same already-cast value, so they take
 * `DamageEnemy` directly.
 */

/** world.enemies elements, cast for damageEnemy's hit resolution and severLimb's dismemberment. */
type DamageEnemy = Pick<
  Enemy,
  | "dead"
  | "shield"
  | "x"
  | "z"
  | "h"
  | "plate"
  | "sp"
  | "hp"
  | "hurt"
  | "pain"
  | "kbRes"
  | "kx"
  | "kz"
  | "stun"
  | "slow"
  | "boss"
  | "dormant"
  | "key"
  | "sever"
  | "severKey"
>;

export function damageEnemy(enemy: unknown, dmg: number, info?: DamageInfo) {
  const e=enemy as DamageEnemy;
  info=info||{};
  if(e.dead)return;
  /* Hexen Centaur/Slaughtaur shield — blocks most frontal fire */
  if(e.shield&&!info.explosive&&info.dir){
    // facing roughly toward the shot source = blocked
    const toP=Math.atan2(player.px-e.x,player.pz-e.z);
    const shotDir=Math.atan2(-info.dir.x,-info.dir.z);
    let d=Math.abs(((toP-shotDir+Math.PI)%(2*Math.PI))-Math.PI);
    if(d<1.0){dmg*=0.25;at(info.hx||e.x,info.hy||e.h*.6,info.hz||e.z,()=>bang(.04,.3,3000,800));sparks(info.hx||e.x,info.hy||e.h*.6,info.hz||e.z,4);}
  }
  if(e.plate>0&&!info.explosive){
    e.plate-=dmg;
    at(info.hx||e.x,info.hy||e.h*.6,info.hz||e.z,()=>bang(.05,.32,2800,700));
    e.stun=Math.max(e.stun,.08);
    if(e.plate<=0){
      spawnGibs(e.x,e.h*.7,e.z,4,3.4,true);
      at(info.hx||e.x,info.hy||e.h*.6,info.hz||e.z,()=>bang(.15,.35,900));showMsg("ARMOR SHATTERED");
      e.sp.material.color.setHex(0x8a9650);}
    return;}
  e.hp-=dmg;
  e.hurt=.12;e.sp.material.color.setHex(0xff8866);
  at(info.hx||e.x,info.hy||e.h*.6,info.hz||e.z,()=>pain(clamp(e.pain*.35,70,360),.08+Math.random()*.04));
  const res=1-(e.kbRes||0);
  const kb=(info.explosive?7:(info.wIdx===1?5:info.wIdx===0?2.4:info.wIdx===4?6:info.wIdx===-1?0:1.1))*res;
  if(info.dir){e.kx+=info.dir.x*kb;e.kz+=info.dir.z*kb;}
  e.stun=Math.max(e.stun,(info.explosive?.5:(info.wIdx===1?.35:info.wIdx===4?.45:info.wIdx===0?.2:.08))*res+.02);
  if(info.leg&&!e.boss)e.slow=Math.min(e.slow,.6);
  if(e.boss&&e.dormant)ctx.wakeBoss?.(e);
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
export function refreshSeverSprite(e: DamageEnemy) {
  const P=PX[e.key],s=e.sever||{};
  let key: "noLegs" | "noLArm" | "noRArm" | "gibbed" | null = null;
  if(s.legs)key="noLegs";
  if(s.lArm)key="noLArm";
  if(s.rArm)key="noRArm";
  if(s.lArm&&s.rArm)key="gibbed";
  if(!key)return;
  e.severKey=key;
  e.sp.material.map=P[key]||P.a;e.sp.material.needsUpdate=true;}

/* spawn a flying chunk for a torn-off limb + a wet sound */
export function severLimb(e: DamageEnemy, type: string, info?: DamageInfo) {
  const y=type==="legs"?e.h*.25:e.h*.55;
  const n=type==="legs"?5:4;
  spawnGibs(e.x,y,e.z,n,3.2);
  blood(e.x,y,e.z,12,2.2);
  addPool(e.x,e.z,rnd(.3,.5));
  at(e.x,y,e.z,()=>gurgle(.25,.4));
  if(info&&info.dir){ // throw a big chunk in the shot direction
    spawnGibChunk(e.x,y,e.z,info.dir.x,info.dir.z);}
  showMsg(type==="legs"?"LEGS BLOWN OFF":"LIMB SEVERED");}

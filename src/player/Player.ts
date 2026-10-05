import type * as THREE from "three";
import { rnd } from "../utils/math";
import { ctx } from "../audio/AudioEngine";
import { playerHurt, footstep as footstepSound, landing as landingSound, jump, gauntletBegins, gauntletCleared } from "../audio/sounds/world";
import { stopBossMusic } from "../audio/Ambient";
import { stopMusic } from "../audio/Music";
import { flashDmg, showMsg } from "../ui/HudMessages";
import { say } from "../ui/Subtitles";
import { ach } from "../ui/Toasts";
import { exitTick } from "../world/Transition";
import { checkpointTick } from "../world/Checkpoints";
import { showDeath } from "../ui/DeathScreen";
import { screenBlood } from "../render/Overlay2D";
import { addSprite } from "../render/RenderCore";
import { renderState } from "../render/Renderer";
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
import { animCues } from "../core/AnimCues";

/**
 * Player movement, damage and death — the per-frame integrator and the two
 * functions it calls that touch nothing outside this file. Moved verbatim
 * from `src/legacy.js`'s "PLAYER" section (formerly lines 728-821;
 * `reference/sonsurum.html`'s equivalent section).
 *
 * `playerTick` calls `exitTick` (the level's exit door, `src/world/Transition.ts`,
 * from the transitions plan; until then it called `endLevel` for a glowing pad
 * in the floor). `endLevel` was a direct import from `src/ui/LevelEnd.ts` as of
 * Plan 0F Task 2. Before that, `endLevel` stayed in `legacy.js` and this file reached it
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
  if(!silent){flashDmg(.45);shake(.3);screenBlood();animCues.hurt++;animCues.hurtAmt=dmg; // (the cue: the hands flinch — animation only, round 2 Task 4)
    playerHurt();}
  if(S.hp<35&&Math.random()<.3)say("lowhp");
  if(S.hp<=0){S.hp=0;S.dead=true;
    stopBossMusic();stopMusic();
    document.exitPointerLock();
    showDeath();}}   // the death screen: rise at the last shrine, or restart the level — in the engine, no page reload (src/ui/DeathScreen.ts)

/**
 * `player.bobT`'s per-frame rate, `spd*dt*rate` — drives both the footstep
 * zero-crossing test below (`sin(bobT*4)`) and, once per frame, the weapon
 * viewmodel's bob offset (`src/render/viewmodel/draw.ts`'s `bx`/`by`, fed
 * the same `bobT`). Was `1.6`/`1.9` (walk/sprint): sprinting's own top speed
 * (10.5 vs 7, `accelerate` above) already made footsteps land faster while
 * running, and the `1.9` on top of that compounded it further — sprint
 * cadence was walk's speed ratio (1.5x) *times* an extra 1.1875x. The
 * project owner played the game and reported running's footsteps as "far
 * too much noise" — player feedback round 1, task 3, 2026-09-17 — so
 * `SPRINT_BOB_RATE` now equals `WALK_BOB_RATE`: sprinting still steps
 * faster than walking (it moves 1.5x as fast, and bobT scales with actual
 * speed), but only by that speed ratio, not by speed times an added bump.
 *
 * **Player feedback round 2 (2026-09-28): now `0.45`, both.** The owner
 * played again and reported the weapon swaying left and right very fast,
 * and the footsteps with it. At `1.6` a step came every
 * `2π/(4·spd·rate)` s: `spd·1.6·4/2π` = **7.1 steps/s walking** (spd 7) and
 * **10.7 sprinting** (10.5) — a human walks at about 2 and runs at about 3.
 * Round 1's note above named speed as the next lever; it was the wrong one —
 * the speed was fine, the cadence was 3.5x too fast. At `0.45`,
 * steps/s = `spd·0.45·2/π`: **2.01 walking, 3.01 sprinting**, and the
 * viewmodel's figure-eight (`src/render/viewmodel/motion.ts`), which sways
 * sideways once per two steps, drops from 3.6/5.3 Hz to **1.0/1.5 Hz**.
 * One rate still serves both, so sprint's cadence stays exactly its speed
 * ratio (1.5x) over walking's. Movement speed, acceleration and every
 * other gameplay value are untouched; the camera bob keeps its amplitude
 * and follows `bobT`'s new tempo. Exported so
 * `tests/player/Player.test.ts` can pin the tuned values directly, the same
 * reason `src/render/viewmodel/draw.ts` exports its own
 * `WALK_BOB_AMT`/`SPRINT_BOB_AMT`.
 */
export const WALK_BOB_RATE=0.45, SPRINT_BOB_RATE=0.45;
function accelerate(wx_: number, wz_: number, maxs: number, acc: number, dt: number): void {
  const cur=player.vx*wx_+player.vz*wz_,add=maxs-cur;if(add<=0)return;
  let a=acc*maxs*dt;if(a>add)a=add;player.vx+=wx_*a;player.vz+=wz_*a;}
function footstep(sprinting: boolean): void {
  if(!ctx())return;
  const marble=S.level===1;
  footstepSound(sprinting,marble);}
/**
 * The frame the player touches the ground, falling at `speed` m/s — where a
 * running `footstep(true)` used to play. Player feedback round 2 Task 5: the
 * landing is its own sound now, and scales with the fall
 * (`src/audio/sounds/steps.ts`). Same moment, same guard, and it reads
 * `player.vy` before the line that zeroes it; nothing else changed.
 */
function land(speed: number): void {
  if(!ctx())return;
  landingSound(speed,S.level===1);}
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
    if(keys.Space){player.vy=7.4;player.grounded=false;jump();}
  }else accelerate(wx_,wz_,1.4,70,dt);
  player.vy-=20*dt;player.pyy+=player.vy*dt;
  if(player.pyy<=standY){if(!player.grounded){land(-player.vy);shake(.04);}player.pyy=standY;player.vy=0;player.grounded=true;}
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
  player.bobT+=spd*dt*(sprint?SPRINT_BOB_RATE:WALK_BOB_RATE);
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
  /* the exit door: walking into it opens it, coming up to it says so or says why not (src/world/Transition.ts) */
  exitTick();
  checkpointTick(dt);   // a checkpoint marker the player comes up to catches, and records what they carry (src/world/Checkpoints.ts)
  /* challenge plate */
  if(world.challenge&&(world.challenge as unknown as ChallengeState).state===0&&Math.hypot(player.px-(world.challenge as unknown as ChallengeState).x,player.pz-(world.challenge as unknown as ChallengeState).z)<1){
    (world.challenge as unknown as ChallengeState).state=1;say("challenge",true);
    showMsg("THE PLATE HUMS — THEY ARE COMING",3);
    gauntletBegins();
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
      gauntletCleared();}}}

export { damagePlayer, accelerate, footstep, playerTick };

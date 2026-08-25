import * as THREE from "three";
import { rnd } from "./utils/math";
import { LEVELS } from "./world/levels/index";
import { buildTextures } from "./render/ProcTextures";
import { buildSprites } from "./enemies/SpriteBaker";
import { ITEMTEX, buildItemTex } from "./render/ItemTextures";
import { audioInit, getMasterVolume, setMasterVolume } from "./audio/AudioEngine";
import { click } from "./audio/Sfx";
import { organChord, pianoNote, stopBossMusic } from "./audio/Ambient";
import { renderState } from "./render/Renderer";
import { partTick } from "./fx/Particles";
import { poolTick } from "./fx/Decals";
import { gibTick } from "./fx/Gibs";
import { screenShake } from "./fx/ShakeState";
import { projTick } from "./fx/ProjectileTick";
import { save } from "./save/SaveGame";
import { pianoState } from "./ui/PianoState";
import { world } from "./world/WorldState";
import { fxTick } from "./render/Overlay2D";
import { addSprite } from "./render/RenderCore";
import { buildWeaponSprites } from "./render/viewmodel/sprites";
import { drawKickBoot, drawViewmodel } from "./render/viewmodel/draw";
import { ACHIEVEMENTS } from "./content/achievements";
import { say, tickSubtitles } from "./ui/Subtitles";
import { ach } from "./ui/Toasts";
import { tickMessage } from "./ui/HudMessages";
import { keys, setInputHooks, overlayOpen, input } from "./player/Input";
import { game } from "./core/Game";
import { weaponRuntime } from "./weapons/WeaponRuntime";
import { player } from "./player/PlayerState";
import { playerTick } from "./player/Player";
import { interact, itemsTick, doorTick, propTick, torchTick } from "./player/Interact";
import { S } from "./core/State";
import { loadLevel } from "./world/LevelLoader";
import { ringTick, strikeTick, poisonTick } from "./enemies/ai/Attacks";
import { cineTick } from "./enemies/Boss";
import { enemyTick } from "./enemies/ai/Behaviors";
import { headTick } from "./enemies/Death";
import { requestSwitch, startReload, weaponTick, doKick, WEAPONS, EQUIP_T, UNEQUIP_T } from "./weapons/WeaponState";
import { ambience, vitalsAudio } from "./world/Ambience";
import { eventTick } from "./world/RandomEvents";
// Renamed on import: `ctx` is already bound above to AudioEngine's audio-context
// accessor (`ctx()`, two call sites now that footstep's third moved to
// Player.ts with Task 7). This is Context.ts's service locator — see its
// own doc comment — registered below for endLevel, openPiano and showWin,
// the only entries left: damagePlayer, damageEnemy and wakeBoss were
// retired from the locator entirely by Task 10's Step 6, once the AI
// extraction's module split let their callers (Props.ts, Hitscan.ts,
// WeaponState.ts, Damage.ts) import them directly instead.
import { ctx as svcCtx } from "./core/Context";

/* ============================================================
   THE BLACK SILENCE — The Hollow Parish (v3 gothic overhaul)
   2 levels · 9 enemy types + elites · 3 bosses · 6 weapons ·
   power kick · destructibles · playable piano · monologues
   ============================================================ */

/* damagePlayer moved to src/player/Player.ts (Task 7), damageEnemy moved to
   src/enemies/Damage.ts (Task 9) and wakeBoss moved to src/enemies/Boss.ts
   (Task 10); each registered itself into this locator at its own module
   scope for a time, but Task 10's Step 6 tested each against
   `madge --circular src/` once the AI section's module split made every
   remaining edge one-way, and retired all three — their callers
   (`src/world/Props.ts`, `src/weapons/Hitscan.ts`,
   `src/weapons/WeaponState.ts`, `src/enemies/Damage.ts`) import them
   directly now, and none of the three appears in `Context.ts`'s type
   anymore. endLevel is a new entry: playerTick
   (moved to Player.ts by Task 7) reaches it through this locator because
   endLevel itself belongs to Plan 0F, not this plan, and stays here for
   now. openPiano is Task 8's new entry: interact (moved to
   src/player/Interact.ts) reaches it through this locator because
   openPiano itself belongs to Plan 0F's playable piano, not this plan, and
   stays here for now too. showWin is Task 9's remaining entry, registered
   the other way around from the three above: showWin itself still lives
   here (it belongs to Plan 0F's win screen), and bossDeath (now in
   Death.ts) reaches it through this locator instead. Function
   declarations hoist, so this can sit at module scope ahead of any of
   their definitions. */
svcCtx.endLevel=endLevel;svcCtx.openPiano=openPiano;svcCtx.showWin=showWin;

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

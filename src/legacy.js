import * as THREE from "three";
import { rnd } from "./utils/math";
import { LEVELS } from "./world/levels/index";
import { buildTextures } from "./render/ProcTextures";
import { buildSprites } from "./enemies/SpriteBaker";
import { ITEMTEX, buildItemTex } from "./render/ItemTextures";
import { audioInit, getMasterVolume, setMasterVolume } from "./audio/AudioEngine";
import { click } from "./audio/Sfx";
import { organChord, pianoNote } from "./audio/Ambient";
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
import { say, tickSubtitles } from "./ui/Subtitles";
import { tickMessage } from "./ui/HudMessages";
import { buildPiano, pianoKeyDown, closePiano } from "./ui/Piano";
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
import { hud } from "./ui/Hud";

/* ============================================================
   THE BLACK SILENCE — The Hollow Parish (v3 gothic overhaul)
   2 levels · 9 enemy types + elites · 3 bosses · 6 weapons ·
   power kick · destructibles · playable piano · monologues
   ============================================================ */

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

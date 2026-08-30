import * as THREE from "three";
import { rnd } from "../utils/math";
import { ACHIEVEMENTS } from "../content/achievements";
import { ach } from "../ui/Toasts";
import { showMsg } from "../ui/HudMessages";
import { say } from "../ui/Subtitles";
import { at } from "../audio/AudioEngine";
import { growl, gurgle } from "../audio/Voice";
import { blip } from "../audio/Sfx";
import { wetDoor, stoneDoor } from "../audio/Ambient";
import { emberP } from "../fx/Particles";
import { renderState } from "../render/Renderer";
import { ITEMTEX } from "../render/ItemTextures";
import { game } from "../core/Game";
import { player } from "./PlayerState";
import { S } from "../core/State";
import { CELL, WALLH } from "../world/Grid";
import { solidAt } from "../world/Collision";
import { world } from "../world/WorldState";
import { explodeBarrel, type Prop } from "../world/Props";
import { alertSound } from "../enemies/ai/Perception";
import { requestSwitch, WEAPONS } from "../weapons/WeaponState";
import { openPiano } from "../ui/Piano";

/**
 * Interaction and pickups — opening doors, the piano-proximity check,
 * gathering items off the floor, and three small passive ticks that don't
 * belong anywhere else (door-lowering, barrel fusing, torch/candle
 * flicker). Moved verbatim from `src/legacy.js`'s "INTERACTION + PICKUPS"
 * section (formerly lines 736-804; `reference/sonsurum.html`'s equivalent
 * section).
 *
 * `interact`'s piano-proximity branch calls `openPiano()`, imported
 * directly from `src/ui/Piano.ts`. It used to reach it through
 * `src/core/Context.ts`'s locator as `ctx.openPiano?.()`, back when
 * `openPiano` still lived in `legacy.js`; Plan 0F's Task 1 moved it (with
 * the rest of the playable piano) to `Piano.ts` and confirmed with
 * `madge --circular src/` that this file importing it directly adds no
 * cycle, so the locator entry was retired along with this file's `ctx`
 * import — none of `interact`/`itemsTick`/`doorTick`/`propTick`/`torchTick`
 * call AudioEngine's `ctx()` either, so this file uses no `ctx` at all now.
 *
 * `WNAMES` (the weapon-pickup toast strings) had exactly one reader,
 * `itemsTick`, so it moved here with it instead of staying behind in
 * `legacy.js` unexported and unused.
 */

/** world.doors[key]'s actual shape, set by LevelLoader.ts for "+"/"D"/"S" tiles. */
interface Door {
  mesh: THREE.Object3D;
  open: boolean;
  locked?: boolean;
  secret?: boolean;
  flesh?: boolean;
}

/** world.pianoPos's actual shape, set by LevelLoader.ts for the "p" tile. */
interface PianoPos {
  x: number;
  z: number;
}

/** world.items elements, cast for itemsTick's pickup loop. */
interface Item {
  taken?: boolean;
  bob: number;
  sp: THREE.Sprite;
  x: number;
  z: number;
  kind: string;
}

/** world.torches elements, cast for torchTick's flicker loop. */
interface Torch {
  L: THREE.PointLight;
  sp: THREE.Sprite;
  x: number;
  z: number;
  seed: number;
  fr: number;
}

/** world.candles elements, cast for torchTick's flicker loop. */
interface Candle {
  sp: THREE.Sprite;
  seed: number;
}

const WNAMES: Record<string, string> = {w1:"SAWED-OFF SHOTGUN",w2:"COMBAT RIFLE",w3:"TOMMY GUN",w4:"BMG SNIPER",w5:"HOLY CROSS LAUNCHER",w6:"NAIL CANNON",w7:"SOUL REAPER"};
export function interact(){
  if(!game.started||game.inputLock)return;
  if(world.pianoPos&&Math.hypot(player.px-(world.pianoPos as unknown as PianoPos).x,player.pz-(world.pianoPos as unknown as PianoPos).z)<1.9){openPiano();return;}
  const dir=new THREE.Vector3();renderState.camera.getWorldDirection(dir);
  for(let t=.4;t<2.6;t+=.2){
    const wx_=player.px+dir.x*t,wz_=player.pz+dir.z*t;
    const gx=wx_/CELL|0,gz=wz_/CELL|0,d=world.doors[gx+","+gz] as unknown as Door;
    if(d&&!d.open){
      if(d.locked&&!S.key){showMsg("IT WANTS THE RED KEY",2.2);
        say("locked");at(wx_,WALLH/2,wz_,()=>growl(80,.3,.25,true));return;}
      d.open=true;
      at(wx_,WALLH/2,wz_,()=>{if(d.flesh)wetDoor();else stoneDoor();});
      alertSound(wx_,wz_,8);
      if(d.secret){S.secrets++;S.totSecrets++;say("secret",true);
        showMsg("SECRET FOUND — "+S.secrets+"/"+S.secretsTotal,3);
        if(S.totSecrets===2)ach(ACHIEVEMENTS.curious,S.ach);}
      else if(d.locked)showMsg("THE GATE ACCEPTS THE KEY",2.4);
      return;}
    if(solidAt(wx_,wz_))return;}}
export function itemsTick(dt: number){
  for(const it of world.items as unknown as Item[]){
    if(it.taken)continue;
    it.bob+=dt*2.4;it.sp.position.y=.5+Math.sin(it.bob)*.07;
    if(Math.hypot(player.px-it.x,player.pz-it.z)<.95){
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
export function doorTick(dt: number){for(const k in world.doors){const d=world.doors[k] as unknown as Door;
  if(d.open&&d.mesh.position.y>-WALLH/2+.1)d.mesh.position.y-=dt*2.6;}}
export function propTick(dt: number){for(const p of world.props as unknown as Prop[]){
  if(p.dead||p.fuse!<0)continue;
  p.fuse!-=dt;if(p.fuse!<=0)explodeBarrel(p);}}
export function torchTick(dt: number,t: number){
  for(const tc of world.torches as unknown as Torch[]){
    const n=Math.sin(t*.011+tc.seed*7)*Math.sin(t*.017+tc.seed*3);
    tc.L.intensity=1.6+n*.45+Math.random()*.18;
    if(Math.random()<.06){tc.fr=1-tc.fr;
      tc.sp.material.map=(ITEMTEX.torch as THREE.CanvasTexture[])[tc.fr];tc.sp.material.needsUpdate=true;}
    if(Math.random()<.04)emberP(tc.x+rnd(-.1,.1),1.4,tc.z+rnd(-.1,.1));}
  for(const c of world.candles as unknown as Candle[]){
    c.sp.material.opacity=.8+Math.sin(t*.02+c.seed*9)*.2;}}

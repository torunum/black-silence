import { rnd } from "../utils/math";
import { ctx } from "../audio/AudioEngine";
import { blip } from "../audio/Sfx";
import { after } from "../core/Timers";

/**
 * 2D LAYER — viewmodels, kick boot, casings, smoke, blood. The `fx2d`
 * overlay canvas that the hand-pixeled weapon viewmodel
 * (src/render/viewmodel/{kit,sprites,draw}.ts) is drawn onto every frame,
 * plus the three lightweight particle-ish effect pools (spent shell
 * casings, smoke puffs, screen blood hits) that live entirely in 2D screen
 * space rather than the 3D scene.
 *
 * Copied verbatim from reference/sonsurum.html lines 2198-2212 (fx2d setup)
 * and 2524-2557 (fxTick) — see tests/support/reference.ts's REF.overlay2d
 * and REF.viewmodelDraw — every coordinate and colour is art.
 *
 * This module owns fx/fg/FW/FH/VW/VH and the casings/puffs/bloodHits arrays
 * as private state, per the same "module owns it, never a bare exported
 * let" rule src/audio/AudioEngine.ts and src/render/SceneRef.ts follow —
 * getFx()/getVW()/getVH() are the accessors, called at point of use, never
 * hoisted into a cached module-scoped local, in
 * src/render/viewmodel/{kit,draw}.ts.
 *
 * fxTick's own body (reference lines 2524-2557) calls drawKickBoot() and
 * drawViewmodel(dt,t) at its end — both live in
 * src/render/viewmodel/draw.ts. Rather than importing that module here
 * (which would import back from this one for getFx()/getVW()/getVH(),
 * an import cycle `madge --circular` forbids), fxTick takes them — and the
 * zoomLerp value its sniper-scope vignette needs, which, like the weapon
 * state draw.ts needs, still lives in src/legacy.js — as parameters.
 * legacy.js's one fxTick call site (in its main loop) supplies the real
 * drawKickBoot/drawViewmodel from src/render/viewmodel/draw.ts.
 */

const fx = document.getElementById("fx2d") as HTMLCanvasElement;
const fg = fx.getContext("2d") as CanvasRenderingContext2D;
let FW=640,FH=400,VW=320,VH=200;

export function sizeFx(): void {
  const a=innerWidth/innerHeight;FW=640;FH=Math.round(FW/a);
  fx.width=FW;fx.height=FH;VW=320;VH=Math.round(VW/a);
}
addEventListener("resize",sizeFx);sizeFx();

interface Casing { x: number; y: number; vx: number; vy: number; rot: number; vr: number; kind: number; life: number; }
interface Puff { x: number; y: number; vx: number; r: number; life: number; }
interface BloodHit { x: number; y: number; r: number; life: number; }

const casings: Casing[] = [], puffs: Puff[] = [], bloodHits: BloodHit[] = [];

export function ejectCasing(kind: number): void {
  casings.push({x:VW/2+rnd(4,12),y:VH*.62,vx:rnd(20,55),vy:rnd(-70,-30),
    rot:rnd(0,6),vr:rnd(-12,12),kind,life:1.6});
  if(ctx())after(()=>blip(rnd(1800,2600),.04,"square",.025),rnd(250,450));
}
export function screenBlood(): void {
  for(let i=0;i<5;i++)bloodHits.push({x:rnd(0,VW),y:rnd(0,VH),r:rnd(6,22),life:1});
}

/** Overlay2D's private 2D context, for src/render/viewmodel/{kit,draw}.ts — call at point of use, never cache. */
export function getFx(): CanvasRenderingContext2D {
  return fg;
}
/** The overlay's logical (pre-upscale) viewport width — see sizeFx. */
export function getVW(): number {
  return VW;
}
/** The overlay's logical (pre-upscale) viewport height — see sizeFx. */
export function getVH(): number {
  return VH;
}
/** Adds one smoke puff — src/render/viewmodel/draw.ts's drawViewmodel calls this from the muzzle-flash branch; puffs otherwise stays private, ticked by fxTick below. */
export function spawnPuff(x: number, y: number, vx: number, r: number, life: number): void {
  puffs.push({x,y,vx,r,life});
}

export function fxTick(
  dt: number, t: number, zoomLerp: number,
  drawKick: () => void, drawVm: (dt: number, t: number) => void,
): void {
  fg.setTransform(1,0,0,1,0,0);
  fg.clearRect(0,0,FW,FH);
  fg.imageSmoothingEnabled=false;
  const SF=FW/320;            // scale factor: draw in 320-space, upscale crisply
  fg.scale(SF,SF);
  for(let i=bloodHits.length-1;i>=0;i--){const b=bloodHits[i];
    b.life-=dt*.6;if(b.life<=0){bloodHits.splice(i,1);continue;}
    fg.fillStyle=`rgba(110,18,8,${b.life*.5})`;
    fg.beginPath();fg.arc(b.x,b.y,b.r,0,7);fg.fill();}
  for(let i=casings.length-1;i>=0;i--){const c=casings[i];
    c.life-=dt;c.vy+=240*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.rot+=c.vr*dt;
    if(c.life<=0||c.y>VH+10){casings.splice(i,1);continue;}
    fg.save();fg.translate(c.x,c.y);fg.rotate(c.rot);
    fg.fillStyle=c.kind===2?"#8a2a14":c.kind===3?"#b8b2a6":"#a08c5a";
    fg.fillRect(-2,-1,c.kind===2?5:c.kind===3?6:4,2);
    if(c.kind===2){fg.fillStyle="#a08c5a";fg.fillRect(-2,-1,1,2);}
    fg.restore();}
  for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];
    p.life-=dt;p.y-=14*dt;p.x+=p.vx*dt;p.r+=8*dt;
    if(p.life<=0){puffs.splice(i,1);continue;}
    fg.fillStyle=`rgba(120,120,128,${p.life*.16})`;
    fg.beginPath();fg.arc(p.x,p.y,p.r,0,7);fg.fill();}
  /* sniper scope overlay */
  if(zoomLerp>.5){
    fg.fillStyle="rgba(0,0,0,"+((zoomLerp-.5)*1.6)+")";
    const r=VH*.42;
    fg.beginPath();fg.rect(0,0,VW,VH);
    fg.arc(VW/2,VH/2,r,0,7,true);fg.fill();
    fg.strokeStyle="rgba(180,178,166,.6)";fg.lineWidth=1;
    fg.beginPath();fg.moveTo(VW/2-r,VH/2);fg.lineTo(VW/2+r,VH/2);
    fg.moveTo(VW/2,VH/2-r);fg.lineTo(VW/2,VH/2+r);fg.stroke();}
  drawKick();
  drawVm(dt,t);
}

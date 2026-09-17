import { getFx, getVW, getVH, spawnPuff } from "../Overlay2D";
import { vRect, vGrad, VM, SLEEVE, BOOT, MUZ } from "./kit";
import { WPX } from "./sprites";
import { clamp, rnd } from "../../utils/math";
import type { WeaponStats } from "../../weapons/definitions";

/**
 * frameFor, drawKickBoot and drawViewmodel — the per-frame draw path for
 * the hand-pixeled weapon viewmodel and the kick-boot animation. Copied
 * verbatim from reference/sonsurum.html lines 2510-2646 (see
 * tests/support/reference.ts's REF.viewmodelDraw) — every coordinate,
 * colour and gradient stop is art.
 *
 * fg/VW/VH are src/render/Overlay2D.ts's private state, fetched at each
 * function's point of use via getFx()/getVW()/getVH() rather than a cached
 * module-scoped reference — same rule as src/render/viewmodel/kit.ts.
 * spawnPuff() is Overlay2D.ts's accessor for the one place this file
 * mutates its private `puffs` pool (the muzzle-flash branch below).
 *
 * The player/weapon runtime state this block reads (started, S.dead/cur,
 * pianoOpen, zoomLerp, vx/vz, the sprint key, bobT, wstate/wtime,
 * EQUIP_T/UNEQUIP_T, kickAmt/kickRot, swayX/swayY, muzzle, WEAPONS) is not
 * owned by this module — it still lives in src/legacy.js, not yet carved by
 * any task in this plan — so unlike fg/VW/VH it is not something this file
 * can reach through an accessor of its own; it is genuine external input,
 * modeled the same way texFromPx takes its px/pal/opts: as explicit
 * parameters (ViewmodelFrame, plus the weapons table) that legacy.js's one
 * call site (inside its main loop, via Overlay2D.ts's fxTick) builds fresh
 * every frame from its own live bindings.
 */

/** Per-frame player/weapon state drawViewmodel needs, read (never written) from src/legacy.js's own live bindings. */
export interface ViewmodelFrame {
  started: boolean;
  dead: boolean;
  pianoOpen: boolean;
  zoomLerp: number;
  /** S.cur — the equipped weapon slot. */
  cur: number;
  vx: number;
  vz: number;
  /** keys.ShiftLeft || keys.ShiftRight. */
  sprintKey: boolean;
  bobT: number;
  wstate: string;
  wtime: number;
  equipT: number;
  unequipT: number;
  kickAmt: number;
  kickRot: number;
  swayX: number;
  swayY: number;
  muzzle: number;
}

/**
 * Sprint/walk weapon-bob amplitude, multiplied into `bobAmt` below. Was
 * `sprint?0.55:0.28` — sprint swung the weapon almost 2x walk's amplitude.
 * The project owner reported the sprint sway as "far too much" (player
 * feedback round 1, task 3, 2026-09-17); `SPRINT_BOB_AMT` drops to `0.38`,
 * about a third less than `0.55`, landing at roughly 1.36x `WALK_BOB_AMT`
 * instead of ~2x — sprinting still swings visibly more than walking (it is
 * still running), just not doubled. `WALK_BOB_AMT` is untouched: the
 * complaint was about running, and zeroing either value would flatten the
 * motion that sells movement, which the brief says not to do. **Next step
 * if still too much**: drop `SPRINT_BOB_AMT` further (0.30-0.32 would bring
 * it under 1.15x walk) rather than touching walk. Exported (module-level,
 * not local to `drawViewmodel`) so `tests/behavior/viewmodel.test.ts`'s
 * sprint-pose case can compute the exact offset from the frozen reference's
 * unchanged `0.55` instead of duplicating a second magic number.
 */
export const WALK_BOB_AMT=0.28, SPRINT_BOB_AMT=0.38;

/* time-based frame selection: animates fire & reload */
export function frameFor(idx: number, rT: number, wstate: string, wtime: number, weapons: readonly WeaponStats[]): HTMLCanvasElement | null {
  const set=WPX[idx];if(!set)return null;
  if(rT>=0){ // reload: spread frames across the reload duration
    const fr=set.reload||[set.idle[0]];
    const k=Math.min(fr.length-1,Math.floor(rT*fr.length));
    return fr[k];}
  if(wstate==="fire"&&set.fire){
    const w=weapons[idx];
    const ft=1-(wtime/Math.max(.001,w.rate)); // 0..1 through the shot
    const fr=set.fire;
    const k=Math.min(fr.length-1,Math.floor(ft*fr.length));
    return fr[k]||set.idle[0];}
  return set.idle[0];
}

export function drawKickBoot(kickAnim: number): void {
  if(kickAnim<=0)return;
  const fg=getFx(),VW=getVW(),VH=getVH();
  const p=1-kickAnim/.32;
  const ext=Math.sin(p*Math.PI);
  fg.save();
  /* motion streaks */
  if(ext>.3){fg.strokeStyle="rgba(180,178,166,"+(ext*.25)+")";fg.lineWidth=2;
    for(let i=0;i<3;i++){fg.beginPath();
      fg.moveTo(VW/2+44+i*9,VH-ext*VH*.3+i*14);
      fg.lineTo(VW/2+10+i*9,VH-ext*VH*.55+i*14);fg.stroke();}}
  fg.translate(VW/2+30-ext*26,VH+40-ext*(VH*.62));
  fg.rotate(-.5+ext*.25);
  const s=VH/200*1.4;fg.scale(s,s);
  vGrad(-10,18,24,60,SLEEVE,"#1e2026");                 // trouser leg
  fg.fillStyle="rgba(0,0,0,.3)";fg.fillRect(-10,30,24,3); // crease
  vGrad(-16,-8,36,30,"#32281c",BOOT);                   // boot leather
  fg.fillStyle="rgba(140,120,90,.25)";fg.fillRect(-16,-8,36,3); // top sheen
  vRect(-16,16,36,8,"#0e0b07");                          // sole
  fg.fillStyle="#1c1610";                                // tread
  for(let i=0;i<5;i++)fg.fillRect(-14+i*7,22,4,3);
  fg.strokeStyle="#0a0806";fg.lineWidth=1.4;             // laces
  for(let i=0;i<3;i++){fg.beginPath();
    fg.moveTo(-10,-4+i*6);fg.lineTo(4,0+i*6);fg.stroke();
    fg.beginPath();fg.moveTo(4,-4+i*6);fg.lineTo(-10,0+i*6);fg.stroke();}
  vRect(8,-4,8,6,VM.B1);                                 // buckle
  fg.fillStyle=VM.B3;fg.fillRect(10,-2,4,2);
  fg.restore();
}

export function drawViewmodel(dt: number, tNow: number, v: ViewmodelFrame, weapons: readonly WeaponStats[]): void {
  if(!v.started||v.dead||v.pianoOpen)return;
  if(v.zoomLerp>=.85&&v.cur===4)return; // scoped: hide rifle
  const fg=getFx(),VW=getVW(),VH=getVH();
  const w=weapons[v.cur];
  const spd=Math.hypot(v.vx,v.vz);
  const sprint=v.sprintKey&&spd>7;
  /* bob only scales in once you're actually moving; near-zero when still */
  const moveAmt=clamp((spd-0.6)/6.4,0,1);          // 0 when standing
  const bobAmt=moveAmt*(sprint?SPRINT_BOB_AMT:WALK_BOB_AMT);
  const bx=Math.sin(v.bobT*4)*2.4*bobAmt;
  const by=Math.abs(Math.cos(v.bobT*4))*1.8*bobAmt;
  let oy=0,rot=0;
  if(v.wstate==="equip"){const p=1-v.wtime/v.equipT;oy=p*p*120;rot=p*.4;}
  if(v.wstate==="unequip"){const p=v.wtime/v.unequipT;oy=p*p*120;rot=p*.4;}
  /* idle breathing: tiny, and fades out entirely while moving */
  const idleB=Math.sin(tNow*.0011)*0.7*(1-moveAmt);
  const ky=v.kickAmt*1.3;
  const rT=v.wstate==="reload"?v.wtime/w.reload:-1;
  let rdy=0;
  if(rT>=0){ // reload dip/bob
    rdy=Math.sin(clamp(rT,0,1)*Math.PI)*42;}
  // frameFor is only null when WPX has no entry for v.cur, which never
  // happens: buildWeaponSprites() populates all 8 slots at boot and v.cur
  // never leaves that range — see frameFor's own null branch for the one
  // real case (an unbuilt slot) this asserts past.
  const cv=frameFor(v.cur,rT,v.wstate,v.wtime,weapons)!;
  const pw=cv.width,ph=cv.height;
  /* upscale: a bit smaller so it doesn't dominate the screen */
  const targetH=VH*0.42;
  const sc=targetH/ph;
  const drawW=pw*sc,drawH=ph*sc;
  const cx=VW/2+bx+v.swayX*.25;
  const cyTop=VH-drawH+12+by+idleB+v.swayY*.2+ky+oy+rdy; // bottom-anchored
  fg.save();
  fg.translate(cx,cyTop+drawH/2);
  fg.rotate((rot+v.kickRot*.013+v.swayX*.0008));
  fg.imageSmoothingEnabled=false;
  // recoil: sharp kick back/down then settle, scaled per shot progress
  let punch=0,punchX=0;
  if(v.wstate==="fire"){
    const w=weapons[v.cur];
    const ft=clamp(1-(v.wtime/Math.max(.001,w.rate)),0,1);
    const env=Math.sin(Math.min(1,ft*3)*Math.PI); // fast rise, settle
    punch=env*(8+w.kick*0.7);
    punchX=Math.sin(ft*22)*env*2.2;
  }
  fg.drawImage(cv,-drawW/2+punchX,-drawH/2+punch,drawW,drawH);
  fg.restore();
  /* muzzle flash anchored to the sprite's top-center barrel */
  if(v.muzzle>0){
    const my=cyTop+drawH*0.04; // near the barrel tip
    const r=(10+Math.random()*10)*(MUZ[v.cur].r);
    const col=v.cur===5?["255,250,220","235,210,140","220,180,90"]:["255,240,190","255,170,80","255,120,40"];
    fg.save();fg.translate(cx,my);
    fg.fillStyle=`rgba(${col[0]},${Math.min(1,v.muzzle*2.2)})`;
    fg.beginPath();
    fg.moveTo(0,-r*1.5);fg.lineTo(r*.22,-r*.22);fg.lineTo(r*1.4,0);
    fg.lineTo(r*.22,r*.22);fg.lineTo(0,r*1.2);fg.lineTo(-r*.22,r*.22);
    fg.lineTo(-r*1.4,0);fg.lineTo(-r*.22,-r*.22);fg.closePath();fg.fill();
    const grd=fg.createRadialGradient(0,0,2,0,0,r*1.3);
    grd.addColorStop(0,`rgba(${col[1]},${v.muzzle})`);
    grd.addColorStop(1,`rgba(${col[2]},0)`);
    fg.fillStyle=grd;fg.beginPath();fg.arc(0,0,r*1.3,0,7);fg.fill();
    fg.restore();
    if(Math.random()<.6)spawnPuff(cx+rnd(-5,5),my,rnd(-6,6),3,rnd(.5,1));}
}

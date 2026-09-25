import { getFx, getVW, getVH, spawnPuff } from "../Overlay2D";
import { vRect, vGrad, VM, SLEEVE, BOOT, MUZ } from "./kit";
import { rnd } from "../../utils/math";
import type { WeaponStats } from "../../weapons/definitions";
import { Animator } from "./animate";
import { WEAPON_ART } from "./arts";
import { Raster, RW, RH, toRGBA } from "./raster";

/** The overlay height (a 16:9 screen's) at which one raster pixel is one overlay unit. */
export const VIEW_H = 180;
import { renderWeapon, CLEAR_BELOW } from "./rig";
import type { Pose } from "./pose";

export { WALK_BOB_AMT, SPRINT_BOB_AMT } from "./animate";

/**
 * drawViewmodel — the weapon in the player's hands, drawn every frame onto
 * the 2D overlay — and drawKickBoot, the kick.
 *
 * **Deliberate divergence from the reference** (player feedback round 2,
 * Task 1, docs/superpowers/plans/2026-09-24-player-feedback-2-hands.md):
 * the reference drew eight baked ~25x21 pixel grids, seen from directly
 * behind, and animated them by picking one of two or three frames plus a
 * dip below the screen for reload. The project owner said the weapons did
 * not read as weapons. Each weapon is now a draw function of a Pose
 * (./pose.ts), built in 3D from boxes and prisms (./builder.ts) and
 * rasterized into a fixed 320x200 indexed-colour buffer (./raster.ts) at
 * one buffer pixel per overlay unit, then copied to an offscreen canvas and
 * drawn nearest-neighbour onto the overlay. Its mechanism — hammer, pump,
 * bolt, drum, spin, break-open — moves because the pose says so.
 *
 * What is kept from the reference: this function's outer contract
 * (ViewmodelFrame, the call in src/core/Loop.ts), the early returns (not
 * started, dead, piano open, sniper scoped in), the walk/sprint bob amounts
 * and the breathing formula (./animate.ts), the flash's shape
 * and colours, and — exactly — its Math.random draws: one for the flash
 * radius and one for the puff chance (plus rnd's three when a puff spawns),
 * per frame with the flash up, in the same order. Those are per-frame
 * visual noise the reference already drew (KNOWN-20), and keeping their
 * count keeps every gameplay draw after them where the trace fixtures
 * expect it. Rendering the weapon itself draws nothing from Math.random.
 *
 * Task 2 of the same plan gave the weapon a body to ride on (./motion.ts):
 * a figure-eight stride locked to the footsteps, a sprint pose, weight
 * against turns and strafes, a lift on take-off and a dip on landing. The
 * reference's two independent bob sines and its sway, which led the mouse
 * rather than trailing it, are gone. Screen-space motion is held under a
 * ceiling here (see drawViewmodel): it may lower the weapon freely but
 * never lift its top pixel above rig.ts's CLEAR_BELOW line.
 *
 * drawKickBoot is still the reference's, byte for byte — Task 3 replaces it.
 */

/** Per-frame player/weapon state drawViewmodel needs, read (never written) from the live runtime. */
export interface ViewmodelFrame {
  started: boolean;
  dead: boolean;
  pianoOpen: boolean;
  zoomLerp: number;
  /** S.cur — the equipped weapon slot. */
  cur: number;
  vx: number;
  vz: number;
  /** player.vy — vertical velocity, for the take-off lift and the landing dip (by fall speed). */
  vy: number;
  /** player.grounded. */
  grounded: boolean;
  /** input.yaw — the facing, so the weapon can trail a strafe (velocity relative to facing). */
  yaw: number;
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

/** Everything the viewmodel keeps between frames: the animator's spin, the raster, the canvas it is copied to, and what was last rendered. */
const vm = {
  animator: new Animator(),
  raster: new Raster(),
  canvas: null as HTMLCanvasElement | null,
  ctx: null as CanvasRenderingContext2D | null,
  image: null as ImageData | null,
  lastKey: "",
  anchors: {} as Record<string, [number, number]>,
  /** The last rendered image's topmost opaque row, raster pixels (RH when empty). */
  topRow: RH,
  prevBox: { x0: 0, y0: 0, x1: RW, y1: RH },
};

/** A pose's rasterized terms, rounded — equal keys render equal pixels, so an unchanged pose is not re-rendered. */
function poseKey(cur: number, p: Pose, cy: number): string {
  const r = (n: number) => Math.round(n * 1e4);
  return [cur, cy, r(p.x), r(p.y), r(p.z), r(p.pitch), r(p.yaw), r(p.roll), r(p.recoil), r(p.action), r(p.spin), r(p.reload), r(p.heat)].join(",");
}

/**
 * Renders the pose into the shared raster (only when the pose changed) and
 * copies it to the offscreen canvas. Returns false when there is no usable
 * 2D context (tests' stubs), in which case nothing is blitted — the flash
 * below still runs, so Math.random is drawn the same either way.
 */
function paint(cur: number, pose: Pose, cy: number): boolean {
  if (!vm.canvas) {
    vm.canvas = document.createElement("canvas");
    vm.canvas.width = RW; vm.canvas.height = RH;
    vm.ctx = vm.canvas.getContext("2d");
    const img = vm.ctx?.createImageData(RW, RH);
    vm.image = img && img.data && img.data.length === RW * RH * 4 ? img : null;
  }
  // No real 2D context (the test harness's stub): nothing could be shown, so render nothing.
  if (!vm.image || !vm.ctx) return false;
  const key = poseKey(cur, pose, cy);
  if (key !== vm.lastKey) {
    vm.lastKey = key;
    const prev = { x0: vm.raster.x0, y0: vm.raster.y0, x1: vm.raster.x1, y1: vm.raster.y1 };
    vm.anchors = renderWeapon(vm.raster, WEAPON_ART[cur], pose, RW / 2, cy);
    vm.topRow = topOpaqueRow(vm.raster);
    toRGBA(vm.raster, vm.image.data, prev);
    vm.ctx.putImageData(vm.image, 0, 0);
  }
  return true;
}

/** The first row of the raster's dirty box holding an opaque pixel. */
function topOpaqueRow(r: Raster): number {
  for (let y = r.y0; y < r.y1; y++) {
    for (let x = r.x0, i = y * r.w + x; x < r.x1; x++, i++) if (r.col[i]) return y;
  }
  return RH;
}

/** Where the last rendered frame's anchors are, in raster pixels — for tests and for Tasks 2-4. */
export function lastAnchors(): Readonly<Record<string, [number, number]>> {
  return vm.anchors;
}

export function drawViewmodel(dt: number, tNow: number, v: ViewmodelFrame, weapons: readonly WeaponStats[]): void {
  if(!v.started||v.dead||v.pianoOpen)return;
  if(v.zoomLerp>=.85&&v.cur===4)return; // scoped: hide rifle
  const fg=getFx(),VW=getVW(),VH=getVH();
  const w=weapons[v.cur];
  const pose=vm.animator.step(dt,tNow,v,w,WEAPON_ART[v.cur]);
  // Scaled with the screen's height: exactly 1:1 on a 16:9 overlay (VH 180), smaller on a wider
  // screen, larger on a taller one, so the weapon is always the same share of the height and its
  // clearance below the crosshair (rig.ts's CLEAR_BELOW) holds at every aspect ratio.
  const s=VH/VIEW_H;
  const top0=VH-RH*s;
  const cy=Math.round((VH/2-top0)/s);  // the crosshair's row in the raster: the model aims there
  const painted=paint(v.cur,pose,cy);
  // The ceiling: screen-space motion (stride, lag, take-off, breathing) may lower the weapon freely,
  // but may lift it only as far as leaves its top pixel CLEAR_BELOW under the crosshair.
  let sy=pose.sy;
  if(painted&&sy<0)sy=Math.max(sy,Math.min(0,VH/2+CLEAR_BELOW*VH-(top0+vm.topRow*s)));
  const left=(VW-RW*s)/2+pose.sx, top=top0+sy;
  if(painted){
    fg.save();
    fg.imageSmoothingEnabled=false;
    fg.drawImage(vm.canvas!,Math.round(left*2)/2,Math.round(top*2)/2,RW*s,RH*s);
    fg.restore();
  }
  const glow=vm.anchors.glow;
  if(glow){ // the soul core's light spilling past its cage
    const gx=left+glow[0]*s, gy=top+glow[1]*s, gr=(14+10*pose.heat)*s;
    const g=fg.createRadialGradient(gx,gy,1,gx,gy,gr);
    g.addColorStop(0,`rgba(150,240,110,${.35+.4*pose.heat})`);g.addColorStop(1,"rgba(60,160,40,0)");
    fg.fillStyle=g;fg.beginPath();fg.arc(gx,gy,gr,0,7);fg.fill();}
  /* muzzle flash, anchored to this weapon's barrel tip */
  if(v.muzzle>0){
    const m=vm.anchors.muzzle??[RW/2,RH/2];
    const cx=left+m[0]*s, my=top+m[1]*s;
    const r=(10+Math.random()*10)*(MUZ[v.cur].r)*s;
    const col=v.cur===5?["255,250,220","235,210,140","220,180,90"]:v.cur===7?["230,255,200","150,240,110","60,160,40"]:["255,240,190","255,170,80","255,120,40"];
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

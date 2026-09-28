import { getFx, getVW, getVH, spawnPuff } from "../Overlay2D";
import { MUZ } from "./kit";
import { kickElapsed, KICK_CHAMBER, KICK_HOLD } from "./kick";
import { KICK_HIT_T } from "../../weapons/WeaponRuntime";
import { rnd } from "../../utils/math";
import type { WeaponStats } from "../../weapons/definitions";
import { Animator } from "./animate";
import { WEAPON_ART } from "./arts";
import { Raster, RW, RH, toRGBA } from "./raster";
import { renderWeapon, CLEAR_BELOW } from "./rig";
import type { Pose } from "./pose";

export { WALK_BOB_AMT, SPRINT_BOB_AMT } from "./animate";

/** The overlay height (a 16:9 screen's) at which one raster pixel is one overlay unit. */
export const VIEW_H = 180;

/**
 * drawViewmodel — the weapon in the player's hands, drawn every frame onto
 * the 2D overlay — and drawKickStreaks, the kick's motion streaks.
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
 * visual noise the reference already drew (KNOWN-22), and keeping their
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
 * Task 3 replaced the reference's kick boot (a few canvas rectangles sliding
 * up from the bottom edge) with a modelled leg, drawn by ./kick.ts into the
 * same raster as the weapon; the fxTick callback that drew the boot is now
 * drawKickStreaks, below, and draws only the streaks. The kick is exempt
 * from the line-of-fire rule: a boot driven into the centre of the screen
 * is the point of it.
 *
 * Task 4 made the hands react (./react.ts): a flinch on a hit, a jerk and a
 * cant on a dry click, a nod at a pickup, an idle fidget any input cancels,
 * and a switch that arcs and turns over (./animate.ts). The events arrive
 * as src/core/AnimCues.ts counters in the frame; all of it stays under the
 * line of fire.
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
  /** weaponRuntime.kickAnim — the power kick's countdown: the leg is drawn with the weapon (./kick.ts). */
  kickAnim: number;
  /** src/core/AnimCues.ts's counters (hit, its damage, pickup, dry click, any input): the hands react to their changes (./react.ts). */
  cueHurt: number; cueHurtAmt: number; cuePickup: number; cueDryFire: number; cueInput: number;
  /** Loop.ts's `paused` — an overlay (level end, win, death) or the piano is up: no idle fidget behind it. */
  paused: boolean;
  /** The prologue's opening is running and the hands are not up yet (src/world/Opening.ts): nothing is drawn. */
  hidden: boolean;
  swayX: number;
  swayY: number;
  muzzle: number;
}

/**
 * The kick's callback slot in fxTick (drawn just before drawViewmodel). The
 * leg itself is no longer drawn here: it is modelled and rasterized with the
 * weapon by drawViewmodel (./kick.ts, ./rig.ts). What is left here is the
 * reference's one flourish, the motion streaks, now trailing the real foot
 * — from where the last frame drew it, back down toward the hip it came
 * from — and only while the leg is being driven out. Like the reference's
 * boot, it draws nothing from Math.random.
 */
export function drawKickStreaks(kickAnim: number): void {
  const k=streaks(kickElapsed(kickAnim));
  const foot=vm.footAt;
  if(k<=0||!foot)return;
  const fg=getFx(),s=getVH()/VIEW_H;
  fg.save();
  fg.strokeStyle=`rgba(180,178,166,${(.32*k).toFixed(3)})`;fg.lineWidth=1.5*s;
  for(let i=0;i<3;i++){fg.beginPath();
    fg.moveTo(foot[0]+(i*10-4)*s,foot[1]+(10+i*5)*s);
    fg.lineTo(foot[0]+(i*10+10)*s,foot[1]+(10+i*5+44*k)*s);fg.stroke();}
  fg.restore();
}
/** 0..1: the streaks show while the foot is travelling — the strike's drive — and fade as it plants. */
function streaks(t: number): number {
  if(t<KICK_CHAMBER||t>=KICK_HOLD)return 0;
  return t<KICK_HIT_T?(t-KICK_CHAMBER)/(KICK_HIT_T-KICK_CHAMBER):1-(t-KICK_HIT_T)/(KICK_HOLD-KICK_HIT_T);
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
  /** Where the last frame drew the kicking foot, overlay units — drawKickStreaks trails from it; null with no leg on screen. */
  footAt: null as [number, number] | null,
  /** A frame went by without the animator stepping (dead, not started, piano, scoped in): resync it before the next step. */
  skipped: false,
};

/**
 * A pose's rasterized terms, rounded — equal keys render equal pixels, so an
 * unchanged pose is not re-rendered. Every Pose field is in it except the
 * screen terms `sx`/`sy`, which move the finished image and are never
 * rasterized (tests/behavior/viewmodelCache.test.ts checks that against
 * the Pose's own keys, so a new field cannot be left out).
 */
export function poseKey(cur: number, p: Pose, cy: number): string {
  const r = (n: number) => Math.round(n * 1e4);
  return [cur, cy, r(p.x), r(p.y), r(p.z), r(p.pitch), r(p.yaw), r(p.roll), r(p.recoil), r(p.action), r(p.spin), r(p.reload), r(p.heat), r(p.kick)].join(",");
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
    vm.anchors = renderWeapon(vm.raster, WEAPON_ART[cur] ?? null, pose, RW / 2, cy);
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
  if(!v.started||v.dead||v.pianoOpen||v.hidden){vm.skipped=true;return;}
  const scoped=v.zoomLerp>=.85&&v.cur===4;
  if(scoped&&!(v.kickAnim>0)){vm.footAt=null;vm.skipped=true;return;} // scoped: hide rifle (a kick still shows its leg, below)
  const fg=getFx(),VW=getVW(),VH=getVH();
  const w=weapons[v.cur];
  // not drawn last frame: what happened meanwhile (the killing blow, a fall) is not replayed now
  if(vm.skipped){vm.skipped=false;vm.animator.resync();}
  const pose=vm.animator.step(dt,tNow,v,w,WEAPON_ART[v.cur]);
  // Scaled with the screen's height: exactly 1:1 on a 16:9 overlay (VH 180), smaller on a wider
  // screen, larger on a taller one, so the weapon is always the same share of the height and its
  // clearance below the crosshair (rig.ts's CLEAR_BELOW) holds at every aspect ratio.
  const s=VH/VIEW_H;
  const top0=VH-RH*s;
  const cy=Math.round((VH/2-top0)/s);  // the crosshair's row in the raster: the model aims there
  const painted=paint(scoped?-1:v.cur,pose,cy);
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
  const foot=painted?vm.anchors.foot:undefined;
  vm.footAt=foot?[left+foot[0]*s,top+foot[1]*s]:null;
  // Scoped in, only the leg was drawn: no glow and no flash — the reference drew nothing at all here,
  // so nothing may draw from Math.random either (the flash below does).
  if(scoped)return;
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

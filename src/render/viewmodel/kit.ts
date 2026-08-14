import { getFx } from "../Overlay2D";

/**
 * VIEWMODEL ART KIT — consistent palette + shading helpers for the
 * hand-pixeled weapon viewmodel and the kick-boot animation (see
 * src/render/viewmodel/draw.ts). Copied verbatim from
 * reference/sonsurum.html lines 2213-2263 (see tests/support/reference.ts's
 * REF.viewmodelKit) — every colour and coordinate is art.
 *
 * SKIN, DARK, MID, LIT, RUST, WOOD, GLOW, HOLY, vFlat, vBarrel, vTube,
 * vWood, vScrew, vHole and vTrigger are unused by the current game — dead
 * code in the reference too — and are preserved verbatim rather than
 * pruned, per this port's no-gameplay-change constraint. (wcv, the same
 * kind of dead code, lives in src/render/viewmodel/sprites.ts.)
 *
 * fg is src/render/Overlay2D.ts's private 2D context; every helper below
 * fetches it at its point of use via getFx() into a local `const fg`
 * (so the rest of each function's body reads exactly as it always did)
 * rather than caching a module-scoped reference — the same rule
 * src/audio/AudioEngine.ts's accessors and src/render/SceneRef.ts's
 * getScene() follow.
 */

export const SKIN="#7a6a52",SLEEVE="#2e3036",BOOT="#241c14",
  DARK="#1c1e22",MID="#3a3d44",LIT="#5c6068",RUST="#6e2e1c",WOOD="#4a3826",
  GLOW="#a08c5a",HOLY="#d8c87a";

/* ===== viewmodel art kit — consistent palette + shading helpers ===== */
export const VM={OUT:"#07080a",
  S1:"#1e2126",S2:"#343941",S3:"#4e5560",S4:"#737b88",S5:"#9aa3b0",
  G1:"#23282e",G2:"#39414c",G3:"#566272",
  W1:"#2c2012",W2:"#46331e",W3:"#604829",W4:"#7a6038",
  R1:"#5e2716",R2:"#8a3a22",
  B1:"#7a683c",B2:"#b09a58",B3:"#dcc685",
  H2:"#f4ead0",SH:"#7a2418",SHY:"#c2ab6c",
  GLV:"#5e503c",GLV2:"#73624a"};

export function vRect(x: number, y: number, w: number, h: number, c: string): void {
  const fg=getFx();
  fg.fillStyle=c;fg.fillRect(x,y,w,h);
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;fg.strokeRect(x+.5,y+.5,w-1,h-1);
}
export function vFlat(x: number, y: number, w: number, h: number, c: string): void {
  const fg=getFx();
  fg.fillStyle=c;fg.fillRect(x,y,w,h);
}
export function vGrad(x: number, y: number, w: number, h: number, c1: string, c2: string): void {
  const fg=getFx();
  const g=fg.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,c1);g.addColorStop(1,c2);
  fg.fillStyle=g;fg.fillRect(x,y,w,h);
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;fg.strokeRect(x+.5,y+.5,w-1,h-1);
}
export function vBarrel(x: number, y: number, w: number, h: number): void { /* cylindrical: dark→light→dark */
  const fg=getFx();
  const g=fg.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,VM.S1);g.addColorStop(.32,VM.S4);g.addColorStop(.5,VM.S3);
  g.addColorStop(.7,VM.S2);g.addColorStop(1,VM.S1);
  fg.fillStyle=g;fg.fillRect(x,y,w,h);
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;fg.strokeRect(x+.5,y+.5,w-1,h-1);
}
export function vTube(x: number, y: number, w: number, h: number, c1: string, c2: string, c3?: string): void {
  const fg=getFx();
  const g=fg.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,c1);g.addColorStop(.4,c2);g.addColorStop(1,c3||c1);
  fg.fillStyle=g;fg.fillRect(x,y,w,h);
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;fg.strokeRect(x+.5,y+.5,w-1,h-1);
}
export function vWood(x: number, y: number, w: number, h: number): void {
  const fg=getFx();
  const g=fg.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,VM.W3);g.addColorStop(.5,VM.W2);g.addColorStop(1,VM.W1);
  fg.fillStyle=g;fg.fillRect(x,y,w,h);
  fg.strokeStyle="rgba(18,11,5,.55)";fg.lineWidth=1;
  for(let i=1;i<4;i++){fg.beginPath();
    fg.moveTo(x+1,y+h*i/4+(i*7)%3-1);
    fg.bezierCurveTo(x+w*.4,y+h*i/4-2,x+w*.6,y+h*i/4+2,x+w-1,y+h*i/4);
    fg.stroke();}
  fg.strokeStyle=VM.OUT;fg.strokeRect(x+.5,y+.5,w-1,h-1);
}
export function vScrew(x: number, y: number): void {
  const fg=getFx();
  fg.fillStyle=VM.S1;fg.beginPath();fg.arc(x,y,1.7,0,7);fg.fill();
  fg.strokeStyle=VM.S4;fg.lineWidth=1;
  fg.beginPath();fg.moveTo(x-1.1,y);fg.lineTo(x+1.1,y);fg.stroke();
}
export function vHole(x: number, y: number, r: number): void {
  const fg=getFx();
  fg.fillStyle="#0a0b0d";fg.beginPath();fg.arc(x,y,r,0,7);fg.fill();
  fg.strokeStyle=VM.S3;fg.lineWidth=.8;fg.beginPath();fg.arc(x,y,r,0,7);fg.stroke();
}
export function vTrigger(x: number, y: number): void { /* guard loop + blade */
  const fg=getFx();
  fg.strokeStyle=VM.S2;fg.lineWidth=2.4;
  fg.beginPath();fg.arc(x,y,6.5,.15*Math.PI,.95*Math.PI);fg.stroke();
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;
  fg.beginPath();fg.arc(x,y,7.7,.15*Math.PI,.95*Math.PI);fg.stroke();
  fg.fillStyle=VM.S4;fg.fillRect(x-1.2,y-3,2.4,5);
}
/* per-weapon muzzle tip (flash alignment) */
export const MUZ=[{y:-90,r:1},{y:-82,r:1.7},{y:-101,r:1},{y:-90,r:1.2},{y:-109,r:1.6},{y:-91,r:1.4},{y:-95,r:1.3},{y:-92,r:2}];

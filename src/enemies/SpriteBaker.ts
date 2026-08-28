import * as THREE from "three";
import { PXDEF } from "./pixels";

/**
 * PIXEL SPRITES — frame A + mirrored frame B for walk.
 *
 * Bakes a PXDEF creature's ASCII rows into a THREE.CanvasTexture, and
 * bakes the dismemberment system: re-rendering the same rows with
 * rectangular regions (head/left arm/right arm/legs) masked out to
 * produce the headless, armless and legless frames, painting a wet
 * stump texture at the torn edge. Copied verbatim from
 * reference/sonsurum.html lines 1089-1125 (texFromPx) and 1487-1516
 * (PX, buildSprites).
 */

export interface TexOpts {
  mirror?: boolean;
  blankTop?: number;
  masks?: number[][];
  stumps?: boolean;
}

export function texFromPx(px: string[], pal: Record<string, string>, opts?: TexOpts): THREE.CanvasTexture {
  opts=opts||{};
  const w=px[0].length,h=px.length,S=3;
  const c=document.createElement("canvas");c.width=w*S;c.height=h*S;
  const g=c.getContext("2d");
  if(!g)throw new Error("2d context unavailable");
  if(opts.mirror){g.translate(w*S,0);g.scale(-1,1);}
  const masks=opts.masks||(opts.blankTop?[[0,0,w,opts.blankTop]]:null);
  const inMask=(x: number,y: number)=>{if(!masks)return false;
    for(const m of masks)if(x>=m[0]&&x<m[2]&&y>=m[1]&&y<m[3])return true;return false;};
  const at=(x: number,y: number)=>{if(y<0||y>=h||x<0||x>=px[y].length)return " ";const k=px[y][x];return (k===" "||inMask(x,y))?" ":k;};
  const lit=(hex: string,f: number)=>{if(!hex||hex[0]!=="#"||hex.length<7)return hex;
    let r=parseInt(hex.slice(1,3),16),gg=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.max(0,Math.min(255,r+f));gg=Math.max(0,Math.min(255,gg+f));b=Math.max(0,Math.min(255,b+f));
    return "rgb("+r+","+gg+","+b+")";};
  px.forEach((row,y)=>{
    for(let x=0;x<row.length;x++){const k=row[x];if(k===" ")continue;
      if(inMask(x,y))continue;
      const base=pal[k];if(!base||base==="#00000000")continue;
      g.fillStyle=base;g.fillRect(x*S,y*S,S,S);
      // bevel: lit top/left edges, shaded bottom/right where a transparent neighbor sits -> volume
      const up=at(x,y-1)===" ",lf=at(x-1,y)===" ",dn=at(x,y+1)===" ",rt=at(x+1,y)===" ";
      if(up||lf){g.fillStyle=lit(base,30);
        if(up)g.fillRect(x*S,y*S,S,1);
        if(lf)g.fillRect(x*S,y*S,1,S);}
      if(dn||rt){g.fillStyle=lit(base,-26);
        if(dn)g.fillRect(x*S,y*S+S-1,S,1);
        if(rt)g.fillRect(x*S+S-1,y*S,1,S);}}});
  // wet red stump at torn edges
  if(opts.stumps&&masks){
    for(const m of masks){
      const sy=m[3];
      for(let x=m[0];x<m[2];x++){
        if(sy<h&&px[sy]&&px[sy][x]&&px[sy][x]!==" "){
          g.fillStyle=Math.random()<.5?"#7a190c":"#b8341c";g.fillRect(x*S,(sy-1)*S,S,S);
          g.fillStyle="#52120a";g.fillRect(x*S,sy*S,S,S);}}}}
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;return t;}

export interface BakedSprite {
  a: THREE.CanvasTexture;
  b: THREE.CanvasTexture;
  hl: THREE.CanvasTexture;
  hlb: THREE.CanvasTexture;
  head: number;
  noHead: THREE.CanvasTexture | null;
  noHeadB: THREE.CanvasTexture | null;
  noLArm: THREE.CanvasTexture;
  noLArmB: THREE.CanvasTexture;
  noRArm: THREE.CanvasTexture;
  noRArmB: THREE.CanvasTexture;
  noLegs: THREE.CanvasTexture;
  noLegsB: THREE.CanvasTexture;
  gibbed: THREE.CanvasTexture;
  gibbedB: THREE.CanvasTexture;
  atk: THREE.CanvasTexture | null;
  die1: THREE.CanvasTexture | null;
  die2: THREE.CanvasTexture | null;
  regions: { W: number; H: number; head: number; armTop: number; armBot: number };
}

export const PX: Record<string, BakedSprite> = {};
export function buildSprites(): void {
  for(const k in PXDEF){const d=PXDEF[k];
    const W=d.px[0].length,H=d.px.length;
    const head=d.head||0;
    // region rectangles [x0,y0,x1,y1]
    const headM=head>0?[[0,0,W,head]]:null;
    const armTop=head, armBot=Math.min(H-3,head+Math.ceil((H-head)*0.45));
    const lArm=[[0,armTop,Math.ceil(W*0.32),armBot]];
    const rArm=[[Math.floor(W*0.68),armTop,W,armBot]];
    const legM=[[0,H-3,W,H]];
    const mk=(masks: number[][] | null,stumps?: boolean)=>masks?texFromPx(d.px,d.pal,{masks,stumps:stumps!==false}):null;
    const mkM=(masks: number[][] | null,stumps?: boolean)=>masks?texFromPx(d.px,d.pal,{masks,stumps:stumps!==false,mirror:true}):null;
    PX[k]={a:texFromPx(d.px,d.pal),b:texFromPx(d.px,d.pal,{mirror:true}),
      hl:texFromPx(d.px,d.pal,{blankTop:head}),
      hlb:texFromPx(d.px,d.pal,{blankTop:head,mirror:true}),head:head,
      // dismemberment frames
      noHead: headM?mk(headM):null,    noHeadB: headM?mkM(headM):null,
      noLArm: mk(lArm)!,                noLArmB: mkM(lArm)!,
      noRArm: mk(rArm)!,                noRArmB: mkM(rArm)!,
      noLegs: mk(legM)!,               noLegsB: mkM(legM)!,
      // fully gibbed combos for overkill
      gibbed: headM?mk([headM[0],lArm[0],rArm[0]])!:mk([lArm[0],rArm[0]])!,
      gibbedB: headM?mkM([headM[0],lArm[0],rArm[0]])!:mkM([lArm[0],rArm[0]])!,
      // attack pose + death collapse frames (only for redesigned enemies that define them)
      atk: d.atk?texFromPx(d.atk,d.pal):null,
      die1: d.die1?texFromPx(d.die1,d.pal):null,
      die2: d.die2?texFromPx(d.die2,d.pal):null,
      regions:{W,H,head,armTop,armBot}};}
}

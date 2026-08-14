import { WEAPONS_0_3 } from "./pixels/weapons0";
import { WEAPONS_4_7 } from "./pixels/weapons1";

/**
 * WEAPON PIXEL SPRITES (Doom/Blood-style painted look). Each weapon is
 * hand-pixeled at low res then nearest-neighbor upscaled — the same
 * technique the real games used. Frames: idle / fire / reloadA / reloadB.
 * Drawn anchored to bottom-center; muzzle tip sits at the top.
 *
 * Copied verbatim from reference/sonsurum.html lines 2264-2509 (see
 * tests/support/reference.ts's REF.viewmodelSprites) — every pixel row and
 * palette entry is art.
 *
 * WEAPON_PIXELS hoists each weapon's row-array literals (the reference's own
 * local pistolIdle/sgIdle/arIdle/... consts, declared inline inside
 * buildWeaponSprites) out to src/render/viewmodel/pixels/{weapons0,weapons1}.ts,
 * keyed by weapon slot — the same "data lives apart from the code that
 * consumes it" shape as src/enemies/pixels/*.ts's PXDEF. No row, character
 * or frame-array structure changes: buildWeaponSprites() below still calls
 * reg() with the exact same key/name/frames triples, in the exact same
 * order (weapon 0's idle, fire, reload; then weapon 1's; ...), that the
 * reference's inline version did. This split exists so
 * tests/fidelity.test.ts can byte-compare the row data directly (its
 * "WEAPON_PIXELS vs reference" describe block) and so
 * tests/behavior/viewmodel.test.ts can bake one weapon's frames through
 * pxCanvas in isolation for the per-weapon sabotage proof (Task 3 brief,
 * Step 3) — buildWeaponSprites() always bakes all 8 slots in one call, which
 * would make a one-weapon sabotage fail every slot's test, not just that
 * slot's.
 *
 * wcv is unused by the current game (dead code in the reference too, never
 * called) and is preserved verbatim rather than pruned, per this port's
 * no-gameplay-change constraint.
 */

export type PixelFrame = string[];
export interface WeaponFrameSet {
  idle: PixelFrame[];
  fire: PixelFrame[];
  reload: PixelFrame[];
}

/** All 8 weapon slots' raw pixel rows, in slot order. See pixels/weapons0.ts and pixels/weapons1.ts. */
export const WEAPON_PIXELS: WeaponFrameSet[] = [...WEAPONS_0_3, ...WEAPONS_4_7];

export function pxCanvas(rows: PixelFrame, pal: Record<string, string>): HTMLCanvasElement {
  const w=rows[0].length,h=rows.length,S=3;        // 3x supersample for detail
  const c=document.createElement("canvas");c.width=w*S;c.height=h*S;
  const g=c.getContext("2d");
  const at=(x,y)=>{if(y<0||y>=h||x<0||x>=rows[y].length)return " ";return rows[y][x]||" ";};
  const lit=(hex,f)=>{ // shift a hex color lighter(+)/darker(-)
    if(!hex||hex[0]!=="#"||hex.length<7)return hex;
    let r=parseInt(hex.slice(1,3),16),gg=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.max(0,Math.min(255,r+f));gg=Math.max(0,Math.min(255,gg+f));b=Math.max(0,Math.min(255,b+f));
    return "rgb("+r+","+gg+","+b+")";};
  rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){
    const k=row[x];if(k===" ")continue;
    const base=pal[k];if(!base||base==="#00000000")continue;
    g.fillStyle=base;g.fillRect(x*S,y*S,S,S);
    const up=at(x,y-1)===" ",lf=at(x-1,y)===" ",dn=at(x,y+1)===" ",rt=at(x+1,y)===" ";
    if(up||lf){g.fillStyle=lit(base,34);
      if(up)g.fillRect(x*S,y*S,S,1);
      if(lf)g.fillRect(x*S,y*S,1,S);}
    if(dn||rt){g.fillStyle=lit(base,-30);
      if(dn)g.fillRect(x*S,y*S+S-1,S,1);
      if(rt)g.fillRect(x*S+S-1,y*S,1,S);}
  }});
  return c;
}

/* shared gun palette — cold gunmetal ramp, brass, wood, glove */
export const GP: Record<string, string> = {
 " ":"#00000000",".":"#08090b",            // transparent / black outline
 a:"#121317",b:"#1d2025",c:"#2b2f37",d:"#3c424c",e:"#525a66",f:"#6e7783",g:"#8e98a6",h:"#b2bcc9", // steel 8-step
 w:"#241a0e",x:"#3c2c18",y:"#543e22",z:"#6e5230",Z:"#8a6a40",                  // wood 5-step
 r:"#52220f",s:"#7e3219",t:"#a85230",                                          // rust 3
 m:"#6a5a30",n:"#998148",o:"#c8b06a",p:"#e6d690",                              // brass 4
 R:"#7a190c",S:"#b8341c",T:"#e85a2c",H:"#f4ead0",E:"#d8d0b8",                  // shell / bone / bone-shade
 G:"#3e3324",K:"#544532",J:"#6e5b42",                                          // glove dark/mid/light
 L:"#2e3540",P:"#161a22",N:"#454f5e",                                          // blued steel 3
 Q:"#cfe6ff",U:"#3a5a80",V:"#7aa0c8",                                          // scope lens hi/mid/lo
 B:"#b89a58",C:"#e8d68a",F:"#ff9038",I:"#ffd27a",W:"#fff0c0",        // brass-bright / holy / flame / hot / white-hot
 j:"#2a6a3a",0:"#7fe05a"};                                            // energy green dark / bright

export const WPX: Record<number, Record<string, HTMLCanvasElement[]>> = {};
export function wcv(key: number, frame: string, rows: PixelFrame): void {
  WPX[key]=WPX[key]||{};(WPX[key] as Record<string, unknown>)[frame]=pxCanvas(rows,GP);
}

/* frames stored as arrays: idle[], fire[N], reload[N]. Higher-res art (≈30px). */
export function buildWeaponSprites(): void {
  const reg=(key: number,name: string,frames: PixelFrame[])=>{WPX[key]=WPX[key]||{};WPX[key][name]=frames.map(f=>pxCanvas(f,GP));};
  const pistolFire1=WEAPON_PIXELS[0].idle[0].map(r=>r); // recoil handled in code; flash drawn separately
  WEAPON_PIXELS.forEach((set,key)=>{
    reg(key,"idle",set.idle);
    reg(key,"fire",set.fire);
    reg(key,"reload",set.reload);
  });
}

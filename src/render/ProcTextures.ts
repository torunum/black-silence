import * as THREE from "three";
import { pick, rnd } from "../utils/math";

/**
 * TEXTURES (gothic, procedural)
 *
 * Gothic textures, generated procedurally at startup — the project ships no
 * image files. Moved verbatim from the "TEXTURES (gothic, procedural)"
 * section of the reference.
 */
export function makeTex(
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 64,
  h = 64,
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
export function noiseFill(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: [number, number, number],
  vary: number,
  n: number,
): void {
  for (let i = 0; i < n; i++) {
    const v = (Math.random() - .5) * vary;
    g.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v | 0},${base[2] + v | 0})`;
    g.fillRect(Math.random() * w | 0, Math.random() * h | 0, 1 + Math.random() * 3 | 0, 1 + Math.random() * 3 | 0);
  }
}
export const TEX: Record<string, THREE.CanvasTexture> = {};
export function buildTextures(): void {
  TEX.dungeonWall=makeTex((g,w,h)=>{ // big rough stone blocks, mossy seams
    g.fillStyle="#262a2e";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[40,44,48],28,900);
    g.fillStyle="#101316";
    for(let y=0;y<h;y+=21){g.fillRect(0,y,w,3);
      for(let x=(y/21%2)*21|0;x<w;x+=42)g.fillRect(x,y,3,21);}
    g.fillStyle="rgba(46,74,40,.30)"; // moss
    for(let i=0;i<7;i++)g.fillRect(Math.random()*w|0,Math.random()*h|0,rnd(3,9),rnd(2,5));
    g.fillStyle="rgba(0,0,0,.35)";
    for(let i=0;i<4;i++){const x=Math.random()*w|0;g.fillRect(x,0,2,rnd(10,30));}});
  TEX.churchWall=makeTex((g,w,h)=>{ // pale masonry + arch shadow
    g.fillStyle="#2e2a30";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[52,46,54],24,800);
    g.fillStyle="#15121a";
    for(let y=0;y<h;y+=13){g.fillRect(0,y,w,2);
      for(let x=(y/13%2)*16|0;x<w;x+=32)g.fillRect(x,y,2,13);}
    g.strokeStyle="rgba(0,0,0,.5)";g.lineWidth=3; // pointed arch relief
    g.beginPath();g.moveTo(10,h);g.quadraticCurveTo(10,16,w/2,8);
    g.quadraticCurveTo(w-10,16,w-10,h);g.stroke();});
  TEX.window=makeTex((g,w,h)=>{ // broken stained glass in pointed arch
    g.fillStyle="#0a0b0d";g.fillRect(0,0,w,h);
    const cols=["#5a2a6e","#2a4a7e","#7e2a2a","#7e6a2a","#2a6e4a"];
    g.save();g.beginPath();
    g.moveTo(12,h);g.quadraticCurveTo(12,18,w/2,8);
    g.quadraticCurveTo(w-12,18,w-12,h);g.closePath();g.clip();
    for(let i=0;i<46;i++){g.fillStyle=pick(cols);
      g.beginPath();const x=rnd(12,w-12),y=rnd(8,h);
      g.moveTo(x,y);g.lineTo(x+rnd(-9,9),y+rnd(-9,9));g.lineTo(x+rnd(-9,9),y+rnd(-9,9));
      g.closePath();g.fill();}
    g.fillStyle="#0a0b0d"; // missing shards
    for(let i=0;i<7;i++){g.beginPath();const x=rnd(14,w-14),y=rnd(12,h-6);
      g.moveTo(x,y);g.lineTo(x+rnd(-11,11),y+rnd(-11,11));g.lineTo(x+rnd(-11,11),y+rnd(-11,11));
      g.closePath();g.fill();}
    g.strokeStyle="#000";g.lineWidth=2;
    for(let i=0;i<8;i++){g.beginPath();g.moveTo(rnd(12,w-12),8);g.lineTo(rnd(12,w-12),h);g.stroke();}
    g.restore();
    g.strokeStyle="#23262b";g.lineWidth=4;
    g.beginPath();g.moveTo(12,h);g.quadraticCurveTo(12,18,w/2,8);
    g.quadraticCurveTo(w-12,18,w-12,h);g.stroke();});
  TEX.dungeonFloor=makeTex((g,w,h)=>{g.fillStyle="#1a1c1e";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[27,29,31],18,1100);
    g.strokeStyle="#0d0e10";g.lineWidth=2;
    g.strokeRect(1,1,w-2,h-2);
    g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();
    g.fillStyle="rgba(46,74,40,.18)";
    for(let i=0;i<4;i++)g.fillRect(Math.random()*w|0,Math.random()*h|0,rnd(2,7),rnd(2,4));});
  TEX.churchFloor=makeTex((g,w,h)=>{g.fillStyle="#1c1a20";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[30,28,34],16,900);
    g.fillStyle="#121016";g.fillRect(0,0,w/2,h/2);g.fillRect(w/2,h/2,w/2,h/2);
    noiseFill(g,w,h,[24,22,28],12,500);
    g.strokeStyle="#0a090d";g.lineWidth=2;
    g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();});
  TEX.ceil=makeTex((g,w,h)=>{g.fillStyle="#0e1013";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[15,17,20],12,700);
    g.strokeStyle="rgba(0,0,0,.6)";g.lineWidth=3; // vault ribs
    g.beginPath();g.moveTo(0,0);g.lineTo(w,h);g.moveTo(w,0);g.lineTo(0,h);g.stroke();});
  TEX.door=makeTex((g,w,h)=>{ // iron-banded wood
    g.fillStyle="#3a2c1e";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[62,46,32],22,500);
    g.fillStyle="#241a12";
    for(let x=8;x<w;x+=12)g.fillRect(x,0,2,h);
    g.fillStyle="#23262b";g.fillRect(0,12,w,6);g.fillRect(0,h-20,w,6);
    g.fillStyle="#5c6068";
    for(let x=4;x<w;x+=12){g.fillRect(x,14,2,2);g.fillRect(x,h-18,2,2);}});
  TEX.doorLocked=makeTex((g,w,h)=>{g.fillStyle="#2e2024";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[50,36,38],20,400);
    g.fillStyle="#241a12";for(let x=8;x<w;x+=12)g.fillRect(x,0,2,h);
    g.fillStyle="#9c2f1e";
    g.beginPath();g.arc(w/2,h/2,10,0,7);g.fill();
    g.fillStyle="#000";g.beginPath();g.arc(w/2,h/2,4,0,7);g.fill();
    g.fillStyle="#9c2f1e";g.fillRect(w/2-2,h/2,4,12);});
  TEX.pillar=makeTex((g,w,h)=>{g.fillStyle="#26262c";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[42,42,48],20,500);
    g.fillStyle="rgba(0,0,0,.4)";
    for(let x=3;x<w;x+=8)g.fillRect(x,0,3,h);},32,64);
  TEX.wood=makeTex((g,w,h)=>{g.fillStyle="#3a2c1e";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[60,44,30],20,400);
    g.fillStyle="rgba(0,0,0,.3)";for(let y=4;y<h;y+=7)g.fillRect(0,y,w,2);},32,32);
  TEX.barrel=makeTex((g,w,h)=>{g.fillStyle="#5a2a18";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[96,48,30],30,500);
    g.fillStyle="#2a1410";g.fillRect(0,8,w,4);g.fillRect(0,h-12,w,4);g.fillRect(0,h/2-2,w,4);
    g.fillStyle="#a08c5a";g.fillRect(w/2-6,h/2-10,12,6);},32,40);
  /* ===== FLESH / VISCERA TEXTURES (the meat level) ===== */
  TEX.fleshWall=makeTex((g,w,h)=>{ // raw muscle wall, veins, weeping sores
    g.fillStyle="#6e1e18";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[120,40,36],34,1100);
    // sinew striations
    g.strokeStyle="rgba(40,8,8,.5)";g.lineWidth=2;
    for(let i=0;i<10;i++){g.beginPath();const x=rnd(0,w);
      g.moveTo(x,0);g.bezierCurveTo(x+rnd(-12,12),h*.33,x+rnd(-12,12),h*.66,x+rnd(-10,10),h);g.stroke();}
    // bulging veins
    g.strokeStyle="rgba(150,60,70,.55)";g.lineWidth=3;
    for(let i=0;i<5;i++){g.beginPath();const y=rnd(0,h);
      g.moveTo(0,y);g.bezierCurveTo(w*.3,y+rnd(-14,14),w*.6,y+rnd(-14,14),w,y+rnd(-8,8));g.stroke();}
    // open sores / wet highlights
    for(let i=0;i<8;i++){const x=rnd(8,w-8),y=rnd(8,h-8),r=rnd(3,9);
      g.fillStyle="rgba(30,4,6,.7)";g.beginPath();g.arc(x,y,r,0,7);g.fill();
      g.fillStyle="rgba(200,90,90,.4)";g.beginPath();g.arc(x-r*.3,y-r*.3,r*.4,0,7);g.fill();}});
  TEX.fleshFloor=makeTex((g,w,h)=>{ // glistening meat floor with pooled fluid
    g.fillStyle="#4a1410";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[90,30,28],26,1300);
    for(let i=0;i<6;i++){const x=rnd(0,w),y=rnd(0,h),r=rnd(6,16);
      g.fillStyle="rgba(20,2,4,.6)";g.beginPath();g.arc(x,y,r,0,7);g.fill();
      g.fillStyle="rgba(160,50,50,.3)";g.beginPath();g.arc(x-2,y-2,r*.5,0,7);g.fill();}
    g.strokeStyle="rgba(30,6,8,.5)";g.lineWidth=2;
    for(let i=0;i<6;i++){g.beginPath();g.moveTo(rnd(0,w),rnd(0,h));
      g.lineTo(rnd(0,w),rnd(0,h));g.stroke();}});
  TEX.fleshCeil=makeTex((g,w,h)=>{ // dripping fleshy vault
    g.fillStyle="#3a100c";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[70,24,22],20,900);
    g.fillStyle="rgba(20,2,4,.6)";
    for(let i=0;i<10;i++){const x=rnd(0,w);g.beginPath();
      g.moveTo(x,0);g.lineTo(x-3,rnd(6,18));g.lineTo(x+3,rnd(6,18));g.closePath();g.fill();}});
  TEX.fleshDoor=makeTex((g,w,h)=>{ // sphincter/membrane door, vertical seam
    g.fillStyle="#7a221a";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[140,50,46],30,600);
    // central wet seam that looks like it could part
    g.fillStyle="rgba(20,2,4,.85)";g.fillRect(w/2-3,4,6,h-8);
    g.fillStyle="rgba(190,80,80,.5)";g.fillRect(w/2-5,4,2,h-8);g.fillRect(w/2+3,4,2,h-8);
    // radial muscle fibers pulling toward the seam
    g.strokeStyle="rgba(40,8,8,.5)";g.lineWidth=2;
    for(let y=6;y<h;y+=7){g.beginPath();g.moveTo(2,y);g.lineTo(w/2-4,y+rnd(-2,2));g.stroke();
      g.beginPath();g.moveTo(w-2,y);g.lineTo(w/2+4,y+rnd(-2,2));g.stroke();}
    // sphincter ring
    g.strokeStyle="rgba(150,60,60,.5)";g.lineWidth=3;
    g.beginPath();g.ellipse(w/2,h/2,w*.32,h*.42,0,0,7);g.stroke();});
  /* ===== HELL TEXTURES (the prologue) ===== */
  TEX.hellWall=makeTex((g,w,h)=>{
    g.fillStyle="#241211";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[60,28,22],26,1000);
    g.fillStyle="#120808";
    for(let y=0;y<h;y+=18){g.fillRect(0,y,w,3);
      for(let x=(y/18%2)*18|0;x<w;x+=36)g.fillRect(x,y,3,18);}
    g.strokeStyle="rgba(255,110,30,.7)";g.lineWidth=2;
    for(let i=0;i<5;i++){g.beginPath();const x=rnd(0,w);
      g.moveTo(x,0);g.lineTo(x+rnd(-10,10),h*.4);g.lineTo(x+rnd(-12,12),h);g.stroke();}
    g.strokeStyle="rgba(255,200,80,.5)";g.lineWidth=1;
    for(let i=0;i<4;i++){g.beginPath();const y=rnd(0,h);
      g.moveTo(0,y);g.lineTo(w,y+rnd(-10,10));g.stroke();}});
  TEX.hellFloor=makeTex((g,w,h)=>{
    g.fillStyle="#1c0e0a";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[44,20,14],20,1200);
    g.strokeStyle="rgba(255,90,20,.55)";g.lineWidth=2;
    for(let i=0;i<7;i++){g.beginPath();g.moveTo(rnd(0,w),rnd(0,h));
      g.lineTo(rnd(0,w),rnd(0,h));g.stroke();}
    for(let i=0;i<5;i++){const x=rnd(0,w),y=rnd(0,h);
      g.fillStyle="rgba(255,140,40,.3)";g.beginPath();g.arc(x,y,rnd(2,5),0,7);g.fill();}});
  TEX.hellCeil=makeTex((g,w,h)=>{
    g.fillStyle="#0a0605";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[20,10,8],12,700);
    g.strokeStyle="rgba(120,40,10,.3)";g.lineWidth=2;
    g.beginPath();g.moveTo(0,0);g.lineTo(w,h);g.moveTo(w,0);g.lineTo(0,h);g.stroke();});
  TEX.stair=makeTex((g,w,h)=>{
    g.fillStyle="#2a2622";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[46,42,38],18,500);
    g.fillStyle="rgba(0,0,0,.5)";
    for(let y=0;y<h;y+=8)g.fillRect(0,y,w,2);
    g.fillStyle="rgba(255,120,40,.12)";g.fillRect(0,0,w,h);},32,32);
}

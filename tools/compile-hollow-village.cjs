// Extract two independently masked height layers and compact well surface swatches.
const fs = require("node:fs");
const path = require("node:path");
const {PNG} = require("pngjs");
const root = path.resolve(__dirname,"..");
const [heroFile,nearFile,farFile,sourceFile,previewDirectory]=process.argv.slice(2);
const target = path.resolve(heroFile || path.join(root,"assets/village/square-target.png"));
const source = path.resolve(sourceFile || path.join(root,"src/hollow-village-square.js"));
const art = PNG.sync.read(fs.readFileSync(target));
if (art.width!==1672 || art.height!==941) throw Error("Unexpected square art dimensions");
const near = PNG.sync.read(fs.readFileSync(nearFile || path.join(root,"assets/village/near-ridge.png")));
const far = PNG.sync.read(fs.readFileSync(farFile || path.join(root,"assets/village/far-ridge.png")));
if (near.width!==2172 || far.width!==2172 || near.height!==724 || far.height!==724)
  throw Error("Unexpected isolated ridge dimensions");

const left=-180,right=1812,top=320,bottom=575,width=568,height=86;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function ease(a,b,x) { const t=clamp((x-a)/(b-a)); return t*t*(3-2*t); }
function sample(x,y,image=art) {
  const i=(clamp(Math.round(y),0,image.height-1)*image.width+clamp(Math.round(x),0,image.width-1))*4;
  return [image.data[i],image.data[i+1],image.data[i+2],image.data[i+3]];
}
const mix=(a,b,t)=>a.map((c,i)=>c+(b[i]-c)*t);
const data={};
function pack(pixels) {
  const bytes=[];
  for(let i=0;i<pixels.length;){
    const alpha=pixels[i+3];
    let span=1;
    if(alpha===0){
      while(span<255 && i+span*4<pixels.length && pixels[i+span*4+3]===0) span++;
      bytes.push(0,span);
    } else {
      while(span<255 && i+span*4<pixels.length &&
        pixels.subarray(i,i+4).equals(pixels.subarray(i+span*4,i+span*4+4))) span++;
      bytes.push(span,...pixels.subarray(i,i+4));
    }
    i+=span*4;
  }
  return Buffer.from(bytes).toString("base64");
}

function mountain(kind) {
  const png = new PNG({width,height});
  const reflected=(u,max)=>Math.round(u<0?-u:u>max?2*max-u:u);
  for(let v=0;v<height;v++) for(let u=0;u<width;u++){
    const x=left+(u+.5)/width*(right-left),y=top+(v+.5)/height*(bottom-top);
    const edge=ease(left,left+215,x)*(1-ease(right-135,right,x));
    let color,alpha=0;
    if (kind==="distance") {
      const xSrc=reflected((x-1)*2171/1700,2171);
      const ySrc=Math.min(453,(y-193)/.50);
      const painted=sample(xSrc,ySrc,far);
      color=painted.slice(0,3).map((c,i)=>c*[.85,.79,.78][i]);
      // Extend and fade the low air instead of showing the source's cut
      // bottom line when a lower rooftop is revealed by a turn.
      color=mix(color,[11,20,30],.73*ease(415,496,y));
      alpha=painted[3]/255*edge*(1-ease(470,546,y))*.95;
      const haze=.74*Math.exp(-(((x-499)/162)**2+((y-384)/56)**2));
      if(alpha<haze){ alpha=haze*edge; color=mix(color,[22,36,50],.91); }
    } else {
      const xSrc=reflected((x-11)/.818,2171);
      const ySrc=Math.min(545,(y-195.5)/.535);
      const painted=sample(clamp(xSrc,9,2161),ySrc,near);
      color=painted.slice(0,3).map((c,i)=>c*[.87,.83,.86][i]);
      color=mix(color,[11,19,29],.58*ease(476,545,y));
      alpha=painted[3]/255*edge*(1-ease(477,565,y));
    }
    const o=(v*width+u)*4;
    const quant=(c,step)=>Math.round(clamp(c,0,255)/step)*step;
    png.data[o]=quant(color[0],2);
    png.data[o+1]=quant(color[1],2);
    png.data[o+2]=quant(color[2],2);
    png.data[o+3]=Math.min(255,Math.round(alpha*31)*8.25|0);
  }
  return png;
}
for(const layer of ["distance","hills"]){
  const img=mountain(layer);
  data[layer]=pack(img.data);
  if(previewDirectory)fs.writeFileSync(path.join(previewDirectory,layer+".png"),PNG.sync.write(img));
}

const swatches=[
  {r:[796,551,88,27],rgb:[73,71,71],gain:.62},
  {r:[804,543,82,16],rgb:[91,91,93],gain:.59},
  {r:[803,557,73,16],rgb:[33,30,29],gain:.39},
  {r:[796,482,12,66],rgb:[59,46,37],gain:.80},
  {r:[872,486,11,61],rgb:[89,68,48],gain:.83},
  {r:[797,450,50,20],rgb:[65,68,71],gain:.84},
  {r:[800,451,50,20],rgb:[109,110,109],gain:.73},
  {r:[833,515,19,18],rgb:[71,54,42],gain:.82},
  {r:[843,487,9,23],rgb:[119,96,65],gain:.75},
  {r:[827,540,33,10],rgb:[19,29,36],gain:.5}
];
const well=Buffer.alloc(160*64*3);
for(const [slot,{r:[x,y,w,h],rgb,gain}] of swatches.entries()){
  const uv=(u,v)=>sample(x+clamp(u,1,30)/31*w,y+clamp(v,1,30)/31*h);
  const values=[];
  for(let v=0;v<32;v++) for(let u=0;u<32;u++) values.push(uv(u,v));
  const average=rgb.map((_,c)=>values.reduce((a,p)=>a+p[c],0)/values.length);
  for (const [p,texel] of values.entries()) {
    const u=p%32,v=p/32|0;
    const noise=((u*97+v*31+slot*73+u*v*17)%53-26)*.26;
    const soot=((Math.floor(u/3)*148+Math.floor(v/4)*69+slot*11)%37-18)*.30;
    const off=(((slot/5|0)*32+v)*160+slot%5*32+u)*3;
    for(let c=0;c<3;c++)well[off+c]=clamp(Math.round(rgb[c]+(texel[c]-average[c])*gain+noise+soot),0,255);
  }
}
data.well=well.toString("base64");
const text=fs.readFileSync(source,"utf8");
const marker=/\/\* HOLLOW_VILLAGE_ART_BEGIN \*\/[\s\S]*?\/\* HOLLOW_VILLAGE_ART_END \*\//;
if(!marker.test(text))throw Error("No authoring slot found");
fs.writeFileSync(source,text.replace(marker,"/* HOLLOW_VILLAGE_ART_BEGIN */ "+JSON.stringify(data,null,2)+" /* HOLLOW_VILLAGE_ART_END */"));
console.log(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,v.length])));

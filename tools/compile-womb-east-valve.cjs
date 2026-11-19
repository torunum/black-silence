// Embed a small atlas from the approved Womb east valve reference.
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");
const art = path.resolve(process.argv[2] || path.join(root,"assets","womb","east-valve-dreamloop-target.png"));
const runtime = path.resolve(process.argv[3] || path.join(root,"src","womb-east-valve.js"));
const image = PNG.sync.read(fs.readFileSync(art));
const source = fs.readFileSync(runtime, "utf8");
const swatches = {
  bed: {crop:[955,464,9,91], base:[83,27,22], contrast:1.17},
  root: {crop:[710,592,14,24], base:[109,40,28], contrast:1.17},
  bone: {crop:[714,445,8,92], base:[154,103,70], contrast:1.17},
  pale: {crop:[781,290,68,10], base:[185,132,91], contrast:1.20},
  edge: {crop:[951,550,13,38], base:[125,70,46], contrast:1.07}
};
const size = 60;
const out = {};
const clamp = (v,low,high) => Math.min(high,Math.max(low,v));
for (const [name,{crop:[left,top,width,height],base,contrast}] of Object.entries(swatches)) {
  if (left<0 || top<0 || left+width>image.width || top+height>image.height) {
    throw new Error("Swatch outside reference image: " + name);
  }
  const channels = [];
  for (let y=0;y<size;y++) for(let x=0;x<size;x++){
    const u=left+Math.floor(x*width/size);
    const v=top+Math.floor(y*height/size);
    const a=4*(v*image.width+u),b=4*(Math.min(v+1,top+height-1)*image.width+u);
    channels.push([0,1,2].map(i=>(image.data[a+i]+image.data[b+i])*.5));
  }
  const mean=base.map((_,c)=>channels.reduce((sum,intensity)=>sum+intensity[c],0)/channels.length);
  const salt=name.charCodeAt(0)*41+name.charCodeAt(1)*17;
  const pits=Array.from({length:25},(_,i)=>[
    (i*47+salt+i*i*3)%size,(i*19+salt*3+i*i*7)%size,
    1.9+(i*19+salt)%14*.23,.9+(i*11+salt)%9*.19
  ]);
  const pixels=Buffer.alloc(size*size*2);
  channels.forEach((point,i)=>{
    const x=i%size,y=Math.floor(i/size);
    const grain=((29*i+17*y)%31-15)*.51;
    const crust=((Math.floor(x/3)*13+Math.floor(y/2)*17+salt)%19-9)*1.25;
    let cavity=0,edge=0;
    for(const [u,v,rx,ry] of pits){
      const d=((x-u)/rx)**2+((y-v)/ry)**2;
      if(d<.94)cavity=Math.max(cavity,(1-d)*25);
      if(d>=.94&&d<1.47&&y<v)edge=8;
    }
    const [r,g,b]=point.map((value,c)=>clamp(Math.round(base[c]+(value-mean[c])*contrast+
      grain+crust-cavity+edge),0,255));
    pixels.writeUInt16LE((r>>3)<<11|(g>>2)<<5|b>>3,2*i);
  });
  out[name]=pixels.toString("base64");
}

const marker=/\/\* VALVE_SWATCHES_BEGIN \*\/[\s\S]*?\/\* VALVE_SWATCHES_END \*\//;
if (!marker.test(source)) throw new Error("Womb valve swatch slot missing");
const json=JSON.stringify(out,null,2).replaceAll("\n","\n  ");
fs.writeFileSync(runtime,source.replace(marker,`/* VALVE_SWATCHES_BEGIN */ ${json} /* VALVE_SWATCHES_END */`));
console.log("Embedded "+Object.keys(out).length+" Womb valve surface swatches");

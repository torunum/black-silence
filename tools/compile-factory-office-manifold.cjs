// Embed selected material swatches from the approved Factory office study.
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname,"..");
const file = path.resolve(process.argv[2] || path.join(root,"assets","factory","office-manifold-dreamloop-target.png"));
const runtime = path.resolve(process.argv[3] || path.join(root,"src","factory-office-manifold.js"));
const image = PNG.sync.read(fs.readFileSync(file));
const source = fs.readFileSync(runtime,"utf8");
const swatches = {
  iron:   {crop:[1132,333,12,78],base:[68,65,58],contrast:1.20},
  bevel:  {crop:[1096,326,68,6],base:[98,91,73],contrast:1.03},
  shadow: {crop:[1194,380,18,21],base:[43,38,33],contrast:.78},
  copper: {crop:[1129,265,30,15],base:[123,76,45],contrast:1.34},
  brass:  {crop:[1158,339,34,7],base:[146,98,53],contrast:1.14},
  dial:   {crop:[1155,351,17,27],base:[175,156,121],contrast:.88},
  ink:    {crop:[1102,347,5,50],base:[40,33,27],contrast:.55},
  oxide:  {crop:[1099,293,9,29],base:[88,49,34],contrast:1.19}
};
const stamp = 36;
const tiles = {};
const clamp = (value,low,high)=>Math.max(low,Math.min(high,value));
for(const [name,{crop:[left,top,width,height],base,contrast}] of Object.entries(swatches)){
  if(left<0||top<0||left+width>image.width||top+height>image.height){
    throw new Error("Factory swatch is outside the reference: "+name);
  }
  const points=[];
  for(let y=0;y<stamp;y++)for(let x=0;x<stamp;x++){
    const u=left+Math.floor(x/stamp*width),v=top+Math.floor(y/stamp*height);
    const a=(v*image.width+u)*4,b=(Math.min(v+1,top+height-1)*image.width+u)*4;
    points.push([0,1,2].map(c=>(image.data[a+c]+image.data[b+c])*.5));
  }
  const mean=base.map((_,c)=>points.reduce((sum,rgb)=>sum+rgb[c],0)/points.length);
  const pixels=Buffer.alloc(stamp*stamp*2);
  points.forEach((rgb,i)=>{
    const x=i%stamp,y=Math.floor(i/stamp);
    const salt=name.charCodeAt(0)*7+name.charCodeAt(1);
    const grain=((x*19+y*37+x*y*3+salt)%29-14)*.57;
    const wear=((Math.floor(x/3)*31+Math.floor(y/2)*17+salt)%19-9)*1.44;
    const radius=Math.hypot((x+.5-stamp/2)/(stamp/2),(y+.5-stamp/2)/(stamp/2));
    const rim=name==="dial"?Math.max(0,radius-.48)**1.55*38:0;
    const stain=name==="dial"?Math.max(0,1-Math.hypot((x-14)/6,(y-21)/11))*15:0;
    const [r,g,b]=rgb.map((value,c)=>clamp(Math.round(base[c]+(value-mean[c])*contrast+grain+wear-rim-stain),0,255));
    pixels.writeUInt16LE((r>>3)<<11|(g>>2)<<5|b>>3,i*2);
  });
  tiles[name]=pixels.toString("base64");
}
const slot=/\/\* MANIFOLD_SWATCHES_BEGIN \*\/[\s\S]*?\/\* MANIFOLD_SWATCHES_END \*\//;
if(!slot.test(source))throw new Error("Factory swatch slot missing");
const data=JSON.stringify(tiles,null,2).replaceAll("\n","\n  ");
fs.writeFileSync(runtime,source.replace(slot,`/* MANIFOLD_SWATCHES_BEGIN */ ${data} /* MANIFOLD_SWATCHES_END */`));
console.log("Embedded "+Object.keys(tiles).length+" Factory manifold material swatches");

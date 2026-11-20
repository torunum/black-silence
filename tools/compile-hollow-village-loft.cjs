const fs=require("node:fs");
const path=require("node:path");
const {PNG}=require("pngjs");
const root=path.resolve(__dirname,"..");
const target=path.resolve(process.argv[2]||path.join(root,"assets/village/loft-target.png"));
const source=path.resolve(process.argv[3]||path.join(root,"src/hollow-village-loft-guide.js"));
const art=PNG.sync.read(fs.readFileSync(target));
const surfaces=[
  {crop:[500,400,24,55],base:[45,36,27],gain:.90},
  {crop:[537,396,24,43],base:[96,68,40],gain:1.11},
  {crop:[601,470,42,24],base:[73,51,33],gain:.86},
  {crop:[648,449,45,21],base:[108,73,42],gain:.86},
  {crop:[540,458,15,31],base:[180,96,29],gain:1.06},
  {crop:[531,451,28,45],base:[84,55,30],gain:.86}
];
const tile=32,width=tile*3;
const atlas=Buffer.alloc(width*tile*2*3);
function texel(x,y) {
  const i=(Math.round(y)*art.width+Math.round(x))*4;
  return [art.data[i],art.data[i+1],art.data[i+2]];
}
function clamp(value,min=0,max=255){
  return Math.max(min,Math.min(max,value));
}
for(const [slot,{crop:[left,top,w,h],base,gain}] of surfaces.entries()){
  if(left+w>=art.width||top+h>=art.height)throw Error("Loft surface crop exceeds target");
  const points=[];
  for(let y=0;y<tile;y++)for(let x=0;x<tile;x++)
    points.push(texel(left+w*clamp(x,1,30)/31,top+h*clamp(y,1,30)/31));
  const average=base.map((_,c)=>points.reduce((sum,p)=>sum+p[c],0)/points.length);
  for(const [i,color] of points.entries()){
    const x=i%tile,y=i/tile|0;
    const index=(((slot/3|0)*tile+y)*width+slot%3*tile+x)*3;
    const grain=(((x*29+y*59+x*y*5+slot*39)%37)-18)*.32;
    for(let c=0;c<3;c++)atlas[index+c]=clamp(Math.round(base[c]+gain*(color[c]-average[c])+grain));
  }
}
const text=fs.readFileSync(source,"utf8");
const marker=/\/\* BARN_LOFT_ATLAS_BEGIN \*\/[\s\S]*?\/\* BARN_LOFT_ATLAS_END \*\//;
if(text.split("/* BARN_LOFT_ATLAS_BEGIN */").length!==2||!marker.test(text))throw Error("Unexpected loft texture section");
fs.writeFileSync(source,text.replace(marker,()=>`/* BARN_LOFT_ATLAS_BEGIN */ "${atlas.toString("base64")}" /* BARN_LOFT_ATLAS_END */`));
console.log("Compiled six original loft guide swatches");

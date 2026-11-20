// Compile small hand-selected metal, timber and stone swatches for offline play.
const fs=require("node:fs");
const path=require("node:path");
const {PNG}=require("pngjs");
const root=path.resolve(__dirname,"..");
const paths=process.argv.slice(2);
const heroPath=path.resolve(paths[0]||path.join(root,"assets","monastery","ash-bell-target.png"));
const approachPath=path.resolve(paths[1]||path.join(root,"assets","monastery","ash-bell-approach-target.png"));
const sourcePath=path.resolve(paths[2]||path.join(root,"src","ash-bell-chamber.js"));
const images={hero:PNG.sync.read(fs.readFileSync(heroPath)),approach:PNG.sync.read(fs.readFileSync(approachPath))};
const swatches={
  cast:{from:"hero",crop:[802,331,34,95],base:[59,50,41],contrast:1.14},
  belly:{from:"hero",crop:[855,370,39,59],base:[72,58,43],contrast:1.19},
  lip:{from:"hero",crop:[786,433,84,11],base:[115,85,50],contrast:1.31},
  inside:{from:"hero",crop:[763,475,43,17],base:[16,12,10],contrast:.42},
  oak:{from:"hero",crop:[711,277,82,26],base:[61,44,31],contrast:1.24},
  oakEdge:{from:"hero",crop:[878,279,65,16],base:[92,66,43],contrast:1.23},
  iron:{from:"hero",crop:[667,275,15,44],base:[71,68,62],contrast:.96},
  ironEdge:{from:"hero",crop:[675,286,15,17],base:[115,102,76],contrast:1.13},
  ash:{from:"approach",crop:[378,403,22,37],base:[149,118,71],contrast:.61},
  plaque:{from:"approach",crop:[345,439,25,39],base:[55,44,37],contrast:.71},
  cord:{from:"hero",crop:[594,491,12,70],base:[114,91,63],contrast:.77},
  keeper:{from:"approach",crop:[386,378,14,14],base:[240,133,51],contrast:.44}
};
const size=60;
const stamp={};
const clip=n=>Math.min(255,Math.max(0,n));
for (const [name,{from,crop:[x,y,w,h],base,contrast}] of Object.entries(swatches)){
  const image=images[from];
  if(x<0||y<0||x+w>image.width||y+h>image.height)throw Error("Invalid crop for "+name);
  const samples=[];
  for(let v=0;v<size;v++)for(let u=0;u<size;u++){
    const sx=x+Math.floor(w*u/size),sy=y+Math.floor(h*v/size);
    const a=(sy*image.width+sx)*4,b=(Math.min(sy+1,y+h-1)*image.width+sx)*4;
    samples.push(base.map((_,i)=>(image.data[a+i]+image.data[b+i])*.5));
  }
  const mean=base.map((_,i)=>samples.reduce((sum,p)=>sum+p[i],0)/samples.length);
  const data=Buffer.alloc(size*size*2),salt=name.charCodeAt(0)*19+name.charCodeAt(1);
  for(const [i,sample] of samples.entries()){
    const u=i%size,v=Math.floor(i/size);
    const muted=name==="cast"||name==="inside"||name==="plaque";
    const fleck=((u*73+v*59+u*v*7+salt)%43-21)*(muted?.20:.34);
    const pit=((Math.floor(u/4)*131+Math.floor(v/3)*43+salt)%31-15)*(muted?.25:.52);
    const [r,g,b]=sample.map((value,c)=>clip(Math.round(base[c]+(value-mean[c])*contrast+fleck+pit)));
    data.writeUInt16LE((r>>3)<<11|(g>>2)<<5|b>>3,i*2);
  }
  stamp[name]=data.toString("base64");
}
const source=fs.readFileSync(sourcePath,"utf8");
const slot=/\/\* ASH_BELL_SWATCHES_BEGIN \*\/[\s\S]*?\/\* ASH_BELL_SWATCHES_END \*\//;
if(!slot.test(source))throw Error("Missing Ash Bell texture slot");
const json=JSON.stringify(stamp,null,2).replaceAll("\n","\n  ");
fs.writeFileSync(sourcePath,source.replace(slot,`/* ASH_BELL_SWATCHES_BEGIN */ ${json} /* ASH_BELL_SWATCHES_END */`));
console.log("Embedded "+Object.keys(stamp).length+" Ash Bell surface swatches");

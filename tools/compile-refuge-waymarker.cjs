// Sample the actual approved alcove study into a small synchronous game atlas.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {PNG}=require("pngjs"),root=path.resolve(__dirname,"..");
const image=PNG.sync.read(fs.readFileSync(path.join(root,"assets/hell/refuge-waymarker-target.png")));
const materialStudy=PNG.sync.read(fs.readFileSync(path.join(root,"assets/hell/refuge-cut-stone-study.png")));
assert.deepEqual([image.width,image.height],[1670,941]);
const samples=[
  ["block",13,15,289,270,[86,69,54],.57],["pale",17,659,436,90,[122,99,75],.62],
  ["mortar",746,415,42,63,[62,50,39],.73],["shade",115,792,266,91,[59,46,35],.68],
  ["carved",17,652,551,271,[113,91,70],.65],["bronze",689,666,290,267,[142,85,32],.97],
  ["lip",1347,387,22,6,[213,158,76],.86],["wax",1366,520,29,12,[174,135,87],.78],
  ["backing",652,24,501,517,[108,87,67],.48],["damp",354,274,227,296,[79,68,52],.60],
  ["soot",34,294,258,275,[78,61,47],.59]
];
const size=48,values=Buffer.alloc(samples.length*size*size*2);
samples.forEach(([name,x,y,w,h,palette,contrast],slot)=>{
  const art=["mortar","lip","wax"].includes(name)?image:materialStudy;
  const gray=[];
  for(let v=0;v<size;v++)for(let u=0;u<size;u++){
    let value=0;
    for(const dy of [-.75,.75])for(const dx of [-.45,.45]){
      const px=x+Math.floor((u+.5)*w/size+dx),py=y+Math.floor((v+.5)*h/size+dy);
      const i=(py*art.width+px)*4;
      value+=(.26*art.data[i]+.60*art.data[i+1]+.14*art.data[i+2])*.25;
    }
    gray.push(value);
  }
  const average=gray.reduce((s,v)=>s+v,0)/gray.length;
  gray.forEach((v,i)=>{
    const [r,g,b]=palette.map(c=>Math.round(Math.min(255,Math.max(0,c+(v-average)*contrast))));
    values.writeUInt16LE((r>>3)<<11|(g>>2)<<5|b>>3,(slot*size*size+i)*2);
  });
});
const file=path.join(root,"src/prologue-refuge-waymarker.js"),s=fs.readFileSync(file,"utf8");
const marker=/\/\* REFUGE_ATLAS_BEGIN \*\/[\s\S]*?\/\* REFUGE_ATLAS_END \*\//;
assert(marker.test(s));const out=s.replace(marker,()=>`/* REFUGE_ATLAS_BEGIN */ "${values.toString("base64")}" /* REFUGE_ATLAS_END */`);
if(process.argv.includes("--check"))assert.equal(out,s,"Regenerate the refuge swatches");else fs.writeFileSync(file,out);
console.log("Refuge material atlas",samples.length,"surfaces");

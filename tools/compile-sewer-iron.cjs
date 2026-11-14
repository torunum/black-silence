// Read metal only from the commissioned engine, excluding the wall, shadows and moving linkage.
// Annular and radial samples provide a rectangular, reusable foundry material for native flywheels.
const fs=require("node:fs"),path=require("node:path"),{PNG}=require("pngjs");
const root=path.resolve(__dirname,".."),image=PNG.sync.read(fs.readFileSync(path.join(root,"assets/sewer/works-target-v1.png")));
if(image.width!==1672||image.height!==941)throw Error("Unexpected pump target dimensions");
const tiles={};
function tile(name,w,h,sample){
  const bytes=Buffer.alloc(w*h*2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const [px,py]=sample((x+.5)/w,(y+.5)/h),i=(Math.round(py)*image.width+Math.round(px))*4;
    const r=image.data[i],g=image.data[i+1],b=image.data[i+2];
    bytes.writeUInt16LE((r>>3)<<11|(g>>2)<<5|(b>>3),(y*w+x)*2);
  }
  tiles[name]=[w,h,bytes.toString("base64")];
}
// The upper arc is continuous between both near columns in the target and has no rod over it.
tile("rim",256,20,(u,v)=>{
  const angle=-1.57+(u<.5?u*2:2-u*2)*1.87,rad=116.6+v*13.2;
  return [735+rad*Math.cos(angle),466+rad*Math.sin(angle)];
});
tile("cast",96,32,(u,v)=>{
  const px=1032+u*55,py=480+v*26;
  return [px,py];
});
tile("brass",96,16,(u,v)=>{
  const a=-1.62+u*3.12,r=18.2+v*7.1;
  return [738+r*Math.cos(a),464+r*Math.sin(a)];
});
tile("gauge",56,56,(u,v)=>{
  let dx=(u-.5)*2,dy=(v-.5)*2;
  // Erase the concept's fixed needle. The live game carries a separate one.
  if(dx>-.11&&dy<.10&&Math.abs(dx+dy*.87)<.14 && Math.hypot(dx,dy)<.74)dx=-Math.abs(dx);
  return [1398+dx*24,374+dy*23];
});
tile("foot",100,18,(u,v)=>[754+u*112,536+v*14]);
const dst=path.join(root,"src","sewer-works.js"),text=fs.readFileSync(dst,"utf8");
const markers=/\/\* SEWER_IRON_BEGIN \*\/.*?\/\* SEWER_IRON_END \*\//s;
if(!markers.test(text))throw Error("Expected sewer iron data markers");
fs.writeFileSync(dst,text.replace(markers,()=>"/* SEWER_IRON_BEGIN */ "+JSON.stringify(tiles)+" /* SEWER_IRON_END */"));

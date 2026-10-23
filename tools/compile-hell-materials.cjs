// Compile the generated 2x2 atlas to small synchronous RGB textures.
const fs=require('node:fs'),path=require('node:path'),{PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),original=PNG.sync.read(fs.readFileSync(path.join(root,'assets/hell/material-atlas-v1.png')));
const paving=PNG.sync.read(fs.readFileSync(path.join(root,'assets/hell/material-atlas-v2.png')));
const output={};
for(const [name,qx,qy] of [['stone',0,0],['paving',1,0],['bronze',0,1],['glass',1,1]]){
 const png=name==='paving'?paving:original;
 const rgb=Buffer.alloc(128*128*3);for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const x0=Math.floor((qx+x/128)*png.width/2),x1=Math.floor((qx+(x+1)/128)*png.width/2),y0=Math.floor((qy+y/128)*png.height/2),y1=Math.floor((qy+(y+1)/128)*png.height/2),j=(y*128+x)*3;
  const sum=[0,0,0];let count=0;
  for(let sy=y0;sy<y1;sy++)for(let sx=x0;sx<x1;sx++){const i=(sy*png.width+sx)*4;for(let c=0;c<3;c++)sum[c]+=png.data[i+c];count++;}
  for(let c=0;c<3;c++)rgb[j+c]=Math.round(sum[c]/count);
 }output[name]=rgb.toString('base64');
}
const file=path.join(root,'src/prologue.js'),source=fs.readFileSync(file,'utf8');
const marker=/\/\* HELL_TEXTURE_DATA_BEGIN \*\/.*?\/\* HELL_TEXTURE_DATA_END \*\//s;
if(!marker.test(source))throw Error('Hell texture marker missing');
fs.writeFileSync(file,source.replace(marker,()=>`/* HELL_TEXTURE_DATA_BEGIN */ ${JSON.stringify(output)} /* HELL_TEXTURE_DATA_END */`));
console.log('Embedded four generated 128x128 RGB hell materials.');

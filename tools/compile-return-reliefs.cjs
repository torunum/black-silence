// Isolate two small original art studies for relief faces. All remaining
// architecture, lighting, floor and interaction are built by the game.
const fs=require('node:fs'),path=require('node:path'),{PNG}=require('pngjs');
const root=path.resolve(__dirname,'..'),image=PNG.sync.read(fs.readFileSync(path.join(root,'assets/hell/return-chapel-target-v1.png')));
if(image.width!==1672||image.height!==941)throw Error('Unexpected reference dimensions');
const pieces={effigy:[425,487,142,35,96,24],shaft:[744,475,34,77,24,64]};
const art={};for(const [name,[left,top,sw,sh,w,h]] of Object.entries(pieces)){
  const b=Buffer.alloc(w*h*3);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++){
    let sum=0,count=0;
    for(let v=Math.floor(y*sh/h);v<Math.ceil((y+1)*sh/h);v++)
      for(let u=Math.floor(x*sw/w);u<Math.ceil((x+1)*sw/w);u++){
        sum+=image.data[((v+top)*image.width+left+u)*4+c];count++;
      }
    b[(y*w+x)*3+c]=Math.min(255,Math.round(sum/count*(name==='shaft'?1.58:1.85)));
  }
  art[name]=[w,h,b.toString('base64')];
}
const file=path.join(root,'src/prologue.js'),source=fs.readFileSync(file,'utf8');
const marker=/\/\* RETURN_RELIEF_BEGIN \*\/.*?\/\* RETURN_RELIEF_END \*\//s;
if(!marker.test(source))throw Error('Expected relief data marker');
fs.writeFileSync(file,source.replace(marker,()=>`/* RETURN_RELIEF_BEGIN */ ${JSON.stringify(art)} /* RETURN_RELIEF_END */`));

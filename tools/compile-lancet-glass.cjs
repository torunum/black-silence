// Sample the three commissioned pointed windows individually. Pack RGB565
// texels into the offline JS module, retaining the photographic lead and glass.
const fs=require("node:fs"),path=require("node:path"),{PNG}=require("pngjs");
const root=path.resolve(__dirname,"..");
const png=PNG.sync.read(fs.readFileSync(path.join(root,"assets/hell/lancet-triptych-nov14.png")));
if(png.width!==1536 || png.height!==1024)throw Error("Check the lancet source dimensions");
const width=128,height=256,top=14,bottom=1004;
const windows=[[60,451],[563,968],[1072,1468]];
const tiles=windows.map(([left,right])=>{
  const buf=Buffer.alloc(width*height*2);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const rgb=[0,0,0];
    for(const oy of [.20,.50,.80])for(const ox of [.18,.50,.82]){
      const sx=Math.min(right,Math.floor(left+(x+ox)*(right-left)/width));
      const sy=Math.min(bottom,Math.floor(top+(y+oy)*(bottom-top)/height));
      for(let c=0;c<3;c++)rgb[c]+=png.data[(sy*png.width+sx)*4+c];
    }
    const avg=rgb.map(v=>v/9);
    // The open honey-coloured panes transmit more light than the opaque paint
    // and iron. Colour selection keeps the bell's dark mouth and violet lead.
    const [r,g,b]=avg;
    const amber=Math.max(0,Math.min(1,(r-b-28)/78))*
      Math.max(0,Math.min(1,(g-b-8)/23))*Math.max(0,Math.min(1,(r-75)/100));
    avg[0]=Math.min(255,r*(1+.37*amber));
    avg[1]=Math.min(255,g*(1+.56*amber)+12*amber);
    avg[2]=Math.min(255,b*(1+.26*amber)+14*amber);
    // Quantisation happens once, before the texture enters the game.
    const red=Math.round(avg[0]*31/255),green=Math.round(avg[1]*63/255),blue=Math.round(avg[2]*31/255);
    buf.writeUInt16LE((red<<11)|(green<<5)|blue,(y*width+x)*2);
  }
  return buf.toString("base64");
});
const dst=path.join(root,"src/prologue-stained-glass.js"),src=fs.readFileSync(dst,"utf8");
const mark=/\/\* LANCET_PANES_BEGIN \*\/.*?\/\* LANCET_PANES_END \*\//s;
if(!mark.test(src))throw Error("Expected glass data markers");
fs.writeFileSync(dst,src.replace(mark,()=>"/* LANCET_PANES_BEGIN */ "+JSON.stringify(tiles)+" /* LANCET_PANES_END */"));

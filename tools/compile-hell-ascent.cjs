// Compile small original surface crops from the DreamLoop ascent frame.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {PNG}=require("pngjs");
const root=path.resolve(__dirname,".."), source=path.join(root,"src/hell-ascent-lanterns.js");
const frame=PNG.sync.read(fs.readFileSync(path.join(root,"assets/hell/ascent-lanterns-target-nov19.png")));
assert.deepEqual([frame.width,frame.height],[1672,941],"Expected the original ascent frame");
const crops={
  iron:[[564,405],[596,405],[596,412],[564,412]],
  brass:[[581,473],[605,471],[606,478],[581,480]],
  glass:[[587,444],[600,444],[600,450],[588,448]],
  stone:[[690,563],[724,562],[728,574],[691,576]],
  rim:[[792,361],[870,362],[867,370],[793,368]]
};
const blend=(a,b,t)=>a+(b-a)*t;
const lerp=(a,b,t)=>[blend(a[0],b[0],t),blend(a[1],b[1],t)];
const channel=(v,max)=>Math.round(Math.min(255,Math.max(0,v))*max/255);
const width=32,height=40,encoded={};
for(const [tile,quad] of Object.entries(crops)){
  const bytes=Buffer.alloc(width*height*2);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
    const u=(i+.5)/width,v=(j+.5)/height;
    const [x,y]=lerp(lerp(quad[0],quad[1],u),lerp(quad[3],quad[2],u),v);
    const k=((y|0)*frame.width+(x|0))*4;
    const light=tile==="iron"?1.22:tile==="brass"?1.11:tile==="rim"?1.17:1;
    let rgb=[0,1,2].map(n=>frame.data[k+n]*light);
    if(tile==="iron"||tile==="stone"){
      const luma=rgb[0]*.23+rgb[1]*.63+rgb[2]*.14;
      rgb=rgb.map((value,n)=>blend(value,luma*[1.04,1,.88][n],tile==="iron"?.78:.69));
    }
    if(tile==="glass"){
      // The flame-lit centre keeps the orange panes visible at distance.
      const heat=Math.max(0,1-Math.hypot((u-.52)*1.22,(v-.57)*1.1))**1.65;
      rgb=rgb.map((value,n)=>blend(blend(value,[245,124,31][n],.46),[255,224,143][n],.22+heat*.75));
    }
    bytes.writeUInt16LE(channel(rgb[0],31)<<11 | channel(rgb[1],63)<<5 | channel(rgb[2],31),(j*width+i)*2);
  }
  encoded[tile]=bytes.toString("base64");
}
const begin="/* ASCENT_TEXELS_BEGIN */",end="/* ASCENT_TEXELS_END */",text=fs.readFileSync(source,"utf8");
assert.equal(text.split(begin).length,2);
assert.equal(text.split(end).length,2);
const first=text.indexOf(begin)+begin.length,last=text.indexOf(end);
assert(last>first);
const data=" {\n"+Object.entries(encoded).map(([tile,value])=>`    ${tile}: "${value}"`).join(",\n")+"\n  } ";
const next=text.slice(0,first)+data+text.slice(last);
if(process.argv.includes("--check"))assert.equal(text,next,"Recompile the ascent atlas");
else fs.writeFileSync(source,next);
console.log(`Ascent lantern atlas ${Object.keys(crops).length} × ${width} × ${height}`);

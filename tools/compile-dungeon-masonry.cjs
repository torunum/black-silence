// Recover small stone, metal, timber and relief surfaces from the commissioned drawing.
// Each piece is independently wrapped onto the corresponding three-dimensional object.
const fs = require("node:fs");
const path = require("node:path");
const {PNG} = require("pngjs");
const root = path.resolve(__dirname, "..");
const source = PNG.sync.read(fs.readFileSync(path.join(root, "assets/dungeon/gaoler-sally-port-v1.png")));
if(source.width!==1672 || source.height!==941)throw Error("Unexpected sally-port drawing");
const crops={};
function crop(name,w,h,project){
  const bytes=Buffer.alloc(w*h*2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const [u,v]=project((x+.5)/w,(y+.5)/h);
    const i=(Math.round(v)*source.width+Math.round(u))*4;
    const exposure=name==="effigy"?2.05:name==="iron"||name==="band"?1.84:
      name==="facade"?1.72:name==="pulley"?2.20:1.39;
    const rgb=[0,1,2].map(c=>Math.min(255,(source.data[i+c]*exposure+4)|0));
    bytes.writeUInt16LE((rgb[0]>>3)<<11|(rgb[1]>>2)<<5|(rgb[2]>>3),2*(y*w+x));
  }
  crops[name]=[w,h,bytes.toString("base64")];
}
// Hooded effigy and crossed keys form a single lintel stone. The boundary is cut
// out as a six-sided keystone by the caller.
crop("effigy",104,91,(u,v)=>[809+135*u,150+114*v]);
crop("ashlar",56,38,(u,v)=>[532+58*u,329+42*v]);
crop("litStone",58,40,(u,v)=>[639+43*u,526+28*v]);
crop("coldStone",55,40,(u,v)=>[1100+45*u,422+43*v]);
crop("iron",24,80,(u,v)=>[876+12*u,389+71*v]);
crop("band",64,16,(u,v)=>[941+52*u,474+13*v]);
crop("rust",42,45,(u,v)=>[1173+46*u,490+63*v]);
crop("keeper",82,30,(u,v)=>[680+55*u,627+25*v]);
crop("paving",100,35,(u,v)=>[542+204*u,686+40*v]);
// Use the drawing's chipped edges and directional light on the actual stone
// faces. Patch out the large foreground gun, burning brazier and hanging chains;
// those objects have their own three-dimensional representations.
crop("facade",360,281,(u,v)=>{
  let x=529+u*689,y=112+v*564;
  if((y>450&&x<645&&x>535)||(y>556&&x>945))x=1753-x;
  if(x>1134&&y>442)x=1098+(x-1134)*.30;
  if(x<622 && x>596 && y>307 && y<539)x-=31;
  if(x>1095&&y<360&&y>280)x=1754-x;
  if(y>228&&y<317&&(Math.abs(x-674)<22||Math.abs(x-1069)<20))x+=x<800?32:-30;
  return [x,y];
});
crop("pulley",42,12,(u,v)=>{const angle=2*Math.PI*u,r=37+v*7;return [1154+r*Math.cos(angle),315+r*Math.sin(angle)];});
const destination=path.join(root,"src/dungeon-sally-port.js");
const text=fs.readFileSync(destination,"utf8");
const markers=/\/\* SALLY_SURFACES_BEGIN \*\/.*?\/\* SALLY_SURFACES_END \*\//s;
if(!markers.test(text))throw Error("Missing embedded surface markers");
fs.writeFileSync(destination,text.replace(markers,()=>"/* SALLY_SURFACES_BEGIN */ "+JSON.stringify(crops)+" /* SALLY_SURFACES_END */"));

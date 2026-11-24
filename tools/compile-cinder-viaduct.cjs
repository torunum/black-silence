// Compile the hand-picked, photographed material patches from the sluice study.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");
const image = PNG.sync.read(fs.readFileSync(path.join(root, "assets/hell/cinder-sluice-study.png")));
const samples = [
  // Crop coordinates in the original 1672 x 941 concept, material base and contrast.
  [130,397,166,103,[105,78,58],.98],    // block face
  [553,795,244,46,[80,67,57],1.31],      // horizontal tread
  [664,679,191,29,[119,90,65],1.35],     // battered nosing
  [1166,283,24,124,[90,77,66],1.12],   // blackened iron spoke
  [900,666,154,24,[170,111,56],1.15],  // edge patina
  [1382,418,63,93,[111,68,48],1.08]    // oxidized plate
];
const size = 32, bytes = Buffer.alloc(samples.length * size * size * 2);
for (const [tile, [x,y,w,h,base,contrast]] of samples.entries()) {
  const values = [];
  for (let v = 0; v < size; v++) for (let u = 0; u < size; u++) {
    const px = Math.floor((x+(u+.5)*w/size)*image.width/1672);
    const py = Math.floor((y+(v+.5)*h/size)*image.height/941);
    const p = (py*image.width+px)*4;
    values.push(.24*image.data[p]+.64*image.data[p+1]+.12*image.data[p+2]);
  }
  const mean = values.reduce((a,b)=>a+b,0)/values.length;
  values.forEach((value,i)=>{
    const [r,g,b] = base.map(v=>Math.max(0,Math.min(255,Math.round(v+(value-mean)*contrast))));
    bytes.writeUInt16LE((r>>3)<<11 | (g>>2)<<5 | b>>3, (tile*size*size+i)*2);
  });
}
const file = path.join(root,"src/prologue-cinder-viaduct.js"), source = fs.readFileSync(file,"utf8");
const marker = /\/\* CINDER_VIADUCT_TEXELS_BEGIN \*\/[\s\S]*?\/\* CINDER_VIADUCT_TEXELS_END \*\//;
assert(marker.test(source));
const result = source.replace(marker,()=>`/* CINDER_VIADUCT_TEXELS_BEGIN */ "${bytes.toString("base64")}" /* CINDER_VIADUCT_TEXELS_END */`);
if (process.argv.includes("--check")) assert.equal(result,source); else fs.writeFileSync(file,result);

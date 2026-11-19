// Small, independently wrapped surfaces for the Necropolis ossuary. Each crop
// comes from the approved gameplay target and becomes part of a mesh UV layout.
const fs = require("node:fs");
const path = require("node:path");
const {PNG} = require("pngjs");
const root = path.resolve(__dirname,"..");
const drawing = PNG.sync.read(fs.readFileSync(path.join(root,"assets/necropolis/ossuary-target-nov19.png")));
if (drawing.width !== 1672 || drawing.height !== 941) throw Error("Unexpected ossuary target size");

const patches = [
  // name, left, top, source width/height, sample width/height, exposure
  ["slate", 680, 352, 47, 58, 42, 46, 1.56],
  ["edge", 914, 313, 32, 54, 28, 44, 1.58],
  ["dark", 984, 274, 38, 42, 34, 38, 1.46],
  ["pier", 661, 477, 23, 116, 22, 70, 1.62],
  ["slab", 488, 599, 25, 51, 22, 42, 1.54],
  ["keystone", 777, 231, 59, 61, 56, 57, 1.83],
  ["relief", 462, 370, 185, 190, 98, 101, 1.61],
  ["nicheUrn", 1218, 451, 72, 78, 50, 52, 1.49],
  ["oak", 751, 455, 80, 126, 71, 91, 1.55],
  ["iron", 751, 432, 130, 14, 63, 12, 1.60],
  ["bronze", 783, 738, 66, 5, 39, 6, 1.13],
  ["paver", 712, 735, 70, 62, 55, 45, 1.39],
  ["lampMetal", 1235, 558, 48, 13, 40, 13, 1.13],
  ["rimLight", 923, 473, 13, 110, 19, 45, 1.40],
  ["darkInset", 1288, 532, 22, 51, 18, 41, 1.10]
];
const surfaces = Object.fromEntries(patches.map(([name,left,top,sw,sh,width,height,exposure])=>{
  const pixels = Buffer.alloc(width*height*2);
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const sx=left+Math.floor((x+.5)*sw/width), sy=top+Math.floor((y+.5)*sh/height);
    const i=(sy*drawing.width+sx)*4;
    const rgb=[0,1,2].map(channel=>Math.min(255,Math.round(drawing.data[i+channel]*exposure+2)));
    pixels.writeUInt16LE((rgb[0]>>3)<<11|(rgb[1]>>2)<<5|(rgb[2]>>3),2*(y*width+x));
  }
  return [name,[width,height,pixels.toString("base64")]];
}));

const output=path.join(root,"src/necropolis-ossuary-entrance.js");
const original=fs.readFileSync(output,"utf8");
const marker=/\/\* OSSUARY_CROPS_BEGIN \*\/.*?\/\* OSSUARY_CROPS_END \*\//s;
if (!marker.test(original)) throw Error("Missing ossuary crop markers");
fs.writeFileSync(output,original.replace(marker,()=>"/* OSSUARY_CROPS_BEGIN */ "+JSON.stringify(surfaces)+" /* OSSUARY_CROPS_END */"));

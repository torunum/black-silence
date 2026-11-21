// Convert the authored plate to the standalone game's RGB565 material.
const fs = require("node:fs");
const path = require("node:path");
const {PNG} = require("pngjs");
const root = path.resolve(__dirname,"..");
const image = PNG.sync.read(fs.readFileSync(path.join(root,"assets","chapel","family-tintype.png")));
if (image.width!==92 || image.height!==130) throw Error("Unexpected chapel photograph dimensions");
const pixels = Buffer.alloc(image.width*image.height*2);
for (let i=0;i<image.width*image.height;i++) {
  const j=i*4;
  pixels.writeUInt16LE((image.data[j]>>3)<<11 | (image.data[j+1]>>2)<<5 | image.data[j+2]>>3, i*2);
}
const pathToSource = path.join(root,"src","chapel-vigil-keepsake.js");
const code = fs.readFileSync(pathToSource,"utf8");
const marker = /(?<=\/\* CHAPEL_TINTYPE_BEGIN \*\/ )"[A-Za-z0-9+/=]*"(?= \/\* CHAPEL_TINTYPE_END \*\/)/g;
if ([...code.matchAll(marker)].length!==1) throw Error("Expected one chapel plate texture");
fs.writeFileSync(pathToSource,code.replace(marker,JSON.stringify(pixels.toString("base64"))));

// Extract small surface swatches from the approved in-game camera study.
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");
const image = PNG.sync.read(fs.readFileSync(path.join(root, "assets", "cathedral", "reliquary-dreamloop-target.png")));
const runtime = path.join(root, "src", "cathedral-reliquary.js");
const source = fs.readFileSync(runtime, "utf8");
const swatches = {
  stone: { crop: [751,421,19,116], color: [84,75,66], contrast: 1.36 },
  bevel: { crop: [772,640,88,13], color: [130,103,79], contrast: 1.25 },
  inset: { crop: [787,489,5,37], color: [34,29,24], contrast: .63 },
  band: { crop: [776,382,21,11], color: [48,41,32], contrast: 1.35 },
  bronze: { crop: [799,400,38,5], color: [166,120,70], contrast: .90 },
  bone: { crop: [810,473,5,24], color: [197,184,152], contrast: .88 },
  wax: { crop: [810,567,8,25], color: [243,199,136], contrast: .74 }
};

const size = 28;
const data = {};
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
for (const [name, {crop: [x,y,w,h], color, contrast}] of Object.entries(swatches)) {
  if (x < 0 || y < 0 || x + w > image.width || y + h > image.height) {
    throw new Error("Surface swatch outside reference: " + name);
  }
  const luminance = [];
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    // Sample a pair of rows to soften the reference capture's scanline grille.
    const sx = x + Math.floor(col / size * w), sy = y + Math.floor(row / size * h);
    const a = (sy * image.width + sx) * 4;
    const b = (Math.min(sy + 1,y + h - 1) * image.width + sx) * 4;
    luminance.push(((image.data[a] + image.data[b]) * .24 +
      (image.data[a + 1] + image.data[b + 1]) * .65 +
      (image.data[a + 2] + image.data[b + 2]) * .11) * .5);
  }
  const mean = luminance.reduce((sum,value)=>sum + value,0) / luminance.length;
  const pixels = Buffer.alloc(size * size * 2);
  luminance.forEach((value,i) => {
    const dust = ((i * 29 + Math.floor(i / size) * 39) % 13 - 6) * .35;
    const [r,g,b] = color.map(base => clamp(Math.round(base + (value - mean) * contrast + dust),0,255));
    pixels.writeUInt16LE((r >> 3) << 11 | (g >> 2) << 5 | b >> 3, i * 2);
  });
  data[name] = pixels.toString("base64");
}
const slot = /\/\* CATHEDRAL_TEXELS_BEGIN \*\/[\s\S]*?\/\* CATHEDRAL_TEXELS_END \*\//;
if (!slot.test(source)) throw new Error("Cathedral texture slot missing");
const json = JSON.stringify(data,null,2).replaceAll("\n","\n  ");
const next = source.replace(slot, `/* CATHEDRAL_TEXELS_BEGIN */ ${json} /* CATHEDRAL_TEXELS_END */`);
fs.writeFileSync(runtime,next);
console.log("Embedded " + Object.keys(data).length + " cathedral surface swatches");

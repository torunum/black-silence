const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");
const source = path.resolve(process.argv[2] || path.join(root, "src", "ash-bell-arrival.js"));
const reference = path.join(root, "assets", "ash-bell", "arrival-medallion-source.png");
const { width, height, data } = PNG.sync.read(fs.readFileSync(reference));
if (width !== 71 || height !== 65) throw Error("Unexpected Ash Bell medallion reference size");

function pixel(x, y) {
  const at = (y * width + x) * 4;
  return [0, 1, 2].map(channel => (data[at + channel] * 2 + data[at + width * 4 + channel]) / 3);
}

const pixels = Buffer.alloc(width * (height - 1) * 2);
for (let y = 0; y < height - 1; y++) for (let x = 0; x < width; x++) {
  let rgb = pixel(x, y);
  // Sample smooth iron across the unlit upper rim of the generated plate.
  if (y < 11 && x >= 23 && x <= 52) {
    const iron = pixel(21 + x % 6, 16 + y % 5);
    const weight = Math.min(1, (11 - y) * .52, 1 + (x - 23) * .3, 1 + (52 - x) * .3);
    rgb = rgb.map((value, channel) => value + (iron[channel] - value) * weight);
  }
  const bronze = Math.max(0, Math.min(1, (rgb[0] - rgb[1] - 8) / 23, (rgb[1] - rgb[2] - 5) / 17));
  const [r, g, b] = rgb.map((value, channel) => Math.min(255, Math.round(value * (1.17 + bronze * [.34, .25, .15][channel]))));
  pixels.writeUInt16LE(((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3), (y * width + x) * 2);
}

const raw = fs.readFileSync(source, "utf8");
const marker = /\/\* BELL_MEDALLION_ATLAS_BEGIN \*\/[\s\S]*?\/\* BELL_MEDALLION_ATLAS_END \*\//g;
if ([...raw.matchAll(marker)].length !== 1) throw Error("Expected one Ash Bell medallion atlas marker");
const atlas = `/* BELL_MEDALLION_ATLAS_BEGIN */ "${pixels.toString("base64")}" /* BELL_MEDALLION_ATLAS_END */`;
fs.writeFileSync(source, raw.replace(marker, () => atlas));
console.log(`Embedded ${width} × ${height - 1} Ash Bell medallion texels`);

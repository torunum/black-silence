// Compile generated texture luminance into small, synchronous palette offsets.
// The runtime stays offline and retains the original game's material colours.
const fs = require("node:fs");
const path = require("node:path");
const { PNG } = require("pngjs");
const root = path.resolve(__dirname, "..");
const image = PNG.sync.read(
  fs.readFileSync(path.join(root, "assets/materials.png")),
);
const size = 64,
  bytes = Buffer.alloc(size * size * 4);
for (let material = 0; material < 4; material++) {
  const values = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const px = Math.min(
        image.width - 1,
        Math.floor((((material % 2) + (x + 0.5) / size) * image.width) / 2),
      );
      const py = Math.min(
        image.height - 1,
        Math.floor(
          ((Math.floor(material / 2) + (y + 0.5) / size) * image.height) / 2,
        ),
      );
      const p = (py * image.width + px) * 4;
      values.push(
        image.data[p] * 0.2126 +
          image.data[p + 1] * 0.7152 +
          image.data[p + 2] * 0.0722,
      );
    }
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  values.forEach(
    (value, index) =>
      (bytes[material * size * size + index] = Math.round(
        128 + Math.max(-1.5, Math.min(1.25, (value - average) / 46)) * 64,
      )),
  );
}
const code = `// Derived from assets/materials.png, generated for this game's existing palette.\n(()=>{\nconst raw=atob('${bytes.toString("base64")}');\nconst tones=Int8Array.from(raw,c=>c.charCodeAt(0)-128);\nwindow.__silenceMaterialTone=(material,x,y,z)=>{\n const u=(Math.floor((x+z*.41)*410)&63),v=(Math.floor((y+z*.79)*410)&63);\n return tones[material*4096+v*64+u]/64;\n};\n})();\n`;
fs.writeFileSync(path.join(root, "src/materials.js"), code);
console.log("Compiled four 64x64 material tone maps.");

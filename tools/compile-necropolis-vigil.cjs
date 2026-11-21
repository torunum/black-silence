// Embed the eight painted poses so the downloadable game works offline.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "src", "necropolis-lantern-vigil.js");
const atlas = fs.readFileSync(path.join(root, "assets", "necropolis", "lantern-keeper-atlas.png"));
if (atlas.readUInt32BE(16) !== 400 || atlas.readUInt32BE(20) !== 288) throw Error("Unexpected keeper atlas size");
const marker = /(?<=\/\* LANTERN_KEEPER_PNG_BEGIN \*\/ )"[A-Za-z0-9+/=]*"(?= \/\* LANTERN_KEEPER_PNG_END \*\/)/g;
const code = fs.readFileSync(source, "utf8");
if ([...code.matchAll(marker)].length !== 1) throw Error("Expected one lantern keeper atlas");
fs.writeFileSync(source, code.replace(marker, JSON.stringify(atlas.toString("base64"))));

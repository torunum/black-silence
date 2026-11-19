// Rectify small material swatches from the approved DreamLoop frame. Only
// these opaque surface samples are embedded. The game reconstructs the shape.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { PNG } = require("pngjs");

const root = path.resolve(__dirname, "..");
const source = path.join(root,"src/hell-arena-hearth.js");
const image = PNG.sync.read(fs.readFileSync(path.join(root,"assets/hell/arena-hearth-target-nov19.png")));
assert.deepEqual([image.width,image.height],[1672,941],"Expected the original hearth target");

// Clockwise rectangular material-space coordinates within specific faces.
const crops = {
  clinker: {quad:[[633,597],[675,594],[676,641],[634,646]], contrast:1.1, gain:1.20},
  iron: {quad:[[622,573],[678,569],[678,585],[622,589]], contrast:1.2, gain:1.22},
  copper: {quad:[[613,589],[679,585],[677,593],[613,596]], contrast:1.05, gain:1.42},
  coal: {quad:[[558,551],[634,521],[651,541],[575,562]], contrast:1.14, gain:1.12},
  bed: {quad:[[616,564],[641,546],[672,557],[655,568]], contrast:1.1, gain:1.12},
  ashlar: {quad:[[611,653],[671,651],[675,669],[611,673]], contrast:1.15, gain:1.24},
  gold: {quad:[[606,682],[666,682],[662,689],[600,689]], contrast:1.08, gain:1.44},
  seam: {quad:[[601,671],[667,670],[670,676],[601,679]], contrast:1.1, gain:.59},
};

const mix = (a,b,t) => a + t * (b-a);
const lerp = (p,q,t) => [mix(p[0],q[0],t),mix(p[1],q[1],t)];
const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
const w = 60, h = 68;
const texels = {};
for(const [tile,{quad,contrast,gain}] of Object.entries(crops)) {
  const rgb = Buffer.alloc(w*h*2);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const u=(x+.5)/w, v=(y+.5)/h;
    const [px,py]=lerp(lerp(quad[0],quad[1],u),lerp(quad[3],quad[2],u),v);
    const at=((py|0)*image.width+(px|0))*4;
    const value=[0,1,2].map(c=>Math.round(clamp(((image.data[at+c]-30)*contrast+30)*gain,0,255)));
    const encoded=((value[0]/255*31+.5|0)<<11)|((value[1]/255*63+.5|0)<<5)|(value[2]/255*31+.5|0);
    rgb.writeUInt16LE(encoded,(y*w+x)*2);
  }
  texels[tile]=rgb.toString("base64");
}

const begin = "/* HEARTH_TEXELS_BEGIN */", end = "/* HEARTH_TEXELS_END */";
const text = fs.readFileSync(source,"utf8");
assert.equal(text.split(begin).length,2,"One atlas entry should exist");
assert.equal(text.split(end).length,2,"One atlas exit should exist");
const start = text.indexOf(begin) + begin.length, finish = text.indexOf(end);
assert(finish>start,"Expected increasing atlas offsets");
const data = " {\n"+Object.entries(texels).map(([tile,value])=>`    ${tile}: "${value}"`).join(",\n")+"\n  } ";
const next = text.slice(0,start)+data+text.slice(finish);
if (process.argv.includes("--check")) assert.equal(next,text,"Rebuild hearth material swatches first");
else fs.writeFileSync(source,next);
console.log(`Hearth atlas ${Object.keys(texels).length} × ${w} × ${h}`);

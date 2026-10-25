// Run: node tools/prologue-tests.cjs
// Tests the real original map builder plus the extension without a WebGL context.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
// The shipped HTML contains the untouched engine followed by the extension.
// No inspection cache, browser package, or generated test fixture is required.
const bundle = fs.readFileSync(
  path.join(root, "THE-BLACK-SILENCE.html"),
  "utf8",
);
const start = bundle.indexOf("const iA=.42,");
const end = bundle.indexOf("Z6=1.4,", start);
assert(
  start >= 0 && end > start,
  "Expected original prologue builder in distributable HTML",
);
const mapCode = bundle.slice(start, end).replace(/,\s*$/, ";");
const extension = fs.readFileSync(
  path.join(root, "src", "prologue.js"),
  "utf8",
);
const context = vm.createContext({ assert, console, atob: text=>Buffer.from(text,'base64').toString('binary') });
vm.runInContext(
  mapCode +
    `
const baseline = nP(), gV = [{build:nP}];
let mf = 0, paused = false, overlay = false, doorTicks = 0;
const messages = [];
function le(text, seconds) { messages.push(text); mf = seconds; }
const T = {level:0, dead:false, won:false, weapons:[]};
const Be = {started:true, inputLock:false, pianoOpen:false}, oo = {busy:false};
const P = 2, C = {px:19, pz:9}, v = {grid:null, enemies:[]};
const di = {votive:{build(){},mode:'free'}};
const Ft = {};
function Z(value) {return value;}
function Ew(value) {return value;}
function e0(draw,w=64,h=64) {
  draw({createImageData:(a,b)=>({data:new Uint8ClampedArray(a*b*4)}),putImageData(){},drawImage(){},fillRect(){}},w,h);
  return {image:{}};
}
function iR(name) { return {name}; }
function F$(dt) { doorTicks++; }
function FJ(scene,map) {}
function Wk() { return paused; } function Qm() { return overlay; }
function lm() { return true; }
${extension}
const result = gV[0].build(); v.grid = result.g;
assert.deepEqual(result.hmap, baseline.hmap, 'Floor elevations preserved');
assert.deepEqual(result.zones.map, baseline.zones.map, 'Zone boundaries preserved');
for(let z=0;z<result.H;z++)for(let x=0;x<result.W;x++) {
  const lifted=z>=18&&baseline.zones.map[z][x]===2&&!'#WI'.includes(result.g[z][x]);
  assert.equal(result.cmap[z][x],lifted?Math.max(baseline.cmap[z][x],14.8):baseline.cmap[z][x], 'Only open hell roof is raised '+x+','+z);
}
result.zones.themes.forEach((theme,i)=>{
  if(theme.id!=='hell')assert.deepEqual(theme,baseline.zones.themes[i],'Other chapter themes preserved');
  else {
    for(const key of ['wall','ceil','side','ground'])assert(theme[key].startsWith('hellAsh'),'Scoped generated hell material '+key);
    for(const key of ['shell','lava','bed','line'])assert.equal(theme[key],baseline.zones.themes[i][key],'Hell behavior '+key);
  }
});
assert.deepEqual(result.grave, baseline.grave, 'Starting grave preserved');
assert.equal(result.W, baseline.W); assert.equal(result.H, baseline.H);
for (let z=0; z<result.H; z++) for (let x=0; x<result.W; x++) {
  const solid = c => '#IWDS+'.includes(c);
  assert.equal(solid(result.g[z][x]), solid(baseline.g[z][x]), 'Collision topology at '+x+','+z);
}
for (const kind of ['z','w','P','X']) {
  assert.equal(result.g.flat().filter(c=>c===kind).length, baseline.g.flat().filter(c=>c===kind).length,
    'Enemy/spawn/exit count preserved: '+kind);
}
assert.equal(result.g[4][29], '2', 'Optional shotgun at chapel altar');
for (const [x,z] of [[30,4],[3,24],[29,22]]) assert.equal(result.g[z][x], 'b', 'Shell pickup '+x+','+z);
assert.equal(result.g[20][7], 'a', 'First encounter has spare bullets');
// A simple connectivity check catches accidentally moving a pickup into a wall.
const reachable = new Set(['9,4']), queue = [[9,4]];
for (let q=0; q<queue.length; q++) {
  const [x,z]=queue[q];
  for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const xx=x+dx, zz=z+dz, key=xx+','+zz, cell=result.g[zz]?.[xx];
    if (cell !== undefined && !'#IW'.includes(cell) && !reachable.has(key)) {
      reachable.add(key); queue.push([xx,zz]);
    }
  }
}
for (const key of ['29,4','30,4','3,24','29,22','53,9']) assert(reachable.has(key), 'Reachable '+key);
const added = result.decor.slice(baseline.decor.length);
for (const prop of added) {
  if (prop.k==='light'||['hellVaultShell','hellLavaOutlet'].includes(prop.k)) continue;
  const cell=result.g[Math.floor(prop.z+.5)]?.[Math.floor(prop.x+.5)];
  assert(cell && !'#WI'.includes(cell), 'Decoration sits on an open tile instead of inside masonry: '+prop.k+' at '+prop.x+','+prop.z);
}
assert(added.filter(p=>p.k==='prologueVotive').length >= 7, 'Low votives guide the crypt approach');
assert(!added.some(p=>p.k==='candelabra' && p.x<15 && p.z<18), 'No tall approach candelabras');
for (const [z,s,h,r] of [[10.5,2.3,10,.8],[13,1.55,9,.7],[15,.9,8,1.1]])
  assert(added.some(p=>p.k==='light' && p.x===9.5 && p.z===z && p.s===s && p.h===h && p.r===r), 'Scoped crypt candle light balance at '+z);
assert.equal(gV[0].build().decor.length, result.decor.length, 'No accumulating decoration on reload');
v.grid=gV[0].build().g;
function step(dt) { mf=Math.max(0,mf-dt); F$(dt); }
step(6); assert(messages.at(-1).includes('CANDLES'), 'Opening hint');
const initial=messages.length; step(30); assert.equal(messages.length,initial,'Hint is shown once');
Be.inputLock=true; C.pz=29; step(30); assert.equal(messages.length,initial,'Cinematic suspends hints');
Be.inputLock=false; paused=true; step(30); assert.equal(messages.length,initial,'Pause suspends hints');
paused=false; step(1); assert(messages.at(-1).includes('DROP KICK'),'Stair descent teaches dropkick');
C.px=17; C.pz=45; step(12); assert(messages.at(-1).includes('STONE BRIDGE'),'First bank directs to bridge');
v.enemies.push({dead:false,stagger:3,x:C.px+1,z:C.pz});
step(12); assert(messages.at(-1).includes('PRESS E'),'Nearby stagger teaches finisher');
v.enemies=[]; T.level=1; const before=messages.length;
step(30); assert.equal(messages.length,before,'Other chapters do not show prologue hints');
T.level=0; T.dead=true; step(30); assert.equal(messages.length,before,'Death suspends hints');
T.dead=false; v.grid=gV[0].build().g; C.px=19; C.pz=9; step(6);
assert.equal(messages.length,before+1,'Reload resets hint state');
assert(messages.at(-1).includes('CANDLES'),'Reload opening hint');
// The exit chamber shares the churchyard's north/south coordinates. Location
// hints must also consider its separate east/west position after a saved load.
for (const hasShotgun of [false, true]) {
  v.grid=gV[0].build().g; T.weapons[1]=hasShotgun;
  C.px=107; C.pz=19; mf=0; step(6);
  assert(messages.at(-1).includes('LADDER'), 'Exit chamber directs to ladder, regardless of optional shotgun');
}
assert(doorTicks>0,'Original door update still runs');
console.log('PASS: prologue terrain, topology, encounters, reachable pickups, low candles, contextual hints, pause/death/reload.');
`,
  context,
);

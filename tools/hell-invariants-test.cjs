// Compare current world extension with a frozen pre-hell extension. No browser.
// node tools/hell-invariants-test.cjs before.html before-prologue.js report.json
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const [htmlFile,beforeFile,reportFile]=process.argv.slice(2);
assert(htmlFile&&beforeFile&&reportFile,'Pass baseline HTML, baseline prologue source and report path');
const html=fs.readFileSync(htmlFile,'utf8'),start=html.indexOf('const iA=.42,'),end=html.indexOf('Z6=1.4,',start);
assert(start>=0&&end>start,'Original map builder exists');
const builder=html.slice(start,end).replace(/,\s*$/,';');
function build(extension){
  const context=vm.createContext({atob:s=>Buffer.from(s,'base64').toString('binary')});
  return JSON.parse(vm.runInContext(builder+`
    const gV=[{build:nP}],di={votive:{build(){},mode:'free'}},Ft={};
    const T={level:0},C={},v={},Be={},oo={};const P=2;
    function Z(v){return v;}function Ew(v){return v;}
    function e0(draw,w=64,h=64){draw({createImageData:(a,b)=>({data:new Uint8ClampedArray(a*b*4)}),putImageData(){},drawImage(){},fillRect(){}},w,h);return {image:{}};}
    function iR(name){return {name};}function FJ(){}function F$(){}
    ${extension}
    JSON.stringify(gV[0].build());`,context));
}
const before=build(fs.readFileSync(beforeFile,'utf8'));
const after=build(fs.readFileSync(path.resolve(__dirname,'../src/prologue.js'),'utf8'));
const exactKeys=Object.keys(before).filter(k=>!['decor','cmap','zones'].includes(k));
for(const key of exactKeys)assert.deepEqual(after[key],before[key],'Preserve existing prologue '+key);
assert.deepEqual(after.zones.map,before.zones.map,'Zone boundaries preserved');
before.zones.themes.forEach((t,i)=>{if(t.id!=='hell')assert.deepEqual(after.zones.themes[i],t,'Other themes preserved');});
let roofChanges=0;
for(let z=0;z<after.H;z++)for(let x=0;x<after.W;x++){
  const lift=z>=18&&before.zones.map[z][x]===2&&!'#WI'.includes(before.g[z][x]);
  assert.equal(after.cmap[z][x],lift?Math.max(before.cmap[z][x],14.8):before.cmap[z][x]);
  if(after.cmap[z][x]!==before.cmap[z][x])roofChanges++;
}
const counts={};for(const cell of after.g.flat())counts[cell]=(counts[cell]||0)+1;
const report={passed:true,exactKeys,gridExact:true,floorExact:true,zoneMapExact:true,otherThemesExact:true,roofChanges,gridCounts:counts,beforeDecor:before.decor.length,afterDecor:after.decor.length};
fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));

// Verify the hell causeway/arch pass against immutable release sources.
// node tools/hell-causeway-tests.cjs baseline.html baseline-prologue.js current-prologue.js report.json
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const [htmlFile,beforeFile,afterFile,out]=process.argv.slice(2).map(p=>path.resolve(p));
assert(htmlFile&&beforeFile&&afterFile&&out,'Four paths required');
const input=[htmlFile,beforeFile,afterFile],hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function canonical(p){let q=p,tail=[];while(!fs.existsSync(q)){tail.unshift(path.basename(q));const parent=path.dirname(q);assert.notEqual(parent,q);q=parent;}return path.join(fs.realpathSync(q),...tail).toLowerCase();}
assert(!input.some(p=>canonical(p)===canonical(out)),'Report must not replace source or an alias');
const hashes=input.map(p=>hash(fs.readFileSync(p))),html=fs.readFileSync(htmlFile,'utf8');
const start=html.indexOf('const iA=.42,'),end=html.indexOf('Z6=1.4,',start);assert(start>0&&end>start);
const builder=html.slice(start,end).replace(/,\s*$/,';');
const keys=['hellCauseway','hellCascadeRock','hellGreatArch','hellNaveRib','hellVaultShell','hellSideAisle','hellVaultBay'];
function inspect(file){return JSON.parse(vm.runInNewContext(builder+`
 const gV=[{build:nP}],di={votive:{build(){},mode:'free'}},Ft={};
 const T={level:0},C={},v={},Be={},oo={};const P=2;
 function Z(x){return x;}function Ew(x){return x;}function ie(){return 0;}
 function e0(draw,w=64,h=64){draw({createImageData:(a,b)=>({data:new Uint8ClampedArray(a*b*4)}),putImageData(){},drawImage(){},fillRect(){}},w,h);return {image:{}};}
 function iR(name){return {name};}function FJ(){}function F$(){}function E(...v){return v;}
 ${fs.readFileSync(file,'utf8')}
 const map=gV[0].build(),records=[];
 for(const spec of map.decor)if(${JSON.stringify(keys)}.includes(spec.k)){
  const calls=[];di[spec.k].build((...v)=>calls.push(['box',...v]),(...v)=>calls.push(['cylinder',...v]),spec);
  records.push({spec,mode:di[spec.k].mode,mass:di[spec.k].mass||null,calls});
 }
 JSON.stringify({map,records});`,{atob:s=>Buffer.from(s,'base64').toString('binary')}));}
const before=inspect(beforeFile),after=inspect(afterFile);
assert.deepEqual(after.map,before.map,'Entire gameplay/decor/zone/light/height descriptor unchanged');
assert.deepEqual(after.records.map(r=>[r.spec,r.mode,r.mass]),before.records.map(r=>[r.spec,r.mode,r.mass]),'Decor placements/collision classes unchanged');
const counts={};for(const r of after.records){for(const c of r.calls){assert(c.slice(2,5).every(n=>Number.isFinite(n)&&n>0),'Finite positive primitive');assert(c[5].every(Number.isFinite),'Finite transform');}counts[r.spec.k]??={instances:0,before:0,after:0};counts[r.spec.k].instances++;counts[r.spec.k].after+=r.calls.length;}
for(const r of before.records)counts[r.spec.k].before+=r.calls.length;
let minClearance=Infinity;for(let i=0;i<=1000;i++){const t=i/1000,old=.6*t+.4*Math.sin(t*Math.PI/2),next=Math.sqrt(t*(4-t)/3);assert(next>=old-1e-12,'Arch bows outward/upward rather than reducing opening');minClearance=Math.min(minClearance,next-old);}
assert.deepEqual(input.map(p=>hash(fs.readFileSync(p))),hashes,'Inputs preserved');
const report={passed:true,input,hashes,entireMapExact:true,collisionClassesExact:true,curveSamples:1001,minNormalizedRiseGain:minClearance,counts};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

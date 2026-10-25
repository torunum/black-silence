const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
// node tools/hell-lancet-tests.cjs baseline.html before-prologue.js after-prologue.js report.json
const args=process.argv.slice(2);assert.equal(args.length,4,'Three immutable inputs and one report required');
const inputs=args.slice(0,3).map(p=>path.resolve(p)),reportFile=path.resolve(args[3]);
function real(p){let q=p,tail=[];while(!fs.existsSync(q)){tail.unshift(path.basename(q));const parent=path.dirname(q);assert.notEqual(parent,q);q=parent;}return path.join(fs.realpathSync(q),...tail).toLowerCase();}
assert(!inputs.some(p=>p.toLowerCase()===reportFile.toLowerCase()||real(p)===real(reportFile)),'Report must not overwrite an input');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),inputHashes=inputs.map(p=>hash(fs.readFileSync(p))),html=fs.readFileSync(inputs[0],'utf8');
const start=html.indexOf('const iA=.42,'),end=html.indexOf('Z6=1.4,',start);assert(start>0&&end>start);const builder=html.slice(start,end).replace(/,\s*$/,';');
const before=fs.readFileSync(inputs[1],'utf8'),after=fs.readFileSync(inputs[2],'utf8');
const bound=s=>[s.indexOf('  di.hellLancetShrine = {'),s.indexOf('  di.hellLavaPier = {')];
const [a,b]=bound(before),[c,d]=bound(after);assert.equal(before.slice(0,a),after.slice(0,c));assert.equal(before.slice(b),after.slice(d),'No other source logic changes');
function inspect(source){return JSON.parse(vm.runInNewContext(builder+`
const gV=[{build:nP}],di={votive:{build(){},mode:'free'}},Ft={};
const T={level:0},C={},v={},Be={},oo={};const P=2;
function Z(v){return v;}function Ew(v){return v;}
function e0(draw,w=64,h=64){draw({createImageData:(a,b)=>({data:new Uint8ClampedArray(a*b*4)}),putImageData(){},drawImage(){},fillRect(){}},w,h);return{image:{}};}
function iR(name){return{name};}function FJ(){}function F$(){}function E(...v){return v;}
${source}
const map=gV[0].build(),calls=[];di.hellLancetShrine.build((...v)=>calls.push(v));
JSON.stringify({map,calls,mode:di.hellLancetShrine.mode,cls:di.hellLancetShrine.cls});`,{atob:s=>Buffer.from(s,'base64').toString('binary')}));}
const old=inspect(before),next=inspect(after);assert.deepEqual(next.map,old.map,'Entire map including all lights, collisions, routes, actors, pickups unchanged');
assert.equal(next.mode,old.mode);assert.equal(next.cls,old.cls);
const shrines=next.map.decor.filter(p=>p.k==='hellLancetShrine');assert.equal(shrines.length,3);
assert.equal(next.calls.length-old.calls.length,24);
const materials=calls=>[...new Set(calls.map(c=>c[0]))].sort();assert.deepEqual(materials(next.calls),materials(old.calls));
for(const name of ['hellGlass','dark','hellBronze','hellBasalt'])assert.deepEqual(next.calls.filter(c=>c[0]===name),old.calls.filter(c=>c[0]===name),'Untouched material geometry '+name);
for(const call of next.calls)assert(call.slice(1,4).every(n=>Number.isFinite(n)&&n>0)&&call[4].every(Number.isFinite),'Finite positive geometry');
const report={passed:true,beforeSourceSHA256:hash(before),sourceSHA256:hash(after),entireMapExact:true,sourceOutsideShrineExact:true,shrines,primitivesBefore:old.calls.length,primitivesAfter:next.calls.length,addedPerShrine:24,addedTotal:72,addedTrianglesTotal:864,materialSetExact:true,glassSurfacesExact:true,shadowBacksExact:true,noNewLightOrResource:true};
for(let i=0;i<inputs.length;i++)assert.equal(hash(fs.readFileSync(inputs[i])),inputHashes[i],'Input preserved');report.inputs=inputs.map((file,i)=>({file,sha256:inputHashes[i]}));fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));

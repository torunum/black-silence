const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
// node tools/hell-arch-tests.cjs baseline.html before-prologue.js after-prologue.js report.json
const args=process.argv.slice(2);assert.equal(args.length,4,'Three immutable inputs and one report required');
const inputs=args.slice(0,3).map(p=>path.resolve(p)),reportFile=path.resolve(args[3]);
function real(p){let q=p,tail=[];while(!fs.existsSync(q)){tail.unshift(path.basename(q));const parent=path.dirname(q);assert.notEqual(parent,q);q=parent;}return path.join(fs.realpathSync(q),...tail).toLowerCase();}
assert(!inputs.some(p=>p.toLowerCase()===reportFile.toLowerCase()||real(p)===real(reportFile)),'Report must not overwrite an input');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),inputHashes=inputs.map(p=>hash(fs.readFileSync(p))),html=fs.readFileSync(inputs[0],'utf8');
const start=html.indexOf('const iA=.42,'),end=html.indexOf('Z6=1.4,',start);assert(start>0&&end>start);const builder=html.slice(start,end).replace(/,\s*$/,';');
const before=fs.readFileSync(inputs[1],'utf8'),after=fs.readFileSync(inputs[2],'utf8');
const bound=s=>[s.indexOf('  di.hellGreatArch = {'),s.indexOf('  di.hellNaveRib = {')];const[a,b]=bound(before),[c,d]=bound(after);assert.equal(before.slice(0,a),after.slice(0,c));assert.equal(before.slice(b),after.slice(d));
function inspect(source){return JSON.parse(vm.runInNewContext(builder+`
const gV=[{build:nP}],di={votive:{build(){},mode:'free'}},Ft={};const T={level:0},C={},v={},Be={},oo={};const P=2;
function Z(v){return v;}function Ew(v){return v;}function e0(draw,w=64,h=64){draw({createImageData:(a,b)=>({data:new Uint8ClampedArray(a*b*4)}),putImageData(){},drawImage(){},fillRect(){}},w,h);return{image:{}};}
function iR(name){return{name};}function FJ(){}function F$(){}function E(...v){return v;}
${source}
const map=gV[0].build(),arches=map.decor.filter(p=>p.k==='hellGreatArch').map(spec=>{const calls=[];di.hellGreatArch.build((...v)=>calls.push(['box',...v]),(...v)=>calls.push(['cyl',...v]),spec);return{spec,calls};});JSON.stringify({map,arches});`,{atob:s=>Buffer.from(s,'base64').toString('binary')}));}
const old=inspect(before),next=inspect(after);assert.deepEqual(next.map,old.map,'Entire map descriptors including collisions/lights/entities/items unchanged');assert.equal(next.arches.length,4);
let totalDelta=0;const material=calls=>[...new Set(calls.map(c=>c[1]))].sort();const counts=[];
for(let i=0;i<next.arches.length;i++){const o=old.arches[i],n=next.arches[i];assert.deepEqual(n.spec,o.spec);assert.deepEqual(material(n.calls),material(o.calls));for(const call of n.calls){assert(call.slice(2,5).every(x=>Number.isFinite(x)&&x>0));assert(call[5].every(Number.isFinite));}assert.deepEqual(n.calls.filter(c=>c[1]==='hellGlass'),o.calls.filter(c=>c[1]==='hellGlass'));const delta=n.calls.length-o.calls.length;totalDelta+=delta;counts.push({spec:n.spec,before:o.calls.length,after:n.calls.length,delta});}
const report={passed:true,beforeHTMLSHA256:hash(html),beforeSourceSHA256:hash(before),sourceSHA256:hash(after),immutableInputHashes:inputHashes,entireMapExact:true,sourceOutsideGreatArchExact:true,materialSetExact:true,existingGlassExact:true,noNewLightOrResource:true,arches:counts,totalPrimitiveDelta:totalDelta};assert.deepEqual(inputs.map(p=>hash(fs.readFileSync(p))),inputHashes,'Inputs preserved');fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

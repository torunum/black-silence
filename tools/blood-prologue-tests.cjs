// Prologue Blood-inspired pass: immutable source/map scope and primitive audit.
// node tools/blood-prologue-tests.cjs baseline.html baseline-prologue.js candidate-prologue.js report.json
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const args=process.argv.slice(2);assert.equal(args.length,4);const inputs=args.slice(0,3).map(p=>path.resolve(p)),out=path.resolve(args[3]);
function real(p){let q=p,tail=[];while(!fs.existsSync(q)){tail.unshift(path.basename(q));const parent=path.dirname(q);assert.notEqual(parent,q);q=parent;}return path.join(fs.realpathSync(q),...tail).toLowerCase();}
assert(!inputs.some(p=>real(p)===real(out)),'Report may not overwrite an input or alias');const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),hashes=inputs.map(p=>hash(fs.readFileSync(p))),html=fs.readFileSync(inputs[0],'utf8');
const a=html.indexOf('const iA=.42,'),b=html.indexOf('Z6=1.4,',a);assert(a>0&&b>a);const builder=html.slice(a,b).replace(/,\s*$/,';');
const keys=['prologueCryptRib','prologueRitualFloor','prologueCryptBay','prologueBrokenGrave'];
function inspect(source){return JSON.parse(vm.runInNewContext(builder+`
const gV=[{build:nP}],di={votive:{build(){},mode:'free'}},Ft={};const T={level:0},C={},v={},Be={},oo={};const P=2;
function Z(v){return v;}function Ew(v){return v;}function e0(draw,w=64,h=64){draw({createImageData:(a,b)=>({data:new Uint8ClampedArray(a*b*4)}),putImageData(){},drawImage(){},fillRect(){}},w,h);return{image:{}};}
function iR(name){return{name};}function FJ(){}function F$(){}function E(...v){return v;}
${source}
const map=gV[0].build(),records=[];for(const spec of map.decor)if(${JSON.stringify(keys)}.includes(spec.k)){const calls=[];di[spec.k].build((...v)=>calls.push(['box',...v]),(...v)=>calls.push(['cylinder',...v]),spec);records.push({spec,mode:di[spec.k].mode,mass:di[spec.k].mass||null,calls});}
const later=[];for(const[k,spec]of[['prologueBrokenGrave',{x:75,z:68.5,s:.8,r:.42}],['prologueCryptBay',{x:80,z:77,r:Math.PI/2}]]){const calls=[];di[k].build((...v)=>calls.push(['box',...v]),(...v)=>calls.push(['cylinder',...v]),spec);later.push({k,spec,calls});}JSON.stringify({map,records,later});`,{atob:s=>Buffer.from(s,'base64').toString('binary')}));}
const before=inspect(fs.readFileSync(inputs[1],'utf8')),after=inspect(fs.readFileSync(inputs[2],'utf8'));
const clean=JSON.parse(JSON.stringify(after.map)),added=clean.decor.filter(p=>['prologueCryptRib','prologueRitualFloor'].includes(p.k));assert.deepEqual(added,[{k:'prologueCryptRib',x:9.5,z:12},{k:'prologueCryptRib',x:9.5,z:14},{k:'prologueCryptRib',x:9.5,z:16},{k:'prologueRitualFloor',x:35,z:52}]);
clean.decor=clean.decor.filter(p=>!['prologueCryptRib','prologueRitualFloor'].includes(p.k));const coffins=clean.decor.filter(p=>p.coffinOpened===1);assert.equal(coffins.length,2);assert.deepEqual(coffins.map(p=>[p.k,p.x,p.z]),[['prologueBrokenGrave',7.65,5.25],['prologueBrokenGrave',11.55,6.1]]);coffins.forEach(p=>delete p.coffinOpened);
const boneKinds=['bones','bonestack','skullpile','ribs','skullpole'];
const boneFlags=clean.decor.filter(p=>p.burialBone===1);assert.deepEqual(boneFlags.map(p=>[p.k,p.x,p.z]),before.map.decor.filter(p=>boneKinds.includes(p.k)).map(p=>[p.k,p.x,p.z]),'Only existing prologue bone props receive material flag');boneFlags.forEach(p=>delete p.burialBone);
const crypt=clean.zones.themes.find(t=>t.id==='crypt');assert.equal(crypt.ground,'prologueCryptFloor');delete crypt.ground;
assert.deepEqual(clean,before.map,'Every map descriptor exact apart from four static props, two coffin flags, existing bone material flags and crypt ground');assert.deepEqual(after.later,before.later,'Reused later-chapter builders retain exact geometry');
const counts={};for(const r of after.records){assert(!r.mass,'No new collision mass');for(const c of r.calls){assert(c.slice(2,5).every(x=>Number.isFinite(x)&&x>0),'Finite positive primitive');assert(c[5].every(Number.isFinite),'Finite transform');}counts[r.spec.k]??={instances:0,primitives:0};counts[r.spec.k].instances++;counts[r.spec.k].primitives+=r.calls.length;}
assert.deepEqual(inputs.map(p=>hash(fs.readFileSync(p))),hashes,'Immutable inputs preserved');const report={passed:true,inputs,hashes,wholeMapExactExcept:['four static decor placements','two prologue coffin flags','existing prologue bone material flags','crypt ground material'],existingLightsExact:true,gameplayGridHeightEncountersItemsExact:true,laterChapterReusedBuildersExact:true,counts,records:after.records};fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,hashes,counts}));

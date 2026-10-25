const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
// node tools/crypt-lighting-tests.cjs baseline.html before-prologue.js after-prologue.js report.json
const args=process.argv.slice(2);assert.equal(args.length,4,'Three immutable inputs and one report path required');
const inputs=args.slice(0,3).map(p=>path.resolve(p)),reportFile=path.resolve(args[3]);
function resolved(p){let q=p,tail=[];while(!fs.existsSync(q)){tail.unshift(path.basename(q));const parent=path.dirname(q);assert.notEqual(parent,q);q=parent;}return path.join(fs.realpathSync(q),...tail).toLowerCase();}
assert(!inputs.some(p=>p.toLowerCase()===reportFile.toLowerCase()||resolved(p)===resolved(reportFile)),'Report must not overwrite an input');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),inputHashes=inputs.map(p=>hash(fs.readFileSync(p)));
const html=fs.readFileSync(inputs[0],'utf8');
const start=html.indexOf('const iA=.42,'),end=html.indexOf('Z6=1.4,',start);assert(start>=0&&end>start);
const builder=html.slice(start,end).replace(/,\s*$/,';');
function inspect(file){const source=fs.readFileSync(file,'utf8');const ctx=vm.createContext({atob:s=>Buffer.from(s,'base64').toString('binary')});
const result=vm.runInContext(builder+`
const gV=[{build:nP}],di={votive:{build(){},mode:'free'}},Ft={};
const T={level:0},C={},v={},Be={},oo={};const P=2;
function Z(v){return v;}function Ew(v){return v;}
function e0(draw,w=64,h=64){let pixels;draw({createImageData:(a,b)=>({data:new Uint8ClampedArray(a*b*4)}),putImageData(v){pixels=v.data;},drawImage(){},fillRect(){}},w,h);return{image:{width:w,height:h,pixels}};}
function iR(name){return{name};}function FJ(){}function F$(){}function E(...v){return v;}
class Wt{constructor(options){Object.assign(this,options);}} const $e=Wt;
${source}
const map=gV[0].build(),calls=[];
di.prologueReliquary.build((...a)=>calls.push(a));
const nativeMaterials=['bone','oldbone','rock','cloth','prologueAmber'].map(name=>iR(name));
const names=['prologueWineGlass','prologueSmokeGlass','prologueOldGold'];
const glass=names.map(name=>{const material=iR(name);return{name,color:material.color,toneMapped:material.toneMapped};});
let texture=null;const maps=names.map(name=>iR(name).map);if(maps[0]){
 const a=maps[0];texture={width:a.image.width,height:a.image.height,shared:maps.every(b=>a===b),opaque:a.image.pixels.every((x,i)=>i%4!==3||x===255),name:a.name};
 gV[0].build();texture.reset=iR(names[0]).map!==a;
}
JSON.stringify({map,calls,nativeMaterials,glass,texture});`,ctx);
return{...JSON.parse(result),sourceSHA256:crypto.createHash('sha256').update(source).digest('hex')};}
const before=inspect(inputs[1]),after=inspect(inputs[2]);
const changes=[];
assert.equal(after.map.decor.length,before.map.decor.length);
for(let i=0;i<before.map.decor.length;i++){
 const a=before.map.decor[i],b=after.map.decor[i];if(JSON.stringify(a)===JSON.stringify(b))continue;
 assert.equal(a.k,'light');assert.equal(a.x,9.5);assert([10.5,13,15].includes(a.z));
 assert.equal(after.map.zones.themes[after.map.zones.map[Math.floor(a.z)][Math.floor(a.x)]].id,'crypt');
 const normalized={...b,s:a.s,h:a.h};assert.deepEqual(normalized,a,'Only intensity/range differ');
 assert(b.s<a.s&&b.h<=a.h);changes.push({before:a,after:b});after.map.decor[i]=normalized;
}
assert.equal(changes.length,3);assert.deepEqual(after.map,before.map,'All other map fields, lights, enemies, pickups, collision and themes unchanged');
assert.deepEqual(after.nativeMaterials,before.nativeMaterials,'Global bone/oldbone/rock/cloth material routing unchanged');
assert.deepEqual(after.calls,before.calls,'All chapel geometry, transforms and material IDs unchanged');
assert.deepEqual(after.glass,before.glass,'Original glass color and tone mapping retained');
assert.deepEqual(before.texture,after.texture);assert(after.texture.shared&&after.texture.reset&&after.texture.opaque);assert.equal(after.texture.width,32);assert.equal(after.texture.height,64);
assert.equal(after.map.decor.filter(x=>x.k==='prologueReliquary').length,1);
const report={passed:true,beforeSHA256:before.sourceSHA256,afterSHA256:after.sourceSHA256,entireMapExactExceptThreeCryptLightIntensityRange:true,changedLights:changes,geometryTransformsExact:true,globalMaterialRoutesExact:true,glassColorsExact:true,chapelWindows:1,glassMaterialGroups:3,texture:after.texture};
for(let i=0;i<inputs.length;i++)assert.equal(hash(fs.readFileSync(inputs[i])),inputHashes[i],'Immutable input preserved');report.inputs=inputs.map((file,i)=>({file,sha256:inputHashes[i]}));fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));

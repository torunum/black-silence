const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
// node tools/chapel-architecture-tests.cjs baseline.html before-prologue.js after-prologue.js report.json
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
// The final release also balances three existing crypt lights. Normalize only
// those explicitly reviewed pairs before checking the rest of the whole map.
const lightPairs=[[10.5,4.2,12,2.3,10],[13,2.4,10,1.55,9],[15,1.2,8,.9,8]],lightChanges=[];
for(let i=0;i<before.map.decor.length;i++){
 const a=before.map.decor[i],b=after.map.decor[i];if(JSON.stringify(a)===JSON.stringify(b))continue;
 const pair=lightPairs.find(p=>a.k==='light'&&a.x===9.5&&a.z===p[0]);assert(pair,'Unexpected map decor change');
 assert.equal(a.s,pair[1]);assert.equal(a.h,pair[2]);assert.equal(b.s,pair[3]);assert.equal(b.h,pair[4]);
 const normalized={...b,s:a.s,h:a.h};assert.deepEqual(normalized,a,'Only crypt intensity/range may differ');
 lightChanges.push({before:a,after:b});after.map.decor[i]=normalized;
}
assert(lightChanges.length===0||lightChanges.length===3,'All three approved lights or none');
assert.deepEqual(after.map,before.map,'Entire map identical after the explicitly approved crypt-light values');
assert.deepEqual(after.nativeMaterials,before.nativeMaterials,'Global bone/oldbone/rock/cloth material routing unchanged');
const column=c=>c[0]==='prologuePatinatedStone'&&c[2]===2.62;
const original=before.calls.filter(c=>!column(c));let cursor=0;
for(const call of after.calls)if(JSON.stringify(call)===JSON.stringify(original[cursor]))cursor++;
assert.equal(cursor,original.length,'Every original non-pier element remains in order and byte-identical');
const oldColumns=before.calls.filter(column),newColumns=after.calls.filter(column);
assert.equal(oldColumns.length,2);assert.equal(newColumns.length,2);
for(let i=0;i<2;i++){assert.deepEqual(newColumns[i].slice(4),oldColumns[i].slice(4),'Existing pier transforms retained');assert.equal(newColumns[i][1],.44);assert.equal(newColumns[i][3],.40);}
assert.equal(after.calls.length-before.calls.length,17,'Bounded static arch addition');
assert.deepEqual([...new Set(after.calls.map(c=>c[0]))].sort(),[...new Set(before.calls.map(c=>c[0]))].sort(),'No new material batches');
const glass=c=>c[0].includes('Glass')||c[0]==='prologueOldGold'||c[0]==='wrought';
assert.deepEqual(after.calls.filter(glass),before.calls.filter(glass),'Window shards/leadwork geometry exact');
assert.deepEqual(after.glass,before.glass,'Original glass color and tone mapping retained');
assert.deepEqual(before.texture,after.texture);assert(after.texture.shared&&after.texture.reset&&after.texture.opaque);assert.equal(after.texture.width,32);assert.equal(after.texture.height,64);
assert.equal(after.map.decor.filter(x=>x.k==='prologueReliquary').length,1);
const report={passed:true,beforeSHA256:before.sourceSHA256,afterSHA256:after.sourceSHA256,entireMapExact:lightChanges.length===0,entireMapExactExceptApprovedCryptLights:true,lightChanges,unchangedOriginalElementsExceptTwoPierDimensions:true,addedStaticPrimitives:17,newMaterialBatches:0,windowGeometryExact:true,globalMaterialRoutesExact:true,glassColorsExact:true,chapelWindows:1,glassMaterialGroups:3,texture:after.texture};
for(let i=0;i<inputs.length;i++)assert.equal(hash(fs.readFileSync(inputs[i])),inputHashes[i],'Immutable input preserved');report.inputs=inputs.map((file,i)=>({file,sha256:inputHashes[i]}));fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));

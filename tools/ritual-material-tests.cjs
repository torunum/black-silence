const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
// node tools/ritual-material-tests.cjs baseline.html before-prologue.js after-prologue.js report.json
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
class Wt{constructor(options){Object.assign(this,options);}}
${source}
const map=gV[0].build(),calls=[];
for(const h of [-1,1]){const pieces=[];di.prologueRitualSpine.build((...a)=>pieces.push(a),()=>{throw Error('Unexpected added cylinder')},{h});calls.push(pieces);}
const nativeMaterials=['bone','oldbone','rock','cloth'].map(name=>iR(name));
let texture=null;if(typeof iR('prologueRitualIvory').map!=='undefined'){
 const a=iR('prologueRitualIvory').map,b=iR('prologueRitualIvory').map;
 texture={width:a.image.width,height:a.image.height,shared:a===b,opaque:a.image.pixels.every((x,i)=>i%4!==3||x===255)};
 gV[0].build();texture.reset=iR('prologueRitualIvory').map!==a;
}
JSON.stringify({map,calls,nativeMaterials,texture});`,ctx);
return{...JSON.parse(result),sourceSHA256:crypto.createHash('sha256').update(source).digest('hex')};}
const before=inspect(inputs[1]),after=inspect(inputs[2]);
assert.deepEqual(after.map,before.map,'Entire authored map, lighting, decor, entities, height, collision and theme data unchanged');
assert.deepEqual(after.nativeMaterials,before.nativeMaterials,'Global bone/oldbone/rock/cloth material routing unchanged');
let altered=0;for(let i=0;i<before.calls.length;i++)for(let j=0;j<before.calls[i].length;j++){
 const a=before.calls[i][j],b=after.calls[i][j];assert.deepEqual(a.slice(1),b.slice(1),'Exact geometry and transforms');
 const expected=['bone','oldbone'].includes(a[0])?'prologueRitualIvory':j===0?'hellBasalt':a[0];assert.equal(b[0],expected,'Only authorized surfaces change');if(a[0]!==b[0])altered++;
}
assert(after.texture.shared&&after.texture.reset&&after.texture.opaque);assert.equal(after.texture.width,32);assert.equal(after.texture.height,64);
assert.equal(after.map.decor.filter(x=>x.k==='prologueRitualSpine').length,2);
const report={passed:true,beforeSHA256:before.sourceSHA256,afterSHA256:after.sourceSHA256,entireMapExact:true,geometryTransformsExact:true,globalMaterialRoutesExact:true,ritualStandards:2,alteredMaterialCalls:altered,texture:after.texture};
for(let i=0;i<inputs.length;i++)assert.equal(hash(fs.readFileSync(inputs[i])),inputHashes[i],'Immutable input preserved');report.inputs=inputs.map((file,i)=>({file,sha256:inputHashes[i]}));fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));

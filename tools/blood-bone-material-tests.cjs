// Compare actual native bone builders across isolated baseline/candidate pages.
// node tools/blood-bone-material-tests.cjs baseline.html candidate.html output-directory
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const [before,after,out]=process.argv.slice(2).map(p=>path.resolve(p));assert(before&&after&&out);
for(const input of [before,after])assert(!input.toLowerCase().startsWith(out.toLowerCase()+path.sep));fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),anchor='Jk();ju();Yy();X$(J$);D0t();';
const seam=`window.__boneProbe=()=>{const result={};for(const kind of ['bones','bonestack','skullpile','ribs','skullpole']){
 const draw=marked=>{const calls=[],collect=(primitive)=>(material,...shape)=>calls.push({primitive,material,shape:shape.map(v=>v?.isMatrix4?v.elements:v)});di[kind].build(collect('box'),collect('cylinder'),{x:9,z:14,s:.8,r:.4,...(marked?{burialBone:1}:{})});return calls;};
 result[kind]={mode:di[kind].mode,mass:di[kind].mass||null,unmarked:draw(false),marked:draw(true)};
}return result;};`;
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const reports=[],errors=[];for(const [label,input] of [['before',before],['after',after]]){const source=fs.readFileSync(input,'utf8');assert.equal(source.split(anchor).length,2);const fixture=path.join(out,label+'.html');fs.writeFileSync(fixture,source.replace(anchor,()=>seam+anchor));const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(fixture).href+'?qa=1');reports.push({input,sha256:hash(source),builders:await page.evaluate(()=>window.__boneProbe())});await page.close();}
 let remapped=0;for(const kind of Object.keys(reports[0].builders)){const a=reports[0].builders[kind],b=reports[1].builders[kind];assert.deepEqual(b.unmarked,a.unmarked,kind+' unmarked native builder exact');assert.deepEqual([b.mode,b.mass],[a.mode,a.mass]);const expected=a.unmarked.map(call=>{if(['bone','oldbone'].includes(call.material)){remapped++;return{...call,material:'prologueOssuaryBone'};}return call;});assert.deepEqual(b.marked,expected,kind+' geometry exact with only allowed bone material remap');}
 assert.equal(errors.length,0);const report={passed:true,inputs:reports.map(r=>({input:r.input,sha256:r.sha256})),unmarkedBuildersExact:true,markedGeometryExact:true,materialRemappedPrimitives:remapped,errors};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

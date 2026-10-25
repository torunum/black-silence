// Compare execution-glove material changes while proving geometry and other pixels stay exact.
// node tools/finisher-material-tests.cjs before.html after.html output-directory
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {pathToFileURL}=require('url'),{chromium}=require('playwright');
assert(process.argv[2]&&process.argv[3]&&process.argv[4],'Two immutable inputs and an output directory are required');
const files=process.argv.slice(2,4).map(p=>path.resolve(p)),out=path.resolve(process.argv[4]);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function resolvedTarget(target){let cursor=target,tail=[];while(!fs.existsSync(cursor)){tail.unshift(path.basename(cursor));const parent=path.dirname(cursor);assert.notEqual(parent,cursor);cursor=parent;}return path.join(fs.realpathSync(cursor),...tail).toLowerCase();}
const resolvedOut=resolvedTarget(out);
const outputs=['fixture-0.html','fixture-1.html','report.json'].map(name=>resolvedTarget(path.join(out,name)));
for(const file of files){const resolved=resolvedTarget(file);assert(resolved!==resolvedOut&&!resolved.startsWith(resolvedOut+path.sep)&&!outputs.includes(resolved),'Output must not overwrite an input');}
const inputs=files.map(file=>({file,source:fs.readFileSync(file,'utf8')}));
const seam='  const nativePaintedRaster=h0t;';
for(const input of inputs)assert.equal(input.source.split(seam).length,2,'Unique render seam required');
// Verify exception safety using the exact installed wrapper, independently of pixels.
const source=inputs[1].source,start=source.indexOf('  const finishDraw=A0t.draw;'),end=source.indexOf('  // Finisher wrists',start);
assert(start>0&&end>start&&source.split('  const finishDraw=A0t.draw;').length===2,'Unique glove material wrapper required');
const recorded=[],face=function(...args){recorded.push(args);return this.tag;},mesh={tag:'mesh',face};
const A0t={draw(m,p){assert.equal(m.face([],[],7,'part'),m.tag);assert.equal(m.face([],[],3,'part'),m.tag);if(p.fail)throw Error('deliberate');return 42;}};
new Function('A0t','O','HAND_LEATHER',source.slice(start,end))(A0t,{GLOVE:7},28);
assert.equal(A0t.draw(mesh,{}),42);assert.equal(mesh.face,face);assert.deepEqual(recorded.map(r=>r[2]),[28,3]);
assert.throws(()=>A0t.draw(mesh,{fail:true}),/deliberate/);assert.equal(mesh.face,face);
fs.mkdirSync(out,{recursive:true});
for(const [i,input]of inputs.entries()){
  input.sha256=hash(input.source);input.fixture=path.join(out,`fixture-${i}.html`);
  const probe="window.__materialProbe=(kind,time)=>{Te.lastKey='';h0t(-1,{...window.__BLACK_SILENCE_QA.pose(),recoil:0,action:0,reload:-1,kick:-1,exec:time,execKind:kind},90);return{r:Te.raster,image:Te.image,glove:"+(i?'HAND_LEATHER':'O.GLOVE')+"};};";
  fs.writeFileSync(input.fixture,input.source.replace(seam,probe+seam));delete input.source;
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];try{
  for(const input of inputs){
    const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>requestAnimationFrame=()=>1);await page.goto(pathToFileURL(input.fixture).href+'?qa=1');
    await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.paintedGloves.ready());
    const records=await page.evaluate(async()=>{
      const digest=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),x=>x.toString(16).padStart(2,'0')).join(''),records=[];
      for(let kind=0;kind<3;kind++)for(const time of [.12,.25,.36,.55,.62,.85,.9]){
        const{r,image,glove}=__materialProbe(kind,time),rgba=new Uint8Array(image.data),mask=new Uint8Array(r.col.length),other=new Uint8Array(r.col);let pixels=0;
        for(let p=0;p<r.col.length;p++)if((r.col[p]>>>3)===glove){mask[p]=1;other[p]=0;rgba.fill(0,p*4,p*4+4);pixels++;}
        records.push({kind,time,pixels,mask:await digest(mask),outsideRGBA:await digest(rgba),outsidePalette:await digest(other),depth:await digest(r.z.buffer),part:await digest(r.part.buffer)});
      }return records;
    });results.push({input,records});await page.close();
  }
  assert.equal(errors.length,0);assert.deepEqual(results[0].records,results[1].records);
  assert(results[0].records.some(r=>r.pixels>0),'Glove comparison must contain visible pixels');
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,cases:21,scope:'Deterministic finisher poses: native depth/part, glove mask and every pixel outside glove material are exact. Normal/throw wrapper restoration also verified.',errors,results},null,2));
  console.log('21 material-only scopes and wrapper restoration PASS');
}finally{await browser.close();for(const input of inputs)assert.equal(hash(fs.readFileSync(input.file)),input.sha256,'Immutable input changed');}})().catch(e=>{console.error(e);process.exitCode=1});

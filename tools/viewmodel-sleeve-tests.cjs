// Inventory intended sleeve differences; assert finite triangles and unchanged boots/finishers.
// Usage: node tools/viewmodel-sleeve-tests.cjs baseline.html candidate.html out
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const inputs=process.argv.slice(2,4).map(p=>path.resolve(p));if(inputs.length!==2)throw Error('Two input HTML files required');
const out=path.resolve(process.argv[4]||'.dream-loop/renderer-parity');
function resolvedTarget(target){let cursor=target,tail=[];while(!fs.existsSync(cursor)){tail.unshift(path.basename(cursor));const parent=path.dirname(cursor);if(parent===cursor)throw Error('Cannot resolve output ancestry');cursor=parent;}return path.join(fs.realpathSync(cursor),...tail);}
function inside(file,directory){const relative=path.relative(directory.toLowerCase(),file.toLowerCase());return !relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));}
if(inputs.some(input=>inside(input,out)||inside(resolvedTarget(input),resolvedTarget(out))))throw Error('Input must be outside output tree');
const outputs=['fixture-0.html','fixture-1.html','report.json'].map(file=>path.join(out,file).toLowerCase());
if(inputs.some(input=>outputs.includes(input.toLowerCase())))throw Error('Output must not overwrite an input');
fs.mkdirSync(out,{recursive:true});
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const seam=`window.__rendererTestRender=(index,patch,force=true)=>{if(force)Te.lastKey='';h0t(index,{...window.__BLACK_SILENCE_QA.pose(),...patch},90);};
window.__sleeveFinite=()=>gloveTriangles.every(t=>t.v.every(p=>Object.values(p).every(Number.isFinite)));
window.__rendererTestCache=mode=>{if(typeof soulPrimitiveGeometry==='undefined')return null;const maps=[soulPrimitiveGeometry.ball,soulPrimitiveGeometry.cylinder];if(mode==='fallback'){for(const map of maps){map.clear();for(let i=0;i<256;i++)map.set('test-only-'+i,[]);}}if(mode==='clear')for(const map of maps)map.clear();return maps.map(map=>map.size);};
`;
const targets=inputs.map((input,i)=>{const html=fs.readFileSync(input,'utf8'),marker='  const nativePaintedRaster=h0t;';if(html.split(marker).length!==2)throw Error('Unexpected renderer seam');const fixture=path.join(out,'fixture-'+i+'.html'),instrumented=html.replace(marker,()=>seam+marker);fs.writeFileSync(fixture,instrumented);return{input,sha256:hash(html),fixture,fixtureSHA256:hash(instrumented)};});
const cases=[],patch={recoil:0,action:0,heat:0,spin:0,kick:-1,exec:-1};
for(let index=0;index<10;index++)for(const reload of [-1,.12,.26,.43,.55,.59,.74,.86,.99])cases.push({index,patch:{...patch,reload}});
for(const index of [0,7,1,8,2,0])cases.push({index,patch:{...patch,reload:-1}});
cases.push({...cases.at(-1),force:false});
for(const kick of [.11,.21,.5])for(const drop of [0,1])cases.push({index:-1,patch:{...patch,reload:-1,kick,drop}});
for(const execKind of [0,1,2])for(const exec of [.25,.55,.85])cases.push({index:-1,patch:{...patch,reload:-1,exec,execKind}});
for(let i=0;i<480;i++)cases.push({index:i%10,patch:{...patch,reload:(i%24)/24,recoil:(i%3)*.5,action:(i%5)/4,heat:(i%4)/3,spin:i*.137}});
for(const mode of ['fallback','clear'])cases.push({index:7,patch:{...patch,reload:.55},cacheMode:mode});
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];try{
 for(const target of targets){const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>1;});await page.goto(pathToFileURL(target.fixture).href+'?qa=1');await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.paintedGloves?.ready());
 const records=await page.evaluate(async cases=>{const q=window.__BLACK_SILENCE_QA,records=[],hash=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a)),v=>v.toString(16).padStart(2,'0')).join('');for(const item of cases){if(item.cacheMode)__rendererTestCache(item.cacheMode);__rendererTestRender(item.index,item.patch,item.force);records.push({...item,finite:__sleeveFinite(),triangles:q.paintedGloves.triangles(),raw:await hash(q.raster.image.data),canvas:await hash(q.raster.canvas.getContext('2d').getImageData(0,0,q.raster.canvas.width,q.raster.canvas.height).data),cache:__rendererTestCache()});}return records;},cases);
 results.push({...target,errors,records});await page.close();}
 const failures=results[0].records.flatMap((a,i)=>{const b=results[1].records[i];return a.raw===b.raw&&a.canvas===b.canvas?[]:[{i,before:a,after:b}];});const changedWeapons=failures.filter(x=>x.before.index>=0);for(let i=failures.length-1;i>=0;i--)if(failures[i].before.index>=0)failures.splice(i,1);const nonfinite=results.flatMap(r=>r.records.filter(x=>!x.finite));
 const report={cases:cases.length,changedWeapons,nonfinite,passed:!nonfinite.length&&!failures.length&&!results.some(r=>r.errors.length),failures,results};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:cases.length,passed:report.passed,failures:failures.length,changedWeaponCases:changedWeapons.length,nonfinite:nonfinite.length,errors:results.flatMap(r=>r.errors),targets}));if(!report.passed)process.exitCode=1;
}finally{await browser.close();for(const target of targets)if(hash(fs.readFileSync(target.input))!==target.sha256)throw Error('Immutable input changed');}})().catch(e=>{console.error(e);process.exitCode=1});

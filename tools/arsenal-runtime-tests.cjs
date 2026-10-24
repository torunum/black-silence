// Actual keyboard/mouse input and unmodified RAF for weapon state transitions.
// Only setup and isolated image-cache comparisons use the existing QA seam.
// Usage: node tools/arsenal-runtime-tests.cjs game.html output-directory
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),input=path.resolve(process.argv[2]||process.env.GAME_HTML||path.join(root,'THE-BLACK-SILENCE.html'));
const out=path.resolve(process.argv[3]||path.join(root,'.dream-loop/arsenal-runtime'));
const cancelOnly=process.env.ARSENAL_CANCEL_ONLY==='1';
const selected=process.env.ARSENAL_WEAPONS?process.env.ARSENAL_WEAPONS.split(',').map(Number):Array.from({length:10},(_,i)=>i);
assert(selected.length&&selected.every(i=>Number.isInteger(i)&&i>=0&&i<10),'ARSENAL_WEAPONS indices must be 0–9');
fs.mkdirSync(out,{recursive:true});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),source=fs.readFileSync(input,'utf8');
const anchor='Jk();ju();Yy();X$(J$);D0t();';assert.equal(source.split(anchor).length,2);
const seam=`(()=>{
const r=window.__arsenalRuntime={active:false,frames:[],samples:[],captures:[],last:0};
const draw=h0t;h0t=function(index,pose,...args){const result=draw.call(this,index,pose,...args);
 if(!r.firstControllable&&Be.started&&!Be.inputLock)r.firstControllable={ready:window.__BLACK_SILENCE_QA.paintedGloves.ready(),visible:!!Te.image?.data.some((v,j)=>j%4===3&&v>0),skipped:Te.skipped};
 if(r.active){const phase=pose.reload;const finite=Object.values(Te.anchors).every(a=>a.every(Number.isFinite));
 r.samples.push({index,state:St.wstate,phase,finite,ready:window.__BLACK_SILENCE_QA.paintedGloves.ready(),visible:!!Te.image?.data.some((v,j)=>j%4===3&&v>0)});
 if(phase>=0)for(const target of [.18,.50,.88])if(phase>=target&&!r.captures.some(c=>c.target===target))r.captures.push({target,phase,png:Te.canvas.toDataURL()});
 }return result;};
r.snapshot=()=>JSON.stringify({image:Te.canvas.toDataURL(),topRow:Te.topRow});
r.exact=(index,pose)=>{Te.lastKey='';h0t(index,pose,90);return r.snapshot();};
r.cached=(index,pose)=>{h0t(index,pose,90);return r.snapshot();};
const frame=now=>{if(r.active&&r.last)r.frames.push(now-r.last);r.last=r.active?now:0;requestAnimationFrame(frame);};requestAnimationFrame(frame);
})();`;
const fixture=path.join(out,'runtime-fixture.html');fs.writeFileSync(fixture,source.replace(anchor,()=>seam+anchor));
const report={input,inputSHA256:sha(source),fixtureSHA256:sha(fs.readFileSync(fixture)),selected,viewport:'1280x720',scope:'Real R/digit keys, mouse fire/kick and RAF. Isolated setup inventories; no gameplay balance claim. Same-build cache ghost comparison, not old visual parity.',runs:[],transitions:[],ghosting:[],errors:[],network:[]};
const stats=a=>{const s=a.slice().sort((a,b)=>a-b),mean=a.reduce((a,b)=>a+b,0)/Math.max(1,a.length);return{n:a.length,meanMs:mean,p95Ms:s[Math.floor(s.length*.95)]||0,maxMs:s.at(-1)||0,measuredFPS:1000/mean};};
async function setup(page,index,mag=0){return page.evaluate(({index,mag})=>{
 const q=window.__BLACK_SILENCE_QA;q.resetCombat();q.reloadAudio?.clearTestEffects();q.pause(false);delete q.viewPose;
 q.Be.inputLock=false;q.Be.pianoOpen=false;q.v.cine=null;q.T.dead=q.T.won=false;q.T.hp=100;q.T.kickCd=0;
 q.C.spawnGuard=100;q.C.vx=q.C.vz=0;q.Ct.firing=false;q.Ct.zoomOn=false;
 for(const key of Object.keys(q.li))q.li[key]=false;
 for(let i=0;i<10;i++){q.T.weapons[i]=true;q.T.mag[i]=q.weapons[i].magSize;q.T.ammo[q.weapons[i].ammo]=100;}
 q.T.cur=index;q.T.mag[index]=mag;Object.assign(q.St,{wstate:'idle',wtime:0,wCool:0,pending:-1,kickAnim:0});
 for(const id of['dead','win','levelend'])document.getElementById(id).classList.add('hidden');
 const r=window.__arsenalRuntime;r.active=false;r.frames=[];r.samples=[];r.captures=[];r.last=0;
 return{index,name:q.weapons[index].name,capacity:q.weapons[index].magSize,reloadSeconds:q.weapons[index].reload,ammo:q.weapons[index].ammo,mag,reserve:q.T.ammo[q.weapons[index].ammo]};
},{index,mag});}
const current=page=>page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;return{index:q.T.cur,state:q.St.wstate,mag:q.T.mag.slice(),ammo:{...q.T.ammo},melee:!!q.melee(),voices:q.reloadAudio?.active()};});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--allow-file-access-from-files']});try{
const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>report.errors.push(e.message));await page.route(/^https?:/,r=>{report.network.push(r.request().url());return r.abort();});
await page.goto(pathToFileURL(fixture).href+'?qa=1');const boot=Date.now();await page.locator('#mNew').click();
await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q?.paintedGloves.ready()&&q.raster.canvas&&!q.raster.skipped&&!q.Be.inputLock;},null,{timeout:60000});
report.readyMs=Date.now()-boot;report.assetNames=await page.evaluate(()=>Object.keys(window.__BLACK_SILENCE_GLOVE_ASSETS));report.firstControllable=await page.evaluate(()=>window.__arsenalRuntime.firstControllable);assert(report.firstControllable.ready,'assets ready on first controllable render');
// Remove enemy damage from the repeatable weapon fixture; keep scene rendering.
await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;for(const e of q.v.enemies){q.J.scene.remove(e.sp);q.J.scene.remove(e.blob);}q.v.enemies=[];});
for(const index of cancelOnly?[]:selected){
 const before=await setup(page,index);await page.evaluate(()=>window.__arsenalRuntime.active=true);const started=Date.now();await page.keyboard.press('r');
 await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='reload',null,{timeout:5000});
 await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q.St.wstate==='idle'&&q.T.mag[q.T.cur]>0;},null,{timeout:25000});
 const elapsedMs=Date.now()-started;const sampled=await page.evaluate(()=>{const r=window.__arsenalRuntime;r.active=false;return{samples:r.samples,captures:r.captures,frames:r.frames};});const after=await current(page);
 assert.equal(after.mag[index],before.capacity,`weapon ${index} completed magazine`);assert.equal(after.ammo[before.ammo]+after.mag[index],before.reserve,`weapon ${index} conserved ammunition`);
 assert(sampled.samples.some(s=>s.phase>=0),`weapon ${index} rendered actual reload`);assert(sampled.samples.every(s=>s.finite&&s.ready),`weapon ${index} finite ready frames`);
 assert(sampled.captures.length>=2,`weapon ${index} distinct reload phases observed`);
 const hashes=[];for(const c of sampled.captures){hashes.push(sha(c.png));fs.writeFileSync(path.join(out,`weapon-${index}-phase-${c.target}.png`),Buffer.from(c.png.split(',')[1],'base64'));delete c.png;}
 assert(new Set(hashes).size>=2,`weapon ${index} mechanism moves across phases`);
 report.runs.push({before,after,elapsedMs,frameStats:stats(sampled.frames),rawFrameDurationsMs:sampled.frames,captures:sampled.captures,sampleCount:sampled.samples.length,visibleSampleCount:sampled.samples.filter(s=>s.visible).length});
 console.log(JSON.stringify({weapon:index,reload:'PASS',elapsedMs,frames:sampled.frames.length}));
 // Fire uses the actual mouse handler. Capacity-one weapons are also covered.
 const fireBefore=await setup(page,index,before.capacity);await page.mouse.down();await page.waitForFunction(index=>window.__BLACK_SILENCE_QA.T.mag[index]<window.__BLACK_SILENCE_QA.weapons[index].magSize,index,{timeout:5000});await page.mouse.up();
 const fired=await current(page);assert(fired.mag[index]<fireBefore.mag,`weapon ${index} fires`);
 // Mid-reload switch must not transfer ammo into either gun early.
 const cancelBefore=await setup(page,index);await page.keyboard.press('r');await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='reload');
 const next=(index+1)%10;await page.keyboard.press(next===9?'0':String(next+1));
 await page.waitForFunction(next=>{const q=window.__BLACK_SILENCE_QA;return q.T.cur===next&&q.St.wstate==='idle';},next,{timeout:10000});
 const switched=await current(page);assert.equal(switched.mag[index],0,`weapon ${index} no ammo on cancelled reload`);assert.equal(switched.ammo[cancelBefore.ammo],cancelBefore.reserve,`weapon ${index} reserve intact after switch`);
 // Right mouse cancels via the actual kick handler and must recover visibly.
 await setup(page,index);await page.keyboard.press('r');await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='reload');await page.mouse.click(640,360,{button:'right'});
 await page.waitForFunction(()=>!!window.__BLACK_SILENCE_QA.melee(),null,{timeout:5000});await page.waitForFunction(()=>!window.__BLACK_SILENCE_QA.melee(),null,{timeout:10000});
 const kicked=await current(page);report.transitions.push({index,firedMag:fired.mag[index],switchedTo:switched.index,cancelledMag:switched.mag[index],kickRecovered:!kicked.melee});
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
}
report.fireCancellation=[];
for(const index of selected){
 const capacity=await page.evaluate(index=>window.__BLACK_SILENCE_QA.weapons[index].magSize,index);
 if(capacity===1){report.fireCancellation.push({index,notApplicable:'Capacity one cannot start a partial-magazine reload; empty reload switch/kick covered.'});continue;}
 const before=await setup(page,index,1);await page.keyboard.press('r');await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='reload');
 await page.mouse.down();await page.waitForFunction(index=>window.__BLACK_SILENCE_QA.T.mag[index]===0,index,{timeout:5000});await page.mouse.up();const after=await current(page);
 assert.equal(after.ammo[before.ammo],before.reserve,`weapon ${index} firing cancels reload without reserve transfer`);assert.equal(after.mag[index],0);report.fireCancellation.push({index,pass:true,state:after.state,reserve:after.ammo[before.ammo]});
}
// Same frozen pose before/after unrelated weapon, reload and two-foot draw.
await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.pause(true);q.Be.inputLock=true;window.__arsenalRuntime.active=false;});
for(const index of cancelOnly?[]:selected){
 const result=await page.evaluate(index=>{const q=window.__BLACK_SILENCE_QA,r=window.__arsenalRuntime,p={...q.pose(),reload:-1,recoil:0,action:0,heat:0};q.T.cur=index;q.St.wstate='idle';const before=r.exact(index,p);r.exact((index+1)%10,{...p,reload:.52});r.exact(index,{...p,kick:.5,drop:1});q.T.cur=index;q.St.wstate='idle';const after=r.exact(index,p),cached=r.cached(index,p),cachedAgain=r.cached(index,p);const loading={...p,reload:.52,kick:-1,exec:-1},freshReload=r.exact(index,loading),cachedReload=r.cached(index,loading),cachedReloadAgain=r.cached(index,loading);return{before,after,cached,cachedAgain,freshReload,cachedReload,cachedReloadAgain};},index);
 const match=sha(result.before)===sha(result.after);report.ghosting.push({index,match,before:sha(result.before),after:sha(result.after)});assert(match,`weapon ${index} no cached switch/kick pixels`);
 const cachedStable=result.after===result.cached&&result.cached===result.cachedAgain&&result.freshReload===result.cachedReload&&result.cachedReload===result.cachedReloadAgain;report.ghosting.at(-1).presentationAndCacheStable=cachedStable;assert(cachedStable,`weapon ${index} cached presentation hint must not accumulate`);
}
assert.equal(report.errors.length,0);assert.equal(report.network.length,0);report.pass=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(cancelOnly?'Partial-magazine fire cancellation and first controllable frame PASS':`Weapons ${selected.join(',')}: reload/fire/switch/kick/cache PASS`);
}finally{await browser.close();}})().catch(error=>{report.pass=false;report.failure=error.stack;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.error(error);process.exitCode=1;});

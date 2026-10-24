// Controlled native Sniper reload presentation across three aspect ratios.
// node tools/sniper-aspect-tests.cjs input.html output-directory
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const input=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
function resolvedTarget(target){let cursor=target,tail=[];while(!fs.existsSync(cursor)){tail.unshift(path.basename(cursor));const parent=path.dirname(cursor);if(parent===cursor)throw Error('Cannot resolve output ancestry');cursor=parent;}return path.join(fs.realpathSync(cursor),...tail);}
function inside(file,directory){const relative=path.relative(directory.toLowerCase(),file.toLowerCase());return !relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));}
assert(!inside(input,out)&&!inside(resolvedTarget(input),resolvedTarget(out)),'Input must be outside output tree; refusing to overwrite evidence');
const inputSHA256=crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
const verifyInput=()=>assert.equal(crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),inputSHA256,'Input changed during proof capture');
fs.mkdirSync(out,{recursive:true});const report={input,sha256:crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex'),scope:'Nine controlled native reload states (St.wstate/wtime), native presentation transform preserved; not actual R capture or performance measurement.',poses:[],errors:[]};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>report.errors.push(e.message));const source=fs.readFileSync(input,'utf8'),anchor='Jk();ju();Yy();X$(J$);D0t();';assert.equal(source.split(anchor).length,2);const fixture=path.join(out,'fixture.html');fs.writeFileSync(fixture,source.replace(anchor,"const aspectNativeDraw=h0t;h0t=function(index,pose,...args){window.__aspectPose={index,...pose};return aspectNativeDraw.call(this,index,pose,...args);};"+anchor));await page.goto(pathToFileURL(fixture).href+'?qa=1');await page.locator('#mNew').click();await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q?.Be.started&&!q.Be.inputLock&&q.paintedGloves.ready()});await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.pause(true);q.Be.inputLock=true;q.T.cur=4;q.T.weapons[4]=true;q.St.wstate='idle';document.getElementById('pause').classList.add('hidden');const r=document.getElementById('resSlider');r.value='4';r.dispatchEvent(new Event('input'));});const base={recoil:0,action:0,heat:0,kick:-1,drop:0,exec:-1};for(const[width,height]of[[1024,768],[1280,720],[1680,720]]){await page.setViewportSize({width,height});for(const reload of[.12,.2,.82]){const pose={...base,reload};await page.evaluate(pose=>{const q=window.__BLACK_SILENCE_QA;q.St.wstate='reload';q.St.wtime=pose.reload*q.weapons[4].reload;q.viewPose=pose;q.raster.lastKey='';},pose);await page.waitForTimeout(70);const result=await page.evaluate(pose=>{const q=window.__BLACK_SILENCE_QA;return{nativePose:window.__aspectPose,state:q.St.wstate,wtime:q.St.wtime,finite:Object.values(q.raster.anchors).every(a=>a.every(Number.isFinite)),visible:q.raster.image.data.some((v,i)=>i%4===3&&v>0),bounds:q.paintedGloves.bounds(),anchors:q.raster.anchors};},pose);assert(result.finite&&result.visible);assert.equal(result.nativePose.index,4);assert(Math.abs(result.nativePose.reload-reload)<1e-8);assert.equal(result.state,'reload');assert(Math.abs(result.nativePose.pitch)+Math.abs(result.nativePose.roll)>.05,'Native reload presentation must not be suppressed');const file=`sniper-${width}x${height}-${reload.toFixed(2)}.png`;await page.screenshot({path:path.join(out,file)});report.poses.push({width,height,reload,...result,file});}}
// Resize out to ultrawide and back at the same native pose. The model raster
// must recover byte-for-byte; a full-scene proof also exposes stale side tails.
const resizeFrame=async(width,height)=>{
 await page.setViewportSize({width,height});
 await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.St.wstate='reload';q.St.wtime=.82*q.weapons[4].reload;q.viewPose={recoil:0,action:0,heat:0,kick:-1,drop:0,exec:-1,reload:.82};q.raster.lastKey='';});
 await page.waitForTimeout(80);
 return page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;let hash=2166136261;for(const byte of q.raster.image.data)hash=Math.imul(hash^byte,16777619);return{hash:hash>>>0,width:q.raster.image.width,height:q.raster.image.height,index:window.__aspectPose.index,reload:window.__aspectPose.reload,finite:Object.values(q.raster.anchors).every(a=>a.every(Number.isFinite))};});
};
const resizeBefore=await resizeFrame(1280,720);await resizeFrame(1680,720);const resizeAfter=await resizeFrame(1280,720);
assert.deepEqual(resizeAfter,resizeBefore,'Native model raster must recover after ultrawide resize');
assert(resizeAfter.finite&&resizeAfter.index===4);
await page.screenshot({path:path.join(out,'sniper-resize-restored-1280x720-0.82.png')});
report.resize={before:resizeBefore,after:resizeAfter,passed:true};
report.zoom=[];
for(const [width,height]of [[1024,768],[1280,720],[1680,720]]){
 await page.setViewportSize({width,height});
 await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;delete q.viewPose;q.pause(false);q.Be.inputLock=false;q.C.spawnGuard=100;q.Ct.zoomOn=false;q.St.wstate='idle';q.St.wtime=0;q.St.wCool=0;q.T.mag[4]=0;q.T.ammo[q.weapons[4].ammo]=30;});
 await page.keyboard.press('z');
 await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.zoomLerp>.995);
 await page.keyboard.press('r');
 await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q.St.wstate==='reload'&&q.St.wtime>.1});
 const scoped=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;return{zoom:q.Ct.zoomOn,fov:q.J.camera.fov,skipped:q.raster.skipped,state:q.St.wstate}});
 assert(scoped.zoom&&scoped.fov>=32&&scoped.fov<32.3&&scoped.skipped&&scoped.state==='reload','Native scope intentionally hides weapon during zoomed reload');
 await page.keyboard.press('z');
 await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q.St.zoomLerp<.1&&!q.raster.skipped});
 const restored=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;return{fov:q.J.camera.fov,state:q.St.wstate,finite:Object.values(q.raster.anchors).every(a=>a.every(Number.isFinite)),visible:q.raster.image.data.some((v,i)=>i%4===3&&v>0),index:window.__aspectPose.index}});
 assert(restored.finite&&restored.visible&&restored.index===4&&restored.state==='reload','Native unzoom restores finite visible weapon while reload continues');
 report.zoom.push({width,height,scoped,restored});await page.evaluate(()=>window.__BLACK_SILENCE_QA.pause(true));
}
assert.equal(report.errors.length,0);report.passed=true;console.log('PASS9 native Sniper aspect/phase cases +3 actual Z/R/Z zoom transitions');}finally{await browser.close();verifyInput();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2))}})().catch(e=>{console.error(e);process.exitCode=1});

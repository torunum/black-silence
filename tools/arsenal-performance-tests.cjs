// Serial ABBA observations, not a performance acceptance threshold or FPS promise.
// Usage: node tools/arsenal-performance-tests.cjs baseline.html candidate.html out
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const inputs=process.argv.slice(2,4).map(p=>path.resolve(p));if(inputs.length!==2)throw Error('Supply baseline and candidate HTML');
const selected=process.env.ARSENAL_WEAPONS?process.env.ARSENAL_WEAPONS.split(',').map(Number):[1,6,7,8,9];
if(!selected.length||!selected.every(i=>Number.isInteger(i)&&i>=0&&i<10))throw Error('ARSENAL_WEAPONS indices must be 0–9');
const out=path.resolve(process.argv[4]||'.dream-loop/arsenal-performance');fs.mkdirSync(out,{recursive:true});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const seam=`(()=>{const p=window.__arsenalPerf={active:false,frames:[],raster:[],last:0};const draw=h0t;h0t=function(...args){if(!p.active)return draw.apply(this,args);const start=performance.now();try{return draw.apply(this,args);}finally{p.raster.push(performance.now()-start);}};const frame=t=>{if(p.active&&p.last)p.frames.push(t-p.last);p.last=p.active?t:0;requestAnimationFrame(frame);};requestAnimationFrame(frame);})();`;
const targets=inputs.map((input,i)=>{let s=fs.readFileSync(input,'utf8');const anchor='Jk();ju();Yy();X$(J$);D0t();';if(s.split(anchor).length!==2)throw Error('Unexpected startup');const sha256=hash(s),target=path.join(out,`variant-${i}.html`);fs.writeFileSync(target,s.replace(anchor,()=>seam+anchor));return{input,sha256,target};});
const stats=a=>{const s=a.slice().sort((a,b)=>a-b),mean=a.reduce((a,b)=>a+b,0)/Math.max(1,a.length);return{n:a.length,meanMs:mean,p50Ms:s[Math.floor(s.length*.5)]||0,p95Ms:s[Math.floor(s.length*.95)]||0,maxMs:s.at(-1)||0,measuredFPS:mean?1000/mean:0};};
const report={viewport:'1280x720',selected,order:[0,1,1,0],targets,scope:'Serial ABBA, same chapter 0 starting camera, enemies removed equally, real RAF and keyboard reload. Whole-build observation including changed scenery; headless Chrome/shared host, not a hardware-independent FPS guarantee.',runs:[]};
(async()=>{for(const variant of report.order){const browser=await chromium.launch({channel:'chrome',headless:true,args:['--allow-file-access-from-files']});try{
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{let seed=123456;Math.random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};});
const navigationStart=Date.now();await page.goto(pathToFileURL(targets[variant].target).href+'?qa=1');const inputStart=Date.now();await page.locator('#mNew').click();
await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q?.paintedGloves.ready()&&q.raster.canvas&&!q.raster.skipped&&!q.Be.inputLock;},null,{timeout:60000});
const run={variant,navigationMs:inputStart-navigationStart,inputReadyMs:Date.now()-inputStart,stages:[],errors};
run.scene=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.resetCombat();q.pause(false);q.Be.inputLock=false;q.Be.pianoOpen=false;q.v.cine=null;q.T.dead=q.T.won=false;q.C.spawnGuard=100;q.T.hp=100;q.Ct.firing=false;for(const e of q.v.enemies){q.J.scene.remove(e.sp);q.J.scene.remove(e.blob);}q.v.enemies=[];const gl=q.J.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return{position:[q.C.px,q.C.pyy,q.C.pz],yaw:q.Ct.yaw,pitch:q.Ct.pitch,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),children:q.J.scene.children.length};});
for(const index of selected){
 await page.evaluate(index=>{const q=window.__BLACK_SILENCE_QA;q.resetCombat();q.Be.inputLock=false;q.C.spawnGuard=100;q.T.cur=index;q.T.weapons[index]=true;q.T.mag[index]=q.weapons[index].magSize;q.T.ammo[q.weapons[index].ammo]=100;Object.assign(q.St,{wstate:'idle',wtime:0,wCool:0});q.Ct.firing=false;delete q.viewPose;},index);
 await page.waitForTimeout(200);
 for(const state of['idle','reload']){
  if(state==='reload')await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.T.mag[q.T.cur]=0;q.St.wstate='idle';q.St.wtime=0;});
  await page.evaluate(()=>{const p=window.__arsenalPerf;p.frames=[];p.raster=[];p.last=0;p.active=true;});const start=Date.now();
  if(state==='idle')await page.waitForTimeout(1200);else{await page.keyboard.press('r');await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='reload');await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q.St.wstate==='idle'&&q.T.mag[q.T.cur]>0;},null,{timeout:30000});}
  const raw=await page.evaluate(()=>{const p=window.__arsenalPerf;p.active=false;return{frames:p.frames,raster:p.raster};});
  const stage={index,state,elapsedMs:Date.now()-start,frames:stats(raw.frames),rasterCPU:stats(raw.raster),rawFrameDurationsMs:raw.frames,rawRasterDurationsMs:raw.raster};run.stages.push(stage);console.log(JSON.stringify({variant,index,state,elapsedMs:stage.elapsedMs,frames:stage.frames,rasterCPU:stage.rasterCPU}));
 }
}
if(errors.length)throw Error(errors.join('\n'));report.runs.push(run);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
}finally{await browser.close();}}report.complete=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));})().catch(e=>{report.failure=e.stack;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});

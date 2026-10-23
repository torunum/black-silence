// Usage: node tools/grip-reference-tests.cjs [game.html] [baseline.html] [output-dir]
// Without baseline: rendering, offline assets and same-build ghosting only.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium}=require('playwright');
const {prepare}=require('./grip-test-fixture.cjs');
const project=path.resolve(__dirname,'..'),input=path.resolve(process.argv[2]||path.join(project,'THE-BLACK-SILENCE.html')),baseline=process.argv[3]?path.resolve(process.argv[3]):null;
const root=path.resolve(process.argv[4]||path.join(project,'.dream-loop/grip-checks'));fs.mkdirSync(root,{recursive:true});
const candidateURL=prepare(input,root,'candidate'),baselineURL=prepare(baseline||input,root,'baseline');
const phases=[-1,.05,.10,.14,.18,.23,.27,.30,.32,.37,.43,.46,.50,.55,.59,.625,.64,.70,.74,.81,.86,.90,.95,1];
const scenes=[['idle',-1,0],['eject',.30,0],['insert',.55,0],['close',.81,0],['fire',-1,.65]];
const hash=s=>crypto.createHash('sha256').update(Buffer.from(s.split(',')[1],'base64')).digest('hex');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});const report={errors:[],network:[],scenes:[],phases:[],parity:[],ghosting:[]};try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route(/^https?:/,r=>{report.network.push(r.request().url());return r.abort();});
 await page.goto(candidateURL);
 await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.paintedGloves?.ready());
 report.assets=await page.evaluate(async()=>Promise.all(Object.entries(window.__BLACK_SILENCE_GLOVE_ASSETS).map(async([name,a])=>{const image=new Image();image.src=a.src;await image.decode();return{name,embedded:a.src.startsWith('data:image/png;base64,'),width:image.width,height:image.height};})));
 await page.locator('#mNew').click();
 await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q?.raster.canvas&&!q.raster.skipped&&!q.Be.inputLock;},null,{timeout:30000});
 await page.waitForFunction(()=>!document.getElementById('subt').textContent.trim(),null,{timeout:20000});
 const base=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.Be.inputLock=true;return {...q.pose(),reload:-1,recoil:0,action:0,heat:0,kick:-1,drop:0};});
 const render=async(p,index,pose)=>p.evaluate(({index,pose})=>{const q=window.__BLACK_SILENCE_QA;const r=window.__weaponStats(index,pose);return {...r,bounds:q.paintedGloves?.bounds(),triangles:q.paintedGloves?.triangles()};},{index,pose});
 for(const index of [0,1])for(const [name,reload,recoil]of scenes){
  const pose={...base,reload,recoil};
  await page.evaluate(({index,pose})=>{const q=window.__BLACK_SILENCE_QA;q.T.cur=index;q.T.weapons[index]=true;q.T.mag[index]=index===0?6:2;q.St.wstate='idle';q.St.wtime=1;q.viewPose=pose;q.raster.lastKey='';},{index,pose});
  await page.waitForTimeout(120);const shot=path.join(root,`${index}-${name}.png`);await page.screenshot({path:shot});
  const result=await render(page,index,pose);fs.writeFileSync(path.join(root,`${index}-${name}-model.png`),Buffer.from(result.png.split(',')[1],'base64'));
  delete result.png;report.scenes.push({index,name,...result,screenshot:shot});
 }
 for(const index of [0,1])for(const reload of phases){const r=await render(page,index,{...base,reload});delete r.png;report.phases.push({index,reload,...r});}
 const before=await browser.newPage();before.on('pageerror',e=>report.errors.push('before:'+e.message));await before.addInitScript(()=>{requestAnimationFrame=()=>1});
 await before.goto(baselineURL);
 const invariants=[];report.baselineProvided=!!baseline;report.parityScope=baseline?'Compared against explicitly supplied baseline':'Cross-version parity skipped; no baseline supplied';for(let index=2;index<10;index++)for(const reload of [-1,.5])invariants.push({index,pose:{...base,reload}});
 for(const kick of [.11,.21])for(const drop of [0,1])invariants.push({index:-1,pose:{...base,kick,drop}});
 for(const {index,pose}of (baseline?invariants:[])){const a=await render(before,index,pose),b=await render(page,index,pose);report.parity.push({index,reload:pose.reload,kick:pose.kick,drop:pose.drop,identical:hash(a.png)===hash(b.png),triangles:b.triangles,bounds:b.bounds});}
 // A->B->kick->C->B must return exactly the same B image as a clean native B render.
 const clean=await render(before,2,base);
 for(const [name,index,pose]of [['flare',0,base],['other',2,base],['kick',-1,{...base,kick:.11,drop:1}],['shotgun',1,base],['other-return',2,base]]){const r=await render(page,index,pose);const item={name,index,triangles:r.triangles,bounds:r.bounds,sha256:hash(r.png)};if(index===2)item.cleanMatch=item.sha256===hash(clean.png);report.ghosting.push(item);fs.writeFileSync(path.join(root,`switch-${name}.png`),Buffer.from(r.png.split(',')[1],'base64'));}
 report.pass=report.errors.length===0&&report.network.length===0&&report.assets.length===2&&report.assets.every(a=>a.embedded)&&report.phases.every(r=>r.visible&&r.finite)&&report.parity.every(p=>p.identical)&&report.ghosting.filter(p=>p.index===2).every(p=>p.cleanMatch);
 fs.writeFileSync(path.join(root,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,errors:report.errors,network:report.network,assets:report.assets,scenes:report.scenes.length,phases:report.phases.length,failedParity:report.parity.filter(p=>!p.identical),ghosting:report.ghosting,report:path.join(root,'report.json')}));if(!report.pass)process.exitCode=1;
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});

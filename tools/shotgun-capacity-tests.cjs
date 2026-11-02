// Native pickup/checkpoint functions and real keyboard/mouse weapon transitions.
// node tools/shotgun-capacity-tests.cjs game.html output-directory
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {pathToFileURL}=require('url'),{chromium}=require('playwright');
const input=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
assert(!input.toLowerCase().startsWith(out.toLowerCase()+path.sep),'Input must be outside output tree');
fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(input,'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const anchor='Jk();ju();Yy();X$(J$);D0t();';assert.equal(source.split(anchor).length,2);
const seam=`window.__shotgunCapacity={
 snapshot:()=>ck(),restore:s=>lk(s),base:yu,
 pickup(kinds){
  const prior=v.items;
  v.items=kinds.map(kind=>({kind,taken:false,bob:0,x:C.px,z:C.pz,y0:C.pyy,sp:{position:{y:0}}}));
  try { G$(0); return v.items.map(item=>({kind:item.kind,taken:item.taken})); }
  finally { v.items=prior; }
 }
};`;
const fixture=path.join(out,'fixture.html');fs.writeFileSync(fixture,source.replace(anchor,()=>seam+anchor));
const report={input,inputSHA256:hash(source),fixtureSHA256:hash(fs.readFileSync(fixture)),scope:'Real native G$/ck/lk with isolated fixture items; real R and held mouse/RAF for firing and reload. No persistent inventory save is claimed.',pickups:[],errors:[],network:[]};
const write=()=>fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.route(/^https?:/,r=>{report.network.push(r.request().url());return r.abort();});
 await page.goto(pathToFileURL(fixture).href+'?qa=1');await page.locator('#mNew').click();
 await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q?.Be.started&&!q.Be.inputLock&&q.paintedGloves.ready();},null,{timeout:60000});
 // Collect the actual prologue weapon through the unmodified gameplay RAF.
 const livePickup=await page.evaluate(()=>{
  const q=window.__BLACK_SILENCE_QA,item=q.v.items.find(i=>i.kind==='w1'&&!i.taken);if(!item)throw Error('Native prologue shotgun missing');
  q.v.enemies.forEach(e=>e.dead=true);q.v.items.forEach(i=>{if(i!==item)i.taken=true;});
  q.T.weapons[1]=false;q.T.mag[1]=0;q.T.ammo.shells=0;q.C.px=item.x;q.C.pz=item.z;q.C.pyy=q.floor(item.x,item.z)+q.eyeHeight;q.C.vx=q.C.vz=0;q.C.spawnGuard=100;
  return{x:item.x,z:item.z};
 });
 await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.T.weapons[1],null,{timeout:5000});
 report.nativeWorldPickup=await page.evaluate(pos=>{const q=window.__BLACK_SILENCE_QA;return{position:pos,mag:q.T.mag[1],reserve:q.T.ammo.shells,taken:q.v.items.find(i=>i.kind==='w1'&&i.x===pos.x&&i.z===pos.z).taken};},livePickup);
 assert.deepEqual([report.nativeWorldPickup.mag,report.nativeWorldPickup.reserve,report.nativeWorldPickup.taken],[2,7,true]);
 await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.pause(true);q.Be.inputLock=false;q.resetCombat();q.v.enemies.forEach(e=>e.dead=true);q.v.items.forEach(i=>i.taken=true);q.T.totKills=0;});
 report.metadata=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;return{native:window.__shotgunCapacity.base[1],runtime:q.weapons[1]};});
 assert.equal(report.metadata.native.magSize,2);assert.equal(report.metadata.runtime.magSize,2);assert.equal(report.metadata.runtime.reload,2.1);
 async function pickup(name,owned,mag,reserve,kinds){const r=await page.evaluate(({owned,mag,reserve,kinds})=>{
  const q=window.__BLACK_SILENCE_QA;q.T.weapons[1]=owned;q.T.mag[1]=mag;q.T.ammo.shells=reserve;q.T.ammo.bullets=10;
  const taken=window.__shotgunCapacity.pickup(kinds);return{mag:q.T.mag[1],reserve:q.T.ammo.shells,bullets:q.T.ammo.bullets,taken};
 },{owned,mag,reserve,kinds});report.pickups.push({name,owned,mag,reserve,kinds,result:r});return r;}
 let r=await pickup('first acquisition',false,0,0,['w1']);assert.deepEqual([r.mag,r.reserve],[2,7]);
 r=await pickup('second full pickup',true,r.mag,r.reserve,['w1']);assert.deepEqual([r.mag,r.reserve],[2,12]);
 r=await pickup('third full pickup',true,r.mag,r.reserve,['w1']);assert.deepEqual([r.mag,r.reserve],[2,17]);
 r=await pickup('partial owned pickup',true,1,7,['w1']);assert.deepEqual([r.mag,r.reserve],[2,12]);
 r=await pickup('empty owned pickup',true,0,7,['w1']);assert.deepEqual([r.mag,r.reserve],[2,12]);
 r=await pickup('two simultaneous first pickups',false,0,0,['w1','w1']);assert.deepEqual([r.mag,r.reserve],[2,12]);
 r=await pickup('unrelated shell and bullet pickups',true,2,7,['shells','bullets']);assert.deepEqual([r.mag,r.reserve,r.bullets],[2,13,28]);
 report.restore=await page.evaluate(()=>{
  const q=window.__BLACK_SILENCE_QA,s=window.__shotgunCapacity.snapshot();s.mag[1]=5;s.ammo.shells=7;
  const unchanged=JSON.stringify(s),results=[];for(let i=0;i<3;i++){window.__shotgunCapacity.restore(s);results.push([q.T.mag[1],q.T.ammo.shells]);}
  return{results,snapshotUnchanged:unchanged===JSON.stringify(s)};
 });assert.deepEqual(report.restore.results,[[2,10],[2,10],[2,10]]);assert(report.restore.snapshotUnchanged);
 async function setup(mag,reserve){return page.evaluate(({mag,reserve})=>{
  const q=window.__BLACK_SILENCE_QA;q.pause(false);q.resetCombat();q.Be.inputLock=false;q.Be.pianoOpen=false;q.v.cine=null;q.T.dead=q.T.won=false;q.T.hp=100;
  q.T.cur=1;q.T.weapons[1]=true;q.T.mag[1]=mag;q.T.ammo.shells=reserve;q.C.spawnGuard=100;q.C.vx=q.C.vz=0;q.Ct.firing=false;q.Ct.zoomOn=false;
  q.St.pending=-1;q.St.wstate='idle';q.St.wtime=0;q.St.wCool=0;for(const key of Object.keys(q.li))q.li[key]=false;
  delete q.viewPose;for(const id of ['pause','dead','win','levelend'])document.getElementById(id).classList.add('hidden');
 },{mag,reserve});}
 const state=()=>page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;return{mag:q.T.mag[1],reserve:q.T.ammo.shells,state:q.St.wstate,shots:q.T.shots};});
 await setup(2,3);const before=await state();await page.mouse.down();
 await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.T.mag[1]===0,null,{timeout:6000});await page.mouse.up();
 await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='reload',null,{timeout:3000});const empty=await state();
 await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q.St.wstate==='idle'&&q.T.mag[1]===2;},null,{timeout:6000});
 const reloaded=await state();assert.equal(empty.shots-before.shots,2);assert.equal(empty.reserve,3);assert.deepEqual([reloaded.mag,reloaded.reserve],[2,1]);report.twoShots={before,empty,reloaded};
 await setup(0,1);await page.keyboard.press('r');await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='reload');
 await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='idle',null,{timeout:6000});report.oneReserve=await state();assert.deepEqual([report.oneReserve.mag,report.oneReserve.reserve],[1,0]);
 await setup(1,5);await page.keyboard.press('r');await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='reload');await page.mouse.down();
 await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.T.mag[1]===0);await page.mouse.up();report.fireCancel=await state();assert.equal(report.fireCancel.reserve,5);
 await setup(0,5);await page.keyboard.press('r');await page.waitForFunction(()=>window.__BLACK_SILENCE_QA.St.wstate==='reload');await page.keyboard.press('1');
 await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q.T.cur===0&&q.St.wstate==='idle';},null,{timeout:6000});report.switchCancel=await state();assert.deepEqual([report.switchCancel.mag,report.switchCancel.reserve],[0,5]);
 assert.equal(report.errors.length,0);assert.equal(report.network.length,0);report.passed=true;write();console.log('Shotgun capacity, pickup budgets, checkpoint normalization and native fire/reload PASS');
 }finally{await browser.close();}})().catch(e=>{report.passed=false;report.error=e.stack;write();console.error(e);process.exitCode=1;});

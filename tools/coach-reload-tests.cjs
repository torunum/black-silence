// Run actual keyboard reloads against a private instrumented standalone copy.
// Observe each rendered chamber; no frame override or inventory transfer hook.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const input=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),src=fs.readFileSync(input,'utf8');
if(!path.relative(out,input).startsWith('..'))throw Error('Input must be outside fixture directory');
fs.mkdirSync(out,{recursive:true});
const marker='const loaded=pose.coachLoaded??0, incoming=pose.coachIncoming??(2-loaded);';
assert.equal(src.split(marker).length,2);const hook=marker+`
    const trace=window.__coachTest?.frames;if(trace)trace.push({phase:t,loaded,incoming,shells:[]});
`;
const fn='function coachShell(m,exposed,spent=false){';
assert.equal(src.split(fn).length,2);const pageSrc=src.replace(marker,()=>hook).replace(fn,()=>fn+`
    const frame=window.__coachTest?.frames.at(-1);if(frame)frame.shells.push({exposed,spent});
`),fixture=path.join(out,'coach-fixture.html');fs.writeFileSync(fixture,pageSrc);
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
  const p=await b.newPage({viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(fixture).href+'?qa=1');await p.locator('#mNew').click();
  await p.waitForFunction(()=>window.__BLACK_SILENCE_QA?.Be.started&&!__BLACK_SILENCE_QA.Be.inputLock&&__BLACK_SILENCE_QA.paintedGloves.ready());
  await p.evaluate(()=>{const q=__BLACK_SILENCE_QA;q.v.cine=null;for(const e of q.v.enemies){q.J.scene.remove(e.sp);q.J.scene.remove(e.blob)}q.v.enemies=[];});
  const checks=[];
  for(const [loaded,reserve,cancel] of [[0,2,false],[1,7,false],[0,1,false],[1,7,true]]){
    await p.evaluate(([loaded,reserve])=>{const q=__BLACK_SILENCE_QA;q.resetCombat();q.T.cur=1;q.T.weapons[1]=true;q.T.mag[1]=loaded;q.T.ammo[q.weapons[1].ammo]=reserve;q.C.spawnGuard=100;Object.assign(q.St,{wstate:'idle',wtime:0,wCool:0});window.__coachTest={frames:[]};},[loaded,reserve]);
    await p.keyboard.press('r');await p.waitForFunction(()=>__BLACK_SILENCE_QA.St.wstate==='reload');
    if(cancel){await p.waitForFunction(()=>window.__coachTest.frames.some(f=>f.phase>.47));await p.mouse.click(480,300,{button:'right'});}
    await p.waitForFunction(()=>__BLACK_SILENCE_QA.St.wstate!=='reload');
    const x=await p.evaluate(()=>{const q=__BLACK_SILENCE_QA;return{mag:q.T.mag[1],reserve:q.T.ammo[q.weapons[1].ammo],frames:window.__coachTest.frames};});
    const add=Math.min(2-loaded,reserve);assert.equal(x.mag,loaded+(cancel?0:add));assert.equal(x.reserve,reserve-(cancel?0:add));
    const sampled=(lo,hi)=>{const group=x.frames.filter(f=>f.phase>=lo&&f.phase<hi);assert(group.length,'Missing phase '+lo);return group;};
    for(const f of sampled(.275,.385)){assert.equal(f.shells.filter(s=>s.spent).length,2-loaded);assert.equal(f.shells.filter(s=>!s.spent).length,loaded);}
    for(const f of sampled(.43,.47)){assert.equal(f.shells.filter(s=>!s.spent).length,loaded+add);assert.equal(f.shells.filter(s=>s.exposed>0).length,add);}
    if(!cancel)for(const f of sampled(.605,.74)){assert.equal(f.shells.length,loaded+add);assert(f.shells.every(s=>!s.spent&&s.exposed===0));}
    checks.push({loaded,reserve,cancel,mag:x.mag,remaining:x.reserve,phases:x.frames.length});
  }
  assert.deepEqual(errors,[]);const report={passed:true,checks,errors};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});

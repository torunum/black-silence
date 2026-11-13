// Capture the prologue return from native eye level; the gameplay file is immutable.
// node tools/return-chapel-capture.cjs INPUT.html EMPTY_OUTPUT_DIRECTORY
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const [input,output] = process.argv.slice(2).map(p=>path.resolve(p));
assert(input && output && path.extname(input)==='.html', 'Expected input.html and a new output directory');
fs.mkdirSync(output,{recursive:true});
assert.equal(fs.readdirSync(output).length,0,'Refuse to overwrite existing work');
const source = fs.readFileSync(input,'utf8'), anchor = 'Jk();ju();Yy();X$(J$);D0t();';
assert.equal(source.split(anchor).length,2);
const hash = v=>crypto.createHash('sha256').update(v).digest('hex');
const seam = 'window.__RETURN={zone:()=>TR(0,true),solid:fu,checkpoint:()=>Q0.marks.find(m=>m.k==="candlestub"&&m.x===117&&m.z===49)?.k,exit:()=>[z0.exit.x,z0.exit.z,z0.exit.nx,z0.exit.nz],map:()=>({cells:v.grid.map(r=>r.join("")),zone:v.zones.map})};';
const fixture=path.join(output,'capture.html');fs.writeFileSync(fixture,source.replace(anchor,()=>seam+anchor));
const views=[
  ['climb',113,87,113,73,.28], ['refuge',114,54,124,52,.04],
  ['chapel',113,29,107,17,.24], ['ladder',108,25,107,16,.15]
];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  const page=await browser.newPage({viewport:{width:1120,height:630}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let s=93434;Math.random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};});
  await page.goto(pathToFileURL(fixture).href+'?qa=1');
  await page.locator('#mNew').click();
  await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q?.Be.started&&!q.Be.inputLock&&q.paintedGloves.ready()},{},{timeout:45000});
  const setup=await page.evaluate(()=>{
   const q=window.__BLACK_SILENCE_QA;q.pause(true);
   document.getElementById('pause').classList.add('hidden');document.getElementById('subt').textContent='';
   q.T.cur=0;q.T.weapons[0]=true;q.T.mag[0]=q.weapons[0].magSize;q.St.wstate='idle';q.viewPose={...q.pose(),reload:-1,recoil:0,action:0,heat:0};
   return{exit:window.__RETURN.exit(),refugeCheckpoint:window.__RETURN.checkpoint()};
  });
  const cameras=[];
  for(const [name,x,z,tx,tz,rise] of views){
   const record=await page.evaluate(({x,z,tx,tz,rise})=>{
    const q=window.__BLACK_SILENCE_QA;if(window.__RETURN.solid(x,z))throw Error('Embedded camera');
    q.C.px=x;q.C.pz=z;q.C.pyy=q.floor(x,z)+q.eyeHeight;q.C.vx=q.C.vz=q.C.vy=0;
    q.Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;
    q.Ct.pitch=Math.atan2(q.floor(tx,tz)+q.eyeHeight+rise-q.C.pyy,Math.hypot(tx-x,tz-z));
    q.setCamera();window.__RETURN.zone();return {camera:q.J.camera.position.toArray(),floor:q.floor(x,z)};
   },{x,z,tx,tz,rise});
   await page.waitForTimeout(180);const png=await page.screenshot({path:path.join(output,name+'.png')});
   cameras.push({name,...record,png:hash(png),render:await page.evaluate(()=>({...window.__BLACK_SILENCE_QA.J.renderer.info.render}))});
  }
  const collision=await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA,results=[];for(let x=95;x<=125;x+=.5)for(let z=15;z<106;z+=.5)results.push([window.__RETURN.solid(x,z),q.floor(x,z)]);return results;});
  const mapSHA=hash(JSON.stringify(await page.evaluate(()=>window.__RETURN.map())));
  assert.deepEqual(errors,[]);assert.equal(setup.refugeCheckpoint,'candlestub');assert.equal(hash(fs.readFileSync(input)),hash(source));
  const report={inputSHA:hash(source),mapSHA,collisionSHA:hash(JSON.stringify(collision)),collisionSamples:collision.length,...setup,cameras,errors};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

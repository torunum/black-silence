// Native, offline investigation of the Gothic Dungeon's existing optional door.
// node tools/drowned-ossuary-test.cjs game.html NEW_OUTPUT_DIRECTORY
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const args=process.argv.slice(2);assert.equal(args.length,2);
const [input,output]=args.map(v=>path.resolve(v));
fs.mkdirSync(output,{recursive:true});assert.equal(fs.readdirSync(output).length,0,'Refuse to overwrite existing work');
const source=fs.readFileSync(input,'utf8'),anchor='Jk();ju();Yy();X$(J$);D0t();';
assert.equal(source.split(anchor).length,2);
const fixture=path.join(output,'study.html');
const seam='window.__OSS={state:()=>({secret:v.doors["9,23"]?.secret,opened:v.doors["9,23"]?.open,count:T.secrets,total:T.secretsTotal,all:T.totSecrets,hp:T.hp,x:C.px,z:C.pz,medikit:!!v.items.find(p=>p.kind==="health"&&p.x===21&&p.z===53).taken}),tick:()=>{V5(false);m_(1/60);H_(1/60);VJ(1/60);v$(1/60);G$(1/60);F$(1/60);z$(1/60);V5(true)}};';
fs.writeFileSync(fixture,source.replace(anchor,()=>seam+anchor));
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1120,height:630}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(fixture).href+'?qa=1');await page.locator('#mNew').click();
 await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q?.Be.started&&!q.Be.inputLock;});
 await page.evaluate(()=>{window.__BLACK_SILENCE_QA.load(1);});
 await page.waitForFunction(()=>{const q=window.__BLACK_SILENCE_QA;return q.T.level===1&&!q.Be.inputLock;});
 const initial=await page.evaluate(()=>{
   const q=window.__BLACK_SILENCE_QA;
   q.C.spawnGuard=100;q.C.px=18.6;q.C.pz=41.9;q.C.pyy=q.floor(q.C.px,q.C.pz)+q.eyeHeight;q.C.vx=q.C.vz=q.C.vy=0;q.Ct.yaw=Math.atan2(.4,4.1)+Math.PI;q.Ct.pitch=-.13;
   q.T.hp=50;q.setCamera();return window.__OSS.state();
 });
 assert(initial.secret&&!initial.opened&&initial.medikit===false&&initial.total===2,JSON.stringify(initial));
 await page.evaluate(()=>{document.getElementById('subt').textContent='';});
 await page.waitForTimeout(220);await page.screenshot({path:path.join(output,'clue.png')});
 await page.evaluate(()=>{const q=window.__BLACK_SILENCE_QA;q.C.px=19;q.C.pz=44.7;q.C.pyy=q.floor(19,44.7)+q.eyeHeight;q.Ct.yaw=Math.PI;q.Ct.pitch=0;q.setCamera();});
 await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.__OSS.state().opened);
 const opened=await page.evaluate(()=>window.__OSS.state());assert.equal(opened.count,initial.count+1);assert.equal(opened.all,initial.all+1);
 await page.keyboard.press('KeyE');
 const crossed=await page.evaluate(()=>{
   const q=window.__BLACK_SILENCE_QA;q.pause(true);const data=[];
   for(let n=0;n<100;n++)window.__OSS.tick();
   for(const [x,z]of [[19,49.5],[21,53]]){
     let n=0;while(Math.hypot(x-q.C.px,z-q.C.pz)>.24&&n++<480){
       q.Ct.yaw=Math.atan2(x-q.C.px,z-q.C.pz)+Math.PI;
       q.li.KeyW=true;window.__OSS.tick();
     }
     q.li.KeyW=false;data.push({x,z,ticks:n,actual:[q.C.px,q.C.pz]});
   }
   return {path:data,state:window.__OSS.state()};
 });
 assert(crossed.path.every(p=>p.ticks<480),JSON.stringify(crossed));
 assert(crossed.state.medikit&&crossed.state.hp>=75,JSON.stringify(crossed));assert.equal(crossed.state.count,opened.count);assert.deepEqual(errors,[]);
 const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
 assert.equal(hash(source),hash(fs.readFileSync(input)));
 const result={inputSHA:hash(source),initial,opened,crossed,errors};
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

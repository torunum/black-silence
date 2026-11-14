// Native Shift + W + RMB at two pump bed approach angles, under one fixed clock.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const {chromium}=require("playwright"),{pathToFileURL}=require("node:url");
const input=path.resolve(process.argv[2]||"THE-BLACK-SILENCE.html"),out=path.resolve(process.argv[3]||".dream-loop/sewer-kick");
const raw=fs.readFileSync(input,"utf8"),anchor="Jk();ju();Yy();X$(J$);D0t();";
assert(raw.includes("SEWER_WORKS_BEGIN")&&raw.includes(anchor));fs.mkdirSync(out,{recursive:true});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sewerKick-")),file=path.join(dir,"test.html");
const seam=`
let controlled=false,enemy=null;const realMove=m_,realEnemy=qtt,realWeapon=v$;
m_=function(dt){if(!controlled)realMove(dt);};qtt=function(dt){if(!controlled)realEnemy(dt);};v$=function(dt){if(!controlled)realWeapon(dt);};
window.__bedKick={
 load(){window.__BLACK_SILENCE_QA.load(5);sk();V5(false);const boss=v.bossRef;if(boss?.dormant)bk(boss);if(v.cine)stt(v.cine.dur+.1);},
 setup(dx,dz,x,z){
  const q=window.__BLACK_SILENCE_QA;q.resetCombat();controlled=true;T.kickCd=0;Be.inputLock=false;
  for(const old of v.enemies){J.scene.remove(old.sp,old.blob)}v.enemies.length=0;
  const px=x-dx*4,pz=z-dz*4;Object.assign(C,{px,pz,pyy:ie(px,pz)+Yo,vx:0,vz:0,vy:0,grounded:true,spawnGuard:100});
  Object.assign(Ct,{yaw:Math.atan2(-dx,-dz),pitch:0,firing:false});q.setCamera();
  enemy=Du("z",x,z,true);Object.assign(enemy,{hp:200,maxhp:200,aware:true,flingCD:100,cool:10,flank:0});return {player:[px,pz],target:[x,z],playerClear:!fu(px,pz),targetClear:!d0(x,z)};
 },
 run(){for(let i=0;i<13;i++)realMove(1/60);return {speed:Math.hypot(C.vx,C.vz),keys:[!!li.ShiftLeft,!!li.KeyW],distance:Math.hypot(C.px-enemy.x,C.pz-enemy.z)};},
 flight(){const q=window.__BLACK_SILENCE_QA,trace=[];for(let i=0;i<230;i++){
  if(i===50)li.KeyS=true;
  if(i===94)li.KeyS=false;
  realMove(1/60);realWeapon(1/60);realEnemy(1/60);C.spawnGuard=100;const e=enemy;
  trace.push({i,x:e.x,z:e.z,hp:e.hp,flung:e.flung,fy:e.fy,drop:!!q.melee()?.drop,stun:e.stun,bed:d0(e.x,e.z),radius:e.r,y:e.sp.position.y});
 }return trace;},state(){return {drop:!!window.__BLACK_SILENCE_QA.melee()?.drop};}
};`;
fs.writeFileSync(file,raw.replace(anchor,()=>seam+anchor));
(async()=>{const browser=await chromium.launch({channel:"chrome",headless:true});try{
 const page=await browser.newPage({viewport:{width:800,height:450}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(pathToFileURL(file).href+"?qa=1");await page.locator("#mNew").click();await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.Be.started);
 const run=(n,...args)=>page.evaluate(([n,a])=>__bedKick[n](...a),[n,args]);await run("load");await page.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);
 const records=[];
 for(const [label,dx,dz,x,z] of [["bed front",0,-1,87,36],["bed and north-wall approach",.6,-.8,88,35.95]]){
  const start=await run("setup",dx,dz,x,z);assert(start.playerClear&&start.targetClear,JSON.stringify(start));
  await page.keyboard.down("ShiftLeft");await page.keyboard.down("KeyW");const sprint=await run("run");assert(sprint.keys.every(Boolean)&&sprint.speed>7,JSON.stringify(sprint));
  await page.mouse.click(400,225,{button:"right"});const kick=await run("state");assert(kick.drop,JSON.stringify(kick));
  await page.keyboard.up("KeyW");await page.keyboard.up("ShiftLeft");const tr=await run("flight");
  const launch=tr.find(s=>s.flung>0),wall=tr.find(s=>launch&&s.i>launch.i&&s.hp<launch.hp),last=tr.at(-1);
  const clearance=s=>Math.hypot(Math.max(81.17-s.x,0,s.x-92.9075),Math.max(31.63-s.z,0,s.z-33.38))-s.radius;
  const minClear=Math.min(...tr.map(clearance)),movingAgain=wall?Math.hypot(last.x-wall.x,last.z-wall.z):0;
  const record={label,start,sprint,launch,wall,last,minClear,movingAgain,phase:tr.filter((s,i)=>i%15===0)};records.push(record);
  fs.writeFileSync(path.join(out,"kick.json"),JSON.stringify({inputSHA256:crypto.createHash("sha256").update(raw).digest("hex"),records,errors},null,2));
  assert(launch&&wall&&last.hp>0&&last.flung===0&&!last.bed&&minClear>-.015&&tr.some(s=>s.i>120&&s.stun<=0)&&movingAgain>.12,JSON.stringify(record));
 }
 assert.deepEqual(errors,[]);console.log("PASS",JSON.stringify(records.map(r=>[r.label,r.last.hp,r.minClear,r.movingAgain])));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{fs.unlinkSync(file);fs.rmdirSync(dir);});

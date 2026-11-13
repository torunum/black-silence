// Offline, instrumented copy of the native game. node tools/vigil-secret-tests.cjs [game.html] [evidence directory]
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const root = path.resolve(__dirname,"..");
const input = path.resolve(process.argv[2] || path.join(root,"THE-BLACK-SILENCE.html"));
const output = path.resolve(process.argv[3] || path.join(root,".dream-loop","vigil-tests"));
const privateDir = fs.mkdtempSync(path.join(os.tmpdir(),"vigil-"));
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const html = fs.readFileSync(input,"utf8");
const source = fs.readFileSync(path.join(root,"src","vigil-secret.js"),"utf8").trim();
const injected = !html.includes("/* CHAPEL_VIGIL_BEGIN */");
assert(injected || html.includes(source),"Integrated module matches source");
assert.equal(html.split(anchor).length,2);
const fixture = path.join(privateDir,"study.html");
const probe = `
let tolls=0,recording=null,processor=null,mute=null;
const actualEvent=nt, actualRoute=ar;
nt=function(name,fn){
  if(name!=="churchBells" || !Of || Of.x!==67.64) return actualEvent(name,fn);
  tolls++;
  // Tap the actual bell's positional output for a waveform, preserving the
  // game's audio destination, event trim, envelope, and synthesis code.
  const ac=It(); recording={hz:ac.sampleRate,blocks:[],started:false};
  processor=ac.createScriptProcessor(1024,2,1); mute=ac.createGain(); mute.gain.value=0;
  processor.connect(mute); mute.connect(ac.destination);
  processor.onaudioprocess=e=>{
    if(!recording||recording.blocks.length>Math.ceil(3.6*ac.sampleRate/1024))return;
    const l=e.inputBuffer.getChannelData(0),r=e.inputBuffer.getChannelData(1);
    if(!recording.started&&!l.some(x=>Math.abs(x)>1e-5)&&!r.some(x=>Math.abs(x)>1e-5))return;
    recording.started=true;recording.blocks.push(Float32Array.from(l,(v,i)=>(v+r[i])*.5));
  };
  ar=()=>{const real=actualRoute();real.connect(processor);return real};
  try{return actualEvent(name,fn)}finally{ar=actualRoute}
};
const shell=()=>v.items.find(i=>i.kind==="shells"&&i.x===69.07&&i.z===10.71);
function aim(x,z,y){
  Ct.yaw=Math.atan2(x-C.px,z-C.pz)+Math.PI;
  Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(x-C.px,z-C.pz));
  window.__BLACK_SILENCE_QA.setCamera();
}
function pose(x,z,tx,tz,y=5.45){
  C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vz=C.vy=0;C.grounded=true;
  aim(tx,tz,y);
}
function step(time){
  V5(false);
  for(let i=0;i<time;i++){m_(1/60);H_(1/60);VJ(1/60);v$(1/60);G$(1/60);F$(1/60);z$(1/60);SK(1/60);Wb(1/60);}
}
window.__vigil={
 pose,aim,step,
 walk(x,z){
   let ticks=0;
   for(;ticks<720;ticks++){
     const dx=x-C.px,dz=z-C.pz,d=Math.hypot(dx,dz);
     if(d<.14)break;
     aim(x,z,C.pyy);
     li.KeyW=(C.vx*dx+C.vz*dz)/d<Math.min(5,d*4);
     step(1);
   }
   li.KeyW=false;C.vx=C.vz=0;
   if(ticks===720)throw Error("Stalled at "+[C.px,C.pz]+" moving to "+[x,z]);
   return ticks;
 },
 snapshot(){
   const item=shell(),door=v.doors["34,5"];
   return {open:door?.open,doorY:door?.mesh.position.y,rotation:J.scene.getObjectByName("vigilBell")?.rotation.z,
     count:T.secrets,total:T.secretsTotal,all:T.totSecrets,ammo:T.ammo.shells,gun:!!T.weapons[1],tolls,busy:oo.busy,
     taken:item?.taken??false,base:item? v.items.indexOf(item)<Q0.base.items:false,
     col:[d0(68.3,11),d0(71,11),d0(69.2,9),d0(69.2,13)],x:C.px,z:C.pz,hp:T.hp,
     lights:J.scene.getObjectByName("chapelVigil")?.children.filter(o=>o.isLight).length||0,
     present:!!J.scene.getObjectByName("chapelVigil"),marks:Q0.marks.map(m=>[m.x,m.z])}
 },
 save(){const m=Q0.marks.find(m=>!m.lit);if(!m)throw Error("No unlit native shrine");pose(m.x,m.z,m.x+1,m.z);QX(.016);return Q0.snap},
 restore(){C.spawnGuard=0;ta(10000,true);if(!T.dead||!s_())throw Error("Shrine restore failed")},
 grade(){const shots=T.shots,hits=T.hitsLanded,kills=T.kills;T.shots=10;T.hitsLanded=6;T.kills=T.enemiesTotal;
    const score=L6(); T.shots=shots;T.hitsLanded=hits;T.kills=kills;return score;},
 finishTarget(){const e=Du("z",C.px+.75,C.pz,true);e.hp=1;e.stagger=4;e.fy=ie(e.x,e.z);C.spawnGuard=99;return !!Rk()},
 clearTarget(){const e=ve.e;Kw();if(e){e.dead=e.gone=true;J.scene.remove(e.sp,e.blob)}},
 audio(){if(!recording?.blocks.length)return null;processor.disconnect();mute.disconnect();processor.onaudioprocess=null;
   return {rate:recording.hz,samples:Array.from(Float32Array.from(recording.blocks.flatMap(b=>Array.from(b))))};},
 skip(){sk();},silence(){step(360);},finishFixtures(){C.spawnGuard=99;},
};
`;
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(fixture,html.replace(anchor,()=> (injected ? source+"\n" : "")+probe+anchor));

function writeAudio(data) {
  assert(data,"Successful E emitted an audible toll");
  const {rate,samples}=data;
  const peak=Math.max(...samples.slice(0,rate/3).map(Math.abs));
  const rms=(start,end)=>{
    const window=samples.slice(Math.floor(start*rate),Math.floor(end*rate));
    return Math.sqrt(window.reduce((sum,x)=>sum+x*x,0)/window.length);
  };
  assert(samples.length>=rate*2.9 && peak>.003 && peak<1,"Audible, unclipped strike and tail");
  const early=rms(.04,.24),tail=rms(1.4,1.65);
  assert(tail>0 && early>tail*3,"Toll decays after the strike");
  const buffer=Buffer.alloc(44+samples.length*2);
  buffer.write("RIFF");buffer.writeUInt32LE(buffer.length-8,4);buffer.write("WAVEfmt ",8);
  buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);
  buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*2,28);buffer.writeUInt16LE(2,32);
  buffer.writeUInt16LE(16,34);buffer.write("data",36);buffer.writeUInt32LE(samples.length*2,40);
  samples.forEach((value,i)=>buffer.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+i*2));
  fs.writeFileSync(path.join(output,"toll.wav"),buffer);
  return {rate,seconds:samples.length/rate,peak,earlyRms:early,tailRms:tail};
}

(async()=>{
  const browser=await chromium.launch({channel:"chrome",headless:true,
    args:["--autoplay-policy=no-user-gesture-required","--allow-file-access-from-files"]});
  try {
    const page=await browser.newPage({viewport:{width:1120,height:630}});
    const errors=[],network=[];
    page.on("pageerror",e=>errors.push(e.message));
    await page.route(/^https?:/,route=>{network.push(route.request().url());return route.abort()});
    page.on("console",m=>{if(m.type()==="error")console.error(m.text().slice(0,180));});
    await page.goto(pathToFileURL(fixture).href+"?qa=1");
    await page.locator("#mNew").click();
    await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.Be.started);
    await page.evaluate(()=>window.__vigil.skip());
    await page.waitForFunction(()=>!window.__BLACK_SILENCE_QA.Be.inputLock);
    const state=()=>page.evaluate(()=>__vigil.snapshot());
    const key=()=>page.keyboard.press("KeyE");
    const pose=(...args)=>page.evaluate(a=>__vigil.pose(...a),args);
    const capture=async name=>{
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.screenshot({path:path.join(output,name+".png")});
    };
    const initial=await state();
    assert(initial.present && initial.base && !initial.open && initial.total===1,JSON.stringify({initial,errors}));
    assert.deepEqual(initial.col,[true,true,true,true]);
    console.log("Loaded chapel",JSON.stringify(initial));
    await page.evaluate(()=>{__vigil.silence();__vigil.finishFixtures()});
    await pose(50.9,11.9,68,11,5.7);
    await capture("approach");
    await key();assert.equal((await state()).open,false,"Too far");
    await pose(70.2,9.0,68.5,11,5.4);
    await key();assert.equal((await state()).open,false,"Outside reach around adjoining masonry");
    await pose(72.4,11,68,11);await key();
    assert.equal((await state()).open,false,"Back wall stops the interaction ray");
    await pose(67.05,11,55,9);await key();assert.equal((await state()).open,false,"Facing away");
    // Walk across the altar pickup, then approach the wall via its aisle.
    await pose(55.8,10.8,59,9);
    const walked=await page.evaluate(()=>[[59,9],[60.2,9.1]].map(p=>__vigil.walk(...p)));
    await page.evaluate(()=>{__vigil.aim(68,11,5.78);__vigil.silence()});
    await capture("altar-view");
    await page.evaluate(()=>{__vigil.walk(66.18,10.60);__vigil.aim(68,11,5.58);__vigil.silence()});
    const gradeClosed=await page.evaluate(()=>__vigil.grade());
    const closed=await state();
    assert(closed.gun && !closed.taken && !closed.open);
    await capture("closed");
    await key();assert((await state()).open,JSON.stringify(await state()));
    const strike=await state();assert.equal(strike.tolls,1);assert.equal(strike.count,1);assert.equal(strike.all,initial.all+1);
    await key();
    await capture("strike");
    await page.evaluate(()=>__vigil.step(310));
    const opened=await state();assert(opened.doorY<closed.doorY-3 && !opened.taken && opened.tolls===1);
    await capture("opened");
    await page.waitForTimeout(3800);
    const audio=writeAudio(await page.evaluate(()=>__vigil.audio()));
    console.log("Rendered bell",JSON.stringify(audio));
    const gradeOpen=await page.evaluate(()=>__vigil.grade());
    assert.equal(gradeClosed,"B");assert.equal(gradeOpen,"A");
    await page.evaluate(()=>{__vigil.save();__vigil.restore()});
    const restoredOpen=await state();
    assert(restoredOpen.open&&!restoredOpen.taken && restoredOpen.ammo===closed.ammo && restoredOpen.tolls===1);
    await pose(66.35,11,68,11);
    await page.evaluate(()=>__vigil.walk(68.35,10.71));
    const reward=await state();
    assert(reward.taken && reward.ammo===closed.ammo+6 && reward.count===1);
    await key();await page.evaluate(()=>{__vigil.walk(66.35,11);__vigil.walk(68.35,10.71)});
    assert.equal((await state()).ammo,reward.ammo);
    // Each shrine lights once per life. Use a second chapter visit so the
    // same real checkpoint can separately snapshot an already collected cache.
    await page.evaluate(()=>{__BLACK_SILENCE_QA.load(0);__vigil.skip();__vigil.pose(65.95,11,68,11);});
    assert(await page.evaluate(()=>__vigil.finishTarget()),"Finisher valid in front of shutter");
    await key();const finisher=await state();assert(finisher.busy&&!finisher.open);
    await page.evaluate(()=>{__vigil.clearTarget();__vigil.pose(65.95,11,68,11);});
    await key();await page.evaluate(()=>{__vigil.step(110);__vigil.walk(68.35,10.71);});
    const secondReward=await state();
    await page.evaluate(()=>{__vigil.save();__vigil.restore()});
    const restoredTaken=await state();
    assert(restoredTaken.taken&&restoredTaken.open&&restoredTaken.ammo===secondReward.ammo&&restoredTaken.all===secondReward.all&&restoredTaken.tolls===secondReward.tolls);
    await page.evaluate(()=>__BLACK_SILENCE_QA.load(1));const dungeon=await state();
    assert(!dungeon.present && dungeon.total===2);
    await page.evaluate(()=>{__BLACK_SILENCE_QA.load(0);__vigil.skip()});const fresh=await state();
    assert(fresh.present&&!fresh.open&&!fresh.taken&&fresh.total===1&&fresh.count===0);
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    const report={hash:crypto.createHash("sha256").update(html).digest("hex"),privateModuleInjection:injected,
      initial,walked,closed,strike,opened,audio,gradeClosed,gradeOpen,restoredOpen,reward,finisher,secondReward,restoredTaken,dungeon,fresh,errors,network};
    fs.writeFileSync(path.join(output,"verification.json"),JSON.stringify(report,null,2)+"\n");
    console.log("PASS chapel vigil");
  }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>{
  if(fs.existsSync(fixture))fs.unlinkSync(fixture);
  fs.rmdirSync(privateDir);
});

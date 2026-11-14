// Walk and jump through the normal keyboard + movement path. Record the actual
// generated footfall buses, including envelopes and room routing, separately
// from the music and enemy buses. No reference samples are used in the waveform.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const assert=require("node:assert/strict"),{chromium}=require("playwright"),{pathToFileURL}=require("node:url");
const root=path.resolve(__dirname,".."),input=path.resolve(process.argv[2]||"THE-BLACK-SILENCE.html"),out=path.resolve(process.argv[3]||".dream-loop/sewer-footing");
const src=fs.readFileSync(input,"utf8"),mod=fs.readFileSync(path.join(root,"src/sewer-works.js"),"utf8").trim(),anchor="Jk();ju();Yy();X$(J$);D0t();";
const marker="/* SEWER_WORKS_BEGIN */",present=src.includes(marker);assert(!present||src.includes(mod),"Shipped module matches source");
const source=present?src:src.replace(anchor,()=>mod+"\n"+anchor);
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"footing-")),fixture=path.join(dir,"sound.html");
fs.mkdirSync(out,{recursive:true});
const seam=`
const swEvents=[];let lane="",grab=false,swBlocks=[],swProcessor=null,swMuted=null,swSink=null;
const swUI=UI,swLI=LI,swEvent=nt,swRoute=ar;
const swMove=m_;
// Give the keyboard's real movement integrator one fixed clock. A busy
// renderer can otherwise advance it a second time between Playwright calls.
m_=function(dt){if(!lane)return swMove(dt);};
UI=function(run,marble,ground){
  swEvents.push({name:"step",lane,ground:ground??N4(marble),explicit:ground!==undefined,run:!!run,px:C.px,pz:C.pz,grounded:C.grounded,speed:Math.hypot(C.vx,C.vz),room:L4().wanted});
  return swUI.apply(this,arguments);
};
LI=function(impact,marble,ground){
  swEvents.push({name:"landing",lane,ground:ground??N4(marble),explicit:ground!==undefined,impact,px:C.px,pz:C.pz,room:L4().wanted});
  return swLI.apply(this,arguments);
};
nt=function(name,fn){
 if(!grab || (!name.startsWith("footstep")&&name!=="landing"))return swEvent.apply(this,arguments);
 const route=ar;
 ar=()=>{
   // Only tap this voice, before it joins a shared room bus.
   const actual=route(),capture=It().createGain();
   capture.connect(actual);capture.connect(swSink);return capture;
 };
 try{return swEvent.apply(this,arguments);}finally{ar=route;}
};
window.__surface={
 load(i){window.__BLACK_SILENCE_QA.load(i);sk();V5(false);C.spawnGuard=100;},
 prepare(){
   const ac=It();if(!ac)throw Error("AudioContext unavailable");
   swProcessor=ac.createScriptProcessor(1024,1,1);swMuted=ac.createGain();swMuted.gain.value=0;
   swSink=ac.createGain();swSink.connect(swProcessor);swProcessor.connect(swMuted);swMuted.connect(ac.destination);
   swProcessor.onaudioprocess=e=>{if(grab&&swBlocks.length<900)swBlocks.push(Float32Array.from(e.inputBuffer.getChannelData(0)));};
   return ac.resume().then(()=>ac.sampleRate);
 },
 record(v){grab=v;},
 pose(tag,x,z,yaw){
   lane=tag;V5(false);C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vz=C.vy=0;C.grounded=true;Ct.yaw=yaw;Ct.pitch=0;C.spawnGuard=100;
   C.bobT=0;C.lastBobSin=-1;li.KeyW=li.Space=false;
   return {x,z,floor:ie(x,z),solid:fu(x,z),room:L4().wanted};
 },
 clock(n){for(let i=0;i<n;i++)swMove(1/60);return {x:C.px,z:C.pz,y:C.pyy,grounded:C.grounded,dead:T.dead};},
 actors(){return v.enemies.length;},
 site(){const m=gV[5].build(),grates=m.decor.filter(p=>p.k==="grate").map(p=>({x:(p.x+.5)*P,z:(p.z+.5)*P}));
   return {width:m.W,height:m.H,water:eJ(m.g,m.water),grates};},
 events(){return swEvents.slice();},
 audio(){grab=false;swSink.disconnect();swProcessor.disconnect();swMuted.disconnect();
   swProcessor.onaudioprocess=null;return {samples:Array.from(Float32Array.from(swBlocks.flatMap(a=>Array.from(a)))),rate:It().sampleRate};},
 seam(){return [UI===swUI,LI===swLI];},
 legacy(){return {wanted:L4().wanted,surface:N4(T.level===1)};}
};`;
fs.writeFileSync(fixture,source.replace(anchor,()=>seam+anchor));
function saveClip({rate,samples}){
  const max=samples.reduce((v,n)=>Math.max(v,Math.abs(n)),0);
  assert(rate>22050&&max>.005,"Native SE voice produced measurable sound");
  let start=samples.findIndex(n=>Math.abs(n)>.001),end=samples.findLastIndex(n=>Math.abs(n)>.001);
  start=Math.max(0,start-Math.round(.08*rate));end=Math.min(samples.length,end+Math.round(.13*rate));
  // One fixed factor for the entire clip preserves the relative native levels.
  const gain=Math.min(1,.88/max),data=samples.slice(start,end),wav=Buffer.alloc(44+data.length*2);
  wav.write("RIFF");wav.writeUInt32LE(wav.length-8,4);wav.write("WAVEfmt ",8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write("data",36);wav.writeUInt32LE(data.length*2,40);
  data.forEach((v,i)=>wav.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(v*gain*32767))),44+2*i));
  fs.writeFileSync(path.join(out,"water-stone-metal.wav"),wav);
  return {sampleRate:rate,samples:data.length,seconds:data.length/rate,peakBeforePCM:max,fixedGain:gain,scope:"Dry taps of the native footfall and landing voices before their shared room bus."};
}
(async()=>{const b=await chromium.launch({channel:"chrome",headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
try{
 const page=await b.newPage({viewport:{width:960,height:540}}),errors=[],network=[];
 page.on("pageerror",e=>{errors.push(e.message);console.error(e.message);});
 await page.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
 await page.goto(pathToFileURL(fixture).href+"?qa=1");await page.locator("#mNew").click();await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.Be.started);
 const call=(n,...p)=>page.evaluate(([n,...a])=>__surface[n](...a),[n,...p]);await call("load",5);
 await page.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);await call("prepare");
 const site=await call("site");const grate=site.grates.find(g=>Math.abs(g.x-101.28)<.4&&Math.abs(g.z-49)<.4);assert(grate,"Expected real station-floor grate");
 const records=[];
 async function pace(tag,x,z,yaw,ground,run=false,walkFrames=38){
   const p=await call("pose",tag,x,z,yaw);assert(!p.solid,"Unobstructed test surface "+tag);
   if(run)await page.keyboard.down("ShiftLeft");await page.keyboard.down("KeyW");
   // Real keys feed the native physics clock; short measured advances schedule
   // audible step transients naturally in WebAudio time instead of all at once.
   for(let i=0;i<walkFrames;i+=3){await call("clock",Math.min(3,walkFrames-i));await page.waitForTimeout(27);}
   await page.keyboard.up("KeyW");if(run)await page.keyboard.up("ShiftLeft");
   await call("pose",tag,x,z,yaw);await page.keyboard.down("Space");await call("clock",3);await page.keyboard.up("Space");
   for(let i=0;i<51;i+=3){await call("clock",3);await page.waitForTimeout(18);}
   await page.waitForTimeout(230);const events=(await call("events")).filter(e=>e.lane===tag);
   assert(events.length>0,tag);const land=events.filter(e=>e.name==="landing");
   assert(land.some(e=>e.ground===ground && e.impact>3),JSON.stringify({tag,land}));
   const steps=events.filter(e=>e.name==="step");assert(steps.some(e=>e.ground===ground&&e.run===run&&e.grounded&&e.speed>1),JSON.stringify({tag,steps}));
   records.push({tag,expected:ground,steps:steps.map(s=>s.ground),landings:land.map(s=>[s.ground,s.impact]),room:p.room,origin:p});
 }
 await call("record",true);
 await pace("open water",26.25,77.35,-Math.PI/2,"water");
 await pace("dry brick towpath",34.15,74.83,-Math.PI/2,"stone",true);
 await pace("inspector's valve",103.4,36.92,0,"stone",false,10);
 await pace("floor grating",grate.x,grate.z,Math.PI/2,"metal",false,5);
 await call("record",false);const audio=saveClip(await call("audio"));
 const wet=(await call("events")).filter(e=>e.name==="step"&&e.lane==="open water");assert(wet.every(e=>e.ground==="water"),JSON.stringify(wet));
 const elsewhere=[];for(const level of [1,6,0]){
   await call("load",level);await page.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);
   const g=await page.evaluate(()=>{const q=__BLACK_SILENCE_QA;return [q.C.px,q.C.pz]});
   const expected=await call("legacy");await call("pose","level"+level,g[0],g[1],0);
   await page.keyboard.down("Space");await call("clock",4);await page.keyboard.up("Space");await call("clock",65);
   const e=(await call("events")).filter(e=>e.lane==="level"+level&&e.name==="landing");assert(e.some(k=>!k.explicit && k.ground===expected.surface),JSON.stringify({level,e,expected}));elsewhere.push({level,expected,e});
 }
 await call("load",5);await page.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);const returned=await call("site");
 assert.deepEqual(returned.water,site.water);assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 const hash=v=>crypto.createHash("sha256").update(v).digest("hex");
 const report={inputSHA256:hash(src),candidateSHA256:hash(source),moduleSHA256:hash(mod),integrated:present,audio,waterCells:site.water.length,grates:site.grates.length,
   records,otherLevels:elsewhere,errors,network};fs.writeFileSync(path.join(out,"footing.json"),JSON.stringify(report,null,2)+"\n");
 console.log("PASS water, stone and iron",JSON.stringify({records:records.map(r=>[r.tag,r.steps.length,r.landings.length]),audio}));
}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{fs.unlinkSync(fixture);fs.rmdirSync(dir);});

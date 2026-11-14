// Exercise the shipped native input, collision, shrine, scoring and chapter gates offline.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const root = path.resolve(__dirname, "..");
const htmlPath = path.resolve(process.argv[2] || path.join(root, "THE-BLACK-SILENCE.html"));
const out = path.resolve(process.argv[3] || path.join(root,".dream-loop","sidereal-proof"));
const dir = fs.mkdtempSync(path.join(os.tmpdir(),"sidereal-proof-")), fixture=path.join(dir,"test.html");
fs.mkdirSync(out,{recursive:true});
const anchor="Jk();ju();Yy();X$(J$);D0t();";
const marker="/* THE_SIDEREAL_PASSAGE_BEGIN */";
const html=fs.readFileSync(htmlPath,"utf8");
const mod=fs.readFileSync(path.join(root,"src","monastery-nov14.js"),"utf8").trim();
const already=html.includes(marker);
assert(!already || html.includes(mod),"Integrated module matches the current source");
assert.equal(html.split(anchor).length,2);
const previous="window.__priorSidereal=gV[9].build;";
const seam=`
const passageDoor=()=>v.doors["77,43"];
const sPose=(x,z,tx,tz,dy=.2)=>{
  C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vy=C.vz=0;C.grounded=true;
  Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;Ct.pitch=Math.atan2(dy,Math.hypot(tx-x,tz-z));
  J.camera.position.set(C.px,C.pyy,C.pz);J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
  J.camera.updateMatrixWorld(true);TR(0,true);
};
const sAim=(which,mode)=>{
  let x=which===0?152.28:157.72;
  if(mode==="away")sPose(x,89.7,x,95);
  else if(mode==="far")sPose(x,92.6,x,88.38);
  else if(mode==="behind")sPose(x,87,x,88.38);
  else sPose(x,89.8,x,88.38,.3);
};
function sStep(n){for(let i=0;i<n;i++){m_(1/60);F$(1/60);G$(1/60);H_(1/60);Wb(1/60);SK(1/60);}}
function sWalk(x,z){
 let steps=0;
 for(;steps<480;steps++){
   const dx=x-C.px,dz=z-C.pz,range=Math.hypot(dx,dz);
   if(range<.12)break;
   Ct.pitch=0;Ct.yaw=Math.atan2(dx,dz)+Math.PI;
   li.KeyW=(C.vx*dx+C.vz*dz)/range<Math.min(5,range*4);
   sStep(1);
 }
 li.KeyW=false;C.vx=C.vz=0;
 if(steps>=480)throw Error("Stalled at "+[C.px,C.pz]+" walking to "+[x,z]);
 return steps;
}
function sSnapshot(){
 const d=passageDoor(),q=J.scene.getObjectByName("siderealPassage"),grate=J.scene.getObjectByName("siderealPortcullis");
 let tris=0,nodes=0,lights=0;for(const subtree of [q,grate])subtree?.traverse(o=>{
   if(o.isLight)lights++;if(o.isMesh){nodes++;tris+=(o.geometry.index?.count??o.geometry.getAttribute("position").count)/3;}
 });
 return {present:!!q,open:d?.open,y:d?.mesh.position.y,collision:d0(155,87),steps:FX().sidereal,angle:q?
  ["siderealMoon","siderealStar"].map(n=>q.getObjectByName(n).rotation.z):null,
  count:T.secrets,total:T.secretsTotal,all:T.totSecrets,gate:KH(41,27),
  seals:[...de.seals],bell:de.bell,boss:v.enemies.filter(e=>e.boss&&!e.dead).length,marks:Q0.marks.map(m=>[m.x,m.z]),
  x:C.px,z:C.pz,paused:Wk(),busy:oo.busy,rocks:[d0(153,85),d0(157,85)],
  hp:T.hp,drawNodes:nodes,triangles:tris,lights};
}
function sCompare(){
 function map(build){
   let noise=20261114;const rand=Math.random;Math.random=()=>{noise=(Math.imul(noise,1664525)+1013904223)>>>0;return noise/4294967296;};
   try{return build();}finally{Math.random=rand;}
 }
 const before=map(window.__priorSidereal), after=map(gV[9].build);
 const {g:a,hmap:b,cmap:c,...ba}=before,{g:x,hmap:y,cmap:z,...ab}=after;
 const changes=(p,q)=>p.flatMap((r,rz)=>r.flatMap((v,rx)=>v===q[rz][rx]?[]:[[rx,rz,v,q[rz][rx]]]));
 return {cells:changes(a,x),floor:changes(b,y),ceil:changes(c,z),others:JSON.stringify(ba)===JSON.stringify(ab),
    previousSecrets:a.flat().filter(v=>v==="S").length,exits:after.script.gates};
}
window.__passage={
  state:sSnapshot,compare:sCompare,pose:sPose,aim:sAim,walk:sWalk,step:sStep,
  pause:V5,skip:sk, resume(){V5(false);},
  save(){const m=Q0.marks.find(m=>!m.lit);if(!m)throw Error("No native unlit shrine");
    sPose(m.x,m.z,m.x+1,m.z);QX(.016);return Q0.snap;},
  rise(){C.spawnGuard=0;ta(10000,true);if(!T.dead || !s_())throw Error("Native death/shrine failed");C.spawnGuard=100;},
  finish(){const e=Du("z",C.px,C.pz-.64,true);e.hp=1;e.stagger=5;e.fy=ie(e.x,e.z);C.spawnGuard=100;return !!Rk();},
  skipFinish(){const e=ve.e;Kw();if(e){e.dead=e.gone=true;J.scene.remove(e.sp,e.blob);}},
  load(n){window.__BLACK_SILENCE_QA.load(n);C.spawnGuard=100;V5(false);},
  frame(args){V5(true);sPose(...args);Jt("pause").classList.add("hidden");Jt("subt").style.visibility="hidden";le("",0);},
  lock(){Be.inputLock=true;},unlock(){Be.inputLock=false;},
  gateClue(){sPose(155,89.8,155,87,.1);N$();return Jt("msg").textContent;},
  restoreLegacy(){const f=FX();delete f.sidereal;a_(f);},
  keyed(){de.seals.add("seal_ash");const one=KH(41,27);de.seals.add("seal_bell");const two=KH(41,27);
    de.seals.clear();return [one,two];}
};`;
const injected=already?html.replace(marker,()=>previous+"\n"+marker):html.replace(anchor,()=>previous+"\n"+mod+"\n"+anchor);
fs.writeFileSync(fixture,injected.replace(anchor,()=>seam+anchor));
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true,args:["--allow-file-access-from-files"]});
 try{
   const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],network=[];
   page.on("pageerror",e=>{console.error(e);errors.push(e.message);});
   await page.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
   await page.addInitScript(()=>{let s=53444;Math.random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};});
   await page.goto(pathToFileURL(fixture).href+"?qa=1");
   await page.locator("#mNew").click();await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.Be.started);
   await page.evaluate(()=>__passage.skip());await page.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);
   const call=(name,...args)=>page.evaluate(([n,...a])=>__passage[n](...a),[name,...args]);
   const key=()=>page.keyboard.press("KeyE");
   const press=async (i,n=1)=>{await call("aim",i);for(let j=0;j<n;j++)await key();};
   const state=()=>call("state");
   const capture=async (name,args)=>{await call("frame",args);await page.waitForTimeout(120);
     await page.screenshot({path:path.join(out,name+".png")});await call("resume");};
   const close=[155,93.25,155,87.9,.55];
   const diff=await call("compare");
   assert.equal(diff.others,true,"All previous map objects, items, script, actors, decor and zone definitions match");
   assert.deepEqual(diff.cells,[[77,41,"#","."],[77,42,"#","."],[77,43,"#","S"],[74,44,".","i"],[77,44,"i","."]]);
   assert.deepEqual(diff.floor,[[77,41,0,1.2],[77,42,0,1.2],[77,43,0,1.2]]);
   assert.deepEqual(diff.ceil,[[77,41,0,4.2],[77,42,0,4.2],[77,43,0,4.2]]);
   await call("load",9);await page.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);
   const closed=await state();assert(closed.present && !closed.open && closed.collision && closed.boss>0 && !closed.bell);
   assert.deepEqual(closed.steps,[0,2]);assert.equal(closed.total,diff.previousSecrets+1);
   assert.equal(closed.lights,0);assert(closed.drawNodes<32 && closed.triangles<9500);
   assert.deepEqual(closed.rocks,[true,true]);assert(closed.gate.block && closed.gate.gate);
   await capture("closed",close);
   await capture("approach",[151.3,103.5,155,88,.45]);
   await capture("oblique",[151.8,94.7,154,88,.44]);
   for(const mode of ["away","far","behind"]){await call("aim",0,mode);await key();assert.deepEqual((await state()).steps,[0,2],mode);}
   await call("aim",0);await call("pause",true);await key();await call("resume");assert.deepEqual((await state()).steps,[0,2],"Pause");
   await call("lock");await key();await call("unlock");assert.deepEqual((await state()).steps,[0,2],"Input lock");
   const clue=await call("gateClue");assert.match(clue,/MOON SETS WEST/);
   await call("aim",0);assert(await call("finish"),"Native close-range finisher target acquired");await key();
   const finisher=await state();assert(finisher.busy && !finisher.open && finisher.steps[0]===0,"Finisher takes priority");
   await call("skipFinish");
   await press(0,1);const partial=await state();assert.deepEqual(partial.steps,[1,2]);
   const partialSave=await call("save");assert.deepEqual(partialSave.facts.sidereal,[1,2]);
   await press(0,1);assert.deepEqual((await state()).steps,[2,2]);
   await call("rise");const partialRise=await state();assert.deepEqual(partialRise.steps,[1,2]);assert(!partialRise.open);
   await press(1,1);await press(0,2);assert.deepEqual((await state()).steps,[3,3]);
   await press(1);await call("step",150);
   const solved=await state();assert(solved.open && !solved.collision && solved.y<closed.y-2.8);
   assert.equal(solved.count,1);assert.deepEqual(solved.steps,[3,0]);
   assert.equal(solved.all,closed.all+1);assert.equal(solved.boss,closed.boss);assert.deepEqual(solved.gate,closed.gate);
   assert(!solved.bell && solved.seals.length===0);
   await capture("opened",close);
   await call("pose",155,90.3,155,80,0);
   const walk=[];
   for(const z of [87.1,84.2,81.2,79.3,76.9])walk.push(await call("walk",155,z));
   const crossed=await state();assert(crossed.z<77.1);
   await capture("library",[155,77.4,155,89,.30]);
   await capture("tunnel",[155,86.6,154.5,78,.12]);
   await call("pose",155,79.3,155,89,0);
   for(const z of [81,84.3,87.4,90.3])walk.push(await call("walk",155,z));
   await press(1,3);assert.equal((await state()).count,1);
   const solvedSave=await call("save");assert(solvedSave.facts.opened.includes("77,43"));
   await call("rise");const solvedRise=await state();assert(solvedRise.open && !solvedRise.collision);
   assert.deepEqual(solvedRise.steps,[3,0]);assert.equal(solvedRise.count,1);
   const seals=await call("keyed");assert(seals[0].block&&!seals[1].block&&seals[1].gate);
   await call("load",1);const elsewhere=await state();assert(!elsewhere.present && elsewhere.steps===undefined);
   await call("load",9);const fresh=await state();assert(!fresh.open && fresh.count===0);assert.deepEqual(fresh.steps,[0,2]);
   await call("restoreLegacy");assert.deepEqual((await state()).steps,[0,2]);
   // Every wrong detent can be recovered. The opposite input order also solves from a fresh visit.
   await press(0,4);await press(1,4);assert.deepEqual((await state()).steps,[0,2]);
   await press(1,2);await press(0,3);assert((await state()).open);
   assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
   const sha=value=>crypto.createHash("sha256").update(value).digest("hex");
   const candidate=already?html:html.replace(anchor,()=>mod+"\n"+anchor);
   const report={baseHTMLSHA256:sha(html),verifiedModuleSHA256:sha(mod),
     moduleHashScope:"UTF-8 source with leading/trailing whitespace trimmed",
     assembledCandidateSHA256:sha(candidate),integratedStandaloneSHA256:already?sha(html):null,
     instrumentedFixtureSHA256:sha(fs.readFileSync(fixture)),privateModuleInjection:!already,
     diff,closed,clue,partialRise,solved,crossed,walk,solvedRise,fresh,seals,errors,network};
   fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(report,null,2)+"\n");
   console.log("PASS sidereal passage",JSON.stringify({total:closed.total,steps:walk.length,drawNodes:closed.drawNodes,triangles:closed.triangles}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{fs.unlinkSync(fixture);fs.rmdirSync(dir);});

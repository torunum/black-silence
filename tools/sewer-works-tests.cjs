// Native file:// controls, geometry and checkpoint verification for the sewage works.
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict");
const crypto=require("node:crypto"),{chromium}=require("playwright"),{pathToFileURL}=require("node:url");
const root=path.resolve(__dirname,".."),input=path.resolve(process.argv[2]||"THE-BLACK-SILENCE.html"),out=path.resolve(process.argv[3]||".dream-loop/sewer-works-test");
const sha=d=>crypto.createHash("sha256").update(d).digest("hex"),raw=fs.readFileSync(input,"utf8"),mod=fs.readFileSync(path.join(root,"src/sewer-works.js"),"utf8").trim();
fs.mkdirSync(out,{recursive:true});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"works-")),file=path.join(tmp,"works.html"),a="Jk();ju();Yy();X$(J$);D0t();",m="/* SEWER_WORKS_BEGIN */";
assert.equal(raw.split(a).length,2);const present=raw.includes(m);assert(!present||raw.includes(mod),"Shipped sewer module matches source");
const candidate=present?raw:raw.replace(a,()=>mod+"\n"+a);
const before="window.__beforeWorksTick=F$;window.__beforeWorksBuild=gV[5].build;";
const probe=`
const wFind=n=>J.scene.getObjectByName(n),wFloor=()=>ie(86.72,32.45),wKeys=["sewerWorks","worksPressureStand","worksDrainMouth","worksOutfallCollar"];
const wFrames=n=>{for(let i=0;i<n;i++){F$(1/60);SK(1/60);Wb(1/60)}};
let wAudio=0;const wEvent=nt;nt=function(kind,fn){if(kind==="doorGate" && Of?.x===105.64)wAudio++;return wEvent.apply(this,arguments);};
 function wPose(x,z,tx,tz,y){
 if(v.cine)stt(v.cine.dur+1/60);
 V5(false);C.px=x;C.pz=z;C.pyy=ie(x,z)+Yo;C.vx=C.vz=C.vy=0;C.grounded=true;
 Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(tx-x,tz-z));
 J.camera.position.set(x,C.pyy,z);J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");J.camera.updateMatrixWorld(true);
}
function wState(){
 const fly=wFind("worksFlywheel"),lever=wFind("worksValve"),needle=wFind("worksGaugeNeedle"),slider=wFind("worksCrosshead"),coupler=wFind("worksCouplingBar"),connecting=wFind("worksConnectingRod");
 const door=v.doors["53,19"],base={x:C.px,z:C.pz,hp:T.hp,busy:oo.busy,key:T.key,level:T.level,machine:!!fly,audio:wAudio,
   primed:FX().sewerPrimed===true,door:door?.open,secrets:T.secrets,all:T.totSecrets,total:T.secretsTotal,hasReward:!!T.weapons[6],shrine:Q0.marks.length,
   exit:[v.exitPos?.x,v.exitPos?.z],marks:Q0.marks.map(m=>[m.x,m.z]),enemies:v.enemies.length};
 if(!fly)return base;
 return {...base,angle:fly.rotation.z,idler:wFind("worksDeliveryWheel").rotation.z,valve:lever.rotation.z,needle:needle.rotation.z,rodAngle:connecting.rotation.z,pin:connecting.position.toArray(),
   cross:slider.position.toArray(),coupler:coupler.position.toArray(),leak:wFind("worksPressureLeak").children.map(x=>x.visible)};
}
function shape(){
 const geometry=new Set(),materials=new Set(),maps=new Set();let meshes=0,tri=0,lights=0;
 for(const name of wKeys){wFind(name).traverse(n=>{
   if(n.isLight)lights++;
   if(!n.isMesh)return;
   meshes++;geometry.add(n.geometry);tri+=(n.geometry.index?.count??n.geometry.getAttribute("position").count)/3;
   for(const m of Array.isArray(n.material)?n.material:[n.material]){materials.add(m);if(m.map?.name?.startsWith("sewerWorks_"))maps.add(m.map);}
 });}
 return {geometry,materials,maps,meshes,tri,lights};
}
function wWalk(x,z){
 let ticks=0;for(;ticks<500;ticks++){
  const dx=x-C.px,dz=z-C.pz,d=Math.hypot(dx,dz);if(d<.14)break;
  Ct.yaw=Math.atan2(dx,dz)+Math.PI;Ct.pitch=0;li.KeyW=(C.vx*dx+C.vz*dz)/d<Math.min(5,d*4);
  m_(1/60);F$(1/60);G$(1/60);SK(1/60);Wb(1/60);
 }
 li.KeyW=false;C.vx=C.vz=0;
 if(ticks===500)throw Error("Walk obstructed at "+[C.px,C.pz]+" heading for "+[x,z]);
 return ticks;
}
function wRoute(ax,az,bx,bz){
 const points=[[ax,az,0]],seen=new Set([ax+","+az]);
 for(let i=0;i<points.length;i++){
   const [x,z,d]=points[i];if(x===bx&&z===bz)return d;
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const nx=x+dx,nz=z+dz,key=nx+","+nz;
     if(nx<73||nx>105||nz<27||nz>51||seen.has(key)||fu(nx,nz)||fu(x+dx*.5,z+dz*.5))continue;
     seen.add(key);points.push([nx,nz,d+1]);
   }
 }return -1;
}
function wFire(){
 const x0=86.72,z0=32.45,f=wFloor(),r=1.45,a=wFind("worksFlywheel").rotation.z,cam=J.camera.position,old=cam.clone();
 const probes=[
   ["air",3.87,3.2,false],["spokeGap",-2.18+r*Math.cos(a+Math.PI/8),2.27+r*Math.sin(a+Math.PI/8),false],
   ["hub",-2.18,2.27,true],["piston",3.87,1.5,true],["spoke",-2.18+r*Math.cos(a),2.27+r*Math.sin(a),true],["plinth",0,.20,true]
 ];
 const report=[],native=tV;
 try{
   for(const [part,lx,ly,solid] of probes){
     const x=x0+1.25*lx,y=f+1.25*ly,z=z0,front=z+.99,rear=z-.87;
     // The vertical pipe is physically behind the air sample. Aim diagonally
     // across the gap above the pump so a clear ray also misses that pipe.
     const slope=part==="air"?2:0,norm=Math.hypot(slope,1),dir={x:slope/norm,y:0,z:-1/norm};
     const startX=x-slope*2.3;
     let hitZ=null;
     cam.set(startX,y,z+2.7);
     tV=function(px,py,pz){const hit=native(px,py,pz);if(hit && hitZ===null)hitZ=pz;return hit;};
     try{Ww(dir,1,1);}finally{tV=native;}
     cam.set(startX,y+.08,z+2.7);
     R$(dir,1);const projectile=yc[yc.length-1];let travel=0;
     while(yc.includes(projectile) && projectile.z>=rear-.1 && travel<48){C$(1/240);travel++;}
     const passed=yc.includes(projectile);
     if(passed)F1(projectile,yc.indexOf(projectile));
     report.push({part,x,y,solid,hitscanHitZ:hitZ,hitscanStopsAtMachine:hitZ!==null&&hitZ<=front&&hitZ>=rear,projectilePassed:passed,projectileEndZ:projectile.z,travel});
   }
 }finally{tV=native;cam.copy(old);}
 return report;
}
window.__works={
 state:wState,pose:wPose,step:wFrames,walk:wWalk,route:wRoute,fire:wFire,
 aim(mode){const f=wFloor();if(mode==="away")wPose(104.0,36.58,99,36.58,f+1.38);
   else if(mode==="far")wPose(101,36.58,105.41,36.58,f+1.38);
   else if(mode==="back")wPose(106.9,36.58,105.41,36.58,f+1.38);
   else wPose(104.0,36.58,105.41,36.58,f+1.38);
 },
 load(i){window.__BLACK_SILENCE_QA.load(i);sk();C.spawnGuard=100;V5(false);},
 settleIntro(){const guard=v.bossRef;if(guard?.dormant)bk(guard);if(v.cine)stt(v.cine.dur+1/60);},
 pause:V5,unlock(){Be.inputLock=false;},lock(){Be.inputLock=true;},
 finisher(){const e=Du("z",C.px+.63,C.pz,true);e.hp=1;e.stagger=5;e.fy=ie(e.x,e.z);C.spawnGuard=100;return !!Rk();},
 clear(){const e=ve.e;Kw();if(e){e.dead=e.gone=true;J.scene.remove(e.sp,e.blob);}},
 cupboard(){wPose(104.5,39.0,106.99,39.0,wFloor()+.85);},
 save(){const m=Q0.marks.find(m=>!m.lit);if(!m)throw Error("Need native shrine");wPose(m.x,m.z,m.x+1,m.z,ie(m.x,m.z)+Yo);QX(1/60);return Q0.snap;},
 rise(){C.spawnGuard=0;ta(10000,true);if(!T.dead||!s_())throw Error("Native shrine did not revive");C.spawnGuard=100;},
 facts(){const before=window.__beforeWorksBuild,after=gV[5].build;return {sameBuilder:before===after,
   cupboard:v.doors["53,19"].secret,bed:fu(87,32.4),nearSouth:fu(87,34.62),high:tV(85,8.10,32.42),low:tV(85,wFloor()+.22,32.42),locked:Object.entries(v.doors).filter(x=>x[1].locked).map(([k])=>k),
   reward:v.items.filter(i=>[109,111].includes(i.x) && i.z>=35&&i.z<=43).map(i=>[i.kind,i.x,i.z,!!i.taken]),allEntitiesClear:v.enemies.filter(e=>e.x>80&&e.x<94&&e.z>31&&e.z<33.4&&!e.dormant&&!e.gone).map(e=>[e.x,e.z,d0(e.x,e.z)])};},
 shape(){const {geometry,materials,maps,meshes,tri,lights}=shape();return {uniqueGeometries:geometry.size,materials:materials.size,art:[...maps].map(t=>t.name),meshes,tri,lights};},
 cycles(){
   const {geometry,materials,maps}=shape(),deps=[...geometry,...materials,...maps],counts=deps.map(()=>0);
   deps.forEach((v,i)=>v.addEventListener("dispose",()=>counts[i]++));window.__BLACK_SILENCE_QA.load(1);
   const absent=wKeys.every(n=>!wFind(n));
   window.__BLACK_SILENCE_QA.load(5);const fresh=shape();
   return {tracked:deps.length,disposed:counts.filter(v=>v===1).length,absent,
     renewed:![...fresh.geometry,...fresh.materials,...fresh.maps].some(v=>deps.includes(v)),freshState:wState()};
 },
 perf(){
   function timed(fn){for(let i=0;i<300;i++)fn(0);let sample=[];for(let r=0;r<11;r++){
      const start=performance.now();for(let i=0;i<4800;i++)fn(1/144);sample.push((performance.now()-start)*1000/4800);
   }sample.sort((a,b)=>a-b);return {medianMicroseconds:sample[5],p90Microseconds:sample[9]};}
   wPose(86.1,46.6,86,32,wFloor()+2);const native=timed(window.__beforeWorksTick),running=timed(F$);
   wPose(16,77,30,77,1.7);const distant=timed(F$);return {native,running,distant,samples:11,iterations:4800};
 },
 camera(args){const [x,z,tx,tz,dy]=args;wPose(x,z,tx,tz,ie(x,z)+Yo+dy);T.cur=0;Object.assign(St,{wstate:"idle",wtime:0,wCool:0,pending:-1,kickAnim:0});V5(true);Jt("pause").classList.add("hidden");Jt("subt").style.visibility="hidden";le("",0);
   J.lamp.position.set(x,C.pyy+.4,z);J.lampCore.position.set(x,C.pyy+.2,z);return {solid:fu(x,z),eye:C.pyy};},
 resetAudio(){wAudio=0;},skip:sk
};`;
fs.writeFileSync(file,candidate.replace(m,()=>before+"\n"+m).replace(a,()=>probe+a));
(async()=>{const b=await chromium.launch({channel:"chrome",headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
try{
 const page=await b.newPage({viewport:{width:1280,height:720}}),errors=[],network=[];
 page.on("pageerror",e=>{errors.push(e.message);console.error(e.message)});await page.route(/^https?:/,r=>{network.push(r.request().url());return r.abort();});
 await page.addInitScript(()=>{let s=2644;Math.random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};});
 await page.goto(pathToFileURL(file).href+"?qa=1");await page.locator("#mNew").click();await page.waitForFunction(()=>window.__BLACK_SILENCE_QA?.Be.started);
 const run=(n,...args)=>page.evaluate(([n,...args])=>__works[n](...args),[n,...args]),state=()=>run("state"),key=()=>page.keyboard.press("KeyE");
 const capture=async(n,v)=>{const p=await run("camera",v);assert(!p.solid,"Reachable camera "+n);await page.waitForTimeout(150);await page.screenshot({path:path.join(out,n+".png")});await run("pause",false);};
 const load=async i=>{await run("load",i);await run("settleIntro");await page.waitForFunction(()=>!__BLACK_SILENCE_QA.Be.inputLock);};
 await load(5);
 const initial=await state(),facts=await run("facts"),metrics=await run("shape");
 assert(initial.machine&&!initial.primed&&!initial.door&&initial.shrine===3);assert(facts.sameBuilder&&facts.cupboard&&facts.bed&&!facts.nearSouth&&!facts.high&&facts.low);
 assert.equal(facts.locked.length,1);assert(facts.reward.some(r=>r[0]==="w6"));assert.deepEqual(metrics.art.slice().sort(),["sewerWorks_brick","sewerWorks_foundryAtlas"]);
 assert(metrics.lights===0&&metrics.tri<15000&&metrics.meshes<36,"Bounded site batches");
 const ballistic=await run("fire");for(const shot of ballistic){
   assert.equal(shot.hitscanStopsAtMachine,shot.solid,JSON.stringify(shot));
   assert.equal(shot.projectilePassed,!shot.solid,JSON.stringify(shot));
 }
 await capture("station",[86.1,46.6,86.8,30,.92]);await capture("near",[85.0,38,86.6,31.7,.60]);
 await capture("drain-mouth",[24.9,77,67,77,.2]);await capture("drain-approach",[14.6,77,56,77,.1]);
 await capture("panel-idle",[102.5,36,105.6,36.6,1]);
 await run("cupboard");await key();
 const manual=await state();assert(manual.door&&!manual.primed&&manual.secrets===initial.secrets+1,"Native secret & scoring available with no pump");
 await run("step",130);await run("walk",108.8,39.0);await run("walk",109.0,35.3);const manualPickup=await state();assert(manualPickup.hasReward);
 await load(5);
 for(const mode of ["away","far","back"]){await run("aim",mode);await key();assert(!(await state()).primed,mode);}
 await run("aim");await run("pause",true);await key();await run("pause",false);assert(!(await state()).primed);
 await run("lock");await key();await run("unlock");assert(!(await state()).primed);
 await run("aim");assert(await run("finisher"));await key();assert((await state()).busy&&!(await state()).primed);
 await run("clear");await run("resetAudio");await run("aim");
 const before=await state();await key();await run("step",30);const start=await state();
 assert(start.primed && start.audio>=1 && !start.door && start.angle!==before.angle && start.valve!==before.valve,JSON.stringify({before,start}));
 await run("step",170);const steady=await state();assert(steady.primed&&!steady.door && steady.audio===2 && steady.needle<0 && steady.leak.every(Boolean));assert.equal(steady.secrets,0);
 const equalRod=(v)=>Math.abs(Math.hypot(v.cross[0]-v.pin[0],v.cross[1]-v.pin[1])-2.22)<.00001;
 assert(equalRod(start)&&equalRod(steady));assert(Math.abs(steady.idler-steady.angle)<1e-7);
 for(let i=0;i<6;i++){await run("step",9);assert(equalRod(await state()));}
 await key();assert.equal((await state()).audio,2,"Repeated E leaves the running installation alone");
 await capture("panel-ready",[102.5,36,105.6,36.6,1]);await capture("running",[86.1,46.6,86.8,30,.92]);
 const sealedSave=await run("save");assert(sealedSave.facts.sewerPrimed&&!sealedSave.facts.opened.includes("53,19"));
 await run("rise");const sealedRise=await state();assert(sealedRise.primed&&!sealedRise.door&&sealedRise.audio===2);
 await run("cupboard");await key();assert((await state()).door);await run("step",140);await run("walk",109,39);await run("walk",109,35.3);assert((await state()).hasReward);
 const openSave=await run("save");assert(openSave.facts.opened.includes("53,19"));await run("rise");const openRise=await state();
 assert(openRise.primed&&openRise.hasReward&&openRise.door&&openRise.secrets===1);
 const routes=[];for(const p of [[81,49,104,37],[91,49,104,37],[104,37,94,31],[81,35,104,39],[87,35,93,31]]){
   const length=await run("route",...p);assert(length>0,"Connected floor across "+p);routes.push([p,length]);}
 const perf=await run("perf"),cycles=[];
 for(let i=0;i<3;i++){const c=await run("cycles");assert(c.absent&&c.renewed&&c.tracked===c.disposed && !c.freshState.primed&&!c.freshState.door);cycles.push(c);}
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 const report={sourceSHA256:sha(mod),inputSHA256:sha(raw),candidateSHA256:sha(candidate),integrated:present,fixtureSHA256:sha(fs.readFileSync(file)),
   targetSHA256:sha(fs.readFileSync(path.join(root,"assets/sewer/works-target-v1.png"))),initial,facts,ballistic,metrics,manualPickup,start,steady,sealedRise,openRise,routes,perf,cycles,errors,network};
 fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(report,null,2)+"\n");console.log("PASS sewer works",JSON.stringify({metrics,perf,routes:routes.length}));
}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{fs.unlinkSync(file);fs.rmdirSync(tmp);});

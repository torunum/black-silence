const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");

const candidate = fs.readFileSync(process.argv[2] || "THE-BLACK-SILENCE.html","utf8");
const legacy = process.argv[3] ? fs.readFileSync(process.argv[3],"utf8") :
  candidate.replace(/\/\* NECROPOLIS_LANTERN_VIGIL_BEGIN \*\/[\s\S]*?\/\* NECROPOLIS_LANTERN_VIGIL_END \*\//,"");
const out = process.argv[4];
const observeGameEntry = require("./observe-game-entry.cjs");
const marker = "/* NECROPOLIS_LANTERN_VIGIL_BEGIN */";
assert(candidate.includes(marker) && !legacy.includes(marker));
const hash = content => crypto.createHash("sha256").update(content).digest("hex");
const report = {candidate:hash(candidate),baseline:hash(legacy),checks:{},errors:[]};

// This bridge runs at the entry point of an otherwise byte-identical file. It
// stages the doorway, freezes nearby monsters, and observes native input.
function fixture() {
  const gate = "34,21", story = "ossuary_lantern_keeper";
  let trace = [], tracked = [], spatial = null, lines = [], clinks = [];
  let recording = false, last = null;
  const voice = w0;
  w0 = function(key) {
    const before = Jt("subt").textContent;
    const result = voice.apply(this,arguments);
    if (key === story) lines.push({before,after:Jt("subt").textContent,at:performance.now()});
    return result;
  };
  const placeSound = Nt;
  Nt = function(x,y,z,play) {
    const outer = spatial;
    spatial = [x,y,z];
    try { return placeSound.apply(this,arguments); }
    finally { spatial = outer; }
  };
  const tones = gt;
  gt = function(layers) {
    if (layers.length === 3 && layers[0].f === 624 && layers[1].f === 1427) {
      clinks.push({position:spatial?.slice(),partials:layers.map(l=>l.f),at:performance.now()});
    }
    return tones.apply(this,arguments);
  };
  function state() {
    const d = v.doors?.[gate], sp = J.scene?.getObjectByName("ossuaryLanternKeeper");
    const map = sp?.material.map, offsets = map?.offset;
    return {started:Be.started,level:T.level,dead:T.dead,lock:Be.inputLock,paused:Wk(),captured:document.pointerLockElement===J.renderer.domElement,
      open:d?.open,k:d?.k,dir:d?.dir,key:T.key,chapterPhase:oe.phase,player:[C.px,C.pyy,C.pz],hp:T.hp,
      point:sp?.position.toArray(),opacity:sp?.material.opacity,shown:sp?.parent.visible,
      pose:offsets?(1-Math.round(offsets.y*2))*4+Math.round(offsets.x*4):-1,
      subtitle:Jt("subt").textContent,count:lines.length,clinks:clinks.length,mark:Q0.snap?.mark};
  }
  function collectResources() {
    const group = J.scene.getObjectByName("ossuaryLanternVigil");
    const set = new Set();
    if (group) group.traverse(object=>{
      if (object.isMesh) set.add(object.geometry);
      if (object.material) { set.add(object.material); if(object.material.map)set.add(object.material.map); }
    });
    tracked = [...set].map(resource=>{
      const value = {name:resource.name||resource.type,count:0};
      resource.addEventListener("dispose",()=>value.count++);
      return value;
    });
    return tracked.map(x=>x.name);
  }
  const lights = Q$;
  Q$ = function(dt,now) {
    const result = lights.apply(this,arguments);
    if (recording) {
      const s = state();
      if (s.pose!==last?.pose || s.count!==last?.count || s.shown!==last?.shown) {
        trace.push({pose:s.pose,n:s.count,shown:s.shown,point:s.point,opacity:s.opacity,at:now});
        last = s;
      }
    }
    return result;
  };
  function calm() {
    sk();
    if(T.level===3 && v.bossRef?.dormant)bk(v.bossRef);
    if(v.cine)stt(v.cine.dur+.1);
    V5(false); Be.inputLock=false; C.spawnGuard=999;
    for (const e of v.enemies)e.stun=999;
  }
  function at(z,dir=0) {
    const x=69;
    Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
    Ct.yaw=dir;Ct.pitch=0;Vr(C.px,C.pyy,C.pz,Ct.yaw,Ct.pitch);
  }
  window.vigilQA = {
    state,calm,at,
    startTrace(){trace=[];last=null;lines=[];clinks=[];recording=true;},
    data:()=>({trace,lines,clinks}),
    collectResources, disposals:()=>tracked,
    load(level){rp(level);calm();},
    shrine(index){const q=Q0.marks[index];Object.assign(C,{px:q.x,pz:q.z,pyy:ie(q.x,q.z)+Yo,vx:0,vz:0,vy:0,grounded:true});T0t(C.px,C.pz);QX(1/60);return Q0.snap?.mark;},
    save:()=>JSON.parse(localStorage.getItem("black-silence.campaign.v1")),
    lethal(){C.spawnGuard=0;ta(100000);},
    layout(){
      const solid=[];for(let z=38;z<48;z+=.12)for(let x=66;x<72;x+=.12)solid.push(fu(x,z)?1:0);
      return {terrain:v.grid,solid,items:v.items.map(i=>[i.kind,i.x,i.z]),doors:Object.keys(v.doors),
        actors:v.enemies.map(e=>e.key),marks:Q0.marks.map(q=>[q.x,q.z]),height:v.heightMap};
    },
    holdSubtitle(){ w0("locked",true); return Jt("subt").textContent; }
  };
}

async function main() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"black-silence-vigil-"));
  const file=path.join(dir,"play.html"),url=pathToFileURL(file).href;
  const browser=await chromium.launch({channel:"chrome"});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720},offline:true});
    page.on("pageerror",e=>report.errors.push(e.message));
    const call=(key,...args)=>page.evaluate(([key,args])=>vigilQA[key](...args),[key,args]);
    const wait=(fn,arg,timeout=18000)=>page.waitForFunction(fn,arg,{timeout});
    const slot=async(content,save)=>{
      await page.goto("about:blank");fs.writeFileSync(file,content);
      if(save){await page.goto(url);await page.evaluate(save=>localStorage.setItem("black-silence.campaign.v1",JSON.stringify(save)),save);await page.goto("about:blank");}
      await observeGameEntry(page,url,content,fixture);
    };
    const start=async id=>{
      await page.locator(id).click();await wait(()=>vigilQA.state().started&&!vigilQA.state().lock,undefined,45000);
      await call("calm");
    };
    const use=()=>page.keyboard.press("KeyE");
    const atDoor=()=>call("at",45.19722);
    const load=async(level=3)=>{await call("load",level);await call("startTrace");};
    await slot(legacy);await start("#mNew");await load();
    const oldLayout=await call("layout");
    assert.equal(await call("shrine",0),0);const closed=await call("save");
    assert(!closed.shrine.facts.opened.includes("34,21"));
    await atDoor();await use();await wait(()=>vigilQA.state().k===1);
    assert.equal(await call("shrine",1),1);const opened=await call("save");
    assert(opened.shrine.facts.opened.includes("34,21"));

    await slot(candidate,opened);await start("#mContinue");
    let s=await call("state");assert(s.open&&s.k===1&&s.pose===-1&&s.mark===1);
    await atDoor();await use();await page.waitForTimeout(180);
    assert.equal((await call("state")).count,0);
    assert.equal((await call("state")).pose,-1);
    assert.deepEqual((await call("save")).shrine,opened.shrine);
    report.checks.openSave={mark:s.mark,open:s.open,lines:s.count};

    await slot(candidate,closed);await start("#mContinue");
    assert(!(await call("state")).open);assert.deepEqual(await call("layout"),oldLayout);
    await call("startTrace");await atDoor();
    const busy=await call("holdSubtitle");assert(busy);
    await use();await wait(()=>vigilQA.state().pose>=0);
    const names=await call("collectResources");
    assert.equal(names.length,5);
    await page.evaluate(()=>document.exitPointerLock());
    await wait(()=>vigilQA.state().paused);
    const stop=await call("state");await page.waitForTimeout(300);
    s=await call("state");assert.equal(s.pose,stop.pose);assert.deepEqual(s.point,stop.point);
    await page.locator("#pauseResume").click();await wait(()=>!vigilQA.state().paused);
    await wait(()=>vigilQA.state().count===1);
    await wait(()=>vigilQA.state().pose===-1);
    await wait(()=>!vigilQA.state().subtitle.includes("that lamp."));
    const natural=await call("data"),poses=new Set(natural.trace.filter(t=>t.pose>=0).map(t=>t.pose));
    assert.deepEqual([...poses].sort(),[0,1,2,3,4,5,6,7]);
    assert.equal(natural.lines.length,1);assert.equal(natural.lines[0].before,"");
    assert.equal(natural.clinks.length,1);assert(natural.clinks[0].position.every(Number.isFinite));
    assert(natural.clinks[0].position[2]>37&&natural.clinks[0].position[2]<41);
    for(let i=0;i<3;i++)await use();
    assert.equal((await call("state")).count,1);
    report.checks.closedSave={mark:closed.shrine.mark,restoredBeforeDoor:true,nativePoses:[...poses],interruptedLine:busy,
      afterNativeSubtitleCleared:natural.lines[0].before,spoken:natural.lines[0].after,clink:natural.clinks[0],pausedPose:stop.pose};
    report.checks.geometry={collisionSamples:oldLayout.solid.length,doors:oldLayout.doors.length,actors:oldLayout.actors.length,items:oldLayout.items.length};
    await call("shrine",1);const current=await call("save");
    assert(current.shrine.facts.opened.includes("34,21"));
    await call("lethal");await wait(()=>vigilQA.state().dead);
    await page.waitForTimeout(1100);
    await page.locator("#riseBtn").click();
    await wait(()=>!vigilQA.state().dead);
    s=await call("state");assert(s.open&&s.pose===-1&&s.mark===1);await call("calm");
    report.checks.rise={mark:s.mark,open:s.open,pose:s.pose};
    const disposed=await call("disposals");assert(disposed.every(r=>r.count===1));
    report.checks.retiredResources=disposed;
    await slot(candidate,current);await start("#mContinue");
    s=await call("state");assert(s.open&&s.pose===-1&&s.count===0);
    report.checks.currentContinue={mark:s.mark,open:s.open,cues:s.count};

    await load();await call("at",40.6,Math.PI);await use();await wait(()=>vigilQA.state().k===1);
    s=await call("state");assert(s.dir===1&&s.pose===-1&&!s.count);
    await page.keyboard.down("KeyW");await wait(()=>vigilQA.state().player[2]>45);await page.keyboard.up("KeyW");
    report.checks.reverse={direction:s.dir,lines:s.count,cleared:(await call("state")).player};

    await load();await call("at",47.1);
    await page.keyboard.down("ShiftLeft");await page.keyboard.down("KeyW");
    try {
      await wait(()=>vigilQA.state().player[2]<45.65);
      await use();await wait(()=>vigilQA.state().open);
      await wait(()=>vigilQA.state().player[2]<27);
    } finally {await page.keyboard.up("KeyW");await page.keyboard.up("ShiftLeft");}
    const run=await call("state");assert(!run.lock&&run.player[2]<27&&run.hp===100);
    await wait(()=>vigilQA.state().pose===-1);
    report.checks.sprint={from:[69,47.1],to:run.player,encounterPoses:(await call("data")).trace.map(t=>t.pose),lock:run.lock};

    await page.emulateMedia({reducedMotion:"reduce"});await load();await atDoor();await use();
    await wait(()=>vigilQA.state().pose===3);
    const still=await call("state");await page.waitForTimeout(1300);
    s=await call("state");assert.equal(s.pose,3);assert.deepEqual(s.point,still.point);
    await wait(()=>vigilQA.state().pose===-1);
    const reduced=await call("data");
    assert(reduced.trace.filter(t=>t.pose>=0).every(t=>t.pose===3));
    assert.equal(reduced.lines.length,1);report.checks.reduced={pose:3,point:still.point,lines:reduced.lines.length};
    await load(9);assert.equal((await call("state")).pose,-1);assert.deepEqual(report.errors,[]);
    if(out){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(report,null,2)+"\n");}
    console.log("PASS Necropolis vigil",JSON.stringify(report.checks));
  } finally { await browser.close(); if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(dir); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});

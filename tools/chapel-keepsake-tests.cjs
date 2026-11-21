const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const observeGameEntry = require("./observe-game-entry.cjs");

const current = fs.readFileSync(process.argv[2] || "THE-BLACK-SILENCE.html","utf8");
const previous = process.argv[3] ? fs.readFileSync(process.argv[3],"utf8") :
  current.replace(/\/\* CHAPEL_VIGIL_KEEPSAKE_BEGIN \*\/[\s\S]*?\/\* CHAPEL_VIGIL_KEEPSAKE_END \*\//,"");
const marker = "/* CHAPEL_VIGIL_KEEPSAKE_BEGIN */";
assert(current.includes(marker)&&!previous.includes(marker));
const hash = s => crypto.createHash("sha256").update(s).digest("hex");
const report = {current:hash(current),previous:hash(previous),checks:{},errors:[],requests:[]};

function chapelObserver() {
  const key = "34,5", lines = [];
  let disposals=[];
  const native = w0;
  w0 = function(id) {
    const before=Jt("subt").textContent;
    const result=native.apply(this,arguments);
    if(id==="sexton_family_portrait")lines.push({before,spoken:Jt("subt").textContent,point:[C.px,C.pz]});
    return result;
  };
  function pose(x,z,tx,tz,y) {
    Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
    Ct.yaw=Math.atan2(tx-x,tz-z)+Math.PI;
    Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(tx-x,tz-z));
    Vr(C.px,C.pyy,C.pz,Ct.yaw,Ct.pitch);
  }
  function calm() {
    sk();V5(false);Be.inputLock=false;C.spawnGuard=999;
    for(const enemy of v.enemies)enemy.stun=999;
  }
  function state() {
    const door=v.doors?.[key],item=v.items?.find(p=>p.kind==="shells"&&p.x===69.07&&p.z===10.71);
    return {started:Be.started,level:T.level,lock:Be.inputLock,dead:T.dead,paused:Wk(),player:[C.px,C.pyy,C.pz],
      secret:T.secrets,total:T.secretsTotal,career:T.totSecrets,ammo:T.ammo.shells,opened:door?.open,
      meshY:door?.mesh.position.y,taken:!!item?.taken,photo:!!J.scene?.getObjectByName("chapelVigilKeepsake"),
      line:Jt("subt").textContent,spoken:lines.length,mark:Q0.snap?.mark};
  }
  window.chapelObserver={
    state,calm,
    load(level){rp(level);calm();lines.length=0;},
    atDoor(){pose(66.15,10.60,68,11,5.47);},
    atPhoto(){pose(66.78,10.35,69.08,10.56,5.09);},
    atPickup(){pose(67.00,10.71,69.5,10.71,5.2);},
    lookAway(){pose(66.15,10.60,58,8,5.20);},
    shrine(){const q=Q0.marks[0];pose(q.x,q.z,q.x+1,q.z,ie(q.x,q.z)+Yo);QX(1/60);return Q0.snap?.mark;},
    slot:()=>JSON.parse(localStorage.getItem("black-silence.campaign.v1")),
    die(){C.spawnGuard=0;ta(100000);},
    lines:()=>lines,
    layout(){
      const collisions=[];
      for(let z=9;z<=13;z+=.1)for(let x=65.5;x<70.6;x+=.1)collisions.push([fu(x,z),tV(x,4.99,z)]);
      return {collisions,terrain:v.grid,actors:v.enemies.map(e=>e.key),items:v.items.map(i=>[i.kind,i.x,i.z]),
        secretCells:Object.entries(v.doors).filter(([,d])=>d.secret).map(([cell])=>cell).sort()};
    },
    geometry(){
      const photo=J.scene.getObjectByName("chapelVigilKeepsake");
      const attr=photo.geometry.getAttribute("position"), point=new Y();
      const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
      for(let i=0;i<attr.count;i++){
        photo.localToWorld(point.fromBufferAttribute(attr,i));
        point.toArray().forEach((n,k)=>{min[k]=Math.min(n,min[k]);max[k]=Math.max(n,max[k]);});
      }
      disposals=[photo.geometry,photo.material,photo.material.map].map(resource=>{
        const track={type:resource.name||resource.type,count:0};
        resource.addEventListener("dispose",()=>track.count++);return track;
      });
      return {vertices:attr.count,triangles:attr.count/3,min,max,parent:photo.parent.name,mesh:photo.isMesh,
        drawMeshes:1+photo.children.filter(x=>x.isMesh).length,texture:[photo.material.map.image.width,photo.material.map.image.height]};
    },
    disposals:()=>disposals
  };
}

async function run() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"black-silence-tintype-"));
  const file=path.join(dir,"play.html"),url=pathToFileURL(file).href;
  const browser=await chromium.launch({channel:"chrome"});
  try {
    const page=await browser.newPage({offline:true,viewport:{width:1120,height:630}});
    page.on("pageerror",e=>report.errors.push(e.message));
    page.on("request",r=>{if(/^https?:/.test(r.url()))report.requests.push(r.url());});
    const call=(fn,...args)=>page.evaluate(([fn,args])=>chapelObserver[fn](...args),[fn,args]);
    const wait=(fn,arg,timeout=18000)=>page.waitForFunction(fn,arg,{timeout});
    async function install(html,save){
      await page.goto("about:blank");fs.writeFileSync(file,html);
      if(save){await page.goto(url);await page.evaluate(value=>localStorage.setItem("black-silence.campaign.v1",JSON.stringify(value)),save);await page.goto("about:blank");}
      await observeGameEntry(page,url,html,chapelObserver);
    }
    async function start(id) {
      await page.locator(id).click();await wait(()=>chapelObserver.state().started&&!chapelObserver.state().lock,undefined,45000);
      await call("calm");
    }
    async function toll() {
      await call("atDoor");await page.keyboard.press("KeyE");await wait(()=>chapelObserver.state().opened);
    }
    async function shells() {
      await call("atPickup");await page.keyboard.down("KeyW");
      try {await wait(()=>chapelObserver.state().taken);}finally{await page.keyboard.up("KeyW");}
    }
    await install(previous);await start("#mNew");
    const baseline=await call("layout");
    assert.deepEqual(baseline.secretCells,["34,5"]);
    assert.equal(await call("shrine"),0);const closedSave=await call("slot");
    await call("load",0);await toll();await wait(()=>chapelObserver.state().meshY<2.6);
    const oldOpenLayout=await call("layout");
    assert.equal(await call("shrine"),0);const openSave=await call("slot");
    assert(openSave.shrine.facts.opened.includes("34,5"));
    await call("load",1);const dungeonBefore=(await call("layout")).secretCells;

    await install(current,openSave);await start("#mContinue");
    let s=await call("state");assert(s.photo&&s.opened&&!s.taken&&s.secret===1&&s.mark===0);
    assert.deepEqual(await call("layout"),oldOpenLayout);
    await call("atPhoto");await page.keyboard.press("KeyE");await page.waitForTimeout(1100);
    assert.equal((await call("state")).spoken,0);
    const before=s.ammo;await shells();s=await call("state");
    assert(s.ammo===before+6&&s.spoken===0&&s.secret===1);
    report.checks.oldOpen={opened:true,present:true,restoredShells:before,ammoAfterWalk:s.ammo,spoken:s.spoken};

    await install(current,closedSave);await start("#mContinue");
    assert.deepEqual(await call("layout"),baseline);
    s=await call("state");assert(s.photo&&!s.opened&&!s.taken&&s.secret===0&&s.mark===0);
    const geometry=await call("geometry");assert.equal(geometry.parent,"chapelVigil");assert.equal(geometry.drawMeshes,1);
    assert(geometry.min[0]>68&&geometry.max[0]<70&&geometry.min[1]>4.76&&geometry.max[1]<5.45);
    assert.deepEqual(geometry.texture,[92,130]);
    await toll();await wait(()=>chapelObserver.state().meshY<2.6);await call("atPhoto");
    await wait(()=>chapelObserver.state().spoken===1);
    const lines=await call("lines");assert.equal(lines[0].before,"");assert(lines[0].spoken.includes("his Sunday coat"));
    await page.keyboard.press("KeyE");await wait(()=>!chapelObserver.state().line.includes("Sunday coat"));
    s=await call("state");assert(s.total===1&&s.secret===1&&s.spoken===1&&!s.lock);
    await call("load",1);
    const disposed=await call("disposals");assert(disposed.length===3&&disposed.every(x=>x.count===1));
    assert.equal((await call("state")).photo,false);
    const dungeonAfter=(await call("layout")).secretCells;assert.deepEqual(dungeonAfter,dungeonBefore);
    report.checks.keepsake=geometry;report.checks.nativeDiscovery=lines;report.checks.disposed=disposed;
    report.checks.layout={probes:baseline.collisions.length,actors:baseline.actors.length,items:baseline.items.length,dungeonBefore,dungeonAfter};

    await call("load",0);await toll();await call("lookAway");
    await page.waitForTimeout(7000);assert.equal((await call("state")).spoken,0);
    await call("atPickup");const uncollected=await call("state");await shells();
    assert.equal((await call("state")).ammo,uncollected.ammo+6);
    assert.equal(await call("shrine"),0);const earned=await call("slot");
    await call("die");await wait(()=>chapelObserver.state().dead);await page.waitForTimeout(1100);
    await page.locator("#riseBtn").click();await wait(()=>!chapelObserver.state().dead);
    s=await call("state");assert(s.photo&&s.opened&&s.taken&&s.ammo===uncollected.ammo+6&&s.secret===1);
    report.checks.rise={opened:s.opened,taken:s.taken,ammo:s.ammo,secret:s.secret};
    await install(current,earned);await start("#mContinue");
    s=await call("state");assert(s.photo&&s.opened&&s.taken&&s.ammo===uncollected.ammo+6&&s.spoken===0);
    await call("atPhoto");await page.keyboard.press("KeyE");await page.waitForTimeout(500);
    assert.equal((await call("state")).spoken,0);
    report.checks.newContinue={opened:s.opened,taken:s.taken,ammo:s.ammo,spoken:s.spoken};
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);
    if(process.argv[4]){fs.mkdirSync(process.argv[4],{recursive:true});fs.writeFileSync(path.join(process.argv[4],"verification.json"),JSON.stringify(report,null,2)+"\n");}
    console.log("PASS chapel family photograph",JSON.stringify(report.checks));
  } finally {await browser.close();if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(dir);}
}
run().catch(error=>{console.error(error);process.exitCode=1;});

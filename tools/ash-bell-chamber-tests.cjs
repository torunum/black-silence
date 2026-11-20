const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const [before,after,report] = process.argv.slice(2);
if(!before||!after) throw new Error("Usage: node tools/ash-bell-chamber-tests.cjs previous.html candidate.html [report-directory]");
const initial = fs.readFileSync(before,"utf8"), current = fs.readFileSync(after,"utf8");
const anchor = "Jk();ju();Yy();X$(J$);D0t();";
const out = path.resolve(report || path.join(path.dirname(path.resolve(after)),".dream-loop","ash-bell-route"));
const sha = value => crypto.createHash("sha256").update(value).digest("hex");

function ashBellProbe() {
  const names=["ashBellCasting","ashBellChamberFittings"];
  const meshes=()=>names.map(name=>J.scene.getObjectByName(name)).filter(Boolean);
  const tracked=[];
  const camera=(x,z,y=C.pyy)=>{
    Ct.yaw=Math.atan2(x-C.px,z-C.pz)+Math.PI;
    Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(x-C.px,z-C.pz));
    J.camera.position.set(C.px,C.pyy,C.pz);
    J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
    J.camera.updateMatrixWorld(true);
  };
  function prepare() {
    sk();
    if(v.cine)stt(v.cine.dur+.1);
    if(v.cine)v.cine=null;
    V5(false); Be.inputLock=false;
    C.spawnGuard=500;
    for(const e of v.enemies)e.stun=500;
    for(const id of ["lvltitle","subt","bossbar","bossTitle"]) {
      const part=document.getElementById(id);
      if(part)part.style.visibility="hidden";
    }
  }
  window.ashBellProbe = {
    ready:()=>Be.started&&!Be.inputLock,
    load(level){rp(level);prepare();},prepare,face:camera,
    at(x,z,tx=x,tz=z-1,y=ie(x,z)+Yo) {
      Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
      camera(tx,tz,y);
      if(v.zones)TR(0,true);
    },
    near(x,z,tolerance) {
      if(Math.hypot(x-C.px,z-C.pz)<tolerance)return true;
      camera(x,z);
      return false;
    },
    snapshot() {
      const original=gV[9].build();
      const collisions=[];
      for(let z=57.2;z<=81;z+=.24)for(let x=110.2;x<=133;x+=.24)collisions.push(Number(fu(x,z)));
      return {
        grid:v.grid,height:v.heightMap,ceil:v.ceilMap,walls:v.wallSegs,masses:[...v.masses],
        actors:v.enemies.map(e=>[e.key,e.name,e.x,e.z]),items:v.items.map(i=>[i.kind,i.x,i.z]),
        props:v.props.map(p=>[p.kind,p.x,p.z,p.r]),doors:Object.keys(v.doors),script:de.def,decor:original.decor,
        shrines:Q0.marks.map(s=>[s.x,s.z]),lights:J.scene.children.filter(o=>o.isLight).map(o=>o.type),
        collisions
      };
    },
    state() {
      const top=de.lift, bell=J.scene.getObjectByName(names[0]);
      return {
        level:T.level,at:[C.px,C.pyy,C.pz],health:T.hp,bell:de.bell,
        angle:bell?.rotation.x??null,lift:{h:top.h,moving:top.moving,free:top.free,target:top.target},
        seals:[...de.seals],niches:(de.def?.niches||[]).map(([x,z])=>!!v.doors[x+","+z]?.open),
        gate:!!v.doors["64,36"]?.open,gateTravel:v.doors["64,36"]?.k,
        checkpoint:Q0.snap?.mark,locked:Be.inputLock,pointer:!!document.pointerLockElement,paused:Wk()
      };
    },
    saved(){return JSON.parse(localStorage.getItem("black-silence.campaign.v1")||"null");},
    pause(value){V5(value);},
    models(watch) {
      const visible=meshes();
      if(watch){
        const resources=new Set(visible.flatMap(o=>[o.geometry,o.material,o.material.map]));
        tracked.splice(0,tracked.length,...[...resources].map(r=>{
          const record={name:r.name,uuid:r.uuid,disposed:0};
          r.addEventListener("dispose",()=>record.disposed++);
          return record;
        }));
      }
      return visible.map(o=>{
        o.geometry.computeBoundingBox();
        const box=o.geometry.boundingBox;
        return {
          name:o.name,origin:o.position.toArray(),triangles:o.geometry.getAttribute("position").count/3,
          atlas:[o.material.map.image.width,o.material.map.image.height],
          min:box.min.toArray(),max:box.max.toArray(),
          lights:o.children.filter(child=>child.isLight).length
        };
      });
    },
    retired(){return tracked;},
    clearance(){
      const bell=J.scene.getObjectByName(names[0]);
      if(!bell)return null;
      bell.updateMatrixWorld(true);
      const position=bell.geometry.getAttribute("position"), point=new Y();
      let floor=Infinity,eye=Infinity;
      for(let i=0;i<position.count;i++) {
        point.fromBufferAttribute(position,i).applyMatrix4(bell.matrixWorld);
        const above=point.y-ie(point.x,point.z);
        floor=Math.min(floor,above);
        eye=Math.min(eye,above-Yo);
      }
      return {floor,eye};
    },
    render(){return {...J.renderer.info.render};}
  };
}

function assembly(raw,file) {
  assert.equal(raw.split(anchor).length,2);
  fs.writeFileSync(file,raw.replace(anchor,()=>"("+ashBellProbe.toString()+")();\n"+anchor));
}

async function run() {
  assert(!initial.includes("/* ASH_BELL_CHAMBER_BEGIN */"));
  assert(current.includes("/* ASH_BELL_CHAMBER_BEGIN */"));
  fs.mkdirSync(out,{recursive:true});
  const fixture=path.join(out,"native.html"),href=pathToFileURL(fixture).href;
  const browser=await chromium.launch({channel:"chrome"});
  const errors=[],steps=[];
  try {
    const page=await browser.newPage({viewport:{width:1280,height:720},offline:true});
    page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(()=>{let seed=281159811;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
    const call=(name,...args)=>page.evaluate(([name,args])=>ashBellProbe[name](...args),[name,args]);
    const wait=(condition,args=null,max=14000)=>page.waitForFunction(condition,args,{timeout:max});
    async function start(button){
      await page.goto(href);
      await page.locator(button).click();
      await wait(()=>window.ashBellProbe?.ready(),null,35000);
      await call("prepare");
    }
    async function capture(name) {await page.screenshot({path:path.join(out,name+".png")});}
    async function walk(x,z,tolerance=.55) {
      const from=(await call("state")).at;
      await call("face",x,z);
      await page.keyboard.down("KeyW");
      try {await wait(([x,z,t])=>ashBellProbe.near(x,z,t),[x,z,tolerance]);}
      catch(e){throw Error("W from "+from.join(",")+" to "+[x,z].join(",")+" stalled at "+(await call("state")).at.join(","),{cause:e});}
      finally{await page.keyboard.up("KeyW");}
      await page.waitForTimeout(140);
      steps.push({input:"W",from,goal:[x,z],at:(await call("state")).at});
    }
    async function use(label,x,z,y) {
      await call("face",x,z,y);
      const at=(await call("state")).at;
      await page.keyboard.press("KeyE");
      steps.push({input:"E",label,at});
    }
    async function route(beforeModel,label) {
      const startStep=steps.length;
      await call("at",131.13,73,129,73,2.7);
      await use("native chapel-side door",129,73,2.85);
      await wait(()=>ashBellProbe.state().gate&&ashBellProbe.state().gateTravel===1);
      await walk(125.02,73,.40);
      await walk(125.02,57.4,.45);
      await walk(114.5,57.1,.45);
      await walk(113.6,65.2,.48);
      await walk(113.47,71.1,.55);
      await call("face",120.5,72.9,7.76);
      await capture(label+"-chamber");
      await walk(115.24,74.52,.38);
      assert.equal((await call("state")).bell,false);
      await use("native pull",115,75.9,7.45);
      await wait(()=>ashBellProbe.state().bell);
      const used=await call("state");
      assert(used.lift.free&&used.niches.every(Boolean));
      let peak=null,paused=null,clearance=null;
      if(!beforeModel){
        await wait(()=>Math.abs(ashBellProbe.state().angle)>.032,null,2500);
        peak=(await call("state")).angle;
        clearance=await call("clearance");
        assert(clearance.eye>.45);
        await call("pause",true);
        paused=(await call("state")).angle;
        await page.waitForTimeout(260);
        assert.equal((await call("state")).angle,paused);
        await call("pause",false);
        await wait(previous=>Math.abs(ashBellProbe.state().angle-previous)>.009,paused,2500);
      }
      await call("face",119.25,72.50,8.55);
      await capture(label+"-after-pull");
      await walk(118.3,73.22,.45);
      await walk(121,73,.35);
      await wait(()=>ashBellProbe.state().seals.includes("seal_bell"));
      await walk(118.4,74.98,.46);
      await walk(118.35,77.2,.30);
      await use("native lift down",118.35,79.8,3.5);
      await wait(()=>ashBellProbe.state().lift.moving,null,3600);
      await wait(()=>ashBellProbe.state().lift.h===1.2&&!ashBellProbe.state().lift.moving,null,8000);
      const lower=await call("state");
      assert(lower.at[1]<3.2&&lower.lift.free);
      await capture(label+"-lower");
      await walk(118.26,79.62,.38);
      await walk(118.35,112.8,.48);
      await walk(104.96,112.8,.47);
      await walk(105,121,.40);
      await wait(()=>ashBellProbe.state().checkpoint===1,null,4000);
      const snap=await call("saved"),final=await call("state");
      assert.equal(snap.shrine.mark,1);
      assert(snap.shrine.facts.opened.includes("64,36"));
      assert(final.bell&&final.seals.includes("seal_bell"));
      return {steps:steps.slice(startStep),used,peak,paused,clearance,lower,final,saved:snap};
    }

    assembly(initial,fixture);
    await start("#mNew");
    await call("load",9);
    const baseline=await call("snapshot");
    assert.deepEqual(await call("models",false),[]);
    await call("at",113.52,71.1,120.5,72.9,7.76);await page.waitForTimeout(350);
    const oldRender=await call("render");
    const old=await route(true,"before");
    console.log("PASS original rampart pull, seal, lift and checkpoint ("+old.steps.length+" input steps)");
    await page.goto("about:blank");
    assembly(current,fixture);
    await start("#mContinue");
    const fromOld=await call("state");
    assert(fromOld.bell&&fromOld.lift.free&&fromOld.seals.includes("seal_bell")&&fromOld.checkpoint===1);
    assert.equal(fromOld.angle,0);
    assert.deepEqual((await call("saved")).shrine,old.saved.shrine);

    await call("load",9);
    assert.deepEqual(await call("snapshot"),baseline);
    const models=await call("models",false);
    assert.equal(models.length,2);
    assert(models.every(o=>o.lights===0));
    await call("at",113.52,71.1,120.5,72.9,7.76);await page.waitForTimeout(350);
    const newRender=await call("render");
    const updated=await route(false,"after");
    await page.reload();
    await page.locator("#mContinue").click();
    await wait(()=>ashBellProbe.ready(),null,35000);
    await call("prepare");
    const resumed=await call("state");
    assert(resumed.bell&&resumed.lift.free&&resumed.seals.includes("seal_bell")&&resumed.checkpoint===1);
    assert.equal(resumed.angle,0);

    const retirement=[];
    for(const level of [0,5,1]){
      await call("models",true);
      await call("load",level);
      assert.deepEqual(await call("models",false),[]);
      const released=await call("retired");
      assert.equal(released.length,4);
      assert(released.every(o=>o.disposed===1));
      retirement.push({level,released});
      await call("load",9);
    }
    assert.deepEqual(errors,[]);
    const result={exact:{before:{sha256:sha(initial),bytes:Buffer.byteLength(initial)},
      after:{sha256:sha(current),bytes:Buffer.byteLength(current)}},
      collisionSamples:baseline.collisions.length,models,oldRender,newRender,
      old,updated,fromOld,resumed,retirement,errors};
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(result,null,2)+"\n");
    console.log("PASS new rampart pull, bell motion pause/resume, key, lift and both Continue records");
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});

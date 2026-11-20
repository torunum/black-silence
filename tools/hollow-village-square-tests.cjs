const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const [before,after,report]=process.argv.slice(2);
if(!before||!after)throw Error("Usage: node tools/hollow-village-square-tests.cjs previous.html candidate.html [report-directory]");
const initial=fs.readFileSync(before,"utf8"), current=fs.readFileSync(after,"utf8");
const anchor="Jk();ju();Yy();X$(J$);D0t();";
const marker="/* HOLLOW_VILLAGE_SQUARE_BEGIN */";
const out=path.resolve(report||path.join(path.dirname(path.resolve(after)),".dream-loop","hollow-village-route"));
const sha=value=>crypto.createHash("sha256").update(value).digest("hex");

function villageProbe() {
  const names=["hollowVillage_squareWell","hollowVillage_distance","hollowVillage_hills"];
  const models=()=>names.map(name=>J.scene.getObjectByName(name)).filter(Boolean);
  let retired=[];
  function face(x,z,y=C.pyy) {
    Ct.yaw=Math.atan2(x-C.px,z-C.pz)+Math.PI;
    Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(x-C.px,z-C.pz));
    J.camera.position.set(C.px,C.pyy,C.pz);
    J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");
    J.camera.updateMatrixWorld(true);
  }
  function prepare() {
    sk();
    if(v.cine)stt(v.cine.dur+.1);
    if(v.cine)v.cine=null;
    V5(false); Be.inputLock=false;
    C.spawnGuard=500;
    for(const e of v.enemies){e.stun=500;e.sp.visible=false;}
    for(const id of ["lvltitle","subt","bossbar","bossTitle"]) {
      const part=document.getElementById(id);
      if(part)part.style.visibility="hidden";
    }
  }
  window.villageProbe={
    ready:()=>Be.started&&!Be.inputLock,
    load(level){
      const start=performance.now();
      rp(level);
      const elapsed=performance.now()-start;
      prepare();
      return elapsed;
    },prepare,face,
    at(x,z,tx=x,tz=z-1,y=ie(x,z)+Yo) {
      Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
      face(tx,tz,y);
      if(v.zones)TR(0,true);
    },
    near(x,z,tolerance) {
      if(Math.hypot(x-C.px,z-C.pz)<tolerance)return true;
      face(x,z);
      return false;
    },
    snapshot(){
      const map=gV[10].build(),collisions=[],projectiles=[];
      for(let z=.19;z<128;z+=.53)for(let x=.23;x<144;x+=.49)collisions.push(Number(fu(x,z)));
      for(let x=69.7;x<=72.3;x+=.21)for(let z=23.7;z<=26.3;z+=.21)
        for(let y=1.2;y<4.2;y+=.21)projectiles.push(Number(tV(x,y,z)));
      return {grid:v.grid,height:v.heightMap,ceil:v.ceilMap,walls:v.wallSegs,masses:[...v.masses],
        camera:J.camera.far,spawn:map.spawn,actors:v.enemies.map(e=>[e.key,e.name,e.x,e.z]),
        items:v.items.map(i=>[i.kind,i.x,i.z]),props:v.props.map(p=>[p.kind,p.x,p.z,p.r]),
        doors:Object.entries(v.doors).map(([name,d])=>[name,d.locked,d.axis,d.y0,d.h]),
        decor:map.decor,shrines:Q0.marks.map(s=>[s.x,s.z]),zones:v.zones.themes.map(t=>[t.id,t.fog,t.fogD,t.sky]),
        lights:J.scene.children.filter(o=>o.isLight).map(o=>o.type),collisions,projectiles};
    },
    state(){
      const spot=v.zones?.themes[Wa.cur];
      const barn=v.doors["10,45"],gate=v.doors["35,45"];
      const shrine=Q0.snap?.mark;
      return {level:T.level,at:[C.px,C.pyy,C.pz],key:T.key,barn:barn&&[barn.open,barn.k],
        gate:gate&&[gate.open,gate.k],shrine,zone:spot?.id,sky:!!spot?.sky,
        visible:models().slice(1).map(o=>o.visible),fov:J.camera.fov,far:J.camera.far,
        fog:[J.scene.fog.color.toArray(),J.scene.fog.density],px:[J.renderer.domElement.width,J.renderer.domElement.height]};
    },
    saved(){return JSON.parse(localStorage.getItem("black-silence.campaign.v1")||"null");},
    frames(){
      const elapsed=[];
      return new Promise(resolve=>{
        let previous=null;
        function tick(now){
          if(previous!==null)elapsed.push(now-previous);
          previous=now;
          if(elapsed.length<24)requestAnimationFrame(tick);
          else{
            elapsed.sort((a,b)=>a-b);
            resolve({samples:elapsed.length,medianMs:elapsed[11],p90Ms:elapsed[21]});
          }
        }
        requestAnimationFrame(tick);
      });
    },
    parallax(){
      const sky=models().slice(1);
      return sky.map(mesh=>{
        const p=new Y().fromBufferAttribute(mesh.geometry.getAttribute("position"),22*48+3*6);
        const first=p.clone().project(J.camera).x;
        J.camera.position.x+=4;
        J.camera.updateMatrixWorld(true);
        const moved=p.clone().project(J.camera).x;
        J.camera.position.x-=4;
        J.camera.updateMatrixWorld(true);
        return {name:mesh.name,screenDx:640*(moved-first)};
      });
    },
    render(watch){
      const actual=models();
      if(watch){
        const resources=new Set(actual.flatMap(o=>[o.geometry,o.material,o.material.map]));
        retired=[...resources].map(resource=>{
          const record={name:resource.name,uuid:resource.uuid,disposed:0};
          resource.addEventListener("dispose",()=>record.disposed++);
          return record;
        });
      }
      const meshes=actual.map(o=>{
        o.geometry.computeBoundingBox();
        const bounds=o.geometry.boundingBox;
        return {name:o.name,origin:o.position.toArray(),triangles:o.geometry.getAttribute("position").count/3,
          atlas:[o.material.map.image.width,o.material.map.image.height],
          min:bounds.min.toArray(),max:bounds.max.toArray(),visible:o.visible,
          lights:o.children.filter(child=>child.isLight).length};
      });
      return {meshes,retired,renderer:{...J.renderer.info.render}};
    },
    clean(value){
      ER().canvas.style.visibility=value?"hidden":"";
      for(const id of ["hud","cross","minimap","automap"])Jt(id).style.visibility=value?"hidden":"";
    }
  };
}
function assembly(raw,file) {
  assert.equal(raw.split(anchor).length,2);
  fs.writeFileSync(file,raw.replace(anchor,()=>"("+villageProbe.toString()+")();\n"+anchor));
}

async function run(){
  assert(!initial.includes(marker)&&current.includes(marker));
  fs.mkdirSync(out,{recursive:true});
  const fixture=path.join(out,"native.html"),href=pathToFileURL(fixture).href;
  const browser=await chromium.launch({channel:"chrome"});
  const errors=[],requests=[];
  try{
    const page=await browser.newPage({viewport:{width:1280,height:720},offline:true});
    page.on("pageerror",e=>errors.push(e.message));
    page.on("console",line=>{if(line.type()==="error")errors.push(line.text());});
    page.on("request",req=>{if(/^https?:/.test(req.url()))requests.push(req.url().slice(0,80));});
    await page.addInitScript(()=>{let seed=2462113451;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);});
    const call=(name,...args)=>page.evaluate(([name,args])=>villageProbe[name](...args),[name,args]);
    const wait=(condition,args=null,max=11000)=>page.waitForFunction(condition,args,{timeout:max});

    async function start(button){
      await page.goto(href);
      await page.locator(button).click();
      await wait(()=>window.villageProbe?.ready(),null,35000);
      await call("prepare");
    }
    async function ordinaryRoute(label,candidate) {
      const steps=[];
      async function capture(frame){await page.screenshot({path:path.join(out,label+"-"+frame+".png")});}
      async function walk(x,z,tolerance=.5){
        const from=(await call("state")).at;
        await call("face",x,z);
        const sprint=Math.hypot(x-from[0],z-from[2])>23;
        if(sprint)await page.keyboard.down("ShiftLeft");
        await page.keyboard.down("KeyW");
        try{await wait(([x,z,t])=>villageProbe.near(x,z,t),[x,z,tolerance],14500);}
        catch(e){throw Error("W "+from.join(",")+" to "+[x,z].join(",")+" blocked at "+(await call("state")).at.join(","),{cause:e});}
        finally{
          await page.keyboard.up("KeyW");
          if(sprint)await page.keyboard.up("ShiftLeft");
        }
        await page.waitForTimeout(135);
        steps.push({input:sprint?"Shift+W":"W",from,goal:[x,z],at:(await call("state")).at});
      }
      async function use(label,x,z){
        await call("face",x,z,2.45);
        await page.keyboard.press("KeyE");
        steps.push({input:"E",label,at:(await call("state")).at});
      }
      const early=await call("state");
      assert.equal(early.level,10);
      assert.equal(early.key,false);
      await capture("spawn");
      await walk(68.5,15.7);
      await walk(68.5,29.8);
      await call("face",71,25,2.76);
      await capture("past-well");
      await walk(68.3,35.3);
      await walk(38.6,35.6);
      await walk(20.7,36.4);
      await walk(21.1,86.0);
      await walk(21.0,89.35,.29);
      await use("existing barn door",21,91);
      await wait(()=>villageProbe.state().barn[0],null,4000);
      await walk(21,95.7,.30);
      await walk(19.3,98.7);
      const barnIndoor=await call("state");
      assert.equal(barnIndoor.sky,false);
      if(candidate)assert.deepEqual(barnIndoor.visible,[false,false]);
      await capture("barn-inside");
      // The red key is on the west loft. Its authored steps begin at
      // the east end of the barn's rear wall, beyond the hay bales.
      await walk(34.73,98.7,.43);
      await walk(34.73,118.93,.30);
      const upper=[[10.92,119.03],[9.42,114.45],[7.35,111.85],[7.35,105.36],[11.13,104.76]];
      for(const [x,z] of upper)await walk(x,z,.32);
      await walk(11,101,.34);
      await wait(()=>villageProbe.state().key);
      assert((await call("state")).at[1]>4);
      console.log("PASS "+label+" barn door and key");
      for(const [x,z] of upper.toReversed())await walk(x,z,.32);
      await walk(34.73,118.93,.31);
      await walk(34.73,98.7,.44);
      await walk(21,96.2,.39);
      await walk(21,93.2,.30);
      const inBarn=await call("state");
      assert(inBarn.key&&inBarn.barn[0]&&[2,3].includes(inBarn.shrine));
      await walk(21.07,87.6,.33);
      await walk(21.0,36.0,.43);
      await walk(68.2,35.9,.47);
      await walk(68.0,87.3,.41);
      await walk(65.2,88.62,.47);
      await wait(()=>villageProbe.state().shrine===4,null,2500);
      const stored=await call("saved");
      assert(stored?.shrine?.facts?.opened?.includes("10,45")&&stored.shrine.inv.key);
      assert.equal(stored.shrine.mark,4);
      assert(stored.shrine.lit.includes(2));
      await walk(71.05,88.9,.35);
      assert.equal((await call("state")).gate[0],false);
      await use("existing red-key cemetery gate",71,91);
      await wait(()=>villageProbe.state().gate[0],null,5000);
      await walk(71,94.3,.35);
      await walk(76.4,94.6,.46);
      await walk(77.45,112.7,.46);
      await walk(73.10,119.7,.46);
      await walk(72.98,121.15,.43);
      await call("face",73,124,2.5);
      await capture("cemetery-gate-passed");
      return {early,steps,barnIndoor,inBarn,stored,final:await call("state")};
    }
    async function golden(label,loadMs){
      await call("at",71,12,71.2,34.2,4.15);
      await page.waitForTimeout(460);
      const data={state:await call("state"),render:await call("render",false)};
      data.synchronousLoadMs=loadMs;
      data.frames=await call("frames");
      data.parallax=await call("parallax");
      await call("clean",true);
      await page.screenshot({path:path.join(out,label+"-golden.png")});
      await call("at",17.4,99,20.6,106.2,3.12);
      await page.waitForTimeout(460);
      await page.screenshot({path:path.join(out,label+"-indoor.png")});
      await call("clean",false);
      return data;
    }

    assembly(initial,fixture);
    await start("#mNew");
    const beforeLoad=await call("load",10);
    const base=await call("snapshot"),a=await golden("before",beforeLoad);
    assert.equal(a.render.meshes.length,0);
    await call("load",10);
    const ordinaryBefore=await ordinaryRoute("before",false);
    assert(ordinaryBefore.final.key&&ordinaryBefore.final.gate[0]);
    console.log("PASS original barn key and cemetery route ("+ordinaryBefore.steps.length+" native inputs)");
    await page.goto("about:blank");

    assembly(current,fixture);
    await start("#mContinue");
    assert.equal((await call("state")).level,10);
    assert.equal((await call("state")).shrine,4);
    assert.equal((await call("state")).key,true);
    const afterLoad=await call("load",10);
    assert.deepEqual(await call("snapshot"),base);
    const b=await golden("after",afterLoad);
    assert.deepEqual([b.state.fog,b.state.fov,b.state.far,b.state.px],
      [a.state.fog,a.state.fov,a.state.far,a.state.px]);
    assert.deepEqual(b.state.visible,[true,true]);
    assert.equal(b.render.meshes.length,3);
    assert(Math.abs(b.parallax[0].screenDx)>0&&Math.abs(b.parallax[1].screenDx)>Math.abs(b.parallax[0].screenDx));
    assert(b.render.meshes.every(o=>o.lights===0));
    const well=b.render.meshes[0];
    assert.equal(well.origin.join(","),"71,1.2,25");
    assert(well.min[0]>=-1&&well.max[0]<=1&&well.min[2]>=-1&&well.max[2]<=1&&well.max[1]<=2.91);

    await call("load",10);
    const ordinaryAfter=await ordinaryRoute("after",true);
    assert(ordinaryAfter.final.key&&ordinaryAfter.final.gate[0]);
    await page.reload();
    await page.locator("#mContinue").click();
    await wait(()=>villageProbe.ready(),null,35000);
    await call("prepare");
    const resumed=await call("state");
    assert(resumed.level===10&&resumed.shrine===4&&resumed.key);
    console.log("PASS candidate route, original/new Continue and indoor skyline mask");

    const exits=[];
    for(const level of [0,4,9]){
      await call("render",true);
      await call("load",level);
      const info=await call("render",false);
      assert.equal(info.meshes.length,0);
      assert.equal(info.retired.length,9);
      assert(info.retired.every(o=>o.disposed===1));
      exits.push({level,resources:info.retired.map(o=>o.disposed)});
      await call("load",10);
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(requests,[]);
    const result={before:{sha256:sha(initial),bytes:Buffer.byteLength(initial)},
      after:{sha256:sha(current),bytes:Buffer.byteLength(current)},scope:{collision:base.collisions.length,projectile:base.projectiles.length},
      hero:{old:a,new:b},ordinaryBefore,ordinaryAfter,resumed,exits,errors,requests};
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify(result,null,2)+"\n");
    console.log("PASS "+base.collisions.length+" movement cells, "+base.projectiles.length+
      " shooting-volume samples and 9 disposals per chapter departure");
  } finally {await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});

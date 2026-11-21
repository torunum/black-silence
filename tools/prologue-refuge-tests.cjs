// Offline W/E route through the charnel refuge, with the native actors held for repeatability.
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {createHash}=require("node:crypto"),{pathToFileURL}=require("node:url"),{chromium}=require("playwright");
const [previous,candidate,dest]=process.argv.slice(2);
if(!previous||!candidate)throw Error("Usage: node tools/prologue-refuge-tests.cjs previous.html candidate.html [evidence]");
const out=path.resolve(dest||".dream-loop/prologue-refuge-check"),start="Jk();ju();Yy();X$(J$);D0t();";
const source=[previous,candidate].map(f=>fs.readFileSync(f,"utf8"));
const hash=s=>createHash("sha256").update(s).digest("hex");
assert(!source[0].includes("/* PROLOGUE_REFUGE_WAYMARKER_BEGIN */")&&source[1].includes("/* PROLOGUE_REFUGE_WAYMARKER_BEGIN */"));
function instrument(){
  const models=()=>J.scene.children.filter(o=>["prologueRefugeWaymarker","prologueRefugeVotiveSpill"].includes(o.name));
  function face(x,z,y=C.pyy){
    Ct.yaw=Math.atan2(x-C.px,z-C.pz)+Math.PI;Ct.pitch=Math.atan2(y-C.pyy,Math.hypot(x-C.px,z-C.pz));
    J.camera.position.set(C.px,C.pyy,C.pz);J.camera.rotation.set(Ct.pitch,Ct.yaw,0,"YXZ");J.camera.updateMatrixWorld(true);
  }
  function at(x,z,tx,tz,y){
    Object.assign(C,{px:x,pz:z,pyy:ie(x,z)+Yo,vx:0,vz:0,vy:0,grounded:true});
    face(tx,tz,y);if(v.zones)TR(0,true);
  }
  function calm(){
    sk();if(v.cine)stt(v.cine.dur+.15);if(oe.phase==="arrive")Fd();V5(false);Be.inputLock=false;
    C.spawnGuard=300;for(const e of v.enemies)e.stun=300;
  }
  function state(){return {level:T.level,p:[C.px,C.pyy,C.pz],hp:T.hp,armor:T.armor,
    phase:oe.phase,ready:Be.started&&!Be.inputLock,items:v.items.filter(s=>s.x>=116&&s.x<124&&s.z>=48&&s.z<58)
      .map(i=>[i.kind,i.x,i.z,!!i.taken]),atExit:z0.exit&&[z0.exit.x,z0.exit.z]};}
  function scope(){
    const collisions=[];
    for(let iz=0;iz<=150;iz++)for(let ix=0;ix<=88;ix++){
      const x=109+ix*.18,z=44+iz*.18,fy=ie(x,z);
      collisions.push(Number(d0(x,z))|Number(fu(x,z))<<1|Number(tV(x,fy+.4,z))<<2|
        Number(tV(x,fy+1.3,z))<<3|Number(tV(x,fy+2.5,z))<<4);
    }
    const local=(x,z)=>x>=109&&x<=125&&z>=44&&z<=71;
    const layout=gV[0].build();
    return {collisions,grid:v.grid.map(r=>r.join("")),hmap:v.heightMap,cmap:v.ceilMap,
      decor:layout.decor.filter(d=>local((d.x+.5)*P,(d.z+.5)*P)),masses:[...v.masses].filter(([,m])=>m.some(b=>local(b.x0,b.z0))),
      items:v.items.filter(i=>local(i.x,i.z)).map(i=>[i.kind,i.x,i.z]),lights:J.scene.children.filter(o=>o.isPointLight).length,
      candles:v.candles.filter(c=>local(c.x,c.z)).map(c=>[c.x,c.z]),doors:Object.keys(v.doors),
      exit:[z0.exit.x,z0.exit.z],shrines:Q0.marks.map(m=>[m.x,m.z])};
  }
  window.refugeStudy={state,at,face,scope,prepare(){
    calm();T.cur=1;T.weapons[1]=true;T.mag[1]=2;T.hp=64;T.armor=0;
    // The existing armor/health pickups must be collectible in this fixture.
    at(113,69,113,52);
  },near(x,z,r){if(Math.hypot(C.px-x,C.pz-z)<r)return true;face(x,z);return false;},
    render(){return {draws:J.renderer.info.render.calls,meshes:models().map(m=>{
      m.geometry.computeBoundingBox();const b=m.geometry.boundingBox,pos=m.geometry.attributes.position;
      let wallProjection=0;
      for(let i=0;i<pos.count;i++){
        const x=pos.getX(i),z=pos.getZ(i);
        wallProjection=Math.max(wallProjection,Math.min(124-x,z-48,58-z));
      }
      return {name:m.name,triangles:(m.geometry.index?.count||pos.count)/3,min:b.min.toArray(),max:b.max.toArray(),wallProjection};
    })};},
    retire(level){
      const assets=new Set(models().flatMap(m=>[m.geometry,m.material,m.material.map].filter(Boolean)));
      const counts=[...assets].map(a=>{const c={retired:0};a.addEventListener("dispose",()=>c.retired++);return c;});
      rp(level);const other=models().length;rp(0);return {other,counts:counts.map(c=>c.retired),returned:models().length};
    }
  };
}

async function run(){
  fs.mkdirSync(out,{recursive:true});
  const file=path.join(out,"native.html"),url=pathToFileURL(file).href;
  const browser=await chromium.launch({channel:"chrome"}),results=[],errors=[],network=[];
  try{
    const viewport={width:640,height:360};
    let oldScope,probes;
    for(const [i,s] of source.entries()){
      const p=await browser.newPage({offline:true,viewport});
      p.on("pageerror",e=>errors.push(e.message));
      p.on("request",r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
      assert.equal(s.split(start).length,2);
      fs.writeFileSync(file,s.replace(start,()=>"("+instrument.toString()+")();\n"+start));
      await p.goto(url,{waitUntil:"commit",timeout:90000});
      await p.waitForFunction(()=>!!window.refugeStudy&&document.readyState!=="loading",null,{timeout:90000});
      await p.locator("#mNew").focus({timeout:30000});
      await p.keyboard.press("Enter");
      await p.waitForFunction(()=>refugeStudy.state().ready,null,{timeout:50000});
      const call=(m,...a)=>p.evaluate(([m,a])=>refugeStudy[m](...a),[m,a]);
      const result={sha256:hash(s),bytes:Buffer.byteLength(s),steps:[]},scope=await call("scope");
      if(!i){oldScope=scope;probes=scope.collisions.length*5;}else assert.deepEqual(scope,oldScope);
      await call("prepare");await p.waitForTimeout(140);
      async function walk(x,z,tolerance=.35){
        const before=(await call("state")).p;await call("face",x,z);await p.keyboard.down("KeyW");
        try{await p.waitForFunction(([x,z,t])=>refugeStudy.near(x,z,t),[x,z,tolerance],{timeout:45000});}
        catch(e){throw Error("Refuge walk to "+[x,z]+" stopped at "+(await call("state")).p,{cause:e});}
        finally{await p.keyboard.up("KeyW");}
        await p.waitForTimeout(110);result.steps.push({input:"W",before,to:[x,z],after:(await call("state")).p});
      }
      const shot=name=>p.screenshot({path:path.join(out,(i?"after":"before")+"-"+name+".png")});
      await walk(113,53.6);await walk(118.48,53.53);
      await call("face",124,48,5.2);await shot("refuge-entry");result.render=await call("render");
      assert.equal(result.render.meshes.length,i*2);
      if(i){
        const [body,glow]=result.render.meshes;
        assert(body.triangles<10000&&glow.triangles<=1500);
        // Arches meet at corners and the outermost voussoirs overlap the host
        // wall by a few centimetres. Measure their actual roomward projection.
        assert(body.min[0]>=115.8&&body.max[0]<=124.10&&body.min[2]>=47.86&&body.max[2]<=58.10,JSON.stringify(body));
        assert(body.wallProjection<=.252,JSON.stringify(body));
        assert(body.min[1]>4.19&&body.max[1]<=7.001,
          "Refuge elevations "+JSON.stringify(body));
      }
      await walk(120.97,51.05,.30);result.health=await call("state");
      assert(result.health.hp>64&&result.health.items.find(a=>a[1]===121&&a[2]===51)?.[3]);
      await walk(119.12,54.86,.30);result.supplies=await call("state");
      assert(result.supplies.items.find(a=>a[1]===119&&a[2]===55)?.[3]);
      await call("face",123.8,56.2,5.42);await shot("infirmary");
      await walk(113,53.2);await walk(113,29.1);await walk(113,22.6);
      await walk(107,23);await walk(107,18.15,.32);
      await call("face",107,16,5.8);await p.keyboard.press("KeyE");
      await p.waitForFunction(()=>refugeStudy.state().phase!=="idle",null,{timeout:6000});
      result.ladder=await call("state");result.steps.push({input:"E",at:result.ladder.p,to:"native ladder"});
      if(i){
        result.retirements=[];
        for(const level of [1,9]){
          const retired=await call("retire",level);
          assert.equal(retired.other,0);assert.equal(retired.returned,2);
          assert.deepEqual(retired.counts,[1,1,1,1,1]);result.retirements.push(retired);
        }
      }
      results.push(result);console.log("PASS",i?"candidate":"previous","refuge supplies and north ladder",result.steps.length);
      await p.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
    fs.writeFileSync(path.join(out,"verification.json"),JSON.stringify({scope:"Offline Chrome, held combat and staged ascent start; real W movement and E ladder interaction.",
      viewport,probes,arrowDirection:"decreasing world z on the east wall, toward the chapel ladder",results,errors,network},null,2)+"\n");
    console.log("PASS",probes,"unchanged movement/shot queries, matching map/pickups, both departures");
  }finally{await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
